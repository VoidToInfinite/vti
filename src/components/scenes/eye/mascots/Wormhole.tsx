"use client";
import type { ReactElement } from "react";
import styled, { css, keyframes } from "styled-components";
import { Logo } from "@/components/ui/Logo/Logo";

/*
 * Wormhole — portado desde `vti-sdk` (`src/widgets/landing-fx/Wormhole.tsx` +
 * `Wormhole.css.ts`), la construccion de anillos que es el motivo visual
 * recurrente de aquella landing. Aqui vive en el centro del ojo del hero.
 *
 * POR QUE UN PORT Y NO UNA DEPENDENCIA: `vti-sdk` no publica paquete (es una
 * SPA, `version: 0.1.0`, sin build de libreria) y sus estilos son
 * vanilla-extract, que necesita un loader de webpack; este repo compila con
 * Turbopack y viste con styled-components. Traer vanilla-extract aqui seria
 * cambiar el compilador del proyecto para una pieza decorativa.
 *
 * QUE CAMBIA RESPECTO AL ORIGINAL:
 * - Se descarta el `root` de origen entero (posicion fija, docking por scroll
 *   con `data-dock`, `--dx/--dy/--scale/--op`): aqui no hay viaje de anclaje,
 *   el mascota se coloca en la pupila y punto. Lo pone el contenedor de `Eye`.
 * - Solo se portan los valores de color de tema OSCURO. El original alterna
 *   con `[data-theme="dark"] &` porque alli vive en los dos temas; aqui el
 *   Wormhole SOLO se monta en oscuro (en claro se monta `Sol`), asi que la
 *   rama clara seria codigo muerto. Mismo criterio que sigue `Sol.css.ts` en
 *   origen, que no tiene rama oscura por el motivo simetrico.
 * - `easingEmphasized` pasa a leer el token de ESTE sistema
 *   (`motion.easing.emphasized`), no la curva del sdk: el repo manda sobre el
 *   origen en lo que es un rol del sistema de movimiento.
 *
 * Excepcion de color sancionada, la misma que rige `eye.parts.tsx`: los
 * `oklch()` literales son espectaculo de marca en un elemento `aria-hidden`,
 * no roles de UI. Son valores VERBATIM del handoff del sdk: CERCANOS a la
 * escala de este repo -- comparten hue exacto con ella (235.851 = rampa
 * `primary`, 311.928 = rampa `secondary`) -- pero NINGUNO equivale a un paso
 * de `src/theme/tokens/color.ts`, ni al que su etiqueta nombraba hasta la
 * critica externa #12 (2026-08-19) ni a ningun otro de su rampa: comprobados
 * los seis uno a uno contra la escala generada. Misma redaccion honesta que
 * ya usa `DARK_STAR_LCH` en `src/components/layout/Footer/footer.layers.ts`
 * (D18), que documenta DOS de estos mismos literales -- `0.8 0.117 235.851`
 * (aqui `RING_3`) y `0.73 0.195 311.928` (aqui `RING_4`) -- como valores de
 * mockup que deliberadamente no se redondean a un paso de paleta. Sustituir
 * uno de estos valores por "su" paso de escala NO es una limpieza: es
 * repintar el arte.
 *
 * SIN `AMBIENT` (`@/motion/vocabulary`): las tres rotaciones infinitas de
 * este fichero -- `ScSwirl` (34s), `ScRing2` (24s reverse), `ScRing3` (18s) --
 * no coinciden con ninguno de los tres campos que sobrevivieron al colapso de
 * Task 20 (`breathMs` 5400, `floatMs` 9000, `orbitMs` 20000, mas el
 * `orbitMs * 2` derivado de Sol.tsx). Forzarlas exigiria cambiar su ritmo
 * real, un cambio de comportamiento del mascota que este brief no pide y que
 * arriesga su caracter -- inventario completo y razonamiento en el docblock
 * de `AMBIENT`, `src/motion/vocabulary.ts`. Las animaciones de pulso
 * DISPARADAS de este fichero (`ringExplodeStep`/`ringGlowStep`/
 * `corePulseStep`/`shockBurst`/`markPulse`/`swirlFlash`, todas bajo
 * `[data-pulse="true"]`) tampoco son candidatas: `AMBIENT` es exclusivamente
 * movimiento infinito NO disparado.
 */

function oklch(triplet: string, alpha: number): string {
  return `oklch(${triplet} / ${alpha})`;
}

