/*
 * SIN SHEBANG, al contrario que sus dos hermanos de `scripts/`, y no es un
 * descuido: este fichero se IMPORTA desde `check-legal-surfaces.test.mjs`, que
 * corre dentro de Vitest. Vite reescribe todo modulo con un `import()` de
 * especificador VARIABLE -- el que resuelve Playwright aqui abajo -- anteponiendo
 * `import { injectQuery as __vite__injectQuery } from "/@vite/client";` en la
 * PRIMERA linea, delante del shebang, y el parser de Rollup se rompe con
 * "Parse failure: Expected ident" (reproducido; `check-dark-art-weight.mjs` no
 * sufre esto porque no tiene ningun import dinamico). El script se invoca con
 * `node scripts/check-site-surfaces.mjs` o con `pnpm check:site-surfaces`, asi
 * que el shebang no aportaba nada.
 */
/**
 * Candado de TODAS LAS SUPERFICIES DEL SITIO: la portada, los dos documentos
 * legales y la 404, cada una en sus dos idiomas. Ocho en total.
 *
 * SE LLAMABA `check-legal-surfaces.mjs` HASTA EL 2026-09-04, y el nombre era
 * exacto: recorria seis superficies y ninguna era la portada. La critica
 * externa #19 midio lo que eso dejaba fuera -- con la preferencia de tamano de
 * texto al 200 %, la home perdia texto en tres sitios a la vez (el kicker de
 * Story se salia 42,47 px a 320, la tarjeta de Features 72,50 px en la rama
 * inglesa, la diapositiva entera de Journey 23,39 px en la rama oscura) y el
 * candado seguia en verde porque no miraba ahi. Un candado que solo vigila las
 * superficies pequenas del sitio deja sin vigilar la que ve todo el mundo.
 *
 * POR QUE EXISTE. Un evaluador tecnico declaro el hueco original con nombre:
 * "todo lo anterior es sobre / (home); no se repitio el protocolo en
 * /privacidad, /aviso-legal ni la 404". Se cerro aquel, y quedo abierto el
 * simetrico. Ahora las ocho superficies pasan por el MISMO recorrido de
 * teclado, la misma comprobacion de landmarks, el mismo barrido responsive y la
 * misma pasada con las preferencias del sistema activas. Lo que nadie ha medido
 * es lo que aparece como hallazgo nuevo en la ronda siguiente.
 *
 * QUE MIDE, y por que en navegador y no en la suite. Las dieciseis familias de
 * abajo dependen de layout real, de pintado real y de media queries reales:
 * jsdom no hace ninguna de las tres (regla 36 y 44 de RULES.md). Un test de
 * Vitest puede
 * afirmar que una declaracion existe; solo un navegador puede decir que el
 * titulo de la seccion aterriza en top = 88 px con la barra terminando en 64.
 *
 * LA FAMILIA QUINCE, `texto-al-200-por-ciento`, entra el 2026-09-04 con el P1 de
 * zoom de las legales, y conviene saber por que no bastaba la que ya habia. La
 * familia `responsive-sin-desbordamiento` mide
 * `documentElement.scrollWidth > clientWidth`, y ese numero NO SE MUEVE aunque
 * haya contenido fuera del viewport: `GlobalStyles` declara
 * `html, body { overflow-x: clip }` --a proposito, para no crear un contenedor de
 * scroll que rompa el pin de Story--, asi que el desbordamiento se vuelve
 * invisible al instrumento justo cuando se vuelve mas grave, porque deja de ser
 * contenido desplazable y pasa a ser contenido PERDIDO. La familia nueva mide las
 * CAJAS, con la raiz a 32 px (el 200 % de WCAG 1.4.4) emulada con
 * `Page.setFontSizes`, que es la misma palanca que la preferencia real del
 * usuario.
 *
 * LA FAMILIA DIECISEIS, `legibilidad-al-200-por-ciento`, entra el 2026-09-05, y
 * es la que la familia quince no podia ver POR DEFINICION. La quince mide que no
 * se PIERDA contenido, que es la letra de WCAG 1.4.4; el arreglo del mismo dia
 * por la manana llevo esa cuenta a cero px fuera en las ocho superficies y dejo
 * el candado en verde sobre una portada en la que los valores de las tarjetas de
 * Contact median 23,2 px de ancho y el rotulo del CTA salia letra por linea. El
 * texto no se perdia: no se podia leer.
 *
 * TIENE DOS FACTORES, y el segundo entro esa misma tarde porque el primero solo
 * NO separaba las dos poblaciones. Una caja se declara ilegible cuando (a) tiene
 * tres o mas lineas y menos de `MIN_CARACTERES_POR_LINEA` caracteres por linea Y
 * (b) su ancho es menor que `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA` veces el
 * `clientWidth` del documento. El contraejemplo que lo obligo: el rotulo del CTA
 * («Escríbeme» en 3 caracteres por linea, caja de 108 px de 320) es defecto de
 * rellenos anidados y el acento de la nota de cierre del deck de Story («un
 * nuevo comienzo», 3,4 caracteres por linea, caja de 177,61 px de 320) es la
 * fisica de una tipografia de 80 px que WCAG 1.4.4 exige que crezca -- los dos
 * por debajo del primer factor, y lo que los separa es que uno ocupa el 34 % del
 * viewport y el otro el 55 %. La calibracion completa de los dos umbrales, con
 * su tabla de las dos poblaciones, esta en el docblock de
 * `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA` y en el de `probeLegibilidadDeTexto`.
 *
 * MEDIDA CONTRA EL BUILD SERVIDO DE `47d0b4e` (out/ del HEAD, `serve out -l
 * 3000`, Chrome), la familia sale en ROJO sobre la portada en los DOS temas y en
 * VERDE en las seis superficies restantes -- que es la prueba de que ve el
 * defecto real y no cualquier cosa. Las lineas, literales:
 *
 *   tema light, `/` (28 cajas; se citan cuatro de las 28)
 *     NO CUMPLE  con el texto al 200 % (raiz 32 px) hay texto que no se pierde
 *     pero no se puede leer, por debajo de 4 caracteres por linea: 320px
 *     main/span caja de 58.83 px: 9 caracteres en 9 lineas (1 por linea)
 *     ("Escríbeme"); 320px main/p caja de 28 px: 99 caracteres en 61 lineas
 *     (1.62 por linea) ("Opcional: tu propia aplicación de correo"); 320px
 *     main/span caja de 23.16 px: 21 caracteres en 19 lineas (1.11 por linea)
 *     ("discord.gg/CuGhqdG3g3"); 320px main/span caja de 23.19 px: 27
 *     caracteres en 23 lineas (1.17 por linea) ("linkedin.com/in/demosquerag")
 *
 *   tema dark, `/` (13 cajas; se citan tres de las 13)
 *     NO CUMPLE  con el texto al 200 % (raiz 32 px) hay texto que no se pierde
 *     pero no se puede leer, por debajo de 4 caracteres por linea: 320px
 *     main/span caja de 144 px: 24 caracteres en 8 lineas (3 por linea)
 *     ("¿POR QUÉ VOIDTOINFINITE?"); 320px main/span caja de 142.73 px: 47
 *     caracteres en 12 lineas (3.92 por linea) ("“El destino no es el infinito.
 *     El viaje "); 320px main/span caja de 58.83 px: 9 caracteres en 9 lineas
 *     (1 por linea) ("Escríbeme")
 *
 * «NO CUMPLE - 2 incumplimiento(s) en 8 superficies», EXIT=1 en los dos temas.
 * Los defectos son de otros frentes de la misma ola y este fichero no los toca:
 * lo que se entrega aqui es el instrumento que los ve.
 *
 * MEDIDA OTRA VEZ CONTRA EL BUILD SERVIDO DE `5bfe092` --con los rellenos ya
 * arreglados (`inlineSpace`) y con el SEGUNDO FACTOR dentro-- el mismo dia por
 * la tarde. El tema OSCURO pasa a VERDE y el CLARO se queda en rojo solo por el
 * rotulo del CTA, que es el defecto vivo. Las lineas, literales:
 *
 *   tema dark, las ocho superficies
 *     /     legibilidad=0 ilegibles / 334 cajas de 3+ lineas de 1350 con texto
 *           (0 descartadas por caja estirada, 1 por caja ancha)
 *     /en   legibilidad=0 ilegibles / 333 cajas de 3+ lineas de 1350 con texto
 *           (0 descartadas por caja estirada, 3 por caja ancha)
 *     «CUMPLE - 8 superficies, 16 familias, 0 zonas de zoom sancionadas, cero
 *     incumplimientos (tema dark, base http://localhost:3000)», EXIT=0.
 *
 *   Esa 1 y esas 3 «cajas anchas» son EXACTAMENTE los cuatro incumplimientos
 *   que la misma corrida daba sin el segundo factor, medidos antes de tocar
 *   nada: «320px main/span caja de 177.61 px: 17 caracteres en 5 lineas (3.4
 *   por linea) ("un nuevo comienzo")» en `/`, y el mismo acento ingles a 320,
 *   360 y 390 px --«caja de 197.61 px: 15 caracteres en 4 lineas (3.75 por
 *   linea) ("a new beginning")»-- en `/en`. Los cuatro son el acento de la nota
 *   de cierre del deck de Story, que no cabe de otra forma a ese cuerpo.
 *
 *   tema light, `/` y `/en` (3 cajas cada una, todas el rotulo del CTA)
 *     NO CUMPLE  con el texto al 200 % (raiz 32 px) hay texto que no se pierde
 *     pero no se puede leer, por debajo de 4 caracteres por linea en cajas de
 *     menos del 50 % del viewport: 320px main/span caja de 108 px (33.8 % del
 *     viewport): 9 caracteres en 3 lineas (3 por linea) ("Escríbeme"); 768px
 *     main/span caja de 58.83 px (7.7 % del viewport): 9 caracteres en 9 lineas
 *     (1 por linea) ("Escríbeme"); 834px main/span caja de 91.33 px (11 % del
 *     viewport): 9 caracteres en 3 lineas (3 por linea) ("Escríbeme")
 *
 *     NO CUMPLE  ... 320px main/span caja de 108 px (33.8 % del viewport): 11
 *     caracteres en 3 lineas (3.67 por linea) ("Write to me"); 768px main/span
 *     caja de 61.89 px (8.1 % del viewport): 11 caracteres en 7 lineas (1.57
 *     por linea) ("Write to me"); 834px main/span caja de 91.33 px (11 % del
 *     viewport): 11 caracteres en 4 lineas (2.75 por linea) ("Write to me")
 *
 *     «NO CUMPLE - 2 incumplimiento(s) en 8 superficies», EXIT=1.
 *
 *   Un boton de alto fijo con rellenos anidados: su caja se ENCOGE de 108 px a
 *   58,83 cuando el viewport se ensancha de 320 a 768. Esa es la firma que el
 *   segundo factor mide, y el defecto lo arregla otro frente.
 *
 * `DEUDA_ZOOM` ESTA VACIA DESDE LA CRITICA #19, y esa lista vacia es la
 * entrega: las cinco zonas que la version anterior sancionaba estan arregladas
 * en la causa, no apagadas. Ver su docblock, mas abajo, con el antes y el
 * despues de cada una.
 *
 * POR QUE NO ESTA EN `pnpm run ci`, dicho explicitamente. Necesita el sitio
 * SERVIDO, y el gate corre antes de `pnpm build` -- el mismo motivo, y el mismo
 * precedente, que `scripts/measure-home-js.mjs`, que tampoco entra por
 * necesitar un `out/`. Lo que SI corre en el gate es
 * `scripts/check-site-surfaces.test.mjs`, que importa este fichero y afirma
 * que su cobertura no se ha vaciado en silencio: las ocho superficies, los dos
 * idiomas, TODAS las rutas que el sitio declara (la portada incluida), el
 * barrido completo de anchos, las dieciseis familias con su suelo numerico, la
 * magnitud del zoom, el umbral de legibilidad y el
 * hecho de que ninguna zona quede sancionada. Un candado de navegador al que
 * alguien le borra media lista de rutas sigue saliendo verde; ese es justo el
 * fallo que el repo ya pago cuatro veces con candados que pasaban por vacuidad.
 *
 * COMO SE USA:
 *
 *     pnpm build && pnpm start          # en otra terminal
 *     pnpm check:site-surfaces          # o: node scripts/check-site-surfaces.mjs
 *
 * Acepta `--base=<url>` (por defecto http://localhost:3000) y `--tema=dark|light`.
 * Codigo de salida 1 si alguna superficie incumple algo.
 *
 * PLAYWRIGHT NO ES DEPENDENCIA DEL REPO a proposito -- ni el paquete ni sus
 * navegadores viajan en `pnpm install`, y el gate no lo necesita. Este script lo
 * resuelve en tiempo de ejecucion y, si no lo encuentra, lo dice con el comando
 * exacto que lo instala en vez de fallar con un error de modulo.
 *
 * La salida de emergencia es la variable `PLAYWRIGHT_CORE`, y admite las TRES
 * formas de nombrar el paquete, comprobadas una a una (`especificadoresDePlaywright`
 * y su test): el DIRECTORIO del paquete, su FICHERO de entrada o su NOMBRE. Por
 * ejemplo, con Playwright instalado global dentro de `@playwright/cli`:
 *
 *     PLAYWRIGHT_CORE=".../@playwright/cli/node_modules/playwright-core" \
 *       node scripts/check-site-surfaces.mjs --base=http://localhost:4321
 *
 * La primera version solo admitia el fichero, aunque su propio comentario
 * repartia la ruta del directorio; con el directorio moria diciendo que
 * Playwright no estaba instalado. Queda medido y cerrado en la ola Q.
 *
 * CIFRAS DE REFERENCIA, medidas CON ESTE MISMO SCRIPT sobre el build servido de
 * la critica #19 (Chrome, 1440x900, temas oscuro y claro; veredicto CUMPLE,
 * codigo de salida 0 en los dos temas):
 *
 *   /                 tocLinks=0  stops=14/23           disclosure=true->false hoja=dialog/0 escapes animaciones=0/35 o 0/82 anchos=12/12
 *   /en               tocLinks=0  stops=14/23           disclosure=true->false hoja=dialog/0 escapes animaciones=0/35 o 0/82 anchos=12/12
 *   /privacidad       tocLinks=14 stops=28 tocCovered=0 disclosure=true->false hoja=dialog/0 escapes animaciones=0/24 anchos=12/12
 *   /en/privacy       tocLinks=14 stops=28 tocCovered=0 disclosure=true->false hoja=dialog/0 escapes animaciones=0/24 anchos=12/12
 *   /aviso-legal      tocLinks=15 stops=28 tocCovered=0 disclosure=true->false hoja=dialog/0 escapes animaciones=0/24 anchos=12/12
 *   /en/legal-notice  tocLinks=15 stops=28 tocCovered=0 disclosure=true->false hoja=dialog/0 escapes animaciones=0/24 anchos=12/12
 *   404 (es)          tocLinks=0  stops=13              disclosure=true->false hoja=dialog/0 escapes animaciones=0/30 anchos=12/12
 *   404 (en)          tocLinks=0  stops=13              disclosure=true->false hoja=dialog/0 escapes animaciones=0/30 anchos=12/12
 *
 * (las dos portadas y las cuatro legales responden 200 y las dos ultimas 404;
 * `lang` sale `es` en las castellanas y `en` en las inglesas, y el `sinJs` de
 * las ocho trae 16 enlaces de cabecera con 4.930 / 4.726 / 10.969 / 10.315 /
 * 5.961 / 5.725 / 67 / 67 caracteres de cuerpo. Las dos cifras de `stops` y de
 * animaciones de la portada son la rama oscura y la clara, que montan piezas
 * distintas.)
 *
 * CIFRAS DE LA FAMILIA QUINCE, medidas el 2026-09-04 sobre el build servido con
 * los arreglos de la critica #19 ya dentro, en los dos temas:
 *
 *   /                 zoom200=@32px 0 perdidas / 1686 (oscuro) o 1710 (claro) cajas de contenido
 *   /en               zoom200=@32px 0 perdidas / 1686 (oscuro) o 1710 (claro) cajas de contenido
 *   /privacidad       zoom200=@32px 0 perdidas / 1974 cajas de contenido
 *   /en/privacy       zoom200=@32px 0 perdidas / 1974 cajas de contenido
 *   /aviso-legal      zoom200=@32px 0 perdidas / 1302 cajas de contenido
 *   /en/legal-notice  zoom200=@32px 0 perdidas / 1302 cajas de contenido
 *   404 (es)          zoom200=@32px 0 perdidas / 498 cajas de contenido
 *   404 (en)          zoom200=@32px 0 perdidas / 498 cajas de contenido
 *   deuda de zoom     sancionadas=0 observadas=0
 *
 * «CUMPLE - 8 superficies, 15 familias, 0 zonas de zoom sancionadas, cero
 * incumplimientos», codigo de salida 0 en `dark` y en `light`. (La linea se
 * conserva tal cual se imprimio aquel dia: eran quince familias entonces y hoy
 * son dieciseis, con la de legibilidad que entra abajo.) El segundo numero
 * de cada fila es la guarda de vacuidad del filtro: son las cajas con texto
 * propio o interactivas que la sonda SI evaluo en el barrido completo, y un cero
 * ahi pone el script en rojo.
 *
 * CIFRAS DE LA FAMILIA DIECISEIS, medidas el 2026-09-05 sobre el build servido de
 * `47d0b4e` -- que TODAVIA NO lleva los arreglos de esta ola, asi que la portada
 * sale en rojo a proposito y las demas superficies en verde. Tema claro; el
 * oscuro da 13 y 11 en las dos portadas y los mismos ceros en las seis restantes:
 *
 *   /                 legibilidad=28 ilegibles / 459 cajas de 3+ lineas de 1410 con texto (0 descartadas por caja estirada)
 *   /en               legibilidad=26 ilegibles / 449 cajas de 3+ lineas de 1410 con texto (0 descartadas por caja estirada)
 *   /privacidad       legibilidad=0 ilegibles / 721 cajas de 3+ lineas de 1854 con texto (44 descartadas por caja estirada)
 *   /en/privacy       legibilidad=0 ilegibles / 675 cajas de 3+ lineas de 1854 con texto (44 descartadas por caja estirada)
 *   /aviso-legal      legibilidad=0 ilegibles / 333 cajas de 3+ lineas de 1206 con texto (0 descartadas por caja estirada)
 *   /en/legal-notice  legibilidad=0 ilegibles / 314 cajas de 3+ lineas de 1206 con texto (0 descartadas por caja estirada)
 *   404 (es)          legibilidad=0 ilegibles / 13 cajas de 3+ lineas de 390 con texto (0 descartadas por caja estirada)
 *   404 (en)          legibilidad=0 ilegibles / 10 cajas de 3+ lineas de 390 con texto (0 descartadas por caja estirada)
 *
 * Los dos numeros del medio son sus guardas de vacuidad y el tercero es el
 * segundo instrumento trabajando: las 44 descartadas de cada rama de privacidad
 * son las celdas de la tabla de almacenamiento, estiradas al alto de su fila,
 * que el proxy senalaba y las cajas de linea reales absolvieron (ver
 * `probeLegibilidadDeTexto`). Cero descartadas en la portada: ahi la correccion
 * no toca ni una de las 28.
 *
 * LAS MISMAS CIFRAS SOBRE `5bfe092`, con los rellenos arreglados y el segundo
 * factor dentro (tema claro arriba, oscuro entre parentesis donde difiere). El
 * cuarto numero es el segundo factor absolviendo:
 *
 *   /                 legibilidad=3 (0) ilegibles / 373 (334) cajas de 3+ lineas de 1410 (1350) con texto (0 descartadas por caja estirada, 0 (1) por caja ancha)
 *   /en               legibilidad=3 (0) ilegibles / 367 (333) cajas de 3+ lineas de 1410 (1350) con texto (0 descartadas por caja estirada, 0 (3) por caja ancha)
 *   /privacidad       legibilidad=0 ilegibles / 689 cajas de 3+ lineas de 1854 con texto (36 descartadas por caja estirada, 3 por caja ancha)
 *   /en/privacy       legibilidad=0 ilegibles / 650 cajas de 3+ lineas de 1854 con texto (39 descartadas por caja estirada, 0 por caja ancha)
 *   /aviso-legal      legibilidad=0 ilegibles / 291 cajas de 3+ lineas de 1206 con texto (0 descartadas por caja estirada, 0 por caja ancha)
 *   /en/legal-notice  legibilidad=0 ilegibles / 281 cajas de 3+ lineas de 1206 con texto (0 descartadas por caja estirada, 0 por caja ancha)
 *   404 (es)          legibilidad=0 ilegibles / 7 cajas de 3+ lineas de 390 con texto (0 descartadas por caja estirada, 0 por caja ancha)
 *   404 (en)          legibilidad=0 ilegibles / 4 cajas de 3+ lineas de 390 con texto (0 descartadas por caja estirada, 0 por caja ancha)
 *
 * Las 39 celdas de `/privacidad` se reparten 36 + 3 y las de `/en/privacy` 39 +
 * 0: el segundo factor corre ANTES que la confirmacion con las cajas de linea
 * --es mas barato-- asi que tres de las celdas que antes absolvia el Range las
 * absuelve ahora por anchas. El total absuelto no cambia; cambia quien lo firma.
 *
 * LA SONDA DE PERDIDA MIDE LOS DOS LADOS desde esta misma fecha. Sobre el build
 * de `47d0b4e` el lado nuevo no anade ni una perdida (las ocho siguen a `0
 * perdidas`), asi que no llega con falsos positivos; lo que ata su
 * comportamiento es el candado en jsdom del test companero, con el rojo literal
 * escrito alli.
 *
 * ANTES DE LOS ARREGLOS, con la misma sonda y el mismo build servido (todas
 * las cifras a 320 px salvo donde se indica): el rotulo de marca 29,72 px fuera
 * en las ocho superficies (y ademas recortado dentro de un `overflow: hidden`,
 * caja de 160 px con 238 de contenido); el pie 35,22 px; el `h1` de la 404
 * 41,28 px (21,28 a 360 y 6,28 a 390); la fila de destinos de la barra 24,13 px
 * a 768 px con su disparador «Mas» dentro; el kicker de Story 42,47 px (2,47 a
 * 360); la tarjeta de Features 72,50 px en la rama inglesa (2,50 a 390); la
 * diapositiva de Journey 23,39 px en la rama oscura; el circulo decorativo de
 * Features 18 px. Todas a 0 px despues.
 *
 * Las dos inyecciones que validan esta familia, con su rojo literal:
 *
 *   - devolviendo `overflow-wrap: break-word` a `ScStory` (`Story.tsx`), que es
 *     exactamente la version anterior del arreglo -- «NO CUMPLE  con el texto al
 *     200 % (raiz 32 px) se pierde contenido en una zona NO sancionada, sin
 *     scroll horizontal que lo alcance: 320px main/span 42.47 px fuera ("¿Por
 *     que VoidToInfinite?"); 360px main/span 2.47 px fuera (...)», EXIT=1;
 *   - anadiendo `footer|legal` a `DEUDA_ZOOM` (una sancion que ya no se
 *     reproduce) -- «NO CUMPLE  la deuda de zoom footer|legal ya no se reproduce
 *     (se sanciono hasta 38 px, medida 35.22 px): si se arreglo, borrala de
 *     DEUDA_ZOOM; si no, la sonda dejo de verla», EXIT=1.
 *
 * Restauradas las dos, verde otra vez en los dos temas.
 *
 * `stops` cuenta las paradas DISTINTAS antes de cerrar el ciclo (la repeticion
 * que lo cierra no se cuenta), con anillo de foco visible en todas y sin una
 * sola trampa. `tocCovered=0`: ninguno de los 14 y 15 destinos del indice queda
 * bajo la barra fija -- medido aparte, su `h2` aterriza en top 88 px (el
 * primero) o 137 px con la barra terminando en 64. `disclosure=true->false` es
 * el `aria-expanded` del desplegable «Mas» antes y despues de Escape, con el
 * foco devuelto a su disparador; `hoja=dialog/0 escapes`, la hoja movil a 390 px
 * abriendo como dialogo con nombre y sin que el foco salga de ella en 25
 * tabulaciones. `animaciones=0/24` se lee "cero vivas con la preferencia activa,
 * 24 corriendo sin ella": el segundo numero es la sonda que impide que el cero
 * signifique "no habia nada que parar". Cero controles invisibles bajo
 * `forced-colors: active` en las ocho.
 *
 * `lang` en las cuatro rutas inglesas es el del DOM VIVO. El HTML horneado sirve
 * `lang="es"` en las ocho rutas: es un limite conocido y declarado de
 * `output: "export"`, con su porque medido en el docblock de `app/layout.tsx`
 * (dos `<html lang>` exigirian dos root layouts, y eso es incompatible con
 * tener una 404 propia). Este script mide el DOM porque es lo que anuncia un
 * lector de pantalla; el HTML crudo no es asunto suyo.
 */

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Prefijo de la rama inglesa. Espejo de `EN_ROUTES.home` en `src/config/site.ts`;
 *  este fichero es JavaScript suelto y no puede importar el modulo TypeScript,
 *  asi que la paridad la comprueba el test companero. */
