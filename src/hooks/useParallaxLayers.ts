"use client";
import { useEffect, useRef, type RefObject } from "react";
import { usePointer } from "@/hooks/usePointer";

export interface ParallaxTarget {
  /** Ref al elemento que recibe el transform. */
  readonly ref: RefObject<HTMLElement | null>;
  /** 0 = plano de fondo inmovil, 1 = plano mas cercano. */
  readonly depth: number;
}

export interface ParallaxAmplitude {
  readonly x: number;
  readonly y: number;
}

/**
 * Factor de suavizado por frame entre el valor de puntero APLICADO y su
 * objetivo, SOLO usado en la rama con `sceneRef` (ver JSDoc del hook). Mismo
 * numero y mismo proposito que `MODE_LERP` de `useSceneParallax`, pero
 * declarado aparte a proposito: los dos hooks se mantienen independientes
 * (ver docblock de mas abajo, "se declara un hook nuevo..."), y compartir
 * una constante entre modulos que no comparten nada mas seria acoplar dos
 * cosas por casualidad de que hoy valen lo mismo.
 */
const RELEASE_LERP = 0.08;

/**
 * Umbral de asentamiento del release (D3, spec 2026-08-04), SOLO relevante
 * en la rama con `sceneRef`. Mismo criterio y mismo orden de magnitud que
 * `REST_EPSILON` de `useSceneParallax`: en unidades normalizadas (-1..1,
 * las de `pointer.x`/`pointer.y`), 0.002 de residuo con las amplitudes que
 * usan Eye/Aura (20-30px) es bastante menos de un pixel de desplazamiento
 * perdido al saltar al reposo exacto.
 */
const REST_EPSILON = 0.002;

/**
 * Parallax 2.5D compartido por las composiciones del hero (hoy el ojo,
 * despues Aura): un unico rAF que escribe `transform` directamente en el DOM
 * para TODOS los objetivos a la vez. React nunca re-renderiza por frame.
 *
 * `targets` y `amplitude` se aceptan tal cual llegan en cada render, SIN
 * exigir memoizacion al consumidor: si el consumidor construye el array (o
 * el objeto de amplitud) de nuevo en cada render y esos valores vivieran en
 * las dependencias del efecto de abajo, el rAF se cancelaria y
 * reprogramaria en cada render del padre aunque nada relevante hubiera
 * cambiado. En su lugar los dos se guardan en sendos refs que se
 * actualizan en TODOS los renders (sin gatear nada), y el efecto solo
 * depende de lo que de verdad debe reiniciar el bucle.
 *
 * `sceneRef` (D3, spec 2026-08-04) es OPCIONAL y retrocompatible a proposito:
 * Eye.tsx y Aura.tsx (los dos consumidores actuales, hero, siempre en
 * pantalla al cargar la pagina) siguen llamando `useParallaxLayers(targets,
 * amplitude)` sin tercer argumento, y el comportamiento para ellos es
 * BIT A BIT el de siempre -- sin `IntersectionObserver`, sin lerp extra, rAF
 * desde el montaje hasta el desmontaje. Si `sceneRef` no se pasa, o se pasa
 * pero su `.current` todavia es `null` en el momento en que este efecto
 * corre (se lee UNA vez, sincronamente, igual que hace `useSceneParallax`
 * con el suyo), el hook cae en esa misma rama de siempre: asi ningun
 * consumidor existente se rompe por omision, y un consumidor nuevo que SI
 * quiera la guarda de visibilidad simplemente pasa una ref ya montada.
 *
 * Con `sceneRef` presente, el hook gana lo que hasta ahora le faltaba y que
 * si tienen sus hermanos de las escenas oscuras (`useSceneParallax`,
 * `useSlideDeck`): una guarda de `IntersectionObserver` que para el rAF
 * mientras el hero no esta en pantalla (leccion `task/lessons.md`
 * 2026-07-31, "un rAF sin guarda de visibilidad se multiplica por cada
 * consumidor del hook" -- aqui son 2, Eye y Aura, cada uno con su propio
 * bucle si algun dia alguno pasara `sceneRef`), y el mismo criterio de
 * "release" que D3 define para `useSceneParallax`: al perder la
 * interseccion el bucle NO se congela ni se resetea de golpe, sigue vivo con
 * el objetivo de puntero forzado a 0, y el mismo lerp que suaviza ese
 * objetivo (`RELEASE_LERP`) lleva las capas de vuelta a su sitio en unos
 * pocos frames; cuando el residuo baja de `REST_EPSILON` se escribe el
 * transform de reposo EXACTO (`translate3d(0,0,0)`, sin escala -- a
 * diferencia de las escenas oscuras este hook nunca escribe `scale()`, asi
 * que el reposo tampoco lo necesita) y se para el bucle de verdad. Si la
 * escena vuelve a intersectar antes de asentar, basta con apagar la bandera
 * de release sin reiniciar nada, para que reentrar no produzca un salto.
 */