/* L/C/H verbatim del handoff del sdk (ver cabecera). La etiqueta de cada uno
   dice DONDE cae respecto a la escala del repo, no que sea un paso de ella:
   el hue si coincide con el de su rampa, pero la pareja L+croma no coincide
   con ninguno de los doce pasos -- la escalera de L es
   0.985/0.96/0.92/0.86/0.78/0.737/0.66/0.53/0.5/0.42/0.32/0.22 y el croma de
   cada paso sale de multiplicarla por su CMUL, asi que "L de un paso + croma
   de otro" no existe en la escala. */
const RING_1 = "0.66 0.142 235.851"; // hue primary; L del paso 600, croma del 400
const RING_2 = "0.66 0.233 311.928"; // hue secondary; L del paso 600, croma del 400
const RING_3 = "0.8 0.117 235.851"; // hue primary; L y croma fuera de la escalera
const RING_4 = "0.73 0.195 311.928"; // hue secondary; L y croma fuera de la escalera
const CORE_START = "0.66 0.142 235.851"; // identico a RING_1
const CORE_END = "0.528 0.259 311.928"; // hue secondary; L fuera (0.53 es el vecino), croma del 500

/* La animacion continua se condiciona a `no-preference` en vez de apoyarse en
   el colapso global de duraciones de `GlobalStyles`: colapsar la duracion de
   una animacion INFINITA no la para, la hace girar instantaneamente para
   siempre. Convencion heredada del origen. */
const MOTION_OK = "(prefers-reduced-motion: no-preference)";

const spin = keyframes`to { transform: rotate(360deg); }`;

const swirlFlash = keyframes`
  0% { filter: brightness(1) blur(10px); }
  15% { filter: brightness(1.6) blur(6px); }
  100% { filter: brightness(1) blur(10px); }
`;

const ringGlowStep = keyframes`
  0% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
  9% { filter: brightness(1.75); box-shadow: 0 0 22px 1px var(--ring-glow); }
  44% { filter: brightness(1.75); box-shadow: 0 0 22px 1px var(--ring-glow); }
  50% { filter: brightness(2.5); box-shadow: 0 0 36px 3px var(--ring-glow-strong); }
  78% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
  100% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
`;

const ringExplodeStep = keyframes`
  0% { filter: brightness(1); transform: scale(1); }
  15% { filter: brightness(2.6); transform: scale(1.08); }
  100% { filter: brightness(1); transform: scale(1); }
`;

const corePulseStep = keyframes`
  0% { transform: scale(1); filter: blur(3px) brightness(1); }
  15% { transform: scale(1.3); filter: blur(1px) brightness(2.1); }
  100% { transform: scale(1); filter: blur(3px) brightness(1); }
`;

const shockBurst = keyframes`
  0% {
    transform: scale(0.82);
    opacity: 0;
    filter: blur(0px);
    border-width: 3px;
  }
  10% { opacity: 0.9; border-width: 3px; }
  100% {
    transform: scale(var(--shock-scale-end));
    opacity: 0;
    filter: blur(var(--shock-blur-end));
    border-width: 1px;
  }
`;

const ScRoot = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const ScSwirl = styled.div`
  position: absolute;
  inset: 6%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  opacity: 0.85;
  filter: blur(10px);
  background-image: conic-gradient(
    from 0deg,
    ${oklch(RING_1, 0)},
    ${oklch(RING_1, 0.4)},
    ${oklch(RING_2, 0.4)},
    ${oklch(RING_1, 0)}
  );

  @media ${MOTION_OK} {
    animation: ${spin} 34s linear infinite;

    [data-pulse="true"] & {
      animation:
        ${spin} 34s linear infinite,
        ${swirlFlash} 850ms ${({ theme }) => theme.data.motion.easing.standard}
          1150ms;
    }
  }
`;

const ringBase = css`
  position: absolute;
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid transparent;
`;

const ScRing1 = styled.div`
  ${ringBase}
  inset: 0;
  border-color: ${oklch(RING_1, 0.5)};
  box-shadow: 0 0 50px ${oklch(RING_1, 0.2)};
  --ring-glow-strong: ${oklch(RING_1, 0.95)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${ringExplodeStep} 850ms
        ${({ theme }) => theme.data.motion.easing.standard} 1150ms;
    }
  }
`;

