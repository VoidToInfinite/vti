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
 * decorativa de seccion (`number: "0N"` / `.padStart(2, "0")`).
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
        label: "numeracion decorativa de seccion (01, 02, 03...)",
        test(line) {
            if (/\bnumber\s*:\s*["']0\d["']/.test(line)) return line.trim();
            if (/\.padStart\(\s*2\s*,\s*["']0["']\s*\)/.test(line))
                return 'padStart(2, "0")';
            return null;
        },
    },
];

// ---------------------------------------------------------------------------
// 4. Allowlist -- excepciones YA sancionadas por el repo. `maxCount` es el
//    numero EXACTO de apariciones verificado contra el repo en la Task 24
//    (2026-08-12, gate de referencia: 90 ficheros / 1313 tests). Una
//    aparicion ADICIONAL sobre ese numero, en ese mismo fichero y familia, se
//    trata como hallazgo nuevo -- el allowlist no es un comodin por fichero,
//    es un recuento con candado.
// ---------------------------------------------------------------------------

const ALLOWLIST = [
    {
        family: "gradient-text",
        file: "src/components/layout/Brand/BrandName.tsx",
        maxCount: 5,
        reason: "Wordmark ToInfinite: definicion del mixin gradientTextClip -- declaracion background-clip (2, con prefijo -webkit-), su feature-detection @supports not (background-clip: text) (1), el nombre del propio export (1) y su segundo consumo interno (ScGradientTail, 1). El degradado ES la identidad de marca del wordmark -- unico origen del mecanismo.",
    },
    {
        family: "gradient-text",
        file: "src/components/sections/Story/story.deck.tsx",
        maxCount: 2,
        reason: "Cierre del deck de Story reutiliza gradientTextClip tal cual: el import (1) y su unico consumo (1), ambos apuntando a la definicion de BrandName.tsx, sin declaracion propia.",
    },
    {
        family: "important",
        file: "src/theme/GlobalStyles.tsx",
        maxCount: 5,
        reason: "Reset de prefers-reduced-motion (animation-duration/iteration-count, transition-duration, 3 declaraciones) + fallback @media (scripting: none) para JS deshabilitado (opacity/transform, 2 declaraciones): las dos necesitan ganar por especificidad al selector universal bajo el mismo media query. Documentado en el propio fichero.",
    },
    {
        family: "important",
        file: "src/components/ui/Button/Button.tsx",
        maxCount: 1,
        reason: "Spinner reducido (aria-busy): gana al reset global de GlobalStyles bajo el mismo media query prefers-reduced-motion (docblock linea 267 del propio fichero).",
    },
    {
        family: "side-stripe",
        file: "src/components/legal/legalPage.parts.tsx",
        maxCount: 1,
        reason: "Callout de advertencia legal: franja lateral de 3px, unico consumo del patron en el repo (side-tab, excepcion visual documentada).",
    },
    {
        family: "overshoot",
        file: "src/theme/tokens/motion.ts",
        maxCount: 1,
        reason: "motion.easing.overshoot: unica curva no monotona del sistema, reservada al despegue del navbar al hacer scroll (Navbar.tsx, ScBar). Excepcion sancionada y medida en DESIGN.md Seccion 5.1 (Task 23, plan premium F1-F5).",
    },
    {
        family: "radius-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        maxCount: 1,
        reason: "Punta del rayo del mascote Sol (ScRay, 3px = su propio width): geometria de trazo de arte de marca, mismo fichero que ya usa formas organicas en % sin token (excepcion de regla 17 de RULES.md, arte de marca con constantes propias).",
    },
    {
        family: "kicker",
        file: "src/components/sections/Story/Story.tsx",
        maxCount: 2,
        reason: 'ScKicker con voz propia (decision D-E del dueno) en las dos ramas de Story -- render en la rama clara y en la oscura, misma clave i18n "Home.story.kicker".',
    },
    {
        family: "kicker",
        file: "src/components/sections/Features/Features.tsx",
        maxCount: 2,
        reason: 'ScKicker con voz propia (decision D-E del dueno) en las dos ramas de Features -- render en la rama clara y en la oscura, misma clave i18n "Home.features.kicker".',
    },
    {
        family: "numbering",
        file: "src/components/sections/Story/Story.tsx",
        maxCount: 4,
        reason: 'Numeracion 01-04 de los cuatro pilares de Story (aprendizaje/creacion/crecimiento/practica), array STORY_STEPS con "number: \\"0N\\"".',
    },
    {
        family: "numbering",
        file: "src/components/sections/Journey/Journey.tsx",
        maxCount: 1,
        reason: 'Ordinal 01..06 de los pasos de Journey, rama clara (stepOrdinal via padStart(2, "0")), unico generador del repo.',
    },
];

function allowlistEntry(family, relFile) {
    return (
        ALLOWLIST.find((e) => e.family === family && e.file === relFile) || null
    );
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
                    snippet,
                });
            }
        }
    }
    return findings;
}

