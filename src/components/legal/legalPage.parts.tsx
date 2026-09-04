"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { PRESS } from "@/motion/vocabulary";

/*
 * Piezas con estilo de las 4 páginas legales (D21/D22/D23 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md). Todo con tokens
 * `theme.data.*` -- cero colores o espaciados literales -- y legible en los
 * dos temas: ninguna pieza fija un fondo oscuro/claro propio, todas heredan
 * de `semantic.*`, que ya resuelve contra el tema activo.
 *
 * Ancho de lectura: `theme.data.grid.prose` (56ch desde la critica #13; 52ch entre 2026-08-17 y esa fecha, ~65
 * caracteres reales; D21/§3 spec) en el
 * artículo entero, no solo en los párrafos -- así el índice y las cabeceras
 * de sección respetan la misma medida de lectura que el propio texto. Quien
 * ENTREGA esa medida es `ScMain`, y desde la crítica externa #10 la entrega
 * de verdad: ver el porqué del `calc()` de su `max-width` ahí abajo.
 */

export const ScMain = styled.main`
  /*
   * CAUSA RAÍZ del recorte de /privacidad en todo móvil por debajo de 466 px
   * (crítica externa #10, hallazgo A: a 320 px se perdían 122 px de página
   * -- el 38 % de la pantalla --, con el h1 renderizando Política de
   * privacidac; a 390 px la columna Titular de la tabla de almacenamiento
   * quedaba entera fuera de pantalla).
   *
   * El mecanismo, que vive en el ANCESTRO y no aquí: GlobalStyles pasó body
   * a display: flex con flex-direction: column en la Ola B (2026-08-16, el
   * pie pegado al borde inferior). Con eso este main es un ítem flex, y su
   * ANCHO es su tamaño en el eje TRANSVERSAL. Un ítem flex solo se estira al
   * ancho del contenedor si su align-self resuelve a stretch Y NINGUNO de
   * sus dos márgenes del eje transversal es auto (CSS Flexible Box, §8.3).
   * Esta caja declara margin-inline: auto para centrarse, así que NUNCA se
   * estiraba: su ancho caía al tamaño por contenido, fit-content =
   * min(max-content, max(min-content, disponible)). Y su min-content lo
   * fijaba el descendiente más ancho e indivisible -- la tabla de
   * almacenamiento de 5 columnas (ScTable, table-layout auto implícito,
   * ScTh con white-space: nowrap), ~476 px medidos --, así que en un
   * viewport de 320 px ese max() daba 476 y lo único que lo frenaba era el
   * max-width de esta misma caja: 466 px medidos. Todo el documento se
   * maquetaba entonces contra 466 px y el viewport recortaba el resto.
   * /aviso-legal, sin tabla, nunca alcanza ese min-content: por eso no
   * sufría el defecto.
   *
   * Por qué min-width: 0 aquí NO cambiaba nada (probado en vivo por el
   * evaluador): esa propiedad fija el MÍNIMO de la caja, y aquí nada topaba
   * contra un mínimo -- la caja se estaba DIMENSIONANDO por su contenido.
   * Y el eje principal de este contenedor es el vertical, así que el suelo
   * automático de min-size de un ítem flex (el caso clásico que min-width: 0
   * resuelve) ni siquiera aplica en el eje que aquí importa.
   *
   * width: 100% le da un ancho DEFINIDO (el de su bloque contenedor, que es
   * el viewport), con lo que fit-content deja de intervenir; max-width sigue
   * topando en pantallas anchas y margin-inline: auto sigue centrando. Lo
   * único que puede exceder del viewport pasa a ser la TABLA, dentro de
   * ScTableWrap -- justo donde su overflow-x: auto prometía que vivía el
   * scroll.
   */
  width: 100%;
  /*
   * El tope SUMA el relleno a propósito (crítica externa #10, hallazgo C).
   * Con box-sizing: border-box global, un max-width de grid.prose a secas
   * dejaba la COLUMNA REAL de texto en 465,92 - 2x24 = 417,92 px = 46,6ch:
   * ~55 caracteres por línea medidos, por debajo de la banda 60-75 que el
   * token persigue. El token NO es el problema -- su ratio de caracteres
   * reales por ch está verificado de forma independiente, ver el docblock de
   * grid.ts --: lo estaba la ENTREGA en esta caja. Sumando los dos rellenos,
   * quien mide grid.prose pasa a ser la caja de CONTENIDO, que es la que
   * porta el texto.
   *
   * Se elige el calc() y no un envoltorio nuevo que se lleve el padding: no
   * añade un nodo al DOM y deja el relleno donde protege al texto del borde
   * de la pantalla en móvil.
   */
  max-width: calc(
    ${({ theme }) => theme.data.grid.prose} + 2 *
      ${({ theme }) => theme.data.space[5]}
  );
  margin-inline: auto;
  /*
   * EL RELLENO SUPERIOR DESCUENTA LA BANDA DEL NAVBAR (2026-09-03, decisión
   * del dueño tras la crítica externa #16). Hasta hoy las legales montaban una
   * cabecera propia EN FLUJO, que ocupaba su propia franja y empujaba este
   * main hacia abajo por sí sola. Desde que montan el Navbar del sitio (ver el
   * docblock de PrivacyDocument.tsx) la cabecera es position: fixed y NO deja
   * hueco en el flujo: sin este descuento, el enlace de vuelta y el h1
   * nacerían justo debajo del borde superior, con la barra encima.
   *
   * var(--nav-height) es la MISMA variable global que fija la banda
   * (GlobalStyles) y la misma que ya descuenta NotFoundContent por este mismo
   * motivo desde la Task 35: si la banda cambia de alto, las tres medidas
   * cambian juntas. El relleno inferior conserva su valor de siempre --
   * el descuento es del borde superior, no del ritmo vertical del documento --,
   * así que aquí se escriben las dos longitudes del eje de bloque por separado.
   * (Sin comillas invertidas dentro del template: regla 23 de RULES.md.)
   */
  padding: calc(var(--nav-height) + ${({ theme }) => theme.data.space[7]})
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[7]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding-block: calc(
        var(--nav-height) + ${({ theme }) => theme.data.space[8]}
      )
      ${({ theme }) => theme.data.space[8]};
  }
`;

