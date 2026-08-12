#!/usr/bin/env node
/**
 * Detector de anti-patrones de gobernanza horizontal (Task 24, plan premium F1-F5).
 *
 * Por que existe: las auditorias del 2026-08-08 encontraron el mismo defecto de
 * fondo repetido en cinco piezas distintas -- un literal de transicion/animacion
 * escrito a mano en vez de un token, decidido en local sin que nada mirara el
 * conjunto. El detector `detect.mjs` del skill `impeccable` ya sabia encontrar
 * ese tipo de patron, pero vivia fuera del repo y habia que acordarse de
 * correrlo a mano -- no enganchaba a nada.
 *
 * Por que este script y no vendorizar `detect.mjs`: el detector real de
 * `impeccable` (`scripts/detector/detect-antipatterns.mjs` del skill, Apache-2.0,
 * (c) Paul Bakaus) es una fachada sobre ~17 modulos que incluyen un motor de
 * navegador (getComputedStyle/getBoundingClientRect sobre DOM vivo) y un motor
 * jsdom -- justo el tipo de dependencia que el propio CLAUDE.md de este repo
 * marca como no fiable aqui ("jsdom no hace layout, no pinta y no evalua
 * @media"). Enganchar eso a `pnpm run ci` habria significado o arrastrar un
 * navegador headless al gate (deja de ser "sin red, deterministico, rapido") o
 * ejecutar solo su motor jsdom y obtener resultados que el propio repo ya sabe
 * que no representan el render real. Ademas, el vocabulario de familias que
 * este encargo pide ("transition: all", "ease-in a secas", "ghost-card en
 * reposo"...) no es 1:1 con los ids de `registry/antipatterns.mjs` -- confirma
 * que el "detector B" que ya corrio dos veces sobre este repo (ver el brief de
 * la Task 24) ya era una adaptacion, no el binario tal cual. Se opta por un
 * detector propio, minimo, sin dependencias, que cubre exactamente las
 * familias que este repo necesita vigilar -- ver la nota de alcance mas abajo
 * para las familias que se dejaron fuera y por que.
 *
 * Diseno: analisis estatico linea a linea sobre `.ts`/`.tsx` bajo `src/` y
 * `app/` (excluye `*.test.ts(x)`: los tests citan literalmente los mismos
 * patrones que aqui se vigilan -- por ejemplo "0".padStart(2, "0") en los
 * propios tests de Journey/Story -- y escanearlos solo anadiria ruido, no
 * cobertura real: el patron vive en el codigo de produccion, no en el test).
 * Los comentarios (`/* ... *\/` y `// ...`) se recortan ANTES de aplicar
 * cualquier regla: este mismo fichero de reglas se documenta citando los
 * patrones literales que vigila, y RULES.md/los docblocks del repo hacen lo
 * mismo -- sin el recorte, el detector se detectaria a si mismo y a la
 * documentacion que lo explica.
 *
 * Familias cubiertas (ver FAMILIES mas abajo): transition/transition-property
 * con `all`, `ease-in` suelto (no `ease-in-out`), `repeating-*-gradient`,
 * `!important`, texto con degradado recortado (`background-clip: text` /
 * mixin `gradientTextClip`), franja lateral decorativa (`border-left/right`
 * >=2px solid), curvas `cubic-bezier` con rebote (y fuera de [-0.1, 1.1]),
 * `border-radius` literal fuera de token (excluyendo `0`, que nunca es deriva
 * de escala), kickers repetidos (componentes `*Kicker*` en JSX) y numeracion
 * decorativa de seccion (`number: "0N"`, o el ordinal 1-based
 * `String(<expr> + 1).padStart(2, "0")`).
 *
 * Nota sobre `numbering`/padStart (fix de revision, 2026-08-12): la primera
 * version aceptaba CUALQUIER `.padStart(2, "0")` como numeracion decorativa.
 * Es demasiado generico -- formatear una hora (`String(hours).padStart(2,
 * "0")`) o una pagina no tiene nada que ver con el anti-patron y habria
 * disparado en falso el dia que alguien lo escribiera. Se acota al idioma
 * EXACTO que usa el unico consumidor real del repo (`Journey.tsx`,
 * `stepOrdinal`): un `String(...)` cuyo argumento sea una expresion `+ 1`
 * (el "indice de array pasa a ordinal 1-based") encadenado con
 * `.padStart(2, "0")`. Un `String(hours).padStart(2, "0")` sin el `+ 1`
 * dentro de `String(...)` ya no coincide.
 *
 * Familias descartadas explicitamente (no se detectan, documentado por que):
 * - "ghost-card en reposo" (borde fino + sombra ancha EN REPOSO, no solo en
 *   :hover): distinguir "declarado en la base" de "declarado solo dentro de
 *   un `&:hover { ... }` anidado" exige sabor real de anidamiento CSS. Un
 *   contador de llaves linea a linea NO sirve aqui porque las plantillas de
 *   styled-components de este repo interpolan JS (`${({ theme }) => ...}`)
 *   cuyas propias llaves de desestructuracion no tienen nada que ver con el
 *   anidamiento CSS -- un contador ingenuo desincroniza la profundidad real.
 *   El repo YA tiene el patron legitimo "borde fino en la base + sombra SOLO
 *   en :hover" (Card.tsx, Story.tsx ScCard, ambos via `theme.data.elevation`),
 *   que es exactamente lo que un chequeo sin ese contexto marcaria en falso
 *   en cuanto alguien escriba una sombra literal en vez de via token. Se
 *   prioriza precision sobre cobertura (encargo de la Task 24): mejor no
 *   cubrir esta familia que envenenar el gate con falsos positivos sobre un
 *   patron ya sancionado.
 * - Colores/tipografia/spacing "genericos de IA" (paleta violeta, cream
 *   palette, fuentes sobreusadas, jerarquia tipografica plana...): son los
 *   otros ~25 antipatrones de `impeccable`, pensados para auditorias de
 *   sesion, no para un gate que corre en cada commit. Quedan fuera de esta
 *   tarea (que pide "las familias que hoy estan a cero" + "las sancionadas",
 *   no el catalogo completo del skill).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["src", "app"];
const SCANNABLE_EXT_RE = /\.(tsx?|css)$/i;
const TEST_FILE_RE = /\.test\.(tsx?|ts)$/i;

// ---------------------------------------------------------------------------
// 1. Recorrido de ficheros
// ---------------------------------------------------------------------------

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (
            entry.isFile() &&
            SCANNABLE_EXT_RE.test(entry.name) &&
            !TEST_FILE_RE.test(entry.name)
        ) {
            out.push(full);
        }
    }
    return out;
}

function collectFiles() {
    const files = [];
    for (const dir of SCAN_DIRS) {
        const abs = path.join(ROOT, dir);
        if (fs.existsSync(abs)) walk(abs, files);
    }
    return files;
}

// ---------------------------------------------------------------------------
// 2. Recorte de comentarios (preserva saltos de linea para no desalinear el
//    numero de linea reportado)
// ---------------------------------------------------------------------------

function stripComments(src) {
    let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
    // Comentario de linea `//...`, solo cuando NO va precedido de `:` (evita
    // recortar `https://...` dentro de una cadena/URL).
    out = out.replace(/(^|[^:/])\/\/[^\n]*/g, (_m, p1) => p1);
    return out;
}

