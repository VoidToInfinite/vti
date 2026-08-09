"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { Field, Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { PRESS } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import { links } from "@/config/links";
import { ContactCosmicGuardian } from "@/components/scenes/contactCosmicGuardian/ContactCosmicGuardian";
import { CONTACT_GUARDIAN_VOID } from "@/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers";
import { SectionBeam } from "@/components/scenes/sectionBeam/SectionBeam";
import {
  CONTACT_CARD_BG_DARK,
  CONTACT_CARD_BORDER,
  CONTACT_CARD_BORDER_DARK,
  CONTACT_CARD_GRADIENT,
  CONTACT_CHIP_BG_LIGHT,
  CONTACT_CONTENT_MAX_WIDTH,
  CONTACT_CONTENT_PAIR_MAX,
  CONTACT_CONTENT_PAIR_MAX_VW,
  CONTACT_CTA_HOVER_SHADOW,
  CONTACT_DARK_HEIGHT,
  CONTACT_FIGURE_FLOAT_MS,
  CONTACT_FIGURE_HEIGHT,
  CONTACT_FIGURE_LEFT,
  CONTACT_FIGURE_SHADOW,
  CONTACT_FIGURE_SIZES,
  CONTACT_FIGURE_TOP,
  CONTACT_FLOAT_AMPLITUDE,
  CONTACT_FORM_BG,
  CONTACT_FORM_BORDER,
  CONTACT_OVERLAY_RISE,
  CONTACT_RING_A_BORDER,
  CONTACT_RING_A_RIGHT,
  CONTACT_RING_A_SIZE,
  CONTACT_RING_B_BORDER,
  CONTACT_RING_B_RIGHT,
  CONTACT_RING_B_SIZE,
  CONTACT_RING_HALO_GRADIENT,
  CONTACT_RING_HALO_RIGHT,
  CONTACT_RING_HALO_SIZE,
  CONTACT_TOP_GLOW_BLUR,
  CONTACT_TOP_GLOW_GRADIENT,
  CONTACT_TOP_GLOW_HEIGHT,
  CONTACT_TOP_GLOW_PULSE_MS,
  CONTACT_TOP_GLOW_WIDTH,
} from "./contact.layers";
import {
  gradientShift,
  heroGradient,
} from "@/components/layout/Brand/BrandName";

/*
 * Última sección. Rama CLARA (spec §7.4, mockup `#contact` L212-238):
 * tarjeta con degradado pastel, chip de email + CTA a la izquierda, figura
 * que saluda con anillos concéntricos decorativos a la derecha en ≥ md.
 * `Socials` NO vive aquí (spec §7.5: se muda al footer, que la reutiliza tal
 * cual con los enlaces reales del repo). Objetivo 1/2 (encargo 2026-08-04):
 * gana `min-height: 100dvh` con centrado vertical (ver `ScContact`, más
 * abajo -- `flex-direction: column`, NO `row` el defecto de `flex`: con un
 * único hijo, `ScCard`, la dirección columna deja el eje cruzado horizontal
 * con `align-items` en su valor por defecto `stretch`, que es lo que
 * conserva el ancho completo que la tarjeta ya tenía como bloque normal; con
 * `row` la tarjeta, sin `flex-grow`, dejaría de estirarse al ancho del
 * contenedor -- una regresión de layout, no solo de movimiento) y un
 * parallax sutil de la figura/anillos ligado a `--contact-progress`
 * (`useSectionProgress`, ver `ScFigureWrap`/`ScRings` y `Contact()`) -- hasta
 * esta entrega no tenía ni un movimiento ligado a scroll.
 *
 * Rama OSCURA (reescrita 2026-08-03, spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`,
 * D2/D6): hermana pequeña de `ScFeatures` (`Features.tsx`) — MISMA anatomía
 * de grid de una columna, slot de escena pegado (`ScDarkSceneSlot`, más
 * abajo) y marco de contenido (`ScDarkFrame`) compartiendo celda. Hasta esta
 * entrega era una caja acotada y centrada de `1280px × 90dvh` entre dos
 * secciones a sangre (Features arriba, Footer abajo) — la única de las
 * cuatro secciones oscuras que no participaba en la cadena de solapes
 * Story→Journey→Features. Ahora SUBE sobre el hold de Features (D2/D4:
 * `margin-block-start` negativo de `CONTACT_OVERLAY_RISE`, que DEBE valer
 * exactamente lo mismo que `FEATURES_TAIL_HOLD` — la igualdad la ata un
 * test, `Contact.test.tsx`) y su escena vive en un slot pegado independiente
 * del contenido, igual que Features. `z-index: 3` completa la escalera de
 * página: Story (auto) → Journey (1) → Features (2) → Contacto (3).
 *
 * PIERDE `overflow: hidden`, `height` fija, `max-width` de sección,
 * `margin-inline: auto`, `display: flex`, `align-items` y `justify-content`
 * — todo lo que hacía de esto una caja centrada. La pérdida de
 * `overflow: hidden` NO es cosmética: sería el ancestro que desactiva EN
 * SILENCIO el `position: sticky` de `ScDarkSceneSlot` — mismo fallo que este
 * repo ya documentó tres veces (`task/lessons.md`; D7 de las specs de
 * Journey y de Features). El recorte del overscan de la escena lo hace
 * `ScScene` (`contactCosmicGuardian.parts.tsx`), que ya declara su propio
 * `overflow: hidden` y no es ancestro de sí mismo.
 *
 * `background-color`: el void de SU PROPIA escena (`CONTACT_GUARDIAN_VOID`,
 * `#0d0416`, literal del kit `cosmic-guardian-parallax-kit` declarado en
 * `demo/index.html` y citado en
 * `assets/contact-cosmic-guardian/manifest.json`), NO `theme.data.semantic.bg`
 * como hace `ScFeatures` (D11 de la spec de Features). `semantic.bg` en
 * oscuro es `color.secondary[1100]` = `oklch(0.22 0.093 311.928)`: un morado
 * que, bajo la pantalla pegada, se vería como una banda CLARA (L 0.22 frente
 * a L 0.137 de `#0d0416` — conversión sRGB→OKLab con la fórmula de Björn
 * Ottosson, ejecutada y sanity-checked contra blanco=1.0 y negro=0.0; de
 * paso corrige la cifra de este mismo docblock en la entrega anterior, que
 * daba «≈0.02» para el void saliente `#02040e` cuando su L real es 0.111 —
 * era relativa-luminancia confundida con L de OKLCH) y rompería la
 * continuidad con el casi-negro del footer (`FOOTER_DARK_BG`,
 * `oklch(0.055 0.01 288)`, spec D17) — el fondo de esta sección solo se ve
 * durante el propio solape, nunca detrás de contenido real, así que tiene
 * que casar con sus dos vecinos oscuros, no con el rol semántico genérico de
 * "fondo de página".
 */

