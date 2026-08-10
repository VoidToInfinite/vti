"use client";
import { useSyncExternalStore } from "react";
import { NAV_GROUPS } from "@/config/navigation";

/**
 * IDs de sección que participan en el resaltado de navegación activa
 * (Tarea 1, navegación accesible): los mismos `key` de los items
 * `kind: "section"` del grupo `onSite` de `NAV_GROUPS` -- que además son
 * el `id` real de cada `<section>` de la home (`id="story"` en `Story.tsx`,
 * y lo mismo en `Journey.tsx`/`Features.tsx`/`Contact.tsx`) y el
 * `cssVarPrefix` con el que cada una llama a `useSectionProgress`
 * (`useSectionProgress(ref, { cssVarPrefix: "story" })`, etc.). Derivarla
 * del propio modelo de navegación en vez de repetirla como array literal es
 * la misma invariante que la regla 13 de `RULES.md`: si `onSite` gana o
 * pierde una sección, este módulo la sigue sin que nadie tenga que
 * acordarse de una segunda lista.
 */
const ACTIVE_SECTION_IDS: readonly string[] = (
  NAV_GROUPS.find((group) => group.key === "onSite")?.items ?? []
)
  .filter((item) => item.kind === "section")
  .map((item) => item.key);

let activeKey: string | null = null;
let subscriberCount = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/*
 * `evaluate()` NO crea ningún `IntersectionObserver` propio (regla del
 * brief de la Tarea 1: "Detección por el motor existente -- reutilizar, no
 * crear un observer nuevo"). `useSectionProgress` ya monta UN
 * `IntersectionObserver` por cada una de las cuatro secciones de la home
 * (Story/Journey/Features/Contact) y ya escribe `dataset.inview`
 * ("true"/"false") directamente sobre el elemento de esa sección en cada
 * frame de su propio bucle de rAF (ver `src/hooks/useSectionProgress.ts`).
 * Este módulo se limita a LEER esa señal ya calculada; no vuelve a medir
 * ninguna geometría de scroll por su cuenta.
 *
 * Desempate cuando más de una sección tiene `data-inview="true"` a la vez:
 * ocurre en la franja de transición entre dos secciones contiguas, porque
 * el `IntersectionObserver` de `useSectionProgress` usa el `threshold` por
 * defecto (0) -- "dentro" es cualquier solape mayor que cero, así que la
 * sección que sale por arriba y la que entra por abajo pueden estar las dos
 * en `true` durante un tramo del cruce. Gana la ÚLTIMA en el orden de la
 * página (`ACTIVE_SECTION_IDS`, de arriba a abajo): el usuario ya ha visto
 * casi toda la sección saliente y está mirando la entrante, así que
 * mantener resaltada la que se va leería como una navegación que va por
 * detrás del scroll real.
 */
function evaluate(): void {
  let next: string | null = null;
  for (const id of ACTIVE_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el?.dataset.inview === "true") next = id;
  }
  if (next !== activeKey) {
    activeKey = next;
    notify();
  }
}

function handleScrollOrResize(): void {
  evaluate();
}

/*
 * `subscribe` de `useSyncExternalStore`, mismo patrón de singleton de
 * módulo que `usePointer` (ver su docblock): un solo par de listeners de
 * `scroll`/`resize` para toda la aplicación, sin importar cuántos
 * componentes (el panel de escritorio Y la hoja móvil, Tarea 10) llamen a
 * este hook a la vez -- exactamente el motivo por el que "no crear un
 * observer nuevo" importa aquí: sin este singleton, cada consumidor
 * repetiría su propio listener recorriendo las mismas cuatro secciones.
 *
 * Un `requestAnimationFrame` adicional tras el primer `evaluate()` síncrono
 * (solo en el primer suscriptor) cubre la carrera de montaje: el
 * `IntersectionObserver` de `useSectionProgress` resuelve su primer aviso
 * de forma ASÍNCRONA (nunca en el mismo tick en que se llama a
 * `observer.observe()`), así que una carga en la que la página ya arranca
 * desplazada a una sección (recarga con `scrollRestoration`, enlace directo
 * a un ancla) podría no tener todavía `data-inview` escrito en el primer
 * `evaluate()` síncrono. Un frame de margen es suficiente en la práctica
 * (verificado leyendo la spec de IntersectionObserver: el primer aviso se
 * entrega en el primer "update de intersecciones" tras `observe()`, que
 * ocurre antes del siguiente pintado) y no añade ningún listener ni
 * `Observer` nuevo, solo relee la misma señal una vez más.
 */
function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (subscriberCount === 0) {
    evaluate();
    window.requestAnimationFrame(evaluate);
    window.addEventListener("scroll", handleScrollOrResize, {
      passive: true,
    });
    window.addEventListener("resize", handleScrollOrResize, {
      passive: true,
    });
  }
  subscriberCount += 1;
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      activeKey = null;
    }
  };
}

function getSnapshot(): string | null {
  return activeKey;
}

/** Sin `window` (SSR/prerender estático) no hay ninguna sección "activa" todavía. */
function getServerSnapshot(): string | null {
  return null;
}

/**
 * `key` (de `NAV_GROUPS`, grupo `onSite`) de la sección de la home
 * actualmente visible, o `null` si ninguna lo está (por ejemplo, con el
 * usuario todavía en el Hero, que no tiene entrada propia en `onSite`).
 *
 * Reutiliza el motor existente de `useSectionProgress` -- ver el docblock
 * de `evaluate()` -- en vez de montar un `IntersectionObserver` nuevo:
 * singleton de módulo (mismo patrón que `usePointer`), así que Navbar y la
 * hoja de navegación móvil pueden llamarlo cada uno por su cuenta sin
 * duplicar listeners.
 */
export function useActiveSectionKey(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
