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
 * (`langEsperado`). Hasta el 2026-09-10 aceptaba una excepcion, la 404 inglesa
 * horneada en castellano; ya no la acepta (ver `langEsperado`).
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
 * Las treinta y tres familias que este script comprueba (31 y 32, las de la
 * tabulacion y el aterrizaje de ancla, el 2026-09-10; 33, la del Atras que
 * restituye la lectura, F20-C1 el mismo dia). La lista es el CONTRATO
 * del candado: el test companero exige que ninguna desaparezca, porque un script
 * que mide trece cosas y dice medir catorce es peor que uno que no existe.
 *
 * (El recuento de esta primera linea se corrige el 2026-09-08: decia
 * "veintitres" con veintisiete en la lista, porque las cuatro familias de las
 * olas T y U entraron sin tocarlo. El numero vive tambien, y sobre todo, en
 * `FAMILIAS_MINIMAS` del test companero, que es el que no se puede recortar en
 * silencio.)
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
    "volver-arriba-vuelve-arriba",
    "conmutar-el-tema-no-congela-la-pagina",
    "atras-restituye-el-documento-de-la-url",
    "punto-de-lectura-de-la-url-es-de-un-solo-uso",
    "tinta-pintada-dentro-del-viewport",
    "revelado-sin-banda-ciega",
    "condiciones-de-navegador-estables-en-la-corrida",
    "tabulacion-sin-rezago",
    "aterrizaje-de-ancla-constante",
    "atras-y-adelante-restituyen-la-lectura",
    "adelante-a-la-portada-vuelve-a-su-lectura",
    "atras-con-fragmento-vuelve-a-la-lectura",
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
 * LA MATRIZ DE LA FAMILIA `tinta-pintada-dentro-del-viewport`, con el porque de
 * cada uno de sus tres ejes.
 *
 * ANCHOS. Los tres de la zona estrecha: 320 --el ancho de reflow de WCAG
 * 1.4.10, y el unico en el que el arbitraje de la critica #21 encontro numeros
 * negativos-- mas 360 y 390, los dos anchos de telefono reales que el repo ya
 * mide en otras familias. No se barre entero `WIDTH_SWEEP`: el recorte lo paga
 * el eje de la RAIZ, que es el que de verdad mueve la medida (a 480 px y por
 * arriba sobra holgura por los dos lados en las ocho superficies).
 *
 * RAICES. Las TRES, y esta es la unica lista que no se recorta: 16 es la de
 * fabrica, 32 el 200 % que exige WCAG 1.4.4, y 24 el peldano intermedio donde
 * el barrido propio del 2026-09-08 encontro celdas DISTINTAS de las otras dos
 * (`/en` a 360 px con la raiz a 24 tiene una pieza 15,78 px fuera que a 16 y a
 * 32 no aparece). Un eje de dos extremos habria dejado ese tramo sin mirar.
 *
 * `Page.setFontSizes` SE REEMULA EN VIVO, sin recargar, y eso es lo que hace
 * que la matriz quepa en un contexto por sentido de `reduce`. El docblock de la
 * familia de crecimiento dice lo contrario ("no se puede cambiar a mitad de una
 * pagina cargada sin volver a cargarla") y alli sigue siendo cierto por otro
 * motivo --aquella familia compara DOS montajes y necesita las dos medidas
 * vivas a la vez--, pero la emulacion en si es reversible e idempotente:
 * medido el 2026-09-08 sobre `/en`, la secuencia 32 -> 24 -> 16 -> 32 devuelve
 * exactamente los mismos numeros que la primera pasada (-10,16 / 4,08 / 14,76 a
 * 320/360/390), con `getComputedStyle(html).fontSize` siguiendo a cada peticion.
 * Doce medidas tras la carga: 3,8 s.
 *
 * REDUCES. Los DOS sentidos, y este eje es el motivo de que la familia exista.
 * `texto-al-200-por-ciento` --su hermana, la que mide CAJAS-- fija
 * `reducedMotion: "reduce"` a proposito para medir la composicion asentada, y
 * con esa preferencia el repo declara los estados FINALES de todos sus reveals.
 * Sin ella, la composicion en reposo es OTRA: cada seccion todavia no revelada
 * se queda en el primer fotograma de su entrada, que en Story incluye
 * `translateX(±16%)`. Esa mitad de la realidad no la ve ninguna familia
 * anterior. Es la misma leccion que el arbitraje de la critica #20 (2026-09-07):
 * una sonda que fija `reduce` por costumbre mide otra cosa.
 */
export const ANCHOS_DE_LA_TINTA = [320, 360, 390];
export const RAICES_DE_LA_TINTA = [ROOT_FONT_BASE_PX, 24, ZOOM_FONT_PX];
export const REDUCES_DE_LA_TINTA = ["no-preference", "reduce"];

/**
 * Holgura subpixel de la familia de la tinta. Un pixel, el mismo numero y por
 * el mismo motivo que usa `probePerdidaHorizontal` para su `sobra <= 1`: los
 * rectangulos de un rango llegan con decimales y una linea centrada en una caja
 * de ancho impar cae medio pixel a un lado. No es holgura de criterio: las
 * perdidas reales que esta familia existe para cazar se miden en decenas de px
 * (-10,16 en `/en`, -2,91 en `/` a 320 px con la raiz a 32).
 */
export const TOLERANCIA_DE_TINTA_PX = 1;

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
 * EL MODO DE RESTITUCION QUE CADA TEMA TIENE QUE DEJAR EN LA PORTADA tras una
 * recarga (F20-A, 2026-09-10). Es la mitad DETERMINISTA de esta familia: el
 * aterrizaje (`evaluaRecarga`) solo sale rojo cuando la tirada pierde la
 * carrera, y el modo sale rojo en CADA corrida en cuanto el interruptor falta.
 *
 * La causa confirmada: con `history.scrollRestoration = "auto"` la restitucion
 * NATIVA llega despues de la unica correccion del sitio y la deshace (15 pares
 * emparejados: `auto` 47 de 75 paginas en rojo, `manual` 0 de 75). Decision del
 * dueno de esa fecha: `"manual"` solo en oscuro y solo en la portada, con el
 * claro de CONTROL en `"auto"`.
 *
 * Desde el 2026-09-11 (P7-2, opcion 1 del dueno) las DOS portadas van en
 * `"manual"`: en claro la nativa llevaba al lector al fragmento en un Atras
 * desde una legal (5.688 -> 4.438, medido en P7-2A). Con `"manual"` en los dos
 * temas el sitio es el unico motor tambien en claro, y la guarda de vacuidad
 * (`exigeLlamada`) se exige en los dos.
 *
 * La tabla vive aqui, escrita a mano, y NO se importa de `src/theme`: un
 * instrumento que lee la regla del codigo que juzga no prueba nada.
 */
export const MODO_DE_RESTITUCION_EN_LA_PORTADA = {
    dark: "manual",
    light: "manual",
};

/** Las rutas servidas de las dos portadas (`trailingSlash: false`). */
export const RUTAS_DE_PORTADA = ["/", "/index.html", "/en", "/en.html"];

/**
 * EL VEREDICTO DEL MODO: puro y tabulado en el gate. Fuera de las portadas
 * espera `"auto"` en los dos temas. Un `modo` que no sea ni `"auto"` ni
 * `"manual"` (la lectura no llego, o el navegador no implementa la propiedad)
 * no es verde: es la sonda sin objeto, y se declara incumplimiento.
 */
export function evaluaModoDeRestitucion({ theme, pathname, modo }) {
    const esperado = RUTAS_DE_PORTADA.includes(pathname)
        ? (MODO_DE_RESTITUCION_EN_LA_PORTADA[theme] ?? "auto")
        : "auto";
    if (modo !== "auto" && modo !== "manual")
        return {
            esperado,
            cumple: false,
            motivo: `history.scrollRestoration leido en ${pathname} (tema ${theme}) vale ${JSON.stringify(modo)}: sin un modo legible la sonda quedaria vacua`,
        };
    if (modo !== esperado)
        return {
            esperado,
            cumple: false,
            motivo: `tras recargar ${pathname} en tema ${theme} history.scrollRestoration vale "${modo}" y tendria que valer "${esperado}"`,
        };
    return { esperado, cumple: true, motivo: null };
}

/**
 * EL TESTIGO DE SCROLL SIN LLAMADA JS (familia 20, candado b del diseno F20).
 *
 * POR QUE HACE FALTA ADEMAS DE LA DERIVA. La carrera del 2026-09-06 es la
 * restitucion NATIVA llegando despues de la correccion del sitio; la deriva
 * final solo la ve cuando la nativa aterriza lejos. Si la nativa mueve y algo la
 * devuelve, o si aterriza a menos de `DERIVA_MAXIMA_DE_RECARGA_PX`, la deriva
 * sale verde con dos motores peleando por el scroll. Con `"manual"` en la
 * portada oscura el sitio es el UNICO motor: todo cambio de `scrollY` posterior
 * a su correccion tiene que tener una llamada JS que lo explique.
 *
 * QUE REGISTRA, como script de inicio del contexto (corre en cada documento,
 * antes que el del sitio): las llamadas a `window.scrollTo/scroll/scrollBy`,
 * `Element.prototype.scrollIntoView/scrollTo/scroll/scrollBy`, los setters de
 * `scrollTop`/`scrollLeft` de `Element.prototype` (Next hace
 * `htmlElement.scrollTop = 0` en el `layout-router`) y `HTMLElement.focus`
 * sin `preventScroll`; de cada una, el instante y el estado JUSTO despues
 * (`y`, la seccion bajo el centro del viewport y su `top`). Y cada evento
 * `scroll` del documento con el mismo estado. Los metodos de un elemento que
 * no es el documento solo cuentan si pueden mover el documento
 * (`scrollIntoView`, `focus`): un `scrollTo` sobre un carril interior no
 * explica un salto de la pagina.
 */
export function testigoDeScrollEnPagina() {
    const registro = { llamadas: [], eventos: [] };
    window.__testigoScroll = registro;
    const ahora = () => Math.round(performance.now());
    const estado = () => {
        const centro = window.innerHeight / 2;
        let id = null;
        let top = null;
        for (const s of document.querySelectorAll("section[id]")) {
            const r = s.getBoundingClientRect();
            if (r.top <= centro && r.bottom > centro) {
                id = s.id;
                top = Math.round(r.top);
                break;
            }
        }
        return { y: Math.round(window.scrollY), id, top };
    };
    const esDocumento = (el) =>
        el === document.documentElement ||
        el === document.body ||
        el === document.scrollingElement;
    const esSuave = (args) => {
        const o = args[0];
        if (o && typeof o === "object" && o.behavior === "smooth") return true;
        if (o && typeof o === "object" && o.behavior === "instant")
            return false;
        try {
            return (
                getComputedStyle(document.documentElement).scrollBehavior ===
                "smooth"
            );
        } catch {
            return false;
        }
    };
    /* EL DESTINO de cada llamada, calculado ANTES de ejecutarla y acotado al
       recorrido real del documento: es lo que una llamada suave promete y lo
       unico que la exime (docblock de `TOPE_DE_SCROLL_SUAVE_MS`). `null`
       cuando no es calculable (un `scrollIntoView` que no alinea al inicio,
       un `focus`): entonces la exencion solo dura hasta el primer
       asentamiento. */
    const maxY = () =>
        Math.max(
            0,
            (document.scrollingElement || document.documentElement)
                .scrollHeight - window.innerHeight,
        );
    const acota = (v) =>
        typeof v === "number" && Number.isFinite(v)
            ? Math.round(Math.min(Math.max(v, 0), maxY()))
            : null;
    const destinoDeArgs = (relativo) => (_el, args, yAntes) => {
        const o = args[0];
        const v = o && typeof o === "object" ? o.top : args[1];
        if (v === undefined) return acota(yAntes);
        return acota(relativo ? yAntes + Number(v) : Number(v));
    };
    const destinoDeIntoView = (el, args) => {
        const o = args[0];
        const block =
            o === false
                ? "end"
                : (o && typeof o === "object" && o.block) || "start";
        if (block !== "start") return null;
        try {
            const margen =
                (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) +
                (parseFloat(
                    getComputedStyle(document.documentElement).scrollPaddingTop,
                ) || 0);
            return acota(
                window.scrollY + el.getBoundingClientRect().top - margen,
            );
        } catch {
            return null;
        }
    };
    const sinDestino = () => null;
    const anota = (tipo, suave, destino) =>
        registro.llamadas.push({
            t: ahora(),
            tipo,
            suave,
            destino,
            ...estado(),
        });
    const envuelve = (objeto, nombre, tipo, cuenta, destinoDe) => {
        const original = objeto[nombre];
        if (typeof original !== "function") return;
        objeto[nombre] = function (...args) {
            const cuentaEsta = cuenta(this, args);
            const destino = cuentaEsta
                ? destinoDe(this, args, window.scrollY)
                : null;
            const r = original.apply(this, args);
            if (cuentaEsta) anota(tipo, esSuave(args), destino);
            return r;
        };
    };
    const esDoc = (el) => esDocumento(el);
    envuelve(
        window,
        "scrollTo",
        "window.scrollTo",
        () => true,
        destinoDeArgs(false),
    );
    envuelve(
        window,
        "scroll",
        "window.scroll",
        () => true,
        destinoDeArgs(false),
    );
    envuelve(
        window,
        "scrollBy",
        "window.scrollBy",
        () => true,
        destinoDeArgs(true),
    );
    envuelve(
        Element.prototype,
        "scrollIntoView",
        "scrollIntoView",
        () => true,
        destinoDeIntoView,
    );
    envuelve(
        Element.prototype,
        "scrollTo",
        "Element.scrollTo",
        esDoc,
        destinoDeArgs(false),
    );
    envuelve(
        Element.prototype,
        "scroll",
        "Element.scroll",
        esDoc,
        destinoDeArgs(false),
    );
    envuelve(
        Element.prototype,
        "scrollBy",
        "Element.scrollBy",
        esDoc,
        destinoDeArgs(true),
    );
    envuelve(
        HTMLElement.prototype,
        "focus",
        "focus",
        (_el, args) => !(args[0] && args[0].preventScroll),
        sinDestino,
    );
    for (const prop of ["scrollTop", "scrollLeft"]) {
        const d = Object.getOwnPropertyDescriptor(Element.prototype, prop);
        if (!d || typeof d.set !== "function") continue;
        Object.defineProperty(Element.prototype, prop, {
            configurable: true,
            enumerable: d.enumerable,
            get: d.get,
            set(valor) {
                const yAntes = window.scrollY;
                d.set.call(this, valor);
                if (esDocumento(this))
                    anota(
                        `${prop}=`,
                        esSuave([]),
                        prop === "scrollTop"
                            ? acota(Number(valor))
                            : acota(yAntes),
                    );
            },
        });
    }
    window.addEventListener(
        "scroll",
        () => registro.eventos.push({ t: ahora(), ...estado() }),
        { passive: true },
    );
}

/**
 * EL TOPE DE UNA LLAMADA SUAVE (F20-C1, revision). Una llamada suave no deja
 * el documento en su `y` inmediato, asi que su recorrido no se puede comparar
 * con el estado justo despues de llamarla. Pero una exencion SIN limite
 * dejaba que una sola llamada suave --y el setter de `scrollTop` hereda el
 * `scroll-behavior: smooth` de `<html>` en este sitio-- eximiera todo lo que
 * viniera detras. Por eso la exencion se acota por DESTINO y por TIEMPO: solo
 * cubre los eventos que avanzan hacia el destino pedido, hasta llegar a el con
 * la tolerancia, y como mucho durante estos milisegundos. Un desplazamiento
 * suave de Chrome de toda la portada tarda menos de un segundo; 1.500 ms deja
 * margen bajo carga sin convertir la llamada en un salvoconducto.
 */
export const TOPE_DE_SCROLL_SUAVE_MS = 1500;

/**
 * Sin destino calculable (un `scrollIntoView` que no alinea al inicio, un
 * `focus`), la llamada suave solo exime hasta el PRIMER ASENTAMIENTO: el primer
 * hueco entre dos eventos `scroll` de al menos estos milisegundos. Un
 * desplazamiento suave emite un evento por frame (unos 16 ms); 200 ms sin
 * eventos es que ya paro.
 */
export const ASENTAMIENTO_DE_SCROLL_SUAVE_MS = 200;

/**
 * EL VEREDICTO DEL TESTIGO: puro y tabulado en el gate.
 *
 * Solo se juzga lo que ocurre DESPUES de la primera llamada JS (la correccion
 * del sitio): antes, en `"auto"`, la nativa restituye por diseno y en
 * `"manual"` el documento esta en 0. Cada evento se compara con el estado que
 * dejo la ULTIMA llamada anterior a el, y es ROJO si `scrollY` se aleja mas de
 * `tolerancia` sin otra llamada que lo explique. DOS exenciones, cada una con
 * su porque: (1) la compensacion del scroll anchoring mueve `scrollY` sin mover
 * el contenido, asi que si la seccion bajo el centro es la misma y su `top`
 * cabe en la tolerancia no hay salto visible; (2) una llamada suave explica el
 * recorrido HACIA SU DESTINO, y solo hasta llegar a el o hasta
 * `TOPE_DE_SCROLL_SUAVE_MS` (docblock de la constante).
 *
 * `exigeLlamada` es la guarda de vacuidad del modo `"manual"`: ahi la
 * correccion TIENE que ser una llamada JS; sin ninguna, o el testigo no se
 * instalo o el sitio no corrigio, y ninguna de las dos cosas es un verde.
 *
 * `fin` (`{ t, y }`, la lectura del registro) dice hasta cuando se miro: sin
 * el, una llamada suave que se queda a medias sin mas eventos seria invisible.
 * `explicados` cuenta por que se admitio cada evento, para que un verde se
 * pueda leer (una llamada suave que CUADRA con su destino, no una exencion).
 */
export function evaluaTestigoDeScroll({
    llamadas,
    eventos,
    fin,
    tolerancia,
    exigeLlamada,
}) {
    if (!Array.isArray(llamadas) || !Array.isArray(eventos))
        return {
            cumple: false,
            sinExplicar: [],
            motivo: "el testigo de scroll no se instalo en el documento recargado: sin registro la sonda quedaria vacua",
        };
    if (llamadas.length === 0)
        return exigeLlamada
            ? {
                  cumple: false,
                  sinExplicar: [],
                  motivo: `en modo manual la correccion del sitio tiene que ser una llamada JS y el testigo no registro ninguna (${eventos.length} eventos scroll): la sonda quedaria vacua`,
              }
            : { cumple: true, sinExplicar: [], motivo: null };
    const ordenadas = [...llamadas].sort((a, b) => a.t - b.t);
    const porTiempo = [...eventos].sort((a, b) => a.t - b.t);
    const sinExplicar = [];
    const explicados = {
        inmediata: 0,
        anclaje: 0,
        haciaDestino: 0,
        llegada: 0,
        hastaAsentar: 0,
    };
    const falla = (e, ref, desde, razon) =>
        sinExplicar.push({
            t: e.t,
            y: e.y,
            desde,
            tipo: ref.tipo,
            tLlamada: ref.t,
            razon,
        });
    /* Un evento contra una base quieta: la `y` en tolerancia o el ancla
       quieta (misma seccion bajo el centro, su `top` en tolerancia). */
    const juzga = (e, base, ref) => {
        if (Math.abs(e.y - base.y) <= tolerancia) {
            explicados.inmediata += 1;
            return;
        }
        const anclaQuieta =
            base.id !== null &&
            base.id !== undefined &&
            e.id === base.id &&
            base.top !== null &&
            base.top !== undefined &&
            e.top !== null &&
            e.top !== undefined &&
            Math.abs(e.top - base.top) <= tolerancia;
        if (anclaQuieta) {
            explicados.anclaje += 1;
            return;
        }
        falla(e, ref, base.y, null);
    };
    for (const [i, ref] of ordenadas.entries()) {
        const hasta = i + 1 < ordenadas.length ? ordenadas[i + 1].t : Infinity;
        const tramo = porTiempo.filter((e) => e.t >= ref.t && e.t < hasta);
        if (!ref.suave) {
            const base = { y: ref.y, id: ref.id, top: ref.top };
            for (const e of tramo) juzga(e, base, ref);
            continue;
        }
        /* Llamada suave: exime el avance hacia su destino hasta llegar (o, sin
           destino calculable, hasta el primer asentamiento), y nunca mas alla
           del tope. Desde ahi la base es quieta, como la de una inmediata. */
        const destino =
            typeof ref.destino === "number" && Number.isFinite(ref.destino)
                ? ref.destino
                : null;
        const tope = ref.t + TOPE_DE_SCROLL_SUAVE_MS;
        let base = null;
        let vencida = false;
        let mejor = destino === null ? null : Math.abs(ref.y - destino);
        let previo = { t: ref.t, y: ref.y, id: ref.id, top: ref.top };
        for (const e of tramo) {
            if (base !== null) {
                juzga(e, base, ref);
                continue;
            }
            if (e.t > tope) {
                vencida = true;
                falla(
                    e,
                    ref,
                    destino ?? previo.y,
                    destino === null
                        ? `la llamada suave sin destino calculable sigue moviendo el scroll pasado el tope de ${TOPE_DE_SCROLL_SUAVE_MS} ms (y=${e.y})`
                        : `la llamada suave pedia y=${destino} y pasado el tope de ${TOPE_DE_SCROLL_SUAVE_MS} ms no habia llegado (y=${e.y})`,
                );
                base = { y: e.y, id: e.id, top: e.top };
                continue;
            }
            if (destino !== null) {
                const dist = Math.abs(e.y - destino);
                if (dist <= tolerancia) {
                    explicados.llegada += 1;
                    base = { y: e.y, id: e.id, top: e.top };
                } else if (dist > mejor + tolerancia) {
                    falla(
                        e,
                        ref,
                        destino,
                        `se aleja del destino de la llamada suave (y=${destino}): de ${mejor} px a ${dist} px`,
                    );
                } else {
                    mejor = Math.min(mejor, dist);
                    explicados.haciaDestino += 1;
                }
                previo = e;
                continue;
            }
            if (e.t - previo.t < ASENTAMIENTO_DE_SCROLL_SUAVE_MS) {
                explicados.hastaAsentar += 1;
                previo = e;
                continue;
            }
            base = { y: previo.y, id: previo.id, top: previo.top };
            juzga(e, base, ref);
        }
        /* Se queda a medias: ningun evento la lleva al destino y la mirada
           (siguiente llamada o `fin`) va mas alla del tope. */
        const finDelTramo =
            hasta !== Infinity
                ? hasta
                : (fin?.t ??
                  (tramo.length ? tramo[tramo.length - 1].t : ref.t));
        if (
            destino !== null &&
            base === null &&
            !vencida &&
            finDelTramo > tope
        ) {
            const yFinal =
                hasta === Infinity && typeof fin?.y === "number"
                    ? fin.y
                    : previo.y;
            falla(
                { t: finDelTramo, y: yFinal },
                ref,
                destino,
                `la llamada suave pedia y=${destino} y se queda a medias en y=${yFinal} pasado el tope de ${TOPE_DE_SCROLL_SUAVE_MS} ms`,
            );
        }
    }
    if (sinExplicar.length === 0)
        return { cumple: true, sinExplicar, explicados, motivo: null };
    const primero = sinExplicar[0];
    const detalle = primero.razon
        ? `${primero.razon} (${primero.tipo} a t=${primero.tLlamada} ms)`
        : `cuando la ultima llamada (${primero.tipo} a t=${primero.tLlamada} ms) lo dejo en y=${primero.desde} (${primero.y - primero.desde} px, tolerancia ${tolerancia})`;
    return {
        cumple: false,
        sinExplicar,
        explicados,
        motivo: `el scroll se mueve sin ninguna llamada JS que lo explique: ${sinExplicar.length} evento(s), el primero a t=${primero.t} ms en y=${primero.y} ${detalle}`,
    };
}

/**
 * FAMILIA TREINTA Y TRES, `atras-y-adelante-restituyen-la-lectura` (F20-C1,
 * candado d del diseno). La familia 26 afirma que el Atras restituye el
 * DOCUMENTO de la URL y la 27 solo anota el `pathname` del Atras: ninguna mira
 * `scrollY`. Con `"manual"` en la portada oscura el Atras/Adelante deja de ser
 * de la nativa y pasa a `useHistoryScrollRestoration` (fragmento, legal) y a
 * `useReloadLanding` (entre documentos): un restituidor apagado no lo veria
 * nadie. Desde el 2026-09-11 (P7-2) el claro tambien va en `"manual"`: ya no
 * es un control de la nativa, y la familia lo exige igual en los dos temas.
 *
 * MATRIZ: 1440x900, los dos temas (los pone la corrida), `/` y `/en`, tres
 * rutas por portada, cada una en su contexto limpio y leyendo a
 * `PROFUNDIDAD_DE_LECTURA_PX`:
 *   - `fragmento` (R3): clic REAL en el enlace de Contacto de la cabecera,
 *     Atras (vuelve a la profundidad), Adelante (vuelve a `#contact` en la
 *     `y` en que aterrizo el clic) y un segundo Atras (otra vez a la
 *     profundidad).
 *   - `legal` (R4): el enlace de privacidad del pie (navegacion blanda de
 *     `next/link`), Atras, Adelante (la legal en su `y`) y segundo Atras,
 *     con las mismas exigencias.
 *   - `idioma` (R2): el enlace `hreflang` del otro idioma (navegacion de
 *     documento, raices distintas), Atras (vuelve a la profundidad) y, tras
 *     la recarga de la clave, Adelante: tiene que aterrizar en la otra
 *     portada (su `y` se anota, no se exige).
 * Y la CLAVE: `navigation.currentEntry.key` identica antes de salir y despues
 * del Atras de `idioma`, y antes y despues de una recarga. Es la identidad con
 * la que el restituidor anota cada entrada; si cambiara entre cargas de
 * documento, su registro no se encontraria nunca (hasta hoy solo estaba
 * simulada en jsdom).
 *
 * Los enlaces del pie y del idioma se pulsan con `el.click()` y no con el clic
 * de Playwright: este desplaza el enlace a la vista antes de pulsar, y la
 * profundidad que el Atras tiene que restituir dejaria de ser la leida.
 */
export const PROFUNDIDAD_DE_LECTURA_PX = 2400;

/** Las tres rutas que la familia 33 recorre en cada portada y tema. */
export const RUTAS_DE_ATRAS_Y_ADELANTE = ["fragmento", "legal", "idioma"];

/**
 * Las rutas en las que la familia 33 exige, ademas del Adelante, su `y` y un
 * SEGUNDO Atras a la profundidad leida (R3 y R4, las del restituidor). En
 * `idioma` (R2) el Adelante solo tiene que aterrizar en la otra portada.
 */
export const RUTAS_CON_SEGUNDO_ATRAS = ["fragmento", "legal"];

/** Las dos identidades de entrada que la familia 33 exige estables. */
export const CLAVES_DE_ENTRADA_ESTABLES = ["idioma", "recarga"];

/**
 * EL VEREDICTO DE LA FAMILIA 33: puro y tabulado en el gate. Cada ruta tiene
 * que (1) haberse ejercido (enlace encontrado, salida real: el salto movio el
 * scroll o cambio de documento), (2) partir de una lectura lejos de la cima
 * --volver a 0 no distingue restituir de no hacer nada--, (3) volver al mismo
 * `pathname` y (4) a la profundidad leida con `tolerancia`. Cada clave tiene
 * que existir y no cambiar.
 */
export function evaluaAtrasYAdelante({
    theme,
    surface,
    rutas,
    claves,
    tolerancia,
}) {
    const motivos = [];
    const donde = `${surface} ${theme}`;
    const vistas = new Set((rutas ?? []).map((r) => r.ruta));
    for (const ruta of RUTAS_DE_ATRAS_Y_ADELANTE)
        if (!vistas.has(ruta))
            motivos.push(
                `${ruta} (${donde}): la ruta no se midio y una ruta sin medir no es un verde`,
            );
    for (const r of rutas ?? []) {
        const id = `${r.ruta} (${donde})`;
        if (!r.enlace) {
            motivos.push(
                `${id}: no se encontro el enlace del gesto; sin gesto el Atras no se ejercio`,
            );
            continue;
        }
        if (r.antes.y < 2 * tolerancia)
            motivos.push(
                `${id}: la lectura de partida esta en y=${r.antes.y}, a menos de ${2 * tolerancia} px de la cima: volver ahi no distingue restituir de no hacer nada`,
            );
        const salio =
            r.salida.pathname !== r.antes.pathname ||
            Math.abs(r.salida.y - r.antes.y) > tolerancia;
        if (!salio)
            motivos.push(
                `${id}: el gesto no salio de la lectura (sigue en ${r.salida.pathname} y=${r.salida.y}): el Atras no probaria nada`,
            );
        /* ADELANTE aterriza donde estaba la entrada de destino: su documento
           (y su fragmento), y --salvo en `idioma`, donde basta la otra
           portada-- su `y`. Y en fragmento y legal, un SEGUNDO Atras vuelve
           otra vez a la profundidad leida. */
        if (!r.adelante)
            motivos.push(
                `${id}: el Adelante no se midio y un Adelante sin medir no es un verde`,
            );
        else {
            const destino = `${r.salida.pathname}${r.salida.hash ?? ""}`;
            const llega = `${r.adelante.pathname}${r.adelante.hash ?? ""}`;
            if (llega !== destino)
                motivos.push(
                    `${id}: el Adelante deja ${llega} y la entrada de destino era ${destino}`,
                );
            else if (
                RUTAS_CON_SEGUNDO_ATRAS.includes(r.ruta) &&
                Math.abs(r.adelante.y - r.salida.y) > tolerancia
            )
                motivos.push(
                    `${id}: el Adelante vuelve a ${llega} en y=${r.adelante.y} y la entrada de destino estaba en y=${r.salida.y} (deriva ${r.adelante.y - r.salida.y} px, tolerancia ${tolerancia} px; modo ${r.adelante.modo})`,
                );
        }
        if (RUTAS_CON_SEGUNDO_ATRAS.includes(r.ruta)) {
            const s = r.segundoAtras;
            if (!s)
                motivos.push(
                    `${id}: el segundo Atras no se midio y un segundo Atras sin medir no es un verde`,
                );
            else if (s.pathname !== r.antes.pathname)
                motivos.push(
                    `${id}: el segundo Atras deja ${s.pathname} y la lectura estaba en ${r.antes.pathname}`,
                );
            else if (Math.abs(s.y - r.antes.y) > tolerancia)
                motivos.push(
                    `${id}: se leia en y=${r.antes.y} y el segundo Atras vuelve a y=${s.y} (deriva ${s.y - r.antes.y} px, tolerancia ${tolerancia} px; modo ${s.modo})`,
                );
        }
        if (r.atras.pathname !== r.antes.pathname) {
            motivos.push(
                `${id}: el Atras deja ${r.atras.pathname} y la lectura estaba en ${r.antes.pathname}`,
            );
            continue;
        }
        const deriva = r.atras.y - r.antes.y;
        if (Math.abs(deriva) > tolerancia)
            motivos.push(
                `${id}: se leia en y=${r.antes.y} y el Atras vuelve a y=${r.atras.y} (deriva ${deriva} px, tolerancia ${tolerancia} px; modo ${r.atras.modo})`,
            );
    }
    for (const nombre of CLAVES_DE_ENTRADA_ESTABLES) {
        const c = claves?.[nombre];
        if (!c || typeof c.antes !== "string" || c.antes === "") {
            motivos.push(
                `clave de entrada en ${nombre} (${donde}): navigation.currentEntry.key no se pudo leer (${JSON.stringify(c?.antes ?? null)}): sin clave la identidad no se mide`,
            );
            continue;
        }
        if (c.despues !== c.antes)
            motivos.push(
                `clave de entrada en ${nombre} (${donde}): navigation.currentEntry.key cambia de ${c.antes} a ${JSON.stringify(c.despues)}`,
            );
    }
    return { cumple: motivos.length === 0, motivos };
}

/** Lee el estado de la entrada activa: scroll, ruta, modo y clave. */
function leeEntradaActiva() {
    return {
        y: Math.round(window.scrollY),
        pathname: location.pathname,
        hash: location.hash,
        modo: history.scrollRestoration,
        clave: window.navigation?.currentEntry?.key ?? null,
    };
}

/** Espera a que `scrollY` repita valor en dos lecturas separadas 400 ms. */
async function esperaScrollQuieto(page) {
    await page
        .waitForFunction(
            () => {
                const y = Math.round(window.scrollY);
                if (window.__vueltaQuieta === y) return true;
                window.__vueltaQuieta = y;
                return false;
            },
            null,
            { polling: 400, timeout: 8000 },
        )
        .catch(() => {
            /* Un scroll que no para se lee igualmente: la cifra lo dira. */
        });
    await page.evaluate(() => {
        delete window.__vueltaQuieta;
    });
}

/** Mide las tres rutas y las dos claves de la familia 33 en una portada. */
export async function mideAtrasYAdelante(browser, base, theme, surface) {
    const url = `${base}${surface.path}`;
    const legal = LEGAL_DOCS[0][surface.locale];
    const otro = surface.locale === "es" ? EN_PREFIX : "/";
    const hreflangDelOtro = surface.locale === "es" ? "en" : "es";
    const enRuta = (pathname) => (u) => new URL(u).pathname === pathname;
    const rutas = [];
    const claves = {};

    const abre = async () => {
        const ctx = await nuevoContexto(browser, theme);
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(2200);
        await page.evaluate(
            (y) => window.scrollTo({ top: y, behavior: "instant" }),
            PROFUNDIDAD_DE_LECTURA_PX,
        );
        /* Mas de un frame: el restituidor anota la entrada en el rAF que sigue
           al evento `scroll`. */
        await page.waitForTimeout(900);
        return { ctx, page };
    };
    const pulsaPorScript = (page, selector) =>
        page.evaluate((sel) => {
            const a = document.querySelector(sel);
            if (!a) return false;
            a.click();
            return true;
        }, selector);

    /* R3: fragmento de la cabecera y Atras. */
    {
        const { ctx, page } = await abre();
        try {
            const antes = await page.evaluate(leeEntradaActiva);
            let enlace = null;
            for (const c of await page.$$('header a[href$="#contact"]'))
                if (await c.boundingBox()) {
                    enlace = c;
                    break;
                }
            if (!enlace) rutas.push({ ruta: "fragmento", enlace: false });
            else {
                await enlace.click();
                await page.waitForTimeout(1200);
                await esperaScrollQuieto(page);
                const salida = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.back());
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const atras = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.forward());
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const adelante = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.back());
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const segundoAtras = await page.evaluate(leeEntradaActiva);
                rutas.push({
                    ruta: "fragmento",
                    enlace: true,
                    antes,
                    salida,
                    atras,
                    adelante,
                    segundoAtras,
                });
            }
        } finally {
            await ctx.close();
        }
    }

    /* R4: legal del pie (blanda) y Atras. */
    {
        const { ctx, page } = await abre();
        try {
            const antes = await page.evaluate(leeEntradaActiva);
            const pulsado = await pulsaPorScript(
                page,
                `footer a[href="${legal}"]`,
            );
            if (!pulsado) rutas.push({ ruta: "legal", enlace: false });
            else {
                await page.waitForURL(enRuta(legal), { timeout: 10000 });
                await page.waitForTimeout(1200);
                const salida = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.back());
                await page.waitForURL(enRuta(surface.path), {
                    timeout: 10000,
                });
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const atras = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.forward());
                await page.waitForURL(enRuta(legal), { timeout: 10000 });
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const adelante = await page.evaluate(leeEntradaActiva);
                await page.evaluate(() => history.back());
                await page.waitForURL(enRuta(surface.path), {
                    timeout: 10000,
                });
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                const segundoAtras = await page.evaluate(leeEntradaActiva);
                rutas.push({
                    ruta: "legal",
                    enlace: true,
                    antes,
                    salida,
                    atras,
                    adelante,
                    segundoAtras,
                });
            }
        } finally {
            await ctx.close();
        }
    }

    /* R2: el otro idioma (documento nuevo), Atras, y la recarga. */
    {
        const { ctx, page } = await abre();
        try {
            const antes = await page.evaluate(leeEntradaActiva);
            const pulsado = await pulsaPorScript(
                page,
                `a[hreflang="${hreflangDelOtro}"]`,
            );
            if (!pulsado) rutas.push({ ruta: "idioma", enlace: false });
            else {
                await page.waitForURL(enRuta(otro), {
                    timeout: 15000,
                    waitUntil: "load",
                });
                await page.waitForTimeout(1500);
                const salida = await page.evaluate(leeEntradaActiva);
                await page.goBack({ waitUntil: "load" });
                await esperaAlturaEstable(page, { tope: 6000 });
                await esperaScrollQuieto(page);
                const atras = await page.evaluate(leeEntradaActiva);
                rutas.push({
                    ruta: "idioma",
                    enlace: true,
                    antes,
                    salida,
                    atras,
                });
                claves.idioma = { antes: antes.clave, despues: atras.clave };
                await page.reload({ waitUntil: "networkidle" });
                await page.waitForTimeout(800);
                const recargada = await page.evaluate(leeEntradaActiva);
                claves.recarga = {
                    antes: atras.clave,
                    despues: recargada.clave,
                };
                /* Adelante a la otra portada (documento nuevo otra vez). */
                await page.goForward({ waitUntil: "load" });
                await esperaAlturaEstable(page, { tope: 6000 });
                await esperaScrollQuieto(page);
                const ultima = rutas[rutas.length - 1];
                ultima.adelante = await page.evaluate(leeEntradaActiva);
            }
        } finally {
            await ctx.close();
        }
    }

    return {
        theme,
        surface: surface.nombre,
        rutas,
        claves,
        tolerancia: DERIVA_MAXIMA_DE_RECARGA_PX,
    };
}