export const EN_PREFIX = "/en";

/**
 * Las superficies del encargo, DERIVADAS de los documentos del sitio y de los
 * dos idiomas en vez de tecleadas una a una: si manana nace un tercer documento
 * legal, se anade a `LEGAL_DOCS` y las dos rutas nuevas entran solas.
 */
export const LEGAL_DOCS = [
    { id: "privacy", es: "/privacidad", en: `${EN_PREFIX}/privacy` },
    { id: "legalNotice", es: "/aviso-legal", en: `${EN_PREFIX}/legal-notice` },
];

/**
 * LA PORTADA, en sus dos idiomas. Entra el 2026-09-04 con la critica externa
 * #19, y su ausencia era el hallazgo: el candado recorria las paginas pequenas
 * del sitio y no la que ve todo el mundo, asi que tres perdidas de texto
 * distintas al 200 % de tamano de fuente convivieron con este script en verde.
 *
 * Su ruta inglesa es exactamente `EN_PREFIX` (la rama `/en` no tiene segmento
 * propio para la portada), y eso lo ata el test companero contra
 * `EN_ROUTES.home` de `src/config/site.ts` -- la misma fuente unica de la que
 * salen las rutas legales, no un par de strings gemelos escritos aqui.
 */
export const HOME_DOC = { id: "home", es: "/", en: EN_PREFIX };

