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
 * QUE MIDE, y por que en navegador y no en la suite. Las veintitres familias de
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
 * LA FAMILIA DIECISIETE, `texto-crece-con-la-preferencia`, entra el 2026-09-05
 * con el P1 del revisor adversarial, y es la que las dos anteriores no podian
 * ver POR CONSTRUCCION. Las dos miden CONSECUENCIAS de que el texto crezca --que
 * no se salga y que se pueda leer-- y un texto que NO crece no hace ninguna de
 * las dos cosas: se queda exactamente donde estaba, con el candado en verde. El
 * revisor comparo el `font-size` computado de 173 cajas con la raiz a 16 y a 32
 * px y encontro que el `h1` del hero, su wordmark, la tagline y el statement de
 * Story no se mueven: sus `clamp()` llevan suelo y techo en PIXELES con el
 * termino preferido en `vw`, que es el patron de fallo F94 de WCAG 1.4.4. Medir
 * la consecuencia no sustituye a medir la propiedad.
 *
 * MIDE EN LA BANDA DE REFLOW Y EN LOS DOS SENTIDOS. Dos contextos por superficie
 * y tema --`Page.setFontSizes` a 16 y a 32 px-- recorren `BANDA_DE_REFLOW`, se
 * emparejan las cajas por ruta estructural y texto, y toda caja cuya razon
 * `32/16` quede por debajo de `RATIO_MINIMO_DE_CRECIMIENTO` en TODOS los anchos
 * de la banda entra en el informe. El porque de la banda estrecha, del minimo de
 * 1.5 y de la absolucion por ancho esta en los docblocks de esas tres
 * constantes, con la tipografia fluida legitima que obligo a cada uno.
 *
 * CIFRAS DE LA FAMILIA DIECISIETE, medidas el 2026-09-05 sobre el build servido
 * de `dcafec4` -- que TODAVIA NO lleva el arreglo de la tipografia del hero, asi
 * que la portada sale en rojo a proposito y las seis superficies restantes en
 * verde, en los dos temas:
 *
 *   /                 6 (claro) o 3 (oscuro) sin crecer / 114 (109) cajas
 *                     comparadas, 0 (6) absueltas por la banda
 *   /en               6 (claro) o 3 (oscuro) sin crecer / 114 (109) cajas
 *                     comparadas, 0 (6) absueltas por la banda
 *   /privacidad       0 sin crecer / 151 cajas comparadas, 0 absueltas
 *   /en/privacy       0 sin crecer / 151 cajas comparadas, 0 absueltas
 *   /aviso-legal      0 sin crecer / 97 cajas comparadas, 0 absueltas
 *   /en/legal-notice  0 sin crecer / 97 cajas comparadas, 0 absueltas
 *   404 (es)          0 sin crecer / 29 cajas comparadas, 0 absueltas
 *   404 (en)          0 sin crecer / 29 cajas comparadas, 0 absueltas
 *
 * «NO CUMPLE - 2 incumplimiento(s) en 8 superficies», EXIT=1 en los dos temas.
 * El defecto es de otro frente de la misma ola y este fichero no lo toca: lo que
 * se entrega aqui es el instrumento que lo ve. Las lineas de la portada clara,
 * literales y recortadas en los selectores por el margen:
 *
 *   NO CUMPLE  con la preferencia de tamano de texto al 200 % (raiz 16 -> 32
 *   px) hay texto que NO crece en toda la banda de reflow, por debajo de x1.5:
 *   main/span ("Void") 34 -> 34 px (x1) a 320px y 34 -> 34 px (x1) a 390px
 *   [...>h1:nth-child(1)>span:nth-child(1)>span:nth-child(1)]; main/span
 *   ("ToInfinite") 34 -> 34 px (x1) a 320px y 34 -> 34 px (x1) a 390px [...];
 *   main/p ("Tu presente ya es tu futuro, solo falta que sigas definiéndo") 15
 *   -> 15 px (x1) a 320px y 15 -> 15 px (x1) a 390px [...]; main/span ("CADA
 *   IDEA") 24 -> 24 px (x1) a 320px y 29.8333 -> 29.25 px (x0.98) a 390px
 *   [...]; main/span ("PUEDE SER") ... ; main/span ("UN NUEVO COMIENZO") ...
 *
 * Las seis del tema claro son las dos mitades del wordmark del hero («Void» y
 * «ToInfinite», 34 -> 34 px en los dos anchos), la tagline (15 -> 15) y las tres
 * lineas del statement de Story (24 -> 24 a 320 px y 29.8333 -> 29.25 a 390, o
 * sea que ENCOGE); en el tema oscuro, que monta otro vehiculo para Story, son
 * las tres primeras. Las SEIS ABSUELTAS del tema oscuro son las seis etiquetas
 * de paso del deck de Journey, que crecen x1.75 a 320 px y x1.44 a 390: la
 * tipografia fluida legitima que obligo a que la banda absuelva por ancho.
 *
 * La caja de control --el cuerpo, `font-size: 1rem`-- pasa de 16 a 32 px en las
 * ocho superficies y en los dos temas, que es lo que dice que la emulacion
 * llego y que ese x1.00 de arriba es del sitio y no del aparato.
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
 * barrido completo de anchos, las veintitres familias con su suelo numerico, la
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
 * son veintitres, con las de legibilidad y crecimiento, las cuatro de la
 * critica #19 y las dos de la #20 que entran abajo.) El segundo numero
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
 * `lang` YA NO SE LEE SOLO DEL DOM VIVO, y ese cambio es la familia diecinueve.
 * La version anterior de este docblock cerraba aqui diciendo que el HTML
 * horneado sirve `lang="es"` en las ocho rutas, que era "un limite conocido y
 * declarado de `output: export`", y que "el HTML crudo no es asunto suyo". Eso
 * es exactamente lo que la critica #19 levanto como P1: un limite escrito en un
 * comentario no cierra un incumplimiento de nivel A (leccion del 2026-09-06,
 * regla 3), y lo que oye un lector de pantalla antes de que hidrate el cliente
 * --o si el JavaScript no llega-- es el atributo horneado. Desde esta fecha el
 * script compara los DOS, cada uno contra el idioma que su ruta promete
 * (`langEsperado`), y la unica excepcion que acepta es la de las dos 404, que
 * comparten un solo `404.html` castellano por `output: "export"`.
 *
 * LAS CUATRO FAMILIAS DE LA CRITICA #19 (dieciocho a veintiuna), medidas con
 * ESTE MISMO SCRIPT el 2026-09-06 sobre la copia servida del build de `f3594ad`
 * en http://localhost:3000 -- que es el build con los cinco P1 vivos, asi que
 * las cuatro salen en ROJO a proposito y las diecisiete anteriores siguen en
 * VERDE en los dos temas, que es la prueba de que ven el defecto real y no
 * cualquier cosa. Las lineas, literales:
 *
 *   tema dark (EXIT=1, «NO CUMPLE - 9 incumplimiento(s) en 8 superficies»)
 *
 *     NO CUMPLE  con la preferencia de tamano de texto subida y SIN
 *     prefers-reduced-motion, el contenido de la diapositiva activa no cabe en
 *     el escenario que lo recorta y se pierde (peor caso por deck): story
 *     1249.19 px fuera por abajo a 320px con la raiz a 32 px en p
 *     ("VoidToInfinite es un proyecto donde el a"); journey 401.41 px fuera por
 *     abajo a 320px con la raiz a 32 px en p ("Cada descubrimiento crea una
 *     pregunta nu")
 *
 *     NO CUMPLE  sin JavaScript el documento se sirve anunciandose en "es" y
 *     esta superficie es "en": lo que oye un lector de pantalla antes de que
 *     hidrate el cliente --o si el JavaScript no llega-- es la pagina entera
 *     con la voz equivocada
 *
 *     NO CUMPLE  recargar la pagina no devuelve al visitante donde estaba:
 *     antes de recargar el centro del viewport leia contact a 9000 px y despues
 *     lee journey a 5623 px (deriva -3377 px)
 *
 *     NO CUMPLE  el navegador descarga arte que la pagina no llega a pintar en
 *     el tema dark (tope 0 B): a DPR 1 87260 B en 1 fichero(s):
 *     journey-presenting-640.webp 87260 B; a DPR 2 163368 B en 1 fichero(s):
 *     journey-presenting-1024.webp 163368 B. Es peso que paga el visitante y
 *     que ninguna imagen del documento usa
 *
 *   tema light (EXIT=1, «NO CUMPLE - 3 incumplimiento(s) en 8 superficies»):
 *   las TRES son la misma linea de `lang` en `/en`, `/en/privacy` y
 *   `/en/legal-notice`. Las otras tres familias salen en verde ahi, y ese verde
 *   es su CONTROL, no su ausencia:
 *
 *     /  deck=sin deck en el tema light (0 montados)
 *        recarga=contact@5065 -> contact@5081 (deriva 16 px, alto 6588 -> 6588)
 *        arte=0 combinacion(es) con arte sin pintar / 10 recursos de arte
 *             vistos en 2 densidades
 *
 *   El peor caso del deck que este script mide (1249,19 px) es MAYOR que los
 *   ~706 px que la sonda del arbitraje de la critica #19 reporto para el CTA de
 *   Discord, y no es una contradiccion: aquella sonda miraba el CTA y esta
 *   recorre TODOS los descendientes con texto propio o interactivos de la
 *   diapositiva activa, asi que el peor caso lo firma un parrafo entero. El
 *   sentido y el orden de magnitud coinciden.
 *
 *   Las guardas de vacuidad de las cuatro, en la misma corrida: `deck=2 deck(s)
 *   recortados / 2 montados, 408 pasos de pista, activas vistas story=156
 *   journey=180` (los dos decks montados, diapositivas activas vistas en los
 *   dos), `34 recursos de arte vistos en 2 densidades` en oscuro y 10 en claro,
 *   y las dos secciones de la recarga resueltas (`contact` y `journey`, nunca
 *   `sin seccion`).
 *
 *   COSTE MEDIDO: 321 s el tema claro y algo mas de 600 s el oscuro (el oscuro
 *   monta las seis combinaciones del deck y el claro solo una; el reloj del
 *   oscuro no se cronometro con exactitud porque el comando se movio a segundo
 *   plano al llegar al tope de 600 s de la herramienta y termino poco despues).
 *   Si algun dia pasa de doce minutos, la palanca acordada es recortar
 *   `ANCHOS_DEL_DECK` a `[320]` conservando las tres raices.
 *
 * LAS DOS FAMILIAS DE LA CRITICA #20 (veintidos y veintitres), medidas con ESTE
 * MISMO SCRIPT el 2026-09-07 sobre el build servido en http://localhost:4321 --
 * que es el build con los tres P1 vivos, asi que las dos salen en ROJO a
 * proposito sobre las DOS portadas y en los DOS temas, y las veintiuna
 * anteriores siguen en VERDE en las ocho superficies. Las lineas, literales y
 * recortadas donde se repiten:
 *
 *   FAMILIA VEINTIDOS, tema dark, `/` (identica en `/en` y en el tema claro,
 *   con el rotulo del disparador en su idioma y 62 focalizables en vez de 76):
 *
 *     NO CUMPLE  al cambiar de anchura con la hoja movil abierta el estado
 *     modal sobrevive al contexto que lo justificaba (3 de 3 cruces): 390x844
 *     -> 844x390 a DPR 1 -- tras cruzar a 844x390 a DPR 1 quedan 0 controles
 *     operables de 76 focalizables: la pagina entera deja de poder usarse;
 *     siguen inertes 7 nodo(s) que no son la hoja ni cuelgan de ella (div, a,
 *     header, div#_R_79laivbH1_, main#main, footer, next-route-announcer): el
 *     fondo que la hoja inertizo no se libero al cambiar de anchura; 1
 *     dialogo(s) siguen declarandose aria-modal="true" sin caja alcanzable
 *     (div#_R_5aivbH1_[role=dialog] caja 0x0 en (0, 0)): reclaman la pagina
 *     entera desde fuera de la pantalla; 1 disparador(es) siguen diciendo
 *     aria-expanded="true" con la caja a cero (button#_R_5aivb_ ("Cerrar el
 *     menu de navegacion")): nadie puede deshacer lo que declaran | [los otros
 *     dos cruces, a 1280x390 con DPR 1 y DPR 3, dan lo mismo palabra por
 *     palabra]
 *
 *   Su guarda de vacuidad en la misma corrida: `hojaAlCruzar=0/3 cruces
 *   conservan la pagina usable, 3/3 hojas abiertas, operables tras cruzar
 *   844x390@dpr1=0 1280x390@dpr1=0 1280x390@dpr3=0`. Las tres hojas se abrieron
 *   de verdad --15 controles operables dentro de cada una-- y las tres cruzaron
 *   a cero. El defecto no depende de la densidad ni del ancho de destino.
 *
 *   FAMILIA VEINTITRES, tema dark, `/`:
 *
 *     NO CUMPLE  la tinta de la cabecera fija no llega al umbral de WCAG 1.4.3
 *     contra el fondo REALMENTE pintado bajo su caja (peor punto por pieza,
 *     percentil 5): 1440x900 reduce=no-preference "Español" (14 px, peso 700,
 *     umbral 4.5): p05 3.77 en y = 9300, mediana 7.49, 23.6 % de la caja bajo
 *     umbral, tinta rgb(72, 196, 255) sobre rgb(86, 87, 90); 1440x900
 *     reduce=no-preference "English" (14 px, peso 400, umbral 4.5): p05 3.56 en
 *     y = 9300, mediana 3.73, 92.3 % de la caja bajo umbral, tinta rgb(183,
 *     183, 187) sobre rgb(88, 89, 92); 1440x900 reduce=reduce "Español" (14 px,
 *     peso 700, umbral 4.5): p05 3.66 en y = 6000, mediana 3.82, 92 % de la
 *     caja bajo umbral, tinta rgb(72, 196, 255) sobre rgb(85, 87, 92); 1440x900
 *     reduce=reduce "English" (14 px, peso 400, umbral 4.5): p05 3.62 en y =
 *     6000, mediana 3.79, 100 % de la caja bajo umbral, tinta rgb(183, 183,
 *     187) sobre rgb(86, 88, 92)
 *
 *   Y EL EJE DE `reduce` PAGO EN LA PRIMERA CORRIDA, que es lo que hay que leer
 *   con cuidado: la familia falla en los DOS sentidos, pero en PUNTOS
 *   DISTINTOS. Sin la preferencia el peor punto esta en y = 9.300 --el mismo que
 *   el arbitraje de la #20-- y con ella en y = 6.000, porque con `reduce` el
 *   documento no se pina y bajo la barra pasa otro tramo del arte. Medir solo
 *   una de las dos combinaciones no habria dado "un poco menos": habria dado
 *   otro sitio. Con el punto FIJADO en 9.280, que es donde midio el arbitraje,
 *   las mismas dos piezas dan 8,76 y 8,85 con `reduce` (medido el 2026-09-07 con
 *   sonda propia antes de escribir esta familia) y por eso aquella medida
 *   parecia un falso positivo.
 *
 *   EL TEMA CLARO NO ES EL CONTROL DE ESTA FAMILIA, y hay que decirlo porque la
 *   costumbre de las familias anteriores invita a leerlo asi: tambien sale en
 *   rojo, con SIETE piezas bajo umbral en `/` y cuatro en `/en`, y son los
 *   enlaces de la propia navegacion sobre el arte claro. La peor, literal:
 *
 *     1440x900 reduce=no-preference "Story" (14 px, peso 500, umbral 4.5): p05
 *     3.62 en y = 3600, mediana 3.84, 100 % de la caja bajo umbral, tinta
 *     rgb(99, 99, 99) sobre rgb(206, 192, 241)
 *
 *   Es un hallazgo NUEVO de este instrumento, no el P1 de la #20 --que era
 *   oscuro-- y no lo arregla este frente.
 *
 *   Las guardas de vacuidad de la familia, en la misma corrida:
 *   `contrasteCabecera=4 pieza(s) bajo umbral / 26 comprobadas de 26 vistas en
 *   118 puntos de barrido (767 mediciones, paso 300 px, 18 descartadas por caja
 *   minuscula, 0 por tinta translucida)`. Las 26 vistas son la suma de las
 *   cuatro combinaciones (11 + 11 piezas en la cabecera ancha, 2 + 2 en la
 *   estrecha) y las 18 minusculas son los rotulos de 1x1 px para lectores de
 *   pantalla.
 *
 *   COSTE MEDIDO el 2026-09-07 contra el build servido: el tema CLARO completo
 *   --las ocho superficies, `pnpm exec` fuera-- 7 min 16 s (`real 7m16.016s`),
 *   EXIT=1, «NO CUMPLE - 4 incumplimiento(s) en 8 superficies». El tema OSCURO
 *   no cabe de una sola vez en el tope de 600 s de la herramienta con la que se
 *   ejecuto, asi que se corrio en DOS MITADES contra el mismo servidor: las dos
 *   portadas (543 s, «NO CUMPLE - 4 incumplimiento(s)») y las seis superficies
 *   restantes (251 s, «CUMPLE - 6 superficies, 23 familias, 0 zonas de zoom
 *   sancionadas, cero incumplimientos»), o sea 794 s en total. Las dos familias
 *   nuevas anaden unos 100 s por portada; si el techo de trece minutos se cruza,
 *   la palanca acordada es subir `PASO_DEL_BARRIDO_DE_CABECERA`, nunca recortar
 *   `REDUCES_DE_LA_CABECERA`.
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
 * medio son los saltos reales del sistema: el escalon `md` --768 px a la raiz
 * por defecto (48em)-- por el que la barra cambia de la hoja movil a la fila, y
 * los anchos de dispositivo que el repo ya usa en sus mediciones.
 *
 * EL ESCALON ES UN ANCHO EFECTIVO, NO UN ANCHO DE VIEWPORT (frente F,
 * 2026-09-05): desde esa fecha los cuatro breakpoints del tema se declaran en
 * `em`, asi que valen 768 px con la tipografia de fabrica y el doble con la
 * preferencia de tamano de texto al 200 %. Este barrido sigue midiendo
 * viewports en pixeles --que es lo que un navegador tiene-- y por eso las
 * pasadas con `Page.setFontSizes` a 32 px cruzan el escalon en 1536, no en 768.
 */
export const WIDTH_SWEEP = [
    320, 360, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1920,
];

/**
 * Las veintitres familias que este script comprueba. La lista es el CONTRATO del
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
    "texto-crece-con-la-preferencia",
    "sin-javascript",
    "deck-cabe-en-el-escenario-al-200-por-ciento",
    "lang-del-documento-por-ruta",
    "recarga-conserva-la-seccion",
    "arte-no-pintado-por-tema-y-dpr",
    "estado-modal-no-sobrevive-al-cambio-de-anchura",
    "contraste-de-la-cabecera-sobre-lo-que-pasa-por-debajo",
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
 * LA BANDA DE REFLOW en la que se mide la familia DIECISIETE,
 * `texto-crece-con-la-preferencia`: los dos anchos estrechos del barrido, y
 * SOLO esos dos. Hay que explicar por que, porque medir en menos sitios suena
 * siempre a candado mas flojo y aqui es al reves.
 *
 * LO QUE LA FAMILIA MIDE es la PROPIEDAD, no la consecuencia: que el
 * `font-size` computado de cada caja crezca cuando el usuario sube la
 * preferencia de tamano de texto. Las dos familias hermanas miden consecuencias
 * --que no se pierda contenido y que se pueda leer-- y por construccion NO ven
 * un texto que no crece: un texto que se queda igual no se sale de ningun lado
 * ni se parte en trocitos. El patron de fallo es F94 de WCAG 1.4.4, un
 * `clamp()` de `font-size` con suelo y techo en PIXELES y el termino preferido
 * en `vw`.
 *
 * POR QUE SOLO EN LA BANDA ESTRECHA, con la medida que lo obliga. La tipografia
 * fluida legitima de este repo se pide como `clamp(<rem>, <vw>, <rem>)`, y ese
 * patron NO dobla alli donde el termino en `vw` ya domina al suelo con la raiz
 * de fabrica. Medido el 2026-09-05 sobre el build servido de `dcafec4`, tema
 * oscuro, la etiqueta de paso del deck de Journey --`clamp(1.75rem, 10vw,
 * 11rem)`, `JOURNEY_DECK_STEP_LABEL_SIZE`--:
 *
 *   a 320 px   32 px con la raiz a 16  ->  56 px con la raiz a 32   (x1.75)
 *   a 390 px   39 px con la raiz a 16  ->  56 px con la raiz a 32   (x1.44)
 *
 * A 390 el `vw` gana con la raiz de fabrica (39 > 28) y el crecimiento se queda
 * en x1.44; a 320 manda el suelo en `rem` y crece x1.75. El texto CRECE en los
 * dos casos --que es lo que WCAG 1.4.4 exige-- y acotarlo seria justamente el
 * F94 que esta familia persigue. Por eso la banda es estrecha: es donde el
 * suelo en `rem` manda y donde un texto que no crece no tiene coartada.
 *
 * Y por eso, ademas, una caja solo se declara sin crecimiento cuando falla en
 * TODOS los anchos de la banda en los que se la pudo comparar (ver
 * `fallosDeCrecimientoEnLaBanda`): la etiqueta de Journey pasa a 320 y queda
 * absuelta, y el `h1` del hero, que se queda en 34 px en los dos, no.
 *
 * Los dos anchos son los dos primeros de `WIDTH_SWEEP` y el test companero lo
 * exige: una banda que se despegara del barrido seria una tercera lista que
 * puede encoger sola.
 */
export const BANDA_DE_REFLOW = [320, 390];

/**
 * El crecimiento MINIMO que se le exige al `font-size` computado de una caja
 * cuando la raiz pasa de `ROOT_FONT_BASE_PX` a `ZOOM_FONT_PX`, o sea cuando el
 * usuario pide el 200 % de tamano de texto.
 *
 * No es 2 a proposito: la tipografia fluida legitima del repo crece x1.75 a 320
 * px (medida arriba) porque su suelo en `rem` manda pero su termino en `vw` no
 * acompana, y exigir el doble convertiria ese patron correcto en un defecto.
 * 1.5 cae entre las dos poblaciones medidas el 2026-09-05 sobre el build
 * servido de `dcafec4`:
 *
 *   NO CRECE (defecto F94, x0.98 - x1.00)      CRECE (legitimo, x1.75 - x2.00)
 *   el h1 del hero          34 -> 34 px        la etiqueta de Journey a 320 px
 *   la tagline del hero     15 -> 15 px          32 -> 56 px
 *   el statement de Story   24 -> 24 px        todo lo demas de las ocho
 *     y 29.83 -> 29.25 a 390 px                  superficies: x2 exacto
 *
 * El test companero impide que BAJE de 1.5: con el minimo en 1 ninguna de las
 * cajas de arriba se reportaria --la peor da exactamente x1.00-- y la familia
 * saldria en verde sobre el defecto que existe para cazar.
 */
export const RATIO_MINIMO_DE_CRECIMIENTO = 1.5;

/**
 * Lo que tiene que crecer la CAJA DE CONTROL --el cuerpo del documento, cuyo
 * `font-size` es `1rem`-- para que la medida de arriba signifique algo: si la
 * emulacion de `Page.setFontSizes` no llega a la pagina, los dos contextos
 * miden lo mismo, TODAS las cajas dan x1.00 y la familia caeria entera con un
 * informe que no es un defecto del sitio sino del instrumento. La guarda
 * distingue las dos cosas.
 *
 * La tolerancia absorbe el redondeo subpixel del navegador; no es holgura de
 * criterio: 16 -> 32 px da 2 exacto en las ocho superficies medidas.
 */
export const RATIO_DEL_CONTROL = 2;
export const TOLERANCIA_DEL_CONTROL = 0.01;

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
 * LAS CUATRO FAMILIAS DE LA CRITICA #19 (2026-09-06), Y LA LECCION QUE LAS
 * OBLIGA A DECLARAR SU MATRIZ.
 *
 * Los cinco P1 que la ronda #19 confirmo con sonda propia no vivian en un sitio
 * que este candado no mirara: vivian en COMBINACIONES que este candado no
 * montaba. Las diecisiete familias anteriores median con `reducedMotion:
 * reduce` fijo (dos de ellas a proposito y con su porque escrito), a DPR 1 fijo,
 * sin recargar nunca la pagina y leyendo `lang` solo del DOM vivo. Cada uno de
 * esos cuatro ejes fijos escondia un defecto:
 *
 *   - con `reduce` el escenario del deck oscuro es estatico y el contenido de la
 *     diapositiva no se sale; sin `reduce`, a 320 px y con la raiz a 32, se sale
 *     por cientos de pixeles;
 *   - a DPR 1 el navegador descarga una pieza de arte que no pinta, y a DPR 2
 *     descarga otra distinta y mas pesada;
 *   - nadie recargaba, y la recarga es justo el gesto que pierde la seccion;
 *   - nadie leia el `lang` HORNEADO, y el horneado es el que oye un lector de
 *     pantalla antes de que hidrate el cliente.
 *
 * De ahi la regla que estas cuatro cumplen y que las anteriores adoptan al
 * tocarlas (leccion del 2026-09-06, regla 2): TODA familia de navegador declara
 * su MATRIZ --tema x ancho x idioma x raiz x reduce x DPR x gesto-- y, cuando
 * fija un eje a proposito, escribe por que y que queda fuera. Un eje fijo sin
 * justificar no es una simplificacion: es una combinacion sin medir con el
 * candado diciendo que la mide.
 * ---------------------------------------------------------------------------
 */

/**
 * FAMILIA DIECIOCHO, `deck-cabe-en-el-escenario-al-200-por-ciento`: los dos
 * decks que el tema OSCURO monta en la portada, con el nombre de sus piezas.
 *
 * La clase se busca por SUBCADENA porque styled-components genera
 * `<fichero>__<Componente>-sc-<hash>-<indice>` y el hash cambia con cada
 * edicion del template; el prefijo `<fichero>__<Componente>` no. Si alguien
 * renombra el componente, la sonda deja de encontrar el escenario y el candado
 * se pone en ROJO por su guarda de ausencia (abajo) en vez de salir verde
 * midiendo el vacio, que es la direccion correcta del fallo.
 *
 * `seccion` es el `id` del landmark que lo contiene, y es la unica ancla que no
 * depende de los estilos.
 */
export const DECKS_DEL_TEMA_OSCURO = [
    {
        id: "story",
        seccion: "story",
        escenario: "story-deck__ScStage",
        diapositiva: "story-deck__ScSlide",
        pista: "story-deck__ScTrack",
    },
    {
        id: "journey",
        seccion: "journey",
        escenario: "journey-deck__ScJourneyStage",
        diapositiva: "journey-deck__ScJourneySlide",
        pista: "journey-deck__ScJourneyTrack",
    },
];

/**
 * LA MATRIZ DE LA FAMILIA DIECIOCHO, declarada eje por eje:
 *
 *   superficie  las DOS portadas (`/` y `/en`). Las legales y las 404 no montan
 *               deck: no hay nada que medir ahi.
 *   tema        OSCURO. Es el unico que monta deck -- medido el 2026-09-06 en
 *               los dos temas y las dos portadas: `story-deck__ScStage` y
 *               `journey-deck__ScJourneyStage` salen 1 y 1 en oscuro y 0 y 0 en
 *               claro. El tema claro NO se salta: se recorre con una sola
 *               combinacion que EXIGE esa ausencia, porque un "no aplica" que
 *               deje de ser cierto es la forma mas barata de vaciar una familia.
 *   ancho       320 y 390 px (`ANCHOS_DEL_DECK`), los dos de la banda estrecha.
 *   idioma      los dos, uno por portada.
 *   raiz        16, 24 y 32 px (`RAICES_DEL_DECK`). La de 16 es el CONTROL: a
 *               esa raiz el deck cabe (medido, 0 px fuera en los dos anchos), y
 *               eso es lo que dice que las otras dos miden el zoom y no un
 *               defecto de siempre.
 *   reduce      "no-preference", FIJADO A PROPOSITO y al reves que sus dos
 *               hermanas de zoom. Con `reduce` el repo declara los estados
 *               finales de los reveals y el escenario deja de comportarse como
 *               el deck real; el defecto NO EXISTE ahi. La combinacion
 *               `reduce` + raiz 32 ya la miden `texto-al-200-por-ciento` y
 *               `legibilidad-al-200-por-ciento`, asi que lo que queda fuera de
 *               esta familia esta cubierto por las otras dos.
 *   DPR         1. El recorte es geometrico y no depende de la densidad; la
 *               densidad la mide la familia veintiuna.
 *   gesto       scroll por la pista en pasos de `PASO_DE_PISTA_PX`.
 */
export const ANCHOS_DEL_DECK = [320, 390];
export const RAICES_DEL_DECK = [ROOT_FONT_BASE_PX, 24, ZOOM_FONT_PX];

/**
 * El paso con el que se recorre la pista de cada deck y la espera por paso.
 *
 * 120 px es el paso de la sonda del arbitraje de la critica #19, y se conserva
 * para que las dos medidas sean comparables. La espera de 120 ms es lo que
 * tardan en asentarse la opacidad de la diapositiva y el pin del escenario: sin
 * ella se leen fotogramas intermedios en los que dos diapositivas pasan del
 * umbral de opacidad a la vez.
 */
export const PASO_DE_PISTA_PX = 120;
export const ESPERA_POR_PASO_MS = 120;

/**
 * La diapositiva ACTIVA es la que esta practicamente opaca. El deck cruza de
 * una a otra con una transicion de opacidad, asi que en los fotogramas del
 * cruce hay dos a medio camino y ninguna es la que el visitante lee; 0,99 deja
 * fuera todo el cruce sin exigir un 1 exacto, que el redondeo del compositor no
 * siempre entrega.
 */
export const OPACIDAD_DE_DIAPOSITIVA_ACTIVA = 0.99;

/**
 * Cuanto se le permite a una caja sobresalir del escenario antes de contarla
 * como recortada. Es la MISMA tolerancia de un pixel que usa
 * `probePerdidaHorizontal` para el viewport, y por el mismo motivo: absorbe el
 * redondeo subpixel de dos rects medidos por separado, y nada mas.
 *
 * El test companero teclea un techo. Subirlo es la forma de vaciar la familia
 * sin quitarla: con 1.000 px, el caso de jsdom que reproduce el defecto --una
 * caja 20 px por debajo de un escenario que recorta-- deja de reportarse y la
 * portada oscura sale en verde con el deck cortado.
 */
export const TOLERANCIA_DEL_ESCENARIO_PX = 1;

/**
 * FAMILIA DIECINUEVE, `lang-del-documento-por-ruta`: el idioma que el HTML
 * HORNEADO de las dos 404 declara.
 *
 * Es `es` y no un descuido: `output: "export"` sirve UN solo `404.html` para
 * las dos ramas de idioma --el porque esta en el docblock de la propia ruta,
 * `app/global-not-found.tsx`, y en el de `app/RootDocument.tsx`-- y su
 * contenido horneado es castellano. El idioma real se resuelve en cliente
 * (`NotFoundLocaleShell` + `I18nProvider`). Lo que esta familia exige de las
 * 404 es esa coherencia: el horneado castellano y el vivo el de la rama.
 *
 * Lo que NO se acepta, y era el P1 de la critica #19: que una superficie
 * inglesa con contenido ingles horneado se sirva anunciandose en castellano.
 * ESE DEFECTO SE ARREGLO EL 2026-09-06 (ola S, commit `16c8451`): el sitio pasa
 * a tener tres raices --`app/(es)/layout.tsx`, `app/en/layout.tsx` y
 * `app/global-not-found.tsx`-- y cada una hornea su propio `<html lang>` sobre
 * el documento comun `app/RootDocument.tsx`, asi que `/en`, `/en/privacy` y
 * `/en/legal-notice` se sirven ya con `lang="en"` en crudo. La familia no se
 * retira por eso: es justamente el candado que vuelve a medirlo contra el
 * build real en cada pasada.
 */
export const IDIOMA_HORNEADO_DE_LA_404 = "es";

/**
 * FAMILIA VEINTE, `recarga-conserva-la-seccion`: el gesto que ninguna familia
 * anterior hacia.
 *
 * MATRIZ: portada (las dos) x los DOS temas x 1440x900 x raiz 16 x `reduce`
 * indiferente (no se emula: la restauracion de scroll no depende de el) x DPR 1
 * x gesto = RECARGA x CARGA DE LA MAQUINA en dos puntos, una sola pagina
 * (reposo) y `RECARGAS_SIMULTANEAS` paginas recargando a la vez. El tema oscuro
 * es donde el defecto vive y el claro es el CONTROL que dice que la sonda no
 * reporta cualquier cosa.
 *
 * EL EJE DE CARGA ENTRA EL 2026-09-06 y es el que le faltaba a esta familia: el
 * porque, con las cifras, esta en el docblock de `RECARGAS_SIMULTANEAS`.
 *
 * EL OBJETIVO DE SCROLL ES DISTINTO POR TEMA, y hay que decir por que: las dos
 * portadas no miden lo mismo de alto. Medido el 2026-09-06 a 1440x900 sobre el
 * build servido, `documentElement.scrollHeight` da 11.008 px en oscuro y 6.588
 * en claro, o sea 10.108 y 5.688 px de recorrido util. Un objetivo unico de
 * 9.000 px en el tema claro se quedaria pegado al final del documento, que es
 * el caso degenerado en el que cualquier restauracion acierta. 9.000 y 5.000
 * dejan las dos medidas dentro de su documento y sobre una seccion real
 * (`contact` en los dos).
 */
export const OBJETIVO_DE_RECARGA_PX = { dark: 9000, light: 5000 };

/**
 * El centro del viewport de 1440x900, que es donde se pregunta "que seccion
 * estoy leyendo". Se mide con `elementFromPoint` y no con el scrollspy del
 * sitio a proposito: el scrollspy es codigo del repo y usarlo para juzgarse a
 * si mismo no prueba nada.
 */
export const CENTRO_DEL_VIEWPORT = { x: 720, y: 450 };

/**
 * La deriva de scroll que se le tolera a una recarga cuando la seccion SI se
 * conserva. 64 px es el alto de la banda del navbar (`NAV_BAND_PX`): por debajo
 * de eso el visitante vuelve a ver lo mismo con la barra por delante y no ha
 * perdido el sitio.
 *
 * El test companero teclea el techo, porque subirlo es como se vacia esta
 * familia sin quitarla: con 5.000 px de tolerancia la deriva de -3.377 px que
 * la critica #19 midio en el tema oscuro pasaria por buena.
 */
export const DERIVA_MAXIMA_DE_RECARGA_PX = NAV_BAND_PX;

/**
 * CUANTAS PAGINAS RECARGAN A LA VEZ EN EL SEGUNDO CASO DE LA FAMILIA, y por que
 * el primero --una sola pagina, la maquina en reposo-- no basta.
 *
 * EL DEFECTO QUE ESTA FAMILIA NACIO PARA VER ES UNA CARRERA, no un calculo mal
 * hecho. Medido el 2026-09-06 sobre el build sin arreglo: la restitucion del
 * scroll se armaba con la rama CLARA del HTML horneado y, si el doble
 * `requestAnimationFrame` vencia ANTES de que React committeara la rama oscura,
 * la correccion se aplicaba contra la geometria clara -- aterrizaje en 4.063 px
 * en vez de 9.000, que es exactamente 4.237 + (9.000 - 9.173,6).
 *
 * Y UNA CARRERA SOLO SE VE CON LA MAQUINA OCUPADA. Las tres combinaciones,
 * medidas el mismo dia contra el mismo servidor:
 *
 *   - una sola pagina, maquina EN REPOSO: 0 fallos de 10 recargas sobre el build
 *     SIN arreglo. La familia habria salido verde sobre el defecto.
 *   - CINCO paginas recargando a la vez contra el mismo servidor: 9 fallos de 15
 *     sobre el build sin arreglo, y 20/20 (36/36 en muestra grande) con el
 *     arreglo (commit `c27f331`: la correccion no se arma hasta que la rama
 *     montada coincide con `data-theme`).
 *   - estrangulamiento de CPU por CDP: 0 fallos de 13 a x2-x8. NO reproduce el
 *     defecto, lo TAPA -- frenar el hilo principal por igual no desordena las
 *     dos partes de la carrera.
 *
 * De ahi la leccion del 2026-09-06 (regla 2) aplicada a si misma: una
 * combinacion fijada por comodidad del instrumento --recargar UNA pagina porque
 * es lo comodo de escribir-- no puede ser la unica en la que se mide. El caso de
 * una sola pagina se CONSERVA, y no como redundancia: es el control que
 * documenta que el defecto no se ve ahi.
 *
 * LIMITE DECLARADO DE LA VERIFICACION, que hay que escribir para no leer de mas
 * en el verde: la sensibilidad de esta familia se comprobo contra el build de
 * `f3594ad`, que no lleva NINGUN arreglo de recarga, y ahi el defecto es
 * determinista -- cayeron los dos casos en las dos portadas (`/`: `contact@9000
 * -> journey@5623`, -3.377 px, y 0 de 5 aciertos con la maquina cargada;
 * `/en`: -3.428 px y 0 de 5). Eso prueba que la familia VE el defecto, pero NO
 * prueba por si solo que el eje de carga vea algo que el de reposo no ve: el
 * artefacto intermedio (la correccion ya escrita pero sin la puerta del tema,
 * que es donde se midio 9 de 15) no quedo servido en ningun puerto y no se puede
 * volver a correr contra el. Lo que sostiene el eje son las cifras de arriba,
 * medidas ese dia sobre ese artefacto.
 *
 * CINCO Y NO MAS por coste, y el coste esta MEDIDO: la corrida completa del tema
 * oscuro con este eje anadido --las ocho superficies, contra el build servido--
 * tarda 11 min 19 s (`real 11m18.939s`, 2026-09-06), dentro del techo de 13
 * minutos que la ronda acepta. El eje nuevo se paga solo en las dos portadas, que
 * son las unicas superficies de esta familia. Si el sitio engorda y ese techo se
 * cruza, se baja a 3 y se escribe aqui con la medida que lo obligo.
 */
export const RECARGAS_SIMULTANEAS = 5;

/**
 * FAMILIA VEINTIUNA, `arte-no-pintado-por-tema-y-dpr`: las densidades de
 * pantalla en las que se comprueba que el navegador no descarga arte que la
 * pagina no llega a pintar.
 *
 * MATRIZ: portada (las dos) x los DOS temas x 1440x900 x raiz 16 x `reduce`
 * indiferente x DPR 1 y 2 x sin gesto (se mide 3 s despues de `load`, sin
 * scroll: lo que se persigue es el peso que se paga solo por abrir la pagina).
 *
 * EL EJE DE DPR ES EL QUE FALTABA: a DPR 1 el `srcset` resuelve una variante y
 * a DPR 2 otra, asi que un candado a DPR 1 fijo no ve el desperdicio de la
 * mitad de los visitantes -- y medido el 2026-09-06 no es el mismo fichero ni
 * el mismo peso (87.260 B contra 163.368 B).
 */
export const DPRS_DEL_ARTE = [1, 2];

/**
 * Que cuenta como ARTE para la familia veintiuna: las tres carpetas de piezas
 * del repo y los dos formatos que sirve. Viaja como cadena y no como `RegExp`
 * porque la sonda se serializa para ejecutarse dentro de la pagina.
 */
export const PATRON_DE_ARTE = "figures/|hero/|scenes/|\\.webp|\\.avif";

/**
 * Cuantos bytes de arte descargado y no pintado se toleran: CERO.
 *
 * El ancla de la critica externa era 100 KB, y este repo no la usa a proposito.
 * Un umbral en bytes convierte un defecto de correccion --el navegador pide una
 * pieza que nadie va a pintar-- en un presupuesto, y un presupuesto se consume:
 * la pieza de 87 KB medida el 2026-09-06 habria pasado por debajo de los 100 KB
 * sin una sola linea roja. Cero no admite esa lectura.
 *
 * Medido antes de fijarlo, que es lo que permite ponerlo en cero sin llenar el
 * informe de ruido: en el tema CLARO, a DPR 1 y a DPR 2, los cinco recursos de
 * arte que la portada descarga estan los cinco pintados. No hay una poblacion
 * legitima de descargas sin pintar que absolver.
 */
export const MAX_BYTES_DE_ARTE_NO_PINTADO = 0;

/*
 * ---------------------------------------------------------------------------
 * LAS DOS FAMILIAS DE LA CRITICA #20 (2026-09-07), Y LA CLASE DE DEFECTO QUE
 * CADA UNA REPRESENTA.
 *
 * La ronda #20 dio cero P0 y tres P1, y los tres los encontro una persona A
 * MANO sobre el mismo build que las veintiuna familias anteriores daban por
 * bueno. No estaban en un rincon del sitio que el candado no visitara: estaban
 * en dos CLASES de comprobacion que ninguna familia hacia.
 *
 *   - LA PRIMERA CLASE es el ESTADO que sobrevive a un cambio de contexto. Las
 *     familias de la hoja movil (`hoja-movil-escape-y-foco`) la abren, tabulan
 *     dentro y la cierran con Escape, todo al MISMO ancho: nunca cruzan el
 *     escalon con la hoja abierta. El gesto que el visitante hace de verdad
 *     --girar el telefono, o abrir la hoja en una ventana estrecha y
 *     ensancharla-- deja el fondo `inert` y la pagina sin un solo control
 *     operable, y ninguna familia lo veia porque ninguna cambiaba de anchura
 *     con un estado modal vivo.
 *   - LA SEGUNDA CLASE es el CONTRASTE de una pieza fija contra lo que se mueve
 *     por debajo. `scripts/check-text-contrast.mjs` compara tokens contra
 *     tokens --tinta declarada contra fondo declarado-- y no puede ver lo que
 *     de verdad se pinta detras de la cabecera de cristal cuando el arte de una
 *     seccion pasa por debajo. Es una medida de PIXELES, y solo un navegador la
 *     tiene.
 *
 * Y LA SEGUNDA TRAE ADEMAS LA LECCION DEL 2026-09-07, que es la razon por la que
 * su matriz recorre `reduce` en los DOS sentidos: el arbitraje de ese mismo
 * hallazgo midio 8,85 con `prefers-reduced-motion` fijado por comodidad del
 * instrumento y 3,41 sin el, sobre el MISMO build y la MISMA pieza. Con la
 * preferencia activa el arte del guardian no se desplaza y nunca llega a pasar
 * bajo la barra; sin ella, si. Una familia que fije esa preferencia por
 * comodidad no puede ser la unica que mide un criterio que tambien aplica sin
 * ella, asi que aqui el eje de `reduce` no es un extra: es la familia.
 * ---------------------------------------------------------------------------
 */

/**
 * FAMILIA VEINTIDOS, `estado-modal-no-sobrevive-al-cambio-de-anchura`: el
 * viewport en el que se abre la hoja movil.
 *
 * 390x844 con `hasTouch` e `isMobile`, que es lo que declara un telefono real y
 * no solo una ventana estrecha: la hoja se entrega por ancho, pero el gesto que
 * la rompe --girar el aparato-- solo existe donde hay aparato.
 */
export const VIEWPORT_DE_LA_HOJA = { ancho: 390, alto: 844 };

/**
 * LA MATRIZ DE LA FAMILIA VEINTIDOS, declarada eje por eje:
 *
 *   superficie  las DOS portadas (`/` y `/en`). La hoja la montan las ocho, y
 *               dejarlo escrito importa: lo que acota la familia a la portada
 *               es el COSTE (tres contextos por superficie), no una diferencia
 *               de comportamiento. Si algun dia la hoja diverge por tipo de
 *               superficie, esta lista se amplia con la medida delante.
 *   tema        los DOS. El estado modal no depende del tema, y por eso el
 *               script se ejecuta con `--tema` en los dos: si uno de los dos
 *               dejara de fallar, la diferencia seria una medida nueva.
 *   ancho       se ABRE a 390 y se cruza a 844 y a 1280 px, los dos por encima
 *               del escalon `md` (768 px a la raiz de fabrica). 844 es el lado
 *               largo del propio telefono --el giro-- y 1280 una ventana de
 *               escritorio.
 *   idioma      los dos, uno por portada. El disparador se busca por su
 *               `aria-label` y su `aria-controls`, no por texto, asi que la
 *               sonda no depende del idioma; el rotulo va al informe.
 *   raiz        16 px. Lo que se mide es un estado, no una longitud: la raiz no
 *               participa. Las combinaciones con la raiz subida las recorren
 *               las tres familias de zoom.
 *   reduce      "no-preference", y esta vez no por gusto: la hoja anima su
 *               entrada, y con `reduce` el repo declara los estados finales. El
 *               defecto no depende de la animacion --se reprodujo igual en las
 *               seis combinaciones-- pero medir sin la preferencia es medir lo
 *               que le pasa a la mayoria.
 *   DPR         1 en los dos cruces, y una tercera pasada a DPR 3, que es lo
 *               que declara un telefono real. La densidad no deberia cambiar
 *               nada de esto y por eso se recorre: un eje que se da por
 *               irrelevante sin medirlo es justo el que escondio el P1 de arte
 *               de la critica #19.
 *   gesto       ABRIR la hoja y CAMBIAR el tamano del viewport cruzando el
 *               escalon, sin tocar nada mas. No se pulsa Escape ni se cierra a
 *               mano: lo que se mide es lo que pasa cuando el contexto cambia
 *               solo.
 */
export const CAMBIOS_DE_ANCHURA_DE_LA_HOJA = [
    { ancho: 844, alto: 390, dpr: 1 },
    { ancho: 1280, alto: 390, dpr: 1 },
    { ancho: 1280, alto: 390, dpr: 3 },
];

/**
 * QUE CUENTA COMO CONTROL OPERABLE. Es el conjunto de siempre --enlaces con
 * destino, botones, campos, `summary` y cualquier cosa con `tabindex`-- MENOS
 * lo que el propio marcado saca del recorrido con `tabindex="-1"`, que es un
 * nodo enfocable a mano pero no alcanzable con el teclado.
 *
 * Viaja como cadena y no como lista porque la sonda se serializa para
 * ejecutarse dentro de la pagina.
 */
export const SELECTOR_FOCALIZABLE =
    "a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex='-1'])";

/**
 * EL ASENTAMIENTO SE MIDE, NO SE ESPERA. Tres lecturas iguales seguidas del
 * estado completo (mismos operables, mismos inertes, mismos dialogos) y no un
 * `waitForTimeout` generoso: un cambio de viewport dispara un reflujo, un
 * `matchMedia` y un efecto de React que corren en ese orden, y un tiempo fijo o
 * mide antes de que terminen --y reporta un estado intermedio que no existe--
 * o paga de mas en todas las combinaciones para cubrir la peor.
 *
 * El tope existe para que un estado que OSCILA no cuelgue la corrida: si las
 * lecturas no llegan a repetirse, se devuelve la ultima y el veredicto se toma
 * sobre ella. Una oscilacion es un defecto por su cuenta, y esta familia la
 * reportaria como el estado que le toque en ese instante.
 */
export const LECTURAS_IGUALES_PARA_ASENTAR = 3;
export const ESPERA_ENTRE_LECTURAS_MS = 200;
export const TOPE_DE_ASENTAMIENTO_MS = 6000;

/**
 * LA MATRIZ DE LA FAMILIA VEINTITRES,
 * `contraste-de-la-cabecera-sobre-lo-que-pasa-por-debajo`, declarada eje por
 * eje:
 *
 *   superficie  las DOS portadas. Son las unicas con arte que se desplaza por
 *               debajo de la cabecera; las legales y las 404 no lo tienen, y su
 *               contraste de tokens lo cubre `check-text-contrast.mjs`.
 *   tema        los DOS. El defecto medido vive en el oscuro y el claro es el
 *               CONTROL que dice que la sonda no reporta cualquier cosa.
 *   ancho       1440x900 y 390x844 (`VIEWPORTS_DE_LA_CABECERA`): la cabecera
 *               ancha, con sus enlaces y su selector de idioma, y la estrecha,
 *               que solo lleva marca y disparador. Son piezas distintas sobre
 *               el mismo arte.
 *   idioma      los dos, uno por portada.
 *   raiz        16 px. El tamano de la tinta entra en el UMBRAL (WCAG 1.4.3
 *               pide 3:1 a partir de 24 px, o de 18,66 con peso 700) y no en la
 *               medida; las raices subidas las recorren las familias de zoom.
 *   reduce      LOS DOS SENTIDOS, y es la razon de ser de la familia. Ver la
 *               leccion del 2026-09-07 arriba: con `reduce` la misma pieza da
 *               8,85 y sin el 3,41.
 *   DPR         1. La razon de contraste es una propiedad del color, no de la
 *               densidad, y capturar a DPR 2 cuadruplicaria los pixeles de cada
 *               recorte sin cambiar un solo veredicto.
 *   gesto       BARRIDO DE SCROLL de toda la pagina en pasos de
 *               `PASO_DEL_BARRIDO_DE_CABECERA`.
 */
export const VIEWPORTS_DE_LA_CABECERA = [
    { ancho: 1440, alto: 900 },
    { ancho: 390, alto: 844 },
];

/** Los dos sentidos del eje que da sentido a la familia. */
export const REDUCES_DE_LA_CABECERA = ["no-preference", "reduce"];

/**
 * EL PASO DEL BARRIDO, con su coste medido y con lo que ese paso deja fuera.
 *
 * El arbitraje de la critica #20 recorrio la pagina con un paso de 40 px y
 * localizo el peor punto en y = 9.280. Este candado no puede pagar ese paso:
 * cada punto cuesta una captura de la banda de cabecera mas su analisis, y
 * medido el 2026-09-07 sobre el build servido eso son 416 ms por punto (20
 * puntos en 8.327 ms, capturando la banda; 646 ms por punto capturando el
 * viewport entero, que es la via que este script descarto por cara). Con 40 px
 * la corrida entera --dos portadas x dos anchos x dos sentidos de `reduce`--
 * pediria unos 2.100 puntos, casi quince minutos por tema.
 *
 * 300 px sale de MEDIR LA BANDA DEL DEFECTO, no de redondear. Recorriendo la
 * portada oscura a 1440x900 de 8.400 a 10.400 px en pasos de 100 (medido el
 * 2026-09-07, sin `reduce`), el enlace «English» da p05 >= 8,95 en todo el
 * tramo hasta 9.200 y cae a 3,56 / 3,68 / 3,62 / 3,79 / 4,17 en 9.300, 9.400,
 * 9.500, 9.600 y 9.700, para volver a 5,01 en 9.800: la banda incumplidora mide
 * unos 500 px. Un paso de 300 aterriza dentro de ella al menos una vez venga de
 * donde venga.
 *
 * LO QUE QUEDA FUERA, dicho para que nadie lea el verde por mas de lo que es:
 * una banda incumplidora MAS ESTRECHA que el paso puede colarse entre dos
 * puntos. Si algun dia aparece una, el paso baja y se escribe aqui la medida
 * que lo obligo; lo que no se puede recortar es el eje de `reduce`, que es el
 * que hace que esta familia exista.
 */
export const PASO_DEL_BARRIDO_DE_CABECERA = 300;

/**
 * El alto de la franja del viewport que se captura en cada punto del barrido.
 *
 * La cabecera es fija y vive en la parte de arriba, asi que capturar los 900 px
 * del viewport para leer 44 seria pagar veinte veces el ancho de banda por el
 * mismo veredicto (771.908 B contra 37.434 B en la captura medida el
 * 2026-09-07). 160 px dan holgura de sobra para la barra y para el
 * desplazamiento con el que se recoge al bajar; una pieza que quede fuera de la
 * franja no se mide --se cuenta aparte-- en vez de medirse mal.
 *
 * SE CAPTURA EL VIEWPORT RECORTADO Y NUNCA EL ELEMENTO: la captura de un
 * elemento lo desplaza a la vista y reinicia las emulaciones del contexto, que
 * es exactamente la forma de perder el estado que esta familia mide.
 */
export const ALTO_DE_LA_BANDA_DE_CABECERA = 160;

/**
 * LOS DOS UMBRALES DE WCAG 1.4.3 (Contrast Minimum, nivel AA) y el percentil
 * sobre el que se aplican.
 *
 * Son los mismos numeros que `umbralDe` en `scripts/check-text-contrast.mjs`, y
 * la repeticion es deliberada: aquel fichero compara TOKENS con TOKENS y corre
 * dentro del gate sin navegador; este mide PIXELES pintados y necesita un
 * navegador. Atarlos con un import cruzaria dos candados con ciclos de vida
 * distintos por tres numeros que WCAG fija y que no se mueven; lo que si hace
 * el test companero es teclearlos, para que un cambio aqui sea una decision
 * visible.
 *
 * EL PERCENTIL 5 Y NO EL MINIMO, con la razon medida. Una caja de texto
 * contiene el borde antialiasado de sus glifos y, sobre arte, cualquier pixel
 * suelto del fondo; el minimo absoluto lo firma siempre ese pixel y convierte
 * la medida en ruido. El p05 describe el fondo REAL contra el que se lee la
 * pieza: medido el 2026-09-07 sobre la portada oscura, el enlace «English» da
 * p05 3,51 y mediana 3,72 en el peor punto --las dos por debajo del umbral, o
 * sea que no es un pixel raro-- y 8,76 / 8,79 con `reduce`, donde el arte no
 * llega a pasar por debajo.
 *
 * Un percentil MAS ALTO afloja el candado (con el 50 solo caeria una pieza
 * cuando mas de la mitad de su caja incumple) y uno mas bajo lo devuelve al
 * ruido del minimo. El test companero teclea el numero.
 */
export const UMBRAL_DE_CONTRASTE_NORMAL = 4.5;
export const UMBRAL_DE_CONTRASTE_GRANDE = 3;
export const PERCENTIL_DE_CONTRASTE = 5;

/**
 * El lado minimo, en px, que tiene que medir una caja para entrar en la
 * familia: por debajo de eso es un rotulo escondido para lectores de pantalla
 * (`VisuallyHidden` deja una caja de 1x1 px) y no hay tinta que nadie lea. Se
 * cuentan aparte para que un cambio que encoja las piezas de verdad se vea.
 */
export const LADO_MINIMO_DE_PIEZA_PX = 4;

/**
 * Lo que se le permite discrepar a las DOS copias de la formula de contraste.
 *
 * La sonda se serializa para ejecutarse dentro de la pagina, asi que no puede
 * llamar a `razonDeContraste` del modulo: lleva su propia copia de la formula
 * de WCAG. Dos copias de una formula son dos copias que pueden divergir, asi
 * que en cada punto del barrido la sonda devuelve tambien el fondo del pixel
 * PEOR y el script recalcula su razon con la funcion del modulo: si las dos no
 * coinciden, la corrida se pone en rojo diciendo que el instrumento se partio
 * en dos. La tolerancia absorbe solo el redondeo a dos decimales con el que
 * viaja el numero de la pagina (0,005 como mucho).
 */
export const TOLERANCIA_DE_LA_FORMULA_DE_CONTRASTE = 0.01;

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

/**
 * EL TEXTO CRECE CON LA PREFERENCIA: el `font-size` computado de cada caja con
 * texto propio visible, para compararlo con el de la MISMA caja medida con la
 * raiz a la mitad.
 *
 * Esta sonda no juzga nada: recoge. El veredicto lo dan `comparaCrecimiento` y
 * `fallosDeCrecimientoEnLaBanda`, que son funciones puras y viven fuera de la
 * pagina, porque lo unico que hay que ejecutar dentro del navegador es leer el
 * estilo computado.
 *
 * LA CLAVE DE EMPAREJAMIENTO es `<ruta estructural>||<texto>` y no el indice de
 * la caja en el recorrido: dos contextos distintos pueden no tener exactamente
 * el mismo numero de cajas --un `@media` que oculta algo, un reveal que aun no
 * ha aterrizado-- y emparejar por posicion compararia el `font-size` de una
 * caja con el de otra sin que nada lo delate. La ruta estructural es la cadena
 * de `tag:nth-child(n)` desde `body`, que no depende de las clases generadas
 * por styled-components (cambian con cada edicion del template) ni del orden en
 * que se recorra el arbol. El texto va en la clave como segundo factor: si el
 * marcado se mueve bajo la misma ruta, la caja deja de emparejar en vez de
 * emparejar mal.
 *
 * EL TEXTO SE NORMALIZA (`\s+` a un espacio) antes de entrar en la clave, y no
 * es cosmetica: `innerText` devuelve el texto RENDERIZADO, con sus saltos de
 * linea, y la misma caja parte distinto con la raiz a 16 y a 32. Sin normalizar,
 * toda caja que cambia de reparto de lineas dejaria de emparejarse -- es decir,
 * justo las que mas interesan.
 *
 * MISMA SELECCION QUE LA FAMILIA DE LEGIBILIDAD --texto propio, visible, caja
 * de mas de 1x1 px, que es la que deja fuera a `VisuallyHidden`-- con UNA
 * diferencia deliberada: aqui no se filtra por `writing-mode`. Un texto vertical
 * tiene que crecer igual que uno horizontal; lo que no le aplicaba era la
 * metrica de "caracteres por linea", no esta.
 *
 * `controlFontPx` es la caja de control (el cuerpo, cuyo `font-size` es `1rem`)
 * y se lee aparte del recorrido porque `body` no suele tener texto propio: es lo
 * que permite distinguir "el sitio no crece" de "la emulacion no llego".
 */
export function probeCrecimientoDeTexto() {
    const rutaEstructural = (el) => {
        const partes = [];
        let nodo = el;
        while (nodo && nodo !== document.body && nodo.parentElement) {
            const padre = nodo.parentElement;
            const indice = [...padre.children].indexOf(nodo) + 1;
            partes.unshift(
                `${nodo.tagName.toLowerCase()}:nth-child(${indice})`,
            );
            nodo = padre;
        }
        return `body>${partes.join(">")}`;
    };

    const cajas = [];
    for (const el of document.querySelectorAll("body *")) {
        const tieneTextoPropio = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
        );
        if (!tieneTextoPropio) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.visibility === "collapse")
            continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue;

        const bruto =
            typeof el.innerText === "string" ? el.innerText : el.textContent;
        const texto = (bruto || "").trim().replace(/\s+/g, " ").slice(0, 60);
        const sel = rutaEstructural(el);
        cajas.push({
            clave: `${sel}||${texto}`,
            zona: el.closest("header")
                ? "header"
                : el.closest("footer")
                  ? "footer"
                  : el.closest("main")
                    ? "main"
                    : "suelto",
            tag: el.tagName.toLowerCase(),
            sel,
            texto,
            fontPx: parseFloat(cs.fontSize),
        });
    }
    return {
        rootFontPx: parseFloat(
            getComputedStyle(document.documentElement).fontSize,
        ),
        controlFontPx: parseFloat(getComputedStyle(document.body).fontSize),
        cajas,
    };
}

/**
 * Compara las cajas de DOS medidas de la misma superficie y el mismo ancho --la
 * de la raiz de fabrica y la de la raiz al 200 %-- y devuelve las que no
 * crecieron lo suficiente, mas el estado de la caja de control.
 *
 * Funcion pura y fuera de la pagina a proposito: el veredicto se puede ejercitar
 * en jsdom con estilos y rects simulados, que es lo unico que el gate puede
 * correr sin navegador.
 *
 * `comparadas` son las claves que existian en las DOS medidas: una caja que solo
 * aparece en una de las dos no se compara, y no se cuenta. Es la cifra que la
 * guarda de vacuidad vigila.
 */
export function comparaCrecimiento({
    base,
    zoom,
    ratioMinimo,
    ratioDelControl = RATIO_DEL_CONTROL,
    tolerancia = TOLERANCIA_DEL_CONTROL,
}) {
    const previo = new Map();
    for (const c of base.cajas) {
        if (Number.isFinite(c.fontPx) && c.fontPx > 0)
            previo.set(c.clave, c.fontPx);
    }

    const comparadas = [];
    const flojas = [];
    for (const c of zoom.cajas) {
        const antes = previo.get(c.clave);
        if (antes === undefined) continue;
        if (!Number.isFinite(c.fontPx) || c.fontPx <= 0) continue;
        comparadas.push(c.clave);
        const ratio = c.fontPx / antes;
        if (ratio >= ratioMinimo) continue;
        flojas.push({
            clave: c.clave,
            zona: c.zona,
            tag: c.tag,
            sel: c.sel,
            texto: c.texto,
            basePx: antes,
            zoomPx: c.fontPx,
            ratio: Math.round(ratio * 100) / 100,
        });
    }

    const controlRatio =
        Number.isFinite(base.controlFontPx) && base.controlFontPx > 0
            ? zoom.controlFontPx / base.controlFontPx
            : null;
    return {
        comparadas,
        flojas,
        controlBasePx: base.controlFontPx,
        controlZoomPx: zoom.controlFontPx,
        controlRatio:
            controlRatio === null ? null : Math.round(controlRatio * 100) / 100,
        /* La guarda de instrumento: sin control que doble, TODAS las cajas dan
           x1.00 y el informe hablaria del sitio cuando el roto es el aparato. */
        controlDobla:
            controlRatio !== null &&
            controlRatio >= ratioDelControl - tolerancia,
    };
}

/**
 * El veredicto de la banda entera: una caja se declara SIN CRECIMIENTO solo si
 * se quedo por debajo del minimo en TODOS los anchos de la banda en los que se
 * la pudo comparar.
 *
 * POR QUE NO BASTA UN ANCHO, con la medida que lo obliga (2026-09-05, build
 * servido de `dcafec4`, tema oscuro): la etiqueta de paso del deck de Journey
 * --`clamp(1.75rem, 10vw, 11rem)`, tipografia fluida correcta-- crece x1.75 a
 * 320 px y solo x1.44 a 390, porque a 390 el termino en `vw` ya dominaba al
 * suelo con la raiz de fabrica. Reportarla seria pedir que se acote una
 * tipografia que WCAG 1.4.4 exige que crezca, que es el patron de fallo F94 al
 * reves. El `h1` del hero, en cambio, se queda en 34 px en los DOS anchos.
 *
 * `absueltas` son las cajas que fallaron en algun ancho y crecieron en otro. No
 * es una guarda sino la cuenta del absolvedor: va al informe para que un numero
 * raro se vea, igual que `anchas` y `estiradas` en la familia de legibilidad.
 */
export function fallosDeCrecimientoEnLaBanda(porAncho) {
    const vecesComparada = new Map();
    const flojasPorClave = new Map();
    for (const { width, comparacion } of porAncho) {
        for (const clave of comparacion.comparadas)
            vecesComparada.set(clave, (vecesComparada.get(clave) ?? 0) + 1);
        for (const floja of comparacion.flojas) {
            const previas = flojasPorClave.get(floja.clave) ?? [];
            previas.push({ width, ...floja });
            flojasPorClave.set(floja.clave, previas);
        }
    }

    const sinCrecimiento = [];
    let absueltas = 0;
    for (const [clave, medidas] of flojasPorClave) {
        const comparaciones = vecesComparada.get(clave) ?? 0;
        if (comparaciones > 0 && medidas.length === comparaciones)
            sinCrecimiento.push({ clave, medidas });
        else absueltas += 1;
    }
    return {
        comparadas: vecesComparada.size,
        sinCrecimiento,
        absueltas,
    };
}

/**
 * LA PISTA DE CADA DECK en coordenadas de documento, para saber por donde hay
 * que scrollear. Se lee una sola vez por combinacion; el recorrido de despues es
 * el que mide.
 *
 * `presente: false` no es un dato mas: es lo que distingue el tema claro --que
 * no monta deck y no tiene nada que recorrer-- de un tema oscuro al que alguien
 * le renombro el componente y dejo la sonda sin objeto.
 */
function localizaPistasDeDeck({ decks }) {
    return decks.map((d) => {
        const seccion = document.getElementById(d.seccion);
        const pista = seccion
            ? [...seccion.querySelectorAll("[class]")].find((n) =>
                  String(n.className || "").includes(d.pista),
              )
            : null;
        if (!pista) return { id: d.id, presente: false };
        const r = pista.getBoundingClientRect();
        return {
            id: d.id,
            presente: true,
            desde: Math.max(0, Math.round(r.top + window.scrollY)),
            hasta: Math.round(r.bottom + window.scrollY),
        };
    });
}

/**
 * EL CONTENIDO DE LA DIAPOSITIVA ACTIVA SE SALE DEL ESCENARIO QUE LO RECORTA.
 *
 * QUE MIDE, y por que no lo veia ninguna familia anterior. El deck del tema
 * oscuro es un escenario pegado (`position: sticky`) dentro de una pista alta:
 * lo que no cabe en el escenario no se desplaza a ningun sitio, se pierde --
 * exactamente el mismo tipo de perdida que `probePerdidaHorizontal` mide contra
 * el viewport, pero en vertical y contra una caja INTERMEDIA. Las dos familias
 * de zoom miran el viewport y con `reduce` puesto, y el escenario con `reduce`
 * es estatico: el defecto no existe en la combinacion que ellas montan.
 *
 * LA MEDIDA. Para cada deck de `decks`, se localiza su escenario dentro de su
 * seccion, se decide si RECORTA --`position` computada distinta de `static` Y
 * `overflow-y` computado distinto de `visible`, que son las dos formas de que la
 * caja deje de contener a sus hijos-- y, si recorta, se recorren las
 * diapositivas cuya opacidad computada llega a `opacidadActiva`. De cada
 * descendiente de la diapositiva con TEXTO PROPIO o INTERACTIVO --el mismo
 * filtro que `probePerdidaHorizontal`, y por el mismo motivo: WCAG 1.4.4 habla
 * de "loss of content or functionality", no de arte-- se exige que su rect quepa
 * dentro del rect del escenario.
 *
 * Un escenario que NO recorta se salta entero, y esa es la puerta por la que el
 * arreglo puede salir: si la solucion es dejar de recortar, esta familia lo ve y
 * calla, en vez de pedir que se recorte para luego pedir que quepa.
 *
 * LA MEDIDA ES INDEPENDIENTE DEL SCROLL a proposito: se compara la caja del
 * contenido con la caja del ESCENARIO, no con la del viewport, asi que un
 * escenario que ya paso de largo no genera falsos positivos. Lo que el scroll
 * decide es CUAL es la diapositiva activa, que es lo unico que cambia paso a
 * paso.
 *
 * EL CACHE DEL ESCENARIO no es una optimizacion gratuita: la sonda se ejecuta
 * una vez por paso y la busqueda por subcadena recorre la seccion entera, que
 * en la portada son miles de nodos. Se guarda en `window` y se invalida sola
 * con `isConnected` en cuanto el nodo sale del arbol -- que es tambien lo que
 * pasa entre casos del test cuando se vacia el `body`.
 */
export function probeDeckRecortado({ decks, opacidadActiva, toleranciaPx }) {
    const INTERACTIVOS = "a,button,input,select,textarea,summary,[tabindex]";
    const cache = (window.__vtiEscenariosDelDeck ||= new Map());
    const salida = [];
    for (const d of decks) {
        let escenario = cache.get(d.id);
        if (!escenario || !escenario.isConnected) {
            const seccion = document.getElementById(d.seccion);
            escenario = seccion
                ? [...seccion.querySelectorAll("[class]")].find((n) =>
                      String(n.className || "").includes(d.escenario),
                  )
                : null;
            if (escenario) cache.set(d.id, escenario);
            else cache.delete(d.id);
        }
        if (!escenario) {
            salida.push({ id: d.id, presente: false, activas: 0, fuera: [] });
            continue;
        }

        const cs = getComputedStyle(escenario);
        const recorta = cs.position !== "static" && cs.overflowY !== "visible";
        const caja = escenario.getBoundingClientRect();
        const activas = [...escenario.querySelectorAll("[class]")]
            .filter((n) => String(n.className || "").includes(d.diapositiva))
            .filter(
                (s) =>
                    parseFloat(getComputedStyle(s).opacity) >= opacidadActiva,
            );

        const fuera = [];
        if (recorta) {
            for (const diapositiva of activas) {
                for (const el of diapositiva.querySelectorAll("*")) {
                    const tieneTextoPropio = [...el.childNodes].some(
                        (n) =>
                            n.nodeType === 3 && n.textContent.trim().length > 0,
                    );
                    if (!tieneTextoPropio && !el.matches(INTERACTIVOS))
                        continue;
                    const ecs = getComputedStyle(el);
                    if (
                        ecs.visibility === "hidden" ||
                        ecs.visibility === "collapse"
                    )
                        continue;
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 && r.height === 0) continue;
                    const porAbajo = r.bottom - caja.bottom;
                    const porArriba = caja.top - r.top;
                    const sobra = Math.max(porAbajo, porArriba);
                    if (sobra <= toleranciaPx) continue;
                    fuera.push({
                        sel: el.tagName.toLowerCase(),
                        sobra: Math.round(sobra * 100) / 100,
                        lado: porArriba > porAbajo ? "arriba" : "abajo",
                        texto: (el.textContent || "")
                            .trim()
                            .replace(/\s+/g, " ")
                            .slice(0, 40),
                    });
                }
            }
        }
        salida.push({
            id: d.id,
            presente: true,
            recorta,
            activas: activas.length,
            fuera,
        });
    }
    return salida;
}

/**
 * ARTE QUE EL NAVEGADOR DESCARGA Y LA PAGINA NO LLEGA A PINTAR.
 *
 * QUE CUENTA COMO PINTADO, con las dos vias por separado porque ninguna basta
 * sola: el nombre del fichero aparece en el HTML del documento --que incluye los
 * `srcset`, los `style` que styled-components inyecta y cualquier
 * `background-image`-- O es el `currentSrc` de alguna `img`, que es la variante
 * que el navegador de verdad eligio y que no siempre esta escrita como tal en el
 * marcado.
 *
 * Se compara por NOMBRE DE FICHERO y no por URL completa a proposito: la entrada
 * de `performance` trae la URL absoluta con su origen y el marcado suele traer
 * la ruta relativa, asi que comparar URLs daria "no pintado" para todo.
 *
 * `evaluados` es la guarda de vacuidad: si el patron deja de casar con nada --un
 * cambio de carpeta, un formato nuevo-- la cuenta de bytes no pintados seria
 * cero por no haber mirado, y el script pone ese cero en rojo.
 */
export function probeArteNoPintado({ patron }) {
    const filtro = new RegExp(patron);
    const nombreDe = (url) => String(url).split("?")[0].split("/").pop();
    const html = document.documentElement.outerHTML;
    const pintadasPorImg = new Set();
    for (const img of document.querySelectorAll("img")) {
        if (img.currentSrc) pintadasPorImg.add(nombreDe(img.currentSrc));
    }
    const entradas =
        typeof performance?.getEntriesByType === "function"
            ? performance.getEntriesByType("resource")
            : [];
    const recursos = [];
    for (const entrada of entradas) {
        if (!filtro.test(entrada.name)) continue;
        const fichero = nombreDe(entrada.name);
        recursos.push({
            fichero,
            bytes: entrada.encodedBodySize || entrada.transferSize || 0,
            pintado: html.includes(fichero) || pintadasPorImg.has(fichero),
        });
    }
    return { evaluados: recursos.length, recursos };
}

/** La seccion que ocupa el centro del viewport, y donde esta el scroll. */
function probeSeccionDelCentro({ x, y }) {
    const el = document.elementFromPoint(x, y);
    return {
        y: Math.round(window.scrollY),
        seccion: el?.closest("section")?.id ?? null,
        alto: document.documentElement.scrollHeight,
    };
}

/**
 * EL IDIOMA QUE CADA SUPERFICIE TIENE QUE ANUNCIAR, con y sin JavaScript.
 *
 * Funcion pura y tabulada a proposito: el veredicto de esta familia es una
 * TABLA, y una tabla se puede ejercitar entera en el gate sin navegador.
 *
 * CON JavaScript el idioma es siempre el de la superficie, la 404 inglesa
 * incluida: ahi ya corrio el cliente y `I18nProvider` resolvio la rama.
 *
 * SIN JavaScript es el idioma HORNEADO de la ruta, y ahi las dos 404 son la
 * excepcion declarada: `output: "export"` sirve un solo `404.html` con contenido
 * castellano para las dos ramas, asi que exigirle `en` a la inglesa seria pedir
 * que anunciara un idioma que su contenido horneado no tiene. Todo lo demas
 * --las dos portadas y las cuatro legales-- hornea contenido en su idioma y
 * tiene que anunciarlo.
 */
export function langEsperado(surface, { conJavaScript }) {
    if (conJavaScript) return surface.locale;
    return surface.kind === "notFound"
        ? IDIOMA_HORNEADO_DE_LA_404
        : surface.locale;
}

/**
 * EL VEREDICTO DE LA RECARGA: pura, fuera de la pagina, y por eso ejercitable
 * en el gate.
 *
 * LA POLITICA tiene dos mitades y hacen falta las dos. La SECCION es lo que el
 * visitante recuerda ("estaba leyendo Contacto") y la DERIVA es lo que sus ojos
 * notan: conservar la seccion con 900 px de salto es volver a buscar el
 * parrafo. Se exige que la seccion sea la misma Y que la deriva quepa en
 * `derivaMaxima`.
 *
 * `seccion: null` --el centro del viewport no cayo sobre ninguna seccion-- no es
 * "cumple": es la sonda sin objeto, y se declara incumplimiento para que un
 * marcado que deje de tener secciones no pase por restauracion perfecta.
 */
export function evaluaRecarga({ antes, despues, derivaMaxima }) {
    const deriva = despues.y - antes.y;
    if (!antes.seccion || !despues.seccion) {
        return {
            deriva,
            mismaSeccion: false,
            cumple: false,
            motivo: `el centro del viewport no cayo sobre ninguna seccion (antes ${antes.seccion}, despues ${despues.seccion}): la sonda quedaria vacua`,
        };
    }
    const mismaSeccion = antes.seccion === despues.seccion;
    if (!mismaSeccion) {
        return {
            deriva,
            mismaSeccion,
            cumple: false,
            motivo: `antes de recargar el centro del viewport leia ${antes.seccion} a ${antes.y} px y despues lee ${despues.seccion} a ${despues.y} px (deriva ${deriva} px)`,
        };
    }
    if (Math.abs(deriva) > derivaMaxima) {
        return {
            deriva,
            mismaSeccion,
            cumple: false,
            motivo: `la seccion se conserva (${antes.seccion}) pero el scroll deriva ${deriva} px, por encima de los ${derivaMaxima} px de la banda de la barra`,
        };
    }
    return { deriva, mismaSeccion, cumple: true, motivo: null };
}

/**
 * EL VEREDICTO DE LAS N RECARGAS SIMULTANEAS: la politica del caso bajo carga,
 * pura y por eso ejercitable en el gate sin navegador.
 *
 * LA POLITICA ES «TODAS»: cada una de las N paginas tiene que volver a SU misma
 * seccion y con una deriva dentro de `derivaMaxima`. No es una media ni una
 * mayoria, y el motivo es la forma del defecto: la carrera del 2026-09-06 fallo
 * 9 de 15 veces, o sea que una politica de mayoria la habria dado por buena en
 * cuanto el reparto cayera 8-7 del otro lado. Un aterrizaje equivocado es un
 * visitante perdido, independientemente de cuantos hermanos suyos acertaron.
 *
 * `esperadas` es la guarda de vacuidad y no un adorno: si abrir las N paginas
 * falla y llegan tres lecturas en vez de cinco, «las tres cumplen» no es un
 * verde, es una medicion que no se hizo. Se declara incumplimiento.
 *
 * El motivo nombra el INDICE de cada pagina que fallo (1..N, como se cuentan las
 * pestanas) y su deriva, que es lo que permite distinguir «fallaron todas» de
 * «fallo una»: las dos lecturas apuntan a causas distintas.
 */
export function evaluaRecargaSimultanea({ lecturas, derivaMaxima, esperadas }) {
    const veredictos = lecturas.map((l) =>
        evaluaRecarga({
            antes: l.antes,
            despues: l.despues,
            derivaMaxima,
        }),
    );
    const aciertos = veredictos.filter((v) => v.cumple).length;
    const peorDeriva = veredictos.reduce(
        (peor, v) => (Math.abs(v.deriva) > Math.abs(peor) ? v.deriva : peor),
        0,
    );
    const base = { total: veredictos.length, aciertos, peorDeriva };

    if (veredictos.length !== esperadas)
        return {
            ...base,
            cumple: false,
            motivo: `se pidieron ${esperadas} recargas a la vez y solo llegaron ${veredictos.length} lecturas: la medicion no se hizo entera y su verde seria vacuo`,
        };
    if (veredictos.length === 0)
        return {
            ...base,
            cumple: false,
            motivo: "ni una sola pagina recargo: no hay nada que juzgar",
        };

    const caidas = veredictos
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => !v.cumple)
        .map(
            ({ v, i }) =>
                `pagina ${i + 1} de ${veredictos.length} (deriva ${v.deriva} px): ${v.motivo}`,
        );
    if (caidas.length)
        return {
            ...base,
            cumple: false,
            motivo: `con ${veredictos.length} paginas recargando a la vez, ${caidas.length} no volvio donde estaba -- ${caidas.join("; ")}`,
        };
    return { ...base, cumple: true, motivo: null };
}

