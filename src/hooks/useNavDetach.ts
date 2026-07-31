import { useEffect, useRef, useState } from "react";
import { useScrolled } from "./useScrolled";

export type NavDetachPhase = "idle" | "detaching" | "attaching";

/**
 * Duración de la coreografía de despegue/pegado del navbar (spec D10):
 * la comparte el temporizador de este hook (para volver a `idle`) y el CSS
 * de `Navbar.tsx` (duración de las `@keyframes` `peelOff`/`stickOn`). Se
 * declara como constante exportada, en vez de repetir el número en JS y en
 * CSS por separado, porque JS y CSS tienen que quedarse EXACTAMENTE en el
 * mismo valor: si se desincronizaran, el temporizador cortaría la fase antes
 * de que la animación terminara (o la dejaría corriendo tras el corte, con
 * un `data-detach="idle"` que ya no coincide con lo que se ve en pantalla).
 * Mismo patrón exacto que `HERO_CHROME_OFFSET_MS` en
 * `src/components/sections/Hero/hero.transition.ts`: un número compartido se
 * declara una vez y un test lo ata al token del sistema de movimiento
 * (`motion.duration.slower`, 480ms) para que no pueda desviarse en silencio.
 */
export const NAV_DETACH_ANIM_MS = 480;

export interface NavDetachState {
  /** Idéntico a `useScrolled(offset)`: no se reinterpreta ni se retrasa. */
  scrolled: boolean;
  /** Fase de la coreografía de despegue, ver `NavDetachPhase`. */
  phase: NavDetachPhase;
}

/**
 * Deriva la fase de despegue/pegado del navbar (spec D4) a partir de
 * `useScrolled`, sin modificarlo: `useScrolled` sigue siendo la única fuente
 * de verdad del propio booleano `scrolled` (alimenta el cristal y
 * `EyeCornerMark`); este hook solo AÑADE el estado transitorio `phase`, que
 * dispara las `@keyframes` de squash & stretch solo en cruces reales de
 * umbral, nunca en el montaje.
 *
 * ## Por qué la línea base se lee de `window.scrollY`, no del primer valor de `useScrolled` (D5)
 *
 * `useScrolled` arranca su estado en `false` y lo corrige en su propio efecto
 * de montaje llamando a `onScroll()` de forma síncrona. Si la página carga
 * ya scrolleada (ancla, restauración de scroll), ese efecto emite
 * `false → true` en el commit siguiente al montaje — un cambio real de
 * estado, indistinguible de un scroll del usuario si este hook se limitara a
 * comparar valores consecutivos de `scrolled`. Colgar la coreografía de ese
 * cambio haría que la animación de "despegue" se disparara en cada carga de
 * página ya scrolleada, en vez de solo cuando el usuario cruza el umbral.
 *
 * La solución: este hook lee `window.scrollY > offset` en SU PROPIO efecto
 * de montaje —declarado ANTES del efecto que calcula la fase, para que
 * corra primero dentro del mismo commit— y usa ese valor como línea base
 * (`prevScrolledRef`). La primera ejecución del efecto de fase (que ve el
 * `scrolled` todavía-no-corregido de `useScrolled`, `false` por diseño) se
 * descarta explícitamente sin comparar nada; cuando `useScrolled` termina de
 * corregirse y dispara un segundo render, el valor ya coincide con la línea
 * base leída del `window`, así que no hay cruce que reportar y `phase` se
 * queda en `idle`.
 */
export function useNavDetach(offset = 8): NavDetachState {
  const scrolled = useScrolled(offset);
  const [phase, setPhase] = useState<NavDetachPhase>("idle");

  const prevScrolledRef = useRef(false);
  const isFirstPhaseRunRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  // Efecto de línea base (D5): se declara ANTES del efecto de fase para que
  // corra primero dentro del mismo commit de montaje. Lee el scroll real del
  // `window`, no el `scrolled` (todavía `false`) que devuelve `useScrolled`
  // en este mismo render.
  useEffect(() => {
    prevScrolledRef.current = window.scrollY > offset;
  }, [offset]);

  useEffect(() => {
    // La primera ejecución coincide con el commit de montaje: `scrolled`
    // todavía no ha sido corregido por el efecto síncrono de `useScrolled`,
    // así que compararlo contra la línea base produciría un falso cruce. Se
    // descarta sin tocar `prevScrolledRef` (ya fijado por el efecto de
    // línea base de arriba).
    if (isFirstPhaseRunRef.current) {
      isFirstPhaseRunRef.current = false;
      return;
    }

    if (scrolled === prevScrolledRef.current) return;
    prevScrolledRef.current = scrolled;

    setPhase(scrolled ? "detaching" : "attaching");

    // Reprograma el temporizador si llega otro cruce antes de que el
    // anterior termine: dos cruces rápidos no pueden dejar dos temporizadores
    // compitiendo por volver a `idle`.
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setPhase("idle");
    }, NAV_DETACH_ANIM_MS);
  }, [scrolled]);

  // Limpieza al desmontar: el temporizador pendiente no debe sobrevivir al
  // componente que consume este hook (mismo patrón que useHeroCopySwap).
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { scrolled, phase };
}
