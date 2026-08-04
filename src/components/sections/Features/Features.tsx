"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { FeaturesCelestialOrbital } from "@/components/featuresCelestialOrbital/FeaturesCelestialOrbital";
import {
  FEATURE_KEYS,
  FEATURE_CARD_VISUALS,
  FEATURE_FIGURE_BASENAME,
  FEATURES_FIGURE_SIZES,
  FEATURES_CARD_RADIUS,
  FEATURES_CTA_TRANSITION_MS,
  FEATURES_CTA_HOVER_TRANSLATE_X,
  FEATURES_CTA_MIN_HEIGHT,
  FEATURES_CHECK_ICON_PATH,
  FEATURES_GAMING_TITLE_GRADIENT,
  FEATURES_GAMING_ACCENT,
  FEATURES_GAMING_ACCENT_HOVER,
  FEATURES_OVERLAY_RISE,
  FEATURES_DARK_HEIGHT,
  FEATURES_CONTENT_MAX_WIDTH,
  FEATURES_TAIL_HOLD,
  type FeatureKey,
} from "./features.layers";

/*
 * Rama OSCURA (2026-07-30, mismo criterio que Story/Journey; reescrita
 * 2026-08-02, spec
 * `docs/superpowers/specs/2026-08-02-features-overlay-celestial-orbital-design.md`):
 * no hay mockup oscuro. En vez de las 3 tarjetas con patrón SVG + figura
 * propia + fondo pastel, el fondo es `FeaturesCelestialOrbital` -- escena de
 * 7 capas WebP compuestas con alpha normal y animadas con `useSceneParallax`
 * (mismo hook que Story/Journey). El docblock anterior de esta sección
 * afirmaba lo contrario -- "imagen plana, sin capas -- a diferencia de
 * Story/Journey no hay parallax que fingir aquí" -- y era falso desde el
 * commit `49e8ef6` (2026-07-30), que ya había dado a la escena SALIENTE
 * (`FeaturesCelestialGuide`, 10 capas) sus capas y su parallax: el
 * comentario describía una entrega anterior del mismo día y nunca se
 * actualizó. El contenido (mismo i18n `Home.features.*`) se superpone a la
 * DERECHA (la figura y los iconos del fondo quedan a la izquierda del
 * encuadre, al revés que Story/Journey). Las 3 identidades se re-maquetan
 * como bloques verticales separados por `border-top` (mismo patrón de lista
 * que Story/Journey) en vez de tarjetas con patrón/fondo propio -- esos son
 * literales de una tarjeta con fondo pastel (D10), sin sentido superpuestos
 * a una imagen. Los bullets/CTA SÍ se reutilizan tal cual (`ScBullets`/
 * `ScBulletItem`/`ScCheckIcon`/`ScCta`, más abajo): ya resuelven contra
 * `accentColor`/tokens de tema, no contra el fondo de la tarjeta.
 *
 * Desde esta entrega, además, Features SUBE sobre Journey al final de su
 * presentación de diapositivas (D2/D5, superposición por
 * `margin-block-start` negativo -- misma técnica que Story→Journey) y su
 * escena vive en un slot PEGADO (D7) independiente del contenido, no en un
 * `ScScene` que ocupe la sección entera: ver los docblocks de
 * `ScFeatures`/`ScDarkSceneSlot`/`ScDarkFrame`, más abajo, para el
 * razonamiento completo.
 */

/*
 * Features (mockup `Landing v2.dc.html` L157-210, spec §7.3). Rama CLARA:
 * sin cambios de comportamiento respecto a la reescritura anterior.
 *
 * Reescritura completa: la versión anterior mostraba tres áreas genéricas del
 * equipo (`Home.sections.*`, showcase de componentes) con un CTA final al
 * playground. El contrato i18n congelado (spec §4.1) sustituye ese contenido
 * por las tres identidades de marca (Learning/Imagination/Gaming) con cuerpo,
 * cuatro bullets y CTA propios cada una; el CTA al playground desaparece (el
 * mockup no lo tiene, cada tarjeta ya enlaza a `#contact`).
 */

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

