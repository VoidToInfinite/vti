#!/usr/bin/env node
/**
 * Instrumento canónico del presupuesto de JavaScript de la home
 * (`PRE-LAUNCH-QA.md` §4). Hasta el 2026-09-01 vivía como un `node -e` suelto
 * escrito a mano en cada medición; que dos personas midieran "lo mismo"
 * dependía de que recordaran los mismos parámetros. Aquí queda fijado.
 *
 * QUÉ MIDE: los chunks que `out/index.html` referencia con `<script src=…>`,
 * comprimidos con **brotli de calidad 11** — que es lo que el hosting sirve de
 * verdad, no gzip. Requiere un `out/` ya construido (`pnpm build`); no lo
 * construye por su cuenta, y por eso no está en `pnpm run ci`: el gate corre
 * sin build.
 *
 * QUÉ NO CUENTA CONTRA EL PRESUPUESTO, y por qué (decisión del dueño,
 * 2026-09-01): el chunk marcado `nomodule`. Es el polyfill que Next emite para
 * navegadores sin soporte de módulos ES; todo navegador moderno lee el
 * atributo y NO LO DESCARGA — verificado el 2026-09-01 sobre el `out/` real
 * servido en local: el log de acceso del servidor y la lista de peticiones de
 * Playwright coinciden en 16 chunks pedidos y cero peticiones a este.
 * Contarlo inflaba la cifra en 35.158 B de bytes
 * que ningún visitante real transfiere, y con ellos dentro el presupuesto
 * salía incumplido por 2.250 B mientras lo que se descarga de verdad sobraba
 * por 32.908 B (medido sobre `86f15a0`). Es la misma lección que dejó escrita la ola I sobre la guarda
 * de AVIF del aura: **una medida de peso se evalúa sobre lo que el visitante
 * DESCARGA**, no sobre lo que el HTML menciona. El polyfill se sigue midiendo
 * y se sigue imprimiendo, aparte, para que el cambio de instrumento sea
 * auditable y no una cifra que baja sola.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AMPLIACIÓN 2026-09-04 (ola Q, frente defensivo Q-4): DELTA POR CHUNK Y
 * CENSO DE MÓDULOS.
 *
 * POR QUÉ. El total llevaba subiendo en TODAS las olas — 262.251 → 264.048 →
 * 272.385 → 277.284 → 284.559 B — y el instrumento solo sabía decir "cumple"
 * o "no cumple". Cuando la cifra dice 284.559 sobre un tope de 290.000, saber
 * que quedan 5.441 B libres no ayuda a nadie: lo que hace falta es saber QUÉ
 * chunk se comió el margen. Un total no se puede diagnosticar; un delta por
 * chunk, sí.
 *
 * EL PROBLEMA DE IDENTIDAD, Y CÓMO SE RESUELVE. Turbopack nombra cada chunk
 * con un hash de contenido (`04mie4ud-_mu2.js`), así que el NOMBRE cambia en
 * cuanto cambia una coma: una línea base indexada por nombre de fichero
 * caducaría en el primer build. Aquí cada chunk se identifica por su **firma
 * de módulos**: el conjunto ordenado de los identificadores de módulo que
 * lleva dentro, resumido a 12 hex. Esos identificadores NO son posicionales —
 * el mismo módulo aparece con el MISMO número en dos chunks distintos, y eso
 * está observado, no supuesto: los dos chunks gemelos de este build
 * (`3u03_w22jspj8.js` y `04mie4ud-_mu2.js`) declaran exactamente los mismos 17
 * identificadores. Un chunk que cambia de composición cambia de firma y el
 * candado lo canta como desconocido, que es justo lo que se quiere: un chunk
 * nuevo es crecimiento invisible hasta que revienta el total.
 *
 * QUÉ VIGILA, en tres candados independientes:
 *
 *   1. **Presupuesto total** (el de siempre): el JS descargado cabe en
 *      `BUDGET_BYTES`.
 *   2. **Duplicación entre chunks**: ningún módulo debería viajar dos veces en
 *      la misma página. La deuda ya medida se declara en
 *      `DECLARED_DUPLICATE_RAW_BYTES` y cualquier duplicación por encima de
 *      ella falla. Ver el apartado siguiente.
 *   3. **Delta por chunk** contra `scripts/home-js-baseline.json`: un chunk
 *      conocido que crece más de `CHUNK_GROWTH_LIMIT_BYTES` brotli falla, y un
 *      chunk cuya firma no está en la línea base falla también.
 *
 * LA DEUDA DECLARADA DE DUPLICACIÓN (medida el 2026-09-04 sobre el build de
 * `0226846`, servido en local). El censo encontró que `out/index.html` (y
 * `out/en.html`, las dos portadas) referencian DOS chunks con la misma
 * composición: 17 identificadores de módulo idénticos, 109.716 B crudos cada
 * uno, cuerpos byte a byte iguales módulo a módulo. Lo que contienen es la
 * cáscara del sitio — `Navbar` (con `NavSheet`, `ThemeToggle`,
 * `LanguageSelector`), `Footer`, `Logo`, `Typography`, `VisuallyHidden`,
 * `BrandName`, `SectionBeam`, `useReveal`, `useDocumentMeta`, `links`,
 * `NAV_GROUPS` y las constantes del arte del hero. Uno de los dos
 * (`3u03_w22jspj8.js`) lo referencian las OCHO páginas del build; el otro
 * (`04mie4ud-_mu2.js`, 28.413 B brotli) solo las dos portadas, y es
 * íntegramente redundante. Es la misma familia de defecto que la ola G ya
 * pagó una vez —los mismos módulos emitidos en dos grupos de chunks
 * hermanos— y su arreglo vive en el árbol de `app/`, fuera del alcance de
 * este frente: queda escrito con su cifra para que lo decida el dueño. El
 * total de bytes crudos que viajan repetidos hoy es 116.368 en 21 módulos
 * (los 17 de los gemelos más cuatro módulos pequeños del runtime de Next
 * repartidos entre tres chunks). Mientras esa decisión no se tome, el candado
 * NO se pone rojo por la deuda ya conocida — se pone rojo si la duplicación
 * CRECE.
 *
 * SALIDA: tabla por chunk con su delta, censo de duplicación, los dos totales
 * (descargado y HTML completo) y el veredicto. Código de salida 1 si falla
 * cualquiera de los tres candados.
 *
 * REGENERAR LA LÍNEA BASE: `node scripts/measure-home-js.mjs --update-baseline`
 * tras un `pnpm build`, y SOLO después de haber mirado el delta y entendido
 * por qué sube. La línea base es un acta de lo medido, no un botón para
 * callar al instrumento. El JSON se escribe con `JSON.stringify`, que no
 * coincide con el estilo de Prettier para arrays cortos, así que después hay
 * que pasar `pnpm exec prettier --write scripts/home-js-baseline.json` o
 * `pnpm check-format` lo listará como diferente.
 *
 * POR QUÉ ESTE SCRIPT SIGUE FUERA DE `pnpm run ci`, dicho explícitamente para
 * que nadie lo "arregle" sin leer: necesita un `out/` construido, y el gate
 * corre sin build (también en Netlify, cuyo `command` es `pnpm run ci &&
 * pnpm build` — el gate va ANTES). Lo que sí corre en el gate es
 * `scripts/measure-home-js.test.mjs`, que ejercita esta lógica con chunks
 * sintéticos y comprueba la coherencia interna de la línea base; y cuando la
 * máquina donde corre tiene un `out/` a mano, ese mismo test compara el build
 * real contra ella.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CLS BAJO EL PERFIL ESTRANGULADO (medido 2026-09-04, ola Q, frente Q-4).
 *
 * Se deja aquí, en el instrumento de rendimiento que sí está versionado, para
 * que la próxima ronda parta de una cifra y no de una declaración. Las tres
 * críticas externas anteriores dieron CLS = 0, pero ninguna estranguló: una lo
 * dijo por escrito («dato suplementario, fuera del protocolo»). El CLS aparece
 * justo cuando la red va lenta y las imágenes llegan tarde, así que un cero
 * sin estrangular no es el mismo cero.
 *
 * MÉTODO. Chrome real por CDP con `Network.emulateNetworkConditions` (latency
 * 150 ms, 200.000 B/s de bajada, 100.000 de subida) y
 * `Emulation.setCPUThrottlingRate` rate 4 — el perfil literal del protocolo —,
 * `Network.setCacheDisabled`, contexto de Playwright NUEVO en cada corrida,
 * tema fijado en `localStorage` antes de cargar,
 * `document.visibilityState === "visible"` comprobado en todas, un
 * `PerformanceObserver` de `layout-shift` con `buffered: true` instalado antes
 * de la navegación, y 12 s de reposo tras `load`.
 *
 * RESULTADO: **CLS = 0,000000 en las DOCE corridas** — tres por tema en
 * 1440×900 DPR1 y tres por tema en 390×844 DPR3 —, con CERO entradas de
 * `layout-shift` registradas. Mediana 0,000000 en los cuatro escenarios.
 *
 * Y LA SONDA NO ESTÁ CIEGA, que es la parte que convierte el cero en un dato:
 * con el mismo perfil y el mismo observador, insertando a mano una barra de
 * 200 px como primer hijo del `<body>` después del `load`, la misma sonda pasó
 * de 0 a 0,1388888888888889 en un único desplazamiento, con `SECTION#hero`
 * como fuente. El cero de arriba es un cero medido por un instrumento que se
 * ha visto reaccionar, no un instrumento que no mira. Es la misma lección que
 * dejó escrita la entrada del 2026-08-11 de `task/lessons.md`: un CLS de 0
 * puede significar «no hay salto» o «no había nada que desplazar», y solo
 * ejercitar la sonda distingue los dos casos.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Presupuesto vigente en bytes brotli (`PRE-LAUNCH-QA.md` §4). */
