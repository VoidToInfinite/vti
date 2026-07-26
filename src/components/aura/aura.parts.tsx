"use client";
import styled, { css, keyframes } from "styled-components";
import {
  AURA_ANCHOR_X,
  AURA_ASPECT,
  AURA_ORB,
  AURA_ORB_SIZE,
  AURA_SURFACE,
} from "./aura.layers";

/*
 * Excepcion sancionada del sistema (la misma que documenta eye.parts.tsx y
 * BackOrbs, ver src/components/layout/BackOrbs/BackOrbs.tsx): Aura es
 * aria-hidden, puramente decorativa -- sus colores son espectaculo de marca,
 * no roles de UI. AURA_SURFACE (el pastel medido del arte original) es un
 * literal fijo, no theme.data.semantic.*: un rol semantico cambiaria con el
 * tema, y esta composicion SOLO se monta en tema claro por diseno, asi que
 * un token que resolviera distinto en oscuro no aportaria nada.
 */

/*
 * Socket de Aura. El aislamiento (isolation: isolate) va AQUI, no en el
 * marco del sujeto: el campo a sangre y el sujeto tienen que componerse
 * dentro del MISMO grupo de blending (spec S4.3). Sin este aislamiento, el
 * plus-lighter del ojo se sumaria contra las capas pastel de este stack
 * durante el cruce de temas y el aditivo se desbordaria fuera de su grupo.
 *
 * NO lleva background-color. El color plano de AURA_SURFACE lo pinta
 * ScAuraBase, que es un escalon MAS de la transicion con el mismo retardo
 * que la imagen field: si el color viviera aqui, en el socket, el hero
 * saltaria a pastel de golpe al montar el stack, antes de que la transicion
 * (tarea C1) hubiera arrancado.
 */
export const ScAuraSocket = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Escalon 0 de la transicion, en color plano: lo que se ve antes de que el
 * WebP de la capa field termine de decodificar. Mismo AURA_SURFACE que el
 * color medio del campo, asi que el paso de este rectangulo a la imagen es
 * invisible en vez de un salto de color.
 */
export const ScAuraBase = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${AURA_SURFACE};

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Campo de fondo, a sangre sobre el socket entero (no dentro del marco del
 * sujeto): es un degradado difuso, asi que estirarlo con object-fit: cover
 * es invisible y garantiza que no quede un solo pixel del hero sin cubrir,
 * sea cual sea la relacion de aspecto del viewport (spec S5.2).
 */
export const ScAuraField = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Marco del sujeto (manos, energia y orbe). Mide EXACTAMENTE el alto del
 * hero (height: 100%, el ancho lo fija aspect-ratio) y se ancla SOLO en X:
 * la geometria medida (spec S3.6, bordes de 05_energia_particulas.png)
 * demuestra que es el encuadre de menor magnificacion que sangra por
 * derecha/arriba/abajo sin recortar las manos -- el eje Y no se desplaza,
 * top: 0 siempre.
 *
 * `left` coloca el punto AURA_ORB.x (50.14% del PROPIO marco) en
 * AURA_ANCHOR_X (69.28% del HERO): `translate` en porcentaje resuelve
 * contra el propio elemento, no contra el padre, asi que estas dos lineas
 * juntas fijan ese anclaje sea cual sea el tamano del viewport, sin una
 * sola media query de cobertura (spec S5.2.1).
 *
 * NO declara `width`: la fija `aspect-ratio` a partir de `height: 100%`.
 *
 * Usa la propiedad independiente `translate`, NUNCA `transform`: esa la
 * escribe el rAF del parallax (useParallaxLayers) en cada frame, y si el
 * anclaje viviera en transform cada frame lo sobrescribiria y el marco
 * saltaria a la esquina superior izquierda. Mismo motivo que documenta
 * eye.parts.tsx (ScMascotSlot) para la mascota del ojo.
 *
 * En vertical (max-aspect-ratio: 1/1) el encuadre por altura dejaria el
 * marco 1.78 veces mas ancho que el hero y las manos fuera de pantalla: se
 * vuelve al encuadre por ancho, mismo recurso que usa ScFrame del ojo.
 */
export const ScAuraSubject = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  aspect-ratio: ${AURA_ASPECT};
  left: ${AURA_ANCHOR_X};
  translate: -${AURA_ORB.x} 0;

  @media (max-aspect-ratio: 1 / 1) {
    height: auto;
    width: 185%;
    top: ${AURA_ORB.y};
    left: 50%;
    translate: -${AURA_ORB.x} -${AURA_ORB.y};
  }