/**
 * FAMILIA TREINTA Y CUATRO, `adelante-a-la-portada-vuelve-a-su-lectura` (P7-1B del
 * objetivo >=98; C1 de la pre-critica P6). La 33 recorre portada -> legal ->
 * Atras -> Adelante, y su Adelante llega a la LEGAL. Nadie recorria el camino
 * inverso, legal -> logo -> Atras -> Adelante, que termina en la PORTADA.
 * Medido el 2026-09-11 en oscuro: la portada a la que se llega por el logo nace
 * en "auto", su unico scroll (a y=0) se procesa antes de que el interruptor la
 * pase a "manual" y el restituidor no la anotaba; al volver con Adelante el
 * lector heredaba la posicion de la legal (1.500 px durante 5 s). En claro,
 * hasta P7-2, mandaba la nativa y volvia a 0 antes de 700 ms: era el CONTROL;
 * desde P7-2B' el claro tambien va en "manual" y se le exige lo mismo.
 *
 * MATRIZ: portadas `/` y `/en` (su legal: `/privacidad` y `/en/privacy`), los
 * dos temas (los pone la corrida), 1440x900 y 390x844, sin `reduce`. En cada
 * una, en su contexto limpio: la legal leida a `PROFUNDIDAD_EN_LA_LEGAL_PX`,
 * clic REAL en el logo de la cabecera, Atras, Adelante, y la portada leida a
 * los instantes de `INSTANTES_TRAS_ADELANTE_MS`. Se exige ademas
 * `history.scrollRestoration === "manual"` en la portada, EN LOS DOS TEMAS
 * desde P7-2B' (2026-09-12; hasta entonces solo en oscuro, porque el claro
 * era el control de la nativa): la familia no se aprueba devolviendo la
 * portada a la restitucion nativa. Medido antes del arreglo de
 * `ThemeProvider`: en claro la portada alcanzada por el logo salia
 * `logo@0[auto]` en `/` y `/en`, a 1440 y a 390, y la familia pasaba gracias
 * a la nativa.
 */
export const PROFUNDIDAD_EN_LA_LEGAL_PX = 1500;

/** Los dos viewports de la familia 34. */
export const VIEWPORTS_DE_ADELANTE = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

/** Los instantes (ms tras el Adelante) en que la familia 34 lee la portada. */
export const INSTANTES_TRAS_ADELANTE_MS = [700, 3000];

/**
 * EL VEREDICTO DE LA FAMILIA 34: puro y tabulado en el gate. Cada viewport
 * tiene que (1) haberse medido, (2) partir de una legal leida lejos de la cima
 * --heredar una posicion cercana a 0 no se distinguiria de volver--, (3) llegar
 * a la portada en la cima con el logo, (4) volver con Atras a la legal leida y
 * (5) volver con Adelante a la portada en la posicion en que se dejo, en cada
 * instante leido, y (6) la portada en "manual" en los dos temas.
 */
export function evaluaAdelanteALaPortada({
    theme,
    surface,
    medidas,
    tolerancia,
}) {
    const motivos = [];
    const donde = `${surface} ${theme}`;
    const vistos = new Set((medidas ?? []).map((m) => m.viewport));
    for (const v of VIEWPORTS_DE_ADELANTE) {
        const id = `${v.width}x${v.height}`;
        if (!vistos.has(id))
            motivos.push(
                `${id} (${donde}): el viewport no se midio y un viewport sin medir no es un verde`,
            );
    }
    for (const m of medidas ?? []) {
        const id = `${m.viewport} (${donde})`;
        if (!m.logo) {
            motivos.push(
                `${id}: no se encontro el logo de la cabecera; sin gesto el camino no se ejercio`,
            );
            continue;
        }
        if (m.legal.y < 2 * tolerancia)
            motivos.push(
                `${id}: la legal se leia en y=${m.legal.y}, a menos de ${2 * tolerancia} px de la cima: heredar esa posicion no se distinguiria de volver a la portada`,
            );
        if (m.portada.pathname !== m.rutaPortada || m.portada.y > tolerancia)
            motivos.push(
                `${id}: el logo deja ${m.portada.pathname} en y=${m.portada.y} y se esperaba ${m.rutaPortada} en la cima`,
            );
        if (
            m.atras.pathname !== m.legal.pathname ||
            Math.abs(m.atras.y - m.legal.y) > tolerancia
        )
            motivos.push(
                `${id}: el Atras deja ${m.atras.pathname} en y=${m.atras.y} y la legal se leia en ${m.legal.pathname} y=${m.legal.y} (tolerancia ${tolerancia} px)`,
            );
        const lecturas = m.adelante ?? [];
        for (const ms of INSTANTES_TRAS_ADELANTE_MS) {
            const l = lecturas.find((x) => x.ms === ms);
            if (!l) {
                motivos.push(
                    `${id}: la portada no se leyo a los ${ms} ms del Adelante`,
                );
                continue;
            }
            if (l.pathname !== m.rutaPortada)
                motivos.push(
                    `${id}: a los ${ms} ms el Adelante deja ${l.pathname} y la entrada de destino era ${m.rutaPortada}`,
                );
            else if (Math.abs(l.y - m.portada.y) > tolerancia)
                motivos.push(
                    `${id}: a los ${ms} ms del Adelante la portada esta en y=${l.y} y se dejo en y=${m.portada.y} (la legal se leia en y=${m.legal.y}; tolerancia ${tolerancia} px; modo ${l.modo})`,
                );
        }
        const ultima = lecturas[lecturas.length - 1];
        if (ultima && ultima.modo !== "manual")
            motivos.push(
                `${id}: la portada tiene que estar en scrollRestoration "manual" y esta en ${JSON.stringify(ultima.modo)}: devolverla a la nativa no es el arreglo`,
            );
    }
    return { cumple: motivos.length === 0, motivos };
}

/** Mide la familia 34 en una portada: su legal, el logo, Atras y Adelante. */
export async function mideAdelanteALaPortada(browser, base, theme, surface) {
    const legal = LEGAL_DOCS[0][surface.locale];
    const enRuta = (pathname) => (u) => new URL(u).pathname === pathname;
    const medidas = [];
    for (const v of VIEWPORTS_DE_ADELANTE) {
        const viewport = `${v.width}x${v.height}`;
        const ctx = await nuevoContexto(browser, theme, {
            viewport: v,
            reducedMotion: "no-preference",
        });
        try {
            const page = await ctx.newPage();
            await page.goto(`${base}${legal}`, { waitUntil: "networkidle" });
            await page.waitForTimeout(1500);
            await page.evaluate(
                (y) => window.scrollTo({ top: y, behavior: "instant" }),
                PROFUNDIDAD_EN_LA_LEGAL_PX,
            );
            await page.waitForTimeout(900);
            const leida = await page.evaluate(leeEntradaActiva);
            let logo = null;
            for (const c of await page.$$(`header a[href="${surface.path}"]`))
                if (await c.boundingBox()) {
                    logo = c;
                    break;
                }
            if (!logo) {
                medidas.push({ viewport, logo: false });
                continue;
            }
            await logo.click();
            await page.waitForURL(enRuta(surface.path), { timeout: 10000 });
            await page.waitForTimeout(1500);
            await esperaScrollQuieto(page);
            const portada = await page.evaluate(leeEntradaActiva);
            await page.evaluate(() => history.back());
            await page.waitForURL(enRuta(legal), { timeout: 10000 });
            await page.waitForTimeout(1500);
            await esperaScrollQuieto(page);
            const atras = await page.evaluate(leeEntradaActiva);
            await page.evaluate(() => history.forward());
            await page.waitForURL(enRuta(surface.path), { timeout: 10000 });
            const t0 = Date.now();
            const adelante = [];
            for (const ms of INSTANTES_TRAS_ADELANTE_MS) {
                const falta = ms - (Date.now() - t0);
                if (falta > 0) await page.waitForTimeout(falta);
                adelante.push({
                    ms,
                    ...(await page.evaluate(leeEntradaActiva)),
                });
            }
            medidas.push({
                viewport,
                logo: true,
                rutaPortada: surface.path,
                legal: leida,
                portada,
                atras,
                adelante,
            });
        } finally {
            await ctx.close();
        }
    }
    return {
        theme,
        surface: surface.nombre,
        medidas,
        tolerancia: DERIVA_MAXIMA_DE_RECARGA_PX,
    };
}

/**
 * FAMILIA TREINTA Y CINCO, `atras-con-fragmento-vuelve-a-la-lectura` (P7-2B del
 * objetivo >=98; C2 de la pre-critica P6). La 33 recorre portada -> legal ->
 * Atras desde una lectura SIN fragmento en la URL. Nadie recorria la cadena en
 * la que la entrada de la portada lleva `#contact`: clic en Contacto, rueda,
 * enlace del pie a la legal y Atras. Medido el 2026-09-11 sobre `4bc3b15`: al
 * volver, la portada se monta de nuevo y `useFragmentLanding` leia `#contact`
 * como si fuera una carga; en oscuro pisaba la restitucion (10.108 -> 9.046) y
 * en claro, en "auto", la nativa llevaba al fragmento (5.688 -> 4.438).
 *
 * MATRIZ: portadas `/` y `/en` (su legal: `/privacidad` y `/en/privacy`), los
 * dos temas (los pone la corrida), 1440x900 y 390x844, sin `reduce`. En cada
 * viewport, en su contexto limpio:
 *   - la cadena: clic REAL en Contacto (en la cabecera; a 390, dentro de la
 *     hoja movil), `PASOS_DE_RUEDA_DESDE_EL_ANCLA` pasos de rueda, el enlace de
 *     la legal del pie (`el.click()`, como en la 33) y Atras; la portada se lee
 *     a los instantes de `INSTANTES_TRAS_ATRAS_MS`;
 *   - control del clic interno: ese clic en Contacto aterriza en el ancla;
 *   - control del enlace nuevo: despues de esas lecturas, Adelante a la legal
 *     y su enlace a `#contact` (una llegada NUEVA tras un recorrido) aterriza
 *     en el ancla;
 *   - control de la carga en frio: `/#contact` en una pagina nueva aterriza en
 *     el ancla.
 * "En el ancla" es `#contact` a su `scroll-margin-top` del borde superior, con
 * la tolerancia de la familia. La lectura tiene que quedar a 2 x tolerancia o
 * mas del ancla, para que volver al ancla no se pueda confundir con restituir.
 * Y la portada, en "manual" en los dos temas (P7-2, opcion 1 del dueno).
 */
export const VIEWPORTS_DE_ATRAS_CON_FRAGMENTO = [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
];

/** Los instantes (ms tras el Atras) en que la familia 35 lee la portada. */
export const INSTANTES_TRAS_ATRAS_MS = [400, 1500, 4000];

/** Pasos de rueda de 100 px con los que el lector se aleja del ancla. */
export const PASOS_DE_RUEDA_DESDE_EL_ANCLA = 12;

/**
 * EL VEREDICTO DE LA FAMILIA 35: puro y tabulado en el gate. Cada viewport
 * tiene que haberse medido con su gesto; el clic interno, el enlace nuevo y la
 * carga en frio tienen que aterrizar en el ancla; la lectura tiene que quedar
 * lejos del ancla; y el Atras tiene que devolver la portada con fragmento a la
 * lectura en cada instante, sin estar en el ancla, y en "manual".
 */
export function evaluaAtrasConFragmento({
    theme,
    surface,
    medidas,
    tolerancia,
}) {
    const motivos = [];
    const donde = `${surface} ${theme}`;
    const enElAncla = (l) =>
        !!l &&
        typeof l.contactTop === "number" &&
        typeof l.margen === "number" &&
        Math.abs(l.contactTop - l.margen) <= tolerancia;
    const vistos = new Set((medidas ?? []).map((m) => m.viewport));
    for (const v of VIEWPORTS_DE_ATRAS_CON_FRAGMENTO) {
        const id = `${v.width}x${v.height}`;
        if (!vistos.has(id))
            motivos.push(
                `${id} (${donde}): el viewport no se midio y un viewport sin medir no es un verde`,
            );
    }
    for (const m of medidas ?? []) {
        const id = `${m.viewport} (${donde})`;
        if (!m.enlace) {
            motivos.push(
                `${id}: no se encontro el enlace de Contacto de la cabecera; sin gesto la cadena no se ejercio`,
            );
            continue;
        }
        const destino = `${m.rutaPortada}#contact`;
        if (m.salida.hash !== "#contact" || !enElAncla(m.salida))
            motivos.push(
                `${id}: control del clic interno: el clic en Contacto deja ${m.salida.pathname}${m.salida.hash} con #contact a top=${m.salida.contactTop} (margen ${m.salida.margen}); tenia que aterrizar en el ancla`,
            );
        const distancia = Math.abs(m.lectura.y - m.salida.y);
        if (distancia < 2 * tolerancia)
            motivos.push(
                `${id}: la lectura (y=${m.lectura.y}) esta a ${distancia} px del ancla (y=${m.salida.y}), a menos de ${2 * tolerancia} px: volver al ancla no se distinguiria de restituir`,
            );
        if (!m.legal || m.legal.pathname !== m.rutaLegal) {
            motivos.push(
                `${id}: el enlace del pie no llevo a ${m.rutaLegal} (${m.legal ? m.legal.pathname : "sin enlace"}): sin salida el Atras no se ejercio`,
            );
            continue;
        }
        const lecturas = m.atras ?? [];
        for (const ms of INSTANTES_TRAS_ATRAS_MS) {
            const l = lecturas.find((x) => x.ms === ms);
            if (!l) {
                motivos.push(
                    `${id}: la portada no se leyo a los ${ms} ms del Atras`,
                );
                continue;
            }
            const llega = `${l.pathname}${l.hash}`;
            if (llega !== destino)
                motivos.push(
                    `${id}: a los ${ms} ms el Atras deja ${llega} y la entrada de destino era ${destino}`,
                );
            else if (Math.abs(l.y - m.lectura.y) > tolerancia)
                motivos.push(
                    `${id}: a los ${ms} ms del Atras la portada esta en y=${l.y} y se leia en y=${m.lectura.y} (deriva ${l.y - m.lectura.y} px, tolerancia ${tolerancia} px; #contact a top=${l.contactTop}; modo ${l.modo})`,
                );
            else if (enElAncla(l))
                motivos.push(
                    `${id}: a los ${ms} ms del Atras la portada esta en el ancla (#contact a top=${l.contactTop}): eso es aterrizar, no restituir`,
                );
        }
        const ultima = lecturas[lecturas.length - 1];
        if (ultima && ultima.modo !== "manual")
            motivos.push(
                `${id}: la portada tiene que estar en scrollRestoration "manual" y esta en ${JSON.stringify(ultima.modo)}: devolverla a la nativa no es el arreglo`,
            );
        if (!m.nuevoEnlace)
            motivos.push(
                `${id}: control del enlace nuevo: no se midio y un control sin medir no es un verde`,
            );
        else if (
            `${m.nuevoEnlace.pathname}${m.nuevoEnlace.hash}` !== destino ||
            !enElAncla(m.nuevoEnlace)
        )
            motivos.push(
                `${id}: control del enlace nuevo: tras el recorrido, el enlace a #contact desde la legal deja ${m.nuevoEnlace.pathname}${m.nuevoEnlace.hash} con #contact a top=${m.nuevoEnlace.contactTop} (margen ${m.nuevoEnlace.margen}); tenia que aterrizar en el ancla`,
            );
        if (!m.fria)
            motivos.push(
                `${id}: control de la carga en frio: no se midio y un control sin medir no es un verde`,
            );
        else if (!enElAncla(m.fria))
            motivos.push(
                `${id}: control de la carga en frio: ${destino} deja #contact a top=${m.fria.contactTop} (margen ${m.fria.margen}); tenia que aterrizar en el ancla`,
            );
    }
    return { cumple: motivos.length === 0, motivos };
}

/**
 * Lee la entrada activa con la posicion de `#contact` y su margen de ancla. El
 * margen es el `scroll-margin-top` de la seccion MAS el `scroll-padding-top`
 * del documento, la misma suma que usa la familia 32: medido sobre `4bc3b15`,
 * el margen de la seccion solo son 64 px y el ancla aterriza a 128.
 */
function leeEntradaConAncla() {
    const c = document.getElementById("contact");
    return {
        y: Math.round(window.scrollY),
        pathname: location.pathname,
        hash: location.hash,
        modo: history.scrollRestoration,
        contactTop: c ? Math.round(c.getBoundingClientRect().top) : null,
        margen: c
            ? Math.round(
                  (parseFloat(getComputedStyle(c).scrollMarginTop) || 0) +
                      (parseFloat(
                          getComputedStyle(document.documentElement)
                              .scrollPaddingTop,
                      ) || 0),
              )
            : null,
    };
}

/**
 * El enlace de Contacto que un visitante pulsaria: el visible de la cabecera o,
 * si la cabecera lo guarda en la hoja movil (390), el de la hoja ya abierta.
 */
async function buscaContactoDeLaCabecera(page) {
    for (const c of await page.$$('header a[href$="#contact"]'))
        if (await c.boundingBox()) return { enlace: c, porHoja: false };
    const hoja = await page.evaluate(() => {
        const b = document.querySelector("[data-nav-sheet-trigger] button");
        if (!b || b.getBoundingClientRect().width === 0) return null;
        return b.getAttribute("aria-controls");
    });
    if (!hoja) return null;
    await page.click("[data-nav-sheet-trigger] button");
    await page.waitForTimeout(600);
    for (const c of await page.$$(`[id="${hoja}"] a[href$="#contact"]`))
        if (await c.boundingBox()) return { enlace: c, porHoja: true };
    return null;
}

/** Mide la familia 35 en una portada: la cadena y sus tres controles. */
export async function mideAtrasConFragmento(browser, base, theme, surface) {
    const legal = LEGAL_DOCS[0][surface.locale];
    const enRuta = (pathname) => (u) => new URL(u).pathname === pathname;
    const medidas = [];
    for (const v of VIEWPORTS_DE_ATRAS_CON_FRAGMENTO) {
        const viewport = `${v.width}x${v.height}`;
        const ctx = await nuevoContexto(browser, theme, {
            viewport: v,
            reducedMotion: "no-preference",
        });
        try {
            const page = await ctx.newPage();
            await page.goto(`${base}${surface.path}`, {
                waitUntil: "networkidle",
            });
            await page.waitForTimeout(2200);
            const contacto = await buscaContactoDeLaCabecera(page);
            if (!contacto) {
                medidas.push({ viewport, enlace: false });
                continue;
            }
            await contacto.enlace.click();
            await page.waitForTimeout(1200);
            await esperaScrollQuieto(page);
            const salida = await page.evaluate(leeEntradaConAncla);
            await page.mouse.move(
                Math.round(v.width / 2),
                Math.round(v.height / 2),
            );
            for (let i = 0; i < PASOS_DE_RUEDA_DESDE_EL_ANCLA; i++) {
                await page.mouse.wheel(0, 100);
                await page.waitForTimeout(60);
            }
            await esperaScrollQuieto(page);
            /* Mas de un frame: el restituidor anota la entrada en el rAF que
               sigue al evento `scroll`. */
            await page.waitForTimeout(900);
            const lectura = await page.evaluate(leeEntradaConAncla);
            const base35 = {
                viewport,
                enlace: true,
                porHoja: contacto.porHoja,
                rutaPortada: surface.path,
                rutaLegal: legal,
                salida,
                lectura,
            };
            const pulsado = await page.evaluate((sel) => {
                const a = document.querySelector(sel);
                if (!a) return false;
                a.click();
                return true;
            }, `footer a[href="${legal}"]`);
            if (!pulsado) {
                medidas.push({ ...base35, legal: null, atras: [] });
                continue;
            }
            await page.waitForURL(enRuta(legal), { timeout: 10000 });
            await page.waitForTimeout(1200);
            const enLegal = await page.evaluate(leeEntradaConAncla);
            await page.evaluate(() => history.back());
            await page.waitForURL(enRuta(surface.path), { timeout: 10000 });
            const t0 = Date.now();
            const atras = [];
            for (const ms of INSTANTES_TRAS_ATRAS_MS) {
                const falta = ms - (Date.now() - t0);
                if (falta > 0) await page.waitForTimeout(falta);
                atras.push({
                    ms,
                    ...(await page.evaluate(leeEntradaConAncla)),
                });
            }
            /* Control del enlace nuevo DESPUES de un recorrido. */
            let nuevoEnlace = null;
            await page.evaluate(() => history.forward());
            await page.waitForURL(enRuta(legal), { timeout: 10000 });
            await page.waitForTimeout(1200);
            const via = await page.evaluate(() => {
                const a =
                    document.querySelector('footer a[href$="#contact"]') ??
                    document.querySelector('header a[href$="#contact"]');
                if (!a) return null;
                a.click();
                return a.closest("footer") ? "pie" : "cabecera";
            });
            if (via) {
                await page.waitForURL(
                    (u) =>
                        new URL(u).pathname === surface.path &&
                        new URL(u).hash === "#contact",
                    { timeout: 15000 },
                );
                await page.waitForTimeout(1500);
                await esperaScrollQuieto(page);
                nuevoEnlace = {
                    via,
                    ...(await page.evaluate(leeEntradaConAncla)),
                };
            }
            /* Control de la carga en frio. */
            const fria = await ctx.newPage();
            await fria.goto(`${base}${surface.path}#contact`, {
                waitUntil: "networkidle",
            });
            await fria.waitForTimeout(2200);
            await esperaScrollQuieto(fria);
            medidas.push({
                ...base35,
                legal: enLegal,
                atras,
                nuevoEnlace,
                fria: await fria.evaluate(leeEntradaConAncla),
            });
        } finally {
            await ctx.close();
        }
    }
    return {
        theme,
        surface: surface.nombre,
        medidas,
        tolerancia: DERIVA_MAXIMA_DE_RECARGA_PX,
    };
}

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