/** Camino inexistente con el que se provoca la 404 en cada rama de idioma. */
export const BROKEN_SEGMENT = "ruta-que-no-existe-candado-q2";

export const SURFACES = [
    {
        nombre: HOME_DOC.es,
        path: HOME_DOC.es,
        locale: "es",
        kind: "home",
    },
    {
        nombre: HOME_DOC.en,
        path: HOME_DOC.en,
        locale: "en",
        kind: "home",
    },
    ...LEGAL_DOCS.flatMap((doc) => [
        { nombre: doc.es, path: doc.es, locale: "es", kind: "legal" },
        { nombre: doc.en, path: doc.en, locale: "en", kind: "legal" },
    ]),
    {
        nombre: "404 (es)",
        path: `/${BROKEN_SEGMENT}`,
        locale: "es",
        kind: "notFound",
    },
    {
        nombre: "404 (en)",
        path: `${EN_PREFIX}/${BROKEN_SEGMENT}`,
        locale: "en",
        kind: "notFound",
    },
];

/**
 * Barrido de anchos. Los extremos son los del encargo (320 y 1920) y los del
 * medio son los saltos reales del sistema: el escalon `md` (768) por el que la
 * barra cambia de la hoja movil a la fila, y los anchos de dispositivo que el
 * repo ya usa en sus mediciones.
 */
export const WIDTH_SWEEP = [
    320, 360, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1920,
];

/**
 * Las dieciseis familias que este script comprueba. La lista es el CONTRATO del
 * candado: el test companero exige que ninguna desaparezca, porque un script que
 * mide trece cosas y dice medir catorce es peor que uno que no existe.
 *
 * Y desde la ola R exige ademas que la lista no ENCOJA: `FAMILIAS_MINIMAS`, en
 * el test, es un numero tecleado que solo puede subir. El vinculo bidireccional
 * entre esta lista y los marcadores del cuerpo ata la coherencia, no la
 * extension, y `FAMILIAS_ESPERADAS` vive en el otro fichero pero el marcador
 * `// [check: ...]` vive en ESTE: un recorte simetrico de las dos listas mas el
 * marcador --tres bloques, dos ficheros-- salia en verde. El suelo numerico es
 * lo que ya no se puede recortar sin escribir a mano un numero mas pequeno.
 */
export const CHECKS = [
    "recorrido-teclado",
    "foco-visible",
    "sin-trampas-de-foco",
    "jerarquia-encabezados",
    "ids-unicos",
    "aria-sin-referencias-colgantes",
    "landmarks-con-nombre",
    "aterrizaje-del-indice",
    "disclosure-escape-y-foco",
    "hoja-movil-escape-y-foco",
    "reduced-motion",
    "forced-colors",
    "responsive-sin-desbordamiento",
    "texto-al-200-por-ciento",
    "legibilidad-al-200-por-ciento",
    "sin-javascript",
];

/**
 * Tamano de fuente por defecto del navegador, en px. No es una preferencia de
 * este repo: es el valor con el que Chrome, Firefox y Safari salen de fabrica, y
 * el denominador contra el que se lee cualquier porcentaje de zoom de TEXTO.
 */
export const ROOT_FONT_BASE_PX = 16;

/**
 * La preferencia de tamano de texto con la que se mide la familia
 * `texto-al-200-por-ciento`: el 200 % que exige WCAG 1.4.4 (Resize text, nivel
 * AA), que pide que el texto se pueda ampliar hasta ese factor sin perder
 * contenido ni funcionalidad.
 *
 * Se emula con `Page.setFontSizes` del protocolo de DevTools, que es LA MISMA
 * palanca que mueve la preferencia real del usuario (Configuracion > Aspecto >
 * Tamano de fuente), y NO con `page.setViewportSize` ni con un zoom de pagina:
 * el zoom de pagina escala todo por igual y no reproduce el defecto, porque lo
 * que rompe es que las longitudes en `rem` crezcan mientras el viewport se queda
 * donde estaba.
 *
 * El test companion exige que este numero siga siendo exactamente el doble de
 * `ROOT_FONT_BASE_PX`: bajarlo a 24 dejaria el candado midiendo un 150 % y
 * saliendo verde sobre un defecto que WCAG sigue considerando fallo.
 */
export const ZOOM_FONT_PX = ROOT_FONT_BASE_PX * 2;

/**
 * PRIMER FACTOR de la familia de legibilidad: el suelo de caracteres por linea
 * por debajo del cual una caja de texto de tres o mas lineas es CANDIDATA a
 * ilegible, con la raiz al 200 %. Candidata y no ilegible: hace falta ademas el
 * segundo factor, `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA`, y el porque esta en su
 * docblock y en la tabla de `probeLegibilidadDeTexto`.
 *
 * Calibrado el 2026-09-05 contra las dos poblaciones reales, no elegido a ojo:
 * los defectos medidos en el build servido daban entre 0,9 y 2,7 caracteres por
 * linea, y el suelo fisico de la tipografia grande a 320 px --un `h2` de 64 px
 * en una caja de 224, la nota de 80 px en una de 208-- da entre 5 y 7 y NO es
 * defecto, sino exactamente lo que la preferencia del usuario pidio.
 *
 * LO QUE LA SEGUNDA MEDICION DEL MISMO DIA CORRIGIO de esa calibracion: el
 * hueco entre las dos poblaciones no era tan limpio como parecia. Con los
 * rellenos ya arreglados (`inlineSpace`), el acento de la nota de cierre del
 * deck de Story da 17 caracteres en 5 lineas --3,4 por linea, por DEBAJO de
 * este umbral-- y no es defecto ninguno. Un solo factor no separa las dos
 * poblaciones; hacen falta los dos.
 *
 * El test companero impide que BAJE. Subirlo endurece el candado (mas cajas
 * caen); bajarlo lo vacia en silencio, que es la unica direccion peligrosa: con
 * el umbral en 1 ninguna de las cajas medidas arriba se reportaria y la familia
 * saldria en verde sobre el defecto que existe para cazar.
 */
export const MIN_CARACTERES_POR_LINEA = 4;

/**
 * SEGUNDO FACTOR de la familia de legibilidad: una caja solo se declara
 * ilegible si ademas de partirse en trocitos es MUCHO MAS ESTRECHA DE LO QUE EL
 * VIEWPORT PERMITE. La condicion es `ancho de la caja < 0,5 x clientWidth del
 * documento`.
 *
 * POR QUE HACIA FALTA, con las dos mediciones que lo obligaron (2026-09-05,
 * build servido de `5bfe092`, raiz 32 px, `reduce`):
 *
 *   - EL ROTULO DEL CTA, que SI es defecto: a 320 px la caja mide 108 px --el
 *     34 % del viewport-- y parte «Escríbeme» en 3 lineas de 3 caracteres; a
 *     768 px la MISMA caja se encoge a 58,83 px (el 7,7 %) y saca las 9 letras
 *     en 9 lineas. Una caja que se estrecha cuando el viewport se ensancha es
 *     la firma del defecto de rellenos anidados.
 *   - EL ACENTO DE LA NOTA DE CIERRE del deck de Story, que NO lo es: a 320 px
 *     la caja mide 177,61 px --el 55 %-- y da 17 caracteres en 5 lineas (3,4
 *     por linea) porque «un nuevo comienzo» se pide a `clamp(2.5rem, 11vw,
 *     8rem)`, o sea 80 px con la raiz a 32, y la palabra «comienzo» mide ~336
 *     px a ese cuerpo: no cabe en NINGUNA columna posible a 320 px de viewport.
 *     WCAG 1.4.4 exige que el texto llegue al 200 %, y acotar ese cuerpo con
 *     `vw` seria el patron de fallo F94. Su `p` entero da 36 caracteres en 9
 *     lineas: 4,0 justos, a una decima del primer factor.
 *
 * LA TABLA DE CALIBRACION, con las dos poblaciones y los dos factores. Todas
 * las cifras a 320 px salvo donde se indica, medidas con este mismo script:
 *
 *   DEFECTO (car./linea < 4 Y caja < 50 % del viewport)
 *     valores de las tarjetas de Contact   23,2 px = 7 %
 *     ayuda del formulario                 28 px   = 9 %
 *     rotulo del CTA                       58,8 px = 18 %  (108 px = 34 % tras
 *                                                           el arreglo de rellenos)
 *     h2 del deck                          144 px  = 45 %
 *     cita de Journey                      142,7 px= 45 %
 *     kicker de Story                      144 px  = 45 %
 *
 *   FISICA DE LA TIPOGRAFIA GRANDE (car./linea < 4 pero caja >= 50 %)
 *     acento de la nota, rama es           177,61 px = 55 %  (17 car. en 5 lineas)
 *     acento de la nota, rama en           197,61 px = 62 %  (15 car. en 4 lineas)
 *     columna que las contiene             208 px    = 65 %
 *
 * El hueco entre las dos poblaciones va del 45 % al 55 %, y 0,5 cae justo en
 * medio, con margen por los dos lados. El primer factor solo NO las separa: el
 * CTA da 3 por linea y el acento 3,4, y el CTA es defecto y el acento no.
 *
 * LAS DOS DIRECCIONES EN QUE ESTE NUMERO ROMPE EL CANDADO, y por eso el test
 * companero lo teclea:
 *
 *   - BAJARLO lo vacia por este lado: con 0,2 el rotulo del CTA a 320 px (34 %)
 *     dejaria de reportarse y el defecto real saldria en verde. El test lo
 *     impide con un suelo escrito a mano.
 *   - SUBIRLO lo llena de falsos positivos: con 0,9 el acento de la nota (55 %)
 *     volveria al informe y el candado pediria acotar una tipografia que WCAG
 *     exige que crezca. Eso lo caza el caso que reproduce esa medida.
 */
