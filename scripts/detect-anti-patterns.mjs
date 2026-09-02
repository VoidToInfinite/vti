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
 * con `all`, curvas por PALABRA CLAVE (`ease`, `ease-in`, `ease-in-out`,
 * `ease-out`) fuera del fichero del token, `repeating-*-gradient`,
 * `!important`, texto con degradado recortado (`background-clip: text` /
 * mixin `gradientTextClip`), franja lateral decorativa (`border-left/right`
 * >=2px solid), curvas `cubic-bezier` con rebote (y fuera de [-0.1, 1.1]),
 * CUALQUIER literal `cubic-bezier(...)` escrito fuera de
 * `src/theme/tokens/motion.ts`, CUALQUIER literal de TIEMPO (`Nms`/`Ns`, cero
 * excluido) escrito fuera de ese mismo fichero, CUALQUIER duracion declarada
 * como constante numerica con nombre (`durationMs: 480`, `const HERO_FADE_MS
 * = 420`) que no derive de `motion.durationMs`, `border-radius` literal fuera
 * de token (excluyendo `0`, que nunca es deriva de escala), CUALQUIER
 * `font-size` escrito como literal `rem`/`px`/`em` fuera de
 * `src/theme/tokens/` (con `clamp()`, `var()`, `calc()`, `inherit` y `1em`
 * exentos), CUALQUIER `z-index` entero -- incluidos el cero y los negativos --
 * fuera de `src/theme/tokens/zIndex.ts`, kickers repetidos
 * (componentes `*Kicker*` en JSX) y numeracion decorativa de seccion
 * (`number: "0N"`, o el ordinal 1-based
 * `String(<expr> + 1).padStart(2, "0")`).
 *
 * Quinto punto ciego cerrado (critica externa #15, 2026-09-02): el detector
 * vigilaba movimiento con cuatro familias, mas radios, franjas, degradados de
 * texto y dos patrones de composicion -- y NI UNA propiedad de TIPOGRAFIA ni
 * de CAPA, que son los otros dos sistemas de tokens que este repo mantiene
 * escritos y cita en decenas de docblocks. Medicion del evaluador de Craft: 10
 * `font-size` literales en UI ordinaria (tres duplicando un peldano vivo de
 * `type.scale`, y uno -- el `1.15rem` del rotulo de marca -- escrito byte a
 * byte en dos cabeceras que no se conocen) y 16 `z-index` enteros al lado de
 * una escala de siete roles. Las familias `font-size-literal` y
 * `z-index-literal` cubren los dos caminos; ver sus comentarios en FAMILIES
 * para las exenciones, el porque de cada una y sus limites declarados (la
 * shorthand `font:`, el `clamp()` multilinea y el z-index interpolado desde
 * una constante con nombre).
 *
 * Lo que la familia `repeating-gradient` NO cubre, dicho aqui porque su NOMBRE
 * promete mas de lo que hace (senalado por el evaluador de Craft en la #15):
 * comprueba la funcion CSS `repeating-*-gradient(`, es decir un patron que se
 * repite DENTRO de una misma declaracion. NO detecta lo otro que ese nombre
 * sugiere -- un mismo `linear-gradient(...)`/`radial-gradient(...)` escrito
 * dos veces en ficheros distintos, que es la clase de duplicacion que la regla
 * 13 manda convertir en token. Cubrirlo de verdad exigiria un pase CRUZADO
 * entre ficheros (este motor es linea a linea, por diseno declarado arriba) y,
 * sobre el corpus real, comparar cadenas que casi siempre llevan
 * interpolaciones `${({ theme }) => ...}` dentro: dos degradados con el MISMO
 * texto pueden resolver a colores distintos segun el tema, y dos con texto
 * DISTINTO pueden resolver a lo mismo. Se prioriza precision sobre cobertura,
 * el mismo criterio con el que este fichero descarto "ghost-card en reposo",
 * y se deja el limite escrito en vez de dejar que el nombre lo tape.
 *
 * Cuarto punto ciego cerrado (critica externa #14, 2026-09-02): la familia
 * `duration-literal` que cerro el tercero (justo abajo) promete en su propio
 * docblock sancionar "POR PROCEDENCIA, NO POR VALOR", pero su regex exige el
 * sufijo `ms`/`s` PEGADO al digito -- es decir, solo ve una duracion cuando
 * ya esta escrita como tiempo CSS. En TypeScript casi nunca lo esta: se
 * declara como numero con nombre (`durationMs: 480`) y se interpola despues
 * (`${REVEAL.durationMs}ms`), donde el caracter que precede a `ms` es `}` y
 * la familia deja de coincidir. Medicion del evaluador: los seis tiempos de
 * `src/motion/vocabulary.ts` gobernaban transiciones reales de la interfaz y
 * pasaban el gate en verde por construccion; el censo propio encontro 86
 * declaraciones asi en el repo. La familia `duration-const` cubre ese camino
 * -- ver su comentario en FAMILIES para el criterio de nombre, la forma de
 * valor que cuenta, la exencion del cero y el unico limite declarado (la
 * tabla de retardos multilinea).
 *
 * Tercer punto ciego cerrado (critica externa #13, 2026-08-18): el detector
 * vigilaba las dos mitades de una regla de movimiento a medias. La regla 48
 * dice "duracion, curva", y hasta esta revision habia TRES familias mirando
 * curvas (`overshoot`, `easing-literal`, `easing-keyword`) y NI UNA mirando
 * duraciones -- ni un solo `ms` en todo el fichero. La medicion del
 * evaluador: 22 duraciones distintas en codigo real, 15 fuera de la escala de
 * siete pasos de `motion.duration`, y once de esas quince en `Wormhole.tsx`,
 * cuya excepcion de arte de marca (regla 17) era legitima pero NO estaba
 * declarada en ninguna parte, precisamente porque no habia familia que la
 * pidiera. La familia `duration-literal` cierra el hueco y, al hacerlo,
 * convierte esas excepciones tacitas en excepciones escritas.
 *
 * Punto ciego cerrado (critica externa #8, 2026-08-17): hasta esa revision la
 * UNICA familia de curvas era `overshoot`, que solo dispara cuando la curva
 * REBOTA (algun punto de control con y fuera de [-0.1, 1.1]) -- pero su
 * mensaje de fallo prometia vigilar "curvas fuera de token" en general. La
 * medicion: habia CUATRO curvas monotonas fuera de token en produccion
 * (`Sol.tsx` EASE_ENTRANCE, `sectionBeam.layers.ts` SECTION_BEAM_EASING,
 * `Story.tsx` STORY_STATEMENT_EASING y la curva propia de
 * `src/motion/vocabulary.ts`, consumida por REVEAL y por PRESS), las cuatro
 * invisibles para el detector y las cuatro pasando el gate en verde. La
 * familia `easing-literal` cubre ahora ese hueco y `overshoot` se queda
 * prometiendo exactamente lo que comprueba: el REBOTE, no la procedencia.
 * Una curva de rebote NUEVA escrita fuera del token dispara las DOS familias
 * a la vez (dos hallazgos sobre la misma linea, por dos motivos distintos:
 * rebota, y no nace en el token) -- es deliberado, y sancionarla exigiria
 * entonces una entrada por cada motivo.
 *
 * Segundo punto ciego cerrado (critica externa #9, 2026-08-17): el parrafo de
 * arriba cerro el hueco de los literales `cubic-bezier(...)`, pero dejo
 * intacto el de las PALABRAS CLAVE. La unica familia que las miraba,
 * `ease-in-bare`, exigia `ease-in` SUELTO -- es decir, eximia por
 * construccion `ease-in-out`, `ease-out` y `ease` a secas. La medicion del
 * evaluador: 23 reglas del CSS servido llevaban una curva por palabra clave
 * fuera de token, y NINGUNA era `ease-in` suelto, asi que las 23 pasaban el
 * gate en verde. `ease-in-bare` se SUSTITUYE por `easing-keyword`, un
 * superconjunto estricto que cubre las cuatro formas; ver su comentario en
 * FAMILIES para el porque de sustituir en vez de anadir al lado, para por que
 * `linear` queda fuera, y para el catalogo de falsos positivos descartados
 * uno a uno sobre el corpus real (`easing`, `EASE_ENTRANCE`, `decrease`,
 * `linear-gradient`).
 *
 * Nota sobre `numbering`/padStart (fix de revision, 2026-08-12): la primera
 * version aceptaba CUALQUIER `.padStart(2, "0")` como numeracion decorativa.
 * Es demasiado generico -- formatear una hora (`String(hours).padStart(2,
 * "0")`) o una pagina no tiene nada que ver con el anti-patron y habria
 * disparado en falso el dia que alguien lo escribiera. Se acota al idioma
 * EXACTO que usaba el unico consumidor real que el repo tuvo (`Journey.tsx`,
 * `stepOrdinal`, retirado el 2026-08-18 con su sancion; ver la lapida en la
 * allowlist): un `String(...)` cuyo argumento sea una expresion `+ 1`
 * (el "indice de array pasa a ordinal 1-based") encadenado con
 * `.padStart(2, "0")`. Un `String(hours).padStart(2, "0")` sin el `+ 1`
 * dentro de `String(...)` ya no coincide. La regla se conserva sin
 * consumidores: lo que vigila es que ese idioma no VUELVA sin decidirlo.
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

/**
 * Unico fichero del repo donde una curva de easing puede NACER como literal
 * (regla 48 de RULES.md). La familia `easing-literal` se salta este fichero
 * entero -- no por una excepcion del allowlist, sino porque ahi el literal
 * es la definicion del token, no una copia suelta. Ruta relativa a ROOT, con
 * separadores POSIX (es la misma forma en que `scanFile` normaliza `relFile`).
 */
const MOTION_TOKENS_FILE = "src/theme/tokens/motion.ts";

/**
 * Carpeta donde nacen los tokens del sistema. La familia `font-size-literal`
 * se salta sus ficheros enteros por el mismo motivo por el que
 * `easing-literal` se salta `motion.ts`: ahi el literal ES la definicion de la
 * escala (`type.scale.h1.size = "2.5rem"`), no una copia suelta. Se declara
 * como CARPETA y no como un fichero concreto porque un tamano de fuente puede
 * nacer legitimamente en mas de un token (`type.ts` hoy; manana un token de
 * densidad o de tipografia de escena). Prefijo con separadores POSIX, la misma
 * forma en que `scanFile` normaliza `relFile`.
 */
const TOKENS_DIR = "src/theme/tokens/";

/**
 * Unico fichero del repo donde un z-index puede NACER como entero literal
 * (los siete peldanos de la escala: base, raised, stickyNav, dropdown,
 * overlay, modal, toast). Mismo papel que `MOTION_TOKENS_FILE` para las
 * curvas y las duraciones.
 */
const Z_INDEX_TOKENS_FILE = "src/theme/tokens/zIndex.ts";

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
        id: "easing-keyword",
        label: "curva por palabra clave (ease / ease-in / ease-in-out / ease-out) fuera de src/theme/tokens/motion.ts",
        // SUSTITUYE a la familia `ease-in-bare` (retirada en la critica
        // externa #9, 2026-08-17), que solo cazaba `ease-in` SUELTO -- la
        // variante que casi nadie escribe. La medicion del evaluador: 23
        // reglas del CSS servido llevaban una curva por palabra clave fuera
        // de token, y NINGUNA de ellas era `ease-in` a secas, asi que el
        // detector daba verde sobre las 23. Cuatro venian de UI ordinaria
        // (Contact.tsx x2, Footer.tsx, Story.tsx), migradas al token en esa
        // misma ola; el resto es arte/escenas, sancionado abajo.
        //
        // Esta familia es un SUPERCONJUNTO ESTRICTO de la anterior (`ease-in`
        // sigue cazado, ahora junto a las otras tres formas), asi que
        // retirarla no baja la cobertura ni un caso: la sube de una forma a
        // cuatro. Se sustituye en vez de anadirse al lado para que un
        // `ease-in` suelto no dispare DOS hallazgos por el mismo motivo -- el
        // doble disparo de `overshoot`+`easing-literal` es deliberado porque
        // ahi cada familia mide una propiedad DISTINTA (rebota / no nace del
        // token); aqui las dos medirian exactamente lo mismo.
        //
        // Alcance por fichero, igual que `easing-literal`: en el fichero del
        // token una palabra clave seria la DEFINICION del token, no una copia
        // suelta.
        appliesTo: (file) => file !== MOTION_TOKENS_FILE,
        // ALTERNACION ORDENADA DE MAS LARGA A MAS CORTA, y no es cosmetico:
        // con `ease` primero, `ease-in-out` se reportaria como `ease` y dos
        // apariciones distintas colapsarian en el mismo snippet de allowlist.
        //
        // Los dos `\b` son el candado contra la subcadena, el falso positivo
        // que mas facil se cuela aqui. Verificado sobre el corpus real:
        //  - `easing`, `motion.easing.standard`, `REVEAL.easing` NO coinciden
        //    (tras `ease` viene `i`, un caracter de palabra: no hay frontera).
        //  - `EASE_ENTRANCE` NO coincidia (tras `EASE` viene `_`, que para
        //    una regex TAMBIEN es caracter de palabra). Esa constante se
        //    retiro en la critica externa #14 -- se conserva el ejemplo
        //    porque el candado de frontera que ilustra sigue vigente para
        //    cualquier `EASE_*` futuro.
        //  - `decrease`, `release`, `increase`, `please` NO coinciden (antes
        //    de `ease` viene una letra: tampoco hay frontera por delante).
        //  - `linear` queda FUERA de esta familia a proposito: es tambien una
        //    palabra clave de curva, pero `\blinear\b` cazaria cada
        //    `linear-gradient(` del repo (decenas) y ademas los giros
        //    constantes que la usan legitimamente (`raysSpin`, `Wormhole`)
        //    -- precision sobre cobertura, el mismo criterio con el que este
        //    fichero descarto la familia "ghost-card en reposo".
        //
        // Sin exigir `transition`/`animation` en la MISMA linea, y tambien a
        // proposito: el motor es linea a linea, y en `eye.parts.tsx` la curva
        // vive sola en su renglon dentro de una lista multilinea de
        // `animation-timing-function` -- pedir contexto la dejaria escapar.
        test(line) {
            const m = /\b(?:ease-in-out|ease-in|ease-out|ease)\b/i.exec(line);
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
        // Solo el REBOTE. La procedencia (dentro o fuera del token) la vigila
        // `easing-literal`, justo debajo: hasta la critica externa #8 esta
        // familia era la unica de curvas y su mensaje prometia las dos cosas
        // -- ver la nota "Punto ciego cerrado" de la cabecera.
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
        id: "easing-literal",
        label: "curva cubic-bezier escrita fuera de src/theme/tokens/motion.ts",
        // `appliesTo` (unica familia que lo usa hoy): el motor la salta
        // entera en el fichero del token, donde el literal ES la definicion.
        // En cualquier otro fichero, un `cubic-bezier(...)` es una curva que
        // no nace del sistema -- monotona o no, que es justo lo que
        // `overshoot` no podia ver.
        appliesTo: (file) => file !== MOTION_TOKENS_FILE,
        test(line) {
            const m =
                /cubic-bezier\(\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*\)/i.exec(
                    line,
                );
            return m ? m[0] : null;
        },
    },
    {
        id: "duration-literal",
        label: "duracion escrita como literal de tiempo (Nms / Ns) fuera de src/theme/tokens/motion.ts",
        // Familia hermana de `easing-literal`, y por el mismo motivo: la regla
        // 48 pide que toda transition/animation nueva saque su DURACION Y su
        // CURVA del sistema, pero hasta la critica externa #13 (2026-08-18) el
        // detector no miraba ni un solo `ms`. Medicion del evaluador sobre
        // codigo real (comentarios recortados, tests excluidos): 22 duraciones
        // distintas, 15 fuera de la escala de siete pasos de motion.duration.
        //
        // Censo propio antes de escribir el allowlist (mismo motor que este
        // fichero: strip de comentarios + linea a linea sobre src/ y app/):
        // 55 literales de tiempo en 48 lineas fuera de tokens/motion.ts, de
        // los cuales 35 caen fuera de la escala {0, 100, 200, 320, 480, 700,
        // 2100} ms. El censo propio confirma los 14 valores en `ms` que
        // reporto el evaluador (140, 160, 850, 860, 900, 1100, 1150, 1200,
        // 1300, 1600, 1680, 2000, 3200 y el 0.001 del reset de reduce) y anade
        // OCHO que su recuento no vio porque solo miraba el sufijo `ms`: las
        // duraciones escritas en SEGUNDOS (3.4s, 6s, 7s, 9s, 18s, 24s, 34s,
        // 70s), todas en el arte del ojo. Por eso esta familia acepta los dos
        // sufijos: una duracion no deja de estar fuera del sistema por
        // escribirse en otra unidad.
        //
        // POR PROCEDENCIA, NO POR VALOR -- igual que `easing-literal` y por el
        // mismo argumento: un `200ms` escrito a mano coincide HOY con
        // motion.duration.base y deja de coincidir el dia que alguien retoque
        // el token, sin que nada avise (task/lessons.md, 2026-08-12: un
        // literal que resuelve al mismo valor que el token es indistinguible
        // en el CSS renderizado; solo un candado de FUENTE los separa). La
        // familia que mide VALOR seria "fuera de escala", el papel que
        // `overshoot` juega frente a `easing-literal`; aqui no hace falta
        // porque el conjunto sancionado ya deja escrito, uno a uno, que cada
        // excepcion es arte con tiempos propios.
        //
        // Alcance por fichero: en tokens/motion.ts el literal ES la definicion
        // de la escala, no una copia suelta -- mismo `appliesTo` que las dos
        // familias de curvas.
        appliesTo: (file) => file !== MOTION_TOKENS_FILE,
        // El digito es OBLIGATORIO justo antes del sufijo, y ese detalle es el
        // que exime a todo el vocabulario interpolado del repo:
        // `${AMBIENT.breathMs}ms` y `${SECTION_BEAM_PULSE_MS}ms` llevan `}`
        // delante de `ms`, no un digito, asi que NO coinciden -- que es
        // exactamente lo que se quiere, porque ahi la duracion sale de una
        // constante con nombre. Verificado sobre el corpus real:
        //  - `(?<![\w.$])` evita la subcadena: `x2s`, `v1s` no coinciden, y en
        //    `0.5s` no se caza el `5s` (el punto decimal es lookbehind).
        //  - `(?![\w-])` cierra por la derecha: `100px` nunca llega a probar
        //    el sufijo, y un `3s-algo` queda fuera.
        //  - No se exige `transition`/`animation` en la misma linea, mismo
        //    motivo que en `easing-keyword`: el motor es linea a linea y en
        //    Wormhole.tsx/Sol.tsx la duracion vive sola en su renglon dentro
        //    de una shorthand multilinea.
        //
        // EL CERO SE EXIME, con el mismo criterio y el mismo precedente que
        // `radius-literal` ("excluyendo 0, que nunca es deriva de escala"):
        // `0ms`/`0s` no es una duracion inventada fuera del sistema, es la
        // AUSENCIA de duracion, y no puede desincronizarse de ningun token
        // porque no hay ningun valor que pueda derivar. Censo de los 12 casos
        // que exime hoy: siete `transition-delay: 0ms` dentro de bloques
        // `@media (prefers-reduced-motion: reduce)` que ya declaran
        // `transition: none` (Story x7, Features, Journey), el `0ms` de
        // retardo de la shorthand de `ringGlowStep` (Wormhole) y dos
        // `animation-delay: 0s` de la lista multilinea del ojo. Ninguno es un
        // tiempo que alguien haya elegido. `0.001ms` NO entra por aqui (no es
        // cero) y se sanciona explicitamente: es el reset de reduce, donde el
        // valor esta elegido a proposito para ser efectivamente nulo sin
        // llegar a serlo.
        //
        // Se recorren TODAS las coincidencias de la linea (como `overshoot`) y
        // no solo la primera: con `test()` devolviendo en el primer match, una
        // linea que empieza por un cero eximido (`transition: opacity 0ms,
        // transform 850ms`) escondería el literal real que viene detrás.
        test(line) {
            const re = /(?<![\w.$])(\d+(?:\.\d+)?)(?:ms|s)(?![\w-])/gi;
            let m;
            while ((m = re.exec(line)) !== null) {
                if (parseFloat(m[1]) !== 0) return m[0];
            }
            return null;
        },
    },
    {
        id: "duration-const",
        label: "duracion declarada como constante numerica (*Ms / *_MS) que no deriva de motion.durationMs",
        // El AGUJERO que esta familia cierra (critica externa #14,
        // 2026-09-02). `duration-literal`, justo arriba, promete en su propio
        // docblock sancionar "POR PROCEDENCIA, NO POR VALOR" -- pero su regex
        // exige el sufijo `ms`/`s` PEGADO al digito, asi que solo ve la
        // duracion cuando ya esta escrita como tiempo CSS. En TypeScript, una
        // duracion casi nunca se escribe asi: se declara como numero con
        // nombre (`durationMs: 480`, `const HERO_FADE_MS = 420`) y se
        // interpola despues (`${REVEAL.durationMs}ms`), donde el caracter que
        // precede a `ms` es `}` y la familia hermana ya no coincide. Medicion
        // del evaluador sobre `src/motion/vocabulary.ts`: `durationMs: 480`,
        // `railDurationMs: 200`, `openMs: 180` y `closeMs: 120` gobernaban
        // transiciones reales de la interfaz y pasaban el gate en verde por
        // construccion -- ninguna de las once familias podia verlas. Cualquier
        // duracion que pase por una constante con nombre estaba exenta.
        //
        // Censo propio antes de escribir el allowlist (mismo motor: strip de
        // comentarios + linea a linea sobre src/ y app/, tests excluidos): 76
        // declaraciones en 14 ficheros. DOS se arreglaron en esta misma ola en
        // vez de sancionarse (`vocabulary.ts`: los seis campos de tiempo de
        // REVEAL/DECK/OVERLAY/PRESS pasan a leer `motion.durationMs.*`); el
        // resto se sanciona una a una, abajo, con su porque.
        //
        // POR PROCEDENCIA, NO POR VALOR, igual que sus tres familias hermanas:
        // `HERO_COPY_OUT_MS = 100` coincide HOY con motion.duration.fast y
        // deja de coincidir el dia que alguien retoque el token, sin que nada
        // avise (task/lessons.md, 2026-08-12).
        //
        // QUE NOMBRE CUENTA COMO DURACION, y por que este criterio y no otro:
        // el identificador tiene que terminar en `Ms` precedido de minuscula
        // (`durationMs`, `delayMs`, `railDurationMs`) o en `_MS`
        // (`HERO_FADE_MS`, `STEP_STAGGER_MS`). Es el idioma REAL del repo --
        // verificado sobre el corpus: las 76 declaraciones de tiempo con
        // nombre lo siguen, sin una sola excepcion -- y el candado de
        // mayusculas evita el falso positivo obvio (`PARAMS`, `FORMS`,
        // `ITEMS` terminan en `MS` pero con mayuscula delante y sin
        // subrayado, asi que no coinciden). Un nombre `MS` a secas no
        // coincide: no hay ninguno en el repo y aceptarlo abriria la puerta a
        // cualquier sigla.
        //
        // QUE FORMA DE VALOR CUENTA: un DIGITO justo despues de `:`/`=`, con
        // un `[` opcional en medio para la forma "tabla de retardos"
        // (`const STORY_CARD_REVEAL_DELAYS_MS = [200, 260, 320, 380]`). Eso
        // exime exactamente lo que se quiere eximir -- una constante que ya
        // deriva del sistema (`railDurationMs: motion.durationMs.base`,
        // `const ORBIT_SLOW_MS = AMBIENT.orbitMs * 2`) empieza por letra, no
        // por digito, y no coincide. Y no solapa con `duration-literal`: un
        // `const MORPH_MS = "1100ms"` empieza por comilla aqui (no coincide) y
        // ya lo caza la familia hermana por su sufijo CSS -- una linea, una
        // familia, un hallazgo.
        //
        // LIMITE DECLARADO, no disimulado: la tabla de retardos MULTILINEA
        // (`export const FEATURES_LIGHT_REVEAL_DELAYS_MS = [` con los numeros
        // en los renglones siguientes, features.layers.ts) NO dispara. El
        // motor es linea a linea -- la restriccion de diseno que la cabecera
        // de este fichero ya declara -- y en esas lineas no hay nombre al que
        // atribuir el numero. Es el unico caso conocido del corpus que la
        // familia no ve; se deja escrito aqui para que nadie lo lea como
        // "sancionado".
        //
        // EL CERO SE EXIME, con el mismo criterio y el mismo precedente que
        // `duration-literal` y `radius-literal`: un `const
        // STORY_REVEAL_DELAY_EYEBROW_MS = 0` no es un tiempo elegido fuera del
        // sistema, es la ausencia de retardo, y no puede desincronizarse de
        // ningun token porque no hay valor que derivar.
        //
        // Alcance por fichero: mismo `appliesTo` que las tres familias
        // hermanas. Hoy no cambia ningun resultado (en tokens/motion.ts la
        // escala numerica se declara como claves de un objeto, `base: 200`,
        // que no terminan en `Ms`), pero deja escrito que si esa escala se
        // renombrara algun dia a la forma `*_MS`, seguiria siendo la
        // definicion y no una copia suelta.
        appliesTo: (file) => file !== MOTION_TOKENS_FILE,
        test(line) {
            const re =
                /\b([A-Za-z_$][\w$]*(?:[a-z]Ms|_MS))\s*[:=]\s*\[?\s*(-?\d[\d_]*(?:\.\d+)?)(?![\w.])/g;
            let m;
            while ((m = re.exec(line)) !== null) {
                if (parseFloat(m[2].replace(/_/g, "")) !== 0)
                    return `${m[1]} = ${m[2]}`;
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
        id: "font-size-literal",
        label: "font-size literal (rem/px/em) fuera de src/theme/tokens/",
        // QUINTO PUNTO CIEGO CERRADO (critica externa #15, 2026-09-02).
        // Hasta esta revision el detector vigilaba movimiento (cuatro
        // familias), radios, franjas, degradados de texto y dos patrones de
        // composicion -- y NI UNA sola propiedad de TIPOGRAFIA, que es el
        // sistema que este repo mas cita en sus docblocks. Medicion del
        // evaluador de Craft: 10 `font-size` literales en UI ordinaria, de los
        // que TRES duplicaban un peldano vivo de `type.scale` y uno estaba
        // escrito byte a byte en dos ficheros que no se conocen (el 1.15rem
        // del rotulo de marca, en `Navbar.tsx` y en `LegalHeader.tsx`). Los
        // cuatro pasaban el gate en verde por construccion.
        //
        // POR PROCEDENCIA, NO POR VALOR, igual que las cuatro familias de
        // movimiento y por el mismo argumento: el `0.875rem` que
        // `LanguageSelector.tsx` escribia a mano resolvia EXACTAMENTE a
        // `type.scale.bodySm.size`, asi que el CSS renderizado no distinguia
        // los dos casos -- solo la fuente los separa (`task/lessons.md`,
        // 2026-08-12). Un candado de valor renderizado no puede cerrar esto;
        // esta familia si.
        //
        // QUE SE EXIME, y por que cada cosa:
        //  - `clamp(...)`: un tramo fluido no es un peldano de la escala, y el
        //    repo lo usa a proposito en el hero y en los decks. Ademas los
        //    `clamp()` multilinea reparten sus literales en renglones sin
        //    `font-size`, invisibles para un motor linea a linea (limite
        //    declarado, no sancion -- mismo caso que la tabla de retardos
        //    multilinea de `duration-const`).
        //  - `var(...)` y `calc(...)`: el tamano sale de otro sitio; lo que
        //    hubiera que vigilar es ese otro sitio.
        //  - `inherit`: hereda, no elige.
        //  - `1em` EXACTAMENTE: es "el tamano del contexto", la AUSENCIA de
        //    decision de tamano -- mismo criterio y mismo precedente que el
        //    cero de `radius-literal`/`duration-literal`. Exime hoy dos casos,
        //    los dos deliberados y documentados: `ScBrandName`
        //    (`BrandName.tsx`), que hereda el peldano del enlace que lo
        //    contiene, y el reset de `GlobalStyles.tsx`. Un `2em` o un `0.9em`
        //    SI disparan: eso ya es elegir.
        //  - Los porcentajes (`font-size: 100%` del reset) no llevan ninguna
        //    de las tres unidades y no llegan a probarse.
        //
        // Se exige `font-size` en la MISMA linea, al reves que `easing-keyword`
        // y `duration-literal`: aqui el nombre de la propiedad es lo unico que
        // distingue un `0.2em` de tamano de un `0.2em` de
        // `text-underline-offset` o de `letter-spacing`, que son legitimos y
        // abundantes. Limite conocido de esa decision: la shorthand `font:`
        // no dispara -- no existe hoy en el repo, y aceptarla exigiria separar
        // el tamano del resto de la shorthand linea a linea.
        appliesTo: (file) => !file.startsWith(TOKENS_DIR),
        test(line) {
            if (!/font-size/i.test(line)) return null;
            if (/clamp\(|var\(|calc\(|inherit/i.test(line)) return null;
            const re = /(\d+(?:\.\d+)?)(rem|px|em)\b/gi;
            let m;
            while ((m = re.exec(line)) !== null) {
                const esUnEm =
                    parseFloat(m[1]) === 1 && m[2].toLowerCase() === "em";
                if (!esUnEm) return m[0];
            }
            return null;
        },
    },
    {
        id: "z-index-literal",
        label: "z-index entero literal fuera de src/theme/tokens/zIndex.ts",
        // La otra mitad del quinto punto ciego (critica externa #15). El repo
        // tiene una escala de siete peldanos con roles escritos (base, raised,
        // stickyNav, dropdown, overlay, modal, toast) y ningun gate que
        // impidiera escribir un entero al lado. Censo del evaluador: 16
        // z-index literales, todos escalones LOCALES 1-3 entre hermanos --
        // ninguno compitiendo con una capa flotante del sistema. Ese censo
        // propio se reprodujo con este mismo motor antes de sancionarlos, y
        // los 16 estan abajo uno a uno.
        //
        // POR QUE SE SANCIONAN EN VEZ DE MIGRARSE: un `z-index: 1` entre dos
        // hermanos de la misma pila NO es el mismo concepto que `zIndex.raised`
        // (10). La escala nombra capas del DOCUMENTO -- que el navbar va por
        // encima del contenido, que el modal va por encima del navbar --, y
        // meter en ella el orden de dos capas decorativas dentro de una sola
        // seccion la convertiria en un cajon, exactamente el argumento con el
        // que `AMBIENT` se queda fuera de `motion.duration`. Lo que la familia
        // aporta no es migrarlos: es que el 17o no pueda entrar sin que nadie
        // lo mire, y que si algun dia aparece un `z-index: 500` compitiendo a
        // ciegas con `overlay` (900), salte.
        //
        // EL CERO NO SE EXIME, y aqui SI se rompe el precedente de
        // `radius-literal`/`duration-literal`/`duration-const`, con motivo: en
        // esas tres el cero es la AUSENCIA de la propiedad (sin radio, sin
        // duracion). Un `z-index: 0` no es ausencia -- es `zIndex.base`, un
        // peldano real de la escala, y ademas crea contexto de apilamiento
        // igual que cualquier otro valor. Eximirlo dejaria fuera del gate justo
        // el caso que mas se parece a leer el token sin leerlo. Hoy no hay
        // ninguno en el repo.
        //
        // Los valores NEGATIVOS entran (`-?\d+`): un `z-index: -1` manda un
        // elemento DETRAS de su contexto de apilamiento, que es una decision
        // de capa como cualquier otra y de las que mas sorprenden a quien lee
        // el CSS despues.
        //
        // Limite declarado, mismo que `duration-const` frente a
        // `duration-literal`: un z-index que pase por una CONSTANTE con nombre
        // e interpolada (`z-index: ${SECTION_BEAM_Z}`, sectionBeam.parts.tsx)
        // no lleva ningun digito en la linea y no dispara. Se deja escrito
        // para que nadie lo lea como "sancionado": es un camino que esta
        // familia no ve.
        appliesTo: (file) => file !== Z_INDEX_TOKENS_FILE,
        test(line) {
            const m = /z-index\s*:\s*(-?\d+)\b/i.exec(line);
            return m ? m[0] : null;
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
    // ---- font-size-literal: los CINCO literales de tamano que quedaban en UI
    // ordinaria el dia que se cerro el quinto punto ciego (critica externa
    // #15, 2026-09-02). Los TRES que el mismo censo encontro y que NO estan
    // aqui se migraron al token en la misma ola en vez de sancionarse:
    // `LanguageSelector.tsx` (0.875rem -> type.scale.bodySm),
    // `LegalHeader.tsx` (1.15rem -> el peldano nuevo type.scale.wordmark) y el
    // 1rem de `Journey.tsx`.
    //
    // ESTAS CINCO SON EXCEPCIONES DE TRANSICION, NO DE DISENO, y conviene que
    // se lea asi: ninguna tiene un argumento como el de las curvas de mockup o
    // los bucles ambientales. Son literales que existian el dia que la familia
    // nacio, en ficheros que la tarea que la escribio no tenia asignados. Cada
    // una lleva abajo su token candidato; el dia que su dueno las migre, el
    // aviso de "ancla sin hallazgo que la cubra" de este mismo script pedira
    // retirar la entrada.
    {
        family: "font-size-literal",
        file: "src/components/layout/Footer/Footer.tsx",
        anchors: [{ snippet: "font-size: 1rem;", lines: [281] }],
        reason: "Pie de pagina: 1rem duplica EXACTAMENTE type.scale.body.size, el token candidato. Sin argumento propio -- el mismo fichero ya lee type.scale.bodySm.size dos declaraciones mas abajo, asi que la unica razon de que este siga a mano es que nadie lo miro. Excepcion de transicion.",
    },
    {
        family: "font-size-literal",
        file: "src/components/layout/Navbar/Navbar.tsx",
        anchors: [{ snippet: "font-size: 1.15rem;", lines: [550] }],
        reason: "Rotulo de marca del navbar: es la MITAD que queda del valor que la critica #15 encontro escrito byte a byte en dos cabeceras. La otra mitad (LegalHeader.tsx) ya lee el peldano nuevo type.scale.wordmark, creado por ese hallazgo; este fichero estaba fuera del alcance de esa tarea. Token candidato: type.scale.wordmark.size. Excepcion de transicion, y la mas corta de las cinco: el peldano ya existe.",
    },
    {
        family: "font-size-literal",
        file: "src/components/sections/Journey/Journey.tsx",
        anchors: [{ snippet: "font-size: 0.8125rem;", lines: [676] }],
        reason: "13px en la rama clara de Journey: tampoco coincide con ningun peldano (cae entre bodySm y caption, como los dos de Contact). Mismo tratamiento y mismo motivo: elegir entre 14px y 12px es diseno. El 1rem que este mismo fichero tenia SI se migro en esta ola, por eso no aparece aqui. Excepcion de transicion.",
    },
    // ---- z-index-literal: los 16 escalones locales que el censo de la
    // critica externa #15 conto, reproducidos con este mismo motor antes de
    // sancionarlos. Los 16 son el MISMO patron: ordenar dos o tres hermanos
    // dentro de una sola pila (contenido por delante de su fondo decorativo),
    // con valores 1-3 que nunca compiten con las capas flotantes del sistema
    // -- el peldano mas bajo de la escala que si compite, `raised`, vale 10.
    // Ver el comentario de la familia para por que se sancionan en vez de
    // migrarse: meter el orden interno de una seccion en una escala que nombra
    // capas del DOCUMENTO la convertiria en un cajon.
    {
        family: "z-index-literal",
        file: "src/components/layout/Footer/Footer.tsx",
        anchors: [{ snippet: "z-index: 1;", count: 2, lines: [247, 519] }],
        reason: "Pie de pagina: dos capas de contenido por delante de sus propios fondos decorativos, dentro de la pila del propio footer.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/About/About.tsx",
        anchors: [{ snippet: "z-index: 2;", lines: [66] }],
        reason: "About: contenido por delante del arte de su seccion. El 2 (y no 1) ordena frente a un hermano que ya usa el escalon de abajo en la misma pila.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/Contact/Contact.tsx",
        anchors: [
            { snippet: "z-index: 3;", lines: [182] },
            { snippet: "z-index: 1;", count: 2, lines: [650, 694] },
        ],
        reason: "Contacto: pila local de tres escalones (arte, capa intermedia, contenido). Esta seccion es ademas la que YA consume el token donde de verdad hace falta -- z-index: theme.data.zIndex.raised en la misma pagina --, que es la prueba de que los tres literales de aqui son otro concepto, no un olvido.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/Features/Features.tsx",
        anchors: [
            { snippet: "z-index: 2;", lines: [267] },
            { snippet: "z-index: 1;", count: 2, lines: [812, 1139] },
        ],
        reason: "Features: mismo patron de pila local en sus dos ramas de tema (tarjeta acotada en claro, seccion a sangre en oscuro), mas un escalon 2 sobre un hermano decorativo.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/Journey/journey.deck.tsx",
        anchors: [{ snippet: "z-index: 1;", count: 3, lines: [184, 343, 495] }],
        reason: "Deck de Journey: tres diapositivas con el mismo patron -- el contenido de la diapositiva por delante de su propio fondo. Tres apariciones del MISMO contenido de linea, no tres decisiones distintas.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/Journey/Journey.tsx",
        anchors: [{ snippet: "z-index: 1;", lines: [192] }],
        reason: "Rama clara de Journey: contenido por delante del arte de la seccion, el mismo escalon local que su deck usa en oscuro.",
    },
    {
        family: "z-index-literal",
        file: "src/components/sections/Story/story.deck.tsx",
        anchors: [{ snippet: "z-index: 1;", count: 3, lines: [205, 444, 612] }],
        reason: "Deck de Story: gemelo exacto del de Journey (los dos decks son 13 piezas practicamente 1 a 1, deuda ya declarada en RULES.md), con el mismo escalon local en tres diapositivas.",
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
    // ---- easing-literal: quedan DOS de las cuatro curvas fuera de token que
    // existian el dia que se cerro el punto ciego (critica externa #8,
    // 2026-08-17). Cada una se comparo con las curvas de motion.easing antes
    // de sancionarla: ninguna de las dos coincide en sus cuatro puntos de
    // control con un token, asi que ninguna se migro (migrar habria cambiado
    // el movimiento real, no solo su procedencia).
    //
    // Las otras DOS entradas de esta familia -- `Sol.tsx` (EASE_ENTRANCE) y
    // `src/motion/vocabulary.ts` (la curva compartida por REVEAL.easing y
    // PRESS.easing) -- se RETIRAN en la critica externa #14 (2026-09-02),
    // porque las dos lineas que sancionaban ya no existen: las dos curvas se
    // unificaron en `motion.easing.settle`, el peldaño nuevo del token. Esta
    // lista decia que consolidar los tres sistemas de movimiento del repo era
    // "una decision del dueno, no de este detector"; la crítica la tomo, con
    // la medicion del CSS servido delante (esa curva era la mas usada del
    // sitio: 72 ocurrencias en claro, 105 en oscuro).
    {
        family: "easing-literal",
        file: "src/components/scenes/sectionBeam/sectionBeam.layers.ts",
        anchors: [
            {
                snippet:
                    'export const SECTION_BEAM_EASING = "cubic-bezier(0.16, 0.8, 0.3, 1)";',
                lines: [163],
            },
        ],
        reason: "SECTION_BEAM_EASING: valor VERBATIM del mockup del haz de seccion (L46-49), citado en el docblock de la propia constante junto al resto de tiempos portados del mismo mockup. Ninguna de las cinco curvas de motion.easing tiene estos puntos de control.",
    },
    {
        family: "easing-literal",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
            {
                snippet:
                    'const STORY_STATEMENT_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";',
                lines: [202],
            },
        ],
        reason: "STORY_STATEMENT_EASING: valor VERBATIM del mockup del statement de Story (L128-130). Su docblock ya declaraba explicitamente que ninguna de las cinco curvas de motion.easing -- ni REVEAL.easing -- tiene estos cuatro puntos de control; comprobado de nuevo al sancionarla.",
    },
    // ---- easing-keyword: las 13 curvas por palabra clave que quedaban el dia
    // que se cerro el punto ciego (critica externa #9, 2026-08-17). Las CUATRO
    // de UI ordinaria que el evaluador conto aparte NO estan en esta lista
    // porque se MIGRARON al token en la misma ola: Contact.tsx (x2),
    // Footer.tsx y Story.tsx, las tres a `motion.easing.standard`.
    //
    // Las 13 que quedan son todas de arte de marca o de escenas decorativas
    // (`src/components/scenes/**`), y se sancionan por DOS motivos, no por
    // uno: (a) son ambientes en bucle infinito cuyo caracter cambiaria al
    // sustituir la curva -- `ease-in-out` es simetrica y `standard` frena mas
    // tarde, asi que la migracion NO seria neutra en un vaiven que invierte
    // el sentido en el 50%; (b) el fichero que las contiene queda FUERA del
    // alcance de la tarea que cerro este punto ciego, y migrar arte desde una
    // tarea que no lo tiene asignado es exactamente la clase de cambio que
    // este repo no hace en silencio. Mismo criterio con el que la critica #8
    // sanciono, sin migrar ninguna, las cuatro curvas `cubic-bezier` propias.
    {
        family: "easing-keyword",
        file: "src/components/scenes/eye/eye.parts.tsx",
        anchors: [
            {
                snippet: "animation-timing-function: ease-in-out;",
                lines: [206],
            },
            { snippet: "ease-in-out,", count: 2, lines: [249, 275] },
        ],
        reason: "Resplandor ambiental del ojo (eyeStagger): la curva del BUCLE de glow, no la de la entrada del stagger -- la entrada si usa token (motion.easing.decelerate, en la misma declaracion). Las dos apariciones con snippet identico son la rama de entrada y la de salida del mismo glow (count: 2). Migrarlas cambiaria el caracter del latido de fondo del hero oscuro, no solo su procedencia.",
    },
    {
        family: "easing-keyword",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [
            {
                snippet:
                    "animation: ${solBreathe} ${AMBIENT.breathMs}ms ease-in-out infinite;",
                lines: [122],
            },
            {
                snippet:
                    "animation: ${haloGlow} ${AMBIENT.breathMs}ms ease-in-out infinite;",
                lines: [244],
            },
            {
                snippet:
                    "animation: ${coronaMorph} ${AMBIENT.orbitMs}ms ease-in-out infinite;",
                lines: [299],
            },
            {
                snippet: "animation: ${rayTwinkle} 6s ease-in-out infinite;",
                lines: [340],
            },
            {
                snippet:
                    "animation: ${coreGlow} ${AMBIENT.breathMs}ms ease-in-out infinite;",
                lines: [370],
            },
            {
                snippet:
                    "animation: ${sparkleTwinkle} 3.4s ease-in-out infinite;",
                lines: [440],
            },
            {
                snippet:
                    "animation: ${sparkTwinkle} 3.4s ease-in-out infinite;",
                lines: [462],
            },
        ],
        reason: "Siete bucles ambientales del mascota Sol (respiracion, halo, corona, rayo, nucleo y dos capas de destellos): arte de marca con constantes propias, la misma excepcion de regla 17 de RULES.md que ya cubre el border-radius de este mismo fichero (la curva propia EASE_ENTRANCE, que tambien se citaba aqui, dejo de existir en la critica externa #14: se unifico en motion.easing.settle). Los siete son vaivenes infinitos que vuelven al punto de partida, el caso exacto para el que ease-in-out es simetrica y ninguna de las cinco curvas del sistema lo es.",
    },
    {
        family: "easing-keyword",
        file: "src/components/scenes/sectionBeam/sectionBeam.parts.tsx",
        anchors: [
            {
                snippet:
                    "animation: ${beamPulse} ${SECTION_BEAM_PULSE_MS}ms ease-in-out infinite;",
                lines: [294],
            },
        ],
        reason: "Pulso del haz de seccion: valor VERBATIM del mockup (L50/L118), ya declarado como tal en dos docblocks del propio repo -- sectionBeam.layers.ts junto a SECTION_BEAM_EASING (que dice literalmente que beamPulse usa ease-in-out, una palabra clave nativa) y el comentario del propio animation en este fichero, que anade que ninguna curva de la tabla de motion coincide. La excepcion ya estaba escrita y razonada antes de que el detector supiera verla.",
    },
    {
        family: "easing-keyword",
        file: "src/components/scenes/storyCosmicBeing/storyCosmicBeing.parts.tsx",
        anchors: [
            {
                snippet:
                    "animation: ${heartBeat} ${AMBIENT.breathMs}ms ease-in-out infinite;",
                lines: [104],
            },
        ],
        reason: "Latido del ser cosmico de Story (heartBeat, sobre AMBIENT.breathMs): mismo caso y mismo motivo que los bucles de respiracion de Sol -- un vaiven infinito que vuelve al punto de partida, donde la simetria de ease-in-out ES la intencion. Escena decorativa (aria-hidden), fuera del alcance de la tarea que cierra el punto ciego.",
    },
    // ---- duration-literal: los 35 literales de tiempo que existian el dia
    // que se cerro este punto ciego (critica externa #13, 2026-08-18). Censo
    // propio ejecutado con el motor de este mismo fichero antes de escribir
    // una sola entrada: 55 literales de tiempo en src/ y app/, de los cuales 7
    // nacen en tokens/motion.ts (la definicion de la escala, fuera de alcance
    // por `appliesTo`), 12 son ceros eximidos por la regla (ver el comentario
    // de la familia) y 36 lineas quedan como hallazgo. De esas 36, UNA se
    // migro al token en esta misma ola en vez de sancionarse -- ninguna: las
    // 35 restantes viven todas en arte de marca o escenas decorativas
    // (`aria-hidden`), y las 35 llegan a esta lista con su porque YA escrito
    // junto a la declaracion, que es la condicion que este fichero exige para
    // sancionar. Se comprobo una a una; ninguna es UI ordinaria.
    //
    // Que las 35 esten sancionadas no las deja sin vigilancia: el ancla es de
    // CONTENIDO, asi que retocar el numero de cualquiera de ellas (850 -> 900)
    // cambia el contenido de la linea, se queda sin ancla y pone el gate en
    // rojo. Lo que la sancion permite es que sigan EXISTIENDO, no que puedan
    // moverse en silencio.
    {
        family: "duration-literal",
        file: "src/components/scenes/eye/eye.parts.tsx",
        anchors: [
            {
                snippet:
                    'glow === "strong" ? "7s" : glow === "soft" ? "9s" : undefined;',
                lines: [196],
            },
        ],
        reason: "Duracion del bucle de resplandor ambiental del ojo (eyeStagger, dos intensidades en la misma linea: 7s fuerte y 9s suave; el motor reporta la primera). Escena decorativa aria-hidden, mismo caso y mismo motivo que la curva ease-in-out de este mismo fichero ya sancionada en easing-keyword: es el latido de fondo del hero oscuro, un ambiente en bucle infinito cuyo ritmo no es una duracion de interfaz. Ningun paso de motion.duration llega a esa escala (la mas larga, spinReduced, mide 2100ms).",
    },
    {
        family: "duration-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [
            { snippet: "animation: ${solSpin} 900ms", lines: [169] },
            { snippet: 'const MORPH_MS = "1100ms";', lines: [206] },
            {
                snippet: "animation: ${raysSpin} 70s linear infinite;",
                lines: [349],
            },
            {
                snippet: "animation: ${rayTwinkle} 6s ease-in-out infinite;",
                lines: [372],
            },
            {
                snippet:
                    "animation: ${sparkleTwinkle} 3.4s ease-in-out infinite;",
                lines: [472],
            },
            {
                snippet:
                    "animation: ${sparkTwinkle} 3.4s ease-in-out infinite;",
                lines: [494],
            },
        ],
        reason: "Seis tiempos propios del mascota Sol: el giro de identidad (900ms), el morph que fija el origen (MORPH_MS, 1100ms), la rotacion lenta de los rayos (70s), el centelleo del rayo (6s) y dos capas de destellos (3.4s). Arte de marca con constantes propias, la misma excepcion de regla 17 de RULES.md que ya cubre el border-radius y los siete ease-in-out de este mismo fichero. El docblock de MORPH_MS ya razonaba en el propio codigo por que 1100 no tiene casilla en la escala (la mas larga de la familia de interfaz, slower, mide 480ms); los cinco restantes son bucles ambientales de segundos, un orden de magnitud fuera de cualquier paso de motion.duration.",
    },
    {
        family: "duration-literal",
        file: "src/components/scenes/eye/mascots/Wormhole.tsx",
        anchors: [
            {
                snippet: "animation: ${spin} 34s linear infinite;",
                lines: [150],
            },
            { snippet: "${spin} 34s linear infinite,", lines: [154] },
            {
                snippet:
                    "${swirlFlash} 850ms ${({ theme }) => theme.data.motion.easing.standard}",
                lines: [155],
            },
            { snippet: "1150ms;", lines: [156] },
            {
                snippet: "animation: ${ringExplodeStep} 850ms",
                lines: [176],
            },
            {
                snippet:
                    "${({ theme }) => theme.data.motion.easing.standard} 1150ms;",
                count: 3,
                lines: [177, 250, 331],
            },
            {
                snippet: "animation: ${spin} 24s linear infinite reverse;",
                lines: [190],
            },
            {
                snippet: "${spin} 24s linear infinite reverse,",
                lines: [194],
            },
            { snippet: "${ringGlowStep} 1680ms", lines: [195] },
            {
                snippet:
                    "${({ theme }) => theme.data.motion.easing.standard} 320ms;",
                lines: [196],
            },
            {
                snippet: "animation: ${spin} 18s linear infinite;",
                lines: [209],
            },
            { snippet: "${spin} 18s linear infinite,", lines: [213] },
            { snippet: "${ringGlowStep} 1840ms", lines: [214] },
            {
                snippet:
                    "${({ theme }) => theme.data.motion.easing.standard} 160ms;",
                lines: [215],
            },
            { snippet: "animation: ${ringGlowStep} 2000ms", lines: [229] },
            { snippet: "animation: ${corePulseStep} 850ms", lines: [249] },
            { snippet: "animation: ${markPulse} 850ms", lines: [330] },
            { snippet: "animation: ${shockBurst} 900ms", lines: [353] },
            {
                snippet:
                    "${({ theme }) => theme.data.motion.easing.emphasized} 1200ms;",
                lines: [354],
            },
            { snippet: "animation: ${shockBurst} 860ms", lines: [370] },
            {
                snippet:
                    "${({ theme }) => theme.data.motion.easing.emphasized} 1300ms;",
                lines: [371],
            },
        ],
        reason: "Coreografia completa del Wormhole: 21 lineas con tiempo literal (giros de anillo de 18/24/34s, destellos y pulsos de 850/860/900/1680/1840/2000ms y sus retardos de 160/320/1150/1200/1300ms). Es un PORT VERBATIM del widget homonimo de vti-sdk (src/widgets/landing-fx/Wormhole.tsx + Wormhole.css.ts), y su docblock de cabecera ya declara exactamente esta clase de excepcion para los colores: valores verbatim del handoff, espectaculo de marca en un elemento aria-hidden, no roles de UI. Los tiempos vienen del mismo handoff y por el mismo camino; lo que ese docblock SI migro al sistema de este repo fue la CURVA (easingEmphasized -> motion.easing.emphasized), porque una curva de interfaz si es un rol del sistema. El 320ms de la linea 196 se sanciona por procedencia aunque COINCIDA hoy con motion.duration.slow: es un retardo portado, no una lectura del token, y esa diferencia solo se ve en la fuente (task/lessons.md, 2026-08-12).",
    },
    {
        family: "duration-literal",
        file: "src/components/scenes/eye/mascots/useSolTiltSpin.ts",
        anchors: [
            {
                snippet:
                    "tilt.style.transition = `transform 140ms ${motion.easing.decelerate}`;",
                lines: [67],
            },
        ],
        reason: "Suavizado del seguimiento de cursor del mascota Sol. El comentario justo encima de la linea ya lo declara y lo razona: la CURVA se migro al token (decelerate) al cerrar la sancion provisional de easing-keyword, y la DURACION se queda en su literal calibrado porque el par 140/480 -- entrada rapida, salida lenta -- es asimetrico a proposito y 140 no existe en la escala. Sancionar la duracion aqui no reabre nada: deja escrito lo que ese comentario ya decia, ahora tambien para el gate.",
    },
    {
        family: "duration-literal",
        file: "src/components/sections/Features/features.layers.ts",
        anchors: [
            {
                snippet:
                    'export const FEATURES_CONIC_BORDER_SPIN_MS = "3200ms";',
                lines: [267],
            },
        ],
        reason: "Giro del borde conico de Features en hover, valor VERBATIM del mockup (D7, L197: animation vtiBorderSpin 3200ms linear infinite). Es ademas la forma EXACTA que la regla 17 de RULES.md sanciona -- constante con nombre en su propio modulo *.layers.ts, importada tal cual y nunca reescrita como valor suelto -- y su docblock ya explica por que no coincide con ningun paso de motion.duration: es una animacion ambiental de marca, no una transicion de interfaz.",
    },
    {
        family: "duration-literal",
        file: "src/components/sections/Hero/Hero.tsx",
        anchors: [
            { snippet: "animation: ${ctaGlowPulse} 1600ms", lines: [695] },
        ],
        reason: "Respiracion del resplandor del CTA del hero mientras hay hover o foco. El docblock de ctaGlowPulse (Hero.tsx) ya inventaria por que este numero no entra en ningun grupo: no es multiplo de ningun motion.duration ni de los tres campos de AMBIENT (5400/9000/20000), y AMBIENT esta reservado por contrato al movimiento infinito NUNCA ligado a una interaccion. Se declaro como constante local con nombre, con su porque, en vez de forzarse dentro de un vocabulario que no lo describe. La curva de la misma declaracion SI sale del token (motion.easing.standard).",
    },
    {
        family: "duration-literal",
        file: "src/theme/GlobalStyles.tsx",
        anchors: [
            {
                snippet: "animation-duration: 0.001ms !important;",
                lines: [410],
            },
            {
                snippet: "transition-duration: 0.001ms !important;",
                lines: [412],
            },
        ],
        reason: "Reset de prefers-reduced-motion. El 0.001ms es el idioma estandar de este reset y NO puede sustituirse por motion.duration.instant (0ms) ni exime por la regla del cero: el valor esta elegido a proposito para ser efectivamente nulo SIN llegar a serlo, de modo que el navegador siga emitiendo transitionend/animationend y ningun codigo que espere ese evento se quede colgado. Las dos MISMAS lineas ya estan sancionadas en la familia important por su otro motivo (ganar por especificidad al selector universal); esta entrada cubre el tiempo, no el !important -- dos familias miden dos propiedades distintas de la misma linea, igual que overshoot y easing-literal.",
    },
    // ---- duration-const: las 80 duraciones declaradas como constante
    // numerica que existian el dia que se cerro este punto ciego (critica
    // externa #14, 2026-09-02). Censo propio ejecutado con el motor de este
    // mismo fichero antes de escribir una sola entrada: 86 declaraciones
    // `*Ms`/`*_MS` con valor numerico en src/ y app/, de las cuales 6 se
    // ARREGLARON en la misma ola en vez de sancionarse -- los seis campos de
    // tiempo de REVEAL/DECK/OVERLAY/PRESS (src/motion/vocabulary.ts) pasan a
    // leer motion.durationMs.*, que es el hallazgo que trajo esta familia --
    // y 80 se sancionan aqui, una a una, con su porque.
    //
    // El reparto de esas 80, porque explica que clase de excepcion es cada
    // una y por que ninguna es UI ordinaria sin justificar:
    //  - 65 son ARTE o escena decorativa con tiempos propios, casi siempre
    //    verbatim de un mockup: 48 de la tabla de estrellas del footer, 6 de
    //    la cascada de Story, 5 del haz de seccion, 3 de AMBIENT
    //    (vocabulary.ts), 2 de Contacto y 1 de la flotacion de la figura de
    //    Story.
    //  - 9 son COREOGRAFIAS con su excepcion ya razonada por escrito antes
    //    de que existiera esta familia: los 4 del hero (timings.ts), los 2
    //    del cruce de copia (hero.transition.ts), el escalonado de Journey,
    //    el scrub de Story y el despegue del navbar.
    //  - 6 son RELOJES Y TOPES DE JS que no animan nada: los 2 del ciclo de
    //    caras del mascota Sol, el margen de un frame de HeroBackdrop y los
    //    3 de hooks (aterrizaje en fragmento, inactividad de puntero,
    //    re-maquetado tras cambiar de tema). En los seis, el numero decide
    //    cuanto se espera antes de actuar igual, no cuanto dura un
    //    movimiento.
    //
    // NUEVE de las 80 COINCIDEN hoy con un peldano de la escala (100 x2,
    // 200 x3, 320 x2, 480 y 2100) y se sancionan igual, por PROCEDENCIA: es
    // justo el caso que esta familia existe para hacer visible. En cinco de
    // las nueve el docblock del propio codigo ya argumentaba por que no
    // debian aliasearse; una (el retardo de 2100 ms de una estrella del
    // footer) coincide por pura casualidad aritmetica dentro de una tabla de
    // 48 numeros.
    //
    // Que esten sancionadas no las deja sin vigilancia: el ancla es de
    // CONTENIDO, asi que retocar cualquiera de estos numeros (90 -> 120)
    // cambia el contenido de la linea, la deja sin ancla y pone el gate en
    // rojo. Lo que la sancion permite es que sigan EXISTIENDO, no que puedan
    // moverse en silencio.
    {
        family: "duration-const",
        file: "src/components/layout/Footer/footer.layers.ts",
        anchors: [
            { snippet: "durationMs: 2800,", lines: [266] },
            { snippet: "delayMs: 1200,", lines: [267] },
            { snippet: "durationMs: 4100,", lines: [276] },
            { snippet: "delayMs: 2000,", lines: [277] },
            { snippet: "durationMs: 3300,", lines: [286] },
            { snippet: "delayMs: 900,", count: 2, lines: [287, 477] },
            { snippet: "durationMs: 5200,", lines: [296] },
            { snippet: "delayMs: 3100,", lines: [297] },
            { snippet: "durationMs: 2500,", lines: [306] },
            { snippet: "delayMs: 1600,", lines: [307] },
            { snippet: "durationMs: 3900,", lines: [316] },
            { snippet: "delayMs: 2400,", lines: [317] },
            { snippet: "durationMs: 4700,", lines: [326] },
            { snippet: "delayMs: 1100,", lines: [327] },
            { snippet: "durationMs: 2200,", lines: [336] },
            { snippet: "delayMs: 800,", lines: [337] },
            { snippet: "durationMs: 3600,", lines: [346] },
            { snippet: "delayMs: 2900,", lines: [347] },
            { snippet: "durationMs: 5800,", lines: [356] },
            { snippet: "delayMs: 1700,", lines: [357] },
            { snippet: "durationMs: 3100,", lines: [366] },
            { snippet: "delayMs: 2300,", lines: [367] },
            { snippet: "durationMs: 4400,", lines: [376] },
            { snippet: "delayMs: 1400,", lines: [377] },
            { snippet: "durationMs: 2900,", lines: [386] },
            { snippet: "delayMs: 3500,", lines: [387] },
            { snippet: "durationMs: 3700,", lines: [396] },
            { snippet: "delayMs: 1000,", count: 2, lines: [397, 497] },
            { snippet: "durationMs: 5000,", lines: [406] },
            { snippet: "delayMs: 2600,", lines: [407] },
            { snippet: "durationMs: 3400,", lines: [416] },
            { snippet: "delayMs: 1900,", lines: [417] },
            { snippet: "durationMs: 6000,", lines: [426] },
            { snippet: "delayMs: 3600,", lines: [427] },
            { snippet: "durationMs: 2600,", lines: [436] },
            { snippet: "delayMs: 1300,", lines: [437] },
            { snippet: "durationMs: 4900,", lines: [446] },
            { snippet: "delayMs: 2100,", lines: [447] },
            { snippet: "durationMs: 3000,", lines: [456] },
            { snippet: "delayMs: 1500,", lines: [457] },
            { snippet: "durationMs: 4300,", lines: [466] },
            { snippet: "delayMs: 2800,", lines: [467] },
            { snippet: "durationMs: 3800,", lines: [476] },
            { snippet: "durationMs: 5500,", lines: [486] },
            { snippet: "delayMs: 3200,", lines: [487] },
            { snippet: "durationMs: 2700,", lines: [496] },
        ],
        reason: "Tabla FOOTER_STARS: 24 estrellas decorativas escritas a mano, cada una con su duracion de titileo y su retardo -- 48 numeros en 46 lineas distintas (dos retardos se repiten, de ahi los dos count: 2). Es un dato de ARTE congelado a proposito: el docblock de la tabla ya razona por que no se genera con Math.random() (mismatch de hidratacion garantizado en un sitio con output: 'export' que si hidrata) y de donde salen los pesos y los rangos (el generador del mockup, L180-193). Ningun paso de motion.duration entra en el rango real de estos valores -- 2200-6000 ms de duracion y 800-3600 ms de retardo, todos por encima del peldano mas largo de la escala de interfaz (spinReduced, 2100 ms) -- y forzarlos dentro colapsaria 48 valores distintos en siete, que es lo contrario de lo que la tabla existe para dar: variedad deterministica. El ancla es de CONTENIDO, asi que retocar el numero de cualquier estrella la deja sin ancla y pone el gate en rojo.",
    },
    {
        family: "duration-const",
        file: "src/components/scenes/eye/mascots/Sol.constants.ts",
        anchors: [
            {
                snippet: "export const SOL_AUTO_CYCLE_MS = 8 * 60 * 1000;",
                lines: [11],
            },
            {
                snippet: "export const SOL_MANUAL_OVERRIDE_MS = 44 * 1000;",
                lines: [13],
            },
        ],
        reason: "SOL_AUTO_CYCLE_MS (8 x 60 x 1000, ocho minutos) y SOL_MANUAL_OVERRIDE_MS (44 x 1000, 44 segundos): NO son duraciones de animacion sino relojes de JS -- cada cuanto alterna la cara programada del mascota Sol y cuanto dura el override que fuerza un click. El docblock de cabecera del fichero ya lo declara ('datos de render y de temporizacion consumidos desde JS; las duraciones puramente decorativas viven en el CSS de Sol.tsx') y los dos son un port 1:1 de vti-sdk. La regla 48 habla de transition/animation: un intervalo de ocho minutos no tiene peldano posible en una escala cuyo maximo son 2100 ms. Se SANCIONAN en vez de eximirse por nombre a proposito -- dejar escrito que se revisaron es preferible a una regex que los excluya en silencio.",
    },
    {
        family: "duration-const",
        file: "src/components/scenes/sectionBeam/sectionBeam.layers.ts",
        anchors: [
            {
                snippet: "export const SECTION_BEAM_DRAW_MS = 1600;",
                lines: [149],
            },
            {
                snippet: "export const SECTION_BEAM_DRAW_DELAY_MS = 200;",
                lines: [151],
            },
            {
                snippet: "export const SECTION_BEAM_SWEEP_MS = 18000;",
                lines: [155],
            },
            {
                snippet: "export const SECTION_BEAM_SWEEP_DELAY_MS = 1800;",
                lines: [157],
            },
            {
                snippet: "export const SECTION_BEAM_PULSE_MS = 4500;",
                lines: [159],
            },
        ],
        reason: "Los cinco tiempos del haz de seccion, VERBATIM del mockup y citados uno a uno en el docblock de su propia constante: beamDraw 1.6s y su retardo .2s (L46-47), beamOut 18s y su retardo 1.8s (L48-49), beamPulse 4.5s (L50/L118). Es la forma EXACTA que la regla 17 de RULES.md sanciona -- constante con nombre en su propio *.layers.ts, importada tal cual y nunca reescrita como valor suelto -- y esta misma pieza ya tiene sancionadas su curva (SECTION_BEAM_EASING, familia easing-literal) y el ease-in-out de su pulso (sectionBeam.parts.tsx, familia easing-keyword) por el mismo motivo.",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Contact/contact.layers.ts",
        anchors: [
            {
                snippet: "export const CONTACT_FIGURE_FLOAT_MS = 8000;",
                lines: [142],
            },
            {
                snippet: "export const CONTACT_TOP_GLOW_PULSE_MS = 7000;",
                lines: [334],
            },
        ],
        reason: "CONTACT_FIGURE_FLOAT_MS (8000) y CONTACT_TOP_GLOW_PULSE_MS (7000): flotacion de la figura de Contacto y pulso de su resplandor superior, los dos VERBATIM del mockup (keyframe vtiFloat6; glowPulse 7s, L28/L52) y los dos bucles infinitos declarados solo bajo prefers-reduced-motion: no-preference. Bucles ambientales de segundos, un orden de magnitud fuera de la escala de interfaz. De la declaracion del mockup ya se migro al sistema lo que SI es un rol suyo -- la CURVA: Contact.tsx resuelve motion.easing.standard desde la critica externa #9; lo que queda aqui es el ritmo.",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Hero/HeroBackdrop.tsx",
        anchors: [
            { snippet: "const NEXT_FRAME_TIMEOUT_MS = 50;", lines: [72] },
        ],
        reason: "NEXT_FRAME_TIMEOUT_MS (50): no temporiza ninguna animacion -- es el tope de una Promise.race contra requestAnimationFrame para que el cruce del fondo del hero no se quede colgado en una pestana oculta, donde el navegador no emite frames. Su propio docblock lo dice literalmente: 'El margen de un frame es una MEJORA de alineacion, no una condicion de correccion'. Misma familia de constante de SEGURIDAD que HERO_DECODE_TIMEOUT_MS (timings.ts) y THEME_ANCHOR_SETTLE_MS (useThemeScrollReset.ts).",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Hero/hero.transition.ts",
        anchors: [
            { snippet: "export const HERO_COPY_OUT_MS = 100;", lines: [57] },
            { snippet: "export const HERO_COPY_IN_MS = 320;", lines: [65] },
        ],
        reason: "HERO_COPY_OUT_MS (100) y HERO_COPY_IN_MS (320): los dos COINCIDEN hoy con un peldano de la escala (fast y slow) y los dos se sancionan por PROCEDENCIA, que es exactamente el caso que esta familia existe para hacer visible. Sus docblocks ya argumentan por que no se aliasean: son la coreografia del cruce del hero, y un alias las retimearia en silencio el dia que fast/slow cambien por una razon de UI ajena a esta transicion. Mismo razonamiento, escrito antes y en otro fichero, que NAV_DETACH_ANIM_MS (useNavDetach.ts).",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Journey/Journey.tsx",
        anchors: [{ snippet: "const STEP_STAGGER_MS = 90;", lines: [129] }],
        reason: "STEP_STAGGER_MS (90): paso del reveal escalonado de la rama clara de Journey, valor de la spec ('~90ms por paso', seccion 7.2). El vocabulario de movimiento LLEGO a tener un campo para esto -- REVEAL.stepMs, 60 -- y se retiro en la fix wave B (2026-08-12) precisamente porque 90 no es 60: el docblock de REVEAL en vocabulary.ts deja escrito que este valor es distinto, para un proposito distinto, y que no habia ningun consumidor real al que migrarlo. Un retardo entre piezas tampoco tiene casilla en una escala de duraciones de transicion.",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
            {
                snippet: "const STORY_REVEAL_DELAY_TITLE_MS = 80;",
                lines: [212],
            },
            {
                snippet: "const STORY_REVEAL_DELAY_BODY_MS = 140;",
                lines: [213],
            },
            {
                snippet:
                    "const STORY_CARD_REVEAL_DELAYS_MS = [200, 260, 320, 380] as const;",
                lines: [214],
            },
            { snippet: "const STORY_STATEMENT_REVEAL_MS = 900;", lines: [242] },
            {
                snippet: "const STORY_STATEMENT_DELAY_SECOND_MS = 220;",
                lines: [258],
            },
            {
                snippet: "const STORY_STATEMENT_DELAY_THIRD_MS = 440;",
                lines: [259],
            },
        ],
        reason: "Los seis retardos y duraciones de la cascada de Story, VERBATIM del mockup (L74-121 la cascada de la rejilla, L127-131 el statement) y ya documentados uno a uno en el propio fichero -- el docblock de STORY_STATEMENT_REVEAL_MS explica por que 900 no tiene casilla en la escala. Los retardos son un ORDEN entre piezas, no duraciones de interfaz: motion.duration no tiene ni pretende tener peldanos de retardo. STORY_CARD_REVEAL_DELAYS_MS es la unica tabla de retardos del repo escrita en UNA sola linea, y por eso es la unica que esta familia ve; su gemela multilinea (FEATURES_LIGHT_REVEAL_DELAYS_MS, features.layers.ts) NO dispara por el limite linea-a-linea del motor, NO por estar sancionada -- ver el comentario de la familia.",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Story/story.layers.ts",
        anchors: [
            {
                snippet: "export const STORY_FIGURE_FLOAT_MS = 9000;",
                lines: [235],
            },
        ],
        reason: "STORY_FIGURE_FLOAT_MS (9000): la flotacion de la figura, verbatim del mockup (vtiFloat6, 9s), bucle ambiental un orden de magnitud fuera de la escala. Hasta la integracion de la ola J (2026-09-02) esta entrada sancionaba tambien STORY_SCRUB_MS = 320, el caso de PROCEDENCIA en estado puro (atado a motion.duration.slow por un TEST, no derivado en codigo); ya deriva de motion.durationMs.slow con cero cambio de valor y la familia deja de verlo -- que es exactamente lo que la familia existe para provocar.",
    },
    {
        family: "duration-const",
        file: "src/hooks/useFragmentLanding.ts",
        anchors: [
            {
                snippet: "export const FRAGMENT_LANDING_SETTLE_MS = 200;",
                lines: [151],
            },
        ],
        reason: "FRAGMENT_LANDING_SETTLE_MS (200): tope de espera de la correccion de scroll al aterrizar en un fragmento cuando los dos frames del camino normal no llegan (pestana oculta). Su docblock ya lo declara 'una constante de seguridad, de la misma familia que HERO_DECODE_TIMEOUT_MS', y razona el unico vinculo aritmetico que si tiene: es el DOBLE de THEME_ANCHOR_SETTLE_MS, porque cubre mas trabajo. Que coincida con motion.duration.base es casualidad de valor, no derivacion -- y sancionarlo por procedencia es precisamente dejar esa distincion escrita.",
    },
    {
        family: "duration-const",
        file: "src/hooks/useNavDetach.ts",
        anchors: [
            { snippet: "export const NAV_DETACH_ANIM_MS = 480;", lines: [58] },
        ],
        reason: "NAV_DETACH_ANIM_MS (480): coincide con motion.duration.slower y su docblock dedica un parrafo entero a argumentar por que NO debe ser un alias -- un cambio futuro de slower por un motivo de UI ajeno al navbar retimearia esta coreografia en silencio. La sancion no reabre esa decision: escribe para el gate lo que ese docblock ya decidio, y el ancla de contenido garantiza que el 480 no pueda moverse sin que alguien lo vea.",
    },
    {
        family: "duration-const",
        file: "src/hooks/useSceneParallax.ts",
        anchors: [{ snippet: "const DEFAULT_IDLE_MS = 2200;", lines: [31] }],
        reason: "DEFAULT_IDLE_MS (2200): umbral de INACTIVIDAD del puntero antes de que la deriva automatica tome el control de la escena, no la duracion de ninguna animacion -- es cuanto tiene que estar quieto el raton. Una escala de duraciones de transicion no describe eso, y el valor esta ademas por encima de su peldano mas largo (spinReduced, 2100 ms).",
    },
    {
        family: "duration-const",
        file: "src/hooks/useThemeScrollReset.ts",
        anchors: [
            {
                snippet: "export const THEME_ANCHOR_SETTLE_MS = 100;",
                lines: [208],
            },
        ],
        reason: "THEME_ANCHOR_SETTLE_MS (100): tope de espera al re-maquetado cuando el doble requestAnimationFrame no llega (pestana oculta, donde no hay frames). Su docblock lo dice literal: 'No es un tiempo de animacion --no hay ninguna que temporizar-- asi que no sale de motion.duration ni del vocabulario'. Coincide con motion.duration.fast por valor, no por fuente; es la misma familia de constante de seguridad que HERO_DECODE_TIMEOUT_MS y FRAGMENT_LANDING_SETTLE_MS.",
    },
    {
        family: "duration-const",
        file: "src/motion/timings.ts",
        anchors: [
            { snippet: "export const HERO_FADE_MS = 420;", lines: [128] },
            { snippet: "export const HERO_STEP_MS = 110;", lines: [131] },
            {
                snippet: "export const HERO_DECODE_TIMEOUT_MS = 600;",
                lines: [139],
            },
            { snippet: "export const HERO_COPY_STEP_MS = 80;", lines: [194] },
        ],
        reason: "Los cuatro tiempos de la coreografia de carga del hero: HERO_FADE_MS (420), HERO_STEP_MS (110), HERO_DECODE_TIMEOUT_MS (600) y HERO_COPY_STEP_MS (80). El docblock de cabecera del fichero dedica una seccion entera -- 'Por que estos numeros NO salen de theme.data.motion.duration' -- a razonar la excepcion, y la critica externa #8 ya cerro aqui un hallazgo DOCUMENTAL sobre el origen del 420 (la afirmacion falsa de que era 2 x base). Ninguno de los cuatro tiene peldano en la escala, y HERO_DECODE_TIMEOUT_MS ni siquiera anima nada: es el tope de img.decode(), otra constante de seguridad.",
    },
    {
        family: "duration-const",
        file: "src/motion/vocabulary.ts",
        anchors: [
            { snippet: "breathMs: 5400,", lines: [613] },
            { snippet: "floatMs: 9000,", lines: [614] },
            { snippet: "orbitMs: 20000,", lines: [615] },
        ],
        reason: "Los tres campos de AMBIENT (breathMs 5400, floatMs 9000, orbitMs 20000): bucles infinitos de escenas decorativas, entre 2,5 y 9,5 veces el peldano mas largo de la escala de interfaz (spinReduced, 2100 ms). Es la UNICA excepcion que queda en este fichero tras la critica externa #14: los seis campos de tiempo de REVEAL/DECK/OVERLAY/PRESS pasaron a leer motion.durationMs.* en esa misma ola, y vocabulary.test.ts canda en POSITIVO las dos mitades -- que esos seis esten dentro de la escala y que los tres de AMBIENT esten fuera. Meter bucles de 5 a 20 segundos en una escala de transiciones la convertiria en un cajon.",
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
        reason: 'Numeracion 01-04 de los cuatro pilares de Story (aprendizaje/creacion/crecimiento/practica), array PILLARS con "number: \\"0N\\"". El nombre corregido en la critica externa #8 (2026-08-17): esta entrada decia "array STORY_STEPS", un identificador que NUNCA ha existido en el repo (verificado con git log -S sobre src/) -- y "steps" contradice ademas la decision de la Task 15, que retiro la etiqueta "Paso"/"Step" porque los cuatro pilares no son una secuencia. Ver el docblock de PILLARS en Story.tsx.',
    },
    /*
     * AQUI VIVIO la sancion [numbering] de src/components/sections/Journey/
     * Journey.tsx ("Ordinal 01..06 de los pasos de Journey, rama clara,
     * stepOrdinal via padStart(2, \"0\")"). RETIRADA el 2026-08-18 (critica
     * externa #11, hallazgo C, decision del dueno): la rama clara ya no pinta
     * ordinal -- `stepOrdinal`/`STEP_ORDINAL_SEPARATOR` se retiraron al
     * unificar el contenido de las dos ramas de Journey, y la posicion pasa a
     * anunciarse con palabras para lector de pantalla en las dos.
     *
     * Se retira la entrada Y NO SOLO EL CODIGO: un ancla sin hallazgo que la
     * cubra no rompe el gate (el motor la reporta como "stale", ver seccion 5),
     * pero deja una excepcion sancionando algo que ya no existe -- deuda
     * silenciosa que la siguiente revision leeria como "aqui hay un ordinal
     * aprobado". La regla `numbering` en si NO se toca: sigue viva y sigue
     * cazando el idioma `String(<expr> + 1).padStart(2, "0")`, ahora sin
     * ningun consumidor sancionado en el repo.
     */
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
    // Familias con alcance de fichero (`appliesTo`): se resuelven UNA vez por
    // fichero, no por linea -- la decision no depende del contenido.
    const families = FAMILIES.filter(
        (f) => !f.appliesTo || f.appliesTo(relFile),
    );
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const family of families) {
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
    "easing-keyword":
        "esta curva se escribe como PALABRA CLAVE nativa (ease, ease-in, ease-in-out o ease-out) en vez de salir de src/theme/tokens/motion.ts (regla 48). La sustituta habitual es motion.easing.standard, la unica de las cinco del sistema que arranca y termina suave -- el rol que ease-in-out ocupa en un vaiven o un latido. Casos aparte: `ease-in` a secas acelera hasta el final y se lee como un frenazo (casi nunca es lo que se queria escribir), y `ease` a secas es el valor por defecto del navegador, es decir, ninguna decision. Si la curva es un valor VERBATIM de un mockup o arte de marca con constantes propias, deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST.",
    "repeating-gradient":
        "un patron decorativo repetitivo (repeating-*-gradient) es la clase de detalle que esta familia vigila -- si es intencional, documentalo en el propio codigo y anade la excepcion a ALLOWLIST.",
    "important":
        "un !important nuevo casi siempre es sintoma de una guerra de especificidad; si de verdad hace falta ganarle a un reset global bajo el mismo media query (como el reset de prefers-reduced-motion), documentalo igual que las excepciones ya sancionadas.",
    "gradient-text":
        "un texto con degradado recortado nuevo (background-clip: text) fuera del wordmark de marca ya sancionado necesita su propia justificacion documentada.",
    "side-stripe":
        "una franja lateral decorativa nueva (border-left/right >=2px solid) fuera del callout legal ya sancionado necesita su propia justificacion documentada.",
    "overshoot":
        "esta curva REBOTA: sobrepasa su valor final antes de asentar (algun punto de control con y fuera de [-0.1, 1.1]). motion.easing.overshoot es la unica curva de rebote sancionada del repo, reservada al despegue del navbar (DESIGN.md 5.1); un rebote nuevo necesita su propia justificacion documentada. Esta familia NO comprueba de donde sale la curva -- de eso se ocupa easing-literal.",
    "easing-literal":
        "esta curva se escribe como literal fuera de src/theme/tokens/motion.ts, el unico sitio donde una curva nace en este repo (regla 48). Si duplica semanticamente una de las cinco de motion.easing, migra el consumidor al token; si es una curva propia justificada (arte de marca, valor verbatim de un mockup, vocabulario de movimiento con su porque documentado), deja el docblock que lo explica JUNTO a la constante y anade la excepcion a ALLOWLIST. Vale tanto para curvas monotonas como para las de rebote -- la familia overshoot solo ve estas ultimas.",
    "duration-literal":
        "esta duracion (o retardo) se escribe como literal de tiempo fuera de src/theme/tokens/motion.ts, el unico sitio donde una duracion nace en este repo (regla 48). Si el valor coincide con un paso de la escala (0, 100, 200, 320, 480, 700, 2100 ms), lee el token -- un literal que hoy vale lo mismo deja de valerlo el dia que el token se retoque, y el CSS renderizado no distingue los dos casos. Si es un tiempo PROPIO justificado (arte de marca con constantes en su *.layers.ts, valor verbatim de un mockup o de un port, ambiente en bucle de varios segundos), declaralo como constante con nombre, deja el porque JUNTO a ella y anade la excepcion a ALLOWLIST. El cero (0ms/0s) no dispara esta familia: es la ausencia de duracion, no una duracion elegida.",
    "duration-const":
        "esta duracion (o retardo) se declara como constante numerica con nombre -- `durationMs: 480`, `const HERO_FADE_MS = 420` -- sin derivar de motion.durationMs, la misma escala de siete pasos que motion.duration, en numeros. Es el camino por el que una duracion llega al CSS sin pasar por el sistema: el literal de tiempo no aparece hasta que alguien lo interpola (`${X.durationMs}ms`), donde la familia duration-literal ya no puede verlo. Si el valor coincide con un peldano (0, 100, 200, 320, 480, 700, 2100 ms), lee motion.durationMs.<paso> -- un numero que hoy vale lo mismo deja de valerlo el dia que el token se retoque. Si es un tiempo PROPIO justificado (arte de marca o de escena, coreografia con su porque escrito, reloj o tope de JS que no anima nada), deja ese porque JUNTO a la constante y anade la excepcion a ALLOWLIST. El cero no dispara: es la ausencia de retardo, no un tiempo elegido.",
    "radius-literal":
        "un border-radius literal nuevo usa un token de src/theme/tokens/radius.ts en vez de un numero escrito a mano.",
    "font-size-literal":
        "este tamano de fuente se escribe como literal (rem/px/em) fuera de src/theme/tokens/, el unico sitio donde un tamano nace en este repo (regla 48). Si coincide con un peldano de type.scale (deckClosing, display, h1, h2, h3, wordmark, h5, deckBody, body, bodySm, caption, overline), lee `theme.data.type.scale.<peldano>.size` -- un literal que hoy vale lo mismo deja de valerlo el dia que el token se retoque, y el CSS renderizado no distingue los dos casos (task/lessons.md, 2026-08-12). Si NO coincide con ninguno, la pregunta es de diseno antes que de codigo: o la pieza baja al peldano vecino, o el tamano merece un peldano propio con su nombre semantico y su docblock (precedente: `wordmark`, el rotulo de marca, critica #15). Un tramo fluido va en `clamp()`, que esta familia exime; `1em` tambien, porque es heredar, no elegir.",
    "z-index-literal":
        "esta capa se escribe como entero literal fuera de src/theme/tokens/zIndex.ts, donde viven los siete roles del sistema (base 0, raised 10, stickyNav 100, dropdown 200, overlay 900, modal 1000, toast 1100). Si la pieza compite con una capa FLOTANTE del documento -- por encima del navbar, de un desplegable, de un modal -- lee el peldano que nombra ese rol: escribir un numero al lado de esa escala es apostar a ciegas contra ella. Si es solo el orden de dos o tres hermanos DENTRO de una misma pila (contenido por delante de su fondo decorativo, valores 1-3), es el patron ya sancionado 16 veces en el repo: deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST -- pero comprueba antes que el ancestro tenga su propio contexto de apilamiento, porque si no, ese 1 local compite de verdad con toda la pagina. El cero NO se exime aqui, al reves que en radius/duration: `z-index: 0` es zIndex.base, un peldano real.",
    "kicker":
        "un <*Kicker*> nuevo fuera de Story.tsx/Features.tsx (las dos ramas ya sancionadas, decision D-E del dueno) necesita decidirse con el dueno del producto, igual que el resto de kickers del sitio.",
    "numbering":
        'una numeracion decorativa de seccion nueva (number: "0N", o el ordinal String(idx + 1).padStart(2, "0")) fuera de Story.tsx (el UNICO generador sancionado que queda: Journey.tsx retiro el suyo el 2026-08-18, critica externa #11) necesita decidirse igual que el resto -- en Journey fue una decision del dueno, no una limpieza de estilo.',
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