export const BUDGET_BYTES = 290_000;

/**
 * Cuánto puede engordar UN chunk conocido antes de que el candado falle, en
 * bytes brotli. No es un número redondo por gusto: con 5.441 B de margen
 * libre medidos el 2026-09-04, cinco chunks creciendo 1.000 B cada uno se
 * comen el presupuesto entero. Si un cambio legítimo necesita más, se mira el
 * delta, se entiende y se regenera la línea base a mano.
 */
export const CHUNK_GROWTH_LIMIT_BYTES = 1_000;

/** Bytes CRUDOS que hoy viajan repetidos entre chunks descargados (ver docblock). */
export const DECLARED_DUPLICATE_RAW_BYTES = 116_368;

/** Módulos distintos que hoy aparecen en más de un chunk descargado. */
export const DECLARED_DUPLICATE_MODULES = 21;

export const OUT_DIR = "out";
export const BASELINE_PATH = path.join(
    ROOT,
    "scripts",
    "home-js-baseline.json",
);

/**
 * Los `<script>` con `src` a un chunk de Next. El atributo del polyfill se
 * emite como `noModule=""` (React lo serializa en camelCase); el parser de
 * HTML lo trata sin distinguir mayúsculas, así que aquí se compara igual.
 */
const SCRIPT_TAG_SOURCE =
    '<script[^>]*\\ssrc="(\\/_next\\/static\\/chunks\\/[^"]+)"([^>]*)>';