/**
 * Amplitudes del parallax de contenido ligado a scroll de la rama CLARA
 * (D7, encargo 2026-08-04): valores PROPIOS de esta entrega, no transcritos
 * de ningún mockup -- por eso viven aquí y no en `contact.layers.ts` (ese
 * fichero documenta en su propia cabecera que solo contiene arte VERBATIM).
 * "Decenas de píxeles, no cientos" es literal del encargo. Signos opuestos
 * (figura sube, anillos bajan) y magnitud distinta a propósito: dos capas
 * del mismo fondo que se mueven a velocidad diferente leen como profundidad,
 * moverse juntas en bloque no.
 */
const CONTACT_FIGURE_PARALLAX_PX = 28;
const CONTACT_RINGS_PARALLAX_PX = 14;

const ScContact = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          background-color: ${CONTACT_GUARDIAN_VOID};
          margin-block-start: calc(-1 * ${CONTACT_OVERLAY_RISE});

          @media (prefers-reduced-motion: reduce) {
            margin-block-start: 0;
          }
        `
      : css`
          padding: ${theme.data.space[9]} ${theme.data.space[5]};
          max-width: ${theme.data.grid.containerMax};
          margin-inline: auto;
          /* min-height, no height exacto (ver el docblock del componente,
             arriba, para el razonamiento completo). flex-direction: column,
             no row (el defecto de flex): con un unico hijo y direccion
             columna, el eje principal queda vertical -- justify-content
             centra ahi -- y el eje cruzado (horizontal) mantiene su
             align-items por defecto, stretch, que es lo que conserva el
             ancho completo que la tarjeta ya tenia como bloque normal. Con
             row (el defecto) la tarjeta, sin flex-grow, dejaria de
             estirarse al ancho del contenedor -- una regresion de layout,
             no solo de movimiento. */
          min-height: 50dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        `}
`;

/*
 * Tarjeta (mockup L213): borde/degradado VERBATIM en `contact.layers.ts`
 * (D10 — no son roles semánticos, son literales de esta composición; la
 * sombra de 44px que también venía de ahí se retiró en Task 12, ver el
 * docblock justo debajo). `border-radius`/`padding`/`gap` SÍ coinciden con los tokens
 * del sistema (`radius["2xl"]`, `space[6]`) porque el propio mockup los
 * declara con `var(--radius-2xl)`/`var(--space-6)` — no hay conversión que
 * hacer, coinciden con los nuestros por definición.
 *
 * `overflow: hidden` contiene los anillos decorativos y la figura, que
 * sobresalen del marco de la tarjeta (mismo motivo que `ScFrame` en
 * `eye.parts.tsx`). El reveal (opacity/translateY) vive en ESTE elemento:
 * una sola unidad de entrada para toda la tarjeta, igual que `ScContent` en
 * `Story.tsx`.
 *
 * Duración/easing (D7, encargo 2026-08-04): `slower` + `decelerate`, no
 * `slow` + `emphasized` -- mismo criterio de unificación que `ScItem`/
 * `ScDarkContent` en `Features.tsx`: las entradas de las secciones claras
 * pasan a la pareja más lenta de la escala, para que se lean "resueltas con
 * calma" en vez de "puntuales".
 */
/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, ghost-card):
 * regla borde-O-sombra, nunca los dos (impeccable) -- esta tarjeta CONSERVA
 * su borde 1px (`CONTACT_CARD_BORDER`) y RETIRA la sombra de 44px
 * (`CONTACT_CARD_SHADOW`, tambien retirada de contact.layers.ts por quedarse
 * sin consumidor). Por que este lado y no el otro: esta tarjeta es una
 * SUPERFICIE sobre la pagina -- un degradado pastel plano, sin escena detras
 * -- asi que un borde nitido es lo que separa esa superficie del fondo; una
 * sombra ambiental encima no añade lectura de profundidad real (no hay
 * ninguna fuente de luz de escena que la justifique) y solo suma peso visual.
 * Comparese con `ScDisc` en Journey.tsx (Task 12 tambien): ese es un
 * marcador DENTRO de una escena con su propio glow de color, y ahi la regla
 * elige el lado contrario (sombra, sin borde).
 */
const ScCard = styled.div`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  border: 1px solid ${CONTACT_CARD_BORDER};
  background: ${CONTACT_CARD_GRADIENT};
  padding: ${({ theme }) => theme.data.space[6]};

  opacity: 0;
  transform: translateY(16px);
  /* Duracion/easing: ver el docblock de arriba. */
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

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: 1.4fr 1fr;
  }
`;

const ScLeft = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
`;

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * el degradado de texto (`background-clip: text` + `CONTACT_TITLE_ACCENT_GRADIENT_LIGHT`/
 * `_DARK`, retirados de `contact.layers.ts`) pasa a color solido. Mismo
 * motivo que `ScAccent` en Story.tsx: un degradado de texto queda fuera del
 * alcance de `contrast.ts`, asi que nadie lo habia medido nunca.
 *
 * El color elegido es el MISMO `semantic.brandText` que este bloque ya usaba
 * como fallback de `@supports not (background-clip: text)`. `ScAccent` se
 * renderiza en las DOS ramas (verificado leyendo el JSX: la rama oscura lo
 * usa dentro de `<Typography variant="h2">` en `ScDarkCopy`, la rama clara
 * dentro del mismo `<Typography variant="h2">` en `ScLeft`), asi que hacen
 * falta las dos medidas:
 *
 * - Rama CLARA: se pinta sobre `CONTACT_CARD_GRADIENT` (las tres paradas
 *   pastel de `ScCard`) -- brandText da entre 5.24:1 y 5.29:1 segun la
 *   parada, la peor por encima de AA (4.5:1).
 * - Rama OSCURA: se pinta sobre la escena `ContactCosmicGuardian`, cuyo void
 *   (`CONTACT_GUARDIAN_VOID`, "#0d0416") es lo unico medible por codigo
 *   (jsdom no compone las capas WebP reales) -- brandText da 13.17:1.
 *
 * Medicion completa en Contact.test.tsx, describe "Task 12".
 */
const ScAccent = styled.span`
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* `var(--text-secondary)` del mockup -> `semantic.textMuted` (ver el mapeo
   de rol documentado en `contact.layers.ts`).

   El equilibrado pasa de pretty a balance (encargo del usuario 2026-08-04:
   todo el texto de cuerpo lleva text-wrap-style balance). Este override
   NO es cosmetico ni redundante con el que ya trae Typography para sus
   variantes de cuerpo: styled(Typography) inyecta su clase DESPUES de la del
   propio Typography, asi que lo que se declare aqui GANA la cascada. Si este
   bloque se hubiera quedado en pretty, este parrafo -- y solo este -- habria
   seguido con el reparto antiguo mientras el resto de la pagina cambiaba, un
   fallo silencioso sin ningun error que lo delate. */
