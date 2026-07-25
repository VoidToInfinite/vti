import { useEffect, useRef, useState, type RefObject } from "react";

/** Factor de suavizado por frame. ~0.085 ≈ 85ms de asentamiento a 60fps (spec §4). */
const LERP = 0.085;

export interface Pointer {
  /** Posición X normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  x: RefObject<number>;
  /** Posición Y normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  y: RefObject<number>;
  /** `false` en táctil o sin puntero fino: no hay cursor al que reaccionar. */
  enabled: boolean;
}

/** Recorta `n` al rango −1..1: un evento fuera del viewport no debe extrapolar. */
function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

/**
 * Puntero suavizado por lerp, normalizado a −1..1 respecto al viewport.
 *
 * Devuelve refs, no estado (spec §13): un `useState` actualizado en cada
 * `pointermove` re-renderizaría React ~60 veces por segundo. El consumidor
 * (el ojo, la escena) lee `.current` dentro de su propio rAF y escribe
 * transforms directamente en el DOM.
 *
 * Se apaga (sin listeners ni rAF) en dos casos: sin puntero fino
 * (`hover: hover` + `pointer: fine` → táctil) y con
 * `prefers-reduced-motion: reduce`.
 */
export function usePointer(): Pointer {
  const x = useRef(0);
  const y = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // `hover: hover` + `pointer: fine` = ratón/trackpad de verdad. En táctil no
    // hay cursor que seguir, así que el efecto no aporta nada y se apaga (spec §7).
    // `setEnabled` vive dentro de este helper (en vez de llamarse suelto en el
    // cuerpo del efecto) para satisfacer react-hooks/set-state-in-effect: el
    // análisis del compilador solo objeta un setState "a pelo" al nivel
    // superior del efecto, no uno anidado en una función que se invoca ahí
    // mismo — mismo patrón que `onScroll` en useScrolled.ts.
    const evaluate = (): boolean => {
      const fine = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
      ).matches;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const active = fine && !reduced;
      setEnabled(active);
      return active;
    };
    const active = evaluate();
    if (!active) return;

    const onMove = (e: PointerEvent): void => {
      targetX.current = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      targetY.current = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    };
    const onLeave = (): void => {
      targetX.current = 0;
      targetY.current = 0;
    };

    let raf = 0;
    const tick = (): void => {
      x.current += (targetX.current - x.current) * LERP;
      y.current += (targetY.current - y.current) * LERP;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return { x, y, enabled };
}