/** Índice del escalón de reveal por tarjeta (mismo mecanismo que
 *  `ScStepReveal` en Journey.tsx: 120ms por tarjeta, como ya hacía este
 *  componente). */
const STAGGER_STEP_MS = 120;

/**
 * Color de acento por tarjeta (check de los bullets y CTA de texto — el
 * mockup usa el MISMO color para los dos roles en las tres tarjetas, ver
 * `features.layers.ts`). Learning/Imagination resuelven contra la rampa real
 * del tema (`var(--primary-600)`/`var(--secondary-600)` del mockup son los
 * mismos nombres de paso que `theme.data.palette`); Gaming usa el literal
 * propio que no tiene equivalente de tema (`FEATURES_GAMING_ACCENT`).
 */
function accentColor(theme: ThemeDefinition, key: FeatureKey): string {
  if (key === "learning") return theme.palette.primary[600];
  if (key === "imagination") return theme.palette.secondary[600];
  return FEATURES_GAMING_ACCENT;
}

/** Estado hover del acento (mockup: un paso más oscuro de la misma rampa). */
function accentColorHover(theme: ThemeDefinition, key: FeatureKey): string {
  if (key === "learning") return theme.palette.primary[700];
  if (key === "imagination") return theme.palette.secondary[700];
  return FEATURES_GAMING_ACCENT_HOVER;
}

/*
 * Rama clara: contenedor normal (padding + tope de ancho, centrado -- sin
 * cambios).
 *
 * Rama oscura ($fullBleed, D2/D7/D11, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`): la sección
 * deja de tener caja propia -- pierde `max-width`, `margin-inline: auto`,
 * `min-height` y el `display: flex` que centraba el contenido -- porque
 * ahora son `ScDarkSceneSlot` y `ScDarkFrame` (más abajo) quienes miden el
 * slot de la escena y el contenido por separado. D7: el contenido de
 * Features -- tres identidades con título, cuerpo, cuatro bullets y CTA cada
 * una -- es el más alto de la página y desborda una pantalla en viewports de
 * portátil; una escena que midiera lo mismo que la sección se estiraría y el
 * `object-fit: cover` recortaría el arte justo donde vive el vacío que ocupa
 * el texto.
 *
 * PIERDE `overflow: hidden` (D7): la pérdida NO es cosmética -- es EL FALLO
 * QUE ROMPERÍA EL PIN ENTERO EN SILENCIO, sin ningún error en consola que lo
 * delate. Cualquier ancestro con `overflow` distinto de `visible`/`clip`
 * desactiva el `position: sticky` de un descendiente: si `ScFeatures`
 * conservara su `overflow: hidden`, sería el ancestro que desactivaría el
 * `sticky` de `ScDarkSceneSlot` y la escena dejaría de quedarse pegada
 * mientras el contenido pasa por delante -- mismo fallo que D7 de
 * `2026-08-02-journey-overlay-transition-design.md` documentó para
 * `ScJourney`. El recorte del overscan de la escena lo hace `ScScene`
 * (`featuresCelestialOrbital.parts.tsx`), que ya declara su propio
 * `overflow: hidden` y no es ancestro de sí mismo.
 *
 * CONSERVA `position: relative`, el solape `margin-block-start` negativo con
 * su guard de `reduce` (mecánica idéntica a `ScJourney`, `Journey.tsx`, y a
 * las dos entregas anteriores de esta serie) y `background-color` explícito
 * -- `theme.data.semantic.bg`, NO `palette.secondary[1100]` en crudo (D10):
 * `src/theme/tokens/semantic.ts:63` declara `bg: color.secondary[1100]` para
 * el tema oscuro, así que es el mismo valor del encargo sin saltarse la capa
 * de tokens (esta rama solo existe en oscuro, D1, así que el rol semántico
 * lo da sin ambigüedad). `z-index: 2` (D11): escalera explícita de la
 * página -- Story (auto) → Journey (1) → Features (2).
 */
