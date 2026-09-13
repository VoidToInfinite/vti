"use client";
import { useSyncExternalStore, type RefObject } from "react";

/** Factor de suavizado por frame. ~0.085 ≈ 85ms de asentamiento a 60fps (spec §4). */
const LERP = 0.085;

/**
 * Umbral de reposo del lerp compartido (auditoria de rendimiento 2026-08-08).
 * Un lerp por definicion nunca llega a 0 exacto, solo se acerca cada vez mas
 * despacio: sin un umbral el bucle de rAF nunca se pararia por si solo, ni
 * siquiera con el cursor quieto durante toda la sesion. Mismo orden de
 * magnitud que el `REST_EPSILON` de `useParallaxLayers`/`useSceneParallax`
 * (0.002) -- pero mas fino: esos dos hooks LEEN `x.current`/`y.current` cada
 * frame para decidir SU PROPIO reposo, asi que si este modulo se congelara
 * "casi en el objetivo" por encima del umbral de sus consumidores, ninguno
 * de los dos alcanzaria nunca su propia condicion de parada.
 */
const REST_EPSILON = 0.0005;

export interface Pointer {
  /** Posición X normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  x: RefObject<number>;
  /** Posición Y normalizada a −1..1, suavizada. Se lee dentro de un rAF. */
  y: RefObject<number>;
  /**
   * `false` en táctil o sin puntero fino (no hay cursor al que reaccionar),
   * o con `prefers-reduced-motion: reduce`. Reactivo en caliente: si el
   * usuario activa/desactiva la preferencia del sistema, o conecta/desconecta
   * un ratón mientras la pestaña sigue abierta, este valor cambia sin
   * necesidad de recargar la página.
   */
  enabled: boolean;
}

