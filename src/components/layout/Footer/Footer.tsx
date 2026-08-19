"use client";

import type { CSSProperties, ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled, {
  css,
  keyframes,
  useTheme as useStyledTheme,
} from "styled-components";
import { backToTopClearance } from "@/components/layout/BackToTop/BackToTop";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { focusNavAnchorTarget } from "@/components/layout/Navbar/navAnchorFocus";
import { SectionBeam } from "@/components/scenes/sectionBeam/SectionBeam";
import { Logo } from "@/components/ui/Logo/Logo";
import { Typography } from "@/components/ui/Typography/Typography";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { EMAIL_ADDRESS, links } from "@/config/links";
import { navGroupsFor, navLocale } from "@/config/navigation";
import { LEGAL_ROUTE_KEYS, routePath } from "@/config/site";
import { PRESS } from "@/motion/vocabulary";
import type { ThemeDefinition } from "@/theme/theme.types";
import { useTheme } from "@/theme/ThemeProvider";
import {
  type FooterStar,
  FOOTER_DARK_BG,
  FOOTER_STARS,
  FOOTER_STAR_TWINKLE_MAX_SCALE,
  FOOTER_STAR_TWINKLE_MIN_OPACITY,
  FOOTER_STAR_TWINKLE_MIN_SCALE,
  footerStarGlow,
  footerStarTint,
} from "./footer.layers";

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

/* Campo de estrellas titilantes (D9/D10, D3/D6 de la spec
   2026-08-07-footer-beam-estrellas-tema-claro-design.md): contenedor
   decorativo, sin captura de puntero, del mismo tamaño que el footer -- se
   monta en los DOS temas desde esta entrega. Su tinte por estrella se
   resuelve contra el tema activo en `starVars`, más abajo (D4); este
   contenedor en sí no cambia entre temas. */
const ScStars = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

/* `starTwinkle`, VERBATIM del mockup (`Footer animado v2.dc.html` L29):
   solo `opacity`/`transform`. Infinita -- se declara solo bajo
   `no-preference` y el bloque `reduce` fuerza `animation: none` explícito
   (D8: con el colapso global `animation-iteration-count: 1 !important`, una
   animación infinita corre una vez y deja un fotograma arbitrario, no el
   último). */
const starTwinkle = keyframes`
  0%,
  100% {
    opacity: ${FOOTER_STAR_TWINKLE_MIN_OPACITY};
    transform: scale(${FOOTER_STAR_TWINKLE_MIN_SCALE});
  }
  50% {
    opacity: 1;
    transform: scale(${FOOTER_STAR_TWINKLE_MAX_SCALE});
  }
`;

/*
 * Una estrella. Su variación (posición, tamaño, tinte, halo, ritmo) NO entra
 * por props interpoladas en el template sino por PROPIEDADES PERSONALIZADAS
 * que cada instancia escribe en su atributo `style` (`starVars`, más abajo).
 *
 * La diferencia no es de gusto, está MEDIDA. Con las cinco interpolaciones
 * como props transitorias, styled-components genera una clase distinta por
 * estrella -- y con ella sus dos bloques `@media` -- así que 24 estrellas son
 * 24 clases y ~72 reglas inyectadas en la hoja en tiempo de ejecución. Coste
 * real del render completo de la página en oscuro: **5160 ms con las 24
 * estrellas frente a 4315 ms con cero** (media de varias corridas del mismo
 * fichero de integración, `app/home-page.flujo.test.tsx`), es decir ~850 ms
 * y ~35 ms por estrella, solo en inyección de CSS. Eso bastaba para que ese
 * test síncrono desbordara el presupuesto de 5000 ms de Vitest con los
 * workers por defecto. Con variables, el template es ESTÁTICO: una sola
 * clase para las 24, y la variación viaja en el atributo `style`, que el
 * navegador resuelve sin tocar la hoja de estilos.
 *
 * En reposo (`reduce`, o antes de que `no-preference` aplique la animación)
 * queda en su opacidad mínima -- el mismo valor que el 0%/100% del propio
 * keyframe -- para no destellar de golpe a opacidad 1.
 *
 * CURVA (crítica externa #9, encargo transversal de tokens de movimiento):
 * hasta hoy el titileo declaraba la palabra clave `ease-in-out`, la única
 * curva de este fichero que no salía de ningún token -- exactamente lo que
 * prohíbe la regla 48 de `RULES.md`. Pasa a `motion.easing.standard`
 * (`cubic-bezier(0.4, 0, 0.2, 1)`), el paso del sistema que ocupa ese rol:
 * acelera y frena, sin rebote. No es idéntica (`ease-in-out` es simétrica y
 * `standard` frena más tarde), y esa diferencia es la razón de elegirla
 * frente a `PRESS.easing`/`REVEAL.easing` (`cubic-bezier(0.23, 1, 0.32, 1)`),
 * la otra candidata del vocabulario: esa curva es un ease-out fuerte que
 * llegaría al pico casi de golpe y convertiría el titileo en un parpadeo.
 *
 * La interpolación de tema NO reabre el coste medido que documenta el párrafo
 * anterior: lo que generaba 24 clases era la variación POR INSTANCIA (cinco
 * props distintas por estrella). El valor de esta curva es el mismo para las
 * 24, así que styled-components resuelve el mismo texto CSS para todas y sigue
 * emitiendo UNA sola clase -- la variación por estrella sigue viajando entera
 * por el atributo `style`, que es la propiedad que este docblock protege.
 */
const ScStar = styled.div`
  position: absolute;
  top: var(--star-top);
  left: var(--star-left);
  width: var(--star-size);
  height: var(--star-size);
  border-radius: 50%;
  background: var(--star-tint);
  box-shadow: var(--star-glow);
  opacity: ${FOOTER_STAR_TWINKLE_MIN_OPACITY};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${starTwinkle} var(--star-duration)
      ${({ theme }) => theme.data.motion.easing.standard} var(--star-delay)
      infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/*
 * Las cinco variables de una estrella, en el formato que espera el CSS de
 * `ScStar`. Recibe `theme` (D3/D4/D5, spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`) porque el tinte y
 * el halo ya NO son literales fijos en `FooterStar` -- son `tintKey`/
 * `glowBlurPx`, y `footerStarTint`/`footerStarGlow` (`footer.layers.ts`) los
 * componen contra el tema activo. Esta composición ocurre AQUÍ, en JS, y no
 * como interpolación del template de `ScStar`, a propósito: ese template
 * tiene que seguir siendo ESTÁTICO por rendimiento (ver su docblock, más
 * arriba) -- la variación, de tema o de estrella, viaja siempre por el
 * atributo `style`.
 *
 * `box-shadow` necesita `none` explícito cuando la estrella no lleva halo:
 * una variable sin valor dejaría la declaración inválida.
 */
