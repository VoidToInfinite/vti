"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Sentido del último desplazamiento significativo dentro de la pista. */
export type StoryDeckDirection = "forward" | "rewind";

export interface StoryDeckState {
  /** Diapositiva activa, 0..slides-1. */
  index: number;
  /** Sentido del último desplazamiento significativo dentro de la pista. */
  direction: StoryDeckDirection;
}

/**
 * Umbral anti-jitter (px) para `direction` (spec D4): un `rect.top` que
 * fluctúa uno o dos píxeles entre frames (subpíxeles de scroll, redondeo del
 * navegador) no es un cambio real de sentido. Por debajo de este valor el
 * delta se descarta y `direction` se queda como estaba en vez de parpadear
 * entre `forward`/`rewind` en cada frame.
 */
const DIRECTION_JITTER_PX = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Progreso de una presentación de diapositivas atada al scroll (D4, spec
 * `2026-07-31-story-deck-hero-transition-design.md`). Por cada frame en que
 * la pista (`trackRef`) está en pantalla, calcula cuánto se ha "abierto" la
 * presentación (`--story-enter`) y cuánto se ha avanzado dentro de ella
 * (`--story-progress`), y los escribe como variables CSS directamente sobre
 * `stageRef.current.style` -- NUNCA como estado de React: cambian en cada
 * frame de scroll, y un `useState` a esa frecuencia re-renderizaría el árbol
 * ~60 veces por segundo por un valor que solo consume CSS (mismo principio
 * que `useSceneParallax`/`useParallaxLayers`, que escriben `transform`
 * directamente en vez de pasar por estado).
 *
 * `index` y `direction`, en cambio, SÍ son estado de React: son los dos
 * únicos valores de toda esta coreografía que se materializan como
 * ATRIBUTOS (`data-slide`/`data-dir`) en el JSX del consumidor, en vez de
 * como variables CSS -- y un atributo es lo único de esta coreografía que
 * jsdom puede verificar (no evalúa `@media` ni ejecuta `@keyframes`). Además
 * cambian ~`slides` veces por pasada completa de la presentación, no por
 * frame, así que el coste de re-render es insignificante.
 *
 * El bucle de rAF va guardado por un `IntersectionObserver` sobre `trackRef`
 * (D5): la presentación son varias pantallas dentro de una página mucho más
 * larga (Hero, Journey, Features...), y sin esta guarda el rAF correría
 * durante toda la sesión aunque el usuario llevara scroll muy lejos de
 * Story. Mismo criterio de "no animar lo que no se ve" que ya aplica
 * `useReveal` con su propio `IntersectionObserver`.
 *
 * `slides` entra por parámetro y NO se importa de `story.layers.ts`: este
 * hook no sabe que gobierna Story, así que puede gobernar cualquier otra
 * presentación de N diapositivas el día de mañana sin cablearse a las 6
 * diapositivas de esta entrega.
 */
export function useStoryDeck(
  trackRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  slides: number,
): StoryDeckState {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<StoryDeckDirection>("forward");

  // Espejo por ref de los dos valores de estado: el bucle de rAF necesita
  // conocer el ÚLTIMO valor confirmado en cada frame para decidir si hace
  // falta un `setState`, y un cierre sobre `index`/`direction` capturaría el
  // valor del render en que se creó el efecto, no el actual.
  const indexRef = useRef(0);
  const directionRef = useRef<StoryDeckDirection>("forward");

  // `slides` puede llegar recalculado en cada render del consumidor sin que
  // eso deba reiniciar el efecto de abajo (que solo depende de los refs de
  // los elementos observados): se guarda en un ref que se sincroniza tras
  // CADA render, mismo patrón que `targetsRef` en `useSceneParallax`.
  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  });

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    // Guarda de reentrada del bucle. Sin ella, dos avisos seguidos de
    // `isIntersecting: true` (el observer puede reemitir, y `evaluate`
    // vuelve a observar cuando se desactiva `reduce`) arrancarían un SEGUNDO
    // bucle: las dos cadenas se pisarían la variable `raf`, así que al
    // cancelar solo moriría una y la otra seguiría corriendo para siempre.
    let running = false;
    // `null` marca "todavía no hay frame anterior con el que comparar": el
    // primer frame tras (re)activarse la pista fija la línea base de
    // `rect.top` sin calcular ningún sentido, para no leer el salto entre
    // "no observado" y "observado" como un desplazamiento real de scroll.
    let lastTop: number | null = null;

    const updateIndex = (progress: number): void => {
      const nextIndex = clamp(
        Math.round(progress * (slidesRef.current - 1)),
        0,
        slidesRef.current - 1,
      );
      if (nextIndex !== indexRef.current) {
        indexRef.current = nextIndex;
        setIndex(nextIndex);
      }
    };

    const updateDirection = (top: number): void => {
      if (lastTop !== null) {
        const delta = top - lastTop;
        if (Math.abs(delta) >= DIRECTION_JITTER_PX) {
          const next: StoryDeckDirection = delta < 0 ? "forward" : "rewind";
          if (next !== directionRef.current) {
            directionRef.current = next;
            setDirection(next);
          }
        }
      }
      lastTop = top;
    };

    const tick = (): void => {
      const track = trackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const vh = window.innerHeight;

        const enter = clamp(1 - rect.top / vh, 0, 1);
        // Sin recorrido de pista que dar (span <= 0), no hay tramo del que
        // derivar progreso: se queda en 0 en vez de dividir por algo <= 0.
        const span = rect.height - vh;
        const progress = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;

        const stage = stageRef.current;
        if (stage) {
          stage.style.setProperty("--story-enter", enter.toFixed(4));
          stage.style.setProperty("--story-progress", progress.toFixed(4));
        }

        updateIndex(progress);
        updateDirection(rect.top);
      }
      raf = window.requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
    };

    const stop = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
      // Se olvida la línea base al parar: si el usuario sale de la pista,
      // recorre media página y vuelve, el primer frame de la reentrada
      // compararía contra un `rect.top` de hace miles de píxeles y
      // reportaría un sentido que no corresponde a ningún gesto real.
      lastTop = null;
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });

    // Bajo `reduce`, la presentación se desmonta como tal (D6): ni rAF, ni
    // observer activo, ni variables CSS escritas, y el estado vuelve al
    // reposo inicial. No basta con "dejar de animar": si `index`/`direction`
    // se quedaran en el valor que tuvieran al activarse la preferencia, un
    // usuario que active `reduce` a mitad de la presentación vería
    // `data-slide` congelado en un valor que ya no significa nada (bajo
    // `reduce` las diapositivas se apilan en flujo, todas visibles).
    const evaluate = (): void => {
      if (reducedQuery.matches) {
        stop();
        observer.disconnect();
        if (indexRef.current !== 0) {
          indexRef.current = 0;
          setIndex(0);
        }
        if (directionRef.current !== "forward") {
          directionRef.current = "forward";
          setDirection("forward");
        }
      } else if (trackRef.current) {
        observer.observe(trackRef.current);
      }
    };

    evaluate();
    reducedQuery.addEventListener("change", evaluate);

    return () => {
      reducedQuery.removeEventListener("change", evaluate);
      stop();
      observer.disconnect();
    };
  }, [trackRef, stageRef]);

  return { index, direction };
}
