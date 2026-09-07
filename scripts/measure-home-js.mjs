#!/usr/bin/env node
/**
 * Instrumento canónico del presupuesto de JavaScript del sitio
 * (`PRE-LAUNCH-QA.md` §4). Hasta el 2026-09-01 vivía como un `node -e` suelto
 * escrito a mano en cada medición; que dos personas midieran "lo mismo"
 * dependía de que recordaran los mismos parámetros. Aquí queda fijado.
 *
 * QUÉ MIDE: los chunks que cada página del build referencia con
 * `<script src=…>`, comprimidos con **brotli de calidad 11** — que es lo que el
 * hosting sirve de verdad, no gzip. Requiere un `out/` ya construido
 * (`pnpm build`); no lo construye por su cuenta, y por eso no está en
 * `pnpm run ci`: el gate corre sin build.
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
 * EL DEFECTO QUE ESTRENÓ EL CANDADO DE GEMELOS, Y POR QUÉ LOS ANTERIORES NO LO
 * VEÍAN (medido el 2026-09-04 sobre el build de `0226846`, servido en local).
 * El censo encontró que `out/index.html` y `out/en.html` —las dos portadas—
 * referenciaban DOS chunks con la misma composición: 17 identificadores de
 * módulo idénticos, 109.716 B crudos cada uno, los mismos cuerpos módulo a
 * módulo. Dentro iba la cáscara del sitio: `Navbar` (con `NavSheet`,
 * `ThemeToggle`, `LanguageSelector`), `Footer`, `Logo`, `Typography`,
 * `VisuallyHidden`, `BrandName`, `SectionBeam`, `useReveal`, `useDocumentMeta`,
 * `links`, `NAV_GROUPS` y las constantes del arte del hero. Uno
 * (`3u03_w22jspj8.js`) lo pedían las ocho páginas del build; el otro
 * (`04mie4ud-_mu2.js`, 28.413 B brotli) solo las dos portadas, y era
 * íntegramente redundante.
 *
 * Ninguno de los candados de presupuesto, duplicación y delta podía cantarlo, y
 * merece la pena escribir por qué: el total cabía en el presupuesto, la
 * duplicación estaba DECLARADA como deuda (los 116.368 B crudos de entonces) y
 * el delta por chunk decía `==` en las dos filas, porque las dos existían ya el
 * día en que se tomó la línea base. Una copia íntegra de un chunk no es un caso
 * extremo de duplicación de módulos: es una categoría propia, y solo se ve
 * comparando FIRMAS.
 *
 * LA CAUSA RAÍZ, y está arreglada. `Navbar` y `Footer` los montaban a la vez
 * `app/HomeRoute.tsx`, `app/not-found.tsx` (hoy `app/NotFoundRoute.tsx`) y los
 * dos envoltorios legales, cada
 * uno abriendo su propia frontera de servidor a cliente. El árbol de la 404
 * viaja en el manifiesto de cliente de TODAS las páginas, así que la cáscara
 * quedaba en dos grupos de chunks hermanos y Turbopack la emitía dos veces —
 * exactamente la misma familia de defecto que la ola G ya pagó con el tema y
 * el i18n, y exactamente lo que advertía la regla escrita en el docblock de
 * `app/providers.tsx`: lo que monten a la vez una rama de idioma y la 404 tiene
 * que colgar de un ancestro común. Desde el 2026-09-04 la cáscara la monta
 * `LocaleShell`, que es ese ancestro. Medido sobre el mismo árbol, dos builds
 * consecutivos: **284.559 → 253.853 B brotli descargados (−30.706 B)**, la
 * duplicación de módulos de 116.368 a 4.264 B crudos (de 21 módulos a 5, todos
 * del runtime de Next), y cero pares de chunks con la misma firma. Esas dos
 * cifras son las de AQUEL día; las vigentes están en el docblock de
 * `DECLARED_DUPLICATE_RAW_BYTES` y bajaron a 3.266 B en 3 módulos con la ola S.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AMPLIACIÓN 2026-09-04 (ola R, frente del censo del bundle): LAS OCHO PÁGINAS
 * Y EL SELLO DEL CENSO. Dos defectos medidos por el verificador de la ola Q,
 * los dos reproducidos aquí antes de tocar nada.
 *
 * DEFECTO 1 — EL CENSO SOLO MIRABA `out/index.html`. `readChunks(outDir,
 * entry = "index.html")` se llamaba sin argumentos y el resultado se sellaba
 * como `origen: "out/index.html"`. `en.html`, las dos legales en español, las
 * dos en inglés y las dos variantes de la 404 no entraban en NINGÚN censo. Y la
 * cáscara duplicada que se acaba de eliminar vivía precisamente en la relación
 * ENTRE páginas —un chunk que pedían las ocho y una copia íntegra suya que solo
 * pedían dos—, así que medir una sola página era medir justo donde ese defecto
 * no se ve. Medido el 2026-09-04 sobre el build de `9018c18`: las ocho páginas
 * referencian **19 ficheros de chunk distintos** (18 descargados más el
 * polyfill), de los cuales la home solo toca 15. Las cuatro cifras por página:
 * `index.html` y `en.html` 253.853 B en 15 chunks; las cuatro legales 222.915 B
 * en 15; `404.html` y `_not-found.html` 204.515 B en 13. Tres chunks —el arte
 * del hero, el cuerpo de las legales y los dos documentos legales— no aparecen
 * en la home o no aparecen fuera de ella.
 *
 * QUÉ SE COMPARA POR PÁGINA Y QUÉ ENTRE PÁGINAS, que es la decisión de diseño
 * de este frente — y desde el 2026-09-06 cada escala tiene su PROPIA pareja de
 * cotas, que es lo que impide que sancionar una afloje la otra:
 *
 *   · POR PÁGINA se comparan las magnitudes que un visitante concreto paga al
 *     abrir ESA url: el presupuesto, la duplicación de módulos dentro de la
 *     página, los chunks gemelos dentro de la página y el delta de cada chunk
 *     contra la fila que el censo le asigna. Las cotas declaradas
 *     (`DECLARED_DUPLICATE_*`, `DECLARED_TWIN_*`) se evalúan página a página.
 *     Medido el 2026-09-06 sobre el build de la ola S: las ocho páginas llevan
 *     los MISMOS 3 módulos repetidos / 3.266 B crudos —los del runtime de
 *     Next— y el mismo y único grupo de gemelos suyo, 1.271 B brotli. Ya no hay
 *     una "peor página" distinta de las demás: la cota vale igual para las
 *     ocho.
 *   · ENTRE PÁGINAS se compara lo que ninguna página ve sola: la UNIÓN de los
 *     ficheros de chunk de las ocho, agrupados por firma, contra
 *     `DECLARED_UNION_TWIN_BROTLI_BYTES` y `DECLARED_UNION_TWIN_GROUPS`. Ahí es
 *     donde se detecta que dos ficheros DISTINTOS llevan la misma composición
 *     aunque ninguna página los pida a la vez — el caso que la home, por sí
 *     sola, no puede cantar. Desde la ola S la unión tiene CUATRO grupos y
 *     45.461 B brotli redundantes: el del runtime de Next y tres que estrenó la
 *     partición del sitio en tres raíces de documento. El porqué, el coste y
 *     quién lo paga están escritos en el docblock de
 *     `DECLARED_UNION_TWIN_BROTLI_BYTES`.
 *
 * Y LAS DOS PAREJAS ESTÁN SEPARADAS A PROPÓSITO. Con una sola, sancionar los
 * 45.461 B de la unión habría subido ×35 el listón DENTRO de cada página: un
 * gemelo nuevo de 20.000 B en una misma página —que es la forma exacta del
 * defecto de la cáscara que costó cinco olas descubrir— habría pasado en verde.
 * Con dos, sigue fallando, y eso tiene su caso propio en
 * `scripts/measure-home-js.test.mjs`.
 *
 * DEFECTO 2 — EL RECORTE COORDINADO DEL CENSO PASABA EN VERDE. Es el grave, y
 * es el que invalidaba la garantía entera. El commit `571b6df` afirmaba que
 * «borrar una fila del JSON se pone en rojo desde dos sitios, uno de ellos sin
 * `out/`». La primera mitad no se sostenía, y así se reprodujo el 2026-09-04:
 * borrando la última fila del censo, restando su peso al total declarado y
 * bajando `BASELINE_CHUNKS` de 15 a 14 en el mismo gesto, la suite completa dio
 * `Tests 30 passed | 1 skipped (31)` con código de salida 0 en el escenario de
 * CI — que es el escenario sin `out/`, donde `describe.skipIf` salta el bloque
 * de integración. El único rojo salía del bloque que necesita el build, y ése
 * en CI no corre.
 *
 * LA CAUSA RAÍZ, dicha con precisión: la ÚNICA atadura de extensión que corría
 * sin build comparaba dos números que el editor controla en el MISMO gesto —el
 * número de filas del JSON y la constante del script que dice cuántas debe
 * haber—. Una atadura que se satisface ajustando la misma constante que cuenta
 * no es una atadura. Para que lo sea, el censo tiene que derivarse de algo que
 * quien recorta no pueda ajustar leyendo el fichero.
 *
 * CÓMO SE CIERRA, en tres capas que hay que satisfacer a la vez:
 *
 *   1. **El censo es sobredeterminado.** Cada página declara a qué filas de la
 *      tabla de chunks apunta (por ÍNDICE, no por nombre) y cuánto pesa su JS
 *      descargado. Borrar una fila deja índices fuera de rango en las páginas
 *      que la citaban y, si se renumeran, descuadra la suma declarada de cada
 *      una de ellas. Ya no es un número: son ocho sumas y dieciocho filas
 *      referenciadas.
 *   2. **La atadura va en las dos direcciones.** `BASELINE_CHUNKS` y
 *      `BASELINE_PAGES` siguen ahí, así que el censo tampoco puede encoger
 *      dejando la constante quieta; y además ninguna fila puede quedar huérfana
 *      (una fila que ninguna página cita es una fila inventada) ni ninguna
 *      página puede citar un índice repetido.
 *   3. **El sello.** `BASELINE_DIGEST` es el resumen SHA-256 del censo entero,
 *      canonicalizado. No se puede satisfacer leyendo el JSON ni ajustando una
 *      constante que se vea: hay que CALCULARLO, y el único productor
 *      documentado del sello es `--update-baseline`, que deriva el censo del
 *      `out/` real. Un censo recortado a mano y luego resellado ya no es un
 *      recorte silencioso: es un build nuevo o una manipulación explícita.
 *
 * LÍMITE DECLARADO, y desde el 2026-09-05 CERRADO EN LOS DOS PIPELINES: en un
 * gate que corre SIN build no existe verdad de referencia contra la que
 * contrastar el censo, así que ninguna comprobación local puede distinguir «el
 * censo encogió porque el build encogió» de «alguien lo recortó y volvió a
 * sellarlo ejecutando el sellador». Lo que estas tres capas garantizan POR SÍ
 * SOLAS es que el recorte deje de ser posible **en silencio**: cualquier camino
 * a verde pasa por regenerar el sello, y regenerar el sello sin `out/` no está
 * soportado. Lo que cierra el caso del todo es comparar el censo contra el
 * artefacto, y eso ya no depende de que la máquina tenga un `out/` a mano:
 * `.github/workflows/ci.yml` ejecuta `pnpm build` y `pnpm measure:js` como dos
 * pasos propios detrás del gate, y el `command` de `netlify.toml` encadena los
 * tres (`pnpm run ci && pnpm build && pnpm measure:js`). Un censo recortado y
 * resellado a mano sigue pasando un `pnpm run ci` local, pero cae en CI y en el
 * despliegue contra las dieciocho filas reales.
 *
 * LO QUE SIGUE SIN VERLO, dicho para que nadie lea aquí más garantía de la que
 * hay: un `pnpm run ci` local SIN build. Ahí solo corren los tres candados que
 * no necesitan `out/` y el bloque de integración de
 * `scripts/measure-home-js.test.mjs` se salta, exactamente igual que antes. Lo
 * que cambia es que ese verde ya no es la última palabra: el mismo recorte cae
 * en el siguiente push y en el siguiente despliegue. Que esos dos pasos sigan
 * existiendo, y en ese orden, lo ata `scripts/build-pipeline.test.mjs`, que sí
 * corre dentro del gate.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AMPLIACIÓN 2026-09-06 (ola S): DOS PAREJAS DE COTAS DE GEMELOS, PORQUE EL
 * SITIO PASÓ A TENER TRES RAÍCES DE DOCUMENTO.
 *
 * QUÉ CAMBIÓ EN EL PRODUCTO. El P1 número 1 de la crítica externa #19 era un
 * incumplimiento de WCAG 3.1.1 (nivel A): `/en` servía `<html lang="es">`
 * porque una única raíz solo puede hornear un `lang`. Para hornearlo por ruta,
 * el sitio se partió en tres root layouts —`app/(es)/layout.tsx`,
 * `app/en/layout.tsx` y `app/global-not-found.tsx`—.
 *
 * QUÉ CAMBIÓ EN EL BUNDLE, medido sobre el build de ese árbol. Turbopack
 * reparte los chunks POR RAÍZ, así que la entrada `/_not-found` deja de
 * compartirlos con las seis páginas reales: aparecen TRES grupos de chunks
 * gemelos nuevos (21.290 + 14.111 + 8.789 B brotli) que sí llevan código del
 * repo —la instancia de i18next; `Button`/`BrandName`/`Logo`;
 * `VisuallyHidden`/`DEFAULT_LOCALE`/`EN_ROUTES`—, y con el grupo preexistente
 * de Next la unión pasa a 45.461 B en cuatro grupos.
 *
 * POR QUÉ NO ES UN EMPEORAMIENTO POR PÁGINA, que es la distinción entera: no
 * hay ninguna página que engorde de forma apreciable. Medido sobre el BUILD
 * FINAL de la ola (el que sella la línea base vigente) contra la línea base
 * anterior, la de la ola R: la 404 sube 90 B (204.238 → 204.328), las cuatro
 * legales bajan 1.256 (222.354 → 221.098) y las dos portadas bajan 1.877
 * (252.286 → 250.409), que es donde queda el presupuesto de la home, con
 * 39.591 B libres. El coste de los 45 KB lo paga solo quien carga una 404 Y
 * una página real en la misma sesión, y lo paga en fragmentación de caché, no
 * en peso de descarga de ninguna url.
 *
 * (Estas cifras se corrigieron el 2026-09-06 tras la verificación de la ola:
 * las anteriores —404 +115 B, legales −1.252, portadas −1.925, home 250.361
 * con 39.639 libres— eran las del build INTERMEDIO con el que se escribió este
 * bloque, y el censo se regeneró después sobre el build final sin actualizarlas.
 * Un argumento que sostiene una deuda de 45 KB no puede citar el artefacto
 * equivocado.)
 *
 * POR QUÉ EL CANDADO NECESITABA DOS PAREJAS. Hasta aquí, `DECLARED_TWIN_*` se
 * usaba a la vez para el candado por página y para el de la unión. Sancionar
 * los 45.461 B en esa única pareja habría subido el listón de la página de
 * 1.271 a 45.461 B: el mismo gesto que documenta una deuda entre páginas habría
 * abierto ×35 la puerta por la que entró la cáscara duplicada de la ola Q. Por
 * eso ahora son dos parejas independientes y el candado de cada escala usa la
 * suya, y solo la suya.
 *
 * QUÉ VIGILA, en NUEVE candados independientes:
 *
 *   1. **Presupuesto**, página a página: el JS descargado de cada una de las
 *      ocho cabe en `BUDGET_BYTES`.
 *   2. **Duplicación de módulos** dentro de cada página, contra
 *      `DECLARED_DUPLICATE_RAW_BYTES` y `DECLARED_DUPLICATE_MODULES`.
 *   3. **Delta por chunk** contra las filas que el censo asigna a esa página: un
 *      chunk conocido que crece más de `CHUNK_GROWTH_LIMIT_BYTES` brotli falla,
 *      y un chunk cuya firma no está entre las suyas falla también.
 *   4. **Chunks gemelos dentro de la página**, contra
 *      `DECLARED_TWIN_BROTLI_BYTES` y `DECLARED_TWIN_GROUPS` (hoy 1.271 B en
 *      1 grupo, el reparto interno de Next).
 *   5. **Chunks del censo que la página ya no emite**: falla en vez de
 *      imprimirse como nota.
 *   6. **La tabla de chunks tiene el tamaño declarado**: `BASELINE_CHUNKS`.
 *   7. **Chunks gemelos en la UNIÓN de las ocho páginas**, que es la relación
 *      donde vivía la cáscara duplicada y donde una sola página no ve nada.
 *      Contra `DECLARED_UNION_TWIN_BROTLI_BYTES` y `DECLARED_UNION_TWIN_GROUPS`
 *      (hoy 45.461 B en 4 grupos), que son constantes DISTINTAS de las del
 *      candado 4 a propósito: aflojar esta escala no afloja aquélla.
 *   8. **El censo de páginas es coherente y tiene el tamaño declarado**:
 *      `BASELINE_PAGES`, rutas únicas, índices en rango y sin repetir, sin filas
 *      huérfanas, y la suma declarada de cada página igual a la suma real de las
 *      filas que cita.
 *   9. **El sello**: `BASELINE_DIGEST`.
 *
 * De los nueve, los candados 6, 8 y 9 NO necesitan `out/` — corren en cualquier
 * `pnpm run ci`, con build o sin él, a través de
 * `scripts/measure-home-js.test.mjs`. Los otros seis necesitan el build, y
 * desde el 2026-09-05 lo tienen siempre en los dos pipelines: CI construye y
 * ejecuta `pnpm measure:js` detrás del gate, y el `command` de Netlify hace lo
 * mismo antes de publicar. El único sitio donde los seis siguen sin correr es
 * un `pnpm run ci` local sin build.
 *
 * SALIDA: tabla por chunk de la home con su delta, censo por página, censo de
 * gemelos de la unión, censo de duplicación, los dos totales (descargado y HTML
 * completo) y el veredicto. Código de salida 1 si falla cualquiera de los nueve
 * candados.
 *
 * REGENERAR LA LÍNEA BASE: `node scripts/measure-home-js.mjs --update-baseline`
 * tras un `pnpm build`, y SOLO después de haber mirado el delta y entendido
 * por qué sube. La línea base es un acta de lo medido, no un botón para
 * callar al instrumento. El comando imprime el sello nuevo y las dos
 * constantes de extensión: hay que pegarlos a mano en este fichero, a
 * propósito — que el sello no se refresque solo es lo que hace que un cambio de
 * censo aparezca siempre en el diff del script y no solo en el del JSON. El
 * JSON se escribe con `JSON.stringify`, que no coincide con el estilo de
 * Prettier para arrays cortos, así que después hay que pasar
 * `pnpm exec prettier --write scripts/home-js-baseline.json` o
 * `pnpm check-format` lo listará como diferente. El sello se calcula sobre el
 * CONTENIDO ya interpretado, así que reformatear el JSON no lo mueve.
 *
 * POR QUÉ ESTE SCRIPT SIGUE FUERA DE `pnpm run ci`, dicho explícitamente para
 * que nadie lo "arregle" sin leer: necesita un `out/` construido y el gate
 * corre sin build — el gate va ANTES, tanto en CI como en Netlify. Donde SÍ se
 * ejecuta es DESPUÉS del build, en los dos pipelines: en
 * `.github/workflows/ci.yml` como paso propio detrás de `pnpm build`, y en
 * `netlify.toml` como tercer eslabón del `command`. Meterlo dentro de
 * `pnpm run ci` lo único que conseguiría es que el gate reventara en toda
 * máquina sin `out/`. Lo que sí corre en el gate es
 * `scripts/measure-home-js.test.mjs`, que ejercita esta lógica con chunks
 * sintéticos y audita el censo versionado entero; y cuando la máquina donde
 * corre tiene un `out/` a mano, ese mismo test compara el build real contra él.
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
import {
    readFileSync,
    existsSync,
    readdirSync,
    statSync,
    writeFileSync,
} from "node:fs";
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

/**
 * Bytes CRUDOS que hoy viajan repetidos entre chunks descargados de UNA MISMA
 * página (ver docblock).
 *
 * ACTUALIZADO EL 2026-09-06 (ola S), y a la baja: hasta la partición del sitio
 * en tres raíces, la cota era la de la peor de las ocho —las dos portadas, con
 * 5 módulos repetidos y 4.264 B crudos; las legales 4 / 4.027 y las dos 404
 * 3 / 3.266—. Con la 404 en su propia raíz, esa asimetría desaparece: las OCHO
 * páginas llevan exactamente los mismos 3 módulos repetidos, 3.266 B crudos,
 * los del runtime de Next. Ya no hay una peor página que fije la cota; la cota
 * es la misma para todas, y por eso baja.
 *
 * El censo versionado declara estas dos mismas cifras
 * (`duplicacionCrudaBytes`, `modulosDuplicados`) y `auditBaseline` las compara
 * contra estas constantes sin necesitar `out/`: si una de las dos se mueve sin
 * la otra, el gate lo canta.
 */