const ScFeatures = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          background-color: ${theme.data.semantic.bg};
          margin-block-start: calc(-1 * ${FEATURES_OVERLAY_RISE});

          @media (prefers-reduced-motion: reduce) {
            margin-block-start: 0;
          }
        `
      : css`
          padding: ${theme.data.space[8]} ${theme.data.space[5]}
            ${theme.data.space[9]};
          max-width: ${theme.data.grid.containerMax};
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: ${theme.data.space[6]};
        `}
`;

const ScHeader = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
`;

/* Kicker: mismo mapeo que `ScKicker` en Story.tsx/Hero.tsx para el mismo rol
   visual ("etiqueta de marca", mockup `var(--primary-600)`, L159) —
   `semantic.brandText`, no un paso de palette suelto. */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Los tres términos del h2 son spans de color — no hay separador en el
   `.html` exportado del mockup (`<span>Learning</span><span>Imagination…`,
   L160, concatenados sin espacio): se restaura un espacio de texto plano
   entre ellos porque la ausencia total de separación es un artefacto de la
   herramienta de exportación, no una intención legible del diseño ni de
   accesibilidad (un lector de pantalla anunciaría "LearningImaginationGaming"
   como una sola palabra). */
const ScSpanLearning = styled.span`
  /* mockup: var(--primary-800) (L160) === theme.data.semantic.brandText
     (primary[800], ver semantic.ts) -- coincidencia exacta, no aproximada. */
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

const ScSpanImagination = styled.span`
  /* mockup: var(--primary-500) (L160) === theme.data.semantic.brand
     (primary[500]) -- coincidencia exacta. */
  color: ${({ theme }) => theme.data.semantic.brand};
`;

const ScSpanGaming = styled.span`
  background-image: ${FEATURES_GAMING_TITLE_GRADIENT};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  /* Red de seguridad: sin soporte de background-clip: text el degradado no
     puede quedar como único portador del color (mismo recurso que ScAccent
     en Story.tsx / ScQuoteText en Journey.tsx). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${FEATURES_GAMING_ACCENT};
    -webkit-text-fill-color: ${FEATURES_GAMING_ACCENT};
  }
`;

const ScGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.grid.gutter};
  width: 100%;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

/* Reveal escalonado por tarjeta -- mismo mecanismo que el componente
   anterior conservaba (guard reduced-motion que fuerza el estado final Y
   anula el propio `transition-delay`, no solo la duración: si no, el
   escalonado seguiría "saltando" tarde bajo reduce en vez de aparecer ya
   resuelto). Learning ocupa las dos columnas solo ≥ md (mockup L163:
   `grid-column: span 2`); por debajo de `md` hay una sola columna y la regla
   no tiene efecto visible. */
