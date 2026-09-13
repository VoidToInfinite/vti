#!/usr/bin/env node
/**
 * Candado de peso del arte del tema oscuro (ola O, frente defensivo).
 *
 * POR QUE EXISTE. El ancla tecnica de la critica externa pide que una visita
 * al tema oscuro se quede por debajo de 1,5 MB transferidos. Hasta hoy esa
 * ancla no la garantizaba el repo: la garantizaba el navegador. Medido en
 * Chrome sobre el build de `f486570` servido en local (1440x900, tema oscuro
 * fijado por `localStorage`, 3 s tras `load`, sin scroll), una visita oscura
 * transferia 1.391.461 B — el 92,8 % del ancla, con 108.539 B de margen — y
 * 655.523 de esos bytes eran las once capas de la escena de Story, que
 * `loading="lazy"` NO evita descargar: Chrome las pidio igualmente dentro de
 * los tres primeros segundos sin tocar el scroll. Si ademas el navegador
 * elegia la pista ancha de la figura de Journey (`journey-presenting-1024`,
 * 163.368 B, en vez de la de 640 que eligio aqui), el peor caso subia a
 * 1.467.569 B: 32.431 B de margen sobre el ancla. Dos evaluadores de la misma
 * ronda midieron cifras distintas justo por esto — el resultado dependia de
 * que pista y que precarga decidiera cada navegador, no del repo.
 *
 * Este script convierte esa ancla en algo que depende del repo: suma DESDE
 * DISCO el peor caso del arte que una visita oscura descarga (la pista mas
 * pesada de cada capa, que es la que un navegador puede llegar a pedir) y
 * falla si supera un presupuesto declarado con margen. Es el equivalente de
 * `scripts/measure-home-js.mjs` para el arte, con una diferencia deliberada:
 * `measure:js` necesita un `out/` construido y por eso vive fuera del gate;
 * este lee `public/`, que existe siempre, y por eso SI puede correr en
 * `pnpm run ci` — lo hace a traves de `scripts/check-dark-art-weight.test.mjs`,
 * que lo importa y asserta el presupuesto dentro de `pnpm test` (mismo patron
 * que `detect-anti-patterns.test.mjs` con su detector).
 *
 * DE DONDE SALEN LOS NUMEROS.
 *
 * - `ANCHOR_BYTES` (1.500.000) es el ancla de la critica, no una medicion.
 * - `NON_ART_BYTES` (429.850) es lo que pesa TODO lo que no es imagen en una
 *   carga de la home — JS, fuentes, HTML y CSS — medido en la misma sesion de
 *   Chrome descrita arriba. Sale identico en claro y en oscuro (429.850 B en
 *   los dos), asi que no es una constante que dependa del tema: es el suelo
 *   fijo de la pagina. NO se calcula desde disco a proposito — sin `out/` no
 *   hay chunks que pesar — y por eso queda declarado aqui con su procedencia:
 *   quien lo dude, que lo vuelva a medir con el metodo del parrafo de arriba.
 *   Su instrumento hermano es `pnpm measure:js`, que vigila la parte de JS de
 *   esa misma cifra contra su propio presupuesto.
 * - `SAFETY_BYTES` (150.000) es margen declarado: cubre que la cifra anterior
 *   se mueva (una fuente mas, un chunk que crece) sin que el ancla real se
 *   entere tarde. El presupuesto de arte es lo que queda.
 *
 * QUE CUENTA COMO "PEOR CASO". De cada capa se cuenta la pista MAS PESADA de
 * las disponibles, no la que eligio el navegador en la medicion: un visitante
 * descarga UNA pista por capa, y cual sea depende de su viewport y su DPR. Se
 * cuenta AVIF y no WebP porque el AVIF es lo que descarga todo navegador
 * actual (el WebP sigue en disco como fallback del `<picture>` y como
 * referencia de calidad, pero no viaja); la excepcion es `public/figures/`,
 * que solo publica WebP.
 *
 * QUE NO CUBRE, dicho explicitamente: las escenas que viven mas abajo en la
 * pagina (`features/celestial-orbital`, `journey/cosmic-portal`,
 * `contact/cosmic-guardian`) NO entran, porque en la medicion no se
 * descargaron en los tres primeros segundos sin scroll. Si algun dia se
 * precargan o suben, este script no se enterara: lo que hay que hacer
 * entonces es volver a medir y anadirlas al inventario, no subir el
 * presupuesto.
 *
 * LO QUE SALIO DEL INVENTARIO EL 2026-09-06, y por que eso NO es relajar el
 * presupuesto. La figura clara de Story (`figures/journey`, 163.368 B en su
 * pista de 1024) estaba aqui porque una visita oscura la descargaba de verdad
 * -- ese es el P1 numero 4 de la critica externa #19. La ola S lo cerro en el
 * producto: `ScFigureWrap` (`src/components/sections/Story/Story.tsx`) pierde
 * su caja bajo `[data-theme="dark"]`, y sin caja no hay interseccion ni, por
 * tanto, carga perezosa. Medido con el arreglo puesto, sobre el build propio
 * servido por interceptacion de rutas en Chrome: CERO peticiones de
 * `journey-presenting-*` en oscuro a DPR 1 y a DPR 2, a 1440x900 y a 390x844,
 * con y sin `reduce`, en `/` y en `/en`. El arte oscuro medido por este script
 * cae de 441.892 B a 278.524 B, que es EXACTAMENTE lo que Chrome pidio en esa
 * misma medicion -- el inventario deja de sobrestimar y pasa a describir lo
 * que ocurre.
 *
 * Esa exclusion NO se sostiene sola: `EXCLUIDO_POR_CANDADO`, mas abajo,
 * declara de que mecanismo depende, y `check-dark-art-weight.test.mjs` falla
 * si ese mecanismo desaparece del codigo. Quien retire la regla o cambie el
 * `loading="lazy"` de esa figura no se lleva 163.368 B de holgura en silencio:
 * se lleva un rojo que le dice que devuelva la entrada a `DARK_ART`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Ancla tecnica de la critica externa, en bytes transferidos. */
