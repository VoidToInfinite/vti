"use client";

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { Field, Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { AMBIENT, PRESS, REVEAL } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { EMAIL_ADDRESS, links } from "@/config/links";
import { ContactCosmicGuardian } from "@/components/scenes/contactCosmicGuardian/ContactCosmicGuardian";
import { CONTACT_GUARDIAN_VOID } from "@/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers";
import { SectionBeam } from "@/components/scenes/sectionBeam/SectionBeam";
import {
  CONTACT_CARD_BG_DARK,
  CONTACT_CARD_BORDER,
  CONTACT_CARD_BORDER_DARK,
  CONTACT_CARD_GRADIENT,
  CONTACT_CONTENT_MAX_WIDTH,
  CONTACT_CONTENT_PAIR_MAX,
  CONTACT_CONTENT_PAIR_MAX_VW,
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
  CONTACT_PANEL_BG_LIGHT,
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
  ctaGradient,
  gradientShift,
} from "@/components/layout/Brand/BrandName";

/*
 * Última sección. Rama CLARA (spec §7.4, mockup `#contact` L212-238):
 * tarjeta con degradado pastel, contenido a la izquierda, figura que saluda
 * con anillos concéntricos decorativos a la derecha en ≥ md. `Socials` NO
 * vive aquí (spec §7.5: se muda al footer, que la reutiliza tal cual con los
 * enlaces reales del repo).
 *
 * QUÉ HAY DENTRO DE ESA TARJETA, y por qué cambió (Task 16, unificación de
 * contenido parte 2, 2026-08-11): h2 + cuerpo + el MISMO formulario y las
 * MISMAS dos tarjetas de salida (Discord, GitHub) que la rama oscura --
 * `contactChannels` en `Contact()`, un único árbol de JSX que las dos ramas
 * montan tal cual. Hasta hoy esta rama pintaba en su lugar un chip de correo
 * + un CTA a `mailto:`, y el chip era el hallazgo #1 de una crítica
 * independiente (2026-08-11): un `<div>` con borde, icono de sobre y la
 * dirección dentro, colocado exactamente donde va un campo de captura y
 * junto a un botón relleno -- se leía como formulario y no lo era (sin
 * cursor de texto, sin foco, sin feedback), en el punto de conversión del
 * sitio. No era "la rama clara omite el formulario": era una imitación de
 * uno. El chip se retira entero; el CTA se retira con él porque el botón de
 * envío del formulario abre el MISMO `mailto:` (una salida duplicada al
 * mismo destino, presente en un solo tema, es contenido redundante -- mismo
 * criterio de la Task 15 al retirar una etiqueta que repetía su propio
 * título).
 *
 * Objetivo 1/2 (encargo 2026-08-04): centrado vertical (ver `ScContact`, más
 * abajo -- `flex-direction: column`, NO `row` el defecto de `flex`: con un
 * único hijo, `ScCard`, la dirección columna deja el eje cruzado horizontal
 * con `align-items` en su valor por defecto `stretch`, que es lo que
 * conserva el ancho completo que la tarjeta ya tenía como bloque normal; con
 * `row` la tarjeta, sin `flex-grow`, dejaría de estirarse al ancho del
 * contenedor -- una regresión de layout, no solo de movimiento) y un
 * parallax sutil de la figura/anillos ligado a `--contact-progress`
 * (`useSectionProgress`, ver `ScFigureWrap`/`ScRings` y `Contact()`) -- hasta
 * aquella entrega no tenía ni un movimiento ligado a scroll. El
 * `min-height` que acompañaba a ese centrado vale `50dvh` y NO `100dvh`
 * (este docblock afirmó `100dvh` durante tres días: ver el comentario del
 * propio `min-height` en `ScContact` para la historia y la medición que
 * cierra la discrepancia).
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

/**
 * Medida máxima de la columna de copia + canales, LA MISMA en las dos ramas
 * (Task 16, 2026-08-11). Era un literal `440px` dentro de `ScDarkCopy`
 * cuando solo una rama montaba el formulario; al montarlo también la clara,
 * el mismo número pasa a gobernar dos piezas y deja de poder vivir escrito a
 * mano en una de ellas (regla 13 de RULES.md: un valor idéntico repetido en
 * dos sitios es una constante, no dos literales; aquí las dos piezas viven
 * en el MISMO fichero, así que la constante local basta -- no hace falta
 * subirla a los tokens de tema).
 *
 * No entra en `contact.layers.ts`: ese fichero documenta en su cabecera que
 * solo contiene arte VERBATIM del mockup, y este tope es una decisión de
 * layout de esta entrega, igual que las dos amplitudes de parallax de
 * arriba.
 */
const CONTACT_COPY_MAX = "440px";

const ScContact = styled.section<{ $fullBleed: boolean }>`
  /* WCAG 2.1 SC 1.4.4 (critica externa #13), mismo criterio y mismo motivo que
     ScStory: overflow-wrap se hereda, asi que una declaracion en la raiz de la
     seccion cubre su texto entero en las dos ramas. */
  overflow-wrap: break-word;

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
          /* min-height 50dvh, NO 100dvh. Discrepancia resuelta en la Task 16
             (2026-08-11) MIDIENDO en navegador real (build de produccion
             servido, tema claro, seccion #contact):

               viewport   min-height 50dvh   alto real de la seccion
               1280x600        300px                 754px
               1280x900        450px                 754px
               1280x1400       700px                 754px

             La seccion mide 754px en los tres (tarjeta 562 + 96 de relleno
             arriba y abajo), asi que el 50dvh no llega a atarla NUNCA: quien
             decide la altura es el contenido. Forzando 100dvh en el mismo
             navegador y viewport (1280x1400) la seccion pasa a 1400px con
             419px de hueco vacio por arriba y otros 419 por abajo -- una
             banda muerta alrededor de la tarjeta, no un centrado.

             El valor lo cambio el dueno a mano el 2026-08-08 (commit 7a2d2ac,
             "ajustes visuales del usuario") y quedo pendiente de decidir; el
             docblock del componente siguio diciendo 100dvh tres dias. Se
             confirma el codigo y se corrige el texto, que es lo que estaba
             mal. flex-direction: column,
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
 * QUÉ RECORTA ESE `overflow`, medido (Task 16, 2026-08-11): un detector
 * automático del gate F2 reportó esta tarjeta como el ÚNICO recorte de texto
 * real de la página -- `scrollHeight` 422 contra `clientHeight` 364 a
 * 1280×900, 58px atribuidos a "h2 + párrafo". Reproducido en navegador y
 * NO es texto:
 *
 * - 364 = los 300px de `min-height` de `ScFigureWrap` + los 32px de relleno
 *   de cada lado. El contenido de texto de la columna izquierda medía 160px
 *   (h2 en 103-140, párrafo en 140-191, todos DENTRO de la caja de contenido
 *   32-332). Ni un glifo fuera.
 * - 422 = el borde inferior de `ScRingHalo`, el disco de 480px del arte
 *   (423 exactos), medido ANTES de que cargara la figura (`loading="lazy"`);
 *   con la figura ya cargada el `scrollHeight` sube a 533, que es su propio
 *   borde inferior (560px de alto arrancando en -26). Los dos son arte que
 *   el mockup recorta a propósito.
 * - El detector midió el contenedor que TAMBIÉN lleva el texto y le atribuyó
 *   el desbordamiento del arte. La cifra era correcta; la lectura, no.
 *
 * Tras montar el formulario en esta rama (Task 16) la tarjeta crece a
 * `clientHeight` 560 con `scrollHeight` 567 a 1280×720/900: los 7px que
 * sobran son `ScRings`, desplazado por su propio parallax de scroll. El
 * texto más bajo termina en 514, catorce píxeles por encima del borde
 * interior.
 *
 * CANDADO (`Contact.test.tsx`, describe "Task 16 ... recorte"): jsdom no
 * hace layout, así que no puede comparar alturas -- lo que sí puede atar es
 * la condición que haría posible un recorte de texto de verdad. La tarjeta
 * no declara `height` ni `max-height` (crece con su contenido) y la columna
 * de texto (`ScLeft`) no declara ningún `overflow` propio: con esas dos, el
 * único recorte posible es el del arte que desborda a propósito.
 *
 * Duración/easing (D7, encargo 2026-08-04): `slower` + `decelerate`, no
 * `slow` + `emphasized` -- mismo criterio de unificación que `ScItem`/
 * `ScDarkContent` en `Features.tsx`: las entradas de las secciones claras
 * pasan a la pareja más lenta de la escala, para que se lean "resueltas con
 * calma" en vez de "puntuales".
 *
 * Migrado a `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift` (fix wave D,
 * hallazgo D3, revisión final de rama, 2026-08-12): el `translateY(16px)` de
 * este bloque ya coincidía EXACTO con `REVEAL.shift`, y `slower`/480ms con
 * `REVEAL.durationMs` -- lo único que divergía era la curva
 * (`motion.easing.decelerate` suelto, no la propia de `REVEAL`, que Task 19
 * ya había migrado en Story.tsx/Features.tsx). Migración de fuente pura,
 * mismos tres valores exactos, cero cambio de comportamiento.
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
  /* minmax(0, 1fr), NO 1fr (WCAG 2.1 SC 1.4.4, critica externa #13): 1fr es
     minmax(auto, 1fr) y ese auto vale el min-content de la columna, que con la
     raiz al 200% medía 414px dentro de una caja de 166px. Aqui ademas el
     overflow: hidden de arriba lo convertia en perdida DEFINITIVA de texto, sin
     siquiera el clip del documento de por medio. Mismo criterio que ScContact,
     que ya declara la pista asi. */
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  border: 1px solid ${CONTACT_CARD_BORDER};
  background: ${CONTACT_CARD_GRADIENT};
  padding: ${({ theme }) => theme.data.space[6]};

  opacity: 0;
  transform: translateY(${REVEAL.shift});
  /* Duracion/easing: ver el docblock de arriba. */
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};

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
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
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

   Sin equilibrado de linea (critica externa #14, 2026-09-02, decision D1
   del dueno): este parrafo es cuerpo acotado por grid.prose, y el token
   promete un RECUENTO REALIZADO sobre corte con bandera derecha. Con
   text-wrap: balance la caja dejaba de ser la restriccion activa (medido
   A/B sobre los mismos nodos: 53,5 caracteres por linea con equilibrado,
   64,5 sin el). Hasta esa ronda este bloque llevaba el override del encargo
   del 2026-08-04 ("todo el texto de cuerpo lleva balance"), que ganaba la
   cascada a Typography; se retira junto con el de Typography para que el
   parrafo vuelva a llenar la medida que promete. */
/*
   MEDIDA DE LINEA (critica externa #9, 2026-08-17): este parrafo se media a
   82,6 caracteres por linea en la rama CLARA -- fuera del rango 60-75 que el
   sistema persigue (DESIGN.md 3.4). La causa era la ausencia de tope: dentro
   de ScLeft, la columna izquierda de la tarjeta mide ~660px y el parrafo
   ocupaba los 660 enteros. Se le pone el tope de medida del sistema,
   grid.prose (56ch = ~65 caracteres REALIZADOS; el porque del 56, y no del 52 ni del 65, vive
   en el docblock del propio token, grid.ts).

   Vale para las DOS ramas porque es el MISMO styled: en la rama oscura el
   parrafo vive dentro de ScDarkCopy, ya topado a CONTACT_COPY_MAX (440px),
   asi que el tope nuevo no cambia nada ahi -- lo que hace es cerrar la
   divergencia por la que el mismo parrafo se leia a dos medidas distintas
   segun el tema. */
const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/*
 * Ranura de la rama CLARA para el bloque de canales compartido (`ScForm` +
 * las dos `ScCardLink`, ver `contactChannels` en `Contact()`). Task 16,
 * 2026-08-11.
 *
 * AQUI VIVIERON `ScRow`, `ScChip`, `ScChipIcon` y `ScCta`: la fila con el
 * chip de correo (un `<div>` con borde, icono de sobre y la direccion
 * dentro, colocado donde va un campo de captura -- hallazgo #1 de la
 * critica independiente del 2026-08-11) y el ancla a `mailto:` que lo
 * acompanaba. Los cuatro se retiran enteros: el chip porque simulaba un
 * campo que no existia, el CTA porque el boton de envio del formulario
 * abre el MISMO `mailto:` y una salida duplicada al mismo destino en una
 * sola rama es divergencia de contenido, no arte. Con ellos se fueron
 * `CONTACT_CTA_HOVER_SHADOW` (sin consumidor) y el nombre
 * `CONTACT_CHIP_BG_LIGHT`, renombrado a `CONTACT_PANEL_BG_LIGHT` porque su
 * valor lo hereda la superficie translucida de los paneles reales
 * (contact.layers.ts).
 *
 * Solo aporta el hueco vertical y la MEDIDA: `margin-block-start` es el que
 * llevaba `ScRow` (space[5], sin cambio de ritmo respecto a lo que habia),
 * y `max-width` es `CONTACT_COPY_MAX` -- el mismo tope que la columna de
 * copia de la rama oscura (`ScDarkCopy`), para que el formulario mida lo
 * mismo en los dos temas en vez de estirarse a los ~660px de la columna
 * izquierda de la tarjeta clara. Nada de fondo/borde propios: los pone cada
 * pieza del bloque compartido, que ya resuelve por rama.
 */
const ScLightChannels = styled.div`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${CONTACT_COPY_MAX};
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
   infinita corre una vez y deja un frame arbitrario, no el último).
   La CURVA de la animación es `motion.easing.standard`, no la palabra clave
   nativa `ease-in-out` que declaraba el mockup — ver el comentario del propio
   `animation` en `ScFigure`, más abajo, para el porqué. */
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

  /* CURVA POR TOKEN, no la palabra clave nativa (critica externa #9,
     2026-08-17; regla 48 de RULES.md): el mockup declaraba ease-in-out a
     secas -- una curva que no sale de src/theme/tokens/motion.ts y que el
     detector de anti-patrones no veia mientras solo vigilaba ease-in suelto.
     El token elegido es standard, cubic-bezier(0.4, 0, 0.2, 1): es la unica
     de las cinco curvas del sistema que arranca y termina suave, que es la
     INTENCION de una flotacion infinita que invierte el sentido en el 50%.
     decelerate y accelerate son curvas de un solo lado (frenan o aceleran,
     no las dos cosas), emphasized frena mucho mas tarde y overshoot rebota
     -- las cuatro cambiarian el caracter del movimiento, no solo su fuente. */
  @media (prefers-reduced-motion: no-preference) {
    animation: ${contactFloat} ${CONTACT_FIGURE_FLOAT_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard} infinite;
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

  /* Misma migracion de curva y mismo criterio que ScFigure, arriba: el pulso
     del halo tambien va y vuelve (0% - 50% - 100%), asi que la curva que
     describe su intencion es la que suaviza los dos extremos. */
  @media (prefers-reduced-motion: no-preference) {
    animation: ${glowPulse} ${CONTACT_TOP_GLOW_PULSE_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard} infinite;
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
 * Fila del contenido oscuro (mockup L55). Nació como fila de DOS columnas
 * -- copia a la izquierda, tarjeta de formulario a la derecha -- y desde el
 * reordenado del 2026-08-04 tiene un único hijo, `ScDarkCopy`, con el
 * formulario ya dentro de él; el `flex-wrap` (sin punto de corte propio: el
 * `flex-basis` del hijo decide cuándo baja) se conserva porque sigue
 * describiendo bien el caso de un solo hijo que se estrecha. PIERDE
 * `max-width: prose` y su `padding`
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
 *
 * Migrado a `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift` (fix wave D,
 * hallazgo D3, revisión final de rama, 2026-08-12): mismo motivo y misma
 * migración de fuente pura que `ScCard`, arriba -- `translateY(16px)` ya
 * coincidía con `REVEAL.shift` y `slower`/480ms con `REVEAL.durationMs`; solo
 * la curva (`decelerate` suelto, no la propia de `REVEAL`) divergía del
 * resto de la página tras Task 19. Mismos tres valores exactos, cero cambio
 * de comportamiento.
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
  transform: translateY(${REVEAL.shift});
  /* Duracion: ver el docblock de arriba. */
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};

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
  /* min-width: 0 (WCAG 2.1 SC 1.4.4, critica externa #13). Un item de flex trae
     min-width: auto, que vale el min-content de su contenido y le impide
     encogerse por debajo de el: con la raiz al 200% este bloque medía 414px
     dentro de un contenedor de 262px y su texto salia del viewport sin scroll
     que lo recuperase (html declara overflow-x: clip, regla 21). El 0 solo
     levanta ese suelo; el flex: 1 1 320px sigue mandando mientras quepa, asi
     que a raiz 16px el ancho resultante no cambia (326px antes y despues).
     Mismo patron que ScItem en Features.tsx, que ya lo declara. */
  min-width: 0;
  max-width: ${CONTACT_COPY_MAX};
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

/**
 * Superficie translúcida de los paneles del bloque de canales
 * (`ScForm`/`ScCardLink`), resuelta POR RAMA (Task 16, 2026-08-11): el
 * bloque es el mismo en los dos temas, pero se apoya sobre fondos opuestos
 * -- la escena casi negra de `ContactCosmicGuardian` en oscuro, el degradado
 * pastel de `ScCard` en claro -- y un blanco al 4-5 % sobre pastel es
 * literalmente invisible.
 *
 * Los tres valores ya existían en `contact.layers.ts` y ninguno se inventa
 * aquí: `CONTACT_FORM_BG`/`CONTACT_CARD_BG_DARK` (blanco translúcido sobre
 * la escena, alfas .04/.05 verbatim del mockup) y `CONTACT_PANEL_BG_LIGHT`
 * (blanco al 82 %, el que hasta hoy pintaba el chip de la rama clara). Mismo
 * mecanismo que `accentColor()` en `Features.tsx`: la bifurcación vive en
 * una función que lee `theme.isLight`, no en un ternario repetido dentro de
 * cada template.
 */
function panelBackground(theme: ThemeDefinition, darkValue: string): string {
  return theme.isLight ? CONTACT_PANEL_BG_LIGHT : darkValue;
}

/**
 * Borde de esos mismos paneles, por rama. En oscuro, los literales del
 * mockup (blanco al 12 %); en claro, `CONTACT_CARD_BORDER` -- el MISMO borde
 * lavanda que ya dibuja el contorno de `ScCard`, para que un panel dentro de
 * la tarjeta y la tarjeta misma no tracen dos líneas distintas. No se usa
 * `semantic.border` (el rol que llevaba el chip retirado): en claro es
 * `neutral[100]`, casi indistinguible del blanco al 82 % del propio panel.
 */
function panelBorder(theme: ThemeDefinition, darkValue: string): string {
  return theme.isLight ? CONTACT_CARD_BORDER : darkValue;
}

/**
 * Acento de las tarjetas de canal (icono de trazo y borde de hover/foco),
 * por rama. `secondary[400]` en oscuro es el valor de siempre; en claro ese
 * paso (L 0.78) sobre un panel casi blanco sería un trazo lavado, así que
 * baja a `secondary[700]` (L 0.53). Medido con `contrastRatio` sobre el
 * panel real (blanco 82 % compuesto sobre las tres paradas de
 * `CONTACT_CARD_GRADIENT`): 5.81:1-5.82:1, por encima de AA de texto normal
 * y muy por encima del 3:1 que WCAG 1.4.11 pide a un elemento gráfico o a
 * un indicador de foco. Cifras en `Contact.test.tsx`, describe "Task 16".
 */
function channelAccent(theme: ThemeDefinition): string {
  return theme.isLight
    ? theme.palette.secondary[700]
    : theme.palette.secondary[400];
}

/**
 * Color de los mensajes de ERROR del formulario, por rama (crítica externa #9,
 * 2026-08-17). Tercer caso de resolución por rama de esta misma sección, misma
 * mecánica y mismo motivo que `channelAccent`, arriba, y que los precedentes
 * de las Tasks 26/33: `palette` es COMPARTIDA por los dos temas, así que un
 * único paso no puede librar AA sobre dos fondos que son polos opuestos de la
 * escala de luminancia.
 *
 * Medido con `relativeLuminance` sobre los fondos REALES de este formulario
 * (`Contact.test.tsx`, describe de la crítica #9):
 *
 * - CLARO — `semantic.error` (`error[700]`) sobre el panel real (blanco al
 *   82 % de `CONTACT_PANEL_BG_LIGHT` compuesto sobre las tres paradas de
 *   `CONTACT_CARD_GRADIENT`): 5.78:1. Pasa AA con margen, no cambia nada.
 * - OSCURO — `semantic.error` (`error[500]`) sobre el panel real
 *   (`CONTACT_FORM_BG`, blanco al 4 %, sobre `CONTACT_GUARDIAN_VOID`):
 *   **3.65:1**, por debajo del 4.5:1 que WCAG pide a texto normal (14px
 *   regular no es "texto grande": eso empieza en 18.66px negrita o 24px).
 *   Defecto PREEXISTENTE — el mensaje ya se pintaba con ese rol cuando lo
 *   montaba `Field` —, medido por primera vez al adoptar aquí el mensaje.
 *   `error[400]` tampoco basta (4.30:1); el primer paso que cruza el umbral
 *   es `error[300]` (0.86 de L), con **6.03:1**.
 *
 * NO se corrige en `src/theme/tokens/semantic.ts` (donde vive la causa raíz:
 * `semanticDark.error = error[500]` falla sobre cualquier fondo casi negro,
 * no solo sobre este) porque esta entrega no puede tocar `theme/` — partición
 * de trabajo en paralelo. Queda declarado como hallazgo de sistema: el mismo
 * rol lo usan `ScMsg` (`Input.tsx`) y cualquier formulario futuro.
 *
 * El BORDE de error de los controles (`ScInput`/`ScTextarea`, selector
 * `&[aria-invalid="true"]`) sigue con `semantic.error` sin tocar: es un
 * elemento gráfico, su umbral es el 3:1 de WCAG 1.4.11, y 3.65:1 lo cumple.
 * Mismo criterio que ya separa `ScCardTitle` de `channelAccent` en este
 * fichero -- lo que porta glifos y lo que solo dibuja no piden lo mismo.
 */
function fieldErrorColor(theme: ThemeDefinition): string {
  return theme.isLight ? theme.semantic.error : theme.palette.error[300];
}

/*
 * Tarjeta de contacto (mockup L63-74, D14): `<a>` real con texto propio (no
 * un `<div>` con `onClick`) -- su nombre accesible sale del título + valor
 * visibles, sin `aria-label`. Fondo/borde VERBATIM del mockup en la rama
 * oscura (`CONTACT_CARD_BG_DARK`/`CONTACT_CARD_BORDER_DARK`, D10/D18 -- no
 * son roles semánticos, literales de esta composición) y resueltos por rama
 * desde la Task 16, que monta estas mismas tarjetas también en claro (ver
 * `panelBackground`/`panelBorder`, arriba). El hover SOLO toca
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
  background: ${({ theme }) =>
    panelBackground(theme.data, CONTACT_CARD_BG_DARK)};
  border: 1px solid
    ${({ theme }) => panelBorder(theme.data, CONTACT_CARD_BORDER_DARK)};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
  transition:
    border-color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:focus-visible {
    border-color: ${({ theme }) => channelAccent(theme.data)};
    transform: translateY(-1px);
  }

  @media ${PRESS.hoverGuard} {
    &:hover {
      /* MISMO acento que :focus-visible, arriba (channelAccent). Se quedó
         fuera de la migración por rama de la Task 16 y lo cazó la revisión:
         hover y foco son la misma afordancia de "esta tarjeta responde", así
         que pintarlos con pasos distintos de la rampa las separa sin motivo
         -- y en la rama CLARA el paso oscuro (secondary[400], L 0.78) queda
         lavado sobre el panel blanco al 82 %: 2.28:1, medido por el test
         "el acento oscuro NO se cuela en la rama clara" de esta misma
         entrega, muy por debajo del 3:1 que WCAG 1.4.11 pide a un borde que
         comunica estado. */
      border-color: ${({ theme }) => channelAccent(theme.data)};
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

/* Icono de trazo de cada tarjeta (mockup L64/72, 24px). GlobalStyles fuerza
   `svg { width: 100% }` para todo el sitio, así que el tamaño se fija por CSS
   y no por atributo -- un atributo `width`/`height` perdería la cascada
   (lección del repo, `task/lessons.md`, 2026-07-26; regla 20 de RULES.md).
   `stroke` resuelve contra el token de tema, no `currentColor`, siguiendo la
   misma vía que `ScCheckIcon` en `Features.tsx`, y por rama desde la Task 16
   (`channelAccent`, arriba). */
const ScCardIcon = styled.svg`
  flex: none;
  width: 24px;
  height: 24px;
  stroke: ${({ theme }) => channelAccent(theme.data)};
`;

/* Título/valor de cada tarjeta (mockup L65): tamaños propios de esta
   composición, fuera de la escala tipográfica (`.9rem`/`.85rem` no
   coinciden con ningún paso de `type.scale`).

   El título es TEXTO, así que su color no puede seguir a `channelAccent`
   sin más: en oscuro conserva su `secondary[300]` de siempre (el paso claro
   que el mockup pide sobre la escena negra) y en claro toma el mismo
   `secondary[700]` del icono, que es el que libra AA sobre el panel
   translúcido (5.81:1, medido -- ver `channelAccent`). Un solo acento para
   los dos roles habría dejado `secondary[300]` (L 0.86) como color de texto
   sobre blanco en la rama clara: 1.3:1, ilegible. */
const ScCardTitle = styled.span`
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.data.isLight
      ? theme.data.palette.secondary[700]
      : theme.data.palette.secondary[300]};
`;

/*
 * `overflow-wrap: anywhere` — arreglo de un REFLOW roto a 320px (WCAG 1.4.10),
 * introducido y cazado el mismo dia (2026-08-14, QA §6 bloqueante 6).
 *
 * Estos valores son cadenas SIN espacios (`discord.gg/CuGhqdG3g3`,
 * `github.com/voidtoinfinite`, `linkedin.com/in/demosquerag`), asi que su
 * `min-content` es su ancho ENTERO: no hay punto por el que el navegador
 * pueda partirlas. `ScCard` es un grid cuya pista `auto` nunca baja de ese
 * `min-content`, asi que la cadena mas larga fija el ancho de toda la
 * tarjeta.
 *
 * Que paso, medido a 320px en claro: la tarjeta de LinkedIn -- la mas larga
 * de las tres -- empujo la pista de 220,9px a 251,4px dentro de una caja de
 * contenido de 206px. La tarjeta desbordaba 45px y la nota de privacidad
 * quedaba 7px FUERA, recortada por su `overflow: hidden`. Aislado retirando
 * solo esa tarjeta: la nota volvia a 19px DENTRO.
 *
 * Por que `anywhere` y no acortar el texto: acortarlo dejaria el problema
 * armado para el siguiente valor largo que alguien añada. `anywhere` es
 * ademas la unica de las dos variantes que afecta al calculo de
 * `min-content` (`break-word` no lo hace), que es exactamente la magnitud
 * que aqui hay que dejar encoger.
 */
const ScCardValue = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  overflow-wrap: anywhere;
`;

/*
 * AQUI VIVIO `ScFormCard`, la envoltura de la columna del formulario (mockup
 * L86, `flex: 1.3 1 220px`). Retirada en la Task 16 (2026-08-11): repartía
 * el ancho flexible de una fila de dos columnas que ya no existe -- desde el
 * reordenado del 2026-08-04 el formulario vive DENTRO de `ScCards`, un flex
 * en COLUMNA, donde ese `flex-basis` dejó de describir un ancho y pasó a ser
 * una altura base de 220px que el contenido desborda. Un envoltorio que ya
 * no reparte nada, montado además ahora en las dos ramas, es ruido: el
 * `<form>` va directo dentro de `ScCards`.
 */

/*
 * Tarjeta del formulario (mockup L87): fondo/borde propios de esta
 * composición (`CONTACT_FORM_BG`/`CONTACT_FORM_BORDER`, D10/D18), no roles
 * semánticos, resueltos por rama desde la Task 16 (`panelBackground`/
 * `panelBorder`, arriba -- el mismo formulario se monta ahora también en la
 * rama clara).
 *
 * CUÁNTOS CAMPOS, y por qué cambió (crítica externa #8, Nielsen,
 * 2026-08-17): DOS -- correo y mensaje. Nació con un único campo (D12
 * descartaba a propósito los Nombre/Asunto/Mensaje del mockup: "es
 * literalmente lo que pide el encargo") y esa decisión dejaba un agujero de
 * producto que la crítica señaló: el `mailto:` se abría con un cuerpo que
 * solo repetía la dirección que el propio visitante acababa de escribir, así
 * que el mensaje -- lo único que el destinatario necesita de verdad -- había
 * que redactarlo desde cero en el cliente de correo, justo el trabajo que un
 * formulario aparenta haber recogido ya. Se añade el campo de mensaje (ver
 * `ScTextarea`, más abajo) y su contenido viaja en el `body=` del `mailto:`
 * (`handleSubmit`). Nombre y Asunto siguen descartados: el nombre lo aporta
 * la propia cuenta desde la que el visitante envía, y el asunto ya lo pone
 * `Home.contact.form.subject`.
 *
 * Hay UN SOLO `<form>` en toda la sección: `contactChannels` es un único
 * árbol de JSX que las dos ramas de tema montan tal cual (Task 16), así que
 * este cambio entra a la vez en claro y en oscuro sin ramificar nada.
 */
const ScForm = styled.form`
  background: ${({ theme }) => panelBackground(theme.data, CONTACT_FORM_BG)};
  border: 1px solid
    ${({ theme }) => panelBorder(theme.data, CONTACT_FORM_BORDER)};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  padding: ${({ theme }) => theme.data.space[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/*
 * Campo de mensaje (crítica externa #8, Nielsen, 2026-08-17). Ver el docblock
 * de `ScForm`, justo arriba, para el porqué del campo; esto documenta sólo el
 * control.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN `src/components/ui/Input/Input.tsx`: su sitio
 * natural es un primitivo `Textarea` hermano de `Input` -- el propio `Field`
 * lo tiene escrito en el docblock de su prop `children` ("típicamente Input,
 * en el futuro Textarea/Select"). Esta entrega NO puede tocar
 * `src/components/ui/` (partición de trabajo en paralelo declarada por el
 * encargo), así que el control nace local y con la deuda DECLARADA, mismo
 * tratamiento que el `ScBackLink` duplicado de `NotFoundContent.tsx`
 * (`RULES.md`, "Deuda conocida"): cuando alguien extraiga el primitivo, este
 * bloque desaparece entero y el JSX pasa a montarlo sin más cambios --
 * `Field` ya le inyecta `id`/`aria-describedby`/`aria-invalid` igual que a
 * `Input`, sin saber cuál de los dos es.
 *
 * CONTRATO VISUAL: los MISMOS tokens exactos que `ScInput` (`Input.tsx`), no
 * una segunda paleta para el mismo formulario -- borde `neutral[600]` en
 * reposo (el único escalón de la rampa que cruza el 3:1 de WCAG 1.4.11 en las
 * DOS ramas: 3,112:1 en claro y 4,060:1 en oscuro, cifras medidas en el
 * docblock de `ScInput`), refuerzo de foco resuelto por rama, el anillo de
 * foco ÚNICO del sitio (el `outline` de `GlobalStyles.tsx`, sin halo propio
 * desde el 2026-09-02), y borde de error derivado del atributo
 * `aria-invalid` que `Field` inyecta -- nunca de un prop propio, para que el
 * estado visual y el accesible no puedan desincronizarse.
 *
 * La altura la fija el atributo `rows` del JSX, no un `height` de CSS: cuatro
 * líneas de la propia tipografía del campo se adaptan solas a cualquier
 * tamaño de fuente, un literal en píxeles no.
 */
const ScTextarea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  border: 1px solid ${({ theme }) => theme.data.palette.neutral[600]};
  background: ${({ theme }) => theme.data.semantic.surface};
  color: ${({ theme }) => theme.data.semantic.text};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  /* Solo vertical: el eje horizontal desbordaria la tarjeta acotada de la
     rama clara y el marco de la oscura, que ya topan su ancho. */
  resize: vertical;
  transition: border-color ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  /* Mismo criterio que ScInput: focus, no focus-visible. Un campo de texto
     necesita marcar su borde SIEMPRE que tiene el foco, venga de teclado o
     de raton -- si solo reaccionara al foco de teclado, un clic dejaria el
     campo activo sin ninguna senal de donde va a aparecer lo que se escriba. */
  &:focus {
    border-color: ${({ theme }) =>
      theme.data.isLight
        ? theme.data.palette.neutral[800]
        : theme.data.palette.neutral[400]};
  }

  /* AQUI VIVIO un &:focus-visible con un halo de 4px por box-shadow contra
     semantic.focus, aditivo al anillo global. Retirado el 2026-09-02
     (critica externa #14, P1 de Craft): el anillo de foco se declara una
     sola vez, en GlobalStyles.tsx, con la geometria de
     src/theme/tokens/focus.ts. El refuerzo de borde de &:focus de arriba,
     que es lo propio de un campo de texto, se queda igual. */

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.data.semantic.error};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/*
 * Mensajes de campo (ayuda y error) del formulario — LOCALES desde la crítica
 * externa #9 (2026-08-17). Hasta hoy los pintaba `Field`
 * (`src/components/ui/Input/Input.tsx`, `ScMsg`) y la crítica midió dos
 * defectos que nacen los dos de ahí:
 *
 * 1. TAMAÑO. `ScMsg` usa `type.scale.caption` (0.75rem = 12px) para el error.
 *    12px es el peldaño de una etiqueta decorativa, no el de un texto que hay
 *    que LEER para poder seguir adelante. Aquí los dos mensajes suben a
 *    `type.scale.bodySm` (0.875rem = 14px), que es el peldaño de "texto de
 *    apoyo legible" que este mismo formulario ya usa en su etiqueta
 *    (`ScLabel`), en la nota de privacidad (`ScPrivacyNote`) y en el panel de
 *    recuperación (`ScFallbackText`) — nada hardcodeado, el token de siempre.
 * 2. AYUDA QUE DESAPARECE. `Field` resuelve `message = error ?? help`: con un
 *    error activo, el texto de ayuda («Se abrirá tu aplicación de correo…»)
 *    deja de existir en el DOM y el `aria-describedby` del campo pasa a
 *    apuntar SOLO al error — el visitante que más ayuda necesita es
 *    justamente el que la pierde. Aquí los dos coexisten y el campo los
 *    referencia a los dos, el error PRIMERO (es el mensaje bloqueante, se
 *    anuncia antes) y la ayuda después.
 *
 * POR QUÉ VIVEN AQUÍ Y NO EN `Field`: los dos arreglos pertenecen al
 * primitivo — beneficiarían a cualquier formulario futuro del sitio — pero
 * esta entrega NO puede tocar `src/components/ui/` (partición de trabajo en
 * paralelo declarada por el encargo). Misma deuda DECLARADA y mismo
 * tratamiento que `ScTextarea`, más arriba, y que el `ScBackLink` duplicado de
 * `NotFoundContent.tsx` (`RULES.md`, "Deuda conocida"): cuando alguien pueda
 * tocar `Field`, esto se retira entero y el JSX vuelve a pasar `help`/`error`
 * como props. Lo que `Field` SIGUE aportando aquí es la etiqueta, el `id` del
 * control y el contrato de un único hijo; lo que deja de aportar son los dos
 * props de mensaje, así que su `mergeDescribedBy` recibe `undefined` y
 * respeta el `aria-describedby` completo que declara el JSX.
 *
 * `role="status"` en el error (no `alert`): lo anuncia sin interrumpir ni
 * robar el foco — MISMO criterio que ya tenía `ScMsg` y que el panel de
 * recuperación (`ScFallbackPanel`). El foco lo mueve `handleSubmit` a
 * propósito y una sola vez, ver su docblock.
 */
const ScFieldMessage = styled.p<{ $error?: boolean }>`
  margin: ${({ theme }) => theme.data.space[2]} 0 0;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme, $error }) =>
    $error ? fieldErrorColor(theme.data) : theme.data.semantic.textSubtle};
`;

/*
 * Salida sin JavaScript (crítica externa #9, Nielsen, 2026-08-17). El
 * evaluador midió con `javaScriptEnabled: false` real que este formulario
 * DESTRUÍA el mensaje en silencio: sin JS no corre `handleSubmit`, así que el
 * botón hacía un envío nativo que recargaba la página y el texto escrito
 * desaparecía sin dejar rastro ni aviso. Y el documento entero no tenía ni un
 * `<noscript>`.
 *
 * Este bloque es la mitad HONESTA del arreglo: dice lo que pasa y da la
 * salida REAL — la dirección de correo, con su `mailto:` de `src/config/links`
 * (`links.email`/`EMAIL_ADDRESS`, nunca escrita a mano aquí).
 *
 * QUÉ CAMBIÓ EN LA CRÍTICA EXTERNA #12 (2026-08-18). Hasta esa fecha la otra
 * mitad eran los `name` de los dos campos: si alguien disparaba el envío
 * nativo de todos modos, lo escrito sobrevivía en la barra de direcciones en
 * vez de evaporarse. El evaluador midió que esa red era, a la vez, una fuga:
 * el correo y el mensaje del visitante acababan en la URL, el historial y los
 * logs del host. Desde la #12 el envío nativo NO OCURRE (`method="dialog"` en
 * el `<form>`, más el botón retirado bajo el mismo `scripting: none` que
 * revela este aviso — ver el docblock de `handleSubmit`), así que este párrafo
 * dejó de ser "el aviso que acompaña a un botón que rompe cosas" y pasó a ser
 * lo ÚNICO que un visitante sin JavaScript tiene delante. Por eso su copia
 * (`Home.contact.form.noscript`) también cambió en esa entrega: describe el
 * estado ("este formulario necesita JavaScript y sin él no funciona") y da la
 * dirección, en vez de prometer un comportamiento del navegador — la anterior
 * decía "el botón no envía nada" mientras el navegador sí enviaba.
 *
 * ═══ LÁPIDA DEL `<noscript>` (crítica externa #11, hallazgo B2, 2026-08-18)
 *
 * AQUÍ VIVIÓ `ScNoscriptNote`, el mismo párrafo dentro de un `<noscript>`
 * literal. La etiqueta se retira entera, y no por preferencia de estilo: React
 * trata los hijos de `<noscript>` como CONTENIDO DE TEXTO
 * (`shouldSetTextContent` devuelve `true` para esa etiqueta), así que los
 * COLAPSA en cualquier re-render de cliente. El repo ya conocía la mitad de
 * eso — que un render de Testing Library deja el `<noscript>` vacío, por lo
 * que su candado se escribía sobre `renderToStaticMarkup` —, pero lo daba por
 * un detalle de test. Medido en navegador real sobre el HTML servido:
 *
 *     noscript.textContent.length = 268   (HTML entregado por el servidor)
 *     conmutar el tema  ->  0             (primer re-render de cliente)
 *     volver al tema anterior  ->  0      (no se recupera NUNCA)
 *
 * Es decir: el aviso solo sobrevivía mientras nadie tocara nada. En cuanto
 * React re-renderizaba una vez, el único texto que le explica a un visitante
 * sin JavaScript que el botón no envía nada quedaba borrado del documento —
 * así que si el JS moría DESPUÉS de esa primera interacción (un chunk que no
 * carga, una excepción, una extensión que lo corta), el formulario volvía
 * exactamente al defecto que la crítica #9 vino a cerrar, y sin aviso.
 *
 * El sustituto es un elemento REAL — este — que ningún re-render puede vaciar,
 * con la visibilidad resuelta en CSS por `@media (scripting: none)`: el MISMO
 * mecanismo ya sancionado en el repo para los reveals (`GlobalStyles.tsx`), el
 * conmutador de tema (`ThemeToggle.tsx`), el selector de idioma y el
 * disparador de la hoja de navegación (`NavSheet.tsx`).
 *
 * OCULTO POR DEFECTO y revelado bajo `scripting: none`, no al revés (misma
 * dirección que la regla de reveals de `GlobalStyles`): el caso normal es que
 * haya JavaScript, y un navegador SIN soporte del feature `scripting`
 * (anterior a Chrome/Edge 120, Firefox 113, Safari 17) ignora el bloque entero
 * y se queda con el comportamiento por defecto. Lo que se compra con esa
 * elección es que nadie con JS funcionando lea jamás un aviso que no le
 * corresponde; lo que se paga, declarado sin adornos, es que en la
 * intersección «navegador anterior a 2023 × JavaScript desactivado» el aviso
 * no aparece. Se acepta porque el `<noscript>` tampoco lo cubría de verdad:
 * era el que se vaciaba solo en los navegadores modernos, que son la inmensa
 * mayoría del tráfico real.
 *
 * CON JavaScript el guard es `display: none` a secas, sin `aria-hidden` ni
 * `hidden` ni `inert`: `display: none` ya lo saca del árbol de accesibilidad
 * Y del orden de tabulación (el enlace de dentro deja de ser enfocable), que
 * es todo lo que hace falta. Un `aria-hidden` fijo, en cambio, sería un error:
 * seguiría puesto cuando el CSS lo revela, y dejaría el aviso invisible
 * justamente para quien usa un lector de pantalla sin JavaScript.
 *
 * `a` con estilo propio: `GlobalStyles` declara `a { color: inherit;
 * text-decoration: none; }` para todo el sitio, así que sin esto el único
 * enlace que un visitante sin JS tiene delante se leería como texto plano.
 */
const ScNoJsNote = styled.p`
  /* Ver el docblock de arriba: oculto por defecto, revelado solo cuando el
     navegador declara que no hay scripting. */
  display: none;
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};

  a {
    color: ${({ theme }) => theme.data.semantic.brandText};
    text-decoration: underline;
    overflow-wrap: anywhere;
  }

  @media (scripting: none) {
    display: block;
  }
`;

/*
 * Task 18 (M5, "privacidad radical a la superficie"): la única prueba
 * sostenible del sitio con el código delante -- cero peticiones a terceros,
 * cero analítica, cero cookies de rastreo -- verificada, no es un eslogan:
 * el detector determinista del gate F2 confirmó cero hostnames externos fuera
 * de destinos de navegación (`links.ts`) y las mediciones CWV registraron
 * solo peticiones al propio origen en los 5 escenarios. Hasta esta tarea el
 * sitio no lo decía en ninguna parte.
 *
 * Vive DENTRO de `contactChannels` (más abajo, `Contact()`), justo debajo del
 * `<ScForm>` y antes de las dos tarjetas de canal -- un único nodo de JSX
 * montado en las DOS ramas, "cerca del formulario" tal como pide el brief sin
 * quedar atrapado dentro del `<form>` (que ya tiene su propio `role="status"`
 * condicional para el panel de fallback).
 *
 * PRECISIÓN DEL TEXTO (lo que distingue esto de un eslogan de marketing): la
 * clave `Home.contact.privacyNote` afirma que NAVEGAR no envía datos a
 * terceros -- eso es lo que el sitio controla y lo único que un export
 * estático sin backend puede prometer. El formulario, en cambio, abre el
 * cliente de correo DEL PROPIO VISITANTE (`handleSubmit`, más abajo,
 * `window.location.assign` a un `mailto:`) -- eso no es una petición del
 * sitio a un tercero, pero tampoco es "tus datos nunca salen de aquí" en
 * general, así que el texto lo aclara en su segunda cláusula en vez de
 * dejarlo implícito. Coherente con `/privacidad` (`Legal.privacy.sections`,
 * apartado "resumen": "navegar por esta web no nos da ningún dato sobre ti...
 * no hay analítica, ni seguimiento" y apartado "contacto": "La web no
 * recibe, no envía y no almacena nada de eso; el envío lo haces tú, desde tu
 * propia cuenta") -- ningún claim de negocio nuevo, solo el mismo hecho ya
 * declarado ahí, repetido en la superficie donde importa.
 *
 * `semantic.textMuted` es el MISMO rol que ya usa `ScBody`/`ScCardValue`
 * sobre estos DOS fondos reales de esta sección, y libra AA con margen
 * medido (`contrastRatioHex`, describe "Task 18" en `Contact.test.tsx`):
 * 5.38:1-5.43:1 sobre las tres paradas de `CONTACT_CARD_GRADIENT` (rama
 * clara) y 13.11:1 sobre `CONTACT_GUARDIAN_VOID` (rama oscura) -- las dos muy
 * por encima del 4.5:1 de AA para texto normal.
 */
const ScPrivacyNote = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/*
 * Botón de envío (mockup L102): `styled(Button)`, no un anchor propio como
 * `ScCta` (arriba) -- este SÍ es un `<button type="submit">` real que
 * dispara `onSubmit`, no una navegación de ancla.
 *
 * `background-image` deja de ser un degradado propio de esta sección y pasa
 * a `ctaGradient` (2026-08-04, `BrandName.tsx`; renombrado desde
 * `heroGradient` en la Task 33, ver más abajo): el mismo degradado animado
 * que ya recorre el título del Hero y el CTA primario, para que el botón
 * principal de la página lea como parte del mismo lenguaje visual en vez de
 * un morado suelto. `gradientShift` (`background-position` 0%→100%) es la
 * animación compartida; solo `transform`/`opacity`/`background-position`
 * se animan, nunca layout.
 *
 * `ctaGradient`, NO `heroGradient` (Task 33, gate F4): hasta esa tarea este
 * botón compartía el degradado LITERAL del título (`heroGradient`), y el
 * evaluador independiente midió que su parada de 65%
 * (`palette.secondary[300]`, la más clara del recorrido) da 1.69:1 contra el
 * texto blanco del botón en tema claro -- muy por debajo de AA (4.5:1),
 * "CTA de conversión" en el hallazgo del gate. `ctaGradient` es el mismo
 * degradado con esa única parada resuelta POR RAMA (`theme.data.isLight`)
 * para pasar AA en los dos temas -- ver su docblock en `BrandName.tsx` para
 * las cifras completas y la demostración de por qué el peor fotograma real
 * está SIEMPRE en un stop, no entre dos.
 *
 * `ctaGradient` se reafirma con el MISMO selector EXACTO que declara
 * `Button.tsx` en su variante `solid`
 * (`&:hover:not(:disabled) { background: color-mix(...) }`, lección
 * `task/lessons.md` 2026-07-26 "`background: valor` en :hover resetea
 * background-image"): esa regla usa la propiedad ABREVIADA `background`,
 * que resetea `background-image` a `none` en cuanto se compone encima.
 * Reafirmar la sub-propiedad aquí, en la MISMA capa aditiva (`styled(Button)`
 * se inyecta DESPUÉS del propio `Button`, orden de inserción de
 * styled-components), gana el empate sin `!important` y sin tocar
 * `Button.tsx`. `ctaGradient` ya declara `background-image` (nunca el
 * shorthand), así que reafirmarlo dos veces no arrastra el mismo bug.
 *
 * `animation` SOLO se declara bajo `no-preference`, con `animation: none`
 * explícito bajo `reduce` -- mismo guard que `ScTopGlow`/`glowPulse`, arriba
 * en este mismo fichero: el colapso global de `GlobalStyles`
 * (`animation-iteration-count: 1 !important`) no detiene una animación
 * infinita, la deja correr un fotograma arbitrario. Bajo `reduce` el botón
 * se queda con el degradado ESTÁTICO de `ctaGradient` (primer fotograma de
 * `background-position`), no con `background-image: none`: a diferencia de
 * `gradientTextClip` en `BrandName.tsx` (que SÍ necesita ese fallback
 * porque el texto está clippeado y quedaría invisible sin fondo), aquí el
 * texto del botón no depende del degradado para ser legible -- perder el
 * movimiento es aceptable, perder el fondo no.
 */
const ScSubmitButton = styled(Button)`
  width: 100%;
  ${ctaGradient}

  /* SIN JavaScript el boton se retira (critica externa #12, Nielsen,
     2026-08-18): sin JS no corre handleSubmit, asi que este boton no puede
     abrir ninguna aplicacion de correo -- ofrecerlo seria un control que
     miente sobre lo que hace. Mismo mecanismo ya sancionado en el repo para
     los controles que dependen de JS: conmutador de tema (ThemeToggle.tsx),
     selector de idioma y disparador de la hoja de navegacion (NavSheet.tsx).
     OJO: esconder el boton NO impide el envio nativo -- Enter en el campo de
     correo lo dispara igual (envio implicito, medido en navegador real). Lo
     que si lo impide es el method=dialog del propio formulario; ver el
     docblock de handleSubmit para la medicion completa. Las dos mitades son
     necesarias y ninguna sustituye a la otra. */
  @media (scripting: none) {
    display: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    /* Task 19 (motion core, punto 7 del brief): 9000ms pasa a
       AMBIENT.floatMs (arroba/motion/vocabulary) -- mismo valor, ahora
       consumidor real del vocabulario (gate F2: AMBIENT tenia 0
       consumidores). Mismo cambio en BrandName.tsx/Hero.tsx sobre este mismo
       gradientShift. */
    animation: ${gradientShift} ${AMBIENT.floatMs}ms linear infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover:not(:disabled) {
    ${ctaGradient}
  }
`;

/* Icono de envío (mockup L102), 16px -- mismo motivo de CSS explícito que
   `ScCardIcon` (regla 20 de RULES.md). */
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

/*
 * Mensaje alternativo de fallo del portapapeles (Task 3, "tres cierres
 * pequeños", 2026-08-10): hasta esta tarea, un `navigator.clipboard`
 * ausente o un `writeText` rechazado fallaban en SILENCIO -- ver el
 * docblock de `handleCopy`, más abajo, para el porqué completo. Este texto
 * NO inventa una vía de copia nueva: señala la dirección que YA está en
 * texto plano seleccionable un poco más arriba (`ScFallbackEmail`) dentro
 * del mismo `ScFallbackPanel` -- copiar siempre fue una comodidad sobre
 * ese texto, nunca el único camino. `flex-basis: 100%` la fuerza a su
 * propia línea dentro del `flex-wrap` de `ScFallbackPanel`, para no
 * competir por ancho con el texto principal ni con el botón «Copiar».
 * `semantic.error`: mismo rol que ya usa el mensaje de validación del
 * campo de correo (`Input.tsx`, `ScMsg`) -- no se inventa un cuarto rol de
 * color para "algo no funcionó". Vive DENTRO del `role="status"` que
 * `ScFallbackPanel` ya declara (patrón existente desde Task 1): no hace
 * falta un `role` propio -- una mutación dentro de una región que ya
 * estaba montada se anuncia igual, y un `status` anidado dentro de otro
 * `status` no añadiría nada.
 */
/*
 * TAMAÑO (crítica externa #9, 2026-08-17): sube de `caption` (12px) a
 * `bodySm` (14px) por el MISMO motivo que los mensajes de campo -- ver el
 * docblock de `ScFieldMessage`, más arriba. Es el otro mensaje de error del
 * mismo formulario, y dos errores del mismo formulario a dos tamaños
 * distintos serían dos escalas para un solo rol.
 */
const ScCopyErrorText = styled.p`
  flex-basis: 100%;
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  /* MISMO color que el error de campo (ver fieldErrorColor, arriba), no
     semantic.error suelto: son los dos unicos mensajes de error de este
     formulario, y pintarlos con dos rojos distintos en la rama oscura seria
     dos escalas para un solo rol. Sobre SU fondo -- surfaceSunken, el de
     ScFallbackPanel, no el panel del formulario -- semantic.error ya libraba
     AA con 5,56:1, lo que mide el candado de la Task 3, asi que aqui este
     cambio no arregla nada: unifica. El paso nuevo sube ese mismo ratio,
     nunca lo baja: error 300 es mas claro que error 500 sobre un fondo casi
     negro. */
  color: ${({ theme }) => fieldErrorColor(theme.data)};
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

/**
 * Validación del mensaje (crítica externa #8, Nielsen, 2026-08-17). Obligatorio
 * por el MISMO criterio que ya gobernaba el correo, no por una decisión nueva:
 * si el único campo del formulario era obligatorio y tenía su propio error
 * accesible, un segundo campo que decide el contenido REAL del correo no puede
 * ser opcional -- enviarlo vacío reproduce exactamente el defecto que este
 * campo viene a cerrar (un `mailto:` sin cuerpo que el visitante tiene que
 * redactar desde cero).
 *
 * Solo exige contenido no-blanco: cualquier regla más fina (longitud mínima,
 * palabras prohibidas) juzgaría el mensaje de alguien sin ninguna base, y este
 * sitio no tiene servidor que valide nada después. El `.trim()` es lo que
 * distingue "no ha escrito nada" de "ha escrito espacios" -- los dos casos
 * producen un correo igual de vacío.
 */
function hasMessage(value: string): boolean {
  return value.trim().length > 0;
}

/*
 * Identificadores del formulario, declarados UNA vez (crítica externa #9,
 * 2026-08-17). Antes solo existía el del control (`htmlFor="contact-email"`) y
 * `Field` derivaba de él los de sus mensajes; desde que los mensajes se
 * pintan aquí (ver `ScFieldMessage`), los tres los tiene que declarar este
 * módulo. Se conservan EXACTAMENTE los nombres que `Field` generaba
 * (`${htmlFor}-error` / `${htmlFor}-help`) para que el día que el primitivo
 * absorba estos arreglos no cambie ni un id del DOM publicado.
 *
 * Deterministas y escritos a mano, nunca `useId()`: un id aleatorio por render
 * rompería el HTML horneado del export estático (mismo criterio que ya
 * documenta `Field`).
 */
const EMAIL_FIELD_ID = "contact-email";
const EMAIL_ERROR_ID = `${EMAIL_FIELD_ID}-error`;
const EMAIL_HELP_ID = `${EMAIL_FIELD_ID}-help`;
const MESSAGE_FIELD_ID = "contact-message";
const MESSAGE_ERROR_ID = `${MESSAGE_FIELD_ID}-error`;

export function Contact(): ReactElement {
  const { t } = useTranslation("home");
  /* Namespace SEPARADO, mismo criterio que `Story.tsx` (Task 6): el aviso de
     "se abre en una pestaña nueva" (`Common.Nav.newTab`) es un patrón de
     INTERFAZ compartido con Navbar/Footer, no copia propia de esta sección.
     Se estrena aquí con la crítica externa #9 (2026-08-17), que midió que 3
     de los 16 enlaces a pestaña nueva del sitio -- los tres de esta sección --
     eran los únicos sin el aviso que los otros 13 ya llevaban. */
  const { t: tCommon } = useTranslation("common");
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
   * Mensaje del visitante (crítica externa #8, 2026-08-17) y su error propio.
   * Arranca VACÍO, igual que el correo y por el mismo motivo (task 1,
   * auditoría premium 2026-08-08, P0 confianza): un campo prerrellenado en un
   * formulario de contacto lee como texto puesto por el sitio, no como una
   * invitación a escribir -- y ya costó un P0 en este repo. El texto del error
   * sale de i18n en el render, así que el estado guarda un booleano y no la
   * cadena (mismo criterio que `emailError`, arriba).
   */
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  /*
   * Referencias a los DOS controles, para poder mover el foco al primer campo
   * inválido tras un envío fallido (crítica externa #9, 2026-08-17; ver
   * `handleSubmit`). No participan en ningún render: solo las lee el manejador
   * de envío, así que son `useRef` y no estado.
   *
   * `Field` las reenvía sin saberlo: clona a su hijo con `cloneElement`, y en
   * React 19 `ref` es un prop normal más -- se conserva en el clon igual que
   * `id` o `placeholder`.
   */
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  /*
   * "Este campo ya suspendió una vez" (crítica externa #13, 2026-08-19).
   *
   * Reproducción del defecto que cierran: tras un envío inválido,
   * `contact-email` quedaba con `aria-invalid="true"` y su mensaje; al
   * escribir `no-es-un-correo` el `onChange` retiraba los dos (correcto: ver
   * su comentario, dejar el error pintado mientras se corrige afirma un
   * estado que el usuario ya está resolviendo), pero salir del campo con Tab
   * NO revalidaba. El error no volvía hasta el siguiente envío, así que el
   * formulario dejaba avanzar a quien ya había demostrado que necesitaba la
   * corrección — WCAG 3.3.1/3.3.3 en espíritu: el aviso llega tarde y en el
   * peor momento.
   *
   * `useRef` y no estado (regla 7): esta bandera no se materializa como
   * ningún atributo del DOM ni cambia nada del render — lo único que se
   * pinta sigue siendo `emailError`/`messageError`. Guardarla en estado
   * añadiría un render por campo sin ninguna diferencia observable.
   *
   * NO se reinicia al corregir: el criterio es "una vez que un campo ha sido
   * marcado inválido, revalida al salir de él". Volver a ocultarlo tras el
   * primer acierto devolvería al usuario al modo silencioso justo cuando ya
   * sabemos que este campo le está costando.
   */
  const emailFailedOnceRef = useRef(false);
  const messageFailedOnceRef = useRef(false);
  /*
   * Panel de fallback, revelado tras un envío VÁLIDO (D13 sigue vigente: NO
   * es un "enviado" -- este sitio no tiene backend al que postear, así que
   * nunca puede confirmar una entrega real). Resuelve el caso "mailto sin
   * cliente de correo instalado = botón que visiblemente no hizo nada":
   * una vez revelado se queda así -- no es un toast que desaparece solo.
   */
  const [sent, setSent] = useState(false);
  /*
   * Estado del botón «Copiar» (task 1 introdujo solo el éxito; Task 3,
   * "tres cierres pequeños", 2026-08-10, añade el fallo que antes faltaba
   * -- ver el docblock de `handleCopy`, más abajo). Union cerrada de tres
   * valores, no dos booleanos independientes (`copied`/`copyFailed`): con
   * booleanos sueltos el TIPO permitiría un cuarto estado sin sentido (los
   * dos a la vez), que ningún flujo real alcanza pero que tampoco impide
   * nada por construcción -- la union solo deja representar los tres
   * estados que existen. SIN animación/check en el éxito: no hay backend
   * que confirmar de verdad (D13 sigue vigente), así que una animación
   * afirmaría más certeza de la que hay. Cambiar el propio texto del botón
   * (éxito) y sumar una línea de texto (fallo) son las señales mínimas
   * honestas, y las dos solo se activan cuando `handleCopy` resuelve de
   * verdad -- nunca de forma optimista.
   */
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  /*
   * Envío del formulario (D13, las DOS ramas desde la Task 16): abre el
   * cliente de correo del visitante con `mailto:` -- el sitio es un export
   * estático, sin backend al que postear, así que "enviar" de verdad
   * significa delegar en la app de correo. Es también el motivo por el que
   * el CTA de sección de la rama clara desapareció en vez de portarse a la
   * oscura: hacía exactamente esto mismo, con el mismo `links.email`.
   * Se usa `window.location.assign(...)` y NO
   * `window.location.href = ...`: `assign` es un método real de `Location`
   * que se puede doblar con `vi.spyOn` sin reemplazar el objeto `location`
   * entero (`Contact.test.tsx`) -- un setter de propiedad como `href` no se
   * puede espiar así. NO se implementa ningún estado "enviado" (D13): sin
   * backend sería una afirmación falsa en la interfaz.
   *
   * Validación propia (task 1) ANTES de navegar: si un campo está vacío o el
   * correo no tiene forma de correo, `preventDefault` (ya se llama siempre,
   * arriba) detiene aquí -- no se toca `window.location` -- y se encienden los
   * errores accesibles de `Field`. Los atributos NATIVOS (`required`,
   * `type="email"`) siguen en los controles sin tocar: describen el campo para
   * un lector de pantalla. Lo que ya NO hace el navegador es BLOQUEAR el envío
   * con su propio globo de aviso -- el `<form>` declara `noValidate` desde la
   * crítica externa #8 (ver el JSX de `contactChannels`), así que esta capa
   * dejó de ser un refuerzo y pasó a ser la única validación que el visitante
   * ve (ver docblock de `isValidEmail`).
   *
   * LOS DOS CAMPOS SE VALIDAN EN LA MISMA PASADA y los dos errores se pintan a
   * la vez: un `return` temprano tras el primero obligaría a un segundo viaje
   * de envío para descubrir el segundo fallo, y WCAG 3.3.1 pide identificar
   * los errores que hay, no el primero que se encuentra.
   *
   * El MENSAJE viaja en el `body=` (crítica externa #8, 2026-08-17), junto al
   * correo de contacto que ese cuerpo ya llevaba: la plantilla entera vive en
   * `Home.contact.form.body` (una sola cadena traducible, con `{{email}}` y
   * `{{message}}`), no repartida entre i18n y un pegado a mano aquí. Se
   * codifica con `encodeURIComponent`, igual que el asunto: sin eso, un `&` o
   * un salto de línea del visitante partiría la URL del `mailto:` en
   * parámetros que nadie escribió.
   *
   * POR QUÉ EL `<form>` NO DECLARA `action` (decisión de la crítica externa
   * #9, 2026-08-17, que pedía evaluarlo explícitamente): el candidato era
   * `action={links.email}`, para que el envío nativo sin JavaScript abriera el
   * mismo cliente de correo que abre esta función. Se descarta, y el motivo no
   * es "soporte errático" en abstracto sino lo que dice el algoritmo de envío
   * de formularios del HTML para el esquema `mailto:`: con `method="get"` la
   * query del `mailto:` se SUSTITUYE entera por los datos del formulario, así
   * que los campos solo llegarían al cliente de correo si se llamaran
   * exactamente como los parámetros de `mailto:` (`subject`, `body`…) —
   * renombrar el campo del correo del visitante a `subject` para conseguirlo
   * sería mentir sobre lo que ese campo es —, y con `method="post"` +
   * `enctype="text/plain"` el cuerpo acaba también en la query, con la misma
   * pérdida. En los dos caminos el visitante sin JS vería abrirse un correo
   * VACÍO: peor que no abrir nada, porque parece que funcionó.
   *
   * POR QUÉ SÍ DECLARA `method="dialog"` (crítica externa #12, Nielsen,
   * 2026-08-18). Lo que la #9 dio por aceptable — "sin `action`, el envío
   * nativo es un GET al propio documento y lo escrito sobrevive en la barra de
   * direcciones" — la #12 lo midió en vivo y lo llamó por su nombre: ese GET
   * publica el CORREO Y EL MENSAJE del visitante en la URL
   * (`?email=…&message=…`), y con ella en el historial del navegador y en los
   * logs del host, mientras la página vuelve arriba con los campos vacíos. La
   * "red de seguridad" para no perder lo escrito era, en realidad, una fuga de
   * datos personales por defecto.
   *
   * `method="dialog"` en un formulario que NO tiene ningún `<dialog>` por
   * ancestro hace que el algoritmo de envío TERMINE sin enviar nada: no hay
   * petición, no hay query, no se pierde lo escrito, no se recarga la página.
   * Es el único mecanismo que apaga el envío nativo SIN depender de JavaScript
   * para apagarse — un `disabled` habría que ponerlo con JS (y CSS no puede
   * declararlo), que es justo lo que aquí no existe.
   *
   * NO BASTA CON OCULTAR EL BOTÓN, y por eso se hacen las dos cosas:
   * `ScSubmitButton` se retira bajo `@media (scripting: none)` (control que no
   * puede funcionar, control que no se ofrece), pero un `<input type="email">`
   * dispara el envío IMPLÍCITO con solo pulsar Enter dentro del campo, con el
   * botón oculto o incluso sin botón. Medido en navegador real sobre un
   * fixture estático sin ningún script (Chrome 151.0.7922.138 y WebKit 26.5,
   * dos motores independientes, mismo resultado en los cuatro casos):
   *
   *     sin method,       botón visible, click -> ENVÍA  ?email=…&message=…
   *     sin method,       botón OCULTO,  Enter -> ENVÍA  ?email=…&message=…
   *     method="dialog",  botón visible, click -> NO ENVÍA, URL intacta
   *     method="dialog",  botón OCULTO,  Enter -> NO ENVÍA, URL intacta
   *
   * Nada de esto afecta al camino CON JavaScript: `preventDefault()` es la
   * primera línea de esta función y cancela el envío mucho antes de que el
   * `method` llegue a mirarse.
   *
   * DEGRADACIÓN DECLARADA: `method` es un atributo enumerado y su valor
   * inválido por defecto es GET, así que un navegador que no entienda `dialog`
   * cae al comportamiento anterior a esta entrega. Es el MISMO tramo de
   * navegadores en el que `@media (scripting: none)` tampoco existe (soporte
   * de `scripting`: Chrome/Edge 120, Firefox 113, Safari 17, todos de 2023;
   * soporte de `<dialog>` y su `method`: Chrome 37, Firefox 98, Safari 15.4,
   * todos anteriores), de modo que ahí el botón tampoco se oculta y el
   * visitante ve exactamente lo que veía antes — incluidos los `name` de los
   * dos campos, que siguen siendo la red que la #9 puso para ese caso.
   *
   * AVISO a quien mueva este JSX: si el formulario acabara DENTRO de un
   * `<dialog>`, `method="dialog"` dejaría de ser un no-op y pasaría a CERRAR
   * ese diálogo. El candado que vigila las dos condiciones a la vez (el
   * `method` declarado y la ausencia de `<dialog>` por encima) vive en
   * `Contact.test.tsx`, describe "Contact: critica externa #12".
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const emailInvalid = !isValidEmail(email);
    const messageInvalid = !hasMessage(message);
    setEmailError(emailInvalid);
    setMessageError(messageInvalid);
    /* Desde este envío, cada campo que haya suspendido se revalida al salir
       de él (ver el docblock de las dos banderas, más arriba). Se marcan aquí
       y no en el `onBlur` porque es el envío -- no el foco -- lo que convierte
       a un campo en "ya reprobado". */
    if (emailInvalid) emailFailedOnceRef.current = true;
    if (messageInvalid) messageFailedOnceRef.current = true;
    if (emailInvalid || messageInvalid) {
      /*
       * EL INTENTO RECHAZADO RETIRA EL PANEL DE RESPALDO (crítica externa #11,
       * hallazgo A, 2026-08-18). Reproducción medida: envío válido -> aparece
       * el panel «Si no se ha abierto tu aplicación de correo, escríbeme a …»;
       * se cambia el correo a `roto` y se pulsa Enviar -> el campo se marca
       * `aria-invalid` con su mensaje de error Y EL PANEL SEGUÍA VISIBLE. Dos
       * estados contradictorios a la vez en el mismo formulario: uno diciendo
       * "ya se ha abierto tu correo" y el otro "esto no se ha enviado".
       *
       * El panel describe UN ENVÍO CONCRETO que sí llegó a `location.assign`
       * (ver más abajo), no una propiedad permanente de la sección: en cuanto
       * hay un intento posterior que ni siquiera llega a navegar, lo que el
       * panel afirma dejó de ser cierto. Se retira aquí y no en el `onChange`
       * de los campos a propósito -- editar un campo no invalida el envío
       * anterior (de hecho el correo YA se abrió), lo que lo invalida es pedir
       * otro envío y que ese no salga.
       *
       * `copyStatus` vuelve a reposo con él porque es estado INTERIOR de ese
       * mismo panel: si no se reiniciara, un panel revelado de nuevo más tarde
       * aparecería ya con el botón en «Copiada» -- o, peor, con el mensaje de
       * fallo de copia de un intento anterior -- sin que nadie haya pulsado
       * nada en este ciclo. Sería exactamente el mismo defecto que este bloque
       * cierra, una capa más abajo.
       */
      setSent(false);
      setCopyStatus("idle");
      /*
       * EL FOCO VA AL PRIMER CAMPO INVÁLIDO, en orden del DOM (crítica externa
       * #9, Nielsen, 2026-08-17): hasta hoy el foco se quedaba en el botón de
       * envío, así que quien navega por teclado tenía que retroceder a ciegas
       * para encontrar qué campo había fallado, y quien usa lector de pantalla
       * oía el anuncio del `role="status"` sin ser llevado al control que lo
       * causó (WCAG 3.3.1).
       *
       * Los DOS errores se siguen pintando a la vez (ver el docblock de
       * arriba); esto solo elige a cuál de los dos se viaja -- y viajar al
       * primero es lo que deja la corrección en orden natural de lectura:
       * arreglado el correo, el siguiente tabulador ya cae en el mensaje.
       */
      (emailInvalid ? emailRef : messageRef).current?.focus();
      return;
    }

    const subject = encodeURIComponent(t("Home.contact.form.subject"));
    const body = encodeURIComponent(
      t("Home.contact.form.body", { email, message: message.trim() }),
    );
    window.location.assign(`${links.email}?subject=${subject}&body=${body}`);
    setSent(true);
  }

  /*
   * Copia la dirección real al portapapeles (resolución del orquestador,
   * task 1; el fallo deja de ser silencioso en Task 3, "tres cierres
   * pequeños", 2026-08-10): comodidad sobre el panel de fallback, que YA
   * deja la dirección en texto plano seleccionable (`ScFallbackEmail`) --
   * copiar nunca es el ÚNICO camino, ni antes ni ahora. `navigator.clipboard`
   * no existe en todo contexto (permiso denegado, origen no seguro, algún
   * navegador antiguo); hasta esta tarea su ausencia y el rechazo de
   * `writeText` dejaban al usuario SIN ninguna señal de que el intento no
   * funcionó -- el botón se quedaba en su texto de reposo, indistinguible
   * de "todavía no lo he pulsado". Los dos casos (API ausente / promesa
   * rechazada) convergen ahora en el MISMO estado `"error"`, que revela
   * `ScCopyErrorText` (más abajo en el render) señalando la dirección ya
   * seleccionable de arriba. El texto del botón solo cambia a "Copiada"
   * cuando la escritura se confirmó de verdad (nunca de forma optimista).
   */
  async function handleCopy(): Promise<void> {
    if (!navigator.clipboard) {
      setCopyStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  /*
   * Bloque de canales de contacto, COMPARTIDO por las dos ramas (Task 16,
   * unificacion de contenido parte 2, 2026-08-11): el formulario real (con
   * su validacion propia, su error accesible y el panel de direccion
   * copiable que revela un envio valido), la linea de privacidad (Task 18,
   * ver `ScPrivacyNote` mas arriba) y las dos salidas de la comunidad --
   * Discord y GitHub. Un unico arbol de JSX, montado tal cual en el
   * `return` oscuro y en el claro; lo unico que cambia entre temas es el
   * COLOR de las superficies (`panelBackground`/`panelBorder`/
   * `channelAccent`, mas arriba), nunca lo que dice ni a donde lleva.
   *
   * Sustituye a `chipAndCta`, que vivia aqui y solo montaba la rama clara:
   * un chip con la direccion escrita dentro (que se leia como campo de
   * captura sin serlo) y un ancla al mismo `mailto:` que abre el boton de
   * envio. Ver el docblock de cabecera del fichero para la critica que lo
   * senalo y para por que el CTA se va con el chip en vez de portarse a la
   * otra rama.
   */
  const contactChannels = (
    <ScCards>
      {/* `noValidate` (crítica externa #8, Nielsen, 2026-08-17): sin él, el
          navegador atrapa el envío ANTES de que `handleSubmit` llegue a
          correr y muestra su propio globo nativo -- así que los dos errores
          más comunes (campo vacío por `required`, correo malformado por
          `type="email"`) NUNCA alcanzaban la UI de error propia que este
          formulario ya tenía escrita: mensaje en el idioma del NAVEGADOR y no
          en el del sitio, sin `role="status"`, sin borde de error, y
          desaparece solo. Los atributos nativos se quedan: `required` y
          `type="email"` siguen describiendo el campo para un lector de
          pantalla; lo que `noValidate` apaga es únicamente el bloqueo y el
          globo, no la semántica. La contrapartida -- que ahora la validación
          propia es la ÚNICA que se ve -- la cubre `handleSubmit`, que
          comprueba los mismos dos casos (vacío y forma de correo) más el
          mensaje vacío. */}
      {/* `method="dialog"` (crítica externa #12, Nielsen, 2026-08-18): sin
          JavaScript apaga el envío nativo entero — el del botón Y el
          implícito de Enter en el campo de correo —, que hasta hoy publicaba
          el correo y el mensaje del visitante en la URL. Sigue SIN `action`.
          El porqué completo, la medición en dos motores y la degradación
          declarada están en el docblock de `handleSubmit`. */}
      <ScForm
        onSubmit={handleSubmit}
        method="dialog"
        noValidate
      >
        {/* Aviso sin JavaScript (crítica externa #9; deja de ser un
            `<noscript>` en la #11 -- ver la lápida en el docblock de
            `ScNoJsNote`). Va PRIMERO a propósito -- quien no tiene JS lo lee
            antes de invertir esfuerzo en escribir, no después de perderlo, y
            eso lo deja además delante del botón de envío. Con JS está en el
            DOM pero fuera del árbol de accesibilidad y sin caja: el guard es
            CSS, no un render condicional, porque un render condicional
            necesitaría saber si hay JS -- y quien no lo tiene tampoco ejecuta
            la comprobación.

            La clave i18n conserva el nombre `noscript` a propósito aunque la
            etiqueta ya no exista: nombra la CONDICIÓN (no hay scripting), que
            es lo que el texto describe, no el mecanismo con el que se muestra.
            El `data-nojs-note` es el gancho de test, en el elemento del DOM y
            no en un prop -- mismo criterio que `data-theme-toggle`. */}
        <ScNoJsNote data-nojs-note>
          {t("Home.contact.form.noscript")}{" "}
          <a href={links.email}>{EMAIL_ADDRESS}</a>
        </ScNoJsNote>
        {/* Un `<div>` pelado, sin estilo: agrupa el campo con sus dos mensajes
            para que el `gap` del formulario separe CAMPOS enteros y no meta
            además su hueco entre un control y su propio mensaje. Es la misma
            caja que `Field` monta internamente alrededor de etiqueta +
            control + mensaje, y desaparece con ellos el día que el primitivo
            absorba estos arreglos. */}
        <div>
          <Field
            label={t("Home.contact.form.label")}
            htmlFor={EMAIL_FIELD_ID}
          >
            <Input
              ref={emailRef}
              id={EMAIL_FIELD_ID}
              /* `name` (crítica externa #9): sin él, un envío nativo recarga
                 la página con una query VACÍA y el texto escrito se pierde
                 sin dejar rastro; con él sobrevive en la barra de
                 direcciones, recuperable a mano. Desde la crítica externa #12
                 ese envío nativo YA NO OCURRE en ningún navegador moderno
                 (`method="dialog"`, ver el docblock de `handleSubmit`), así
                 que este atributo solo sigue haciendo algo en el tramo de
                 navegadores anteriores a 2023 declarado allí -- y es
                 justamente ahí donde la red de la #9 sigue siendo lo mejor
                 disponible. */
              name="email"
              type="email"
              required
              placeholder={t("Home.contact.form.placeholder")}
              value={email}
              /* Error PRIMERO y ayuda DESPUÉS, los dos a la vez: ver el
                 docblock de `ScFieldMessage`. Cuando no hay error queda solo
                 la ayuda, que es lo que había antes de esta entrega. */
              aria-describedby={
                emailError
                  ? `${EMAIL_ERROR_ID} ${EMAIL_HELP_ID}`
                  : EMAIL_HELP_ID
              }
              /* `Field` ya no recibe el prop `error`, así que este atributo lo
                 declara el JSX: el borde de error de `ScInput` se deriva de
                 ÉL (selector `&[aria-invalid="true"]`), nunca de un prop
                 propio, así que estado visual y accesible siguen sin poder
                 desincronizarse. */
              aria-invalid={emailError ? true : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                // Corregir el valor retira el error de inmediato:
                // dejarlo pintado hasta el siguiente submit
                // afirmaría un estado que el usuario ya resolvió.
                if (emailError) setEmailError(false);
              }}
              /* Revalidación al SALIR, solo si este campo ya suspendió un
                 envío (crítica externa #13). Nunca mientras se teclea: avisar
                 en cada pulsación es validación agresiva, y marca en rojo un
                 correo que todavía se está escribiendo. `onBlur` es el
                 momento en que el usuario ha terminado con el campo, así que
                 es el primer instante en que juzgarlo es justo. */
              onBlur={() => {
                if (emailFailedOnceRef.current) {
                  setEmailError(!isValidEmail(email));
                }
              }}
              autoComplete="email"
            />
          </Field>
          {emailError && (
            <ScFieldMessage
              id={EMAIL_ERROR_ID}
              role="status"
              $error
            >
              {t("Home.contact.form.emailError")}
            </ScFieldMessage>
          )}
          <ScFieldMessage id={EMAIL_HELP_ID}>
            {t("Home.contact.form.help")}
          </ScFieldMessage>
        </div>
        <div>
          <Field
            label={t("Home.contact.form.messageLabel")}
            htmlFor={MESSAGE_FIELD_ID}
          >
            <ScTextarea
              ref={messageRef}
              id={MESSAGE_FIELD_ID}
              /* Mismo motivo que el `name` del correo, arriba. */
              name="message"
              required
              /* Cuatro líneas: bastante para que se lea como "aquí va un texto,
                 no una palabra" sin empujar el botón de envío fuera de pantalla
                 en móvil. Crece a voluntad con `resize: vertical`. */
              rows={4}
              placeholder={t("Home.contact.form.messagePlaceholder")}
              value={message}
              aria-describedby={messageError ? MESSAGE_ERROR_ID : undefined}
              aria-invalid={messageError ? true : undefined}
              onChange={(event) => {
                setMessage(event.target.value);
                // Mismo criterio que el correo, arriba: corregir retira el
                // error de inmediato, sin esperar a otro envío.
                if (messageError) setMessageError(false);
              }}
              /* Mismo criterio que el correo, arriba. */
              onBlur={() => {
                if (messageFailedOnceRef.current) {
                  setMessageError(!hasMessage(message));
                }
              }}
            />
          </Field>
          {messageError && (
            <ScFieldMessage
              id={MESSAGE_ERROR_ID}
              role="status"
              $error
            >
              {t("Home.contact.form.messageError")}
            </ScFieldMessage>
          )}
        </div>
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
              <ScFallbackEmail>{EMAIL_ADDRESS}</ScFallbackEmail>
            </ScFallbackText>
            <ScCopyButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {t(
                copyStatus === "copied"
                  ? "Home.contact.form.copied"
                  : "Home.contact.form.copyAddress",
              )}
            </ScCopyButton>
            {copyStatus === "error" && (
              <ScCopyErrorText>
                {t("Home.contact.form.copyError")}
              </ScCopyErrorText>
            )}
          </ScFallbackPanel>
        )}
      </ScForm>
      <ScPrivacyNote>{t("Home.contact.privacyNote")}</ScPrivacyNote>
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
          <ScCardTitle>{t("Home.contact.cards.community.title")}</ScCardTitle>
          <ScCardValue>{t("Home.contact.cards.community.value")}</ScCardValue>
        </div>
        {/* Aviso de cambio de contexto (WCAG 3.2.5), MISMO mecanismo y MISMA
            clave que los otros 13 enlaces externos del sitio (Navbar, Footer,
            Story): un `VisuallyHidden` con `Common.Nav.newTab`. La crítica
            externa #9 (2026-08-17) midió que las tres tarjetas de esta sección
            eran las únicas que abrían pestaña sin decirlo. No ocupa caja
            (`position: absolute`, 1x1 recortado), así que tampoco añade un
            `gap` más a la fila flex de la tarjeta. */}
        <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
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
          <ScCardTitle>{t("Home.contact.cards.code.title")}</ScCardTitle>
          <ScCardValue>{t("Home.contact.cards.code.value")}</ScCardValue>
        </div>
        {/* Mismo aviso que la tarjeta de arriba (crítica externa #9). */}
        <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
      </ScCardLink>
      {/* Tercera tarjeta, añadida el 2026-08-13 al cerrar la Fase 0. Las dos
          anteriores apuntan al PROYECTO (su comunidad, su código); esta
          apunta a la PERSONA que responde de él, y por eso va la última: la
          progresión va de lo más público a lo más personal, no al revés.
          Misma estructura que sus hermanas -- ningún estilo nuevo, ningún
          styled nuevo -- para que la rejilla no tenga que aprender un caso
          especial. */}
      <ScCardLink
        href={links.linkedin}
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
            cx="12"
            cy="7"
            r="3.5"
          />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </ScCardIcon>
        <div>
          <ScCardTitle>{t("Home.contact.cards.profile.title")}</ScCardTitle>
          <ScCardValue>{t("Home.contact.cards.profile.value")}</ScCardValue>
        </div>
        {/* Mismo aviso que sus dos hermanas (crítica externa #9). */}
        <VisuallyHidden> {tCommon("Common.Nav.newTab")}</VisuallyHidden>
      </ScCardLink>
    </ScCards>
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
              {contactChannels}
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
          <ScLightChannels>{contactChannels}</ScLightChannels>
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
