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
 * LOS DOS UMBRALES SON LOS BREAKPOINTS DEL TEMA, en em: 62em = 992px = `lg` y
 * 75em = 1200px = `xl` con la raíz por defecto de 16px. La equivalencia la ata
 * `Navbar.test.tsx` contra `theme.data.breakPoint`, que es donde viven los
 * valores en píxeles -- si alguien mueve un breakpoint del tema y no mueve su
 * gemelo de aquí, el candado lo dice.
 */
export const NAVBAR_CONTAINER = "navbar";

/** Raíz por defecto (px) contra la que se convierten los dos umbrales. */
export const NAVBAR_CONTAINER_ROOT_PX = 16;

/** Ancho del contenedor desde el que la barra pinta el quinto destino (`lg`). */
export const NAVBAR_WIDE_EM = 62;

/** Ancho del contenedor desde el que el conmutador rotula (`xl`). */
export const NAVBAR_LABEL_EM = 75;

/** Consulta del régimen ancho de la barra: el quinto destino de sección. */
export const NAVBAR_WIDE_QUERY = `${NAVBAR_CONTAINER} (min-width: ${NAVBAR_WIDE_EM}em)`;

/** Consulta del régimen rotulado: el conmutador de tema con su rótulo. */
export const NAVBAR_LABEL_QUERY = `${NAVBAR_CONTAINER} (min-width: ${NAVBAR_LABEL_EM}em)`;
