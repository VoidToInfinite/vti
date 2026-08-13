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
let sectionMutationObserver: MutationObserver | null = null;

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

/**
 * Fix wave E, hallazgo E1 (evaluador de navegador real, 2026-08-13):
 * `aria-current` se desincroniza tras navegar por ancla y no se recupera,
 * ni siquiera 4s después ni volviendo a scrollear con normalidad. MISMA
 * familia que fix wave A/A2 (`aria-current` afirmando una ubicación falsa
 * por ARIA) pero por un disparador DISTINTO: A2 era `data-inview` clavado
 * de forma PERMANENTE bajo `reduce`; esto es una CARRERA de un solo tiro
 * bajo navegación normal.
 *
 * DIAGNÓSTICO (antes de tocar nada, según pide el encargo): `evaluate()`
 * -- la única función que relee `data-inview` y decide `activeKey` -- solo
 * se re-ejecuta en dos disparadores: los eventos `scroll`/`resize` de
 * `window`, y una vez al montar el primer suscriptor (síncrona + 1 rAF de
 * margen). Pero `data-inview` no lo escribe un evento de `window`: lo
 * escribe, de forma ASÍNCRONA, el propio `IntersectionObserver` de CADA
 * sección (`useSectionProgress.ts`), cuya notificación el navegador entrega
 * en una tarea POSTERIOR al evento `scroll` que causó el cambio de
 * geometría -- nunca en el mismo tick síncrono. En scroll continuo (rueda
 * física, con inercia) esto no se nota: cada muesca genera un nuevo
 * `scroll`, y el navegador sigue emitiendo eventos de inercia varios
 * frames después de que la mano se detenga, así que aunque UN `evaluate()`
 * lea `data-inview` todavía "viejo", el SIGUIENTE evento (pocos ms después,
 * cuando el IntersectionObserver ya entregó) lo corrige -- la carrera se
 * autocura sola, invisible en las 14 paradas medidas de carga limpia.
 *
 * La navegación por ancla nativa (`<a href="#story">`, `scroll-behavior:
 * smooth` global, `GlobalStyles.tsx`) rompe esa autocorrección: la
 * animación de scroll del navegador termina en un alto SECO, sin ningún
 * evento de inercia posterior. Si el ÚLTIMO evento `scroll` de esa
 * animación se procesa ANTES de que el `IntersectionObserver` de la
 * sección de destino entregue su notificación para la posición final
 * (una carrera real y documentada: la entrega de `IntersectionObserver`
 * está gateada a "antes del siguiente pintado", una tarea distinta y
 * posterior al despacho síncrono del evento `scroll`), `evaluate()` lee
 * `data-inview` desactualizado -- y como no vuelve a haber NINGÚN
 * `scroll`/`resize` después (el usuario ya no se está moviendo), nada
 * vuelve a comprobar la señal real. El mismo mecanismo explica el caso de
 * la rueda hacia arriba hasta el Hero: si esa gesticulación también
 * termina en un alto seco justo cuando la última sección activa pasa a
 * `data-inview="false"`, la carrera puede perderse igual y dejar
 * `activeKey` clavado en la sección que ya se abandonó.
 *
 * ARREGLO (causa raíz, no un `setTimeout` que esconda el síntoma): en vez
 * de depender EXCLUSIVAMENTE de la señal PROXY (`scroll`/`resize`, "algo
 * pudo haber cambiado"), este módulo observa también la señal REAL
 * directamente -- un `MutationObserver` sobre el atributo `data-inview` de
 * las cuatro secciones. `evaluate()` se re-ejecuta entonces exactamente
 * cuando `useSectionProgress` escribe el nuevo valor, sin importar qué lo
 * disparó (scroll físico, navegación por ancla, resize) ni cómo terminó el
 * gesto que lo causó -- cierra la carrera por construcción, no por más
 * reintentos. NO es un `IntersectionObserver` nuevo (el docblock de
 * `evaluate()`, arriba, sigue cumpliéndose: "reutilizar, no crear un
 * observer nuevo" se refería a NO duplicar la detección de intersección de
 * `useSectionProgress`; un `MutationObserver` no mide intersección, solo
 * escucha el resultado YA calculado por el observer que ya existe). Los
 * listeners de `scroll`/`resize` se conservan: el camino de
 * `reduce`-motion (`resolveActiveKeyReduced()`) no usa `data-inview` en
 * absoluto, sigue necesitando el disparador de scroll/resize para su
 * propio `getBoundingClientRect()`.
 */
function observeSectionInviewMutations(): void {
  sectionMutationObserver = new MutationObserver(() => {
    evaluate();
  });
  for (const id of ACTIVE_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el) {
      sectionMutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ["data-inview"],
      });
    }
  }
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
    // Fix wave E, hallazgo E1: ver el docblock de `observeSectionInviewMutations`,
    // arriba, para el porqué (cierra la carrera scroll-vs-IntersectionObserver
    // que scroll/resize por sí solos no cubren tras un salto de ancla).
    observeSectionInviewMutations();
  }
  subscriberCount += 1;
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      sectionMutationObserver?.disconnect();
      sectionMutationObserver = null;
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