/**
 * EL EJE QUE FALTABA EN LA FAMILIA VEINTIUNA, Y QUE HACIA QUE SU VEREDICTO
 * DEPENDIERA DEL AZAR: EL TIPO DE CONEXION ESTIMADO (frente U7, 2026-09-08).
 *
 * QUE DECIDE. Las figuras claras de la portada llevan `loading="lazy"`, y el
 * cargador perezoso de Chrome solo pide lo que cae dentro de un umbral de
 * DISTANCIA al viewport. Ese umbral no es una constante del navegador: lo fija
 * la CALIDAD DE RED ESTIMADA -- 1.250 px con conexion rapida, 2.500 px cuando
 * baja a 3g, ~8.000 px en 2g. Y la estimacion vive en el proceso NAVEGADOR, no
 * en el contexto: la comparten todos los contextos que ese navegador abra,
 * incluidos los que esta familia estrena para cada densidad.
 *
 * EL DEFECTO DEL INSTRUMENTO, MEDIDO. Sobre el MISMO build (`1f9f880`) y el
 * mismo servidor, la familia daba dos veredictos distintos segun como estuviera
 * la maquina: doce mediciones seguidas en verde con el navegador recien abierto
 * (0 B sueltos, 16 recursos por densidad) y una corrida completa del orquestador
 * en rojo con 188.870 B en `/` y en `/en`. La diferencia no era el sitio: era
 * que la corrida completa --diecisiete contextos por superficie, cinco paginas
 * recargando a la vez-- degrada la estimacion compartida y las mediciones
 * posteriores heredan un umbral mas ancho. Forzando el tipo con
 * `--force-effective-connection-type` sobre el build de entonces, el rojo se
 * reproduce byte a byte y a voluntad: 0 B a 4g, 188.870 B a 3g
 * (`story-pointing-640.webp` + `feature-learning-640.webp`, las dos unicas
 * figuras dentro de 2.500 px) y 447.868 B a DPR 1 / 538.720 B a DPR 2 a 2g.
 *
 * POR QUE EL PEOR CASO Y NO EL MEJOR. Un candado que midiera con conexion rapida
 * saldria verde siempre y seria CIEGO justo para el visitante que mas paga el
 * desperdicio: cuanto peor es la conexion, mas arte pide el navegador por
 * adelantado. Fijar `4G` habria puesto el informe en verde sin arreglar nada, que
 * es el parche que este repo prohibe. `2G` es el umbral mas ancho que Chrome
 * aplica, asi que subsume 3g y 4g: verde aqui es verde en las tres.
 *
 * COMO SE FIJA, y por que la familia estrena NAVEGADOR y no solo contexto: es un
 * argumento de LANZAMIENTO, no una opcion de contexto -- y ademas la estimacion
 * que contamina es del proceso, asi que aislarse de ella exige un proceso propio.
 */
export const CONEXION_ESTIMADA_DEL_ARTE = "2G";

/**
 * EL CANDADO DEL PROPIO CANDADO: una familia no mide bajo una condicion de
 * navegador distinta de la que declara.
 *
 * `declarada` es lo que la familia pidio al lanzar el navegador y `observadas`
 * lo que cada contexto de medida leyo de verdad en `navigator.connection`. Si no
 * coinciden, lo que hay delante no es un veredicto sobre el sitio: es una
 * medicion hecha en otras condiciones, y se declara incumplimiento en vez de
 * publicarse como si fuera comparable.
 *
 * Es la comprobacion que habria ahorrado la caceria del 2026-09-08: durante
 * cuatro frentes el mismo build dio verde o rojo segun la carga de la maquina, y
 * en ningun sitio del informe aparecia la variable que lo decidia.
 *
 * Funcion PURA y tabulada a proposito, como `evaluaRecarga` o `langEsperado`: el
 * gate la ejercita entera sin navegador, incluido su caso rojo.
 */
export function veredictoDeConexionDeclarada({ declarada, observadas }) {
    const esperada = String(declarada).toLowerCase();
    if (!observadas.length)
        return {
            cumple: false,
            motivo: `la familia declara medir con conexion ${esperada} y no leyo la conexion en ninguna de sus medidas: sin esa lectura el veredicto no es comparable entre corridas`,
        };
    const distintas = observadas.filter((o) => o !== esperada);
    if (distintas.length)
        return {
            cumple: false,
            motivo: `la familia declara medir con conexion ${esperada} y midio con ${[...new Set(observadas)].join("/")} en ${distintas.length} de ${observadas.length} medidas: el umbral del cargador perezoso depende de esa estimacion, asi que el veredicto no habla del sitio sino de la maquina`,
        };
    return { cumple: true, motivo: null };
}

/**
 * LA OTRA MITAD DEL CANDADO DEL CANDADO: la corrida no puede cambiar por debajo
 * una condicion de navegador que comparten TODAS las familias.
 *
 * `veredictoDeConexionDeclarada` protege a UNA familia, la que ya sabemos que
 * depende de esa estimacion. Esta protege a las que vengan: el navegador
 * compartido se interroga al EMPEZAR y al TERMINAR la corrida, y si la
 * estimacion se ha movido por el camino se declara incumplimiento con nombre
 * propio en vez de dejar que cada familia publique un veredicto medido en
 * condiciones distintas de las de su vecina.
 *
 * ES EL INVARIANTE QUE FALTABA, escrito como el brief lo pedia: al terminar, el
 * estado observable del navegador es el que habia al empezar. La forma que este
 * repo puede comprobar hoy es la estimacion de red, que es la que se midio
 * moviendose y la que decide el umbral del cargador perezoso; cualquier otra
 * condicion compartida que aparezca se anade a la misma sonda.
 *
 * `null` no es "no aplica": es la sonda sin objeto --el navegador dejo de
 * exponer `navigator.connection`-- y entonces esta familia no puede afirmar
 * nada, asi que lo dice.
 */
export function veredictoDeDerivaDeCondiciones({ alEmpezar, alTerminar }) {
    if (alEmpezar === null || alTerminar === null)
        return {
            cumple: false,
            motivo: `no se pudo leer la conexion estimada del navegador compartido (al empezar ${alEmpezar}, al terminar ${alTerminar}): sin esa lectura esta familia no vigila nada`,
        };
    if (alEmpezar !== alTerminar)
        return {
            cumple: false,
            motivo: `la propia corrida movio una condicion del navegador que comparten todas las familias: la conexion estimada paso de ${alEmpezar} a ${alTerminar}. Ese numero fija el umbral del cargador perezoso, asi que las familias medidas antes y despues no midieron lo mismo -- vuelve a correr con la maquina en reposo antes de creerte ningun veredicto de esta corrida`,
        };
    return { cumple: true, motivo: null };
}

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
 * LA TINTA QUE SE PINTA NO SALE DEL VIEWPORT (critica externa #21, P1
 * arbitrado el 2026-09-08).
 *
 * POR QUE EL RANGO Y NO LA CAJA, que es el corazon de esta familia y el error
 * que el arbitraje del P1 cometio DOS VECES antes de darse cuenta. La caja de un
 * elemento (`getBoundingClientRect`) incluye su `transform`, y un bloque que
 * ocupa el ancho de su columna con el texto centrado dentro tiene la caja en un
 * sitio y las letras en otro: medido en `/en` a 320 px con la raiz a 32, la caja
 * de la primera linea del statement empieza en -30,08 y la LINEA REAL en -10,16,
 * casi veinte pixeles de diferencia. En el sentido contrario pasa lo mismo: una
 * caja limpia puede contener texto que se sale. Lo que WCAG 1.4.4 protege es el
 * TEXTO, asi que se mide el texto: `Range.getClientRects()` sobre el nodo de
 * texto, que son las cajas de linea que el motor renderiza de verdad. Es el
 * mismo instrumento que `probeLegibilidadDeTexto` usa para deshacer la
 * inflacion de una celda estirada, aqui como medida primaria.
 *
 * Y POR QUE LA TINTA TIENE QUE ESTAR PINTADA, que es la mitad que el P1 no
 * midio. El rango de un nodo de texto existe aunque nadie lo vea, asi que una
 * familia que solo mire geometria acusa a inocentes por tres vias distintas,
 * las tres medidas en este repo el 2026-09-08:
 *
 *   OPACIDAD CERO. Las tres lineas del statement de Story declaran
 *   `opacity: 0` + `transform: translateX(±16%)` como estado PREVIO al reveal.
 *   En reposo, sin `reduce` y sin haber llegado a la seccion, la primera linea
 *   tiene su rango en x = -10,16 -- y opacidad efectiva 0. No se pierde tinta
 *   porque no hay tinta: cuando el reveal la pinta, `transform` es `none` y la
 *   linea aterriza en +35,92 (`/en`) y +43,17 (`/`). Ese es exactamente el P1
 *   que este candado nace midiendo, y por eso la opacidad es parte de la
 *   medida y no un filtro cosmetico.
 *
 *   RECORTE QUE EL RANGO NO VE. `Range.getClientRects()` NO respeta el
 *   `overflow: hidden` del contenedor: devuelve el texto entero como si nada lo
 *   recortara. El `VisuallyHidden` del enlace del statement --caja de 1x1 px con
 *   `clip-path: inset(50%)`-- da un rango de 376,41 px de ancho a 320 px de
 *   viewport, o sea 71,41 px "fuera", con opacidad 1 y sin que exista un solo
 *   pixel pintado. Se descarta por su CAJA de 1x1, que es el mismo criterio con
 *   el que las dos familias hermanas ya lo dejan fuera.
 *
 *   TINTA QUE SE ALCANZA. La tabla de almacenamiento de las paginas legales
 *   vive dentro de un `overflow-x: auto` con `role="region"` y `tabindex`: su
 *   texto se sale del viewport y se llega a el con el dedo, con la rueda y con
 *   el teclado, asi que no es contenido perdido sino contenido desplazable. Sin
 *   este tercer absolvedor la familia nacia con 672 acusaciones sobre las ocho
 *   superficies, todas del mismo patron correcto. Es el MISMO filtro que
 *   `probePerdidaHorizontal` ya aplica, y ademas es parte de la definicion del
 *   defecto que la trajo: el P1 de la critica #21 afirmaba tinta fuera Y SIN
 *   NINGUNA FORMA DE LLEGAR A ELLA.
 *
 * La opacidad se toma como PRODUCTO de la cadena de ancestros hasta `<html>`,
 * no del elemento: lo que apaga el statement es su propia regla, pero lo que
 * apaga las tarjetas de Contact en reposo es el `opacity` de la seccion que las
 * contiene, y una lectura local las daria por pintadas.
 *
 * EL UMBRAL DE TINTA ES EL CERO ESTRICTO, a proposito. Cualquier opacidad
 * distinta de cero cuenta como pintada, aunque sea 0,017. Es la direccion
 * conservadora --ruidoso antes que silencioso, el mismo criterio que el resto
 * del fichero-- y ademas es la unica que no exige elegir a ojo cuanta tinta es
 * "poca": en reposo, en las 72 celdas medidas el 2026-09-08 (2 temas x 2
 * idiomas x 3 raices x 3 anchos x 2 sentidos de `reduce`), las piezas que se
 * salen tienen opacidad CERO exacta, no pequena.
 *
 * QUE MIRA Y QUE NO. Solo el texto dentro de `main`. La cabecera y el pie los
 * cubre `texto-al-200-por-ciento` por caja, y en la barra vive ademas la trampa
 * de los controles de escritorio ocultos que este repo ya pago dos veces. Y se
 * mide en la CIMA del documento: con `reduce`, donde el repo declara los
 * estados finales de sus reveals, esa unica posicion ya da la composicion
 * asentada de la pagina entera; sin `reduce` da la de reposo, que es la otra
 * mitad que ninguna familia anterior veia.
 *
 * GUARDA DE VACUIDAD: `examinadas`. Son las piezas de texto pintables que la
 * sonda llego a mirar. En cualquier superficie real son decenas (90-96 en la
 * portada); un cero significa que el filtro esta roto --un cambio de marcado, un
 * `main` que se renombra-- y no que la pagina este limpia.
 */
export function probeTintaPintadaFuera({ toleranciaPx }) {
    const raiz = document.documentElement;
    const cw = raiz.clientWidth;
    const main = document.querySelector("main");
    if (!main)
        return {
            rootFontPx: parseFloat(getComputedStyle(raiz).fontSize),
            clientWidth: cw,
            examinadas: 0,
            fuera: [],
            apagadas: 0,
            alcanzables: 0,
        };

    /* Los nodos se RECOGEN antes de recorrerlos, en vez de pedirle uno al
       `TreeWalker` en cada vuelta: el avance dejaba de ser una sentencia que se
       puede olvidar en una rama del cuerpo -- y se olvido, con el bucle
       colgando la suite entera hasta que alguien miro por que no terminaba. */
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const nodos = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodos.push(n);

    const fuera = [];
    let examinadas = 0;
    let apagadas = 0;
    let alcanzables = 0;
    for (const nodo of nodos) {
        const texto = (nodo.textContent || "").trim();
        const padre = nodo.parentElement;
        if (texto.length === 0 || !padre) continue;
        const cs = getComputedStyle(padre);
        const caja = padre.getBoundingClientRect();
        /* La caja de 1x1 px es la de `VisuallyHidden`, cuyo rango mide el texto
           SIN el recorte que lo hace invisible: ver el docblock. */
        if (
            cs.visibility === "hidden" ||
            cs.visibility === "collapse" ||
            cs.display === "none" ||
            (caja.width <= 1 && caja.height <= 1)
        )
            continue;
        examinadas += 1;

        let opacidad = 1;
        let ancestro = padre;
        while (ancestro && ancestro !== raiz) {
            /* Un motor que no resuelve `opacity` --jsdom devuelve la cadena
               vacia para las propiedades que no implementa-- no puede ABSOLVER
               a nadie: sin dato, la pieza cuenta como pintada. Es la misma
               direccion conservadora que el resto del fichero. */
            const propia = parseFloat(getComputedStyle(ancestro).opacity);
            opacidad *= Number.isFinite(propia) ? propia : 1;
            ancestro = ancestro.parentElement;
        }

        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        let minL = Infinity;
        let maxR = -Infinity;
        for (const r of rango.getClientRects()) {
            if (r.width === 0 && r.height === 0) continue;
            minL = Math.min(minL, r.left);
            maxR = Math.max(maxR, r.right);
        }
        if (minL !== Infinity) {
            const porLaIzquierda = -minL;
            const porLaDerecha = maxR - cw;
            const sobra = Math.max(porLaIzquierda, porLaDerecha);
            if (sobra > toleranciaPx) {
                /* ALCANZABLE NO ES PERDIDO, y es la MISMA regla (y el mismo
                   codigo) que `probePerdidaHorizontal`: la tabla de
                   almacenamiento de las legales vive dentro de un
                   `overflow-x: auto` con `role="region"` y `tabindex`, donde el
                   contenido se alcanza con el dedo, con la rueda y con el
                   teclado. Sin este filtro esta familia nacia acusando 672
                   veces a un patron correcto (medido el 2026-09-08 sobre las
                   ocho superficies). Es ademas parte de la definicion del
                   defecto que la trajo: lo que el P1 de la critica #21 afirmaba
                   era tinta fuera Y SIN NINGUNA FORMA DE LLEGAR A ELLA. */
                let alcanzable = false;
                let contenedor = padre.parentElement;
                while (contenedor) {
                    const ox = getComputedStyle(contenedor).overflowX;
                    if (ox === "auto" || ox === "scroll") {
                        alcanzable = true;
                        break;
                    }
                    contenedor = contenedor.parentElement;
                }
                if (alcanzable) alcanzables += 1;
                else if (opacidad > 0)
                    fuera.push({
                        zona: padre.closest("[id]")
                            ? padre.closest("[id]").id
                            : "main",
                        sel: padre.tagName.toLowerCase(),
                        lado:
                            porLaIzquierda > porLaDerecha
                                ? "izquierda"
                                : "derecha",
                        borde:
                            Math.round(
                                (porLaIzquierda > porLaDerecha ? minL : maxR) *
                                    100,
                            ) / 100,
                        sobra: Math.round(sobra * 100) / 100,
                        opacidad: Math.round(opacidad * 1000) / 1000,
                        texto: texto.slice(0, 40),
                    });
                else apagadas += 1;
            }
        }
    }

    return {
        rootFontPx: parseFloat(getComputedStyle(raiz).fontSize),
        clientWidth: cw,
        examinadas,
        fuera,
        apagadas,
        alcanzables,
    };
}

/**
 * Veredicto de la familia sobre las lecturas de toda la matriz. Puro y
 * exportado para que la suite lo ejercite sin navegador: la sonda de arriba
 * necesita layout real y jsdom no lo tiene, pero la REGLA --que una lectura con
 * tinta fuera es un fallo, que una raiz que no llega es un instrumento roto, que
 * cero piezas examinadas es vacuidad-- se afirma aqui.
 *
 * `raizPedida` viaja con cada lectura y se compara contra la MEDIDA: es la misma
 * guarda que la familia de zoom aprendio a poner cuando la emulacion podia no
 * llegar y el barrido salia verde midiendo la pagina sin ampliar. Con la
 * reemulacion en vivo hace mas falta todavia, porque aqui no hay recarga que
 * delate el fallo.
 */
export function evaluaTintaPintada(lecturas) {
    const fallos = [];
    const instrumento = [];
    let examinadasTotales = 0;
    let apagadasTotales = 0;
    let alcanzablesTotales = 0;
    let celdasConTinta = 0;
    for (const { etiqueta, raizPedida, lectura } of lecturas) {
        examinadasTotales += lectura.examinadas;
        apagadasTotales += lectura.apagadas;
        alcanzablesTotales += lectura.alcanzables;
        if (lectura.rootFontPx !== raizPedida)
            instrumento.push(
                `${etiqueta}: la raiz emulada no llego (se pidio ${raizPedida} px, la pagina tiene ${lectura.rootFontPx})`,
            );
        if (lectura.fuera.length) {
            celdasConTinta += 1;
            for (const f of lectura.fuera)
                fallos.push(
                    `${etiqueta} ${f.zona}/${f.sel} ("${f.texto}") ${f.sobra} px fuera por la ${f.lado} (borde en ${f.borde} px, opacidad ${f.opacidad})`,
                );
        }
    }
    return {
        fallos,
        instrumento,
        examinadasTotales,
        apagadasTotales,
        alcanzablesTotales,
        celdasConTinta,
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
 * FAMILIA DIECINUEVE, `lang-del-documento-por-ruta`: EL IDIOMA QUE CADA
 * SUPERFICIE TIENE QUE ANUNCIAR, con y sin JavaScript.
 *
 * Funcion pura y tabulada a proposito: el veredicto de esta familia es una
 * TABLA, y una tabla se puede ejercitar entera en el gate sin navegador.
 *
 * CON JavaScript el idioma es el de la superficie: ahi ya corrio el cliente y
 * `I18nProvider` resolvio la rama.
 *
 * SIN JavaScript es el idioma HORNEADO de la ruta, y hoy tambien es el de la
 * superficie, SIN EXCEPCIONES: las dos portadas, las cuatro legales y las dos
 * 404 hornean contenido en su idioma y tienen que anunciarlo.
 *
 * El P1 de la critica #19 (una superficie inglesa horneada con `lang="es"`) se
 * arreglo el 2026-09-06 (ola S, commit `16c8451`): tres raices
 * --`app/(es)/layout.tsx`, `app/en/layout.tsx` y `app/global-not-found.tsx`--
 * que hornean su propio `<html lang>` sobre `app/RootDocument.tsx`.
 *
 * La 404 inglesa fue la excepcion declarada hasta el 2026-09-10
 * (`IDIOMA_HORNEADO_DE_LA_404 = "es"`): `output: "export"` solo emitia un
 * `404.html` castellano. Se retira por dos piezas que la dejan sin motivo:
 *   - commit `06cdda8`: `app/en/404/page.tsx` hornea `out/en/404.html` con
 *     `lang="en"` y `netlify.toml` lo sirve con estado 404 para todo camino
 *     inexistente bajo `/en/` (`from = "/en/*"`, `force = false`). Produccion ya
 *     no sirve la 404 castellana en `/en/*`.
 *   - commit `403bd29`: `scripts/serve-measure.mjs`, el servidor de medicion,
 *     reproduce esa regla con la pila de `serve`, y el vigilante lo lanza por
 *     defecto. El instrumento ve lo que produccion sirve.
 * Con `serve` a secas, `/en/no-existe` sigue dando el `404.html` castellano de
 * la raiz, y esta familia lo marca en ROJO: justo lo que tiene que hacer,
 * porque esa no es la 404 que sirve produccion.
 *
 * Las dos lecturas (horneado y vivo) se siguen comparando por separado en
 * `auditarSuperficie`, cada una con su mensaje, contra este mismo idioma.
 */
export function langEsperado(surface) {
    return surface.locale;
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

/**
 * Un NAVEGADOR propio con el tipo de conexion estimado fijado por argumento de
 * lanzamiento. Ver el docblock de `CONEXION_ESTIMADA_DEL_ARTE`: la estimacion
 * vive en el proceso y la comparten todos sus contextos, asi que la unica forma
 * de que una familia no la herede de lo que hicieran las demas es no compartir
 * el proceso.
 */
async function navegadorConConexionFijada(ect) {
    const chromium = await loadChromium();
    return chromium.launch({
        channel: "chrome",
        args: [`--force-effective-connection-type=${ect}`],
    });
}

/** El tipo de conexion que el documento ve, tal cual, sin interpretarlo. */
function probeConexionEstimada() {
    return navigator.connection?.effectiveType ?? null;
}

/**
 * La conexion estimada del navegador COMPARTIDO, leida sobre una pagina real
 * del sitio. Es la sonda de `condiciones-de-navegador-estables-en-la-corrida`:
 * se llama dos veces, antes de la primera superficie y despues de la ultima.
 */
async function leeConexionCompartida(browser, base, theme) {
    const ctx = await nuevoContexto(browser, theme);
    try {
        const page = await ctx.newPage();
        await page.goto(base + HOME_DOC.es, { waitUntil: "load" });
        return await page.evaluate(probeConexionEstimada);
    } finally {
        await ctx.close();
    }
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

/**
 * FAMILIA VEINTICUATRO, `volver-arriba-vuelve-arriba` (critica externa #21,
 * ola U, 2026-09-08). Es la unica familia de este script que juzga un GESTO
 * completo por su RESULTADO: se pulsa un control y se exige que la pagina
 * termine donde el control promete.
 *
 * EL DEFECTO QUE NACE PARA VER, medido sobre el build servido de `27bf1f6`
 * (out/ del HEAD, http://localhost:4321, Chrome), ruta `/`, idioma es, clic
 * REAL sobre `[data-back-to-top]` desde el final del documento:
 *
 *     no-preference light 1440  y 5623 -> 5320   (94,6 % del recorrido)
 *     no-preference light  390  y 9314 -> 4198   (45,1 %)
 *     no-preference dark  1440  y 10108 -> 9805  (97,0 %)
 *     no-preference dark   390  y 10453 -> 4768  (45,6 %)
 *     reduce        (las cuatro)          -> 0   (0,0 %)
 *
 * A 1440 no se autocorrige: tres pulsaciones seguidas dan 5320, 5320, 5320,
 * con el boton todavia en pantalla prometiendo lo mismo.
 *
 * POR QUE NINGUNA DE LAS VEINTITRES FAMILIAS ANTERIORES LO VEIA, que es la
 * parte que importa. `recorrido-teclado` recorre las paradas de tabulacion y
 * el boton figura entre ellas: alcanzable, con su rotulo traducido y su anillo
 * de foco. `sin-trampas-de-foco` comprueba que se puede salir. Ninguna lo
 * ACTIVA. Veintiuna rondas de critica externa, cinco evaluadores cada una, y
 * el boton se contaba entre las paradas de teclado -- que no es lo mismo que
 * pulsarlo. Un candado que inventaria controles sin ejercitarlos mide que
 * existen, no que sirven.
 *
 * EL EJE QUE SEPARA A LOS DOS BANDOS ES `prefers-reduced-motion`, y por eso
 * esta en la matriz. Con `reduce`, los dos movimientos que compiten
 * --el barrido del boton y el que el navegador hace para traer a pantalla el
 * elemento enfocado-- son instantaneos y el primero llega al origen antes de
 * que el segundo empiece: el resultado es 0 y el defecto es invisible. Es
 * exactamente la leccion del 2026-09-07: una familia que solo mida en uno de
 * los dos sentidos de `reduce` mide otra cosa. Aqui la asimetria se paga
 * barata --el sentido `reduce` se mide solo a 1440, porque su unico trabajo es
 * dejar constancia de que ESE lado tambien llega y que el rojo del otro no es
 * un defecto del instrumento--.
 *
 * POR QUE UN CLIC REAL DE PLAYWRIGHT Y NO `element.click()` DESDE LA PAGINA:
 * leccion ya pagada en la ronda #20, donde un `element.click()` dio un falso
 * resultado sobre un manejador que intercepta el gesto. El gesto se manda por
 * el mismo camino por el que lo manda una persona.
 *
 * LIMITE DECLARADO: esta familia mide el RESULTADO (donde acaba la pagina), no
 * el CAMINO. Un arreglo que apagara la animacion --barrido instantaneo siempre,
 * tambien sin `reduce`-- saldria verde aqui. Ese lado lo atan los tests de
 * `BackToTop.test.tsx`, que afirman el `behavior` exacto en las dos ramas de la
 * preferencia; no se duplica aqui porque exigir en navegador que haya muestras
 * intermedias depende de con que frecuencia se muestrea contra lo rapido que
 * anime el motor, y un candado que parpadea es peor que uno que declara su
 * limite.
 */
export const VIEWPORTS_DE_VOLVER_ARRIBA = [
    { ancho: 1440, alto: 900, reduce: "no-preference" },
    { ancho: 390, alto: 844, reduce: "no-preference" },
    { ancho: 1440, alto: 900, reduce: "reduce" },
];

/**
 * Cuanto se admite que la pagina se quede corta del origen, en px. El control
 * promete el ORIGEN, asi que el valor honesto seria 0; los 2 px cubren el
 * redondeo subpixel de `window.scrollY` con densidades fraccionarias, y no
 * pueden tapar nada de lo que esta familia existe para ver: el defecto medido
 * deja la pagina entre 4.198 y 9.805 px del origen, tres ordenes de magnitud
 * por encima de esta tolerancia.
 */
export const TOLERANCIA_DE_VUELTA_ARRIBA_PX = 2;

/**
 * Cuantas pulsaciones se dan en cada combinacion. TRES, y no una, porque la
 * pregunta que un lector se hace al ver el defecto es justamente "se
 * autocorrige si insisto?" -- y la respuesta medida a 1440 es que no (5320,
 * 5320, 5320). Una familia que pulsara una sola vez no distinguiria un defecto
 * permanente de un tropiezo del primer intento.
 */
export const PULSACIONES_DE_VOLVER_ARRIBA = 3;

/**
 * Veredicto PURO de una combinacion, separado de la conduccion del navegador
 * para poder ejercitarlo desde la suite con numeros tecleados (mismo reparto
 * que `evaluaEstadoModal` y `probeContrasteDeLaCabecera`).
 *
 * `intentos` es la lista de aterrizajes, uno por pulsacion, en el orden en que
 * se dieron. `partida` es el scroll del que salio la primera pulsacion: sirve
 * para la guarda de vacuidad, porque un "llego a 0" desde 0 no demuestra nada.
 */
export function evaluaVueltaArriba({
    combinacion,
    botonVisible,
    partida,
    intentos,
}) {
    const motivos = [];
    const donde = `${combinacion.ancho}x${combinacion.alto} con reduce=${combinacion.reduce}`;
    if (!botonVisible) {
        motivos.push(
            `a ${donde} el control [data-back-to-top] no llego a aparecer desde el final del documento: sin control que pulsar el verde de esta familia seria vacuo`,
        );
        return { cumple: false, motivos };
    }
    /* Guarda de vacuidad: si la pagina ya estaba en el origen, "vuelve al
       origen" es cierto sin que el control haya hecho nada. El umbral del
       propio boton son 2 pantallas, asi que una partida real siempre esta muy
       por encima; se exige al menos una pantalla para no atar el candado al
       umbral exacto del componente. */
    if (partida <= combinacion.alto) {
        motivos.push(
            `a ${donde} la pulsacion salio de y=${partida}, a menos de una pantalla (${combinacion.alto}) del origen: la medida no distingue un control que funciona de uno que no hace nada`,
        );
        return { cumple: false, motivos };
    }
    const fallidos = intentos
        .map((y, i) => ({ y, n: i + 1 }))
        .filter(({ y }) => y > TOLERANCIA_DE_VUELTA_ARRIBA_PX);
    if (fallidos.length)
        motivos.push(
            `a ${donde} el control «volver arriba» no devuelve la pagina al origen desde y=${partida}: ${fallidos
                .map(
                    ({ y, n }) =>
                        `pulsacion ${n} termina en y=${y} (${((100 * y) / partida).toFixed(1)} % del recorrido sin deshacer)`,
                )
                .join(
                    ", ",
                )} -- tolerancia ${TOLERANCIA_DE_VUELTA_ARRIBA_PX} px`,
        );
    return { cumple: motivos.length === 0, motivos };
}

/**
 * Conduce el navegador para UNA combinacion y devuelve lo que
 * `evaluaVueltaArriba` necesita. Exportada para poder ejercitar esta familia
 * SOLA contra un build servido, sin recorrer las ocho superficies (la corrida
 * completa pasa de diez minutos por tema).
 */
export async function mideVueltaArriba(browser, theme, url, combinacion) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: combinacion.ancho, height: combinacion.alto },
        reducedMotion: combinacion.reduce,
    });
    try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        /* La portada asienta su composicion despues de `networkidle`: la misma
           espera, y por el mismo motivo, que las familias vecinas. */
        await page.waitForTimeout(2200);
        await page.evaluate(() =>
            window.scrollTo({
                top: document.documentElement.scrollHeight - window.innerHeight,
                behavior: "instant",
            }),
        );
        await page.waitForTimeout(1400);
        const partida = await page.evaluate(() => Math.round(window.scrollY));

        const intentos = [];
        let botonVisible = false;
        for (let n = 0; n < PULSACIONES_DE_VOLVER_ARRIBA; n += 1) {
            /* `$$` y filtro por caja visible, no `$`: `querySelector` devuelve
               el PRIMER nodo, que en movil puede ser un control de una barra de
               escritorio oculta (trampa ya pagada en este repo). */
            const candidatos = await page.$$("[data-back-to-top]");
            let boton = null;
            for (const c of candidatos) {
                if (await c.boundingBox()) {
                    boton = c;
                    break;
                }
            }
            if (!boton) break;
            botonVisible = true;
            /* Clic REAL, por el mismo camino que una persona. */
            await boton.click();
            /* Se espera a que el scroll se ESTABILICE, no un tiempo fijo: un
               barrido suave de 10.000 px tarda mas que uno de 5.000, y un
               plazo fijo mediria a mitad de viaje en el caso largo. */
            await page
                .waitForFunction(
                    () => {
                        const y = Math.round(window.scrollY);
                        if (window.__u1quieto === y) return true;
                        window.__u1quieto = y;
                        return false;
                    },
                    null,
                    { polling: 400, timeout: 12000 },
                )
                .catch(() => {
                    /* Si no se estabiliza en 12 s, se lee igualmente: un scroll
                       que no para es su propio defecto y la cifra lo dira. */
                });
            intentos.push(
                await page.evaluate(() => {
                    delete window.__u1quieto;
                    return Math.round(window.scrollY);
                }),
            );
            /* Para la siguiente pulsacion hace falta volver al final: el boton
               solo existe por debajo de su umbral. */
            if (n + 1 < PULSACIONES_DE_VOLVER_ARRIBA) {
                await page.evaluate(() =>
                    window.scrollTo({
                        top:
                            document.documentElement.scrollHeight -
                            window.innerHeight,
                        behavior: "instant",
                    }),
                );
                await page.waitForTimeout(1200);
            }
        }
        return { combinacion, botonVisible, partida, intentos };
    } finally {
        await ctx.close();
    }
}