/**
 * Cabecera de un módulo dentro de un chunk de Turbopack: `,<id>,<fn>=>{`. La
 * lista de parámetros varía entre builds y entre módulos (`e`, `(e,t,n)`,
 * `(e,t,r)`, `(e,r,t)`), así que se acepta cualquiera de las dos formas en vez
 * de fijar una. Se construye una instancia nueva en cada llamada a propósito:
 * una expresión regular global compartida arrastra `lastIndex` entre usos.
 */
const MODULE_ID_SOURCE =
    ",(\\d{2,9}),(?:\\([^)]{0,60}\\)|[A-Za-z_$][\\w$]*)=>\\{";

/** Identificadores de módulo declarados dentro del texto de un chunk. */
export function parseModuleIds(text) {
    const re = new RegExp(MODULE_ID_SOURCE, "g");
    return [...text.matchAll(re)].map((match) => match[1]);
}

/** Longitud del cuerpo de cada módulo, por identificador. */
export function parseModuleSizes(text) {
    const re = new RegExp(MODULE_ID_SOURCE, "g");
    const marks = [...text.matchAll(re)].map((match) => ({
        id: match[1],
        at: match.index,
    }));
    return marks.map((mark, index) => ({
        id: mark.id,
        length:
            (index + 1 < marks.length ? marks[index + 1].at : text.length) -
            mark.at,
    }));
}