/**
 * EL DISPARADOR DE LA HOJA MOVIL, BUSCADO POR SU SEMANTICA Y NO POR SU CLASE.
 *
 * La familia hermana (`hoja-movil-escape-y-foco`) lo localiza con
 * `[data-nav-sheet-trigger] button`, que es un gancho de test: sirve para lo
 * suyo, pero ata el candado al marcado en vez de a lo que el visitante y la
 * tecnologia de apoyo ven. Aqui se busca lo que de verdad lo identifica: un
 * control con NOMBRE ACCESIBLE (`aria-label`) que declara su estado
 * (`aria-expanded`) y apunta con `aria-controls` a un elemento cuyo `role` es
 * `dialog`. Eso es un disparador de hoja modal en cualquier marcado que lo
 * implemente bien, y no lo es en ninguno que lo implemente mal.
 *
 * ES ADEMAS INDEPENDIENTE DEL IDIOMA: el rotulo se lee («Abrir el menú de
 * navegación» / «Open the navigation menu») y viaja al informe, pero no se
 * compara contra ninguna cadena. Comparar contra el texto habria atado el
 * candado a la traduccion.
 *
 * El desplegable «Mas» de la barra ancha tambien lleva `aria-expanded` y
 * `aria-controls`, y NO cuela: su panel no es un `dialog`. Un `id` vacio
 * tampoco cuela, porque sin `id` no hay forma de pulsarlo sin volver a las
 * clases.
 */