/** Recorta `n` al rango −1..1: un evento fuera del viewport no debe extrapolar. */
function clamp(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

/*
 * ---------------------------------------------------------------------------
 * Estado de módulo: UN SOLO singleton para TODA la aplicación (auditoría de
 * rendimiento 2026-08-08).
 *
 * Antes de esta revisión, cada llamada a `usePointer()` montaba su PROPIO
 * listener de `pointermove` + su PROPIO bucle de rAF recursivo, calculando el
 * MISMO lerp sobre los MISMOS eventos globales. En tema oscuro, con Eye
 * (`useParallaxLayers`) y las cuatro escenas Story/Journey/Features/Contact
 * (`useSceneParallax`) montadas a la vez, eso eran 5 listeners y 5 bucles de
 * rAF vivos en permanencia -- ninguno con guarda de visibilidad propia --
 * haciendo el mismo trabajo cinco veces por frame. La posición del puntero es
 * un único dato global: no hay ninguna razón para que cada consumidor la
 * recalcule por su cuenta.
 *
 * El contrato público NO cambia: `usePointer()` sigue devolviendo
 * `{ x, y, enabled }` por llamada. Lo que cambia es que `x`/`y` son ahora el
 * MISMO objeto de módulo para todo el árbol (antes eran un `useRef` propio de
 * cada instancia) -- sus consumidores (`useParallaxLayers`, `useSceneParallax`)
 * ya leían `.current` dentro de su propio rAF sin depender de la identidad
 * del objeto entre renders, así que la estabilidad de referencia que sus
 * efectos exigen en las dependencias (`[enabled, x, y, ...]`) se sigue
 * cumpliendo -- de hecho mejor que antes, porque ahora es literalmente el
 * mismo objeto para siempre, no solo estable dentro de una misma instancia.
 *
 * `enabled` se sirve vía `useSyncExternalStore`: cada componente se
 * suscribe/desuscribe (React llama a `subscribe` en el montaje y a su
 * función de limpieza en el desmontaje, garantizado por el contrato del
 * hook), y ese ciclo de vida es exactamente el contador de referencias que
 * decide cuándo levantar la maquinaria compartida (primer suscriptor) y
 * cuándo desmontarla del todo (último suscriptor). Sustituye tanto el
 * `useState` como el `useEffect` de listeners de `matchMedia` que antes vivían
 * dentro del propio hook, con el beneficio añadido de que los DOS listeners
 * de `change` (fino + reduced-motion) también pasan a ser uno solo por toda
 * la app, en vez de uno por consumidor.
 * ---------------------------------------------------------------------------
 */
const pos = { x: { current: 0 }, y: { current: 0 } };
const target = { x: 0, y: 0 };

let subscriberCount = 0;
let fineQuery: MediaQueryList | null = null;
let reducedQuery: MediaQueryList | null = null;
let pointerAttached = false;
/** `true` mientras el bucle de rAF está efectivamente programado (ver `tick`). */
let looping = false;
let rafId = 0;
let currentEnabled = false;
const storeListeners = new Set<() => void>();

function computeEnabled(): boolean {
  return !!fineQuery?.matches && !reducedQuery?.matches;
}

function notifyStore(): void {
  storeListeners.forEach((listener) => listener());
}

/*
 * Un paso de lerp hacia `target`. Parada por umbral (spec rendimiento
 * 2026-08-08): en cuanto los DOS ejes están a menos de `REST_EPSILON` del
 * objetivo, fija el valor EXACTO (el lerp nunca converge solo) y NO
 * reprograma el siguiente frame -- el bucle se para de verdad, no solo deja
 * de tener efecto visible. `onMove`/`onLeave` son quienes lo reanudan la
 * próxima vez que el objetivo se mueve de verdad.
 */
function tick(): void {
  const dx = target.x - pos.x.current;
  const dy = target.y - pos.y.current;
  if (Math.abs(dx) < REST_EPSILON && Math.abs(dy) < REST_EPSILON) {
    pos.x.current = target.x;
    pos.y.current = target.y;
    looping = false;
    return;
  }
  pos.x.current += dx * LERP;
  pos.y.current += dy * LERP;
  rafId = window.requestAnimationFrame(tick);
}

/** Arranca el bucle si estaba parado. Idempotente: no duplica la programación. */
function resumeLoop(): void {
  if (looping) return;
  looping = true;
  rafId = window.requestAnimationFrame(tick);
}

function onMove(e: PointerEvent): void {
  target.x = clamp((e.clientX / window.innerWidth - 0.5) * 2);
  target.y = clamp((e.clientY / window.innerHeight - 0.5) * 2);
  resumeLoop();
}

function onLeave(): void {
  target.x = 0;
  target.y = 0;
  resumeLoop();
}

/** Registra el ÚNICO listener de puntero de todo el módulo + arranca el bucle. Idempotente. */
function attachPointerTracking(): void {
  if (pointerAttached) return;
  pointerAttached = true;
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("mouseleave", onLeave);
  resumeLoop();
}

/*
 * Quita el listener + para el bucle y resetea la posición a 0: igual que
 * antes de esta revisión, un apagado en caliente (o el desmontaje del último
 * suscriptor) no debe dejar la posición congelada en el último desplazamiento
 * del cursor. Idempotente.
 */
function detachPointerTracking(): void {
  if (!pointerAttached) return;
  pointerAttached = false;
  window.removeEventListener("pointermove", onMove);
  document.removeEventListener("mouseleave", onLeave);
  if (looping) {
    window.cancelAnimationFrame(rafId);
    looping = false;
  }
  pos.x.current = 0;
  pos.y.current = 0;
  target.x = 0;
  target.y = 0;
}

/** Handler ÚNICO de `change`, compartido por `fineQuery` y `reducedQuery`. */
function handleMediaChange(): void {
  currentEnabled = computeEnabled();
  if (currentEnabled) attachPointerTracking();
  else detachPointerTracking();
  notifyStore();
}

/*
 * `subscribe` de `useSyncExternalStore`: React la llama una vez por
 * componente montado y ejecuta el cleanup que devuelve al desmontar -- el
 * contador de referencias completo vive en este ciclo de vida, sin un
 * `useEffect` adicional en el hook público.
 *
 * SSR (`typeof window === "undefined"`): sin `window` no hay `matchMedia` que
 * consultar ni nada que suscribir -- cleanup vacío, y `getServerSnapshot`
 * (más abajo) ya resuelve `enabled` a `false` para ese render.
 */
function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (subscriberCount === 0) {
    fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    currentEnabled = computeEnabled();
    if (currentEnabled) attachPointerTracking();
    fineQuery.addEventListener("change", handleMediaChange);
    reducedQuery.addEventListener("change", handleMediaChange);
  }
  subscriberCount += 1;
  storeListeners.add(onStoreChange);

  return () => {
    storeListeners.delete(onStoreChange);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      fineQuery?.removeEventListener("change", handleMediaChange);
      reducedQuery?.removeEventListener("change", handleMediaChange);
      fineQuery = null;
      reducedQuery = null;
      detachPointerTracking();
    }
  };
}

function getSnapshot(): boolean {
  return currentEnabled;
}

/** Sin `window` (SSR/prerender estático) el puntero nunca está habilitado. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Puntero suavizado por lerp, normalizado a −1..1 respecto al viewport.
 *
 * Devuelve refs, no estado (spec §13): un `useState` actualizado en cada
 * `pointermove` re-renderizaría React ~60 veces por segundo. El consumidor
 * (el ojo, la escena) lee `.current` dentro de su propio rAF y escribe
 * transforms directamente en el DOM.
 *
 * Internamente es un singleton de módulo (ver el bloque de comentarios de
 * arriba): un solo listener de `pointermove`, un solo bucle de rAF y un solo
 * par de listeners de `matchMedia` para toda la aplicación, sin importar
 * cuántos componentes llamen a este hook a la vez.
 */
export function usePointer(): Pointer {
  const enabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { x: pos.x, y: pos.y, enabled };
}