export const MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA = 0.5;

/**
 * LA LISTA DE ZONAS SANCIONADAS, HOY VACIA, Y POR QUE ESA LISTA VACIA ES LA
 * ENTREGA (critica externa #19, 2026-09-04).
 *
 * La version anterior de este fichero sancionaba cinco zonas -- `header|legal`,
 * `footer|legal`, `header|notFound`, `main|notFound`, `footer|notFound` --
 * declarando que estaban fuera del dominio de aquel arreglo. El verificador de
 * la ronda siguiente las reprodujo una a una con sonda propia y dejo escrito lo
 * que son: incumplimientos vivos de WCAG 1.4.4 en produccion, no deuda. Una
 * sancion apaga el rojo sin arreglar nada, y lo hace igual de bien tanto si el
 * defecto sigue ahi como si no.
 *
 * Las cinco estan cerradas EN LA CAUSA. Medido en Chrome real sobre el build de
 * produccion con la raiz a 32px, antes y despues, en los dos temas:
 *
 *   header|legal / header|notFound  el rotulo de marca se cortaba a media letra
 *     dentro de un overflow: hidden (caja de 160 px con 238 de contenido) y
 *     terminaba 29,72 px fuera del viewport a 320 px; y la fila de destinos se
 *     salia 24,13 px a 768 px con su disparador «Mas» dentro. Ahora el rotulo
 *     ENVUELVE (`flex-wrap: wrap` en `BrandName`, `overflow: hidden` retirado de
 *     `ScBrandLink`) y el texto de la barra puede partirse. 0 px fuera.
 *   footer|legal / footer|notFound  el pie se salia 35,22 px a 320 px: la pista
 *     `1fr` de `ScInner` se enrasaba al min-content de la direccion de correo
 *     (307 px en una caja de 224). Ahora `minmax(0, 1fr)` + `min-width: 0` en
 *     las columnas + `overflow-wrap: anywhere` en el enlace. 0 px fuera.
 *   main|notFound  el `h1` pedia 402,56 px en una caja de 224 y desbordaba por
 *     los DOS lados (left -41,28 / right 361,28). Ahora ningun hijo de `ScMain`
 *     pasa de `max-width: 100%` y el `hyphens: auto` que ya heredaba parte la
 *     palabra. 0 px fuera.
 *
 * LA MECANICA SE CONSERVA, con la lista vacia, y no es codigo muerto: es lo que
 * hace falta el dia que alguien quiera volver a sancionar algo, y lo que obliga
 * a que esa decision se tome aqui, a la vista, en vez de de paso. Las tres
 * reglas siguen siendo:
 *
 *   - una perdida en una zona que NO esta aqui pone el script en rojo (con la
 *     lista vacia: CUALQUIER perdida lo pone en rojo);
 *   - una perdida que SUPERA el tope de su entrada pone el script en rojo;
 *   - y una entrada que NO se observa ni una vez en la corrida completa TAMBIEN
 *     pone el script en rojo, pidiendo que se retire. Sin esa tercera regla la
 *     lista podria quedarse mintiendo para siempre.
 *
 * La clave es `<zona>|<kind de superficie>`. El test companero exige que la
 * lista siga VACIA: anadir una entrada obliga a cambiar el test en el mismo
 * commit, con la medicion delante, que es exactamente la friccion que faltaba.
 */
export const DEUDA_ZOOM = [];

/** Sancion aplicable a una perdida, o `undefined` si esa zona no esta sancionada. */
function sancionDeZoom(zona, kind) {
    return DEUDA_ZOOM.find((d) => d.clave === `${zona}|${kind}`);
}

/**
 * Deudas declaradas que la corrida completa NO llego a observar. Cada una es un
 * fallo: o se arreglo y sobra, o la sonda dejo de verla y la lista miente.
 *
 * `lista` es un parametro con valor por defecto, y no un capricho de firma: con
 * `DEUDA_ZOOM` vacia -- que es como esta desde la critica #19 -- probar esta
 * mecanica contra la lista real seria probar el vacio. El test companero le pasa
 * una lista SINTETICA para verificar que sigue funcionando el dia que alguien
 * vuelva a sancionar algo. En produccion se llama sin el segundo argumento.
 */
export function fallosDeDeudaNoObservada(clavesVistas, lista = DEUDA_ZOOM) {
    return lista
        .filter((d) => !clavesVistas.has(d.clave))
        .map(
            (d) =>
                `la deuda de zoom ${d.clave} ya no se reproduce (se sanciono hasta ${d.topePx} px, medida ${d.medidoPx} px): si se arreglo, borrala de DEUDA_ZOOM; si no, la sonda dejo de verla`,
        );
}

/** Alto de la banda del navbar en px (`--nav-height` + `--nav-gap`), solo para
 *  el mensaje de error: la comprobacion real mide la barra en el navegador. */
export const NAV_BAND_PX = 64;

/*
 * ---------------------------------------------------------------------------
 * Sondas que se evaluan DENTRO de la pagina. Se declaran como funciones sueltas
 * para que se lean como lo que son: codigo del navegador, no del script.
 * ---------------------------------------------------------------------------
 */

/** Semantica del documento: encabezados, ids, referencias aria y landmarks. */
function probeSemantics() {
    const visible = (el) => !el.closest("[hidden],[aria-hidden='true']");

    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .filter(visible)
        .map((h) => Number(h.tagName[1]));

    const skips = [];
    headings.forEach((level, i) => {
        if (i > 0 && level > headings[i - 1] + 1)
            skips.push(`h${headings[i - 1]} -> h${level}`);
    });

    const idCount = {};
    for (const el of document.querySelectorAll("[id]"))
        idCount[el.id] = (idCount[el.id] || 0) + 1;

    const dangling = [];
    for (const attr of [
        "aria-labelledby",
        "aria-describedby",
        "aria-controls",
        "aria-owns",
        "aria-details",
    ]) {
        for (const el of document.querySelectorAll(`[${attr}]`)) {
            for (const ref of (el.getAttribute(attr) || "")
                .split(/\s+/)
                .filter(Boolean)) {
                if (!document.getElementById(ref))
                    dangling.push(`${attr}=${ref}`);
            }
        }
    }

    const accName = (el) => {
        const lb = el.getAttribute("aria-labelledby");
        if (lb) {
            const t = lb
                .split(/\s+/)
                .map(
                    (id) =>
                        document.getElementById(id)?.textContent?.trim() || "",
                )
                .join(" ")
                .trim();
            if (t) return t;
        }
        return el.getAttribute("aria-label")?.trim() || null;
    };

    /* Solo se exige nombre donde la ausencia de nombre AMBIGUA de verdad: los
       `nav` y las regiones, que pueden repetirse en la misma pagina. `main`,
       `header` y `footer` son unicos por documento y no lo necesitan. */
    const namedLandmarks = [
        ...document.querySelectorAll(
            "nav, [role='navigation'], [role='region']",
        ),
    ]
        .filter((el) => !el.closest("[aria-hidden='true']"))
        .map((el) => ({ tag: el.tagName.toLowerCase(), name: accName(el) }));

    return {
        visibility: document.visibilityState,
        lang: document.documentElement.lang,
        h1: headings.filter((l) => l === 1).length,
        headingSkips: skips,
        duplicatedIds: Object.entries(idCount)
            .filter(([, n]) => n > 1)
            .map(([id]) => id),
        danglingAria: dangling,
        landmarks: namedLandmarks,
        unnamedLandmarks: namedLandmarks.filter((l) => !l.name).length,
        collidingLandmarks:
            namedLandmarks.length -
            new Set(namedLandmarks.map((l) => l.name)).size,
        tocHrefs: [...document.querySelectorAll("main nav a[href^='#']")].map(
            (a) => a.getAttribute("href"),
        ),
    };
}

/** Estado de una parada de tabulacion. */
function probeFocusStop() {
    const el = document.activeElement;
    if (!el || el === document.body) return { end: true };
    const cs = getComputedStyle(el);
    return {
        end: false,
        key: `${el.tagName}|${el.getAttribute("href")}|${(el.textContent || "").trim().slice(0, 30)}|${el.id}`,
        ringVisible:
            cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
    };
}

/** Desbordamiento horizontal del documento al ancho actual. */
function probeOverflow() {
    const w = document.documentElement.clientWidth;
    return { width: w, scrollWidth: document.documentElement.scrollWidth };
}

