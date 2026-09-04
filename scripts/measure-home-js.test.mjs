import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
    BUDGET_BYTES,
    CHUNK_GROWTH_LIMIT_BYTES,
    DECLARED_DUPLICATE_MODULES,
    DECLARED_DUPLICATE_RAW_BYTES,
    analyze,
    compareWithBaseline,
    findDuplicateModules,
    fingerprintOf,
    parseModuleIds,
    parseModuleSizes,
    readBaseline,
    readChunks,
    verdict,
} from "./measure-home-js.mjs";

/*
 * Este fichero es lo que mete el candado del presupuesto de JS DENTRO del
 * gate. `measure-home-js.mjs` sabe medir y sabe fallar por su cuenta, pero
 * `pnpm run ci` no lo llama y no puede llamarlo: el script necesita un `out/`
 * construido y el gate corre sin build (en Netlify el `command` es
 * `pnpm run ci && pnpm build`, con el gate ANTES). Lo que sí puede correr
 * siempre es esto: la lógica del instrumento ejercitada con chunks
 * sintéticos, más la coherencia interna de la línea base versionada. Y cuando
 * la máquina tiene un `out/` a mano —la del desarrollador, no la de CI— el
 * último bloque compara además el build real contra esa línea base. Mismo
 * patrón que `check-dark-art-weight.test.mjs` y `detect-anti-patterns.test.mjs`
 * con sus scripts.
 *
 * VALIDADO CON BUG INYECTADO, uno por candado, sobre el build servido en
 * local (el de `0226846`). Cada bug se aplicó solo, se observó el rojo, se
 * restauró y la suite volvió a 22/22 verde. Las líneas son literales de la
 * salida de `pnpm test -- scripts/measure-home-js.test.mjs`:
 *
 *  1. Presupuesto — bajando `BUDGET_BYTES` de 290_000 a 280_000:
 *       AssertionError: el build real no pasa los candados: el JS descargado
 *       se pasa del presupuesto por 4559 B: expected [ Array(1) ] to deeply
 *       equal []
 *  2. Duplicación — bajando `DECLARED_DUPLICATE_RAW_BYTES` de 116_368 a
 *     100_000:
 *       AssertionError: el build real no pasa los candados: la duplicación
 *       entre chunks sube a 116.368 B crudos, por encima de los 100.000 B ya
 *       declarados: hay módulos NUEVOS viajando dos veces
 *  3. Delta por chunk — restando 5.000 B al chunk de 60.736 en la línea base
 *     (`scripts/home-js-baseline.json`), que además destapó el candado de
 *     coherencia de la propia línea base:
 *       AssertionError: el build real no pasa los candados: el chunk
 *       419m3cs9m8bxt.js (2e66fe0db941) crece 5000 B brotli sobre la línea
 *       base, más que el límite de 1000 B
 *       AssertionError: expected 279559 to be 284559
 */

/** Chunk sintético con la forma que emite Turbopack. */
function makeChunk(name, modules, options = {}) {
    const body = modules
        .map(({ id, size, shape = "e" }) => {
            const head = `,${id},${shape}=>{`;
            const filler = "x".repeat(Math.max(1, size - head.length - 1));
            return `${head}${filler}}`;
        })
        .join("");
    return {
        name,
        text: `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["obj"${body}])`,
        legacyOnly: Boolean(options.legacyOnly),
    };
}

describe("lectura de módulos dentro de un chunk", () => {
    it("reconoce las cuatro formas de lista de parámetros que emite Turbopack", () => {
        const chunk = makeChunk("a.js", [
            { id: "6465", size: 200, shape: "e" },
            { id: "11712", size: 200, shape: "(e,t,n)" },
            { id: "83467", size: 200, shape: "(e,t,r)" },
            { id: "95943", size: 200, shape: "(e,r,t)" },
        ]);
        expect(parseModuleIds(chunk.text)).toEqual([
            "6465",
            "11712",
            "83467",
            "95943",
        ]);
    });

    it("no arrastra el estado de la expresión regular entre llamadas", () => {
        const chunk = makeChunk("a.js", [{ id: "350", size: 120 }]);
        expect(parseModuleIds(chunk.text)).toHaveLength(1);
        expect(parseModuleIds(chunk.text)).toHaveLength(1);
    });

    it("mide el cuerpo de cada módulo hasta el siguiente", () => {
        const chunk = makeChunk("a.js", [
            { id: "1000", size: 300 },
            { id: "2000", size: 100 },
        ]);
        const sizes = parseModuleSizes(chunk.text);
        expect(sizes.map((entry) => entry.id)).toEqual(["1000", "2000"]);
        expect(sizes[0].length).toBe(300);
    });
});

