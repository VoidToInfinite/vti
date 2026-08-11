"use client";
import styled, { css, keyframes, type DataAttributes } from "styled-components";
import {
  HERO_FADE_MS,
  HERO_STEP_MS,
} from "@/components/sections/Hero/hero.transition";
import {
  AURA_ANCHOR_X,
  AURA_ASPECT,
  AURA_ORB,
  AURA_ORB_SIZE,
  AURA_STAGGER,
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
 * Escalon de cada pieza en el stagger del cruce de temas (HeroBackdrop,
 * tarea C1). Se deriva del propio atributo data-part que Aura.tsx YA pasa a
 * cada elemento -- "field", "handLeft", "handRight", "energy", "orb" son
 * exactamente las mismas cadenas que AURA_STAGGER -- en vez de un prop
 * nuevo que Aura.tsx tendria que reenviar explicitamente capa por capa:
 * Aura.tsx es intocable en esta tarea (ya paso su propia bateria de tests en
 * la fase B1), asi que leer el atributo que ya existe es el unico cable que
 * no exige tocarlo ni duplicar la logica de ScAuraLayer para sus tres usos
 * (mano izquierda, mano derecha, energia) con profundidades de escalon
 * distintas.
 *
 * "base" y "foot" no aparecen en AURA_STAGGER: comparten escalon con "field"
 * a proposito (spec S6.2.1, "el escalon 0 son DOS elementos con el mismo
 * retardo"; spec S6.4 para el pie: "le corresponde el escalon 0, el mismo
 * que base/field"). Los tres son el mismo instante visual -- el color plano
 * y la rampa violeta tienen que estar en cuanto aparece el lienzo pastel, o
 * habria un instante con pastel tocando la costura negra de Story -- asi que
 * se resuelven como sinonimos de "field" antes de buscar el indice.
 */
function auraStep(part: string | undefined): number {
  const key = part === "base" || part === "foot" ? "field" : part;
  const index = (AURA_STAGGER as readonly string[]).indexOf(key ?? "");
  return index === -1 ? 0 : index;
}

/*
 * El escalonado del cruce de temas, compartido por ScAuraBase, ScAuraField,
 * ScAuraLayer y ScOrbSlot -- las cuatro piezas que "aparecen"/"desaparecen"
 * en el stagger (spec S6.2.1). ScAuraSubject NO lo lleva (ver su propio
 * comentario, mas abajo): si el contenedor tambien animara su opacidad, el
 * efecto compuesto seria el PRODUCTO de las dos y la coreografia se
 * aplanaria en un unico fundido blando.
 *
 * opacity: 1 es el valor por DEFECTO, no 0: sin un ancestro con
 * [data-state="..."], <Aura/> se ve normal -- que es exactamente como la
 * monta su propio test (Aura.test.tsx), fuera de cualquier backdrop. Si el
 * defecto fuera 0, ese render se veria invisible sin que nada lo
 * distinguiera de un bug real.
 *
 * El selector es DESCENDIENTE ([data-state="..."] &), NO calificado
 * (&[data-state="..."]): el atributo data-state vive en el envoltorio del
 * stack que monta HeroBackdrop (ScAuraStack), no en el propio elemento --
 * mismo gotcha que documenta CLAUDE.md S5.1 y que ScShock, mas abajo, ya
 * resuelve igual.
 *
 * Al salir, el retardo se cuenta EN REVERSO: (longitud - 1 - paso) en vez de
 * paso. El campo (paso 0) es OPACO, asi que mientras siga visible tapa al
 * ojo que hay debajo; apagandolo el ultimo, la secuencia se lee como "el
 * mundo claro se desmonta pieza a pieza y solo entonces se disuelve el
 * propio lienzo, dejando ver el ojo" (spec S6.2).
 *
 * El guard de prefers-reduced-motion CUBRE LOS TRES ESTADOS, tambien
 * pending -- no solo active/leaving. Hasta la coreografia de carga nueva
 * (spec S7.2) esto era inofensivo: la carga montaba el stack directamente en
 * "active" y "pending" solo existia durante un cruce de temas ya en curso,
 * nunca en el primer render. Ahora la carga ARRANCA en "pending" y se queda
 * ahi hasta que resuelve la carrera de decode() de la imagen (hasta
 * HERO_DECODE_TIMEOUT_MS mas el margen de un frame, ver HeroBackdrop.tsx):
 * sin este guard, "opacity: 0" del bloque de pending de arriba deja el fondo
 * pastel invisible ese tramo bajo reduce, y como StageProvider bajo reduce
 * salta directo a "settled" el navbar y la copia ya son visibles -- el
 * usuario ve texto sobre el hueco desnudo del tema y luego un salto al
 * pastel, justo el destello que reduced-motion existe para evitar. Mismo
 * criterio que eyeStagger (eye.parts.tsx) ya aplica en su bloque final: las
 * dos composiciones tienen que tratar reduce igual, opacity: 1 en los tres
 * estados y sin transicion.
 */
function auraStagger(part: string | undefined) {
  const step = auraStep(part);
  return css`
    opacity: 1;

    [data-state="pending"] & {
      opacity: 0;
      transition: none;
    }

    [data-state="active"] & {
      opacity: 1;
      transition: opacity ${HERO_FADE_MS}ms
        ${({ theme }) => theme.data.motion.easing.decelerate};
      transition-delay: ${step * HERO_STEP_MS}ms;
    }

    [data-state="leaving"] & {
      opacity: 0;
      transition: opacity ${HERO_FADE_MS}ms
        ${({ theme }) => theme.data.motion.easing.decelerate};
      transition-delay: ${(AURA_STAGGER.length - 1 - step) * HERO_STEP_MS}ms;
    }

    @media (prefers-reduced-motion: reduce) {
      [data-state="active"] &,
      [data-state="leaving"] &,
      [data-state="pending"] & {
        opacity: 1;
        transition: none;
      }
    }

    /*
     * Fallback sin JavaScript (Task 10 del plan premium, 2026-08-11). Este
     * sitio es un export estatico: si el navegador no ejecuta scripts,
     * HeroBackdrop nunca corre su carrera de decode() y su envoltorio se
     * queda en data-state="pending" PARA SIEMPRE -- con la regla de arriba,
     * el fondo del hero entero invisible de forma permanente. La copia y el
     * navbar ya no dependen de JS desde esa misma tarea (sus intros pasaron
     * a @keyframes estaticas), asi que el fondo era la ultima pieza del hero
     * que faltaba por cubrir.
     *
     * El guard vive AQUI, dentro del mismo helper que declara la regla que
     * neutraliza, y no en un bloque global de GlobalStyles: asi tiene la
     * MISMA especificidad (0,2,0) que la regla de pending y gana por orden
     * de cascada, sin necesitar ningun !important, y solo alcanza a las
     * capas realmente escalonadas -- ScShock (el anillo del pulse, que
     * arranca a opacity 0 A PROPOSITO y nunca se dispara sin JS) no consume
     * auraStagger, asi que no lo toca. Un [data-part] generico desde
     * GlobalStyles si lo habria encendido de forma permanente.
     *
     * scripting: none es el feature que distingue exactamente este caso
     * (JS desactivado o no soportado); un navegador sin soporte del feature
     * ignora el bloque entero y se queda con el comportamiento de siempre.
     * Mismo criterio y mismo precedente que el bloque de [data-revealed] de
     * GlobalStyles.tsx.
     */
    @media (scripting: none) {
      [data-state="pending"] & {
        opacity: 1;
        transition: none;
      }
    }
  `;
}

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
export const ScAuraBase = styled.div<DataAttributes>`
  position: absolute;
  inset: 0;
  background-color: ${AURA_SURFACE};

  ${({ "data-part": part }) => auraStagger(part as string | undefined)}

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
export const ScAuraField = styled.img<DataAttributes>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;

  ${({ "data-part": part }) => auraStagger(part as string | undefined)}

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Marco del sujeto (manos, energia y orbe). Mide EXACTAMENTE el alto del
 * hero (height: 100%, el ancho lo fija aspect-ratio) y se ancla SOLO en X:
 * el eje Y no se desplaza, top: 0 siempre.
 *
 * La geometria del encuadre (marco anclado solo en X, sangra por
 * derecha/arriba/abajo sin recortar las manos) se reverifico por render con
 * la geometria del segundo lote de capas, en 5 relaciones de aspecto --
 * 16:9, 16:10, un 4:3 extremo -- con el centroide del orbe nuevo (spec
 * S15.6). La conclusion geometrica NO cambio, pero la RAZON por la que un
 * corte por la izquierda no se nota SI: la version anterior de este
 * comentario citaba que ese borde de la capa de energia era transparente
 * (spec S3.6, bordes de 05_energia_particulas.png). Medido de nuevo sobre
 * la capa nueva (01_nebulosa_particulas.png), esa propiedad YA NO EXISTE --
 * los cuatro bordes tienen alfa media similar y no trivial (~9-14%), sin
 * decaer hacia el interior, con particulas puntuales de hasta 90+/255 (spec
 * S15.6). Lo que resuelve ahora que el corte no se note es la mascara de
 * desvanecido declarada mas abajo, no una transparencia propia del arte.
 *
 * `left` coloca el punto AURA_ORB.x (50.92% del PROPIO marco) en
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
 *
 * Mascara de desvanecido en los 4 bordes (spec S15.6, problema nuevo del
 * segundo lote: la nebulosa ya no tiene un borde libre de alfa, ver arriba).
 * Dos linear-gradient (uno horizontal, uno vertical) combinados con
 * mask-composite: intersect / -webkit-mask-composite: source-in -- mismo
 * patron de declarar la forma con prefijo y sin prefijo que ya usa
 * ScCtaSecondary en Hero.tsx (el anillo animado del CTA secundario,
 * mask-composite: exclude / -webkit-mask-composite: xor), mismo motivo: el
 * soporte de mask-composite sin prefijo y el de -webkit-mask-composite (con
 * su valor legado) difiere entre motores. El 8% es un valor calibrado sobre
 * la evidencia (suficiente para que una particula de alfa~90/255 se
 * desvanezca en una distancia perceptible en vez de cortarse en seco), no
 * medido pixel a pixel -- igual que AURA_ORB_SIZE o el 32% de ScAuraFoot, se
 * documenta como aproximacion y se revisa contra el render real.
 *
 * Efecto colateral ACEPTADO, no un defecto: la mano derecha trae filamentos
 * de energia adheridos (spec S15.3) cuyo bbox llega al 99.9% del ancho del
 * arte (spec S15.6). El 8% de desvanecido del borde derecho difumina el
 * ultimo tramo de esos filamentos -- una hebra delgada, no la silueta de la
 * mano, que esta mas centrada -- asi que se apagan con gracia en vez de
 * cortarse en seco.
 */
export const ScAuraSubject = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  aspect-ratio: ${AURA_ASPECT};
  left: ${AURA_ANCHOR_X};
  translate: -${AURA_ORB.x} 0;

  mask-image:
    linear-gradient(
      to right,
      transparent 0%,
      #fff 8%,
      #fff 92%,
      transparent 100%
    ),
    linear-gradient(
      to bottom,
      transparent 0%,
      #fff 8%,
      #fff 92%,
      transparent 100%
    );
  mask-composite: intersect;
  -webkit-mask-image:
    linear-gradient(
      to right,
      transparent 0%,
      #fff 8%,
      #fff 92%,
      transparent 100%
    ),
    linear-gradient(
      to bottom,
      transparent 0%,
      #fff 8%,
      #fff 92%,
      transparent 100%
    );
  -webkit-mask-composite: source-in;

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
export const ScAuraLayer = styled.img<{ $moves: boolean } & DataAttributes>`
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

  ${({ "data-part": part }) => auraStagger(part as string | undefined)}

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
export const ScOrbSlot = styled.div<DataAttributes>`
  position: absolute;
  top: ${AURA_ORB.y};
  left: ${AURA_ORB.x};
  width: ${AURA_ORB_SIZE};
  aspect-ratio: 1;
  translate: -50% -50%;
  will-change: transform;

  ${({ "data-part": part }) => auraStagger(part as string | undefined)}

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

/*
 * Rampa de la costura Hero -> Story en tema claro (spec S6.4, REVISADA: la
 * seccion Story pasa a ser clara mas adelante, no siempre oscura como
 * asumia la version original de esta pieza). Vive DENTRO del stack de Aura,
 * no en Hero.tsx: asi entra y sale con el escalonado y el desmontaje de su
 * propio stack, sin un segundo temporizador que mantener en sincronia con
 * el del cruce de fondos. Comparte el escalon 0 con base/field (ver
 * auraStep, mas arriba): la rampa tiene que estar en cuanto aparece el
 * lienzo pastel.
 *
 * YA NO desciende hacia EYE_SURFACE (negro): asciende hacia
 * `theme.data.semantic.bg`, el fondo claro general del sistema -- el rol de
 * UI real que una seccion Story clara heredaria si adopta el tema estandar
 * en vez de un color propio. A diferencia de AURA_SURFACE (literal
 * decorativo, "espectaculo de marca"), este destino SI es un token: la
 * funcion de esta pieza es continuidad con la SIGUIENTE seccion real, no
 * decoracion de Aura. CONFIRMADO 2026-07-28 (spec landing-v2-secciones,
 * S3): la Story clara del rediseno no declara fondo propio -- se asienta
 * sobre el semantic.bg del sistema, exactamente el destino de esta rampa.
 * Lo que era la mejor suposicion documentada paso a ser el contrato: si
 * algun dia Story adopta un tono propio, esta rampa se recalibra.
 *
 * La PRIMERA parada usa AURA_SURFACE (el mismo tono medido del campo) con
 * alfa 0, NO `transparent`: la palabra clave interpola desde negro y el
 * tramo inicial oscureceria antes de aclarar -- misma excepcion que ya
 * documentaba la version oscura de esta pieza (y la leccion del velo de
 * continuidad, task/lessons.md 2026-07-25), aplicada en el sentido
 * contrario. Se deriva de la propia constante (`AURA_SURFACE.slice(0, -1)`)
 * en vez de repetir el literal, para que un cambio en AURA_SURFACE no deje
 * dos valores desincronizados en el mismo archivo.
 *
 * Contrato de monotonia INVERTIDO respecto a la version anterior: la
 * luminancia compuesta sobre el peor caso ahora tiene que ser
 * ESTRICTAMENTE CRECIENTE (peor caso = fondo NEGRO, no blanco: es el que
 * minimiza la luminancia compuesta en cada parada, asi que si crece incluso
 * ahi, crece bajo cualquier fondo real). Verificado con la misma aritmetica
 * que `contrast.ts`: 0 -> 0.3999 -> 0.7605 -> 0.9557.
 *
 * El 32% es una PROPORCION del alto del hero, no un token de `space` (que
 * llega a 8rem como maximo): aqui hay que salvar toda la distancia de un
 * pastel a un fondo claro sobre un lienzo de altura de viewport. Se
 * documenta como excepcion, igual que los clamp() literales del titular
 * (Hero.tsx).
 */
export const ScAuraFoot = styled.div<DataAttributes>`
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  height: 32%;
  pointer-events: none;
  background-image: linear-gradient(
    to bottom,
    ${AURA_SURFACE.slice(0, -1)} / 0) 0%,
    oklch(0.93 0.035 285 / 0.5) 50%,
    oklch(0.965 0.02 285 / 0.85) 82%,
    ${({ theme }) => theme.data.semantic.bg} 100%
  );

  ${({ "data-part": part }) => auraStagger(part as string | undefined)}

  @media (forced-colors: active) {
    display: none;
  }
`;
