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
 * El motor de medición (listeners de `scroll`/`resize` + su rAF coalescido)
 * va guardado por un `IntersectionObserver` sobre `trackRef` (D5): la
 * presentación son varias pantallas dentro de una página mucho más larga
 * (Hero, Journey, Features...), y sin esta guarda los listeners seguirían
 * midiendo durante toda la sesión aunque el usuario llevara scroll muy lejos
 * de Story. Mismo criterio de "no animar lo que no se ve" que ya aplica
 * `useReveal` con su propio `IntersectionObserver`.
 *
 * Dentro de esa guarda, el motor NO es un bucle de rAF libre que se
 * reprograma solo al final de cada frame: eso hacía un
 * `getBoundingClientRect()` (layout forzado) a 60fps incluso con el usuario
 * inmóvil, compitiendo por el mismo hilo con el rAF de `useSceneParallax`,
 * que anima 11 capas a pantalla completa con `mix-blend-mode` en la misma
 * sección. En su lugar es dirigido por eventos: `scroll`/`resize` programan
 * una única medición coalescida por rAF -- mismo resultado visual, trabajo
 * cero mientras el usuario no se mueve.
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

  // Espejo por ref de los dos valores de estado: el motor de medición
  // necesita conocer el ÚLTIMO valor confirmado en cada medición para
  // decidir si hace falta un `setState`, y un cierre sobre
  // `index`/`direction` capturaría el valor del render en que se creó el
  // efecto, no el actual.
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
    // Id del rAF coalescido pendiente, o 0 si no hay ninguno programado. Es
    // la bandera de coalescencia (spec del motor): mientras valga distinto
    // de 0, un nuevo `scroll`/`resize` no programa un segundo frame; se pone
    // a 0 cuando el frame ya programado corre.
    let raf = 0;
    // Guarda de reentrada. Sin ella, dos avisos seguidos de
    // `isIntersecting: true` (el observer puede reemitir, y `evaluate`
    // vuelve a observar cuando se desactiva `reduce`) repetirían la
    // medición inmediata y registrarían los listeners de `scroll`/`resize`
    // una segunda vez.
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

    // Una sola medición (un `getBoundingClientRect` = un layout forzado).
    // Ya NO se reprograma a sí misma: la reprogramación la decide el evento
    // de `scroll`/`resize` de turno vía `scheduleMeasure`, así que en reposo
    // (sin scroll) no corre nada.
    const measure = (): void => {
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
    };

    // Handler de `scroll`/`resize`: coalesce N eventos del mismo frame en UNA
    // sola medición, programada para el próximo repintado en vez de correr
    // en el propio handler del evento (que puede dispararse varias veces
    // antes de que el navegador pinte).
    const scheduleMeasure = (): void => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    const start = (): void => {
      if (running) return;
      running = true;
      // Medición inmediata: el estado (`--story-enter`/`--story-progress`,
      // `index`, `direction`) queda correcto en cuanto la pista aparece en
      // viewport, sin esperar a que el usuario dispare un `scroll`.
      measure();
      window.addEventListener("scroll", scheduleMeasure, { passive: true });
      window.addEventListener("resize", scheduleMeasure);
    };

    const stop = (): void => {
      if (!running) return;
      running = false;
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
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
