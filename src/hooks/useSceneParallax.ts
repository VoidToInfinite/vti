"use client";
import { useEffect, useRef, type RefObject } from "react";
import { usePointer } from "@/hooks/usePointer";

export interface SceneParallaxTarget {
  /** Ref al elemento que recibe el transform. */
  readonly ref: RefObject<HTMLElement | null>;
  /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
  readonly depth: number;
}

export interface SceneParallaxAmplitude {
  readonly x: number;
  readonly y: number;
}

export interface SceneParallaxOptions {
  /** Amplitud del parallax de puntero en px, a profundidad 1. */
  readonly pointerAmp: SceneParallaxAmplitude;
  /** Amplitud del parallax de scroll en px, a profundidad 1. */
  readonly scrollAmp: number;
  /** Escala base comun a todas las capas (evita bordes vacios al desplazar). */
  readonly overscan: number;
  /** Amplitud de la deriva automatica cuando el puntero lleva quieto `idleMs`. */
  readonly driftAmp?: SceneParallaxAmplitude;
  /** Milisegundos sin movimiento de puntero antes de que la deriva tome el control. */
  readonly idleMs?: number;
}

const DEFAULT_DRIFT_AMP: SceneParallaxAmplitude = { x: 0.55, y: 0.35 };
const DEFAULT_IDLE_MS = 2200;

/**
 * Factor de suavizado por frame entre el valor de puntero/deriva APLICADO y
 * el OBJETIVO de cada modo (spec 2026-07-31 §puerta de contencion). Antes de
 * esta entrega el `tick` saltaba de golpe entre "sigue al puntero" y
 * "deriva" (`const px = idle ? drift : pointer`); con la escena solo idle
 * cada ~2.2s ese salto duro apenas se notaba. La puerta de contencion (mas
 * abajo) hace que `idle` tambien se active/desactive cada vez que el cursor
 * CRUZA el borde de la seccion -- con `pointerAmp` 46 y `depth` 0.72 (Story)
 * ese salto llega a ~50px en la capa mas cercana, visible en cada cruce. El
 * lerp interpola el valor aplicado hacia el objetivo un poco cada frame en
 * vez de adoptarlo entero, igual que el `LERP` de `usePointer` pero mas
 * lento (ahi suaviza una trayectoria continua; aqui, un salto discreto entre
 * dos modos que ahora puede repetirse a cada cruce de frontera). Desde D3
 * (spec 2026-08-04) este mismo lerp cubre TAMBIEN el tercer modo, "release"
 * (ver JSDoc del hook): salir de la seccion no anade un salto nuevo, solo un
 * objetivo nuevo (0) al mismo mecanismo de convergencia gradual.
 */
const MODE_LERP = 0.08;

/**
 * Umbral de asentamiento del release (D3, spec 2026-08-04). `tick()` mide el
 * mayor de los tres residuos -- `|appliedX|`, `|appliedY|`, `|scrollProgress|`,
 * las tres en las mismas unidades normalizadas (-1..1) que ya usan
 * `pointerX.current`/`pointerY.current` y el propio `scrollProgress` -- y en
 * cuanto ese maximo baja de este valor, el release se da por terminado: se
 * escribe el transform de reposo EXACTO (ver `restTransform`) y se para el
 * bucle. Un lerp por definicion nunca llega a 0 exacto, solo se acerca cada
 * vez mas despacio, asi que sin un umbral el bucle jamas se pararia solo por
 * "esperar a asentarse". 0.002 de residuo en el termino de mayor amplitud
 * practica del repo (`pointerAmp`/`scrollAmp` rondan 12-60px) se traduce en
 * bastante menos de un pixel de desplazamiento perdido al saltar al reposo
 * exacto -- invisible en pantalla, y mucho antes de que el lerp deje de
 * converger de forma perceptible.
 */
const REST_EPSILON = 0.002;

/**
 * Transform de reposo EXACTO para una capa de esta escena: el mismo que
 * produciria la regla CSS estatica (`scale(overscan)`, sin traslacion --
 * ver JSDoc del hook) si `style.transform` estuviera vacio. Con los tres
 * terminos (`appliedX`, `appliedY`, `scrollProgress`) exactamente en su
 * objetivo (0), la formula de `tick()` da este mismo resultado para
 * CUALQUIER `target.depth` (todo lo que multiplica a `depth` se anula), asi
 * que `settle()` puede escribir un unico string para todos los objetivos en
 * vez de recorrer la formula por capa.
 */
