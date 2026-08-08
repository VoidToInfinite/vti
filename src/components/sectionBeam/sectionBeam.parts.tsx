"use client";
import styled, { keyframes, type DefaultTheme } from "styled-components";
import {
  BEAM_CORE,
  BEAM_MID,
  BEAM_TAIL,
  HOTSPOT_GLOW,
  SECTION_BEAM_DRAW_DELAY_MS,
  SECTION_BEAM_DRAW_MS,
  SECTION_BEAM_EASING,
  SECTION_BEAM_HEIGHT,
  SECTION_BEAM_HOTSPOT_W,
  SECTION_BEAM_Z,
  SECTION_BEAM_PULSE_MS,
  SECTION_BEAM_SWEEP_DELAY_MS,
  SECTION_BEAM_SWEEP_MS,
  SWEEP_CORE,
  SWEEP_GLOW,
  SWEEP_MID,
  beamCoreLight,
  beamMidLight,
  beamTailLight,
  hotspotGlowLight,
  sweepCoreLight,
  sweepGlowLight,
  sweepMidLight,
} from "./sectionBeam.layers";

/*
 * Selector de tonalidad por tema (D1/D2/D5, spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`): la bifurcación
 * vive AQUI, con `theme.data.isLight` dentro de los styled-components -- NO
 * como props nuevas en `SectionBeam` (D5: el componente sigue sin API, como
 * declara su propio docblock, y sus dos consumidores -- Contacto y el Footer
 * -- lo siguen montando igual). Mismo recurso que `ScAccent` en `Story.tsx`.
 *
 * La rama oscura devuelve el literal VERBATIM tal cual (D5: "no cambia ni un
 * pixel"); la clara llama a la función pura de `sectionBeam.layers.ts` que
 * construye el valor con pasos reales de `theme.data.palette` -- ver el
 * docblock que precede a `beamCoreLight` en ese fichero para el detalle de
 * cada valor y el porqué de las dos asimetrías (barrido más oscuro que el
 * dibujado, alfa de los `drop-shadow` a la mitad). Un único selector
 * parametrizado evita repetir el mismo ternario 7 veces dentro de los
 * templates literales de más abajo.
 */
function themedBeamColor(
  dark: string,
  light: (palette: DefaultTheme["data"]["palette"]) => string,
): (props: { theme: DefaultTheme }) => string {
  return ({ theme }) => (theme.data.isLight ? light(theme.data.palette) : dark);
}

const beamCore = themedBeamColor(BEAM_CORE, beamCoreLight);
const beamMid = themedBeamColor(BEAM_MID, beamMidLight);
const beamTail = themedBeamColor(BEAM_TAIL, beamTailLight);
const sweepCore = themedBeamColor(SWEEP_CORE, sweepCoreLight);
const sweepMid = themedBeamColor(SWEEP_MID, sweepMidLight);
const sweepGlow = themedBeamColor(SWEEP_GLOW, sweepGlowLight);
const hotspotGlow = themedBeamColor(HOTSPOT_GLOW, hotspotGlowLight);

/* Las tres animaciones, portadas VERBATIM del mockup (`Footer animado v2.dc.html`
   L25-27): solo `transform`/`opacity`, sin variantes. */
const beamDraw = keyframes`
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
`;

const beamOut = keyframes`
  0% {
    transform: scaleX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
`;

const beamPulse = keyframes`
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
`;

/*
 * Contenedor de la costura: pegado al borde superior de la sección que lo
 * monta (`position: absolute; top: 0`), decorativo y sin captura de puntero.
 * El reveal (`data-revealed`) vive AQUI -- lo escribe `SectionBeam.tsx` via
 * `useReveal` sobre este mismo nodo -- mientras que las piezas que animan son
 * sus hijos. Por eso los cinco hijos usan el selector DESCENDIENTE
 * `[data-revealed="true"] &`, nunca `&[data-revealed="true"]`: este ultimo
 * solo matchearia si el atributo viviera en el propio hijo, y aqui vive en
 * el padre -- mismo gotcha que documenta `CLAUDE.md §5.1` y que ya resuelve
 * `aura.parts.tsx` (`auraStagger`) con el mismo patron.
 */
export const ScSectionBeam = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${SECTION_BEAM_Z};
  height: ${SECTION_BEAM_HEIGHT};
  overflow: hidden;
  pointer-events: none;
`;

/*
 * Semihaz de dibujado izquierdo (mockup L46/L114). En reposo (sin revelar)
 * el haz NO esta dibujado -- `transform: scaleX(0)` -- para que `beamDraw`
 * tenga un punto de partida real cuando `useReveal` marca el contenedor.
 * `both` sostiene `scaleX(1)` al terminar; sin ese fill-mode la animacion
 * volveria al `0%` del keyframe en cuanto acabara (mismo motivo que el
 * `both` de `fadeUp` en el mockup, L56/L86).
 *
 * Bajo `reduce`: se fuerza `animation: none` Y `transform: scaleX(1)`
 * explicitos (D8) -- no basta con apagar la animacion, porque el reposo por
 * defecto es `scaleX(0)` y sin el override la linea se veria sin dibujar en
 * vez de dibujada y quieta. No se confia en el colapso global de
 * `GlobalStyles` (`animation-iteration-count: 1 !important`): esta no es una
 * animacion infinita, pero el override de `transform` de todos modos tiene
 * que ser explicito porque `reduce` nunca ejecuta la animacion.
 */
export const ScBeamDrawLeft = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 50%;
  transform-origin: 100% 50%;
  background: linear-gradient(
    270deg,
    ${beamCore},
    ${beamMid} 25%,
    ${beamTail} 60%,
    transparent
  );
  transform: scaleX(0);

  [data-revealed="true"] & {
    animation: ${beamDraw} ${SECTION_BEAM_DRAW_MS}ms ${SECTION_BEAM_EASING}
      ${SECTION_BEAM_DRAW_DELAY_MS}ms both;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: scaleX(1);
  }
`;

