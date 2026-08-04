"use client";
import styled from "styled-components";
import {
  FEATURES_ORBITAL_OVERSCAN,
  FEATURES_ORBITAL_VOID,
} from "./featuresCelestialOrbital.layers";

/*
 * Marco de la escena. A diferencia de `ScScene` en
 * `featuresCelestialGuide.parts.tsx` (la escena saliente, aditiva) NO lleva
 * `isolation: isolate`: alli existia para contener el grupo de blending,
 * porque sin el un `plus-lighter` se habria sumado contra el fondo de la
 * pagina y habria desbordado luz fuera de la seccion. Estas siete capas se
 * componen con alpha NORMAL, no tienen blending que aislar, y declarar la
 * propiedad "por si acaso" seria una linea que ya no explica nada — mismo
 * caso que `ScScene` de `journeyCosmicPortal.parts.tsx`. `overflow: hidden`
 * si hace falta: recorta el overscan.
 */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

/*
 * Negro-violeta de base. Aqui pinta menos que en la escena aditiva saliente
 * (`01-fondo` es opaca y lo tapa entero): se ve mientras esa capa todavia no
 * ha cargado -- va en `loading="lazy"` -- y es el tope de color de
 * `ScVignette`.
 */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${FEATURES_ORBITAL_VOID};
`;

/*
 * Una capa. NINGUN `mix-blend-mode`: es el punto que un copia-pega desde
 * `featuresCelestialGuide.parts.tsx` (la escena saliente, `plus-lighter` +
 * fallback `screen`) romperia. El paquete guarda el color DESPREMULTIPLICADO
 * precisamente para componer con alpha normal, y sumarlas en aditivo las
 * lavaria (ver el docblock de cabecera de
 * `featuresCelestialOrbital.layers.ts`). El parallax lo escribe el rAF de
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
  transform: scale(${FEATURES_ORBITAL_OVERSCAN});
  will-change: transform;
`;

/*
 * Viñeta de legibilidad: oscurece la escena bajo el texto de la seccion. Va
 * DENTRO de `ScScene` y detras del contenido, despues de las siete capas.
 * Mismo gradiente doble que `featuresCelestialGuide.parts.tsx` (`to left` +
 * `to top`): el vacio del arte nuevo tambien vive a la DERECHA del encuadre
 * (figura y orbita quedan a la izquierda), asi que el gradiente principal
 * sigue corriendo al reves que en Story/Journey para oscurecer la derecha,
 * donde se superpone el contenido de `Features.tsx`. Tope opaco = MISMO
 * literal que `ScVoid`.
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to left,
      ${FEATURES_ORBITAL_VOID}f2 0%,
      ${FEATURES_ORBITAL_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${FEATURES_ORBITAL_VOID}f2 0%,
      ${FEATURES_ORBITAL_VOID}00 45%
    );
`;