function restTransform(overscan: number): string {
  return `translate3d(0.00px, 0.00px, 0) scale(${overscan.toFixed(4)})`;
}

/** Puntero (coordenadas de viewport) dentro del rectangulo de la escena. */
function isInsideRect(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/**
 * Parallax de puntero + scroll + deriva en reposo para UNA escena a sangre
 * (`StoryCosmicBeing`, spec 2026-07-29 §5). Distinto de `useParallaxLayers`
 * (Eye/Aura, que solo sigue al puntero): aqui hace falta ademas un termino de
 * scroll y una deriva lenta cuando nadie toca el puntero, asi que se declara
 * un hook nuevo en vez de anadir features a uno compartido que ya sirve al
 * hero -- tocar `useParallaxLayers` arriesgaria una regresion en Eye/Aura por
 * una necesidad que no es la suya.
 *
 * Reutiliza `usePointer()` para la coordenada de puntero (lerp, se apaga solo
 * en tactil) pero NO delega en su `enabled` la decision de arrancar este
 * hook: ese flag mezcla "tactil" con "reduced-motion", y aqui el scroll/deriva
 * SI deben seguir vivos en tactil (no hay puntero que seguir, pero si hay
 * scroll). El unico apagado total POR PREFERENCIA de este hook es
 * `prefers-reduced-motion: reduce`, comprobado con su propio listener
 * reactivo (mismo patron que `usePointer`): al apagarse, cada objetivo vuelve
 * a `transform: ""`, dejando que la regla CSS estatica (`scale(overscan)`,
 * sin traslacion) sea la unica en efecto -- el estado de reposo que pide D6
 * del spec.
 *
 * Guarda de visibilidad por `IntersectionObserver` sobre `sceneRef` (mismo
 * patron que `useSlideDeck`): sin ella, el bucle de rAF de abajo se
 * reprogramaba a si mismo desde el montaje y para siempre, sin importar si
 * `sceneRef` seguia en pantalla. Este hook lo consumen CUATRO secciones del
 * tema oscuro (Story 11 capas, Journey 5, Features 10 y Contact 7): eso son
 * 4 bucles permanentes escribiendo `transform` en 33 elementos por frame
 * durante toda la sesion, esten o no esas secciones en el viewport.
 * El bucle solo corre cuando las DOS condiciones se cumplen -- interseccion
 * Y no-reduce --, nunca con una sola.
 *
 * Al salir de pantalla, el bucle NO se pausa de golpe: entra en modo
 * "release" (D3, spec 2026-08-04). El encargo del usuario pide justo lo
 * contrario de lo que hacia esta escena hasta la entrega anterior --"al
 * abandonar la seccion, restaurar cada elemento del efecto parallax a su
 * posicion inicial"--, pero un `transform = ""` en el instante del cruce
 * reproduce el salto de hasta ~50px (capa mas cercana de Story, `pointerAmp.y`
 * 20 x `depth` 0.72 x 2 + el termino de scroll) que motivo pausar-sin-resetear
 * en la version anterior de este hook: esa objecion sigue siendo correcta, lo
 * que cambia no es "resetear si o no", es COMO. `release()` fuerza a 0 el
 * objetivo de puntero/deriva Y el de scroll, y dentro de `tick()` el MISMO
 * `MODE_LERP` que ya suaviza el cruce entre "sigue al puntero" y "deriva"
 * lleva los tres terminos (`appliedX`, `appliedY`, `scrollProgress`) a su
 * reposo en unos pocos frames -- ni salto instantaneo ni congelacion
 * permanente. Mientras dura el release, `onScroll` deja de escribir
 * `scrollProgress` (si siguiera escribiendo el valor medido en tiempo real,
 * que permanece clampado en +-1 mientras el usuario sigue alejandose, el
 * lerp hacia 0 nunca convergeria). Cuando el mayor de los tres residuos baja
 * de `REST_EPSILON`, `settle()` escribe el transform de reposo EXACTO (el
 * que produciria la regla CSS estatica, ver `restTransform`) y entonces si
 * cancela el rAF y quita los listeners de `pointermove`/`scroll` -- el mismo
 * ahorro de CPU que motivo la guarda de visibilidad, solo que unos frames
 * despues de perder la interseccion en vez de en el mismo frame. Si la
 * seccion vuelve a intersectar ANTES de asentar, el observer apaga la
 * bandera `releasing` sin tocar `appliedX`/`appliedY`/`scrollProgress`: el
 * bucle sigue exactamente donde iba, sin reiniciar nada, para que reentrar
 * tampoco produzca un salto. `stop()` (reset duro e instantaneo,
 * `transform = ""`) sigue reservada a `reduce` y al desmontaje: los dos
 * unicos casos sin "vuelta" que proteger, donde no habra mas frames que
 * suavicen el reset.
 *
 * Puerta de contencion por seccion (encargo 2026-07-31): `usePointer()`
 * normaliza la coordenada contra el VIEWPORT, no contra esta escena, asi que
 * sin guarda adicional cualquier escena visible seguia al cursor aunque
 * estuviera sobre OTRA seccion (p. ej. el cursor en HERO movia el parallax de
 * Story si Story ya estaba en pantalla). La guarda de `IntersectionObserver`
 * de arriba solo resuelve "¿la escena esta en pantalla?", que no es lo mismo
 * que "¿el cursor esta DENTRO de ella?". `onPointerMove` calcula ese segundo
 * booleano contra `sceneRef.current.getBoundingClientRect()` y lo guarda en
 * `insideRef`; el `tick` reutiliza el modo `idle` que ya existia (seguir vs.
 * derivar) en vez de anadir un tercer modo: fuera de la seccion, `idle` pasa
 * a `true` sin esperar a `idleMs`, y la escena deriva exactamente igual que
 * cuando el puntero lleva quieto. Se descarta congelar la escena (dejar el
 * ultimo transform aplicado sin tocar) porque eso la dejaria torcida para
 * siempre en la posicion que tenia el cursor al salir -- la deriva, en
 * cambio, sigue viva y vuelve a centrarse con el tiempo, que es el estado de
 * reposo que esta escena ya sabe dibujar. Ademas, `lastMoveRef` solo se
 * sella cuando el movimiento ocurre DENTRO: si se sellara tambien fuera, un
 * movimiento del cursor en otra seccion mantendria el modo "sigue al
 * puntero" activo aqui hasta que expirase `idleMs`, en vez de pasar a reposo
 * al instante de cruzar el borde.
 */
export function useSceneParallax(
  sceneRef: RefObject<HTMLElement | null>,
  targets: readonly SceneParallaxTarget[],
  options: SceneParallaxOptions,
): void {
  const pointer = usePointer();
  const { x: pointerX, y: pointerY } = pointer;

  const targetsRef = useRef(targets);
  const optionsRef = useRef(options);
  useEffect(() => {
    targetsRef.current = targets;
    optionsRef.current = options;
  });

  const lastMoveRef = useRef(0);
  /** Puntero dentro del rectangulo de `sceneRef` ahora mismo (ver JSDoc). */
  const insideRef = useRef(false);

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let running = false;
    // `true` mientras la escena esta "de camino" al reposo tras perder la
    // interseccion (ver JSDoc, D3): el bucle sigue vivo, solo cambia el
    // objetivo de cada termino. Se apaga sola en `settle()` (asentado) o en
    // el observer si la seccion vuelve a intersectar antes de asentar.
    let releasing = false;
    let scrollProgress = 0;
    // Valor APLICADO del lerp entre modos (ver `MODE_LERP`): persiste entre
    // frames dentro de este efecto, igual que `scrollProgress`.
    let appliedX = 0;
    let appliedY = 0;

    const onPointerMove = (e: PointerEvent): void => {
      const el = sceneRef.current;
      const inside =
        !!el && isInsideRect(el.getBoundingClientRect(), e.clientX, e.clientY);
      insideRef.current = inside;
      // Solo sella `lastMoveRef` si el movimiento ocurrio DENTRO (ver JSDoc):
      // un movimiento fuera no debe posponer el paso a reposo de esta escena.
      if (inside) lastMoveRef.current = performance.now();
    };

    const onScroll = (): void => {
      // Durante el release el termino de scroll lo lleva `tick` con lerp
      // hacia 0 (ver JSDoc, D3): si este handler siguiera escribiendo el
      // valor medido en tiempo real -- que permanece clampado en +-1
      // mientras el usuario sigue alejandose -- el asentamiento no
      // convergeria nunca.
      if (releasing) return;
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      scrollProgress = Math.max(
        -1,
        Math.min(1, -rect.top / window.innerHeight),
      );
    };

    const tick = (now: number): void => {
      const opts = optionsRef.current;
      const drift = opts.driftAmp ?? DEFAULT_DRIFT_AMP;
      const idleMs = opts.idleMs ?? DEFAULT_IDLE_MS;
      // Fuera de la seccion, reposo inmediato (sin esperar `idleMs`): ver
      // JSDoc del hook, puerta de contencion por seccion.
      const idle = !insideRef.current || now - lastMoveRef.current > idleMs;

      // Release (D3, ver JSDoc): el objetivo de puntero/deriva se fuerza a 0
      // -- no es "modo idle", es "modo reposo" -- y el mismo `MODE_LERP` que
      // ya suaviza el cruce puntero<->deriva lleva `appliedX/Y` hasta ahi.
      const targetX = releasing
        ? 0
        : idle
          ? Math.sin(now / 7000) * drift.x
          : pointerX.current;
      const targetY = releasing
        ? 0
        : idle
          ? Math.cos(now / 9500) * drift.y
          : pointerY.current;
      // Lerp del valor aplicado hacia el objetivo del modo vigente: sin esto,
      // cada cruce de la frontera de la seccion saltaria de golpe entre
      // "sigue al puntero" y "deriva" (ver `MODE_LERP`).
      appliedX += (targetX - appliedX) * MODE_LERP;
      appliedY += (targetY - appliedY) * MODE_LERP;
      // El termino de scroll sigue el mismo patron SOLO durante el release:
      // fuera de el, `scrollProgress` sigue siendo el valor instantaneo de
      // siempre (lo escribe `onScroll`, sin lerp), asi que el comportamiento
      // EN seccion no cambia ni un pixel respecto a antes de D3.
      if (releasing) scrollProgress += (0 - scrollProgress) * MODE_LERP;
      const px = appliedX;
      const py = appliedY;

      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (!el) continue;
        const x = px * opts.pointerAmp.x * target.depth;
        const y =
          py * opts.pointerAmp.y * target.depth +
          scrollProgress * opts.scrollAmp * target.depth;
        // Task 7 (plan premium F1-F5, "micro-perf sin riesgo"): `scale`
        // CONGELADO en `overscan` -- hasta esta tarea variaba
        // `+- 0.05 * depth` con `scrollProgress` (hasta +-3.6% en Story, la
        // escena de mayor profundidad -- 0.72 -- y +-5% en Journey/Features/
        // Contact, con depth 1). A diferencia de una traslacion pura (que
        // solo recoloca el bitmap ya rasterizado de la capa), un `scale` que
        // cambia en CADA frame de scroll fuerza al compositor a
        // re-rasterizar para no perder nitidez -- coste medido, no solo
        // teorico, que motiva esta tarea. El `overscan` de cada escena ya
        // esta dimensionado para absorber la traslacion (`x`/`y`, arriba)
        // por si mismo: verificado en navegador real, sin costura visible en
        // ninguna de las cuatro escenas (informe de la tarea). Solo se
        // traslada; la escala deja de depender de `scrollProgress`.
        const scale = opts.overscan;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      }

      // Asentado: el mayor de los tres residuos ya es indistinguible de 0
      // (ver `REST_EPSILON`). Se escribe el reposo EXACTO -- no el que dejo
      // este ultimo lerp, que nunca llega a 0 del todo -- y se para el bucle
      // de verdad, no solo se deja de escribir sobre el.
      if (
        releasing &&
        Math.max(
          Math.abs(appliedX),
          Math.abs(appliedY),
          Math.abs(scrollProgress),
        ) < REST_EPSILON
      ) {
        settle();
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (running) return;
      running = true;
      // Ver JSDoc: si `releasing` sobreviviera de un release anterior
      // interrumpido por `reduce` (`stop()` para el bucle pero no toca esta
      // bandera), un reinicio normal arrancaria directo en modo reposo en
      // vez de seguir al puntero/scroll otra vez.
      releasing = false;
      lastMoveRef.current = performance.now();
      // Ver JSDoc: sin esto, un `insideRef` sellado a `true` antes de una
      // pausa por salir de pantalla sobreviviria al reinicio del bucle, y la
      // escena seguiria al puntero un frame de mas al reentrar aunque el
      // cursor ya no estuviera sobre ella.
      insideRef.current = false;
      window.addEventListener("pointermove", onPointerMove, {
        passive: true,
      });
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      raf = window.requestAnimationFrame(tick);
    };

    // Para el bucle SIN resetear los transforms. Hoy solo la invocan
    // `settle()` (tras terminar de asentar un release) y `stop()`
    // (reduce/desmontaje): el observer YA NO la llama directamente al
    // perder interseccion -- ese camino ahora pasa siempre por `release()`
    // (ver JSDoc, D3 2026-08-04). Se conserva sin resetear transform porque
    // `settle()` necesita escribir su PROPIO valor de reposo exacto
    // despues de pararla, no un `""` que dependeria de la regla CSS estatica
    // reaccionando en el mismo frame.
    const pause = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };

    // Entra en modo release (D3): el bucle SIGUE corriendo, solo cambia el
    // objetivo de cada termino a 0. La usa el `IntersectionObserver` de
    // abajo cuando `sceneRef` sale del viewport. No hace nada si el bucle no
    // estaba corriendo (nada que liberar).
    const release = (): void => {
      if (!running) return;
      releasing = true;
    };

    // Asienta el release: escribe en TODOS los objetivos el transform de
    // reposo EXACTO (ver `restTransform`) y entonces si para el bucle. No
    // depende de `target.depth` -- con los tres terminos exactamente en 0 la
    // formula de `tick()` da el mismo resultado para cualquier profundidad.
    const settle = (): void => {
      const rest = restTransform(optionsRef.current.overscan);
      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (el) el.style.transform = rest;
      }
      releasing = false;
      pause();
    };

    // Parada definitiva: pausa + reset de transform. A diferencia de
    // `pause()`, el reset corre SIEMPRE (no solo si `running`), porque
    // `reduce` puede activarse mientras la escena ya estaba en pleno release
    // (o incluso ya asentada), y aun asi hay que devolver las capas a su
    // regla CSS estatica de inmediato -- aqui no hay "unos pocos frames" que
    // proteger, `reduce` pide precisamente lo contrario. Reservado a
    // `reduce` y al desmontaje: los dos unicos casos sin "vuelta" que
    // proteger (ver JSDoc del hook).
    const stop = (): void => {
      releasing = false;
      pause();
      for (const target of targetsRef.current) {
        const el = target.ref.current;
        if (el) el.style.transform = "";
      }
    };

    // El bucle solo arranca con las DOS condiciones a la vez: la escena
    // intersecta Y no hay reduced-motion. Bajo `reduce` se desconecta el
    // observer entero (nada que observar: el hook esta apagado del todo);
    // fuera de `reduce`, el observer decide `start()`/`release()` segun
    // interseccion en cada aviso.
    // La ULTIMA entrada del lote, no la primera: ver el porque completo en
    // `useReveal.ts` (P0 de la critica externa #21, 2026-09-08). Aqui el
    // precio de leer la obsoleta era entrar en `release()` con la escena
    // DENTRO del viewport, o sea el parallax detenido. Este observador vigila
    // un solo nodo (`sceneRef.current`), asi que todas las entradas del lote
    // son suyas y la ultima es el estado vigente.
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry.isIntersecting) {
        // Si el bucle seguia vivo (en pleno release), basta con apagar la
        // bandera -- SIN tocar `appliedX`/`appliedY`/`scrollProgress` -- para
        // que siga exactamente donde iba, sin salto (ver JSDoc, D3). Si ya
        // se habia asentado y parado, arranca desde cero como siempre.
        if (running) releasing = false;
        else start();
      } else {
        release();
      }
    });

    const evaluate = (): void => {
      if (reducedQuery.matches) {
        stop();
        observer.disconnect();
      } else {
        const el = sceneRef.current;
        if (el) observer.observe(el);
      }
    };

    evaluate();
    reducedQuery.addEventListener("change", evaluate);

    return () => {
      reducedQuery.removeEventListener("change", evaluate);
      observer.disconnect();
      stop();
    };
  }, [pointerX, pointerY, sceneRef]);
}