const ScItem = styled.div<{ $index: number; $fullWidth: boolean }>`
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized};
  transition-delay: ${({ $index }) => $index * STAGGER_STEP_MS}ms;

  ${({ $fullWidth, theme }) =>
    $fullWidth && `@media ${theme.data.breakPoint.md} { grid-column: 1 / -1; }`}

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

const ScCard = styled.article<{ $key: FeatureKey }>`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 240px;
  border-radius: ${FEATURES_CARD_RADIUS};
  border: 1px solid ${({ $key }) => FEATURE_CARD_VISUALS[$key].border};
  background: ${({ $key }) => FEATURE_CARD_VISUALS[$key].background};
  box-shadow: ${({ $key }) => FEATURE_CARD_VISUALS[$key].shadow};
  transition:
    transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    box-shadow ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    border-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex-direction: row;
  }

  &:hover {
    transform: translateY(
      ${({ $key }) => FEATURE_CARD_VISUALS[$key].hoverTranslateY}
    );
    box-shadow: ${({ $key }) => FEATURE_CARD_VISUALS[$key].shadowHover};
    border-color: ${({ $key }) => FEATURE_CARD_VISUALS[$key].borderHover};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const ScPattern = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

/** Patrón SVG decorativo de fondo, copiado verbatim del mockup por tarjeta
 *  (`FEATURE_CARD_VISUALS[key].patternShapes`, L165/180/195). Puramente
 *  ornamental -- `aria-hidden`. */
function FeaturePattern({ cardKey }: { cardKey: FeatureKey }): ReactElement {
  const visual = FEATURE_CARD_VISUALS[cardKey];
  return (
    <ScPattern aria-hidden="true">
      <defs>
        <pattern
          id={visual.patternId}
          width="84"
          height="84"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${visual.patternRotate})`}
        >
          <g
            fill="none"
            stroke={visual.patternStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {visual.patternShapes.map((shape, index) =>
              shape.type === "path" ? (
                <path
                  key={index}
                  d={shape.d}
                />
              ) : (
                <circle
                  key={index}
                  cx={shape.cx}
                  cy={shape.cy}
                  r={shape.r}
                />
              ),
            )}
          </g>
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill={`url(#${visual.patternId})`}
      />
    </ScPattern>
  );
}

/* < md: el mockup no describe una figura apilada (solo el layout de fila
   `figura izquierda + contenido` de ≥ md, spec §7.3); "figuras proporcionadas"
   se resuelve con una altura fija razonable en vez de un porcentaje de la
   fila (que en apilado no existe) — 9.5rem (152px) mantiene las tres figuras
   legibles sin desbordar una tarjeta apilada de ancho de viewport. */
const ScFigure = styled.img<{ $key: FeatureKey }>`
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: 9.5rem;
  align-self: center;
  margin-inline: auto;
  object-fit: contain;
  filter: ${({ $key }) => FEATURE_CARD_VISUALS[$key].figureDropShadow};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    align-self: flex-end;
    height: ${({ $key }) => FEATURE_CARD_VISUALS[$key].figureHeight};
    margin-inline: 0;
    margin-left: ${({ theme, $key }) =>
      $key === "learning" ? theme.data.space[4] : theme.data.space[3]};
  }
`;

const ScContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding: ${({ theme }) => theme.data.space[4]}
    ${({ theme }) => theme.data.space[5]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex: 1;
    justify-content: center;
  }
`;

const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/*
 * Bullets a DOS COLUMNAS en dispositivos grandes (encargo 2026-08-03).
 *
 * Antes lo decidía una prop (`$twoColumns`) que cada rama pasaba con su
 * propio criterio: la tarjeta "learning" en oscuro (la única a ancho
 * completo), un `true` fijo en claro. Ninguno de los dos describía la
 * condición real, que no es "qué tarjeta es" sino "cuánto ancho hay" -- con
 * la prop fija, en un móvil de 375px los cuatro bullets se partían igualmente
 * en dos columnas de ~150px. Por eso la decisión baja al propio componente,
 * como `@media`, y las dos ramas lo consumen sin parámetro.
 *
 * `lg` (992px) y no `md` (768px), que es donde el resto del componente
 * cambia de layout: justo en `md` la rama clara reparte las tarjetas en DOS
 * columnas de grid (`ScGrid`), así que al cruzar ese punto el ancho real de
 * una tarjeta no crece -- se parte por la mitad. Poner aquí `md` haría que
 * los bullets se dividieran en el mismo salto en el que su contenedor se
 * estrecha, que es exactamente al revés de lo que se busca.
 */
const ScBullets = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.space[2]};

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.data.space[2]}
      ${({ theme }) => theme.data.space[5]};
  }
`;

const ScBulletItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScCheckIcon = styled.svg<{ $key: FeatureKey }>`
  flex: none;
  /* GlobalStyles fuerza svg { width: 100% } en todo el sitio: sin esta
     declaracion el atributo width="15" pierde la cascada y el check se
     estira al ancho del bullet (medido 435px en navegador, revision
     2026-07-28 -- misma leccion que el Logo en task/lessons.md). */
  width: 15px;
  height: 15px;
  stroke: ${({ theme, $key }) => accentColor(theme.data, $key)};
`;

const ScCta = styled.a<{ $key: FeatureKey }>`
  display: inline-flex;
  align-items: center;
  min-height: ${FEATURES_CTA_MIN_HEIGHT};
  margin-block-start: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h5.weight};
  color: ${({ theme, $key }) => accentColor(theme.data, $key)};
  transition:
    transform ${FEATURES_CTA_TRANSITION_MS}
      ${({ theme }) => theme.data.motion.easing.standard},
    color ${FEATURES_CTA_TRANSITION_MS}
      ${({ theme }) => theme.data.motion.easing.standard};

  &:hover {
    color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
    transform: translateX(${FEATURES_CTA_HOVER_TRANSLATE_X});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

/*
 * Slot pegado de la escena (D7): por qué vive AQUÍ y no en un `ScScene` con
 * `inset: 0` sobre la sección entera, como hizo Journey
 * (`ScJourneySceneWrap`, `journey.deck.tsx`). Con `inset: 0` la escena
 * mediría lo que mide la SECCIÓN, y el contenido de Features -- tres
 * identidades con título, cuerpo, cuatro bullets y CTA cada una -- es el más
 * alto de la página y desborda una pantalla en viewports de portátil: la
 * escena se estiraría a esa altura real y el `object-fit: cover` recortaría
 * el arte por los lados, justo donde vive el vacío que ocupa el texto. El
 * slot desacopla las dos medidas: la escena mide SIEMPRE una pantalla
 * (`FEATURES_DARK_HEIGHT`) y el contenido (`ScDarkFrame`, debajo) mide lo
 * que mide. Es además lo que pide el encargo sin condiciones: "la imagen del
 * parallax debe ocupar el ancho y alto de la pantalla del dispositivo".
 *
 * Comparte columna de grid con `ScDarkFrame` y `ScDarkTail` (`grid-column: 1`
 * en los tres; `ScFeatures` es `display: grid`) en vez de resolverse con un
 * `margin-block-end` negativo sobre este slot: ese margen negativo alteraría
 * el rectángulo de restricción del propio `sticky` y lo dejaría viajar una
 * pantalla más allá del final de la sección, pintando sobre Contact. La
 * celda compartida superpone las piezas sin tocar ninguna caja -- mismo
 * recurso que ya usa este repo en `ScJourneySlide` (`journey.deck.tsx`), no
 * `position: absolute`.
 *
 * ABARCA LAS DOS FILAS del grid (`grid-row: 1 / span 2`, D3/D4 de la spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`), no
 * solo la fila 1 que ocupa `ScDarkFrame`: la fila 2 es la zona de "hold"
 * (`ScDarkTail`, más abajo) durante la cual la escena sigue pegada sin
 * contenido real pasando por delante, mientras Contacto sube y la cubre --
 * ver el docblock de `ScDarkTail` para el porqué completo de esa zona. Se
 * usa `span 2` y NO `1 / -1`: con filas IMPLÍCITAS -- este grid no declara
 * `grid-template-rows` --, la línea `-1` resuelve a la última línea
 * EXPLÍCITA del grid, que aquí es la línea 2 (el final de la única fila
 * declarada, la de `ScDarkFrame`); `1 / -1` dejaría al slot SIN abarcar la
 * fila del hold -- un fallo silencioso clásico de CSS Grid, sin ningún error
 * en consola ni en el linter que lo delate.
 *
 * Guard de `reduce` (D15): el `sticky` en sí no es animación, pero un fondo
 * clavado mientras el texto pasa por delante es movimiento relativo, que es
 * justo lo que `reduce` pide evitar. En `static` la escena aparece una vez,
 * con sus proporciones intactas (conserva su pantalla de alto), y el resto
 * de la sección queda sobre el `background-color` de `ScFeatures`, que es
 * exactamente el `secondary[1100]` del encargo. Mismo criterio y mismo
 * desenlace que el guard de `ScJourneySceneWrap`.
 */
