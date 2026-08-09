"use client";
import type { ReactElement, ReactNode } from "react";
import styled, { css, keyframes } from "styled-components";
import { Logo } from "@/components/ui/Logo/Logo";
import {
  SOL_AURA_SPARKS,
  SOL_BASIC_SPARKS,
  SOL_CLINE_ANGLES,
  SOL_CLINE_GROUPS,
  SOL_RAY_ANGLES,
  type SolClineGroup,
} from "./Sol.constants";
import { useSolCycle } from "./useSolCycle";
import { useSolTiltSpin } from "./useSolTiltSpin";

/*
 * Sol — portado desde `vti-sdk` (`src/widgets/landing-fx/Sol.tsx` +
 * `Sol.css.ts`), la contraparte de tema claro del Wormhole cosmico: un sol
 * ambiental que respira, se inclina hacia el cursor y alterna entre su cara
 * lisa y una cara "instrumento" con rosa de los vientos. Aqui ocupa el centro
 * del ojo del hero cuando el tema activo es el claro.
 *
 * Mismo criterio de port que `Wormhole.tsx` (leelo alli: por que un port y no
 * una dependencia, y por que los colores son literales). Lo que cambia
 * respecto al original:
 *
 * - Se descarta el `root` de origen (posicion fija + docking por scroll): aqui
 *   la mascota se coloca en la pupila y el contenedor lo pone `Eye`.
 * - El logo del iris ya no viene del atomo `Logo` del sdk: viene del atomo
 *   `Logo` de ESTE repo (`src/components/ui/Logo/Logo.tsx`), fuente unica
 *   compartida con Navbar y Wormhole para la misma figura que tambien vive
 *   como asset en `public/brand/logo.svg`. En linea, `currentColor`, sin
 *   peticion de red por una figura de ~25px.
 * - Las dos caras siguen montadas siempre y se cruzan por opacidad, como en el
 *   origen: remontarlas produciria un parpadeo en vez de un morph.
 */

const P100 = "oklch(0.93 0.039 235.851)";
const P200 = "oklch(0.87 0.074 235.851)";
const P300 = "oklch(0.8 0.117 235.851)";
const P500 = "oklch(0.66 0.142 235.851)";
const S200 = "oklch(0.87 0.088 311.928)";
const S300 = "oklch(0.8 0.14 311.928)";
const S500 = "oklch(0.66 0.233 311.928)";
/* La escala neutra del sdk corre al reves que la de este repo: su
   `neutral-1100` es el BLANCO (lo que en `vti` es `neutral-50`) y su
   `neutral-200` es un gris oscuro. Se resuelven aqui a su valor literal para
   no traducir mal un nombre de token entre dos escalas invertidas. */
const WHITE = "oklch(0.985 0 0)";
const ROSE_NEUTRAL = "oklch(0.324 0 0)";