describe("firma de un chunk", () => {
    it("no depende del orden en que Turbopack emita los módulos", () => {
        expect(fingerprintOf(["10", "20", "30"])).toBe(
            fingerprintOf(["30", "10", "20"]),
        );
    });

    it("cambia si cambia la composición", () => {
        expect(fingerprintOf(["10", "20"])).not.toBe(
            fingerprintOf(["10", "20", "30"]),
        );
    });

    it("marca como tal un chunk sin módulos legibles en vez de inventarse una firma", () => {
        expect(fingerprintOf([])).toBe("sin-modulos");
    });
});

describe("censo de duplicación entre chunks", () => {
    it("encuentra el módulo que viaja dos veces y cuenta solo las copias que sobran", () => {
        const analysis = analyze([
            makeChunk("uno.js", [
                { id: "83467", size: 1000 },
                { id: "11712", size: 500 },
            ]),
            makeChunk("dos.js", [
                { id: "83467", size: 1000 },
                { id: "999", size: 400 },
            ]),
        ]);
        expect(analysis.duplicates).toHaveLength(1);
        expect(analysis.duplicates[0].id).toBe("83467");
        expect(analysis.duplicates[0].wastedRawBytes).toBe(1000);
        expect(analysis.duplicateRawBytes).toBe(1000);
    });

    it("no cuenta el polyfill nomodule, que ningún navegador moderno descarga", () => {
        const duplicates = findDuplicateModules([
            {
                name: "uno.js",
                legacyOnly: false,
                modules: [{ id: "7", length: 100 }],
            },
            {
                name: "polyfill.js",
                legacyOnly: true,
                modules: [{ id: "7", length: 100 }],
            },
        ]);
        expect(duplicates).toHaveLength(0);
    });

    it("suma las copias de un módulo que aparece en tres chunks", () => {
        const duplicates = findDuplicateModules([
            {
                name: "a.js",
                legacyOnly: false,
                modules: [{ id: "7", length: 50 }],
            },
            {
                name: "b.js",
                legacyOnly: false,
                modules: [{ id: "7", length: 50 }],
            },
            {
                name: "c.js",
                legacyOnly: false,
                modules: [{ id: "7", length: 50 }],
            },
        ]);
        expect(duplicates[0].wastedRawBytes).toBe(100);
    });
});

describe("delta contra la línea base", () => {
    const gemelo = { firma: "abc123", modulos: 17 };
    const baseline = {
        totalDescargadoBrotli: 300,
        chunks: [
            { ...gemelo, brotli: 200, crudo: 900 },
            { ...gemelo, brotli: 100, crudo: 900 },
        ],
    };
    const analysisWith = (chunks) => ({
        chunks,
        downloadedBytes: chunks.reduce((acc, chunk) => acc + chunk.brotli, 0),
        legacyBytes: 0,
        duplicates: [],
        duplicateRawBytes: 0,
    });

    it("empareja dos chunks de la MISMA firma con las dos entradas de la línea base, no con la misma", () => {
        const comparison = compareWithBaseline(
            analysisWith([
                {
                    name: "a.js",
                    legacyOnly: false,
                    brotli: 200,
                    fingerprint: "abc123",
                    hints: [],
                },
                {
                    name: "b.js",
                    legacyOnly: false,
                    brotli: 100,
                    fingerprint: "abc123",
                    hints: [],
                },
            ]),
            baseline,
        );
        expect(comparison.rows.map((row) => row.delta)).toEqual([0, 0]);
        expect(comparison.missing).toHaveLength(0);
    });

    it("declara desconocido el chunk cuya composición no está en la línea base", () => {
        const comparison = compareWithBaseline(
            analysisWith([
                {
                    name: "nuevo.js",
                    legacyOnly: false,
                    brotli: 50,
                    fingerprint: "zzz",
                    hints: [],
                },
            ]),
            baseline,
        );
        expect(comparison.unknown.map((row) => row.name)).toEqual(["nuevo.js"]);
        expect(comparison.missing).toHaveLength(2);
    });

    it("marca como crecido solo lo que pasa del límite declarado", () => {
        const comparison = compareWithBaseline(
            analysisWith([
                {
                    name: "a.js",
                    legacyOnly: false,
                    brotli: 200 + CHUNK_GROWTH_LIMIT_BYTES,
                    fingerprint: "abc123",
                    hints: [],
                },
                {
                    name: "b.js",
                    legacyOnly: false,
                    brotli: 100 + CHUNK_GROWTH_LIMIT_BYTES + 1,
                    fingerprint: "abc123",
                    hints: [],
                },
            ]),
            baseline,
        );
        expect(comparison.grown.map((row) => row.name)).toEqual(["b.js"]);
    });
});

