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
 *
 * FIX WAVE A, hallazgo A2 (revisión final de rama). Bajo
 * `prefers-reduced-motion: reduce`, `useSectionProgress.stopForReduced()`
 * escribe `data-inview="true"` de forma INCONDICIONAL en las CUATRO
 * secciones a la vez (ver su JSDoc: "el consumidor debe quedar visible y
 * quieto exista o no una interseccion previa") y desconecta su propio
 * observer -- una decisión correcta para SU consumidor (un parallax
 * inmóvil no tiene "dentro/fuera de pantalla" que describir bajo `reduce`,
 * así que se queda fijo en el estado "ya colocada"). Pero la lectura de
 * arriba ("gana la ÚLTIMA con `data-inview=true`") asume que esa señal
 * significa "visible AHORA", y bajo `reduce` deja de significarlo: con las
 * CUATRO secciones en `true` de forma permanente, la última del orden de
 * página (`contact`) ganaba SIEMPRE, sin importar dónde estuviera el
 * scroll real -- `aria-current="location"` quedaba clavado en "Contacto"
 * para cualquier visitante con `reduce` activado, en el panel de escritorio
 * Y en la hoja móvil. Es información FALSA anunciada a lectores de
 * pantalla, más grave que no anunciar nada, y afecta desproporcionadamente
 * a quien más depende de tecnología asistiva.
 *
 * Arreglo elegido (de las dos opciones razonables -- resolver por geometría
 * real, o devolver `null` sin más -- se prefiere la primera): bajo `reduce`
 * se ignora `data-inview` por completo y se resuelve con
 * `getBoundingClientRect()` sobre las mismas cuatro secciones, con el MISMO
 * criterio de desempate (última en orden de página que interseca el
 * viewport). Se prefiere a devolver `null` porque el usuario con `reduce`
 * activado sigue navegando por scroll con normalidad -- solo el PARALLAX
 * está inmóvil, no la página -- así que apagar `aria-current` del todo para
 * este grupo de visitantes sería perder la función completa por una
 * limitación de un consumidor DISTINTO (`useSectionProgress`) que no
 * aplica aquí: medir un `getBoundingClientRect` en cada `scroll`/`resize`
 * es exactamente el coste que este módulo ya evita en el camino normal
 * (docblock de arriba), pero aquí es barato porque ni `reduce` ni el
 * scrollspy corren a 60fps -- solo en los eventos discretos que ya
 * escuchaba este mismo módulo.
 */
/**
 * Defensivo ante `typeof window.matchMedia !== "function"` (jsdom SIN stub):
 * a diferencia de `useSectionProgress`/`useSlideDeck` -- hooks que solo monta
 * la sección concreta que los usa, con un puñado de ficheros de test que ya
 * saben que necesitan el stub -- este módulo es un SINGLETON que arranca
 * desde `useActiveSectionKey()`, y hoy lo llaman tanto `Navbar.tsx` (panel de
 * escritorio) como `NavSheet.tsx` (hoja móvil): cualquier test de CUALQUIER
 * parte del repo que renderice `<Navbar />` sin stubar `matchMedia` pasaría a
 * fallar por una rama nueva que ni siquiera ejercita a propósito. Sin
 * `matchMedia` disponible se asume "no reduce" -- exactamente el
 * comportamiento de ANTES de este arreglo (fix wave A, A2) para cualquier
 * entorno que no declare la preferencia.
 */
function isReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Mismo criterio de "está en el viewport" que exige un solape > 0 contra
 *  `rect.top`/`rect.bottom` -- el mismo umbral implícito (threshold 0) que
 *  ya usa el `IntersectionObserver` por defecto de `useSectionProgress` en
 *  el camino normal, para que el desempate ("última en orden de página")
 *  se comporte igual en los dos caminos. */
function intersectsViewport(rect: DOMRect): boolean {
  return rect.top < window.innerHeight && rect.bottom > 0;
}

function resolveActiveKeyReduced(): string | null {
  let next: string | null = null;
  for (const id of ACTIVE_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el && intersectsViewport(el.getBoundingClientRect())) next = id;
  }
  return next;
}

function resolveActiveKeyByInview(): string | null {
  let next: string | null = null;
  for (const id of ACTIVE_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el?.dataset.inview === "true") next = id;
  }
  return next;
}

function evaluate(): void {
  const next = isReducedMotion()
    ? resolveActiveKeyReduced()
    : resolveActiveKeyByInview();
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