// ---------------------------------------------------------------------------
// 3. Familias (analisis linea a linea sobre el contenido YA sin comentarios)
// ---------------------------------------------------------------------------

const FAMILIES = [
    {
        id: "transition-all",
        label: "transition: all",
        test(line) {
            const m = /\btransition(-property)?\s*:\s*all\b/i.exec(line);
            return m ? m[0] : null;
        },
    },
    {
        id: "ease-in-bare",
        label: "ease-in a secas (no ease-in-out)",
        test(line) {
            const m = /\bease-in\b(?!-out)/i.exec(line);
            return m ? m[0] : null;
        },
    },
    {
        id: "repeating-gradient",
        label: "repeating-*-gradient decorativo",
        test(line) {
            const m = /repeating-(?:linear|radial|conic)-gradient\s*\(/i.exec(
                line,
            );
            return m ? m[0] : null;
        },
    },
    {
        id: "important",
        label: "!important",
        test(line) {
            return line.includes("!important") ? "!important" : null;
        },
    },
    {
        id: "gradient-text",
        label: "texto con degradado recortado (background-clip: text)",
        test(line) {
            if (/background-clip\s*:\s*text\b/i.test(line))
                return "background-clip: text";
            if (/\bgradientTextClip\b/.test(line)) return "gradientTextClip";
            return null;
        },
    },
    {
        id: "side-stripe",
        label: "franja lateral decorativa (border-left/right >=2px solid)",
        test(line) {
            const m =
                /border-(?:left|right|inline-start|inline-end)(?:-width)?\s*:\s*(\d+(?:\.\d+)?)px\s+solid/i.exec(
                    line,
                );
            if (!m) return null;
            return parseFloat(m[1]) >= 2 ? m[0].trim() : null;
        },
    },
    {
        id: "overshoot",
        label: "cubic-bezier con rebote (y fuera de [-0.1, 1.1])",
        test(line) {
            const re =
                /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/gi;
            let m;
            while ((m = re.exec(line)) !== null) {
                const y1 = parseFloat(m[2]);
                const y2 = parseFloat(m[4]);
                if (y1 < -0.1 || y1 > 1.1 || y2 < -0.1 || y2 > 1.1) return m[0];
            }
            return null;
        },
    },
    {
        id: "radius-literal",
        label: "border-radius literal fuera de src/theme/tokens/radius.ts",
        test(line) {
            const m = /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)\b/i.exec(
                line,
            );
            if (!m) return null;
            return parseFloat(m[1]) === 0 ? null : m[0];
        },
    },
    {
        id: "kicker",
        label: "kicker/eyebrow repetido (componente *Kicker* en JSX)",
        test(line) {
            const m = /<(\w*Kicker\w*)\b/.exec(line);
            return m ? m[0] : null;
        },
    },
    {
        id: "numbering",
        label: 'numeracion decorativa de seccion (number: "0N", u ordinal String(idx + 1).padStart(2, "0"))',
        test(line) {
            if (/\bnumber\s*:\s*["']0\d["']/.test(line)) return line.trim();
            // Acotado al idioma EXACTO de "indice de array -> ordinal 1-based
            // con 2 digitos": String(<expr> + 1).padStart(2, "0"). Un
            // padStart(2, "0") generico (formatear una hora, una pagina) NO
            // coincide -- ver la nota de cabecera del fichero (fix de
            // revision, 2026-08-12).
            const m =
                /String\([^()]*\+\s*1\)\s*\.padStart\(\s*2\s*,\s*["']0["']\s*\)/.exec(
                    line,
                );
            return m ? m[0] : null;
        },
    },
];

// ---------------------------------------------------------------------------
// 4. Allowlist -- excepciones YA sancionadas por el repo.
//
// Fix de revision #1 (2026-08-12): la primera version candaba por RECUENTO
// (family+file -> maxCount). Un reviewer demostro el bypass: en
// BrandName.tsx retiro la linea legitima del @supports (una de las 5
// apariciones) y anadio un `background-clip: text` NUEVO y no relacionado
// en un componente ficticio -- el total seguia siendo 5 y el gate daba
// "sin hallazgos nuevos". El recuento no sabe QUE linea es la sancionada,
// solo CUANTAS hay. Se sustituyo por anclar en (linea, contenido exacto).
//
// Fix de revision #2 (2026-08-12, mismo dia): anclar por NUMERO DE LINEA
// resulto ser la coordenada equivocada. Un reviewer demostro el bypass
// contrario: insertar una UNICA linea en blanco al principio de
// src/theme/tokens/motion.ts desplazo la linea sancionada de `overshoot`
// de la 22 a la 23 sin que su CONTENIDO cambiara un caracter -- y el gate
// se puso en rojo con un hallazgo falso (`motion.ts:23 [overshoot]`). Con
// 25 anclas en 9 ficheros, varias en ficheros de alto trafico
// (Story.tsx/Features.tsx/GlobalStyles.tsx), cualquier import o linea de
// docblock anadida por ENCIMA de una linea sancionada rompe el gate por una
// razon ajena al cambio -- exactamente el escenario en el que alguien acaba
// desactivando el detector. La propia RULES.md (deuda de `color-mix()`) ya
// razona esto para otro caso: "los numeros de linea se omiten a proposito:
// se desplazan a cada entrega y ya caducaron una vez; los nombres de los
// styled-components no". La propiedad que de verdad cierra el bypass del
// fix #1 es el CONTENIDO exacto de la linea, no su posicion.
//
// Diseno final: cada entrada ancla por (familia, fichero, contenido EXACTO
// de una linea ya sin comentarios y recortada) -- SIN numero de linea.
// `anchors: [{ snippet, count? }, ...]`, donde `count` (opcional, default 1)
// es cuantas apariciones de ESE contenido exacto estan sancionadas dentro de
// la MISMA familia+fichero (p. ej. el kicker de Story.tsx aparece dos veces,
// una por rama de tema, con el mismo JSX literal -- `count: 2`). Un
// hallazgo se suprime si su familia+fichero+contenido coincide con un ancla
// Y todavia queda presupuesto sin consumir (occurrence <= count); a partir
// de ahi, cualquier aparicion EXTRA de ese mismo contenido, o cualquier
// contenido que no coincide con ningun ancla, es un hallazgo nuevo -- el
// swap del fix #1 (retirar una linea sancionada, anadir una NUEVA con
// contenido distinto en otro sitio) sigue sin pasar: el contenido nuevo no
// tiene ancla que lo cubra. Y el bypass del fix #2 (insertar una linea en
// blanco arriba) tampoco: el contenido de la linea sancionada no cambia, asi
// que su ancla la sigue cubriendo sea cual sea su numero de linea actual.
//
// `lines` en cada ancla es solo documentacion para un humano (donde vivia
// esta excepcion cuando se escribio la entrada) -- el motor NUNCA lo lee.
// Los snippets se generaron leyendo el fichero real (no a mano):
// `stripComments(fs.readFileSync(file)).split("\n")[line - 1].trim()`.
// ---------------------------------------------------------------------------

const ALLOWLIST = [
    {
        family: "gradient-text",
        file: "src/components/layout/Brand/BrandName.tsx",
        anchors: [
            {
                snippet: "export const gradientTextClip = css`",
                lines: [196],
            },
            { snippet: "-webkit-background-clip: text;", lines: [198] },
            { snippet: "background-clip: text;", lines: [199] },
            {
                snippet: "@supports not (background-clip: text) {",
                lines: [222],
            },
            { snippet: "${gradientTextClip}", lines: [230] },
        ],
        reason: "Wordmark ToInfinite: definicion del mixin gradientTextClip -- declaracion background-clip (2, con prefijo -webkit-), su feature-detection @supports not (background-clip: text) (1), el nombre del propio export (1) y su segundo consumo interno (ScGradientTail, 1). El degradado ES la identidad de marca del wordmark -- unico origen del mecanismo.",
    },
    {
        family: "gradient-text",
        file: "src/components/sections/Story/story.deck.tsx",
        anchors: [
            {
                snippet:
                    'import { gradientTextClip } from "@/components/layout/Brand/BrandName";',
                lines: [3],
            },
            { snippet: "${gradientTextClip}", lines: [631] },
        ],
        reason: "Cierre del deck de Story reutiliza gradientTextClip tal cual: el import (1) y su unico consumo (1), ambos apuntando a la definicion de BrandName.tsx, sin declaracion propia.",
    },
    {
        family: "important",
        file: "src/theme/GlobalStyles.tsx",
        anchors: [
            {
                snippet: "animation-duration: 0.001ms !important;",
                lines: [289],
            },
            {
                snippet: "animation-iteration-count: 1 !important;",
                lines: [290],
            },
            {
                snippet: "transition-duration: 0.001ms !important;",
                lines: [291],
            },
            { snippet: "opacity: 1 !important;", lines: [409] },
            { snippet: "transform: none !important;", lines: [410] },
        ],
        reason: "Reset de prefers-reduced-motion (animation-duration/iteration-count, transition-duration, 3 declaraciones) + fallback @media (scripting: none) para JS deshabilitado (opacity/transform, 2 declaraciones): las dos necesitan ganar por especificidad al selector universal bajo el mismo media query. Documentado en el propio fichero.",
    },
    {
        family: "important",
        file: "src/components/ui/Button/Button.tsx",
        anchors: [
            {
                snippet: "theme.data.motion.duration.spinReduced} !important;",
                lines: [276],
            },
        ],
        reason: "Spinner reducido (aria-busy): gana al reset global de GlobalStyles bajo el mismo media query prefers-reduced-motion (docblock linea 267 del propio fichero).",
    },
    {
        family: "side-stripe",
        file: "src/components/legal/legalPage.parts.tsx",
        anchors: [
            {
                snippet:
                    "border-left: 3px solid ${({ theme }) => theme.data.semantic.warning};",
                lines: [240],
            },
        ],
        reason: "Callout de advertencia legal: franja lateral de 3px, unico consumo del patron en el repo (side-tab, excepcion visual documentada).",
    },
    {
        family: "overshoot",
        file: "src/theme/tokens/motion.ts",
        anchors: [
            {
                snippet: 'overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",',
                lines: [22],
            },
        ],
        reason: "motion.easing.overshoot: unica curva no monotona del sistema, reservada al despegue del navbar al hacer scroll (Navbar.tsx, ScBar). Excepcion sancionada y medida en DESIGN.md Seccion 5.1 (Task 23, plan premium F1-F5).",
    },
    {
        family: "radius-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [{ snippet: "border-radius: 3px;", lines: [330] }],
        reason: "Punta del rayo del mascote Sol (ScRay, 3px = su propio width): geometria de trazo de arte de marca, mismo fichero que ya usa formas organicas en % sin token (excepcion de regla 17 de RULES.md, arte de marca con constantes propias).",
    },
    {
        family: "kicker",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
            {
                snippet:
                    '<ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>',
                count: 2,
                lines: [1343, 1546],
            },
        ],
        reason: 'ScKicker con voz propia (decision D-E del dueno) en las dos ramas de Story -- render en la rama clara y en la oscura, misma clave i18n "Home.story.kicker" (mismo JSX literal en las dos ramas, count: 2).',
    },
    {
        family: "kicker",
        file: "src/components/sections/Features/Features.tsx",
        anchors: [
            { snippet: '<ScKicker variant="overline">', lines: [1410] },
            {
                snippet:
                    '<ScKicker variant="overline">{t("Home.features.kicker")}</ScKicker>',
                lines: [1514],
            },
        ],
        reason: 'ScKicker con voz propia (decision D-E del dueno) en las dos ramas de Features -- render en la rama clara y en la oscura, misma clave i18n "Home.features.kicker".',
    },
    {
        family: "numbering",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
            { snippet: '{ key: "learn", number: "01" },', lines: [87] },
            { snippet: '{ key: "create", number: "02" },', lines: [88] },
            { snippet: '{ key: "grow", number: "03" },', lines: [89] },
            { snippet: '{ key: "practice", number: "04" },', lines: [90] },
        ],
        reason: 'Numeracion 01-04 de los cuatro pilares de Story (aprendizaje/creacion/crecimiento/practica), array STORY_STEPS con "number: \\"0N\\"".',
    },
    {
        family: "numbering",
        file: "src/components/sections/Journey/Journey.tsx",
        anchors: [
            {
                snippet: 'return String(index + 1).padStart(2, "0");',
                lines: [116],
            },
        ],
        reason: 'Ordinal 01..06 de los pasos de Journey, rama clara (stepOrdinal via padStart(2, "0")), unico generador del repo.',
    },
];

// Clave compuesta (familia, fichero, contenido de linea) -- UNA sola
// funcion, reutilizada por la construccion de ANCHOR_MAP y por el motor
// (seccion 5) para agrupar hallazgos: que las dos mitades del candado
// deriven la clave del mismo sitio es lo que garantiza que nunca se
// desincronicen entre si. El separador " :: " no es un caracter de control
// (evita la clase de bug ya pagada aqui con un separador NUL invisible) y no
// aparece de forma realista dentro de un id de familia, una ruta de fichero
// o un contenido de linea de este repo.
function anchorKey(family, file, snippet) {
    return family + " :: " + file + " :: " + snippet;
}

// Mapa "familia :: fichero :: snippet" -> { allowed, reason } para
// resolucion O(1) por hallazgo. `allowed` es el presupuesto de apariciones
// sancionadas de ESE contenido exacto (suma de `count`, default 1, de todas
// las entradas de ALLOWLIST que compartan familia+fichero+snippet -- no
// deberia haber mas de una, pero sumar en vez de sobreescribir es la opcion
// segura si alguna vez la hay).
const ANCHOR_MAP = new Map();
for (const entry of ALLOWLIST) {
    for (const a of entry.anchors) {
        const key = anchorKey(entry.family, entry.file, a.snippet);
        const count = a.count ?? 1;
        const existing = ANCHOR_MAP.get(key);
        if (existing) {
            existing.allowed += count;
        } else {
            ANCHOR_MAP.set(key, { allowed: count, reason: entry.reason });
        }
    }
}

// ---------------------------------------------------------------------------
// 5. Motor
// ---------------------------------------------------------------------------

function scanFile(absFile) {
    const relFile = path.relative(ROOT, absFile).split(path.sep).join("/");
    const raw = fs.readFileSync(absFile, "utf8");
    const stripped = stripComments(raw);
    const lines = stripped.split("\n");
    const findings = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const family of FAMILIES) {
            const snippet = family.test(line);
            if (snippet) {
                findings.push({
                    family: family.id,
                    label: family.label,
                    file: relFile,
                    line: i + 1,
                    // Etiqueta normalizada para el mensaje de error (p. ej.
                    // "background-clip: text" sale igual venga de la linea
                    // que venga). El candado del allowlist NO compara esto
                    // -- compara `rawLine`, el contenido literal de la linea,
                    // para que dos apariciones distintas de la misma familia
                    // nunca se confundan entre si (ver seccion 4).
                    snippet,
                    rawLine: line.trim(),
                });
            }
        }
    }
    return findings;
}