const ScDarkSceneSlot = styled.div`
  grid-column: 1;
  grid-row: 1 / span 2;
  align-self: start;
  position: sticky;
  top: 0;
  height: ${FEATURES_DARK_HEIGHT};

  @media (prefers-reduced-motion: reduce) {
    position: static;
  }
`;

/*
 * Marco del contenido (D7/D8): comparte columna y fila 1 de grid con
 * `ScDarkSceneSlot` (`grid-column: 1; grid-row: 1` -- el slot, además, se
 * extiende a la fila 2 del hold, ver su docblock arriba) y es quien
 * centra/topa el CONTENIDO (`FEATURES_CONTENT_MAX_WIDTH`, D8) mientras la
 * escena, en la celda hermana, mide siempre una pantalla exacta. `min-height`
 * en vez de una altura fija: si el contenido real desborda una pantalla
 * (viewports de portátil, D7), el marco crece con él y arrastra a
 * `ScFeatures` -- que ya no tiene alto propio -- en vez de recortarlo.
 * `z-index: 1`: dentro de la sección tiene que ganar la pintura sobre
 * `ScDarkSceneSlot`, que no declara ninguno (la escalera de página, D11, ya
 * la fija `ScFeatures`). `justify-content: flex-end`: el contenido va a la
 * DERECHA (el vacío del fondo está a la derecha en esta composición, al
 * revés que Story/Journey) -- mismo criterio que la sección conservaba antes
 * de esta entrega.
 *
 * `align-items: center` es precisamente por lo que este marco NO puede
 * ceder su fila al hold con un `padding-block-end` propio (D3/D4, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`): un
 * padding inferior aquí desplazaría el centro del contenido real MEDIA
 * PANTALLA hacia arriba en vez de solo añadir una zona muda al final -- ver
 * el docblock de `ScDarkTail`, más abajo, para el porqué completo de la zona
 * de hold.
 */