function run() {
    const files = collectFiles();
    const allFindings = files.flatMap(scanFile);

    // Agrupa por (familia, fichero) para aplicar el candado de recuento.
    const groups = new Map();
    for (const f of allFindings) {
        const key = `${f.family} ${f.file}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(f);
    }

    const failures = [];
    const suppressed = [];
    for (const [key, hits] of groups) {
        const [family, file] = key.split(" ");
        const entry = allowlistEntry(family, file);
        const maxCount = entry ? entry.maxCount : 0;
        const ok = hits.slice(0, maxCount);
        const excess = hits.slice(maxCount);
        if (ok.length)
            suppressed.push({
                family,
                file,
                count: ok.length,
                reason: entry?.reason,
            });
        if (excess.length) failures.push(...excess);
    }

    // Allowlist obsoleto: un entry cuyo maxCount ya no tiene ningun hit real
    // (el codigo cambio y la excepcion dejo de aplicar) no rompe el gate --
    // reducir o retirar un patron sancionado nunca es un problema -- pero se
    // avisa para que alguien lo limpie.
    const stale = [];
    for (const entry of ALLOWLIST) {
        const key = `${entry.family} ${entry.file}`;
        const actual = (groups.get(key) || []).length;
        if (actual < entry.maxCount) {
            stale.push({ ...entry, actual });
        }
    }

    if (suppressed.length) {
        console.log(
            "Excepciones sancionadas (allowlist), suprimidas del gate:\n",
        );
        for (const s of suppressed.sort((a, b) =>
            a.file.localeCompare(b.file),
        )) {
            console.log(
                `  [${s.family}] ${s.file} -- ${s.count} hit(s). ${s.reason}`,
            );
        }
        console.log("");
    }

    if (stale.length) {
        console.log(
            "Aviso (no bloquea el gate): allowlist con menos hits de los esperados --",
        );
        console.log(
            "revisa si la excepcion sigue aplicando o si ya se puede retirar del script.\n",
        );
        for (const s of stale) {
            console.log(
                `  [${s.family}] ${s.file} -- esperado ${s.maxCount}, encontrado ${s.actual}.`,
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
            "\nCada linea de arriba es una familia de RULES.md (regla 48, seccion Estilos y movimiento):",
        );
        console.error(
            "toda transition/animation nueva usa un token de src/theme/tokens/motion.ts o una entrada",
        );
        console.error(
            "de src/motion/vocabulary.ts. Si el literal es intencional y ya esta justificado con un",
        );
        console.error(
            "docblock en el propio codigo, anade una entrada a ALLOWLIST en scripts/detect-anti-patterns.mjs",
        );
        console.error(
            "con el porque. Si no lo esta, usa el token/vocabulario existente.\n",
        );
        process.exitCode = 1;
        return;
    }

    console.log(
        `detect-anti-patterns: sin hallazgos nuevos (${files.length} ficheros escaneados, ${suppressed.reduce((n, s) => n + s.count, 0)} excepcion(es) sancionada(s) suprimida(s)).`,
    );
    process.exitCode = 0;
}

run();
