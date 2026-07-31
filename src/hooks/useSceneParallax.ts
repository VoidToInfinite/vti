"use client";
import { useEffect, useRef, type RefObject } from "react";
import { usePointer } from "@/hooks/usePointer";

export interface SceneParallaxTarget {
  /** Ref al elemento que recibe el transform. */
  readonly ref: RefObject<HTMLElement | null>;
  /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
  readonly depth: number;
}

export interface SceneParallaxAmplitude {
  readonly x: number;
  readonly y: number;
}

export interface SceneParallaxOptions {
  /** Amplitud del parallax de puntero en px, a profundidad 1. */
  readonly pointerAmp: SceneParallaxAmplitude;
  /** Amplitud del parallax de scroll en px, a profundidad 1. */
  readonly scrollAmp: number;
  /** Escala base comun a todas las capas (evita bordes vacios al desplazar). */
  readonly overscan: number;
  /** Amplitud de la deriva automatica cuando el puntero lleva quieto `idleMs`. */
  readonly driftAmp?: SceneParallaxAmplitude;
  /** Milisegundos sin movimiento de puntero antes de que la deriva tome el control. */
  readonly idleMs?: number;
}

const DEFAULT_DRIFT_AMP: SceneParallaxAmplitude = { x: 0.55, y: 0.35 };
const DEFAULT_IDLE_MS = 2200;

/**
 * Parallax de puntero + scroll + deriva en reposo para UNA escena a sangre
 * (`StoryCosmicBeing`, spec 2026-07-29 §5). Distinto de `useParallaxLayers`
 * (Eye/Aura, que solo sigue al puntero): aqui hace falta ademas un termino de
 * scroll y una deriva lenta cuando nadie toca el puntero, asi que se declara
 * un hook nuevo en vez de anadir features a uno compartido que ya sirve al
 * hero -- tocar `useParallaxLayers` arriesgaria una regresion en Eye/Aura por
 * una necesidad que no es la suya.
 *
 * Reutiliza `usePointer()` para la coordenada de puntero (lerp, se apaga solo
 * en tactil) pero NO delega en su `enabled` la decision de arrancar este
 * hook: ese flag mezcla "tactil" con "reduced-motion", y aqui el scroll/deriva
 * SI deben seguir vivos en tactil (no hay puntero que seguir, pero si hay
 * scroll). El unico apagado total POR PREFERENCIA de este hook es
 * `prefers-reduced-motion: reduce`, comprobado con su propio listener
 * reactivo (mismo patron que `usePointer`): al apagarse, cada objetivo vuelve
 * a `transform: ""`, dejando que la regla CSS estatica (`scale(overscan)`,
 * sin traslacion) sea la unica en efecto -- el estado de reposo que pide D6
 * del spec.
 *
 * Guarda de visibilidad por `IntersectionObserver` sobre `sceneRef` (mismo
 * patron que `useStoryDeck`): sin ella, el bucle de rAF de abajo se
 * reprogramaba a si mismo desde el montaje y para siempre, sin importar si
 * `sceneRef` seguia en pantalla. Este hook lo consumen CUATRO secciones del
 * tema oscuro (Story 11 capas, Journey 5, Features 10 y Contact 7): eso son
 * 4 bucles permanentes escribiendo `transform` en 33 elementos por frame
 * durante toda la sesion, esten o no esas secciones en el viewport.
 * El bucle solo corre cuando las DOS condiciones se cumplen -- interseccion
 * Y no-reduce --, nunca con una sola.
 *
 * Al salir de pantalla se PAUSA (cancela rAF, quita los listeners de
 * `pointermove`/`scroll`) pero NO se resetea el `transform`: a diferencia de
 * `reduce` o del desmontaje, salir de pantalla es una condicion reversible en
 * cualquier momento (el usuario puede volver a scrollear hacia la seccion), y
 * si se limpiara el transform aqui las capas saltarian visiblemente desde su
 * posicion CSS estatica hasta la que calcule el primer frame nuevo al
 * reentrar. `pause()` cubre eso; `stop()` (= `pause()` + reset) queda
 * reservado a `reduce` y al desmontaje, los dos unicos casos donde no hay
 * "vuelta" que proteger.
 */