export function probeDisparadorDeLaHoja() {
    for (const boton of document.querySelectorAll(
        "[aria-expanded][aria-controls]",
    )) {
        if (!boton.id) continue;
        const etiqueta = (boton.getAttribute("aria-label") || "").trim();
        if (!etiqueta) continue;
        const panel = document.getElementById(
            boton.getAttribute("aria-controls"),
        );
        if (!panel || panel.getAttribute("role") !== "dialog") continue;
        const r = boton.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        return {
            id: boton.id,
            controls: boton.getAttribute("aria-controls"),
            etiqueta,
        };
    }
    return null;
}

/**
 * EL ESTADO MODAL DEL DOCUMENTO, EN CUATRO CUENTAS QUE SE MIDEN JUNTAS.
 *
 * Lo que esta sonda describe es "quien manda en la pagina ahora mismo": cuantos
 * controles se pueden usar, que hay inertizado, que dialogos se declaran
 * modales y que disparadores dicen estar abiertos. Las cuatro cosas se leen en
 * la MISMA pasada a proposito: el defecto no es ninguna de ellas por separado
 * --el fondo inerte mientras la hoja esta abierta es correcto y hasta
 * obligatorio-- sino la combinacion que queda cuando el contexto cambia y nadie
 * la deshace.
 *
 *   `operables`         focalizables VISIBLES que no cuelgan de un `[inert]`.
 *                       Es la cuenta que de verdad importa: cero significa una
 *                       pagina que no se puede usar con el teclado ni con el
 *                       dedo.
 *   `operablesEnLaHoja` los de arriba que estan dentro del dialogo. Es la
 *                       GUARDA de que la hoja se abrio de verdad: si es cero
 *                       justo despues de pulsar el disparador, lo que falla es
 *                       el instrumento y no el producto, y el veredicto lo dice
 *                       con esas palabras.
 *   `inertesFuera`      nodos con `inert` que NO son el dialogo ni cuelgan de
 *                       el. El dialogo cerrado lleva su propio `inert` y eso es
 *                       correcto; lo que no lo es --y es el P1 medido-- es que
 *                       lo lleven la cabecera, el `main`, el pie y el
 *                       anunciador de rutas cuando ya no hay hoja que proteger.
 *   `modalesInalcanzables`  `[role=dialog][aria-modal=true]` cuya caja mide cero
 *                       o cae entera fuera del viewport. Un dialogo que sigue
 *                       reclamando la pagina entera desde fuera de la pantalla
 *                       es la otra mitad del mismo defecto.
 *   `expandidosSinCaja` disparadores que declaran `aria-expanded="true"` sin
 *                       caja que pulsar: nadie puede deshacer lo que dicen.
 *
 * `focalizables` es la guarda de vacuidad del FILTRO, con el mismo papel que
 * `candidatos` en `probePerdidaHorizontal`: si el selector dejara de casar con
 * nada, `operables` valdria cero por no haber mirado y el veredicto acusaria al
 * sitio de un defecto del instrumento.
 *
 * El selector llega como ARGUMENTO y no leyendo la constante del modulo porque
 * esta funcion se serializa para ejecutarse dentro de la pagina.
 */
