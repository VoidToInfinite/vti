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
import { Sol } from "@/components/eye/mascots/Sol";
import { AURA_LAYERS, AURA_ORB_DEPTH, AURA_SIZES } from "./aura.layers";
import {
  ScAuraBase,
  ScAuraField,
  ScAuraLayer,
  ScAuraSocket,
  ScAuraSubject,
  ScOrbSlot,
  ScShock,
} from "./aura.parts";

/** Amplitud del parallax en px a profundidad 1. La MISMA que usa el ojo
 *  (Eye.tsx): mismo lienzo (1672x941), misma lectura de profundidad -- si
 *  las dos composiciones se movieran con amplitudes distintas, el cruce de
 *  temas se notaria como un cambio de "peso" del parallax, no solo de arte. */
const AMP = { x: 26, y: 15 } as const;

export interface AuraProps {
  className?: string;
}

/**
 * El fondo pastel del hero: la composicion CLARA, montada como pila de
 * capas WebP con blending normal/alfa (la particion documentada en
 * `assets/hero-aura/manifest.json`), no como aproximacion en CSS. Es solo
 * una de las dos composiciones del hero -- la oscura (el ojo cosmico) vive
 * en su propio componente, no en una rama de este.
 *
 * Sobre la pila, el mismo movimiento que el ojo: parallax 2.5D siguiendo al
 * cursor via `useParallaxLayers`, compartido entre las dos composiciones,
 * cero re-render por frame. El orbe lo ocupa `Sol` (portado de `vti-sdk`),
 * que trae su propia coreografia de respiracion/inclinacion/giro; sobre el
 * hero entero, ademas, una onda de pulso simple (`ScShock`) responde al
 * click/tap, igual que hacia el ojo en tema claro antes de que esta
 * composicion se independizara.
 *
 * Todo el subarbol es decorativo (`aria-hidden="true"`): nada de lo que
 * comunica Aura vive solo aqui -- la marca real sigue siendo el `<h1>` del
 * Hero, y las imagenes van con `alt=""`.
 */
export function Aura({ className }: AuraProps): ReactElement {
  // Mismo patron que Eye.tsx: refs individuales por capa via useMemo (deps
  // `[]`), no un callback-ref con un array compartido. `useParallaxLayers`
  // pide un `RefObject` por objetivo, y crear uno con `useRef` dentro de un
  // `.map()` violaria las reglas de hooks.
  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => AURA_LAYERS.map(() => ({ current: null })),
    [],
  );
  const orb = useRef<HTMLDivElement>(null);
  // Onda de "pulse" al click/tap. Estado de React, no rAF: se dispara una
  // vez por interaccion, no en cada frame, asi que no interfiere con la
  // regla de "cero re-render por frame" del parallax.
  const [pulsing, setPulsing] = useState(false);

  // El orbe viaja con la composicion a su propia profundidad (la mas alta:
  // spec S3.3, la energia no lo cubre). El array se reconstruye en cada
  // render (no hace falta memoizarlo): `useParallaxLayers` guarda su propia
  // copia estable internamente.
  const targets: ParallaxTarget[] = [
    ...AURA_LAYERS.map((layer, index) => ({
      ref: layerRefs[index],
      depth: layer.depth,
    })),
    { ref: orb, depth: AURA_ORB_DEPTH },
  ];
  useParallaxLayers(targets, AMP);

  // `pointerdown` cubre raton y tactil en un solo handler. El lienzo entero
  // (`ScAuraSocket`) es el hit target: la composicion ocupa el hero de fondo
  // a fondo, asi que cualquier punto que no sea copia ni CTA responde.
  //
  // Bajo reduced-motion NI SE MARCA el estado. El pulso se apaga solo cuando
  // termina su animacion, y con reduced-motion no hay animacion que termine:
  // marcarlo dejaria data-pulsing="true" pegado para siempre y el segundo
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
    <ScAuraSocket
      className={className}
      aria-hidden="true"
      data-pulsing={pulsing ? "true" : undefined}
      onPointerDown={handlePulseStart}
    >
      <ScAuraBase data-part="base" />
      {AURA_LAYERS.map((layer, index) =>
        layer.fullBleed ? (
          <ScAuraField
            key={layer.part}
            ref={layerRefs[index]}
            data-part={layer.part}
            src={layer.src}
            srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
            sizes={AURA_SIZES}
            alt=""
            // Las capas son el fondo del hero: cargarlas en diferido las
            // pondria por detras de la copia en la cola de red justo donde
            // mas se notan. `decoding="async"` evita que la decodificacion
            // bloquee el primer pintado del texto.
            loading="eager"
            decoding="async"
          />
        ) : null,
      )}
      <ScAuraSubject>
        {AURA_LAYERS.map((layer, index) =>
          layer.fullBleed ? null : (
            <ScAuraLayer
              key={layer.part}
              ref={layerRefs[index]}
              data-part={layer.part}
              src={layer.src}
              srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
              sizes={AURA_SIZES}
              alt=""
              loading="eager"
              decoding="async"
              $moves={layer.depth > 0}
            />
          ),
        )}
        <ScOrbSlot
          ref={orb}
          data-part="orb"
        >
          <Sol />
        </ScOrbSlot>
        <ScShock
          data-part="shock"
          onAnimationEnd={handlePulseEnd}
        />
      </ScAuraSubject>
    </ScAuraSocket>
  );
}
