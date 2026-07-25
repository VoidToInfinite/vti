"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { ThemeProvider } from "styled-components";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { useReveal } from "@/hooks/useReveal";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { SceneLoader } from "@/three/SceneLoader";
import { Typography } from "@/components/ui/Typography/Typography";
import { basicDarkTheme } from "@/theme/themes";

/*
 * Story es una superficie SIEMPRE oscura, por el mismo motivo que el hero.
 *
 * Correccion factual de partida: NO es cierto que Story "arranque sin fondo
 * propio y se vea el semantic.bg del tema". SceneLoader monta un poster opaco
 * con position absolute e inset 0 (SceneLoader.tsx:37-56, cuyo ultimo radial
 * cierra en oklch(0.05 0.012 288) al 78%) y, cuando hay WebGL, la escena del
 * Descenso encima. Lo que se ve detras de la copia es ese poster oscuro, en
 * los dos temas de pagina.
 *
 * El problema real es el contrario: en tema claro semantic.text resuelve a
 * casi negro (medido en navegador: oklch(0.32 0 286)) y la copia desaparece
 * sobre ese poster. Es el ultimo item abierto de la seccion 7 de
 * docs/qa-3d-pendiente.md. Se resuelve con el mismo patron que el hero:
 * ThemeProvider anidado con el tema oscuro, para que TODO token dentro de la
 * seccion (texto, anillo de foco, futuros enlaces) resuelva al valor disenado
 * para fondo oscuro, en vez de fijar colores literales elemento a elemento.
 *
 * La identidad del objeto es estable a proposito (constante de modulo, no un
 * literal en el render): un objeto nuevo por render invalidaria el contexto de
 * styled-components y re-renderizaria el subarbol entero -- SceneLoader y el
 * canvas de Three.js incluidos -- en cada render de Story.
 *
 * El ThemeProvider envuelve a ScStory DESDE FUERA (verificado que Scene.tsx no
 * lee theme.name ni theme.isLight, solo motion.duration/easing), asi que el
 * propio background-color de la seccion resuelve al semantic.bg oscuro en los
 * dos temas de pagina. La costura NO interpola hacia ese color (termina en alfa
 * 0), pero es la superficie que asoma bajo ella alli donde no hay poster ni
 * canvas: si en tema claro fuera casi blanca, la rampa acabaria en un salto.
 */
const storyTheme = { data: basicDarkTheme };

const ScStory = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  overflow: hidden;
  background-color: ${({ theme }) => theme.data.semantic.bg};
`;

/*
 * Costura Hero -> Story. Un velo NEGRO que se retira hacia abajo: arranca en el
 * MISMO negro que pinta la superficie del hero (EYE_SURFACE, importado de la
 * capa de datos del ojo, no un literal reescrito) y termina en alfa 0.
 *
 * Lo que se ve compuesto es L(p) = p x lo-que-Story-pinte-debajo: en el borde
 * superior el pixel es exactamente el negro del hero, y a partir de ahi el
 * poster (o la escena viva, o el semantic.bg de la seccion) aparece de forma
 * ESTRICTAMENTE MONOTONA. La costura solo puede oscurecer; no aporta luz en
 * ningun punto de la rampa.
 *
 * Historia, porque la version anterior fallaba justo aqui y la correccion es el
 * motivo de este comentario: el degradado iba de EYE_SURFACE a semantic.bg
 * (oklch(0.22 0.004 286)) con una mascara que mantenia alfa 1 hasta el 45%. Ese
 * primer 45% se pintaba OPACO con un gris que subia hasta ~L 0.10, MAS CLARO
 * que el borde superior del poster (~L 0.05): un realce justo debajo de la
 * junta, es decir el mismo artefacto que la mascara decia eliminar, y ademas
 * una discontinuidad de pendiente de la alfa en el 45% (candidata a banda de
 * Mach). Se sustituye por una sola declaracion monotona.
 *
 * La parada final es la palabra clave transparent y no un literal oklch con
 * alfa 0: EYE_SURFACE es negro, asi que transparent (rgb(0 0 0 / 0)) es su
 * MISMO color con alfa 0 y la rampa se mantiene negra interpole el motor con
 * alfa premultiplicada o sin ella. Escribir el literal aqui volveria a
 * duplicar el negro de marca en un segundo archivo, que es justo lo que
 * EYE_SURFACE existe para evitar.
 *
 * Va DESPUES de SceneLoader y ANTES de ScContent, con el mismo z-index base:
 * entre hermanos de igual z-index gana el ultimo del DOM, asi que tapa el
 * poster y el canvas y nunca puede tapar el contenido, que vive en raised.
 *
 * Sin JS y sin mask-image: ni listener de scroll, ni rAF, ni assets, ni
 * propiedades con prefijo de fabricante. Es CSS estatico de una sola
 * declaracion, presente en el primer pintado e identico con poster, con escena
 * viva o sin WebGL.
 *
 * Rampa total atravesando la junta: 4rem del pie del hero + 6rem de esta
 * costura = 10rem.
 */
const ScSeam = styled.div`
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: ${({ theme }) => theme.data.space[9]};
  z-index: ${({ theme }) => theme.data.zIndex.base};
  pointer-events: none;
  background-image: linear-gradient(
    to bottom,
    ${EYE_SURFACE} 0%,
    transparent 100%
  );

  @media (forced-colors: active) {
    display: none;
  }
`;

/* Section reveal (spec §9): una idea a la vez. Solo transform/opacity. */
const ScContent = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[4]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  text-align: center;
  opacity: 0;
  transform: translateY(12px);
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

export function Story(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  const { ref: sectionRef, progress } = useScrollProgress();

  return (
    <ThemeProvider theme={storyTheme}>
      <ScStory
        id="story"
        ref={sectionRef}
        aria-labelledby="story-title"
      >
        <SceneLoader progress={progress} />
        <ScSeam
          aria-hidden="true"
          data-testid="story-continuity"
        />
        <ScContent
          ref={revealRef}
          data-revealed={revealed}
        >
          <Typography
            variant="h2"
            id="story-title"
          >
            {t("Home.story.title")}
          </Typography>
          <Typography variant="lead">{t("Home.story.body")}</Typography>
          <Typography variant="body">{t("Home.story.additional")}</Typography>
        </ScContent>
      </ScStory>
    </ThemeProvider>
  );
}