/**
 * FAMILIA TREINTA Y UNO, `tabulacion-sin-rezago` (critica externa #21, P1 del
 * objetivo >=98, H1 y parte de H7, 2026-09-10).
 *
 * EL DEFECTO QUE NACE PARA VER, medido sobre el build servido de `d29da8e`
 * (Chrome, `/`, oscuro, 1440x900, SIN `reduce`, Tab cada 120 ms): 31 de 59
 * paradas con el foco ENTERO fuera del viewport justo antes de la siguiente
 * pulsacion. La raiz: `html { scroll-behavior: smooth }` hace que el scroll
 * inducido por el foco sea un barrido animado mas lento que la cadencia del
 * teclado; al asentarse vuelve (0 fuera a 1,4 s), por eso ninguna familia que
 * espera a que el foco se asiente --`recorrido-teclado`, `foco-visible`-- lo
 * veia. Con `reduce` el computado ya es `auto` y el defecto no existe: esa
 * combinacion entra como constancia, no como control (leccion 2026-09-07).
 *
 * LA CONTRAPARTIDA QUE TAMBIEN VIGILA: el arreglo aprobado
 * (`html:has(:focus-visible) { scroll-behavior: auto }`) apaga el barrido solo
 * con foco visible. Para que nadie "apruebe" esta familia quitando el smooth a
 * todo el sitio, sin `reduce` se exige ademas que un clic de RATON en un
 * enlace de seccion de la barra produzca al menos
 * `POSICIONES_MINIMAS_DEL_BARRIDO_DE_RATON` posiciones de scroll distintas y
 * no encienda `:focus-visible`.
 */
export const COMBINACIONES_DE_TABULACION = [
    { ancho: 1440, alto: 900, reduce: "no-preference" },
    { ancho: 1440, alto: 900, reduce: "reduce" },
];

/** Cadencia del teclado, en ms: la misma con la que se midio el defecto. */
export const INTERVALO_DE_TABULACION_MS = 120;

/** Tope de pulsaciones: el recorrido para antes si el foco vuelve al body. */
export const TOPE_DE_PULSACIONES_DE_TABULACION = 160;

/** Suelo de posiciones distintas del barrido de raton (medido: 15-16). */
export const POSICIONES_MINIMAS_DEL_BARRIDO_DE_RATON = 4;

/**
 * Veredicto puro de una combinacion de `tabulacion-sin-rezago`. Recibe lo que
 * `mideTabulacion` devuelve; exportada para ejercitarla en jsdom con las
 * cifras reales del defecto.
 */
export function evaluaTabulacionSinRezago(medida) {
    const { combinacion, paradas, fuera, raton } = medida;
    const etiqueta = `${combinacion.ancho}x${combinacion.alto}@${combinacion.reduce}`;
    const motivos = [];
    if (paradas === 0)
        motivos.push(
            `${etiqueta}: el recorrido de teclado no dio ni una parada: sin paradas no se midio nada y el verde seria vacuo`,
        );
    if (fuera.length)
        motivos.push(
            `${etiqueta}: ${fuera.length} de ${paradas} paradas con el foco entero fuera del viewport justo antes de la siguiente pulsacion (Tab cada ${INTERVALO_DE_TABULACION_MS} ms): ${fuera.slice(0, 6).join(", ")}${fuera.length > 6 ? ", ..." : ""}`,
        );
    if (combinacion.reduce === "no-preference") {
        if (!raton)
            motivos.push(
                `${etiqueta}: no hay enlace de seccion visible en la barra para el clic de raton: la contrapartida del arreglo quedo sin medir`,
            );
        else {
            if (raton.posiciones < POSICIONES_MINIMAS_DEL_BARRIDO_DE_RATON)
                motivos.push(
                    `${etiqueta}: el clic de raton en ${raton.enlace} dio ${raton.posiciones} posiciones de scroll (suelo ${POSICIONES_MINIMAS_DEL_BARRIDO_DE_RATON}): el barrido suave del raton se perdio`,
                );
            if (raton.focoVisible)
                motivos.push(
                    `${etiqueta}: el clic de raton en ${raton.enlace} encendio :focus-visible, asi que el raton tambien pierde el barrido`,
                );
        }
    }
    return { cumple: motivos.length === 0, motivos };
}

/**
 * Conduce el navegador para UNA combinacion de `tabulacion-sin-rezago`.
 * Exportada para poder correr esta familia SOLA contra un build servido.
 */
export async function mideTabulacion(browser, theme, url, combinacion) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: combinacion.ancho, height: combinacion.alto },
        reducedMotion: combinacion.reduce,
    });
    try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(2200);
        let paradas = 0;
        const fuera = [];
        for (let n = 0; n < TOPE_DE_PULSACIONES_DE_TABULACION; n += 1) {
            await page.keyboard.press("Tab");
            await page.waitForTimeout(INTERVALO_DE_TABULACION_MS);
            /* Se lee JUSTO antes de la siguiente pulsacion: es el instante en
               que quien tabula decide si sigue, y el que el defecto vacia. */
            const estado = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                const r = el.getBoundingClientRect();
                const vacia = r.width === 0 && r.height === 0;
                const nombre =
                    el.tagName.toLowerCase() +
                    (el.id ? `#${el.id}` : "") +
                    (el.getAttribute("href")
                        ? `[${el.getAttribute("href")}]`
                        : "");
                return {
                    nombre,
                    fuera:
                        !vacia &&
                        (r.bottom <= 0 ||
                            r.top >= window.innerHeight ||
                            r.right <= 0 ||
                            r.left >= window.innerWidth),
                };
            });
            /* El foco vuelve al body al salir del ultimo control: fin del
               recorrido, del principio al pie. */
            if (!estado) {
                if (paradas > 0) break;
                continue;
            }
            paradas += 1;
            if (estado.fuera) fuera.push(`${paradas}:${estado.nombre}`);
        }

        let raton = null;
        if (combinacion.reduce === "no-preference") {
            await page.goto(url, { waitUntil: "networkidle" });
            await page.waitForTimeout(2200);
            const candidatos = await page.$$('header a[href$="#story"]');
            let enlace = null;
            for (const c of candidatos) {
                if (await c.boundingBox()) {
                    enlace = c;
                    break;
                }
            }
            if (enlace) {
                await page.evaluate(() => {
                    window.__tabPos = new Set();
                    const t0 = performance.now();
                    const paso = () => {
                        window.__tabPos.add(Math.round(window.scrollY));
                        if (performance.now() - t0 < 2500)
                            requestAnimationFrame(paso);
                    };
                    requestAnimationFrame(paso);
                });
                /* Clic REAL de raton, por el mismo camino que una persona. */
                await enlace.click();
                await page.waitForTimeout(2600);
                raton = await page.evaluate(() => ({
                    enlace: 'header a[href$="#story"]',
                    posiciones: window.__tabPos.size,
                    focoVisible:
                        document.querySelector(":focus-visible") !== null,
                }));
            }
        }
        return { combinacion, paradas, fuera, raton };
    } finally {
        await ctx.close();
    }
}

/**
 * FAMILIA TREINTA Y DOS, `aterrizaje-de-ancla-constante` (critica externa #21,
 * P2 del objetivo >=98, parte de H4, 2026-09-10).
 *
 * EL DEFECTO QUE NACE PARA VER, medido sobre el build servido de `d29da8e`
 * (Chrome, `/`, claro, 1440x900): el PRIMER salto a `#contact` aterriza con
 * el titulo a 192 px del borde y los siguientes a 128. La raiz no es el
 * navbar ni el `scroll-margin`: la figura destacada de Features es
 * `loading="lazy"` y no tenia caja reservada en `lg`, asi que carga DURANTE el
 * primer barrido, `#features` crece 65 px por encima del destino ya fijado y
 * `#contact` baja en el documento de 4.502 a 4.566. En los saltos siguientes
 * la imagen ya esta y la maquetacion no se mueve. Con el salto instantaneo
 * (`reduce`) tambien daba 192: el anclaje de scroll del navegador no lo
 * compensa, asi que el eje de `reduce` entra como caso propio.
 *
 * POR QUE CONTEXTO NUEVO POR SECCION: el defecto solo existe con la cache
 * FRIA (primer salto); un contexto compartido lo esconderia a partir de la
 * segunda seccion medida.
 *
 * LO QUE NO MIDE (pendiente declarado): 390x844 por la hoja movil, que no
 * vive dentro de `<header>`; por debajo de 62em el panel tiene alto fijo y el
 * 100 % de la figura es definido, asi que no deberia crecer, pero esta sin
 * medir.
 */
export const COMBINACIONES_DE_ATERRIZAJE = [
    { ancho: 1440, alto: 900, reduce: "no-preference" },
    { ancho: 1440, alto: 900, reduce: "reduce" },
];

/** Secciones de la barra, en el orden de `src/config/navigation.ts`. */
export const SECCIONES_DE_ATERRIZAJE = [
    "story",
    "journey",
    "features",
    "contact",
];

/** Tolerancia entre el primer aterrizaje y el segundo, en px. */
export const TOLERANCIA_DE_ATERRIZAJE_PX = 2;

/** Veredicto puro de UNA seccion en UNA combinacion. */
export function evaluaAterrizajeDeAncla(medida) {
    const { combinacion, seccion, enlace } = medida;
    const etiqueta = `${combinacion.ancho}x${combinacion.alto}@${combinacion.reduce} #${seccion}`;
    const motivos = [];
    if (!enlace) {
        motivos.push(
            `${etiqueta}: no hay enlace visible a la seccion en la barra: el salto quedo sin medir`,
        );
        return { cumple: false, motivos };
    }
    const { docTopAntes, primero, segundo } = medida;
    if (Math.abs(primero.top - segundo.top) > TOLERANCIA_DE_ATERRIZAJE_PX)
        motivos.push(
            `${etiqueta}: el primer salto aterriza a ${primero.top} px y el segundo a ${segundo.top} px (tolerancia ${TOLERANCIA_DE_ATERRIZAJE_PX} px)`,
        );
    if (Math.abs(primero.docTop - docTopAntes) > TOLERANCIA_DE_ATERRIZAJE_PX)
        motivos.push(
            `${etiqueta}: el destino se movio en el documento durante el primer salto (de ${docTopAntes} a ${primero.docTop}): algo por encima cambio de alto a mitad de viaje`,
        );
    return { cumple: motivos.length === 0, motivos };
}

/**
 * Conduce el navegador para UNA seccion en UNA combinacion, con contexto
 * nuevo. Exportada para poder correr esta familia SOLA contra un build servido.
 */
export async function mideAterrizajeDeAncla(
    browser,
    theme,
    url,
    combinacion,
    seccion,
) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: combinacion.ancho, height: combinacion.alto },
        reducedMotion: combinacion.reduce,
    });
    try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(2200);
        const selector = `header a[href$="#${seccion}"]`;
        const buscaEnlace = async () => {
            for (const c of await page.$$(selector)) {
                if (await c.boundingBox()) return c;
            }
            return null;
        };
        const lee = () =>
            page.evaluate((id) => {
                const el = document.getElementById(id);
                if (!el) return null;
                const top = el.getBoundingClientRect().top;
                return {
                    top: Math.round(top),
                    docTop: Math.round(top + window.scrollY),
                };
            }, seccion);
        const esperaQuieto = () =>
            page
                .waitForFunction(
                    () => {
                        const y = Math.round(window.scrollY);
                        if (window.__aterrizaQuieto === y) return true;
                        window.__aterrizaQuieto = y;
                        return false;
                    },
                    null,
                    { polling: 400, timeout: 12000 },
                )
                .catch(() => {
                    /* Un scroll que no para se lee igualmente: la cifra lo dira. */
                })
                .then(() =>
                    page.evaluate(() => {
                        delete window.__aterrizaQuieto;
                    }),
                );

        let enlace = await buscaEnlace();
        if (!enlace) return { combinacion, seccion, enlace: false };
        const antes = await lee();
        await enlace.click();
        await esperaQuieto();
        const primero = await lee();

        await page.evaluate(() =>
            window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.waitForTimeout(1200);
        enlace = await buscaEnlace();
        if (!enlace) return { combinacion, seccion, enlace: false };
        await enlace.click();
        await esperaQuieto();
        const segundo = await lee();
        return {
            combinacion,
            seccion,
            enlace: true,
            docTopAntes: antes.docTop,
            primero,
            segundo,
        };
    } finally {
        await ctx.close();
    }
}

/**
 * FAMILIA VEINTICINCO, `conmutar-el-tema-no-congela-la-pagina` (critica
 * externa #21, ola U, 2026-09-08). Segunda familia de este script que juzga
 * un GESTO por su resultado, y la primera que mide el PIXEL de la portada
 * entera en vez de una banda.
 *
 * EL DEFECTO QUE NACE PARA VER, medido sobre el build servido de `4d71a4f`
 * (http://localhost:4321, Chrome, `/`, es, 1440x900, SIN `reduce`, rueda real
 * de 12 x 220 px hasta y = 2.640, clic REAL sobre `[data-theme-toggle]`):
 *
 *     oscuro -> claro  t+5 s  y=1712  10 cubos de color, dominante 99,4 %
 *                             99 % del texto del viewport en el DOM, apagado
 *                             Story__ScGrid          ratio 0,2538  revelado=false
 *                             Story__ScStatementText ratio 1,0000  revelado=false
 *     claro  -> oscuro t+5 s  --journey-progress NUNCA escrita
 *                             data-slide 0,0,0,0,0,0 en 1.000 px de rueda
 *
 * Diez cubos de color y el 99,4 % en uno solo es el fondo liso de la pagina:
 * la pantalla, literalmente, casi vacia con el texto en el DOM.
 *
 * LA RAIZ, para entender por que la familia mide LO QUE MIDE.
 * `IntersectionObserver` entrega un LOTE con todos los cambios acumulados
 * desde la ultima entrega. La correccion del punto de lectura del conmutador
 * mueve el scroll 928 px DESPUES de que la rama nueva haya llamado a
 * `observe()`, asi que el lote llega con dos registros del mismo nodo -- el
 * obsoleto ("no interseca") primero y el vigente ("interseca") despues -- y
 * los cinco hooks leian `entries[0]`. Detalle completo y la prediccion
 * falsable que lo confirma: `src/hooks/useReveal.test.tsx`, candado del lote
 * multiple.
 *
 * TRES MEDIDAS Y NO UNA, porque el mismo defecto tiene tres caras y ninguna
 * de las tres ve las otras dos:
 *
 *   1. PIXEL (histograma del viewport bajo la barra, 4 bits por canal). Es el
 *      arbitro: la metrica de DOM no es comparable entre temas --el deck
 *      oscuro apila diapositivas y marca como "no pintado" lo que si se ve--
 *      y esta no depende de ninguna contabilidad propia. Calibracion medida
 *      hoy: defecto 10 cubos / 99,4 % a 1440x900 y 12 / 99,1 % a 1280x720;
 *      arreglado 41 / 90,8 % y 41 / 90,6 %. El corte esta en medio, con
 *      margen amplio por los dos lados.
 *      LIMITE: solo ve el sentido oscuro -> claro. En el contrario no hay
 *      pantalla en blanco (las diapositivas se apilan visibles) y el pixel
 *      sale verde con el defecto puesto -- por eso hay una medida 3.
 *   2. REVELADOS ATASCADOS. Un nodo con `data-revealed="false"` cuyo ratio de
 *      interseccion contra la ventana de su PROPIO observador ya supera el
 *      umbral que ese observador declara es un estado que el contrato de
 *      `IntersectionObserver` no puede producir: el umbral se cruzo y el
 *      atributo no cambio. Ve el defecto a profundidades donde el pixel ya no
 *      (a 24 pasos el pixel da 553 cubos y hay siete piezas atascadas).
 *   3. LA COREOGRAFIA SIGUE VIVA. Solo al llegar al tema oscuro (el unico que
 *      monta deck) y solo sin `reduce`: tras el gesto se ruedan 1.000 px y se
 *      exige que el escenario ENGANCHADO --el que `position: sticky` mantiene
 *      clavado en el borde superior durante toda la rodada, ver
 *      `evaluaEscenariosFijados`-- mueva su `data-slide` o su variable de
 *      progreso. Es la unica de las tres que ve el sentido contrario, donde lo
 *      que muere no es lo que se ve sino lo que se mueve.
 *
 * POR QUE EL EJE DE `reduce` ESTA, Y POR QUE NO ES UN CONTROL. La leccion del
 * 2026-09-07 exige medir los dos sentidos de la preferencia, y aqui hay que
 * decir algo mas fuerte: bajo `reduce` el defecto SIGUE OCURRIENDO --la
 * maquina de estados se queda atascada igual, medido: nodos con
 * `data-revealed="false"` y opacidad calculada 1-- y lo que cambia es que las
 * guardas CSS de revelado (`@media (prefers-reduced-motion: reduce) { opacity:
 * 1 }`, sin calificar por `data-revealed`) lo TAPAN. `reduce` no prueba que no
 * exista: prueba que la piel accesible lo esconde. Por eso las dos medidas que
 * dependen de la pintura corren sin `reduce`, y la combinacion con `reduce`
 * entra solo como constancia de que ese lado tambien llega y de que el rojo
 * del otro no es un defecto del instrumento.
 *
 * LO QUE ESTA FAMILIA NO VE, Y QUIEN LO VE AHORA: la llegada en frio por
 * `/?read=R#seccion` (la URL que el propio sitio compone al cambiar de idioma).
 * Ahi tambien queda texto sin pintar --medido: 15,3 % a R=0,45; 26,0 % a 0,50;
 * 29,1 % a 0,55; 34,4 % a 0,60; 0 % en el resto del barrido-- pero NO es este
 * defecto: no aparece un solo lote de dos entradas, y la escalera de ratios
 * (0,0000 / 0,0218 / 0,0918 / 0,1606 y 0,2475 en 0,65) cruza exactamente en el
 * umbral 0,2 que `useReveal` pedia. Era la banda ciega de 297 px que deja un
 * umbral del 20 % sobre una tarjeta de 944 px dentro de una ventana de 792. La
 * medida 2 de esta familia lo excluye POR CONSTRUCCION, no por lista: exige
 * ratio >= umbral, y esos casos estan por debajo.
 *
 * Ese segundo defecto ya no esta pendiente de nadie: el dueno decidio el
 * 2026-09-08 (umbral consciente de la altura, `src/hooks/useReveal.ts`) y lo
 * vigila la familia VEINTINUEVE, `revelado-sin-banda-ciega`, con esos mismos
 * aterrizajes dentro. Esta familia se queda con lo suyo -- el lote del
 * observador -- y aquella con el umbral.
 */
export const GESTOS_DEL_CONMUTADOR = [
    { pasos: 12, reduce: "no-preference" },
    { pasos: 24, reduce: "no-preference" },
    { pasos: 12, reduce: "reduce" },
];

/** Muesca de rueda, en px. La misma con la que se midio el defecto. */
export const PASO_DE_RUEDA_PX = 220;

/**
 * Suelo de cubos de color del viewport bajo la barra y techo del cubo
 * dominante. Ver la calibracion en el docblock de arriba: el defecto da 10-12
 * cubos con un dominante del 99,1-99,4 %, y el mismo instante arreglado da 41
 * cubos con un 90,6-90,8 %. Cualquier corte entre 12 y 41 separa los dos
 * regimenes; 25 lo deja a mitad de camino. El techo del dominante es la
 * segunda mitad de la misma pregunta: una pantalla puede tener muchos cubos
 * casi vacios y seguir siendo un fondo liso.
 */
export const MIN_CUBOS_DE_COLOR = 25;
export const MAX_DOMINANTE_DEL_VIEWPORT = 96;

/**
 * El umbral y el recorte inferior que `useReveal` declara por defecto
 * (`threshold: 0.2`, `rootMargin: "0px 0px -12% 0px"`). La medida 2 los usa
 * para reconstruir la ventana del observador y decidir si un revelado
 * atascado es un defecto o es la coreografia declarada.
 *
 * Se usa el 0,2 para TODOS los nodos aunque Features pase `threshold: 0`: no
 * hay forma de leer desde el DOM que umbral uso cada observador, y suponer el
 * mas alto solo puede hacer la familia MENOS sensible, nunca acusarla de un
 * defecto que no existe.
 */
export const UMBRAL_DECLARADO_DE_REVELADO = 0.2;
export const RECORTE_INFERIOR_DEL_REVELADO = 0.12;

/** Rueda dentro de la pista del deck tras conmutar, para la medida 3. */
export const PASOS_DE_PISTA_TRAS_CONMUTAR = 5;
export const PASO_DE_PISTA_TRAS_CONMUTAR_PX = 200;

/** Histograma del viewport ya recortado bajo la barra. Corre en la pagina. */
export function probeHistogramaDelViewport({ imagen }) {
    const img = new Image();
    img.src = imagen;
    return img.decode().then(() => {
        const lienzo = document.createElement("canvas");
        lienzo.width = img.width;
        lienzo.height = img.height;
        const pincel = lienzo.getContext("2d", { willReadFrequently: true });
        pincel.drawImage(img, 0, 0);
        const d = pincel.getImageData(0, 0, img.width, img.height).data;
        const cubos = new Map();
        for (let i = 0; i < d.length; i += 4) {
            const k =
                ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
            cubos.set(k, (cubos.get(k) || 0) + 1);
        }
        const total = d.length / 4;
        let max = 0;
        for (const v of cubos.values()) if (v > max) max = v;
        return {
            cubos: cubos.size,
            dominante: Number(((100 * max) / total).toFixed(1)),
        };
    });
}

/**
 * Nodos que siguen en `data-revealed="false"` con su ratio de interseccion ya
 * por encima del umbral que su observador declara. Corre en la pagina.
 */
export function probeRevelosAtascados({ umbral, recorte }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fondoDeLaVentana = vh * (1 - recorte);
    const atascados = [];
    for (const el of document.querySelectorAll('[data-revealed="false"]')) {
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (area <= 0) continue;
        const ix = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left));
        const iy = Math.max(
            0,
            Math.min(fondoDeLaVentana, r.bottom) - Math.max(0, r.top),
        );
        const ratio = (ix * iy) / area;
        if (ratio < umbral) continue;
        atascados.push({
            nombre:
                (el.className || "").split(/\s+/)[0].replace(/-sc-.*/, "") ||
                el.tagName.toLowerCase(),
            ratio: Number(ratio.toFixed(4)),
            top: Math.round(r.top),
            opacidad: Number(getComputedStyle(el).opacity),
        });
    }
    return atascados;
}

/**
 * Cuanto puede separarse del borde superior el escenario de un deck y seguir
 * contando como FIJADO. `position: sticky` lo clava en 0; los 8 px cubren el
 * instante en que la pista termina y lo suelta, sin admitir un escenario que
 * ya se esta yendo (el de Story, medido, va de -28 a -1028 mientras el de
 * Journey se queda clavado en 0).
 */
export const TOLERANCIA_DE_ESCENARIO_FIJADO_PX = 8;

/**
 * TODOS los escenarios de deck de la pagina, con su caja y lo que publican.
 * Corre en la pagina.
 *
 * TODOS y no el primero: `querySelector("[data-slide]")` devolvia el
 * escenario de Story --que en ese punto ya ha pasado, se queda en su ultima
 * diapositiva y conserva escritas sus variables de cuando si corria-- en vez
 * del de Journey, que es el que el gesto acababa de dejar muerto. Con ese
 * nodo la medida daba VERDE sobre el defecto entero. Es la trampa de
 * `querySelector` que este repo ya tenia escrita, aplicada a un caso nuevo.
 */
export function probeEscenariosDelDeck() {
    const salida = [];
    for (const stage of document.querySelectorAll("[data-slide]")) {
        const r = stage.getBoundingClientRect();
        const estilo = stage.getAttribute("style") || "";
        const progreso = /--[a-z-]+-progress:\s*([\d.-]+)/.exec(estilo);
        salida.push({
            nombre:
                (stage.className || "").split(/\s+/)[0].replace(/-sc-.*/, "") ||
                stage.tagName.toLowerCase(),
            enPantalla: r.bottom > 0 && r.top < window.innerHeight,
            top: Math.round(r.top),
            slide: stage.getAttribute("data-slide"),
            progreso: progreso ? progreso[1] : null,
        });
    }
    return salida;
}