export function useSceneParallax(
  sceneRef: RefObject<HTMLElement | null>,
  targets: readonly SceneParallaxTarget[],
  options: SceneParallaxOptions,
): void {
  const pointer = usePointer();
  const { x: pointerX, y: pointerY } = pointer;

  const targetsRef = useRef(targets);
  const optionsRef = useRef(options);
  useEffect(() => {
    targetsRef.current = targets;
    optionsRef.current = options;
  });

  const lastMoveRef = useRef(0);

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let running = false;
    let scrollProgress = 0;

    const onPointerMove = (): void => {
      lastMoveRef.current = performance.now();
    };

    const onScroll = (): void => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      scrollProgress = Math.max(
        -1,
        Math.min(1, -rect.top / window.innerHeight),
      );
    };

    const tick = (now: number): void => {
      const opts = optionsRef.current;
      const drift = opts.driftAmp ?? DEFAULT_DRIFT_AMP;
      const idleMs = opts.idleMs ?? DEFAULT_IDLE_MS;
      const idle = now - lastMoveRef.current > idleMs;

      const px = idle ? Math.sin(now / 7000) * drift.x : pointerX.current;
      const py = idle ? Math.cos(now / 9500) * drift.y : pointerY.current;

      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (!el) continue;
        const x = px * opts.pointerAmp.x * target.depth;
        const y =
          py * opts.pointerAmp.y * target.depth +
          scrollProgress * opts.scrollAmp * target.depth;
        const scale = opts.overscan + scrollProgress * target.depth * 0.05;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      }
      raf = window.requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastMoveRef.current = performance.now();
      window.addEventListener("pointermove", onPointerMove, {
        passive: true,
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      raf = window.requestAnimationFrame(tick);
    };

    // Pausa el bucle SIN resetear los transforms. La usa el
    // `IntersectionObserver` de abajo cuando `sceneRef` sale del viewport:
    // esa salida es reversible (el usuario puede volver a entrar con solo
    // scrollear), y si aqui se limpiara `transform` las capas saltarian de
    // golpe desde su posicion CSS estatica hasta la que calcule el primer
    // frame nuevo al reentrar -- justo el salto visible que la guarda de
    // visibilidad no deberia introducir.
    const pause = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };

    // Parada definitiva: pausa + reset de transform. A diferencia de
    // `pause()`, el reset corre SIEMPRE (no solo si `running`), porque
    // `reduce` puede activarse mientras la escena ya estaba pausada por
    // estar fuera de pantalla, y aun asi hay que devolver las capas a su
    // regla CSS estatica. Reservado a `reduce` y al desmontaje: los dos
    // unicos casos sin "vuelta" que proteger (ver JSDoc del hook).
    const stop = (): void => {
      pause();
      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (el) el.style.transform = "";
      }
    };

    // El bucle solo arranca con las DOS condiciones a la vez: la escena
    // intersecta Y no hay reduced-motion. Bajo `reduce` se desconecta el
    // observer entero (nada que observar: el hook esta apagado del todo);
    // fuera de `reduce`, el observer decide `start()`/`pause()` segun
    // interseccion en cada aviso.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else pause();
    });

    const evaluate = (): void => {
      if (reducedQuery.matches) {
        stop();
        observer.disconnect();
      } else {
        const el = sceneRef.current;
        if (el) observer.observe(el);
      }
    };

    evaluate();
    reducedQuery.addEventListener("change", evaluate);

    return () => {
      reducedQuery.removeEventListener("change", evaluate);
      observer.disconnect();
      stop();
    };
  }, [pointerX, pointerY, sceneRef]);
}