export const DECLARED_DUPLICATE_RAW_BYTES = 3_266;

/**
 * Módulos distintos que hoy aparecen en más de un chunk de la misma página:
 * los tres del runtime de Next. Eran 5 en las portadas hasta el 2026-09-06.
 */
export const DECLARED_DUPLICATE_MODULES = 3;

/**
 * COTA POR PÁGINA. Deuda de chunks gemelos DENTRO de una misma página, que es
 * la que un visitante concreto paga al abrir una url.
 *
 * QUÉ ES, medido el 2026-09-04 sobre el build ya arreglado. Tras subir la
 * cáscara al ancestro común quedan DOS chunks idénticos de tres módulos
 * —`3036pivcxrs_-.js` y `01v6e5k6mmr1y.js`— y lo que llevan dentro no es código
 * de este proyecto: son módulos internos de Next (el que exporta `DecodeError`,
 * `execOnce`, `getURL`, `isAbsoluteUrl`… de `next/dist/shared/lib/utils`, más
 * dos ayudantes suyos). No hay ningún componente, hook ni constante del repo en
 * ellos, así que no hay ningún punto de montaje que mover para unirlos: es
 * reparto interno del framework. Las ocho páginas del build los piden a la vez.
 *
 * Y la cifra fue una MEJORA, no un empeoramiento que se legaliza: antes del
 * arreglo esos mismos tres módulos viajaban en TRES chunks (`01v6e5k6mmr1y`,
 * `3mf3ek8ecbzi9` y `3wulsif4rqayb`), y el módulo mayor de los tres gastaba
 * 4.638 B crudos repetidos; hoy son dos copias y 2.319 B. Lo que cambia es que
 * ahora se ven, porque las dos copias caen en chunks de composición idéntica.
 *
 * DE 1.261 A 1.271 B EL 2026-09-06 (+10 B): la ola S renumeró los
 * identificadores de módulo al partir el sitio en tres raíces, y el mismo
 * contenido comprime 10 B peor. Sigue siendo UN grupo, sigue siendo el mismo
 * reparto interno de Next, sigue sin llevar código del repo. No es deuda nueva:
 * es la misma deuda con otro número.
 *
 * Se declara con dos ataduras, no una: los bytes Y el número de grupos. Con
 * solo los bytes, dos gemelos nuevos y pequeños pasarían por debajo del listón.
 *
 * ESTA COTA NO SE TOCA PARA SANCIONAR NADA DE LA UNIÓN. Lo que ocurre entre
 * páginas tiene sus propias constantes, `DECLARED_UNION_TWIN_*`, justo debajo.
 */
