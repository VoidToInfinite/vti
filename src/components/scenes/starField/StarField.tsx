"use client";

import type { CSSProperties, ReactElement } from "react";
import styled, {
  keyframes,
  useTheme as useStyledTheme,
} from "styled-components";
import {
  type FooterStar,
  FOOTER_STARS,
  FOOTER_STAR_TWINKLE_MAX_SCALE,
  FOOTER_STAR_TWINKLE_MIN_OPACITY,
  FOOTER_STAR_TWINKLE_MIN_SCALE,
  footerStarGlow,
  footerStarTint,
} from "@/components/layout/Footer/footer.layers";
import type { ThemeDefinition } from "@/theme/theme.types";

/*
 * Campo de 24 estrellas titilantes, decorativo (`aria-hidden`).
 *
 * NACIO EN EL PIE Y SE EXTRAJO AQUI EL 2026-09-13, por encargo del dueño: la
 * seccion `About` lleva desde entonces el mismo fondo de estrellas animadas que
 * el `Footer`. Es la misma pieza en los dos sitios, no una copia, y por eso
 * vive en `scenes/`, como `SectionBeam`, el otro decorativo que el pie comparte
 * con las secciones.
 *
 * DIFERENCIA DECLARADA con la forma de las demás escenas (`DESIGN.md` §6.1:
 * `<nombre>.layers.ts` + `.parts.tsx` + `<Nombre>.tsx`): esta carpeta NO tiene
 * datos propios. La tabla `FOOTER_STARS`, las tintas por tema y las constantes
 * del keyframe siguen en `layout/Footer/footer.layers.ts` y no se movieron:
 * son arte del mockup del pie, con sus candados byte a byte en
 * `footer.layers.test.ts`, y moverlos no aportaba nada a este encargo salvo
 * riesgo. La constelación conserva su nombre de origen. Si algún día se
 * mueven, este componente pasa a leer su propio `starField.layers.ts`.
 *
 * QUIEN LO MONTA pone el contenedor: este componente solo se extiende sobre el
 * primer ancestro posicionado (`position: absolute; inset: 0`). Ese ancestro
 * tiene que declarar `position: relative`, y el contenido que deba quedar por
 * encima de las estrellas tiene que estar posicionado DESPUES en el DOM, o con
 * su propio `z-index` (orden de pintado de CSS 2.1, `task/lessons.md`,
 * 2026-08-07: un hermano sin posicionar se pinta ANTES que uno absoluto, vaya
 * donde vaya en el marcado).
 *
 * Arte del pie, historia completa: spec
 * `2026-08-03-contacto-footer-oscuro-design.md` (D9/D10) y spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md` (D3/D4/D6: tambien en
 * tema claro, con su propia tonalidad).
 */

/* Contenedor decorativo, sin captura de puntero, del mismo tamaño que el
   ancestro posicionado. El tinte por estrella se resuelve contra el tema activo
   en `starVars`, más abajo (D4); este contenedor en sí no cambia entre temas. */
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
 * fichero de integración, `app/(es)/home-page.flujo.test.tsx`), es decir ~850 ms
 * y ~35 ms por estrella, solo en inyección de CSS. Eso bastaba para que ese
 * test síncrono desbordara el presupuesto de 5000 ms de Vitest con los
 * workers por defecto. Con variables, el template es ESTÁTICO: una sola
 * clase para las 24, y la variación viaja en el atributo `style`, que el
 * navegador resuelve sin tocar la hoja de estilos. Desde que el campo se monta
 * también en `About`, esa misma clase la comparten las 48 estrellas de la
 * página.
 *
 * En reposo (`reduce`, o antes de que `no-preference` aplique la animación)
 * queda en su opacidad mínima -- el mismo valor que el 0%/100% del propio
 * keyframe -- para no destellar de golpe a opacidad 1.
 *
 * RADIO por token, no por porcentaje (crítica externa #18, ola O+P): la caja es
 * cuadrada (width = height = var(--star-size)), así que `radius.full` la
 * redondea igual que el 50 % que había antes -- y es lo que escriben ya los
 * círculos de Sol, Wormhole, Contact, Journey, Story y Navbar.
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
  border-radius: ${({ theme }) => theme.data.radius.full};
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

export function StarField(): ReactElement {
  /* El tema AMBIENTAL de styled-components (regla 12 de `RULES.md`), no
     `themes[themeName]` construido a mano: es el que de verdad están usando los
     styled-components de este mismo fichero. */
  const { data: theme } = useStyledTheme();

  return (
    <ScStars aria-hidden="true">
      {FOOTER_STARS.map((star) => (
        <ScStar
          key={star.id}
          style={starVars(star, theme)}
        />
      ))}
    </ScStars>
  );
}