const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  text-wrap: balance;
  text-wrap-style: balance;
`;

const ScRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  margin-block-start: ${({ theme }) => theme.data.space[5]};
`;

/* Chip de email (mockup L219-222): fondo translúcido bespoke
   (`CONTACT_CHIP_BG_LIGHT`, D10), borde `semantic.border` (rol existente).
   El fondo ya no se elige con un ternario contra `theme.data.isLight`: este
   chip solo se monta dentro de `chipAndCta`, que solo vive en el return de
   la rama CLARA desde que la oscura pasó a tarjetas + formulario
   (2026-08-03, D12/D14), así que la rama oscura del ternario era
   inalcanzable -- ver el docblock de la constante en `contact.layers.ts`. */
const ScChip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  min-width: 280px;
  height: 48px;
  padding-inline: ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  background: ${CONTACT_CHIP_BG_LIGHT};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

/* GlobalStyles fuerza `svg { width: 100% }` (spec 5.1/lección Logo): la
   regla de este componente gana la cascada por especificidad de clase, así
   que el icono SÍ mide 16px en vez de estirarse al 100% del chip. */
const ScChipIcon = styled.svg`
  flex: none;
  width: 16px;
  height: 16px;
`;

/*
 * CTA (mockup L223): anchor propio, NO un `styled(Button)`. La lección de
 * `task/lessons.md` (2026-07-26, "`background: valor` en :hover resetea
 * background-image") documenta que la variante `solid` de `Button.tsx`
 * declara `&:hover:not(:disabled) { background: color-mix(...) }` — la
 * propiedad ABREVIADA, que resetearía este degradado de fondo en cuanto se
 * compusiera encima. Un anchor propio evita el conflicto por completo en
 * vez de tener que reafirmar la sub-propiedad con el mismo selector: cero
 * herencia de un hover que este CTA no quiere.
 *
 * Degradado con los tokens de paleta (`primary[600]`/`secondary[600]`), NO
 * un literal: el mockup referencia `var(--primary-600)`/`var(--secondary-600)`
 * de su propio design system, que resuelven exactamente a esos roles en el
 * nuestro (ver el mapeo documentado en `contact.layers.ts`).
 *
 * Transición limitada a transform/box-shadow/filter (spec §7.4): el hover
 * NUNCA toca `background`, así que el degradado no se repite aquí.
 *
 * `:focus-visible` propio (D7, encargo 2026-08-04): mismo hallazgo y mismo
 * arreglo que `ScCta` en `Features.tsx` -- hasta esta entrega este CTA de
 * sección solo tenía `:hover`/`:active`. Se compone con el `:hover` en vez
 * de sustituirlo (`box-shadow` se ACUMULA con el de hover si el foco y el
 * puntero coinciden, ninguno de los dos usa la propiedad abreviada), y
 * resuelve contra `semantic.focus` -- mismo token que el anillo GLOBAL
 * (`GlobalStyles.tsx`) y que el `focusHalo` de `Button.tsx`, para que los
 * tres mecanismos lean del mismo rol en los dos temas.
 */
const ScCta = styled.a`
  display: inline-flex;
  align-items: center;
  height: 48px;
  padding-inline: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  background-image: linear-gradient(
    100deg,
    ${({ theme }) => theme.data.palette.primary[600]},
    ${({ theme }) => theme.data.palette.secondary[600]}
  );
  color: ${({ theme }) => theme.data.semantic.onBrand};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  transition:
    transform ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    box-shadow ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    filter ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${CONTACT_CTA_HOVER_SHADOW};
    filter: brightness(1.05);
  }
  &:active {
    transform: scale(0.98);
  }

  /* focus-visible: ver el docblock de arriba. */
  &:focus-visible {
    box-shadow:
      0 8px 24px ${CONTACT_CTA_HOVER_SHADOW},
      0 0 0 4px
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

/* Anillos concéntricos + figura (mockup L226-236): solo ≥ md, como la
   propia columna derecha de la tarjeta (spec §7.4). Ocultos por completo
   debajo para no romper el flujo de una columna (mismo criterio que
   Journey, spec §7.2).

   Parallax de contenido ligado a scroll (D7/D1, encargo 2026-08-04): se
   traslada este ENVOLTORIO, no `ScRingHalo`/`ScRingA`/`ScRingB` por
   separado -- los tres ya declaran su PROPIO `transform: translateY(-50%)`
   para el centrado vertical, y `transform` no se acumula entre
   declaraciones distintas del mismo elemento (la última gana entera):
   sumar aquí un desplazamiento a cada anillo habría exigido reescribir los
   tres `translateY(-50%)` en un único `calc()` cada uno. Aplicarlo en el
   envoltorio evita tocar esa geometría y compone gratis (el desplazamiento
   del padre mueve a los tres hijos igual, sin que ellos sepan nada de
   scroll). Sentido OPUESTO al de la figura (`ScFigureWrap`, más abajo) y
   amplitud menor, para una sensación de profundidad -- capas distintas del
   mismo fondo que se mueven a velocidades distintas, no en bloque. */
const ScRings = styled.div`
  display: none;
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateY(
    calc(var(--contact-progress, 0) * ${CONTACT_RINGS_PARALLAX_PX}px)
  );

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScRingHalo = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_HALO_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_HALO_SIZE};
  height: ${CONTACT_RING_HALO_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${CONTACT_RING_HALO_GRADIENT};
`;

const ScRingA = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_A_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_A_SIZE};
  height: ${CONTACT_RING_A_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid ${CONTACT_RING_A_BORDER};
`;

const ScRingB = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_B_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_B_SIZE};
  height: ${CONTACT_RING_B_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid ${CONTACT_RING_B_BORDER};
`;

/*
 * Envoltorio de la figura (D7/D1, encargo 2026-08-04): el parallax de
 * scroll vive AQUÍ, nunca en `ScFigure` (más abajo). `ScFigure` ya declara
 * `animation: contactFloat ...` bajo `no-preference` -- lección
 * `task/lessons.md` 2026-07-26 ("una `@keyframes` sobre una propiedad le
 * impide a una `transition` sobre esa misma propiedad llegar a existir"): un
 * `@keyframes` no solo bloquea la `transition` de la misma propiedad, GANA
 * la cascada sobre cualquier valor `transform` declarado en el propio
 * elemento (medido en este repo, `task/lessons.md` 2026-07-27: "el conflicto
 * es entre animación y transición... la animación controla el valor
 * computado"). Poner el desplazamiento ligado a `--contact-progress` en
 * `ScFigure` habría quedado silenciosamente anulado por `contactFloat` en
 * cuanto `no-preference` esté activo. En el envoltorio, en cambio, compone
 * sin conflicto: la flotación mueve a `ScFigure` dentro de su padre, y el
 * padre se mueve por scroll -- dos transforms independientes que se suman
 * visualmente sin pisarse.
 */
const ScFigureWrap = styled.div`
  display: none;
  position: relative;
  height: 100%;
  min-height: 300px;
  pointer-events: none;
  transform: translateY(
    calc(var(--contact-progress, 0) * -${CONTACT_FIGURE_PARALLAX_PX}px)
  );

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

/* Flotación (mockup `vtiFloat4`, `contact.layers.ts`): SOLO transform, con
   guard reduced-motion explícito (no basta el colapso global de
   `GlobalStyles`, lección 2026-07-25 en `BrandName.tsx`/`ctaGlow`: con
   `animation-iteration-count: 1 !important` forzado, una animación
   infinita corre una vez y deja un frame arbitrario, no el último). */
const contactFloat = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(${CONTACT_FLOAT_AMPLITUDE});
  }