describe("veredicto de los tres candados", () => {
    const baseline = {
        totalDescargadoBrotli: 10,
        chunks: [{ firma: "abc123", modulos: 1, brotli: 10, crudo: 10 }],
    };
    const sano = {
        chunks: [
            {
                name: "a.js",
                legacyOnly: false,
                brotli: 10,
                fingerprint: "abc123",
                hints: [],
            },
        ],
        downloadedBytes: 10,
        legacyBytes: 0,
        duplicates: [],
        duplicateRawBytes: 0,
    };

    it("no encuentra problemas en un build que cuadra con la línea base", () => {
        expect(verdict(sano, baseline).problems).toEqual([]);
    });

    it("falla cuando el JS descargado se pasa del presupuesto", () => {
        const { problems } = verdict(
            { ...sano, downloadedBytes: BUDGET_BYTES + 1 },
            baseline,
        );
        expect(problems.join(" ")).toContain("se pasa del presupuesto");
    });

    it("falla cuando la duplicación crece por encima de la deuda declarada", () => {
        const { problems } = verdict(
            { ...sano, duplicateRawBytes: DECLARED_DUPLICATE_RAW_BYTES + 1 },
            baseline,
        );
        expect(problems.join(" ")).toContain(
            "módulos NUEVOS viajando dos veces",
        );
    });

    it("falla cuando aparecen más módulos repetidos de los declarados", () => {
        const duplicates = Array.from(
            { length: DECLARED_DUPLICATE_MODULES + 1 },
            (_, index) => ({
                id: String(index),
                copies: [],
                wastedRawBytes: 0,
            }),
        );
        const { problems } = verdict({ ...sano, duplicates }, baseline);
        expect(problems.join(" ")).toContain("módulos repetidos entre chunks");
    });

    it("falla cuando un chunk conocido engorda más del límite", () => {
        const { problems } = verdict(
            {
                ...sano,
                chunks: [
                    {
                        ...sano.chunks[0],
                        brotli: 10 + CHUNK_GROWTH_LIMIT_BYTES + 1,
                    },
                ],
                downloadedBytes: 10 + CHUNK_GROWTH_LIMIT_BYTES + 1,
            },
            baseline,
        );
        expect(problems.join(" ")).toContain("sobre la línea base");
    });
});

describe("coherencia de la línea base versionada", () => {
    const baseline = readBaseline();

    it("existe y no está vacía", () => {
        expect(baseline, "falta scripts/home-js-baseline.json").not.toBeNull();
        expect(baseline.chunks.length).toBeGreaterThan(0);
    });

    it("el total declarado es exactamente la suma de sus chunks, no una cifra suelta", () => {
        const suma = baseline.chunks.reduce(
            (acc, chunk) => acc + chunk.brotli,
            0,
        );
        expect(suma).toBe(baseline.totalDescargadoBrotli);
    });

    it("el presupuesto y la deuda de duplicación son los mismos que declara el script", () => {
        expect(baseline.presupuestoBytes).toBe(BUDGET_BYTES);
        expect(baseline.duplicacionCrudaBytes).toBe(
            DECLARED_DUPLICATE_RAW_BYTES,
        );
        expect(baseline.modulosDuplicados).toBe(DECLARED_DUPLICATE_MODULES);
    });

    it("la línea base cabe en el presupuesto que declara", () => {
        expect(baseline.totalDescargadoBrotli).toBeLessThanOrEqual(
            BUDGET_BYTES,
        );
    });
});

/*
 * Bloque de integración: solo corre donde hay un `out/` construido. En CI no
 * lo hay y estos casos se saltan — decir "no hay build" en voz alta es
 * preferible a un verde que no midió nada.
 */
describe.skipIf(!existsSync("out/index.html"))(
    "el build real contra la línea base",
    () => {
        it("pasa los tres candados", () => {
            const analysis = analyze(readChunks());
            const { problems } = verdict(analysis, readBaseline());
            expect(
                problems,
                `el build real no pasa los candados: ${problems.join(" · ")}`,
            ).toEqual([]);
        });
    },
);