export function probeEstadoModal({ selector }) {
    const marca = (el) =>
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
            el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""
        }`;
    const visible = (el) => {
        const cs = getComputedStyle(el);
        if (
            cs.visibility === "hidden" ||
            cs.visibility === "collapse" ||
            cs.display === "none"
        )
            return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    };

    const focalizables = [...document.querySelectorAll(selector)].filter(
        (el) => !el.hasAttribute("disabled"),
    );
    const operables = focalizables.filter(
        (el) => visible(el) && !el.closest("[inert]"),
    );

    const inertesFuera = [...document.querySelectorAll("[inert]")]
        .filter((el) => !el.closest("[role='dialog']"))
        .map(marca);

    const modalesInalcanzables = [];
    for (const dialogo of document.querySelectorAll(
        "[role='dialog'][aria-modal='true']",
    )) {
        const r = dialogo.getBoundingClientRect();
        const sinCaja = r.width < 1 || r.height < 1;
        const fuera =
            r.right <= 0 ||
            r.bottom <= 0 ||
            r.left >= window.innerWidth ||
            r.top >= window.innerHeight;
        if (sinCaja || fuera)
            modalesInalcanzables.push(
                `${marca(dialogo)} caja ${Math.round(r.width)}x${Math.round(r.height)} en (${Math.round(r.left)}, ${Math.round(r.top)})`,
            );
    }

    const expandidosSinCaja = [];
    for (const boton of document.querySelectorAll("[aria-expanded='true']")) {
        const r = boton.getBoundingClientRect();
        if (r.width < 1 && r.height < 1)
            expandidosSinCaja.push(
                `${marca(boton)} ("${(boton.getAttribute("aria-label") || boton.textContent || "").trim().slice(0, 40)}")`,
            );
    }

    return {
        focalizables: focalizables.length,
        operables: operables.length,
        operablesEnLaHoja: operables.filter((el) =>
            el.closest("[role='dialog']"),
        ).length,
        inertesFuera,
        modalesInalcanzables,
        expandidosSinCaja,
    };
}

/**
 * EL VEREDICTO DE UN CRUCE DE ANCHURA: puro, fuera de la pagina, y por eso
 * ejercitable en el gate sin navegador.
 *
 * LAS DOS GUARDAS VAN PRIMERO y cortan el veredicto, porque las dos describen
 * un instrumento que no midio en vez de un producto que falla, y confundir las
 * dos cosas es la peor forma de mentir de un candado: sin disparador visible no
 * hay hoja que abrir, y sin controles operables DENTRO de la hoja recien
 * abierta lo que hay es una hoja que no se abrio. Las dos son incumplimiento
 * --una medicion que no ocurre no es un verde-- pero con el motivo que apunta
 * al aparato.
 *
 * DESPUES, LAS CUATRO CONDICIONES DEL CRUCE, y se acumulan en vez de cortar: un
 * informe que diga las cuatro cosas que quedaron mal describe el defecto entero
 * y no solo la primera que se encontro.
 */
export function evaluaEstadoModal({
    combinacion,
    disparador,
    abierta,
    despues,
    lineaBase = null,
}) {
    const donde = `${combinacion.ancho}x${combinacion.alto} a DPR ${combinacion.dpr}`;
    if (!disparador)
        return {
            cumple: false,
            motivos: [
                `a ${VIEWPORT_DE_LA_HOJA.ancho} px no hay ningun control con nombre accesible que apunte a un [role=dialog]: sin disparador no hay hoja que abrir y el verde de este cruce a ${donde} seria vacuo`,
            ],
        };
    if (!abierta || abierta.operablesEnLaHoja === 0)
        return {
            cumple: false,
            motivos: [
                `pulsar "${disparador.etiqueta}" no dejo ni un solo control operable dentro de la hoja antes de cruzar a ${donde}: la hoja no llego a abrirse y lo que falla es el instrumento, no el cruce`,
            ],
        };
    if (!despues || despues.focalizables === 0)
        return {
            cumple: false,
            motivos: [
                `tras cruzar a ${donde} la sonda no encontro ni un solo control focalizable en todo el documento: el filtro esta roto y el resultado seria vacuo`,
            ],
        };

    const motivos = [];
    if (despues.operables === 0)
        motivos.push(
            `tras cruzar a ${donde} quedan 0 controles operables de ${despues.focalizables} focalizables: la pagina entera deja de poder usarse`,
        );
    /*
     * CONTRA LA LINEA BASE, no contra cero, y esto no es una concesion: hay
     * nodos que traen su propio `inert` del marcado y lo llevan SIEMPRE, abierta
     * la hoja o no -- hoy, el panel del desplegable «Mas», que esta cerrado y se
     * declara inerte para que su contenido no sea alcanzable. Contarlos como
     * «fondo que la hoja no libero» es un falso positivo, y se midio: tras el
     * arreglo del 2026-09-07 la familia seguia en rojo citando `div#_R_79...`,
     * que es justo ese panel. Lo que esta familia vigila es lo que la HOJA
     * anadio, asi que se compara con lo que habia antes de abrirla. Si no hay
     * linea base (una llamada que no la pasa), se cae del lado seguro y se
     * exige cero, que es el comportamiento anterior.
     */
    const yaInertesAntes = new Set(lineaBase ? lineaBase.inertesFuera : []);
    const inertesAnadidos = despues.inertesFuera.filter(
        (marca) => !yaInertesAntes.has(marca),
    );
    if (inertesAnadidos.length)
        motivos.push(
            `siguen inertes ${inertesAnadidos.length} nodo(s) que la hoja inertizo y no libero al cambiar de anchura (${inertesAnadidos.join(", ")})`,
        );
    if (despues.modalesInalcanzables.length)
        motivos.push(
            `${despues.modalesInalcanzables.length} dialogo(s) siguen declarandose aria-modal="true" sin caja alcanzable (${despues.modalesInalcanzables.join("; ")}): reclaman la pagina entera desde fuera de la pantalla`,
        );
    if (despues.expandidosSinCaja.length)
        motivos.push(
            `${despues.expandidosSinCaja.length} disparador(es) siguen diciendo aria-expanded="true" con la caja a cero (${despues.expandidosSinCaja.join("; ")}): nadie puede deshacer lo que declaran`,
        );
    return { cumple: motivos.length === 0, motivos };
}

