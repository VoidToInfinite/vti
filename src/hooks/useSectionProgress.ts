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
 *
 * DUEÑO DEL NODO Y RETRACCIÓN (crítica externa #14, P0 del scrollspy
 * fosilizado, medido en Chrome real). Este hook es el ÚNICO que escribe
 * `data-inview` y las dos variables `--<prefix>-*`, así que es también el
 * único que puede borrarlas -- y hasta esta entrega no las borraba NUNCA. Los
 * dos agujeros: la limpieza del efecto solo desconectaba el observer y paraba
 * el bucle, y perder el elemento SIN desmontarse no estaba contemplado en
 * absoluto. Ese segundo caso es real y es el que se midió: `Features.tsx` y
 * `Contact.tsx` llaman al hook en las DOS ramas de tema pero solo ATAN el ref
 * en la clara, así que al pasar a oscuro `ref.current` queda en `null`
 * mientras React REUTILIZA el mismo `<section id="features">` (las dos ramas
 * lo renderizan en la misma posición del árbol). El bucle seguía vivo
 * escribiendo en el vacío -- `updateMeasurement`/`writeVars` leían
 * `ref.current` → `null` y no escribían nada --, y el último valor escrito en
 * claro se quedaba FOSILIZADO en el nodo: tras conmutar a oscuro con la
 * lectura en Características, `features` conservaba `data-inview="true"` y
 * `contact` `"false"` en las cinco posiciones de scroll barridas (Story y
 * Viaje sí quedaban limpias: sus decks oscuros son componentes distintos y
 * remontan nodos nuevos). `useActiveSection` leía esa señal muerta y
 * `aria-current` -- con él el enlace de idioma que lo consume -- anunciaba
 * «Características» en toda la página.
 *
 * INVARIANTE NUEVO, lo único que hay que respetar al tocar esto: el hook
 * observa y escribe siempre sobre el MISMO nodo (`observed`, capturado al
 * atarse), y `observed` solo puede ser el nodo al que apuntaba `ref.current`
 * en el último commit. En cuanto dejan de coincidir, RETRACTA sobre
 * `observed` -- borra las dos variables y el atributo, dejando el nodo como
 * estaba antes de que este hook lo tocara --, deja de observarlo y para el
 * bucle. Tres caminos lo garantizan, y hacen falta los tres:
 *
 * 1. `syncTarget()`, llamado desde el efecto sin dependencias, cubre los dos
 *    sentidos (soltar el nodo y volver a atarlo) porque un ref solo cambia de
 *    valor en un commit y todo commit del consumidor ejecuta ese efecto. El
 *    sentido de VUELTA (oscuro → claro, el mismo nodo otra vez) no tiene otro
 *    camino: el efecto principal depende solo de `[ref]`, estable de por vida,
 *    así que no se re-ejecuta y nadie volvería a observar el nodo.
 * 2. Las guardas de `tick()` y de la notificación del `IntersectionObserver`,
 *    para el consumidor que desate el ref sin que el dueño del hook
 *    re-renderice (una rama montada por un hijo con su propio `useTheme`).
 * 3. La limpieza del efecto, que retracta al desmontar.
 *
 * Un consumidor que NO ate el ref (la rama oscura) queda así exactamente como
 * si el hook no existiera: sin bucle, sin observer y sin rastro en el DOM.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  options?: SectionProgressOptions,
): void {
  const optionsRef = useRef(options);
  /**
   * Puente hacia el `syncTarget()` del efecto principal (ver "DUEÑO DEL NODO"
   * en el JSDoc del hook): lo publica ese efecto al arrancar y lo retira su
   * limpieza, así que solo puede apuntar a la instancia viva.
   */
  const syncTargetRef = useRef<(() => void) | null>(null);

  /*
   * Efecto SIN dependencias: corre tras CADA render del consumidor.
   * Sincroniza `options` (regla 6) y, desde el arreglo del scrollspy
   * fosilizado, es además el LATIDO que vuelve a mirar `ref.current`. Es la
   * granularidad exacta que hace falta y ni una más: el valor de un ref solo
   * cambia como consecuencia de un commit de React, y todo commit del
   * consumidor ejecuta este efecto -- sin listeners nuevos, sin un frame extra
   * y sin exigirle memoización a nadie.
   */
  useEffect(() => {
    optionsRef.current = options;
    syncTargetRef.current?.();
  });

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let running = false;
    // Se sella en `start()`: distingue "nunca ha intersectado todavia" (no
    // se escribe nada al primer aviso de `isIntersecting: false`) de "acaba
    // de dejar de intersectar" (si hay que escribir el reposo).
    let hasEntered = false;

    /**
     * El nodo que este efecto observa Y sobre el que escribe -- el único, y
     * la fuente de verdad de todo el efecto (nadie vuelve a leer `ref.current`
     * salvo para COMPARARLO con esto). `null` mientras el consumidor no ate el
     * ref: la rama oscura de Features/Contact vive permanentemente así.
     */
    let observed: HTMLElement | null = null;

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

    /**
     * Deja el elemento EXACTAMENTE como estaba antes de que este hook lo
     * tocara (ver "DUEÑO DEL NODO" en el JSDoc del hook): las dos variables
     * fuera y el atributo fuera, no un valor "neutro" escrito encima. La
     * diferencia importa río abajo: `useActiveSection` distingue "el atributo
     * no está" (no hay señal en el árbol -> resuelve por geometría) de "el
     * atributo dice false" (el lector está en el Hero, la rama clara SÍ opinó).
     * También se limpia la caché de escritura, o el nodo siguiente heredaría
     * un `lastInViewText` que le impediría volver a escribir el mismo valor.
     */
    const retract = (el: HTMLElement): void => {
      const { prefix } = resolveOptions(optionsRef.current);
      el.style.removeProperty(`--${prefix}-enter`);
      el.style.removeProperty(`--${prefix}-progress`);
      delete el.dataset.inview;
      lastEnterText = "";
      lastProgressText = "";
      lastInViewText = "";
    };

    const updateMeasurement = (): void => {
      const el = observed;
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

    // Geometria cacheada EN EL INSTANTE en que `start()` la confirmo (ver el
    // docblock de `tick()`, justo abajo): punto de referencia para medir
    // cuanto se ha movido `lastTop` desde entonces, no solo SI se ha movido.
    let topAtStart = 0;

    /**
     * Margen de tolerancia del respaldo de salida (fix wave E, hallazgo E1),
     * en píxeles. Absorbe el sub-píxel de la PRIMERA actualización real de
     * `onScroll` tras `start()` -- medido en Chrome real: el primer evento
     * `scroll` de una animación `scroll-behavior: smooth` recién arrancada
     * puede mover el elemento menos de 1-2px (el tramo de aceleración de la
     * curva de easing), así que "¿se ha movido ALGO?" no basta -- un simple
     * `true`/`false` seguía dejando pasar ese primer paso minúsculo como
     * "movimiento real" y disparaba el respaldo contra la MISMA geometría
     * boundary que el observer real ya había confirmado. 8px es un margen
     * amplio frente al paso de 1-6px medido en ese primer evento, y minúsculo
     * frente a cualquier cruce real de sección (cientos de píxeles) -- no
     * hay tensión entre proteger la entrada reciente y detectar una salida
     * genuina.
     */
    const SETTLE_TOLERANCE_PX = 8;

    /**
     * Respaldo de salida (fix wave E, hallazgo E1 -- evaluador de navegador
     * real, 2026-08-13), medido en Chrome real, sin CPU throttling: la
     * MISMA fórmula de "¿intersecta?" que ya usa el resto del repo
     * (`rect.top < vh && rect.bottom > 0` -- ver `intersectsViewport` en
     * `useActiveSection.ts`), aplicada sobre la geometría CACHEADA
     * (`lastTop`/`lastHeight`/`lastVh`, ya fresca por `onScroll`/`onResize`
     * mientras el bucle corre) en vez de un nuevo `getBoundingClientRect`.
     *
     * DIAGNÓSTICO (instrumentando `IntersectionObserver` de verdad en el
     * navegador, no supuesto): tras un gesto de scroll hacia arriba de
     * varios pasos (`page.mouse.wheel`, 12 muescas realistas, o el
     * equivalente `window.scrollTo(behavior:"instant")`) que atraviesa una
     * sección de punta a punta -- entra por un lado, sale por el otro --, el
     * `IntersectionObserver` entregó la notificación de ENTRADA
     * (`isIntersecting: true`, capturado por el log instrumentado) pero
     * NUNCA la de SALIDA: el cruce final quedó a un pelo del borde exacto
     * del viewport, y sin un evento adicional que reevaluara la geometría
     * después de ese último frame, el navegador simplemente no volvió a
     * comprobar. Esto NO es el mismo defecto que el fix de
     * `useActiveSection.ts` (que reevalúa CUÁNDO re-leer `data-inview`) --
     * este es más profundo: `data-inview` mismo se queda mal escrito, porque
     * `tick()` (mientras `running` siga `true`) escribía `inView: true`
     * INCONDICIONALMENTE en cada frame, sin volver a comprobar si la
     * sección seguía intersecando de verdad. Con `running` nunca puesto a
     * `false` (porque `pause()` solo lo hace desde `onIntersectExit`, que
     * nunca llegó a dispararse), el bucle -- y la señal falsa -- corrían
     * para siempre.
     *
     * `onScroll`/`onResize` SIGUEN corriendo durante todo ese tramo (activos
     * mientras `running === true`, que es justo la ventana en la que el
     * aviso se perdió), así que `lastTop`/`lastHeight`/`lastVh` YA reflejan
     * la geometría real y fresca en cada frame -- verificar contra ellos
     * aquí no añade ningún listener, `Observer` ni layout forzado nuevo:
     * reutiliza el mismo dato que `computeTargets()`, dos líneas más abajo,
     * ya iba a leer. Si la caché dice que ya no intersecta, se trata
     * exactamente como si el observer hubiera avisado -- mismo camino
     * (`onIntersectExit`), sin duplicar la lógica de reposo.
     *
     * `topAtStart`/`SETTLE_TOLERANCE_PX` (dos hallazgos adicionales,
     * atrapados por el propio candado antes de darlos por buenos -- las dos
     * fórmulas anteriores de este respaldo, "sáltate solo el primer `tick`"
     * y luego "sáltate hasta el primer `scroll` real", NO bastaban):
     *
     * Esta sección -- como cualquiera que llegue justo después de un Hero a
     * pantalla completa, `min-height: 100dvh` -- puede empezar a intersecar
     * con `rect.top` EXACTAMENTE igual a `innerHeight` (el borde justo, cero
     * píxeles de solape real). Medido en Chrome real: el propio
     * `IntersectionObserver` considera ESE borde exacto como
     * `isIntersecting: true` (así llamó a `start()`), y la geometría se
     * queda clavada en ese mismo valor durante varios `tick()` -- a veces
     * varios frames enteros -- hasta que la animación de scroll suave emite
     * su primer evento `scroll` real. Ese primer evento, medido, puede mover
     * el elemento tan solo 1-2px (el arranque de la curva de easing) --
     * seguir sin cruzar de forma clara el límite ambiguo. Con un simple
     * `true`/`false` (intento anterior), ese primer paso minúsculo ya
     * contaba como "algo se movió" y activaba la fórmula estricta contra una
     * geometría que seguía, en la práctica, siendo la misma que el observer
     * real ya había validado -- deshaciendo la entrada, de forma
     * intermitente según cuántos px trajera ese primer evento (de ahí la
     * inconsistencia entre corridas: 1px de más o de menos decidía si el
     * candado se disparaba).
     *
     * La distinción real entre los dos casos no está en la geometría en sí
     * (los dos pueden compartir el MISMO `rect.top === innerHeight` exacto)
     * sino en CUÁNTO se ha alejado la geometría de la que el observer
     * confirmó por última vez: `topAtStart` guarda esa foto original, y el
     * respaldo solo se activa una vez que `lastTop` se ha separado de ella
     * más de `SETTLE_TOLERANCE_PX` -- lo bastante para no ser ruido de
     * arranque de la animación, lo bastante poco para no retrasar la
     * detección de una salida real (que implica cientos de píxeles de
     * scroll, no unos pocos).
     */
    const tick = (): void => {
      // Guarda de propiedad (ver "DUEÑO DEL NODO" en el JSDoc del hook): si el
      // consumidor desató el ref, este bucle ya no describe nada -- retracta
      // sobre el nodo que sí observaba y se para, en vez de seguir girando
      // sobre `null` como hacía antes.
      if (ref.current !== observed) {
        detachTarget();
        return;
      }
      const el = observed;
      if (el) {
        if (Math.abs(lastTop - topAtStart) > SETTLE_TOLERANCE_PX) {
          const stillIntersecting =
            lastTop < lastVh && lastTop + lastHeight > 0;
          if (!stillIntersecting) {
            onIntersectExit();
            return;
          }
        }
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
      if (running || !observed) return;
      running = true;
      hasEntered = true;
      updateMeasurement();
      topAtStart = lastTop;
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
      const el = observed;
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
      const el = observed;
      if (!el) return;
      appliedEnter = 1;
      appliedProgress = 0;
      writeVars(el, 1, 0, true);
    };

    const observer = new IntersectionObserver((entries) => {
      // La ULTIMA entrada del lote, no la primera: ver el porque completo en
      // `useReveal.ts` (P0 de la critica externa #21, 2026-09-08). Aqui el
      // precio de leer la obsoleta era `onIntersectExit()` con la seccion
      // DENTRO del viewport y, con la guarda `hasEntered` puesta, no escribir
      // NADA: medido tras conmutar oscuro a claro, `--story-progress` y
      // `--story-enter` no llegaban a escribirse nunca. Este observador
      // vigila un solo nodo (`observed`), asi que todas las entradas del lote
      // son suyas y la ultima es el estado vigente.
      const entry = entries[entries.length - 1];
      // Misma guarda de propiedad que `tick()`: una notificación sobre un nodo
      // que el consumidor ya soltó no describe la sección que este hook
      // pretende publicar.
      if (!observed) return;
      if (ref.current !== observed) {
        detachTarget();
        return;
      }
      if (entry.isIntersecting) start();
      else onIntersectExit();
    });

    // El bucle solo arranca con las DOS condiciones a la vez: la seccion
    // intersecta Y no hay reduced-motion (mismo criterio que
    // `useSceneParallax`/`useSlideDeck`). Bajo `reduce` se desconecta el
    // observer entero.
    const applyReducedPreference = (): void => {
      const el = observed;
      if (!el) return;
      if (reducedQuery.matches) {
        observer.disconnect();
        stopForReduced();
      } else {
        observer.observe(el);
      }
    };

    /**
     * Soltar el nodo: parar, dejar de observarlo y RETRACTAR sobre él. El
     * estado interno vuelve al que tenía antes de atarse (`hasEntered` y los
     * valores aplicados del lerp), porque el siguiente atado -- aunque sea al
     * MISMO nodo tras volver al tema claro -- es una entrada nueva y no debe
     * heredar ni un reposo escrito ni la posición del lerp de la otra rama.
     */
    const detachTarget = (): void => {
      const el = observed;
      if (!el) return;
      pause();
      // `disconnect()` y no `unobserve(el)`: este observer vigila UN solo nodo
      // por construcción (lo ata `attachTarget`, lo suelta esta función), así
      // que las dos llamadas son equivalentes aquí -- y `disconnect` es además
      // la que el hook ya usaba, la que el resto del repo mockea en sus tests.
      observer.disconnect();
      retract(el);
      observed = null;
      hasEntered = false;
      appliedEnter = 0;
      appliedProgress = 0;
    };

    /** Atar el nodo: `observe()` entrega su primer aviso de forma asíncrona
     *  antes del siguiente pintado, así que es él quien arranca el bucle con
     *  el estado REAL de intersección -- también en el camino de vuelta
     *  (oscuro → claro), sin que este hook tenga que suponer nada. */
    const attachTarget = (el: HTMLElement): void => {
      observed = el;
      applyReducedPreference();
    };

    /** Reconcilia `observed` con `ref.current`. Idempotente y baratísima (una
     *  comparación de identidad) cuando no hay nada que hacer, que es el caso
     *  de la inmensa mayoría de renders. */
    const syncTarget = (): void => {
      const el = ref.current;
      if (el === observed) return;
      detachTarget();
      if (el) attachTarget(el);
    };

    syncTarget();
    reducedQuery.addEventListener("change", applyReducedPreference);
    syncTargetRef.current = syncTarget;

    return () => {
      syncTargetRef.current = null;
      reducedQuery.removeEventListener("change", applyReducedPreference);
      // Retracta al desmontar: el nodo puede SOBREVIVIR al desmontaje de quien
      // ata el ref (React reutiliza `<section id="features">` entre ramas de
      // tema), y un atributo sin dueño es exactamente el defecto que se
      // arregla aquí.
      detachTarget();
      pause();
      observer.disconnect();
    };
  }, [ref]);
}