export const ANCHOR_BYTES = 1_500_000;

/** JS + fuentes + HTML + CSS de la home, medido en Chrome (ver docblock). */
export const NON_ART_BYTES = 429_850;

/** Margen declarado para que la cifra de arriba pueda moverse sin sorpresas. */
export const SAFETY_BYTES = 150_000;

/** Lo que le queda al arte del peor caso oscuro. */
export const ART_BUDGET_BYTES = ANCHOR_BYTES - NON_ART_BYTES - SAFETY_BYTES;

/**
 * Inventario del arte que una visita OSCURA descarga sobre el pliegue.
 *
 * Se declara por carpeta y patron en vez de por lista de ficheros a proposito:
 * si alguien anade una capa nueva a una de estas escenas, el peso sube y el
 * candado lo ve; si alguien retira una, el peso baja y el candado no falla por
 * un fichero que ya no existe. Lo unico que se exige es que la carpeta siga
 * ahi — si desaparece, el inventario esta desfasado y hay que volver a medir,
 * que es justo lo que dice el error.
 */
export const DARK_ART = [
    {
        id: "hero/eye",
        dir: "public/hero/eye",
        /** Escena del hero en oscuro: cinco capas, pista ancha de cada una. */
        pick: (file) => file.endsWith(".avif") && !file.includes("-1024"),
    },
    {
        id: "story/cosmic-being",
        dir: "public/story/cosmic-being",
        /** Fondo de Story: once capas, pista ancha (1280) de cada una. */
        pick: (file) => file.endsWith(".avif") && !file.includes("-1024"),
    },
];

/**
 * Arte que ESTUVO en el inventario oscuro y salio de el porque el producto
 * dejo de descargarlo, con el mecanismo del que depende esa salida.
 *
 * No es documentacion: `check-dark-art-weight.test.mjs` comprueba que cada
 * `requisito` sigue en su fichero. El dia que uno falte, la exclusion deja de
 * estar justificada y el caso se pone en rojo pidiendo que la entrada vuelva a
 * `DARK_ART` -- que es lo contrario de "el presupuesto se cumple mirando
 * menos".
 *
 * `bytes` es el peso en disco que la entrada aportaba cuando estaba dentro
 * (pista de 1024, la mas pesada de las dos publicadas), para que el informe
 * pueda decir cuanta holgura procede de esta exclusion y no de otra cosa.
 */
export const EXCLUIDO_POR_CANDADO = [
    {
        id: "figures/journey",
        bytes: 163_368,
        fuente: "src/components/sections/Story/Story.tsx",
        motivo:
            "la figura clara de Story pierde su caja bajo " +
            '[data-theme="dark"], y una imagen perezosa sin caja no interseca ' +
            "y no se pide (P1 numero 4, critica externa #19)",
        requisitos: [
            {
                /* La regla que quita la caja, en su forma DESCENDIENTE: el
                   atributo vive en el <html>, asi que el calificado
                   `&[data-theme="dark"]` no aplicaria nunca. */
                patron: /\[data-theme="dark"\]\s*&\s*\{\s*display:\s*none;\s*\}/,
                descripcion:
                    'la regla [data-theme="dark"] & { display: none; } de ScFigureWrap',
            },
            {
                /* La otra mitad: una imagen NO perezosa se pide en cuanto el
                   parser ve su `src`, tenga caja o no. */
                patron: /journey-presenting-1024\.webp"[\s\S]{0,600}?loading="lazy"/,
                descripcion: 'el loading="lazy" de esa misma figura',
            },
        ],
    },
];