/**
 * LAS PIEZAS DE TEXTO DE LA CABECERA, con su tinta resuelta a rgb.
 *
 * QUE ENTRA: todo descendiente de `<header>` con TEXTO PROPIO --un nodo de
 * texto directo no vacio-- que este visible y cuya caja pase de
 * `LADO_MINIMO_DE_PIEZA_PX` por los dos lados. Eso son los enlaces de
 * navegacion, los del selector de idioma, el rotulo de marca y cualquier
 * etiqueta visible que la barra monte; y deja fuera los rotulos de 1x1 px que
 * el repo usa para lectores de pantalla, que no tienen tinta que nadie lea.
 *
 * LA TINTA SE RESUELVE CON UN LIENZO DE 1x1 Y NO PARSEANDO LA CADENA: el
 * `color` computado puede llegar en cualquier sintaxis que el navegador
 * entienda --`rgb()`, `color(srgb ...)`, `oklch()`-- y el lienzo es el unico
 * interprete que siempre acierta, porque es el mismo que pinta. Se guarda
 * ademas la ALFA: una tinta translucida no se puede comparar contra un fondo
 * opaco sin componerla antes, asi que esas piezas se descartan y se cuentan
 * aparte en vez de medirse mal.
 *
 * LOS ELEMENTOS SE GUARDAN EN `window` porque el barrido vuelve a preguntar por
 * sus cajas en cada punto: la cabecera es fija, pero se recoge y se despliega
 * al desplazarse, asi que la caja de cada pieza es una lectura por punto y no
 * un dato de la carga. Lo que no cambia --el texto, el tamano, el peso y la
 * tinta-- se resuelve una sola vez.
 */