/* transform se añade a la lista de transition (Task 9, vocabulary.PRESS): el
   hover de abajo solo cambia color -- sin movimiento que guardar tras
   PRESS.hoverGuard (punto 2 del brief) --, así que la entrada nace ya con
   los valores de PRESS, gobernando exclusivamente el press. */
export const ScBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  margin-bottom: ${({ theme }) => theme.data.space[5]};
  /* SUBRAYADO (Ola B, 2026-08-16), por el mismo motivo y con los mismos
     valores que el enlace a la comunidad de Story (ver communityLinkStyles en
     Story.tsx): GlobalStyles quita el subrayado a todo elemento a, y este
     enlace usaba EXACTAMENTE el mismo color que el cuerpo de texto de la
     pagina -- medido, oklch(0.86 0.004 286) en los dos, contraste 1,0:1.

     Aqui pesa mas que en Story por una razon concreta que sigue en pie: los
     enlaces del indice de la misma pagina SI se distinguen
     (oklch(0.86 0.104 235.851)), asi que la incoherencia era interna.

     Lo que este parrafo decia ademas -- que era la UNICA salida en la parte
     alta de un documento legal de 5.198 px, porque la cabecera no llevaba
     navegacion de secciones -- deja de ser cierto el 2026-09-03: desde la
     decision del dueno tras la critica externa #16 estas paginas montan la
     navegacion completa del sitio (ver el docblock de PrivacyDocument.tsx),
     asi que este enlace ya no es el unico camino de vuelta. Se conserva de
     todas formas: es el destino de vuelta EN EL FLUJO del documento, no en la
     barra flotante, y su afordancia se juzga contra el indice que tiene
     debajo, no contra la cabecera.

     SIN BACKTICKS: esto vive dentro del template literal de
     styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brandText};
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

export const ScTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.h1.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h1.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h1.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.h1.tracking};
  color: ${({ theme }) => theme.data.semantic.text};
  text-wrap: balance;
`;

export const ScVersionMeta = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[6]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Índice de contenidos (D22): navegación por teclado real -- cada `<a>` es
   un enlace ancla nativo, sin JS de por medio, así que hereda foco/tabulación
   y el anillo global de `GlobalStyles`. */
export const ScToc = styled.nav`
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  padding: ${({ theme }) => theme.data.space[5]};
  margin-bottom: ${({ theme }) => theme.data.space[7]};
`;

export const ScTocHeading = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[3]};
  font-size: ${({ theme }) => theme.data.type.scale.overline.size};
  font-weight: ${({ theme }) => theme.data.type.scale.overline.weight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.overline.tracking};
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

export const ScTocList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding-left: ${({ theme }) => theme.data.space[4]};
`;

export const ScTocItem = styled.li`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

