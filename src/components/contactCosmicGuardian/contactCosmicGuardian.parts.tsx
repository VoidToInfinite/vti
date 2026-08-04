"use client";
import styled from "styled-components";
import {
  CONTACT_GUARDIAN_FOCUS_Y,
  CONTACT_GUARDIAN_OVERSCAN,
  CONTACT_GUARDIAN_VOID,
  type ContactCosmicGuardianLayer,
} from "./contactCosmicGuardian.layers";

/* Marco de la escena. `isolation: isolate` la convierte en el grupo de
   blending: `03-polvo` usa `mix-blend-mode: screen` (ver `ScLayer` mas
   abajo) y sin aislar el grupo ese screen se mezclaria contra lo que hubiera
   DETRAS de la seccion en el documento, no solo contra las otras dos capas
   de esta escena. `overflow: hidden` recorta el overscan. */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
`;

/* Negro-violeta de base, literal del kit. Pinta poco: `01-fondo` es opaca y
   lo tapa entero; se ve mientras esa capa todavia no ha cargado -- va en
   `loading="lazy"` -- y es el tope de color de `ScVignette`. */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${CONTACT_GUARDIAN_VOID};
`;

/*
 * Encuadre vertical anclado por ARRIBA (D5 de la spec de navegacion fluida;
 * razonamiento completo, con el origen del numero y el coste aceptado, en
 * el docblock de `CONTACT_GUARDIAN_FOCUS_Y`, `contactCosmicGuardian.layers.ts`).
 * `object-position: 50% CONTACT_GUARDIAN_FOCUS_Y` (0%) hace que la franja
 * visible del lienzo por `object-fit: cover` arranque siempre en el borde
 * superior en vez de centrarse: sin esto, en cuanto la ventana es mas
 * apaisada que ~1,83 el encuadre centrado le corta la cabeza a la figura.
 *
 * `transform-origin: 50% 0%` es IMPRESCINDIBLE, no cosmetico: sin el, el
 * scale del overscan (CONTACT_GUARDIAN_OVERSCAN) se reparte por defecto
 * alrededor del CENTRO del elemento, y eso vuelve a comerse un margen por
 * ARRIBA -- deshaciendo justo lo que object-position acaba de ganar. Con el
 * origen de la escala en el borde superior, el overscan crece unicamente
 * hacia abajo: el punto y=0% que fija object-position se queda anclado tras
 * aplicar el scale, en vez de desplazarse hacia el centro del elemento.
 *
 * Una capa, con blending POR CAPA en vez de uniforme -- primera escena del
 * repo que lo necesita (manifest, `compositing.css`). Se resuelve con una
 * prop transitoria `$blend` en vez de un segundo styled (`ScLayerScreen`)
 * porque las tres capas comparten TODO lo demas (posicion, tamano, overscan,
 * `will-change`) y la unica diferencia real es una sola propiedad CSS: un
 * segundo styled duplicaria ese bloque entero para una linea de diferencia,
 * y `ContactCosmicGuardian.tsx` tendria que elegir entre dos componentes por
 * `part` en vez de leer el dato de la tabla. `$` la marca transitoria
 * (styled-components v6) para que NO llegue al DOM como atributo
 * `blend="normal"` en el `<img>`.
 *
 * `01-fondo` y `02-figura` van en `"normal"`: para esas dos capas la
 * declaracion se OMITE del todo (no se emite `mix-blend-mode: normal`),
 * porque `"normal"` es el valor inicial de la propiedad y declararlo no
 * describe ninguna decision -- es la misma disciplina que
 * `featuresCelestialOrbital.parts.tsx` aplica a sus siete capas, que
 * tampoco declaran la propiedad. Solo `"screen"` se traduce en CSS real.
 * Aplicar `screen` al fondo opaco lo lavaria por completo -- es RGB sin
 * alfa, y `screen` sobre una capa opaca sin nada oscuro debajo aclara el
 * resultado sin remedio.
 */
