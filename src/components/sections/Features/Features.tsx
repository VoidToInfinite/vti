"use client";

import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { Kicker } from "@/components/ui/Kicker/Kicker";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { PRESS, REVEAL } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { focusNavAnchorTarget } from "@/components/layout/Navbar/navAnchorFocus";
import type { NavItem } from "@/config/navigation";
import { FeaturesCelestialOrbital } from "@/components/scenes/featuresCelestialOrbital/FeaturesCelestialOrbital";
import { FEATURES_ORBITAL_VOID } from "@/components/scenes/featuresCelestialOrbital/featuresCelestialOrbital.layers";
import {
  FEATURE_KEYS,
  FEATURE_FIGURE_BASENAME,
  FEATURES_FIGURE_SIZES,
  FEATURES_FIGURE_TABLET_MIN_HEIGHT_PX,
  FEATURES_FIGURE_DESKTOP_MIN_HEIGHT_PX,
  FEATURES_FIGURE_TABLET_MEDIA,
  FEATURES_FIGURE_ASPECT_RATIO,
  FEATURES_CARD_BORDER_WIDTH,
  FEATURES_IMAGE_PANEL_HEIGHT,
  FEATURES_IMAGE_CIRCLE_SIZE,
  FEATURES_IMAGE_CIRCLE_OFFSET,
  FEATURES_CONIC_BORDER_SPIN_MS,
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
 * docs/superpowers/specs/2026-08-02-features-overlay-celestial-orbital-design.md):
 * no hay mockup oscuro. En vez de las 3 tarjetas con patrón SVG + figura
 * propia + fondo pastel, el fondo es FeaturesCelestialOrbital -- escena de
 * 7 capas WebP compuestas con alpha normal y animadas con useSceneParallax
 * (mismo hook que Story/Journey). El docblock anterior de esta sección
 * afirmaba lo contrario -- "imagen plana, sin capas -- a diferencia de
 * Story/Journey no hay parallax que fingir aquí" -- y era falso desde el
 * commit 49e8ef6 (2026-07-30), que ya había dado a la escena SALIENTE
 * (FeaturesCelestialGuide, 10 capas) sus capas y su parallax: el
 * comentario describía una entrega anterior del mismo día y nunca se
 * actualizó. El contenido (mismo i18n Home.features.*) se superpone a la
 * DERECHA (la figura y los iconos del fondo quedan a la izquierda del
 * encuadre, al revés que Story/Journey). Las 3 identidades se re-maquetan
 * como bloques verticales separados por border-top (mismo patrón de lista
 * que Story/Journey) en vez de tarjetas con patrón/fondo propio -- esos son
 * literales de una tarjeta con fondo pastel (D10), sin sentido superpuestos
 * a una imagen. Los bullets/CTA SÍ se reutilizan tal cual (ScBullets/
 * ScBulletItem/ScCheckIcon/ScCta, más abajo): ya resuelven contra
 * accentColor/tokens de tema, no contra el fondo de la tarjeta.
 *
 * Desde esta entrega, además, Features SUBE sobre Journey al final de su
 * presentación de diapositivas (D2/D5, superposición por
 * margin-block-start negativo -- misma técnica que Story→Journey) y su
 * escena vive en un slot PEGADO (D7) independiente del contenido, no en un
 * ScScene que ocupe la sección entera: ver los docblocks de
 * ScFeatures/ScDarkSceneSlot/ScDarkFrame, más abajo, para el
 * razonamiento completo.
 */

/*
 * Features (mockup Landing v2.dc.html L157-210, spec §7.3). Rama CLARA:
 * sin cambios de comportamiento respecto a la reescritura anterior.
 *
 * Reescritura completa: la versión anterior mostraba tres áreas genéricas del
 * equipo (Home.sections.*, showcase de componentes) con un CTA final al
 * playground. El contrato i18n congelado (spec §4.1) sustituye ese contenido
 * por las tres identidades de marca (Learning/Imagination/Gaming) con cuerpo,
 * cuatro bullets y CTA propios cada una; el CTA al playground desaparece (el
 * mockup no lo tiene, cada tarjeta ya enlaza a #contact).
 */

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

/**
 * Amplitud del parallax de contenido ligado a scroll de las figuras de
 * tarjeta (D7, encargo 2026-08-04): valor PROPIO de esta entrega, no
 * transcrito de ningún mockup -- por eso vive aquí y no en
 * features.layers.ts (ese fichero documenta en su propia cabecera que solo
 * contiene arte VERBATIM). "Decenas de píxeles, no cientos" es literal del
 * encargo: a --features-progress 0..1 el recorrido total es de 5px.
 */
const FEATURES_FIGURE_PARALLAX_PX = 5;

/*
 * STAGGER_STEP_MS (120ms por tarjeta) RETIRADA (spec 2026-08-06, D9): el
 * escalonado por índice se sustituye por los retardos verbatim del mockup
 * (FEATURES_LIGHT_REVEAL_DELAYS_MS, features.layers.ts -- cinco desde
 * Task 11, 2026-08-09, que retira el eyebrow y con él su propio retardo),
 * que ya no son múltiplos regulares de un paso fijo -- cubren cabecera Y
 * tarjetas bajo un único useReveal (ver ScReveal, más abajo).
 */

/**
 * Color de acento por tarjeta (check de los bullets, badge, panel/círculo
 * decorativos y CTA de texto). Resuelve POR RAMA de tema desde la Task 26
 * (2026-08-10, "CTA de Features con AA en las seis combinaciones"): hasta
 * entonces devolvía el MISMO paso de palette (600, o FEATURES_GAMING_ACCENT
 * para Gaming) en claro y en oscuro -- y palette es compartida entre
 * themes.light/themes.dark (themes.ts), así que un único L no puede
 * pasar AA (4.5:1) a la vez sobre semantic.surface claro (blanco) y
 * semantic.bg oscuro (casi negro): medido, el CTA incumplía en 4 de 6
 * combinaciones tarjeta/rama (deuda documentada en RULES.md, cerrada por
 * esta tarea).
 *
 * theme: ThemeDefinition ya trae la rama resuelta en theme.isLight
 * (theme.types.ts) -- es el mismo mecanismo que ya usa el propio componente
 * para bifurcar su JSX (Features(), más abajo, con themeName del
 * ThemeProvider de React) y que ThemeProvider.tsx garantiza sincronizado
 * con el theme.data que styled-components inyecta (un único
 * SCThemeProvider para toda la página, sin anidar temas). No hace falta
 * ningún parámetro nuevo ni un mecanismo propio: theme.isLight ya distingue
 * la rama en la que se está pintando este mismo elemento.
 *
 * Learning/Imagination resuelven contra la rampa real del tema, un paso más
 * oscuro en claro (700, antes 600) y el mismo paso 600 en oscuro (ya pasaba
 * AA, se conserva); Gaming usa las constantes propias por rama
 * (FEATURES_GAMING_ACCENT_LIGHT/_DARK, features.layers.ts -- mismo hue
 * 340 que FEATURES_GAMING_ACCENT, L vecino elegido para pasar AA en cada
 * fondo). Ratios medidos (contrastRatio, Features.test.tsx, describe
 * "Task 26"):
 *
 *   learning:    5.07:1 sobre surface (claro) | 5.90:1 sobre bg (oscuro)
 *   imagination: 5.92:1 sobre surface (claro) | 5.08:1 sobre bg (oscuro)
 *   gaming:      5.33:1 sobre surface (claro) | 5.04:1 sobre bg (oscuro)
 *
 * Exportada desde 2026-08-06 (D5/D7/D8 spec 2026-08-06-story-features-tema-
 * claro-design.md): además de check/CTA, la tarjeta la reutiliza para el
 * color-mix de fondo de sus dos piezas DECORATIVAS -- ScImagePanel (7%) y
 * ScImageCircle (16%), más abajo. La tercera, el color-mix al 12% del
 * badge numérico, se fue con ScBadge en la Task 15 (2026-08-11), y con ella
 * el motivo por el que el test importaba esta función: medir el contraste AA
 * del número sobre esa mezcla. Sigue exportada porque Features.test.tsx la
 * usa para los ratios del CTA (describe "Task 26") sin duplicar la tabla de
 * acentos.
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
 * que accentColor, ver su docblock -- hasta entonces devolvía el mismo paso
 * 700 en las dos ramas, y en oscuro incumplía AA: 3.51:1/3.01:1/3.32:1 medido
 * contra semantic.bg para learning/imagination/gaming respectivamente,
 * peor que el propio reposo). Learning/Imagination ACLARAN en oscuro (500,
 * antes 700) en vez de oscurecer -- oscurecer empeora el contraste contra un
 * fondo ya casi negro -- y siguen un paso más oscuro en claro (800, antes
 * 700, mismo criterio "hover = un paso más oscuro" del mockup). Gaming usa
 * FEATURES_GAMING_ACCENT_LIGHT_HOVER/_DARK_HOVER (mismo hue 340, L vecino
 * que aclara en oscuro igual que learning/imagination). Ratios medidos
 * (contrastRatio, Features.test.tsx, describe "Task 26"):
 *
 *   learning:    5.84:1 sobre surface (claro) | 7.81:1 sobre bg (oscuro)
 *   imagination: 6.63:1 sobre surface (claro) | 6.45:1 sobre bg (oscuro)
 *   gaming:      6.61:1 sobre surface (claro) | 6.13:1 sobre bg (oscuro)
 *
 * Hasta la Task 15 (2026-08-11) tenía un SEGUNDO uso, hoy inexistente: el
 * número del badge de la tarjeta clara (ScBadge) lo consumía tal cual, no
 * accentColor, porque sobre el color-mix(in oklab, accentColor 12%,
 * semantic.surface) de ese badge solo la versión hover llegaba a AA
 * (4.96:1/5.58:1/5.60:1 frente a 4.31:1/4.98:1/4.52:1). Esa pieza se retiró
 * con la numeración decorativa, así que hoy esta función tiene UN solo
 * consumidor: el estado hover/focus-visible del CTA de texto (ScCta, más
 * abajo). Las cifras del badge se conservan aquí como historia de por qué
 * accentColorHover existe separada, no como descripción del código vivo.
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
 * min-height: 100dvh con el contenido centrado en el eje de bloque
 * (Objetivo 1, encargo 2026-08-04). min-height, NUNCA height exacto: las
 * tres tarjetas (figura + cuerpo + cuatro bullets + CTA cada una) son el
 * contenido más alto de la página y no caben en una pantalla de 667px sin
 * destruir la legibilidad (mismo argumento que D4 ya aplica a la rama
 * oscura). Con min-height la sección mide una pantalla exacta donde el
 * contenido cabe (escritorio) y crece donde no (móvil), sin recortar nada.
 *
 * Rama oscura ($fullBleed, D2/D7/D11, spec
 * 2026-08-02-features-overlay-celestial-orbital-design.md): la sección
 * deja de tener caja propia -- pierde max-width, margin-inline: auto,
 * min-height y el display: flex que centraba el contenido -- porque
 * ahora son ScDarkSceneSlot y ScDarkFrame (más abajo) quienes miden el
 * slot de la escena y el contenido por separado. D7: el contenido de
 * Features -- tres identidades con título, cuerpo, cuatro bullets y CTA cada
 * una -- es el más alto de la página y desborda una pantalla en viewports de
 * portátil; una escena que midiera lo mismo que la sección se estiraría y el
 * object-fit: cover recortaría el arte justo donde vive el vacío que ocupa
 * el texto.
 *
 * PIERDE overflow: hidden (D7): la pérdida NO es cosmética -- es EL FALLO
 * QUE ROMPERÍA EL PIN ENTERO EN SILENCIO, sin ningún error en consola que lo
 * delate. Cualquier ancestro con overflow distinto de visible/clip
 * desactiva el position: sticky de un descendiente: si ScFeatures
 * conservara su overflow: hidden, sería el ancestro que desactivaría el
 * sticky de ScDarkSceneSlot y la escena dejaría de quedarse pegada
 * mientras el contenido pasa por delante -- mismo fallo que D7 de
 * 2026-08-02-journey-overlay-transition-design.md documentó para
 * ScJourney. El recorte del overscan de la escena lo hace ScScene
 * (featuresCelestialOrbital.parts.tsx), que ya declara su propio
 * overflow: hidden y no es ancestro de sí mismo.
 *
 * CONSERVA position: relative, el solape margin-block-start negativo con
 * su guard de reduce (mecánica idéntica a ScJourney, Journey.tsx, y a
 * las dos entregas anteriores de esta serie) y background-color explícito
 * -- theme.data.semantic.bg, NO palette.secondary[1100] en crudo (D10):
 * src/theme/tokens/semantic.ts:63 declara bg: color.secondary[1100] para
 * el tema oscuro, así que es el mismo valor del encargo sin saltarse la capa
 * de tokens (esta rama solo existe en oscuro, D1, así que el rol semántico
 * lo da sin ambigüedad). z-index: 2 (D11): escalera explícita de la
 * página -- Story (auto) → Journey (1) → Features (2).
 *
 * `padding` de la rama ACOTADA (`$fullBleed` falso): término INLINE en
 * `inlineSpace`, términos de BLOQUE en `space` (ver el docblock de
 * `inlineSpace` en `tokens/space.ts`). Mismo raíl que las hermanas acotadas de
 * la home, y con la raíz por defecto el mismo valor de siempre.
 */
