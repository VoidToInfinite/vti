import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface ScrollProgress {
  ref: (node: Element | null) => void;
  /** 0 = acaba de entrar por abajo · 1 = acaba de salir por arriba. */
  progress: RefObject<number>;
}

/**
 * Progreso de scroll de un elemento, normalizado 0→1 (modo `scrubbed`).
 *
 * NO secuestra el scroll: solo lo observa. El usuario controla el tiempo; si
 * deja de hacer scroll, el progreso deja de avanzar. Sin duración propia y
 * sin scrolljacking: es un requisito de accesibilidad del proyecto.
 *
 * Devuelve refs, no estado, por la misma razón que `usePointer`: el
 * consumidor (la escena Three.js) lee `.current` dentro de su propio rAF, y
 * un `useState` aquí re-renderizaría React en cada evento de scroll.
 */
export function useScrollProgress(): ScrollProgress {
  const progress = useRef(0);
  const node = useRef<Element | null>(null);

  const ref = useCallback((n: Element | null) => {
    node.current = n;
  }, []);

  useEffect(() => {
    let raf = 0;
    let queued = false;

    const measure = (): void => {
      // Se resetea primero, incondicionalmente: si no, tras el primer
      // frame la bandera se queda en `true` para siempre y el hook
      // deja de encolar mediciones nuevas.
      queued = false;
      const el = node.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Recorrido total: desde que el borde superior entra por abajo
      // hasta que el inferior sale por arriba.
      const total = window.innerHeight + rect.height;
      const done = window.innerHeight - rect.top;
      progress.current = Math.max(0, Math.min(1, done / total));
    };

    // El listener solo encola; la medición ocurre en rAF para no forzar
    // reflow síncrono (getBoundingClientRect) en cada evento de scroll.
    const onScroll = (): void => {
      if (queued) return;
      queued = true;
      raf = window.requestAnimationFrame(measure);
    };

    // Mide también al montar, sin esperar a un evento: si la página
    // carga ya scrolleada, el progreso debe ser correcto desde el
    // primer frame.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress };
}