const ScRing2 = styled.div`
  ${ringBase}
  inset: 10%;
  border-color: ${oklch(RING_2, 0.45)};
  --ring-glow: ${oklch(RING_2, 0.7)};
  --ring-glow-strong: ${oklch(RING_2, 0.95)};

  @media ${MOTION_OK} {
    animation: ${spin} 24s linear infinite reverse;

    [data-pulse="true"] & {
      animation:
        ${spin} 24s linear infinite reverse,
        ${ringGlowStep} 1680ms
          ${({ theme }) => theme.data.motion.easing.standard} 320ms;
    }
  }
`;

const ScRing3 = styled.div`
  ${ringBase}
  inset: 21%;
  border-color: ${oklch(RING_3, 0.4)};
  --ring-glow: ${oklch(RING_3, 0.7)};
  --ring-glow-strong: ${oklch(RING_3, 0.95)};

  @media ${MOTION_OK} {
    animation: ${spin} 18s linear infinite;

    [data-pulse="true"] & {
      animation:
        ${spin} 18s linear infinite,
        ${ringGlowStep} 1840ms
          ${({ theme }) => theme.data.motion.easing.standard} 160ms;
    }
  }
`;

const ScRing4 = styled.div`
  ${ringBase}
  inset: 33%;
  border-color: ${oklch(RING_4, 0.5)};
  --ring-glow: ${oklch(RING_4, 0.7)};
  --ring-glow-strong: ${oklch(RING_4, 0.95)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${ringGlowStep} 2000ms
        ${({ theme }) => theme.data.motion.easing.standard} 0ms;
    }
  }
`;

const ScCore = styled.div`
  position: absolute;
  inset: 40%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  filter: blur(3px);
  background-image: radial-gradient(
    circle,
    ${oklch(CORE_START, 0.9)},
    ${oklch(CORE_END, 0.5)} 62%,
    transparent 82%
  );

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${corePulseStep} 850ms
        ${({ theme }) => theme.data.motion.easing.standard} 1150ms;
    }
  }
`;

/*
 * Marca dentro del Wormhole -- portado en espiritu desde `vti-sdk`
 * (`src/widgets/landing-fx/LogoMark.tsx`, `LogoMark.css.ts` y
 * `useLogoPointer.ts`), NO en forma. Los tres archivos SI fueron leidos
 * integros en esta sesion: `vti-sdk` es un repo hermano de este workspace
 * (`../vti-sdk`), no esta ausente.
 *
 * Lo que dice el origen, leido de verdad:
 * - `LogoMark.tsx` monta el atomo `Logo` del sdk dentro de DOS divs
 *   anidados: un `root` posicionado `fixed`, con `data-dock` (hero/cta/
 *   ambient/intro) y `data-pulse`, y dentro un `mark` que es la superficie
 *   interactiva de `useLogoPointer`.
 * - `LogoMark.css.ts` resuelve `data-dock` a variables `--dx/--dy/--scale`
 *   (con una variante de breakpoint movil aparte) que `root` transiciona con
 *   `tokens.motion.durationDock`: el LogoMark viaja de forma INDEPENDIENTE
 *   del Wormhole, como pieza hermana que se ancla a su lado. `mark` anade un
 *   halo `::before` que cambia de color entre temas y una animacion
 *   `logoPulse` (scale 1 -> 1.2 -> 1, 2200ms) bajo el selector descendiente
 *   `[data-pulse="true"] &`, con el mismo patron de apagado explicito bajo
 *   `prefers-reduced-motion: reduce` que ya usa este archivo.
 * - `useLogoPointer.ts` escribe hover-tilt (rotateX/rotateY hacia el cursor)
 *   y press-drag con dos listeners de `window` (mousemove/touchmove) que
 *   escriben el transform inline directamente en cada frame de puntero,
 *   fuera de React salvo el `dragging` que si es estado (mueve un
 *   `data-dragging` de CSS).
 *
 * Que cambia al portarlo aqui, y por que:
 * - SE DESCARTA el docking por posicion/scroll (`data-dock`,
 *   `--dx/--dy/--scale`, las cuatro variantes hero/cta/ambient/intro y su
 *   rama de breakpoint movil): en el sdk el LogoMark es HERMANO del
 *   Wormhole, con posicion `fixed` propia que viaja con el scroll. Aqui vive
 *   DENTRO, centrado y fijo -- no hay viaje que anclar. El parallax que SI
 *   tiene lo hereda gratis del contenedor de la mascota (Eye.tsx: el mascot
 *   completo se mueve a EYE_MASCOT_DEPTH dentro del mismo rAF unico que ya
 *   gobierna las capas).
 * - SE DESCARTA la interaccion de puntero propia del logo (hover-tilt 3D +
 *   drag de `useLogoPointer`): aqui es `aria-hidden` y decorativo, fuera del
 *   orden de tabulacion -- anadir los listeners de `window` de
 *   `useLogoPointer` duplicaria el seguimiento del cursor con dos fuentes de
 *   verdad compitiendo por el mismo transform, contra la regla dura de "un
 *   unico rAF" del repo.
 * - SE PORTA el patron de reaccion al pulso (`[data-pulse="true"] &` con
 *   apagado explicito bajo reduced-motion), pero no la implementacion ajena:
 *   sin useState ni data-attribute nuevos, se reutiliza el data-pulse que
 *   ScRoot YA escribe (gobernado por Eye.tsx), leido aqui con el MISMO
 *   selector descendiente que ya usan swirl/ring1-4/core en este archivo. La
 *   cadencia (850ms, easing.standard, retardo 1150ms) es la de
 *   corePulseStep de este mismo archivo, NO los 2200ms de `logoPulse` del
 *   sdk: el logo respira en el mismo instante que el nucleo de ESTE
 *   Wormhole, no en el tiempo importado del origen.
 */