function mix(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

/* Igual que en Wormhole: la animacion infinita se condiciona a
   `no-preference` en vez de dejarla al colapso global de duraciones. */
const MOTION_OK = "(prefers-reduced-motion: no-preference)";

// --- Envolturas: hit / respiracion / inclinacion / giro ---------------------

const ScRoot = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const centered = css`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* El root no es interactivo; `hit` es la superficie que recibe raton y click,
   misma division que en el origen. */
const ScHit = styled.div`
  ${centered}
  position: relative;
  pointer-events: auto;
  cursor: pointer;
`;

const solBreathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.035); }
`;

const ScPulse = styled.div`
  ${centered}

  @media ${MOTION_OK} {
    animation: ${solBreathe} 5.4s ease-in-out infinite;
  }
`;

const ScTilt = styled.div`
  ${centered}
`;

const solSpin = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  55% { transform: rotate(230deg) scale(1.16); }
  100% { transform: rotate(360deg) scale(1); }
`;

const ScSpin = styled.div`
  ${centered}

  @media ${MOTION_OK} {
    &[data-spinning="true"] {
      animation: ${solSpin} 900ms
        ${({ theme }) => theme.data.motion.easing.standard};
    }
  }

  /* Redundante a proposito: useSolTiltSpin ya evita marcar el giro bajo
     reduced-motion, pero el CSS se sostiene solo. */
  @media (prefers-reduced-motion: reduce) {
    &[data-spinning="true"] {
      animation: none;
    }
  }
`;

// --- Caras: el cruce Sol <-> brujula ---------------------------------------

const ScFaces = styled.div`
  position: relative;
  width: 82%;
  height: 82%;
  perspective: 900px;
  --glow-p-soft: ${mix(P300, 45)};
  --glow-s-soft: ${mix(S300, 40)};
  --glow-p-40: ${mix(P500, 40)};
  --glow-s-25: ${mix(S500, 25)};
  --rose-primary: ${P200};
  --rose-secondary: ${S200};
  --rose-neutral: ${ROSE_NEUTRAL};
`;

/* 1100ms: la duracion del morph que fija el origen. No hay casilla equivalente
   en la escala de motion de este repo (la mas larga de la familia general de
   interfaz, `slower`, es 480ms; `ambient` -- que hubiera sido la mas larga
   con 1500ms -- se retiro por 0 consumidores, ver
   `src/theme/tokens/motion.ts`), y el numero es parte de la coreografia
   portada: es el cambio de identidad entero del mascota, no una transicion
   de UI. */
const MORPH_MS = "1100ms";
/* Curva de entrada del origen, sin equivalente en `motion.easing` de este
   repo. Las cuatro curvas de la casa son de UI; esta es un aterrizaje
   sobreamortiguado propio del mascota. */
const EASE_ENTRANCE = "cubic-bezier(0.22, 1, 0.36, 1)";

const faceBase = css`
  position: absolute;
  inset: 0;
  opacity: 0;
  filter: blur(9px);
  pointer-events: none;
  transition-property: opacity, transform, filter;
  transition-duration: ${MORPH_MS};
  transition-timing-function: ${EASE_ENTRANCE};
`;

/* Direcciones de entrada contrarias (+/-) para que las dos caras se lean como
   un mismo giro dimensional y no como dos fundidos en el mismo sitio. */
const ScFaceSol = styled.div`
  ${faceBase}
  transform: scale(0.88) rotateY(48deg);

  ${ScFaces}[data-variant="sol"] & {
    opacity: 1;
    transform: scale(1) rotateY(0deg);
    filter: blur(0px);
  }
`;

const ScFaceCompass = styled.div`
  ${faceBase}
  transform: scale(0.88) rotateY(-48deg);

  ${ScFaces}[data-variant="compass"] & {
    opacity: 1;
    transform: scale(1) rotateY(0deg);
    filter: blur(0px);
  }
`;

// --- Base del mascota: halo / corona / rayos / nucleo -----------------------

const ScMascot = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const haloGlow = keyframes`
  0%, 100% { opacity: 0.75; filter: blur(14px); }
  50% { opacity: 1; filter: blur(20px); }
`;

const ScHalo = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 165%;
  height: 165%;
  transform: translate(-50%, -50%);
  border-radius: ${({ theme }) => theme.data.radius.full};
  filter: blur(14px);
  background-image: radial-gradient(circle, ${mix(P100, 65)}, transparent 68%);

  @media ${MOTION_OK} {
    animation: ${haloGlow} 5.4s ease-in-out infinite;
  }
`;

const ScCoronaWrap = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 92%;
  height: 92%;
  transform: translate(-50%, -50%);
  border-radius: ${({ theme }) => theme.data.radius.full};
  box-shadow:
    0 0 30px 10px var(--glow-p-soft),
    0 0 54px 16px var(--glow-s-soft);
`;

const coronaMorph = keyframes`
  0% {
    border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;
    transform: rotate(0deg) scale(1);
  }
  25% {
    border-radius: 58% 42% 40% 60% / 55% 60% 40% 45%;
    transform: rotate(90deg) scale(1.05);
  }
  50% {
    border-radius: 40% 60% 55% 45% / 60% 38% 62% 40%;
    transform: rotate(180deg) scale(0.97);
  }
  75% {
    border-radius: 55% 45% 42% 58% / 42% 58% 44% 56%;
    transform: rotate(270deg) scale(1.04);
  }
  100% {
    border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;
    transform: rotate(360deg) scale(1);
  }
`;

const ScCorona = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;
  filter: blur(9px);
  background-image: conic-gradient(
    from 0deg,
    ${P200},
    ${S300} 25%,
    ${P300} 50%,
    ${S200} 75%,
    ${P200} 100%
  );

  @media ${MOTION_OK} {
    animation: ${coronaMorph} 20s ease-in-out infinite;
  }
`;

const raysSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const rayTwinkle = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const ScRays = styled.div`
  position: absolute;
  inset: 0;

  @media ${MOTION_OK} {
    animation: ${raysSpin} 70s linear infinite;
  }
`;

/* La rotacion y el retardo de cada rayo se calculan en el render (12 angulos,
   30deg de separacion); el color alterna aqui con nth-child para que el estilo
   en linea se quede en geometria y tiempo. */
const ScRay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 50%;
  border-radius: 3px;
  transform-origin: 50% 100%;
  filter: blur(1px);
  background-image: linear-gradient(to top, ${P300}, transparent);

  &:nth-child(even) {
    background-image: linear-gradient(to top, ${S300}, transparent);
  }

  @media ${MOTION_OK} {
    animation: ${rayTwinkle} 6s ease-in-out infinite;
  }
`;

const coreGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 20px 6px var(--glow-p-soft),
      0 0 50px 16px var(--glow-s-soft);
  }
  50% {
    box-shadow:
      0 0 30px 9px var(--glow-p-soft),
      0 0 68px 20px var(--glow-s-soft);
  }
`;

const ScCoreWrap = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(86% - 8px);
  height: calc(86% - 8px);
  transform: translate(-50%, -50%);
  border-radius: ${({ theme }) => theme.data.radius.full};
  box-shadow:
    0 0 20px 6px var(--glow-p-soft),
    0 0 50px 16px var(--glow-s-soft);

  @media ${MOTION_OK} {
    animation: ${coreGlow} 5.4s ease-in-out infinite;
  }
`;

const sweepSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ScCoreSweep = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: conic-gradient(
    from 0deg,
    ${P200},
    ${S300} 25%,
    ${P300} 50%,
    ${S200} 75%,
    ${P200} 100%
  );

  @media ${MOTION_OK} {
    animation: ${sweepSpin} 40s linear infinite;
  }
`;

const ScCore = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: radial-gradient(
    circle at 50% 46%,
    ${WHITE} 0%,
    ${WHITE} 16%,
    ${mix(WHITE, 70)} 38%,
    ${mix(WHITE, 25)} 58%,
    transparent 74%
  );
`;

// --- Destellos --------------------------------------------------------------

const sparkleTwinkle = keyframes`
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.35); }
`;

const ScSparkles = styled.div`
  position: absolute;
  inset: -12%;