const ScFeatures = styled.section<{ $fullBleed: boolean }>`
  /* WCAG 2.1 SC 1.4.4 (critica externa #13), mismo criterio y mismo motivo que
     ScStory: overflow-wrap se hereda, asi que una declaracion en la raiz de la
     seccion cubre su texto entero en las dos ramas. Aqui es el arreglo COMPLETO
     y no un refuerzo: las pistas de esta seccion ya estaban acotadas con
     minmax(0, 1fr), y aun asi el h2 medía 320px de linea dentro de una caja de
     294px a raiz 32px -- una palabra sola mas ancha que su caja.

     El valor pasa de break-word a anywhere en la critica #19, por el mismo
     motivo y con la misma medicion que documenta ScStory. */
  overflow-wrap: anywhere;

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
          padding: ${theme.data.space[8]} ${theme.data.inlineSpace[5]}
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

/* Cabecera: mockup L188-194 -- YA NO centrada (D6, spec 2026-08-06-story-
   features-tema-claro-design.md): block simple, alineado a la izquierda,
   sin text-align/align-items:center -- a diferencia de la cabecera
   anterior (las tres palabras de marca), que sí los llevaba. El espaciado
   entre los hijos usa space[3] como aproximación razonable de los
   márgenes verbatim del mockup (18px/16px, que no coinciden con ningún paso
   de la escala); no está fijado por el encargo, así que no se persigue el
   píxel exacto.

   Task 11 (dieta de ornamento A, 2026-08-09): el eyebrow (barra + kicker,
   antes primer hijo de este bloque) se retira -- la cabecera clara abre
   directamente con el h2. El eyebrow/11px en versalitas por encima de
   CADA sección era el andamiaje de IA más repetido del sitio; Features
   claro se une a Journey/Contacto en abrir con su encabezado real. */
const ScHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/* Kicker: desde la integración de la ola K (crítica externa #15,
   2026-09-02) es el primitivo compartido src/components/ui/Kicker, el mismo
   que consume Story -- hasta esa ronda este fichero y Story.tsx declaraban
   dos ScKicker byte a byte idénticos (mismo rol visual, "etiqueta de marca",
   mockup var(--primary-600), L159: semantic.brandText, no un paso de palette
   suelto), y la regla decorativa que lo acompaña solo se pintaba en
   Story/claro. El primitivo la lleva en las cuatro combinaciones.

   Historia, porque su rol ha cambiado dos veces y el código por sí solo no lo
   cuenta. La Task 11 (dieta de ornamento A, 2026-08-09) lo retiró de la rama
   CLARA: era un eyebrow genérico ("Características"/"Features") por encima
   del h2, el andamiaje más repetido del sitio. En la rama OSCURA no se pudo
   retirar porque ESE kicker ERA el <h2> de la sección (el único encabezado
   accesible que tenía), así que en vez de eso subió de overline (11px) a
   h4 (18px) para dejar de ser más pequeño que su propio cuerpo.

   La Task 15 (unificación de contenido, 2026-08-11) deshace las dos
   anomalías a la vez, y no revierte la Task 11: lo que aquella retiró fue un
   kicker GENÉRICO, y lo que la decisión D-E del dueño sanciona ahora es un
   kicker con VOZ ("¿Por dónde empiezas?", la pregunta que las tres tarjetas
   responden — segundo kicker del sitio junto al de Story, "¿Por qué
   VoidToInfinite?"). Con la rama oscura ya en posesión de su <h2> real
   (ScDarkTitle, más abajo), este elemento vuelve a ser lo que su nombre
   dice en las DOS ramas: un kicker overline, nunca un encabezado -- y el
   primitivo compartido lo garantiza por construcción, porque no expone
   `variant`. */

/* Párrafo de entrada nuevo (D6; mockup L192, color: var(--text-secondary)).
   Mismo mapeo que ScBulletItem/ScBody (más abajo) para ese rol de texto
   en este componente: semantic.textMuted, no un tercer rol nuevo. */
const ScIntro = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/* Los tres términos del h2 de la rama OSCURA son spans de color — no hay
   separador en el .html exportado del mockup viejo
   (<span>Learning</span><span>Imagination…, concatenados sin espacio): se
   restaura un espacio de texto plano entre ellos porque la ausencia total de
   separación es un artefacto de la herramienta de exportación, no una
   intención legible del diseño ni de accesibilidad (un lector de pantalla
   anunciaría "LearningImaginationGaming" como una sola palabra).

   Siguen existiendo tras esta entrega (D6, spec 2026-08-06): la rama CLARA
   deja de usarlos -- su h2 pasa a ser una frase real, ver el return más
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
 * el degradado de texto (background-clip: text + FEATURES_GAMING_TITLE_GRADIENT,
 * retirado de features.layers.ts) pasa a color solido. Mismo motivo que
 * ScAccent en Story.tsx/Contact.tsx y ScQuoteText en Journey.tsx: un
 * degradado de texto queda fuera del alcance de contrast.ts (nadie puede
 * medir el contraste de algo que no es un color), asi que nadie lo habia
 * medido nunca.
 *
 * El color elegido no es nuevo: es el MISMO FEATURES_GAMING_ACCENT que este
 * bloque ya usaba como fallback de @supports not (background-clip: text)
 * (regla 17 del manual: excepcion sancionada para arte de marca con
 * constantes con nombre en su propio módulo). No es un token de palette.*
 * a proposito (ver el docblock de FEATURES_GAMING_ACCENT,
 * features.layers.ts: "matiz deliberadamente distinto del secondary de
 * tema").
 *
 * Hasta la Task 26 (2026-08-10) esta frase seguía además: "...y el MISMO
 * literal que accentColor() ya resuelve para el check/CTA de esta misma
 * tarjeta". ESO YA NO ES CIERTO -- Task 26 resuelve accentColor()/
 * accentColorHover() por RAMA de tema (ver su docblock, más arriba) y el
 * literal que Gaming usa ahí en oscuro pasó a FEATURES_GAMING_ACCENT_DARK
 * (L distinto, mismo hue 340), porque FEATURES_GAMING_ACCENT no pasaba AA
 * contra semantic.bg y SÍ pasa contra FEATURES_ORBITAL_VOID -- son dos fondos
 * DISTINTOS con presupuestos de contraste distintos, así que ya no hay
 * ninguna razón para que compartan el mismo L.
 *
 * A diferencia de ScAccent/ScQuoteText, ScSpanGaming SOLO se renderiza
 * en la rama OSCURA (el h2 de la rama clara es una frase sin spans de color,
 * D6 mas arriba en este fichero) -- una sola medida hace falta, contra el
 * fondo de la escena oscura. Sobre FEATURES_ORBITAL_VOID (el void, "#150b2e")
 * da 5.31:1, y sobre el PIXEL PINTADO con las capas WebP reales encima 5.05
 * de mediana con el 0% del borde de glifo bajo umbral.
 *
 * ESAS DOS CIFRAS SON DOS MEDIDAS DISTINTAS Y LAS DOS HACEN FALTA, que es lo
 * que el ítem 44 del QA vino a comprobar: hasta el 2026-08-15 aquí ponía
 * 4.71:1 contra el void, y era cierto -- pero el void es el suelo que
 * `contrast.ts` puede calcular en jsdom, no lo que se ve. Con el arte real
 * encima la mediana caía a 4.49-4.66 según la posición de scroll, cruzando el
 * umbral de 4.5. Se corrigió subiendo L de 0.62 a 0.65 en la constante (mismo
 * hue, misma croma); el porqué del 0.65 y no del 0.63 está en su docblock,
 * features.layers.ts. Sigue siendo el margen más ajustado de los acentos de
 * esta tarea (13+:1 en Story/Contact/Journey oscuro) -- declarado, no
 * escondido; medicion completa en Features.test.tsx, describe "Task 12".
 */
const ScSpanGaming = styled.span`
  color: ${FEATURES_GAMING_ACCENT};
`;

/*
 * Envoltorio genérico de reveal escalonado (D9, spec 2026-08-06): SUSTITUYE
 * a ScItem (que solo envolvía tarjetas, con $index/$fullWidth propios
 * de la rejilla). Cubre CINCO elementos de la rama clara -- h2, párrafo de
 * entrada y las tres tarjetas -- bajo un ÚNICO useReveal (ver
 * Features()); hasta Task 11 (dieta de ornamento A, 2026-08-09) eran seis,
 * con el eyebrow abriendo el grupo, retirado por esa tarea. El estado
 * data-revealed vive en
 * ScRevealGroup (el padre común, más abajo), NO en cada ScReveal, así que
 * el selector es DESCENDIENTE ([data-revealed="true"] &) y no calificado
 * (&[data-revealed="true"]) -- la variante calificada solo funcionaría si
 * el atributo viviera en el propio elemento, que es justo el matiz que
 * documenta el gotcha transversal de CSS con atributos de estado (mismo
 * patrón que ya evitó Journey/Story: un padre con el estado, hijos animados
 * como descendientes).
 *
 * Cada instancia declara su propio escalón por $delayMs
 * (FEATURES_LIGHT_REVEAL_DELAYS_MS, features.layers.ts) como
 * transition-delay SUELTO (no dentro del shorthand transition) --mismo
 * patrón que ScItem ya usaba y que la suite valida que jsdom resuelve
 * (Features.test.tsx, lección repo 2026-07-25/27). El guard de
 * prefers-reduced-motion: reduce anula la transición Y el propio retardo
 * (no solo la duración): sin eso, un elemento con 360ms de retardo se
 * quedaría invisible ese tramo bajo reduce, peor que no animar.
 *
 * Task 19 (D7, "terminar la unificación" + curva propia de REVEAL): hasta
 * esta tarea usaba 640ms/easing.standard/22px verbatim del mockup
 * (FEATURES_LIGHT_REVEAL_DURATION_MS/FEATURES_LIGHT_REVEAL_TRANSLATE_Y,
 * retiradas de features.layers.ts -- regla 13 del manual: mismo valor
 * idéntico que llevaba Story.tsx antes de esta misma tarea, así que es un
 * token compartido, no dos constantes de fichero), distinto de la rama
 * OSCURA (ScDarkContent, más abajo), que ya estaba en 480ms/decelerate/
 * 16px. Las dos ramas convergen ahora en REVEAL.durationMs/REVEAL.easing/
 * REVEAL.shift (@/motion/vocabulary) -- la migración que da a REVEAL su
 * primer consumidor real (gate F2: 0 consumidores antes de esta tarea).
 */
const ScReveal = styled.div<{ $delayMs: number }>`
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};
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
   IntersectionObserver (revealRef, Features()) -- ver el docblock de
   ScReveal, arriba, para el porqué del selector descendiente. space[7]
   (48px) entre cabecera y rejilla: mockup L196, margin-top: var(--space-7)
   sobre la rejilla respecto al bloque de cabecera. */
const ScRevealGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[7]};
`;

/* Rejilla de tres tarjetas IGUALES (D5, spec 2026-08-06; mockup L196):
   SUSTITUYE al grid-template-columns: 1fr / repeat(2, ...) anterior --
   se retira el caso especial $fullWidth de "learning" (ya no existe: las
   tres tarjetas son geométricamente iguales, ninguna ocupa dos columnas).
   ESTA ÚLTIMA FRASE DEJA DE SER CIERTA CON LA TASK 22, ver el bloque de
   abajo -- se conserva porque explica una decisión real de su momento, no
   porque siga describiendo el código vivo. */

/*
 * TASK 22 (tipografía de lectura, plan premium F1-F5, punto 1 del brief;
 * hallazgo M4 del craft audit): repeat(auto-fit, minmax(17.5rem, 1fr))
 * SE RETIRA -- era la MISMA gramática de layout que Story
 * (ScPillarGrid, Story.tsx: repeat(auto-fit, minmax(15rem, 1fr))) y
 * que, aunque con una sintaxis distinta, resuelve el mismo "grid uniforme de
 * tarjetas iguales" que Journey (ScStepsGrid, Journey.tsx:
 * repeat(2|3|6, 1fr) por breakpoint) -- TRES secciones seguidas del scroll
 * de la home resolviendo "aquí van N tarjetas" con la misma respuesta
 * genérica. Story y Journey CONSERVAN la suya (encargo explícito, no se
 * tocan); Features cambia de gramática.
 *
 * Elegida una rejilla BENTO asimétrica ("destacada + pareja", desde lg,
 * 992px) en vez de una lista jerárquica: las tres identidades ya comparten
 * exactamente la misma estructura interna (imagen + cuerpo + 4 bullets +
 * CTA, D5-D8) y degradarlas a bloques de lista habría deshecho ESE trabajo
 * sin necesidad -- el problema que M4 señala es la gramática de la REJILLA
 * (cuadrícula uniforme y content-agnostic), no la tarjeta en sí. La primera
 * identidad (FEATURE_KEYS[0], "learning" -- también la primera que
 * nombran los tres <span> del h2 oscuro, ScSpanLearning más arriba) abre
 * la rejilla ocupando las DOS columnas en su propia fila; las otras dos
 * quedan hermanadas debajo, una junto a otra. Es una jerarquía deliberada,
 * no arbitraria: convierte "tres cajas iguales" en "una entrada + dos
 * complementarias", que es justo el tipo de asimetría que M4 pide y que
 * auto-fit/minmax no puede expresar -- esa función SOLO sabe repartir
 * columnas iguales según el ancho disponible, nunca dar más peso a un ítem
 * concreto.
 *
 * DESCARTADA en el propio proceso de esta tarea (verificado en navegador
 * real, captura t22-features-light-desktop-1280-scroll2.png conservada en
 * el informe): la primera propuesta hacía lo contrario -- la 1ª tarjeta en
 * una columna ANCHA que abarca las DOS FILAS, con la 2ª y 3ª apiladas al
 * lado. Con las tres tarjetas de contenido idéntico (imagen + cuerpo + 4
 * bullets + CTA), la tarjeta ancha terminaba su contenido mucho antes que
 * la suma de las dos apiladas, y align-items: stretch rellenaba esa
 * diferencia con SUPERFICIE BLANCA VACÍA bajo su CTA -- un hueco que en
 * pantalla no se lee como "jerarquía", se lee como una tarjeta rota. Aquí
 * las dos tarjetas de la fila 2 comparten la MISMA estructura entre sí (no
 * con la de la fila 1), así que su diferencia de alto es la que de verdad
 * cabe esperar entre dos párrafos distintos -- unos pocos píxeles, no una
 * fila entera -- y align-items: stretch la absorbe sin hueco visible.
 *
 * ESTO REVIERTE, a propósito, la mitad de la decisión D5 de 2026-08-06 (ver
 * el docblock de arriba): aquella retiró un $fullWidth que existía por
 * CONTENIDO desigual entre tarjetas (antes de la unificación de la Task 15,
 * "learning" tenía más elementos que las otras dos). Esa razón ya no aplica
 * -- las tres tarjetas son hoy estructuralmente idénticas -- así que la
 * asimetría de esta tarea nace de un motivo DISTINTO (jerarquía visual
 * deliberada para romper la gramática repetida), no de una necesidad de
 * contenido. No hace falta ningún prop nuevo ni tocar el $fullWidth que
 * D5 borró: la fila destacada se resuelve posicionalmente
 * (> *:first-child), así que las tres <article> de las tarjetas
 * (ScCardBorder) siguen compartiendo exactamente las mismas clases de
 * estructura -- el candado de D5 ("las tres tarjetas comparten exactamente
 * las mismas clases", Features.test.tsx) sigue en pie sin tocarse.
 *
 * Colocación de la 2ª y 3ª tarjeta: SIN grid-area ni prop por tarjeta,
 * apoyada en el algoritmo de colocación implícita de CSS Grid (auto-flow
 * row, el valor por defecto). Con la 1ª tarjeta fijada explícitamente en
 * grid-column: 1 / -1 (fila 1 completa), la siguiente celda libre en orden
 * de fila es (fila 2, columna 1) y despues (fila 2, columna 2) -- que es
 * exactamente donde caen, en orden de documento, la 2ª ("imagination") y la
 * 3ª ("gaming") tarjeta.
 *
 * Por debajo de lg la sección seguía -- y sigue -- apilando las tres
 * tarjetas en una sola columna (antes por colapso natural de auto-fit al
 * quedarse sin ancho para una segunda columna de 17.5rem; ahora de forma
 * EXPLÍCITA con grid-template-columns como base, antes del @media).
 * Verificado a ojo en navegador real, los dos temas y en móvil (informe de
 * la tarea, capturas t22-*).
 *
 * ESA PISTA BASE PASA DE `1fr` A `minmax(0, 1fr)` (critica externa #19,
 * 2026-09-04, WCAG 1.4.4). Mismo defecto, misma cita y mismo arreglo que
 * `ScGrid` en `Story.tsx`, que ya lo cerro en la critica #13 -- esta rejilla se
 * quedo atras porque nadie habia medido la home a 200 % de tamano de texto.
 * `1fr` es `minmax(auto, 1fr)`, y ese `auto` es el `min-content` de la tarjeta:
 * medido en Chrome real sobre el build de produccion a 320 px de ancho con la
 * raiz a 32px, la pista salia de 344,50 px dentro de una caja de 224 y la
 * tarjeta entera --titulo, cuerpo, vinetas y enlace-- se salia 72,50 px en la
 * rama inglesa. Con `html, body { overflow-x: clip }` declarado en
 * `GlobalStyles`, ese sobrante no se recupera con scroll: es texto perdido. El
 * `0` solo cambia el MINIMO de la pista; el `1fr` sigue repartiendo igual, asi
 * que con la raiz por defecto la geometria no cambia (el bloque `lg` de mas
 * abajo ya lo declaraba bien desde el principio).
 */
const ScGrid = styled.div`
  display: grid;
  /* minmax(0, 1fr), NO 1fr (WCAG 1.4.4, critica #19): ver el docblock. */
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.data.space[5]};
  align-items: stretch;
  width: 100%;

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > *:first-child {
      grid-column: 1 / -1;
    }
  }
`;

/* Giro del ángulo del borde cónico (D7): anima la propiedad personalizada
   --vti-angle en sí, no ninguna propiedad de compositor -- por eso todo el
   bloque vive detrás de un guard no-preference explícito, ver
   ScCardBorder más abajo. --vti-angle YA está registrada con @property
   en GlobalStyles.tsx (no se declara ni se mueve aquí: @property es una
   regla de nivel superior de la hoja, y styled-components inyecta el CSS de
   un componente anidado bajo su propia clase). */
const cardBorderSpin = keyframes`
  to {
    --vti-angle: 360deg;
  }
`;

/*
 * Envoltorio-borde de la tarjeta (D7, mockup L197-198): la tarjeta EXTERIOR
 * es solo padding: 1.5px con el FONDO haciendo de borde -- en reposo
 * semantic.border (gris neutro), en hover un conic-gradient de marca que
 * gira. Dentro, ScCardSurface (más abajo) pinta la superficie blanca real
 * con el radio interior (calc(radio - padding), ver el docblock de
 * ScCardSurface, debajo).
 *
 * Radio (Task 23, plan premium F1-F5): baja de 26px a 16px por decisión del
 * dueño (Fase 0, capturas delante). Deja de ser un literal de arte propio
 * (FEATURES_CARD_RADIUS, retirada -- ver features.layers.ts) porque
 * 16px coincide EXACTO con theme.data.radius.xl, el mismo token que
 * ScImagePanel (más abajo) ya usa para el panel de imagen de esta misma
 * tarjeta -- consumir el token en vez de reescribir el número evita la
 * duplicación que la regla 13 del manual prohíbe.
 *
 * Excepción declarada al lenguaje de movimiento de la casa (D7 de la spec
 * 2026-08-06-story-features-tema-claro-design.md): el animation de abajo
 * NO anima transform/opacity -- anima --vti-angle, una propiedad
 * personalizada que repinta el background-image cónico en cada frame. Se
 * acepta por los mismos motivos que la excepción ya sancionada del degradado
 * de BrandName: es un efecto de marca, está ACOTADO al hover (no es
 * ambiental, no corre mientras nadie lo mira) y se declara SOLO bajo
 * @media (prefers-reduced-motion: no-preference) -- bajo reduce el hover
 * conserva el translateY/box-shadow (cambios instantáneos, no animados)
 * pero nunca el borde cónico ni su giro.
 *
 * Degradación conocida y aceptada: sin soporte de @property (que registra
 * --vti-angle como <angle> interpolable, GlobalStyles.tsx), el ángulo
 * no interpola y el borde queda como un degradado cónico ESTÁTICO en hover
 * -- sigue siendo un borde de marca legible, no hay estado roto, así que no
 * hace falta @supports.
 *
 * Paradas de marca del sistema (D7): semantic.brand (=palette.primary[500],
 * coincide exacto con el var(--primary-500) del mockup) y
 * palette.secondary[500] (sin rol semántico propio, mismo criterio que ya
 * usa accentColor para secondary en este mismo fichero).
 *
 * Sombra (D5/D7): elevation[1] en reposo / elevation[3] en hover ("subida
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
 * se quedó entonces en duration.base/easing.standard, sin tocar.
 *
 * Task 19 (punto 2 del brief, "unificar transition de hover base->fast")
 * termina esa unificación: box-shadow pasa de duration.base (200ms) a
 * duration.fast (100ms), mismo easing.standard -- mismo cambio que
 * ScPillarCard en Story.tsx, alineando las dos secciones con el precedente
 * que ya llevaba Card.tsx desde Task 9.
 */
const ScCardBorder = styled.article<{ $key: FeatureKey }>`
  position: relative;
  display: flex;
  height: 100%;
  padding: ${FEATURES_CARD_BORDER_WIDTH};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    box-shadow ${({ theme }) => theme.data.motion.duration.fast}
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

/* Superficie interior blanca (D7): radio calculado, no un segundo literal.
   Task 23: la fórmula NO cambia (radio interior = radio exterior − grosor
   del envoltorio-borde, la regla estándar de radios anidados -- se resta el
   hueco entre los dos contornos, no una proporción fija), así que baja sola
   al bajar radius.xl -- 16px − 1.8px = 14.2px (antes: 26px − 1.8px =
   24.2px). Ver el docblock de ScCardBorder, arriba, y el de la constante
   retirada FEATURES_CARD_RADIUS en features.layers.ts. */
