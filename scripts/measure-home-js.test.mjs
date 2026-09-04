import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
    BASELINE_CHUNKS,
    BUDGET_BYTES,
    CHUNK_GROWTH_LIMIT_BYTES,
    DECLARED_TWIN_BROTLI_BYTES,
    DECLARED_TWIN_GROUPS,
    DECLARED_DUPLICATE_MODULES,
    DECLARED_DUPLICATE_RAW_BYTES,
    analyze,
    compareWithBaseline,
    findDuplicateModules,
    findTwinChunks,
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
 *
 * LOS TRES CANDADOS QUE ESTRENÓ EL 2026-09-04 (frente del presupuesto) van
 * validados igual, sobre el build ya arreglado, y el cuarto bug es el que
 * importa: se REVIRTIÓ el arreglo entero y se comprobó que el instrumento canta
 * el defecto que nadie vio en cinco olas.
 *
 *  4. Chunks gemelos — bajando `DECLARED_TWIN_BROTLI_BYTES` de 1_261 a 1_000:
 *       AssertionError: el build real no pasa los candados: los chunks
 *       3036pivcxrs_-.js y 01v6e5k6mmr1y.js tienen la MISMA composición
 *       (7e2d90d23593, 3 módulos): 1261 B brotli viajan por duplicado en la
 *       misma página · la duplicación de chunks ÍNTEGROS sube a 1261 B brotli
 *       en 1 grupo(s), por encima de los 1000 B en 1 grupo(s) ya declarados
 *  5. Censo de la línea base encogido — borrando la última fila de
 *     `home-js-baseline.json` y restando su peso al total para que la suma
 *     siguiera cuadrando (que es exactamente como se dejaría en verde a mano).
 *     Se puso en rojo por DOS sitios, y el primero corre en CI sin `out/`:
 *       AssertionError: expected 14 to be 15
 *       AssertionError: el build real no pasa los candados: el chunk
 *       306xg6yr9irvl.js (d209e951feff, 499 B brotli) no está en la línea base:
 *       composición nueva sin revisar · la línea base declara 14 chunks y el
 *       script espera 15: el censo cambió de tamaño sin actualizar
 *       `BASELINE_CHUNKS`
 *  6. Chunk de la línea base que el build ya no emite — cambiando la firma de
 *     una fila por una inexistente, sin tocar el número de filas:
 *       AssertionError: el build real no pasa los candados: … · la línea base
 *       declara un chunk (000000000000, 499 B brotli) que el build ya no emite:
 *       el censo encogió sin revisarse
 *  7. EL DEFECTO ORIGINAL — devolviendo `Navbar`/`Footer` a `app/HomeRoute.tsx`
 *     y `app/not-found.tsx` (revirtiendo el arreglo) y reconstruyendo:
 *       AssertionError: el build real no pasa los candados: … los chunks
 *       34q7k99kqn6xz.js y 0_x-_m0pog71z.js tienen la MISMA composición
 *       (a9c4eb656386, 8 módulos): 25.427 B brotli viajan por duplicado en la
 *       misma página
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