export const DECLARED_TWIN_BROTLI_BYTES = 1_271;

/**
 * Grupos de chunks de composición idéntica que hoy admite el candado DENTRO de
 * una misma página. Uno: el del runtime de Next.
 */
export const DECLARED_TWIN_GROUPS = 1;

/**
 * COTA ENTRE PÁGINAS. Deuda de chunks gemelos en la UNIÓN de las ocho páginas
 * del build: dos ficheros distintos con la misma composición aunque NINGUNA
 * página los pida a la vez. Es una pareja de constantes SEPARADA de
 * `DECLARED_TWIN_*` a propósito, y el porqué de esa separación está al final de
 * este bloque.
 *
 * QUÉ HAY DENTRO, medido el 2026-09-06 sobre el build de la ola S: CUATRO
 * grupos, 45.461 B brotli redundantes.
 *
 *   · `05te701_-a7aa.js` = `1pw8w2ajfzxfa.js` — 11 módulos, 21.290 B (la
 *     instancia de i18next).
 *   · `2kegcqgb8gaxe.js` = `3683r5v73j_5u.js` — 8 módulos, 14.111 B
 *     (`Button`, `BrandName`, `Logo`).
 *   · `3twz4s71azlt7.js` = `17o_rdrl--fsv.js` — 9 módulos, 8.789 B
 *     (`VisuallyHidden`, `DEFAULT_LOCALE`, `EN_ROUTES`).
 *   · `01v6e5k6mmr1y.js` = `3036pivcxrs_-.js` — 3 módulos, 1.271 B (el reparto
 *     interno de Next, el mismo de la cota por página).
 *
 * POR QUÉ EXISTEN LOS TRES NUEVOS, y sí llevan código del repo. La ola S partió
 * el sitio en tres root layouts —`app/(es)/layout.tsx`, `app/en/layout.tsx` y
 * `app/global-not-found.tsx`— para hornear `<html lang>` por ruta, que es lo
 * que exige WCAG 3.1.1 (nivel A) y era el P1 número 1 de la crítica externa
 * #19. Turbopack reparte los chunks POR RAÍZ, así que la entrada `/_not-found`
 * deja de compartirlos con las seis páginas reales y el mismo código se emite
 * dos veces, una por familia de raíz.
 *
 * QUÉ CUESTA Y A QUIÉN. A ninguna página, por sí sola. Sobre el build final de
 * la ola, contra la línea base de la ola R: la 404 sube 90 B, las legales bajan
 * 1.256 y las portadas 1.877, y la home queda en 250.409 B brotli con 39.591
 * libres de presupuesto. Los 45.461 B los paga solo quien carga una 404 Y una página real
 * en la misma sesión, y los paga en fragmentación de caché —código que antes
 * venía de una entrada compartida y ahora se descarga dos veces—, no en peso de
 * ninguna url.
 *
 * POR QUÉ SE ACEPTA (decisión del orquestador, 2026-09-06, bajo el objetivo del
 * dueño de cero P1). Un incumplimiento de nivel A no se cambia por 45 KB de
 * fragmentación de caché en un camino de navegación raro. La alternativa —una
 * sola raíz— vuelve a compartir estos chunks, pero una sola raíz solo puede
 * hornear un `lang`, que es exactamente el defecto que se acaba de cerrar. La
 * decisión queda declarada aquí con su cifra, su fecha y su porqué, y es
 * REVERSIBLE: revertir la partición devuelve los 45 KB a la caché compartida y
 * devuelve también el P1.
 *
 * POR QUÉ NO SE TOCÓ LA COTA POR PÁGINA, que es lo que hace que sancionar esto
 * no sea aflojar. Hasta el 2026-09-06 las dos escalas compartían constantes:
 * declarar estos 45.461 B habría subido el listón DENTRO de cada página de
 * 1.271 a 45.461 B, ×35, y un gemelo nuevo de 20.000 B en una sola página
 * —que es la forma exacta de la cáscara duplicada que costó cinco olas
 * descubrir— habría pasado en verde. Con las dos parejas separadas, la cota por
 * página sigue en 1.271 B y ese gemelo sigue fallando; hay un caso dedicado a
 * ese escenario en `scripts/measure-home-js.test.mjs`.
 */