/*
 * AFORDANCIA DE ENLACE EN PROSA LEGAL, en un solo sitio.
 *
 * Nació dentro de ScTocLink (crítica externa #10, hallazgo C) y se extrae a
 * un bloque css compartido en la ola de la crítica #13 (T1), cuando apareció
 * el SEGUNDO consumidor: ScInlineLink, el enlace que vive dentro del texto
 * corrido (el correo de ejercicio de derechos y la AEPD). Es un bloque css y
 * no un componente único porque los dos consumidores difieren en una
 * propiedad real -- el índice fija su propio tamaño de cuerpo (bodySm) y el
 * enlace en prosa hereda el del párrafo que lo contiene --, mismo criterio y
 * mismo mecanismo que `communityLinkStyles` en Story.tsx.
 *
 * Las dos señales, y por qué las DOS: color propio (semantic.brandText contra
 * el semantic.text del cuerpo) MÁS subrayado. WCAG 1.4.1 (Uso del color,
 * nivel A) pide justo que el color no sea el único medio de transmitir
 * información: quien no distingue ese matiz -- daltonismo, pantalla al sol,
 * modo de alto contraste -- no vería ningún enlace. El subrayado es la
 * afordancia nativa del enlace, que GlobalStyles retira para todo el sitio
 * (a { text-decoration: none }), así que devolverla aquí no inventa nada.
 * text-underline-offset separa la línea de las descendentes.
 *
 * La afordancia se declara EN REPOSO, no en hover: un hover no existe para
 * quien navega con el dedo.
 *
 * transform nace ya con los valores de vocabulary.PRESS (Task 9), sin guard
 * de hover -- el hover de aquí abajo es solo color.
 *
 * SIN BACKTICKS: esto vive dentro del template literal de styled-components
 * (task/lessons.md 2026-07-25 y 2026-08-16).
 */
const legalLinkStyles = css`
  color: ${({ theme }) => theme.data.semantic.brandText};
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brand};
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

/* Enlaces del índice: el bloque compartido de arriba más su propio tamaño de
   cuerpo. Es la única navegación interna de un documento de 5.198 px. */
export const ScTocLink = styled.a`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  ${legalLinkStyles}
`;

/*
 * Enlace DENTRO del texto corrido (crítica #13, T1): el correo de ejercicio
 * de derechos y la sede de la AEPD, que hasta esta ola se pintaban como texto
 * plano en el cuerpo de las dos páginas legales mientras el pie de esas
 * mismas páginas sí llevaba el correo enlazado.
 *
 * No declara font-size a propósito: hereda el del bloque que lo contiene
 * (párrafo, ítem de lista o `dd` de la ficha identificativa), que es lo que
 * un enlace en prosa tiene que hacer para no romper la línea base del texto
 * que atraviesa.
 */
export const ScInlineLink = styled.a`
  ${legalLinkStyles}
  /*
   * EL SEGUNDO FOCO DEL MISMO DEFECTO DE ZOOM, y el que solo aparece midiendo:
   * el arreglo de la ficha identificativa (ver el docblock de ScDl) dejo
   * /aviso-legal limpio a 320 px con la raiz a 32 px, pero /privacidad y
   * /en/privacy seguian perdiendo 79,11 px. El culpable era ESTE enlace -- el
   * correo de ejercicio de derechos, dentro del texto corrido --, con el mismo
   * token indivisible de 351 px y un mecanismo distinto: aqui no hay ninguna
   * rejilla que encoger, es una caja EN LINEA cuya palabra no cabe en la linea
   * y se sale del parrafo. Ninguna de las dos declaraciones de la rejilla lo
   * habria tocado.
   *
   * Y no era contenido desplazable: GlobalStyles declara overflow-x: clip en
   * html y body, asi que documentElement.scrollWidth seguia valiendo el ancho
   * del viewport y esos pixeles no eran alcanzables de ninguna forma
   * (WCAG 1.4.4).
   *
   * Va aqui y no en legalLinkStyles a proposito: el bloque compartido lo usa
   * tambien el indice, cuyos textos son titulos de seccion con espacios de
   * sobra. Esta regla existe para lo que este enlace porta -- correos y
   * direcciones web --, y ese es el consumidor que la necesita.
   *
   * anywhere y no break-word, por el mismo motivo que en ScDd: solo anywhere
   * reduce ademas el min-content de la caja (CSS Text 5.5).
   *
   * SIN BACKTICKS: esto vive dentro del template literal de styled-components
   * (regla 23 de RULES.md).
   */
  overflow-wrap: anywhere;
