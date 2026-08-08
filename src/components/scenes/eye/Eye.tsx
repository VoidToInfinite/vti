"use client";
import {
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import {
  useParallaxLayers,
  type ParallaxTarget,
} from "@/hooks/useParallaxLayers";
import { EYE_LAYERS, EYE_MASCOT_DEPTH, EYE_SIZES } from "./eye.layers";
import { ScFrame, ScLayer, ScMascotSlot, ScScrim, ScSocket } from "./eye.parts";
import { Wormhole } from "./mascots/Wormhole";

/** Amplitud del parallax en px a profundidad 1. Cada capa la escala por su
 *  `depth`: el parpado (0.25) se mueve 6px y la pupila (0.85) 22px, y esa
 *  diferencia es lo que produce la sensacion de profundidad (spec §7). La
 *  amplitud vertical es menor porque el lienzo es apaisado: el mismo
 *  desplazamiento se lee mas fuerte en el eje corto. */
const AMP = { x: 26, y: 15 } as const;

export interface EyeProps {
  className?: string;
}

/**
 * El ojo cosmico del hero: la composicion OSCURA, montada como pila de capas
 * WebP con blending aditivo (la particion documentada en
 * `assets/hero-eye/manifest.json`), no como aproximacion en CSS. Es solo una
 * de las dos composiciones del hero -- la clara ("Aura", manos y orbe
 * pastel) vive en su propio componente, no en una rama de este.
 *
 * Sobre la pila, dos movimientos: parallax 2.5D siguiendo al cursor -- via
 * `useParallaxLayers`, compartido con Aura, cero re-render por frame (spec
 * §13) -- y una onda de pulso al click/tap. La corona respira por animacion
 * CSS (`ScLayer`), no por rAF, para que tambien tenga vida en tactil donde el
 * seguimiento del cursor no aplica.
 *
 * Todo el subarbol es decorativo (`aria-hidden="true"`): nada de lo que
 * comunica el ojo vive solo aqui -- la marca que ocupa la pupila es el `<h1>`
 * real del Hero, y las imagenes van con `alt=""`.
 */
export function Eye({ className }: EyeProps): ReactElement {
  // Refs individuales por capa, no un callback-ref con un array compartido:
  // `useParallaxLayers` pide un `RefObject` por objetivo, y crear uno con
  // `useRef` dentro de un `.map()` violaria las reglas de hooks. `useMemo`
  // (memoizado UNA sola vez, deps `[]`) da un array de identidad estable sin
  // pasar por `.current` de un ref contenedor: leer `.current` fuera de un
  // efecto o de la inicializacion perezosa oficial rompe `react-hooks/refs`
  // (el lint del React Compiler), y aqui hace falta usar el array durante el
  // propio render (JSX + la lista de `targets`).
  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => EYE_LAYERS.map(() => ({ current: null })),
    [],
  );
  const mascot = useRef<HTMLDivElement>(null);
  // Raiz de la composicion para la guarda de visibilidad de D3 (spec
  // 2026-08-04): useRef, NUNCA un callback-ref ni un objeto creado inline en
  // el render -- el hook lo usa como dependencia de su efecto (linea final
  // del array de deps de useParallaxLayers), y un objeto nuevo en cada
  // render lo re-suscribiria en cada setState (leccion task/lessons.md
  // 2026-07-31, la misma razon por la que layerRefs usa useMemo con deps []
  // en vez de recrearse). Se ata a ScSocket -- el elemento que ya envuelve
  // toda la composicion, y el mismo que hoy recibe el pointerdown del pulso
  // -- sin envolver nada en un div nuevo: un envoltorio adicional crearia un
  // contexto de apilamiento propio y aislaria el `plus-lighter`/`screen` de
  // las capas (ScFrame ya es el grupo de blending via `isolation: isolate`,
  // y ScSocket vive un nivel por ENCIMA de ese grupo, asi que anadirle un
  // ref no lo toca).
  const sceneRef = useRef<HTMLDivElement>(null);
  // Onda de "pulse" al click/tap (spec §12). Estado de React, no rAF: se
  // dispara una vez por interaccion, no en cada frame, asi que no interfiere
  // con la regla de "cero re-render por frame" del gaze (spec §13).
  const [pulsing, setPulsing] = useState(false);

  // La mascota viaja con la pupila, a su misma profundidad: es lo que la
  // pupila contiene, no una capa aparte. El array se reconstruye en cada
  // render (no hace falta memoizarlo): `useParallaxLayers` guarda su propia
  // copia estable internamente.
  const targets: ParallaxTarget[] = [
    ...EYE_LAYERS.map((layer, index) => ({
      ref: layerRefs[index],
      depth: layer.depth,
    })),
    { ref: mascot, depth: EYE_MASCOT_DEPTH },
  ];
  // Tercer argumento `sceneRef` (D3, spec 2026-08-04): con el, el hook gana
  // la guarda de `IntersectionObserver` que antes le faltaba -- el rAF del
  // parallax deja de correr mientras el hero esta fuera de pantalla (antes
  // corria durante toda la sesion, aunque el hero llevara doce pantallas
  // fuera de vista) y, al abandonar la seccion, las capas se liberan con el
  // mismo lerp que ya suaviza el seguimiento del cursor hasta
  // `translate3d(0,0,0)` en vez de quedarse congeladas en la ultima postura
  // del puntero.
  useParallaxLayers(targets, AMP, sceneRef);

  // `pointerdown` cubre raton y tactil en un solo handler (spec §12: "click
  // pulse", trigger "click / tap"). El lienzo entero (`ScSocket`) es el hit
  // target: la composicion ocupa el hero de fondo a fondo, asi que cualquier
  // punto que no sea copia ni CTA responde.
  //
  // Bajo reduced-motion NI SE MARCA el estado. El pulso se apaga solo cuando
  // termina su animacion, y con reduced-motion no hay animacion que termine:
  // marcarlo dejaria `data-pulsing="true"` pegado para siempre y el segundo
  // click ya no dispararia nada el dia que se reactive el movimiento.
  const handlePulseStart = (): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPulsing(true);
  };
  // Se limpia al terminar la animacion CSS (no con un timeout) para que un
  // segundo click dispare la onda otra vez incluso si el usuario clickea muy
  // rapido: `onAnimationEnd` solo se dispara cuando el navegador termina de
  // verdad el keyframe.
  const handlePulseEnd = (): void => setPulsing(false);

  return (
    <ScSocket
      ref={sceneRef}
      className={className}
      aria-hidden="true"
      data-part="socket"
      data-pulsing={pulsing ? "true" : undefined}
      onPointerDown={handlePulseStart}
    >
      <ScFrame>
        {EYE_LAYERS.map((layer, index) => (
          <ScLayer
            key={layer.part}
            ref={layerRefs[index]}
            data-part={layer.part}
            src={layer.src}
            srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
            sizes={EYE_SIZES}
            alt=""
            // Las capas son el fondo del hero: cargarlas en diferido las
            // pondria por detras de la copia en la cola de red justo donde
            // mas se notan. `decoding="async"` evita que la decodificacion
            // bloquee el primer pintado del texto.
            loading="eager"
            decoding="async"
            $additive={layer.additive}
            $moves={layer.depth > 0}
            $glow={layer.glow}
          />
        ))}
        {/* El centro del ojo: siempre el Wormhole (portado de `vti-sdk`).
            Trae su propia coreografia de pulso -- dos ondas de choque,
            destello del remolino, anillos que fulguran -- asi que aqui NO se
            monta ademas el anillo simple `ScShock`: serian tres ondas para
            el mismo click. La composicion clara equivalente (Sol en el
            centro, con el anillo simple como su respuesta al click) vive en
            su propio componente, no en una rama de este. */}
        <ScMascotSlot
          ref={mascot}
          data-part="mascot"
        >
          <Wormhole
            pulsing={pulsing}
            onPulseEnd={handlePulseEnd}
          />
        </ScMascotSlot>
      </ScFrame>
      {/* Fuera de ScFrame, no dentro: ahi heredaria su grupo de blending y el
          aditivo de las capas se lo comeria en vez de oscurecerlas. Ver el
          comentario de ScScrim en eye.parts.tsx para por que vive en la
          composicion y no en el hero. */}
      <ScScrim data-part="scrim" />
    </ScSocket>
  );
}