/*
 * ENMIENDA 2026-09-07 (ola T): 45.461 -> 45.919 B, +458. El grupo gemelo de
 * la cáscara pasa de 9 módulos y 8.789 B a 12 módulos y 9.247 B porque la
 * ola añade a esa misma cáscara el observador del breakpoint de la hoja
 * móvil y el refinamiento del punto de lectura del selector de idioma. Es
 * el MISMO grupo creciendo con código nuevo, no un grupo nuevo: el recuento
 * sigue en cuatro. Ninguna página engorda por encima del presupuesto (hogar
 * 251.463 B, 38.537 libres).
 */
export const DECLARED_UNION_TWIN_BROTLI_BYTES = 45_919;

/** Grupos de chunks de composición idéntica que hoy admite la UNIÓN. */
export const DECLARED_UNION_TWIN_GROUPS = 4;

/**
 * Filas de la tabla de chunks del censo versionado: la UNIÓN de los ficheros
 * de chunk descargados que referencian las ocho páginas del build. NO es un
 * número decorativo, es una de las tres ataduras de extensión del censo — pero
 * por sí sola NO basta, y eso está medido: ver `BASELINE_DIGEST` y el apartado
 * "DEFECTO 2" del docblock. El delta por chunk se evalúa recorriendo esta
 * tabla, y una comprobación que recorre una lista se puede dejar en verde
 * ENCOGIENDO la lista.
 */
