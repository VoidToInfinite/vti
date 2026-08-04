"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Sentido del último desplazamiento significativo dentro de la pista. */
export type SlideDeckDirection = "forward" | "rewind";

export interface SlideDeckState {
  /** Diapositiva activa, 0..slides-1. */
  index: number;
  /** Sentido del último desplazamiento significativo dentro de la pista. */
  direction: SlideDeckDirection;
}

/**
 * Opciones de `useSlideDeck` (D4, spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`). Agrupadas en un
 * objeto porque las dos son parámetros de afinado que casi ningún consumidor
 * necesita tocar a la vez que `slides` (que sí es obligatorio y posicional):
 * un objeto con defecto `{}` deja pedir solo el que haga falta sin arrastrar
 * el otro con su valor por defecto explícito en cada llamada.
 */
export interface SlideDeckOptions {
  /**
   * Número de pantallas al final de la pista que NO forman parte del
   * recorrido de diapositivas -- la zona de "hold" en la que el `stage`
   * sigue pegado pero la presentación ya ha terminado (p.ej.
   * `STORY_DECK_TAIL_SCREENS`, `story.layers.ts`). Se resta del `span` en
   * PANTALLAS (`vh`), no en píxeles fijos: un número de pantallas es
   * adimensional y se recalcula solo en cada `resize` a partir del `vh`
   * medido ese mismo frame, sin que este hook tenga que conocer `dvh` ni
   * ninguna otra unidad de viewport de CSS -- sigue sin saber qué
   * presentación gobierna (mismo principio que `slides`, más abajo). El
   * defecto es `0` porque `0 × vh` no resta nada: ningún consumidor que no
   * declare cola (como Journey, D9 de la spec de arriba) cambia de
   * comportamiento por la mera existencia del parámetro.
   */
  readonly tailScreens?: number;
  /**
   * Prefijo de las variables CSS que el hook escribe sobre `stageRef`:
   * `--<prefix>-enter` / `--<prefix>-progress`. Sin este parámetro,
   * CUALQUIER presentación que no fuera Story escribiría literales
   * `--story-*` sobre su propio `stage` -- un lector del CSS de esa sección
   * buscaría una relación con Story que no existe. Story pasa `"story"`
   * explícitamente (no se apoya en un defecto que coincida por casualidad)
   * para que `story.deck.tsx` conserve `--story-enter`/`--story-progress`
   * intactas: el renombrado de este hook no arrastra ni una línea de cambio
   * de CSS a una sección que ya funciona. El defecto `"deck"` es genérico a
   * propósito, para que un consumidor nuevo que no declare prefijo obtenga
   * variables con nombre propio (`--deck-*`) en vez de heredar sin querer
   * el namespace de otra presentación.
   */
  readonly cssVarPrefix?: string;
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
 * presentación (`--<prefix>-enter`) y cuánto se ha avanzado dentro de ella
 * (`--<prefix>-progress`), y los escribe como variables CSS directamente
 * sobre `stageRef.current.style` -- NUNCA como estado de React: cambian en
 * cada frame de scroll, y un `useState` a esa frecuencia re-renderizaría el
 * árbol ~60 veces por segundo por un valor que solo consume CSS (mismo
 * principio que `useSceneParallax`/`useParallaxLayers`, que escriben
 * `transform` directamente en vez de pasar por estado).
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
 * va guardado por un `IntersectionObserver` sobre `trackRef` (D5): una
 * presentación son varias pantallas dentro de una página mucho más larga
 * (Hero, Journey, Features...), y sin esta guarda los listeners seguirían
 * midiendo durante toda la sesión aunque el usuario llevara scroll muy lejos
 * de la presentación que la usa. Mismo criterio de "no animar lo que no se
 * ve" que ya aplica `useReveal` con su propio `IntersectionObserver`.
 *
 * Dentro de esa guarda, el motor NO es un bucle de rAF libre que se
 * reprograma solo al final de cada frame: eso hacía un
 * `getBoundingClientRect()` (layout forzado) a 60fps incluso con el usuario
 * inmóvil, compitiendo por el mismo hilo con el rAF de `useSceneParallax`,
 * que anima varias capas a pantalla completa con `mix-blend-mode` en la
 * misma sección. En su lugar es dirigido por eventos: `scroll`/`resize`
 * programan una única medición coalescida por rAF -- mismo resultado
 * visual, trabajo cero mientras el usuario no se mueve.
 *
 * `slides` entra por parámetro y NO se importa de ningún fichero de
 * constantes de una sección concreta: este hook gobernaba solo Story
 * (D4, spec `2026-07-31-story-deck-hero-transition-design.md`) y hoy
 * gobierna también Journey (D4, spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`), cada una con su
 * propio número de diapositivas y su propio prefijo de variables CSS
 * (`cssVarPrefix`, ver `SlideDeckOptions`) -- prueba en marcha de que el
 * hook, en efecto, no necesita saber a cuál de las dos gobierna.
 *
 * `tailScreens` y `cssVarPrefix` viven agrupados en `options` (D4 de la
 * spec de Journey citada arriba): ver `SlideDeckOptions` para el porqué de
 * cada uno.
 */
export function useSlideDeck(
  trackRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  slides: number,
  options: SlideDeckOptions = {},
): SlideDeckState {
  const { tailScreens = 0, cssVarPrefix = "deck" } = options;

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<SlideDeckDirection>("forward");

  // Espejo por ref de los dos valores de estado: el motor de medición
  // necesita conocer el ÚLTIMO valor confirmado en cada medición para
  // decidir si hace falta un `setState`, y un cierre sobre
  // `index`/`direction` capturaría el valor del render en que se creó el
  // efecto, no el actual.
  const indexRef = useRef(0);
  const directionRef = useRef<SlideDeckDirection>("forward");

  // `slides` puede llegar recalculado en cada render del consumidor sin que
  // eso deba reiniciar el efecto de abajo (que solo depende de los refs de
  // los elementos observados): se guarda en un ref que se sincroniza tras
  // CADA render, mismo patrón que `targetsRef` en `useSceneParallax`.
  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  });

  // `tailScreens` y `cssVarPrefix` comparten UN SOLO ref, no uno por campo:
  // los dos llegan siempre juntos, desde el mismo objeto `options` -- que es
  // nuevo en cada render del consumidor (un literal `{ tailScreens: ...,
  // cssVarPrefix: ... }` en la llamada) -- y `measure()`, más abajo, los lee
  // siempre a la vez. Igual que `slidesRef`, lo que importa es que el efecto
  // de abajo NO dependa de `options` (ni de sus campos desestructurados) en
  // su array de dependencias, o se reiniciaría en cada render del
  // consumidor; un solo ref cumple esa condición sin duplicar el mismo
  // `useEffect` de sincronización dos veces por dos valores que nunca se
  // leen por separado.
  const optionsRef = useRef({ tailScreens, cssVarPrefix });
  useEffect(() => {
    optionsRef.current = { tailScreens, cssVarPrefix };
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
          const next: SlideDeckDirection = delta < 0 ? "forward" : "rewind";
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
        // El término `optionsRef.current.tailScreens * vh` (D4) excluye la
        // cola de la pista (si la hay) del recorrido: sin él, el progreso
        // seguiría subiendo durante la zona de hold y `progress = 1`
        // llegaría tarde, al final físico de la pista en vez de al final de
        // la última diapositiva.
        const span = rect.height - vh - optionsRef.current.tailScreens * vh;
        const progress = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;

        const stage = stageRef.current;
        if (stage) {
          // El prefijo (D4, spec journey-deck-8-diapositivas) decide el
          // nombre de las dos variables: Story escribe `--story-*` pasando
          // `cssVarPrefix: "story"` explícitamente (ver `SlideDeckOptions`),
          // así que este cambio no mueve ni una línea de CSS en Story.
          const prefix = optionsRef.current.cssVarPrefix;
          stage.style.setProperty(`--${prefix}-enter`, enter.toFixed(4));
          stage.style.setProperty(`--${prefix}-progress`, progress.toFixed(4));
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
      // Medición inmediata: el estado (`--<prefix>-enter`/
      // `--<prefix>-progress`, `index`, `direction`) queda correcto en
      // cuanto la pista aparece en viewport, sin esperar a que el usuario
      // dispare un `scroll`.
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