const ScDarkFrame = styled.div`
  grid-column: 1;
  grid-row: 1;
  position: relative;
  z-index: 1;
  min-height: ${FEATURES_DARK_HEIGHT};
  width: 100%;
  max-width: ${FEATURES_CONTENT_MAX_WIDTH};
  margin-inline: auto;
  padding: ${({ theme }) => theme.data.space[8]}
    ${({ theme }) => theme.data.space[6]};
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

/*
 * Zona de "hold" al final de la sección oscura (D3/D4/D5, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`):
 * tercer hijo de grid, `grid-column: 1; grid-row: 2`, que reserva una
 * pantalla de recorrido de scroll SIN contenido real -- durante ese tramo
 * solo se ve la escena pegada (`ScDarkSceneSlot`, arriba, que por eso abarca
 * también esta fila), mientras Contacto sube desde el borde inferior del
 * viewport y la cubre. Altura leída de `FEATURES_TAIL_HOLD`
 * (`features.layers.ts`, ver su docblock para la invariante con
 * `CONTACT_OVERLAY_RISE` y el precedente de `JOURNEY_DECK_TAIL_SCREENS`).
 * `pointer-events: none`: es una caja vacía y `aria-hidden` que no debe
 * interceptar ningún puntero sobre lo que se ve detrás (la escena pegada).
 *
 * Por qué esta zona no se resuelve con padding en vez de un hijo propio:
 * - `padding-block-end` en `ScFeatures` NO sirve porque `position: sticky`
 *   está confinado a su ÁREA DE GRID, no a la caja de padding del elemento
 *   que lo contiene -- con padding en la sección, el área de la fila 1
 *   (donde vive `ScDarkSceneSlot` hoy) seguiría terminando donde termina el
 *   contenido, y la escena se despegaría UNA PANTALLA ANTES de que Contacto
 *   la cubra: se vería una pantalla de fondo plano (`background-color` de
 *   `ScFeatures`) entre el fin de la escena y el principio de Contacto.
 * - `padding-block-end` en `ScDarkFrame` TAMPOCO sirve: es
 *   `align-items: center` (ver su docblock, arriba), así que un padding
 *   inferior desplazaría el centro de su contenido real MEDIA PANTALLA hacia
 *   arriba -- las tres identidades quedarían descentradas en vez de solo
 *   ganar una zona muda al final.
 *
 * Por eso el hold es una CAJA propia que amplía el área del grid sin tocar
 * ninguna de las dos cajas anteriores, y es lo que obliga al slot de la
 * escena a abarcar DOS filas en vez de una (`grid-row: 1 / span 2`, ver el
 * docblock de `ScDarkSceneSlot`).
 *
 * Guard de `reduce`: `height: 0`, NO `display: none`. Con `display: none` el
 * elemento deja de generar caja y el grid pasaría a tener SOLO la fila 1 --
 * el `span 2` del slot dejaría de tener una segunda fila que abarcar y la
 * FORMA del grid cambiaría entre modos. Con `height: 0` la fila sigue
 * existiendo (mide 0px) y el `span 2` del slot sigue siendo una declaración
 * válida en los dos modos. Bajo `reduce` el hold en sí SOBRA: ninguna
 * sección de la página queda pegada (`ScDarkSceneSlot` pasa a
 * `position: static`, ver su guard) y el solape de Contacto se anula
 * (`margin-block-start: 0`, guard de D5 en la spec de Contacto), así que una
 * pantalla de hold sería scroll muerto sin nada que sostener: perder
 * movimiento es aceptable, un tramo de scroll sin nada detrás no lo es.
 */
