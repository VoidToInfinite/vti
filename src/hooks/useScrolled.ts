import { useEffect, useState } from "react";

/**
 * Estado "la página está scrolleada", que alimenta el glass de la Navbar.
 *
 * DECISIÓN CERRADA (2026-07-25): se queda con `useEffect`, NO `useLayoutEffect`.
 * Se evaluó cambiarlo para evitar un frame sin glass cuando la página carga ya
 * scrolleada (navegación por ancla, restauración de scroll). No compensa:
 *
 * 1. Con `output: "export"` el navegador pinta el HTML prerenderizado
 *    (`data-scrolled="false"`) ANTES de hidratar, así que `useLayoutEffect`
 *    tampoco elimina ese primer pintado — corre después de él igualmente.
 * 2. El swap ingenuo emite warning de SSR en el build (verificado); evitarlo
 *    exige una guarda isomórfica y un eslint-disable permanente en un hook
 *    de 12 líneas.
 * 3. El síntoma es cosmético y acotado: la nav aparece transparente un frame.
 *    Sin contenido ilegible ni salto de layout.
 *
 * Si algún día importa, la solución correcta es un script inline en <head> que
 * fije el estado antes de hidratar — y conviene hacerlo junto al problema mayor
 * de la misma familia: ThemeProvider arranca siempre en `light`, así que en modo
 * oscuro se ve la página entera en claro hasta la hidratación.
 */
export function useScrolled(offset = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}