// ---------------------------------------------------------------------------
// 4bis. Guia por familia para el mensaje de fallo.
//
// Fix "de paso" (revision 2026-08-12): el mensaje de fallo enmarcaba las DIEZ
// familias como violaciones de "toda transition/animation nueva usa un token
// de motion.ts" -- falso para "kicker", "numbering", "radius-literal" y
// "side-stripe", que no son transiciones ni animaciones en absoluto (un
// componente *Kicker* repetido, una numeracion decorativa, un radio o una
// franja lateral). Cada familia tiene ahora su propia guia, mostrada solo
// para las familias que de verdad aparecen en los hallazgos.
// ---------------------------------------------------------------------------

const FAMILY_GUIDANCE = {
    "transition-all":
        "toda transition/animation nueva usa una duracion+curva de src/theme/tokens/motion.ts (nunca `all`, que anima cualquier propiedad que cambie, incluidas las que disparan reflow).",
    "ease-in-bare":
        "toda transition/animation nueva usa una curva de src/theme/tokens/motion.ts; `ease-in` a secas (sin `-out`) acelera hasta el final y se lee como un frenazo.",
    "repeating-gradient":
        "un patron decorativo repetitivo (repeating-*-gradient) es la clase de detalle que esta familia vigila -- si es intencional, documentalo en el propio codigo y anade la excepcion a ALLOWLIST.",
    "important":
        "un !important nuevo casi siempre es sintoma de una guerra de especificidad; si de verdad hace falta ganarle a un reset global bajo el mismo media query (como el reset de prefers-reduced-motion), documentalo igual que las excepciones ya sancionadas.",
    "gradient-text":
        "un texto con degradado recortado nuevo (background-clip: text) fuera del wordmark de marca ya sancionado necesita su propia justificacion documentada.",
    "side-stripe":
        "una franja lateral decorativa nueva (border-left/right >=2px solid) fuera del callout legal ya sancionado necesita su propia justificacion documentada.",
    "overshoot":
        "una curva cubic-bezier con rebote fuera de src/theme/tokens/motion.ts (motion.easing.overshoot es la unica sancionada, reservada al despegue del navbar) necesita su propia justificacion documentada.",
    "radius-literal":
        "un border-radius literal nuevo usa un token de src/theme/tokens/radius.ts en vez de un numero escrito a mano.",
    "kicker":
        "un <*Kicker*> nuevo fuera de Story.tsx/Features.tsx (las dos ramas ya sancionadas, decision D-E del dueno) necesita decidirse con el dueno del producto, igual que el resto de kickers del sitio.",
    "numbering":
        'una numeracion decorativa de seccion nueva (number: "0N", o el ordinal String(idx + 1).padStart(2, "0")) fuera de Story.tsx/Journey.tsx (los dos generadores ya sancionados) necesita decidirse igual que el resto.',
};

