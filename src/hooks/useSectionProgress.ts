"use client";
import { useEffect, useRef, type RefObject } from "react";

export interface SectionProgressOptions {
  /** Factor de lerp por frame entre el valor MEDIDO y el APLICADO (ver `MODE_LERP` de `useSceneParallax`). Defecto 0.12. */
  readonly smooth?: number;
  /** Prefijo de las dos variables CSS (`--<prefix>-enter` / `--<prefix>-progress`) y del criterio implicito de `data-inview`. Defecto "section". */
  readonly cssVarPrefix?: string;
}

const DEFAULT_SMOOTH = 0.12;
const DEFAULT_PREFIX = "section";

/**
 * Fraccion del alto de viewport que el borde superior de la seccion debe
 * recorrer -- desde que asoma por el borde inferior del viewport -- para que
 * `--<prefix>-enter` llegue a 1. NO es 1 (una pantalla completa) a proposito:
 * el encargo pide "su borde superior ha subido AL MENOS una fraccion del
 * viewport", y con F = 1 la rampa de entrada solo terminaria justo cuando la
 * seccion ya ocupa el viewport entero -- para una seccion de una pantalla de
 * alto (Features/Contacto, D4 de la spec) eso coincide casi exactamente con
 * el instante en que empieza a SALIR por arriba, dejando la entrada
 * "todavia en marcha" durante todo el cruce en vez de resuelta con
 * antelacion. Con F = 0.5 (medio viewport de recorrido) la entrada se
 * resuelve a medio camino de la aparicion, dejando el resto del cruce para
 * el termino de TRAVESIA (`--<prefix>-progress`) sin que los dos efectos
 * compitan por describir el mismo tramo -- mismo espiritu que D7 ("una
 * entrada que ya esta a medias cuando la miras se lee como serenidad").
 */
const ENTER_TRAVEL_FRACTION = 0.5;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function resolveOptions(options: SectionProgressOptions | undefined): {
  smooth: number;
  prefix: string;
} {
  return {
    smooth: options?.smooth ?? DEFAULT_SMOOTH,
    prefix: options?.cssVarPrefix ?? DEFAULT_PREFIX,
  };
}