`;

/*
 * `scroll-margin-top` propio: SEPARACIÓN, NO COMPENSACIÓN DE LA BARRA.
 *
 * ESTE COMENTARIO DECÍA UNA FALSEDAD MEDIBLE HASTA EL 2026-09-04. Decía «este
 * header no es fixed, así que no hace falta compensar nada»: describía la
 * cabecera legal propia que se retiró al revertirse D20. Desde la ola M
 * (2026-09-03) estas páginas montan el `Navbar` del sitio, y lo medido en
 * Chrome sobre el build servido, en las cuatro rutas legales y en los dos
 * idiomas, es `getComputedStyle(header).position === "fixed"` con la banda
 * terminando en `bottom = 64 px`. La premisa del comentario era falsa; el
 * comportamiento, en cambio, es correcto — y conviene saber por qué, porque no
 * es por esta línea.
 *
 * QUIÉN COMPENSA DE VERDAD LA BANDA: `html { scroll-padding-top: calc(
 * var(--nav-height) + var(--nav-gap)) }` en `GlobalStyles.tsx`. Es una
 * propiedad del CONTENEDOR DE SCROLL, así que gobierna CUALQUIER
 * desplazamiento hacia un destino de este documento — el salto por fragmento
 * del índice incluido — sin que el destino tenga que declarar nada. Los 24 px
 * de aquí se SUMAN a esos 64: medido, el `<h2>` de la primera sección aterriza
 * en `top = 88 px` (64 + 24) con la barra terminando en 64, y el de las demás
 * en 137 px (los mismos 88 más el `padding-top` de esta caja). Cero de los 14
 * destinos de `/privacidad` y de los 15 de `/aviso-legal` queda bajo la barra,
 * en los dos idiomas.
 *
 * O sea: esta declaración NO compensa la cabecera y no debe intentarlo. Subirla
 * a `calc(var(--nav-height) + var(--nav-gap) + ...)` compensaría DOS VECES la
 * misma banda (128 px de hueco) porque el `scroll-padding-top` de `html` no se
 * va a ninguna parte. Lo que aporta es el respiro entre el borde inferior de la
 * barra y el título, que sin ella quedarían pegados.
 *
 * También gana al `:where(section[id])` global por especificidad — una clase de
 * styled-components (0,1,0) contra un `:where()`, que aporta cero (0,0,0) —, así
 * que estas secciones llevan 24 px donde las de la home llevan 64. La suma con
 * el `scroll-padding-top` es la que hace que las dos aterricen bien; el candado
 * que ata esa dependencia cruzada vive en `legalPage.parts.test.tsx`, que lee
 * la fuente de `GlobalStyles.tsx` (regla 41: una invariante entre dos ficheros
 * vive en un test que importa los dos).
 *
 * SIN BACKTICKS: esto vive fuera del template, pero se conserva el criterio del
 * fichero para que mover el bloque hacia dentro no rompa el build (regla 23 de
 * RULES.md).
 */
export const ScSection = styled.section`
  scroll-margin-top: ${({ theme }) => theme.data.space[5]};
  padding-top: ${({ theme }) => theme.data.space[7]};
  border-top: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }
`;

export const ScSectionHeading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  font-size: ${({ theme }) => theme.data.type.scale.h3.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h3.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h3.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScParagraph = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding-left: ${({ theme }) => theme.data.space[5]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  list-style: disc;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScListItem = styled.li`
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

