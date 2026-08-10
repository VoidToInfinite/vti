"use client";

import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { PRESS } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { FeaturesCelestialOrbital } from "@/components/scenes/featuresCelestialOrbital/FeaturesCelestialOrbital";
import {
  FEATURE_KEYS,
  FEATURE_FIGURE_BASENAME,
  FEATURES_FIGURE_SIZES,
  FEATURES_CARD_RADIUS,
  FEATURES_CARD_BORDER_WIDTH,
  FEATURES_BADGE_SIZE,
  FEATURES_IMAGE_PANEL_HEIGHT,
  FEATURES_IMAGE_CIRCLE_SIZE,
  FEATURES_IMAGE_CIRCLE_OFFSET,
  FEATURES_CONIC_BORDER_SPIN_MS,
  FEATURES_LIGHT_REVEAL_DURATION_MS,
  FEATURES_LIGHT_REVEAL_TRANSLATE_Y,
  FEATURES_LIGHT_REVEAL_DELAYS_MS,
  FEATURES_CTA_HOVER_TRANSLATE_X,
  FEATURES_CTA_MIN_HEIGHT,
  FEATURES_CHECK_ICON_PATH,
  FEATURES_GAMING_ACCENT,
  FEATURES_GAMING_ACCENT_LIGHT,
  FEATURES_GAMING_ACCENT_LIGHT_HOVER,
  FEATURES_GAMING_ACCENT_DARK,
  FEATURES_GAMING_ACCENT_DARK_HOVER,
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

/**
 * Amplitud del parallax de contenido ligado a scroll de las figuras de
 * tarjeta (D7, encargo 2026-08-04): valor PROPIO de esta entrega, no
 * transcrito de ningún mockup -- por eso vive aquí y no en
 * `features.layers.ts` (ese fichero documenta en su propia cabecera que solo
 * contiene arte VERBATIM). "Decenas de píxeles, no cientos" es literal del
 * encargo: a `--features-progress` 0..1 el recorrido total es de 5px.
 */
const FEATURES_FIGURE_PARALLAX_PX = 5;

/*
 * `STAGGER_STEP_MS` (120ms por tarjeta) RETIRADA (spec 2026-08-06, D9): el
 * escalonado por índice se sustituye por los retardos verbatim del mockup
 * (`FEATURES_LIGHT_REVEAL_DELAYS_MS`, `features.layers.ts` -- cinco desde
 * Task 11, 2026-08-09, que retira el eyebrow y con él su propio retardo),
 * que ya no son múltiplos regulares de un paso fijo -- cubren cabecera Y
 * tarjetas bajo un único `useReveal` (ver `ScReveal`, más abajo).
 */

/**
 * Color de acento por tarjeta (check de los bullets, badge, panel/círculo
 * decorativos y CTA de texto). Resuelve POR RAMA de tema desde la Task 26
 * (2026-08-10, "CTA de Features con AA en las seis combinaciones"): hasta
 * entonces devolvía el MISMO paso de `palette` (600, o `FEATURES_GAMING_ACCENT`
 * para Gaming) en claro y en oscuro -- y `palette` es compartida entre
 * `themes.light`/`themes.dark` (`themes.ts`), así que un único L no puede
 * pasar AA (4.5:1) a la vez sobre `semantic.surface` claro (blanco) y
 * `semantic.bg` oscuro (casi negro): medido, el CTA incumplía en 4 de 6
 * combinaciones tarjeta/rama (deuda documentada en `RULES.md`, cerrada por
 * esta tarea).
 *
 * `theme: ThemeDefinition` ya trae la rama resuelta en `theme.isLight`
 * (`theme.types.ts`) -- es el mismo mecanismo que ya usa el propio componente
 * para bifurcar su JSX (`Features()`, más abajo, con `themeName` del
 * `ThemeProvider` de React) y que `ThemeProvider.tsx` garantiza sincronizado
 * con el `theme.data` que styled-components inyecta (un único
 * `SCThemeProvider` para toda la página, sin anidar temas). No hace falta
 * ningún parámetro nuevo ni un mecanismo propio: `theme.isLight` ya distingue
 * la rama en la que se está pintando este mismo elemento.
 *
 * Learning/Imagination resuelven contra la rampa real del tema, un paso más
 * oscuro en claro (700, antes 600) y el mismo paso 600 en oscuro (ya pasaba
 * AA, se conserva); Gaming usa las constantes propias por rama
 * (`FEATURES_GAMING_ACCENT_LIGHT`/`_DARK`, `features.layers.ts` -- mismo hue
 * 340 que `FEATURES_GAMING_ACCENT`, L vecino elegido para pasar AA en cada
 * fondo). Ratios medidos (`contrastRatio`, `Features.test.tsx`, describe
 * "Task 26"):
 *
 *   learning:    5.07:1 sobre surface (claro) | 5.90:1 sobre bg (oscuro)
 *   imagination: 5.92:1 sobre surface (claro) | 5.08:1 sobre bg (oscuro)
 *   gaming:      5.33:1 sobre surface (claro) | 5.04:1 sobre bg (oscuro)
 *
 * Exportada desde 2026-08-06 (D5/D7/D8 spec `2026-08-06-story-features-tema-
 * claro-design.md`): además de check/CTA, la tarjeta rehecha la reutiliza
 * para el `color-mix` de fondo del badge/panel/círculo (`ScBadge`/
 * `ScImagePanel`/`ScImageCircle`, más abajo) y `Features.test.tsx` la
 * necesita para medir el contraste AA real del badge sin duplicar esta
 * función en el test.
 */
export function accentColor(theme: ThemeDefinition, key: FeatureKey): string {
  if (key === "learning") {
    return theme.isLight
      ? theme.palette.primary[700]
      : theme.palette.primary[600];
  }
  if (key === "imagination") {
    return theme.isLight
      ? theme.palette.secondary[700]
      : theme.palette.secondary[600];
  }
  return theme.isLight
    ? FEATURES_GAMING_ACCENT_LIGHT
    : FEATURES_GAMING_ACCENT_DARK;
}

/**
 * Estado hover del acento, resuelto POR RAMA desde la Task 26 (mismo motivo
 * que `accentColor`, ver su docblock -- hasta entonces devolvía el mismo paso
 * 700 en las dos ramas, y en oscuro incumplía AA: 3.51:1/3.01:1/3.32:1 medido
 * contra `semantic.bg` para learning/imagination/gaming respectivamente,
 * peor que el propio reposo). Learning/Imagination ACLARAN en oscuro (500,
 * antes 700) en vez de oscurecer -- oscurecer empeora el contraste contra un
 * fondo ya casi negro -- y siguen un paso más oscuro en claro (800, antes
 * 700, mismo criterio "hover = un paso más oscuro" del mockup). Gaming usa
 * `FEATURES_GAMING_ACCENT_LIGHT_HOVER`/`_DARK_HOVER` (mismo hue 340, L vecino
 * que aclara en oscuro igual que learning/imagination). Ratios medidos
 * (`contrastRatio`, `Features.test.tsx`, describe "Task 26"):
 *
 *   learning:    5.84:1 sobre surface (claro) | 7.82:1 sobre bg (oscuro)
 *   imagination: 6.63:1 sobre surface (claro) | 6.45:1 sobre bg (oscuro)
 *   gaming:      6.61:1 sobre surface (claro) | 6.13:1 sobre bg (oscuro)
 *
 * SEGUNDO uso, desde 2026-08-06: el número del badge (`ScBadge`, más abajo,
 * SOLO existe en la rama clara) lo consume tal cual, no `accentColor` --
 * medido de nuevo tras la Task 26 con los valores nuevos (informe de la
 * tarea): `accentColorHover` (texto) sobre
 * `color-mix(in oklab, accentColor 12%, semantic.surface)` (fondo, con los
 * nuevos pasos de reposo) da 4.96:1/5.58:1/5.60:1 según la tarjeta -- sigue
 * cumpliendo AA con MÁS margen que antes de esta tarea (4.52:1/5.21:1/4.66:1
 * con los pasos viejos), consecuencia de que reposo/hover suben un paso cada
 * uno en claro, no una regresión.
 */
export function accentColorHover(
  theme: ThemeDefinition,
  key: FeatureKey,
): string {
  if (key === "learning") {
    return theme.isLight
      ? theme.palette.primary[800]
      : theme.palette.primary[500];
  }
  if (key === "imagination") {
    return theme.isLight
      ? theme.palette.secondary[800]
      : theme.palette.secondary[500];
  }
  return theme.isLight
    ? FEATURES_GAMING_ACCENT_LIGHT_HOVER
    : FEATURES_GAMING_ACCENT_DARK_HOVER;
}

/*
 * Rama clara: contenedor normal (padding + tope de ancho, centrado) más
 * `min-height: 100dvh` con el contenido centrado en el eje de bloque
 * (Objetivo 1, encargo 2026-08-04). `min-height`, NUNCA `height` exacto: las
 * tres tarjetas (figura + cuerpo + cuatro bullets + CTA cada una) son el
 * contenido más alto de la página y no caben en una pantalla de 667px sin
 * destruir la legibilidad (mismo argumento que D4 ya aplica a la rama
 * oscura). Con `min-height` la sección mide una pantalla exacta donde el
 * contenido cabe (escritorio) y crece donde no (móvil), sin recortar nada.
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
          /* min-height, no height exacto: si el contenido no cupiera en una
             pantalla baja, la seccion crece en vez de recortar (ver el
             docblock del componente, arriba, para el razonamiento completo). */
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: ${theme.data.space[6]};
        `}
`;

/* Cabecera: mockup L188-194 -- YA NO centrada (D6, spec `2026-08-06-story-
   features-tema-claro-design.md`): block simple, alineado a la izquierda,
   sin `text-align`/`align-items:center` -- a diferencia de la cabecera
   anterior (las tres palabras de marca), que sí los llevaba. El espaciado
   entre los hijos usa `space[3]` como aproximación razonable de los
   márgenes verbatim del mockup (18px/16px, que no coinciden con ningún paso
   de la escala); no está fijado por el encargo, así que no se persigue el
   píxel exacto.

   Task 11 (dieta de ornamento A, 2026-08-09): el eyebrow (`barra + kicker`,
   antes primer hijo de este bloque) se retira -- la cabecera clara abre
   directamente con el `h2`. El eyebrow/11px en versalitas por encima de
   CADA sección era el andamiaje de IA más repetido del sitio; Features
   claro se une a Journey/Contacto en abrir con su encabezado real. */
const ScHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/* Kicker: mismo mapeo que `ScKicker` en Story.tsx/Hero.tsx para el mismo rol
   visual ("etiqueta de marca", mockup `var(--primary-600)`, L159) —
   `semantic.brandText`, no un paso de palette suelto.

   Task 11 (2026-08-09): la rama CLARA dejó de usarlo (el eyebrow que lo
   envolvía, `ScEyebrow`/`ScEyebrowBar`, se retiró por completo). Sigue
   siendo el ÚNICO destino: la rama OSCURA, donde ES el propio `<h2>`
   (`forwardedAs="h2"`, más abajo) -- ahí no se retira (es el único
   encabezado accesible de la sección), pero sube de la variante `overline`
   (11px) a `h5` (18px) para dejar de ser más pequeño que su propio cuerpo
   (deuda ALTA de DESIGN.md §9, cerrada por esta tarea). */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Párrafo de entrada nuevo (D6; mockup L192, `color: var(--text-secondary)`).
   Mismo mapeo que `ScBulletItem`/`ScBody` (más abajo) para ese rol de texto
   en este componente: `semantic.textMuted`, no un tercer rol nuevo. */
const ScIntro = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/* Los tres términos del h2 de la rama OSCURA son spans de color — no hay
   separador en el `.html` exportado del mockup viejo
   (`<span>Learning</span><span>Imagination…`, concatenados sin espacio): se
   restaura un espacio de texto plano entre ellos porque la ausencia total de
   separación es un artefacto de la herramienta de exportación, no una
   intención legible del diseño ni de accesibilidad (un lector de pantalla
   anunciaría "LearningImaginationGaming" como una sola palabra).

   Siguen existiendo tras esta entrega (D6, spec 2026-08-06): la rama CLARA
   deja de usarlos -- su `h2` pasa a ser una frase real, ver el return más
   abajo --, pero la rama OSCURA los sigue consumiendo tal cual, así que no
   se tocan ni se eliminan (D1 de la spec: nunca mutar un styled compartido
   de un modo que rompa la otra rama). */
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

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * el degradado de texto (`background-clip: text` + `FEATURES_GAMING_TITLE_GRADIENT`,
 * retirado de `features.layers.ts`) pasa a color solido. Mismo motivo que
 * `ScAccent` en Story.tsx/Contact.tsx y `ScQuoteText` en Journey.tsx: un
 * degradado de texto queda fuera del alcance de `contrast.ts` (nadie puede
 * medir el contraste de algo que no es un color), asi que nadie lo habia
 * medido nunca.
 *
 * El color elegido no es nuevo: es el MISMO `FEATURES_GAMING_ACCENT` que este
 * bloque ya usaba como fallback de `@supports not (background-clip: text)`
 * (regla 17 del manual: excepcion sancionada para arte de marca con
 * constantes con nombre en su propio módulo). No es un token de `palette.*`
 * a proposito (ver el docblock de `FEATURES_GAMING_ACCENT`,
 * `features.layers.ts`: "matiz deliberadamente distinto del secondary de
 * tema").
 *
 * Hasta la Task 26 (2026-08-10) esta frase seguía además: "...y el MISMO
 * literal que `accentColor()` ya resuelve para el check/CTA de esta misma
 * tarjeta". ESO YA NO ES CIERTO -- Task 26 resuelve `accentColor()`/
 * `accentColorHover()` por RAMA de tema (ver su docblock, más arriba) y el
 * literal que Gaming usa ahí en oscuro pasó a `FEATURES_GAMING_ACCENT_DARK`
 * (L distinto, mismo hue 340), porque `FEATURES_GAMING_ACCENT` (L=0.62) no
 * pasaba AA contra `semantic.bg` (4.47:1, por debajo de 4.5:1) y SÍ pasa
 * contra `FEATURES_ORBITAL_VOID` (4.71:1, medido más abajo) -- son dos fondos
 * DISTINTOS con presupuestos de contraste distintos, así que ya no hay
 * ninguna razón para que compartan el mismo L. `ScSpanGaming` se queda
 * exactamente con el literal que ya tenía (su medida no cambia).
 *
 * A diferencia de `ScAccent`/`ScQuoteText`, `ScSpanGaming` SOLO se renderiza
 * en la rama OSCURA (el h2 de la rama clara es una frase sin spans de color,
 * D6 mas arriba en este fichero) -- una sola medida hace falta: sobre
 * `FEATURES_ORBITAL_VOID` (el void de la escena, "#150b2e") da 4.71:1, por
 * encima de AA (4.5:1) pero con margen mas ajustado que el resto de acentos
 * de esta tarea (13+:1 en Story/Contact/Journey oscuro) -- declarado, no
 * escondido; medicion completa en Features.test.tsx, describe "Task 12".
 */
const ScSpanGaming = styled.span`
  color: ${FEATURES_GAMING_ACCENT};
`;

/*
 * Envoltorio genérico de reveal escalonado (D9, spec 2026-08-06): SUSTITUYE
 * a `ScItem` (que solo envolvía tarjetas, con `$index`/`$fullWidth` propios
 * de la rejilla). Cubre CINCO elementos de la rama clara -- `h2`, párrafo de
 * entrada y las tres tarjetas -- bajo un ÚNICO `useReveal` (ver
 * `Features()`); hasta Task 11 (dieta de ornamento A, 2026-08-09) eran seis,
 * con el eyebrow abriendo el grupo, retirado por esa tarea. El estado
 * `data-revealed` vive en
 * `ScRevealGroup` (el padre común, más abajo), NO en cada `ScReveal`, así que
 * el selector es DESCENDIENTE (`[data-revealed="true"] &`) y no calificado
 * (`&[data-revealed="true"]`) -- la variante calificada solo funcionaría si
 * el atributo viviera en el propio elemento, que es justo el matiz que
 * documenta el gotcha transversal de CSS con atributos de estado (mismo
 * patrón que ya evitó Journey/Story: un padre con el estado, hijos animados
 * como descendientes).
 *
 * Cada instancia declara su propio escalón por `$delayMs`
 * (`FEATURES_LIGHT_REVEAL_DELAYS_MS`, `features.layers.ts`) como
 * `transition-delay` SUELTO (no dentro del shorthand `transition`) --mismo
 * patrón que `ScItem` ya usaba y que la suite valida que jsdom resuelve
 * (`Features.test.tsx`, lección repo 2026-07-25/27). El guard de
 * `prefers-reduced-motion: reduce` anula la transición Y el propio retardo
 * (no solo la duración): sin eso, un elemento con 360ms de retardo se
 * quedaría invisible ese tramo bajo `reduce`, peor que no animar.
 */
const ScReveal = styled.div<{ $delayMs: number }>`
  opacity: 0;
  transform: translateY(${FEATURES_LIGHT_REVEAL_TRANSLATE_Y});
  transition:
    opacity ${FEATURES_LIGHT_REVEAL_DURATION_MS}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${FEATURES_LIGHT_REVEAL_DURATION_MS}
      ${({ theme }) => theme.data.motion.easing.standard};
  transition-delay: ${({ $delayMs }) => $delayMs}ms;

  [data-revealed="true"] & {
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

/* Envoltorio único de reveal (D9): agrupa cabecera + rejilla bajo el MISMO
   `IntersectionObserver` (`revealRef`, `Features()`) -- ver el docblock de
   `ScReveal`, arriba, para el porqué del selector descendiente. `space[7]`
   (48px) entre cabecera y rejilla: mockup L196, `margin-top: var(--space-7)`
   sobre la rejilla respecto al bloque de cabecera. */
const ScRevealGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[7]};
`;

/* Rejilla de tres tarjetas IGUALES (D5, spec 2026-08-06; mockup L196):
   SUSTITUYE al `grid-template-columns: 1fr` / `repeat(2, ...)` anterior --
   se retira el caso especial `$fullWidth` de "learning" (ya no existe: las
   tres tarjetas son geométricamente iguales, ninguna ocupa dos columnas). */
const ScGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
  gap: ${({ theme }) => theme.data.space[5]};
  align-items: stretch;
  width: 100%;
`;

/* Giro del ángulo del borde cónico (D7): anima la propiedad personalizada
   `--vti-angle` en sí, no ninguna propiedad de compositor -- por eso todo el
   bloque vive detrás de un guard `no-preference` explícito, ver
   `ScCardBorder` más abajo. `--vti-angle` YA está registrada con `@property`
   en `GlobalStyles.tsx` (no se declara ni se mueve aquí: `@property` es una
   regla de nivel superior de la hoja, y styled-components inyecta el CSS de
   un componente anidado bajo su propia clase). */
const cardBorderSpin = keyframes`
  to {
    --vti-angle: 360deg;
  }
`;

/*
 * Envoltorio-borde de la tarjeta (D7, mockup L197-198): la tarjeta EXTERIOR
 * es solo `padding: 1.5px` con el FONDO haciendo de borde -- en reposo
 * `semantic.border` (gris neutro), en hover un `conic-gradient` de marca que
 * gira. Dentro, `ScCardSurface` (más abajo) pinta la superficie blanca real
 * con el radio interior (`calc(radio - padding)`, ver el docblock de
 * `FEATURES_CARD_RADIUS`).
 *
 * Excepción declarada al lenguaje de movimiento de la casa (D7 de la spec
 * `2026-08-06-story-features-tema-claro-design.md`): el `animation` de abajo
 * NO anima `transform`/`opacity` -- anima `--vti-angle`, una propiedad
 * personalizada que repinta el `background-image` cónico en cada frame. Se
 * acepta por los mismos motivos que la excepción ya sancionada del degradado
 * de `BrandName`: es un efecto de marca, está ACOTADO al hover (no es
 * ambiental, no corre mientras nadie lo mira) y se declara SOLO bajo
 * `@media (prefers-reduced-motion: no-preference)` -- bajo `reduce` el hover
 * conserva el `translateY`/`box-shadow` (cambios instantáneos, no animados)
 * pero nunca el borde cónico ni su giro.
 *
 * Degradación conocida y aceptada: sin soporte de `@property` (que registra
 * `--vti-angle` como `<angle>` interpolable, `GlobalStyles.tsx`), el ángulo
 * no interpola y el borde queda como un degradado cónico ESTÁTICO en hover
 * -- sigue siendo un borde de marca legible, no hay estado roto, así que no
 * hace falta `@supports`.
 *
 * Paradas de marca del sistema (D7): `semantic.brand` (=`palette.primary[500]`,
 * coincide exacto con el `var(--primary-500)` del mockup) y
 * `palette.secondary[500]` (sin rol semántico propio, mismo criterio que ya
 * usa `accentColor` para `secondary` en este mismo fichero).
 *
 * Sombra (D5/D7): `elevation[1]` en reposo / `elevation[3]` en hover ("subida
 * de sombra") -- mismo mapeo de "doble sombra suave → elevation[1] / doble
 * sombra más profunda → elevation[3]" que la tabla D2 de la spec fija para
 * las tarjetas-pilar de Story; se reutiliza aquí por ser la misma gramática
 * visual del mismo sistema, no dos escalas de sombra paralelas.
 */
/*
 * Task 9 (craft de interacción, punto 3 del brief): la duración del
 * hover-lift se UNIFICA de motion.duration.base (200ms) a
 * vocabulary.PRESS.durationMs (100ms) + PRESS.easing -- la misma entrada de
 * transform pasa a gobernar también el press de abajo (:active). box-shadow
 * se queda en duration.base/easing.standard, sin tocar.
 */
const ScCardBorder = styled.article<{ $key: FeatureKey }>`
  position: relative;
  display: flex;
  height: 100%;
  padding: ${FEATURES_CARD_BORDER_WIDTH};
  border-radius: ${FEATURES_CARD_RADIUS};
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    box-shadow ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  /* Guardado tras PRESS.hoverGuard (Task 9, punto 2 del brief): mueve
     (translateY), así que un tap en táctil no puede dejarlo "pegado". El
     borde cónico de abajo se queda FUERA de este guard: es un cambio de
     background-image/animation, no de movimiento (punto 2, "los de color
     pueden quedarse"). */
  @media ${PRESS.hoverGuard} {
    &:hover {
      transform: translateY(-3px);
      box-shadow: ${({ theme }) => theme.data.elevation[1]};
    }
  }

  /* Press (Task 9): comparte la entrada de transform de la lista de arriba,
     así que entra y sale con PRESS.durationMs/PRESS.easing igual que el
     hover-lift. */
  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /* Borde cónico: SOLO bajo no-preference, y anidado como
     @media { hover {...} } -- no al revés (hover { @media {...} }) -- mismo
     orden de anidación que el resto de guards de movimiento de este fichero
     (el propio guard reduce de este componente, más abajo): es el patrón
     que este repo ya usa en todas partes para condicionar reglas de
     pseudo-clase a un @media. */
  @media (prefers-reduced-motion: no-preference) {
    &:hover {
      background-image: conic-gradient(
        from var(--vti-angle),
        ${({ theme }) => theme.data.semantic.brand},
        ${({ theme }) => theme.data.palette.secondary[500]},
        ${({ theme }) => theme.data.semantic.brand},
        ${({ theme }) => theme.data.palette.secondary[500]},
        ${({ theme }) => theme.data.semantic.brand}
      );
      animation: ${cardBorderSpin} ${FEATURES_CONIC_BORDER_SPIN_MS} linear
        infinite;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

/* Superficie interior blanca (D7): radio calculado, no un segundo literal
   (ver el docblock de `FEATURES_CARD_RADIUS`, `features.layers.ts`). */
const ScCardSurface = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.data.semantic.surface};
  border-radius: calc(${FEATURES_CARD_RADIUS} - ${FEATURES_CARD_BORDER_WIDTH});
  overflow: hidden;
`;

/* Fila superior: badge numérico + etiqueta (D6/D10; mockup L199). */
const ScCardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[3]};
  padding: ${({ theme }) => theme.data.space[5]}
    ${({ theme }) => theme.data.space[5]} 0;
`;

/*
 * Badge cuadrado (D6; mockup L200). El NÚMERO usa `accentColorHover`, no
 * `accentColor` -- ver el docblock de `accentColorHover`, arriba, para la
 * medición de contraste que motiva la elección: sobre el fondo `color-mix`
 * de este mismo badge, `accentColor` no llega a AA en ninguna de las tres
 * tarjetas y `accentColorHover` sí. `ScBadge` SOLO se renderiza en la rama
 * CLARA (ver `Features()`, más abajo), así que aquí `accentColorHover`
 * siempre resuelve su rama clara -- paso 800 para learning/imagination
 * (antes de la Task 26, 700), `FEATURES_GAMING_ACCENT_LIGHT_HOVER` para
 * gaming -- dando 4.96:1/5.58:1/5.60:1 (medido tras la Task 26, ver el
 * docblock de `accentColorHover`). `font-weight` reutiliza
 * `type.scale.h5.weight` (600, el "bold" más próximo de la escala) -- mismo
 * recurso que ya usa `ScCta` (más abajo) para el mismo propósito.
 */
const ScBadge = styled.span<{ $key: FeatureKey }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${FEATURES_BADGE_SIZE};
  height: ${FEATURES_BADGE_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  background: ${({ theme, $key }) =>
    `color-mix(in oklab, ${accentColor(theme.data, $key)} 12%, ${theme.data.semantic.surface})`};
  font-family: ${({ theme }) => theme.data.type.fontMono};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h5.weight};
  letter-spacing: 0.04em;
  color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
`;

/* Etiqueta del badge ("Aprende"/"Crea"/"Juega"): overline en
   `semantic.textSubtle` (D6/D10). */
const ScBadgeLabel = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

/* Panel de imagen (D8; mockup L202-206): bloque de altura fija con un
   círculo decorativo desbordando por abajo (`aria-hidden`) y la figura
   encima, alineada al borde inferior (ver `ScFigure`, debajo). El fondo y el
   círculo son puramente decorativos -- no llevan texto, así que no están
   sujetos al contraste de texto AA (solo `ScBadge`, que sí es texto, lo
   necesita). */
const ScImagePanel = styled.div<{ $key: FeatureKey }>`
  position: relative;
  margin-block-start: ${({ theme }) => theme.data.space[4]};
  margin-inline: ${({ theme }) => theme.data.space[3]};
  height: ${FEATURES_IMAGE_PANEL_HEIGHT};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  background: ${({ theme, $key }) =>
    `color-mix(in oklab, ${accentColor(theme.data, $key)} 7%, ${theme.data.semantic.surface})`};
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const ScImageCircle = styled.span<{ $key: FeatureKey }>`
  position: absolute;
  width: ${FEATURES_IMAGE_CIRCLE_SIZE};
  height: ${FEATURES_IMAGE_CIRCLE_SIZE};
  bottom: ${FEATURES_IMAGE_CIRCLE_OFFSET};
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${({ theme, $key }) =>
    `color-mix(in oklab, ${accentColor(theme.data, $key)} 16%, ${theme.data.semantic.surface})`};
`;

/* Parallax de contenido ligado a scroll (D7/D1, encargo 2026-08-04,
   conservado en esta entrega): se lee --features-progress (0..1, escrito por
   useSectionProgress sobre ScFeatures, ver Features()) y se traduce en un
   desplazamiento vertical de decenas de píxeles, no cientos. Ningún
   @keyframes toca transform en este elemento, así que no hay conflicto con
   el mecanismo que documenta task/lessons.md (2026-07-26, una @keyframes
   sobre una propiedad le impide a una transition sobre esa misma propiedad
   llegar a existir): aquí no hace falta transition -- la variable ya llega
   suavizada por el lerp del propio hook, frame a frame.

   `width: auto` + `height: 100%` (D8, mockup L207): sin el override explícito
   de `width`, GlobalStyles fuerza `img { width: 100% }` en todo el sitio (la
   misma regla que ya obligó a fijar el ancho de `ScCheckIcon`, más abajo) y
   la figura perdería su proporción, dejando de "alinearse al borde inferior"
   -- pasaría a llenar el panel entero y `object-position` (centrado por
   defecto en GlobalStyles) sustituiría a la alineación por flex del panel. */
const ScFigure = styled.img`
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
  transform: translateY(
    calc(var(--features-progress, 0) * -${FEATURES_FIGURE_PARALLAX_PX}px)
  );

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

/* Cuerpo de la tarjeta: título + body + bullets + CTA (sin cambios de
   estructura respecto a la entrega anterior, solo pierde el
   `position:relative;z-index:1` que necesitaba para competir con el patrón
   SVG absoluto que esta entrega retira -- ver `features.layers.ts`). */
const ScContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.data.space[2]};
  padding: ${({ theme }) => theme.data.space[5]};
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
 * como `@media`, y las dos ramas lo consumen sin parámetro salvo el nuevo
 * `$compactFrom` (D4, más abajo).
 *
 * `lg` (992px) y no `md` (768px), que es donde el resto del componente
 * cambia de layout: justo en `md` la rama clara reparte las tarjetas en DOS
 * columnas de grid (`ScGrid`), así que al cruzar ese punto el ancho real de
 * una tarjeta no crece -- se parte por la mitad. Poner aquí `md` haría que
 * los bullets se dividieran en el mismo salto en el que su contenedor se
 * estrecha, que es exactamente al revés de lo que se busca.
 *
 * `$compactFrom` (D4, compactación vertical 2026-08-04): la rama OSCURA no
 * tiene ese problema -- su contenido es una columna vertical de ancho
 * completo (hasta `FEATURES_CONTENT_MAX_WIDTH`) en TODOS los anchos, nunca
 * se reparte en dos columnas de grid, así que el argumento de arriba
 * ("no partir en el mismo salto en que el contenedor se estrecha") no
 * aplica ahí. Ancho de columna de bullets resultante en oscuro, calculado
 * contra `FEATURES_DARK_HEIGHT`/el padding real de `ScDarkFrame` (sin medir
 * en navegador -- ver el informe de la tarea): ≈256px a 600px de viewport
 * (arranque de `sm`) y ≈452px a 992px (arranque de `lg`), muy por encima de
 * los ~150px que el párrafo de arriba señala como el caso que había que
 * evitar. Por eso la rama oscura pasa `$compactFrom="sm"` (600px) en vez de
 * heredar `lg`: gana dos columnas de bullets ya en tablet, que es la mayor
 * partida del presupuesto vertical de la sección (D4) en ese rango. La rama
 * clara NO pasa la prop -- por defecto sigue en `lg`, sin cambios.
 */
const ScBullets = styled.div<{ $compactFrom?: "sm" | "lg" }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.space[2]};

  @media ${({ theme, $compactFrom }) =>
    $compactFrom === "sm"
      ? theme.data.breakPoint.sm
      : theme.data.breakPoint.lg} {
    grid-template-columns: repeat(1, minmax(0, 1fr));
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

/*
 * :focus-visible propio (D7, encargo 2026-08-04): hasta esta entrega este
 * CTA de sección solo tenía :hover. El anillo GLOBAL (GlobalStyles.tsx,
 * :where(a, ...)) ya cubre este enlace con un outline de semantic.focus,
 * pero es un :where() de especificidad CERO -- cualquier regla futura con
 * más peso lo desplazaría en silencio -- y no es verificable con un test
 * propio de este componente. Se declara aquí, ADITIVO (no sustituye el
 * anillo global, mismo criterio que focusHalo en Button.tsx), resuelto
 * contra semantic.focus en los dos temas -- ese token ya cambia de paso de
 * paleta entre claro y oscuro (theme/tokens/semantic.ts), así que un único
 * color-mix sirve para ambos sin ternario.
 */
/*
 * Task 9 (craft de interacción, punto 3 del brief): FEATURES_CTA_TRANSITION_MS
 * (150ms verbatim del mockup) se retira -- transform pasa a vocabulary.
 * PRESS.durationMs (100ms) + PRESS.easing, la misma entrada que gobierna
 * también el press de abajo (:active). color, que compartía el literal
 * retirado, pasa a motion.duration.fast (100ms) + motion.easing.standard --
 * mismo criterio que Button.tsx aplica a su background-color: no es una
 * primitiva de press, se queda con el token de paint estándar.
 */
/*
 * Task 3 (tres cierres pequeños, 2026-08-10): font-size pasa de
 * `type.scale.caption` (0.75rem, 12px) a `type.scale.bodySm` (0.875rem,
 * 14px) -- el escalón de la escala tipográfica del sistema más próximo que
 * cumple el suelo de 14px del encargo (el siguiente paso, `body`, es 16px:
 * más lejos de los 12px de partida que `bodySm`). `font-weight` se queda en
 * `h5.weight` (600, sin cambios): el encargo pide un tamaño mínimo, no un
 * peso distinto, y el semibold ya venía dando la jerarquía de "acción" frente
 * al cuerpo de la tarjeta. Contraste AA verificado en Features.test.tsx,
 * describe "Task 3": el cambio de tamaño no altera el color del CTA
 * (`accentColor`), así que el ratio medido es el MISMO en 12px que en
 * 14px -- 14px normal (no bold-large, que exigiría ≥18.66px) sigue
 * necesitando el umbral de texto normal (4.5:1), no el rebajado de 3:1 de
 * texto grande. Esa misma verificación destapó un hallazgo PREEXISTENTE, no
 * causado por este cambio: `color` (más abajo, `accentColor`) incumplía AA en
 * 4 de 6 combinaciones tarjeta/rama -- documentado entonces con los ratios
 * exactos en RULES.md, "Deuda conocida", y en el propio test; no se corrigió
 * en ESTA tarea porque exigía una decisión de diseño (el mismo color no
 * puede acercarse a AA en `surface` blanco Y en `bg` casi negro a la vez
 * subiendo o bajando un solo paso de la rampa), fuera del alcance mecánico de
 * "tres cierres pequeños". CERRADO por la Task 26 (2026-08-10, "CTA de
 * Features con AA en las seis combinaciones"): `accentColor`/
 * `accentColorHover` resuelven por RAMA de tema desde entonces -- ver sus
 * docblocks, más arriba -- y las seis combinaciones de reposo Y las seis de
 * hover pasan AA, con test que lo asevera (`Features.test.tsx`, describe
 * "Task 26"). La entrada de RULES.md, "Deuda conocida", queda reescrita como
 * resuelta, no borrada.
 */
const ScCta = styled.a<{ $key: FeatureKey }>`
  display: inline-flex;
  align-items: center;
  min-height: ${FEATURES_CTA_MIN_HEIGHT};
  margin-block-start: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h5.weight};
  color: ${({ theme, $key }) => accentColor(theme.data, $key)};
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};

  /* Guardado tras PRESS.hoverGuard (Task 9, punto 2 del brief): mueve
     (translateX), así que un tap en táctil no puede dejarlo "pegado". El
     cambio de color se queda dentro del mismo bloque -- es el MISMO :hover,
     no dos reglas separadas -- porque este hover, en conjunto, es de los
     que mueven (punto 2: se guarda la regla completa, no se trocea por
     propiedad). */
  @media ${PRESS.hoverGuard} {
    &:hover {
      color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
      transform: translateX(${FEATURES_CTA_HOVER_TRANSLATE_X});
    }
  }

  /* Press (Task 9): comparte la entrada de transform de la lista de arriba,
     así que entra y sale con PRESS.durationMs/PRESS.easing igual que el
     hover. */
  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /* focus-visible: ver el docblock de arriba. Sin transform: no necesita
     guard de hover -- es un estado de teclado, no de puntero. */
  &:focus-visible {
    color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
    border-radius: ${({ theme }) => theme.data.radius.sm};
    box-shadow: 0 0 0 4px
      color-mix(
        in oklch,
        ${({ theme }) => theme.data.semantic.focus} 35%,
        transparent
      );
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
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
 *
 * `padding-block` FLUIDO (D4, encargo 2026-08-04, palanca 1 de la
 * compactación): el `min-height` de arriba no recorta nada -- si el
 * contenido real no cabe en una pantalla, el marco crece. Lo que sí puede
 * hacerse sin recortar es no GASTAR más relleno vertical del necesario allí
 * donde el presupuesto de una pantalla aprieta.
 *
 * El término fluido va en `dvh`, NO en `vw`, y esa elección es el arreglo de
 * un defecto MEDIDO. La primera versión de esta palanca usaba
 * clamp(1.5rem, 6vw, space[8]): mide el eje EQUIVOCADO. La restricción que
 * hay que satisfacer es "el contenido cabe en el ALTO del viewport", y el
 * ancho no dice nada sobre eso -- en un 1280x720, que es el portátil más
 * común del rango, 6vw son 76,8px, por encima del techo de 64px, así que el
 * clamp se quedaba en su máximo y no ahorraba NI UN PÍXEL justo en el
 * viewport donde el marco desbordaba 128px. Solo apretaba en móviles
 * estrechos, que resulta ser donde el ancho es pequeño pero el alto es
 * grande. Con el término en `dvh` el relleno se encoge cuando la pantalla es
 * BAJA, que es exactamente cuando el presupuesto vertical escasea.
 *
 * Que el techo baje en pantallas altas no le quita aire a nada: este marco
 * es align-items center con min-height de una pantalla, así que en cuanto el
 * contenido cabe holgado el espacio sobrante lo reparte el centrado, no el
 * relleno. El relleno solo llega a verse cuando el contenido roza el borde,
 * que es el caso en el que interesa que sea pequeño.
 *
 * `padding-inline` queda FIJO en `space[6]`: el encargo pide compactar el eje
 * vertical, no el horizontal, y estrechar el ancho del contenido reduciría el
 * ancho disponible para los bullets/CTA sin ganar nada en el eje que sí hay
 * que ganar.
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
  padding-block: clamp(1rem, 3.5dvh, ${({ theme }) => theme.data.space[8]});
  padding-inline: ${({ theme }) => theme.data.space[6]};
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
   elemento ya no necesita su propio contexto de apilamiento.

   Duración (D7, encargo 2026-08-04): `slower` (480ms), no `slow` (320ms) --
   el easing `decelerate` ya era el correcto aquí; lo que no coincidía con
   `ScItem` (rama clara de entonces) era la duración. Unificadas las dos a la
   pareja más lenta de la escala, para que las entradas de Features se lean
   igual de "resueltas con calma" en los dos temas.

   Esta unificación queda INTACTA solo en la rama OSCURA: la reescritura de
   la cabecera y las tarjetas de la rama CLARA (2026-08-06, D9, spec
   `2026-08-06-story-features-tema-claro-design.md`) sustituyó a `ScItem` por
   `ScReveal` (arriba) con la duración/easing VERBATIM del mockup nuevo
   (640ms + `easing.standard`, `FEATURES_LIGHT_REVEAL_DURATION_MS`), que ya
   no coincide con `slower`/`decelerate`. No es una regresión de la
   unificación de esta entrega: D1 de la spec nueva prohíbe tocar la rama
   oscura, así que `ScDarkContent` se queda exactamente como estaba. */
const ScDarkContent = styled.div`
  max-width: ${({ theme }) => theme.data.grid.prose};
  width: 100%;
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slower}
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
   a una imagen.

   `margin-block-start` FLUIDO (D4, encargo 2026-08-04, palanca 2): separa el
   bloque de identidades del kicker de la cabecera. Mismo criterio y mismo
   arreglo de eje que el `padding-block` de `ScDarkFrame` (ver su docblock: el
   término fluido va en `dvh` porque la restricción es el ALTO del viewport,
   no su ancho) -- clamp entre 0.75rem (12px, suelo) y `space[6]` (32px,
   techo, que se alcanza a partir de ~1450px de alto). */
const ScDarkFeatures = styled.div`
  display: flex;
  flex-direction: column;
  margin-block-start: clamp(
    0.75rem,
    2.2dvh,
    ${({ theme }) => theme.data.space[6]}
  );
`;

/* `padding-block` FLUIDO (D4, palanca 2): separación entre las tres
   identidades. Clamp entre 0.75rem (12px, suelo) y `space[5]` (24px, techo)
   -- mismo criterio, mismas unidades y mismos motivos que `ScDarkFrame`/
   `ScDarkFeatures`, arriba. Son CINCO bordes de relleno en total (el primer
   bloque no lleva el superior), así que cada píxel que se ahorra aquí cuenta
   cinco veces en el presupuesto vertical de la sección. */
const ScDarkFeatureBlock = styled.div`
  padding-block: clamp(0.75rem, 2.2dvh, ${({ theme }) => theme.data.space[5]});
  border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:first-child {
    border-block-start: none;
    padding-block-start: 0;
  }
`;

/*
 * Título de cada identidad SOLO en la rama oscura (D4, palanca 4: escala
 * tipográfica del contenido oscuro con `clamp()`). NO se toca
 * `type.scale.h3` -- ese token es GLOBAL y también lo consume el `h3` de las
 * tres tarjetas de la rama CLARA de esta misma sección (`Typography
 * variant="h3"`, más abajo en el `return` claro); tocarlo cambiaría algo que
 * nadie pidió compactar. Se sobreescribe por composición
 * (`styled(Typography)`, mismo mecanismo que `ScDarkBody`/`ScKicker`, más
 * abajo: la clase envolvente se inyecta DESPUÉS de la del propio
 * `Typography` y gana la cascada sin `&&`, medido en este repo,
 * `task/lessons.md` 2026-07-25).
 *
 * El suelo del clamp (1.125rem = 18px) queda MUY por encima del mínimo de
 * 12px que exige el encargo a propósito: es un título de nivel 3, no cuerpo
 * de texto, y perder toda su jerarquía visual frente al cuerpo a cambio de
 * compactar unos pocos píxeles más sería un defecto nuevo, no una
 * compactación. El techo se lee del propio token (`type.scale.h3.size`,
 * "1.5rem") en vez de repetir el literal, para que no pueda desincronizarse
 * si el token cambia.
 *
 * El término fluido es `min(4vw, 2.6dvh)` y no solo `4vw`, por el mismo
 * motivo que documenta `ScDarkFrame`: el presupuesto que hay que respetar es
 * el ALTO del viewport. Con solo el término en `vw`, un portátil corto y
 * ancho (1366x650, medido) se llevaba el título a su techo de 24px justo en
 * el viewport donde menos alto sobra; el `min()` deja que gane el eje que
 * esté más apretado en cada caso, que es la única lectura que sirve a los
 * dos regímenes -- móvil estrecho y alto, portátil ancho y bajo -- con una
 * sola declaración.
 */
const ScDarkFeatureTitle = styled(Typography)`
  font-size: clamp(
    1.125rem,
    min(4vw, 2.6dvh),
    ${({ theme }) => theme.data.type.scale.h3.size}
  );
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
  /*
   * Progreso de scroll de la rama CLARA (D7/D1, encargo 2026-08-04):
   * `useSectionProgress` exige un ref ESTABLE (`useRef`, nunca creado inline
   * en el render -- `task/lessons.md` 2026-07-31) y se llama de forma
   * INCONDICIONAL, antes de los dos `return` de tema -- las reglas de hooks
   * de React lo exigen. El ref solo se ATA al `<ScFeatures>` de la rama
   * clara, más abajo; en oscuro `featuresRef.current` se queda en `null` (el
   * hook ya contempla ese caso, ver su JSDoc) y no hay observer que sostener
   * -- la rama oscura ya tiene su propio movimiento ligado a scroll vía
   * `useSceneParallax`, dentro de `FeaturesCelestialOrbital`, fuera del
   * alcance de este flujo.
   */
  const featuresRef = useRef<HTMLElement>(null);
  useSectionProgress(featuresRef, { cssVarPrefix: "features" });

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
              {/* Task 11 (dieta de ornamento A, 2026-08-09): CASO ESPECIAL --
                  este kicker ES el h2 real de la sección (forwardedAs="h2",
                  aria-labelledby de ScFeatures apunta a su id). No se
                  retira: sube de `overline` (11px) a `h5` (18px) para dejar
                  de ser más pequeño que su propio cuerpo (`ScDarkBody`,
                  `bodySm`/14px) -- cierra la deuda ALTA de DESIGN.md §9. */}
              <ScKicker
                variant="h5"
                forwardedAs="h2"
                id="features-title"
              >
                {t("Home.features.kicker")}
              </ScKicker>
            </ScDarkHeader>

            <ScDarkFeatures>
              {FEATURE_KEYS.map((key) => (
                <ScDarkFeatureBlock key={key}>
                  <ScDarkFeatureTitle
                    variant="h3"
                    id={`feature-${key}-title`}
                  >
                    {key === "learning" && (
                      <ScSpanLearning>
                        {t("Home.features.learning.title")}
                      </ScSpanLearning>
                    )}

                    {key === "imagination" && (
                      <ScSpanImagination>
                        {t("Home.features.imagination.title")}
                      </ScSpanImagination>
                    )}

                    {key === "gaming" && (
                      <ScSpanGaming>
                        {t("Home.features.gaming.title")}
                      </ScSpanGaming>
                    )}
                  </ScDarkFeatureTitle>
                  <ScDarkBody variant="bodySm">
                    {t(`Home.features.${key}.body`)}
                  </ScDarkBody>
                  <ScBullets $compactFrom="sm">
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
      ref={featuresRef}
      id="features"
      aria-labelledby="features-title"
      $fullBleed={false}
    >
      {/* Envoltorio único de reveal (D9): un solo useReveal (revealRef/
          revealed) cubre cabecera + rejilla -- ver el docblock de
          `ScRevealGroup`/`ScReveal`, arriba. Task 11 (2026-08-09): la
          cabecera abre directamente con el h2 -- el eyebrow (kicker + barra)
          que antes iba primero se retiró. */}
      <ScRevealGroup
        ref={revealRef}
        data-revealed={revealed}
      >
        <ScHeader>
          <ScReveal
            $delayMs={FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}
            data-reveal-delay={FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}
          >
            <Typography
              variant="h2"
              id="features-title"
            >
              {t("Home.features.title")}
            </Typography>
          </ScReveal>

          <ScReveal
            $delayMs={FEATURES_LIGHT_REVEAL_DELAYS_MS[1]}
            data-reveal-delay={FEATURES_LIGHT_REVEAL_DELAYS_MS[1]}
          >
            <ScIntro variant="body">{t("Home.features.intro")}</ScIntro>
          </ScReveal>
        </ScHeader>

        <ScGrid>
          {FEATURE_KEYS.map((key, index) => {
            const basename = FEATURE_FIGURE_BASENAME[key];
            const delayMs = FEATURES_LIGHT_REVEAL_DELAYS_MS[2 + index];
            /* Números 01/02/03: decorativos (D6/D10) -- aria-hidden en
               ScBadge, más abajo; el orden ya lo comunica el DOM. */
            const number = String(index + 1).padStart(2, "0");

            return (
              <ScReveal
                key={key}
                $delayMs={delayMs}
                data-reveal-delay={delayMs}
              >
                <ScCardBorder
                  $key={key}
                  aria-labelledby={`feature-${key}-title`}
                >
                  <ScCardSurface>
                    <ScCardHead>
                      <ScBadge
                        $key={key}
                        aria-hidden="true"
                      >
                        {number}
                      </ScBadge>
                      <ScBadgeLabel variant="overline">
                        {t(`Home.features.${key}.badge`)}
                      </ScBadgeLabel>
                    </ScCardHead>

                    <ScImagePanel $key={key}>
                      <ScImageCircle
                        $key={key}
                        aria-hidden="true"
                      />
                      <ScFigure
                        src={`/figures/${basename}-1024.webp`}
                        srcSet={`/figures/${basename}-640.webp 640w, /figures/${basename}-1024.webp 1024w`}
                        sizes={FEATURES_FIGURE_SIZES}
                        loading="lazy"
                        decoding="async"
                        alt={t(`Home.features.${key}.figureAlt`)}
                      />
                    </ScImagePanel>

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
                  </ScCardSurface>
                </ScCardBorder>
              </ScReveal>
            );
          })}
        </ScGrid>
      </ScRevealGroup>
    </ScFeatures>
  );
}