export function probePiezasDeCabecera({ minLado }) {
    const header = document.querySelector("header");
    window.__vtiPiezasDeCabecera = [];
    if (!header)
        return {
            piezas: [],
            sinCabecera: true,
            descartadasPorTamano: 0,
            descartadasPorTintaTranslucida: 0,
        };

    const lienzo = document.createElement("canvas");
    lienzo.width = 1;
    lienzo.height = 1;
    const pincel = lienzo.getContext("2d", { willReadFrequently: true });

    const piezas = [];
    let descartadasPorTamano = 0;
    let descartadasPorTintaTranslucida = 0;
    for (const el of header.querySelectorAll("*")) {
        const propio = [...el.childNodes]
            .filter((n) => n.nodeType === 3)
            .map((n) => n.textContent.trim())
            .filter(Boolean)
            .join(" ");
        if (!propio) continue;
        const cs = getComputedStyle(el);
        if (
            cs.visibility === "hidden" ||
            cs.visibility === "collapse" ||
            cs.display === "none"
        )
            continue;
        const r = el.getBoundingClientRect();
        if (r.width < minLado || r.height < minLado) {
            descartadasPorTamano += 1;
            continue;
        }
        pincel.clearRect(0, 0, 1, 1);
        pincel.fillStyle = cs.color;
        pincel.fillRect(0, 0, 1, 1);
        const [tr, tg, tb, ta] = pincel.getImageData(0, 0, 1, 1).data;
        if (ta < 250) {
            descartadasPorTintaTranslucida += 1;
            continue;
        }
        const indice = piezas.length;
        const meta = {
            indice,
            texto: propio.replace(/\s+/g, " ").slice(0, 40),
            px: Math.round(parseFloat(cs.fontSize) * 100) / 100,
            peso: parseInt(cs.fontWeight, 10) || 400,
            tinta: [tr, tg, tb],
        };
        piezas.push(meta);
        window.__vtiPiezasDeCabecera.push({ ...meta, el });
    }
    return {
        piezas,
        sinCabecera: false,
        descartadasPorTamano,
        descartadasPorTintaTranslucida,
    };
}

/**
 * APAGA LA TINTA DE LA CABECERA para que la captura muestre el FONDO REALMENTE
 * PINTADO bajo cada caja, que es contra lo que hay que medir.
 *
 * No se mide el color declarado del fondo --que es lo que hace el candado de
 * tokens-- porque bajo la cabecera de cristal no hay UN fondo: hay una capa
 * traslucida con desenfoque sobre lo que el arte de la seccion este pintando en
 * ese instante. El unico fondo verdadero es el que sale del compositor, y para
 * verlo hay que quitar la tinta de en medio.
 *
 * SE APAGAN LAS TRES COSAS que pintan texto --`color`,
 * `-webkit-text-fill-color` (que es la que manda en los tramos con degradado
 * recortado) y `text-shadow`-- y en TODOS los descendientes de la cabecera, no
 * solo en las piezas medidas: la tinta de un hijo que no tiene texto propio
 * seguiria pintando dentro de la caja de su padre.
 *
 * NO MUEVE NI UN PIXEL: las tres son propiedades de pintado. La geometria que
 * el barrido lee despues es la misma que habria sin apagar nada.
 *
 * LA COMPROBACION DE QUE SE APAGO VIVE EN OTRA SONDA, `probeTintaApagada`, y
 * esa separacion la obligo una medida: leer el resultado en el mismo tick da un
 * falso positivo. La barra declara una TRANSICION sobre `color`, asi que el
 * valor computado que se lee justo despues de escribir la propiedad es todavia
 * el color viejo interpolandose --medido el 2026-09-07 sobre el build servido:
 * ocho de las once piezas de la cabecera ancha devolvian
 * `oklab(0.86 0.0011 -0.0038)` un instante despues de apagarlas-- y la guarda
 * habria parado la corrida acusando al sitio de algo que no pasa. Se separa
 * para poder esperar entre las dos.
 */
export function apagaLaTintaDeLaCabecera() {
    const header = document.querySelector("header");
    if (!header) return { apagadas: 0 };
    let apagadas = 0;
    for (const el of header.querySelectorAll("*")) {
        el.style.setProperty("color", "transparent", "important");
        el.style.setProperty(
            "-webkit-text-fill-color",
            "transparent",
            "important",
        );
        el.style.setProperty("text-shadow", "none", "important");
        apagadas += 1;
    }
    return { apagadas };
}

/**
 * LA GUARDA DEL INSTRUMENTO: cuantas piezas siguen con tinta que pinte despues
 * de apagarla. Un `!important` del sitio, una regla del usuario o un cambio en
 * el nombre de la propiedad dejarian la captura con las letras puestas, y
 * entonces lo que se estaria midiendo es la tinta contra si misma -- una razon
 * de contraste de 1 sobre los glifos, o sea un rojo que no es del sitio.
 *
 * SE LEE `-webkit-text-fill-color` Y NO `color`, y es la lectura correcta y no
 * un rodeo: cuando esa propiedad esta declarada es LA que rellena el glifo, y
 * `color` pasa a ser solo su valor por defecto. Ademas es la que no lleva
 * transicion en esta barra, asi que dice la verdad en cuanto se escribe.
 *
 * El valor se resuelve a rgba con el mismo lienzo de 1x1 que la tinta original,
 * por el mismo motivo: el navegador puede devolverlo en cualquier sintaxis que
 * entienda (`oklab(...)` entre ellas) y el lienzo es el unico interprete que
 * siempre acierta.
 *
 * Las piezas DESCONECTADAS del arbol se cuentan aparte: una pieza que React
 * remonto no es una pieza con la tinta puesta, es una pieza que ya no existe, y
 * el barrido la reportara como no medida.
 */
export function probeTintaApagada() {
    const lienzo = document.createElement("canvas");
    lienzo.width = 1;
    lienzo.height = 1;
    const pincel = lienzo.getContext("2d", { willReadFrequently: true });
    let conTinta = 0;
    let desconectadas = 0;
    for (const pieza of window.__vtiPiezasDeCabecera || []) {
        if (!pieza.el || !pieza.el.isConnected) {
            desconectadas += 1;
            continue;
        }
        const cs = getComputedStyle(pieza.el);
        pincel.clearRect(0, 0, 1, 1);
        pincel.fillStyle = cs.webkitTextFillColor || cs.color;
        pincel.fillRect(0, 0, 1, 1);
        if (pincel.getImageData(0, 0, 1, 1).data[3] > 0) conTinta += 1;
    }
    return { conTinta, desconectadas };
}

/**
 * ESCRIBE EN CADA PIEZA GUARDADA EL UMBRAL QUE LE TOCA, calculado FUERA con
 * `umbralDeContraste`.
 *
 * Es un rodeo aparente y es lo contrario: el criterio de WCAG 1.4.3 sobre el
 * tamano es una tabla, y una tabla en dos copias --una en el modulo y otra
 * dentro de la sonda serializada-- son dos tablas que divergen. La sonda ya
 * lleva una copia obligada (la formula de contraste, que se cruza en cada
 * punto); esta segunda no hace falta, asi que no se escribe: se calcula una vez
 * en el modulo, se envia, y la sonda solo la lee.
 *
 * Devuelve cuantas piezas quedaron con umbral, que es la guarda: si el numero
 * no coincide con el de piezas, alguna se mediria contra `undefined` y su
 * porcentaje bajo umbral seria cero por comparar contra nada.
 */
export function fijaUmbralesDeCabecera(umbrales) {
    const piezas = window.__vtiPiezasDeCabecera || [];
    let fijados = 0;
    for (const pieza of piezas) {
        const umbral = umbrales[pieza.indice];
        if (typeof umbral === "number") {
            pieza.umbral = umbral;
            fijados += 1;
        }
    }
    return fijados;
}

/**
 * EL CONTRASTE DE CADA PIEZA CONTRA EL FONDO PINTADO BAJO SU CAJA, pixel a
 * pixel, en UN punto del barrido.
 *
 * Recibe la captura de la BANDA de cabecera ya hecha (una imagen `data:`), la
 * dibuja en un lienzo y, para cada pieza guardada por
 * `probePiezasDeCabecera`, recorta su caja actual y calcula la razon de
 * contraste de su tinta contra CADA pixel. De ahi salen el percentil pedido, la
 * mediana, el porcentaje de la caja por debajo del umbral de la pieza y el
 * pixel PEOR con su color.
 *
 * LA FORMULA VIAJA DENTRO. Esta funcion se serializa para ejecutarse en la
 * pagina, asi que no puede llamar a `razonDeContraste` del modulo -- el mismo
 * motivo por el que `probeLegibilidadDeTexto` recibe sus umbrales por
 * argumento. La copia se cruza con la del modulo en cada punto: se devuelve el
 * color del pixel peor y su razon, y el script recalcula esa razon con la
 * funcion de fuera. Si las dos no coinciden, la corrida se pone en rojo.
 *
 * UNA PIEZA QUE NO SE PUEDE MEDIR NO SE MIDE, y se dice por que: fuera del
 * arbol, oculta, o con la caja fuera de la banda capturada (la cabecera se
 * recoge al desplazarse y sus piezas se van del recorte). Se devuelve
 * `medida: false` con el motivo en vez de un numero inventado.
 */