/*
 * CAUSA RAÍZ DE LA PÉRDIDA DE CONTENIDO CON EL TEXTO AL 200 % (2026-09-04,
 * hallazgo del frente Q-3, medido y arreglado aquí). Con la raíz del documento
 * a 32 px -- la preferencia de tamaño de fuente del navegador al 200 %, que es
 * lo que WCAG 1.4.4 exige soportar sin perder contenido ni funcionalidad --,
 * las CUATRO rutas legales perdían la ficha identificativa por el borde
 * derecho, en los dos temas y en los dos idiomas.
 *
 * EL MECANISMO, en tres pasos. (1) Estas dos cajas declaraban `display: grid`
 * SIN `grid-template-columns`, así que su única pista es IMPLÍCITA y se
 * dimensiona con `auto`. (2) La función de tamaño MÍNIMO de una pista `auto`
 * es `min-content` (CSS Grid §7.2.3), y además un ítem de rejilla que ocupa una
 * pista con mínimo `auto` recibe su propio suelo automático de tamaño por
 * contenido (§6.6). El `dd` de la fila del correo contiene
 * `hello@voidtoinfinite.com`, un token sin un solo punto de corte, así que ese
 * min-content mide lo que mida el token entero. (3) A 32 px de raíz el token
 * mide 351,109 px medidos, mientras la caja de contenido de `ScMain` cae a
 * 224 / 264 / 294 px a 320 / 360 / 390 px de viewport (el relleno también
 * escala: `space[5]` pasa de 24 a 48 px por lado).
 *
 * LO QUE SE PERDÍA, medido en Chrome sobre el build servido, en `/privacidad`,
 * `/en/privacy`, `/aviso-legal` y `/en/legal-notice`, temas oscuro y claro: la
 * fila entera terminaba en x = 399 px SIEMPRE, es decir 79,11 px fuera del
 * viewport a 320, 39,11 px a 360 y 9,11 px a 390; 22 o 23 elementos por página
 * (las 7 filas de la ficha con su `dt` y su `dd`). Y no era contenido
 * desplazable sino contenido PERDIDO: `GlobalStyles` declara
 * `html, body { overflow-x: clip }` -- para no crear un contenedor de scroll
 * que rompa el pin de Story --, así que `documentElement.scrollWidth` seguía
 * valiendo exactamente el ancho del viewport y no había ningún gesto ni ninguna
 * tecla que alcanzara esos píxeles. Desde 414 px de viewport ya no se perdía
 * nada (351 + 48 = 399 < 414).
 *
 * EL ARREGLO, y por qué son DOS declaraciones y no una:
 *
 *   - `grid-template-columns: minmax(0, 1fr)` declara la pista explícitamente
 *     con función de tamaño mínimo `0` en vez de `auto`. Eso quita a la vez el
 *     suelo min-content de la PISTA y, por §6.6, el suelo automático de los
 *     ÍTEMS que la ocupan: la rejilla vuelve a poder encoger con su contenedor.
 *     La anchura de trabajo no cambia -- una pista `auto` implícita ya se
 *     estiraba a todo el ancho disponible, y `1fr` reparte ese mismo ancho --,
 *     verificado midiendo el ANTES y el DESPUÉS a nueve anchos.
 *   - `overflow-wrap: anywhere` en `ScDd` (abajo) es la otra mitad: sin
 *     ella la pista encogería pero el token seguiría sin poder partirse y se
 *     saldría igual, ahora de su propia caja. Se elige `anywhere` y NO
 *     `break-word` a propósito: solo `anywhere` entra en el cálculo del
 *     min-content (CSS Text §5.5), que es justo la medida que aquí sobra.
 *
 * Por qué no se resuelve con `min-width: 0` en el hijo, que es el remedio
 * clásico: `min-width: 0` en el `dd` quitaría el suelo del ÍTEM, pero dejaría
 * en pie el suelo min-content de la PISTA `auto` que lo contiene, y la fila
 * seguiría sin encoger. La pista explícita cierra los dos caminos de una vez.
 */
export const ScDl = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.data.space[3]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScDlRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.data.space[1]};
  padding-bottom: ${({ theme }) => theme.data.space[3]};
  border-bottom: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const ScDt = styled.dt`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 700;
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScDd = styled.dd`
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /*
   * LA OTRA MITAD DEL ARREGLO DE ZOOM (ver el docblock largo de ScDl arriba).
   * Este es el UNICO sitio de la ficha identificativa donde entra un valor que
   * el documento no controla -- el correo de contacto, la direccion, el NIF --,
   * y el correo de contacto es un token de 24 caracteres sin un solo punto de
   * corte natural: ni espacio, ni guion, ni salto suave.
   *
   * anywhere y no break-word: las dos parten el token al pintarlo, pero solo
   * anywhere reduce tambien el MIN-CONTENT de la caja (CSS Text 5.5). Con
   * break-word la fila seguiria reservando los 351 px del token entero como
   * anchura minima y el arreglo no llegaria a servir de nada. La distincion es
   * la razon de ser de esta linea, no un detalle de estilo.
   *
   * Coste en maquetacion normal: ninguno observable -- anywhere solo parte
   * dentro de una palabra cuando ya no cabe de ninguna otra forma. Verificado
   * midiendo los nueve anchos del barrido antes y despues.
   *
   * SIN BACKTICKS: esto vive dentro del template literal de styled-components
   * (regla 23 de RULES.md, y task/lessons.md 2026-07-25 y 2026-08-16). La
   * primera version de este comentario los llevaba y el dev server murio con
   * "Expected a semicolon" en esta misma linea.
   */
  overflow-wrap: anywhere;