/** Suma el peso en disco de cada entrada del inventario. */
export function measureDarkArt() {
    return DARK_ART.map((entry) => {
        const dir = path.join(ROOT, entry.dir);
        if (!existsSync(dir)) {
            throw new Error(
                `El inventario de arte oscuro apunta a ${entry.dir}, que ya no ` +
                    `existe. No subas el presupuesto: vuelve a medir que descarga ` +
                    `una visita oscura y actualiza DARK_ART en este fichero.`,
            );
        }
        const files = readdirSync(dir).filter(entry.pick);
        if (files.length === 0) {
            throw new Error(
                `El inventario de arte oscuro no encuentra ninguna pista en ` +
                    `${entry.dir}. Un cero aqui no es "pesa cero": es que el patron ` +
                    `dejo de coincidir. Vuelve a medir antes de fiarte.`,
            );
        }
        const bytes = files.reduce(
            (acc, file) => acc + statSync(path.join(dir, file)).size,
            0,
        );
        return { id: entry.id, files: files.length, bytes };
    });
}

/**
 * Comprueba, contra el CODIGO, que cada exclusion de `EXCLUIDO_POR_CANDADO`
 * sigue mereciendola. Devuelve una fila por requisito con su veredicto; el
 * consumidor decide que hacer con las que no cumplen (el test las convierte en
 * rojo, el CLI en codigo de salida 1).
 */
export function verificarExclusiones() {
    return EXCLUIDO_POR_CANDADO.flatMap((entry) => {
        const ruta = path.join(ROOT, entry.fuente);
        if (!existsSync(ruta)) {
            return [
                {
                    id: entry.id,
                    descripcion: `el fichero ${entry.fuente}`,
                    ok: false,
                },
            ];
        }
        const source = readFileSync(ruta, "utf8");
        return entry.requisitos.map((req) => ({
            id: entry.id,
            descripcion: req.descripcion,
            ok: req.patron.test(source),
        }));
    });
}

/** Veredicto completo: entradas, total, presupuesto y holgura. */
export function checkDarkArtWeight() {
    const entries = measureDarkArt();
    const artBytes = entries.reduce((acc, e) => acc + e.bytes, 0);
    const exclusiones = verificarExclusiones();
    return {
        entries,
        artBytes,
        budgetBytes: ART_BUDGET_BYTES,
        overBytes: artBytes - ART_BUDGET_BYTES,
        worstCaseTotalBytes: artBytes + NON_ART_BYTES,
        anchorBytes: ANCHOR_BYTES,
        exclusiones,
        exclusionesRotas: exclusiones.filter((e) => !e.ok),
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
    const result = checkDarkArtWeight();
    const es = (bytes) => bytes.toLocaleString("es-ES");
    for (const entry of result.entries) {
        console.log(
            `${String(entry.bytes).padStart(9)} B | ${String(entry.files).padStart(2)} pistas | ${entry.id}`,
        );
    }
    console.log("—".repeat(64));
    console.log(`arte oscuro (peor caso)   : ${es(result.artBytes)} B`);
    console.log(`presupuesto de arte       : ${es(result.budgetBytes)} B`);
    console.log(
        `  = ancla ${es(ANCHOR_BYTES)} − no-arte medido ${es(NON_ART_BYTES)} − margen ${es(SAFETY_BYTES)}`,
    );
    console.log(
        `total oscuro proyectado   : ${es(result.worstCaseTotalBytes)} B sobre un ancla de ${es(ANCHOR_BYTES)} B`,
    );
    for (const entry of EXCLUIDO_POR_CANDADO) {
        console.log(
            `excluido por candado      : ${entry.id} (${es(entry.bytes)} B) — ${entry.motivo}`,
        );
    }
    for (const fila of result.exclusiones) {
        console.log(
            `  ${fila.ok ? "sigue" : "FALTA"} — ${fila.id}: ${fila.descripcion}`,
        );
    }
    console.log(
        result.overBytes <= 0
            ? `CUMPLE — ${es(-result.overBytes)} B libres`
            : `NO CUMPLE — ${es(result.overBytes)} B por encima del presupuesto de arte`,
    );
    if (result.exclusionesRotas.length > 0) {
        console.log(
            `NO CUMPLE — ${result.exclusionesRotas.length} requisito(s) de exclusion han desaparecido del codigo: devuelve la entrada a DARK_ART o restaura el mecanismo`,
        );
    }
    process.exit(
        result.overBytes <= 0 && result.exclusionesRotas.length === 0 ? 0 : 1,
    );
}