const ScDarkTail = styled.div`
  grid-column: 1;
  grid-row: 2;
  height: ${FEATURES_TAIL_HOLD};
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    height: 0;
  }
`;

/* Reveal de la rama oscura: mismo mecanismo que `ScDarkContent` en
   Story.tsx/Journey.tsx. PIERDE su `padding` (ahora lo lleva `ScDarkFrame`,
   arriba) y su `position: relative; z-index: 1` (ahora los lleva el frame,
   que es quien compite por celda de grid con `ScDarkSceneSlot`) -- este
   elemento ya no necesita su propio contexto de apilamiento. */
const ScDarkContent = styled.div`
  max-width: ${({ theme }) => theme.data.grid.prose};
  width: 100%;
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

const ScDarkHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
`;

/* Las 3 identidades como bloques verticales (mismo patrón de lista que
   Story/Journey), no como tarjetas con patrón/fondo propio: esos son
   literales de una tarjeta con fondo pastel (D10), sin sentido superpuestos
   a una imagen. */
const ScDarkFeatures = styled.div`
  display: flex;
  flex-direction: column;
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

const ScDarkFeatureBlock = styled.div`
  padding-block: ${({ theme }) => theme.data.space[5]};
  border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:first-child {
    border-block-start: none;
    padding-block-start: 0;
  }