`;

const ScFigure = styled.img`
  position: absolute;
  inset-inline-start: ${CONTACT_FIGURE_LEFT};
  inset-block-start: ${CONTACT_FIGURE_TOP};
  width: auto;
  max-width: none;
  height: ${CONTACT_FIGURE_HEIGHT};
  filter: drop-shadow(0 12px 32px ${CONTACT_FIGURE_SHADOW});

  @media (prefers-reduced-motion: no-preference) {
    animation: ${contactFloat} ${CONTACT_FIGURE_FLOAT_MS}ms ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`;

/*
 * Slot pegado de la escena (D6, mismo motivo que `ScDarkSceneSlot` en
 * `Features.tsx`): comparte columna Y fila de grid con `ScDarkFrame`
 * (`grid-column: 1; grid-row: 1`) en vez de `position: absolute; inset: 0`
 * -- eso alteraría el rectángulo de restricción del propio `sticky`. NO
 * necesita `grid-row: 1 / span 2` como Features: a Contacto no se le
 * superpone ninguna sección por debajo en esta entrega (el Footer, su
 * siguiente hermano, no forma parte de esta cadena de solapes), así que no
 * hay una segunda fila de "hold" que abarcar.
 */
const ScDarkSceneSlot = styled.div`
  grid-column: 1;
  grid-row: 1;
  align-self: start;
  position: sticky;
  top: 0;
  height: ${CONTACT_DARK_HEIGHT};

  @media (prefers-reduced-motion: reduce) {
    position: static;
  }
`;

/* Las tres animaciones infinitas del haz (`SectionBeam`) YA reafirman su
   guard de `reduce` en `sectionBeam.parts.tsx`; `glowPulse` es la cuarta
   -- propia de Contacto (mockup L28/L52) -- y sigue el MISMO criterio D8:
   solo se declara bajo `no-preference`, con `animation: none` explícito bajo
   `reduce`. Reafirma `translateX(-50%)` en LOS TRES pasos del keyframe, no
   solo en el `transform` base del selector: un `@keyframes` sustituye el
   `transform` COMPLETO del elemento en cada fotograma, no lo compone con el
   de la regla en reposo -- sin la reafirmación, el halo se descentraría
   durante la animación. */
const glowPulse = keyframes`
  0%,
  100% {
    opacity: 0.55;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.04);
  }
`;

/*
 * Halo radial superior (mockup L52): marca la costura con Features con una
 * mancha de luz difusa detrás del haz de `SectionBeam`. Va DESPUÉS de
 * `ScDarkSceneSlot` en el DOM y con `z-index: 1` explícito: el slot es
 * `position: sticky` sin `z-index` propio (`auto`), así que dos elementos
 * posicionados SIN `z-index` se pintarían en orden de DOM -- el `z-index: 1`
 * explícito hace que el glow gane la pintura sobre el slot SIEMPRE, sin
 * depender de dónde viva cada uno en el marcado.
 */
const ScTopGlow = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  width: ${CONTACT_TOP_GLOW_WIDTH};
  height: ${CONTACT_TOP_GLOW_HEIGHT};
  background: ${CONTACT_TOP_GLOW_GRADIENT};
  filter: blur(${CONTACT_TOP_GLOW_BLUR});
  pointer-events: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${glowPulse} ${CONTACT_TOP_GLOW_PULSE_MS}ms ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/*
 * Marco del contenido (D6, mismo motivo que `ScDarkFrame` en `Features.tsx`):
 * comparte columna y fila de grid con `ScDarkSceneSlot` y es quien
 * centra/topa el CONTENIDO (`CONTACT_CONTENT_MAX_WIDTH`) mientras la escena,
 * en la celda hermana, mide siempre una pantalla exacta. `min-height` en vez
 * de una altura fija: si el contenido (formulario + dos tarjetas) desborda
 * una pantalla en móvil o en portátiles bajos, el marco crece con él en vez
 * de recortarlo. `z-index: 1`: dentro de la sección tiene que ganar la
 * pintura sobre `ScDarkSceneSlot` (que no declara ninguno) -- misma
 * escalera LOCAL que usa `ScTopGlow`, arriba.
 *
 * `padding-block` FLUIDO (D4, encargo 2026-08-04, palanca 1): mismo criterio,
 * mismas unidades y mismos motivos que `ScDarkFrame` en `Features.tsx` -- el
 * `min-height` de arriba no recorta nada, esto solo deja de gastar más
 * relleno vertical del necesario donde el presupuesto de una pantalla
 * aprieta. El término fluido va en `dvh` y NO en `vw` por la razón que ese
 * docblock explica en detalle: la restricción es el ALTO del viewport, y un
 * término en `vw` no ahorra nada en un portátil bajo y ancho, que es
 * precisamente el caso que hay que resolver. `padding-inline` queda fijo.
 */
const ScDarkFrame = styled.div`
  grid-column: 1;
  grid-row: 1;
  position: relative;
  z-index: 1;
  min-height: ${CONTACT_DARK_HEIGHT};
  width: 100%;
  max-width: ${CONTACT_CONTENT_MAX_WIDTH};
  margin-inline: auto;
  padding-block: clamp(1rem, 3.5dvh, ${({ theme }) => theme.data.space[8]});
  padding-inline: ${({ theme }) => theme.data.space[6]};
  display: flex;
  align-items: center;