export const BASELINE_CHUNKS = 21;

/**
 * Páginas HTML que el build emite y que el censo declara. La segunda atadura de
 * extensión: sin ella, el censo se podría dejar en verde borrando una página
 * entera en vez de una fila de chunk.
 */
export const BASELINE_PAGES = 8;

/**
 * SELLO DEL CENSO: resumen SHA-256 (16 hex) del contenido de
 * `scripts/home-js-baseline.json`, canonicalizado con las claves ordenadas.
 *
 * Es la capa que cierra el recorte coordinado. `BASELINE_CHUNKS` y
 * `BASELINE_PAGES` se pueden satisfacer LEYENDO el fichero recortado y bajando
 * el número; este no. Para dejarlo en verde hay que CALCULARLO, y el único
 * productor documentado es `--update-baseline`, que deriva el censo del `out/`
 * real. El límite de lo que garantiza está escrito en el docblock, en "LÍMITE
 * DECLARADO": impide el recorte SILENCIOSO, no el recorte deliberado de quien
 * ejecute el sellador a sabiendas.
 *
 * Se recalcula con `--update-baseline` y se pega a mano aquí. Que no se
 * refresque solo es deliberado: obliga a que todo cambio de censo aparezca
 * también en el diff de este fichero.
 */
export const BASELINE_DIGEST = "1dabb30b8c2bc0cf";

/** La página cuyo total es el que cita el presupuesto de la crítica externa. */
export const HOME_PAGE = "index.html";

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
 * Las páginas HTML que el build emite, en orden estable y con separador `/`
 * en todas las plataformas. `_next/` queda fuera: ahí viven los assets, no las
 * páginas. Se descubren leyendo el directorio en vez de escribirse a mano
 * porque una lista escrita a mano es exactamente la clase de censo que encoge
 * sin que nadie lo note.
 */
export function listPages(outDir = OUT_DIR) {
    const walk = (dir, base) => {
        const found = [];
        for (const name of readdirSync(dir)) {
            if (name === "_next") continue;
            const full = path.join(dir, name);
            if (statSync(full).isDirectory()) {
                found.push(...walk(full, `${base}${name}/`));
            } else if (name.endsWith(".html")) {
                found.push(`${base}${name}`);
            }
        }
        return found;
    };
    if (!existsSync(outDir)) {
        throw new Error(
            `No existe ${outDir}. Este instrumento mide el build real: ejecuta ` +
                `\`pnpm build\` antes.`,
        );
    }
    return walk(outDir, "").sort();
}

/**
 * Lee del disco los chunks que una página referencia. Devuelve el texto sin
 * medir nada: quien mide es `measureChunks`, que así se puede ejercitar con
 * chunks sintéticos sin tocar el disco.
 */