/**
 * Contenido o funcionalidad que se sale del viewport SIN forma de alcanzarlo.
 *
 * No basta con mirar `documentElement.scrollWidth`, que es lo que hace
 * `probeOverflow`: `GlobalStyles` declara `html, body { overflow-x: clip }` --a
 * proposito, para no crear un contenedor de scroll que rompa el pin de Story--,
 * asi que un elemento que se sale por la derecha NO mueve el `scrollWidth` de la
 * raiz ni un pixel. El desbordamiento se vuelve invisible al instrumento
 * anterior justo cuando se vuelve MAS grave: no es contenido desplazable, es
 * contenido perdido.
 *
 * Un elemento cuyo ancestro SI scrollea en horizontal (la tabla de
 * almacenamiento dentro de `ScTableWrap`, con su `overflow-x: auto`, su
 * `role="region"` y su `tabindex="0"`) no cuenta: ahi el contenido se alcanza
 * con el dedo, con la rueda y con el teclado.
 *
 * QUE CUENTA COMO PERDIDA, Y POR QUE EL FILTRO NO ES UNA PUERTA TRASERA. WCAG
 * 1.4.4 habla de "loss of content or functionality", asi que la sonda cuenta
 * exactamente eso: un elemento con TEXTO PROPIO (un nodo de texto directo no
 * vacio) o INTERACTIVO (`a`, `button`, campos de formulario, cualquier cosa con
 * `tabindex`). Lo que queda fuera es el arte: las capas a sangre de las escenas
 * (`aria-hidden`, `alt=""`) se sobredimensionan A PROPOSITO -- regla 22 de
 * `RULES.md` exige que una capa que se traslada sobresalga al menos su recorrido
 * por lado -- y sobresalen EXACTAMENTE IGUAL con la raiz por defecto: medido en
 * el mismo build a 320, 360 y 390 px, la escena del hero se sale 136 / 153 /
 * 165,75 px con la raiz a 16 y los MISMOS 136 / 153 / 165,75 px con la raiz a
 * 32. Contarlas seria medir una decision de diseno en vez del defecto, y con la
 * lista de sanciones vacia el script no tendria como distinguir una de otro.
 *
 * El filtro no puede vaciar la sonda en silencio: se devuelve `candidatos`, el
 * numero de elementos que SI eran contenido o funcionalidad en esta pasada, y
 * `auditarSuperficie` pone el script en rojo si esa cuenta llega a cero. Un
 * filtro que dejara de ver texto se delataria en la primera corrida.
 *
 * `visibility: hidden` queda fuera por lo mismo: el panel del desplegable de la
 * barra vive cerrado en el DOM y no pinta nada; su caja no es contenido que
 * nadie pueda perder.
 *
 * LOS DOS LADOS, desde la ola R (2026-09-05). La primera version calculaba
 * `sobra = r.right - cw` y nada mas: media la IZQUIERDA en ningun sitio
 * (`grep -c "r.left"` sobre este fichero devolvia 0). El verificador de la ola Q
 * lo declaro como hueco y el repo ya tenia el contraejemplo delante: el `h1` de
 * la 404 al 200 % de texto pedia 402,56 px en una caja de 224 y desbordaba por
 * los DOS lados a la vez (left -41,28 / right 361,28), asi que la mitad
 * izquierda de aquel defecto era invisible para este instrumento y solo se
 * cerro porque la derecha delataba al mismo elemento. Un titulo centrado que se
 * saliera SOLO por la izquierda --lo que hace cualquier caja con
 * `margin-inline: auto` mas ancha que su contenedor-- habria pasado en verde.
 *
 * Ahora `sobra = max(r.right - cw, -r.left)`, con el lado en el informe. Es el
 * maximo y no la suma a proposito: lo que se reporta es cuanto contenido se
 * pierde por el lado PEOR, que es la magnitud que se compara contra el tope de
 * una sancion; sumar los dos lados inflaria esa comparacion sin que ninguna
 * medida real correspondiera al numero. El filtro de ancestro con
 * `overflow-x: auto|scroll` se aplica igual a los dos lados: un contenedor que
 * scrollea en horizontal alcanza tanto lo que se sale por la derecha como lo
 * que se sale por la izquierda.
 */
export function probePerdidaHorizontal() {
    const raiz = document.documentElement;
    const cw = raiz.clientWidth;
    const perdidos = [];
    let candidatos = 0;
    const INTERACTIVOS = "a,button,input,select,textarea,summary,[tabindex]";
    for (const el of document.querySelectorAll("body *")) {
        const tieneTextoPropio = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
        );
        const esInteractivo = el.matches(INTERACTIVOS);
        if (!tieneTextoPropio && !esInteractivo) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.visibility === "collapse")
            continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        candidatos += 1;

        const porLaDerecha = r.right - cw;
        const porLaIzquierda = -r.left;
        const sobra = Math.max(porLaDerecha, porLaIzquierda);
        const lado = porLaIzquierda > porLaDerecha ? "izquierda" : "derecha";
        if (sobra <= 1) continue;
        let alcanzable = false;
        let p = el.parentElement;
        while (p) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === "auto" || ox === "scroll") {
                alcanzable = true;
                break;
            }
            p = p.parentElement;
        }
        if (alcanzable) continue;
        perdidos.push({
            zona: el.closest("header")
                ? "header"
                : el.closest("footer")
                  ? "footer"
                  : el.closest("main")
                    ? "main"
                    : "suelto",
            sel: el.tagName.toLowerCase(),
            sobra: Math.round(sobra * 100) / 100,
            lado,
            texto: (el.textContent || "").trim().slice(0, 40),
        });
    }
    return {
        rootFontPx: parseFloat(getComputedStyle(raiz).fontSize),
        clientWidth: cw,
        candidatos,
        perdidos,
    };
}

/**
 * TEXTO QUE NO SE PIERDE PERO NO SE PUEDE LEER: caracteres por linea sobre las
 * cajas de tres o mas lineas, con la raiz al 200 %.
 *
 * POR QUE NO BASTABA LA FAMILIA HERMANA. `probePerdidaHorizontal` mide que no se
 * PIERDA contenido, y esa es exactamente la letra de WCAG 1.4.4 ("without loss
 * of content or functionality"). El arreglo del 2026-09-05 por la manana
 * --`overflow-wrap: anywhere` mas pistas `minmax(0, 1fr)`-- llevo esa cuenta a
 * cero px fuera en las ocho superficies y dejo el candado en verde. La sonda de
 * legibilidad del mismo dia, sobre el MISMO build, encontro lo que ese verde
 * tapaba: los rellenos del eje inline en `rem` se doblan con la fuente mientras
 * el viewport no, y anidados (seccion + tarjeta + panel + campo) se comen la
 * columna hasta dejar una o dos letras por linea. El texto no se salia; no se
 * podia leer. Un candado de "no se pierde contenido" necesita a su lado uno de
 * "se puede leer" (leccion del 2026-09-05, regla 2).
 *
 * LA METRICA, con sus DOS FACTORES. Para cada elemento con texto propio,
 * visible, de mas de 1x1 px y con `writing-mode` horizontal:
 *
 *   lineas     = round(alto de la caja / line-height computado)
 *   caracteres = innerText.trim().length
 *   troceada   <=> lineas >= 3 y caracteres / lineas < MIN_CARACTERES_POR_LINEA
 *   estrecha   <=> ancho de la caja < MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA
 *                  x documentElement.clientWidth
 *   ilegible   <=> troceada Y estrecha
 *
 * POR QUE NO BASTA EL PRIMER FACTOR, que es la correccion que la segunda
 * medicion del 2026-09-05 obligo a hacer. Los dos ejemplos estan en el docblock
 * de `MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA` con su tabla completa, y son estos:
 * el rotulo del CTA parte «Escríbeme» en 3 caracteres por linea dentro de una
 * caja de 108 px de 320 (el 34 %) y es defecto; el acento de la nota de cierre
 * del deck de Story da 3,4 caracteres por linea dentro de una caja de 177,61 px
 * de 320 (el 55 %) y NO lo es -- ahi la palabra «comienzo» mide ~336 px al
 * cuerpo que la nota pide y no cabe en ninguna columna posible a ese viewport.
 * Contar solo caracteres por linea mete los dos en la misma bolsa. Lo que los
 * separa es el ANCHO DE LA CAJA RESPECTO AL VIEWPORT: en el build medido TODOS
 * los defectos caian por debajo de la mitad del viewport (del 7 % al 45 %) y
 * toda la tipografia grande legitima quedaba por encima (del 55 % al 65 %).
 *
 * SIN ANCHO DE DOCUMENTO --`clientWidth` a cero, que es lo que devuelve jsdom
 * si nadie lo declara-- el segundo factor NO SE PUEDE EVALUAR, y la caja se
 * reporta igual. Es la direccion conservadora a proposito: un instrumento roto
 * tiene que ponerse ruidoso, no silencioso. En navegador `clientWidth` nunca es
 * cero.
 *
 * `innerText` y no el texto PROPIO: un `h2` con un `span` de acento dentro se
 * mide entero contra la altura de su caja, porque la caja la ocupan las dos
 * partes. Contar solo el texto propio infravalora la ratio y convierte
 * tipografia legitima en defecto -- medido: 16 caracteres en 6 lineas parecian
 * 2,7 por linea cuando eran 31 en 6, o sea 5,2. En jsdom, donde `innerText` no
 * existe, se cae a `textContent`: es el mismo numero para el caso que el test
 * construye, y el navegador es quien manda en la medida real.
 *
 * Las dos poblaciones que separa el umbral, medidas el 2026-09-05 a 320 px con
 * la raiz a 32 px sobre el build servido:
 *
 *   DEFECTO (0,9 - 2,7 car./linea)          SUELO FISICO LEGITIMO (5 - 7)
 *   valores de las tarjetas de Contact      un h2 de 64 px en una caja de 224 px
 *     21-27 caracteres en 19-23 lineas      la nota de 80 px en una de 208 px
 *   ayuda del formulario: 99 en 61          (tipografia grande pedida a proposito,
 *   rotulo del CTA: 9 en 9 (letra/linea)     identica con la raiz por defecto)
 *   h2 del deck: 2,25 por linea
 *   cita de Journey: 47 en 12
 *
 * 4 cae en el hueco entre las dos, con margen por los dos lados. No se toca sin
 * volver a medir las dos poblaciones; el test companero impide que BAJE, que es
 * la direccion en la que el candado se vacia.
 *
 * LA CAJA ESTIRADA, Y POR QUE HAY UN SEGUNDO INSTRUMENTO. El alto de la caja es
 * un PROXY del alto del texto, y falla en un caso concreto que este sitio tiene:
 * una celda de tabla se estira al alto de su FILA. Medido el 2026-09-05 en
 * `/privacidad` con la raiz a 32 px, las cuatro celdas de una misma fila daban
 * las cuatro `alto = 391,88 px` a 320 px (y `302,28` a 1920), o sea 9 y 7
 * lineas por el proxy, mientras el texto de cada una ocupaba 2, 3, 4 y 2 lineas
 * reales. Con solo el proxy, esa fila entraba en el informe como cuatro cajas
 * ilegibles y ninguna lo era: es la fila la que es alta, no el texto el que es
 * estrecho.
 *
 * Asi que a la caja que el proxy SENALA se le cuenta el texto con un segundo
 * instrumento independiente --las cajas de linea que el texto renderiza de
 * verdad, `Range.getClientRects()` agrupadas por su borde superior-- y se
 * conserva el MENOR de los dos. Es conservador por construccion: nunca sube el
 * numero de lineas, solo deshace la inflacion. Y no pierde ni un defecto real:
 * en las trece cajas que la portada declaraba ilegibles a 320 px sobre el build
 * de `47d0b4e` --antes del arreglo de rellenos y antes del segundo factor-- los
 * dos instrumentos dan EXACTAMENTE el mismo numero (11/11, 7/7, 13/13, 61/61, 8/8,
 * 14/14, 9/9, 15/15, 19/19, 13/13, 19/19, 20/20, 23/23), porque ahi la caja
 * ceñia el texto. Solo se ejecuta sobre las cajas ya senaladas, que son unas
 * pocas por barrido; correrlo sobre las mil cuatrocientas de una portada seria
 * pagar un Range por caja para no cambiar nada.
 *
 * Donde no hay cajas de linea que contar --jsdom, que no implementa
 * `Range.getClientRects`-- el proxy se queda solo, que es el comportamiento
 * correcto: sin layout no hay estiramiento que deshacer.
 *
 * GUARDAS DE VACUIDAD, las mismas dos que su familia hermana: `examinadas` son
 * las cajas con texto que la sonda llego a mirar y `conTresLineas` las que
 * superaron el corte de altura. A 320 px con la raiz a 32 hay decenas de las
 * segundas en cualquier superficie real; un cero en cualquiera de las dos
 * significa que el instrumento esta roto --un cambio de marcado, un
 * `line-height` que deja de resolverse--, no que la pagina este limpia, y pone
 * el script en rojo. `anchas` y `estiradas` no son guardas sino la cuenta de lo
 * que cada uno de los dos absolvedores dejo fuera: van al informe para que un
 * numero raro se vea.
 *
 * Los dos umbrales llegan como ARGUMENTO y no leyendo las constantes del modulo
 * porque esta funcion se serializa para ejecutarse dentro de la pagina: una
 * referencia a un identificador del modulo moriria alli con un ReferenceError.
 * Y llegan en un OBJETO porque `page.evaluate` pasa un unico argumento.
 */