describe("veredicto de los seis candados", () => {
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
        twins: [],
        duplicates: [],
        duplicateRawBytes: 0,
    };

    /*
     * La línea base sintética tiene UN chunk, no los `BASELINE_CHUNKS` del
     * censo real; se le dice a `verdict` cuántos espera para que estos casos
     * ejerciten el candado que cada uno mira y no el del tamaño del censo. Ese
     * candado tiene sus propios casos, abajo y en el bloque de coherencia.
     */
    const juzga = (analysis, base = baseline) =>
        verdict(analysis, base, base.chunks.length);

    it("no encuentra problemas en un build que cuadra con la línea base", () => {
        expect(juzga(sano).problems).toEqual([]);
    });

    it("falla cuando el JS descargado se pasa del presupuesto", () => {
        const { problems } = juzga({
            ...sano,
            downloadedBytes: BUDGET_BYTES + 1,
        });
        expect(problems.join(" ")).toContain("se pasa del presupuesto");
    });

    it("falla cuando la duplicación crece por encima de la deuda declarada", () => {
        const { problems } = juzga({
            ...sano,
            duplicateRawBytes: DECLARED_DUPLICATE_RAW_BYTES + 1,
        });
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
        const { problems } = juzga({ ...sano, duplicates });
        expect(problems.join(" ")).toContain("módulos repetidos entre chunks");
    });

    it("falla cuando un chunk conocido engorda más del límite", () => {
        const { problems } = juzga({
            ...sano,
            chunks: [
                {
                    ...sano.chunks[0],
                    brotli: 10 + CHUNK_GROWTH_LIMIT_BYTES + 1,
                },
            ],
            downloadedBytes: 10 + CHUNK_GROWTH_LIMIT_BYTES + 1,
        });
        expect(problems.join(" ")).toContain("sobre la línea base");
    });

    /*
     * CANDADO 4 — CHUNKS GEMELOS. Es el que nadie tenía durante cinco olas y el
     * que habría cantado los 28.413 B redundantes de las portadas el primer día.
     * Se ejercitan las DOS cotas por separado, porque cada una tapa un agujero
     * de la otra: los bytes atrapan un gemelo grande, el recuento atrapa dos
     * gemelos pequeños que caben por debajo del listón de bytes.
     */
    it("falla cuando la copia redundante pesa más que la deuda declarada", () => {
        const { problems } = juzga({
            ...sano,
            twins: [
                {
                    fingerprint: "abc123",
                    modules: 17,
                    names: ["a.js", "b.js"],
                    wastedBrotliBytes: DECLARED_TWIN_BROTLI_BYTES + 1,
                },
            ],
        });
        expect(problems.join(" ")).toContain("tienen la MISMA composición");
        expect(problems.join(" ")).toContain("duplicación de chunks ÍNTEGROS");
    });

    it("falla cuando aparecen más grupos de gemelos de los declarados, aunque no sumen bytes", () => {
        const twins = Array.from(
            { length: DECLARED_TWIN_GROUPS + 1 },
            (_, index) => ({
                fingerprint: `f${index}`,
                modules: 1,
                names: [`a${index}.js`, `b${index}.js`],
                wastedBrotliBytes: 0,
            }),
        );
        const { problems } = juzga({ ...sano, twins });
        expect(problems.join(" ")).toContain("duplicación de chunks ÍNTEGROS");
    });

    /*
     * CANDADOS 5 y 6 — LAS DOS ATADURAS DE EXTENSIÓN. Sin ellas, el candado del
     * delta por chunk se deja en verde encogiendo el censo que recorre: es el
     * modo de fallo que la ola Q encontró cuatro veces en candados distintos.
     */
    it("falla cuando la línea base declara un chunk que el build ya no emite", () => {
        const { problems } = juzga(
            { ...sano, chunks: [], downloadedBytes: 0 },
            baseline,
        );
        expect(problems.join(" ")).toContain("el censo encogió sin revisarse");
    });

    it("falla cuando el censo de la línea base cambia de tamaño", () => {
        const recortada = { ...baseline, chunks: [] };
        const { problems } = verdict(
            { ...sano, chunks: [], downloadedBytes: 0 },
            recortada,
            baseline.chunks.length,
        );
        expect(problems.join(" ")).toContain("el censo cambió de tamaño");
    });
});

describe("detección de chunks con la misma composición", () => {
    it("empareja dos chunks por su firma, aunque el orden de los módulos difiera", () => {
        const analysis = analyze([
            makeChunk("a.js", [
                { id: "83467", size: 400 },
                { id: "11712", size: 200 },
            ]),
            makeChunk("b.js", [
                { id: "11712", size: 200 },
                { id: "83467", size: 400 },
            ]),
        ]);
        const twins = findTwinChunks(analysis.chunks);

        expect(twins).toHaveLength(1);
        expect(twins[0].names.sort()).toEqual(["a.js", "b.js"]);
        expect(twins[0].modules).toBe(2);
        expect(twins[0].wastedBrotliBytes).toBeGreaterThan(0);
    });

    it("no llama gemelos a dos chunks de composición distinta", () => {
        const analysis = analyze([
            makeChunk("a.js", [{ id: "83467", size: 400 }]),
            makeChunk("b.js", [{ id: "11712", size: 400 }]),
        ]);
        expect(findTwinChunks(analysis.chunks)).toEqual([]);
    });

    /*
     * El polyfill `nomodule` no lo descarga ningún navegador moderno, así que
     * emparejarlo con un chunk real inventaría un coste que nadie transfiere.
     */
    it("ignora el polyfill nomodule al buscar gemelos", () => {
        const analysis = analyze([
            makeChunk("a.js", [{ id: "83467", size: 400 }]),
            makeChunk("legacy.js", [{ id: "83467", size: 400 }], {
                legacyOnly: true,
            }),
        ]);
        expect(findTwinChunks(analysis.chunks)).toEqual([]);
    });

    /*
     * Dos chunks sin módulos reconocibles (el runtime de Turbopack lo es)
     * comparten la firma `sin-modulos` sin ser copias: declararlos gemelos
     * sería inventar un hallazgo que el instrumento no ha visto.
     */
    it("no empareja chunks de los que no sabe leer ningún módulo", () => {
        const analysis = analyze([
            { name: "a.js", text: "(function(){})()", legacyOnly: false },
            { name: "b.js", text: "(function(){})()", legacyOnly: false },
        ]);
        expect(findTwinChunks(analysis.chunks)).toEqual([]);
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

    /*
     * LA ATADURA DE EXTENSIÓN, COMPROBADA SIN INTERMEDIARIOS. `verdict` la mira
     * también, pero acepta el número esperado como parámetro para que los casos
     * sintéticos puedan trabajar con una línea base de un chunk; aquí se compara
     * el JSON versionado contra la constante del script y no hay parámetro que
     * valga. Borrar una fila del censo se pone en rojo aquí aunque la máquina no
     * tenga un `out/` que medir — que es el caso de CI.
     */
    it("el censo tiene exactamente los chunks que declara el script", () => {
        expect(baseline.chunks.length).toBe(BASELINE_CHUNKS);
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
