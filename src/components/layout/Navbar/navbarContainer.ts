/**
 * LA BARRA SE PREGUNTA POR SU PROPIO ANCHO, NO POR EL DE LA VENTANA (crítica
 * externa #18, hallazgos O-3 y O-4).
 *
 * Las dos piezas que la barra estrena en esa crítica -- el quinto destino de
 * sección y el rótulo del conmutador de tema -- solo caben a partir de cierto
 * ancho, y hasta aquí eso sería un `@media (min-width: ...)` corriente. Lo que
 * obliga a otra herramienta es la SEGUNDA variable: el tamaño de fuente.
 *
 * MEDIDO EN CHROME REAL sobre el build de producción, con la raíz del
 * documento en 32px -- el 200 % de la preferencia del usuario, el mismo
 * instrumento con el que la ola I midió el recorte de la marca (ver el
 * docblock de `ScBrandLink`) --, insertando en la fila el enlace y el rótulo
 * nuevos:
 *
 *                          desbordamiento de la fila
 *     ancho    sin las dos piezas    con las dos piezas
 *     1024     131 px (ya roto)      349 px
 *     1280     0                     279 px
 *     1440     0                     201 px
 *
 * Es decir: a 200 % de fuente la fila NO tiene sitio para ellas a ningún ancho
 * hasta 1440, y con un `@media` las habría pintado igual -- empujando el
 * bloque de acciones fuera de la pantalla (el conmutador de tema quedaba con
 * su centro fuera del viewport, no alcanzable). Un `@media` no puede evitarlo:
 * sus unidades `em` se resuelven contra el tamaño de fuente INICIAL, así que
 * no se enteran de que el usuario ha subido el suyo.
 *
 * UNA CONSULTA DE CONTENEDOR SÍ, y esto está comprobado en Chrome y en jsdom
 * antes de escribir una línea de esta entrega: dentro de `@container`, `em` se
 * resuelve contra el tamaño de fuente DEL PROPIO CONTENEDOR. Sonda en Chrome
 * sobre un contenedor de 1000px con `@container (min-width: 62em)`: con la
 * raíz a 16px la regla se aplica (62em = 992px), y con la raíz a 32px deja de
 * aplicarse (62em = 1984px). O sea: cuando el texto crece, las dos piezas se
 * retiran solas y la fila vuelve a ser la de siempre -- exactamente el reparto
 * que `ScBrandLink` ya declara para la marca, un escalón antes.
 *
 * POR QUÉ VIVE EN SU PROPIO MÓDULO y no en `Navbar.tsx`: el contenedor lo
 * declara la barra (`ScBar`) y las consultas las escriben DOS componentes --
 * `Navbar.tsx` y `ThemeToggle.tsx` --, y `Navbar.tsx` importa a `ThemeToggle`,
 * así que la constante no puede vivir en el primero sin crear un ciclo. Un
 * módulo de datos sin dependencias es el punto de menor duplicación: el nombre
 * del contenedor y sus dos umbrales se escriben UNA vez.
 *
 * EL CONTENEDOR ES `ScNav`, NO `ScBar`, y la diferencia no es de estilo
 * (crítica externa #18, ola O+P). `ScBar` es justo la caja cuyo `max-width`
 * ANIMA al despegarse la barra, así que su caja de contenido ENCOGE al
 * scrollear -- medido en Chrome real sobre el build de producción: 992 -> 976,
 * 1024 -> 1008, 1200 -> 1184 con la raíz por defecto, y el doble de merma con
 * la raíz a 32px. Con los umbrales puestos sobre esa caja, las bandas
 * 992-1007 y 1200-1215 px cruzaban el umbral DURANTE el propio scroll: el
 * quinto destino aparecía arriba y desaparecía al bajar. Movimiento no pedido
 * dentro de una barra fija, y en las dos bandas que contienen exactamente los
 * dos breakpoints del tema.
 *
 * `ScNav` NO tiene ese problema, y no por casualidad: su `padding-inline` está
 * construido para CANCELAR el desfase del despegue (ver su docblock en
 * `Navbar.tsx`, "la cifra no depende ni de B ni del hueco"). Medido en las dos
 * direcciones sobre el mismo build, a 768, 992, 1000, 1024, 1200, 1210, 1280,
 * 1440 y 1920 px, con la raíz a 16 y a 32: la caja de contenido de `ScNav` sale
 * INVARIANTE arriba y tras el scroll en los dieciocho casos, mientras la de
 * `ScBar` cambia en los dieciocho. La invariante que hace falta para que una
 * consulta de contenedor no parpadee durante una animación es exactamente ésa,
 * así que el contenedor va donde vive.
 *
 * LOS DOS UMBRALES SIGUEN SIENDO LOS BREAKPOINTS DEL TEMA, expresados sobre la
 * caja que ahora se pregunta. `ScNav` mide el ancho disponible MENOS su raíl
 * lateral (`space[5]` a cada lado, 24px con la raíz por defecto), que además es
 * la holgura real de la fila -- la magnitud que midió la entrega original. De
 * ahí:
 *
 *     (992 - 2*24) / 16 = 59em   (`lg`)
 *     (1200 - 2*24) / 16 = 72em  (`xl`)
 *
 * Simulado sobre el build con esos dos umbrales, el quinto destino enciende
 * exactamente desde 992 px y el rótulo desde 1200 px, idénticos arriba y tras
 * el scroll en los catorce anchos probados; y con la raíz a 32px los dos
 * siguen retirados a todo ancho hasta 1920. La aritmética la ata
 * `Navbar.test.tsx` contra `theme.data.breakPoint` y `theme.data.space`, que es
 * donde viven los valores en píxeles -- si alguien mueve un breakpoint del
 * tema, o el raíl de la banda, y no mueve su gemelo de aquí, el candado lo
 * dice.
 */
export const NAVBAR_CONTAINER = "navbar";

/** Raíz por defecto (px) contra la que se convierten los dos umbrales. */
export const NAVBAR_CONTAINER_ROOT_PX = 16;

/**
 * Raíl lateral de la banda (px, con la raíz por defecto): lo que `ScNav`
 * descuenta del ancho disponible por cada lado, `space[5]`. Es la diferencia
 * entre el breakpoint del tema y el umbral de la consulta, y `Navbar.test.tsx`
 * lo ata contra `theme.data.space[5]`.
 */
export const NAVBAR_CONTAINER_RAIL_PX = 24;

/** Ancho del contenedor desde el que la barra pinta el quinto destino (`lg`). */
export const NAVBAR_WIDE_EM = 59;

/** Ancho del contenedor desde el que el conmutador rotula (`xl`). */
export const NAVBAR_LABEL_EM = 72;

/** Consulta del régimen ancho de la barra: el quinto destino de sección. */
export const NAVBAR_WIDE_QUERY = `${NAVBAR_CONTAINER} (min-width: ${NAVBAR_WIDE_EM}em)`;

/** Consulta del régimen rotulado: el conmutador de tema con su rótulo. */
export const NAVBAR_LABEL_QUERY = `${NAVBAR_CONTAINER} (min-width: ${NAVBAR_LABEL_EM}em)`;