export function probeLegibilidadDeTexto({
    minCaracteresPorLinea,
    maxAnchoRelativo,
}) {
    const anchoDelDocumento = document.documentElement.clientWidth;
    const ilegibles = [];
    let examinadas = 0;
    let conTresLineas = 0;
    let estiradas = 0;
    let anchas = 0;
    for (const el of document.querySelectorAll("body *")) {
        const tieneTextoPropio = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
        );
        if (!tieneTextoPropio) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.visibility === "collapse")
            continue;
        /* Un texto vertical se lee en columnas: "caracteres por linea" no
           significa lo mismo y la metrica no le aplica. */
        const escritura = cs.writingMode || "horizontal-tb";
        if (!escritura.startsWith("horizontal")) continue;
        const r = el.getBoundingClientRect();
        /* 1x1 px es la caja de `VisuallyHidden`: existe para los lectores de
           pantalla y no tiene lineas que contar. */
        if (r.width <= 1 || r.height <= 1) continue;
        examinadas += 1;

        const lineHeight = parseFloat(cs.lineHeight);
        const alturaLinea = Number.isFinite(lineHeight)
            ? lineHeight
            : parseFloat(cs.fontSize) * 1.2;
        if (!Number.isFinite(alturaLinea) || alturaLinea <= 0) continue;
        const lineasPorCaja = Math.round(r.height / alturaLinea);
        if (!Number.isFinite(lineasPorCaja) || lineasPorCaja < 3) continue;
        conTresLineas += 1;

        const bruto =
            typeof el.innerText === "string" ? el.innerText : el.textContent;
        const caracteres = (bruto || "").trim().length;
        if (caracteres / lineasPorCaja >= minCaracteresPorLinea) continue;

        /* SEGUNDO FACTOR: la caja tiene que ser ademas mucho mas estrecha de lo
           que el viewport permite. Sin el, la tipografia grande que WCAG 1.4.4
           exige que crezca --el acento de la nota del deck, 3,4 caracteres por
           linea en una caja que ocupa el 55 % del viewport-- entra en el informe
           junto al defecto de rellenos que se busca. Sin ancho de documento no
           se puede evaluar y la caja se reporta igual: un instrumento roto se
           pone ruidoso, no silencioso. */
        const anchoRelativo =
            anchoDelDocumento > 0 ? r.width / anchoDelDocumento : null;
        if (anchoRelativo !== null && anchoRelativo >= maxAnchoRelativo) {
            anchas += 1;
            continue;
        }

        /* Confirmacion con el segundo instrumento, solo sobre las cajas ya
           senaladas: las cajas de linea que el texto renderiza de verdad,
           agrupadas por su borde superior. Deshace el estiramiento de una celda
           al alto de su fila y no toca nada mas. */
        let lineasRenderizadas = 0;
        try {
            const rango = document.createRange();
            rango.selectNodeContents(el);
            if (typeof rango.getClientRects === "function") {
                const topes = new Set();
                for (const q of rango.getClientRects()) {
                    if (q.width > 0 && q.height > 0)
                        topes.add(Math.round(q.top));
                }
                lineasRenderizadas = topes.size;
            }
        } catch {
            /* sin cajas de linea que contar se conserva el proxy */
        }
        const lineas =
            lineasRenderizadas > 0
                ? Math.min(lineasPorCaja, lineasRenderizadas)
                : lineasPorCaja;
        const ratio = caracteres / lineas;
        if (lineas < 3 || ratio >= minCaracteresPorLinea) {
            if (lineas < lineasPorCaja) estiradas += 1;
            continue;
        }
        ilegibles.push({
            zona: el.closest("header")
                ? "header"
                : el.closest("footer")
                  ? "footer"
                  : el.closest("main")
                    ? "main"
                    : "suelto",
            sel: el.tagName.toLowerCase(),
            ancho: Math.round(r.width * 100) / 100,
            porcentajeDelViewport:
                anchoRelativo === null
                    ? null
                    : Math.round(anchoRelativo * 1000) / 10,
            lineas,
            caracteres,
            ratio: Math.round(ratio * 100) / 100,
            texto: (bruto || "").trim().replace(/\s+/g, " ").slice(0, 40),
        });
    }
    return {
        examinadas,
        conTresLineas,
        estiradas,
        anchas,
        anchoDelDocumento,
        ilegibles,
    };
}

/** Animaciones realmente en marcha. */
function probeAnimations() {
    return document
        .getAnimations()
        .filter(
            (a) =>
                a.playState === "running" &&
                a.effect?.getTiming?.().duration !== 0,
        ).length;
}

/** Controles que quedarian invisibles con los colores forzados del sistema. */
function probeForcedColors() {
    const sospechosos = [
        ...document.querySelectorAll(
            "header a, header button, main a, main button",
        ),
    ].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cs = getComputedStyle(el);
        return cs.color === cs.backgroundColor;
    });
    return {
        forced: window.matchMedia("(forced-colors: active)").matches,
        invisible: sospechosos.length,
    };
}

/** Lo que llega sin JavaScript: contenido, navegacion e indice. */
function probeNoScript() {
    const main = document.querySelector("main");
    const header = document.querySelector("header");
    const toc = [...document.querySelectorAll("main nav a[href^='#']")];
    return {
        h1: document.querySelectorAll("h1").length,
        mainChars: main ? main.textContent.trim().length : 0,
        headerLinks: header ? header.querySelectorAll("a").length : 0,
        tocLinks: toc.length,
        tocAlive: toc.filter(
            (a) => !!document.getElementById(a.getAttribute("href").slice(1)),
        ).length,
    };
}

/* ------------------------------------------------------------------------- */

/**
 * Convierte el valor de `PLAYWRIGHT_CORE` en la lista de especificadores que se
 * van a intentar importar, en orden.
 *
 * POR QUE ES UNA FUNCION APARTE, Y POR QUE ES ASI DE EXPLICITA. La primera
 * version hacia `pathToFileURL(valor)` a secas, y con eso la salida de
 * emergencia que su propio comentario documentaba NO funcionaba: apuntando al
 * DIRECTORIO del paquete -- que es la lectura natural de "apunta
 * PLAYWRIGHT_CORE a un playwright-core ya instalado", y la ruta que se reparte
 * en los encargos -- el script moria con su propio mensaje de "no esta
 * instalado" (medido: EXIT=1). La causa es que un `import()` de una URL
 * `file://` de CARPETA no resuelve el `package.json` del paquete: eso solo pasa
 * cuando Node resuelve por NOMBRE de paquete dentro de un `node_modules`, y
 * aqui el paquete esta fuera del arbol del repo a proposito. Solo funcionaba
 * apuntando al fichero de entrada. Un candado que la ronda siguiente no sabe
 * ejecutar siguiendo sus propias instrucciones no es un candado.
 *
 * Asi que la ruta de un directorio se resuelve a mano a su fichero de entrada,
 * leyendo el `package.json` del paquete en el mismo orden que Node: `exports`
 * ("." → `import`, luego `default`), luego `main`, y por ultimo los `index` de
 * toda la vida. `playwright-core` no declara `main` -- solo `exports` --, asi
 * que quedarse en `main` no habria bastado (comprobado en el paquete real).
 */
export function especificadoresDePlaywright(valor) {
    const finales = ["playwright-core", "playwright"];
    if (!valor) return finales;

    /* Un nombre de paquete suelto se importa tal cual; solo las RUTAS pasan por
       la resolucion de abajo. */
    const esRuta = /[\\/]/.test(valor) || valor.startsWith(".");
    if (!esRuta) return [valor, ...finales];

    const candidatos = [];
    let esDirectorio = false;
    try {
        esDirectorio = statSync(valor).isDirectory();
    } catch {
        /* la ruta no existe: se intenta igual y el error sale abajo, con el
           mensaje que dice como instalarlo */
    }

    if (esDirectorio) {
        const entradas = [];
        try {
            const pkg = JSON.parse(
                readFileSync(path.join(valor, "package.json"), "utf8"),
            );
            const punto = pkg.exports?.["."];
            if (typeof punto === "string") entradas.push(punto);
            else if (punto && typeof punto === "object") {
                for (const clave of ["import", "default", "require"]) {
                    if (typeof punto[clave] === "string")
                        entradas.push(punto[clave]);
                }
            }
            if (typeof pkg.main === "string") entradas.push(pkg.main);
        } catch {
            /* sin package.json legible se cae a los index de abajo */
        }
        entradas.push("index.mjs", "index.js");
        for (const entrada of entradas) {
            candidatos.push(pathToFileURL(path.resolve(valor, entrada)).href);
        }
    } else {
        candidatos.push(pathToFileURL(valor).href);
    }
    return [...candidatos, ...finales];
}

/** Carga `chromium` sin exigir que Playwright sea dependencia del repo. */
export async function loadChromium() {
    /* `PLAYWRIGHT_CORE` admite el NOMBRE del paquete, la ruta de su fichero de
       entrada o la ruta de su DIRECTORIO -- que es la forma en que Playwright
       llega a esta maquina (dentro de `@playwright/cli`, fuera del
       `node_modules` del repo). Las tres formas las normaliza
       `especificadoresDePlaywright`. */
    for (const candidato of especificadoresDePlaywright(
        process.env.PLAYWRIGHT_CORE,
    )) {
        try {
            const mod = await import(candidato);
            if (mod.chromium) return mod.chromium;
        } catch {
            /* se prueba el siguiente */
        }
    }
    throw new Error(
        "Este candado necesita Playwright, que NO es dependencia del repo a " +
            "proposito (el gate no lo usa). Instalalo con " +
            "`npm i -g @playwright/cli` o apunta PLAYWRIGHT_CORE al paquete " +
            "playwright-core ya instalado: vale su directorio, su fichero de " +
            "entrada o su nombre si esta en el `node_modules` de este repo.",
    );
}

/** Un contexto nuevo por medicion: emular una media feature no se deshace. */
async function nuevoContexto(browser, theme, opciones) {
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ...opciones,
    });
    await ctx.addInitScript(
        ([t]) => {
            try {
                window.localStorage.setItem("vti-theme", t);
            } catch {
                /* almacenamiento no disponible: el tema cae al de por defecto */
            }
        },
        [theme],
    );
    return ctx;
}

/** Recorrido de teclado completo con cuenta de paradas y deteccion de ciclo. */
async function recorrerConTeclado(page, maxStops = 120) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const stops = [];
    const seen = new Set();
    let loop = false;
    for (let i = 0; i < maxStops; i++) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(probeFocusStop);
        if (stop.end) break;
        if (seen.has(stop.key) && i > 3) {
            loop = true;
            break;
        }
        seen.add(stop.key);
        stops.push(stop);
    }
    return {
        stops: stops.length,
        withoutRing: stops.filter((s) => !s.ringVisible).length,
        /* Un ciclo NO es una trampa: volver al principio tras recorrer la pagina
           es el comportamiento correcto. La trampa es no poder salir del sitio,
           y eso se detecta porque el recorrido se agota sin cerrar el ciclo. */
        trapped: !loop && stops.length >= maxStops,
    };
}

/**
 * El desplegable Â«MasÂ» de la barra ancha: abre, Escape cierra y el foco vuelve
 * al disparador.
 *
 * El contrato del componente lo canda `Navbar.test.tsx`; lo que NADIE
 * comprobaba, y es el hueco que declaro el evaluador, es que ese contrato se
 * cumple SOBRE ESTAS TRES SUPERFICIES -- que montan el Navbar completo desde la
 * ola M sin que ningun recorrido lo hubiera vuelto a mirar aqui.
 */