`;

/*
 * Valor CSS por defecto (normal / source-over) que deben computar todas las
 * imagenes de Aura: ninguna declara mix-blend-mode, asi que en un navegador
 * real el valor inicial de la propiedad ya es este. jsdom no sintetiza el
 * valor inicial de una propiedad nunca declarada y devuelve cadena vacia en
 * su lugar (medido en este repo: un styled.img sin mix-blend-mode computa
 * "", no "normal"); Aura.test.tsx compensa esa diferencia de entorno
 * comparando contra esta constante en vez de escribir el string a mano. El
 * fallback NO es tautologico: si una capa declarara `mix-blend-mode: screen`,
 * getComputedStyle devolveria "screen" (valor no vacio, el `||` no lo pisa) y
 * la comparacion contra esta constante fallaria (verificado en este repo).
 */
export const AURA_LAYER_BLEND_MODE = "normal";

/*
 * Una capa dentro del marco del sujeto (mano izquierda, mano derecha,
 * energia). SIN mix-blend-mode a proposito: el modelo de composicion de
 * Aura es source-over / alfa normal, medido en aura.layers.ts (recomposicion
 * vs referencia: media 0.49/255, maximo 1/255). Copiar aqui el aditivo del
 * ojo (mix-blend-mode: plus-lighter/screen) no seria una mejora sino un bug:
 * estas mascaras se extrajeron bajo la condicion CONTRARIA a las del ojo, y
 * un blending aditivo las sobreexpondria y ensuciaria los bordes con
 * feathering.
 */
export const ScAuraLayer = styled.img<{ $moves: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;

  ${({ $moves }) =>
    $moves &&
    css`
      will-change: transform;
    `}

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Hueco del orbe: cuadrado de lado AURA_ORB_SIZE centrado en AURA_ORB, el
 * mismo punto medido del arte que ancla el marco del sujeto -- asi que el
 * slot y el resto de la composicion comparten eje.
 *
 * El centrado usa la propiedad independiente `translate`, no `transform`,
 * por el mismo motivo que ScAuraSubject: `transform` la escribe el rAF del
 * parallax (useParallaxLayers) frame a frame, y si el centrado viviera ahi
 * cada frame lo sobrescribiria y el slot saltaria al vertice superior
 * izquierdo.
 */
export const ScOrbSlot = styled.div`
  position: absolute;
  top: ${AURA_ORB.y};
  left: ${AURA_ORB.x};
  width: ${AURA_ORB_SIZE};
  aspect-ratio: 1;
  translate: -50% -50%;
  will-change: transform;

  @media (forced-colors: active) {
    display: none;
  }
`;

const shock = keyframes`
  0% {
    opacity: 0.55;
    transform: scale(0.55);
  }
  100% {
    opacity: 0;
    transform: scale(1.9);
  }
`;

/*
 * Onda de "pulse" (mudada tal cual desde eye.parts.tsx, misma coreografia):
 * anillo centrado en el orbe que se expande y decae al hacer click/tap sobre
 * el hero. El estado (data-pulsing) se marca en ScAuraSocket -- el elemento
 * que recibe el pointerdown -- mientras que el anillo vive dentro de
 * ScAuraSubject. Por eso el disparador usa el selector DESCENDIENTE
 * [data-pulsing="true"] & y no &[data-pulsing="true"]: este ultimo solo
 * matchearia si el atributo estuviera en el propio elemento (mismo gotcha
 * que CLAUDE.md S5.1 documenta). El mismo selector calificado se repite
 * dentro de prefers-reduced-motion para que la desactivacion gane por
 * especificidad igual + orden de cascada.
 *
 * El centrado usa la propiedad independiente `translate`, no `transform`:
 * asi la animacion puede escribir transform: scale() sin tener que repetir
 * translate(-50%, -50%) en cada keyframe.
 */
export const ScShock = styled.div`
  position: absolute;
  top: ${AURA_ORB.y};
  left: ${AURA_ORB.x};
  width: ${AURA_ORB_SIZE};
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 2px solid oklch(0.92 0.04 250 / 0.7);
  opacity: 0;
  pointer-events: none;

  [data-pulsing="true"] & {
    animation: ${shock} ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.accelerate};
  }

  @media (prefers-reduced-motion: reduce) {
    [data-pulsing="true"] & {
      animation: none;
    }
  }

  @media (forced-colors: active) {
    display: none;
  }
`;