`;

/*
 * Fila de dos columnas del contenido oscuro (mockup L55): copia a la
 * izquierda (`ScDarkCopy`) y tarjeta de formulario a la derecha
 * (`ScFormCard`), envolviendo a una columna por debajo del ancho mínimo de
 * sus hijos (`flex-wrap`, sin punto de corte propio -- el `flex-basis` de
 * cada hijo ya decide cuándo baja). PIERDE `max-width: prose` y su `padding`
 * (ahora los lleva `ScDarkFrame`, arriba) y su `position: relative;
 * z-index: 1` (ahora los lleva el frame, que es quien compite por celda de
 * grid con `ScDarkSceneSlot`) -- mismo criterio que documenta `ScDarkContent`
 * en `Features.tsx`: este elemento ya no necesita su propio contexto de
 * apilamiento. CONSERVA su reveal (opacity/translateY con `data-revealed`,
 * guard `reduce`) tal cual.
 *
 * Duración (D7, encargo 2026-08-04): `slower` (480ms), no `slow` (320ms) --
 * mismo criterio de unificación que `ScDarkContent` en `Features.tsx`: el
 * easing `decelerate` ya era el correcto, solo la duración divergía de la
 * pareja elegida para las cuatro entradas de estas dos secciones.
 */
const ScDarkContent = styled.div`
  width: 100%;
  margin-inline-end: auto;

  /* El tope que esquiva el arte (D20) solo aplica donde el esquive vale la
     pena: desde lg. Por debajo, el contenido ocupa el ancho entero -- un
     tope proporcional ahí dejaría la copia en unos 218px sobre un viewport
     de 375, ilegible por estrecho en vez de por contraste. Quien resuelve la
     legibilidad en ese régimen es la viñeta de la escena, que sube el velo
     sobre todo el encuadre (ver ScVignette en
     contactCosmicGuardian.parts.tsx).

     El corte es lg y NO md, corregido el 2026-08-04 con la medida delante:
     el corte en md daba por hecho que a partir de 768px el contenido ya
     estaba recogido a un lado, y no lo está -- las dos columnas solo dejan
     de apilarse cuando el contenido mide 748px o más. Esta media query y el
     régimen de ScVignette tienen que cortar en el MISMO punto o queda una
     franja de anchos (768-991) con el contenido a ancho completo y el velo
     lateral ya retirado: medido a 768x900, el peor píxel de la cabecera daba
     1.83:1 (medición previa a Task 11, 2026-08-09, con el kicker todavía
     presente encima del h2 -- pendiente reverificar en navegador que el
     peor píxel sigue en el mismo punto tras su retirada). */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    max-width: min(${CONTACT_CONTENT_PAIR_MAX}, ${CONTACT_CONTENT_PAIR_MAX_VW});
  }

  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[7]};
  align-items: flex-start;
  opacity: 0;
  transform: translateY(16px);
  /* Duracion: ver el docblock de arriba. */
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

/* Columna izquierda del contenido oscuro (mockup L56): h2 + cuerpo + ScCards
   (formulario + dos tarjetas), en columna -- hasta Task 11 (2026-08-09) el
   kicker abría el bloque, retirado por esa tarea.

   `gap` FLUIDO (D4, encargo 2026-08-04, palanca 2): mismo criterio que
   `ScDarkFeatures`/`ScDarkFeatureBlock` en `Features.tsx` -- clamp entre
   0.75rem (12px, suelo) y `space[4]` (16px, techo de escritorio, sin
   cambios). El margen de compactación aquí es menor que en Features a
   propósito: Contacto solo tenía +105px de sobrante medido (frente a los
   +407px de Features), así que no necesita el mismo grado de agresividad. */
const ScDarkCopy = styled.div`
  flex: 1 1 320px;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, ${({ theme }) => theme.data.space[4]});
`;

/*
 * Contenedor apilado del formulario y las tarjetas de contacto restantes
 * (mockup L62, reordenado 2026-08-04). La tarjeta de correo del mockup
 * (`cards.email`) se retira: el formulario ya arranca con `links.email`
 * como valor por defecto (ver `useState` en `Contact()`), así que sería el
 * mismo dato mostrado dos veces. Quedan Comunidad (Discord) y Código
 * (GitHub).
 *
 * `gap` FLUIDO (D4, palanca 2, mismo criterio que `ScDarkCopy` arriba):
 * clamp entre 0.5rem (8px, suelo) y `space[3]` (12px, techo de escritorio).
 */
const ScCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vw, ${({ theme }) => theme.data.space[3]});
`;

/*
 * Tarjeta de contacto (mockup L63-74, D14): `<a>` real con texto propio (no
 * un `<div>` con `onClick`) -- su nombre accesible sale del título + valor
 * visibles, sin `aria-label`. Fondo/borde VERBATIM del mockup
 * (`CONTACT_CARD_BG_DARK`/`CONTACT_CARD_BORDER_DARK`, D10/D18 -- no son
 * roles semánticos, literales de esta composición). El hover SOLO toca
 * `border-color`/`transform` (compositor + paint, nunca layout), con guard
 * `reduce` explícito.
 */
/*
 * Task 9 (craft de interacción): transform migra a vocabulary.PRESS (misma
 * entrada que gobierna hover-lift Y press, ver el docblock de Button.tsx
 * sobre por qué comparten timing). El hover-lift MUEVE (translateY), así
 * que se separa de :focus-visible -- que hasta ahora vivían juntos en un
 * único selector -- y solo :hover queda tras PRESS.hoverGuard: :focus-visible
 * es un estado de teclado, no de puntero, y tiene que seguir funcionando
 * igual con o sin capacidad de hover fino (regla dura de esta tarea, no
 * documentada antes: guardar un :hover,:focus-visible combinado dejaría sin
 * feedback de foco a quien navega por teclado en un dispositivo táctil).
 */
const ScCardLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  background: ${CONTACT_CARD_BG_DARK};
  border: 1px solid ${CONTACT_CARD_BORDER_DARK};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  transition:
    border-color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:focus-visible {
    border-color: ${({ theme }) => theme.data.palette.secondary[400]};
    transform: translateY(-1px);
  }

  @media ${PRESS.hoverGuard} {
    &:hover {
      border-color: ${({ theme }) => theme.data.palette.secondary[400]};
      transform: translateY(-1px);
    }
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:focus-visible,
    &:active {
      transform: none;
    }
  }
`;

/* Icono de trazo de cada tarjeta (mockup L64/72, 24px). Mismo patrón que
   `ScChipIcon` (arriba): GlobalStyles fuerza `svg { width: 100% }` para todo
   el sitio, así que el tamaño se fija por CSS y no por atributo -- un
   atributo `width`/`height` perdería la cascada (lección del repo,
   `task/lessons.md`, 2026-07-26). `stroke` resuelve contra el token de tema,
   no `currentColor`, siguiendo la misma vía que `ScCheckIcon` en
   `Features.tsx`. */
const ScCardIcon = styled.svg`
  flex: none;
  width: 24px;
  height: 24px;
  stroke: ${({ theme }) => theme.data.palette.secondary[400]};
`;

/* Título/valor de cada tarjeta (mockup L65): tamaños propios de esta
   composición, fuera de la escala tipográfica (`.9rem`/`.85rem` no
   coinciden con ningún paso de `type.scale`). */
const ScCardTitle = styled.span`
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.data.palette.secondary[300]};
`;

const ScCardValue = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Envoltura de la columna del formulario (mockup L86): solo reparte el
   ancho flexible -- la tarjeta visual (fondo/borde/radio) vive en `ScForm`,
   el propio `<form>`, no aquí. */
const ScFormCard = styled.div`
  flex: 1.3 1 220px;
`;

/*
 * Tarjeta del formulario (mockup L87): fondo/borde propios de esta
 * composición (`CONTACT_FORM_BG`/`CONTACT_FORM_BORDER`, D10/D18), no roles
 * semánticos. Contiene un ÚNICO campo (D12) -- los campos Nombre/Asunto/
 * Mensaje del mockup se descartan a propósito (D12: "es literalmente lo que
 * pide el encargo").
 */
const ScForm = styled.form`
  background: ${CONTACT_FORM_BG};
  border: 1px solid ${CONTACT_FORM_BORDER};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  padding: ${({ theme }) => theme.data.space[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/*
 * Botón de envío (mockup L102): `styled(Button)`, no un anchor propio como
 * `ScCta` (arriba) -- este SÍ es un `<button type="submit">` real que
 * dispara `onSubmit`, no una navegación de ancla.
 *
 * `background-image` deja de ser un degradado propio de esta sección y pasa
 * a `heroGradient` (2026-08-04, `BrandName.tsx`): el mismo degradado
 * animado que ya recorren el título del Hero y sus dos CTA, para que el
 * botón principal de la página lea como parte del mismo lenguaje visual en
 * vez de un morado suelto. `gradientShift` (`background-position` 0%→100%)
 * es la animación compartida; solo `transform`/`opacity`/`background-position`
 * se animan, nunca layout.
 *
 * `heroGradient` se reafirma con el MISMO selector EXACTO que declara
 * `Button.tsx` en su variante `solid`
 * (`&:hover:not(:disabled) { background: color-mix(...) }`, lección
 * `task/lessons.md` 2026-07-26 "`background: valor` en :hover resetea
 * background-image"): esa regla usa la propiedad ABREVIADA `background`,
 * que resetea `background-image` a `none` en cuanto se compone encima.
 * Reafirmar la sub-propiedad aquí, en la MISMA capa aditiva (`styled(Button)`
 * se inyecta DESPUÉS del propio `Button`, orden de inserción de
 * styled-components), gana el empate sin `!important` y sin tocar
 * `Button.tsx`. `heroGradient` ya declara `background-image` (nunca el
 * shorthand), así que reafirmarlo dos veces no arrastra el mismo bug.
 *
 * `animation` SOLO se declara bajo `no-preference`, con `animation: none`
 * explícito bajo `reduce` -- mismo guard que `ScTopGlow`/`glowPulse`, arriba
 * en este mismo fichero: el colapso global de `GlobalStyles`
 * (`animation-iteration-count: 1 !important`) no detiene una animación
 * infinita, la deja correr un fotograma arbitrario. Bajo `reduce` el botón
 * se queda con el degradado ESTÁTICO de `heroGradient` (primer fotograma de
 * `background-position`), no con `background-image: none`: a diferencia de
 * `gradientTextClip` en `BrandName.tsx` (que SÍ necesita ese fallback
 * porque el texto está clippeado y quedaría invisible sin fondo), aquí el
 * texto del botón no depende del degradado para ser legible -- perder el
 * movimiento es aceptable, perder el fondo no.
 */
const ScSubmitButton = styled(Button)`
  width: 100%;
  ${heroGradient}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${gradientShift} 9000ms linear infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover:not(:disabled) {
    ${heroGradient}
  }
`;

/* Icono de envío (mockup L102), 16px -- mismo motivo de CSS explícito que
   `ScCardIcon`/`ScChipIcon`. */
const ScSendIcon = styled.svg`
  flex: none;
  width: 16px;
  height: 16px;