`;

const ScSparkle = styled.span`
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-color: ${WHITE};
  box-shadow: 0 0 6px 1px ${WHITE};

  @media ${MOTION_OK} {
    animation: ${sparkleTwinkle} 3.4s ease-in-out infinite;
  }
`;

const sparkTwinkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const ScSparklesAura = styled.div`
  position: absolute;
  inset: -35%;
`;

const ScSpark = styled.span`
  position: absolute;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-color: ${WHITE};
  box-shadow: 0 0 5px 1px ${WHITE};
  opacity: 0;

  @media ${MOTION_OK} {
    animation: ${sparkTwinkle} 3.4s ease-in-out infinite;
  }
`;

// --- Extras de la cara brujula: rosa de los vientos + iris ------------------

const ScCompass = styled.div`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.data.radius.full};
  overflow: hidden;
`;

const clineBase = css`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: calc(100% + 8px);
  filter: blur(0.6px);
`;

const ScClinePrimary = styled.span`
  ${clineBase}
  background-image: linear-gradient(
    to bottom,
    transparent 4%,
    ${mix("var(--rose-primary)", 85)} 46%,
    ${mix("var(--rose-primary)", 85)} 54%,
    transparent 96%
  );
`;

const ScClineSecondary = styled.span`
  ${clineBase}
  background-image: linear-gradient(
    to bottom,
    transparent 4%,
    ${mix("var(--rose-secondary)", 85)} 46%,
    ${mix("var(--rose-secondary)", 85)} 54%,
    transparent 96%
  );
`;

const ScClineNeutral = styled.span`
  ${clineBase}
  width: 1.4px;
  background-image: linear-gradient(
    to bottom,
    transparent 26%,
    ${mix("var(--rose-neutral)", 34)} 47%,
    ${mix("var(--rose-neutral)", 34)} 53%,
    transparent 74%
  );
`;

const ScPupil = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 25%;
  height: 25%;
  transform: translate(-50%, -50%);
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: radial-gradient(
    circle at 35% 30%,
    ${mix(WHITE, 90)} 0%,
    ${mix(WHITE, 55)} 40%,
    transparent 85%
  );
  -webkit-backdrop-filter: blur(2.5px) saturate(160%);
  backdrop-filter: blur(2.5px) saturate(160%);
  border: 1px solid ${mix(WHITE, 65)};
  box-shadow:
    inset 0 -3px 5px var(--glow-p-40),
    inset 0 2px 3px ${mix(WHITE, 80)},
    0 1px 5px var(--glow-s-25);

  &::before {
    content: "";
    position: absolute;
    top: 14%;
    left: 18%;
    width: 38%;
    height: 30%;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background-color: ${mix(WHITE, 90)};
    filter: blur(0.5px);
  }
`;