function starVars(star: FooterStar, theme: ThemeDefinition): CSSProperties {
  return {
    "--star-top": star.top,
    "--star-left": star.left,
    "--star-size": star.size,
    "--star-tint": footerStarTint(theme, star.tintKey),
    "--star-glow":
      footerStarGlow(theme, star.tintKey, star.glowBlurPx) ?? "none",
    "--star-duration": `${star.durationMs}ms`,
    "--star-delay": `${star.delayMs}ms`,
  } as CSSProperties;
}

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
const ScInner = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[5]};
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.space[6]};
  position: relative;
  z-index: 1;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    padding-inline: ${({ theme }) => theme.data.space[6]};
  }
`;

const ScBrandCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.data.space[3]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    /* La marca ocupa más ancho que una columna de enlaces (mockup: 1.4fr
       frente a 1fr): con auto-fit eso se aproxima ocupando dos pistas
       cuando hay sitio (D16: las 4 columnas de enlaces se montan siempre en
       los dos temas, así que esto ya no depende del tema). */
    grid-column: span 2;
    max-width: 22rem;
  }
`;

const ScBrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: 1rem;
`;

const ScTagline = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
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
   componentes). Sin subrayado: GlobalStyles ya fija `text-decoration: none`
   en todos los `a`. */
/*
 * DIANA TÁCTIL DE 24px (crítica externa #11, hallazgo A, P2, WCAG 2.5.8 Target
 * Size (Minimum), AA en WCAG 2.2).
 *
 * El hallazgo, medido a 390x844: los enlaces del pie median 342x16 px con paso
 * vertical de 24 px. Los 16 px son la caja de línea de un texto de
 * `bodySm` (0.875rem = 14px) bajo el `line-height: 1.15` global
 * (`GlobalStyles.tsx`) -- 16.1 px --, y los 8 px que faltaban hasta el paso
 * eran `gap` del contenedor: espacio VISIBLE que no era de nadie y por tanto
 * no era zona de toque. Los 14 anclas que comparten este bloque (11 destinos
 * de `NAV_GROUPS`, la dirección de correo y los 2 documentos legales de la
 * barra inferior) fallaban el criterio por igual.
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
  min-height: ${({ theme }) => theme.data.space[5]};
  padding-block: ${({ theme }) => theme.data.space[1]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
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
 */
const ScBottomBar = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: 0 ${({ theme }) => theme.data.space[5]}
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
    padding-inline: ${({ theme }) => theme.data.space[6]};
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
  // El tema AMBIENTAL de styled-components, no `themes[themeName]` construido
  // a mano (integración 2026-08-07): `ThemeProvider.tsx:90` ya expone
  // exactamente `{ data: themes[themeName] }`, así que resolverlo otra vez
  // aquí duplicaría la fuente de verdad de "qué tema está activo" -- la misma
  // clase de divergencia que Navbar.tsx documenta al retirar su ThemeProvider
  // anidado (su docblock, "no hay ningun segundo arbol de tema contra el que
  // algo pueda divergir"). `useStyledTheme` lee el que de verdad están usando
  // los styled-components de este mismo fichero.
  const { data: theme } = useStyledTheme();

  return (
    <ScFooter $dark={isDark}>
      <SectionBeam />
      <ScStars aria-hidden="true">
        {FOOTER_STARS.map((star) => (
          <ScStar
            key={star.id}
            style={starVars(star, theme)}
          />
        ))}
      </ScStars>

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