/**
 * Firma estable de un chunk: sus identificadores de módulo, ordenados y
 * resumidos. Independiente del nombre de fichero (que es un hash de contenido
 * y cambia en cada build) y del orden en que Turbopack los emita.
 */
export function fingerprintOf(moduleIds) {
    if (moduleIds.length === 0) return "sin-modulos";
    return createHash("sha1")
        .update([...moduleIds].sort().join(","))
        .digest("hex")
        .slice(0, 12);
}

/**
 * Pistas legibles de qué hay dentro de un chunk, para que la línea base se
 * pueda leer como un censo y no como una lista de hashes. Salen del código ya
 * minificado, así que son orientativas por definición: sirven para reconocer
 * el chunk, no para auditarlo.
 */
export function hintsOf(text) {
    const displayNames = [...text.matchAll(/displayName:"([^"]{1,60})"/g)].map(
        (match) => match[1].split("__")[0],
    );
    const exports = [...text.matchAll(/"([A-Za-z_$][\w$]{2,40})",0,/g)].map(
        (match) => match[1],
    );
    return [...new Set([...displayNames, ...exports])].slice(0, 6);
}

/** Comprime un texto con el mismo brotli que sirve el hosting. */
export function brotliBytes(text) {
    return brotliCompressSync(Buffer.from(text, "utf8"), {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
}

/**
 * Lee del disco los chunks que una página referencia. Devuelve el texto sin
 * medir nada: quien mide es `analyze`, que así se puede ejercitar con chunks
 * sintéticos sin tocar el disco.
 */
export function readChunks(outDir = OUT_DIR, entry = "index.html") {
    const entryPath = path.join(outDir, entry);
    if (!existsSync(entryPath)) {
        throw new Error(
            `No existe ${entryPath}. Este instrumento mide el build real: ejecuta ` +
                `\`pnpm build\` antes.`,
        );
    }
    const html = readFileSync(entryPath, "utf8");
    const re = new RegExp(SCRIPT_TAG_SOURCE, "g");
    const chunks = [...html.matchAll(re)].map(([, src, rest]) => ({
        name: path.basename(src),
        text: readFileSync(path.join(outDir, src), "utf8"),
        legacyOnly: /\bnomodule\b/i.test(rest),
    }));
    if (chunks.length === 0) {
        throw new Error(
            `${entryPath} no referencia ningún chunk. El build está incompleto o el ` +
                `formato de salida de Next cambió: revisa el patrón antes de fiarte de ` +
                `un cero.`,
        );
    }
    return chunks;
}

/** Módulos que aparecen en más de un chunk DESCARGADO, con lo que cuestan. */
export function findDuplicateModules(chunks) {
    const seen = new Map();
    for (const chunk of chunks) {
        if (chunk.legacyOnly) continue;
        for (const entry of chunk.modules) {
            if (!seen.has(entry.id)) seen.set(entry.id, []);
            seen.get(entry.id).push({
                chunk: chunk.name,
                length: entry.length,
            });
        }
    }
    const duplicates = [];
    for (const [id, copies] of seen) {
        if (copies.length < 2) continue;
        /*
         * La primera copia es la que el sitio necesita; las demás son las que
         * sobran. Se cuenta el crudo, no el brotli, porque el brotli de un
         * módulo suelto no es una fracción del brotli del chunk que lo lleva.
         */
        const wastedRawBytes = copies
            .slice(1)
            .reduce((acc, copy) => acc + copy.length, 0);
        duplicates.push({ id, copies, wastedRawBytes });
    }
    return duplicates.sort((a, b) => b.wastedRawBytes - a.wastedRawBytes);
}

/** Mide cada chunk y saca los totales, el censo de módulos y la duplicación. */
export function analyze(rawChunks) {
    const chunks = rawChunks.map((chunk) => {
        const modules = parseModuleSizes(chunk.text);
        return {
            name: chunk.name,
            legacyOnly: Boolean(chunk.legacyOnly),
            raw: chunk.text.length,
            brotli: brotliBytes(chunk.text),
            modules,
            moduleIds: modules.map((entry) => entry.id),
            fingerprint: fingerprintOf(modules.map((entry) => entry.id)),
            hints: hintsOf(chunk.text),
        };
    });
    const sum = (list) => list.reduce((acc, chunk) => acc + chunk.brotli, 0);
    const downloaded = chunks.filter((chunk) => !chunk.legacyOnly);
    const legacy = chunks.filter((chunk) => chunk.legacyOnly);
    const duplicates = findDuplicateModules(chunks);
    return {
        chunks,
        downloadedBytes: sum(downloaded),
        legacyBytes: sum(legacy),
        duplicates,
        duplicateRawBytes: duplicates.reduce(
            (acc, duplicate) => acc + duplicate.wastedRawBytes,
            0,
        ),
    };
}

/**
 * Empareja el build actual con la línea base por FIRMA de módulos y devuelve
 * el delta de cada chunk descargado. Un chunk cuya firma no está en la línea
 * base sale como `desconocido`: puede ser un chunk nuevo o uno conocido que
 * cambió de composición, y las dos cosas exigen mirar antes de aceptar.
 */
export function compareWithBaseline(analysis, baseline) {
    /*
     * La línea base se consume como MULTICONJUNTO, no como diccionario: dos
     * chunks con la misma composición comparten firma —hoy los gemelos de la
     * portada lo hacen— y un `Map` simple haría que el segundo se comparase
     * contra la entrada del primero. Cada chunk actual consume una entrada de
     * su firma, la de tamaño más parecido; lo que sobra al final es lo que
     * desapareció del build.
     */
    const pool = new Map();
    for (const chunk of baseline?.chunks ?? []) {
        if (!pool.has(chunk.firma)) pool.set(chunk.firma, []);
        pool.get(chunk.firma).push(chunk);
    }
    const rows = analysis.chunks
        .filter((chunk) => !chunk.legacyOnly)
        .sort((a, b) => b.brotli - a.brotli)
        .map((chunk) => {
            const candidates = pool.get(chunk.fingerprint) ?? [];
            let before = null;
            if (candidates.length > 0) {
                let best = 0;
                for (let i = 1; i < candidates.length; i++) {
                    if (
                        Math.abs(candidates[i].brotli - chunk.brotli) <
                        Math.abs(candidates[best].brotli - chunk.brotli)
                    ) {
                        best = i;
                    }
                }
                before = candidates.splice(best, 1)[0];
            }
            return {
                name: chunk.name,
                fingerprint: chunk.fingerprint,
                brotli: chunk.brotli,
                hints: chunk.hints,
                baselineBrotli: before ? before.brotli : null,
                delta: before ? chunk.brotli - before.brotli : null,
            };
        });
    return {
        rows,
        unknown: rows.filter((row) => row.baselineBrotli === null),
        grown: rows.filter(
            (row) => row.delta !== null && row.delta > CHUNK_GROWTH_LIMIT_BYTES,
        ),
        missing: [...pool.values()].flat(),
        totalDelta:
            baseline?.totalDescargadoBrotli === undefined
                ? null
                : analysis.downloadedBytes - baseline.totalDescargadoBrotli,
    };
}

/** Los tres candados juntos. `problems` vacío = todo en verde. */
export function verdict(analysis, baseline) {
    const comparison = compareWithBaseline(analysis, baseline);
    const problems = [];
    const over = analysis.downloadedBytes - BUDGET_BYTES;
    if (over > 0) {
        problems.push(
            `el JS descargado se pasa del presupuesto por ${over.toLocaleString("es-ES")} B`,
        );
    }
    if (analysis.duplicateRawBytes > DECLARED_DUPLICATE_RAW_BYTES) {
        problems.push(
            `la duplicación entre chunks sube a ${analysis.duplicateRawBytes.toLocaleString("es-ES")} B ` +
                `crudos, por encima de los ${DECLARED_DUPLICATE_RAW_BYTES.toLocaleString("es-ES")} B ya ` +
                `declarados: hay módulos NUEVOS viajando dos veces`,
        );
    }
    if (analysis.duplicates.length > DECLARED_DUPLICATE_MODULES) {
        problems.push(
            `hay ${analysis.duplicates.length} módulos repetidos entre chunks, más que los ` +
                `${DECLARED_DUPLICATE_MODULES} declarados`,
        );
    }
    for (const row of comparison.grown) {
        problems.push(
            `el chunk ${row.name} (${row.fingerprint}) crece ${row.delta.toLocaleString("es-ES")} B ` +
                `brotli sobre la línea base, más que el límite de ${CHUNK_GROWTH_LIMIT_BYTES.toLocaleString("es-ES")} B`,
        );
    }
    for (const row of comparison.unknown) {
        problems.push(
            `el chunk ${row.name} (${row.fingerprint}, ${row.brotli.toLocaleString("es-ES")} B brotli) ` +
                `no está en la línea base: composición nueva sin revisar`,
        );
    }
    return { comparison, problems, overBudgetBytes: over };
}

/** Línea base versionada, o `null` si todavía no existe. */
export function readBaseline(file = BASELINE_PATH) {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8"));
}

/** Serializa el acta de una medición para guardarla como línea base. */
export function toBaseline(analysis, meta) {
    return {
        medido: meta.medido,
        origen: meta.origen,
        presupuestoBytes: BUDGET_BYTES,
        totalDescargadoBrotli: analysis.downloadedBytes,
        polyfillNomoduleBrotli: analysis.legacyBytes,
        duplicacionCrudaBytes: analysis.duplicateRawBytes,
        modulosDuplicados: analysis.duplicates.length,
        chunks: analysis.chunks
            .filter((chunk) => !chunk.legacyOnly)
            .map((chunk) => ({
                firma: chunk.fingerprint,
                modulos: chunk.modules.length,
                brotli: chunk.brotli,
                crudo: chunk.raw,
                pistas: chunk.hints,
            }))
            .sort((a, b) => b.brotli - a.brotli),
    };
}

/*
 * CLI. Se ejecuta solo cuando este fichero ES el punto de entrada; importado
 * desde el test no imprime ni llama a process.exit.
 */
if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    let rawChunks;
    try {
        rawChunks = readChunks();
    } catch (error) {
        console.error(error.message);
        process.exit(2);
    }
    const analysis = analyze(rawChunks);
    const es = (bytes) => bytes.toLocaleString("es-ES");

    if (process.argv.includes("--update-baseline")) {
        const baseline = toBaseline(analysis, {
            medido: new Date().toISOString().slice(0, 10),
            origen: "out/index.html",
        });
        writeFileSync(
            BASELINE_PATH,
            `${JSON.stringify(baseline, null, 4)}\n`,
            "utf8",
        );
        console.log(
            `Línea base reescrita en ${path.relative(ROOT, BASELINE_PATH)}: ` +
                `${baseline.chunks.length} chunks, ${es(baseline.totalDescargadoBrotli)} B brotli.`,
        );
        process.exit(0);
    }

    const baseline = readBaseline();
    const { comparison, problems } = verdict(analysis, baseline);
    const deltaOf = (row) => {
        if (row.delta === null) return "  NUEVO";
        if (row.delta === 0) return "     ==";
        return `${row.delta > 0 ? "+" : ""}${row.delta}`.padStart(7);
    };
    const byBrotli = [...analysis.chunks].sort((a, b) => b.brotli - a.brotli);
    const rowsByName = new Map(comparison.rows.map((row) => [row.name, row]));
    for (const chunk of byBrotli) {
        const mark = chunk.legacyOnly ? "nomodule" : "        ";
        const row = rowsByName.get(chunk.name);
        const delta = chunk.legacyOnly || !row ? "       " : deltaOf(row);
        console.log(
            `${String(chunk.brotli).padStart(7)} B br | ${delta} Δ | ` +
                `${String(chunk.raw).padStart(8)} B crudo | ${String(chunk.modules.length).padStart(3)} mód | ` +
                `${mark} | ${chunk.name} | ${chunk.hints.slice(0, 3).join(" ") || "—"}`,
        );
    }

    console.log("—".repeat(72));
    if (analysis.duplicates.length > 0) {
        console.log(
            `módulos repetidos entre chunks descargados: ${analysis.duplicates.length} ` +
                `(${es(analysis.duplicateRawBytes)} B crudos que viajan dos veces; ` +
                `deuda declarada: ${es(DECLARED_DUPLICATE_RAW_BYTES)} B en ${DECLARED_DUPLICATE_MODULES} módulos)`,
        );
        for (const duplicate of analysis.duplicates.slice(0, 5)) {
            console.log(
                `  módulo ${duplicate.id.padStart(6)} en ${duplicate.copies.map((copy) => copy.chunk).join(" + ")} ` +
                    `(+${es(duplicate.wastedRawBytes)} B crudos)`,
            );
        }
        if (analysis.duplicates.length > 5) {
            console.log(`  … y ${analysis.duplicates.length - 5} módulos más`);
        }
    } else {
        console.log("módulos repetidos entre chunks descargados: ninguno");
    }

    console.log("—".repeat(72));
    console.log(`chunks referenciados      : ${analysis.chunks.length}`);
    console.log(
        `polyfill nomodule         : ${es(analysis.legacyBytes)} B (no lo descarga ningún navegador moderno)`,
    );
    console.log(
        `JS DESCARGADO (presupuesto): ${es(analysis.downloadedBytes)} B brotli`,
    );
    console.log(
        `total del HTML (contexto) : ${es(analysis.downloadedBytes + analysis.legacyBytes)} B brotli`,
    );
    console.log(`presupuesto               : ${es(BUDGET_BYTES)} B brotli`);
    if (baseline) {
        console.log(
            `línea base (${baseline.medido})  : ${es(baseline.totalDescargadoBrotli)} B brotli · ` +
                `delta total ${comparison.totalDelta > 0 ? "+" : ""}${es(comparison.totalDelta)} B`,
        );
        if (comparison.missing.length > 0) {
            console.log(
                `chunks de la línea base que ya no aparecen: ${comparison.missing.length} ` +
                    `(${comparison.missing.map((chunk) => chunk.firma).join(", ")})`,
            );
        }
    } else {
        console.log(
            `línea base                : NO EXISTE — genérala con \`--update-baseline\``,
        );
    }

    const delta = analysis.downloadedBytes - BUDGET_BYTES;
    console.log(
        delta <= 0
            ? `presupuesto: CUMPLE — ${es(-delta)} B libres`
            : `presupuesto: NO CUMPLE — ${es(delta)} B por encima`,
    );
    if (problems.length === 0) {
        console.log("VEREDICTO: los tres candados en verde.");
    } else {
        console.log("VEREDICTO: FALLA —");
        for (const problem of problems) console.log(`  · ${problem}`);
    }
    process.exit(problems.length === 0 ? 0 : 1);
}