/*
 * COMPOSICION A DOS COLUMNAS DE LA TARJETA DESTACADA (critica externa #15,
 * hallazgo C 3, 2026-09-02). Medido a 1440 en tema claro: la tarjeta destacada
 * -- la que la Task 22 hace abarcar las dos columnas de la rejilla bento --
 * medía 1.148 px de ancho y solo 416 px de tinta (36 %). Los 416 px son el tope
 * de lectura de ScBody (grid.prose), asi que el sobrante no era un descuido de
 * relleno: era una columna de texto acotada a proposito dentro de una caja tres
 * veces mas ancha, con 709 px de superficie blanca a su derecha. La rama OSCURA
 * resuelve la misma seccion con una composicion llena.
 *
 * POR QUE DOS COLUMNAS Y NO ACOTAR LA TARJETA AL CONTENIDO, que era la otra via
 * del hallazgo: acotarla es deshacer la Task 22 -- la jerarquia «una entrada +
 * dos complementarias» que sustituyo a la rejilla uniforme de auto-fit, con
 * capturas del dueno delante (ver el docblock de ScGrid, arriba). Dos columnas
 * conserva esa jerarquia Y llena la caja.
 *
 * Y NO ES UNA COMPOSICION NUEVA: es la del mockup aprobado. La spec
 * 2026-07-28-landing-v2-secciones-design §7.3 describe literalmente «tarjeta
 * Learning a ancho completo (figura izquierda + contenido con bullets en 2
 * columnas), Imagination y Gaming a media anchura cada una». La entrega de
 * 2026-08-06 (D5) igualo las tres tarjetas porque entonces el contenido era
 * desigual; la Task 22 devolvio el ancho completo a la primera pero se quedo a
 * medias, con la composicion interior de una tarjeta estrecha dentro de una
 * caja ancha. Esto termina aquel movimiento.
 *
 * SIN PROP NI CLASE PROPIA, igual que la Task 22: la tarjeta destacada se
 * resuelve POSICIONALMENTE desde la rejilla (selector de componente sobre
 * ScGrid + :first-child), asi que las tres <article> siguen compartiendo
 * exactamente las mismas clases de estructura y el candado de D5
 * (Features.test.tsx) sigue en pie sin tocarse. El estado vive en un ANCESTRO y
 * se lee con selector DESCENDIENTE -- la forma correcta segun la regla 35 de
 * RULES.md y el gotcha transversal de CSS con atributos de estado.
 *
 * DESDE lg (992px) Y NO ANTES: por debajo, la rejilla apila las tres tarjetas en
 * una sola columna y la primera no tiene ningun ancho extra que llenar -- es
 * exactamente el mismo umbral en el que ScGrid le da su grid-column: 1 / -1, y
 * tiene que serlo: las dos declaraciones describen la misma tarjeta.
 */
const ScCardSurface = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.data.semantic.surface};
  border-radius: calc(
    ${({ theme }) => theme.data.radius.xl} - ${FEATURES_CARD_BORDER_WIDTH}
  );
  overflow: hidden;

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${ScGrid} > *:first-child & {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: stretch;
    }
  }
`;

/*
 * AQUI VIVIERON ScCardHead (la fila superior de la tarjeta clara; D6/D10,
 * mockup L199), ScBadge (el badge cuadrado con el numero 01/02/03; mockup
 * L200) y ScBadgeLabel (la etiqueta Home.features.<key>.badge que lo
 * acompanaba). Los TRES se retiran en la Task 15 (unificacion de contenido,
 * 2026-08-11), y por dos motivos distintos que conviene no mezclar:
 *
 * - El NUMERO era decorativo declarado (aria-hidden, "el orden ya lo
 *   comunica el DOM"): numerar tres identidades que no son una secuencia
 *   sugiere un recorrido que no existe. La numeracion honesta que pide la
 *   Task 15 lo saca de aqui; Journey conserva la suya porque su secuencia SI
 *   es real.
 * - La ETIQUETA era, en las dos lenguas, el titulo de la propia tarjeta en
 *   otra forma ("Aprendizaje" sobre "Aprende", "Learn" sobre "Learning"): un
 *   eyebrow que repite lo que se lee dos lineas mas abajo. Con el contenido
 *   unificado habia que elegir entre anadirla tambien a la rama oscura o
 *   retirarla de la clara; se retira, porque no aporta informacion que el
 *   titulo no de ya y porque la rama oscura tiene un presupuesto vertical
 *   medido (una pantalla) que esta entrega ya gasta en el h2 y el parrafo de
 *   entrada que le faltaban. Decision declarada en el informe de la tarea.
 *
 * Con esto la tarjeta clara abre directamente por su panel de imagen. El
 * fondo color-mix(... 12% ...) que solo existia para el badge se va con el;
 * los del panel (7%) y el circulo (16%) siguen intactos, mas abajo.
 */

/* Panel de imagen (D8; mockup L202-206): bloque de altura fija con un
   círculo decorativo desbordando por abajo (aria-hidden) y la figura
   encima, alineada al borde inferior (ver ScFigure, debajo). Desde la
   Task 15 es además el PRIMER hijo de la tarjeta: la fila superior (badge
   numérico + etiqueta) se retiró, ver la lápida más arriba en este fichero.
   El fondo y el círculo son puramente decorativos -- no llevan texto, así que
   no están sujetos al contraste de texto AA. El único color-mix de esta
   sección que SÍ portaba texto era el fondo del badge, y se fue con él, así
   que hoy ninguna mezcla de este fichero necesita medirse contra AA. */
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

  /* Columna de arte de la tarjeta destacada (critica externa #15, hallazgo C 3
     -- ver el docblock de ScCardSurface, arriba, para el porque completo).
     Tres cambios, uno por cada suposicion de la composicion apilada que deja
     de valer al pasar a dos columnas:

     height: auto ENTREGA EL ALTO A LA FILA -- como elemento de rejilla con el
     align-self por defecto (stretch), el panel acompana al contenido de arriba
     abajo en vez de quedarse en una franja fija con blanco debajo. Es el mismo
     criterio que D11 de la spec 2026-08-06 ya fijo para la figura de Story:
     «el alto correcto es el que tenga la otra columna, y eso solo lo sabe el
     layout en tiempo real». min-height conserva la medida del mockup como
     SUELO, para que una tarjeta de copy corto no encoja el arte.

     margin-inline-end: 0 lleva el panel hasta el limite de su columna; la
     separacion con el texto la pone el padding de ScContent, que ya existe. El
     margin-block-end lo devuelve la simetria que la version apilada no
     necesitaba (alli el hueco inferior lo daba el propio contenido). */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${ScGrid} > *:first-child & {
      height: auto;
      min-height: ${FEATURES_IMAGE_PANEL_HEIGHT};
      margin-block-end: ${({ theme }) => theme.data.space[4]};
      margin-inline-end: 0;
    }
  }
`;