export function useParallaxLayers(
  targets: readonly ParallaxTarget[],
  amplitude: ParallaxAmplitude,
  sceneRef?: RefObject<HTMLElement | null>,
): void {
  const pointer = usePointer();
  // `usePointer()` devuelve un objeto literal nuevo en cada invocacion (no
  // memoizado): depender de `pointer` entero en el efecto de abajo lo haria
  // re-ejecutarse en CADA render del consumidor (cancela + reprograma el
  // rAF), aunque `enabled` no cambiara de verdad. `x`/`y` si son refs
  // estables (el mismo objeto en cada invocacion de `usePointer`), asi que
  // extraerlas aqui y depender de los primitivos/refs -- no del objeto
  // envolvente -- deja el efecto quieto entre renders del consumidor y solo
  // lo reinicia cuando `enabled` cambia de verdad.
  const { x, y, enabled } = pointer;

  const targetsRef = useRef(targets);
  const amplitudeRef = useRef(amplitude);
  // Sincroniza los dos refs DESPUES de cada render, no durante -- leer o
  // escribir `.current` en el cuerpo del componente viola
  // `react-hooks/refs` (el lint del React Compiler) y, mas de fondo, es
  // insostenible si el compilador llega a memoizar el render y lo saltea.
  // Sin dependencias: debe correr tras TODOS los renders, no solo el
  // primero.
  useEffect(() => {
    targetsRef.current = targets;
    amplitudeRef.current = amplitude;
  });

  useEffect(() => {
    if (!enabled) return;

    // Se lee UNA sola vez, sincronamente, al arrancar el efecto -- mismo
    // patron que `useSceneParallax` con el suyo (los consumidores que pasan
    // `sceneRef` lo hacen desde una ref ya adjunta a un nodo del MISMO
    // render, asi que para cuando este efecto corre `.current` ya apunta al
    // elemento montado). Sin `sceneRef` (o con `.current` todavia nulo), cae
    // en la rama de siempre: sin observer, sin lerp extra, bit a bit el
    // comportamiento anterior a D3.
    const scene = sceneRef?.current ?? null;
    let raf = 0;

    if (!scene) {
      // ---- Rama de siempre: sin guarda de visibilidad (ver JSDoc). ----
      const tick = (): void => {
        const px = x.current;
        const py = y.current;
        const amp = amplitudeRef.current;
        for (const target of targetsRef.current) {
          if (target.depth === 0) continue; // el fondo no se mueve nunca
          const el = target.ref.current;
          if (!el) continue;
          el.style.transform = `translate3d(${px * amp.x * target.depth}px, ${py * amp.y * target.depth}px, 0)`;
        }
        raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(raf);
    }

    // ---- Rama con `sceneRef`: guarda de visibilidad + retorno a reposo. ----
    let running = false;
    // Ver JSDoc: `true` mientras la escena esta "de camino" al reposo tras
    // perder la interseccion. El bucle sigue vivo, solo cambia el objetivo.
    let releasing = false;
    let appliedX = 0;
    let appliedY = 0;

    const tick = (): void => {
      const amp = amplitudeRef.current;
      // Release: el objetivo de puntero se fuerza a 0 en vez de seguir la
      // posicion real -- el mismo `RELEASE_LERP` que suaviza el seguimiento
      // normal del cursor lleva `appliedX/Y` hasta ahi en unos pocos frames.
      const targetX = releasing ? 0 : x.current;
      const targetY = releasing ? 0 : y.current;
      appliedX += (targetX - appliedX) * RELEASE_LERP;
      appliedY += (targetY - appliedY) * RELEASE_LERP;

      for (const target of targetsRef.current) {
        if (target.depth === 0) continue; // el fondo no se mueve nunca
        const el = target.ref.current;
        if (!el) continue;
        el.style.transform = `translate3d(${(appliedX * amp.x * target.depth).toFixed(2)}px, ${(appliedY * amp.y * target.depth).toFixed(2)}px, 0)`;
      }

      // Asentado: el mayor de los dos residuos ya es indistinguible de 0.
      // Se escribe el reposo EXACTO -- no el que dejo este ultimo lerp, que
      // nunca llega a 0 del todo -- y se para el bucle de verdad.
      if (
        releasing &&
        Math.max(Math.abs(appliedX), Math.abs(appliedY)) < REST_EPSILON
      ) {
        settle();
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (running) return;
      running = true;
      // Ver el `start()` equivalente de `useSceneParallax`: sin esto, un
      // release interrumpido por el apagado de `enabled` (aunque hoy nada
      // lo resetea salvo el propio cleanup del efecto) dejaria la bandera
      // en `true` para el proximo arranque.
      releasing = false;
      raf = window.requestAnimationFrame(tick);
    };

    // Para el bucle SIN resetear los transforms. Solo la invoca `settle()`
    // (tras terminar de asentar un release) y el cleanup del efecto
    // (desmontaje o `enabled` que pasa a `false`) -- el observer YA NO la
    // llama directamente al perder interseccion, ese camino pasa siempre
    // por `release()`.
    const pause = (): void => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
    };

    // Entra en modo release (ver JSDoc): el bucle SIGUE corriendo, solo
    // cambia el objetivo a 0. La usa el `IntersectionObserver` de abajo
    // cuando `scene` sale del viewport.
    const release = (): void => {
      if (!running) return;
      releasing = true;
    };

    // Asienta el release: escribe en TODOS los objetivos con profundidad > 0
    // el transform de reposo EXACTO y entonces si para el bucle.
    const settle = (): void => {
      for (const target of targetsRef.current) {
        if (target.depth === 0) continue;
        const el = target.ref.current;
        if (el) el.style.transform = "translate3d(0.00px, 0.00px, 0)";
      }
      releasing = false;
      pause();
    };

    // La ULTIMA entrada del lote, no la primera: ver el porque completo en
    // `useReveal.ts` (P0 de la critica externa #21, 2026-09-08). Sus dos
    // consumidores de hoy (Eye, Aura) viven en el hero y no pasan `sceneRef`,
    // asi que hoy ni siquiera instancian este observador -- y aun asi se
    // arregla: la rama existe, leia el lote igual de mal que sus cuatro
    // hermanas, y el primer consumidor que la usara fuera del hero heredaria
    // el defecto entero sin nada que lo delate. Este observador vigila un
    // solo nodo (`scene`), asi que la ultima entrada es el estado vigente.
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry.isIntersecting) {
        // Si el bucle seguia vivo (en pleno release), basta con apagar la
        // bandera -- SIN tocar `appliedX`/`appliedY` -- para que siga
        // exactamente donde iba, sin salto. Si ya se habia asentado y
        // parado, arranca desde cero como siempre.
        if (running) releasing = false;
        else start();
      } else {
        release();
      }
    });
    observer.observe(scene);

    return () => {
      observer.disconnect();
      pause();
    };
  }, [enabled, x, y, sceneRef]);
}
