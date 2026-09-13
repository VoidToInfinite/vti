"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { backToTopClearance } from "@/components/layout/BackToTop/BackToTop";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { focusNavAnchorTarget } from "@/components/layout/Navbar/navAnchorFocus";
import { SectionBeam } from "@/components/scenes/sectionBeam/SectionBeam";
import { StarField } from "@/components/scenes/starField/StarField";
import { Logo } from "@/components/ui/Logo/Logo";
import { Typography } from "@/components/ui/Typography/Typography";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { EMAIL_ADDRESS, links } from "@/config/links";
import { navGroupsFor, navLocale } from "@/config/navigation";
import { LEGAL_ROUTE_KEYS, routePath } from "@/config/site";
import { PRESS } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import { FOOTER_DARK_BG } from "./footer.layers";

/*
 * Footer (spec 2026-07-28-landing-v2-secciones-design.md §7.5, D6, mockup
 * `Landing v2.dc.html` L240-291): a diferencia de las 4 secciones de
 * `HomeSections`, este componente vive en LOS DOS TEMAS -- el encargo del
 * usuario (§1) es "tema oscuro: solo hero y footer", así que el footer NO
 * puede desaparecer en oscuro. El bloque de marca, la columna "Resources"
 * (enlaces externos, ninguno depende de las secciones) y la barra inferior
 * (copyright + legales) no dependen de qué secciones estén montadas: viven en
 * los dos temas sin condición.
 *
 * D16 (spec 2026-08-03-contacto-footer-oscuro-design.md): las columnas
 * "Explore" y "Discover" vuelven a montarse SIEMPRE, revirtiendo a propósito
 * la decisión anterior de este mismo fichero -- que las ocultaba en oscuro
 * porque eran "anclas a las 4 secciones de tema claro ... que en oscuro no
 * existen". Esa premisa quedó obsoleta antes que el propio gate: `HomeSections`
 * (`HomeSections.tsx:17-26`) dejó de condicionar el montaje de
 * Story/Journey/Features/Contact por tema -- las 4 se montan SIEMPRE -- y
 * cada una declara su `id` en las dos ramas (comprobado con grep, no de
 * memoria: `Story.tsx:363,482`, `Journey.tsx:479,634`, `Features.tsx:702,788`,
 * `Contact.tsx:425,455`). Las anclas del footer nunca llegaron a estar
 * "muertas" en la página real.
 *
 * D17: el fondo oscuro pasa a `FOOTER_DARK_BG` (casi negro del mockup,
 * `footer.layers.ts`).
 *
 * D9/D10: el footer estrena `useReveal` SOLO para su costura -- lo trae el
 * propio `SectionBeam` -- y un campo de 24 estrellas titilantes precalculadas
 * (`footer.layers.ts`, D10: tabla de constantes, no `Math.random()`, para no
 * romper la hidratación de este `output: 'export'`). El CONTENIDO del footer
 * (enlaces, copyright) sigue SIN reveal: el footer está debajo del pliegue
 * final de la página y no usa `useReveal`/`IntersectionObserver` para su
 * contenido, a diferencia de las 4 secciones de tema claro. Lo que sí
 * necesita saber cuándo se le mira es el haz, por el mismo motivo que D8 de
 * la spec: dibujarlo al montar lo dejaría ya dibujado mucho antes de que
 * nadie llegase a verlo.
 *
 * Desde 2026-08-07 (spec `2026-08-07-footer-beam-estrellas-tema-claro-design.md`,
 * D3/D4/D5/D6/D7 -- este fichero es el flujo B de esa entrega; el haz lo
 * adapta el flujo A en `sectionBeam.*`), la rama clara DEJA de ser "sin haz
 * ni estrellas": las dos piezas se montan SIEMPRE (D6.3) y su tonalidad en
 * claro se resuelve por estrella con `footerStarTint`/`footerStarGlow`
 * (`footer.layers.ts`, D3/D4), sin tocar un solo píxel de la rama oscura
 * (D5, candado byte a byte en `footer.layers.test.ts`). El `border-top` de
 * la rama clara se retira (D6.4): en las DOS ramas la frontera con lo que
 * viene detrás la marca el haz, no un borde sólido -- en oscuro porque ya lo
 * decidía D17, en claro porque ese borde era `neutral[100]`, exactamente el
 * mismo color que `semantic.surfaceSunken` (el propio fondo del footer, tras
 * el ajuste del usuario del commit `74458b2`) -- 1.00:1 de contraste,
 * invisible.
 */

