import { existsSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";
import { describe, it, expect, beforeAll } from "vitest";
import * as measureHomeJs from "./measure-home-js.mjs";
import {
    BASELINE_CHUNKS,
    BASELINE_DIGEST,
    BASELINE_PAGES,
    BUDGET_BYTES,
    CHUNK_GROWTH_LIMIT_BYTES,
    DECLARED_TWIN_BROTLI_BYTES,
    DECLARED_TWIN_GROUPS,
    DECLARED_UNION_TWIN_BROTLI_BYTES,
    DECLARED_UNION_TWIN_GROUPS,
    DECLARED_DUPLICATE_MODULES,
    DECLARED_DUPLICATE_RAW_BYTES,
    HOME_PAGE,
    SERVED_COMPRESSION,
    analyze,
    analyzeSite,
    auditBaseline,
    brotliBytes,
    compareWithBaseline,
    digestOf,
    findDuplicateModules,
    findTwinChunks,
    fingerprintOf,
    listPages,
    pageBaseline,
    parseModuleIds,
    parseModuleSizes,
    readBaseline,
    readChunks,
    toCensus,
    verdict,
    verdictSite,
} from "./measure-home-js.mjs";

describe("selección del censo por entorno de build", () => {
    it("usa censos distintos para Windows y Linux y nunca mezcla sus firmas", () => {
        const windows = measureHomeJs.baselineTargetFor("win32");
        const linux = measureHomeJs.baselineTargetFor("linux");

        expect(windows?.path).toMatch(/home-js-baseline\.win32\.json$/);
        expect(linux?.path).toMatch(/home-js-baseline\.linux\.json$/);
        expect(linux?.path).not.toBe(windows?.path);
        expect(linux?.digest).not.toBe(windows?.digest);
    });

    it("rechaza una plataforma sin censo en vez de reutilizar otro en silencio", () => {
        expect(() => measureHomeJs.baselineTargetFor("darwin")).toThrow(
            /plataforma.*darwin.*sin censo/i,
        );
    });

    it.each(["win32", "linux"])(
        "el censo %s existe y pasa su propia auditoría",
        (platform) => {
            const target = measureHomeJs.baselineTargetFor(platform);
            const census = readBaseline(target.path);

            expect(census, `falta ${target.path}`).not.toBeNull();
            expect(
                auditBaseline(census, { expectedDigest: target.digest }),
            ).toEqual([]);
        },
    );
});

/*
 * Este fichero es lo que mete el candado del presupuesto de JS DENTRO del
 * gate. `measure-home-js.mjs` sabe medir y sabe fallar por su cuenta, pero
 * `pnpm run ci` no lo llama y no puede llamarlo: el script necesita un `out/`
 * construido y el gate corre sin build (en CI los pasos son `pnpm run ci`,
 * `pnpm build` y `pnpm measure:js`, con el gate ANTES y la medición del
 * bundle detrás del build). Lo que sí puede correr
 * siempre es esto: la lógica del instrumento ejercitada con chunks
 * sintéticos, más la AUDITORÍA COMPLETA del censo versionado. Y cuando la
 * máquina tiene un `out/` a mano —la del desarrollador, no la de CI— el
 * último bloque compara además el build real contra ese censo. Mismo patrón
 * que `check-dark-art-weight.test.mjs` y `detect-anti-patterns.test.mjs` con
 * sus scripts.
 *
 * VALIDADO CON BUG INYECTADO, uno por candado, sobre el build servido en
 * local. Cada bug se aplicó solo, se observó el rojo, se restauró y la suite
 * volvió a verde. Las líneas son literales de la salida de
 * `pnpm test -- scripts/measure-home-js.test.mjs`:
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
 *     (`scripts/home-js-baseline.<plataforma>.json`), que además destapó el candado de
 *     coherencia de la propia línea base:
 *       AssertionError: el build real no pasa los candados: el chunk
 *       419m3cs9m8bxt.js (2e66fe0db941) crece 5000 B brotli sobre la línea
 *       base, más que el límite de 1000 B
 *       AssertionError: expected 279559 to be 284559
 *  4. Chunks gemelos — bajando `DECLARED_TWIN_BROTLI_BYTES` de 1_261 a 1_000:
 *       AssertionError: el build real no pasa los candados: los chunks
 *       3036pivcxrs_-.js y 01v6e5k6mmr1y.js tienen la MISMA composición
 *       (7e2d90d23593, 3 módulos): 1261 B brotli viajan por duplicado en la
 *       misma página · la duplicación de chunks ÍNTEGROS sube a 1261 B brotli
 *       en 1 grupo(s), por encima de los 1000 B en 1 grupo(s) ya declarados
 *  5. EL DEFECTO ORIGINAL DE LA CÁSCARA — devolviendo `Navbar`/`Footer` a
 *     `app/HomeRoute.tsx` y `app/not-found.tsx` —hoy `app/NotFoundRoute.tsx`,
 *     que es donde hay que reinyectarlos para repetir esta prueba—
 *     (revirtiendo el arreglo) y
 *     reconstruyendo:
 *       AssertionError: el build real no pasa los candados: … los chunks
 *       34q7k99kqn6xz.js y 0_x-_m0pog71z.js tienen la MISMA composición
 *       (a9c4eb656386, 8 módulos): 25.427 B brotli viajan por duplicado en la
 *       misma página
 *
 * LOS CANDADOS QUE ESTRENA LA OLA R (2026-09-04) van validados igual, y el
 * primero es el que importa: es la reproducción literal del defecto que el
 * verificador midió sobre `571b6df`. Antes de este cambio, borrar una fila del
 * censo, restar su peso al total y bajar `BASELINE_CHUNKS` en el mismo gesto
 * daba `Tests 30 passed | 1 skipped (31)` con salida 0 en el escenario de CI.
 * Ahora ese mismo recorte tiene su propio caso aquí abajo ("el recorte
 * coordinado…") y no hay forma de dejarlo en verde sin regenerar el sello
 * desde un build. Los rojos literales de los otros cinco están en el informe
 * de la ola; los cuatro que dependen solo del JSON se reproducen inyectando la
 * misma edición sobre `scripts/home-js-baseline.<plataforma>.json`.
 *
 * LAS INYECCIONES DE ARRIBA SON HISTÓRICAS Y CITAN LAS CIFRAS DE SU FECHA:
 * `DECLARED_DUPLICATE_RAW_BYTES` valía 116.368 B cuando se hizo la 2 y
 * `DECLARED_TWIN_BROTLI_BYTES` 1.261 B cuando se hizo la 4. Las vigentes están
 * en `scripts/measure-home-js.mjs`. Un rojo medido no se reescribe: se fecha.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE ESTRENA LA OLA S (2026-09-06), validado el mismo día sobre este árbol.
 * La ola partió el sitio en tres raíces de documento para hornear `<html lang>`
 * por ruta (WCAG 3.1.1, nivel A), y con eso la unión de las ocho páginas pasó
 * de UN grupo de chunks gemelos a CUATRO, 45.461 B brotli. Declarar esa cifra
 * en la única pareja de constantes que había habría subido ×35 el listón DENTRO
 * de cada página, así que ahora hay dos parejas y cada candado usa la suya.
 * Tres inyecciones, cada una aplicada y deshecha dentro de un solo comando:
 *
 *  6. LA COTA DE LA UNIÓN NO VALE DENTRO DE UNA PÁGINA — sustituyendo
 *     `DECLARED_TWIN_BROTLI_BYTES` por `DECLARED_UNION_TWIN_BROTLI_BYTES` en el
 *     candado por página de `verdict`:
 *       FAIL scripts/measure-home-js.test.mjs > veredicto de una página contra
 *       su rebanada del censo > un gemelo dentro de una página sigue fallando
 *       aunque quepa en la cota de la unión
 *       AssertionError: expected '' to contain 'viajan por duplicado en la
 *       misma pági…'
 *     Con él cayó también el caso hermano de esa misma cota ("falla cuando la
 *     copia redundante pesa más que la deuda declarada":
 *     `AssertionError: expected '' to contain 'tienen la MISMA composición'`),
 *     que es lo esperado: los dos miran la misma constante. `Tests 6 failed |
 *     48 passed (54)`.
 *
 *  7. EL CANDADO DE LA UNIÓN NO PUEDE CANTAR SIEMPRE — inyectando `>=` en vez
 *     de `>` en la comparación de grupos de `verdictSite`:
 *       FAIL scripts/measure-home-js.test.mjs > gemelos que solo se ven mirando
 *       las ocho páginas a la vez > un sitio con tantos grupos de gemelos como
 *       los declarados pasa en verde
 *       AssertionError: expected [ …(5) ] to deeply equal []
 *     `Tests 5 failed | 49 passed (54)`.
 *
 *  8. Y LA TERCERA NO SALIÓ COMO SE PREDIJO, que es un dato, no un adorno.
 *     Bajar `DECLARED_UNION_TWIN_GROUPS` de 4 a 1 NO pone en rojo ningún caso
 *     sintético: `Tests 4 failed | 50 passed (54)`, los mismos cuatro fallos
 *     que ese día tenía el árbol sin inyectar nada (el censo regenerado
 *     esperando a que el orquestador pegue `BASELINE_CHUNKS` y el sello). La
 *     razón es que el sitio del caso espejo se construye a partir de esa misma
 *     constante y encoge con ella. Lo que sí se puso en rojo fue el bloque de
 *     integración, contra el `out/` real:
 *       AssertionError: el build real no pasa los candados: … · [unión] la
 *       duplicación de chunks ÍNTEGROS entre páginas sube a 45.461 B brotli en
 *       4 grupo(s), por encima de los 45.461 B en 1 grupo(s) ya declarados
 *     Ahí está además la confirmación independiente de la cifra declarada: los
 *     cuatro grupos que el candado enumeró son 21.290 + 14.111 + 8.789 + 1.271
 *     B, leídos del build y no escritos a mano. La lección que deja el número 8
 *     es que un caso sintético parametrizado por la constante que vigila no
 *     puede vigilar esa constante: eso solo lo hace el build.
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

describe("veredicto de una página contra su rebanada del censo", () => {
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
     * La rebanada sintética tiene UN chunk, no los `BASELINE_CHUNKS` del censo
     * real; se le dice a `verdict` cuántos espera para que estos casos
     * ejerciten el candado que cada uno mira y no el del tamaño del censo. Ese
     * candado tiene sus propios casos en el bloque de auditoría.
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
     * CHUNKS GEMELOS DENTRO DE LA PÁGINA. Es el candado que nadie tenía durante
     * cinco olas y el que habría cantado los 28.413 B redundantes de las
     * portadas el primer día. Se ejercitan las DOS cotas por separado, porque
     * cada una tapa un agujero de la otra: los bytes atrapan un gemelo grande,
     * el recuento atrapa dos gemelos pequeños que caben por debajo del listón
     * de bytes.
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
     * EL CANDADO DE LA DECISIÓN DEL 2026-09-06, y es el que hay que mirar
     * primero si alguien vuelve a tocar estas constantes. La ola S declaró
     * 45.461 B de gemelos ENTRE páginas —la partición en tres raíces de
     * documento— y esa deuda NO puede convertirse en permiso DENTRO de una
     * página: con una sola pareja de constantes para las dos escalas, el listón
     * de la página habría subido de 1.271 a 45.461 B, ×35, y un gemelo de
     * 20.000 B dentro de una misma página —la forma exacta de la cáscara
     * duplicada que costó cinco olas descubrir— habría pasado en verde.
     *
     * 10.000 B está elegido a propósito ENTRE las dos cotas: por encima de la de
     * la página y por debajo de la de la unión. Es el único rango donde las dos
     * constantes discrepan, así que es el único donde el caso demuestra algo.
     * Eran 20.000 B hasta el 2026-09-10; al recalibrar la cota de la unión a la
     * compresión servida (15.554 B) el valor tuvo que bajar para seguir dentro
     * de ese rango.
     */
    it("un gemelo dentro de una página sigue fallando aunque quepa en la cota de la unión", () => {
        const bytes = 10_000;
        expect(bytes).toBeGreaterThan(DECLARED_TWIN_BROTLI_BYTES);
        expect(bytes).toBeLessThan(DECLARED_UNION_TWIN_BROTLI_BYTES);
        const { problems } = juzga({
            ...sano,
            twins: [
                {
                    fingerprint: "abc123",
                    modules: 11,
                    names: ["a.js", "b.js"],
                    wastedBrotliBytes: bytes,
                },
            ],
        });
        expect(problems.join(" ")).toContain(
            "viajan por duplicado en la misma página",
        );
        expect(problems.join(" ")).toContain("duplicación de chunks ÍNTEGROS");
    });

    it("falla cuando la línea base declara un chunk que el build ya no emite", () => {
        const { problems } = juzga(
            { ...sano, chunks: [], downloadedBytes: 0 },
            baseline,
        );
        expect(problems.join(" ")).toContain("el censo encogió sin revisarse");
    });

    it("falla cuando la rebanada de la página cambia de tamaño", () => {
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

/*
 * EL CANDADO ENTRE PÁGINAS. Hasta la ola R el censo solo miraba
 * `out/index.html`, y la cáscara duplicada que se acababa de eliminar vivía
 * precisamente en la relación ENTRE páginas: un chunk que pedían las ocho y una
 * copia íntegra suya que solo pedían las dos portadas. El sitio sintético de
 * aquí abajo es la forma pura de ese defecto — ficheros idénticos que NINGUNA
 * página pide a la vez —, y sirve para demostrar que ninguna página por separado
 * lo ve y la unión sí.
 *
 * DESDE EL 2026-09-06 ESTA ESCALA TIENE SU PROPIA COTA. La ola S declaró como
 * deuda los 45.461 B en cuatro grupos de la partición del sitio en tres raíces
 * de documento, así que un sitio sintético con DOS grupos ya no falla: para
 * ejercitar el candado hay que pasarse de `DECLARED_UNION_TWIN_GROUPS`. Los
 * casos de aquí abajo se construyen a partir de esa constante, no de un número
 * escrito a mano, para que sigan midiendo lo que dicen medir cuando la deuda
 * declarada cambie otra vez.
 */
describe("gemelos que solo se ven mirando las ocho páginas a la vez", () => {
    const modulosA = [
        { id: "1001", size: 400 },
        { id: "1002", size: 300 },
    ];
    const modulosB = [
        { id: "2001", size: 400 },
        { id: "2002", size: 300 },
    ];
    /*
     * Una composición distinta por cada grupo de gemelos que se quiera
     * fabricar. Los identificadores van de diez en diez para que dos grupos no
     * compartan ninguno por accidente.
     */
    const composicion = (grupo) => [
        { id: String(3100 + grupo * 10), size: 400 },
        { id: String(3101 + grupo * 10), size: 300 },
    ];
    /*
     * Sitio de dos páginas con `grupos` composiciones, cada una emitida en un
     * fichero DISTINTO por página: ninguna página tiene gemelos por sí sola y la
     * unión tiene exactamente `grupos`. El defecto por defecto es uno por encima
     * de la cota declarada, que es el que tiene que caer.
     */
    const sitio = (grupos = DECLARED_UNION_TWIN_GROUPS + 1) => {
        const composiciones = Array.from({ length: grupos }, (_, index) =>
            composicion(index),
        );
        const chunksDe = (prefijo) =>
            composiciones.map((modulos, index) =>
                makeChunk(`${prefijo}${index}.js`, modulos),
            );
        return {
            rutas: [HOME_PAGE, "otra.html"],
            union: analyze([...chunksDe("a"), ...chunksDe("c")]),
            paginas: [
                { ruta: HOME_PAGE, analysis: analyze(chunksDe("a")) },
                { ruta: "otra.html", analysis: analyze(chunksDe("c")) },
            ],
        };
    };
    /* El censo de un sitio sintético no tiene la deuda del sitio real; se le
     * pone la declarada para que la auditoría no proteste por eso y el caso
     * ejercite lo que dice ejercitar. */
    const censoDe = (site) => {
        const base = {
            ...toCensus(site, { medido: "2026-09-04", origen: "sintético" }),
            duplicacionCrudaBytes: DECLARED_DUPLICATE_RAW_BYTES,
            modulosDuplicados: DECLARED_DUPLICATE_MODULES,
        };
        return base;
    };
    const opciones = (site, censo) => ({
        expectedChunks: censo.chunks.length,
        expectedPages: site.rutas.length,
        expectedDigest: digestOf(censo),
    });

    it("ninguna de las dos páginas, por sí sola, tiene gemelos", () => {
        const site = sitio();
        for (const pagina of site.paginas) {
            expect(pagina.analysis.twins).toEqual([]);
        }
    });

    it("la unión de las dos sí los tiene, y por encima de la cota el veredicto los canta", () => {
        const site = sitio();
        const censo = censoDe(site);
        expect(site.union.twins).toHaveLength(DECLARED_UNION_TWIN_GROUPS + 1);
        const { problems } = verdictSite(site, censo, opciones(site, censo));
        expect(problems.join(" ")).toContain(
            "duplicación de chunks ÍNTEGROS entre páginas",
        );
        expect(problems.join(" ")).toContain("[unión]");
    });

    /*
     * EL CASO ESPEJO, y sin él el anterior no demuestra nada: un candado que
     * canta siempre no distingue lo declarado de lo nuevo. Con exactamente los
     * grupos declarados —y sus bytes por debajo de la cota— el veredicto tiene
     * que salir limpio.
     *
     * QUÉ ATRAPA Y QUÉ NO, dicho con precisión porque la diferencia se midió:
     * atrapa que el candado se pase de estricto (inyectando `>=` en vez de `>`
     * en la comparación de grupos, este caso se pone en rojo y los demás no).
     * NO atrapa que alguien baje `DECLARED_UNION_TWIN_GROUPS` sin mirar el
     * build, porque el sitio sintético se construye a partir de esa misma
     * constante y encoge con ella —comprobado inyectando el 1: los casos
     * sintéticos siguieron todos en verde—. De eso se encarga el bloque de
     * integración contra el `out/` real, que es el único que sabe cuántos
     * grupos hay de verdad.
     */
    it("un sitio con tantos grupos de gemelos como los declarados pasa en verde", () => {
        const site = sitio(DECLARED_UNION_TWIN_GROUPS);
        const censo = censoDe(site);
        expect(site.union.twins).toHaveLength(DECLARED_UNION_TWIN_GROUPS);
        const bytes = site.union.twins.reduce(
            (acc, twin) => acc + twin.wastedBrotliBytes,
            0,
        );
        expect(bytes).toBeLessThanOrEqual(DECLARED_UNION_TWIN_BROTLI_BYTES);
        expect(
            verdictSite(site, censo, opciones(site, censo)).problems,
        ).toEqual([]);
    });

    it("un sitio sin copias entre páginas pasa el mismo veredicto en verde", () => {
        const home = analyze([makeChunk("a.js", modulosA)]);
        const otra = analyze([makeChunk("c.js", modulosB)]);
        const site = {
            rutas: [HOME_PAGE, "otra.html"],
            union: analyze([
                makeChunk("a.js", modulosA),
                makeChunk("c.js", modulosB),
            ]),
            paginas: [
                { ruta: HOME_PAGE, analysis: home },
                { ruta: "otra.html", analysis: otra },
            ],
        };
        const censo = censoDe(site);
        expect(
            verdictSite(site, censo, opciones(site, censo)).problems,
        ).toEqual([]);
    });

    /*
     * Casi todos los chunks del sitio los piden las ocho páginas, así que un
     * solo chunk que engorde imprimía ocho líneas literalmente iguales. Se
     * agrupan en una, con las páginas enumeradas: el hallazgo no se pierde y
     * deja de enterrar a los demás.
     */
    it("agrupa en una línea el problema que comparten varias páginas", () => {
        const compartidos = [
            { id: "3001", size: 900 },
            { id: "3002", size: 500 },
        ];
        const home = analyze([
            makeChunk("compartido.js", compartidos),
            makeChunk("solo-a.js", modulosA),
        ]);
        const otra = analyze([
            makeChunk("compartido.js", compartidos),
            makeChunk("solo-b.js", modulosB),
        ]);
        const site = {
            rutas: [HOME_PAGE, "otra.html"],
            union: analyze([
                makeChunk("compartido.js", compartidos),
                makeChunk("solo-a.js", modulosA),
                makeChunk("solo-b.js", modulosB),
            ]),
            paginas: [
                { ruta: HOME_PAGE, analysis: home },
                { ruta: "otra.html", analysis: otra },
            ],
        };
        const firma = fingerprintOf(compartidos.map((entry) => entry.id));
        const exceso = CHUNK_GROWTH_LIMIT_BYTES + 1;
        const base = censoDe(site);
        const trucado = {
            ...base,
            chunks: base.chunks.map((chunk) =>
                chunk.firma === firma
                    ? { ...chunk, brotli: chunk.brotli - exceso }
                    : chunk,
            ),
            paginas: base.paginas.map((pagina) => ({
                ...pagina,
                descargadoBrotli: pagina.descargadoBrotli - exceso,
            })),
        };
        const { problems } = verdictSite(site, trucado, {
            expectedChunks: trucado.chunks.length,
            expectedPages: site.rutas.length,
            expectedDigest: digestOf(trucado),
        });
        const crecidos = problems.filter((problem) =>
            problem.includes("sobre la línea base"),
        );
        expect(crecidos).toHaveLength(1);
        expect(crecidos[0]).toContain("[las 2 páginas]");
    });

    it("falla cuando el build emite una página que el censo no declara", () => {
        const site = sitio();
        const censo = censoDe(site);
        const recortado = {
            ...censo,
            paginas: censo.paginas.filter(
                (pagina) => pagina.ruta === HOME_PAGE,
            ),
        };
        const { problems } = verdictSite(site, recortado, {
            expectedChunks: recortado.chunks.length,
            expectedPages: 1,
            expectedDigest: digestOf(recortado),
        });
        expect(problems.join(" ")).toContain("página nueva sin revisar");
    });

    it("falla cuando el censo declara una página que el build ya no emite", () => {
        const site = sitio();
        const censo = censoDe(site);
        const ampliado = {
            ...censo,
            paginas: [
                ...censo.paginas,
                {
                    ruta: "fantasma.html",
                    chunksDescargados: 0,
                    descargadoBrotli: 0,
                    polyfillBrotli: 0,
                    refs: [],
                },
            ],
        };
        const { problems } = verdictSite(site, ampliado, {
            expectedChunks: ampliado.chunks.length,
            expectedPages: 3,
            expectedDigest: digestOf(ampliado),
        });
        expect(problems.join(" ")).toContain(
            "el censo de páginas encogió sin revisarse",
        );
    });
});

/*
 * LA AUDITORÍA DEL CENSO, QUE ES LA QUE CORRE EN CI. Aquí no hay `out/` que
 * medir: lo único disponible es el JSON versionado y las constantes del script.
 * Cada caso ataca el censo por una vía distinta, y el que abre el bloque es la
 * reproducción literal del defecto que el verificador midió sobre `571b6df`.
 */
/*
 * La compresión que el presupuesto mide es la SERVIDA (decisión del dueño,
 * 2026-09-10): la de `compression@1.8.1` en `serve@14.2.6`, brotli de calidad 4
 * con umbral de 1.024 B. Hasta esa fecha el instrumento medía a calidad 11 y
 * decía que era la del hosting; el cable pesaba 43.110 B más que el censo.
 */
describe("la compresión es la que se sirve", () => {
    const aCalidad = (text, quality) =>
        brotliCompressSync(Buffer.from(text, "utf8"), {
            params: { [constants.BROTLI_PARAM_QUALITY]: quality },
        }).length;
    /* Texto sintético de unos 20 KB, repetitivo pero no trivial. */
    const grande = Array.from(
        { length: 800 },
        (_, index) => `const v${index} = ${(index * 7919) % 104729};`,
    ).join("\n");

    it("declara la calidad 4 y el umbral de 1.024 B de compression@1.8.1", () => {
        expect(SERVED_COMPRESSION).toEqual({
            calidad: 4,
            umbral: 1024,
            origen: "compression@1.8.1 (serve@14.2.6)",
        });
    });

    it("por debajo del umbral el fichero viaja sin comprimir: cuenta sus bytes crudos", () => {
        const pequeno = "x".repeat(SERVED_COMPRESSION.umbral - 1);
        expect(brotliBytes(pequeno)).toBe(SERVED_COMPRESSION.umbral - 1);
    });

    it("desde el umbral comprime con brotli de calidad 4, no de calidad 11", () => {
        expect(grande.length).toBeGreaterThan(15_000);
        expect(aCalidad(grande, 4)).not.toBe(aCalidad(grande, 11));
        expect(brotliBytes(grande)).toBe(aCalidad(grande, 4));
    });

    it("el censo versionado declara esa misma compresión", () => {
        expect(readBaseline().compresion).toEqual(SERVED_COMPRESSION);
    });

    it("un censo hecho con otra compresión no pasa la auditoría", () => {
        const censo = readBaseline();
        const aCalidad11 = {
            ...censo,
            compresion: { ...censo.compresion, calidad: 11 },
        };
        expect(auditBaseline(aCalidad11).join(" ")).toContain(
            "sus bytes no son comparables",
        );
        const sinCompresion = { ...censo };
        delete sinCompresion.compresion;
        expect(auditBaseline(sinCompresion).join(" ")).toContain(
            "sus bytes no son comparables",
        );
    });
});

describe("auditoría del censo versionado", () => {
    const censo = readBaseline();

    it("existe, tiene chunks y tiene páginas", () => {
        expect(censo, `falta ${measureHomeJs.BASELINE_PATH}`).not.toBeNull();
        expect(censo.chunks.length).toBeGreaterThan(0);
        expect(censo.paginas.length).toBeGreaterThan(0);
    });

    it("pasa la auditoría completa sin problemas", () => {
        expect(auditBaseline(censo)).toEqual([]);
    });

    it("declara exactamente los chunks y las páginas que dice el script", () => {
        expect(censo.chunks.length).toBe(BASELINE_CHUNKS);
        expect(censo.paginas.length).toBe(BASELINE_PAGES);
    });

    it("el sello del censo es el que declara el script", () => {
        expect(digestOf(censo)).toBe(BASELINE_DIGEST);
    });

    it("el total declarado es el de la home, y cabe en el presupuesto", () => {
        const home = censo.paginas.find((pagina) => pagina.ruta === HOME_PAGE);
        expect(home).toBeDefined();
        expect(censo.totalDescargadoBrotli).toBe(home.descargadoBrotli);
        expect(censo.totalDescargadoBrotli).toBeLessThanOrEqual(BUDGET_BYTES);
    });

    it("cada página declara lo que suman las filas que cita", () => {
        for (const pagina of censo.paginas) {
            const suma = pagina.refs.reduce(
                (acc, index) => acc + censo.chunks[index].brotli,
                0,
            );
            expect(suma, `descuadre en ${pagina.ruta}`).toBe(
                pagina.descargadoBrotli,
            );
        }
    });

    /*
     * EL RECORTE COORDINADO. Es el defecto que invalidaba la garantía entera:
     * hasta la ola R, borrar una fila del censo Y bajar `BASELINE_CHUNKS` a la
     * vez dejaba la suite en verde en CI, porque la única atadura sin `out/`
     * comparaba dos números que el mismo gesto controla. Aquí se ejecuta el
     * recorte completo —fila borrada, referencias retiradas de las páginas que
     * la citaban, totales de esas páginas corregidos y constante bajada— y se
     * comprueba que sigue en rojo.
     */
    it("el recorte coordinado del censo ya no pasa en verde", () => {
        const sobrante = censo.chunks.length - 1;
        const peso = censo.chunks[sobrante].brotli;
        const recortado = {
            ...censo,
            chunks: censo.chunks.slice(0, sobrante),
            paginas: censo.paginas.map((pagina) => {
                if (!pagina.refs.includes(sobrante)) return pagina;
                return {
                    ...pagina,
                    chunksDescargados: pagina.chunksDescargados - 1,
                    descargadoBrotli: pagina.descargadoBrotli - peso,
                    refs: pagina.refs.filter((index) => index !== sobrante),
                };
            }),
        };
        const problems = auditBaseline(recortado, {
            expectedChunks: sobrante,
            expectedPages: BASELINE_PAGES,
        });
        expect(problems.join(" ")).toContain("el sello del censo es");
        expect(problems.join(" ")).toContain("sin regenerarlo desde un build");
    });

    it("borrar una fila sin bajar la constante también falla, por los dos sitios", () => {
        const recortado = { ...censo, chunks: censo.chunks.slice(0, -1) };
        const problems = auditBaseline(recortado);
        expect(problems.join(" ")).toContain(
            "la tabla cambió de tamaño sin actualizar",
        );
        expect(problems.join(" ")).toContain("que no existe en una tabla de");
    });

    it("bajar la constante sin tocar el censo también falla", () => {
        const problems = auditBaseline(censo, {
            expectedChunks: BASELINE_CHUNKS - 1,
        });
        expect(problems.join(" ")).toContain(
            "la tabla cambió de tamaño sin actualizar",
        );
    });

    /*
     * Borrar una PÁGINA es el recorte hermano del de la fila, y se cierra por
     * las mismas dos vías: si la página era la única que citaba alguna fila, esa
     * fila queda huérfana; y si no lo era —como pasa con la última del censo
     * real, cuya fila propia también la cita su gemela en inglés—, lo que queda
     * en pie es el sello. Se comprueban los dos casos porque el primero no cubre
     * al segundo.
     */
    it("borrar una página del censo falla aunque se baje `BASELINE_PAGES`", () => {
        const recortado = { ...censo, paginas: censo.paginas.slice(0, -1) };
        const problems = auditBaseline(recortado, {
            expectedPages: BASELINE_PAGES - 1,
        });
        expect(problems.join(" ")).toContain("el sello del censo es");
    });

    it("borrar las únicas páginas que citan una fila la deja huérfana", () => {
        const citadaPorTodas = new Map();
        for (const pagina of censo.paginas) {
            for (const index of pagina.refs) {
                citadaPorTodas.set(index, (citadaPorTodas.get(index) ?? 0) + 1);
            }
        }
        const rara = [...citadaPorTodas.entries()].find(
            ([, veces]) => veces < censo.paginas.length,
        );
        expect(
            rara,
            "el censo real tiene filas que no citan todas",
        ).toBeDefined();
        const recortado = {
            ...censo,
            paginas: censo.paginas.filter(
                (pagina) => !pagina.refs.includes(rara[0]),
            ),
        };
        const problems = auditBaseline(recortado, {
            expectedPages: recortado.paginas.length,
        });
        expect(problems.join(" ")).toContain("es una fila huérfana");
    });

    it("una fila que ninguna página cita se declara huérfana", () => {
        const inflado = {
            ...censo,
            chunks: [
                ...censo.chunks,
                {
                    firma: "000000000000",
                    modulos: 1,
                    brotli: 1,
                    crudo: 1,
                    pistas: [],
                },
            ],
        };
        const problems = auditBaseline(inflado, {
            expectedChunks: censo.chunks.length + 1,
        });
        expect(problems.join(" ")).toContain("es una fila huérfana");
    });

    it("un total de página que no cuadra con sus filas falla", () => {
        const trucado = {
            ...censo,
            paginas: censo.paginas.map((pagina, index) =>
                index === 0
                    ? {
                          ...pagina,
                          descargadoBrotli: pagina.descargadoBrotli - 1,
                      }
                    : pagina,
            ),
        };
        expect(auditBaseline(trucado).join(" ")).toContain(
            "el censo y sus totales no cuadran",
        );
    });

    it("una página que referencia una fila inexistente falla", () => {
        const trucado = {
            ...censo,
            paginas: censo.paginas.map((pagina, index) =>
                index === 0
                    ? { ...pagina, refs: [...pagina.refs, censo.chunks.length] }
                    : pagina,
            ),
        };
        expect(auditBaseline(trucado).join(" ")).toContain(
            "que no existe en una tabla de",
        );
    });

    it("una página que cita dos veces la misma fila falla", () => {
        const trucado = {
            ...censo,
            paginas: censo.paginas.map((pagina, index) =>
                index === 0
                    ? {
                          ...pagina,
                          chunksDescargados: pagina.chunksDescargados + 1,
                          descargadoBrotli:
                              pagina.descargadoBrotli +
                              censo.chunks[pagina.refs[0]].brotli,
                          refs: [...pagina.refs, pagina.refs[0]],
                      }
                    : pagina,
            ),
        };
        expect(auditBaseline(trucado).join(" ")).toContain(
            "referencia dos veces la fila",
        );
    });

    /*
     * El sello se calcula sobre el CONTENIDO ya interpretado, no sobre el
     * fichero: pasar Prettier por el JSON o reordenar sus claves no lo mueve.
     * Si dependiera del texto, cualquier reformateo dejaría el gate en rojo y
     * alguien "arreglaría" el candado desactivándolo.
     */
    it("el sello no depende del formato ni del orden de las claves", () => {
        const reordenado = Object.fromEntries(Object.entries(censo).reverse());
        expect(digestOf(reordenado)).toBe(digestOf(censo));
    });

    it("el sello sí depende de cualquier número del censo", () => {
        const movido = {
            ...censo,
            totalDescargadoBrotli: censo.totalDescargadoBrotli + 1,
        };
        expect(digestOf(movido)).not.toBe(digestOf(censo));
    });

    it("la rebanada de una página son exactamente las filas que cita", () => {
        const home = censo.paginas.find((pagina) => pagina.ruta === HOME_PAGE);
        const slice = pageBaseline(censo, HOME_PAGE);
        expect(slice.chunks).toHaveLength(home.refs.length);
        expect(slice.totalDescargadoBrotli).toBe(home.descargadoBrotli);
        expect(pageBaseline(censo, "no-existe.html")).toBeNull();
    });
});

/*
 * Medir un build real cuesta segundos, no milisegundos: `analyzeSite()`
 * comprime en brotli los chunks de las ocho páginas. Se declara un tiempo de
 * espera propio en vez de heredar el de una aserción de jsdom, porque la
 * lentitud de una medición legítima no debe leerse como un fallo.
 */
const INTEGRACION_TIMEOUT_MS = 60_000;

/*
 * Bloque de integración: solo corre donde hay un `out/` construido. En CI no
 * lo hay y estos casos se saltan — decir "no hay build" en voz alta es
 * preferible a un verde que no midió nada.
 *
 * La medición se hace UNA vez en `beforeAll` y los tres casos la comparten.
 * Antes cada caso llamaba a `analyzeSite()` por su cuenta: tres compresiones
 * completas del build, y con el pool de Vitest en paralelo ese gasto de CPU
 * agotaba el tiempo de espera por defecto de los ficheros pesados de jsdom que
 * corrían a la vez. El síntoma fue cinco tests cayendo por `Test timed out`
 * sin una sola aserción fallida, todos ellos verdes al ejecutarlos aislados.
 * Compartir la medición no afloja ningún candado: se mide lo mismo, una vez.
 */
describe.skipIf(!existsSync("out/index.html"))(
    "el build real contra el censo",
    () => {
        let site;
        let baseline;

        beforeAll(() => {
            site = analyzeSite();
            baseline = readBaseline();
        }, INTEGRACION_TIMEOUT_MS);

        it("el build emite exactamente las páginas que el censo declara", () => {
            const rutas = listPages();
            expect(rutas).toHaveLength(BASELINE_PAGES);
            expect(rutas).toEqual(
                baseline.paginas.map((pagina) => pagina.ruta),
            );
        });

        it("pasa los nueve candados", () => {
            const { problems } = verdictSite(site, baseline);
            expect(
                problems,
                `el build real no pasa los candados: ${problems.join(" · ")}`,
            ).toEqual([]);
        });

        it(
            "la home que mide `readChunks` es la misma que mide el sitio entero",
            () => {
                const home = site.paginas.find(
                    (pagina) => pagina.ruta === HOME_PAGE,
                );
                expect(home.analysis.downloadedBytes).toBe(
                    analyze(readChunks()).downloadedBytes,
                );
            },
            INTEGRACION_TIMEOUT_MS,
        );
    },
);

/*
 * El censo guarda la duplicación de la PEOR página, no la de la portada. Es la
 * cota que el candado por página aplica contra `DECLARED_DUPLICATE_*` y la que
 * la auditoría exige que coincida con esas constantes; con la cifra de la
 * portada, el 2026-09-10 (portada 3.263 B, las dos 404 3.266 B) ningún valor
 * de la constante dejaba en verde las dos cosas a la vez.
 */
describe("la duplicación del censo es la cota de la peor página", () => {
    const repetido = (id, size) => ({ id, size });
    const site = () => {
        const portada = [
            makeChunk("p1.js", [repetido("4001", 400)]),
            makeChunk("p2.js", [repetido("4001", 400)]),
        ];
        const otra = [
            makeChunk("o1.js", [repetido("4001", 400), repetido("4002", 300)]),
            makeChunk("o2.js", [repetido("4001", 400), repetido("4002", 300)]),
        ];
        return {
            rutas: [HOME_PAGE, "404.html"],
            union: analyze([...portada, ...otra]),
            paginas: [
                { ruta: HOME_PAGE, analysis: analyze(portada) },
                { ruta: "404.html", analysis: analyze(otra) },
            ],
        };
    };

    it("la portada duplica menos que la otra página", () => {
        const { paginas } = site();
        expect(paginas[0].analysis.duplicateRawBytes).toBeLessThan(
            paginas[1].analysis.duplicateRawBytes,
        );
        expect(paginas[0].analysis.duplicates).toHaveLength(1);
        expect(paginas[1].analysis.duplicates).toHaveLength(2);
    });

    it("toCensus guarda el máximo por página de bytes y de módulos repetidos", () => {
        const sitio = site();
        const censo = toCensus(sitio, {
            medido: "2026-09-10",
            origen: "sintético",
        });
        const peor = sitio.paginas[1].analysis;
        expect(censo.duplicacionCrudaBytes).toBe(peor.duplicateRawBytes);
        expect(censo.modulosDuplicados).toBe(peor.duplicates.length);
    });
});