/* Semihaz de dibujado derecho: espejo de `ScBeamDrawLeft` (mockup L47/L115). */
export const ScBeamDrawRight = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  right: 0;
  transform-origin: 0% 50%;
  background: linear-gradient(
    90deg,
    ${beamCore},
    ${beamMid} 25%,
    ${beamTail} 60%,
    transparent
  );
  transform: scaleX(0);

  [data-revealed="true"] & {
    animation: ${beamDraw} ${SECTION_BEAM_DRAW_MS}ms ${SECTION_BEAM_EASING}
      ${SECTION_BEAM_DRAW_DELAY_MS}ms both;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: scaleX(1);
  }
`;

/*
 * Semihaz de barrido izquierdo (mockup L48/L116): recorre la costura de
 * forma periodica una vez dibujada. En reposo `scaleX(0)` + `opacity: 0`
 * (D8) -- sin revelar, ni siquiera el primer barrido debe insinuarse.
 *
 * `beamOut` es INFINITA, asi que solo se declara dentro de
 * `@media (prefers-reduced-motion: no-preference)` (doblemente condicionada,
 * junto con `[data-revealed="true"] &`): bajo `reduce` no hay bloque que
 * anular por color, pero el bloque `reduce` de mas abajo la fuerza a
 * `animation: none` de todas formas -- no se confia en que "no declarada
 * bajo no-preference" sea suficiente por si solo (D8, misma leccion que
 * `ctaGlowPulse`/`float` en el resto del repo: el colapso global de
 * `GlobalStyles` deja un fotograma arbitrario de una animacion infinita en
 * vez de pararla en un estado conocido).
 */
export const ScBeamSweepLeft = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 50%;
  transform-origin: 100% 50%;
  background: linear-gradient(
    270deg,
    ${sweepCore},
    ${sweepMid} 20%,
    transparent 55%
  );
  filter: drop-shadow(0 0 7px ${sweepGlow});
  transform: scaleX(0);
  opacity: 0;

  @media (prefers-reduced-motion: no-preference) {
    [data-revealed="true"] & {
      animation: ${beamOut} ${SECTION_BEAM_SWEEP_MS}ms ${SECTION_BEAM_EASING}
        ${SECTION_BEAM_SWEEP_DELAY_MS}ms infinite;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Semihaz de barrido derecho: espejo de `ScBeamSweepLeft` (mockup L49/L117). */
export const ScBeamSweepRight = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  right: 0;
  transform-origin: 0% 50%;
  background: linear-gradient(
    90deg,
    ${sweepCore},
    ${sweepMid} 20%,
    transparent 55%
  );
  filter: drop-shadow(0 0 7px ${sweepGlow});
  transform: scaleX(0);
  opacity: 0;

  @media (prefers-reduced-motion: no-preference) {
    [data-revealed="true"] & {
      animation: ${beamOut} ${SECTION_BEAM_SWEEP_MS}ms ${SECTION_BEAM_EASING}
        ${SECTION_BEAM_SWEEP_DELAY_MS}ms infinite;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/*
 * Punto caliente central (mockup L50/L118): un pulso de opacidad sobre una
 * elipse muy alargada, centrada, que lee como un brillo fijo en el punto
 * donde se cruzan los dos semihaces. En reposo `opacity: 0.55` -- el mismo
 * valor minimo del propio `beamPulse` (D8): a diferencia de los semihaces de
 * dibujado/barrido, el punto caliente SI es visible sin revelar (es un
 * brillo estatico, no una revelacion), y el pulso solo anima su intensidad.
 *
 * Igual que `ScBeamSweepLeft/Right`, `beamPulse` es infinita y se declara
 * solo bajo `no-preference`, con su propio `animation: none` explicito en el
 * bloque `reduce` de abajo. `ease-in-out` es la palabra clave nativa que usa
 * el mockup (L50/L118), no un token de `theme.data.motion.easing` (esa
 * tabla solo tiene curvas `cubic-bezier` propias, ninguna coincide).
 */
export const ScBeamHotspot = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: ${SECTION_BEAM_HOTSPOT_W};
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse 50% 300% at 50% 50%,
    ${sweepCore},
    transparent 70%
  );
  filter: drop-shadow(0 0 9px ${hotspotGlow});
  opacity: 0.55;

  @media (prefers-reduced-motion: no-preference) {
    [data-revealed="true"] & {
      animation: ${beamPulse} ${SECTION_BEAM_PULSE_MS}ms ease-in-out infinite;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