/* La marca reflejada dentro del iris. Mismo atomo `Logo` compartido con
   Navbar y Wormhole (ver comentario de cabecera): solo se posiciona y se
   colorea, la figura no se redibuja aqui. Sin `title`, sigue siendo
   puramente `aria-hidden` (lo comprueba el test "es decoracion"). */
const ScPupilMark = styled(Logo)`
  position: absolute;
  top: 50%;
  left: 50%;
  /* La mitad del iris, que es la medida que tenia esta marca antes de
     extraerse al atomo Logo. Sin declararla, heredaba el 100% que
     GlobalStyles impone a todo svg y desbordaba la pupila. */
  width: 50%;
  height: auto;
  transform: translate(-50%, -50%);
  pointer-events: none;
  color: ${WHITE};
`;

const CLINE_BY_GROUP: Record<SolClineGroup, typeof ScClinePrimary> = {
  primary: ScClinePrimary,
  secondary: ScClineSecondary,
  neutral: ScClineNeutral,
};

interface MascotBaseProps {
  extraCore?: ReactNode;
  sparkles: ReactNode;
}

/* Halo/corona/rayos/nucleo son comunes a las dos caras: solo cambian el
   anadido del nucleo (rosa + iris) y la capa de destellos. */
function SolMascotBase({ extraCore, sparkles }: MascotBaseProps): ReactElement {
  return (
    <ScMascot>
      <ScHalo />
      <ScCoronaWrap>
        <ScCorona />
      </ScCoronaWrap>
      <ScRays>
        {SOL_RAY_ANGLES.map((deg, i) => (
          <ScRay
            key={deg}
            style={{
              transform: `translate(-50%, -100%) rotate(${deg}deg)`,
              animationDelay: `${-(i % 3) * 2}s`,
            }}
          />
        ))}
      </ScRays>
      <ScCoreWrap>
        <ScCoreSweep />
        <ScCore />
        {extraCore}
      </ScCoreWrap>
      {sparkles}
    </ScMascot>
  );
}

function SolFace(): ReactElement {
  return (
    <ScFaceSol data-face="sol">
      <SolMascotBase
        sparkles={
          <ScSparkles>
            {SOL_BASIC_SPARKS.map((s) => (
              <ScSparkle
                key={`${s.top}-${s.left}`}
                style={{
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </ScSparkles>
        }
      />
    </ScFaceSol>
  );
}

function SolCompassFace(): ReactElement {
  return (
    <ScFaceCompass data-face="compass">
      <SolMascotBase
        extraCore={
          <>
            <ScCompass>
              {SOL_CLINE_ANGLES.map((deg, i) => {
                const Cline = CLINE_BY_GROUP[SOL_CLINE_GROUPS[i]];
                return (
                  <Cline
                    key={deg}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                    }}
                  />
                );
              })}
            </ScCompass>
            <ScPupil>
              <ScPupilMark size="50%" />
            </ScPupil>
          </>
        }
        sparkles={
          <ScSparklesAura>
            {SOL_AURA_SPARKS.map((s) => (
              <ScSpark
                key={`${s.top}-${s.left}`}
                style={{
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  width: s.size,
                  height: s.size,
                  animationDuration: `${s.dur}s`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </ScSparklesAura>
        }
      />
    </ScFaceCompass>
  );
}

export interface SolProps {
  className?: string;
}

export function Sol({ className }: SolProps): ReactElement {
  const { variant, requestToggle } = useSolCycle();
  const { hitRef, tiltRef, spinRef, spinning } = useSolTiltSpin(requestToggle);

  return (
    <ScRoot
      className={className}
      aria-hidden="true"
    >
      <ScHit ref={hitRef}>
        <ScPulse>
          <ScTilt ref={tiltRef}>
            <ScSpin
              ref={spinRef}
              data-spinning={spinning ? "true" : "false"}
            >
              <ScFaces data-variant={variant}>
                <SolFace />
                <SolCompassFace />
              </ScFaces>
            </ScSpin>
          </ScTilt>
        </ScPulse>
      </ScHit>
    </ScRoot>
  );
}