const ScImageCircle = styled.span<{ $key: FeatureKey }>`
  position: absolute;
  width: ${FEATURES_IMAGE_CIRCLE_SIZE};
  height: ${FEATURES_IMAGE_CIRCLE_SIZE};
  /* Tope contra la caja que lo aloja (critica #19): su medida esta en rem y
     dobla con la preferencia de tamano de texto mientras el panel no -- medido:
     18 px fuera del viewport a 320 px con la raiz a 32px. */
  max-width: 100%;
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

   width: auto + height: 100% (D8, mockup L207): sin el override explícito
   de width, GlobalStyles fuerza img { width: 100% } en todo el sitio (la
   misma regla que ya obligó a fijar el ancho de ScCheckIcon, más abajo) y
   la figura perdería su proporción, dejando de "alinearse al borde inferior"
   -- pasaría a llenar el panel entero y object-position (centrado por
   defecto en GlobalStyles) sustituiría a la alineación por flex del panel.

   CAJA RESERVADA DE LA DESTACADA en lg (critica #21, P2 del objetivo >=98,
   H4; el porque completo en el docblock de FEATURES_FIGURE_TABLET_WIDTH_PX,
   features.layers.ts). En lg el panel de la destacada se estira al alto de
   la fila de la rejilla, asi que el 100% de alto de la figura SI resuelve: es
   el alto de la fila (295 px a 1440 antes de cargar; 679 px a 2048 con la
   raiz a 32, donde manda el texto). Lo que falta antes de cargar es la
   proporcion: sin ella la imagen diferida mide 0 de ancho, y la fila pierde
   lo que la imagen cargada le aporta. Al cargar durante el primer salto a
   una ancla de debajo, Features crecia 65 px y el aterrizaje quedaba a 192 px
   en vez de 128. La reserva NO fija un ancho: la proporcion de las figuras va
   en la base y el ancho sale del alto de la fila con cualquier raiz. El
   min-height es la aportacion que la imagen cargada hace a la fila, que es
   el alto natural de la franja de sizes que el navegador elige: 360 px en la
   de 240 y 300 px en la de 200.

   La franja de 200 va en una media ANIDADA dentro de lg y en px. En px
   porque sizes esta en px y no depende de la raiz: una media en em cambiaria
   de franja en otro pixel en cuanto la raiz no fuese 16. Anidada porque la
   reserva solo existe en lg; fuera de lg el panel tiene alto fijo. Su
   condicion es FEATURES_FIGURE_TABLET_MEDIA, la MISMA cadena que usa sizes,
   (max-width: 1023px): la reserva baja a 300 exactamente en los viewports en
   los que la imagen elegida es la de 200 px, y vuelve a 360 en 1024. */
const ScFigure = styled.img`
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: 100%;
  max-width: 100%;
  aspect-ratio: ${FEATURES_FIGURE_ASPECT_RATIO};
  object-fit: contain;
  transform: translateY(
    calc(var(--features-progress, 0) * -${FEATURES_FIGURE_PARALLAX_PX}px)
  );

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${ScGrid} > *:first-child & {
      min-height: ${FEATURES_FIGURE_DESKTOP_MIN_HEIGHT_PX}px;
    }

    @media ${FEATURES_FIGURE_TABLET_MEDIA} {
      ${ScGrid} > *:first-child & {
        min-height: ${FEATURES_FIGURE_TABLET_MIN_HEIGHT_PX}px;
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

/* Cuerpo de la tarjeta: título + body + bullets + CTA (sin cambios de
   estructura respecto a la entrega anterior, solo pierde el
   position:relative;z-index:1 que necesitaba para competir con el patrón
   SVG absoluto que esta entrega retira -- ver features.layers.ts).

   `padding`: dos terminos, no uno. El INLINE lee `inlineSpace` (ver su
   docblock en `tokens/space.ts`) para que el relleno de la tarjeta deje de
   comerse la columna de texto con la fuente al 200 %; el de BLOQUE sigue en
   `space`. */
const ScContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: ${({ theme }) => theme.data.space[2]};
  padding: ${({ theme }) => theme.data.space[5]}
    ${({ theme }) => theme.data.inlineSpace[5]};

  /* Columna de texto de la tarjeta destacada (critica externa #15, hallazgo
     C 3): centrada en el eje de bloque contra la columna de arte de al lado.
     En la composicion apilada no hacia falta -- el texto venia despues del
     panel y el orden de lectura ya lo colocaba --; en dos columnas, si el arte
     impone una fila mas alta que el texto (su min-height es el suelo del
     mockup), sin esto el texto quedaria colgando del borde superior con todo
     el hueco debajo. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${ScGrid} > *:first-child & {
      justify-content: center;
    }
  }
`;

const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/*
 * Bullets a UNA columna en todos los anchos (D4, compactación vertical
 * 2026-08-04; revertido de un reparto a DOS columnas por el "ajuste visual"
 * del 2026-08-08 -- ver el docblock del describe "bullets a una columna..."
 * en Features.test.tsx para la medición de ese cambio). Nació como reparto a
 * DOS columnas (encargo 2026-08-03) con el razonamiento completo de por qué
 * lg y no md, y de por qué la rama oscura necesitaba un breakpoint más
 * temprano ($compactFrom="sm") que la clara: ese razonamiento comparaba
 * anchos de COLUMNA en un reparto a dos columnas que el 2026-08-08 retiró.
 *
 * Fix wave D (hallazgo D4, revisión final de rama, 2026-08-12) retira el
 * @media COMPLETO, no solo el grid-template-columns no-op que una
 * revisión anterior de este mismo fix había identificado y quitado. El
 * @media sobreviviente solo ensanchaba el gap (de space[2] a
 * space[2] space[5]) -- un intento de fix a medias concluyó que ESE efecto
 * SÍ era real y verificado ("EN QUÉ breakpoint se ensancha el gap"), pero esa
 * conclusión no se contrastó en navegador antes de escribirse (no existe
 * ninguna captura fixD-* en el informe de la tarea que la respalde).
 * Verificado aquí en navegador real (Chrome, panel embebido, 1280×900 y
 * 500-1300px de viewport, temas claro y oscuro, a los dos lados de lg y de
 * sm): gap es la shorthand row-gap column-gap, y este grid SIEMPRE
 * resuelve grid-template-columns a UNA sola pista (grid-template-columns:
 * 1fr sin grid-auto-flow: column, contenido que nunca desborda a una
 * segunda columna) -- así que el valor que el @media cambiaba
 * (column-gap, de space[2] a space[5]) no tiene NINGÚN gap de columna
 * al que aplicarse, en NINGÚN ancho. El row-gap -- el único que sí
 * afectaría el espaciado visible entre bullets apilados -- se queda fijo en
 * space[2] a los dos lados del breakpoint, en las dos ramas: medido
 * getBoundingClientRect().top de cada bullet antes y después de cruzar el
 * breakpoint, mismo incremento (~30-31px) en los dos casos. Cero diferencia
 * observable, en ningún eje -- el @media entero es no-op, no solo la línea
 * ya retirada.
 *
 * $compactFrom se retira con él: sin ningún efecto real que decidir, el
 * prop (y la elección de breakpoint sm vs lg que transportaba, herencia
 * del reparto a dos columnas ya retirado) no tiene ninguna razón para seguir
 * vivo. Si una tarea futura decide ensanchar el gap a partir de algún
 * ancho, es una decisión de diseño nueva que se verifica de cero -- no una
 * resurrección de este mecanismo.
 */
/*
 * UNA SOLA LEY DE VIÑETAS, IDÉNTICA EN LAS DOS RAMAS DE TEMA (decisión del
 * dueño, paridad de Features entre temas, 2026-09-04). Aquí vivió, desde la
 * crítica externa #15 (hallazgo C 3, 2026-09-02), un bloque
 * `@media lg { ${ScGrid} > *:first-child & { grid-template-columns: repeat(2,
 * minmax(0, 1fr)); column-gap: space[5]; } }` que repartía las viñetas de la
 * tarjeta DESTACADA en dos columnas. Se retira, y el motivo no es de gusto: es
 * medido, y son dos defectos distintos.
 *
 * ## Defecto 1: la regla solo podía existir en una de las dos ramas
 *
 * `ScBullets` es un styled COMPARTIDO por la rama clara y la oscura, pero la
 * regla colgaba de `${ScGrid}` -- la rejilla bento que SOLO monta la rama
 * clara. El mismo nivel de contenido quedaba así en 2x2 en claro y en 4x1 en
 * oscuro, sin que ninguna decisión de producto lo pidiera: el reparto no lo
 * elegía el diseño, lo elegía qué envoltorio existía en cada rama. Medido en
 * Chrome sobre el build de producción de `ef62b26` (DPR 1, es y en, temas
 * claro y oscuro): claro >= lg, primera tarjeta, `grid-template-columns`
 * resuelto a `199.094px 199.109px` (992) / `251.094px 251.109px` (1280-1920),
 * dos filas de dos; oscuro, `501.75px` a un solo carril, cuatro filas, en
 * TODOS los anchos.
 *
 * ## Defecto 2: la premisa de la regla no se sostiene con la copia de hoy
 *
 * El docblock retirado justificaba las dos columnas como lo que «evita que
 * cuatro frases cortas dejen media columna de texto en blanco». Las viñetas
 * dejaron de ser frases cortas en las Tasks 15-16 (unificación de copia): hoy
 * son oraciones de 34 a 43 caracteres que ocupan de 169 a 245 px a 12 px. Con
 * dos columnas eso no cabe. Medido forzando `repeat(2, minmax(0, 1fr))` con
 * `column-gap: 24px` sobre el build de producción, en las dos ramas y las dos
 * lenguas:
 *
 * | ancho | columna | resultado                                              |
 * | ----- | ------- | ------------------------------------------------------ |
 * | 992   | 192-199 | las CUATRO viñetas a dos líneas (45 px), en las 3 cajas |
 * | 1280+ | 239-251 | dos de las cuatro de Gaming a dos líneas, es y en       |
 *
 * Es decir: el reparto a dos columnas no llega a caber a NINGÚN ancho que la
 * composición pueda ofrecer. En producción hoy eso ya se ve: a 992-1279, en
 * claro, las cuatro viñetas de la tarjeta destacada miden 45 px de alto
 * (dos líneas) mientras las de sus dos hermanas miden 22 px (una) -- una
 * incoherencia DENTRO de la propia rama clara, no solo entre temas.
 *
 * La ley que queda es la que las dos ramas ya compartían como base y la única
 * en la que ninguna viñeta se parte: UNA columna, sin ningún breakpoint. Coste
 * medido de volver a ella en la rama clara: la caja de viñetas de la tarjeta
 * destacada pasa de 53 px (>= 1280) y 98 px (992) a 114 px, y la sección de
 * 1.194 px a 1.255 px de alto a 1440x900. La rama oscura no se mueve.
 *
 * Lo que la crítica #15 arregló de verdad NO se toca: la tarjeta destacada
 * sigue repartiendo arte y texto en dos pistas desde `lg` (`ScCardSurface`,
 * más abajo), que es lo que corregía los 709 px de superficie blanca que
 * aquel hallazgo midió. Lo que se retira es solo el sub-reparto de las
 * viñetas dentro de esa columna de texto.
 */
const ScBullets = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.space[2]};
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
 * :focus-visible propio (D7, encargo 2026-08-04): hasta esa entrega este CTA
 * de sección solo tenía :hover, y se le añadió un halo ADITIVO por
 * box-shadow sobre el anillo global. El argumento de entonces era que el
 * anillo global vive en un :where() de especificidad CERO -- cualquier regla
 * futura con más peso lo desplazaría en silencio -- y que un anillo propio
 * era verificable desde el test de este componente.
 *
 * RETIRADO el 2026-09-02 (crítica externa #14, P1 de Craft), y el argumento
 * de 2026-08-04 se responde en vez de ignorarse: el anillo de foco vale
 * justamente porque es el MISMO en todo el sitio, y duplicarlo por
 * componente producía tres vocabularios distintos (dos anillos aquí, uno
 * sustitutivo en los decks, uno solo en el resto). El riesgo de que una
 * regla futura desplace el :where() se cubre ahora donde corresponde: con el
 * token único de src/theme/tokens/focus.ts y su candado de punto único de
 * declaración (tokens/focus.test.ts), no con una copia local.
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
 * type.scale.caption (0.75rem, 12px) a type.scale.bodySm (0.875rem,
 * 14px) -- el escalón de la escala tipográfica del sistema más próximo que
 * cumple el suelo de 14px del encargo (el siguiente paso, body, es 16px:
 * más lejos de los 12px de partida que bodySm). font-weight se queda en
 * h4.weight (600, sin cambios): el encargo pide un tamaño mínimo, no un
 * peso distinto, y el semibold ya venía dando la jerarquía de "acción" frente
 * al cuerpo de la tarjeta. Contraste AA verificado en Features.test.tsx,
 * describe "Task 3": el cambio de tamaño no altera el color del CTA
 * (accentColor), así que el ratio medido es el MISMO en 12px que en
 * 14px -- 14px normal (no bold-large, que exigiría ≥18.66px) sigue
 * necesitando el umbral de texto normal (4.5:1), no el rebajado de 3:1 de
 * texto grande. Esa misma verificación destapó un hallazgo PREEXISTENTE, no
 * causado por este cambio: color (más abajo, accentColor) incumplía AA en
 * 4 de 6 combinaciones tarjeta/rama -- documentado entonces con los ratios
 * exactos en RULES.md, "Deuda conocida", y en el propio test; no se corrigió
 * en ESTA tarea porque exigía una decisión de diseño (el mismo color no
 * puede acercarse a AA en surface blanco Y en bg casi negro a la vez
 * subiendo o bajando un solo paso de la rampa), fuera del alcance mecánico de
 * "tres cierres pequeños". CERRADO por la Task 26 (2026-08-10, "CTA de
 * Features con AA en las seis combinaciones"): accentColor/
 * accentColorHover resuelven por RAMA de tema desde entonces -- ver sus
 * docblocks, más arriba -- y las seis combinaciones de reposo Y las seis de
 * hover pasan AA, con test que lo asevera (Features.test.tsx, describe
 * "Task 26"). La entrada de RULES.md, "Deuda conocida", queda reescrita como
 * resuelta, no borrada.
 */
const ScCta = styled.a<{ $key: FeatureKey }>`
  display: inline-flex;
  align-items: center;
  min-height: ${FEATURES_CTA_MIN_HEIGHT};
  margin-block-start: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h4.weight};
  color: ${({ theme, $key }) => accentColor(theme.data, $key)};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
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
     guard de hover -- es un estado de teclado, no de puntero.

     Este bloque YA NO declara anillo. Tenía un halo de 4px por box-shadow
     contra semantic.focus, aditivo al anillo global, retirado el 2026-09-02
     (crítica externa #14, P1 de Craft): el anillo de foco se declara una
     sola vez en GlobalStyles.tsx, con la geometría de
     src/theme/tokens/focus.ts. Lo que queda es lo que este CTA aporta de
     suyo: el mismo salto de acento que el hover -- foco y hover comunican
     aquí la misma cosa, "esto es accionable" -- y el border-radius, que
     antes redondeaba el halo y ahora redondea el outline global (outline
     adopta el border-radius del elemento). */
  &:focus-visible {
    color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
    border-radius: ${({ theme }) => theme.data.radius.sm};
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
 * Slot pegado de la escena (D7): por qué vive AQUÍ y no en un ScScene con
 * inset: 0 sobre la sección entera, como hizo Journey
 * (ScJourneySceneWrap, journey.deck.tsx). Con inset: 0 la escena
 * mediría lo que mide la SECCIÓN, y el contenido de Features -- tres
 * identidades con título, cuerpo, cuatro bullets y CTA cada una -- es el más
 * alto de la página y desborda una pantalla en viewports de portátil: la
 * escena se estiraría a esa altura real y el object-fit: cover recortaría
 * el arte por los lados, justo donde vive el vacío que ocupa el texto. El
 * slot desacopla las dos medidas: la escena mide SIEMPRE una pantalla
 * (FEATURES_DARK_HEIGHT) y el contenido (ScDarkFrame, debajo) mide lo
 * que mide. Es además lo que pide el encargo sin condiciones: "la imagen del
 * parallax debe ocupar el ancho y alto de la pantalla del dispositivo".
 *
 * Comparte columna de grid con ScDarkFrame y ScDarkTail (grid-column: 1
 * en los tres; ScFeatures es display: grid) en vez de resolverse con un
 * margin-block-end negativo sobre este slot: ese margen negativo alteraría
 * el rectángulo de restricción del propio sticky y lo dejaría viajar una
 * pantalla más allá del final de la sección, pintando sobre Contact. La
 * celda compartida superpone las piezas sin tocar ninguna caja -- mismo
 * recurso que ya usa este repo en ScJourneySlide (journey.deck.tsx), no
 * position: absolute.
 *
 * ABARCA LAS DOS FILAS del grid (grid-row: 1 / span 2, D3/D4 de la spec
 * docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md), no
 * solo la fila 1 que ocupa ScDarkFrame: la fila 2 es la zona de "hold"
 * (ScDarkTail, más abajo) durante la cual la escena sigue pegada sin
 * contenido real pasando por delante, mientras Contacto sube y la cubre --
 * ver el docblock de ScDarkTail para el porqué completo de esa zona. Se
 * usa span 2 y NO 1 / -1: con filas IMPLÍCITAS -- este grid no declara
 * grid-template-rows --, la línea -1 resuelve a la última línea
 * EXPLÍCITA del grid, que aquí es la línea 2 (el final de la única fila
 * declarada, la de ScDarkFrame); 1 / -1 dejaría al slot SIN abarcar la
 * fila del hold -- un fallo silencioso clásico de CSS Grid, sin ningún error
 * en consola ni en el linter que lo delate.
 *
 * Guard de reduce (D15): el sticky en sí no es animación, pero un fondo
 * clavado mientras el texto pasa por delante es movimiento relativo, que es
 * justo lo que reduce pide evitar. En static la escena aparece una vez,
 * con sus proporciones intactas (conserva su pantalla de alto), y el resto
 * de la sección queda sobre el background-color de ScFeatures, que es
 * exactamente el secondary[1100] del encargo. Mismo criterio y mismo
 * desenlace que el guard de ScJourneySceneWrap.
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
 * ScDarkSceneSlot (grid-column: 1; grid-row: 1 -- el slot, además, se
 * extiende a la fila 2 del hold, ver su docblock arriba) y es quien
 * centra/topa el CONTENIDO (FEATURES_CONTENT_MAX_WIDTH, D8) mientras la
 * escena, en la celda hermana, mide siempre una pantalla exacta. min-height
 * en vez de una altura fija: si el contenido real desborda una pantalla
 * (viewports de portátil, D7), el marco crece con él y arrastra a
 * ScFeatures -- que ya no tiene alto propio -- en vez de recortarlo.
 * z-index: 1: dentro de la sección tiene que ganar la pintura sobre
 * ScDarkSceneSlot, que no declara ninguno (la escalera de página, D11, ya
 * la fija ScFeatures). justify-content: flex-end: el contenido va a la
 * DERECHA (el vacío del fondo está a la derecha en esta composición, al
 * revés que Story/Journey) -- mismo criterio que la sección conservaba antes
 * de esta entrega.
 *
 * align-items: center es precisamente por lo que este marco NO puede
 * ceder su fila al hold con un padding-block-end propio (D3/D4, spec
 * docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md): un
 * padding inferior aquí desplazaría el centro del contenido real MEDIA
 * PANTALLA hacia arriba en vez de solo añadir una zona muda al final -- ver
 * el docblock de ScDarkTail, más abajo, para el porqué completo de la zona
 * de hold.
 *
 * padding-block FLUIDO (D4, encargo 2026-08-04, palanca 1 de la
 * compactación): el min-height de arriba no recorta nada -- si el
 * contenido real no cabe en una pantalla, el marco crece. Lo que sí puede
 * hacerse sin recortar es no GASTAR más relleno vertical del necesario allí
 * donde el presupuesto de una pantalla aprieta.
 *
 * El término fluido va en dvh, NO en vw, y esa elección es el arreglo de
 * un defecto MEDIDO. La primera versión de esta palanca usaba
 * clamp(1.5rem, 6vw, space[8]): mide el eje EQUIVOCADO. La restricción que
 * hay que satisfacer es "el contenido cabe en el ALTO del viewport", y el
 * ancho no dice nada sobre eso -- en un 1280x720, que es el portátil más
 * común del rango, 6vw son 76,8px, por encima del techo de 64px, así que el
 * clamp se quedaba en su máximo y no ahorraba NI UN PÍXEL justo en el
 * viewport donde el marco desbordaba 128px. Solo apretaba en móviles
 * estrechos, que resulta ser donde el ancho es pequeño pero el alto es
 * grande. Con el término en dvh el relleno se encoge cuando la pantalla es
 * BAJA, que es exactamente cuando el presupuesto vertical escasea.
 *
 * Que el techo baje en pantallas altas no le quita aire a nada: este marco
 * es align-items center con min-height de una pantalla, así que en cuanto el
 * contenido cabe holgado el espacio sobrante lo reparte el centrado, no el
 * relleno. El relleno solo llega a verse cuando el contenido roza el borde,
 * que es el caso en el que interesa que sea pequeño.
 *
 * padding-inline NO se hace fluido en dvh como el de bloque: el encargo pide
 * compactar el eje vertical, no el horizontal, y estrechar el ancho del
 * contenido reduciría el ancho disponible para los bullets/CTA sin ganar nada
 * en el eje que sí hay que ganar. Lo que sí cambia el 2026-09-05 es de qué
 * escala lo lee: `inlineSpace[6]` en vez de `space[6]` (ver el docblock de
 * `inlineSpace` en `tokens/space.ts`). No es el mismo eje ni la misma
 * variable: el `clamp()` de bloque responde al ALTO del viewport, y el
 * `min()` de `inlineSpace` responde a que la raíz tipográfica crezca mientras
 * el ancho se queda quieto. Con la raíz por defecto el valor es idéntico —
 * 2rem a cualquier ancho desde 320px—, así que la composición medida en esta
 * entrega no se mueve ni un píxel.
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
  padding-block: clamp(
    ${({ theme }) => theme.data.space[4]},
    3.5dvh,
    ${({ theme }) => theme.data.space[8]}
  );
  padding-inline: ${({ theme }) => theme.data.inlineSpace[6]};
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

/*
 * Zona de "hold" al final de la sección oscura (D3/D4/D5, spec
 * docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md):
 * tercer hijo de grid, grid-column: 1; grid-row: 2, que reserva una
 * pantalla de recorrido de scroll SIN contenido real -- durante ese tramo
 * solo se ve la escena pegada (ScDarkSceneSlot, arriba, que por eso abarca
 * también esta fila), mientras Contacto sube desde el borde inferior del
 * viewport y la cubre. Altura leída de FEATURES_TAIL_HOLD
 * (features.layers.ts, ver su docblock para la invariante con
 * CONTACT_OVERLAY_RISE y el precedente de JOURNEY_DECK_TAIL_SCREENS).
 * pointer-events: none: es una caja vacía y aria-hidden que no debe
 * interceptar ningún puntero sobre lo que se ve detrás (la escena pegada).
 *
 * Por qué esta zona no se resuelve con padding en vez de un hijo propio:
 * - padding-block-end en ScFeatures NO sirve porque position: sticky
 *   está confinado a su ÁREA DE GRID, no a la caja de padding del elemento
 *   que lo contiene -- con padding en la sección, el área de la fila 1
 *   (donde vive ScDarkSceneSlot hoy) seguiría terminando donde termina el
 *   contenido, y la escena se despegaría UNA PANTALLA ANTES de que Contacto
 *   la cubra: se vería una pantalla de fondo plano (background-color de
 *   ScFeatures) entre el fin de la escena y el principio de Contacto.
 * - padding-block-end en ScDarkFrame TAMPOCO sirve: es
 *   align-items: center (ver su docblock, arriba), así que un padding
 *   inferior desplazaría el centro de su contenido real MEDIA PANTALLA hacia
 *   arriba -- las tres identidades quedarían descentradas en vez de solo
 *   ganar una zona muda al final.
 *
 * Por eso el hold es una CAJA propia que amplía el área del grid sin tocar
 * ninguna de las dos cajas anteriores, y es lo que obliga al slot de la
 * escena a abarcar DOS filas en vez de una (grid-row: 1 / span 2, ver el
 * docblock de ScDarkSceneSlot).
 *
 * Guard de reduce: height: 0, NO display: none. Con display: none el
 * elemento deja de generar caja y el grid pasaría a tener SOLO la fila 1 --
 * el span 2 del slot dejaría de tener una segunda fila que abarcar y la
 * FORMA del grid cambiaría entre modos. Con height: 0 la fila sigue
 * existiendo (mide 0px) y el span 2 del slot sigue siendo una declaración
 * válida en los dos modos. Bajo reduce el hold en sí SOBRA: ninguna
 * sección de la página queda pegada (ScDarkSceneSlot pasa a
 * position: static, ver su guard) y el solape de Contacto se anula
 * (margin-block-start: 0, guard de D5 en la spec de Contacto), así que una
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

/*
 * Velo de contraste de la copia oscura (crítica externa #17, hallazgo de
 * contraste de Features). Receta del hero (ScCopy::before, Hero.tsx, D1 del
 * 2026-09-02): un `::before` del propio bloque de copia, sin nodo nuevo, sin
 * puntero y sin animación.
 *
 * ## El defecto, medido con instrumento propio, no heredado
 *
 * Método (task/lessons.md 2026-09-02 bis, reglas 1 y 2): tinta NOMINAL -- el
 * `color` computado del elemento resuelto por un canvas de 1x1 -- contra la
 * DISTRIBUCIÓN de píxeles bajo la caja de CADA LÍNEA, capturada con el texto
 * en `visibility: hidden` y excluyendo del muestreo las cajas de los adornos
 * FIJOS que se pintan por encima (navbar y botón de volver arriba: su blanco
 * no es fondo de esta sección y fabricaba fallos que no existen). Nada de
 * núcleo de glifo, que a 12-14 px mide antialiasing. Barrido de 15
 * posiciones de scroll a lo largo de la sección, porque la escena hace
 * parallax y la línea peor CAMBIA con la posición.
 *
 * Medido sobre el build de producción de `14fb06e`, Chrome, DPR 1, tema
 * oscuro, líneas con al menos una muestra por debajo de 4,5:1:
 *
 * | viewport  | líneas con fallo | peor caso                          |
 * | --------- | ---------------- | ---------------------------------- |
 * | 390x844   | 84               | «Juega» 100% de sus muestras, 1,00:1|
 * | 768x1024  | 68               | cuerpo de 14 px al 25%             |
 * | 992x800   | 6                | 0,1-0,3% de muestras, mínimo 2,76  |
 * | 1280x800  | 2                | 0,1% de muestras, mínimo 2,61      |
 *
 * El hallazgo de la crítica (dos líneas de 12 px al 20,6% y 11,1%) se queda
 * MUY corto: a 390 px la columna de copia se apoya entera sobre las tres
 * burbujas luminosas de la escena (bombilla, cerebro, mando), y falla el
 * cuerpo, los bullets, los CTA y el título de Gaming. Por debajo de `lg` el
 * marco de contenido ya no tiene a su derecha el vacío sobre el que se
 * compuso esta rama: el texto y el arte ocupan el mismo sitio.
 *
 * A partir de `lg` el defecto se apaga solo (6 y 2 líneas, siempre por
 * debajo del 0,3% de sus muestras: una estrella suelta cruzando el texto de
 * acento, que ya nace con margen fino -- 5,31:1 sobre el void). Por eso el
 * velo es MOBILE-FIRST y se retira en `lg`: el escritorio no se toca, que es
 * la restricción del encargo.
 *
 * ## De dónde sale cada número
 *
 * El TINTE es el void de la propia escena (`FEATURES_ORBITAL_VOID`), no
 * `semantic.bg`. Es la elección que hace el velo invisible donde no hace
 * falta: sobre el vacío de la escena, tapar con su mismo color no cambia ni
 * un valor de canal a cualquier opacidad. Solo se ve donde hay arte
 * brillante, que es exactamente donde tiene que verse.
 *
 * El ALFA se calibró midiendo, no estimando. Escalera completa a 390 px
 * (líneas con fallo, de 84 en el punto de partida): 75% -> 21; 88% -> 3
 * (mínimo 4,13); 90% -> 2 (mínimo 4,43); 92% -> 0. A 768 px el 92% todavía
 * dejaba una línea al 0,6% con mínimo 4,46, así que el valor entregado es
 * 94%: cero muestras bajo 4,5 en los dos anchos, con el arte aún legible
 * como textura detrás del texto (las burbujas se leen como halos apagados,
 * no desaparecen).
 *
 * `FEATURES_COPY_SCRIM_FADE` es a la vez el desborde vertical y la longitud
 * del fundido, para que la zona plena empiece justo en el borde de la caja
 * de la copia y el fundido quede FUERA del texto. El desborde horizontal es
 * mayor porque el borde vertical del velo es recto: cuanto más lejos del
 * texto, menos se lee como una caja.
 */
const FEATURES_COPY_SCRIM_ALPHA = "94%";
const FEATURES_COPY_SCRIM_FADE = "32px";
const FEATURES_COPY_SCRIM_BLEED_INLINE = "40px";

/* Reveal de la rama oscura: mismo mecanismo que ScDarkContent en
   Story.tsx/Journey.tsx. PIERDE su padding (ahora lo lleva ScDarkFrame,
   arriba) y su z-index: 1 (ahora lo lleva el frame, que es quien compite
   por celda de grid con ScDarkSceneSlot) -- este elemento ya no necesita su
   propio contexto de apilamiento. RECUPERA `position: relative`, y solo
   eso, desde el velo de contraste de arriba: un `::before` absoluto necesita
   un bloque contenedor posicionado, y tiene que ser ESTE elemento y no el
   marco para que el velo mida la caja de la copia (que es lo que hay que
   tapar) y no la pantalla entera (que apagaría la escena). Sin z-index
   propio no se crea contexto de apilamiento nuevo: el velo cuelga un
   peldaño por debajo de zIndex.base y sigue por detrás del texto.

   Duración (D7, encargo 2026-08-04): slower (480ms), no slow (320ms) --
   el easing decelerate ya era el correcto aquí; lo que no coincidía con
   ScItem (rama clara de entonces) era la duración. Unificadas las dos a la
   pareja más lenta de la escala, para que las entradas de Features se lean
   igual de "resueltas con calma" en los dos temas.

   Esta unificación quedó INTACTA solo en la rama OSCURA durante un tiempo: la
   reescritura de la cabecera y las tarjetas de la rama CLARA (2026-08-06, D9,
   spec 2026-08-06-story-features-tema-claro-design.md) sustituyó a ScItem
   por ScReveal (arriba) con la duración/easing VERBATIM del mockup nuevo
   (640ms + easing.standard), que dejó de coincidir con slower/
   decelerate -- D1 de la spec nueva prohibía tocar la rama oscura, así que
   ScDarkContent se quedó exactamente como estaba.

   Task 19 (D7, "terminar la unificación") cierra esa divergencia: ScReveal
   (arriba) migra a REVEAL.durationMs/REVEAL.easing/REVEAL.shift
   (@/motion/vocabulary), y ScDarkContent pasa a leer los MISMOS tres
   campos del token en vez de repetir theme.data.motion.duration.slower/
   easing.decelerate + un 16px suelto -- mismo valor numérico que ya
   tenía (480ms/16px), pero ahora decelerate se sustituye por
   REVEAL.easing (la curva propia de REVEAL, punto 3 del brief) y la lectura
   es del token compartido, no de tokens de tema sueltos. Las dos ramas de
   Features vuelven a compartir gramática de entrada. */
const ScDarkContent = styled.div`
  position: relative;
  max-width: ${({ theme }) => theme.data.grid.prose};
  width: 100%;
  opacity: 0;
  transform: translateY(${REVEAL.shift});
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};

  /* Velo de contraste: el porqué completo, la medición del defecto y la
     calibración del alfa están en el docblock de
     FEATURES_COPY_SCRIM_ALPHA, arriba. Aquí solo vive la declaración.
     No declara canal propio a propósito: hereda el fundido de entrada de
     su contenedor, como el velo del hero. */
  &::before {
    content: "";
    position: absolute;
    inset: calc(-1 * ${FEATURES_COPY_SCRIM_FADE})
      calc(-1 * ${FEATURES_COPY_SCRIM_BLEED_INLINE});
    z-index: calc(${({ theme }) => theme.data.zIndex.base} - 1);
    pointer-events: none;
    background-image: linear-gradient(
      to bottom,
      transparent 0%,
      ${`color-mix(in oklch, ${FEATURES_ORBITAL_VOID} ${FEATURES_COPY_SCRIM_ALPHA}, transparent)`}
        ${FEATURES_COPY_SCRIM_FADE},
      ${`color-mix(in oklch, ${FEATURES_ORBITAL_VOID} ${FEATURES_COPY_SCRIM_ALPHA}, transparent)`}
        calc(100% - ${FEATURES_COPY_SCRIM_FADE}),
      transparent 100%
    );

    /* Con el arte fuera, un velo del color del void solo se interpondría
       entre los colores que fuerza el sistema. Mismo gesto que el velo del
       hero. */
    @media (forced-colors: active) {
      display: none;
    }

    /* Mobile-first: a partir de lg el marco recupera el vacío de la escena
       a su derecha y la medición da 0,1-0,3% de muestras bajo umbral, la
       misma cifra que el escritorio ya tenía. El encargo prohíbe tocarlo,
       así que el velo se retira aquí. */
    @media ${({ theme }) => theme.data.breakPoint.lg} {
      display: none;
    }
  }

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

/*
 * El <h2> REAL de la rama oscura (Task 15, unificación de contenido,
 * 2026-08-11). Hasta aquí la rama oscura no tenía la tesis de la sección
 * ("Tres formas de seguir avanzando.") ni el párrafo de entrada: su único
 * encabezado era el kicker genérico. Las dos ramas dicen ahora lo mismo; lo
 * que sigue siendo identidad de tema es el VEHÍCULO (tarjetas en claro,
 * bloques sobre la escena en oscuro) y la escala tipográfica.
 *
 * font-size fluido: la restricción que hay que satisfacer aquí es "contenido
 * + relleno <= ALTO del viewport" -- esta rama compone sobre un slot pegado de
 * una pantalla exacta --, así que el término fluido va en dvh. El min(...vw,
 * ...dvh) deja que gane el eje más apretado en cada caso: un móvil estrecho
 * y alto se rige por su ancho, un portátil ancho y bajo por su alto. Sin el
 * término en vw, un 375x812 se llevaría el título a un tamaño que su ancho
 * no puede sostener; sin el término en dvh, un 1280x720 lo dejaría clavado
 * en su techo justo donde el presupuesto vertical aprieta (el defecto medido
 * que documenta ScDarkFrame).
 *
 * DIVERGENCIA ABIERTA, DECLARADA: el TITULAR DE TARJETA (h3) dejó de ser
 * fluido el 2026-09-04 y lee hoy su token sin sobreescritura en las dos ramas
 * -- ver la lápida de `ScDarkFeatureTitle`, más abajo, con la medición. Este
 * h2 y el párrafo de entrada (`ScDarkIntro`) siguen siendo fluidos SOLO en
 * oscuro, con el mismo desajuste de escala que aquel: medido en Chrome sobre
 * el build de `ef62b26`, el h2 de esta sección resuelve a 32 px en claro en
 * todos los viewports y a 24 px (390x844), 28,8 px (1280x800) o 32 px
 * (1440x900) en oscuro. La decisión del dueño de esta entrega nombra el
 * titular de TARJETA, así que estos dos no se tocan aquí; queda anotado para
 * que la próxima ronda lo decida a la vista de la misma medición, no por
 * omisión.
 *
 * NO se toca type.scale.h2: ese token es GLOBAL y lo consume también el h2
 * de la rama CLARA de esta misma sección. Se sobreescribe por composición
 * (styled(Typography)), mismo mecanismo que ScDarkBody. El techo se lee del
 * propio token en vez de repetir el literal, para que no pueda
 * desincronizarse.
 */
const ScDarkTitle = styled(Typography)`
  font-size: clamp(
    1.5rem,
    min(5vw, 3.6dvh),
    ${({ theme }) => theme.data.type.scale.h2.size}
  );
`;

/*
 * Párrafo de entrada de la rama oscura: MISMO texto y MISMO rol de color que
 * el de la clara (extiende ScIntro, no lo duplica), con el mismo font-size
 * fluido y la misma desigualdad que ScDarkTitle, arriba -- suelo en
 * bodySm (14px, el tamaño que ya usa el cuerpo de cada identidad oscura,
 * ScDarkBody) y techo en body (16px, el de la rama clara).
 */
const ScDarkIntro = styled(ScIntro)`
  font-size: clamp(
    ${({ theme }) => theme.data.type.scale.bodySm.size},
    min(2.6vw, 2.1dvh),
    ${({ theme }) => theme.data.type.scale.body.size}
  );
`;

/* Las 3 identidades como bloques verticales (mismo patrón de lista que
   Story/Journey), no como tarjetas con patrón/fondo propio: esos son
   literales de una tarjeta con fondo pastel (D10), sin sentido superpuestos
   a una imagen.

   margin-block-start FLUIDO (D4, encargo 2026-08-04, palanca 2): separa el
   bloque de identidades del kicker de la cabecera. Mismo criterio y mismo
   arreglo de eje que el padding-block de ScDarkFrame (ver su docblock: el
   término fluido va en dvh porque la restricción es el ALTO del viewport,
   no su ancho) -- clamp entre 0.75rem (12px, suelo) y space[6] (32px,
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

/* padding-block FLUIDO (D4, palanca 2): separación entre las tres
   identidades. Clamp entre space[3] (12px, suelo) y space[5] (24px, techo)
   -- mismo criterio, mismas unidades y mismos motivos que ScDarkFrame/
   ScDarkFeatures, arriba. Son CINCO bordes de relleno en total (el primer
   bloque no lleva el superior), así que cada píxel que se ahorra aquí cuenta
   cinco veces en el presupuesto vertical de la sección. */
/* DIVERGENCIA DECLARADA del token de borde, y su motivo medido (QA §6
   bloqueante 2, 2026-08-14). Estas líneas usaban semantic.border, que en la
   rama oscura resuelve a neutral[800] y da **2,963:1** contra el fondo de
   la sección — por debajo del 3:1 que WCAG 1.4.11 pide a un elemento cuyo
   contorno hay que ver para separar una identidad de la siguiente. Medido en
   navegador sobre píxel pintado, no estimado.

   Se sube un escalón AQUÍ y no en el token: semantic.border tiene 17
   consumidores en 11 ficheros (Input, Card, legales y otras tres secciones),
   así que moverlo habría cambiado el sistema entero para arreglar una
   sección. neutral[700] (L 0.53, un escalón más claro que el 800 que el
   token resuelve hoy) cruza el umbral, y su cifra medida está abajo.

   Si algún día el token global sube por su cuenta, esta línea deja de ser
   necesaria y debe volver a semantic.border en vez de quedarse como una
   excepción huérfana. */
const ScDarkFeatureBlock = styled.div`
  padding-block: clamp(
    ${({ theme }) => theme.data.space[3]},
    2.2dvh,
    ${({ theme }) => theme.data.space[5]}
  );
  border-block-start: 1px solid
    ${({ theme }) => theme.data.palette.neutral[700]};

  &:first-child {
    border-block-start: none;
    padding-block-start: 0;
  }
`;

/*
 * AQUÍ VIVIÓ `ScDarkFeatureTitle`, el `styled(Typography)` que daba a los
 * titulares de identidad de la rama OSCURA un `font-size:
 * clamp(1.125rem, min(4vw, 2.6dvh), type.scale.h3.size)` propio (D4, palanca
 * 4 de la compactación vertical del 2026-08-04). Se retira el 2026-09-04
 * (decisión del dueño, paridad de Features entre temas): el titular de tarjeta
 * lee ahora `type.scale.h3` SIN sobreescritura en las dos ramas, es decir, es
 * literalmente el mismo `<Typography variant="h3">` en las dos -- ver el
 * candado «el titular de tarjeta lee el MISMO token en las dos ramas» en
 * Features.test.tsx.
 *
 * ## Qué defecto cerraba esto, y por qué el clamp era el lado equivocado
 *
 * El mismo nivel semántico -- el h3 de una identidad, con la misma copia
 * desde las Tasks 15-16 -- era FIJO en claro y FLUIDO POR ALTURA en oscuro.
 * Medido en Chrome sobre el build de producción de `ef62b26` (DPR 1):
 *
 * | viewport  | claro | oscuro   |
 * | --------- | ----- | -------- |
 * | 390x390   | 24 px | 18 px    |
 * | 1280x720  | 24 px | 18,72 px |
 * | 1440x900  | 24 px | 23,4 px  |
 * | 1440x1440 | 24 px | 24 px    |
 *
 * Un lector que conmute de tema en un portátil ve el mismo titular encoger un
 * 22 %. Eso no es piel de tema: es la escala tipográfica del sistema diciendo
 * dos cosas distintas sobre el mismo nivel.
 *
 * Gana la ley de la rama CLARA, y no por simetría: es la que lee el token sin
 * tocarlo. El argumento que sostenía el clamp -- «el contenido oscuro tiene
 * que caber en una pantalla» -- se comprobó, y NO se sostiene. Altura de
 * `ScDarkContent` frente a la del viewport, con el clamp todavía activo:
 * 957 px en 1280x720 (desborda 237), 937 px en 1366x650 (desborda 287),
 * 1.008 px en 1440x900 (desborda 108), 1.056 px en 390x844 (desborda 212).
 * El contenido YA desbordaba una pantalla en todos ellos, y el marco crece
 * con él por diseño (`min-height`, ver el docblock de `ScDarkFrame`), así que
 * nada se recortaba. Retirar el clamp cuesta entre 3 y 22 px de alto según el
 * viewport (medido: 957→976, 937→959, 1.008→1.011, 1.056→1.078): reduce el
 * desbordamiento en un 8 % de lo que ya desbordaba, a cambio de romper la
 * escala. El presupuesto vertical de esta rama se defiende con las otras tres
 * palancas de D4 -- los tres `padding`/`margin` fluidos, que siguen en pie --,
 * no encogiendo un nivel de encabezado.
 *
 * Lo que NO cambia con esta decisión: el tinte de acento por identidad
 * (ScSpanLearning/ScSpanImagination/ScSpanGaming, más arriba) sigue siendo
 * exclusivo de la rama oscura. Es color, es decir piel de tema -- la parte que
 * DESIGN.md §4 declara que sí ramifica --, y sus tres valores están medidos
 * contra el fondo real de esta rama. La paridad que esta entrega cierra es la
 * de la LEY TIPOGRÁFICA, no la de la paleta.
 */

const ScDarkBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/* El destino compartido de los DOS CTAs de tarjeta (rama clara y oscura):
 * `href` y foco salen del MISMO descriptor para que no puedan divergir --
 * receta exacta del CTA del hero (critica #11, hallazgo B2: los enlaces de
 * la nav mueven el foco al destino desde la ola de la #10, pero los CTAs de
 * seccion a seccion quedaron fuera del cableado). El helper es el de la
 * nav (`focusNavAnchorTarget`): guarda de tabindex existente y
 * `preventScroll` incluidos, cero logica duplicada aqui. */
const FEATURES_CONTACT_ANCHOR: NavItem = {
  key: "contact",
  href: "#contact",
  kind: "section",
};

export function Features(): ReactElement {
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  /*
   * Fix wave E, hallazgo E3 (evaluador de navegador real, 2026-08-13):
   * threshold: 0 EXPLÍCITO, no el 0.2 por defecto de useReveal
   * (src/hooks/useReveal.ts). Reproducido en Chrome real
   * (playwright-cli, 1280x720, CPU x6 + caché fría Y también sin
   * throttling): bajando a scrollY=2900 en pasos de 500px, #features-title
   * ya está DENTRO del viewport (vpTop=419 de 720) pero ScRevealGroup
   * (más abajo, el envoltorio que agrupa cabecera + rejilla bajo un ÚNICO
   * useReveal, D9) sigue en data-revealed="false" -- opacity 0 en TODOS
   * sus hijos ScReveal (cabecera Y las tres tarjetas a la vez), sin
   * recuperarse solo aunque pasen varios segundos quieto.
   *
   * DIAGNÓSTICO (medido, no supuesto -- getBoundingClientRect() real de
   * ScRevealGroup en ese instante, sin throttle, tras networkidle):
   * rect.height = 1336px (cabecera + rejilla de 3 tarjetas con imagen,
   * bento de 2 filas) -- casi el DOBLE del viewport (720px). Con el
   * threshold: 0.2 por defecto, el observer exige que el 20% del ÁREA DEL
   * PROPIO ELEMENTO esté visible -- sobre un elemento así de alto eso son
   * ~267px de ALTURA visible, que solo se alcanzan cuando el borde superior
   * del grupo ya ha subido a rect.top ≈ 366px (más de MEDIA pantalla). En
   * el rango rect.top ∈ [366, 720] -- una banda de ~354px, la que mide
   * getBoundingClientRect() en la reproducción real -- el grupo YA está
   * entrando en el viewport (su cabecera y su primera tarjeta son
   * geométricamente visibles) pero el observer TODAVÍA no ha disparado:
   * medido exacto, ratio = 0.19825, apenas por DEBAJO de 0.2 -- no es una
   * carrera asíncrona (confirmado sin CPU throttle, tras networkidle, con
   * varios cientos de ms de margen), es que el UMBRAL DE ÁREA no escala con
   * la ALTURA del objetivo: cuanto más alto es el envoltorio observado, más
   * scroll hace falta para satisfacer el mismo 20%, y ScRevealGroup era
   * el objetivo más alto que se había medido entonces.
   * Un usuario real que se detiene a leer justo cuando el título ya es
   * visible (el gesto más natural del mundo) puede quedarse parado DENTRO de
   * esa banda indefinidamente -- nada la vuelve a comprobar sin un scroll/
   * resize nuevo.
   *
   * ARREGLO (causa raíz -- desacopla el disparo de la ALTURA del objetivo,
   * no un setTimeout que esconda el síntoma): threshold: 0 hace que
   * "intersecta" signifique "CUALQUIER solape con la ventana de
   * intersección" (la misma semántica que ya usa el IntersectionObserver
   * de useSectionProgress, sin threshold expreso = 0 por defecto), así que
   * el disparo deja de depender del alto total del envoltorio -- dispara en
   * cuanto el borde superior de ScRevealGroup empieza a asomar por el
   * rootMargin ajustado, sin importar cuántas tarjetas cuelguen debajo.
   * Verificado con el mismo guion de reproducción tras el cambio: revela en
   * cuanto la cabecera asoma, muy por debajo de scrollY=2900, sin dejar
   * ninguna banda ciega.
   *
   * LA ÚLTIMA FRASE DE ESTE DOCBLOCK ERA FALSA, y se corrige aquí (ola U,
   * 2026-09-08). Decía que el defecto SOLO afectaba a Features y que no había
   * evidencia de que ningún otro consumidor tuviera un objetivo comparable de
   * alto. El censo de la crítica externa #21, medido sobre el build servido en
   * dos temas, cinco anchos y dos raíces de fuente, dice lo contrario: la
   * tarjeta de Contacto mide 944 px y la rejilla de Story 938 a 1440x900 --
   * contra los 1.095 de este envoltorio --, y a 390x844 con la raíz a 32 la
   * rejilla de Story llega a 6.073 px, MÁS que los 5.383 de aquí, con el ratio
   * máximo posible (0,1223) por debajo del umbral: no se revelaba nunca. Lo
   * que aquí se arregló para una sección era un defecto de todas.
   *
   * POR ESO EL ARREGLO YA NO VIVE AQUÍ: desde esa misma ola, `useReveal` baja
   * el umbral por su cuenta en cuanto cumplirlo costaría más de un 1 % de la
   * ventana de retraso (`RETRASO_MAXIMO_DEL_UMBRAL`). ESTE `threshold: 0`
   * EXPRESO SE QUEDA, y la decisión es medida, no inercia: sin él este
   * envoltorio pasaría a pedir ese 1 % --9 px de scroll a 900 px de ventana--
   * en vez de 0, o sea revelaría 9 px más tarde que hoy. Es un cambio pequeño,
   * pero es un cambio, y la regla del encargo era quitarlo solo si no cambiaba
   * nada. Lo que este literal significa ahora es "esta pieza no admite ni ese
   * 1 %", no "esta pieza es la única alta".
   */
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>({
    threshold: 0,
  });
  /*
   * Progreso de scroll de la rama CLARA (D7/D1, encargo 2026-08-04):
   * useSectionProgress exige un ref ESTABLE (useRef, nunca creado inline
   * en el render -- task/lessons.md 2026-07-31) y se llama de forma
   * INCONDICIONAL, antes de los dos return de tema -- las reglas de hooks
   * de React lo exigen. El ref solo se ATA al <ScFeatures> de la rama
   * clara, más abajo; en oscuro featuresRef.current se queda en null (el
   * hook ya contempla ese caso, ver su JSDoc) y no hay observer que sostener
   * -- la rama oscura ya tiene su propio movimiento ligado a scroll vía
   * useSceneParallax, dentro de FeaturesCelestialOrbital, fuera del
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
        {/* OLA M (2026-09-03): la escena oscura de esta seccion se ANUNCIA como
              una sola imagen con nombre, igual que las de Story y Journey. El defecto que la
              critica externa #16 midio es de PARIDAD entre temas: en claro la
              seccion ensena una figura con texto alternativo y en oscuro no
              anunciaba nada de su arte, asi que el mismo contenido se contaba
              distinto segun el tema. Se nombra AQUI, en el consumidor, y no
              dentro de la escena: sus capas conservan su alt="" y su
              aria-hidden, que es lo correcto porque ninguna capa suelta
              significa nada por si misma -- lo que significa es la SUMA, y esa
              suma solo la conoce quien la coloca en Caracteristicas. role="img" mas
              aria-label convierte este envoltorio en una hoja del arbol de
              accesibilidad: se anuncia UNA imagen con UN nombre y el subarbol
              aria-hidden de dentro no se anuncia por separado. */}
        <ScDarkSceneSlot
          role="img"
          aria-label={t("Home.features.sceneAlt")}
        >
          <FeaturesCelestialOrbital />
        </ScDarkSceneSlot>
        <ScDarkFrame>
          <ScDarkContent
            ref={revealRef}
            data-revealed={revealed}
            /* Gancho de test del bloque de copia: el velo de contraste vive
               en su ::before y jsdom solo puede aseverar la regla si sabe
               qué elemento la lleva. Mismo gesto que hero-copy. */
            data-testid="features-dark-copy"
          >
            {/* Cabecera IDÉNTICA a la de la rama clara (Task 15, D-C/D-E,
                2026-08-11): kicker con voz + h2 con la tesis + párrafo de
                entrada, en ese orden y con las MISMAS claves i18n. Hasta esta
                tarea la rama oscura solo tenía el kicker, ascendido a h2 a
                falta de otro encabezado -- un contenido distinto bajo la
                misma URL. Lo que sigue ramificando por tema es la escala
                (ScDarkTitle/ScDarkIntro, fluidas para caber en la
                pantalla que esta rama compone) y el arte, nunca el texto. */}
            <ScDarkHeader>
              <Kicker>{t("Home.features.kicker")}</Kicker>
              <ScDarkTitle
                variant="h2"
                id="features-title"
              >
                {t("Home.features.title")}
              </ScDarkTitle>
              <ScDarkIntro variant="body">
                {t("Home.features.intro")}
              </ScDarkIntro>
            </ScDarkHeader>

            <ScDarkFeatures>
              {FEATURE_KEYS.map((key) => (
                <ScDarkFeatureBlock key={key}>
                  {/* MISMO elemento y MISMOS props que el titular de tarjeta
                      de la rama clara (más abajo, en el return claro), sin
                      envoltorio propio: la escala del nivel 3 la fija
                      type.scale.h3 y nadie la reescribe aquí. La lápida de
                      `ScDarkFeatureTitle`, más arriba en este fichero, tiene la
                      medición completa de por qué se retiró el clamp. */}
                  <Typography
                    variant="h3"
                    id={`feature-${key}-title`}
                    /* Destino de foco de los tres enlaces de «Descubre»
                       (crítica externa #8, punto 3). MISMO tratamiento en las
                       dos ramas aunque el defecto medido sea de la clara --
                       las tarjetas apiladas de la rama oscura sí se
                       distinguen por scroll, pero el anuncio del titular al
                       llegar es igual de valioso para un lector de pantalla,
                       y un `id` de ancla que es focalizable en una rama y no
                       en la otra sería justo la clase de divergencia que la
                       regla 41 pide atar. Ver `navAnchorFocus.ts`. */
                    tabIndex={-1}
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
                    href={FEATURES_CONTACT_ANCHOR.href}
                    onClick={() =>
                      focusNavAnchorTarget(FEATURES_CONTACT_ANCHOR)
                    }
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
          ScRevealGroup/ScReveal, arriba. Task 15 (2026-08-11): la
          cabecera vuelve a abrir con un kicker, pero ya NO es el eyebrow
          genérico que retiró la Task 11 (kicker + barra decorativa): es el
          kicker con voz de la decisión D-E, sin barra, y se muestra en las
          DOS ramas -- ver el docblock de ScKicker, arriba. */}
      <ScRevealGroup
        ref={revealRef}
        data-revealed={revealed}
      >
        <ScHeader>
          <ScReveal
            $delayMs={FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}
            data-reveal-delay={FEATURES_LIGHT_REVEAL_DELAYS_MS[0]}
          >
            <Kicker>{t("Home.features.kicker")}</Kicker>
          </ScReveal>

          <ScReveal
            $delayMs={FEATURES_LIGHT_REVEAL_DELAYS_MS[1]}
            data-reveal-delay={FEATURES_LIGHT_REVEAL_DELAYS_MS[1]}
          >
            <Typography
              variant="h2"
              id="features-title"
            >
              {t("Home.features.title")}
            </Typography>
          </ScReveal>

          <ScReveal
            $delayMs={FEATURES_LIGHT_REVEAL_DELAYS_MS[2]}
            data-reveal-delay={FEATURES_LIGHT_REVEAL_DELAYS_MS[2]}
          >
            <ScIntro variant="body">{t("Home.features.intro")}</ScIntro>
          </ScReveal>
        </ScHeader>

        <ScGrid>
          {FEATURE_KEYS.map((key, index) => {
            const basename = FEATURE_FIGURE_BASENAME[key];
            const delayMs = FEATURES_LIGHT_REVEAL_DELAYS_MS[3 + index];

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
                        /* Destino de foco de los tres enlaces de «Descubre»
                           (crítica externa #8, punto 3): EN ESTA RAMA las
                           tarjetas están una al lado de otra, así que
                           `feature-imagination-title` y `feature-gaming-title`
                           resuelven al mismo píxel de scroll (4354, medido) y
                           el desplazamiento no distingue a cuál se ha llegado.
                           El foco sí. Ver `navAnchorFocus.ts` para el
                           mecanismo completo. */
                        tabIndex={-1}
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
                        href={FEATURES_CONTACT_ANCHOR.href}
                        onClick={() =>
                          focusNavAnchorTarget(FEATURES_CONTACT_ANCHOR)
                        }
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