/*
 * `position: relative` SIN CONDICIÓN (D6.1): sin él, el haz
 * (`position: absolute; top: 0`) y el campo de estrellas
 * (`position: absolute; inset: 0`), que ahora se montan en los DOS temas,
 * se anclarían al primer ancestro posicionado que hubiera más arriba -- o al
 * viewport -- y aparecerían fuera del footer. `$dark` sigue decidiendo el
 * fondo -- y AHORA SOLO eso (D6.5): el `border-top` que llevaba la rama
 * clara desapareció (D6.4, ver el docblock de cabecera de este fichero).
 */
const ScFooter = styled.footer<{ $dark: boolean }>`
  position: relative;

  ${({ $dark, theme }) =>
    $dark
      ? css`
          background-color: ${FOOTER_DARK_BG};
        `
      : css`
          background-color: ${theme.data.semantic.surfaceSunken};
        `}
`;

/* Grid de columnas ≥ md (spec: "grid de columnas ≥ md / apilado debajo").
   `auto-fit`/`minmax`, no las fracciones literales del mockup (1.4fr 1fr 1fr
   1fr 1.3fr): las 4 columnas de enlaces se montan siempre (D16), pero
   `auto-fit` sigue siendo el criterio de "cambio mínimo" frente a fijar
   fracciones literales que nada en este fichero necesitaba ajustar.
   `position: relative; z-index: 1` SIN CONDICIÓN desde 2026-08-07 (D6.2 de la
   spec 2026-08-07-footer-beam-estrellas-tema-claro-design.md): con las
   estrellas ahora posicionadas encima del fondo en los DOS temas, el
   contenido necesita salir por encima en los DOS temas -- ya no depende de
   `$dark`, que esta pieza pierde. */
/*
 * LAS PISTAS SE DECLARAN CON `minmax(0, ...)`, y no es una preferencia de
 * estilo: es lo que impide que el pie pierda texto con la preferencia de
 * tamano de fuente al 200 % (WCAG 1.4.4, critica externa #19).
 *
 * LO MEDIDO, en Chrome real sobre el build de produccion con la raiz del
 * documento en 32px (`Page.setFontSizes`, la misma palanca que mueve la
 * preferencia del usuario), a 320 px de ancho: la direccion de correo
 * (`hello@voidtoinfinite.com`, un token que ninguna regla de division puede
 * partir por si sola) mide 307 px de ancho intrinseco en una caja de
 * contenido de 224 px. Con `grid-template-columns: 1fr` la pista NO baja de
 * ese minimo -- el minimo automatico de una pista `1fr` es su `min-content`,
 * no cero --, asi que la pista entera medua 259 px y TODO el contenido del
 * pie (los titulos de columna, los catorce enlaces, la marca) se salia 35,22
 * px por la derecha. Y salirse aqui no es quedarse a un scroll de distancia:
 * `GlobalStyles` declara `html, body { overflow-x: clip }`, asi que
 * `scrollWidth` no se mueve y esos pixeles no se alcanzan con ningun gesto ni
 * tecla. Contenido perdido, no desplazable.
 *
 * `minmax(0, 1fr)` deja que la pista baje por debajo del contenido, y la
 * division del token largo la resuelve `overflow-wrap: anywhere` en el propio
 * enlace (`footerLinkStyles`, mas abajo). Las dos declaraciones se necesitan:
 * sin la primera la pista no encoge, sin la segunda el texto se sale de la
 * pista encogida. `anywhere` y no `break-word`: solo el primero reduce tambien
 * el `min-content` de la caja, que es la magnitud de la que dependen la pista y
 * los items. Un enlace que cabe no se parte -- la declaracion solo actua cuando
 * la alternativa es perder el texto.
 *
 * En el bloque `md` el minimo de la pista pasa de `10rem` a
 * `min(10rem, 100%)` por el mismo motivo, un escalon mas arriba: `10rem` son
 * 320 px con la raiz a 32, y cinco pistas de ese minimo no caben en 768 px --
 * `auto-fit` reparte el sobrante, pero nunca baja del minimo declarado.
 *
 * `padding`: termino INLINE en `inlineSpace`, terminos de BLOQUE en `space`
 * (ver el docblock de `inlineSpace` en `tokens/space.ts`). Con la raiz por
 * defecto el rail lateral del pie mide exactamente lo mismo que siempre, y con
 * la fuente al 200 % deja de crecer cuando el viewport ya no da mas de si.
 *
 * `padding-inline` del bloque `md`: mismo rail que las secciones acotadas de
 * la home -- `containerMax` mas el peldano 5, igual que ScFeatures y
 * ScContact. Hasta la critica externa #14 (2026-09-02) este bloque subia al
 * peldano 6 y el texto del pie arrancaba en x=152 a 1440 px mientras Features
 * y Contacto arrancaban en 144 -- cuatro railes distintos medidos
 * (144/152/156/177) que se leian como desalineacion, no como decision. El
 * peldano se lee de `inlineSpace` desde el 2026-09-05, y esas tres secciones
 * tambien: el rail sigue siendo uno solo, y con la raiz por defecto sigue
 * midiendo lo mismo.
 */