/**
 * De la serie de muestras a un veredicto sobre la coreografia, PURO para
 * poder ejercitarlo desde la suite. Funcion separada porque la pregunta
 * "¿cual de los escenarios es el que estoy midiendo?" tiene respuesta y no es
 * "el primero".
 *
 * FIJADO = el escenario cuyo borde superior se queda clavado en 0 durante
 * TODA la rodada. Es la firma observable de un `position: sticky` ENGANCHADO,
 * o sea del deck por cuya pista esta pasando el lector ahora mismo. El de
 * Story, que ya paso, se va hacia arriba (-28, -228, ... -1028) y queda
 * excluido por su propia geometria, no por una lista de nombres.
 *
 * Y por eso mismo un escenario fijado TIENE que moverse: si sigue clavado tras
 * 1.000 px es que a su pista todavia le queda recorrido por debajo; un deck que
 * hubiera llegado a su ultima diapositiva ya se estaria yendo hacia arriba y no
 * seria fijado. No hace falta saber cuantas diapositivas tiene.
 */
export function evaluaEscenariosFijados(muestras) {
    if (!muestras.length || !muestras[0].length) return { aplicable: false };
    const fijados = [];
    for (let i = 0; i < muestras[0].length; i += 1) {
        const serie = muestras.map((m) => m[i]);
        if (serie.some((s) => !s)) continue;
        if (
            !serie.every(
                (s) =>
                    s.enPantalla &&
                    Math.abs(s.top) <= TOLERANCIA_DE_ESCENARIO_FIJADO_PX,
            )
        )
            continue;
        fijados.push({
            nombre: serie[0].nombre,
            serie: serie.map((s) => s.slide),
            progresos: serie.map((s) => s.progreso ?? "NO ESCRITA"),
        });
    }
    if (!fijados.length) return { aplicable: false };
    /* Con varios escenarios fijados a la vez (no ocurre hoy) se juzga el peor:
       basta con que uno este muerto para que la coreografia lo este. */
    const peor =
        fijados.find(
            (f) =>
                new Set(f.serie).size === 1 && new Set(f.progresos).size === 1,
        ) ?? fijados[0];
    return {
        aplicable: true,
        nombre: peor.nombre,
        serie: peor.serie,
        progresos: peor.progresos,
        recorrido:
            PASOS_DE_PISTA_TRAS_CONMUTAR * PASO_DE_PISTA_TRAS_CONMUTAR_PX,
        avanza:
            new Set(peor.serie).size > 1 || new Set(peor.progresos).size > 1,
    };
}

/**
 * Veredicto PURO de una combinacion, separado de la conduccion del navegador
 * para poder ejercitarlo desde la suite con numeros tecleados (mismo reparto
 * que `evaluaVueltaArriba` y `evaluaEstadoModal`).
 */
export function evaluaConmutacionDeTema({
    gesto,
    temaAntes,
    temaDespues,
    yAntes,
    yDespues,
    alto,
    pixel,
    atascados,
    deck,
}) {
    const motivos = [];
    const donde = `${gesto.pasos} muescas de rueda con reduce=${gesto.reduce}, ${temaAntes} -> ${temaDespues}`;
    /* Guardas de vacuidad. Un verde vale lo que valga el gesto que lo produjo:
       si el tema no cambio, o si la lectura no habia bajado ni una pantalla,
       no hay correccion de punto de lectura que pueda romper nada. */
    if (!temaDespues || temaDespues === temaAntes) {
        motivos.push(
            `a ${gesto.pasos} muescas con reduce=${gesto.reduce} el conmutador no llego a cambiar el tema (sigue en "${temaAntes}"): sin gesto no hay nada que medir`,
        );
        return { cumple: false, motivos };
    }
    if (yAntes <= alto) {
        motivos.push(
            `a ${donde} la lectura estaba en y=${yAntes}, a menos de una pantalla (${alto}): el gesto no llega a corregir ningun punto de lectura y el verde seria vacuo`,
        );
        return { cumple: false, motivos };
    }
    if (gesto.reduce !== "reduce") {
        if (pixel.cubos < MIN_CUBOS_DE_COLOR)
            motivos.push(
                `a ${donde} el viewport bajo la barra queda en ${pixel.cubos} cubos de color (suelo ${MIN_CUBOS_DE_COLOR}) con el dominante al ${pixel.dominante} %: eso es el fondo liso de la pagina, no una pantalla con contenido (y=${yDespues})`,
            );
        else if (pixel.dominante > MAX_DOMINANTE_DEL_VIEWPORT)
            motivos.push(
                `a ${donde} un solo cubo de color ocupa el ${pixel.dominante} % del viewport bajo la barra (techo ${MAX_DOMINANTE_DEL_VIEWPORT} %), con ${pixel.cubos} cubos (y=${yDespues})`,
            );
    }
    if (atascados.length)
        motivos.push(
            `a ${donde} quedan ${atascados.length} piezas en data-revealed="false" con el umbral de su propio observador ya cruzado: ${atascados
                .map(
                    (a) =>
                        `${a.nombre} ratio=${a.ratio} top=${a.top} opacidad=${a.opacidad}`,
                )
                .join(", ")}`,
        );
    if (deck && deck.aplicable && !deck.avanza)
        motivos.push(
            `a ${donde} el escenario ${deck.nombre} sigue fijado en pantalla y no avanza al rodar ${deck.recorrido} px: data-slide ${deck.serie.join(",")} y progreso ${deck.progresos.join(",")}`,
        );
    return { cumple: motivos.length === 0, motivos };
}

/**
 * Conduce el navegador para UNA combinacion y devuelve lo que
 * `evaluaConmutacionDeTema` necesita. Exportada para poder correr esta familia
 * SOLA contra un build servido: la corrida completa pasa de diez minutos por
 * tema.
 */
export async function mideConmutacionDeTema(browser, theme, url, gesto) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: 1440, height: 900 },
        reducedMotion: gesto.reduce,
    });
    try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        /* La portada asienta su composicion despues de `networkidle`: la misma
           espera, y por el mismo motivo, que las familias vecinas. */
        await page.waitForTimeout(2200);
        /* RUEDA REAL y no `scrollTo`: la correccion del punto de lectura se
           alimenta de donde el lector estaba leyendo, y un salto instantaneo
           no deja el mismo rastro que doce muescas seguidas. */
        for (let i = 0; i < gesto.pasos; i += 1) {
            await page.mouse.wheel(0, PASO_DE_RUEDA_PX);
            await page.waitForTimeout(220);
        }
        await page.waitForTimeout(1200);
        const antes = await page.evaluate(() => ({
            y: Math.round(window.scrollY),
            tema: document.documentElement.dataset.theme,
        }));

        /* `$$` y filtro por caja visible, no `$`: `querySelector` devuelve el
           PRIMER nodo, que puede ser el de una barra oculta (trampa ya pagada
           en este repo). Clic REAL, por el mismo camino que una persona: fijar
           el tema por `localStorage` NO reproduce el gesto -- lo que rompe la
           pagina es la correccion del punto de lectura que solo dispara el
           conmutador. */
        let boton = null;
        for (const c of await page.$$("[data-theme-toggle] button")) {
            if (await c.boundingBox()) {
                boton = c;
                break;
            }
        }
        if (!boton)
            return {
                gesto,
                temaAntes: antes.tema,
                temaDespues: antes.tema,
                yAntes: antes.y,
                yDespues: antes.y,
                alto: 900,
                pixel: { cubos: 0, dominante: 100 },
                atascados: [],
                deck: null,
            };
        await boton.click();
        /* Cinco segundos: la correccion del punto de lectura llega en ~150 ms
           y las entradas de revelado duran menos de un segundo. Se mide el
           estado ASENTADO, no el transitorio. */
        await page.waitForTimeout(5000);

        const despues = await page.evaluate(() => {
            const barra = document.querySelector("header");
            return {
                y: Math.round(window.scrollY),
                tema: document.documentElement.dataset.theme,
                yBarra: barra
                    ? Math.round(barra.getBoundingClientRect().bottom)
                    : 0,
                alto: window.innerHeight,
            };
        });
        const vp = page.viewportSize();
        const captura = await page.screenshot({
            clip: {
                x: 0,
                y: despues.yBarra,
                width: vp.width,
                height: vp.height - despues.yBarra,
            },
        });
        const pixel = await page.evaluate(probeHistogramaDelViewport, {
            imagen: `data:image/png;base64,${captura.toString("base64")}`,
        });
        const atascados = await page.evaluate(probeRevelosAtascados, {
            umbral: UMBRAL_DECLARADO_DE_REVELADO,
            recorte: RECORTE_INFERIOR_DEL_REVELADO,
        });

        /* Medida 3, solo al LLEGAR al tema oscuro (el unico que monta deck) y
           solo sin `reduce`: bajo `reduce` la presentacion se desmonta como tal
           por diseno (D6 de `useSlideDeck`), asi que exigirle que avance seria
           exigir lo contrario de lo declarado. */
        let deck = null;
        if (despues.tema === "dark" && gesto.reduce !== "reduce") {
            const muestras = [await page.evaluate(probeEscenariosDelDeck)];
            for (let i = 0; i < PASOS_DE_PISTA_TRAS_CONMUTAR; i += 1) {
                await page.mouse.wheel(0, PASO_DE_PISTA_TRAS_CONMUTAR_PX);
                await page.waitForTimeout(400);
                muestras.push(await page.evaluate(probeEscenariosDelDeck));
            }
            deck = evaluaEscenariosFijados(muestras);
        }

        return {
            gesto,
            temaAntes: antes.tema,
            temaDespues: despues.tema,
            yAntes: antes.y,
            yDespues: despues.y,
            alto: despues.alto,
            pixel,
            atascados,
            deck,
        };
    } finally {
        await ctx.close();
    }
}

/**
 * FAMILIA VEINTINUEVE, `revelado-sin-banda-ciega` (segundo defecto de revelado
 * de la critica externa #21, ola U, 2026-09-08). Es la que la familia
 * veinticinco dejaba fuera A PROPOSITO, con la nota «pendiente de decision del
 * dueno» que este bloque borra: la decision se tomo el 2026-09-08 (umbral
 * consciente de la altura, `src/hooks/useReveal.ts`).
 *
 * EL INVARIANTE, en una frase: ninguna pieza de copia apagada
 * (`data-revealed="false"`) puede asomar por encima de la LINEA DEL
 * `rootMargin` --el 88 % superior del viewport-- mas que el tope que el hook
 * promete. El 88 % y no el 100 % porque la franja de abajo es diseno declarado
 * (el adelanto perceptivo del 12 %, docblock D7 de `useReveal`); el tope y no
 * cero porque un umbral de area positivo siempre cuesta algunos pixeles, y lo
 * que el arreglo garantiza es que esos pixeles no dependan del tamano de la
 * pieza.
 *
 * EL DEFECTO QUE NACE PARA VER, medido sobre el build de `f7ab6f2` servido en
 * local (`/`, es, tema claro, SIN `reduce`, 1440x900, estado asentado a los 5 s)
 * por los aterrizajes `?read=R#seccion` que el propio sitio compone al cambiar
 * de idioma. La ultima columna es el porcentaje del texto del viewport que esta
 * en el DOM y no se pinta:
 *
 *     /?read=0.50#features  Contact ScCard        top 771 h 944 ratio 0,0218  35,5 %
 *     /?read=0.55#features  Contact ScCard        top 705 h 944 ratio 0,0918  37,1 %
 *     /?read=0.60#features  Contact ScCard        top 640 h 944 ratio 0,1606  38,7 %
 *     /?read=0.25#story     Story ScStatementText top 753 h 376 ratio 0,1033  44,1 %
 *     /?read=0.45#contact   About ScInner         top 737 h 390 ratio 0,1406  54,1 %
 *
 * y en el tema oscuro, con las mismas URL y otro reparto de secciones:
 *
 *     /?read=0.20#features  Contact ScDarkContent top 726 h 886 ratio 0,0744  solape 66
 *     /?read=0.25#features  Contact ScDarkContent top 628 h 886 ratio 0,1850  solape 164
 *     /?read=0.30#contact   About ScInner         top 776 h 390 ratio 0,0401  solape 16
 *     /?read=0.35#contact   About ScInner         top 728 h 390 ratio 0,1630  solape 64
 *
 * La escalera de ratios cruza exactamente en el 0,2 que `useReveal` pedia: para
 * que el ratio llegue a 0,2 hacen falta `0,2 * alto` px de la pieza dentro de la
 * ventana, o sea 189 px en una tarjeta de 944, y en toda esa banda la pieza esta
 * en pantalla y apagada. Y como el contrato de `IntersectionObserver` solo habla
 * al CRUZAR el umbral, quedarse ahi quieto no lo repara.
 *
 * NO ES SOLO DE PIEZAS MAS ALTAS QUE LA VENTANA: dos de los cinco casos claros
 * son piezas de 376 y 390 px, menos de la mitad de la ventana de 792.
 *
 * LOS DOS AVISOS DEL AGUJERO QUE LA FAMILIA VEINTICINCO NO PODIA VER. Su medida
 * 2 (`probeRevelosAtascados`) exige `ratio >= umbral` y estos casos estan por
 * DEBAJO del umbral: los excluia por construccion. Y la razon de que un ratio
 * bajo sea igualmente un defecto es geometrica, no de contabilidad -- la pieza
 * asoma por encima de la linea, que es lo que esta familia mide.
 *
 * SIN `reduce`, Y NO ES UN CAPRICHO: las guardas CSS de revelado del repo son
 * `@media (prefers-reduced-motion: reduce) { opacity: 1 }` sin calificar por
 * `data-revealed`, asi que con la preferencia puesta la maquina de estados se
 * atasca igual y la piel accesible lo TAPA. Medir aqui con `reduce` seria medir
 * la tapa.
 *
 * LAS DOS MITADES DE LA FAMILIA, y por que ninguna sobra:
 *
 *   A. LOS ATERRIZAJES (`ATERRIZAJES_DE_LA_BANDA_CIEGA`): las URL exactas por
 *      las que la critica llego, con sus cifras arriba. Son deterministas y
 *      reproducen el camino de un lector real que cambia de idioma. Su limite:
 *      estan calibrados sobre una geometria concreta -- al medir los mismos
 *      valores de R a 1280x720 la banda aparece en OTROS (0,65 en `#features`,
 *      0,55 y 0,60 en `#contact`), asi que una lista de R fija no viaja.
 *
 *   B. LA PASADA DE PUNTERIA (`GEOMETRIAS_DE_LA_BANDA_CIEGA`): la que si viaja.
 *      Lee del DOM VIVO todos los objetivos de revelado, calcula para cada uno
 *      el desplazamiento que lo deja asomando `ASOMO_DE_LA_PUNTERIA` veces el
 *      tope por encima de la linea, y comprueba ahi. No hay ninguna cifra de la
 *      geometria de hoy en esa cuenta: si manana el sitio gana una pieza o
 *      cambia de alto, la pasada apunta sola. Se visitan las paradas de ABAJO
 *      ARRIBA para que ninguna pieza se revele en la parada de otra (`once:
 *      true` no se deshace), y cada parada verifica que dejo al objetivo
 *      asomando lo pedido antes de juzgar nada.
 *
 * LA CALIBRACION DE `ASOMO_DE_LA_PUNTERIA`, con las dos direcciones medidas:
 * con el umbral fijo de 0,2 una pieza sigue apagada mientras asome menos de
 * `0,2 * alto`, o sea 33 px la mas pequena del censo (`Journey ScStepsRow`, 165
 * px) y 1.215 px la mas grande (`Story ScGrid` a 390x844 con la raiz a 32,
 * 6.073 px). Con el arreglo, ninguna pieza puede seguir apagada asomando mas de
 * `1 %` de la ventana (9 px a 900). Apuntar a tres veces el tope --27 px a
 * 900-- cae en medio de los dos regimenes: por debajo de la banda mas pequena
 * que el defecto produce y por encima de lo que el arreglo permite, con un
 * factor 3 por un lado y 1,2 por el otro.
 *
 * EL MODO DE FALLO QUE NO VE, declarado: una pieza que se queda apagada ENTERA
 * por debajo de la linea. Es exactamente la franja del `rootMargin`, y es
 * diseno: medido, `/?read=0.40#contact` deja el 45,4 % del texto del viewport
 * sin pintar con la pieza integra bajo la linea, y esta familia lo da por bueno
 * a proposito. `/?read=0.45#features` esta en la lista de aterrizajes por eso
 * mismo: es el CONTROL POSITIVO del diseno declarado y tiene que salir verde
 * antes y despues del arreglo.
 */
export const TOPE_DEL_RETRASO_DEL_UMBRAL = 0.01;

/**
 * Holgura subpixel, el mismo numero y por el mismo motivo que en la familia de
 * la tinta: las cajas del navegador vienen con decimales y el hook admite un
 * pixel de deriva antes de rehacer el observador (`HOLGURA_DE_RECALCULO_PX`).
 * Las bandas que esta familia existe para cazar se miden en decenas de px.
 */
export const HOLGURA_DE_LA_BANDA_CIEGA_PX = 2;

/** Multiplo del tope al que la pasada de punteria deja asomar cada pieza. */
export const ASOMO_DE_LA_PUNTERIA = 3;

/**
 * Las dos geometrias de la pasada de punteria: la medida y la extrema. La
 * segunda cambia A LA VEZ el ancho y la raiz de fuente, y no es un capricho --
 * es donde el censo encontro el caso peor de todos: `Story ScGrid` mide 6.073 px
 * ahi, la ventana del observador 743, y el ratio MAXIMO posible es 0,1223, por
 * debajo del 0,2 que se pedia. Ese umbral no se cruzaba NUNCA y la rejilla de
 * pilares no se revelaba jamas.
 */
export const GEOMETRIAS_DE_LA_BANDA_CIEGA = [
    { ancho: 390, alto: 844, raiz: 32 },
];

/**
 * La geometria en la que se midieron los aterrizajes, y en la que corren. No es
 * la misma que la de la pasada de punteria a proposito: los valores de R de un
 * aterrizaje SI estan calibrados sobre una geometria concreta --a 1280x720 la
 * misma banda aparece en R=0,65 en vez de en 0,50-- y moverlos de sitio los
 * dejaria midiendo un tramo de pagina cualquiera.
 */
export const GEOMETRIA_DE_LOS_ATERRIZAJES = {
    ancho: 1440,
    alto: 900,
    raiz: 16,
};

/**
 * Los aterrizajes por tema, con la seccion de destino y la fraccion de lectura.
 * Son las URL medidas arriba; corren en la geometria en que se midieron
 * (`GEOMETRIAS_DE_LA_BANDA_CIEGA[0]`) y solo sobre la portada en espanol -- la
 * inglesa la cubre la pasada de punteria, que no depende del idioma, y repetir
 * seis cargas por una diferencia de longitud de texto seria coste sin criterio.
 */
export const ATERRIZAJES_DE_LA_BANDA_CIEGA = {
    light: [
        { destino: "features", read: 0.45 },
        { destino: "features", read: 0.5 },
        { destino: "features", read: 0.55 },
        { destino: "features", read: 0.6 },
        { destino: "story", read: 0.25 },
        { destino: "contact", read: 0.45 },
    ],
    dark: [
        { destino: "features", read: 0.2 },
        { destino: "features", read: 0.25 },
        { destino: "contact", read: 0.3 },
        { destino: "contact", read: 0.35 },
    ],
};

/**
 * Guarda de vacuidad: cuantos objetivos de revelado tiene que ver la sonda para
 * que su verde signifique algo. La portada clara monta 12 y la oscura 5; cuatro
 * es un suelo que ninguna de las dos puede cruzar sin que el sitio haya perdido
 * medio revelado.
 */
export const OBJETIVOS_MINIMOS_DE_REVELADO = 4;

/**
 * Espera tras cada peldano, para que el observador entregue. Una entrega de
 * `IntersectionObserver` llega en el siguiente fotograma; 260 ms son quince, y
 * el coste se paga una vez por peldano.
 */
export const ESPERA_DE_LA_PARADA_MS = 260;

/**
 * Cuantos peldanos como mucho. La escalera arranca tres peldanos POR DEBAJO de
 * la estimacion --el margen que absorbe el error de parallax de la estimacion,
 * medido en 12-16 px-- y tiene que llegar a tres por encima, asi que seis son
 * el recorrido nominal y diez dejan sitio a una pieza que se mueva a un ritmo
 * distinto del scroll.
 */
export const PELDANOS_DE_LA_ESCALERA = 12;

/**
 * Peldanos por debajo de la estimacion en los que arranca la escalera. Cinco
 * (45 px a 900) dejan la pieza claramente por DEBAJO de la linea en el primer
 * peldano incluso con el error de parallax de la estimacion, que es lo que hace
 * fiable la deteccion de contaminacion: una pieza revelada en el peldano cero
 * es una pieza que ya venia revelada.
 */
export const PELDANOS_DE_ARRANQUE = 5;

/**
 * Cuantas piezas tiene que llegar a JUZGAR la pasada de punteria para que su
 * verde signifique algo. Una pieza alta sigue intersecando durante la parada de
 * su vecina, asi que se revela antes de que le toque su escalera y esa lectura
 * no la juzga: es contaminacion inevitable en una sola carga, y lo que se hace
 * con ella es contarla y declararla, no disimularla. Tres es el suelo: por
 * debajo de eso la pasada no esta mirando el sitio.
 */
export const JUZGADAS_MINIMAS_DE_LA_PUNTERIA = 3;

/**
 * Copia apagada que asoma por encima de la linea. Corre en la pagina.
 *
 * LLEVAR COPIA es la condicion que separa un defecto de una decoracion: la
 * costura de `SectionBeam` mide 2 px y no tiene una sola letra, asi que su
 * `data-revealed="false"` no le quita nada a nadie. Sin ese filtro la familia
 * nacia acusando a una pieza que no puede tener el defecto.
 *
 * Los nodos de texto se RECOGEN antes de recorrerlos (leccion del 2026-09-08:
 * un `TreeWalker` cuyo avance vive dentro del cuerpo se cuelga en cuanto una
 * rama se olvida de escribirlo).
 */
export function probeCopiaApagadaSobreLaLinea({ recorte, tope, holgura }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const linea = vh * (1 - recorte);
    const topePx = tope * vh + holgura;
    const nombreDe = (el) =>
        (el.className || "")
            .toString()
            .split(/\s+/)[0]
            .replace(/-sc-.*/, "") || el.tagName.toLowerCase();

    const llevaCopia = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodos = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) nodos.push(n);
        for (const nodo of nodos) {
            if (!(nodo.textContent || "").trim()) continue;
            const padre = nodo.parentElement;
            if (!padre) continue;
            const cs = getComputedStyle(padre);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            const caja = padre.getBoundingClientRect();
            /* La caja de 1x1 es la de `VisuallyHidden`: texto que existe para
               un lector de pantalla y no ocupa pantalla. */
            if (caja.width <= 1 && caja.height <= 1) continue;
            return true;
        }
        return false;
    };

    const solapeCon = (r) =>
        Math.max(0, Math.min(linea, r.bottom) - Math.max(0, r.top));

    const todos = [...document.querySelectorAll("[data-revealed]")];
    const acusados = [];
    let examinados = 0;
    let sinCopia = 0;
    for (const el of todos) {
        if (el.getAttribute("data-revealed") !== "false") continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const dentro = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left));
        const solape = solapeCon(r);
        if (dentro <= 0 || solape <= 0) continue;
        examinados += 1;
        if (!llevaCopia(el)) {
            sinCopia += 1;
            continue;
        }
        if (solape <= topePx) continue;
        acusados.push({
            nombre: nombreDe(el),
            top: Math.round(r.top),
            alto: Math.round(r.height),
            solape: Math.round(solape),
            ratio: Number(
                ((dentro * solape) / Math.max(1, r.width * r.height)).toFixed(
                    4,
                ),
            ),
        });
    }

    return {
        y: Math.round(window.scrollY),
        vh,
        linea: Math.round(linea),
        topePx: Number(topePx.toFixed(2)),
        objetivos: todos.length,
        examinados,
        sinCopia,
        acusados,
    };
}

/**
 * Los objetivos de revelado del DOM vivo con la parada que deja a cada uno
 * asomando `asomoPx` por encima de la linea. Corre en la pagina.
 *
 * `indice` es la posicion en el orden del documento, que es estable durante la
 * corrida: sirve para volver a preguntar por ESE nodo al llegar a su parada.
 */
export function probeParadasDeRevelado({ recorte, asomoPx }) {
    const vh = window.innerHeight;
    const linea = vh * (1 - recorte);
    const nombreDe = (el) =>
        (el.className || "")
            .toString()
            .split(/\s+/)[0]
            .replace(/-sc-.*/, "") || el.tagName.toLowerCase();
    const salida = [];
    const todos = [...document.querySelectorAll("[data-revealed]")];
    for (let i = 0; i < todos.length; i += 1) {
        const r = todos[i].getBoundingClientRect();
        if (r.height <= 0 || r.width <= 0) continue;
        salida.push({
            indice: i,
            nombre: nombreDe(todos[i]),
            alto: Math.round(r.height),
            y: Math.round(window.scrollY + r.top - (linea - asomoPx)),
        });
    }
    return {
        paradas: salida,
        vh,
        linea: Math.round(linea),
        maximo: Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight,
        ),
    };
}

/** Estado del objetivo `indice` en la posicion actual. Corre en la pagina. */
export function probeObjetivoEnLaParada({ indice, recorte }) {
    const vh = window.innerHeight;
    const linea = vh * (1 - recorte);
    const el = document.querySelectorAll("[data-revealed]")[indice];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
        revelado: el.getAttribute("data-revealed"),
        top: Math.round(r.top),
        alto: Math.round(r.height),
        asomo: Math.round(
            Math.max(0, Math.min(linea, r.bottom) - Math.max(0, r.top)),
        ),
    };
}

/**
 * Veredicto sobre todas las lecturas de la familia. Puro y exportado para que
 * la suite lo ejercite sin navegador: la sonda necesita layout real y jsdom no
 * lo tiene, pero la REGLA -- que una pieza de copia apagada asomando por encima
 * de la linea es un fallo, que una parada que no dejo al objetivo donde queria
 * no habla del sitio, y que cero objetivos vistos es vacuidad -- se afirma
 * aqui.
 */
export function evaluaBandaCiega({
    lecturas,
    objetivosMinimos,
    asomoPedidoPx,
}) {
    const fallos = [];
    const instrumento = [];
    let objetivosVistos = 0;
    let apuntadas = 0;
    let juzgadas = 0;
    let contaminadas = 0;
    for (const lectura of lecturas) {
        objetivosVistos = Math.max(objetivosVistos, lectura.objetivos ?? 0);
        if (lectura.apuntada) {
            apuntadas += 1;
            if (lectura.motivoDeParada === "revelado-antes-de-empezar") {
                contaminadas += 1;
                continue;
            }
            juzgadas += 1;
            /* La escalera solo puede terminar de dos maneras honradas: con la
               pieza revelada, o con ella asomando lo que se le pidio y sin
               revelar. Cualquier otro final --que no se pueda desplazar hasta
               ahi, o que la escalera se agote sin llegar-- es una lectura que
               no responde a la pregunta, y se dice en vez de contarla como
               verde. */
            if (
                lectura.motivoDeParada !== "revelado" &&
                lectura.motivoDeParada !== "asomo"
            ) {
                instrumento.push(
                    `${lectura.id}: la escalera termino por "${lectura.motivoDeParada}" con el objetivo asomando ${lectura.asomoReal} px de los ${Math.round(asomoPedidoPx)} pedidos: esa lectura no responde a la pregunta`,
                );
                continue;
            }
        }
        for (const a of lectura.acusados ?? [])
            fallos.push(
                `${lectura.id}: ${a.nombre} sigue apagada asomando ${a.solape} px por encima de la linea del -12 % (tope ${lectura.topePx} px), con top=${a.top} alto=${a.alto} ratio=${a.ratio}`,
            );
    }
    if (!lecturas.length)
        instrumento.push(
            "la familia de banda ciega no llego a tomar ni una lectura: sin paradas no se midio nada y el verde seria vacuo",
        );
    if (objetivosVistos < objetivosMinimos)
        instrumento.push(
            `la sonda solo vio ${objetivosVistos} objetivos de revelado en toda la corrida (suelo ${objetivosMinimos}): o el selector dejo de encontrarlos o el sitio perdio sus revelados, y en los dos casos el verde seria vacuo`,
        );
    if (juzgadas < JUZGADAS_MINIMAS_DE_LA_PUNTERIA)
        instrumento.push(
            `la pasada de punteria solo llego a juzgar ${juzgadas} pieza(s) (suelo ${JUZGADAS_MINIMAS_DE_LA_PUNTERIA}, con ${contaminadas} ya reveladas antes de que les tocara): la mitad que no depende de la geometria de hoy no se ejercito`,
        );
    return {
        fallos,
        instrumento,
        apuntadas,
        juzgadas,
        contaminadas,
        objetivosVistos,
    };
}

