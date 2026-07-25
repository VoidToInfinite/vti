import { useEffect, useRef, useState, type RefObject } from "react";

/** Factor de suavizado por frame. ~0.085 ≈ 85ms de asentamiento a 60fps (spec §4). */
const LERP = 0.085;

export interface Pointer {
  /** Posición X normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  x: RefObject<number>;
  /** Posición Y normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  y: RefObject<number>;
  /**
   * `false` en táctil o sin puntero fino (no hay cursor al que reaccionar),
   * o con `prefers-reduced-motion: reduce`. Reactivo en caliente: si el
   * usuario activa/desactiva la preferencia del sistema, o conecta/desconecta
   * un ratón mientras la pestaña sigue abierta, este valor cambia sin
   * necesidad de recargar la página.
   */
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
 * `prefers-reduced-motion: reduce`. Ambas condiciones se re-evalúan en
 * caliente durante toda la vida del componente: el hook se suscribe al
 * evento `change` de las dos `MediaQueryList` (no lee `.matches` una sola
 * vez), así que activar/desactivar reduced-motion o conectar/desconectar un
 * ratón con la pestaña abierta enciende o apaga el efecto sin recargar.
 */
export function usePointer(): Pointer {
  const x = useRef(0);
  const y = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let running = false;

    const onMove = (e: PointerEvent): void => {
      targetX.current = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      targetY.current = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    };
    const onLeave = (): void => {
      targetX.current = 0;
      targetY.current = 0;
    };
    const tick = (): void => {
      x.current += (targetX.current - x.current) * LERP;
      y.current += (targetY.current - y.current) * LERP;
      raf = window.requestAnimationFrame(tick);
    };

    // Registra listeners + arranca el rAF. Idempotente a propósito: si
    // `evaluate` se dispara dos veces seguidas con el mismo resultado activo
    // (dos `change` consecutivos), `running` ya es `true` y no se duplica nada.
    const start = (): void => {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);
    };

    // Quita listeners + cancela el rAF, y resetea la posición a 0: si el
    // hook se apaga en caliente con el cursor desplazado, el consumidor no
    // debe quedarse con ese desplazamiento congelado para siempre. También
    // idempotente: si ya estaba parado, no hace nada.
    const stop = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      x.current = 0;
      y.current = 0;
      targetX.current = 0;
      targetY.current = 0;
    };

    // `hover: hover` + `pointer: fine` = ratón/trackpad de verdad. En táctil
    // no hay cursor que seguir, así que el efecto no aporta nada y se apaga
    // (spec §7); igual con reduced-motion (spec §accesibilidad).
    // `setEnabled` vive dentro de este helper (en vez de llamarse suelto en el
    // cuerpo del efecto) para satisfacer react-hooks/set-state-in-effect: el
    // análisis del compilador solo objeta un setState "a pelo" al nivel
    // superior del efecto, no uno anidado en una función que se invoca ahí
    // mismo — mismo patrón que `onScroll` en useScrolled.ts. Reutilizada tal
    // cual como listener de `change`: se re-evalúa cada vez que cualquiera de
    // las dos media queries cambia de valor.
    const evaluate = (): void => {
      const active = fineQuery.matches && !reducedQuery.matches;
      setEnabled(active);
      if (active) start();
      else stop();
    };

    evaluate();
    fineQuery.addEventListener("change", evaluate);
    reducedQuery.addEventListener("change", evaluate);

    return () => {
      fineQuery.removeEventListener("change", evaluate);
      reducedQuery.removeEventListener("change", evaluate);
      stop();
    };
  }, []);

  return { x, y, enabled };
}