`;

/* Aviso destacado (bloque `note`): borde izquierdo de acento en vez de un
   fondo sólido -- funciona igual de bien en los dos temas sin necesitar un
   color de texto distinto al del resto del documento. */
export const ScNote = styled.div`
  padding: ${({ theme }) => theme.data.space[4]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border-left: 3px solid ${({ theme }) => theme.data.semantic.warning};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};

  &:last-child {
    margin-bottom: 0;
  }
`;

/* Marcador de dato pendiente (D23): mismo rol visual en los dos temas --
   fondo de acento + borde, sin depender de un color de texto especial (el
   texto sigue heredando `semantic.text`, ya verificado AA sobre las
   superficies del sistema por `semantic.test.ts`/`contrast.test.ts`). */
export const ScMark = styled.mark`
  background: color-mix(
    in oklch,
    ${({ theme }) => theme.data.semantic.warning} 30%,
    transparent
  );
  color: inherit;
  border: 1px solid
    color-mix(
      in oklch,
      ${({ theme }) => theme.data.semantic.warning} 55%,
      transparent
    );
  border-radius: ${({ theme }) => theme.data.radius.xs};
  padding: 0 0.25em;
  font-weight: 700;
  cursor: help;
`;

export const ScTableWrap = styled.div`
  /* La tabla de almacenamiento puede desbordar en móvil (5 columnas): el
     scroll horizontal vive AQUÍ, nunca en el body -- misma regla que
     cualquier tabla/bloque de código ancho del sistema.

     CORRECCIÓN 2026-08-18 (crítica externa #10, hallazgo A): esta promesa
     era falsa hasta hoy. El desbordamiento nunca llegaba a este contenedor
     porque el crecimiento ocurría POR ENCIMA -- ScMain se dimensionaba por
     contenido y se inflaba hasta su propio max-width para dar cabida al
     min-content de la tabla (ver el comentario de ScMain). Con el ancho de
     ScMain ya definido, el sobrante cae aquí y este overflow-x actúa de
     verdad.

     QUIÉN PUEDE OPERAR ESE SCROLL (crítica #13, T2): los atributos que hacen
     esta caja alcanzable por teclado y anunciable -- role region, aria-label
     desde clave i18n y tabindex 0 -- los pone StorageBlock en
     LegalDocument.tsx, que es quien tiene el texto traducido en la mano. Van
     juntos a propósito: un tabindex sin nombre accesible deja un punto de
     tabulación mudo, y un nombre sin tabindex deja el scroll sin teclado.
     No hay estilo de foco propio porque GlobalStyles ya lo entrega a todo
     [tabindex] vía :focus-visible. */
  overflow-x: auto;
  margin: 0 0 ${({ theme }) => theme.data.space[4]};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScTable = styled.table`
  width: 100%;
  /* SUELO de ancho, no ancho de trabajo (crítica externa #10, hallazgo A).
     Hoy el ancho real lo sigue poniendo el min-content de table-layout: auto
     (~476 px medidos con estas 5 columnas y los th en nowrap), que por sí
     solo ya impide que las columnas se aplasten; este mínimo explícito está
     para que eso no pueda dejar de ser cierto. El caso concreto que cierra
     es el atajo que TAMBIÉN hace que ScMain deje de inflarse y que por eso
     es el primer candidato a arreglo -- table-layout: fixed con width: 100%
     --: a 320 px daría cinco columnas de 64 px, ilegible. Con este suelo, el
     ancho mínimo de la tabla sigue siendo la medida de lectura y lo que
     sobre lo scrollea ScTableWrap. */
  min-width: ${({ theme }) => theme.data.grid.prose};
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

export const ScCaption = styled.caption`
  text-align: left;
  margin-bottom: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textSubtle};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
`;

export const ScTh = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.data.space[2]}
    ${({ theme }) => theme.data.space[3]};
  border-bottom: 2px solid ${({ theme }) => theme.data.semantic.borderStrong};
  color: ${({ theme }) => theme.data.semantic.text};
  white-space: nowrap;
`;

export const ScTd = styled.td`
  padding: ${({ theme }) => theme.data.space[2]}
    ${({ theme }) => theme.data.space[3]};
  border-bottom: 1px solid ${({ theme }) => theme.data.semantic.border};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;
