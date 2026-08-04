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
  ScAuraFoot,
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
 *
 * El socket tambien monta `ScAuraFoot`, la rampa violeta de la costura con
 * Story (spec S6.4): vive aqui y no en Hero.tsx para que entre y salga con
 * el escalonado y el desmontaje de este mismo stack, sin un temporizador
 * propio que mantener sincronizado.
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
  // Raiz de la composicion para la guarda de visibilidad de D3 (spec
  // 2026-08-04): useRef, NUNCA un callback-ref ni un objeto creado inline en
  // el render -- mismo motivo que layerRefs (useMemo con deps []): el hook
  // usa esta ref como dependencia de su efecto, y un objeto nuevo en cada
  // render lo re-suscribiria en cada setState (leccion task/lessons.md
  // 2026-07-31). Se ata a ScAuraSocket -- el elemento raiz que ya envuelve
  // toda la composicion y ya es, ademas, el grupo de blending
  // (`isolation: isolate`, ver aura.parts.tsx) -- en vez de a ScAuraSubject o
  // a cualquier hijo: anadir el ref a la raiz no toca esa isolation ni
  // introduce un div nuevo (un envoltorio adicional crearia su propio
  // contexto de apilamiento y aislaria el sujeto del campo a sangre, spec
  // S4.3).
  const sceneRef = useRef<HTMLDivElement>(null);
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
  // Tercer argumento `sceneRef` (D3, spec 2026-08-04): con el, el hook gana
  // la guarda de `IntersectionObserver` que antes le faltaba -- el rAF del
  // parallax deja de correr mientras el hero esta fuera de pantalla (antes
  // corria durante toda la sesion, aunque el hero llevara doce pantallas
  // fuera de vista) y, al abandonar la seccion, las capas se liberan con el
  // mismo lerp que ya suaviza el seguimiento del cursor hasta
  // `translate3d(0,0,0)` en vez de quedarse congeladas en la ultima postura
  // del puntero.
  useParallaxLayers(targets, AMP, sceneRef);

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
      ref={sceneRef}
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
      {/* Rampa violeta de la costura con Story (spec S6.4). Va a sangre del
          SOCKET, no del marco del sujeto, y despues de ScAuraSubject en el
          DOM para pintarse por encima de sus capas. */}
      <ScAuraFoot data-part="foot" />
    </ScAuraSocket>
  );
}
