"use client";
import { useEffect, useRef, type RefObject } from "react";
import { usePointer } from "@/hooks/usePointer";

export interface ParallaxTarget {
  /** Ref al elemento que recibe el transform. */
  readonly ref: RefObject<HTMLElement | null>;
  /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
  readonly depth: number;
}

export interface ParallaxAmplitude {
  readonly x: number;
  readonly y: number;
}

/**
 * Parallax 2.5D compartido por las composiciones del hero (hoy el ojo,
 * despues Aura): un unico rAF que escribe `transform` directamente en el DOM
 * para TODOS los objetivos a la vez. React nunca re-renderiza por frame.
 *
 * `targets` y `amplitude` se aceptan tal cual llegan en cada render, SIN
 * exigir memoizacion al consumidor: si el consumidor construye el array (o
 * el objeto de amplitud) de nuevo en cada render y esos valores vivieran en
 * las dependencias del efecto de abajo, el rAF se cancelaria y
 * reprogramaria en cada render del padre aunque nada relevante hubiera
 * cambiado. En su lugar los dos se guardan en sendos refs que se
 * actualizan en TODOS los renders (sin gatear nada), y el efecto solo
 * depende de lo que de verdad debe reiniciar el bucle.
 */
export function useParallaxLayers(
  targets: readonly ParallaxTarget[],
  amplitude: ParallaxAmplitude,
): void {
  const pointer = usePointer();
  // `usePointer()` devuelve un objeto literal nuevo en cada invocacion (no
  // memoizado): depender de `pointer` entero en el efecto de abajo lo haria
  // re-ejecutarse en CADA render del consumidor (cancela + reprograma el
  // rAF), aunque `enabled` no cambiara de verdad. `x`/`y` si son refs
  // estables (el mismo objeto en cada invocacion de `usePointer`), asi que
  // extraerlas aqui y depender de los primitivos/refs -- no del objeto
  // envolvente -- deja el efecto quieto entre renders del consumidor y solo
  // lo reinicia cuando `enabled` cambia de verdad.
  const { x, y, enabled } = pointer;

  const targetsRef = useRef(targets);
  const amplitudeRef = useRef(amplitude);
  // Sincroniza los dos refs DESPUES de cada render, no durante -- leer o
  // escribir `.current` en el cuerpo del componente viola
  // `react-hooks/refs` (el lint del React Compiler) y, mas de fondo, es
  // insostenible si el compilador llega a memoizar el render y lo saltea.
  // Sin dependencias: debe correr tras TODOS los renders, no solo el
  // primero.
  useEffect(() => {
    targetsRef.current = targets;
    amplitudeRef.current = amplitude;
  });

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    // Un solo rAF para todos los objetivos, sin importar cuantos sean.
    // React NUNCA re-renderiza por frame.
    const tick = (): void => {
      const px = x.current;
      const py = y.current;
      const amp = amplitudeRef.current;
      for (const target of targetsRef.current) {
        if (target.depth === 0) continue; // el fondo no se mueve nunca
        const el = target.ref.current;
        if (!el) continue;
        el.style.transform = `translate3d(${px * amp.x * target.depth}px, ${py * amp.y * target.depth}px, 0)`;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, x, y]);
}