const markPulse = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
  15% { transform: translate(-50%, -50%) scale(1.18); filter: brightness(1.85); }
  100% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
`;

const ScLogoMark = styled(Logo)`
  position: absolute;
  top: 50%;
  left: 50%;
  /* Diametro del TERCER anillo, que se dibuja con inset 21%: 100 - 2x21 = 58.
     Se escribe derivado de ese 21 y no como un 58 suelto para que, si el
     anillo se mueve, salte a la vista que las dos medidas van juntas. Sin
     esta declaracion el logo heredaba el 100% del contenedor que impone
     GlobalStyles a todo svg, y se comia la composicion entera. */
  width: calc(100% - 2 * 21%);
  height: auto;
  transform: translate(-50%, -50%);
  color: ${oklch("0.985 0 0", 1)};
  filter: drop-shadow(0 0 6px ${oklch(CORE_START, 0.6)});
  pointer-events: none;

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${markPulse} 850ms
        ${({ theme }) => theme.data.motion.easing.standard} 1150ms;
    }
  }
`;

const shockBase = css`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 2px solid transparent;
  opacity: 0;
  pointer-events: none;
  --shock-scale-end: 2.05;
  --shock-blur-end: 11px;
`;

const ScShock1 = styled.div`
  ${shockBase}
  border-color: ${oklch(RING_1, 0.85)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${shockBurst} 900ms
        ${({ theme }) => theme.data.motion.easing.emphasized} 1200ms;
    }
  }
`;

/* La ultima onda en apagarse (1300ms de retardo + 860ms) es la que marca el
   final del pulso completo: su `animationend` es el que devuelve el estado a
   reposo en `Eye`, y por eso es la unica que lleva el handler. */
const ScShock2 = styled.div`
  ${shockBase}
  border-color: ${oklch(RING_2, 0.8)};
  --shock-scale-end: 2.32;
  --shock-blur-end: 15px;

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${shockBurst} 860ms
        ${({ theme }) => theme.data.motion.easing.emphasized} 1300ms;
    }
  }
`;

export interface WormholeProps {
  /** Dispara la coreografia de pulso (destello, anillos, ondas). */
  pulsing: boolean;
  /** Se invoca cuando la ULTIMA onda termina, no la primera. */
  onPulseEnd?: () => void;
  className?: string;
}

export function Wormhole({
  pulsing,
  onPulseEnd,
  className,
}: WormholeProps): ReactElement {
  return (
    <ScRoot
      className={className}
      data-pulse={pulsing ? "true" : "false"}
      aria-hidden="true"
    >
      <ScSwirl data-part="swirl" />
      <ScRing1 data-part="ring1" />
      <ScRing2 data-part="ring2" />
      <ScRing3 data-part="ring3" />
      <ScRing4 data-part="ring4" />
      <ScCore data-part="core" />
      <ScLogoMark
        data-part="mark"
        size="16%"
      />
      <ScShock1 data-part="shock1" />
      <ScShock2
        data-part="shock2"
        onAnimationEnd={onPulseEnd}
      />
    </ScRoot>
  );
}