/** Una carga con su URL de aterrizaje, medida en el estado asentado. */
export async function mideAterrizajeDeRevelado(
    browser,
    theme,
    url,
    aterrizaje,
) {
    const geometria = GEOMETRIA_DE_LOS_ATERRIZAJES;
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: geometria.ancho, height: geometria.alto },
        reducedMotion: "no-preference",
        deviceScaleFactor: 1,
    });
    try {
        const page = await ctx.newPage();
        const destino = `${url}?read=${aterrizaje.read}#${aterrizaje.destino}`;
        await page.goto(destino, { waitUntil: "networkidle" });
        /* Cinco segundos: la llegada aplica el punto de lectura con un rAF
           anidado y las entradas de revelado duran menos de un segundo. Se mide
           el estado ASENTADO, no el transitorio. */
        await page.waitForTimeout(5000);
        const lectura = await page.evaluate(probeCopiaApagadaSobreLaLinea, {
            recorte: RECORTE_INFERIOR_DEL_REVELADO,
            tope: TOPE_DEL_RETRASO_DEL_UMBRAL,
            holgura: HOLGURA_DE_LA_BANDA_CIEGA_PX,
        });
        return {
            id: `aterrizaje ?read=${aterrizaje.read}#${aterrizaje.destino} @${geometria.ancho}x${geometria.alto} raiz ${geometria.raiz}`,
            apuntada: false,
            ...lectura,
        };
    } finally {
        await ctx.close();
    }
}

/**
 * La pasada de punteria de UNA geometria: una sola carga y una parada por
 * objetivo, de abajo arriba.
 */
export async function midePunteriaDeRevelado(browser, theme, url, geometria) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: geometria.ancho, height: geometria.alto },
        reducedMotion: "no-preference",
        deviceScaleFactor: 1,
    });
    try {
        const page = await ctx.newPage();
        const sesion = await ctx.newCDPSession(page);
        await sesion.send("Page.setFontSizes", {
            fontSizes: { standard: geometria.raiz, fixed: geometria.raiz },
        });
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(2500);

        const asomoPx =
            ASOMO_DE_LA_PUNTERIA * TOPE_DEL_RETRASO_DEL_UMBRAL * geometria.alto;
        const plan = await page.evaluate(probeParadasDeRevelado, {
            recorte: RECORTE_INFERIOR_DEL_REVELADO,
            asomoPx,
        });
        const lecturas = [];
        /*
         * DE ARRIBA ABAJO, y el orden importa mas de lo que parece: una pieza
         * alta interseca la ventana desde MUY por debajo de donde empieza, asi
         * que visitando al reves se revelaba en la parada de una vecina de mas
         * abajo antes de que le tocara su escalera (medido: `About ScInner`,
         * 2.054 px, llegaba revelada a la suya por la parada de la costura del
         * pie, 2.246 px mas abajo). Bajando, una pieza que todavia no ha salido
         * por debajo del viewport no puede intersecar nada.
         */
        const paradas = plan.paradas
            .filter((p) => p.y >= 0 && p.y <= plan.maximo)
            .sort((a, b) => a.y - b.y);
        const paso = Math.max(
            4,
            Math.round(TOPE_DEL_RETRASO_DEL_UMBRAL * geometria.alto),
        );
        for (const parada of paradas) {
            /*
             * LA ESCALERA SE SUBE DESDE ABAJO, y ese detalle es la diferencia
             * entre un candado y un adorno. Colocar la pieza de un salto en el
             * asomo pedido no vale: la portada tiene parallax --las cajas se
             * mueven a un ritmo distinto del scroll-- asi que el salto cae
             * donde cae, y CORREGIRLO con un segundo salto puede pasarse de
             * largo y REVELAR la pieza por el camino, con lo que la lectura
             * final saldria verde sin haber medido nada. Subiendo en peldanos
             * del tamano del tope, desde una posicion en la que la pieza esta
             * por debajo de la linea, no hay forma de pasarse: en cada peldano
             * se mide el asomo REAL y se para en cuanto la pieza se revela o
             * en cuanto asoma lo pedido.
             */
            let y = parada.y - PELDANOS_DE_ARRANQUE * paso;
            let objetivo = null;
            let motivoDeParada = "sin-convergencia";
            let peldanosSubidos = 0;
            /* Una pieza mas baja que el asomo pedido no puede asomar tanto:
               su techo es su propia altura, con ella entera por encima de la
               linea. */
            const pedido = Math.min(asomoPx, parada.alto);
            for (
                let peldano = 0;
                peldano < PELDANOS_DE_LA_ESCALERA;
                peldano += 1
            ) {
                if (y < 0 || y > plan.maximo) {
                    motivoDeParada = "fuera-de-alcance";
                    break;
                }
                /* `behavior: "instant"` y no `scrollTo(0, y)` a secas: el repo
                   declara `scroll-behavior: smooth` en el documento, y un
                   barrido suave hace pasar a la pieza POR TODA su banda -- se
                   revelaria por el camino. */
                await page.evaluate(
                    (destino) =>
                        window.scrollTo({ top: destino, behavior: "instant" }),
                    y,
                );
                await page.waitForTimeout(ESPERA_DE_LA_PARADA_MS);
                objetivo = await page.evaluate(probeObjetivoEnLaParada, {
                    indice: parada.indice,
                    recorte: RECORTE_INFERIOR_DEL_REVELADO,
                });
                if (!objetivo) {
                    motivoDeParada = "sin-objetivo";
                    break;
                }
                if (objetivo.revelado === "true") {
                    /* Revelada YA en el primer peldano, con la pieza todavia
                       por debajo de la linea: no se ha revelado por lo que esta
                       escalera hizo, sino antes -- en la carga o en la parada
                       de una vecina mas alta que seguia intersecando. Esa
                       lectura no juzga a esta pieza y no se cuenta como si lo
                       hiciera. */
                    motivoDeParada =
                        peldano === 0
                            ? "revelado-antes-de-empezar"
                            : "revelado";
                    break;
                }
                if (objetivo.asomo >= pedido) {
                    motivoDeParada = "asomo";
                    break;
                }
                y += paso;
                peldanosSubidos += 1;
            }
            const lectura = await page.evaluate(probeCopiaApagadaSobreLaLinea, {
                recorte: RECORTE_INFERIOR_DEL_REVELADO,
                tope: TOPE_DEL_RETRASO_DEL_UMBRAL,
                holgura: HOLGURA_DE_LA_BANDA_CIEGA_PX,
            });
            lecturas.push({
                id: `punteria ${parada.nombre}(h=${parada.alto}) @${geometria.ancho}x${geometria.alto} raiz ${geometria.raiz}`,
                apuntada: true,
                motivoDeParada,
                peldanos: peldanosSubidos,
                asomoReal: objetivo ? objetivo.asomo : 0,
                revelado: objetivo ? objetivo.revelado : null,
                ...lectura,
            });
        }
        return { lecturas, asomoPx, planeadas: plan.paradas.length };
    } finally {
        await ctx.close();
    }
}

/**
 * LA FAMILIA VEINTISEIS (2026-09-08), EL P0 DE LA CRITICA #21, Y POR QUE
 * NINGUNA DE LAS VEINTICINCO ANTERIORES PODIA VERLA.
 *
 * EL DEFECTO, medido sobre el build de `6ce08ee` servido en local: se carga la
 * portada, se pulsa un enlace de SECCION de la barra --que es un `<a
 * href="/#contact">` nativo, no un `next/link`--, se pulsa un enlace legal del
 * pie y se pulsa ATRAS. La barra de direcciones vuelve a `/#contact` y en
 * pantalla sigue el aviso legal. Doce combinaciones rotas, las mismas cifras en
 * los dos temas:
 *
 *   barra@1440 claro   atras -> url=/#contact  h1="Aviso legal"  hero=no  docH=5308
 *                            (la portada media h1="VoidToInfinite" hero=si docH=6588)
 *   hoja@390   claro   atras -> url=/#contact  h1="Aviso legal"  hero=no  docH=6862
 *   cta-hero   claro   atras -> url=/#story    h1="Aviso legal"  hero=no  docH=5308
 *   barra@1440 oscuro  atras -> url=/#contact  h1="Aviso legal"  hero=no  docH=5308
 *                            (la portada oscura media docH=11008)
 *   indice legal       atras -> url=/aviso-legal#registro  h1="Politica de
 *                            privacidad"  docH=8817
 *
 * LA CAUSA, que no esta en el sitio: `onPopState` de
 * `next@16.2.11`
 * (`node_modules/next/dist/client/components/app-router.js:284-298`) hace
 * `return` sin hacer nada cuando `event.state` es nulo, y una navegacion de
 * fragmento NATIVA --la que hace el navegador al pulsar un `<a href="#x">`--
 * crea una entrada de historial con `history.state === null` por
 * especificacion, sin pasar por el router. Viajar a esa entrada no cambia el
 * arbol renderizado: la URL se mueve y el documento no. El arreglo del sitio
 * (`useHashHistorySeal`) SELLA esa entrada en cuanto nace, para que la entrada
 * a la que se vuelve lleve el estado que el router sabe restaurar.
 *
 * POR QUE ES UNA FAMILIA NUEVA Y NO UN CASO DE OTRA. Ninguna de las
 * veinticinco anteriores navega HACIA OTRA RUTA ni pulsa atras: todas miden una
 * pagina, o un gesto dentro de una pagina. `aterrizaje-del-indice` pulsa anclas
 * del indice legal --las mismas que crean el defecto-- y mide donde aterriza el
 * scroll, que sigue siendo correcto; el defecto solo se hace visible DESPUES,
 * al salir y volver.
 *
 * POR QUE NO PUEDE SER UN TEST DE VITEST: jsdom no monta el App Router de Next
 * ni su manejador de `popstate`, asi que un test unitario solo puede afirmar
 * que el hook llama a `replaceState` --util como segunda linea, inutil como
 * detector--. Y el riesgo residual del arreglo es justamente que Next cambie su
 * parche de `replaceState` y el sello deje de sellar EN SILENCIO, asi que esta
 * familia mide el GESTO COMPLETO con clics reales y no la existencia del
 * listener.
 *
 * LAS DOS AFIRMACIONES QUE IMPIDEN QUE APRUEBE POR CASUALIDAD, y que valen
 * tanto como la del documento restituido:
 *
 *   1. LA ENTRADA QUEDO SELLADA (`history.state?.__NA === true`) tras activar
 *      el ancla. Detecta que el sello se perdio aunque el gesto salga verde por
 *      otra via (una recarga, un temporizador, otra rama del manejador).
 *   2. LA NAVEGACION A LA RUTA SIGUIENTE FUE BLANDA -- un centinela puesto en
 *      `window` que solo sobrevive si el documento NO se recargo. Impide
 *      "aprobar" el candado matando la navegacion blanda, que seria endurecer
 *      los enlaces internos (la opcion C del diagnostico) por la puerta de
 *      atras y sin decision del dueno. Por el mismo motivo se exige que el
 *      centinela siga vivo DESPUES del atras: recargar en `popstate` (la
 *      opcion D) tambien "arregla" el sintoma, y tambien es una decision que no
 *      es de quien escribe el parche.
 *
 * LOS TRES CONTROLES POSITIVOS, verdes HOY y obligados a seguirlo, son lo que
 * demuestra que la familia distingue el caso roto del sano en vez de tenir de
 * rojo cualquier atras. Los tres salen VERDES sobre el build defectuoso, en la
 * misma corrida en la que los otros diez gestos salen rojos:
 *
 *   - `control-carga-fragmento`: el MISMO destino de fragmento, pero creado por
 *     CARGA COMPLETA (`/#contact` en la barra de direcciones) en vez de por
 *     clic. Ahi Next sella la entrada al montar y el atras siempre funciono.
 *     Cambia UNA sola variable respecto del caso roto -- quien creo la entrada.
 *   - `control-cruce-de-idioma`: el mismo ancla por clic, pero la salida cruza
 *     a la otra rama de idioma, que es OTRA RAIZ DE DOCUMENTO (la entrega del
 *     2026-09-06: dos `<html lang>` exigen dos raices). La navegacion es dura,
 *     el router se monta de cero al volver y el defecto no aparece. Lo que
 *     distingue aqui los dos documentos no es el `h1` --las dos portadas lo
 *     comparten-- sino el `lang`, y por eso la instantanea lo lee.
 *   - `control-404`: en la 404 el salto a la legal tambien es una navegacion
 *     DURA (`global-not-found` renderiza su propio documento raiz), y sin
 *     navegacion blanda no hay defecto. Medido: el centinela se pierde ahi y en
 *     el cruce de idioma, y en ningun otro gesto.
 */
export const VIEWPORTS_DE_ATRAS = [
    { ancho: 1440, alto: 900 },
    { ancho: 390, alto: 844 },
];

/**
 * Cuanto se le da al documento para volver a ser el de su URL despues del
 * atras. No es un tiempo de cortesia: el orquestador midio el estado congelado
 * a 1,2 / 1,5 / 5 / 6 / 7,5 s, asi que el defecto no es lentitud y ninguna
 * espera lo salva. Es el tope de una espera que TERMINA EN CUANTO ACIERTA, de
 * modo que una corrida sana no paga estos tres segundos y una rota los paga
 * enteros -- que es el reparto correcto para un candado que se ejecuta cientos
 * de veces en verde y una en rojo.
 */
export const VENTANA_DE_RESTITUCION_MS = 3000;

/**
 * Margen del alto de documento al comparar el antes y el despues del atras.
 * El alto es la TERCERA senal, detras del `h1` y del landmark, y esta para el
 * caso en el que dos documentos comparten titulo: entre la portada y una legal
 * la diferencia medida es del 19 % en claro (6588 -> 5308) y del 52 % en oscuro
 * (11008 -> 5308), y entre las dos legales del 40 % (5308 -> 8817), asi que un
 * 10 % separa las dos poblaciones con holgura sin volverse quisquilloso con el
 * crecimiento tardio de una imagen.
 */
export const TOLERANCIA_DE_ALTO_TRAS_ATRAS = 0.1;

/**
 * Los gestos de una superficie, DERIVADOS de ella y de `LEGAL_DOCS` en vez de
 * tecleados: si manana nace un tercer documento legal o una tercera rama de
 * idioma, sus gestos entran solos y con el destino correcto.
 *
 * El eje de ANCHURA no es decorativo en la portada: a 1440 el ancla de seccion
 * la sirve la fila de la barra y a 390 la sirve la hoja movil, que hay que
 * abrir primero -- dos nodos distintos del DOM para el mismo destino. En las
 * legales el indice es el mismo elemento a las dos anchuras, asi que ahi la
 * segunda anchura mediria dos veces lo mismo y el gesto se da una sola vez.
 */
export function gestosDeAtras(surface) {
    const [grande, movil] = VIEWPORTS_DE_ATRAS;
    if (surface.kind === "home") {
        const avisoLegal = LEGAL_DOCS.find((d) => d.id === "legalNotice")[
            surface.locale
        ];
        /* `/#contact` en la rama espanola y `/en#contact` en la inglesa: la
           forma canonica que hornea `src/config/navigation.ts`. */
        const seccion = `${surface.path}#contact`;
        const haciaLaLegal = {
            ancla: seccion,
            destino: avisoLegal,
            selectorDelDestino: `footer a[href="${avisoLegal}"]`,
            naturaleza: "blanda",
        };
        /* El otro idioma, para el control que cruza de raiz de documento. Su
           enlace NO se puede buscar por `href`: desde la ola T el selector de
           idioma reescribe el suyo en caliente para llevarse el punto de
           lectura (`/en?read=0.58#contact`), asi que con un fragmento activo
           --que es justo el estado de este gesto-- un selector por `href` no
           encuentra nada. Se busca por `hreflang`, que es estable. */
        const otroIdioma = surface.locale === "es" ? EN_PREFIX : "/";
        const hreflangDelOtro = surface.locale === "es" ? "en" : "es";
        return [
            {
                ...haciaLaLegal,
                id: `${surface.nombre} barra@${grande.ancho}`,
                paginaDeCarga: surface.path,
                selector: `header a[href="${seccion}"]`,
                ...grande,
            },
            {
                ...haciaLaLegal,
                id: `${surface.nombre} hoja@${movil.ancho}`,
                paginaDeCarga: surface.path,
                /* La hoja movil NO vive dentro de `<header>`: es hermana suya
                   en el DOM (medido en el HTML horneado, `</header>` termina
                   antes de la primera fila). Un selector con prefijo `header`
                   no la encuentra, y el gesto de 390 se quedaba sin ejercer.  */
                selector: `[data-nav-sheet] a[href="${seccion}"]`,
                viaHoja: true,
                ...movil,
            },
            {
                /* El CTA del hero escribe su destino en forma RELATIVA
                   (`#story`), no absoluta como la barra: son las dos formas en
                   las que el sitio escribe un ancla del mismo documento, y un
                   arreglo que solo cubriera una de las dos pasaria la mitad de
                   esta familia. */
                id: `${surface.nombre} cta-hero@${grande.ancho}`,
                paginaDeCarga: surface.path,
                selector: 'main a[href="#story"]',
                ancla: `${surface.path}#story`,
                destino: avisoLegal,
                selectorDelDestino: `footer a[href="${avisoLegal}"]`,
                naturaleza: "blanda",
                ...grande,
            },
            {
                /* CONTROL POSITIVO 1: la misma entrada de fragmento, creada por
                   carga completa en vez de por clic. Verde hoy. */
                ...haciaLaLegal,
                id: `${surface.nombre} control-carga-fragmento@${grande.ancho}`,
                paginaDeCarga: seccion,
                selector: null,
                control: true,
                ...grande,
            },
            {
                /* CONTROL POSITIVO 2: el mismo ancla por clic, pero la salida
                   cruza a la OTRA raiz de documento (las tres raices del
                   2026-09-06, una por `<html lang>`), asi que la navegacion es
                   dura y el router se monta de cero al volver. Verde hoy, y es
                   la rama que el orquestador uso para acotar el defecto. */
                id: `${surface.nombre} control-cruce-de-idioma@${grande.ancho}`,
                paginaDeCarga: surface.path,
                selector: `header a[href="${seccion}"]`,
                ancla: seccion,
                destino: otroIdioma,
                selectorDelDestino: `header a[hreflang="${hreflangDelOtro}"]`,
                naturaleza: "dura",
                control: true,
                ...grande,
            },
        ];
    }
    if (surface.kind === "legal") {
        /* El otro documento legal de la MISMA rama de idioma: el salto entre
           legales es blando (comparten raiz de documento) y es donde el
           orquestador midio la segunda familia del defecto. Medir los dos
           sentidos --`/aviso-legal` -> `/privacidad` y el contrario-- sale
           solo, porque las cuatro superficies legales recorren esto. */
        const otro = LEGAL_DOCS.find((d) => d[surface.locale] !== surface.path)[
            surface.locale
        ];
        return [
            {
                id: `${surface.nombre} indice@${grande.ancho}`,
                paginaDeCarga: surface.path,
                /* El PRIMER enlace del indice interno, resuelto en el
                   documento: cada legal tiene sus propios `id` y cada idioma
                   los suyos, asi que teclear uno seria teclear cuatro y
                   quedarian obsoletos en cuanto cambie un epigrafe. */
                selector: 'main nav a[href^="#"]',
                ancla: null,
                destino: otro,
                selectorDelDestino: `footer a[href="${otro}"]`,
                naturaleza: "blanda",
                ...grande,
            },
        ];
    }
    const avisoLegal = LEGAL_DOCS.find((d) => d.id === "legalNotice")[
        surface.locale
    ];
    return [
        {
            /* CONTROL POSITIVO: en la 404 el salto es una navegacion DURA
               --`global-not-found` es su propia raiz de documento-- y sin
               navegacion blanda no hay defecto. Verde hoy. El enlace de salto
               se activa por TECLADO porque solo es visible con el foco puesto,
               que es exactamente como lo usa una persona. */
            id: `${surface.nombre} salto@${grande.ancho}`,
            paginaDeCarga: surface.path,
            selector: 'a[href="#main"]',
            porTeclado: true,
            ancla: `${surface.path}#main`,
            destino: avisoLegal,
            selectorDelDestino: `footer a[href="${avisoLegal}"]`,
            naturaleza: "dura",
            control: true,
            ...grande,
        },
    ];
}

/**
 * Veredicto PURO de un gesto, separado de la conduccion del navegador para
 * poder ejercitarlo desde la suite con cifras tecleadas (mismo reparto que
 * `evaluaVueltaArriba` y `evaluaConmutacionDeTema`).
 *
 * Los cuatro estados son instantaneas del documento: `carga` (recien cargado),
 * `trasAncla` (tras activar el ancla del mismo documento, `null` si el gesto no
 * activa ninguna), `destino` (tras el salto a la otra ruta) y `atras` (tras
 * pulsar atras).
 */
export function evaluaAtras({ gesto, carga, trasAncla, destino, atras }) {
    const motivos = [];
    const donde = `${gesto.id}`;
    if (gesto.instrumento) {
        motivos.push(`${donde}: ${gesto.instrumento}`);
        return { cumple: false, motivos };
    }
    /* Guardas de vacuidad. Las tres describen una medicion que no ejercio el
       gesto, y las tres tienen que ser ROJAS y no verdes: un candado que no
       midio nada no es un candado que cumple. */
    const anclaEsperada = trasAncla ? trasAncla.url : carga.url;
    if (!anclaEsperada.includes("#"))
        motivos.push(
            `${donde}: la entrada de la que se sale no tiene fragmento (${anclaEsperada}), asi que este gesto no ejercio el caso que vigila`,
        );
    if (destino.url === anclaEsperada)
        motivos.push(
            `${donde}: el salto a la ruta siguiente no movio la URL (${destino.url}), asi que el atras no tenia de donde volver`,
        );
    if (destino.h1 === carga.h1 && destino.lang === carga.lang)
        motivos.push(
            `${donde}: el documento de destino no se distingue del de partida (h1 ${JSON.stringify(carga.h1)}, lang ${carga.lang}), asi que "vuelve al documento correcto" seria cierto sin que nada funcionara`,
        );
    if (motivos.length) return { cumple: false, motivos };

    /* AFIRMACION 1: la entrada de fragmento quedo sellada al nacer. Es la que
       ve una regresion del sello aunque el gesto salga verde por otra via.
       Solo se exige donde la salida es BLANDA, que es donde el sello decide el
       resultado: cuando el salto recarga el documento (la 404, el cruce de
       idioma) el router se monta de cero al volver y sella la entrada por su
       cuenta, asi que exigirlo ahi mediria otra cosa y pintaria de rojo dos
       controles que hoy funcionan. */
    if (gesto.naturaleza === "blanda" && trasAncla && !trasAncla.sellada)
        motivos.push(
            `${donde}: la entrada de fragmento creada al activar el ancla NO quedo sellada (history.state = ${trasAncla.estadoClaves}), asi que el router no sabra restaurarla al volver`,
        );
    /* AFIRMACION 2: la navegacion a la ruta siguiente fue BLANDA donde el sitio
       promete que lo es. Sin esto, endurecer los enlaces internos --o recargar
       en `popstate`-- pondria esta familia en verde y se habria decidido por la
       puerta de atras algo que es del dueno. */
    if (gesto.naturaleza === "blanda" && !destino.centinela)
        motivos.push(
            `${donde}: el salto a ${gesto.destino} recargo el documento (el centinela de window no sobrevivio) cuando el sitio lo navega con next/link: la navegacion blanda es un rasgo declarado y este candado no se aprueba retirandolo`,
        );

    /* Y el gesto: tras el atras, el documento renderizado tiene que ser el de
       la URL. Tres senales, en orden de fuerza. */
    if (atras.url !== anclaEsperada)
        motivos.push(
            `${donde}: el atras no volvio a la entrada anterior (URL ${atras.url}, esperada ${anclaEsperada}): el navegador no viajo y la medida no habla del defecto`,
        );
    if (atras.h1 !== carga.h1)
        motivos.push(
            `${donde}: tras el atras la URL dice ${atras.url} y en pantalla sigue el documento anterior -- h1 ${JSON.stringify(atras.h1)} en vez de ${JSON.stringify(carga.h1)}`,
        );
    if (atras.lang !== carga.lang)
        motivos.push(
            `${donde}: tras el atras la URL dice ${atras.url} y el documento anuncia lang="${atras.lang}" en vez de lang="${carga.lang}"`,
        );
    if (atras.hero !== carga.hero)
        motivos.push(
            `${donde}: tras el atras el landmark propio de la pagina ${atras.hero ? "aparece sin que deba" : "no esta"} (#hero ${carga.hero ? "existia" : "no existia"} en ${carga.url})`,
        );
    const alto = trasAncla ? trasAncla.docH : carga.docH;
    const deriva = Math.abs(atras.docH - alto) / Math.max(alto, 1);
    if (deriva > TOLERANCIA_DE_ALTO_TRAS_ATRAS)
        motivos.push(
            `${donde}: tras el atras el documento mide ${atras.docH} px y el de esta URL medía ${alto} px (${(100 * deriva).toFixed(1)} % de deriva, tolerancia ${(100 * TOLERANCIA_DE_ALTO_TRAS_ATRAS).toFixed(0)} %)`,
        );
    /* El centinela DESPUES del atras: si sigue vivo, no hubo recarga. */
    if (gesto.naturaleza === "blanda" && !atras.centinela)
        motivos.push(
            `${donde}: el atras recargo el documento entero (el centinela de window no sobrevivio). Restituir recargando es la opcion D del diagnostico: funciona y cuesta una carga completa, y es una decision del dueno, no del parche`,
        );
    return { cumple: motivos.length === 0, motivos };
}

/** Instantanea del documento tal y como la lee esta familia. */
function probeEstadoDelDocumento() {
    return {
        url: location.pathname + location.search + location.hash,
        h1: (document.querySelector("h1")?.textContent ?? "").trim(),
        /* El idioma del documento distingue los dos unicos documentos del sitio
           que comparten `h1` --las dos portadas-- y es lo que hace que el
           control del cruce de idioma mida algo. */
        lang: document.documentElement.lang,
        hero: document.getElementById("hero") !== null,
        docH: Math.round(document.documentElement.scrollHeight),
        sellada: window.history.state?.__NA === true,
        estadoClaves: window.history.state
            ? Object.keys(window.history.state).join(",")
            : "null",
        centinela: window.__u2centinela === "vivo",
    };
}

/** El primer nodo del selector con caja visible, nunca `querySelector` a
 *  secas: en movil el primero del DOM puede ser un control de la barra de
 *  escritorio oculta (trampa ya pagada en este repo). */
async function primeroVisible(page, selector) {
    for (const candidato of await page.$$(selector)) {
        if (await candidato.boundingBox()) return candidato;
    }
    return null;
}

/**
 * Conduce el navegador para UN gesto y devuelve lo que `evaluaAtras` necesita.
 * Exportada para poder ejercitar esta familia SOLA contra un build servido, sin
 * recorrer las ocho superficies (la corrida completa pasa de diez minutos por
 * tema).
 */