export const ScLayer = styled.img<{
  readonly $blend: ContactCosmicGuardianLayer["blend"];
}>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% ${CONTACT_GUARDIAN_FOCUS_Y};
  pointer-events: none;
  user-select: none;
  transform: scale(${CONTACT_GUARDIAN_OVERSCAN});
  transform-origin: 50% 0%;
  will-change: transform;
  ${({ $blend }) => ($blend === "screen" ? "mix-blend-mode: screen;" : "")}
`;

/*
 * Vineta de legibilidad: oscurece la escena bajo el texto de la seccion. Va
 * DENTRO de `ScScene` y detras del contenido, despues de las tres capas.
 *
 * Tiene DOS regimenes -- porta la estructura que la escena saliente estreno
 * el 2026-08-03 -- porque el contenido de `Contact.tsx` tiene dos: cuando la
 * copia y el formulario van recogidos y topados a un lado, basta con
 * oscurecer ESE lado; cuando se apilan a ancho completo, el texto pasa por
 * ENCIMA de la figura y ningun tope de ancho puede ayudar, asi que el velo
 * sube sobre todo el encuadre. En un viewport estrecho la escena esta muy
 * ampliada por el `cover`, asi que subir el velo ahi no cuesta composicion
 * perceptible.
 *
 * EL CORTE ENTRE LOS DOS REGIMENES ES `lg`, NO `md`, y eso es una correccion
 * medida sobre la entrega anterior. El corte en `md` (768px) daba por hecho
 * que a partir de ahi el contenido ya estaba recogido a un lado, y es falso:
 * las dos columnas solo dejan de apilarse cuando el contenido mide al menos
 * `320 + 380 + 48 = 748px`, y con el tope de `58vw` eso no ocurre hasta
 * pasados los ~1290px de viewport. Entre 768 y 992 el contenido sigue
 * apilado y a ancho completo mientras el velo lateral ya se habia retirado.
 * MEDIDO a 768x900, que es justo donde el `cover` amplia mas el arte: el
 * peor pixel bajo el kicker daba **1.83:1** -- por debajo incluso de AA.
 * Con el corte en `lg` ese mismo punto vuelve al regimen de velo completo.
 *
 * La parada del regimen ancho es `66%`, no `60%`: el contenido ocupa hasta
 * `58vw` mas el padding del marco, o sea ~61% del ancho, asi que con la
 * parada en 60% el ultimo tramo del contenido se quedaba sin velo. Con 66%
 * el velo cubre la banda del contenido entera y se apaga justo donde
 * empieza la masa luminosa de la figura (medida: arranca en el 65% del
 * ancho a 1440, en el 67% a 1200 y en el 69% a 992), asi que no la vela.
 *
 * Va ESPEJADA respecto a la escena saliente: alli la figura y los orbes
 * quedaban a la izquierda del encuadre y el contenido se superponia a la
 * derecha, asi que el regimen ancho oscurecia la derecha (`to left`). Aqui
 * la figura ocupa la mitad DERECHA del lienzo (60.71%-83.74% del ancho,
 * manifest `geometry.figureSide`) y el vacio queda a la izquierda, asi que
 * el contenido de la seccion se muda al lado izquierdo y el regimen ancho
 * tiene que oscurecer la IZQUIERDA: `to right`, no `to left`. El regimen
 * estrecho (`to top`) no cambia de lado -- sigue oscureciendo la banda
 * inferior igual que en la escena saliente, porque esa banda no depende de
 * donde este la figura.
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to top,
    ${CONTACT_GUARDIAN_VOID}f7 0%,
    ${CONTACT_GUARDIAN_VOID}e6 55%,
    ${CONTACT_GUARDIAN_VOID}bf 100%
  );

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    background:
      linear-gradient(
        to right,
        ${CONTACT_GUARDIAN_VOID}f2 0%,
        ${CONTACT_GUARDIAN_VOID}00 66%
      ),
      linear-gradient(
        to top,
        ${CONTACT_GUARDIAN_VOID}f2 0%,
        ${CONTACT_GUARDIAN_VOID}00 45%
      );
  }
`;