function run() {
    const files = collectFiles();
    const allFindings = files.flatMap(scanFile);

    // Candado por ancla de CONTENIDO (fix de revision #2, ver seccion 4): un
    // hallazgo se suprime SOLO si existe una entrada en ANCHOR_MAP para su
    // misma familia+fichero+contenido-de-linea (rawLine) Y todavia queda
    // presupuesto de apariciones sin consumir para ese contenido exacto. El
    // numero de linea NUNCA participa en la comparacion -- una linea
    // sancionada sigue cubierta aunque se desplace (insertar una linea en
    // blanco arriba, por ejemplo), y un contenido NUEVO nunca queda cubierto
    // por la sola coincidencia de recuento total (ver seccion 4 para el
    // porque de cada uno de los dos bypasses ya cerrados).
    //
    // Se agrupa por familia+fichero+contenido y se consume el presupuesto en
    // orden ascendente de linea (determinista): las primeras `allowed`
    // apariciones de ESE contenido exacto se suprimen, cualquier aparicion
    // extra es un hallazgo nuevo.
    const contentGroups = new Map();
    for (const f of allFindings) {
        const key = anchorKey(f.family, f.file, f.rawLine);
        if (!contentGroups.has(key)) contentGroups.set(key, []);
        contentGroups.get(key).push(f);
    }

    const failures = [];
    const suppressed = [];
    const matchedCountByAnchorKey = new Map();
    for (const [key, findings] of contentGroups) {
        const anchor = ANCHOR_MAP.get(key);
        if (!anchor) {
            failures.push(...findings);
            continue;
        }
        findings.sort((a, b) => a.line - b.line);
        findings.forEach((f, idx) => {
            if (idx < anchor.allowed) {
                suppressed.push({ ...f, reason: anchor.reason });
            } else {
                failures.push(f);
            }
        });
        matchedCountByAnchorKey.set(
            key,
            Math.min(findings.length, anchor.allowed),
        );
    }

    // Allowlist obsoleto: un ancla cuyo contenido ya no aparece HOY tantas
    // veces como su presupuesto (la linea sancionada se borro, se movio de
    // contenido, o se redujo su numero de apariciones) no rompe el gate --
    // reducir o retirar un patron sancionado nunca es un problema -- pero se
    // avisa para que alguien limpie la entrada. Distinto de "hallazgo nuevo
    // sin ancla", que SI rompe el gate (ver arriba).
    const stale = [];
    for (const entry of ALLOWLIST) {
        for (const a of entry.anchors) {
            const key = anchorKey(entry.family, entry.file, a.snippet);
            const allowed = ANCHOR_MAP.get(key)?.allowed ?? a.count ?? 1;
            const matched = matchedCountByAnchorKey.get(key) ?? 0;
            if (matched < allowed) {
                stale.push({
                    family: entry.family,
                    file: entry.file,
                    lines: a.lines ?? [],
                    expected: a.snippet,
                    allowed,
                    matched,
                });
            }
        }
    }

    if (suppressed.length) {
        // Agrupa las anclas suprimidas por (familia, fichero) solo para el
        // resumen en consola -- el candado en si ya opero linea a linea.
        const byGroup = new Map();
        for (const s of suppressed) {
            const key = `${s.family} ${s.file}`;
            if (!byGroup.has(key))
                byGroup.set(key, {
                    family: s.family,
                    file: s.file,
                    lines: [],
                    reason: s.reason,
                });
            byGroup.get(key).lines.push(s.line);
        }
        console.log(
            "Excepciones sancionadas (allowlist), suprimidas del gate:\n",
        );
        for (const g of [...byGroup.values()].sort((a, b) =>
            a.file.localeCompare(b.file),
        )) {
            console.log(
                `  [${g.family}] ${g.file} -- lineas ${g.lines.sort((a, b) => a - b).join(", ")}. ${g.reason}`,
            );
        }
        console.log("");
    }

    if (stale.length) {
        console.log(
            "Aviso (no bloquea el gate): anclas del allowlist sin hallazgo que las cubra hoy --",
        );
        console.log(
            "la linea sancionada se borro, se movio o su contenido cambio. Revisa si la excepcion",
        );
        console.log("sigue aplicando o si ya se puede retirar del script.\n");
        for (const s of stale) {
            const where = s.lines.length
                ? ` (lineas ${s.lines.join(", ")} al escribir la entrada)`
                : "";
            console.log(
                `  [${s.family}] ${s.file}${where} -- se esperaban ${s.allowed} aparicion(es) de: ${JSON.stringify(s.expected)}; hoy hay ${s.matched}.`,
            );
        }
        console.log("");
    }

    if (failures.length) {
        console.error(
            `Anti-patrones sin sancionar: ${failures.length} hallazgo(s).\n`,
        );
        for (const f of failures.sort(
            (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
        )) {
            console.error(`  ${f.file}:${f.line}  [${f.family}]  ${f.snippet}`);
        }
        console.error(
            "\nCada hallazgo de arriba pertenece a una familia de RULES.md (regla 48, seccion Estilos y",
        );
        console.error(
            "movimiento) -- guia especifica de la familia que salio en rojo:\n",
        );
        const familiesInFailures = [
            ...new Set(failures.map((f) => f.family)),
        ].sort();
        for (const familyId of familiesInFailures) {
            const guidance =
                FAMILY_GUIDANCE[familyId] ??
                "revisa la familia correspondiente en RULES.md (regla 48).";
            console.error(`  [${familyId}] ${guidance}`);
        }
        console.error(
            "\nSi el literal/patron es intencional y ya esta justificado con un docblock en el propio",
        );
        console.error(
            "codigo, anade una entrada a ALLOWLIST en scripts/detect-anti-patterns.mjs con el porque.",
        );
        console.error(
            "Si no lo esta, usa el token/vocabulario/patron ya existente.\n",
        );
        process.exitCode = 1;
        return;
    }

    console.log(
        `detect-anti-patterns: sin hallazgos nuevos (${files.length} ficheros escaneados, ${suppressed.length} excepcion(es) sancionada(s) suprimida(s)).`,
    );
    process.exitCode = 0;
}

run();