export async function mideAtras(browser, base, theme, gesto) {
    const ctx = await nuevoContexto(browser, theme, {
        viewport: { width: gesto.ancho, height: gesto.alto },
    });
    try {
        const page = await ctx.newPage();
        await page.goto(`${base}${gesto.paginaDeCarga}`, {
            waitUntil: "networkidle",
        });
        /* La espera a la hidratacion no es un temporizador a ojo: se espera al
           HECHO que importa para esta familia -- que el App Router haya sellado
           la entrada actual, que es lo primero que hace su `HistoryUpdater` al
           montar. Sin eso, un clic podria caer antes de que exista el listener
           que sella. */
        await page
            .waitForFunction(() => window.history.state?.__NA === true, null, {
                polling: 100,
                timeout: 15000,
            })
            .catch(() => {
                /* Si no sella nunca, la instantanea lo dira y el veredicto
                   caera por la afirmacion 1. */
            });
        /* Y un asentamiento corto para la rama de tema, que monta despues. */
        await page.waitForTimeout(700);
        await page.evaluate(() => {
            window.__u2centinela = "vivo";
        });
        const carga = await page.evaluate(probeEstadoDelDocumento);

        let trasAncla = null;
        if (gesto.selector) {
            if (gesto.viaHoja) {
                const disparador = await primeroVisible(
                    page,
                    "[data-nav-sheet-trigger]",
                );
                if (!disparador)
                    return {
                        gesto: {
                            ...gesto,
                            instrumento:
                                "no hay disparador de la hoja movil que abrir",
                        },
                        carga,
                        trasAncla,
                        destino: carga,
                        atras: carga,
                    };
                await disparador.click();
                await page.waitForTimeout(700);
            }
            const ancla = gesto.porTeclado
                ? await page.$(gesto.selector)
                : await primeroVisible(page, gesto.selector);
            if (!ancla)
                return {
                    gesto: {
                        ...gesto,
                        instrumento: `no hay ningun ancla visible para ${gesto.selector}`,
                    },
                    carga,
                    trasAncla,
                    destino: carga,
                    atras: carga,
                };
            if (gesto.porTeclado) {
                await ancla.focus();
                await page.keyboard.press("Enter");
            } else {
                await ancla.click();
            }
            await page
                .waitForFunction(() => location.hash !== "", null, {
                    polling: 100,
                    timeout: 5000,
                })
                .catch(() => {
                    /* sin fragmento la guarda de vacuidad lo dira */
                });
            await page.waitForTimeout(600);
            trasAncla = await page.evaluate(probeEstadoDelDocumento);
        }

        const salida = await primeroVisible(page, gesto.selectorDelDestino);
        if (!salida)
            return {
                gesto: {
                    ...gesto,
                    instrumento: `no hay enlace visible a ${gesto.destino} (${gesto.selectorDelDestino})`,
                },
                carga,
                trasAncla,
                destino: carga,
                atras: carga,
            };
        await salida.click();
        await page
            .waitForFunction(
                (esperada) => location.pathname === esperada,
                gesto.destino,
                { polling: 100, timeout: 15000 },
            )
            .catch(() => {
                /* la guarda de vacuidad lo dira */
            });
        await page.waitForTimeout(1200);
        const destino = await page.evaluate(probeEstadoDelDocumento);

        const urlEsperada = trasAncla ? trasAncla.url : carga.url;
        await page.evaluate(() => window.history.back());
        /* Se espera a que el documento VUELVA a ser el de su URL, con tope: la
           espera termina en cuanto acierta, asi que una corrida sana no paga la
           ventana entera y una rota la paga toda. */
        await page
            .waitForFunction(
                ([url, h1]) =>
                    location.pathname + location.search + location.hash ===
                        url &&
                    (document.querySelector("h1")?.textContent ?? "").trim() ===
                        h1,
                [urlEsperada, carga.h1],
                { polling: 150, timeout: VENTANA_DE_RESTITUCION_MS },
            )
            .catch(() => {
                /* el veredicto lee la instantanea final y lo dira */
            });
        /* Y se lee DESPUES de un respiro, para que lo que se afirma sea "llego
           y se quedo" y no un parpadeo. */
        await page.waitForTimeout(600);
        const atras = await page.evaluate(probeEstadoDelDocumento);
        return { gesto, carga, trasAncla, destino, atras };
    } finally {
        await ctx.close();
    }
}

/**
 * FAMILIA VEINTISIETE, `punto-de-lectura-de-la-url-es-de-un-solo-uso`: entra el
 * 2026-09-08 con el P1 de la critica externa #21, y es la clase de comprobacion
 * que a este candado le faltaba -- la de una instruccion que la URL LLEVA y que
 * hay que GASTAR. Las veintiseis familias anteriores miden lo que el sitio hace
 * en una carga; ninguna vuelve a cargar la MISMA URL para preguntar si la
 * segunda carga se comporta como la primera. La familia veinte
 * (`recarga-conserva-la-seccion`) si recarga, pero sobre la portada pelada, que
 * es justo la combinacion en la que este defecto NO aparece.
 *
 * EL DEFECTO, medido con esta misma sonda sobre el build de `e8782f6` (Chrome
 * real sin ventana, 1440x900, tema claro, `/` -> clic REAL en el enlace de
 * ingles con el lector dentro de `#features`):
 *
 *   llegada a `/en?read=0.517#features`      y = 3.878
 *   el lector se va a leer a otro sitio      y = 5.578
 *   F5                                       y = 3.878   (pierde 1.700 px)
 *
 * Y el control que lo convierte en defecto y no en diseno, mismo build y misma
 * sonda sobre la portada pelada: el lector vuelve a su sitio con 0 px de
 * deriva. En `/en` la cifra es la misma con otro origen (5.628 -> 3.928).
 *
 * LAS SEIS AFIRMACIONES, y por que hacen falta las seis:
 *
 *   1. LA LLEGADA SIGUE APLICANDO EL PUNTO DE LECTURA. Es el P1 de la critica
 *      #20, cerrado el 2026-09-07: sin esta afirmacion, la forma mas barata de
 *      poner el resto en verde es dejar de componer la URL, que cambia un
 *      defecto por otro. Se afirma como FRACCION y no como pixeles porque la
 *      seccion no mide lo mismo en los dos idiomas -- que es justamente por lo
 *      que en la URL viaja una fraccion.
 *   2. LA RECARGA RESTITUYE AL LECTOR, no la instruccion de la URL. Es el
 *      hallazgo.
 *   3. EL ENLACE SIGUE SIENDO COMPARTIBLE: abierto EN FRIO, en un contexto
 *      nuevo y sin nada guardado, aterriza donde estaba quien lo mando. Sin
 *      esto, "consumir la instruccion" se podria aprobar no aplicandola nunca.
 *   4. EL BOTON ATRAS SIGUE LLEVANDO A LA PAGINA DE PARTIDA. La limpieza usa
 *      `replaceState`, que no crea entradas; esta afirmacion es la que impide
 *      que alguien la cambie por un `pushState` y se lleve por delante el
 *      «atras».
 *   5. LOS VALORES HOSTILES NO DEJAN AL LECTOR EN UN SITIO SIN CORRESPONDENCIA.
 *      La URL la escribe cualquiera: se prueban seis valores que el sitio NO
 *      genera -- fuera de rango por los dos lados, texto, vacio, sin fragmento
 *      y con un fragmento a una seccion inexistente -- y se exige que la
 *      seccion que la URL nombra este EN PANTALLA al acabar, o que la pagina no
 *      se haya movido cuando no nombra ninguna que exista.
 *   6. LA LIMPIEZA NO PISA EL SELLO DE HISTORIAL del mismo dia (frente U2,
 *      `useHashHistorySeal.ts`), y se AFIRMA en vez de suponerse porque los dos
 *      arreglos escriben en `history` en la misma carga: la entrada sigue
 *      sellada (`history.state?.__NA`) despues de la llegada, y el documento no
 *      recibe NI UN `hashchange` -- que es la unica via por la que el sello se
 *      despierta, y la que probaria que retirar el fragmento con `replaceState`
 *      lo hace disparar.
 *
 * LO QUE ESTA FAMILIA NO AFIRMA, a proposito: que la URL quede limpia. Eso es
 * el REMEDIO, no la propiedad, y vigilar el remedio es lo que deja pasar la
 * siguiente forma del mismo defecto (misma leccion que el sello de U2). La URL
 * de despues se reporta como DATO para poder leerla en el informe, y el
 * veredicto no la mira.
 *
 * LA URL COMPARTIBLE SE CAPTURA EN EL ARRANQUE DEL DOCUMENTO (`addInitScript`),
 * no leyendo la barra de direcciones despues: con el arreglo puesto la
 * instruccion se consume unos cientos de milisegundos tras la llegada, asi que
 * leerla mas tarde seria una carrera y parte de las corridas mediria la URL ya
 * limpia. Lo que se guarda es la URL con la que el navegador CARGO el
 * documento, que es exactamente la que copiaria quien quisiera compartirla.
 *
 * EL PUNTO DESDE EL QUE SE PULSA NO ES UNA CONSTANTE, Y ESO SE PAGO MIDIENDO:
 * la primera version de esta familia colocaba al lector al 85 % de `#features`
 * en los dos temas. En claro funciona; en OSCURO ese punto cae en `y = 9.328`
 * de un documento de 11.008 px --a 780 px del final-- y ademas la seccion que
 * el sitio ancla ahi ya no es `#features` sino `#contact`, a solo el 16 % de
 * su alto. Con eso, "restituye al lector" y "vuelve al punto de la URL" caen a
 * menos de una pantalla y el verde no distinguiria uno de otro. El punto se
 * ELIGE ahora recorriendo el documento y midiendo la geometria
 * (`eligeElPuntoDeLectura`), y el alejamiento del lector se hace hacia el lado
 * que tenga sitio.
 */

/**
 * La banda de la seccion dentro de la que tiene que caer el punto de lectura
 * elegido. El suelo, 0.3, es lo que separa "conserva el punto" de "aterriza en
 * el inicio de la seccion" --el defecto de la critica #20--, que a media
 * seccion se parecerian demasiado; el techo, 0.85, deja sitio por debajo para
 * que la seccion siga conteniendo el centro del viewport.
 */
export const FRACCION_MINIMA_DE_LECTURA = 0.3;
export const FRACCION_MAXIMA_DE_LECTURA = 0.85;

/**
 * Paso con el que se recorre el documento buscando ese punto. 50 px es medio
 * escalon de `WIDTH_SWEEP` en la otra dimension y, sobre un documento de 11.008
 * px, 220 posiciones: barato y mas fino que cualquier seccion del sitio.
 */
export const PASO_DE_BUSQUEDA_PX = 50;

/**
 * Las anclas desde las que el sitio NO compone una URL con punto de lectura, y
 * que por tanto no son candidatas. Es UNA y esta declarada en el codigo que se
 * mide, no adivinada: `useActiveSectionKey` solo mira las secciones de la
 * navegacion (`src/config/navigation.ts`: story, journey, features, contact,
 * about) y devuelve `null` en el hero, asi que desde ahi el enlace de idioma
 * lleva a la portada del otro idioma sin fragmento -- a proposito, y con su
 * porque escrito en el docblock de `refinedLanguageHref`. Elegir el hero como
 * punto de partida daria un gesto que no compone ninguna instruccion, y el caso
 * moriria por su guarda de vacuidad en vez de medir.
 */
export const SECCIONES_SIN_PUNTO_DE_LECTURA = ["hero"];

/** Cuanto tiene que haber avanzado el lector DENTRO de la seccion que el sitio
 *  acaba anclando para que el gesto valga. Por debajo de esto, conservar el
 *  punto y aterrizar en el inicio de la seccion serian el mismo pixel y el
 *  verde seria vacuo. Cuatro veces la banda del navbar, que es del orden del
 *  desfase que un `scrollIntoView` consume (`NAV_BAND_PX` x 2 = 128 px). */
export const PROFUNDIDAD_MINIMA_PX = 400;

/** Cuanto se aleja el lector del punto de llegada antes de recargar. 1.700 px
 *  es casi dos viewports: por debajo de uno, "restituye al lector" y "vuelve al
 *  punto de la URL" podrian caer dentro de la misma pantalla. Se aplica hacia
 *  el lado que tenga sitio, y si ninguno lo tiene el caso se declara vacuo en
 *  vez de firmarse. */
export const ALEJAMIENTO_DEL_LECTOR_PX = 1700;

/** Separacion minima que tiene que haber DE VERDAD entre el punto de llegada y
 *  el del lector para que el veredicto de la recarga signifique algo. */
export const SEPARACION_MINIMA_PX = 1000;

/** Lo que se le tolera a la fraccion entre el documento de partida y el de
 *  llegada. No es holgura de medida: la fraccion se multiplica por un alto
 *  DISTINTO en el otro idioma y `readingOffsetTarget` la recorta contra los
 *  bordes de la seccion, asi que un cero exacto no es alcanzable. 0.05 de una
 *  seccion de 1.320 px son 66 px, del orden de la banda del navbar. */
export const DERIVA_MAXIMA_DE_FRACCION = 0.05;

/** La seccion sobre la que se prueban los valores hostiles. Se elige fija y no
 *  por geometria porque aqui no hay gesto que montar: solo hace falta un
 *  fragmento que exista en las dos ramas de tema, y este existe (medido: top
 *  128 en claro y en oscuro tras el aterrizaje del fragmento). Que siga
 *  existiendo lo dice la guarda de vacuidad del propio caso. */
export const SECCION_HOSTIL = "features";

/**
 * Los valores que el sitio NO genera nunca, con el porque de cada uno. El
 * criterio de la ronda pedia tratar el parametro como entrada hostil, y estas
 * seis son las seis formas en que puede llegar roto:
 *
 *   `-9`    fuera de rango por abajo. El sitio SI genera negativos pequenos
 *           (docblock de `readingOffsetRatio`: la seccion empieza por debajo
 *           del borde superior de la pantalla), asi que lo que decide es el
 *           rango, no el signo.
 *   `2`     fuera de rango por arriba.
 *   `hola`  no es un numero.
 *   vacio   presente y sin valor.
 *   `0.5` sin fragmento: una fraccion sin seccion a la que aplicarse.
 *   `0.5` con una seccion que no existe en ninguna rama.
 */
export const VALORES_HOSTILES = [
    { id: "fuera-por-abajo", consulta: "read=-9", fragmento: SECCION_HOSTIL },
    { id: "fuera-por-arriba", consulta: "read=2", fragmento: SECCION_HOSTIL },
    { id: "no-es-numero", consulta: "read=hola", fragmento: SECCION_HOSTIL },
    { id: "vacio", consulta: "read=", fragmento: SECCION_HOSTIL },
    { id: "sin-fragmento", consulta: "read=0.5", fragmento: null },
    {
        id: "seccion-inexistente",
        consulta: "read=0.5",
        fragmento: "seccion-que-no-existe-candado-u4",
    },
];

/**
 * Lo que se lee en la pagina para esta familia. `id` puede ser `null`: hay
 * casos hostiles que no nombran ninguna seccion.
 *
 * `secciones` lleva TODAS las anclas de primer nivel y no solo la nombrada,
 * porque cual de ellas viaja en la URL lo decide el sitio en el instante del
 * clic y esta sonda no lo sabe hasta despues. El filtro de primer nivel es el
 * mismo criterio que `isTopLevelSectionAnchor` (`themeScrollAnchor.ts`)
 * -- reescrito aqui, no importado: una sonda que use el codigo que juzga no
 * prueba nada.
 */
export function probePuntoDeLectura(id) {
    const anclas = [...document.querySelectorAll("section[id]")].filter(
        (el) =>
            el.parentElement === null ||
            el.parentElement.closest("section[id]") === null,
    );
    const caja = (el) => {
        const r = el.getBoundingClientRect();
        return {
            id: el.id,
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            topDoc: Math.round(r.top + window.scrollY),
            alto: Math.round(r.height),
        };
    };
    const nombrada = id ? document.getElementById(id) : null;
    return {
        y: Math.round(window.scrollY),
        alto: document.documentElement.scrollHeight,
        vh: window.innerHeight,
        url: location.pathname + location.search + location.hash,
        urlDeCarga: window.__u4carga ?? null,
        hashchanges: window.__u4hashchanges ?? null,
        sellada: window.history.state?.__NA === true,
        pathname: location.pathname,
        secciones: anclas.map(caja),
        seccion: nombrada === null ? null : caja(nombrada),
    };
}

/** La caja de una seccion dentro de una instantanea, o `null` si esa rama no la
 *  monta. */
export function seccionDe(instantanea, id) {
    return (instantanea.secciones ?? []).find((s) => s.id === id) ?? null;
}

/** La fraccion de la seccion que el lector tiene por encima del borde superior
 *  de la pantalla, que es exactamente lo que el sitio hace viajar en la URL
 *  (`readingOffsetRatio`). `null` cuando esa seccion no esta o no mide nada. */
export function fraccionLeida(instantanea, id) {
    const s = seccionDe(instantanea, id);
    if (s === null || !(s.alto > 0)) return null;
    return (instantanea.y - s.topDoc) / s.alto;
}

/**
 * Elige DESDE DONDE se va a pulsar el otro idioma, midiendo la geometria en vez
 * de dar por buena una seccion escrita a mano. Pura y exportada para que el
 * test companero pueda ejercitarla sin navegador.
 *
 * SE BUSCA SOBRE EL DOCUMENTO Y NO SOBRE LA LISTA DE SECCIONES, y esto se pago
 * midiendo: en el tema oscuro las anclas SE SOLAPAN (medido sobre el build de
 * `e8782f6`, 1440x900: story 900-4950, journey 4050-9000, features 8100-10074,
 * contact 9174-10123), asi que colocar el centro a una fraccion FIJA del alto
 * de cada seccion caia siempre dentro de la SIGUIENTE, cerca de su inicio: las
 * seis candidatas del tema oscuro daban profundidades de -292, -157, 45, 154,
 * 315 y 357 px, ninguna util. Recorriendo el documento con paso fino, la
 * primera posicion valida del tema oscuro esta en `#story` y la del claro
 * tambien, con profundidades de sobra.
 *
 * Para cada posicion se mira que seccion CONTIENE el centro del viewport, con
 * el mismo criterio del sitio --la ultima en orden de documento gana, que es lo
 * que hace `readingAnchorSectionId`--, y se acepta la primera cuya profundidad
 * llegue a `PROFUNDIDAD_MINIMA_PX`, cuya fraccion caiga en la banda de lectura
 * y desde la que el lector todavia pueda alejarse. Devuelve `null` si ninguna
 * lo consigue, y entonces el caso se declara vacuo en vez de firmarse.
 */
export function eligeElPuntoDeLectura(secciones, vh, alto) {
    const fondo = Math.max(0, alto - vh);
    for (let y = 0; y <= fondo; y += PASO_DE_BUSQUEDA_PX) {
        const centro = y + vh / 2;
        let anclada = null;
        for (const s of secciones) {
            if (s.topDoc <= centro && centro < s.topDoc + s.alto) anclada = s;
        }
        if (anclada === null) continue;
        if (SECCIONES_SIN_PUNTO_DE_LECTURA.includes(anclada.id)) continue;
        if (!(anclada.alto > 0)) continue;
        const profundidad = y - anclada.topDoc;
        const fraccion = profundidad / anclada.alto;
        if (profundidad < PROFUNDIDAD_MINIMA_PX) continue;
        if (
            fraccion < FRACCION_MINIMA_DE_LECTURA ||
            fraccion > FRACCION_MAXIMA_DE_LECTURA
        )
            continue;
        if (alejaAlLector(y, alto, vh) === null) continue;
        return { anclada: anclada.id, y, profundidad, fraccion };
    }
    return null;
}

/**
 * A donde se va el lector antes de recargar: hacia abajo si hay sitio, y si no
 * hacia arriba. `null` si el documento no da para alejarse lo suficiente en
 * ninguno de los dos sentidos, y entonces el caso se declara vacuo.
 */
export function alejaAlLector(y, alto, vh) {
    const fondo = Math.max(0, alto - vh);
    if (y + ALEJAMIENTO_DEL_LECTOR_PX <= fondo)
        return y + ALEJAMIENTO_DEL_LECTOR_PX;
    if (y - ALEJAMIENTO_DEL_LECTOR_PX >= 0)
        return y - ALEJAMIENTO_DEL_LECTOR_PX;
    return null;
}

/** El fragmento de una URL relativa, sin la almohadilla, o `null`. */
export function fragmentoDe(url) {
    const i = (url ?? "").indexOf("#");
    return i === -1 || i === url.length - 1 ? null : url.slice(i + 1);
}

/**
 * EL VEREDICTO, puro y por eso ejercitable desde el test companero sin
 * navegador. Las guardas de vacuidad van PRIMERO y CORTAN: un caso que no se
 * llego a montar no puede firmarse ni en verde ni en rojo por el sitio.
 */
export function evaluaPuntoDeLectura(medida) {
    if (medida.instrumento)
        return { cumple: false, vacuo: true, motivos: [medida.instrumento] };

    const { llegada, lector, recarga, frio, atras, hostiles } = medida;
    const vacuo = (motivo) => ({
        cumple: false,
        vacuo: true,
        motivos: [motivo],
    });

    /* --- guardas de vacuidad */
    const anclada = fragmentoDe(llegada.urlDeCarga);
    if (!/[?&]read=/.test(llegada.urlDeCarga ?? "") || anclada === null)
        return vacuo(
            `la URL con la que se cargo el documento de llegada no es la instruccion que esta familia vigila (${llegada.urlDeCarga}): el gesto no llego a componerla`,
        );
    const fracOrigen = fraccionLeida(medida.origen, anclada);
    const fracLlegada = fraccionLeida(llegada, anclada);
    if (fracOrigen === null || fracLlegada === null)
        return vacuo(
            `la seccion #${anclada} que viajo en la URL no se pudo medir en una de las dos puntas del viaje: sin ella no hay punto de lectura que comparar`,
        );
    const profundidad =
        medida.origen.y - seccionDe(medida.origen, anclada).topDoc;
    if (profundidad < PROFUNDIDAD_MINIMA_PX)
        return vacuo(
            `al pulsar el idioma el lector llevaba ${profundidad} px dentro de #${anclada} (minimo ${PROFUNDIDAD_MINIMA_PX}): a esa profundidad "conserva el punto" y "aterriza en el inicio de la seccion" no se distinguen`,
        );
    const separacion = Math.abs(lector.y - llegada.y);
    if (separacion < SEPARACION_MINIMA_PX)
        return vacuo(
            `el lector solo se alejo ${separacion} px del punto de llegada (minimo ${SEPARACION_MINIMA_PX}): a esa distancia "restituye al lector" y "vuelve al punto de la URL" no se distinguen`,
        );

    const motivos = [];

    /* --- 1. la llegada sigue aplicando el punto de lectura */
    const derivaFraccion = Math.abs(fracLlegada - fracOrigen);
    if (derivaFraccion > DERIVA_MAXIMA_DE_FRACCION)
        motivos.push(
            `cambiar de idioma ya no conserva el punto de lectura: se leia la fraccion ${fracOrigen.toFixed(3)} de #${anclada} y se aterriza en la ${fracLlegada.toFixed(3)} (deriva ${derivaFraccion.toFixed(3)}, maximo ${DERIVA_MAXIMA_DE_FRACCION})`,
        );

    /* --- 2. la recarga restituye al LECTOR */
    const derivaRecarga = Math.abs(recarga.y - lector.y);
    if (derivaRecarga > DERIVA_MAXIMA_DE_RECARGA_PX)
        motivos.push(
            `tras la llegada, recargar no devuelve al lector donde estaba: leia en y=${lector.y} y la recarga lo deja en y=${recarga.y} (deriva ${derivaRecarga} px, maximo ${DERIVA_MAXIMA_DE_RECARGA_PX}); el punto de llegada era y=${llegada.y}, asi que la URL se esta volviendo a aplicar en cada carga`,
        );

    /* --- 3. el enlace compartido en frio */
    const derivaFrio = Math.abs(frio.y - llegada.y);
    if (derivaFrio > DERIVA_MAXIMA_DE_RECARGA_PX)
        motivos.push(
            `el enlace compartido abierto en frio no aterriza donde estaba quien lo mando: y=${frio.y} frente a y=${llegada.y} (deriva ${derivaFrio} px, maximo ${DERIVA_MAXIMA_DE_RECARGA_PX})`,
        );

    /* --- 4. el atras */
    if (atras.pathname !== medida.partida)
        motivos.push(
            `el boton atras ya no vuelve a la pagina desde la que se cambio de idioma: se esperaba ${medida.partida} y la URL dice ${atras.pathname || "sin medir"}`,
        );

    /* --- 6. el sello de historial del frente U2 */
    if (llegada.sellada !== true)
        motivos.push(
            "tras la llegada la entrada de historial no esta sellada (history.state.__NA no es cierto): volver a ella con el boton atras dejaria en pantalla el documento anterior",
        );
    if (llegada.hashchanges !== 0)
        motivos.push(
            `la llegada disparo ${llegada.hashchanges} evento(s) hashchange: retirar el fragmento esta despertando al sello de historial, que no es su cometido`,
        );

    /* --- 5. los valores hostiles */
    let hostilesConSeccion = 0;
    for (const h of hostiles) {
        if (h.instrumento) {
            motivos.push(h.instrumento);
            continue;
        }
        const nombra = h.fragmento ? `#${h.fragmento}` : "";
        if (h.seccion === null) {
            if (h.y > 1)
                motivos.push(
                    `con \`?${h.consulta}${nombra}\` la pagina acaba en y=${h.y} sin que exista la seccion nombrada: el lector queda en un punto que no se corresponde con nada de la URL`,
                );
            continue;
        }
        hostilesConSeccion += 1;
        if (!(h.seccion.top < h.vh && h.seccion.bottom > 0))
            motivos.push(
                `con \`?${h.consulta}${nombra}\` la seccion que la URL nombra no llega a verse (top ${h.seccion.top}, bottom ${h.seccion.bottom}, viewport ${h.vh}): el valor hostil deja al lector en un sitio sin correspondencia en vez de ignorarse`,
            );
    }
    /* Guarda de vacuidad del bloque hostil: si la seccion sobre la que se
       prueban dejara de existir, los cuatro casos que la nombran caerian en la
       rama de "no existe" y pasarian en verde sin haber medido nada. */
    if (hostilesConSeccion === 0)
        motivos.push(
            `ninguno de los ${hostiles.length} valores hostiles encontro la seccion #${SECCION_HOSTIL}: se prueban contra una seccion que ya no existe y su verde seria vacuo`,
        );

    return { cumple: motivos.length === 0, vacuo: false, motivos };
}

/**
 * Conduce el navegador para esta familia entera y devuelve lo que
 * `evaluaPuntoDeLectura` necesita. Exportada para poder ejercitarla SOLA contra
 * un build servido, sin recorrer las ocho superficies (la corrida completa pasa
 * de diez minutos por tema), igual que `mideAtras`.
 */