`;

/*
 * Panel de fallback tras el envío (D13, task 1 auditoría premium
 * 2026-08-08): se revela DESPUÉS de `window.location.assign(mailto)` en un
 * submit válido -- no es un toast (no se cierra solo) ni afirma que el
 * correo se haya enviado de verdad (este sitio no tiene backend al que
 * postear; D13 sigue vigente). Resuelve "mailto sin cliente de correo
 * instalado = botón que no hace nada visible": la dirección real queda en
 * texto plano, seleccionable/copiable, dentro del propio formulario.
 * `role="status"` (en el JSX) anuncia su aparición a un lector de pantalla
 * sin robarle el foco -- mismo criterio que el error de campo (`Input.tsx`).
 * Tokens de tema (regla 17), cero literales.
 */
const ScFallbackPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
`;

const ScFallbackText = styled.p`
  flex: 1 1 200px;
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Dirección en negrita dentro del párrafo -- el dato accionable del panel,
   diferenciado del texto de apoyo que lo rodea. `overflow-wrap` evita que
   la dirección desborde el panel angosto de la tarjeta del formulario en
   vez de partirse en la palabra larga. */
const ScFallbackEmail = styled.strong`
  color: ${({ theme }) => theme.data.semantic.text};
  font-weight: 600;
  overflow-wrap: anywhere;
`;

/* `flex: none` para que el botón no se comprima junto al texto en el
   `flex-wrap` de `ScFallbackPanel`. */
const ScCopyButton = styled(Button)`
  flex: none;