`;

const ScDarkBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

export function Features(): ReactElement {
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

  if (themeName !== "light") {
    return (
      <ScFeatures
        id="features"
        aria-labelledby="features-title"
        $fullBleed
      >
        <ScDarkSceneSlot>
          <FeaturesCelestialOrbital />
        </ScDarkSceneSlot>
        <ScDarkFrame>
          <ScDarkContent
            ref={revealRef}
            data-revealed={revealed}
          >
            <ScDarkHeader>
              <ScKicker
                variant="overline"
                forwardedAs="p"
              >
                {t("Home.features.kicker")}
              </ScKicker>
              <Typography
                variant="h2"
                id="features-title"
              >
                <ScSpanLearning>
                  {t("Home.features.learning.title")}
                </ScSpanLearning>{" "}
                <ScSpanImagination>
                  {t("Home.features.imagination.title")}
                </ScSpanImagination>{" "}
                <ScSpanGaming>{t("Home.features.gaming.title")}</ScSpanGaming>
              </Typography>
            </ScDarkHeader>

            <ScDarkFeatures>
              {FEATURE_KEYS.map((key) => (
                <ScDarkFeatureBlock key={key}>
                  <Typography
                    variant="h3"
                    id={`feature-${key}-title`}
                  >
                    {t(`Home.features.${key}.title`)}
                  </Typography>
                  <ScDarkBody variant="bodySm">
                    {t(`Home.features.${key}.body`)}
                  </ScDarkBody>
                  <ScBullets>
                    {BULLET_KEYS.map((bulletKey) => (
                      <ScBulletItem key={bulletKey}>
                        <ScCheckIcon
                          $key={key}
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d={FEATURES_CHECK_ICON_PATH} />
                        </ScCheckIcon>
                        <span>
                          {t(`Home.features.${key}.bullets.${bulletKey}`)}
                        </span>
                      </ScBulletItem>
                    ))}
                  </ScBullets>
                  <ScCta
                    href="#contact"
                    $key={key}
                  >
                    {t(`Home.features.${key}.cta`)} →
                  </ScCta>
                </ScDarkFeatureBlock>
              ))}
            </ScDarkFeatures>
          </ScDarkContent>
        </ScDarkFrame>
        <ScDarkTail aria-hidden="true" />
      </ScFeatures>
    );
  }

  return (
    <ScFeatures
      id="features"
      aria-labelledby="features-title"
      $fullBleed={false}
    >
      <ScHeader>
        {/* forwardedAs, NO as: sobre un styled(Typography), `as` lo consume
            styled-components y sustituye a Typography entero por un <p>
            crudo (variant se cuela al DOM y la variante pierde sus estilos;
            mismo pitfall documentado en Hero.tsx:369). */}
        <ScKicker
          variant="overline"
          forwardedAs="p"
        >
          {t("Home.features.kicker")}
        </ScKicker>
        <Typography
          variant="h2"
          id="features-title"
        >
          <ScSpanLearning>{t("Home.features.learning.title")}</ScSpanLearning>{" "}
          <ScSpanImagination>
            {t("Home.features.imagination.title")}
          </ScSpanImagination>{" "}
          <ScSpanGaming>{t("Home.features.gaming.title")}</ScSpanGaming>
        </Typography>
      </ScHeader>

      <ScGrid ref={revealRef}>
        {FEATURE_KEYS.map((key, index) => {
          const basename = FEATURE_FIGURE_BASENAME[key];
          const isLearning = key === "learning";

          return (
            <ScItem
              key={key}
              $index={index}
              $fullWidth={isLearning}
              data-revealed={revealed}
            >
              <ScCard
                $key={key}
                aria-labelledby={`feature-${key}-title`}
              >
                <FeaturePattern cardKey={key} />
                <ScFigure
                  $key={key}
                  src={`/figures/${basename}-1024.webp`}
                  srcSet={`/figures/${basename}-640.webp 640w, /figures/${basename}-1024.webp 1024w`}
                  sizes={FEATURES_FIGURE_SIZES}
                  loading="lazy"
                  decoding="async"
                  alt={t(`Home.features.${key}.figureAlt`)}
                />
                <ScContent>
                  <Typography
                    variant="h3"
                    id={`feature-${key}-title`}
                  >
                    {t(`Home.features.${key}.title`)}
                  </Typography>
                  <ScBody variant="bodySm">
                    {t(`Home.features.${key}.body`)}
                  </ScBody>
                  <ScBullets>
                    {BULLET_KEYS.map((bulletKey) => (
                      <ScBulletItem key={bulletKey}>
                        <ScCheckIcon
                          $key={key}
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d={FEATURES_CHECK_ICON_PATH} />
                        </ScCheckIcon>
                        <span>
                          {t(`Home.features.${key}.bullets.${bulletKey}`)}
                        </span>
                      </ScBulletItem>
                    ))}
                  </ScBullets>
                  <ScCta
                    href="#contact"
                    $key={key}
                  >
                    {t(`Home.features.${key}.cta`)} →
                  </ScCta>
                </ScContent>
              </ScCard>
            </ScItem>
          );
        })}
      </ScGrid>
    </ScFeatures>
  );
}