export async function midePuntoDeLectura(browser, base, theme, surface) {
    const otro = surface.locale === "es" ? "en" : "es";
    const partida = surface.path;
    const destino = otro === "en" ? HOME_DOC.en : HOME_DOC.es;

    async function contexto() {
        const ctx = await nuevoContexto(browser, theme);
        await ctx.addInitScript(() => {
            window.__u4carga =
                location.pathname + location.search + location.hash;
            window.__u4hashchanges = 0;
            window.addEventListener("hashchange", () => {
                window.__u4hashchanges += 1;
            });
        });
        return ctx;
    }

    const vacio = {
        y: 0,
        alto: 0,
        vh: 0,
        url: "",
        urlDeCarga: "",
        hashchanges: null,
        sellada: false,
        pathname: "",
        secciones: [],
        seccion: null,
    };
    const medida = {
        partida,
        destino,
        eleccion: null,
        origen: vacio,
        llegada: vacio,
        lector: { y: 0 },
        recarga: vacio,
        frio: vacio,
        atras: vacio,
        hostiles: [],
        instrumento: null,
    };

    /* --- el viaje: colocar al lector, pulsar el otro idioma, alejarse, F5 */
    let ctx = await contexto();
    try {
        const page = await ctx.newPage();
        await page.goto(`${base}${partida}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2200);
        const antes = await page.evaluate(probePuntoDeLectura, null);
        const eleccion = eligeElPuntoDeLectura(
            antes.secciones,
            antes.vh,
            antes.alto,
        );
        medida.eleccion = eleccion;
        if (eleccion === null) {
            medida.instrumento = `ninguna posicion del documento de ${partida} (tema ${theme}, ${antes.alto} px, ${antes.secciones.length} anclas) deja al lector a ${PROFUNDIDAD_MINIMA_PX} px del inicio de la seccion anclada dentro de la banda de lectura y con sitio para alejarse: el gesto de esta familia no se pudo montar`;
            return medida;
        }
        await page.evaluate(
            (y) => window.scrollTo({ top: y, behavior: "instant" }),
            eleccion.y,
        );
        await page.waitForTimeout(700);
        medida.origen = await page.evaluate(probePuntoDeLectura, null);

        /* CLIC REAL sobre el enlace del otro idioma, y por `hreflang` y no por
           `href`: el selector reescribe su `href` en caliente desde la ola T
           para llevarse el punto de lectura (leccion del frente U2). Se filtra
           por caja visible porque la barra de escritorio y la hoja movil montan
           los dos controles a la vez. */
        const enlace = await primeroVisible(page, `a[hreflang="${otro}"]`);
        if (!enlace) {
            medida.instrumento = `no hay ningun enlace de idioma visible a "${otro}" en ${partida}: el gesto de esta familia no se pudo hacer`;
            return medida;
        }
        await enlace.click();
        await page
            .waitForFunction(
                (esperada) => location.pathname === esperada,
                destino,
                { polling: 100, timeout: 15000 },
            )
            .catch(() => {
                /* la guarda de vacuidad de la URL de carga lo dira */
            });
        await esperaAlturaEstable(page, { tope: 8000 });
        /* Un respiro por encima del asentamiento del alto: la correccion del
           punto de lectura llega tras la rama efectiva mas dos frames, y con
           ella la limpieza de la URL. */
        await page.waitForTimeout(1200);
        medida.llegada = await page.evaluate(probePuntoDeLectura, null);

        /* El lector se va a leer a otro sitio. `scrollTo` y no rueda: lo que se
           juzga aqui es la RECARGA, no ninguna guarda de intencion -- que a
           estas alturas ya se solto. */
        const objetivo = alejaAlLector(
            medida.llegada.y,
            medida.llegada.alto,
            medida.llegada.vh,
        );
        if (objetivo === null) {
            medida.instrumento = `el documento de llegada (${medida.llegada.alto} px) no da para alejar al lector ${ALEJAMIENTO_DEL_LECTOR_PX} px desde y=${medida.llegada.y} en ningun sentido: el caso no se pudo montar`;
            return medida;
        }
        await page.evaluate(
            (y) => window.scrollTo({ top: y, behavior: "instant" }),
            objetivo,
        );
        await page.waitForTimeout(700);
        medida.lector = await page.evaluate(probePuntoDeLectura, null);

        await page.reload({ waitUntil: "networkidle" });
        await esperaAlturaEstable(page, { tope: 8000 });
        await page.waitForTimeout(1200);
        medida.recarga = await page.evaluate(probePuntoDeLectura, null);
    } finally {
        await ctx.close();
    }

    /* --- el enlace compartido, abierto EN FRIO en un contexto nuevo */
    ctx = await contexto();
    try {
        const page = await ctx.newPage();
        await page.goto(`${base}${medida.llegada.urlDeCarga}`, {
            waitUntil: "networkidle",
        });
        await esperaAlturaEstable(page, { tope: 8000 });
        await page.waitForTimeout(1200);
        medida.frio = await page.evaluate(probePuntoDeLectura, null);
    } finally {
        await ctx.close();
    }

    /* --- el atras, en su propio contexto: encadenarlo tras la recarga habria
       medido el atras de OTRA entrada --la de la recarga--, no la del cambio de
       idioma. */
    ctx = await contexto();
    try {
        const page = await ctx.newPage();
        await page.goto(`${base}${partida}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2200);
        const enlace = await primeroVisible(page, `a[hreflang="${otro}"]`);
        if (enlace) {
            await enlace.click();
            await page
                .waitForFunction(
                    (esperada) => location.pathname === esperada,
                    destino,
                    { polling: 100, timeout: 15000 },
                )
                .catch(() => {
                    /* el veredicto lee la instantanea final y lo dira */
                });
            await page.waitForTimeout(1500);
            await page.evaluate(() => window.history.back());
            await page
                .waitForFunction(
                    (esperada) => location.pathname === esperada,
                    partida,
                    { polling: 150, timeout: VENTANA_DE_RESTITUCION_MS },
                )
                .catch(() => {
                    /* idem */
                });
            await page.waitForTimeout(600);
            medida.atras = await page.evaluate(probePuntoDeLectura, null);
        }
    } finally {
        await ctx.close();
    }

    /* --- los valores hostiles, uno por contexto: compartir contexto dejaria la
       posicion de lectura de uno en el `sessionStorage` del siguiente. */
    for (const hostil of VALORES_HOSTILES) {
        const c = await contexto();
        try {
            const page = await c.newPage();
            const fragmento = hostil.fragmento ? `#${hostil.fragmento}` : "";
            await page.goto(
                `${base}${partida}?${hostil.consulta}${fragmento}`,
                {
                    waitUntil: "networkidle",
                },
            );
            await esperaAlturaEstable(page, { tope: 8000 });
            await page.waitForTimeout(1200);
            const leido = await page.evaluate(
                probePuntoDeLectura,
                hostil.fragmento,
            );
            medida.hostiles.push({ ...hostil, ...leido });
        } catch (error) {
            medida.hostiles.push({
                ...hostil,
                instrumento: `el valor hostil ${hostil.id} no se pudo medir: ${error.message}`,
            });
        } finally {
            await c.close();
        }
    }

    return medida;
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

    /*
     * --- la tinta que se pinta no sale del viewport
     *
     * UN CONTEXTO POR SENTIDO DE `reduce` y nada mas: dentro de cada uno, las
     * tres raices se reemulan en vivo sobre la pagina ya cargada y los tres
     * anchos se recorren redimensionando, que es el patron de las familias de
     * arriba. Nueve medidas por contexto, dos contextos por superficie. El
     * porque de cada eje --y la medicion que demuestra que la reemulacion en
     * vivo es reversible-- esta en el docblock de `RAICES_DE_LA_TINTA`.
     *
     * `reduce` no se puede emular sobre un contexto ya creado sin que quede
     * pegado a la siguiente medicion (trampa ya pagada en este fichero), asi que
     * ese eje SI cuesta un contexto.
     */
    const lecturasDeTinta = [];
    for (const reduce of REDUCES_DE_LA_TINTA) {
        ctx = await nuevoContexto(browser, theme, {
            viewport: { width: ANCHOS_DE_LA_TINTA[0], height: 900 },
            reducedMotion: reduce,
        });
        page = await ctx.newPage();
        const sesionDeTinta = await ctx.newCDPSession(page);
        await sesionDeTinta.send("Page.setFontSizes", {
            fontSizes: {
                standard: RAICES_DE_LA_TINTA[0],
                fixed: RAICES_DE_LA_TINTA[0],
            },
        });
        await page.goto(url, { waitUntil: "networkidle" });
        for (const raizPx of RAICES_DE_LA_TINTA) {
            await sesionDeTinta.send("Page.setFontSizes", {
                fontSizes: { standard: raizPx, fixed: raizPx },
            });
            for (const width of ANCHOS_DE_LA_TINTA) {
                await page.setViewportSize({ width, height: 900 });
                await page.waitForTimeout(220);
                lecturasDeTinta.push({
                    etiqueta: `${width}px raiz ${raizPx}px ${reduce}`,
                    raizPedida: raizPx,
                    lectura: await page.evaluate(probeTintaPintadaFuera, {
                        toleranciaPx: TOLERANCIA_DE_TINTA_PX,
                    }),
                });
            }
        }
        await ctx.close();
    }
    const tinta = evaluaTintaPintada(lecturasDeTinta);
    datos.tinta = `${tinta.fallos.length} piezas pintadas fuera / ${tinta.examinadasTotales} piezas de texto en ${lecturasDeTinta.length} celdas (${tinta.apagadasTotales} fuera pero sin pintar, ${tinta.alcanzablesTotales} fuera pero alcanzables con scroll)`;

    // [check: tinta-pintada-dentro-del-viewport]
    /* Guarda de vacuidad: sin piezas examinadas la familia no ha mirado nada y
       su verde no significa nada. */
    if (tinta.examinadasTotales === 0)
        fallos.push(
            "la sonda de la tinta no examino ni una sola pieza de texto de `main` en toda la matriz: el filtro esta roto y el resultado seria vacuo",
        );
    /* Guarda de instrumento: la raiz se reemula en vivo, sin recarga que delate
       una emulacion que no llego. */
    if (tinta.instrumento.length)
        fallos.push(
            `la preferencia de tamano de texto no llego en alguna celda de la matriz de la tinta: ${tinta.instrumento.join("; ")}`,
        );
    if (tinta.fallos.length)
        fallos.push(
            `hay tinta PINTADA fuera del viewport, medida sobre la linea real del texto y no sobre la caja: ${tinta.fallos.join("; ")}`,
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
    const esperadoVivo = langEsperado(surface);
    const esperadoHorneado = langEsperado(surface);
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
        /* El TESTIGO (docblock de `testigoDeScrollEnPagina`): en el contexto
           de la recarga y en cada uno de los simultaneos. */
        await ctx.addInitScript(testigoDeScrollEnPagina);
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
        /* El INVARIANTE del modo (docblock de
           `MODO_DE_RESTITUCION_EN_LA_PORTADA`): se lee de la entrada que la
           recarga deja en curso, con su `pathname` real y no con el de la
           superficie, para que una redireccion no lo haga pasar por otro. */
        const leeModo = () => ({
            modo: history.scrollRestoration,
            pathname: location.pathname,
        });
        const modoTrasRecargar = await page.evaluate(leeModo);
        /* Con `fin` (el instante y la `y` de la lectura): una llamada suave
           que nunca llega solo se ve si se sabe hasta cuando se miro. */
        const leeTestigo = () =>
            window.__testigoScroll
                ? {
                      ...window.__testigoScroll,
                      fin: {
                          t: Math.round(performance.now()),
                          y: Math.round(window.scrollY),
                      },
                  }
                : null;
        const testigoTrasRecargar = await page.evaluate(leeTestigo);
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
            await c.addInitScript(testigoDeScrollEnPagina);
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
        const modosSimultaneos = await Promise.all(
            paginasSimultaneas.map((p) => p.evaluate(leeModo)),
        );
        const testigosSimultaneos = await Promise.all(
            paginasSimultaneas.map((p) => p.evaluate(leeTestigo)),
        );
        for (const c of contextosSimultaneos) await c.close();

        /* El testigo se juzga en las 1 + N recargas. La guarda de vacuidad
           (`exigeLlamada`) solo donde la politica pone `"manual"`: ahi la
           correccion del sitio es el unico motor y tiene que haberse visto. */
        const veredictosDeTestigo = [
            testigoTrasRecargar,
            ...testigosSimultaneos,
        ].map((registro, i) =>
            evaluaTestigoDeScroll({
                llamadas: registro?.llamadas,
                eventos: registro?.eventos,
                fin: registro?.fin,
                tolerancia: DERIVA_MAXIMA_DE_RECARGA_PX,
                exigeLlamada:
                    evaluaModoDeRestitucion({
                        theme,
                        ...[modoTrasRecargar, ...modosSimultaneos][i],
                    }).esperado === "manual",
            }),
        );
        const testigosCaidos = veredictosDeTestigo.filter((v) => !v.cumple);

        /* El modo se exige en las 1 + N entradas: la del reposo y cada una de
           las recargas simultaneas. Es determinista, asi que cualquier pagina
           en el modo equivocado es el interruptor ausente, no mala suerte. */
        const veredictosDeModo = [modoTrasRecargar, ...modosSimultaneos].map(
            (l) => evaluaModoDeRestitucion({ theme, ...l }),
        );
        const modosCaidos = veredictosDeModo.filter((v) => !v.cumple);

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
        if (modosCaidos.length)
            fallos.push(
                `el modo de restitucion del scroll no es el de la politica en ${modosCaidos.length} de ${veredictosDeModo.length} recargas: ${modosCaidos.map((v) => v.motivo).join("; ")}`,
            );
        if (testigosCaidos.length)
            fallos.push(
                `tras la correccion del sitio el scroll se mueve sin una llamada JS que lo explique en ${testigosCaidos.length} de ${veredictosDeTestigo.length} recargas (dos motores de scroll): ${testigosCaidos.map((v) => v.motivo).join("; ")}`,
            );

        /*
         * --- el punto de lectura de la URL es una instruccion de un solo uso
         *
         * MATRIZ y el porque de cada afirmacion: docblock de
         * `SECCION_DE_LECTURA`. El gesto entero --colocar, pulsar el otro
         * idioma, alejarse, recargar, compartir en frio, volver atras y seis
         * valores hostiles-- vive en `midePuntoDeLectura`, que se exporta para
         * poder ejercitar esta familia sola.
         */
        const lectura = await midePuntoDeLectura(browser, base, theme, surface);
        const veredictoDeLectura = evaluaPuntoDeLectura(lectura);
        const anclada = fragmentoDe(lectura.llegada.urlDeCarga);
        const fracOrigen = fraccionLeida(lectura.origen, anclada);
        const fracLlegada = fraccionLeida(lectura.llegada, anclada);
        const cifra = (f) => (f === null ? "sin medir" : f.toFixed(3));
        datos.puntoDeLectura = `#${anclada ?? "sin ancla"} fraccion ${cifra(fracOrigen)} -> ${cifra(fracLlegada)} | lector ${lectura.lector.y} -> recarga ${lectura.recarga.y} | frio ${lectura.frio.y} vs llegada ${lectura.llegada.y} | atras ${lectura.atras.pathname || "sin medir"} | url ${lectura.llegada.urlDeCarga} -> ${lectura.llegada.url} | sello ${lectura.llegada.sellada ? "si" : "NO"}/hashchange ${lectura.llegada.hashchanges} | hostiles ${lectura.hostiles.length}`;
        // [check: punto-de-lectura-de-la-url-es-de-un-solo-uso]
        if (!veredictoDeLectura.cumple)
            fallos.push(
                `el punto de lectura que el cambio de idioma pone en la URL no se consume: ${veredictoDeLectura.motivos.join(" | ")}`,
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
        const conexionesDelArte = [];
        /* NAVEGADOR propio, no solo contexto propio: el eje que decide esta
           medida --el tipo de conexion estimado, que fija el umbral del cargador
           perezoso-- vive en el PROCESO y lo comparten todos sus contextos. Ver
           `CONEXION_ESTIMADA_DEL_ARTE`. */
        const navegadorDelArte = await navegadorConConexionFijada(
            CONEXION_ESTIMADA_DEL_ARTE,
        );
        try {
            for (const dpr of DPRS_DEL_ARTE) {
                ctx = await nuevoContexto(navegadorDelArte, theme, {
                    deviceScaleFactor: dpr,
                });
                page = await ctx.newPage();
                await page.goto(url, { waitUntil: "load" });
                await page.waitForTimeout(3000);
                const arte = await page.evaluate(probeArteNoPintado, {
                    patron: PATRON_DE_ARTE,
                });
                conexionesDelArte.push(
                    await page.evaluate(probeConexionEstimada),
                );
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
        } finally {
            await navegadorDelArte.close();
        }
        const veredictoDeLaConexion = veredictoDeConexionDeclarada({
            declarada: CONEXION_ESTIMADA_DEL_ARTE,
            observadas: conexionesDelArte,
        });
        datos.arte = `${arteSuelto.length} combinacion(es) con arte sin pintar / ${recursosDeArteVistos} recursos de arte vistos en ${DPRS_DEL_ARTE.length} densidades, conexion ${conexionesDelArte.join("/") || "sin leer"}`;
        // [check: arte-no-pintado-por-tema-y-dpr]
        /* El candado del propio candado: si la conexion con la que se midio no
           es la declarada, lo de arriba no es un veredicto sobre el sitio. */
        if (!veredictoDeLaConexion.cumple)
            fallos.push(veredictoDeLaConexion.motivo);
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

        /*
         * --- el control «volver arriba» vuelve arriba
         *
         * La matriz, con el porque de cada eje, esta en el docblock de
         * `VIEWPORTS_DE_VOLVER_ARRIBA`. Es la unica familia del script que
         * ACTIVA un control en vez de inventariarlo.
         */
        const vueltas = [];
        for (const combinacion of VIEWPORTS_DE_VOLVER_ARRIBA) {
            const medida = await mideVueltaArriba(
                browser,
                theme,
                url,
                combinacion,
            );
            vueltas.push({
                ...medida,
                veredicto: evaluaVueltaArriba(medida),
            });
        }
        const vueltasCaidas = vueltas.filter((v) => !v.veredicto.cumple);
        datos.volverArriba = `${vueltas.length - vueltasCaidas.length}/${vueltas.length} combinaciones vuelven al origen ${vueltas
            .map(
                (v) =>
                    `${v.combinacion.ancho}@${v.combinacion.reduce}=${v.partida}->[${v.intentos.join(",")}]`,
            )
            .join(" ")}`;
        // [check: volver-arriba-vuelve-arriba]
        if (vueltasCaidas.length)
            fallos.push(
                `el control «volver arriba» no cumple lo que promete (${vueltasCaidas.length} de ${vueltas.length} combinaciones): ${vueltasCaidas
                    .flatMap((v) => v.veredicto.motivos)
                    .join(" | ")}`,
            );

        /*
         * --- tabular no deja el foco por delante del scroll
         *
         * La matriz y el porque de cada eje estan en el docblock de
         * `COMBINACIONES_DE_TABULACION`.
         */
        const tabulaciones = [];
        for (const combinacion of COMBINACIONES_DE_TABULACION) {
            const medida = await mideTabulacion(
                browser,
                theme,
                url,
                combinacion,
            );
            tabulaciones.push({
                ...medida,
                veredicto: evaluaTabulacionSinRezago(medida),
            });
        }
        const tabulacionesCaidas = tabulaciones.filter(
            (t) => !t.veredicto.cumple,
        );
        datos.tabulacion = `${tabulaciones.length - tabulacionesCaidas.length}/${tabulaciones.length} combinaciones sin rezago ${tabulaciones
            .map(
                (t) =>
                    `${t.combinacion.ancho}@${t.combinacion.reduce}=${t.fuera.length}/${t.paradas}`,
            )
            .join(" ")}`;
        // [check: tabulacion-sin-rezago]
        if (tabulacionesCaidas.length)
            fallos.push(
                `el foco se adelanta al scroll al tabular (${tabulacionesCaidas.length} de ${tabulaciones.length} combinaciones): ${tabulacionesCaidas
                    .flatMap((t) => t.veredicto.motivos)
                    .join(" | ")}`,
            );

        /*
         * --- el primer salto a una ancla aterriza como los siguientes
         *
         * La matriz, y por que cada seccion estrena contexto, estan en el
         * docblock de `COMBINACIONES_DE_ATERRIZAJE`.
         */
        const aterrizajes = [];
        for (const combinacion of COMBINACIONES_DE_ATERRIZAJE) {
            for (const seccion of SECCIONES_DE_ATERRIZAJE) {
                const medida = await mideAterrizajeDeAncla(
                    browser,
                    theme,
                    url,
                    combinacion,
                    seccion,
                );
                aterrizajes.push({
                    ...medida,
                    veredicto: evaluaAterrizajeDeAncla(medida),
                });
            }
        }
        const aterrizajesCaidos = aterrizajes.filter(
            (a) => !a.veredicto.cumple,
        );
        datos.aterrizajeDeAncla = `${aterrizajes.length - aterrizajesCaidos.length}/${aterrizajes.length} saltos aterrizan igual la primera vez ${aterrizajes
            .map((a) =>
                a.enlace
                    ? `${a.combinacion.reduce}#${a.seccion}=${a.primero.top}/${a.segundo.top}`
                    : `${a.combinacion.reduce}#${a.seccion}=sin-enlace`,
            )
            .join(" ")}`;
        // [check: aterrizaje-de-ancla-constante]
        if (aterrizajesCaidos.length)
            fallos.push(
                `el primer salto a una ancla no aterriza como los siguientes (${aterrizajesCaidos.length} de ${aterrizajes.length}): ${aterrizajesCaidos
                    .flatMap((a) => a.veredicto.motivos)
                    .join(" | ")}`,
            );

        /*
         * --- conmutar el tema no congela la pagina
         *
         * Las tres medidas, la matriz y el porque de cada eje estan en el
         * docblock de `GESTOS_DEL_CONMUTADOR`. El SENTIDO de la conmutacion no
         * es un eje propio: lo fija el `theme` de esta corrida, que es el tema
         * de PARTIDA -- con `theme` oscuro el gesto es oscuro -> claro (donde
         * el pixel ve la pantalla vacia) y con `theme` claro es el contrario
         * (donde lo que muere es la coreografia). Las dos corridas de tema que
         * el candado ya hace cubren los dos sentidos sin duplicar nada.
         */
        const conmutaciones = [];
        for (const gesto of GESTOS_DEL_CONMUTADOR) {
            const medida = await mideConmutacionDeTema(
                browser,
                theme,
                url,
                gesto,
            );
            conmutaciones.push({
                ...medida,
                veredicto: evaluaConmutacionDeTema(medida),
            });
        }
        const conmutacionesCaidas = conmutaciones.filter(
            (c) => !c.veredicto.cumple,
        );
        datos.conmutarTema = `${conmutaciones.length - conmutacionesCaidas.length}/${conmutaciones.length} conmutaciones dejan la pagina viva ${conmutaciones
            .map(
                (c) =>
                    `${c.gesto.pasos}@${c.gesto.reduce}=${c.temaAntes}->${c.temaDespues} y${c.yAntes}->${c.yDespues} ${c.pixel.cubos}cubos/${c.pixel.dominante}% ${c.atascados.length}atascados${c.deck ? (c.deck.aplicable ? ` deck[${c.deck.serie.join(",")}]` : " deck-fuera") : ""}`,
            )
            .join(" ")}`;
        // [check: conmutar-el-tema-no-congela-la-pagina]
        if (conmutacionesCaidas.length)
            fallos.push(
                `conmutar el tema a media lectura deja la pagina congelada (${conmutacionesCaidas.length} de ${conmutaciones.length} combinaciones): ${conmutacionesCaidas
                    .flatMap((c) => c.veredicto.motivos)
                    .join(" | ")}`,
            );

        /*
         * --- el revelado no deja banda ciega
         *
         * Las dos mitades (los aterrizajes medidos y la pasada de punteria que
         * no depende de la geometria de hoy), el invariante, la calibracion y
         * el modo de fallo que NO ve estan en el docblock de
         * `TOPE_DEL_RETRASO_DEL_UMBRAL`.
         */
        const lecturasDeRevelado = [];
        let asomoPedidoPx = 0;
        if (surface.locale === "es")
            for (const aterrizaje of ATERRIZAJES_DE_LA_BANDA_CIEGA[theme] ?? [])
                lecturasDeRevelado.push(
                    await mideAterrizajeDeRevelado(
                        browser,
                        theme,
                        url,
                        aterrizaje,
                    ),
                );
        for (const geometria of GEOMETRIAS_DE_LA_BANDA_CIEGA) {
            const pasada = await midePunteriaDeRevelado(
                browser,
                theme,
                url,
                geometria,
            );
            asomoPedidoPx = Math.max(asomoPedidoPx, pasada.asomoPx);
            lecturasDeRevelado.push(...pasada.lecturas);
        }
        const veredictoDeRevelado = evaluaBandaCiega({
            lecturas: lecturasDeRevelado,
            objetivosMinimos: OBJETIVOS_MINIMOS_DE_REVELADO,
            asomoPedidoPx,
        });
        const lecturasLimpias = lecturasDeRevelado.filter(
            (l) => (l.acusados ?? []).length === 0,
        ).length;
        datos.bandaCiega = `${lecturasLimpias}/${lecturasDeRevelado.length} lecturas sin copia apagada sobre la linea (${veredictoDeRevelado.juzgadas} piezas juzgadas y ${veredictoDeRevelado.contaminadas} ya reveladas de ${veredictoDeRevelado.apuntadas} apuntadas, ${veredictoDeRevelado.objetivosVistos} objetivos vistos, asomo ${Math.round(asomoPedidoPx)} px)`;
        // [check: revelado-sin-banda-ciega]
        if (veredictoDeRevelado.instrumento.length)
            fallos.push(
                `la sonda de banda ciega no pudo montarse bien y su resultado no habla del sitio: ${veredictoDeRevelado.instrumento.join("; ")}`,
            );
        if (veredictoDeRevelado.fallos.length)
            fallos.push(
                `el revelado deja copia en pantalla y sin pintar por encima de la linea del -12 % (${veredictoDeRevelado.fallos.length} lectura(s)): ${veredictoDeRevelado.fallos.join(" | ")}`,
            );

        /*
         * --- atras y adelante restituyen la lectura
         *
         * Matriz, rutas y el porque de cada guarda: docblock de
         * `PROFUNDIDAD_DE_LECTURA_PX`.
         */
        const vuelta = await mideAtrasYAdelante(browser, base, theme, surface);
        const veredictoDeVuelta = evaluaAtrasYAdelante(vuelta);
        datos.atrasYAdelante = `${vuelta.rutas
            .map((r) =>
                r.enlace
                    ? `${r.ruta}=${r.antes.y}->${r.atras.y}[${r.atras.modo}] adelante ${r.adelante ? `${r.adelante.pathname}${r.adelante.hash}@${r.adelante.y}` : "sin-medir"}${r.segundoAtras ? ` 2atras ${r.segundoAtras.y}` : ""}`
                    : `${r.ruta}=sin-enlace`,
            )
            .join(
                " ",
            )} | clave idioma ${vuelta.claves.idioma?.antes === vuelta.claves.idioma?.despues ? "estable" : "CAMBIA"}, recarga ${vuelta.claves.recarga?.antes === vuelta.claves.recarga?.despues ? "estable" : "CAMBIA"}`;
        // [check: atras-y-adelante-restituyen-la-lectura]
        if (!veredictoDeVuelta.cumple)
            fallos.push(
                `Atras no devuelve al visitante a la profundidad que leia: ${veredictoDeVuelta.motivos.join(" | ")}`,
            );

        /*
         * --- adelante a la portada vuelve a su lectura
         *
         * Matriz y porque: docblock de `PROFUNDIDAD_EN_LA_LEGAL_PX`.
         */
        const aPortada = await mideAdelanteALaPortada(
            browser,
            base,
            theme,
            surface,
        );
        const veredictoAPortada = evaluaAdelanteALaPortada(aPortada);
        datos.adelanteALaPortada = aPortada.medidas
            .map((m) =>
                m.logo
                    ? `${m.viewport} legal@${m.legal.y} logo@${m.portada.y} atras@${m.atras.y} adelante ${m.adelante.map((l) => `${l.ms}ms@${l.y}[${l.modo}]`).join(" ")}`
                    : `${m.viewport} sin-logo`,
            )
            .join(" | ");
        // [check: adelante-a-la-portada-vuelve-a-su-lectura]
        if (!veredictoAPortada.cumple)
            fallos.push(
                `Adelante hacia la portada no la devuelve a donde se dejo: ${veredictoAPortada.motivos.join(" | ")}`,
            );

        /*
         * --- atras con fragmento vuelve a la lectura
         *
         * Matriz y porque: docblock de `VIEWPORTS_DE_ATRAS_CON_FRAGMENTO`.
         */
        const conFragmento = await mideAtrasConFragmento(
            browser,
            base,
            theme,
            surface,
        );
        const veredictoConFragmento = evaluaAtrasConFragmento(conFragmento);
        datos.atrasConFragmento = conFragmento.medidas
            .map((m) =>
                m.enlace
                    ? `${m.viewport}${m.porHoja ? " (hoja)" : ""} ancla@${m.salida.y} lectura@${m.lectura.y} atras ${(m.atras ?? []).map((l) => `${l.ms}ms@${l.y}[${l.modo}]`).join(" ")} enlace ${m.nuevoEnlace ? `${m.nuevoEnlace.via} top=${m.nuevoEnlace.contactTop}` : "sin-medir"} fria top=${m.fria ? m.fria.contactTop : "sin-medir"} margen=${m.salida.margen}`
                    : `${m.viewport} sin-enlace`,
            )
            .join(" | ");
        // [check: atras-con-fragmento-vuelve-a-la-lectura]
        if (!veredictoConFragmento.cumple)
            fallos.push(
                `Atras con fragmento no devuelve al lector a su lectura: ${veredictoConFragmento.motivos.join(" | ")}`,
            );
    }

    /*
     * --- el atras restituye el documento de la URL
     *
     * Fuera del bloque de la portada a proposito: el defecto vive en CUALQUIER
     * documento que tenga anclas del mismo documento y una salida blanda, y las
     * ocho superficies las tienen. Sus dos controles positivos --la 404 y la
     * entrada de fragmento creada por carga-- viajan con sus superficies por el
     * mismo camino. El porque de cada eje esta en el docblock de
     * `VIEWPORTS_DE_ATRAS`.
     */
    const atrases = [];
    for (const gesto of gestosDeAtras(surface)) {
        const medida = await mideAtras(browser, base, theme, gesto);
        atrases.push({ ...medida, veredicto: evaluaAtras(medida) });
    }
    const atrasesCaidos = atrases.filter((a) => !a.veredicto.cumple);
    datos.atras = `${atrases.length - atrasesCaidos.length}/${atrases.length} gestos vuelven al documento de su URL ${atrases
        .map(
            (a) =>
                `${a.gesto.id.split(" ").pop()}=${a.trasAncla ? (a.trasAncla.sellada ? "sellada" : "SIN-SELLO") : "sin-ancla"}/${a.destino.centinela ? "blanda" : "dura"}->${JSON.stringify(a.atras.h1.slice(0, 14))}`,
        )
        .join(" ")}`;
    // [check: atras-restituye-el-documento-de-la-url]
    if (atrasesCaidos.length)
        fallos.push(
            `el boton atras cambia la URL y deja en pantalla el documento anterior (${atrasesCaidos.length} de ${atrases.length} gestos): ${atrasesCaidos
                .flatMap((a) => a.veredicto.motivos)
                .join(" | ")}`,
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
        const condicionAlEmpezar = await leeConexionCompartida(
            browser,
            base,
            theme,
        );
        for (const surface of SURFACES) {
            results.push(
                await auditarSuperficie(browser, base, theme, surface),
            );
        }
        /*
         * La deriva se mide sobre el navegador COMPARTIDO y con la corrida ya
         * hecha: es justo lo que la carga de la propia corrida pudo mover.
         */
        const condicionAlTerminar = await leeConexionCompartida(
            browser,
            base,
            theme,
        );
        const veredictoDeCondiciones = veredictoDeDerivaDeCondiciones({
            alEmpezar: condicionAlEmpezar,
            alTerminar: condicionAlTerminar,
        });
        results.push({
            surface: "condiciones",
            datos: {
                conexionCompartida: `${condicionAlEmpezar} al empezar -> ${condicionAlTerminar} al terminar`,
            },
            // [check: condiciones-de-navegador-estables-en-la-corrida]
            fallos: veredictoDeCondiciones.cumple
                ? []
                : [veredictoDeCondiciones.motivo],
            deudaVista: new Set(),
        });
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