async function medirDisclosure(page) {
    const objetivo = await page.evaluate(() =>
        [...document.querySelectorAll("header button[aria-expanded]")]
            .filter((b) => b.getBoundingClientRect().width > 0)
            .map((b) => ({
                id: b.id,
                controls: b.getAttribute("aria-controls"),
            }))
            .find((b) => b.id && b.controls),
    );
    if (!objetivo) return { ausente: true };

    await page.click(`header button[id="${objetivo.id}"]`);
    await page.waitForTimeout(400);
    const abierto = await page.evaluate((o) => {
        const boton = document.getElementById(o.id);
        const panel = document.getElementById(o.controls);
        return {
            expanded: boton.getAttribute("aria-expanded"),
            panelExiste: !!panel,
            panelInerte: panel ? panel.hasAttribute("inert") : null,
        };
    }, objetivo);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const cerrado = await page.evaluate((o) => {
        const boton = document.getElementById(o.id);
        return {
            expanded: boton.getAttribute("aria-expanded"),
            focoDevuelto: document.activeElement === boton,
        };
    }, objetivo);

    return { ausente: false, abierto, cerrado };
}

/**
 * La hoja movil: abre como dialogo con nombre, atrapa el foco mientras esta
 * abierta, Escape la cierra y devuelve el foco al disparador.
 */
async function medirHojaMovil(page) {
    const trigger = await page.evaluate(() => {
        const boton = document.querySelector("[data-nav-sheet-trigger] button");
        if (!boton || boton.getBoundingClientRect().width === 0) return null;
        return { id: boton.id, controls: boton.getAttribute("aria-controls") };
    });
    if (!trigger) return { ausente: true };

    await page.click("[data-nav-sheet-trigger] button");
    await page.waitForTimeout(600);
    const abierto = await page.evaluate((t) => {
        const hoja = document.getElementById(t.controls);
        return {
            expanded: document
                .getElementById(t.id)
                .getAttribute("aria-expanded"),
            role: hoja?.getAttribute("role") ?? null,
            nombre: hoja?.getAttribute("aria-label") ?? null,
            visible: hoja ? getComputedStyle(hoja).visibility : null,
        };
    }, trigger);

    /* Foco atrapado: 25 tabulaciones sin salir de la hoja. Con `aria-modal`
       declarado, que el foco se escapara al fondo seria declarar una cosa y
       hacer la contraria. */
    let escapes = 0;
    for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        const dentro = await page.evaluate((t) => {
            const hoja = document.getElementById(t.controls);
            return (
                !!hoja &&
                !!document.activeElement &&
                hoja.contains(document.activeElement)
            );
        }, trigger);
        if (!dentro) escapes += 1;
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const cerrado = await page.evaluate((t) => {
        const boton = document.getElementById(t.id);
        const hoja = document.getElementById(t.controls);
        return {
            expanded: boton.getAttribute("aria-expanded"),
            inerte: hoja ? hoja.hasAttribute("inert") : null,
            focoDevuelto: document.activeElement === boton,
        };
    }, trigger);

    return { ausente: false, abierto, escapes, cerrado };
}

/** Aterrizaje de cada destino del indice: ninguno puede quedar bajo la barra. */
async function medirAterrizajeDelIndice(page, hrefs) {
    const covered = [];
    for (const href of hrefs) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(120);
        await page.click(`main nav a[href="${href}"]`);
        await page.waitForFunction(
            () => {
                const y = window.scrollY;
                if (window.__q2settle === y) return true;
                window.__q2settle = y;
                return false;
            },
            null,
            { polling: 120, timeout: 8000 },
        );
        const tapado = await page.evaluate((h) => {
            delete window.__q2settle;
            const destino = document.getElementById(h.slice(1));
            const header = document.querySelector("header");
            if (!destino || !header) return { falta: true };
            const barra = header.getBoundingClientRect();
            const fija = getComputedStyle(header).position === "fixed";
            const titulo = destino.querySelector("h2") ?? destino;
            const r = titulo.getBoundingClientRect();
            return {
                falta: false,
                tapado: fija && r.top < barra.bottom && r.bottom > barra.top,
                top: Math.round(r.top),
                barraBottom: Math.round(barra.bottom),
            };
        }, href);
        if (tapado.falta || tapado.tapado) covered.push({ href, ...tapado });
    }
    return covered;
}