const ScInner = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.inlineSpace[5]}
    ${({ theme }) => theme.data.space[5]};
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.data.space[6]};
  position: relative;
  z-index: 1;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr));
    padding-inline: ${({ theme }) => theme.data.inlineSpace[5]};
  }
`;

/* `min-width: 0`: la pista ya puede encoger (ver el docblock de `ScInner`),
   pero un item de grid conserva su `min-width: auto` y volveria a inflarse
   hasta el `min-content` de su contenido -- las dos declaraciones son la misma
   valvula en dos capas, y sin la de aqui la de arriba no llega a notarse. */
const ScBrandCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.data.space[3]};
  min-width: 0;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    /* La marca ocupa más ancho que una columna de enlaces (mockup: 1.4fr
       frente a 1fr): con auto-fit eso se aproxima ocupando dos pistas
       cuando hay sitio (D16: las 4 columnas de enlaces se montan siempre en
       los dos temas, así que esto ya no depende del tema). */
    grid-column: span 2;
    max-width: 22rem;
  }
`;

/* La fila de marca fija su propio tamano de fuente y ESO ES LO QUE DECIDE EL
   TAMANO DEL ROTULO: `ScBrandName` (`BrandName.tsx`) declara `font-size: 1em`,
   es decir, hereda de aqui. El logotipo de al lado no depende de esta linea
   (`Logo size="1.5rem"`, mas abajo, en rem).

   El valor sale del TOKEN desde el 2026-09-02 (critica externa #15, hallazgo
   C 6). Era `1rem` escrito a mano -- el mismo valor, byte a byte, que
   `type.scale.body.size`, y sin ningun argumento propio: este mismo fichero
   ya lee `type.scale.bodySm.size` dos declaraciones mas abajo, asi que la
   unica razon de que este siguiera a mano es que nadie lo miro. Un literal
   que hoy coincide con el token deja de coincidir el dia que el token se
   retoque, y el CSS renderizado no distingue los dos casos. */
const ScBrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
`;

const ScTagline = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* `min-width: 0`: mismo motivo que en `ScBrandCol` -- es item de la misma
   rejilla y su minimo automatico la volveria a inflar. */
const ScColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
  min-width: 0;
`;

const ScColumnTitle = styled(Typography)`
  font-weight: 700;
`;

/*
 * `gap: space[0]`, antes `space[2]` (8px) -- crítica externa #11, hallazgo A,
 * P2, y NO es una pérdida de aire: la separación entre líneas no se retira,
 * se MUDA al interior de cada enlace (`padding-block: space[1]` en
 * `footerLinkStyles`, más abajo, 4px arriba + 4px abajo = los mismos 8px que
 * este `gap` dejaba entre cajas). El paso vertical entre textos sigue siendo
 * el de siempre; lo que cambia es a quién pertenece el espacio -- y con él,
 * si es zona de toque o tierra de nadie.
 *
 * Sin esa mudanza, agrandar la diana habría empujado cada enlace 8px más
 * abajo que el anterior y estirado las cuatro columnas del pie: el aumento se
 * habría notado en escritorio, que es justo lo que el encargo pedía evitar.
 * Con ella, la única diferencia geométrica en TODOS los anchos es que la lista
 * entera empieza 4px más abajo y termina 4px más arriba de donde empezaba;
 * ninguna distancia entre enlaces se mueve.
 *
 * Por eso NO se acota a `pointer: coarse` ni al breakpoint móvil (las dos
 * salidas que el encargo autorizaba si el diseño de escritorio se resentía):
 * no se resiente. Y una diana de 24px tampoco es un apaño para dedos -- el
 * mismo enlace de 16px es igual de fácil de fallar con un ratón impreciso o
 * con temblor; acotarla a `coarse` habría dejado esa mejora fuera del camino
 * por el que se prueba y se revisa este sitio.
 */
const ScColumnLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[0]};
`;

/* Enlace secundario del footer: `textMuted` en reposo, `brandText` al hover
   -- mismo rol/transición que `ScNavLink` del Navbar (spec §7.5/§7.6 piden
   el mismo lenguaje visual para los enlaces de sección de los dos
   componentes). */
/*
 * SUBRAYADO EN REPOSO (crítica externa #14, dimensión 4 de Craft; decisión
 * del dueño D3, 2026-09-02).
 *
 * El hallazgo, medido en navegador: los 14 anclas del pie computaban
 * `rgb(99, 99, 99)`, `font-weight: 400`, `14px` y `text-decoration: none` --
 * exactamente los mismos cuatro valores que el texto PLANO del pie. El único
 * indicio de que eran enlaces era su posición en columna, y el único indicio
 * interactivo era el cambio de color al pasar el puntero. En táctil no hay
 * puntero: ahí un enlace del pie no tenía ninguna señal de serlo.
 *
 * El sitio ya sabe hacer esto y no hay que inventar nada: las páginas
 * legales subrayan sus enlaces con estas tres declaraciones exactas
 * (`legalLinkStyles` y `ScBackLink` en `legalPage.parts.tsx`, y
 * `communityLinkStyles` en `Story.tsx`). Se reutiliza ese lenguaje tal cual
 * -- no hay mixin compartido que importar; el patrón se repite hoy en tres
 * puntos y este es el cuarto, todos con los mismos valores.
 *
 * Los valores, y por qué: `1px` de grosor porque el subrayado tiene que
 * distinguirse sin competir con el texto de 14px, y `0.25em` de separación
 * porque el subrayado por defecto corta las descendentes (g, j, p, q, y) y a
 * este tamaño eso se lee como una tachadura fina.
 *
 * El COLOR no cambia: `textMuted` en reposo y `brandText` al hover/foco,
 * como hasta ahora. `text-decoration-color` no se declara, así que la línea
 * hereda `currentColor` y viaja con el texto en los dos estados.
 *
 * No mueve la geometría: `text-decoration` no ocupa espacio de layout, así
 * que la diana táctil de 24px de más abajo sigue midiendo lo mismo.
 *
 * Gana a la regla global (`a { text-decoration: none }` en `GlobalStyles`)
 * por especificidad: una clase de styled-components (0,1,0) pesa más que un
 * selector de elemento (0,0,1). Mismo mecanismo por el que ya funcionan los
 * enlaces legales.
 */
/*
 * DIANA TÁCTIL DE 24px (crítica externa #11, hallazgo A, P2, WCAG 2.5.8 Target
 * Size (Minimum), AA en WCAG 2.2).
 *
 * El hallazgo, medido a 390x844: los enlaces del pie median 342x16 px con paso
 * vertical de 24 px. Los 16 px son la caja de línea de un texto de
 * `bodySm` (0.875rem = 14px) bajo el `line-height: 1.15` global
 * (`GlobalStyles.tsx`) -- 16.1 px --, y los 8 px que faltaban hasta el paso
 * eran `gap` del contenedor: espacio VISIBLE que no era de nadie y por tanto
 * no era zona de toque. Todos los anclas que comparten este bloque (los
 * destinos de `NAV_GROUPS` -- 11 cuando se midió, 12 desde que `about` entró
 * en la navegación el 2026-09-02 --, la dirección de correo y los 2
 * documentos legales de la barra inferior) fallaban el criterio por igual.
 *
 * DOS declaraciones, cada una con un trabajo distinto:
 *
 * - `padding-block: space[1]` es la que de verdad agranda la diana en el
 *   escenario real, y la que mantiene el texto CENTRADO en ella: 16.1 + 4 + 4
 *   = 24.1 px. Es también la que compensa exactamente el `gap` que pierde
 *   `ScColumnLinks` (ver su docblock), así que el paso vertical entre textos
 *   no se mueve ni un píxel.
 * - `min-height: space[5]` (1.5rem = 24px) es el SUELO, no un adorno
 *   redundante: los 24.1 px de arriba dependen de dos valores que este bloque
 *   no controla (el tamaño de `bodySm` y el `line-height` global), y bastaría
 *   con que cualquiera de los dos bajara para volver a caer por debajo del
 *   umbral sin que nada avisara. `space[5]` es el MISMO token, por el MISMO
 *   motivo y con la misma cita de WCAG que ya eligió `ScJourneyRailMark`
 *   (`journey.deck.tsx`) en la ola anterior para su caja de toque.
 *
 * Los tres contenedores que montan estos enlaces son flex (`ScColumnLinks`,
 * `ScBrandCol`, `ScBottomLinks`), así que sus hijos están blockificados y las
 * dos declaraciones se aplican como en cualquier caja de bloque -- no como el
 * relleno vertical de un `<a>` en línea, que pinta pero no reserva alto.
 *
 * El TEXTO no cambia de tamaño: crece la diana, no la letra.
 */
const footerLinkStyles = css`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  /* La otra mitad del arreglo de zoom que documenta ScInner. */
  overflow-wrap: anywhere;
  min-height: ${({ theme }) => theme.data.space[5]};
  padding-block: ${({ theme }) => theme.data.space[1]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /* Ver el docblock de arriba: el subrayado es la única señal de "esto es un
     enlace" que funciona sin puntero. */
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. Un único
     punto de declaración -- ScFooterLink y ScFooterNavLink (más abajo) lo
     heredan interpolando este mismo bloque css, no lo redeclaran. */
  touch-action: manipulation;
  /* transform se añade a esta lista (Task 9, vocabulary.PRESS): el hover de
     arriba solo cambia color -- sin movimiento que guardar tras
     PRESS.hoverGuard (punto 2 del brief) --, así que la entrada nace ya con
     los valores de PRESS, gobernando exclusivamente el press de abajo. */
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

const ScFooterLink = styled.a`
  ${footerLinkStyles}
`;

/* Enlace a una ruta INTERNA de este mismo sitio. Existe separado de
   ScFooterLink porque la diferencia no es de estilo sino de mecanismo: los
   destinos propios se navegan con next/link (sin recarga, con prefetch) y
   NUNCA con target blank -- ver el comentario de LEGAL_LINKS. */
const ScFooterNavLink = styled(Link)`
  ${footerLinkStyles}
`;

/*
 * `position: relative; z-index: 1` SIN CONDICIÓN (D6.2 de la spec
 * 2026-08-07-footer-beam-estrellas-tema-claro-design.md, extendida a esta
 * pieza en la integración): mismo motivo que `ScInner` -- necesita salir por
 * encima de las estrellas posicionadas, y desde esta entrega las estrellas se
 * montan en los DOS temas, no solo en oscuro.
 *
 * No es cosmético y no depende de que las estrellas tengan z-index: el orden
 * de pintado dentro de un contexto de apilamiento coloca los descendientes de
 * bloque EN FLUJO y sin posicionar (paso 3 de CSS 2.1 SS9.9.1) ANTES que los
 * descendientes POSICIONADOS con z-index auto (paso 6) -- da igual el orden
 * del DOM. Con esta barra sin posicionar en claro, las 24 estrellas (y sus
 * halos) se habrían pintado ENCIMA del copyright y de los cuatro enlaces
 * legales, aunque en el DOM vayan antes.
 *
 * `padding`: término INLINE en `inlineSpace`; el de abajo, que es de BLOQUE,
 * se queda en `space` (y lo sustituye el `padding-bottom` declarado justo
 * después).
 */
const ScBottomBar = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: 0 ${({ theme }) => theme.data.inlineSpace[5]}
    ${({ theme }) => theme.data.space[5]};
  /*
   * HUECO DEL BOTÓN «VOLVER ARRIBA» (crítica #12). Medido a 390x844 en tema
   * oscuro: el botón flotante (44x44, fijo al filo inferior derecho) tapaba los
   * últimos ~36 px de «Únete a la comunidad» y «Explora el código» -- dos
   * enlaces reales, en la última fila del documento, imposibles de pulsar sin
   * acertar en el trozo que asomaba.
   *
   * La medida sale ENTERA de backToTopClearance (BackToTop.tsx), que compone la
   * banda con el mismo bottom y el mismo lado del botón real: aquí no se
   * escribe ni un número. Ver su docblock para el porqué de cada sumando y para
   * por qué la reserva vive en el contenido y no en el botón. (Regla 23: sin
   * comillas invertidas dentro de un comentario de template -- cierran el
   * literal y rompen el build.)
   *
   * Sustituye al space[5] inferior del padding de arriba (declaración
   * posterior, misma especificidad), no se suma a él: la banda ya incluye la
   * separación del filo.
   */
  padding-bottom: ${({ theme }) => backToTopClearance(theme)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding-inline: ${({ theme }) => theme.data.inlineSpace[6]};
    /*
     * DESDE md VUELVE AL RELLENO DE SIEMPRE, y no es una excepción cosmética:
     * el solape solo existe cuando la barra está CENTRADA. Con align-items:
     * flex-start (justo arriba) sus dos filas se alinean al borde izquierdo y
     * el botón vive en el derecho del viewport, así que no hay nada bajo él que
     * reservar -- y reservarlo igualmente añadiría vacío al final de cada
     * página en escritorio, que es un problema nuevo a cambio de ninguno
     * resuelto.
     */
    padding-bottom: ${({ theme }) => theme.data.space[5]};
    text-align: start;
  }

  position: relative;
  z-index: 1;
`;

const ScBottomLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[4]};
`;

/*
 * Los DOS documentos legales de la barra inferior. Eran cuatro hasta el
 * 2026-08-08: la revision legal de esa fecha retiro `/terminos` (el sitio no
 * contrata nada; sus clausulas de uso pasan al Aviso legal) y `/accesibilidad`
 * (declaracion voluntaria, no exigible a un titular privado), y con ellos el
 * boton de "Preferencias de cookies" que vivia justo debajo -- sin tecnologia
 * que requiera consentimiento no hay preferencia que configurar. El porque
 * completo esta en `LEGAL_ROUTE_KEYS` (`src/config/site.ts`).
 *
 * D19 de la spec 2026-08-04: mantener target blank sobre una ruta PROPIA es un
 * antipatron -- rompe el boton atras, abre una pestana que el usuario no ha
 * pedido y cambia de contexto sin avisar, que es lo que WCAG 3.2.5 pide
 * evitar. El target blank se queda SOLO donde el destino de verdad sale del
 * sitio (el SDK, unico enlace de la columna de Recursos).
 *
 * LA LISTA DEJA DE SER UNA CONSTANTE DE MODULO (critica #12, P0): su `href`
 * salia de `links.privacy`/`links.legalNotice`, que son las rutas CASTELLANAS
 * (`ROUTES`, ver `links.ts`), asi que en `/en` los dos unicos enlaces del pie
 * que no son anclas llevaban al documento en castellano -- «Privacy Policy» a
 * `/privacidad` y «Legal Notice» a `/aviso-legal`. Ahora se componen por
 * idioma con `routePath()`, la misma funcion y el mismo mapa que ya usa el
 * selector de idioma para su contraparte. Las CLAVES no se escriben aqui: son
 * `LEGAL_ROUTE_KEYS` (`src/config/site.ts`), que ya es su duena y ya declara
 * por que son dos y no cuatro -- repetirlas aqui era una segunda lista que
 * podia divergir de ella.
 */

export function Footer(): ReactElement {
  const { t, i18n } = useTranslation("common");
  /* Idioma de la pagina, leido del proveedor que monta la rama de rutas (ver
     el docblock de `navGroupsFor`): en `/en` los 7 destinos de seccion de este
     pie apuntaban a la home castellana. */
  const locale = navLocale(i18n.language);
  const navGroups = navGroupsFor(i18n.language);
  const { themeName } = useTheme();
  const year = new Date().getFullYear();
  const isDark = themeName === "dark";

  return (
    <ScFooter $dark={isDark}>
      <SectionBeam />
      {/* Campo de 24 estrellas titilantes (D9/D10; en los dos temas desde D6.3
          de la spec 2026-08-07-footer-beam-estrellas-tema-claro-design.md).
          Vive en `scenes/starField` desde el 2026-09-13, cuando `About` pasó a
          llevar el mismo fondo: es la misma pieza en los dos sitios. */}
      <StarField />

      <ScInner>
        <ScBrandCol>
          <ScBrandRow>
            <Logo size="1.5rem" />
            <BrandName />
          </ScBrandRow>
          <ScTagline variant="bodySm">{t("Common.Footer.tagline")}</ScTagline>
          {/*
            La dirección de correo, a la vista y sin rellenar nada (Task 16,
            fix round, encargo del dueño 2026-08-11). Efecto colateral que
            destapó la revisión: al retirar de Contacto el chip que SIMULABA
            un campo, la dirección dejó de verse antes de enviar -- en la
            experiencia unificada solo aparece en el panel que revela un envío
            válido. Vuelve aquí, no junto al formulario, precisamente para no
            arriesgar el anti-patrón que se acaba de retirar: en el pie, entre
            la marca y su lema, un correo se lee como dato de contacto y no
            como algo donde escribir.

            `ScFooterLink` (el ancla externa del pie), sin `target="_blank"` y
            por tanto SIN el aviso de `Common.Nav.newTab`: un `mailto:` no
            abre una pestaña, delega en la aplicación de correo -- el mismo
            criterio que D19 aplica a las rutas propias (no se anuncia un
            cambio de contexto que no ocurre).

            El texto es la dirección misma, tomada de `EMAIL_ADDRESS`
            (derivada de `links.email`, `src/config/links.ts`): no es copia
            traducible -- por eso mismo la Task 16 retiró `Home.contact.email`
            del JSON -- así que no lleva clave de i18n ni etiqueta visible que
            la acompañe. Su nombre accesible es la propia dirección.
          */}
          <ScFooterLink href={links.email}>{EMAIL_ADDRESS}</ScFooterLink>
        </ScBrandCol>

        {navGroups.map((group) => (
          <ScColumn key={group.key}>
            <ScColumnTitle variant="bodySm">
              {t(`Common.Nav.${group.key}`)}
            </ScColumnTitle>
            <ScColumnLinks>
              {group.items.map((item) =>
                item.kind === "external" ? (
                  <ScFooterLink
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(`Common.Nav.${item.key}`)}
                    <VisuallyHidden> {t("Common.Nav.newTab")}</VisuallyHidden>
                  </ScFooterLink>
                ) : (
                  <ScFooterLink
                    key={item.key}
                    href={item.href}
                    /*
                     * Foco en el destino (crítica externa #9, punto 1). Hasta
                     * aquí el pie era la superficie ASIMÉTRICA de las tres que
                     * consumen `NAV_GROUPS`: `Navbar` y `NavSheet` ya llamaban
                     * a este mismo helper al activar una fila y el pie no,
                     * así que el mismo enlace («Historia») dejaba el foco en
                     * `<body>` según desde dónde se pulsara. Aquí no hay nada
                     * que cerrar antes (no hay panel ni hoja), así que la
                     * llamada va sola, sin el par cierre + foco que sí
                     * necesitan las otras dos.
                     *
                     * Solo esta rama: `kind: "external"` sale del documento y
                     * el helper devolvería `null` de todas formas -- ponerlo
                     * también allí sería un manejador que no puede hacer nada.
                     */
                    onClick={() => focusNavAnchorTarget(item)}
                  >
                    {item.kind === "feature"
                      ? t(`home:Home.features.${item.key}.title`)
                      : t(`Common.Navigation.${item.key}`)}
                  </ScFooterLink>
                ),
              )}
            </ScColumnLinks>
          </ScColumn>
        ))}
      </ScInner>

      <ScBottomBar>
        <Typography
          variant="caption"
          as="span"
        >
          {t("Common.Footer.copyright", { year })}
        </Typography>
        <ScBottomLinks>
          {/* prefetch={false}: bug abierto de Next 16 en static export
              (vercel/next.js #85374 y #92341, reproducido en 16.2.11 -- Task 28)
              -- el nombre de fichero que pide el prefetch de segmento RSC
              (`__next.<ruta>.__PAGE__.txt`, plano) no coincide con el que
              genera `output: "export"` (`__next.<ruta>/__PAGE__.txt`,
              anidado), así que el prefetch SIEMPRE 404 en estas dos rutas. El
              click sigue navegando bien (Next cae al fetch de página completa
              como fallback), así que el único efecto de no desactivarlo es
              ruido de 404 en consola/logs en las 3 páginas del sitio.
              Reversión: cuando el fix llegue aguas arriba y se verifique con
              el mismo repro, retirar esta prop. */}
          {LEGAL_ROUTE_KEYS.map((key) => (
            <ScFooterNavLink
              key={key}
              href={routePath(key, locale)}
              prefetch={false}
            >
              {t(`Common.Footer.${key}`)}
            </ScFooterNavLink>
          ))}
        </ScBottomLinks>
      </ScBottomBar>
    </ScFooter>
  );
}
