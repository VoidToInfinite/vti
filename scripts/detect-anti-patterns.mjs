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
 * = 420`) que no derive de `motion.durationMs`, `border-radius` literal en
 * `px`/`rem`/`em`/`%` fuera de token (excluyendo `0`, que nunca es deriva de
 * escala), CUALQUIER espaciado literal `rem`/`px`/`em` -- `padding`, `margin`
 * o `gap` con todas sus variantes, cero excluido -- fuera de
 * `src/theme/tokens/`, CUALQUIER `font-size` escrito como literal
 * `rem`/`px`/`em` fuera de
 * `src/theme/tokens/` (con `clamp()`, `var()`, `calc()`, `inherit` y `1em`
 * exentos), CUALQUIER `z-index` entero -- incluidos el cero y los negativos --
 * fuera de `src/theme/tokens/zIndex.ts`, CUALQUIER RETARDO declarado fuera
 * del token -- una tabla multilinea de tiempos con los numeros sueltos en
 * sus renglones, o un campo/constante llamado `delay` con valor numerico --,
 * CUALQUIER color escrito como literal (`oklch`/`oklab`/`lch`/`lab`/`rgb`/
 * `hsl` con primer argumento numerico, o hexadecimal de 3/4/6/8 digitos)
 * fuera de `src/theme/tokens/`, kickers repetidos (componentes `*Kicker*` en
 * JSX) y numeracion decorativa de seccion (`number: "0N"`, o el ordinal
 * 1-based `String(<expr> + 1).padStart(2, "0")`).
 *
 * Octavo punto ciego cerrado (critica externa #18, 2026-09-04), y el unico
 * de la serie que no era un hueco de cobertura sino una PROMESA INCUMPLIDA
 * de este mismo docblock. La cabecera decia hacer cumplir la regla 17 de
 * RULES.md -- "Cero colores, espaciados o radios literales fuera de
 * `src/theme/tokens/`" -- con DOS de las tres magnitudes implementadas
 * (`color-literal` desde la #17, `radius-literal` desde la Task 24) y la del
 * medio a cero: `grep -c "spacing-literal"` sobre este fichero devolvia 0.
 * Dos evaluadores independientes llegaron al mismo hueco por caminos
 * distintos. Ejemplo vivo, fuera de allowlist e invisible para siempre:
 * `--nav-gap: 0.5rem` en `src/theme/GlobalStyles.tsx`, que es `space[2]`
 * byte a byte. La familia `spacing-literal` lo cierra; ver su comentario en
 * FAMILIES para el censo (diez lineas, cinco de ellas suelos de `clamp()`
 * que igualan un peldano vivo, dos escritas byte a byte en dos ficheros que
 * no se conocen), para por que `clamp()` NO se exime aqui aunque
 * `font-size-literal` si lo exima, y para sus tres limites declarados.
 *
 * En la misma revision se cerro el punto ciego de los PORCENTAJES de
 * `radius-literal`: su alternacion de unidades era `px|rem|em`, asi que un
 * `border-radius: 50%` era invisible, y ese limite -- al reves que los de
 * otras cuatro familias -- no estaba declarado en ninguna parte. Siete
 * declaraciones del repo pasaban el gate en verde por construccion. Ver el
 * comentario de la familia para la medicion, para por que el `%` no lleva
 * `\b` detras y para los dos limites que esa familia SIGUE teniendo, ahora
 * escritos.
 *
 * Sexto punto ciego cerrado (critica externa #16, 2026-09-03): el detector
 * vigilaba las dos magnitudes que el token sabia nombrar -- duracion y
 * curva -- y NINGUNA familia miraba la tercera que gobierna cualquier
 * coreografia, el RETARDO. No era un olvido del detector: hasta esa revision
 * el token TAMPOCO tenia escala de retardos, asi que no habia nada a lo que
 * mandar migrar. Medicion del evaluador de Craft: 22 de 26 retardos del repo
 * eran valores sueltos entre 80 y 1800 ms, sin escala comun, mientras las
 * duraciones si la tenian. La escala nueva es `motion.staggerMs` (tight 60,
 * base 80, loose 110, derivados del censo de lo que el repo ya escribia por
 * su cuenta en cuatro secciones distintas) y la familia `delay-const` es su
 * candado -- ver su comentario en FAMILIES para las dos formas que cubre,
 * para por que es una familia APARTE en vez de un ensanchamiento de
 * `duration-const`, y para lo que NO repite (los literales
 * `transition-delay: 850ms` ya los caza `duration-literal`, verificado sobre
 * el corpus: cero se le escapan).
 *
 * Esa familia es ademas la unica que necesita mirar mas alla de su propia
 * linea, y por eso `family.test` recibe un segundo argumento opcional con la
 * ventana de lineas del fichero (ver `scanFile`). El motor sigue siendo
 * linea a linea -- el hallazgo se reporta SIEMPRE sobre la linea que se esta
 * evaluando, y las otras trece familias ignoran ese argumento -- pero una
 * tabla multilinea se declara en un renglon y se llena en los siguientes,
 * asi que sin ventana la familia se quedaria exactamente igual de ciega que
 * `duration-const`, que es el hueco que viene a cerrar.
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
        // LIMITE DECLARADO, YA CUBIERTO POR OTRA FAMILIA (critica externa
        // #16, 2026-09-03): la tabla de retardos MULTILINEA (`export const
        // FEATURES_LIGHT_REVEAL_DELAYS_MS = [` con los numeros en los
        // renglones siguientes) NO dispara AQUI -- el motor es linea a linea
        // y en esas lineas no hay nombre al que atribuir el numero -- pero
        // desde esa revision la familia `delay-const` la ve, mirando hacia
        // adelante desde el renglon de la declaracion hasta el `]`. Este
        // parrafo se conserva, en vez de borrarse, porque el limite de ESTA
        // familia sigue siendo real: quien anada aqui una forma nueva tiene
        // que saber que el hueco existe y quien lo cubre.
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
        id: "delay-const",
        label: "retardo declarado fuera de src/theme/tokens/motion.ts (tabla multilinea de tiempos, o campo/constante `delay` con valor numerico)",
        // SEXTO PUNTO CIEGO CERRADO (critica externa #16, 2026-09-03). El
        // token tenia escala para las DURACIONES y para las CURVAS, y el
        // detector cuatro familias vigilando esas dos cosas -- pero NINGUNA
        // escala y NINGUNA familia para el tercer numero de cualquier
        // coreografia: el RETARDO. Medicion del evaluador de Craft: 22 de 26
        // retardos eran valores sueltos entre 80 y 1800 ms sin escala comun.
        // `motion.staggerMs` (tres peldanos: tight 60, base 80, loose 110) es
        // la escala; esta familia es su candado.
        //
        // POR QUE UNA FAMILIA APARTE Y NO ENSANCHAR `duration-const`, que es
        // lo que el precedente de `easing-keyword` (sustituyo a
        // `ease-in-bare` en vez de anadirse al lado) haria pensar: porque las
        // dos NO piden lo mismo al que las lee. La guia de `duration-const`
        // manda a `motion.durationMs`; la de esta, a `motion.staggerMs`. Un
        // retardo migrado a la escala de duraciones seguiria estando fuera
        // del sistema, asi que un solo mensaje para las dos seria un mensaje
        // equivocado la mitad de las veces. Los dos criterios de nombre son
        // MUTUAMENTE EXCLUYENTES por construccion (ver forma B), asi que
        // ninguna linea dispara las dos familias por el mismo motivo.
        //
        // LO QUE ESTA FAMILIA NO REPITE, dicho aqui porque su nombre podria
        // prometerlo: un `transition-delay: 850ms` / `animation-delay: 0.3s`
        // escrito como literal de tiempo YA lo caza `duration-literal` (su
        // regex no exige que la propiedad sea `transition-duration`: ve
        // cualquier `Nms`/`Ns` de la linea, retardos incluidos). Verificado
        // sobre el corpus real con el mismo motor: CERO
        // `transition-delay`/`animation-delay` con literal no nulo escapan
        // hoy a esa familia. Anadir aqui esa forma solo produciria dos
        // hallazgos por el mismo motivo sobre la misma linea.
        //
        // FORMA A -- la tabla multilinea, el hueco que `duration-const`
        // DECLARA en su propio comentario y no cubre: `export const
        // FEATURES_LIGHT_REVEAL_DELAYS_MS = [` con los numeros en los
        // renglones siguientes. `duration-const` exige el digito en la MISMA
        // linea que el nombre, asi que ahi se queda ciega. Se cierra dandole
        // a esta familia la unica capacidad que le falta al motor: MIRAR
        // HACIA ADELANTE desde el renglon de la declaracion hasta el `]`, y
        // disparar solo si alguno de esos renglones es un numero SUELTO (la
        // linea entera es un literal, con coma opcional). Esa precision es lo
        // que separa una tabla de literales de una tabla que ya lee el token:
        // `PASO.base + 2 * PASO.tight,` lleva digitos, pero no es un numero
        // suelto, y no dispara. Se reporta sobre la linea de la DECLARACION,
        // que es donde vive el nombre y donde un ancla del allowlist tiene
        // sentido.
        //
        // FORMA B -- el retardo que llega al CSS por un campo llamado
        // `delay`: `Sol.constants.ts` declara `{ top: 72, left: 10, delay:
        // -1.1 }` y lo interpola despues como `${s.delay}s`. Ninguna de las
        // catorce familias anteriores podia verlo: `duration-literal` no,
        // porque el caracter antes de `s` es `}`; `duration-const` tampoco,
        // porque el nombre no termina en `Ms`/`_MS`. El criterio de nombre es
        // "el identificador contiene delay" (sin distinguir mayusculas, para
        // cubrir `delay`, `starDelay` y `_DELAY`) MENOS los que ya cumplen el
        // criterio de `duration-const` -- por eso `delayMs: 1200`
        // (footer.layers.ts) sigue siendo suyo y no dispara aqui.
        //
        // EL CERO SE EXIME en las dos formas, con el mismo criterio y el
        // mismo precedente que `duration-literal`/`duration-const`/
        // `radius-literal`: la ausencia de retardo no es un retardo elegido.
        //
        // Alcance por fichero: mismo `appliesTo` que las cuatro familias de
        // movimiento -- en tokens/motion.ts los peldanos SON la definicion de
        // la escala, no una copia suelta.
        appliesTo: (file) => file !== MOTION_TOKENS_FILE,
        test(line, ctx) {
            // -- Forma A: apertura de tabla multilinea de tiempos.
            const tabla =
                /\b([A-Za-z_$][\w$]*(?:[a-z]Ms|_MS))\s*=\s*\[\s*$/.exec(line);
            if (tabla && ctx) {
                const SUELTO = /^\s*(-?\d[\d_]*(?:\.\d+)?)\s*,?\s*$/;
                for (let j = ctx.index + 1; j < ctx.lines.length; j += 1) {
                    const siguiente = ctx.lines[j];
                    const m = SUELTO.exec(siguiente);
                    if (m && parseFloat(m[1].replace(/_/g, "")) !== 0) {
                        return `${tabla[1]} = [ ... ${m[1]} ... ]`;
                    }
                    if (/\]/.test(siguiente)) break;
                }
            }

            // -- Forma B: campo/constante `delay` con valor numerico.
            const re =
                /\b([A-Za-z_$][\w$]*)\s*[:=]\s*\[?\s*(-?\d[\d_]*(?:\.\d+)?)(?![\w.])/g;
            let m;
            while ((m = re.exec(line)) !== null) {
                const nombre = m[1];
                if (!/delay/i.test(nombre)) continue;
                // Ya es de `duration-const`: una familia, un hallazgo.
                if (/(?:[a-z]Ms|_MS)$/.test(nombre)) continue;
                if (parseFloat(m[2].replace(/_/g, "")) !== 0)
                    return `${nombre} = ${m[2]}`;
            }
            return null;
        },
    },
    {
        id: "radius-literal",
        label: "border-radius literal (px/rem/em/%) fuera de src/theme/tokens/radius.ts",
        // PUNTO CIEGO DE LOS PORCENTAJES, CERRADO (critica externa #18,
        // 2026-09-04). Esta familia nacio con la Task 24 y era la unica del
        // fichero SIN un solo comentario que dijera que no ve -- las otras
        // cuatro con limite conocido (`repeating-gradient`, `duration-const`,
        // `font-size-literal`, `z-index-literal`) lo llevan escrito, y por eso
        // se leian como limites y no como cobertura. El de esta no estaba
        // declarado en ninguna parte: la alternacion de unidades era
        // `px|rem|em`, asi que un `border-radius: 50%` era invisible PARA
        // SIEMPRE y nadie podia saberlo sin leer la regex.
        //
        // Medicion propia antes de tocar nada (mismo motor: strip de
        // comentarios + linea a linea sobre `src/` y `app/`, tests excluidos):
        // 68 declaraciones de `border-radius` en el repo, de las que SIETE
        // llevan porcentaje y ninguna disparaba -- `Footer.tsx` (ScStar, el
        // circulo de una estrella decorativa) y las seis formas organicas de
        // ocho valores del morfeo de la corona de `Sol.tsx`. Las siete pasaban
        // el gate en verde por construccion mientras el resto del repo
        // resolvia sus circulos con `radius.full`.
        //
        // El `%` va en su propia rama de la alternacion y NO lleva `\b`
        // detras, y no es cosmetico: `%` no es caracter de palabra, asi que
        // `%\b` exigiria una letra o digito justo despues y no casaria ni con
        // `50%;` ni con `46% 54%` -- el candado de frontera que las otras tres
        // unidades SI necesitan (para que `100px` no llegue nunca a probar
        // `rem`) aqui lo daria por bueno todo menos el caso real.
        //
        // EL CERO SE SIGUE EXIMIENDO, en las cuatro unidades y por el mismo
        // motivo de siempre: `border-radius: 0` es la ausencia de radio, no un
        // radio elegido, y no puede desincronizarse de ningun peldano. Es el
        // precedente que despues citaron `duration-literal`, `duration-const`
        // y `delay-const`.
        //
        // LO QUE ESTA FAMILIA SIGUE SIN VER, declarado ahora en vez de dejar
        // que el silencio lo tape:
        //  - La forma camelCase de un objeto de estilo JS (`borderRadius:
        //    "8px"`, `app/opengraph-image.tsx`): la regex pide el nombre CSS
        //    con guion. Hoy hay exactamente una en el repo, y ademas es de las
        //    que pueden desincronizarse en silencio (8px es `radius.md` byte a
        //    byte). Se deja anotado y no sancionado: cerrarlo pide tocar un
        //    fichero de otro dominio.
        //  - El `calc()` MULTILINEA (`Features.tsx`, ScCardSurface): abre en
        //    un renglon y reparte sus operandos en los siguientes, sin
        //    `border-radius` en la linea del literal. Mismo limite de motor
        //    que ya llevan escrito los `clamp()` multilinea de
        //    `font-size-literal`.
        //  - `inherit` no dispara (no lleva unidad): heredar no es elegir,
        //    mismo criterio que el `1em` de `font-size-literal`.
        test(line) {
            const m =
                /border-radius\s*:\s*(\d+(?:\.\d+)?)(?:(?:px|rem|em)\b|%)/i.exec(
                    line,
                );
            if (!m) return null;
            return parseFloat(m[1]) === 0 ? null : m[0];
        },
    },
    {
        id: "spacing-literal",
        label: "espaciado literal (padding/margin/gap en px/rem/em) fuera de src/theme/tokens/",
        // OCTAVO PUNTO CIEGO CERRADO (critica externa #18, 2026-09-04), y el
        // unico que no era un hueco de cobertura sino una PROMESA INCUMPLIDA:
        // la cabecera de este fichero decia hacer cumplir la regla 17 de
        // RULES.md -- "Cero colores, espaciados o radios literales fuera de
        // `src/theme/tokens/`" -- con dos de las tres magnitudes implementadas
        // (`color-literal` desde la #17, `radius-literal` desde la Task 24) y
        // la del medio a cero. Comprobado por dos evaluadores independientes
        // por caminos distintos, y reproducible en una linea:
        // `grep -c "spacing-literal"` sobre este fichero devolvia 0.
        //
        // CENSO PROPIO antes de escribir una sola entrada del allowlist (mismo
        // motor que este fichero: strip de comentarios + linea a linea sobre
        // `src/` y `app/`, tests excluidos): DIEZ lineas con un literal no
        // nulo de espaciado. Cuatro sin `clamp()` -- el `--nav-gap: 0.5rem` de
        // `GlobalStyles.tsx` que el evaluador nombro (es `space[2]` exacto),
        // el `padding: 0 0.25em` del callout legal, el `margin: -1px` de
        // `VisuallyHidden` y el `padding: "80px"` del lienzo Open Graph -- y
        // SEIS con `clamp()`, cinco de ellas con el suelo igual a un peldano
        // vivo de la escala (`1rem` = space[4], `0.75rem` = space[3], `0.5rem`
        // = space[2]) y dos de esas cinco escritas BYTE A BYTE en dos ficheros
        // que no se conocen (`Contact.tsx` y `Features.tsx`, la misma
        // `padding-block: clamp(1rem, 3.5dvh, ...space[8])`). El corpus
        // completo esta abajo, entrada por entrada.
        //
        // POR QUE `clamp()` NO SE EXIME AQUI, al reves que en
        // `font-size-literal`: alli el argumento es que un tramo FLUIDO de
        // tipografia no es un peldano de la escala -- el tamano cambia con el
        // viewport y ningun paso de `type.scale` lo describe. Un espaciado en
        // `clamp()` es otra cosa: sus DOS extremos son medidas fijas, y en
        // este repo el tope ya se escribe con el token
        // (`...theme.data.space[8]`) mientras el suelo se escribia a mano.
        // Eximir `clamp()` habria dejado fuera del gate exactamente el caso
        // que el evaluador midio, y ademas el mas facil de desincronizar: un
        // suelo que HOY vale `space[3]` deja de valerlo el dia que alguien
        // retoque la escala, y el CSS renderizado no distingue los dos casos
        // (`task/lessons.md`, 2026-08-12). Verificado sobre el corpus: no
        // caza ni un `clamp()` cuyos dos extremos ya salgan del token.
        //
        // POR PROCEDENCIA, NO POR VALOR, igual que sus cinco familias
        // hermanas. No se comprueba si el literal coincide con un peldano
        // (aunque el censo diga que cinco de los diez coinciden): lo que
        // sanciona es que el numero no nazca de `tokens/space.ts`.
        //
        // QUE PROPIEDADES CUENTAN, y por que estas tres y no mas: `padding`,
        // `margin` y `gap` con TODAS sus variantes de guion
        // (`padding-block`, `margin-inline-start`, `row-gap`, `column-gap`,
        // `scroll-padding`...) mas la forma camelCase de un objeto de estilo
        // JS (`marginRight`), que existe en un solo fichero del repo
        // (`app/opengraph-image.tsx`) y habria quedado fuera por accidente.
        // Son las tres propiedades que consumen la escala `space` -- censo del
        // docblock de `space[10]`, tercera revision: los once peldanos se leen
        // desde `gap`, `padding` y `margin` y de ningun otro sitio.
        //
        // LO QUE ESTA FAMILIA NO VE, declarado en vez de dejar que su nombre
        // lo tape:
        //  - Las medidas de LAYOUT que no son espaciado: `width`, `height`,
        //    `top`/`left`/`inset`, `min-height`. Un `--nav-height: 3.5rem`
        //    (`GlobalStyles.tsx`, la linea de al lado del hallazgo que motivo
        //    esta familia) NO dispara, y es deliberado: la escala `space`
        //    gobierna huecos entre cosas, no el tamano de las cosas.
        //  - Los PORCENTAJES y las unidades de viewport (`padding: 0 5%`,
        //    `gap: 2vw`): un porcentaje de espaciado se mide contra el ancho
        //    del contenedor, no contra la escala, asi que no hay peldano al
        //    que migrarlo. Es la decision CONTRARIA a la que toma
        //    `radius-literal` justo arriba con el `%`, y por eso se escribe:
        //    alli el porcentaje es una forma alternativa de decir "circulo",
        //    aqui es una magnitud de otra naturaleza.
        //  - La escala reescrita en otra unidad (`padding: 16px` donde
        //    `space[4]` es `1rem`): la familia SI la caza, pero no dira que
        //    equivale a un peldano -- eso lo mide la guia, no el motor.
        appliesTo: (file) => !file.startsWith(TOKENS_DIR),
        test(line) {
            if (!/\b(?:padding|margin|gap)(?:[A-Z][A-Za-z]*)?\b/.test(line))
                return null;
            const re = /(\d+(?:\.\d+)?)(rem|px|em)\b/gi;
            let m;
            // Se recorren TODAS las coincidencias, como en `duration-literal`
            // y por el mismo motivo: una shorthand que empieza por el cero
            // eximido (`padding: 0 0.25em`) escondería el literal real que
            // viene detras si se devolviera en el primer match.
            while ((m = re.exec(line)) !== null) {
                if (parseFloat(m[1]) !== 0) return m[0];
            }
            return null;
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
        id: "color-literal",
        label: "color escrito como literal (oklch/oklab/lch/lab/rgb/hsl/hexadecimal) fuera de src/theme/tokens/",
        // SEPTIMO PUNTO CIEGO CERRADO (critica externa #17, 2026-09-03). El
        // detector vigilaba movimiento (cinco familias), tipografia, capa,
        // radios, franjas, degradados de texto y dos patrones de composicion
        // -- y NI UNA sola propiedad de COLOR, que es el sistema de tokens
        // MAS GRANDE del repo: cinco rampas de doce peldanos
        // (`tokens/color.ts`) mas la capa semantica que las nombra por rol
        // (`tokens/semantic.ts`). La regla que lo pide no es la 48 sino la 17
        // de RULES.md ("Cero colores, espaciados o radios literales fuera de
        // src/theme/tokens/. Excepcion unica y documentada: arte de marca con
        // constantes con nombre en su propio modulo *.layers.ts, que se
        // importan tal cual y nunca se reescriben con un valor suelto"), y
        // hasta esta revision esa regla no tenia candado: se cumplia de
        // memoria.
        //
        // CENSO PROPIO antes de escribir una sola entrada del allowlist
        // (mismo motor que este fichero: strip de comentarios + linea a linea
        // sobre `src/` y `app/`, tests excluidos): 94 literales `oklch()` en
        // total, 79 fuera de `tokens/`, de los que 24 no son colores sino
        // llamadas al ayudante JS homonimo de `Wormhole.tsx` (`function
        // oklch(triplet, alpha)`) -- quedan 55 literales numericos reales.
        // Mas 24 hexadecimales y un `rgba()`. El censo del evaluador conto
        // 63 (58 distintos): la diferencia son esas llamadas del ayudante y
        // las formas que su recuento no separaba; el HALLAZGO -- que ninguna
        // familia miraba el color -- se reproduce entero.
        //
        // ARTE FRENTE A TOKEN REESCRITO A MANO, la distincion que esta
        // familia tiene que sostener, y que el censo propio deja medida: se
        // compararon los 55 literales numericos contra las 60 combinaciones
        // hue/paso que generan las cinco rampas de `tokens/color.ts`
        // (reproduciendo `ramp()`/`neutral()` con sus tablas `L`/`CMUL`),
        // ignorando la alfa. COINCIDENCIAS EXACTAS: CERO. Hoy no hay ni un
        // solo peldano de rampa reescrito como literal `oklch()`; lo que hay
        // es arte, casi siempre verbatim de un mockup, y de ahi que todo lo
        // sancionado abajo lo este como composicion propia y no como olvido
        // de migrar. La UNICA excepcion a esa lectura son los siete
        // hexadecimales de `resolveTheme.ts` y `app/opengraph-image.tsx`, que
        // SI son conversiones fijadas de tokens concretos: van sancionados
        // aparte y con su riesgo escrito, porque son los que pueden
        // desincronizarse en silencio.
        //
        // POR PROCEDENCIA, NO POR VALOR, igual que sus familias hermanas
        // (`easing-literal`, `duration-literal`, `font-size-literal`) y por
        // el mismo argumento: un `oklch(0.66 0.142 235.851)` escrito a mano
        // que HOY coincidiera con `palette.primary[600]` dejaria de coincidir
        // el dia que alguien retoque la escalera `L`/`CMUL`, y el CSS
        // renderizado no distingue los dos casos -- solo la fuente los separa
        // (`task/lessons.md`, 2026-08-12). La familia que mediria VALOR
        // ("este literal ES un peldano") no se escribe hoy porque el censo
        // dice que su conjunto esta vacio; si algun dia deja de estarlo, el
        // sitio donde vive es la guia de esta familia, que ya manda
        // comprobarlo.
        //
        // QUE CUENTA COMO LITERAL DE COLOR, y por que cada forma:
        //  - Una FUNCION de color CSS (`oklch`, `oklab`, `lch`, `lab`, `rgb`,
        //    `rgba`, `hsl`, `hsla`) cuyo primer argumento empieza por DIGITO,
        //    con una comilla opcional en medio para cazar la forma
        //    `oklch("0.985 0 0", 1)` de `Wormhole.tsx`. Ese digito es el
        //    candado contra el unico falso positivo real del corpus: las 24
        //    llamadas `oklch(RING_1, 0.4)` de ese mismo fichero empiezan por
        //    IDENTIFICADOR y no coinciden -- ahi el color no esta en la
        //    linea, esta en la constante que se le pasa.
        //  - Un HEXADECIMAL de 3, 4, 6 u 8 digitos. Se acepta por el mismo
        //    argumento con el que `duration-literal` acepta `ms` y `s`: un
        //    color no deja de estar fuera del sistema por escribirse en otra
        //    notacion. Verificado sobre el corpus que no caza ningun ancla de
        //    fragmento (`#contacto`, `#journey`, `#story`: ninguna tiene tres
        //    digitos hexadecimales seguidos hasta su frontera de palabra).
        //
        // LO QUE ESTA FAMILIA NO VE, declarado en vez de dejar que el nombre
        // lo tape:
        //  - Un color separado de su funcion: `const RING_1 = "0.66 0.142
        //    235.851"` (Wormhole.tsx) es un triplete suelto que solo se
        //    convierte en color al pasar por el ayudante. Cazar tripletes
        //    exigiria decidir que `0.66 0.142 235.851` es un color y
        //    `0 8px 20px` no, sin ninguna palabra en la linea que lo diga --
        //    precision sobre cobertura, el mismo criterio con el que este
        //    fichero descarto "ghost-card en reposo". Los cuatro colores de
        //    `journey.layers.ts` se escribieron con su `oklch(...)` completo
        //    en esta misma ola precisamente para no caer en este hueco.
        //  - Las PALABRAS CLAVE de color (`white`, `black`, `transparent`,
        //    `currentColor`): las dos ultimas son ausencia de color o
        //    herencia, no una eleccion -- mismo criterio que el `1em` de
        //    `font-size-literal` --, y las nombradas de verdad no existen hoy
        //    en el corpus. Anadirlas cazaria antes las que no importan.
        //  - La duplicacion CRUZADA entre ficheros (el mismo color escrito en
        //    dos modulos que no se conocen): el motor es linea a linea por
        //    diseno declarado en la cabecera, el mismo limite que ya lleva
        //    escrito `repeating-gradient`. Lo que si queda anotado es la
        //    duplicacion DENTRO de un fichero: dos lineas identicas comparten
        //    ancla y su `count` las cuenta.
        //
        // Alcance por fichero: la carpeta `src/theme/tokens/` entera, igual
        // que `font-size-literal` y por el mismo motivo -- ahi el literal ES
        // la definicion del sistema (`ramp()` genera las 60 cadenas
        // `oklch(...)`; `glass.ts` declara sus dos superficies), no una copia
        // suelta.
        appliesTo: (file) => !file.startsWith(TOKENS_DIR),
        test(line) {
            const fn =
                /\b(?:oklch|oklab|lch|lab|rgba?|hsla?)\(\s*["']?\s*[\d.][^)]*\)/i.exec(
                    line,
                );
            if (fn) return fn[0];
            const hex =
                /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/.exec(
                    line,
                );
            return hex ? hex[0] : null;
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
        reason: "STEP_STAGGER_MS (90): paso del reveal escalonado de la rama clara de Journey, valor de la spec ('~90ms por paso', seccion 7.2). El vocabulario de movimiento LLEGO a tener un campo para esto -- REVEAL.stepMs, 60 -- y se retiro en la fix wave B (2026-08-12) precisamente porque 90 no es 60: el docblock de REVEAL en vocabulary.ts deja escrito que este valor es distinto, para un proposito distinto, y que no habia ningun consumidor real al que migrarlo. Desde la critica externa #16 (2026-09-03) SI hay escala de retardos -- motion.staggerMs -- y este 90 sigue sin tener peldano a proposito: cae entre base (80) y loose (110), y la propia spec que lo fija lo escribe como '~90ms por paso', un valor aproximado. Migrarlo a cualquiera de los dos CAMBIA el valor renderizado, asi que no es un refactor de procedencia como los del hero: es una decision, y se deja escrita en vez de tomarse desde una ola que no era dueña de este fichero.",
    },
    {
        family: "duration-const",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
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
        reason: "Las tres duraciones del statement de Story, VERBATIM del mockup (L127-131) y documentadas una a una en el propio fichero: el docblock de STORY_STATEMENT_REVEAL_MS explica por que 900 no tiene casilla en la escala, y los dos retardos (220 y 440) no caen en ningun peldano de motion.staggerMs -- no son un escalonado de entrada entre hermanos, son las dos esperas de una cita que se revela en tres tiempos. La SANCION PROVISIONAL que esta entrada llevaba desde la critica externa #16 (2026-09-03) ya se cerro: la cascada de la rejilla (STORY_REVEAL_DELAY_TITLE_MS, STORY_REVEAL_DELAY_BODY_MS y STORY_CARD_REVEAL_DELAYS_MS) se migro en la integracion de la ola L a motion.staggerMs con cero cambio de valor renderizado (medido en navegador: 200/260/320/380 ms antes y despues), igual que ya habia hecho su gemela de Features (FEATURES_LIGHT_REVEAL_DELAYS_MS, features.layers.ts), y la familia deja de verla.",
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
            {
                snippet: "export const HERO_DECODE_TIMEOUT_MS = 600;",
                lines: [139],
            },
        ],
        reason: "DOS tiempos de la coreografia de carga del hero, no los cuatro que sancionaba esta entrada hasta la critica externa #16 (2026-09-03): HERO_FADE_MS (420) y HERO_DECODE_TIMEOUT_MS (600). Los otros dos eran los PASOS del escalonado -- HERO_STEP_MS (110) y HERO_COPY_STEP_MS (80) -- y desde esa revision derivan de motion.staggerMs.loose/.base con cero cambio de valor, asi que la familia deja de verlos: es exactamente lo que la familia existe para provocar, el mismo desenlace que tuvo STORY_SCRUB_MS en la ola J. Los dos que quedan siguen fuera del sistema con motivo: el docblock de cabecera del fichero dedica una seccion entera a razonarlo, y la critica externa #8 ya cerro aqui un hallazgo DOCUMENTAL sobre el origen del 420 (la afirmacion falsa de que era 2 x base). Ninguno de los dos tiene peldano en la escala, y HERO_DECODE_TIMEOUT_MS ni siquiera anima nada: es el tope de img.decode(), una constante de seguridad.",
    },
    {
        family: "duration-const",
        file: "src/motion/vocabulary.ts",
        anchors: [
            { snippet: "breathMs: 5400,", lines: [613] },
            { snippet: "glowMs: 7000,", lines: [668] },
            { snippet: "floatMs: 9000,", lines: [669] },
            { snippet: "orbitMs: 20000,", lines: [670] },
        ],
        reason: 'Los CUATRO campos de AMBIENT (breathMs 5400, glowMs 7000, floatMs 9000, orbitMs 20000): bucles infinitos de escenas decorativas, entre 2,5 y 9,5 veces el peldano mas largo de la escala de interfaz (spinReduced, 2100 ms). Es la UNICA excepcion que queda en este fichero tras la critica externa #14: los seis campos de tiempo de REVEAL/DECK/OVERLAY/PRESS pasaron a leer motion.durationMs.* en esa misma ola, y vocabulary.test.ts canda en POSITIVO las dos mitades -- que esos seis esten dentro de la escala y que los de AMBIENT esten fuera. Meter bucles de 5 a 20 segundos en una escala de transiciones la convertiria en un cajon. EL CUARTO CAMPO, glowMs, lo anade la critica externa #18 (2026-09-04) y ES EL MOTIVO DE QUE DOS ENTRADAS DESAPAREZCAN DE ESTE ALLOWLIST: el `"7s"`/`"9s"` de eye.parts.tsx (duration-literal, los ultimos literales de tiempo en SEGUNDOS del repo fuera de Sol/Wormhole) y el STORY_FIGURE_FLOAT_MS = 9000 de story.layers.ts (duration-const, gemelo literal de floatMs) pasan a interpolar el vocabulario, con cero cambio de valor renderizado, y las dos familias dejan de verlos -- que es exactamente lo que existen para provocar.',
    },
    {
        family: "delay-const",
        file: "src/components/scenes/eye/mascots/Sol.constants.ts",
        anchors: [
            { snippet: "{ top: 72, left: 10, delay: -1.1 },", lines: [55] },
            { snippet: "{ top: 16, left: 12, delay: -2.2 },", lines: [56] },
            { snippet: "{ top: 78, left: 76, delay: -1.7 },", lines: [57] },
            {
                snippet:
                    "{ top: 17, left: 50, size: 3, dur: 3.2, delay: -0.4 },",
                lines: [66],
            },
            {
                snippet:
                    "{ top: 17.1, left: 69, size: 4, dur: 3.8, delay: -1.6 },",
                lines: [67],
            },
            {
                snippet:
                    "{ top: 35, left: 76, size: 2.6, dur: 2.9, delay: -2.3 },",
                lines: [68],
            },
            {
                snippet:
                    "{ top: 50, left: 86, size: 3.4, dur: 4.1, delay: -0.8 },",
                lines: [69],
            },
            {
                snippet:
                    "{ top: 60.4, left: 88.6, size: 3, dur: 3.5, delay: -3.1 },",
                lines: [70],
            },
            {
                snippet:
                    "{ top: 72.6, left: 72.6, size: 3.8, dur: 3, delay: -1.1 },",
                lines: [71],
            },
            {
                snippet:
                    "{ top: 85.7, left: 59.6, size: 2.8, dur: 4.4, delay: -2.6 },",
                lines: [72],
            },
            {
                snippet:
                    "{ top: 78, left: 42.5, size: 3.2, dur: 3.3, delay: -0.2 },",
                lines: [73],
            },
            {
                snippet:
                    "{ top: 79.4, left: 33, size: 3, dur: 3.9, delay: -3.6 },",
                lines: [74],
            },
            {
                snippet:
                    "{ top: 69.5, left: 16.2, size: 4, dur: 2.8, delay: -1.9 },",
                lines: [75],
            },
            {
                snippet:
                    "{ top: 50, left: 19, size: 2.6, dur: 3.6, delay: -0.6 },",
                lines: [76],
            },
            {
                snippet:
                    "{ top: 32.5, left: 19.7, size: 3.4, dur: 4, delay: -2.9 },",
                lines: [77],
            },
            {
                snippet:
                    "{ top: 30.2, left: 30.2, size: 3, dur: 3.1, delay: -1.4 },",
                lines: [78],
            },
            {
                snippet:
                    "{ top: 11.4, left: 39.6, size: 3.6, dur: 3.7, delay: -4 },",
                lines: [79],
            },
        ],
        reason: "Desfases de FASE de los destellos del mascota Sol: 3 de SOL_BASIC_SPARKS y 14 de SOL_AURA_SPARKS (el cuarto basico, delay: 0, se exime por la regla del cero). No son escalonado de una entrada -- son lo contrario: todos NEGATIVOS, entre -0,2 y -4 s, para que cada destello arranque su bucle infinito ya empezado y en un punto distinto del de sus vecinos. Un retardo negativo no puede salir de motion.staggerMs, cuyos tres peldanos describen cuanto espera una pieza DESPUES de su hermana; y colapsar 17 valores irregulares en tres peldanos destruiria justo aquello para lo que la tabla existe -- variedad deterministica, el mismo argumento con el que ya estan sancionados los 48 tiempos de FOOTER_STARS. Es ademas la forma EXACTA que la regla 17 de RULES.md sanciona: arte de marca con constantes con nombre en su propio modulo, importadas tal cual. El ancla es de CONTENIDO, asi que retocar el desfase de cualquier destello lo deja sin ancla y pone el gate en rojo.",
    },
    {
        family: "radius-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [{ snippet: "border-radius: 3px;", lines: [330] }],
        reason: "Punta del rayo del mascote Sol (ScRay, 3px = su propio width): geometria de trazo de arte de marca, mismo fichero que ya usa formas organicas en % sin token (excepcion de regla 17 de RULES.md, arte de marca con constantes propias).",
    },
    // ---- radius-literal en PORCENTAJE: las siete declaraciones que el punto
    // ciego de la alternacion de unidades dejaba invisibles hasta la critica
    // externa #18 (2026-09-04). Se separan en dos entradas porque son dos
    // cosas distintas: seis son arte (una forma organica que ningun peldano de
    // `radius` puede expresar) y una es un circulo corriente que el resto del
    // repo ya resuelve con el token.
    {
        family: "radius-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [
            {
                snippet: "border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;",
                count: 3,
                lines: [303, 319, 327],
            },
            {
                snippet: "border-radius: 58% 42% 40% 60% / 55% 60% 40% 45%;",
                lines: [307],
            },
            {
                snippet: "border-radius: 40% 60% 55% 45% / 60% 38% 62% 40%;",
                lines: [311],
            },
            {
                snippet: "border-radius: 55% 45% 42% 58% / 42% 58% 44% 56%;",
                lines: [315],
            },
        ],
        reason: "Morfeo de la corona del mascota Sol: los cuatro fotogramas de `coronaMorph` (0/25/50/75 %) mas el cierre en 100 % y el estado de reposo de ScCorona, que repiten la forma del fotograma inicial -- de ahi el count 3 sobre el mismo contenido de linea, que son tres apariciones de UNA forma y no tres decisiones. Es la forma de ocho valores (`a b c d / e f g h`, radios horizontales y verticales por esquina) con la que se dibuja una silueta organica que late; NINGUN peldano de tokens/radius.ts puede expresarla -- la escala son siete radios uniformes, y `radius.full` (9999px) daria un ovalo perfecto, que es justo lo contrario de lo que este arte busca. Excepcion de la regla 17 de RULES.md: arte de marca, en el mismo fichero que ya tiene sancionada la punta de rayo de 3px. El ancla es de CONTENIDO: retocar un solo porcentaje de cualquier fotograma deja esa linea sin ancla y pone el gate en rojo.",
    },
    {
        family: "radius-literal",
        file: "src/components/layout/Footer/Footer.tsx",
        anchors: [{ snippet: "border-radius: 50%;", lines: [184] }],
        reason: 'PROVISIONAL, y no es una excepcion de diseno: es el hallazgo vivo que la critica externa #18 encontro y la razon de que esta familia mire ahora los porcentajes. `ScStar` es un div cuadrado (width = height = var(--star-size)) al que 50 % convierte en circulo -- exactamente lo que el resto del repo escribe como `theme.data.radius.full`: los circulos de Sol, Wormhole, Contact, Journey, Story y Navbar leen el token, y esta es la unica que no. No se migra en esta entrega porque `Footer.tsx` pertenece al dominio de otro frente en esta ola; queda anotado para su dueno. Cuando se migre, el aviso de "ancla sin hallazgo que la cubra" de este mismo script pedira retirar esta entrada.',
    },
    // ---- spacing-literal: las DIEZ lineas del censo que abrio la familia
    // (critica externa #18, 2026-09-04). Se agrupan por naturaleza y no por
    // fichero: primero las cuatro que son excepciones de verdad, despues las
    // seis de `clamp()`, cinco de las cuales son deuda medida con dueno
    // asignado en esta misma ola.
    {
        family: "spacing-literal",
        file: "src/components/ui/VisuallyHidden/VisuallyHidden.tsx",
        anchors: [{ snippet: "margin: -1px;", lines: [40] }],
        reason: "Tecnica canonica de ocultacion visual accesible: la caja de 1x1 px con margen de -1px es el idioma estandar que mantiene el contenido en el arbol de accesibilidad sin ocupar sitio ni desplazar a sus hermanos. El -1px no es un espaciado de composicion -- no separa nada de nada -- sino la contrapartida exacta del `width: 1px`/`height: 1px` de las dos lineas de arriba, y solo tiene sentido junto a ellas. Migrarlo a un peldano de `space` lo romperia: la escala empieza en 0.25rem (4px) y no tiene ni puede tener un paso de un pixel (`space.px` se retiro en la critica externa #8, sin consumidores y sin destino).",
    },
    {
        family: "spacing-literal",
        file: "src/components/legal/legalPage.parts.tsx",
        anchors: [{ snippet: "padding: 0 0.25em;", lines: [426] }],
        reason: 'Termino con definicion emergente de las paginas legales (ScTerm, el `abbr` con borde y cursor de ayuda): el relleno horizontal esta en `em` a proposito, porque tiene que escalar con el tamano del texto QUE LO CONTIENE -- el mismo termino aparece dentro de un parrafo de cuerpo y dentro de un elemento de lista, y un peldano de `space` en rem lo dejaria demasiado suelto en uno y demasiado apretado en el otro. La escala `space` es absoluta por diseno (rem sobre la raiz), asi que no hay peldano que exprese "un cuarto de la altura de MI texto". Mismo criterio con el que `font-size-literal` exime `1em`: una medida relativa al contexto no es una eleccion dentro de la escala.',
    },
    {
        family: "spacing-literal",
        file: "app/opengraph-image.tsx",
        anchors: [
            { snippet: 'padding: "80px",', lines: [76] },
            { snippet: 'marginRight: "28px",', lines: [88] },
        ],
        reason: "Lienzo de la imagen Open Graph: un PNG de 1200x630 px generado en build por Satori (`ImageResponse`), no una pieza de la interfaz. Ahi no hay tema ni styled-components -- el arbol se declara con objetos de estilo JS en pixeles absolutos y no puede leer `theme.data.space`, y la escala en rem no significaria nada en un lienzo sin raiz tipografica de documento. Ademas los dos valores estan elegidos contra el LIENZO (80px de margen de seguridad sobre 1200x630 y 28px de separacion del logotipo), no contra el ritmo vertical del sitio: 80px no es ningun peldano de la escala (space[8] son 4rem = 64px, space[9] son 6rem = 96px).",
    },
    {
        family: "spacing-literal",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [{ snippet: "gap: clamp(4px, 1vh, 14px);", lines: [1356] }],
        reason: "Separacion de las tres lineas del cartel de Story (ScStatementText): es el unico `clamp()` de espaciado del repo cuyos DOS extremos quedan fuera de la escala -- 4px es space[1] (0.25rem) pero 14px no es ningun peldano (space[3] son 12px, space[4] son 16px), y el tramo esta calibrado contra la ALTURA del viewport (`1vh`) para que las tres lineas del cartel respiren igual en una pantalla corta que en una alta. Migrar solo el suelo dejaria un clamp mitad token mitad literal, que es peor que los dos escritos a mano: esconde que el tramo no pertenece al sistema. Si algun dia se sistematiza, el sitio es un peldano nuevo con nombre, no un suelo migrado a medias.",
    },
    {
        family: "spacing-literal",
        file: "src/components/sections/Contact/Contact.tsx",
        anchors: [
            {
                snippet:
                    "padding-block: clamp(1rem, 3.5dvh, ${({ theme }) => theme.data.space[8]});",
                lines: [706],
            },
            {
                snippet:
                    "gap: clamp(0.75rem, 2vw, ${({ theme }) => theme.data.space[4]});",
                lines: [813],
            },
            {
                snippet:
                    "gap: clamp(0.5rem, 1.5vw, ${({ theme }) => theme.data.space[3]});",
                lines: [830],
            },
        ],
        reason: "PROVISIONAL: deuda medida, no excepcion. Los tres `clamp()` ya leen el token en su TOPE y escriben el suelo a mano, y los tres suelos son peldanos vivos byte a byte -- 1rem es space[4], 0.75rem es space[3], 0.5rem es space[2] --, que es la forma exacta de deriva silenciosa que la regla 17 previene: el dia que la escala se retoque, el tope se movera y el suelo no. Ademas el primero esta escrito byte a byte en `Features.tsx`, en dos ficheros que no se conocen. No se migran en esta entrega porque `Contact.tsx` pertenece al dominio de otro frente en esta ola; quedan anotados para su dueno, y el aviso de ancla sin hallazgo pedira retirar estas entradas cuando se cierren.",
    },
    {
        family: "spacing-literal",
        file: "src/components/sections/Features/Features.tsx",
        anchors: [
            {
                snippet:
                    "padding-block: clamp(1rem, 3.5dvh, ${({ theme }) => theme.data.space[8]});",
                lines: [1257],
            },
            {
                snippet:
                    "padding-block: clamp(0.75rem, 2.2dvh, ${({ theme }) => theme.data.space[5]});",
                lines: [1580],
            },
        ],
        reason: "PROVISIONAL: la misma deuda medida que en `Contact.tsx`, y el primero de los dos es la MISMA LINEA byte a byte que `Contact.tsx:706` -- dos ficheros que no se conocen escribiendo el mismo suelo a mano, que es el sintoma clasico de una medida que deberia ser un token. Los dos suelos son peldanos vivos (1rem = space[4], 0.75rem = space[3]) y los dos topes ya leen la escala. No se migran en esta entrega porque `Features.tsx` pertenece al dominio de otro frente en esta ola; el aviso de ancla sin hallazgo pedira retirar estas entradas cuando se cierren.",
    },
    {
        family: "kicker",
        file: "src/components/sections/Story/Story.tsx",
        anchors: [
            {
                snippet: '<Kicker>{t("Home.story.kicker")}</Kicker>',
                count: 2,
                lines: [1343, 1546],
            },
        ],
        reason: 'Kicker con voz propia (decision D-E del dueno) en las dos ramas de Story -- render en la rama clara y en la oscura, misma clave i18n "Home.story.kicker" (mismo JSX literal en las dos ramas, count: 2). Desde la integracion de la ola K (critica #15, 2026-09-02) consume el primitivo compartido src/components/ui/Kicker en vez de un ScKicker local.',
    },
    {
        family: "kicker",
        file: "src/components/ui/Kicker/Kicker.tsx",
        anchors: [{ snippet: "<ScKicker", lines: [68] }],
        reason: "El propio primitivo Kicker (integracion de la ola K, critica #15): es el UNICO sitio donde se define el kicker de seccion, y esta familia existe para cazar kickers repetidos por seccion, no la definicion compartida que los sustituye. Su JSX interno <ScKicker ...> es la implementacion, no un uso.",
    },
    {
        family: "kicker",
        file: "src/components/sections/Features/Features.tsx",
        anchors: [
            {
                snippet: '<Kicker>{t("Home.features.kicker")}</Kicker>',
                count: 2,
                lines: [1514],
            },
        ],
        reason: 'Kicker con voz propia (decision D-E del dueno) en las dos ramas de Features -- render en la rama clara y en la oscura, misma clave i18n "Home.features.kicker". Desde la integracion de la ola K (critica #15, 2026-09-02) consume el primitivo compartido src/components/ui/Kicker en vez de un ScKicker local.',
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
    // ---- color-literal: los 71 literales de color que existian el dia que se
    // cerro el septimo punto ciego (critica externa #17, 2026-09-03). Censo
    // propio ejecutado con el motor de este mismo fichero antes de escribir
    // una sola entrada -- ver el comentario de la familia para las cifras
    // completas y para la comparacion contra las 60 combinaciones de las
    // rampas, que dio CERO coincidencias.
    //
    // El reparto de los 71, porque explica que clase de excepcion es cada
    // grupo y por que ninguno es un rol de tema reescrito por descuido:
    //  - 64 son ARTE: escenas decorativas `aria-hidden` (aura, ojo, Sol,
    //    Wormhole, el haz, los cuatro voids de los paquetes de arte) y
    //    literales de UNA composicion concreta en los cuatro modulos
    //    `*.layers.ts` de seccion, que es la forma EXACTA que la regla 17 de
    //    RULES.md sanciona: constante con nombre en su propio modulo,
    //    importada tal cual y nunca reescrita como valor suelto. Los 64
    //    llegan aqui con su porque YA escrito junto a la declaracion, que es
    //    la condicion que este fichero exige para sancionar; se comprobo uno
    //    a uno.
    //  - 7 son CONVERSIONES FIJADAS DE UN TOKEN, la unica clase de esta
    //    familia que SI puede desincronizarse en silencio: los cinco hex de
    //    `app/opengraph-image.tsx` y los dos de `resolveTheme.ts`. Se
    //    verificaron los siete recalculando la conversion oklch -> OKLab ->
    //    sRGB lineal -> sRGB con gamma (matrices de Ottosson, las mismas de
    //    `tokens/contrast.ts`) sobre los tokens que sus docblocks nombran:
    //    los siete dan EXACTAMENTE el hex escrito. Van sancionados con su
    //    riesgo declarado en cada entrada, no escondidos entre el arte.
    //
    // Que esten sancionados no los deja sin vigilancia, igual que en
    // `duration-literal`: el ancla es de CONTENIDO, asi que retocar un solo
    // digito de cualquiera de ellos deja la linea sin ancla y pone el gate en
    // rojo. Lo que la sancion permite es que sigan EXISTIENDO, no que puedan
    // moverse en silencio.
    {
        family: "color-literal",
        file: "app/opengraph-image.tsx",
        anchors: [
            { snippet: 'const BG_FROM = "#280739";', lines: [41] },
            { snippet: 'const BG_TO = "#1A1A1C";', lines: [42] },
            { snippet: 'const BRAND = "#02B7FF";', lines: [43] },
            { snippet: 'const TEXT = "#FAFAFA";', lines: [44] },
            { snippet: 'const TEXT_SUBTLE = "#B7B7BB";', lines: [45] },
        ],
        reason: "Imagen Open Graph generada en el build. CONVERSION FIJADA DE TOKEN, no arte: el docblock del propio fichero declara los cinco como la conversion a sRGB de color.secondary[1100] (= semanticDark.bg), color.neutral[1100], color.primary[500], color.neutral[50] (= semanticDark.text) y color.neutral[400], y por que no se importa el token: Satori (el motor de ImageResponse) no garantiza entender la funcion oklch() y no se arriesga el build del sitio a esa incertidumbre. Los cinco se RECALCULARON al sancionarlos (oklch -> OKLab -> sRGB, matrices de Ottosson, las mismas de tokens/contrast.ts) y dan exactamente los hex escritos. Riesgo declarado, y es el motivo de que esta familia exista: si alguien retoca la escalera L/CMUL o un hue de color.ts, estos cinco NO se enteran -- el ancla de contenido obliga a pasar por aqui para tocarlos.",
    },
    {
        family: "color-literal",
        file: "src/theme/resolveTheme.ts",
        anchors: [
            { snippet: 'light: "#FAFAFA",', lines: [88] },
            { snippet: 'dark: "#280739",', lines: [89] },
        ],
        reason: "THEME_COLORS, el color de la barra del navegador (meta theme-color) que escriben el script de arranque y ThemeProvider. Misma clase que los cinco de opengraph-image.tsx y verificados igual: #FAFAFA es la conversion exacta de color.neutral[50] (= semanticLight.bg) y #280739 la de color.secondary[1100] (= semanticDark.bg). Se quedan en hex, y no leen el token, porque los consume una etiqueta HTML escrita antes del primer pintado desde un script inline, fuera del arbol de React y del ThemeProvider. Mismo riesgo declarado que la entrada anterior; el docblock de la constante ya documenta el resto del reparto (por que la crea el script y no el layout).",
    },
    {
        family: "color-literal",
        file: "src/components/layout/Footer/footer.layers.ts",
        anchors: [
            {
                snippet:
                    'export const FOOTER_DARK_BG = "oklch(0.055 0.01 288)";',
                lines: [36],
            },
        ],
        reason: "Fondo del pie en oscuro: literal de UNA composicion -- la costura Contacto -> Footer --, no un rol reutilizable en otras superficies, asi que no asciende a token semantico (criterio D10, el mismo que declara contact.layers.ts para los suyos). Su docblock ya razona el valor: por encima del void de la escena de Contacto se veria como un escalon claro en vez de como continuidad, y por eso su L (0.055) queda por debajo del 0.22 del paso mas oscuro de la rampa.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/aura/aura.layers.ts",
        anchors: [
            {
                snippet:
                    'export const AURA_SURFACE = "oklch(0.942 0.023 285)";',
                lines: [308],
            },
        ],
        reason: "Color medio del campo pastel (00-field.png) convertido a OKLCH: es lo que se ve un instante antes de que el WebP termine de decodificar. Excepcion de color ya sancionada en su docblock, la misma que EYE_SURFACE -- Aura es aria-hidden y decorativa, y esta composicion solo se monta en tema claro por diseno, asi que un rol semantico (que cambia con el tema) seria justamente el token equivocado.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/aura/aura.parts.tsx",
        anchors: [
            { snippet: "#fff 8%,", count: 4, lines: [297, 304, 313, 320] },
            { snippet: "#fff 92%,", count: 4, lines: [298, 305, 314, 321] },
            {
                snippet: "border: 2px solid oklch(0.92 0.04 250 / 0.7);",
                lines: [443],
            },
            { snippet: "oklch(0.93 0.035 285 / 0.5) 50%,", lines: [516] },
            { snippet: "oklch(0.965 0.02 285 / 0.85) 82%,", lines: [517] },
        ],
        reason: "Los OCHO #fff no pintan nada: son las paradas OPACAS de cuatro mask-image (dos ejes x prefijado y sin prefijar, con mask-composite: intersect). En una mascara el color no es un color, es opacidad -- blanco conserva, transparent recorta --, asi que leer un token de tema ahi no cambiaria un pixel y haria ilegible el unico dato que importa, el 8%/92% del desvanecido. Cuatro apariciones de cada snippet, una por mascara (count: 4). Los otros tres son arte de la escena aria-hidden: el borde del anillo de choque (ScShock) y las dos paradas intermedias del degradado del pie de Aura, cuya ultima parada SI lee semantic.bg -- el literal cubre el tramo que el token no modela.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers.ts",
        anchors: [
            {
                snippet: 'export const CONTACT_GUARDIAN_VOID = "#0d0416";',
                lines: [171],
            },
        ],
        reason: "Void del paquete de arte de la escena de Contacto, copiado VERBATIM del propio paquete (html,body{background:#0d0416}) y a proposito SIN convertir a oklch(): el aditivo de las capas esta calibrado contra este negro exacto y un redondeo de conversion desviaria el resultado. Solo se ve como color de pintado antes de que cargue la capa opaca (loading=lazy) y como tope de la vineta. Mismo criterio en los otros tres voids de escena.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers.ts",
        anchors: [
            {
                snippet: 'export const FEATURES_ORBITAL_VOID = "#150b2e";',
                lines: [177],
            },
        ],
        reason: "Void del paquete de arte de la escena de Features, mismo caso y mismo motivo que CONTACT_GUARDIAN_VOID: literal del paquete, no convertido, visible solo hasta que carga la capa opaca y como tope de la vineta. Es ademas el suelo contra el que Features.test.tsx mide el contraste del termino Gaming con contrast.ts, asi que cambiarlo mueve una medicion de accesibilidad, no solo un color.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/journeyCosmicPortal/journeyCosmicPortal.layers.ts",
        anchors: [
            {
                snippet: 'export const JOURNEY_PORTAL_VOID = "#0b0620";',
                lines: [143],
            },
        ],
        reason: "Void del paquete de arte de la escena de Journey. Su docblock declara ademas la comprobacion que hizo quien lo escribio -- las esquinas medidas de la capa 01-background dan #12012a, algo mas claro -- y por que se conserva igual el del paquete: es el que el paquete declara y el que su demo usa detras del stack.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/storyCosmicBeing/storyCosmicBeing.layers.ts",
        anchors: [
            {
                snippet: 'export const STORY_COSMIC_BEING_VOID = "#05010e";',
                lines: [188],
            },
        ],
        reason: "Void del paquete de arte de la escena de Story, con la misma sancion ya escrita en su docblock (verbatim, sin convertir, para no desviar el aditivo) y con la distincion explicita frente al literal de Cosmic Heart (#05030f): cada arte se calibro contra su propio negro.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/eye/eye.layers.ts",
        anchors: [
            {
                snippet: 'export const EYE_SURFACE = "oklch(0 0 0)";',
                lines: [171],
            },
        ],
        reason: "Negro del lienzo del ojo. Es el caso contrario al de un literal suelto: existe EXPORTADO precisamente para que nadie lo repita -- la continuidad Hero -> Story exige que el extremo de la costura sea exactamente el valor que pinta ScSocket, y dos literales iguales en dos ficheros se separan al primer retoque. Excepcion de color ya sancionada en eye.parts.tsx: el ojo es aria-hidden, su negro es identidad de marca y no un rol semantico, asi que no cambia con el tema.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/eye/eye.parts.tsx",
        anchors: [
            { snippet: "oklch(0 0 0 / 0.22) 0%,", lines: [427] },
            { snippet: "oklch(0 0 0 / 0.2) 58%,", lines: [428] },
        ],
        reason: "Las dos paradas del velo de contraste del hero (ScScrim): negro con alfa sobre el arte, calibrado para bajar el brillo de los filamentos bajo la copia sin apagar el anillo exterior. No es una eleccion de color -- el color es negro puro en las dos -- sino de OPACIDAD, y el fichero declara la misma excepcion de color para todo su contenido.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/eye/mascots/Sol.tsx",
        anchors: [
            {
                snippet: 'const SKY_HAZE = "oklch(0.93 0.039 235.851)";',
                lines: [94],
            },
            {
                snippet: 'const SKY_SOFT = "oklch(0.87 0.074 235.851)";',
                lines: [95],
            },
            {
                snippet: 'const SKY_MID = "oklch(0.8 0.117 235.851)";',
                lines: [96],
            },
            {
                snippet: 'const SKY_DEEP = "oklch(0.66 0.142 235.851)";',
                lines: [97],
            },
            {
                snippet: 'const VIOLET_SOFT = "oklch(0.87 0.088 311.928)";',
                lines: [98],
            },
            {
                snippet: 'const VIOLET_MID = "oklch(0.8 0.14 311.928)";',
                lines: [99],
            },
            {
                snippet: 'const VIOLET_DEEP = "oklch(0.66 0.233 311.928)";',
                lines: [100],
            },
            { snippet: 'const WHITE = "oklch(0.985 0 0)";', lines: [105] },
            {
                snippet: 'const ROSE_NEUTRAL = "oklch(0.324 0 0)";',
                lines: [106],
            },
        ],
        reason: "Paleta propia del mascota Sol, port verbatim del widget homonimo de vti-sdk. Los siete primeros llevan hue DE MARCA (235.851/311.928) y por eso parecen peldanos, pero son MEZCLAS de dos peldanos distintos -- su propio docblock los anota uno a uno como 'L del paso 600, croma del 400' --, lo que el censo confirma: ninguno coincide con una casilla de las rampas. El docblock lo dice en una linea que esta entrada no mejora: cambiar uno por 'su' paso de escala no es una limpieza, es repintar el arte. WHITE y ROSE_NEUTRAL se resuelven a literal porque la escala neutra del sdk corre AL REVES que la de este repo (su neutral-1100 es el blanco), y traducir el nombre de token entre dos escalas invertidas es como se pinta mal un arte entero.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/eye/mascots/Wormhole.tsx",
        anchors: [
            { snippet: 'color: ${oklch("0.985 0 0", 1)};', lines: [324] },
        ],
        reason: "Blanco del wordmark en el centro del agujero de gusano. Es el UNICO color literal que esta familia ve en este fichero, y conviene saber por que: las otras 24 apariciones de oklch( son llamadas al ayudante local (function oklch(triplet, alpha)) con constantes con nombre (RING_1..4, CORE_START/END), es decir el patron que la regla 17 pide, y quedan fuera por el limite declarado en el comentario de la familia -- un triplete separado de su funcion no se ve. El fichero entero es un port verbatim del widget de vti-sdk y su docblock de cabecera ya declara esta clase de excepcion para los colores: espectaculo de marca en un elemento aria-hidden, no roles de UI.",
    },
    {
        family: "color-literal",
        file: "src/components/scenes/sectionBeam/sectionBeam.layers.ts",
        anchors: [
            {
                snippet: 'export const BEAM_CORE = "oklch(0.85 0.13 311.928)";',
                lines: [32],
            },
            {
                snippet:
                    'export const BEAM_MID = "oklch(0.75 0.18 311.928 / 0.6)";',
                lines: [34],
            },
            {
                snippet:
                    'export const BEAM_TAIL = "oklch(0.7 0.19 311.928 / 0.2)";',
                lines: [36],
            },
            {
                snippet:
                    'export const SWEEP_CORE = "oklch(0.97 0.06 311.928)";',
                lines: [38],
            },
            {
                snippet:
                    'export const SWEEP_MID = "oklch(0.9 0.12 235.851 / 0.5)";',
                lines: [40],
            },
            {
                snippet:
                    'export const SWEEP_GLOW = "oklch(0.8 0.17 311.928 / 0.9)";',
                lines: [42],
            },
            {
                snippet:
                    'export const HOTSPOT_GLOW = "oklch(0.8 0.17 311.928 / 0.95)";',
                lines: [44],
            },
        ],
        reason: "Las siete piezas de color del haz de seccion (nucleo, media y cola del semihaz de dibujado; nucleo, media y halo del de barrido; halo del punto caliente), cada una con su linea de mockup citada en su propio docblock. Mismo fichero y misma procedencia que SECTION_BEAM_EASING, ya sancionado en easing-literal: es un arte portado entero, no una pieza de UI que pueda leer roles. Llevan hue de marca pero no croma de rampa (0.13/0.18/0.19/0.06/0.12/0.17 frente a los 0.148/0.158 del pico primary y los 0.243/0.259 del de secondary), asi que ninguno es un peldano reescrito. La tonalidad CLARA de estas mismas siete piezas SI se resuelve contra la paleta, en las funciones del mismo fichero que reciben `palette`.",
    },
    {
        family: "color-literal",
        file: "src/components/sections/Contact/contact.layers.ts",
        anchors: [
            {
                snippet:
                    'export const CONTACT_CARD_BORDER = "oklch(0.88 0.04 270)";',
                lines: [46],
            },
            {
                snippet:
                    '"linear-gradient(110deg, #EFF4FC 0%, #F5F2FB 55%, #F9F0F7 100%)";',
                lines: [48],
            },
            {
                snippet:
                    'export const CONTACT_PANEL_BG_LIGHT = "rgba(255, 255, 255, 0.82)";',
                lines: [87],
            },
            {
                snippet:
                    '"radial-gradient(circle, oklch(0.8 0.1 320 / 0.2) 0%, oklch(0.8 0.1 320 / 0.07) 45%, transparent 70%)";',
                lines: [102],
            },
            {
                snippet:
                    'export const CONTACT_RING_A_BORDER = "oklch(0.75 0.1 300 / 0.22)";',
                lines: [104],
            },
            {
                snippet:
                    'export const CONTACT_RING_B_BORDER = "oklch(0.75 0.1 300 / 0.12)";',
                lines: [105],
            },
            {
                snippet:
                    'export const CONTACT_FIGURE_SHADOW = "oklch(0.55 0.15 300 / 0.3)";',
                lines: [108],
            },
            {
                snippet:
                    'export const CONTACT_CARD_BG_DARK = "oklch(1 0 0 / 0.05)";',
                lines: [302],
            },
            {
                snippet:
                    'export const CONTACT_CARD_BORDER_DARK = "oklch(1 0 0 / 0.12)";',
                lines: [303],
            },
            {
                snippet:
                    'export const CONTACT_FORM_BG = "oklch(1 0 0 / 0.04)";',
                lines: [310],
            },
            {
                snippet:
                    'export const CONTACT_FORM_BORDER = "oklch(1 0 0 / 0.12)";',
                lines: [311],
            },
            {
                snippet:
                    '"radial-gradient(ellipse 55% 100% at 50% 0%, oklch(0.5 0.18 311.928 / 0.34), transparent 72%)";',
                lines: [322],
            },
        ],
        reason: "Los doce literales de la composicion de Contacto, rama clara (borde y degradado pastel de la tarjeta, fondo del panel, halo y bordes de los anillos, sombra de la figura) y rama oscura (fondos/bordes de tarjetas y formulario, halo superior). Criterio D10 declarado en la cabecera del fichero, que ademas documenta el mapeo de rol de lo que SI sale del tema (semantic.textMuted/text/border) para que se vea que la frontera esta pensada, no heredada. GRUPO DUPLICADO de la critica #17: CONTACT_CARD_BORDER_DARK y CONTACT_FORM_BORDER son el mismo literal oklch(1 0 0 / 0.12) y NO se unifican, con el motivo ya escrito junto a la segunda desde antes de esta revision -- el mockup declara las dos piezas por separado y sus fondos ya divergen (.05 frente a .04), asi que acoplarlas haria que retocar la tarjeta repintara el formulario. La tercera aparicion de ese literal en el repo, glassLight.border (tokens/glass.ts), NO es la misma pieza y tampoco sirve de token para estas dos: es el borde de la superficie de cristal en tema CLARO, mientras estas visten tarjetas de la rama OSCURA, cuyo cristal (glassDark.border) usa alfa .08. Comprobado byte a byte antes de sancionar.",
    },
    {
        family: "color-literal",
        file: "src/components/sections/Features/features.layers.ts",
        anchors: [
            {
                snippet:
                    'export const FEATURES_GAMING_ACCENT = "oklch(0.65 0.17 340)";',
                lines: [175],
            },
            {
                snippet:
                    'export const FEATURES_GAMING_ACCENT_LIGHT = "oklch(0.55 0.17 340)";',
                lines: [213],
            },
            {
                snippet:
                    'export const FEATURES_GAMING_ACCENT_LIGHT_HOVER = "oklch(0.5 0.17 340)";',
                lines: [214],
            },
            {
                snippet:
                    'export const FEATURES_GAMING_ACCENT_DARK = "oklch(0.65 0.17 340)";',
                lines: [215],
            },
            {
                snippet:
                    'export const FEATURES_GAMING_ACCENT_DARK_HOVER = "oklch(0.7 0.17 340)";',
                lines: [216],
            },
        ],
        reason: "Los cinco acentos de la tarjeta Gaming: hue 340, deliberadamente distinto de los dos de marca (235.851/311.928) para que la tercera identidad se distinga, con la L elegida por CONTRASTE MEDIDO contra el fondo real de cada rama (ratios en el docblock de las cuatro por rama y en Features.test.tsx). GRUPO DUPLICADO de la critica #17: FEATURES_GAMING_ACCENT y FEATURES_GAMING_ACCENT_DARK son la misma cadena, y se SANCIONAN en vez de unificarse. El motivo es el mismo que ya llevaba escrito el par de Contacto: visten piezas distintas con requisitos distintos -- el termino Gaming del h2 se midio sobre el ARTE de la escena (mediana del borde de glifo 5.05 tras subir L a 0.65) y el acento de tarjeta se midio contra semantic.bg (5.04:1) --, asi que aliasear una a la otra haria que el dia que una de las dos mediciones pida moverse, la otra se moviera sin que nadie la mida. Que hoy coincidan es el resultado de dos mediciones, no una duplicacion por descuido; el detector las deja anotadas, que es lo que faltaba.",
    },
    {
        family: "color-literal",
        file: "src/components/sections/Hero/Hero.tsx",
        anchors: [
            { snippet: "oklch(0 0 0 / 0) 0%,", lines: [126] },
            {
                snippet:
                    ': "0 0 3px oklch(0 0 0 / 1), 0 0 9px oklch(0 0 0 / 0.95), 0 0 22px oklch(0 0 0 / 0.9)"};',
                lines: [418],
            },
        ],
        reason: "Los dos son negro puro con alfa, no una eleccion de tinte. El primero es la parada TRANSPARENTE del pie del hero, cuyo otro extremo importa EYE_SURFACE en vez de repetirlo (el docblock de la constante explica esa costura). El segundo es un halo de contraste de tres capas bajo la copia del hero oscuro, medido: sube el percentil 5 del borde de glifo del subtitulo de 4,19 a 6,18 y baja el borde bajo umbral del 5,4% al 2,4% a 1440. Es una medida de accesibilidad sobre el arte, no color de marca -- y el propio comentario declara honestamente que no cierra el 1-2% restante.",
    },
    {
        family: "color-literal",
        file: "src/components/sections/Journey/journey.layers.ts",
        anchors: [
            {
                snippet:
                    'const DISC_GLOW_PRIMARY = "oklch(0.6 0.12 260 / 0.14)";',
                lines: [91],
            },
            {
                snippet:
                    'const DISC_GLOW_SECONDARY = "oklch(0.6 0.15 290 / 0.14)";',
                lines: [93],
            },
            {
                snippet:
                    'const DISC_GLOW_SECONDARY_DEEP = "oklch(0.55 0.2 300 / 0.14)";',
                lines: [97],
            },
            {
                snippet:
                    'const DISC_GLOW_ERROR = "oklch(0.66 0.24 12 / 0.14)";',
                lines: [99],
            },
            {
                snippet: '"linear-gradient(135deg, #FFEBFDEB, #E3F6FFEB)";',
                lines: [157],
            },
            {
                snippet:
                    'export const JOURNEY_PATH_STROKE = "oklch(0.72 0.1 290 / 0.45)";',
                lines: [177],
            },
            {
                snippet:
                    '"drop-shadow(0 16px 34px oklch(0.55 0.15 285 / 0.22))";',
                lines: [191],
            },
        ],
        reason: "Arte de Journey, criterio D10 de la cabecera del fichero: el sistema de tokens no modela el degradado pastel de la tarjeta (dos hex de ocho digitos, con alfa dentro), el trazo del path punteado ni la sombra de la figura. Los CUATRO primeros son los colores del glow de los seis discos, nombrados en esta misma ola al deshacer un GRUPO DUPLICADO de la critica #17: los seis pasos escribian la sombra entera a mano y dos parejas eran identicas byte a byte. Hoy la geometria vive una vez en discGlow() y cada color una vez aqui, con el mismo CSS renderizado (medido en navegador, seis de seis). Ninguno de los cuatro coincide con un peldano de rampa: sus hue (260, 290, 300, 12) no son los de marca salvo el 12 de error, cuya croma tampoco cuadra.",
    },
    {
        family: "color-literal",
        file: "src/components/sections/Story/story.layers.ts",
        anchors: [
            {
                snippet:
                    '"radial-gradient(circle at 55% 55%, oklch(0.9 0.05 275 / 0.55) 0%, oklch(0.93 0.03 260 / 0.3) 45%, transparent 72%)";',
                lines: [35],
            },
        ],
        reason: "Halo radial detras de la figura de Story, verbatim del mockup. Su docblock ya declara la comprobacion que esta familia pediria: los hue 275 y 260 no coinciden con los de marca (235.851 primary, 311.928 secondary), asi que no es sustituible por un paso de palette.* -- es un degradado propio de esa pieza de arte.",
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
    // Familias con alcance de fichero (`appliesTo`): se resuelven UNA vez por
    // fichero, no por linea -- la decision no depende del contenido.
    const families = FAMILIES.filter(
        (f) => !f.appliesTo || f.appliesTo(relFile),
    );
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const family of families) {
            // Segundo argumento: ventana de contexto para la UNICA familia que
            // no puede decidir con la linea sola (`delay-const`, forma A: una
            // tabla multilinea se declara en un renglon y se llena en los
            // siguientes). El motor sigue siendo linea a linea -- se reporta
            // SIEMPRE sobre `line`, y las otras trece familias ignoran este
            // argumento -- pero una familia puede MIRAR hacia adelante para
            // decidir, en vez de quedarse ciega como se quedo `duration-const`.
            const snippet = family.test(line, { lines, index: i });
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
    "delay-const":
        "este RETARDO llega al CSS sin pasar por el sistema. Desde la critica externa #16 hay escala para el: motion.staggerMs, tres peldanos (tight 60, base 80, loose 110) derivados del censo de lo que este repo ya escribia -- no de motion.durationMs, que es la escala de cuanto tarda algo, no de cuando empieza. Dos formas caen aqui. (1) Una TABLA MULTILINEA de tiempos con los numeros sueltos en sus renglones: escribe la cascada como suma de peldanos (`PASO.base + 2 * PASO.tight`), que ademas deja a la vista que pieza va pegada a la anterior y cual se despega. (2) Un campo o constante llamado `delay` con un numero literal: si es un paso de escalonado, lee el peldano; si es un DESFASE DE FASE de un bucle ambiental -- numeros deliberadamente irregulares para que dos piezas vecinas no laten a la vez, como las estrellas del pie o los destellos de Sol --, no tiene peldano posible y no debe tenerlo: deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST. El cero no dispara: es la ausencia de retardo, no un tiempo elegido.",
    "radius-literal":
        "un border-radius literal nuevo usa un token de src/theme/tokens/radius.ts en vez de un numero escrito a mano (siete peldanos: xs 2px, sm 4px, md 8px, lg 0.75rem, xl 1rem, 2xl 1.5rem, full 9999px). Los PORCENTAJES entran en esta familia desde la critica externa #18: un `border-radius: 50%` es la otra forma de escribir un circulo, y en este repo un circulo se pide con radius.full -- lo hacen Sol, Wormhole, Contact, Journey, Story y el Navbar. Si el porcentaje NO es un circulo sino una forma organica de ocho valores (`a b c d / e f g h`), ningun peldano puede expresarla: es arte, deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST. El cero no dispara: es la ausencia de radio, no un radio elegido.",
    "spacing-literal":
        "este espaciado (padding, margin o gap) se escribe como literal rem/px/em fuera de src/theme/tokens/, el unico sitio donde una medida de separacion nace en este repo (regla 17 de RULES.md, la misma que color-literal y radius-literal: las familias de movimiento son la 48). Lee el peldano de `theme.data.space` -- once pasos: 0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6 y 8 rem --, y comprueba antes si tu valor YA es uno de ellos: un literal que hoy vale lo mismo que el token deja de valerlo el dia que la escala se retoque, y el CSS renderizado no distingue los dos casos (task/lessons.md, 2026-08-12). Dentro de un `clamp()` la familia mira los DOS extremos, a proposito y al reves que font-size-literal: un tramo fluido de espaciado sigue teniendo suelo y techo fijos, y el patron que mas se repite en este repo es justamente el techo leyendo el token y el suelo escrito a mano. Si la medida NO puede salir de la escala -- relativa al texto que la contiene (`em`), contrapartida exacta de una caja de 1px como en VisuallyHidden, o un lienzo sin tema como la imagen Open Graph --, deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST. El cero no dispara: no separar no es una separacion elegida.",
    "font-size-literal":
        "este tamano de fuente se escribe como literal (rem/px/em) fuera de src/theme/tokens/, el unico sitio donde un tamano nace en este repo (regla 48). Si coincide con un peldano de type.scale (deckClosing, display, h1, h2, h3, wordmark, h5, deckBody, body, bodySm, caption, overline), lee `theme.data.type.scale.<peldano>.size` -- un literal que hoy vale lo mismo deja de valerlo el dia que el token se retoque, y el CSS renderizado no distingue los dos casos (task/lessons.md, 2026-08-12). Si NO coincide con ninguno, la pregunta es de diseno antes que de codigo: o la pieza baja al peldano vecino, o el tamano merece un peldano propio con su nombre semantico y su docblock (precedente: `wordmark`, el rotulo de marca, critica #15). Un tramo fluido va en `clamp()`, que esta familia exime; `1em` tambien, porque es heredar, no elegir.",
    "z-index-literal":
        "esta capa se escribe como entero literal fuera de src/theme/tokens/zIndex.ts, donde viven los siete roles del sistema (base 0, raised 10, stickyNav 100, dropdown 200, overlay 900, modal 1000, toast 1100). Si la pieza compite con una capa FLOTANTE del documento -- por encima del navbar, de un desplegable, de un modal -- lee el peldano que nombra ese rol: escribir un numero al lado de esa escala es apostar a ciegas contra ella. Si es solo el orden de dos o tres hermanos DENTRO de una misma pila (contenido por delante de su fondo decorativo, valores 1-3), es el patron ya sancionado 16 veces en el repo: deja el porque JUNTO a la declaracion y anade la excepcion a ALLOWLIST -- pero comprueba antes que el ancestro tenga su propio contexto de apilamiento, porque si no, ese 1 local compite de verdad con toda la pagina. El cero NO se exime aqui, al reves que en radius/duration: `z-index: 0` es zIndex.base, un peldano real.",
    "color-literal":
        "este color se escribe como literal (oklch/rgb/hsl/hexadecimal) fuera de src/theme/tokens/, el unico sitio donde un color nace en este repo (regla 17 de RULES.md, no la 48: las demas familias de este script vigilan movimiento y esta vigila color). Tres preguntas, en este orden. (1) COINCIDE CON UN PELDANO? Compara contra las cinco rampas de tokens/color.ts -- primary, secondary, warning, error, neutral, doce pasos cada una -- y contra los roles de tokens/semantic.ts que las nombran. Si coincide, lee el token: un literal que hoy vale lo mismo deja de valerlo el dia que se retoque la escalera L/CMUL, y el CSS renderizado no distingue los dos casos (task/lessons.md, 2026-08-12). Cuando esta familia nacio, NINGUNO de los 55 literales del repo coincidia; ser el primero es una senal, no un tramite. (2) ES UNA CONVERSION de un token a otra notacion (un hexadecimal para un motor que no entiende oklch(), como la imagen Open Graph o la meta theme-color)? Entonces no es arte: deja escrito de QUE token sale y con que algoritmo se convirtio, porque ese literal no se enterara de que el token cambio. (3) ES ARTE? Entonces es la excepcion que la regla 17 ya declara -- arte de marca con constantes con nombre en su propio modulo *.layers.ts, importadas tal cual y nunca reescritas como valor suelto --: dale nombre, deja el porque JUNTO a la declaracion (que hue/croma no es de rampa, de que mockup o paquete sale) y anade la excepcion a ALLOWLIST. Una mascara (mask-image) no cuenta como color: ahi el blanco es opacidad, no tinte.",
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
            "\nCada hallazgo de arriba pertenece a una familia de RULES.md -- la regla 48 (seccion",
        );
        console.error(
            "Estilos y movimiento) para casi todas, y la 17 (tokens de tema obligatorios) para la de",
        );
        console.error(
            "color -- y esta es la guia especifica de la familia que salio en rojo:\n",
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

/**
 * PUNTO DE ENTRADA. `run()` se ejecuta SOLO cuando este fichero se invoca
 * como PROGRAMA -- `node scripts/detect-anti-patterns.mjs`, que es como lo
 * llaman `pnpm run ci`, `.github/workflows/ci.yml` y `netlify.toml` --, y no
 * cuando se IMPORTA como modulo, que es lo que hace su propio test para
 * ejercitar las familias linea a linea sin escanear el repo entero ni pisar
 * el `process.exitCode` del proceso de Vitest.
 *
 * El riesgo obvio de una guarda asi es el contrario del que resuelve: si
 * fallara, el gate pasaria en verde SIN escanear nada, en silencio. Por eso
 * el test que la acompana no comprueba solo las familias -- lanza este script
 * como proceso hijo, igual que lo lanza el gate, y exige ver en su salida el
 * recuento de ficheros escaneados. Una guarda rota deja ese test en rojo
 * antes de poder dejar el gate ciego.
 */
const invocadoComoPrograma =
    typeof process.argv[1] === "string" &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invocadoComoPrograma) run();

export {
    ALLOWLIST,
    ANCHOR_MAP,
    FAMILIES,
    FAMILY_GUIDANCE,
    anchorKey,
    collectFiles,
    run,
    scanFile,
    stripComments,
};