/**
 * Progreso de scroll de UNA seccion (D2, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`).
 * Publica dos numeros y un flag directamente sobre `ref.current.style` /
 * `.dataset` -- NUNCA como estado de React (regla 1 del encargo): un valor
 * que cambia hasta 60 veces por segundo de scroll no puede pasar por
 * `setState` sin re-renderizar el arbol al mismo ritmo por un dato que solo
 * consume CSS. Mismo principio que `useSceneParallax` (`transform`) y
 * `useSlideDeck` (`--deck-enter`/`--deck-progress`), pero aqui el consumidor
 * es la seccion misma, no una escena con capas propias.
 *
 * Dos terminos, con semantica distinta:
 * - `--<prefix>-enter`: 0 cuando el borde superior de la seccion coincide
 *   con el borde INFERIOR del viewport (`rect.top === vh`), 1 cuando el
 *   borde superior ha subido `ENTER_TRAVEL_FRACTION * vh` (ver su JSDoc).
 *   Rampa de ENTRADA, pensada para animar la aparicion.
 * - `--<prefix>-progress`: 0 cuando el borde superior de la seccion coincide
 *   con el borde inferior del viewport (`rect.top === vh`, "acaba de asomar
 *   por abajo"), 1 cuando el borde INFERIOR de la seccion coincide con el
 *   borde superior del viewport (`rect.bottom === 0`, "acaba de salir por
 *   arriba"). El recorrido total es `vh + rect.height` (el viewport
 *   completo mas el propio alto de la seccion): es la definicion simetrica
 *   del cruce COMPLETO, la que hace que 0 y 1 caigan exactamente en los dos
 *   instantes en que la seccion es, respectivamente, apenas visible por
 *   primera y ultima vez. Termino de TRAVESIA, el que consume el parallax de
 *   contenido.
 *
 * Motor: un bucle de `requestAnimationFrame` CONTINUO, guardado por
 * `IntersectionObserver` (regla 2) -- deliberadamente distinto del motor de
 * `useSlideDeck` (medicion disparada solo por eventos `scroll`/`resize`,
 * coalescida a un rAF de un solo uso). Ahi no hace falta un bucle vivo
 * porque `measure()` escribe el valor exacto de una vez; aqui la regla 4
 * exige LERP -- "convertir el escalon de la rueda en una rampa continua" --
 * y una sola muesca de rueda dispara casi siempre UN solo evento `scroll`,
 * no una racha. Sin un bucle que siga corriendo varios frames despues de
 * ese evento, el lerp nunca tendria ocasion de converger: se quedaria en el
 * primer paso hacia el objetivo y ahi se pararia. El precio de un bucle vivo
 * (un `getBoundingClientRect` -- layout forzado -- en cada frame) se evita
 * separando MEDICION de SUAVIZADO: `scroll`/`resize` (regla 7) actualizan una
 * geometria cacheada (`lastTop`/`lastHeight`/`lastVh`), y el `tick` de cada
 * frame solo lee esa cache y hace avanzar el lerp -- cero layouts mientras
 * el usuario esta quieto, igual coste que `useSceneParallax` mientras
 * scrollea.
 *
 * `hasEnteredRef` evita escribir nada antes de la PRIMERA interseccion real
 * (regla de test "a"): un `IntersectionObserver` recien conectado puede
 * emitir su primer aviso con `isIntersecting: false` (la seccion aun no
 * esta en pantalla) y, sin esta guarda, ese aviso ejecutaria la rama de
 * "salida" -- escribiendo un reposo que nunca sucedio -- antes de que la
 * seccion hubiera aparecido ni una vez.
 *
 * Reposo al salir (regla 5, criterio decidido y documentado aqui): al
 * dejar de intersectar, `data-inview` pasa a `"false"` y los dos valores
 * saltan (sin lerp: la seccion ya no es visible, no hay salto que percibir)
 * al extremo que corresponde al lado por el que salio, leido con un
 * `getBoundingClientRect` fresco en el propio instante de la salida:
 * - Salio por ABAJO (`rect.bottom > 0`, el borde superior no ha llegado a
 *   cruzar el borde superior del viewport -- incluye tanto "nunca llego a
 *   entrar del todo y el usuario revirtio el scroll" como el caso general de
 *   estar de nuevo por debajo): `enter = 0`, `progress = 0`. Es el mismo
 *   valor que tendria si estuviera a punto de asomar, que es exactamente su
 *   situacion.
 * - Salio por ARRIBA (`rect.bottom <= 0`, la seccion entera quedo por encima
 *   del viewport): `enter = 1`, `progress = 1`. Ya recorrio el cruce
 *   completo.
 *
 * `prefers-reduced-motion: reduce` (regla 3, guarda reactiva con su propio
 * listener, mismo patron que `useSceneParallax`): el bucle no arranca (ni
 * loop, ni observer, ni listeners de `scroll`/`resize`), y se escribe UNA
 * sola vez el estado final estable -- `enter: 1` ("ya colocada"), `progress:
 * 0` (SIN termino de travesia: cualquier parallax de contenido que
 * multiplique por este valor queda inmovil) y `data-inview: "true"`. Un
 * valor congelado a medias seria peor que uno congelado en su extremo
 * visible y quieto -- mismo criterio que D3 del encargo para las escenas
 * oscuras. Esta escritura es incondicional (no depende de `hasEnteredRef`):
 * bajo `reduce` la nocion de "cruce de scroll" no aplica desde el principio,
 * asi que el consumidor debe quedar visible y quieto exista o no una
 * interseccion previa.
 *
 * `options` llega tal cual en cada render, sin exigir memoizacion al
 * consumidor (regla 6): se guarda en un ref sincronizado en un efecto SIN
 * dependencias (mismo patron que `targetsRef`/`optionsRef` de
 * `useSceneParallax`), y el efecto principal solo depende de `ref` -- lo
 * unico que de verdad debe reiniciar el bucle.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  options?: SectionProgressOptions,
): void {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let running = false;
    // Se sella en `start()`: distingue "nunca ha intersectado todavia" (no
    // se escribe nada al primer aviso de `isIntersecting: false`) de "acaba
    // de dejar de intersectar" (si hay que escribir el reposo).
    let hasEntered = false;

    // Geometria cacheada, actualizada solo por `scroll`/`resize` (ver JSDoc
    // del motor): el `tick` de cada frame lee esto en vez de forzar un
    // layout nuevo por frame.
    let lastTop = 0;
    let lastHeight = 0;
    let lastVh = 0;

    // Valores APLICADOS del lerp: persisten entre frames y entre ciclos de
    // entrada/salida dentro de este mismo efecto (igual que `appliedX`/
    // `appliedY` en `useSceneParallax`).
    let appliedEnter = 0;
    let appliedProgress = 0;

    // Ultimo texto escrito de cada variable/atributo. Existe para no repetir
    // una escritura identica 60 veces por segundo: mientras el usuario esta
    // quieto, el lerp ya ha convergido y `toFixed(4)` produce EL MISMO string
    // frame tras frame, pero `setProperty`/`setAttribute` invalidan estilo
    // aunque el valor no cambie -- el navegador no compara, escribe. Con la
    // seccion parada en pantalla (el caso normal de una seccion de una
    // pantalla de alto, D4) eso son tres invalidaciones por frame que no
    // describen ningun cambio. Se comparan strings y no numeros a proposito:
    // el string es lo que de verdad llega al CSSOM, asi que dos numeros que
    // solo difieren en el quinto decimal cuentan como el mismo valor, que es
    // justo el criterio que interesa.
    let lastEnterText = "";
    let lastProgressText = "";
    let lastInViewText = "";

    const writeVars = (
      el: HTMLElement,
      enter: number,
      progress: number,
      inView: boolean,
    ): void => {
      const { prefix } = resolveOptions(optionsRef.current);
      const enterText = enter.toFixed(4);
      const progressText = progress.toFixed(4);
      const inViewText = inView ? "true" : "false";
      if (enterText !== lastEnterText) {
        lastEnterText = enterText;
        el.style.setProperty(`--${prefix}-enter`, enterText);
      }
      if (progressText !== lastProgressText) {
        lastProgressText = progressText;
        el.style.setProperty(`--${prefix}-progress`, progressText);
      }
      if (inViewText !== lastInViewText) {
        lastInViewText = inViewText;
        el.dataset.inview = inViewText;
      }
    };

    const updateMeasurement = (): void => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      lastTop = rect.top;
      lastHeight = rect.height;
      lastVh = window.innerHeight;
    };

    const computeTargets = (): { enter: number; progress: number } => {
      const enterSpan = ENTER_TRAVEL_FRACTION * lastVh;
      const enter = enterSpan > 0 ? clamp01((lastVh - lastTop) / enterSpan) : 1;
      const traverseSpan = lastVh + lastHeight;
      const progress =
        traverseSpan > 0 ? clamp01((lastVh - lastTop) / traverseSpan) : 0;
      return { enter, progress };
    };

    const tick = (): void => {
      const el = ref.current;
      if (el) {
        const { enter: targetEnter, progress: targetProgress } =
          computeTargets();
        const { smooth } = resolveOptions(optionsRef.current);
        appliedEnter += (targetEnter - appliedEnter) * smooth;
        appliedProgress += (targetProgress - appliedProgress) * smooth;
        writeVars(el, appliedEnter, appliedProgress, true);
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onScroll = (): void => updateMeasurement();
    const onResize = (): void => updateMeasurement();

    const start = (): void => {
      if (running) return;
      running = true;
      hasEntered = true;
      updateMeasurement();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      // Primer frame SINCRONO (mismo patron que `measure()` en
      // `useSlideDeck`): las variables quedan escritas en cuanto la seccion
      // intersecta, sin esperar a que el navegador pinte un frame de rAF, y
      // ese mismo `tick` programa el siguiente para que el lerp siga
      // convergiendo.
      tick();
    };

    // Detiene el bucle sin tocar los valores escritos. La usa tanto la
    // salida de pantalla (que SI necesita el reposo, ver `rest()` mas abajo)
    // como el desmontaje (donde no importa: el elemento desaparece).
    const pause = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };

    // Reposo al salir del viewport (regla 5, criterio documentado en el
    // JSDoc del hook). Se lee un `getBoundingClientRect` FRESCO -- no la
    // cache de `lastTop`/`lastHeight`, que puede llevar varios frames sin
    // refrescarse si el usuario dejo de scrollear antes de que la seccion
    // cruzara del todo -- para decidir el lado exacto por el que salio.
    const rest = (): void => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const exitedAbove = rect.bottom <= 0;
      appliedEnter = exitedAbove ? 1 : 0;
      appliedProgress = exitedAbove ? 1 : 0;
      writeVars(el, appliedEnter, appliedProgress, false);
    };

    const onIntersectExit = (): void => {
      pause();
      // Ver `hasEntered` mas arriba: un aviso de salida sin una entrada
      // previa (primer aviso del observer con `isIntersecting: false`) no
      // escribe nada.
      if (hasEntered) rest();
    };

    // Estado final estable bajo `reduce` (regla 3, ver JSDoc del hook):
    // incondicional, no depende de `hasEntered`.
    const stopForReduced = (): void => {
      pause();
      const el = ref.current;
      if (!el) return;
      appliedEnter = 1;
      appliedProgress = 0;
      writeVars(el, 1, 0, true);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else onIntersectExit();
    });

    // El bucle solo arranca con las DOS condiciones a la vez: la seccion
    // intersecta Y no hay reduced-motion (mismo criterio que
    // `useSceneParallax`/`useSlideDeck`). Bajo `reduce` se desconecta el
    // observer entero.
    const evaluate = (): void => {
      if (reducedQuery.matches) {
        observer.disconnect();
        stopForReduced();
      } else {
        const el = ref.current;
        if (el) observer.observe(el);
      }
    };

    evaluate();
    reducedQuery.addEventListener("change", evaluate);

    return () => {
      reducedQuery.removeEventListener("change", evaluate);
      observer.disconnect();
      pause();
    };
  }, [ref]);
}
