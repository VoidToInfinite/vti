"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Sentido del último desplazamiento significativo dentro de la pista. */
export type SlideDeckDirection = "forward" | "rewind";

/**
 * RECORRIDO DE FIJACIÓN DE UNA DIAPOSITIVA, en pantallas (adimensional):
 * cuánto scroll consume cada diapositiva de una presentación pegajosa antes
 * de ceder el turno a la siguiente. Es la constante que los DOS decks del
 * sitio (Story y Journey) comparten para construir la altura de su pista, y
 * vive aquí —y no en el fichero de datos de una de las dos secciones—
 * porque el reparto que gobierna es exactamente el que `measure()` invierte
 * unas líneas más abajo: la pista mide `(slides - 1) * recorrido + (1 +
 * cola)` pantallas, y de ahí el `span` que este hook reparte sale valiendo
 * `(slides - 1) * recorrido`. Ponerla en `story.layers.ts` obligaría a
 * `journey.layers.ts` a importar datos de una sección hermana —el acoplamiento
 * que los docblocks de `STORY_DECK_TAIL_SCREENS`/`JOURNEY_OVERLAY_RISE`
 * rechazan explícitamente—, y duplicarla en las dos es la clase de repetición
 * que la regla 13 de `RULES.md` prohíbe.
 *
 * ## De dónde sale el 0,5 (decisión del dueño, crítica externa #16)
 *
 * Hasta esta ola valía 1 pantalla: cada diapositiva consumía `100dvh` de
 * scroll, así que la pista de Story medía 7 pantallas y la de Journey 9. Lo
 * que la crítica #16 midió sobre el build de producción, en tema oscuro:
 *
 * - el documento medía 16.376 px a 1440×900 y 14.836 a 1280×800, frente a
 *   6.558 y 6.388 en tema claro — dos veces y media la misma página;
 * - `#contact` caía en y=14.571 en oscuro y en y=4.566 en claro;
 * - el 88 % de ese exceso eran los dos decks: 6.300 px de Story y 8.100 de
 *   Journey a 1440×900;
 * - 11 tramos de ~800 px sin un solo cambio de copia, el 54 % del documento.
 *
 * Es la raíz de tres heurísticas de Nielsen a 2/4 (consistencia entre temas,
 * reconocimiento, eficiencia). El dueño decidió recortar el recorrido de cada
 * diapositiva «aproximadamente a la mitad (~800 → ~400 px)» en los dos decks,
 * NO retirar el deck ni cambiar de vehículo. Media pantalla es esa mitad
 * expresada en la única unidad que no depende del dispositivo: a 800 px de
 * alto da 400 px por diapositiva, a 900 da 450.
 *
 * ## Por qué el recorte NO toca la cola ni el solape de la sección siguiente
 *
 * La aritmética completa vive en el docblock de `JOURNEY_DECK_TAIL_SCREENS`
 * (`journey.layers.ts`), que la rehace con este término dentro. El resumen:
 * las dos costuras que fijan la cola (`T = R` y `R = 1`) se cancelan la
 * altura de la pista, así que valen igual con el recorrido que sea. El
 * recorrido reparte la presentación; la cola sostiene el relevo con la
 * sección siguiente. Son dos magnitudes independientes.
 *
 * ## Candidata a token, declarada
 *
 * Su sitio natural el día que exista una escala de recorrido de scroll es
 * `src/theme/tokens/`, junto a `motion`/`space`. No se crea aquí porque esta
 * entrega no es dueña de los tokens; queda declarado para la integración.
 */
export const DECK_SLIDE_TRAVEL_SCREENS = 0.5;

/**
 * `DECK_SLIDE_TRAVEL_SCREENS` ya como longitud CSS, que es la forma en que lo
 * consumen las dos pistas (`STORY_DECK_TRACK_HEIGHT`,
 * `JOURNEY_DECK_TRACK_HEIGHT`). Se DERIVA del número de arriba en vez de
 * escribirse a mano: dos constantes que dicen lo mismo en dos formatos
 * distintos pueden divergir en silencio, y aquí la divergencia rompería la
 * igualdad `span = (slides - 1) * recorrido` sobre la que este hook calcula
 * todo.
 *
 * `dvh` y no `vh` por el mismo motivo que `STORY_DARK_HEIGHT`/
 * `JOURNEY_DARK_HEIGHT`: la barra de direcciones móvil cambia `vh` a mitad de
 * gesto y el recorrido de la pista se movería debajo del dedo.
 */
export const DECK_SLIDE_TRAVEL = `${DECK_SLIDE_TRAVEL_SCREENS * 100}dvh`;