/** Auditoria completa de una superficie. Devuelve la lista de incumplimientos. */
async function auditarSuperficie(browser, base, theme, surface) {
    const url = `${base}${surface.path}`;
    const fallos = [];
    const datos = {};

    // --- semantica + teclado + indice
    let ctx = await nuevoContexto(browser, theme);
    let page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const sem = await page.evaluate(probeSemantics);
    datos.status = resp ? resp.status() : null;
    datos.lang = sem.lang;
    datos.tocLinks = sem.tocHrefs.length;

    if (sem.visibility !== "visible")
        fallos.push(
            `la pestana no esta visible (${sem.visibility}): sin frames no se puede medir nada de esto`,
        );
    // [check: jerarquia-encabezados]
    if (sem.h1 !== 1)
        fallos.push(`${sem.h1} elementos h1 (se espera exactamente 1)`);
    if (sem.headingSkips.length)
        fallos.push(
            `saltos de nivel de encabezado: ${sem.headingSkips.join(", ")}`,
        );
    // [check: ids-unicos]
    if (sem.duplicatedIds.length)
        fallos.push(`ids duplicados: ${sem.duplicatedIds.join(", ")}`);
    // [check: aria-sin-referencias-colgantes]
    if (sem.danglingAria.length)
        fallos.push(
            `referencias aria colgantes: ${sem.danglingAria.join(", ")}`,
        );
    // [check: landmarks-con-nombre]
    if (sem.landmarks.length === 0)
        fallos.push(
            "ni un solo landmark de navegacion: la sonda quedaria vacua, vuelve a medir",
        );
    if (sem.unnamedLandmarks > 0)
        fallos.push(
            `${sem.unnamedLandmarks} landmark(s) de navegacion sin nombre`,
        );
    if (sem.collidingLandmarks > 0)
        fallos.push(
            `${sem.collidingLandmarks} landmark(s) de navegacion comparten nombre: no se distinguen entre si`,
        );

    const teclado = await recorrerConTeclado(page);
    datos.stops = teclado.stops;
    // [check: recorrido-teclado]
    if (teclado.stops === 0)
        fallos.push("cero paradas de teclado: la superficie no es operable");
    // [check: foco-visible]
    if (teclado.withoutRing > 0)
        fallos.push(
            `${teclado.withoutRing} parada(s) de teclado sin anillo de foco`,
        );
    // [check: sin-trampas-de-foco]
    if (teclado.trapped)
        fallos.push(
            "el recorrido de teclado no cierra el ciclo: posible trampa",
        );

    // [check: aterrizaje-del-indice]
    if (surface.kind === "legal") {
        if (sem.tocHrefs.length === 0)
            fallos.push("el documento legal no monta indice interno");
        const tapados = await medirAterrizajeDelIndice(page, sem.tocHrefs);
        datos.tocCovered = tapados.length;
        if (tapados.length)
            fallos.push(
                `${tapados.length} destino(s) del indice aterrizan bajo la barra fija (banda ~${NAV_BAND_PX} px): ${tapados
                    .map((t) => t.href)
                    .join(", ")}`,
            );
    }
    // [check: disclosure-escape-y-foco]
    const disclosure = await medirDisclosure(page);
    if (disclosure.ausente) {
        fallos.push(
            "no hay ningun disparador con aria-expanded visible en la cabecera: la sonda del desplegable seria vacua",
        );
    } else {
        datos.disclosure = `${disclosure.abierto.expanded}->${disclosure.cerrado.expanded}`;
        if (disclosure.abierto.expanded !== "true")
            fallos.push("el desplegable Â«MasÂ» no llega a declararse abierto");
        if (!disclosure.abierto.panelExiste)
            fallos.push(
                "el aria-controls del desplegable no apunta a ningun panel",
            );
        if (disclosure.cerrado.expanded !== "false")
            fallos.push("Escape no cierra el desplegable Â«MasÂ»");
        if (!disclosure.cerrado.focoDevuelto)
            fallos.push(
                "al cerrar el desplegable con Escape el foco no vuelve a su disparador",
            );
    }
    await ctx.close();

    // --- hoja movil, al ancho en el que la barra la entrega de verdad
    ctx = await nuevoContexto(browser, theme, {
        viewport: { width: 390, height: 844 },
    });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    // [check: hoja-movil-escape-y-foco]
    const hoja = await medirHojaMovil(page);
    if (hoja.ausente) {
        fallos.push(
            "a 390 px no hay disparador de hoja movil visible: la sonda seria vacua",
        );
    } else {
        datos.hoja = `${hoja.abierto.role ?? "sin rol"}/${hoja.escapes} escapes`;
        if (hoja.abierto.expanded !== "true")
            fallos.push("la hoja movil no llega a declararse abierta");
        if (hoja.abierto.role !== "dialog")
            fallos.push(
                `la hoja movil no es un dialogo (role=${hoja.abierto.role})`,
            );
        if (!hoja.abierto.nombre)
            fallos.push("la hoja movil se abre sin nombre accesible");
        if (hoja.escapes > 0)
            fallos.push(
                `el foco se escapa de la hoja movil ${hoja.escapes} vez/veces en 25 tabulaciones pese a su aria-modal`,
            );
        if (hoja.cerrado.expanded !== "false")
            fallos.push("Escape no cierra la hoja movil");
        if (hoja.cerrado.inerte !== true)
            fallos.push("la hoja movil cerrada no vuelve a quedar inerte");
        if (!hoja.cerrado.focoDevuelto)
            fallos.push(
                "al cerrar la hoja con Escape el foco no vuelve a su disparador",
            );
    }
    await ctx.close();

    // --- prefers-reduced-motion, con su referencia para que no sea vacuo
    ctx = await nuevoContexto(browser, theme, { reducedMotion: "reduce" });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const conReduce = await page.evaluate(probeAnimations);
    await ctx.close();

    ctx = await nuevoContexto(browser, theme);
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const sinReduce = await page.evaluate(probeAnimations);
    await ctx.close();

    datos.animaciones = `${conReduce}/${sinReduce}`;
    // [check: reduced-motion]
    if (conReduce > 0)
        fallos.push(
            `${conReduce} animacion(es) siguen vivas con prefers-reduced-motion: reduce`,
        );
    if (sinReduce === 0)
        fallos.push(
            "cero animaciones sin la preferencia: la sonda de reduced-motion seria vacua, vuelve a medir",
        );

    // --- forced-colors
    ctx = await nuevoContexto(browser, theme, { forcedColors: "active" });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const forced = await page.evaluate(probeForcedColors);
    await ctx.close();

    // [check: forced-colors]
    if (!forced.forced)
        fallos.push(
            "forced-colors: active no llego a la pagina: la emulacion no se aplico",
        );
    if (forced.invisible > 0)
        fallos.push(
            `${forced.invisible} control(es) quedan invisibles con forced-colors: active`,
        );

    // --- barrido responsive
    ctx = await nuevoContexto(browser, theme, {
        viewport: { width: WIDTH_SWEEP[WIDTH_SWEEP.length - 1], height: 900 },
    });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const desbordes = [];
    for (const width of WIDTH_SWEEP) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(220);
        const o = await page.evaluate(probeOverflow);
        if (o.scrollWidth > o.width + 1)
            desbordes.push(`${width}px (scrollWidth ${o.scrollWidth})`);
    }
    await ctx.close();
    datos.anchos = `${WIDTH_SWEEP.length - desbordes.length}/${WIDTH_SWEEP.length}`;
    // [check: responsive-sin-desbordamiento]
    if (desbordes.length)
        fallos.push(`desbordamiento horizontal en ${desbordes.join(", ")}`);

    /*
     * --- texto al 200 %, el MISMO barrido de anchos con la raiz al doble
     *
     * Se reutiliza `WIDTH_SWEEP` y no una lista propia a proposito: su extension
     * ya esta atada por el test companero (los dos extremos del encargo, el
     * escalon `md`, estrictamente creciente), y una segunda lista seria una
     * segunda cosa que puede encoger sin que nadie se entere.
     *
     * CON `reducedMotion: reduce`, y esto hay que explicarlo porque parece una
     * concesion y no lo es. Las secciones de la home entran con un reveal cuyo
     * estado de reposo incluye un desplazamiento horizontal
     * (`transform: translateX(16%)` en la tercera linea del statement de Story,
     * por ejemplo). Medida sin la preferencia, esa linea aparece 44,19 px fuera
     * del viewport a 1920 px -- pero no es contenido perdido: es el fotograma
     * inicial de una animacion que aterriza dentro en cuanto la seccion se
     * revela. Con `reduce` el repo declara los estados FINALES de esos reveals
     * (opacity 1, transform none), asi que la sonda mide la composicion asentada
     * en vez de un instante de su entrada. Y es ademas la combinacion que de
     * verdad importa: quien sube el tamano de texto por necesidad suele llevar
     * tambien la preferencia de movimiento reducido.
     */
    ctx = await nuevoContexto(browser, theme, {
        viewport: { width: WIDTH_SWEEP[WIDTH_SWEEP.length - 1], height: 900 },
        reducedMotion: "reduce",
    });
    page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Page.setFontSizes", {
        fontSizes: { standard: ZOOM_FONT_PX, fixed: ZOOM_FONT_PX },
    });
    await page.goto(url, { waitUntil: "networkidle" });
    const sinSancionar = [];
    const excedidas = [];
    const ilegibles = [];
    const deudaVista = new Set();
    let raizMedida = null;
    let candidatosVistos = 0;
    let examinadasVistas = 0;
    let conTresLineasVistas = 0;
    let estiradasVistas = 0;
    let anchasVistas = 0;
    for (const width of WIDTH_SWEEP) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(220);
        const z = await page.evaluate(probePerdidaHorizontal);
        raizMedida = z.rootFontPx;
        candidatosVistos += z.candidatos;
        for (const p of z.perdidos) {
            const sancion = sancionDeZoom(p.zona, surface.kind);
            if (!sancion) {
                sinSancionar.push(
                    `${width}px ${p.zona}/${p.sel} ${p.sobra} px fuera por la ${p.lado} ("${p.texto}")`,
                );
                continue;
            }
            deudaVista.add(sancion.clave);
            if (p.sobra > sancion.topePx)
                excedidas.push(
                    `${sancion.clave} a ${width}px: ${p.sobra} px fuera por la ${p.lado}, por encima de los ${sancion.topePx} px sancionados ("${p.texto}")`,
                );
        }

        /* La MISMA pasada y el MISMO contexto que la familia de arriba: el
           montaje de esta medida --raiz a 32 px por CDP, `reduce` activo, el
           barrido entero de anchos-- es identico, y repetirlo en un contexto
           propio doblaria el coste del script para medir exactamente la misma
           composicion. */
        const leg = await page.evaluate(probeLegibilidadDeTexto, {
            minCaracteresPorLinea: MIN_CARACTERES_POR_LINEA,
            maxAnchoRelativo: MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA,
        });
        examinadasVistas += leg.examinadas;
        conTresLineasVistas += leg.conTresLineas;
        estiradasVistas += leg.estiradas;
        anchasVistas += leg.anchas;
        for (const c of leg.ilegibles) {
            /* El porcentaje del viewport va en el mensaje porque es el segundo
               factor del veredicto: sin el, quien lee el informe no puede
               distinguir el defecto de rellenos de la tipografia grande que
               WCAG exige que crezca. */
            const relativo =
                c.porcentajeDelViewport === null
                    ? "ancho del viewport no disponible"
                    : `${c.porcentajeDelViewport} % del viewport`;
            ilegibles.push(
                `${width}px ${c.zona}/${c.sel} caja de ${c.ancho} px (${relativo}): ${c.caracteres} caracteres en ${c.lineas} lineas (${c.ratio} por linea) ("${c.texto}")`,
            );
        }
    }
    await ctx.close();
    datos.zoom200 = `@${raizMedida}px ${sinSancionar.length} perdidas / ${candidatosVistos} cajas de contenido`;
    datos.legibilidad = `${ilegibles.length} ilegibles / ${conTresLineasVistas} cajas de 3+ lineas de ${examinadasVistas} con texto (${estiradasVistas} descartadas por caja estirada, ${anchasVistas} por caja ancha)`;

    // [check: texto-al-200-por-ciento]
    /* Segunda guarda de vacuidad, la del FILTRO (critica externa #19): la sonda
       solo mira cajas con texto propio o interactivas, y un filtro que dejara de
       ver esas cajas -- un cambio de marcado, un selector mal escrito -- dejaria
       el barrido midiendo el vacio y saliendo verde. La cuenta de candidatos es
       de miles en cualquier superficie real; cero significa que el instrumento
       esta roto, no que la pagina este limpia. */
    if (candidatosVistos === 0)
        fallos.push(
            "la sonda de zoom no encontro ni una sola caja con texto o interactiva en todo el barrido: el filtro esta roto y el resultado seria vacuo",
        );
    /* Guarda de vacuidad, y no es teorica: si la emulacion no llega a la pagina
       -- version de Chrome sin `Page.setFontSizes`, sesion de CDP caida, un
       `html { font-size: 16px }` que fije la raiz --, el barrido de arriba mide
       la pagina SIN zoom y sale verde sobre el defecto que existe para cazar. */
    if (raizMedida !== ZOOM_FONT_PX)
        fallos.push(
            `la preferencia de tamano de texto no llego a la pagina (raiz ${raizMedida} px, se pidio ${ZOOM_FONT_PX}): el barrido de zoom seria vacuo`,
        );
    if (sinSancionar.length)
        fallos.push(
            `con el texto al 200 % (raiz ${ZOOM_FONT_PX} px) se pierde contenido en una zona NO sancionada, sin scroll horizontal que lo alcance: ${sinSancionar.join("; ")}`,
        );
    if (excedidas.length)
        fallos.push(`deuda de zoom empeorada: ${excedidas.join("; ")}`);

    // [check: legibilidad-al-200-por-ciento]
    /* Las dos guardas de vacuidad de esta familia, con el mismo criterio que las
       de arriba: `examinadas` son las cajas con texto que la sonda llego a
       mirar, `conTresLineas` las que superaron el corte de altura. A 320 px con
       la raiz a 32 hay decenas de las segundas en cualquier superficie real; un
       cero en cualquiera de las dos es el instrumento roto, no la pagina
       limpia. */
    if (examinadasVistas === 0)
        fallos.push(
            "la sonda de legibilidad no examino ni una sola caja con texto en todo el barrido: el filtro esta roto y el resultado seria vacuo",
        );
    if (conTresLineasVistas === 0)
        fallos.push(
            "la sonda de legibilidad no encontro ni una sola caja de tres o mas lineas en todo el barrido: sin ellas la metrica no llega a evaluarse y el verde seria vacuo",
        );
    if (ilegibles.length)
        fallos.push(
            `con el texto al 200 % (raiz ${ZOOM_FONT_PX} px) hay texto que no se pierde pero no se puede leer, por debajo de ${MIN_CARACTERES_POR_LINEA} caracteres por linea en cajas de menos del ${MAX_ANCHO_RELATIVO_DE_CAJA_ESTRECHA * 100} % del viewport: ${ilegibles.join("; ")}`,
        );

    // --- sin JavaScript
    ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        javaScriptEnabled: false,
    });
    page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const sinJs = await page.evaluate(probeNoScript);
    await ctx.close();

    datos.sinJs = `${sinJs.mainChars} car., ${sinJs.headerLinks} enlaces de cabecera`;
    // [check: sin-javascript]
    if (sinJs.h1 !== 1)
        fallos.push(`sin JavaScript la superficie sirve ${sinJs.h1} h1`);
    if (sinJs.mainChars === 0)
        fallos.push("sin JavaScript el cuerpo llega vacio");
    if (sinJs.headerLinks === 0)
        fallos.push("sin JavaScript la cabecera llega sin un solo enlace");
    if (surface.kind === "legal" && sinJs.tocAlive !== sinJs.tocLinks)
        fallos.push(
            `sin JavaScript ${sinJs.tocLinks - sinJs.tocAlive} destino(s) del indice no resuelven`,
        );

    return { surface: surface.nombre, datos, fallos, deudaVista };
}

/** Audita las seis superficies y devuelve el informe completo. */
export async function auditLegalSurfaces({
    base = "http://localhost:3000",
    theme = "dark",
} = {}) {
    const chromium = await loadChromium();
    const browser = await chromium.launch({ channel: "chrome" });
    try {
        const results = [];
        for (const surface of SURFACES) {
            results.push(
                await auditarSuperficie(browser, base, theme, surface),
            );
        }
        /*
         * La tercera regla de `DEUDA_ZOOM`: una sancion que ya no se reproduce
         * sobra, y mientras siga escrita tapa la siguiente regresion de esa
         * misma zona. Solo se puede comprobar con la corrida COMPLETA delante
         * -- una deuda de la 404 no se observa auditando `/privacidad` --, asi
         * que vive aqui y no en `auditarSuperficie`.
         */
        const vistas = new Set(
            results.flatMap((r) => [...(r.deudaVista ?? [])]),
        );
        const sobrantes = fallosDeDeudaNoObservada(vistas);
        results.push({
            surface: "deuda de zoom",
            datos: {
                sancionadas: DEUDA_ZOOM.length,
                observadas: vistas.size,
            },
            fallos: sobrantes,
            deudaVista: vistas,
        });
        return results;
    } finally {
        await browser.close();
    }
}

/*
 * CLI. Se ejecuta solo cuando este fichero ES el punto de entrada; importado
 * desde el test no lanza ningun navegador ni llama a process.exit.
 */
if (
    process.argv[1] &&
    process.argv[1].replace(/\\/g, "/").endsWith("check-site-surfaces.mjs")
) {
    const arg = (nombre, porDefecto) => {
        const encontrado = process.argv.find((a) =>
            a.startsWith(`--${nombre}=`),
        );
        return encontrado
            ? encontrado.split("=").slice(1).join("=")
            : porDefecto;
    };
    const base = arg("base", "http://localhost:3000").replace(/\/$/, "");
    const theme = arg("tema", "dark");

    const results = await auditLegalSurfaces({ base, theme });
    let incumple = 0;
    for (const r of results) {
        const resumen = Object.entries(r.datos)
            .map(([k, v]) => `${k}=${v}`)
            .join("  ");
        console.log(`${r.surface.padEnd(20)} | ${resumen}`);
        for (const fallo of r.fallos) {
            incumple += 1;
            console.log(`  NO CUMPLE  ${fallo}`);
        }
    }
    console.log("-".repeat(72));
    /* `SURFACES.length` y no `results.length`: la ultima fila del informe no es
       una superficie, es el balance de `DEUDA_ZOOM` sobre la corrida completa. */
    console.log(
        incumple === 0
            ? `CUMPLE - ${SURFACES.length} superficies, ${CHECKS.length} familias, ${DEUDA_ZOOM.length} zonas de zoom sancionadas, cero incumplimientos (tema ${theme}, base ${base})`
            : `NO CUMPLE - ${incumple} incumplimiento(s) en ${SURFACES.length} superficies`,
    );
    process.exit(incumple === 0 ? 0 : 1);
}