export async function probeContrasteDeLaCabecera({ imagen, banda, percentil }) {
    const piezas = window.__vtiPiezasDeCabecera || [];
    const img = new Image();
    img.src = imagen;
    await img.decode();
    const lienzo = document.createElement("canvas");
    lienzo.width = img.width;
    lienzo.height = img.height;
    const pincel = lienzo.getContext("2d", { willReadFrequently: true });
    pincel.drawImage(img, 0, 0);

    /* Luminancia relativa y razon de contraste de WCAG 2.x. Copia declarada:
       ver el docblock de arriba y `TOLERANCIA_DE_LA_FORMULA_DE_CONTRASTE`. */
    const canal = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const lum = (c) =>
        0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2]);
    const razon = (a, b) => {
        const la = lum(a);
        const lb = lum(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const salida = [];
    for (const pieza of piezas) {
        const el = pieza.el;
        if (!el || !el.isConnected) {
            salida.push({
                indice: pieza.indice,
                medida: false,
                motivo: "fuera del arbol",
            });
            continue;
        }
        const cs = getComputedStyle(el);
        if (
            cs.visibility === "hidden" ||
            cs.visibility === "collapse" ||
            cs.display === "none"
        ) {
            salida.push({
                indice: pieza.indice,
                medida: false,
                motivo: "oculta",
            });
            continue;
        }
        const r = el.getBoundingClientRect();
        const x0 = Math.round(r.left - banda.x);
        const y0 = Math.round(r.top - banda.y);
        const ancho = Math.round(r.width);
        const alto = Math.round(r.height);
        if (
            ancho < 1 ||
            alto < 1 ||
            x0 < 0 ||
            y0 < 0 ||
            x0 + ancho > lienzo.width ||
            y0 + alto > lienzo.height
        ) {
            salida.push({
                indice: pieza.indice,
                medida: false,
                motivo: "fuera de la banda capturada",
            });
            continue;
        }

        const datos = pincel.getImageData(x0, y0, ancho, alto).data;
        const razones = [];
        let peor = null;
        for (let i = 0; i < datos.length; i += 4) {
            const fondo = [datos[i], datos[i + 1], datos[i + 2]];
            const v = razon(pieza.tinta, fondo);
            razones.push(v);
            if (peor === null || v < peor.razon) peor = { razon: v, fondo };
        }
        razones.sort((a, b) => a - b);
        const en = (q) =>
            razones[
                Math.min(
                    razones.length - 1,
                    Math.max(0, Math.round((q / 100) * (razones.length - 1))),
                )
            ];
        const bajo = razones.filter((v) => v < pieza.umbral).length;
        salida.push({
            indice: pieza.indice,
            medida: true,
            y: Math.round(window.scrollY),
            percentil: Math.round(en(percentil) * 100) / 100,
            mediana: Math.round(en(50) * 100) / 100,
            porcentajeBajo: Math.round((bajo / razones.length) * 1000) / 10,
            muestras: razones.length,
            peorRazon: Math.round(peor.razon * 100) / 100,
            peorFondo: peor.fondo,
        });
    }
    return salida;
}

/** Luminancia relativa de WCAG 2.x sobre un color sRGB de 0 a 255 por canal. */
export function luminanciaRelativa([r, g, b]) {
    const canal = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razon de contraste de WCAG 2.x entre dos colores sRGB. Va de 1 a 21. */
export function razonDeContraste(a, b) {
    const la = luminanciaRelativa(a);
    const lb = luminanciaRelativa(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * EL UMBRAL QUE LE TOCA A UNA PIEZA POR SU TAMANO COMPUTADO, no a ojo: WCAG
 * 1.4.3 baja de 4,5 a 3 para el texto GRANDE, y grande son 24 px, o 18,66 px
 * con peso 700 o mas (los 18 pt y 14 pt en negrita de la norma, en px).
 *
 * Funcion pura y tabulada a proposito, por el mismo motivo que `langEsperado`:
 * el criterio es una TABLA y una tabla se ejercita entera en el gate sin
 * navegador.
 */
export function umbralDeContraste(px, peso) {
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    return grande ? UMBRAL_DE_CONTRASTE_GRANDE : UMBRAL_DE_CONTRASTE_NORMAL;
}

/**
 * EL VEREDICTO DEL CONTRASTE DE CABECERA: puro, fuera de la pagina, y por eso
 * ejercitable en el gate.
 *
 * Recibe el PEOR punto de cada pieza --el de percentil mas bajo de todo el
 * barrido-- y decide dos cosas por separado:
 *
 *   1. si ese percentil queda por debajo del umbral que le toca a la pieza por
 *      su tamano, es incumplimiento, y el motivo trae el punto de scroll, el
 *      percentil, la mediana y el porcentaje de la caja bajo umbral. Los cuatro
 *      numeros juntos son lo que distingue "un pixel raro" de "la pieza no se
 *      lee ahi": con el 100 % de la caja por debajo, no hay nada que discutir.
 *   2. si la copia de la formula que corre DENTRO de la pagina y la de este
 *      modulo dan razones distintas para el mismo par de colores, el
 *      instrumento se partio en dos y la corrida se para. No es un defecto del
 *      sitio y el motivo lo dice.
 *
 * `piezas` sin ningun punto medido no son incumplimiento por si solas --una
 * pieza puede estar fuera de la banda en todo el barrido-- pero se cuentan y se
 * devuelven: quien lee el informe tiene que poder ver que una pieza dejo de
 * medirse.
 */
export function evaluaContrasteDeCabecera({ piezas, tolerancia }) {
    const fallos = [];
    const formulaRota = [];
    const sinPuntos = [];
    let comprobadas = 0;

    for (const pieza of piezas) {
        if (!pieza.peor) {
            sinPuntos.push(`${pieza.clave} ("${pieza.texto}")`);
            continue;
        }
        comprobadas += 1;
        const recalculada = razonDeContraste(pieza.tinta, pieza.peor.peorFondo);
        if (Math.abs(recalculada - pieza.peor.peorRazon) > tolerancia)
            formulaRota.push(
                `${pieza.clave} ("${pieza.texto}"): la pagina devolvio ${pieza.peor.peorRazon} y el modulo calcula ${Math.round(recalculada * 100) / 100} para rgb(${pieza.tinta.join(", ")}) sobre rgb(${pieza.peor.peorFondo.join(", ")})`,
            );
        if (pieza.peor.percentil < pieza.umbral)
            fallos.push(
                `${pieza.clave} "${pieza.texto}" (${pieza.px} px, peso ${pieza.peso}, umbral ${pieza.umbral}): p${String(pieza.percentil).padStart(2, "0")} ${pieza.peor.percentil} en y = ${pieza.peor.y}, mediana ${pieza.peor.mediana}, ${pieza.peor.porcentajeBajo} % de la caja bajo umbral, tinta rgb(${pieza.tinta.join(", ")}) sobre rgb(${pieza.peor.peorFondo.join(", ")})`,
            );
    }
    return { fallos, formulaRota, sinPuntos, comprobadas };
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
        /* El `lang` HORNEADO, que es el que oye un lector de pantalla antes de
           que hidrate el cliente -- y el unico que existe si el JavaScript no
           llega. Se lee con `getAttribute` y no con la propiedad para que un
           atributo ausente salga `null` en vez de cadena vacia. */
        lang: document.documentElement.getAttribute("lang"),
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

/**
 * Espera a que el ALTO del documento se estabilice, y no un tiempo fijo: la
 * restauracion de scroll del navegador compite con el crecimiento del documento
 * y medir a mitad de esa carrera daria una deriva distinta en cada corrida. Tres
 * lecturas iguales separadas medio segundo, con el tope que le pase quien llama.
 *
 * El tope es un parametro y no una constante porque las dos mitades de la
 * familia de recarga no esperan lo mismo: una pagina sola asienta en seis
 * segundos y `RECARGAS_SIMULTANEAS` compitiendo por la misma CPU y el mismo
 * servidor necesitan ocho.
 */
async function esperaAlturaEstable(page, { tope }) {
    let altoPrevio = null;
    let lecturasIguales = 0;
    const limiteDeEspera = Date.now() + tope;
    while (Date.now() < limiteDeEspera && lecturasIguales < 3) {
        await page.waitForTimeout(500);
        const alto = await page.evaluate(
            () => document.documentElement.scrollHeight,
        );
        lecturasIguales = alto === altoPrevio ? lecturasIguales + 1 : 1;
        altoPrevio = alto;
    }
}

/**
 * Espera a que una SONDA devuelva el mismo estado varias veces seguidas, y no
 * un tiempo fijo.
 *
 * Cambiar el tamano del viewport dispara tres cosas en cadena --el reflujo del
 * navegador, la reevaluacion de las media queries y el efecto de React que
 * reacciona a ellas-- y ninguna de las tres tiene una duracion conocida. Medir
 * con un `waitForTimeout` generoso paga la peor espera en todas las
 * combinaciones; medir con uno corto lee un estado intermedio que no existe
 * para nadie. La firma del estado repetida `LECTURAS_IGUALES_PARA_ASENTAR`
 * veces dice que ya no se mueve.
 *
 * Si el tope vence sin que se repita, se devuelve la ULTIMA lectura: un estado
 * que oscila no es un estado que no se pueda juzgar, es un defecto por su
 * cuenta, y lo que se juzga entonces es el estado en que quedo.
 */
async function esperaEstadoEstable(page, sonda, argumentos) {
    let firmaPrevia = null;
    let iguales = 0;
    let ultima = null;
    const limite = Date.now() + TOPE_DE_ASENTAMIENTO_MS;
    while (Date.now() < limite && iguales < LECTURAS_IGUALES_PARA_ASENTAR) {
        await page.waitForTimeout(ESPERA_ENTRE_LECTURAS_MS);
        ultima = await page.evaluate(sonda, argumentos);
        const firma = JSON.stringify(ultima);
        iguales = firma === firmaPrevia ? iguales + 1 : 1;
        firmaPrevia = firma;
    }
    return ultima;
}

/**
 * Deja una pagina lista para el gesto de recarga: cargada, asentada y con el
 * scroll en el objetivo del tema. Se comparte entre el caso de una sola pagina y
 * el de N a la vez para que las dos mitades midan lo MISMO: si el preparativo
 * divergiera, una diferencia de resultado entre reposo y carga podria venir del
 * instrumento y no del sitio.
 */
async function preparaLaRecarga(page, url, objetivoDeRecarga) {
    await page.goto(url, { waitUntil: "networkidle" });
    /* La portada asienta su composicion despues de `networkidle`: los reveals
       aterrizan y el alto del documento crece. Medir el scroll antes de eso
       mediria un documento que todavia no existe. */
    await page.waitForTimeout(2200);
    await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: "instant" }),
        objetivoDeRecarga,
    );
    await page.waitForTimeout(500);
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
    /* `datos.lang` se escribe mas abajo, con el idioma HORNEADO al lado del
       vivo: los dos juntos son el dato, y uno solo era justamente el hueco que
       la critica #19 encontro. */
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

    /*
     * --- el texto crece con la preferencia de tamano de texto
     *
     * DOS CONTEXTOS por superficie y tema, uno con la raiz de fabrica y otro con
     * la raiz al 200 %, y no una sola pasada: lo que esta familia mide es una
     * DIFERENCIA entre dos montajes, asi que hacen falta los dos. `Page.setFontSizes`
     * se emula por contexto y no se puede cambiar a mitad de una pagina cargada
     * sin volver a cargarla, que costaria lo mismo.
     *
     * Cada contexto recorre la banda entera redimensionando --el mismo patron
     * que las dos familias de arriba-- y las cuatro medidas se comparan por
     * ancho. `reducedMotion: reduce` por el mismo motivo que alli: se mide la
     * composicion asentada, no un fotograma de la entrada.
     */
    const medidasPorRaiz = new Map();
    for (const raizPx of [ROOT_FONT_BASE_PX, ZOOM_FONT_PX]) {
        ctx = await nuevoContexto(browser, theme, {
            viewport: { width: BANDA_DE_REFLOW[0], height: 900 },
            reducedMotion: "reduce",
        });
        page = await ctx.newPage();
        const sesion = await ctx.newCDPSession(page);
        await sesion.send("Page.setFontSizes", {
            fontSizes: { standard: raizPx, fixed: raizPx },
        });
        await page.goto(url, { waitUntil: "networkidle" });
        const porAncho = new Map();
        for (const width of BANDA_DE_REFLOW) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(220);
            porAncho.set(width, await page.evaluate(probeCrecimientoDeTexto));
        }
        await ctx.close();
        medidasPorRaiz.set(raizPx, porAncho);
    }

    const comparacionesDeLaBanda = [];
    const controlesRotos = [];
    for (const width of BANDA_DE_REFLOW) {
        const base = medidasPorRaiz.get(ROOT_FONT_BASE_PX).get(width);
        const zoom = medidasPorRaiz.get(ZOOM_FONT_PX).get(width);
        const comparacion = comparaCrecimiento({
            base,
            zoom,
            ratioMinimo: RATIO_MINIMO_DE_CRECIMIENTO,
        });
        comparacionesDeLaBanda.push({ width, comparacion });
        if (!comparacion.controlDobla)
            controlesRotos.push(
                `a ${width}px el cuerpo pasa de ${comparacion.controlBasePx} a ${comparacion.controlZoomPx} px (x${comparacion.controlRatio}) con la raiz emulada de ${base.rootFontPx} a ${zoom.rootFontPx} px`,
            );
    }
    const crecimiento = fallosDeCrecimientoEnLaBanda(comparacionesDeLaBanda);
    datos.crecimiento = `${crecimiento.sinCrecimiento.length} sin crecer / ${crecimiento.comparadas} cajas comparadas en ${BANDA_DE_REFLOW.join("+")}px (${crecimiento.absueltas} absueltas por la banda, control ${comparacionesDeLaBanda[0]?.comparacion.controlBasePx}->${comparacionesDeLaBanda[0]?.comparacion.controlZoomPx} px)`;

    // [check: texto-crece-con-la-preferencia]
    /* Guarda de vacuidad: si ninguna caja empareja entre los dos contextos --un
       cambio de marcado, una clave que deja de coincidir-- no hay nada que
       comparar y la familia saldria verde sin haber mirado. */
    if (crecimiento.comparadas === 0)
        fallos.push(
            "la sonda de crecimiento no pudo comparar ni una sola caja entre la raiz de fabrica y la raiz al 200 %: el emparejamiento esta roto y el resultado seria vacuo",
        );
    /* Guarda de instrumento, que es la otra forma de mentir: sin emulacion las
       dos medidas son la misma, TODAS las cajas dan x1.00 y el informe acusaria
       al sitio de un defecto del aparato. El cuerpo tiene `font-size: 1rem`, asi
       que dobla siempre que la preferencia llegue. */
    if (controlesRotos.length)
        fallos.push(
            `la caja de control (el cuerpo) no dobla con la preferencia de tamano de texto, asi que la emulacion no llego y la familia seria vacua: ${controlesRotos.join("; ")}`,
        );
    if (crecimiento.sinCrecimiento.length)
        fallos.push(
            `con la preferencia de tamano de texto al 200 % (raiz ${ROOT_FONT_BASE_PX} -> ${ZOOM_FONT_PX} px) hay texto que NO crece en toda la banda de reflow, por debajo de x${RATIO_MINIMO_DE_CRECIMIENTO}: ${crecimiento.sinCrecimiento
                .map(
                    (c) =>
                        `${c.medidas[0].zona}/${c.medidas[0].tag} ("${c.medidas[0].texto}") ` +
                        c.medidas
                            .map(
                                (m) =>
                                    `${m.basePx} -> ${m.zoomPx} px (x${m.ratio}) a ${m.width}px`,
                            )
                            .join(" y ") +
                        ` [${c.medidas[0].sel}]`,
                )
                .join("; ")}`,
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

    /*
     * --- el idioma que el documento anuncia, por ruta y en los DOS montajes
     *
     * MATRIZ: las OCHO superficies x tema claro u oscuro (indiferente: el
     * idioma no depende del tema, y la corrida cubre los dos porque el script se
     * ejecuta con `--tema` en los dos) x 1440x900 x raiz 16 x `reduce`
     * indiferente x DPR 1 x JavaScript DESACTIVADO y ACTIVADO.
     *
     * NO CUESTA NI UN CONTEXTO NUEVO, y eso es parte del diseno: las dos medidas
     * ya estaban ahi -- el DOM vivo lo leyo `probeSemantics` en el primer
     * contexto y el HTML horneado lo lee `probeNoScript` en el ultimo -- y lo
     * que faltaba no era medir, era COMPARAR cada una contra el idioma que su
     * ruta promete. La version anterior de este fichero declaraba el `lang`
     * horneado como "limite conocido" en su docblock de cabecera y ahi se
     * quedaba; un limite conocido escrito en un comentario no cierra un
     * incumplimiento de nivel A (leccion del 2026-09-06, regla 3).
     */
    const langVivo = sem.lang || null;
    const langHorneado = sinJs.lang || null;
    datos.lang = `${langHorneado ?? "sin lang"} horneado -> ${langVivo ?? "sin lang"} vivo`;
    // [check: lang-del-documento-por-ruta]
    const esperadoVivo = langEsperado(surface, { conJavaScript: true });
    const esperadoHorneado = langEsperado(surface, { conJavaScript: false });
    if (!langHorneado)
        fallos.push(
            "el HTML horneado no declara `lang` en su elemento raiz: un lector de pantalla no sabe con que voz leerlo",
        );
    else if (langHorneado !== esperadoHorneado)
        fallos.push(
            `sin JavaScript el documento se sirve anunciandose en "${langHorneado}" y esta superficie es "${esperadoHorneado}": lo que oye un lector de pantalla antes de que hidrate el cliente --o si el JavaScript no llega-- es la pagina entera con la voz equivocada`,
        );
    if (!langVivo)
        fallos.push("el DOM vivo no declara `lang` en su elemento raiz");
    else if (langVivo !== esperadoVivo)
        fallos.push(
            `con JavaScript el documento se anuncia en "${langVivo}" y esta superficie es "${esperadoVivo}"`,
        );

    if (surface.kind === "home") {
        /*
         * --- el deck cabe en su escenario con la preferencia de tamano de texto
         *
         * La matriz completa, con el porque de cada eje fijado, esta en el
         * docblock de `ANCHOS_DEL_DECK` y `RAICES_DEL_DECK`. Aqui solo el
         * resumen: tema oscuro (el unico que monta deck) x 320 y 390 px x raiz
         * 16, 24 y 32 x SIN `reduce` -- que es lo que la separa de sus dos
         * hermanas de zoom y lo unico que hace visible el defecto.
         *
         * En el tema claro se monta UNA sola combinacion, y no para medir el
         * recorte sino para EXIGIR que el deck siga sin existir ahi. Un "esta
         * familia no aplica a este tema" que deje de ser cierto es la forma mas
         * barata que tiene una familia de vaciarse.
         */
        const combinacionesDelDeck =
            theme === "dark"
                ? ANCHOS_DEL_DECK.flatMap((ancho) =>
                      RAICES_DEL_DECK.map((raiz) => ({ ancho, raiz })),
                  )
                : [{ ancho: ANCHOS_DEL_DECK[0], raiz: ROOT_FONT_BASE_PX }];

        const peorPorDeck = new Map();
        const activasPorDeck = new Map();
        const decksPresentes = new Set();
        const raicesRotas = [];
        let pasosDeLaPista = 0;

        for (const { ancho, raiz } of combinacionesDelDeck) {
            ctx = await nuevoContexto(browser, theme, {
                viewport: { width: ancho, height: 800 },
            });
            page = await ctx.newPage();
            const sesionDelDeck = await ctx.newCDPSession(page);
            await sesionDelDeck.send("Page.setFontSizes", {
                fontSizes: { standard: raiz, fixed: raiz },
            });
            await page.goto(url, { waitUntil: "networkidle" });
            await page.waitForTimeout(600);

            const raizDelDeck = await page.evaluate(() =>
                parseFloat(getComputedStyle(document.documentElement).fontSize),
            );
            if (raizDelDeck !== raiz)
                raicesRotas.push(
                    `a ${ancho}px se pidio la raiz a ${raiz} px y la pagina mide ${raizDelDeck}`,
                );

            const pistas = await page.evaluate(localizaPistasDeDeck, {
                decks: DECKS_DEL_TEMA_OSCURO,
            });
            for (const pista of pistas) {
                if (!pista.presente) continue;
                decksPresentes.add(pista.id);
                /* Solo el deck cuya pista se esta recorriendo: el otro esta a
                   miles de pixeles y medirlo en cada paso doblaria el coste de
                   la sonda sin anadir una sola observacion util. */
                const soloEste = DECKS_DEL_TEMA_OSCURO.filter(
                    (d) => d.id === pista.id,
                );
                for (
                    let y = pista.desde;
                    y <= pista.hasta;
                    y += PASO_DE_PISTA_PX
                ) {
                    await page.evaluate(
                        (destino) => window.scrollTo(0, destino),
                        y,
                    );
                    await page.waitForTimeout(ESPERA_POR_PASO_MS);
                    pasosDeLaPista += 1;
                    const medidas = await page.evaluate(probeDeckRecortado, {
                        decks: soloEste,
                        opacidadActiva: OPACIDAD_DE_DIAPOSITIVA_ACTIVA,
                        toleranciaPx: TOLERANCIA_DEL_ESCENARIO_PX,
                    });
                    for (const m of medidas) {
                        if (!m.presente) continue;
                        activasPorDeck.set(
                            m.id,
                            (activasPorDeck.get(m.id) ?? 0) + m.activas,
                        );
                        for (const f of m.fuera) {
                            const previo = peorPorDeck.get(m.id);
                            if (!previo || f.sobra > previo.sobra)
                                peorPorDeck.set(m.id, { ...f, ancho, raiz });
                        }
                    }
                }
            }
            await ctx.close();
        }

        const peorDicho = [...peorPorDeck.entries()].map(
            ([id, p]) =>
                `${id} ${p.sobra} px fuera por ${p.lado} a ${p.ancho}px con la raiz a ${p.raiz} px en ${p.sel} ("${p.texto}")`,
        );
        datos.deck =
            theme === "dark"
                ? `${peorPorDeck.size} deck(s) recortados / ${decksPresentes.size} montados, ${pasosDeLaPista} pasos de pista, activas vistas ${[
                      ...activasPorDeck.entries(),
                  ]
                      .map(([id, n]) => `${id}=${n}`)
                      .join(" ")}`
                : `sin deck en el tema ${theme} (${decksPresentes.size} montados)`;

        // [check: deck-cabe-en-el-escenario-al-200-por-ciento]
        if (theme === "dark") {
            /* Las dos guardas de vacuidad de esta familia. La primera: si el
               tema oscuro deja de montar un deck --un renombrado del componente,
               un cambio de vehiculo-- la sonda no tiene objeto y el cero de
               recortes no significa nada. La segunda: sin una sola diapositiva
               activa en todo el recorrido, el umbral de opacidad dejo de casar
               y la familia sale verde sin haber mirado ninguna. */
            for (const d of DECKS_DEL_TEMA_OSCURO) {
                if (!decksPresentes.has(d.id))
                    fallos.push(
                        `el tema oscuro ya no monta la pista del deck de ${d.id} (se busca la clase que contiene ${d.pista} dentro de #${d.seccion}): sin escenario que recorrer el verde de esta familia seria vacuo`,
                    );
                else if ((activasPorDeck.get(d.id) ?? 0) === 0)
                    fallos.push(
                        `ni una sola diapositiva del deck de ${d.id} llego a ${OPACIDAD_DE_DIAPOSITIVA_ACTIVA} de opacidad en los ${pasosDeLaPista} pasos del recorrido: sin diapositiva activa no hay nada que medir y el resultado seria vacuo`,
                    );
            }
            /* Guarda de instrumento, la misma que su familia hermana de zoom: si
               `Page.setFontSizes` no llega, las tres raices miden lo mismo y el
               verde hablaria del aparato, no del sitio. */
            if (raicesRotas.length)
                fallos.push(
                    `la preferencia de tamano de texto no llego a la pagina en la pasada del deck: ${raicesRotas.join("; ")}`,
                );
            if (peorDicho.length)
                fallos.push(
                    `con la preferencia de tamano de texto subida y SIN prefers-reduced-motion, el contenido de la diapositiva activa no cabe en el escenario que lo recorta y se pierde (peor caso por deck): ${peorDicho.join("; ")}`,
                );
        } else if (decksPresentes.size > 0) {
            fallos.push(
                `el tema ${theme} monta ${decksPresentes.size} deck(s) (${[...decksPresentes].join(", ")}) y la matriz de esta familia da por hecho que solo existen en el oscuro: vuelve a medir antes de fiarte de este verde`,
            );
        }

        /*
         * --- la recarga conserva la seccion que se estaba leyendo
         *
         * MATRIZ y el porque del objetivo distinto por tema: docblock de
         * `OBJETIVO_DE_RECARGA_PX`. El eje de CARGA se recorre en dos puntos y
         * los dos casos de abajo son esos dos puntos.
         *
         * PRIMER PUNTO, la maquina EN REPOSO: un solo contexto, una sola pagina.
         * Se conserva como CONTROL y no por inercia -- sobre el build sin
         * arreglo esta combinacion dio 0 fallos de 10, o sea que habria firmado
         * el defecto en verde. Sirve para separar "la restauracion esta rota
         * siempre" de "la restauracion pierde una carrera": si este caso falla,
         * el defecto no es de concurrencia.
         */
        const objetivoDeRecarga =
            OBJETIVO_DE_RECARGA_PX[theme] ?? OBJETIVO_DE_RECARGA_PX.dark;
        ctx = await nuevoContexto(browser, theme);
        page = await ctx.newPage();
        await preparaLaRecarga(page, url, objetivoDeRecarga);
        const antesDeRecargar = await page.evaluate(
            probeSeccionDelCentro,
            CENTRO_DEL_VIEWPORT,
        );
        await page.reload({ waitUntil: "networkidle" });
        await esperaAlturaEstable(page, { tope: 6000 });
        const despuesDeRecargar = await page.evaluate(
            probeSeccionDelCentro,
            CENTRO_DEL_VIEWPORT,
        );
        await ctx.close();

        const veredictoDeRecarga = evaluaRecarga({
            antes: antesDeRecargar,
            despues: despuesDeRecargar,
            derivaMaxima: DERIVA_MAXIMA_DE_RECARGA_PX,
        });

        /*
         * SEGUNDO PUNTO, la maquina BAJO CARGA: `RECARGAS_SIMULTANEAS` paginas
         * en contextos propios del MISMO navegador, todas apuntando a la misma
         * portada y todas recargando a la vez con un solo `Promise.all`. Es la
         * combinacion donde el defecto del 2026-09-06 aparecio (9 fallos de 15
         * sobre el build sin arreglo) y donde el arreglo se dejo ver (20/20).
         *
         * Contextos separados y no pestanas del mismo: cada uno arranca su
         * propio `localStorage` con el tema, que es lo que la carrera necesita
         * para ocurrir -- el HTML horneado llega con la rama clara y la rama del
         * tema se decide en cliente.
         */
        const contextosSimultaneos = [];
        const paginasSimultaneas = [];
        for (let i = 0; i < RECARGAS_SIMULTANEAS; i += 1) {
            const c = await nuevoContexto(browser, theme);
            contextosSimultaneos.push(c);
            paginasSimultaneas.push(await c.newPage());
        }
        await Promise.all(
            paginasSimultaneas.map((p) =>
                preparaLaRecarga(p, url, objetivoDeRecarga),
            ),
        );
        const antesSimultaneo = await Promise.all(
            paginasSimultaneas.map((p) =>
                p.evaluate(probeSeccionDelCentro, CENTRO_DEL_VIEWPORT),
            ),
        );
        /* EL GESTO, y el unico sitio donde la simultaneidad es de verdad: las N
           recargas salen en el mismo tick y compiten por la CPU y por el mismo
           servidor. Secuenciarlas devolveria N repeticiones del caso de reposo,
           que es justo la medicion que no vale. */
        await Promise.all(
            paginasSimultaneas.map((p) =>
                p.reload({ waitUntil: "networkidle" }),
            ),
        );
        await Promise.all(
            paginasSimultaneas.map((p) =>
                esperaAlturaEstable(p, { tope: 8000 }),
            ),
        );
        const despuesSimultaneo = await Promise.all(
            paginasSimultaneas.map((p) =>
                p.evaluate(probeSeccionDelCentro, CENTRO_DEL_VIEWPORT),
            ),
        );
        for (const c of contextosSimultaneos) await c.close();

        const lecturasSimultaneas = antesSimultaneo.map((antes, i) => ({
            antes,
            despues: despuesSimultaneo[i],
        }));
        const veredictoSimultaneo = evaluaRecargaSimultanea({
            lecturas: lecturasSimultaneas,
            derivaMaxima: DERIVA_MAXIMA_DE_RECARGA_PX,
            esperadas: RECARGAS_SIMULTANEAS,
        });

        datos.recarga = `${antesDeRecargar.seccion ?? "sin seccion"}@${antesDeRecargar.y} -> ${despuesDeRecargar.seccion ?? "sin seccion"}@${despuesDeRecargar.y} (deriva ${veredictoDeRecarga.deriva} px, alto ${antesDeRecargar.alto} -> ${despuesDeRecargar.alto}) | ${RECARGAS_SIMULTANEAS} a la vez: ${veredictoSimultaneo.aciertos}/${veredictoSimultaneo.total} aciertan, peor deriva ${veredictoSimultaneo.peorDeriva} px`;
        // [check: recarga-conserva-la-seccion]
        if (!veredictoDeRecarga.cumple)
            fallos.push(
                `recargar la pagina no devuelve al visitante donde estaba (una sola pagina, maquina en reposo): ${veredictoDeRecarga.motivo}`,
            );
        /* Las dos guardas de vacuidad del caso bajo carga. La primera: si abrir
           las N paginas falla a medias, la cuenta de aciertos hablaria de una
           medicion que no se hizo entera. La segunda vive dentro de
           `evaluaRecargaSimultanea` (`esperadas`) y mira las LECTURAS, que es lo
           que de verdad se juzga: N paginas abiertas de las que solo tres
           contestan no son N mediciones. */
        if (paginasSimultaneas.length !== RECARGAS_SIMULTANEAS)
            fallos.push(
                `se pidieron ${RECARGAS_SIMULTANEAS} paginas recargando a la vez y solo se abrieron ${paginasSimultaneas.length}: sin las N el eje de carga no se recorrio y el verde seria vacuo`,
            );
        if (!veredictoSimultaneo.cumple)
            fallos.push(
                `recargar la pagina no devuelve al visitante donde estaba con la maquina cargada: ${veredictoSimultaneo.motivo}`,
            );

        /*
         * --- arte descargado que la pagina no llega a pintar, por tema y por DPR
         *
         * MATRIZ en el docblock de `DPRS_DEL_ARTE`. Dos contextos por superficie
         * y tema, uno por densidad, sin scroll y con tres segundos tras `load`
         * para que el `srcset` haya resuelto y las descargas hayan terminado.
         */
        const arteSuelto = [];
        let recursosDeArteVistos = 0;
        for (const dpr of DPRS_DEL_ARTE) {
            ctx = await nuevoContexto(browser, theme, {
                deviceScaleFactor: dpr,
            });
            page = await ctx.newPage();
            await page.goto(url, { waitUntil: "load" });
            await page.waitForTimeout(3000);
            const arte = await page.evaluate(probeArteNoPintado, {
                patron: PATRON_DE_ARTE,
            });
            await ctx.close();
            recursosDeArteVistos += arte.evaluados;
            const sueltos = arte.recursos.filter((r) => !r.pintado);
            const bytes = sueltos.reduce((total, r) => total + r.bytes, 0);
            if (bytes > MAX_BYTES_DE_ARTE_NO_PINTADO)
                arteSuelto.push(
                    `a DPR ${dpr} ${bytes} B en ${sueltos.length} fichero(s): ${sueltos
                        .map((r) => `${r.fichero} ${r.bytes} B`)
                        .join(", ")}`,
                );
        }
        datos.arte = `${arteSuelto.length} combinacion(es) con arte sin pintar / ${recursosDeArteVistos} recursos de arte vistos en ${DPRS_DEL_ARTE.length} densidades`;
        // [check: arte-no-pintado-por-tema-y-dpr]
        /* Guarda de vacuidad: si el patron deja de casar con nada --una carpeta
           renombrada, un formato nuevo-- la cuenta de bytes sin pintar seria
           cero por no haber mirado. */
        if (recursosDeArteVistos === 0)
            fallos.push(
                "la sonda de arte no vio ni un solo recurso que casara con el patron en ninguna densidad: el filtro esta roto y el cero de bytes seria vacuo",
            );
        if (arteSuelto.length)
            fallos.push(
                `el navegador descarga arte que la pagina no llega a pintar en el tema ${theme} (tope ${MAX_BYTES_DE_ARTE_NO_PINTADO} B): ${arteSuelto.join("; ")}. Es peso que paga el visitante y que ninguna imagen del documento usa`,
            );

        /*
         * --- el estado modal de la hoja no sobrevive al cambio de anchura
         *
         * MATRIZ completa en el docblock de `CAMBIOS_DE_ANCHURA_DE_LA_HOJA`.
         * Aqui el resumen: se abre la hoja a 390x844 con `hasTouch` e
         * `isMobile`, se cruza el escalon `md` cambiando el tamano del viewport
         * y se exige que al otro lado la pagina siga siendo usable. Un contexto
         * por combinacion porque la densidad se emula por contexto y no se
         * cambia a mitad de una pagina viva.
         */
        const cruces = [];
        let hojasAbiertas = 0;
        for (const cambio of CAMBIOS_DE_ANCHURA_DE_LA_HOJA) {
            ctx = await nuevoContexto(browser, theme, {
                viewport: {
                    width: VIEWPORT_DE_LA_HOJA.ancho,
                    height: VIEWPORT_DE_LA_HOJA.alto,
                },
                hasTouch: true,
                isMobile: true,
                deviceScaleFactor: cambio.dpr,
                reducedMotion: "no-preference",
            });
            page = await ctx.newPage();
            await page.goto(url, { waitUntil: "networkidle" });
            await page.waitForTimeout(600);

            const disparador = await page.evaluate(probeDisparadorDeLaHoja);
            /* La foto de los nodos que ya son inertes ANTES de tocar nada: los
               que trae el marcado (el panel del desplegable cerrado) no son
               fondo que la hoja inertice, y sin esta referencia se cuentan como
               tal. Ver el comentario de `evaluaEstadoModal`. */
            const lineaBase = await page.evaluate(probeEstadoModal, {
                selector: SELECTOR_FOCALIZABLE,
            });
            let abierta = null;
            let despues = null;
            if (disparador) {
                /* Por `id` y no por clase ni por el gancho de test: el `id` es
                   el que el propio `aria-controls` de la hoja usa para atarse a
                   el, asi que ya esta en el contrato del componente. */
                await page.click(`[id="${disparador.id}"]`);
                abierta = await esperaEstadoEstable(page, probeEstadoModal, {
                    selector: SELECTOR_FOCALIZABLE,
                });
                if (abierta && abierta.operablesEnLaHoja > 0)
                    hojasAbiertas += 1;
                /* EL GESTO: cambiar el tamano del viewport SIN tocar nada mas.
                   No se pulsa Escape ni se cierra a mano -- lo que se mide es
                   lo que pasa cuando el contexto cambia solo. */
                await page.setViewportSize({
                    width: cambio.ancho,
                    height: cambio.alto,
                });
                despues = await esperaEstadoEstable(page, probeEstadoModal, {
                    selector: SELECTOR_FOCALIZABLE,
                });
            }
            await ctx.close();

            cruces.push({
                cambio,
                despues,
                veredicto: evaluaEstadoModal({
                    combinacion: cambio,
                    lineaBase,
                    disparador,
                    abierta,
                    despues,
                }),
            });
        }

        const crucesCaidos = cruces.filter((c) => !c.veredicto.cumple);
        datos.hojaAlCruzar = `${cruces.length - crucesCaidos.length}/${cruces.length} cruces conservan la pagina usable, ${hojasAbiertas}/${cruces.length} hojas abiertas, operables tras cruzar ${cruces
            .map(
                (c) =>
                    `${c.cambio.ancho}x${c.cambio.alto}@dpr${c.cambio.dpr}=${c.despues ? c.despues.operables : "sin lectura"}`,
            )
            .join(" ")}`;
        // [check: estado-modal-no-sobrevive-al-cambio-de-anchura]
        /* Guarda de vacuidad de la familia entera, aparte de la que cada
           veredicto lleva dentro: si NINGUNA de las combinaciones llego a abrir
           la hoja, lo que hay no es una pagina que aguanta el cruce, es una
           sonda que no encontro su objeto en toda la corrida. */
        if (hojasAbiertas === 0)
            fallos.push(
                `la hoja movil no llego a abrirse en ninguna de las ${cruces.length} combinaciones de anchura: sin estado modal que cruzar el verde de esta familia seria vacuo`,
            );
        if (crucesCaidos.length)
            fallos.push(
                `al cambiar de anchura con la hoja movil abierta el estado modal sobrevive al contexto que lo justificaba (${crucesCaidos.length} de ${cruces.length} cruces): ${crucesCaidos
                    .map(
                        (c) =>
                            `${VIEWPORT_DE_LA_HOJA.ancho}x${VIEWPORT_DE_LA_HOJA.alto} -> ${c.cambio.ancho}x${c.cambio.alto} a DPR ${c.cambio.dpr} -- ${c.veredicto.motivos.join("; ")}`,
                    )
                    .join(" | ")}`,
            );

        /*
         * --- el contraste de la cabecera contra lo que pasa por debajo
         *
         * MATRIZ completa en el docblock de `VIEWPORTS_DE_LA_CABECERA`. Aqui el
         * resumen, y el eje que importa: los DOS sentidos de
         * `prefers-reduced-motion`, porque el arte que se desplaza solo pasa
         * bajo la barra en uno de ellos y medir solo en el otro es medir otra
         * cosa (leccion del 2026-09-07).
         */
        const peorPorPieza = new Map();
        let piezasVistas = 0;
        let puntosDeBarrido = 0;
        let medicionesHechas = 0;
        let piezasSinTinta = 0;
        let piezasMinusculas = 0;
        const instrumentoRoto = [];

        for (const vista of VIEWPORTS_DE_LA_CABECERA) {
            for (const reduce of REDUCES_DE_LA_CABECERA) {
                ctx = await nuevoContexto(browser, theme, {
                    viewport: { width: vista.ancho, height: vista.alto },
                    reducedMotion: reduce,
                    deviceScaleFactor: 1,
                });
                page = await ctx.newPage();
                await page.goto(url, { waitUntil: "networkidle" });
                /* La portada asienta su composicion despues de `networkidle`:
                   el mismo motivo, y la misma espera, que `preparaLaRecarga`. */
                await page.waitForTimeout(2200);

                const inventario = await page.evaluate(probePiezasDeCabecera, {
                    minLado: LADO_MINIMO_DE_PIEZA_PX,
                });
                piezasVistas += inventario.piezas.length;
                piezasMinusculas += inventario.descartadasPorTamano;
                piezasSinTinta += inventario.descartadasPorTintaTranslucida;
                if (inventario.sinCabecera)
                    instrumentoRoto.push(
                        `a ${vista.ancho}px con reduce=${reduce} el documento no monta <header>`,
                    );
                if (inventario.piezas.length === 0) {
                    await ctx.close();
                    continue;
                }

                const umbrales = {};
                for (const pieza of inventario.piezas)
                    umbrales[pieza.indice] = umbralDeContraste(
                        pieza.px,
                        pieza.peso,
                    );
                const fijados = await page.evaluate(
                    fijaUmbralesDeCabecera,
                    umbrales,
                );
                if (fijados !== inventario.piezas.length)
                    instrumentoRoto.push(
                        `a ${vista.ancho}px con reduce=${reduce} solo ${fijados} de ${inventario.piezas.length} piezas recibieron su umbral: el resto se compararia contra nada`,
                    );

                await page.evaluate(apagaLaTintaDeLaCabecera);
                /* La barra transiciona `color`, asi que se le da tiempo a la
                   transicion antes de comprobar que la tinta se fue: ver el
                   docblock de `probeTintaApagada`, con la medida que lo
                   obligo. */
                await page.waitForTimeout(600);
                const apagado = await page.evaluate(probeTintaApagada);
                if (apagado.conTinta > 0)
                    instrumentoRoto.push(
                        `a ${vista.ancho}px con reduce=${reduce} quedan ${apagado.conTinta} pieza(s) con la tinta puesta tras apagarla: la captura mediria la tinta contra si misma`,
                    );
                if (apagado.desconectadas > 0)
                    instrumentoRoto.push(
                        `a ${vista.ancho}px con reduce=${reduce} ${apagado.desconectadas} pieza(s) del inventario ya no estan en el arbol: el barrido las daria por no medidas`,
                    );

                const banda = {
                    x: 0,
                    y: 0,
                    width: vista.ancho,
                    height: Math.min(vista.alto, ALTO_DE_LA_BANDA_DE_CABECERA),
                };
                const alto = await page.evaluate(
                    () => document.documentElement.scrollHeight,
                );
                const tope = Math.max(0, alto - vista.alto);
                const paradas = [];
                for (let y = 0; y <= tope; y += PASO_DEL_BARRIDO_DE_CABECERA)
                    paradas.push(y);
                if (paradas[paradas.length - 1] !== tope) paradas.push(tope);

                for (const y of paradas) {
                    await page.evaluate(
                        (destino) => window.scrollTo(0, destino),
                        y,
                    );
                    await page.waitForTimeout(80);
                    const captura = await page.screenshot({ clip: banda });
                    const medidas = await page.evaluate(
                        probeContrasteDeLaCabecera,
                        {
                            imagen: `data:image/png;base64,${captura.toString("base64")}`,
                            banda: { x: banda.x, y: banda.y },
                            percentil: PERCENTIL_DE_CONTRASTE,
                        },
                    );
                    puntosDeBarrido += 1;
                    for (const medida of medidas) {
                        if (!medida.medida) continue;
                        medicionesHechas += 1;
                        const pieza = inventario.piezas[medida.indice];
                        const clave = `${vista.ancho}x${vista.alto} reduce=${reduce}`;
                        const id = `${clave} | ${pieza.texto}`;
                        const previo = peorPorPieza.get(id);
                        if (!previo || medida.percentil < previo.peor.percentil)
                            peorPorPieza.set(id, {
                                clave,
                                texto: pieza.texto,
                                px: pieza.px,
                                peso: pieza.peso,
                                tinta: pieza.tinta,
                                umbral: umbrales[pieza.indice],
                                percentil: PERCENTIL_DE_CONTRASTE,
                                peor: medida,
                            });
                    }
                }
                await ctx.close();
            }
        }

        const veredictoDelContraste = evaluaContrasteDeCabecera({
            piezas: [...peorPorPieza.values()],
            tolerancia: TOLERANCIA_DE_LA_FORMULA_DE_CONTRASTE,
        });
        datos.contrasteCabecera = `${veredictoDelContraste.fallos.length} pieza(s) bajo umbral / ${veredictoDelContraste.comprobadas} comprobadas de ${piezasVistas} vistas en ${puntosDeBarrido} puntos de barrido (${medicionesHechas} mediciones, paso ${PASO_DEL_BARRIDO_DE_CABECERA} px, ${piezasMinusculas} descartadas por caja minuscula, ${piezasSinTinta} por tinta translucida)`;

        // [check: contraste-de-la-cabecera-sobre-lo-que-pasa-por-debajo]
        /* Las dos guardas de vacuidad de esta familia, con el mismo criterio
           que las de sus hermanas: sin piezas de cabecera no hay tinta que
           juzgar y sin puntos de barrido no se miro ninguna. Las dos cuentas
           son de decenas en cualquier portada real. */
        if (piezasVistas === 0)
            fallos.push(
                "la sonda de contraste no encontro ni una sola pieza de texto en la cabecera en ninguna combinacion: el filtro esta roto y el verde seria vacuo",
            );
        if (puntosDeBarrido === 0)
            fallos.push(
                "el barrido de scroll de la cabecera no llego a dar ni un solo punto: sin puntos no se midio nada y el verde seria vacuo",
            );
        if (instrumentoRoto.length)
            fallos.push(
                `la sonda de contraste de cabecera no pudo montarse bien y su resultado no habla del sitio: ${instrumentoRoto.join("; ")}`,
            );
        if (veredictoDelContraste.formulaRota.length)
            fallos.push(
                `las dos copias de la formula de contraste no coinciden (tolerancia ${TOLERANCIA_DE_LA_FORMULA_DE_CONTRASTE}): ${veredictoDelContraste.formulaRota.join("; ")}. El instrumento se partio en dos y esta medida no vale`,
            );
        if (veredictoDelContraste.fallos.length)
            fallos.push(
                `la tinta de la cabecera fija no llega al umbral de WCAG 1.4.3 contra el fondo REALMENTE pintado bajo su caja (peor punto por pieza, percentil ${PERCENTIL_DE_CONTRASTE}): ${veredictoDelContraste.fallos.join("; ")}`,
            );
    }

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