export interface SlideDeckState {
  /** Diapositiva activa, 0..slides-1. */
  index: number;
  /** Sentido del último desplazamiento significativo dentro de la pista. */
  direction: SlideDeckDirection;
  /**
   * Lleva el scroll de la página a la posición de la pista que activa la
   * diapositiva `slideIndex` (crítica externa #10, hallazgo A: el rail de
   * progreso deja de ser decorativo y pasa a ser un control real).
   *
   * Vive AQUÍ y no en el consumidor porque la geometría que hay que invertir
   * (`progress = -rect.top / span`, con `span` descontando el viewport y la
   * cola) es exactamente la que calcula `measure()` unas líneas más abajo:
   * reimplementarla en la sección duplicaría la fórmula en dos sitios que
   * tendrían que moverse a la vez — la clase de duplicación que este repo ya
   * ha pagado (regla 13/41 de `RULES.md`). El hook sigue sin saber a qué
   * presentación gobierna: solo invierte su propia fórmula.
   *
   * No hace nada si la pista todavía no está montada, si la presentación
   * tiene una sola diapositiva o si el tramo de recorrido es <= 0 (los
   * mismos casos degenerados que `measure()` ya trata).
   */
  scrollToSlide: (slideIndex: number) => void;
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
        //
        // ESTE `span` ES EL RECORRIDO REAL, no un múltiplo de `vh`: sale de
        // la ALTURA MEDIDA de la pista menos las dos pantallas que no son
        // recorrido (la del stage pegado y la de la cola). Desde la crítica
        // externa #16 las dos pistas se construyen como `(slides - 1) *
        // DECK_SLIDE_TRAVEL + (1 + cola) * 100dvh`, así que este `span` vale
        // exactamente `(slides - 1) * DECK_SLIDE_TRAVEL` y cada diapositiva
        // se lleva `DECK_SLIDE_TRAVEL` de scroll -- media pantalla hoy, una
        // entera hasta esa crítica. El hook no necesitó cambiar ni una línea
        // para el recorte, y eso NO es casualidad: nunca supuso que una
        // diapositiva midiera una pantalla, solo que la pista declara su
        // recorrido en su propia altura. Queda escrito aquí porque la
        // tentación al leer el `- vh` es justo la contraria.
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

  /*
   * Inversa exacta de `measure()`: dado un índice de diapositiva, devuelve la
   * posición de scroll del documento en la que ese índice sería el activo.
   *
   *   measure:  progress = -rect.top / span      index = round(progress * (N-1))
   *   inversa:  progress = slideIndex / (N-1)    top   = trackTopDoc + progress * span
   *
   * `span` se recalcula aquí y no se cachea a propósito: `vh` y la altura de
   * la pista cambian con cada `resize`, y el hook ya renuncia a cachear
   * geometría por ese motivo en el motor de medición. Un
   * `getBoundingClientRect()` en el instante de un click no compite con
   * nada — a diferencia del de `measure()`, que corre por frame de scroll.
   *
   * El centro exacto de la ventana de un índice es `slideIndex / (N-1)`
   * porque `updateIndex` redondea: el índice k es el activo mientras
   * `progress` cae en `[(k-0.5)/(N-1), (k+0.5)/(N-1)]`. Aterrizar en el
   * centro deja media ventana de margen a cada lado, así que un píxel de
   * diferencia por redondeo del navegador no cambia la diapositiva activa.
   *
   * `behavior` bajo `prefers-reduced-motion: reduce`: "instant", nunca
   * "smooth" — un salto de varias pantallas con desplazamiento animado es
   * exactamente el movimiento que esa preferencia pide evitar. Se consulta
   * `matchMedia` en el momento del click y no se cachea porque la
   * preferencia puede cambiar en caliente (el efecto de arriba ya escucha
   * ese `change` por su cuenta). En la práctica, bajo `reduce` el rail está
   * en `display: none` (la presentación se linealiza, D12) y este camino no
   * es alcanzable; se implementa igualmente para que el contrato del hook no
   * dependa de una decisión de CSS de UNO de sus consumidores.
   */
  const scrollToSlide = useCallback(
    (slideIndex: number): void => {
      const track = trackRef.current;
      if (!track) return;
      const total = slidesRef.current;
      if (total <= 1) return;

      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = rect.height - vh - optionsRef.current.tailScreens * vh;
      if (span <= 0) return;

      const progress = clamp(slideIndex, 0, total - 1) / (total - 1);
      const trackTopDoc = rect.top + window.scrollY;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      window.scrollTo({
        top: trackTopDoc + progress * span,
        behavior: reduce ? "instant" : "smooth",
      });
    },
    [trackRef],
  );

  return { index, direction, scrollToSlide };
}