`;

/**
 * Patrón mínimo de correo (task 1, auditoría premium 2026-08-08): capa de
 * validación PROPIA, además de `type="email"` + `required` nativos del
 * `<input>` (que se mantienen sin tocar). No es redundante con lo nativo:
 * `fireEvent.submit` de jsdom NO dispara la validación de restricciones del
 * navegador, así que sin esta capa el submit inválido llegaría igual a
 * `handleSubmit` en cualquier test -- y, en un navegador real, cualquier
 * camino que rodee la validación nativa (autofill agresivo, JS de una
 * extensión) también la necesita. No pretende ser RFC 5322 completo: ese
 * nivel de rigor no lo pide el encargo y el propio `type="email"` ya cubre
 * casos más finos que solo el navegador entiende.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function Contact(): ReactElement {
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  /*
   * Progreso de scroll de la rama CLARA (D7/D1, encargo 2026-08-04): mismo
   * patrón que `featuresRef` en `Features.tsx` -- ref ESTABLE (`useRef`,
   * nunca inline en el render), hook llamado de forma INCONDICIONAL antes
   * de los dos `return` de tema, y atado solo al `<ScContact>` de la rama
   * clara, más abajo. La rama oscura ya tiene su propio movimiento ligado a
   * scroll vía `useSceneParallax`, dentro de `ContactCosmicGuardian`, fuera
   * del alcance de este flujo.
   */
  const contactRef = useRef<HTMLElement>(null);
  useSectionProgress(contactRef, { cssVarPrefix: "contact" });
  /* El campo arranca VACÍO (task 1, auditoría premium 2026-08-08, P0
     confianza -- reemplaza la entrega anterior, que lo prerrellenaba con
     `links.email`): un formulario de contacto que arranca con la dirección
     DE LA PROPIA EMPRESA ya escrita lee como que VTI se está escribiendo a
     sí misma, no como una invitación a que el visitante escriba la suya. El
     placeholder («tu@correo.com») ya comunicaba el formato esperado y ahora
     por fin se ve. */
  const [email, setEmail] = useState("");
  /*
   * Estado de error de la validación PROPIA (task 1): `Field`/`Input` ya
   * soportaban un `error` (`Input.tsx`, prop `error` de `Field`) -- esta
   * tarea solo los conecta. Guarda un booleano, no el string del mensaje:
   * el TEXTO sale de i18n en el propio render (`Home.contact.form.
   * emailError`), así el estado no duplica un contenido que ya vive en una
   * única fuente de verdad.
   */
  const [emailError, setEmailError] = useState(false);
  /*
   * Panel de fallback, revelado tras un envío VÁLIDO (D13 sigue vigente: NO
   * es un "enviado" -- este sitio no tiene backend al que postear, así que
   * nunca puede confirmar una entrega real). Resuelve el caso "mailto sin
   * cliente de correo instalado = botón que visiblemente no hizo nada":
   * una vez revelado se queda así -- no es un toast que desaparece solo.
   */
  const [sent, setSent] = useState(false);
  /*
   * Feedback textual opcional del botón «Copiar» (resolución del
   * orquestador, task 1): SIN estado "copiado" animado -- no hay backend
   * que confirmar de verdad, así que una animación/check afirmaría más
   * certeza de la que hay. Cambiar el propio texto del botón es la señal
   * mínima honesta, y solo se activa cuando `handleCopy` confirma que la
   * escritura al portapapeles se completó.
   */
  const [copied, setCopied] = useState(false);

  /*
   * Envío del formulario (D13, rama oscura): abre el cliente de correo del
   * visitante con `mailto:` -- el sitio es un export estático, sin backend
   * al que postear, así que "enviar" de verdad significa delegar en la app
   * de correo, la MISMA mecánica que el CTA de la rama clara (`links.email`,
   * `chipAndCta` más abajo). Se usa `window.location.assign(...)` y NO
   * `window.location.href = ...`: `assign` es un método real de `Location`
   * que se puede doblar con `vi.spyOn` sin reemplazar el objeto `location`
   * entero (`Contact.test.tsx`) -- un setter de propiedad como `href` no se
   * puede espiar así. NO se implementa ningún estado "enviado" (D13): sin
   * backend sería una afirmación falsa en la interfaz.
   *
   * Validación propia (task 1) ANTES de navegar: si el valor está vacío o
   * no tiene forma de correo, `preventDefault` (ya se llama siempre, arriba)
   * detiene aquí -- no se toca `window.location` -- y se enciende el error
   * accesible de `Field`. La validación NATIVA (`required`, `type="email"`)
   * sigue en el `<input>` sin tocar: esta capa es un refuerzo, no un
   * sustituto (ver docblock de `isValidEmail`).
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    const subject = encodeURIComponent(t("Home.contact.form.subject"));
    const body = encodeURIComponent(t("Home.contact.form.body", { email }));
    window.location.assign(`${links.email}?subject=${subject}&body=${body}`);
    setSent(true);
  }

  /*
   * Copia la dirección real al portapapeles (resolución del orquestador,
   * task 1): comodidad sobre el panel de fallback, que YA deja la
   * dirección en texto plano seleccionable -- copiar nunca es el ÚNICO
   * camino. `navigator.clipboard` no existe en todo contexto (permiso
   * denegado, origen no seguro, algún navegador antiguo); sin él, o si
   * `writeText` rechaza, el fallback es silencioso a propósito: no hay nada
   * que afirmarle al usuario sobre un intento que no puede completarse, y
   * el texto del botón solo cambia a "Copiada" cuando la escritura se
   * confirmó de verdad (nunca de forma optimista).
   */
  async function handleCopy(): Promise<void> {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(links.email.replace(/^mailto:/, ""));
      setCopied(true);
    } catch {
      /* Silencioso a propósito -- ver docblock. */
    }
  }

  const chipAndCta = (
    <ScRow>
      <ScChip>
        <ScChipIcon
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
          />
          <path d="M22 6l-10 7L2 6" />
        </ScChipIcon>
        <span>{t("Home.contact.email")}</span>
      </ScChip>
      <ScCta
        href={links.email}
        aria-label={t("Home.contact.ctaAria")}
      >
        {t("Home.contact.cta")}
      </ScCta>
    </ScRow>
  );

  if (themeName !== "light") {
    return (
      <ScContact
        id="contact"
        aria-labelledby="contact-title"
        $fullBleed
      >
        <SectionBeam />
        <ScDarkSceneSlot>
          <ContactCosmicGuardian />
        </ScDarkSceneSlot>
        <ScTopGlow aria-hidden="true" />
        <ScDarkFrame>
          <ScDarkContent
            ref={revealRef}
            data-revealed={revealed}
          >
            <ScDarkCopy>
              {/* Task 11 (dieta de ornamento A, 2026-08-09): el kicker
                  «Contacto» se retira en las DOS ramas -- Contacto abre con
                  su encabezado real, como Journey y Features (claro). */}
              <Typography
                variant="h2"
                id="contact-title"
              >
                {t("Home.contact.titleLead")}{" "}
                <ScAccent>{t("Home.contact.titleAccent")}</ScAccent>
              </Typography>
              <ScBody variant="body">
                {t("Home.contact.body")}
                <br />
                {t("Home.contact.bodySecond")}
              </ScBody>
              <ScCards>
                <ScFormCard>
                  <ScForm onSubmit={handleSubmit}>
                    <Field
                      label={t("Home.contact.form.label")}
                      htmlFor="contact-email"
                      help={t("Home.contact.form.help")}
                      error={
                        emailError
                          ? t("Home.contact.form.emailError")
                          : undefined
                      }
                    >
                      <Input
                        id="contact-email"
                        type="email"
                        required
                        placeholder={t("Home.contact.form.placeholder")}
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          // Corregir el valor retira el error de inmediato:
                          // dejarlo pintado hasta el siguiente submit
                          // afirmaría un estado que el usuario ya resolvió.
                          if (emailError) setEmailError(false);
                        }}
                        autoComplete="email"
                      />
                    </Field>
                    <ScSubmitButton
                      type="submit"
                      size="lg"
                      aria-label={t("Home.contact.form.submitAria")}
                    >
                      {t("Home.contact.form.submit")}
                      <ScSendIcon
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 3L10 14" />
                        <path d="M21 3l-7 18-4-7-7-4z" />
                      </ScSendIcon>
                    </ScSubmitButton>
                    {sent && (
                      <ScFallbackPanel role="status">
                        <ScFallbackText>
                          {t("Home.contact.form.fallbackLead")}{" "}
                          <ScFallbackEmail>
                            {links.email.replace(/^mailto:/, "")}
                          </ScFallbackEmail>
                        </ScFallbackText>
                        <ScCopyButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                        >
                          {t(
                            copied
                              ? "Home.contact.form.copied"
                              : "Home.contact.form.copyAddress",
                          )}
                        </ScCopyButton>
                      </ScFallbackPanel>
                    )}
                  </ScForm>
                </ScFormCard>
                <ScCardLink
                  href={links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ScCardIcon
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="9"
                      cy="8"
                      r="3"
                    />
                    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    <circle
                      cx="16.5"
                      cy="9"
                      r="2.5"
                    />
                    <path d="M17 14.5c2.3.5 4 2.4 4 4.9" />
                  </ScCardIcon>
                  <div>
                    <ScCardTitle>
                      {t("Home.contact.cards.community.title")}
                    </ScCardTitle>
                    <ScCardValue>
                      {t("Home.contact.cards.community.value")}
                    </ScCardValue>
                  </div>
                </ScCardLink>
                <ScCardLink
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ScCardIcon
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 6l-5 6 5 6" />
                    <path d="M16 6l5 6-5 6" />
                  </ScCardIcon>
                  <div>
                    <ScCardTitle>
                      {t("Home.contact.cards.code.title")}
                    </ScCardTitle>
                    <ScCardValue>
                      {t("Home.contact.cards.code.value")}
                    </ScCardValue>
                  </div>
                </ScCardLink>
              </ScCards>
            </ScDarkCopy>
          </ScDarkContent>
        </ScDarkFrame>
      </ScContact>
    );
  }

  return (
    <ScContact
      ref={contactRef}
      id="contact"
      aria-labelledby="contact-title"
      $fullBleed={false}
    >
      <ScCard
        ref={revealRef}
        data-revealed={revealed}
      >
        <ScLeft>
          {/* Task 11 (dieta de ornamento A, 2026-08-09): el kicker
              «Contacto» se retira en las DOS ramas -- ver el docblock
              equivalente en la rama oscura, más arriba. */}
          <Typography
            variant="h2"
            id="contact-title"
          >
            {t("Home.contact.titleLead")}{" "}
            <ScAccent>{t("Home.contact.titleAccent")}</ScAccent>
          </Typography>
          <ScBody variant="body">
            {t("Home.contact.body")}
            <br />
            {t("Home.contact.bodySecond")}
          </ScBody>
          {chipAndCta}
        </ScLeft>
        <ScRings aria-hidden="true">
          <ScRingHalo />
          <ScRingA />
          <ScRingB />
        </ScRings>
        <ScFigureWrap>
          <ScFigure
            src="/figures/contact-waving-1024.webp"
            srcSet="/figures/contact-waving-640.webp 640w, /figures/contact-waving-1024.webp 1024w"
            sizes={CONTACT_FIGURE_SIZES}
            alt={t("Home.contact.figureAlt")}
            loading="lazy"
            decoding="async"
          />
        </ScFigureWrap>
      </ScCard>
    </ScContact>
  );
}