export function readChunks(outDir = OUT_DIR, entry = HOME_PAGE) {
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

/**
 * Pares de chunks DESCARGADOS con la MISMA composición de módulos.
 *
 * Este es el defecto concreto que nadie vio durante cinco olas: la portada
 * referenciaba dos chunks con los mismos 17 identificadores de módulo y 109.716
 * B crudos cada uno, y ninguno de los candados anteriores lo miraba. El total
 * cabía en el presupuesto, la duplicación estaba declarada como deuda y el
 * delta por chunk decía `==` en las dos filas, porque las dos existían desde el
 * primer día en que se tomó la línea base. Una copia íntegra de un chunk no es
 * un caso extremo de duplicación de módulos: es una categoría propia, y se
 * detecta comparando FIRMAS, no contando módulos repetidos.
 *
 * Se agrupa por firma y se devuelve un grupo por cada firma con dos o más
 * chunks. El polyfill `nomodule` queda fuera, como en todo lo demás: no se
 * descarga.
 *
 * Sirve para las dos escalas del censo, y por eso no sabe nada de páginas: se
 * le pasan los chunks de UNA página para el candado por página, o la unión de
 * las ocho para el candado entre páginas.
 */
export function findTwinChunks(chunks) {
    const byFingerprint = new Map();
    for (const chunk of chunks) {
        if (chunk.legacyOnly) continue;
        /*
         * Un chunk sin módulos reconocibles (el runtime de Turbopack, por
         * ejemplo) comparte la firma `sin-modulos` con cualquier otro igual de
         * opaco, y eso no es una copia: es que el instrumento no sabe mirar
         * dentro. Declararlo gemelo sería inventar un hallazgo.
         */
        if (chunk.moduleIds.length === 0) continue;
        if (!byFingerprint.has(chunk.fingerprint)) {
            byFingerprint.set(chunk.fingerprint, []);
        }
        byFingerprint.get(chunk.fingerprint).push(chunk);
    }
    return [...byFingerprint.values()]
        .filter((group) => group.length > 1)
        .map((group) => ({
            fingerprint: group[0].fingerprint,
            modules: group[0].modules.length,
            names: group.map((chunk) => chunk.name),
            /* Lo que sobra: todas las copias menos la que el sitio necesita. */
            wastedBrotliBytes: group
                .slice(1)
                .reduce((acc, chunk) => acc + chunk.brotli, 0),
        }))
        .sort((a, b) => b.wastedBrotliBytes - a.wastedBrotliBytes);
}

/**
 * Mide cada chunk una sola vez. Va separado de `summarize` porque el brotli de
 * calidad 11 sobre 19 ficheros no se puede repetir ocho veces, una por página:
 * el sitio comparte casi todos sus chunks entre páginas, así que se miden en la
 * unión y cada página se resume seleccionando de ahí.
 */
export function measureChunks(rawChunks) {
    return rawChunks.map((chunk) => {
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
}

/** Totales, censo de gemelos y censo de duplicación de un conjunto de chunks ya medidos. */
export function summarize(chunks) {
    const sum = (list) => list.reduce((acc, chunk) => acc + chunk.brotli, 0);
    const downloaded = chunks.filter((chunk) => !chunk.legacyOnly);
    const legacy = chunks.filter((chunk) => chunk.legacyOnly);
    const duplicates = findDuplicateModules(chunks);
    return {
        chunks,
        downloadedBytes: sum(downloaded),
        legacyBytes: sum(legacy),
        twins: findTwinChunks(chunks),
        duplicates,
        duplicateRawBytes: duplicates.reduce(
            (acc, duplicate) => acc + duplicate.wastedRawBytes,
            0,
        ),
    };
}

/** Mide y resume de una vez. La forma que consumen los casos sintéticos del test. */
export function analyze(rawChunks) {
    return summarize(measureChunks(rawChunks));
}

/**
 * El sitio entero: las ocho páginas, cada una con su resumen propio, más la
 * UNIÓN de los ficheros de chunk distintos que referencian entre todas. Cada
 * fichero se lee y se comprime UNA vez.
 */
export function analyzeSite(outDir = OUT_DIR) {
    const rutas = listPages(outDir);
    const refs = new Map();
    const porNombre = new Map();
    for (const ruta of rutas) {
        const raw = readChunks(outDir, ruta);
        refs.set(
            ruta,
            raw.map((chunk) => chunk.name),
        );
        for (const chunk of raw) {
            if (!porNombre.has(chunk.name)) porNombre.set(chunk.name, chunk);
        }
    }
    const medidos = measureChunks([...porNombre.values()]);
    const porNombreMedido = new Map(
        medidos.map((chunk) => [chunk.name, chunk]),
    );
    return {
        rutas,
        union: summarize(medidos),
        paginas: rutas.map((ruta) => ({
            ruta,
            analysis: summarize(
                refs.get(ruta).map((name) => porNombreMedido.get(name)),
            ),
        })),
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
     * chunks con la misma composición comparten firma —hoy los gemelos del
     * runtime de Next lo hacen— y un `Map` simple haría que el segundo se
     * comparase contra la entrada del primero. Cada chunk actual consume una
     * entrada de su firma, la de tamaño más parecido; lo que sobra al final es
     * lo que desapareció del build.
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

/**
 * La rebanada del censo que corresponde a una página: las filas que declara
 * citar y su total. Es lo que se le pasa a `verdict`, que así sigue siendo una
 * función de UNA página contra SU censo y no sabe nada de las otras siete.
 *
 * Si el censo no declara esa página, devuelve `null` en vez de una rebanada
 * vacía: una rebanada vacía haría que todos sus chunks salieran como
 * desconocidos, un mensaje verdadero pero que no dice lo que pasa.
 */
export function pageBaseline(baseline, ruta) {
    const pagina = (baseline?.paginas ?? []).find(
        (entry) => entry.ruta === ruta,
    );
    if (!pagina) return null;
    return {
        totalDescargadoBrotli: pagina.descargadoBrotli,
        chunks: pagina.refs.map((index) => baseline.chunks[index]),
    };
}

/**
 * Los candados que necesitan el build, sobre UNA página. `problems` vacío =
 * todo en verde.
 *
 * `expectedBaselineChunks` existe para que los casos sintéticos del test puedan
 * ejercitar los candados con una línea base de un chunk sin chocar contra el
 * censo real; el CLI y el bloque de integración pasan siempre el número de
 * filas que el censo asigna a esa página. Y para que este parámetro no se pueda
 * usar como llave para aflojar el censo, la extensión se comprueba otra vez, sin
 * intermediarios y sin `out/`, en `auditBaseline`.
 */
export function verdict(
    analysis,
    baseline,
    expectedBaselineChunks = BASELINE_CHUNKS,
) {
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
    /*
     * CANDADO DE CHUNKS GEMELOS DENTRO DE LA PÁGINA. La deuda del repo se pagó
     * entera el 2026-09-04; lo que queda declarado son los 1.271 B de reparto
     * interno de Next (ver `DECLARED_TWIN_BROTLI_BYTES`). Se comprueban las DOS
     * cotas —bytes y número de grupos— porque cada una deja pasar lo que la
     * otra atrapa: un gemelo grande nuevo sube los bytes sin cambiar el
     * recuento si sustituye al conocido, y dos gemelos diminutos suben el
     * recuento sin llegar al listón de bytes.
     *
     * Y usa `DECLARED_TWIN_*`, NO `DECLARED_UNION_TWIN_*`: la deuda que la ola
     * S declaró entre páginas (45.461 B) no vale como permiso dentro de una
     * página. Sustituir aquí una constante por la otra pone en rojo el caso
     * «un gemelo de 20.000 B dentro de una página» del test.
     */
    const twins = analysis.twins ?? [];
    const twinBytes = twins.reduce(
        (acc, twin) => acc + twin.wastedBrotliBytes,
        0,
    );
    if (
        twinBytes > DECLARED_TWIN_BROTLI_BYTES ||
        twins.length > DECLARED_TWIN_GROUPS
    ) {
        for (const twin of twins) {
            problems.push(
                `los chunks ${twin.names.join(" y ")} tienen la MISMA composición ` +
                    `(${twin.fingerprint}, ${twin.modules} módulos): ` +
                    `${twin.wastedBrotliBytes.toLocaleString("es-ES")} B brotli viajan por duplicado ` +
                    `en la misma página`,
            );
        }
        problems.push(
            `la duplicación de chunks ÍNTEGROS sube a ${twinBytes.toLocaleString("es-ES")} B brotli en ` +
                `${twins.length} grupo(s), por encima de los ${DECLARED_TWIN_BROTLI_BYTES.toLocaleString("es-ES")} B ` +
                `en ${DECLARED_TWIN_GROUPS} grupo(s) ya declarados`,
        );
    }
    /*
     * Un chunk de la línea base que ya no aparece en el build era antes solo
     * una línea informativa por pantalla. Ahora falla: o el chunk se fue de
     * verdad (y entonces la línea base se regenera A MANO, mirando el delta) o
     * alguien borró su fila.
     */
    for (const chunk of comparison.missing) {
        problems.push(
            `la línea base declara un chunk (${chunk.firma}, ${Number(chunk.brotli).toLocaleString("es-ES")} B brotli) ` +
                `que el build ya no emite: el censo encogió sin revisarse`,
        );
    }
    if (baseline && baseline.chunks.length !== expectedBaselineChunks) {
        problems.push(
            `la línea base declara ${baseline.chunks.length} chunks y el script espera ` +
                `${expectedBaselineChunks}: el censo cambió de tamaño sin actualizar \`BASELINE_CHUNKS\``,
        );
    }
    return { comparison, problems, overBudgetBytes: over };
}

/**
 * Serialización canónica del censo: claves ordenadas, sin espacios. Lo que se
 * sella es el CONTENIDO ya interpretado, no el fichero, así que reformatear el
 * JSON con Prettier no mueve el sello — pero cambiar un solo número sí.
 */
export function canonicalize(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

/** Sello del censo: SHA-256 de su forma canónica, recortado a 16 hex. */
export function digestOf(baseline) {
    return createHash("sha256")
        .update(canonicalize(baseline))
        .digest("hex")
        .slice(0, 16);
}

/**
 * AUDITORÍA DEL CENSO SIN BUILD. Estos son los tres candados que corren en CI,
 * donde no hay `out/` que medir, y son los que cierran el recorte coordinado.
 *
 * La idea es que el censo esté SOBREDETERMINADO: la misma información aparece
 * en más de un sitio y las copias tienen que cuadrar entre sí. Borrar una fila
 * de la tabla de chunks deja índices fuera de rango en las páginas que la
 * citaban; renumerar los índices descuadra la suma declarada de cada página; y
 * arreglar también las sumas rompe el sello, que no se puede satisfacer leyendo
 * el fichero. Lo que este bloque NO puede hacer está escrito en el docblock,
 * apartado "LÍMITE DECLARADO".
 */
export function auditBaseline(baseline, options = {}) {
    const {
        expectedChunks = BASELINE_CHUNKS,
        expectedPages = BASELINE_PAGES,
        expectedDigest = BASELINE_DIGEST,
        homePage = HOME_PAGE,
    } = options;
    const problems = [];
    if (!baseline) {
        return ["no hay censo versionado que auditar"];
    }
    const chunks = baseline.chunks ?? [];
    const paginas = baseline.paginas ?? [];

    if (chunks.length !== expectedChunks) {
        problems.push(
            `el censo declara ${chunks.length} chunks y el script espera ${expectedChunks}: ` +
                `la tabla cambió de tamaño sin actualizar \`BASELINE_CHUNKS\``,
        );
    }
    if (paginas.length !== expectedPages) {
        problems.push(
            `el censo declara ${paginas.length} páginas y el script espera ${expectedPages}: ` +
                `el censo de páginas cambió de tamaño sin actualizar \`BASELINE_PAGES\``,
        );
    }
    if (baseline.presupuestoBytes !== BUDGET_BYTES) {
        problems.push(
            `el censo declara un presupuesto de ${baseline.presupuestoBytes} B y el script ` +
                `${BUDGET_BYTES} B`,
        );
    }
    if (baseline.duplicacionCrudaBytes !== DECLARED_DUPLICATE_RAW_BYTES) {
        problems.push(
            `el censo declara ${baseline.duplicacionCrudaBytes} B de duplicación cruda y el ` +
                `script ${DECLARED_DUPLICATE_RAW_BYTES} B`,
        );
    }
    if (baseline.modulosDuplicados !== DECLARED_DUPLICATE_MODULES) {
        problems.push(
            `el censo declara ${baseline.modulosDuplicados} módulos duplicados y el script ` +
                `${DECLARED_DUPLICATE_MODULES}`,
        );
    }

    const citadas = new Set();
    const rutas = new Set();
    for (const pagina of paginas) {
        if (rutas.has(pagina.ruta)) {
            problems.push(`la página ${pagina.ruta} aparece dos veces`);
        }
        rutas.add(pagina.ruta);
        const refs = pagina.refs ?? [];
        if (refs.length !== pagina.chunksDescargados) {
            problems.push(
                `la página ${pagina.ruta} dice referenciar ${pagina.chunksDescargados} chunks y ` +
                    `enumera ${refs.length}`,
            );
        }
        const vistos = new Set();
        let suma = 0;
        let valido = true;
        for (const index of refs) {
            if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= chunks.length
            ) {
                problems.push(
                    `la página ${pagina.ruta} referencia la fila ${index}, que no existe en una ` +
                        `tabla de ${chunks.length}: el censo encogió por debajo de lo que sus ` +
                        `páginas citan`,
                );
                valido = false;
                continue;
            }
            if (vistos.has(index)) {
                problems.push(
                    `la página ${pagina.ruta} referencia dos veces la fila ${index}`,
                );
            }
            vistos.add(index);
            citadas.add(index);
            suma += chunks[index].brotli;
        }
        if (valido && suma !== pagina.descargadoBrotli) {
            problems.push(
                `la página ${pagina.ruta} declara ${pagina.descargadoBrotli} B descargados y las ` +
                    `filas que cita suman ${suma} B: el censo y sus totales no cuadran`,
            );
        }
        if (pagina.descargadoBrotli > BUDGET_BYTES) {
            problems.push(
                `la página ${pagina.ruta} declara ${pagina.descargadoBrotli} B descargados, por ` +
                    `encima del presupuesto de ${BUDGET_BYTES} B`,
            );
        }
    }
    for (let index = 0; index < chunks.length; index++) {
        if (!citadas.has(index)) {
            problems.push(
                `la fila ${index} (${chunks[index].firma}) no la referencia ninguna página: ` +
                    `es una fila huérfana`,
            );
        }
    }

    const home = paginas.find((pagina) => pagina.ruta === homePage);
    if (!home) {
        problems.push(`el censo no declara la página ${homePage}`);
    } else if (baseline.totalDescargadoBrotli !== home.descargadoBrotli) {
        problems.push(
            `el total declarado (${baseline.totalDescargadoBrotli} B) no es el de ${homePage} ` +
                `(${home.descargadoBrotli} B)`,
        );
    }

    const sello = digestOf(baseline);
    if (sello !== expectedDigest) {
        problems.push(
            `el sello del censo es ${sello} y el script espera ${expectedDigest}: el censo se ` +
                `editó sin regenerarlo desde un build (\`--update-baseline\`)`,
        );
    }
    return problems;
}

/**
 * Los nueve candados juntos, sobre el sitio entero. `problems` vacío = todo en
 * verde. Cada problema de página va prefijado con las rutas donde aparece.
 *
 * Los problemas idénticos de varias páginas se agrupan en UNA línea que las
 * enumera, en vez de repetirse una vez por página. No es cosmética: casi todos
 * los chunks del sitio los piden las ocho páginas, así que un solo chunk que
 * engorde imprimía ocho líneas literalmente iguales y enterraba cualquier otro
 * hallazgo debajo. La información de en qué páginas ocurre no se pierde —se
 * enumeran—, y cuando son todas se dice así en vez de listar las ocho.
 */
export function verdictSite(site, baseline, options = {}) {
    const problems = [...auditBaseline(baseline, options)];
    const porPagina = [];
    const porMensaje = new Map();
    for (const pagina of site.paginas) {
        const slice = pageBaseline(baseline, pagina.ruta);
        if (!slice) {
            problems.push(
                `el build emite ${pagina.ruta} y el censo no la declara: página nueva sin revisar`,
            );
            continue;
        }
        const resultado = verdict(pagina.analysis, slice, slice.chunks.length);
        porPagina.push({ ruta: pagina.ruta, ...resultado });
        for (const problem of resultado.problems) {
            if (!porMensaje.has(problem)) porMensaje.set(problem, []);
            porMensaje.get(problem).push(pagina.ruta);
        }
    }
    for (const [mensaje, rutas] of porMensaje) {
        const donde =
            rutas.length === site.paginas.length && rutas.length > 1
                ? `las ${rutas.length} páginas`
                : rutas.join(", ");
        problems.push(`[${donde}] ${mensaje}`);
    }
    for (const ruta of (baseline?.paginas ?? []).map((entry) => entry.ruta)) {
        if (!site.rutas.includes(ruta)) {
            problems.push(
                `el censo declara la página ${ruta} y el build ya no la emite: el censo de ` +
                    `páginas encogió sin revisarse`,
            );
        }
    }
    /*
     * CANDADO ENTRE PÁGINAS. Dos ficheros de chunk distintos con la misma
     * composición son una copia íntegra aunque NINGUNA página los pida a la vez
     * — y ése es justo el caso que un censo de una sola página no puede ver. La
     * cáscara del sitio vivía ahí: un chunk que pedían las ocho páginas y una
     * copia suya que solo pedían las dos portadas.
     *
     * Se mide contra `DECLARED_UNION_TWIN_*`, que desde el 2026-09-06 es una
     * pareja de constantes PROPIA de esta escala. La deuda que declara —los
     * 45.461 B de la partición en tres raíces— no llega en ningún caso al
     * candado por página, que sigue en 1.271 B.
     */
    const twins = site.union.twins ?? [];
    const twinBytes = twins.reduce(
        (acc, twin) => acc + twin.wastedBrotliBytes,
        0,
    );
    if (
        twinBytes > DECLARED_UNION_TWIN_BROTLI_BYTES ||
        twins.length > DECLARED_UNION_TWIN_GROUPS
    ) {
        for (const twin of twins) {
            problems.push(
                `[unión] los chunks ${twin.names.join(" y ")} tienen la MISMA composición ` +
                    `(${twin.fingerprint}, ${twin.modules} módulos): ` +
                    `${twin.wastedBrotliBytes.toLocaleString("es-ES")} B brotli redundantes entre las ` +
                    `páginas del build`,
            );
        }
        problems.push(
            `[unión] la duplicación de chunks ÍNTEGROS entre páginas sube a ` +
                `${twinBytes.toLocaleString("es-ES")} B brotli en ${twins.length} grupo(s), por encima de los ` +
                `${DECLARED_UNION_TWIN_BROTLI_BYTES.toLocaleString("es-ES")} B en ${DECLARED_UNION_TWIN_GROUPS} grupo(s) ya declarados`,
        );
    }
    return { problems, porPagina };
}

/** Línea base versionada, o `null` si todavía no existe. */
export function readBaseline(file = BASELINE_PATH) {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Serializa el acta de una medición para guardarla como censo.
 *
 * La tabla de chunks es la UNIÓN de los ficheros descargados de las ocho
 * páginas, ordenada por peso descendente y, a igualdad de peso, por firma —
 * hay dos chunks de 495 B en este build, así que el desempate no es teórico y
 * sin él el orden (y con él el sello) no sería reproducible. Cada página
 * apunta a sus filas por índice: es lo que ata la tabla a sus consumidores en
 * las dos direcciones.
 */
export function toCensus(site, meta) {
    const filas = site.union.chunks
        .filter((chunk) => !chunk.legacyOnly)
        .sort(
            (a, b) =>
                b.brotli - a.brotli ||
                a.fingerprint.localeCompare(b.fingerprint) ||
                a.name.localeCompare(b.name),
        );
    const indice = new Map(filas.map((chunk, index) => [chunk.name, index]));
    const home = site.paginas.find((pagina) => pagina.ruta === HOME_PAGE);
    return {
        medido: meta.medido,
        origen: meta.origen,
        presupuestoBytes: BUDGET_BYTES,
        totalDescargadoBrotli: home ? home.analysis.downloadedBytes : 0,
        polyfillNomoduleBrotli: home ? home.analysis.legacyBytes : 0,
        duplicacionCrudaBytes: home ? home.analysis.duplicateRawBytes : 0,
        modulosDuplicados: home ? home.analysis.duplicates.length : 0,
        chunks: filas.map((chunk) => ({
            firma: chunk.fingerprint,
            modulos: chunk.modules.length,
            brotli: chunk.brotli,
            crudo: chunk.raw,
            pistas: chunk.hints,
        })),
        paginas: site.paginas.map((pagina) => {
            const descargados = pagina.analysis.chunks.filter(
                (chunk) => !chunk.legacyOnly,
            );
            return {
                ruta: pagina.ruta,
                chunksDescargados: descargados.length,
                descargadoBrotli: pagina.analysis.downloadedBytes,
                polyfillBrotli: pagina.analysis.legacyBytes,
                refs: descargados
                    .map((chunk) => indice.get(chunk.name))
                    .sort((a, b) => a - b),
            };
        }),
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
    let site;
    try {
        site = analyzeSite();
    } catch (error) {
        console.error(error.message);
        process.exit(2);
    }
    const es = (bytes) => bytes.toLocaleString("es-ES");
    const home =
        site.paginas.find((pagina) => pagina.ruta === HOME_PAGE) ??
        site.paginas[0];
    const analysis = home.analysis;

    if (process.argv.includes("--update-baseline")) {
        const census = toCensus(site, {
            medido: new Date().toISOString().slice(0, 10),
            origen: `out/ (${site.rutas.length} páginas)`,
        });
        writeFileSync(
            BASELINE_PATH,
            `${JSON.stringify(census, null, 4)}\n`,
            "utf8",
        );
        console.log(
            `Censo reescrito en ${path.relative(ROOT, BASELINE_PATH)}: ` +
                `${census.chunks.length} chunks en ${census.paginas.length} páginas, ` +
                `${es(census.totalDescargadoBrotli)} B brotli en ${HOME_PAGE}.`,
        );
        console.log(
            "Pega estas tres constantes en scripts/measure-home-js.mjs:",
        );
        console.log(
            `  export const BASELINE_CHUNKS = ${census.chunks.length};`,
        );
        console.log(
            `  export const BASELINE_PAGES = ${census.paginas.length};`,
        );
        console.log(`  export const BASELINE_DIGEST = "${digestOf(census)}";`);
        process.exit(0);
    }

    const baseline = readBaseline();
    const { problems } = verdictSite(site, baseline);
    const slice = pageBaseline(baseline, home.ruta);
    const { comparison } = verdict(
        analysis,
        slice,
        slice ? slice.chunks.length : 0,
    );
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
    console.log(`censo por página (${site.rutas.length} páginas del build):`);
    for (const pagina of site.paginas) {
        const declarada = (baseline?.paginas ?? []).find(
            (entry) => entry.ruta === pagina.ruta,
        );
        const delta = declarada
            ? pagina.analysis.downloadedBytes - declarada.descargadoBrotli
            : null;
        const marca =
            delta === null
                ? "  NUEVA"
                : delta === 0
                  ? "     =="
                  : `${delta > 0 ? "+" : ""}${delta}`.padStart(7);
        console.log(
            `  ${pagina.ruta.padEnd(22)} ${String(pagina.analysis.chunks.filter((chunk) => !chunk.legacyOnly).length).padStart(2)} chunks · ` +
                `${es(pagina.analysis.downloadedBytes).padStart(9)} B br · ${marca} Δ`,
        );
    }

    console.log("—".repeat(72));
    if (site.union.twins.length > 0) {
        console.log(
            `chunks GEMELOS en la unión de las ${site.rutas.length} páginas: ${site.union.twins.length} ` +
                `(deuda declarada entre páginas: ${es(DECLARED_UNION_TWIN_BROTLI_BYTES)} B brotli en ` +
                `${DECLARED_UNION_TWIN_GROUPS} grupo(s); dentro de una misma página la cota sigue en ` +
                `${es(DECLARED_TWIN_BROTLI_BYTES)} B en ${DECLARED_TWIN_GROUPS} grupo(s))`,
        );
        for (const twin of site.union.twins) {
            console.log(
                `  ${twin.names.join(" = ")} · ${twin.modules} mód · ` +
                    `+${es(twin.wastedBrotliBytes)} B brotli redundantes`,
            );
        }
    } else {
        console.log("chunks GEMELOS en la unión: ninguno");
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
        `chunks distintos del sitio: ${site.union.chunks.length} en ${site.rutas.length} páginas`,
    );
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
        console.log(`sello del censo           : ${digestOf(baseline)}`);
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
        console.log("VEREDICTO: los nueve candados en verde.");
    } else {
        console.log("VEREDICTO: FALLA —");
        for (const problem of problems) console.log(`  · ${problem}`);
    }
    process.exit(problems.length === 0 ? 0 : 1);
}
