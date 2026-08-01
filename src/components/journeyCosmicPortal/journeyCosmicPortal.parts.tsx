"use client";
import styled from "styled-components";
import {
  JOURNEY_PORTAL_OVERSCAN,
  JOURNEY_PORTAL_VOID,
} from "./journeyCosmicPortal.layers";

/*
 * Marco de la escena. A diferencia de `ScScene` en
 * `storyCosmicBeing.parts.tsx` (y de la escena aditiva que vivia antes en
 * esta seccion) NO lleva `isolation: isolate`: alli existia para contener el
 * grupo de blending, porque sin el un `plus-lighter` se habria sumado contra
 * el fondo de la pagina y habria desbordado luz fuera de la seccion. Estas
 * seis capas se componen con alpha NORMAL, no tienen blending que aislar, y
 * declarar la propiedad "por si acaso" seria una linea que ya no explica
 * nada. `overflow: hidden` si hace falta: recorta el overscan.
 */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

/*
 * Negro-violeta de base. Aqui pinta menos que en las escenas aditivas
 * (`01-background` es opaca y lo tapa entero): se ve mientras esa capa
 * todavia no ha cargado -- va en `loading="lazy"` -- y es el tope de color de
 * `ScVignette`.
 */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${JOURNEY_PORTAL_VOID};
`;

/*
 * Una capa. Sin `mix-blend-mode`: el paquete guarda el color
 * DESPREMULTIPLICADO precisamente para componer con alpha normal, y sumarlas
 * en aditivo las lavaria (ver el docblock de cabecera de
 * `journeyCosmicPortal.layers.ts`). El parallax lo escribe el rAF de
 * `useSceneParallax` sobre `transform`, en este mismo elemento.
 */
export const ScLayer = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${JOURNEY_PORTAL_OVERSCAN});
  will-change: transform;
`;

/*
 * Viñeta de legibilidad: oscurece la escena bajo el texto de la seccion. Va
 * DENTRO de `ScScene` y detras del contenido, despues de las seis capas.
 * En las escenas aditivas esa posicion es delicada (heredar un grupo de
 * blending puede hacer que el aditivo se coma la viñeta en vez de
 * oscurecerse); aqui no hay grupo de blending que heredar y la viñeta se
 * compone normal sobre las capas, sin mas. Tope opaco = MISMO literal que
 * `ScVoid` (continuidad de color).
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to right,
      ${JOURNEY_PORTAL_VOID}f2 0%,
      ${JOURNEY_PORTAL_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${JOURNEY_PORTAL_VOID}f2 0%,
      ${JOURNEY_PORTAL_VOID}00 45%
    );
`;
