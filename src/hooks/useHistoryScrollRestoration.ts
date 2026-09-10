"use client";

import { useEffect, useRef } from "react";
import { scheduleBranchSettledCorrection } from "./branchSettledCorrection";
import { FRAGMENT_LANDING_SETTLE_MS } from "./useFragmentLanding";
import {
  applyStoredReadingPosition,
  captureReadingAnchor,
  type ReadingPositionSnapshot,
} from "./themeScrollAnchor";

/*
 * RESTITUCIÓN PROPIA EN LOS RECORRIDOS DEL HISTORIAL DENTRO DEL DOCUMENTO
 * (F20-A, rutas R3 y R4 del diseño).
 *
 * R3 es el Atrás/Adelante entre entradas de fragmento de la portada
 * (`/` <-> `/#contact`); R4, el Atrás desde una legal a la portada, que es una
 * navegación blanda dentro de la misma raíz. En ninguna de las dos mueve el
 * scroll código del sitio: hasta F20-A las resolvía entera la restitución
 * nativa del navegador (`history.scrollRestoration = "auto"`).
 *
 * UN SOLO MOTOR POR GESTO. Este hook NO decide por el tema ni por la ruta:
 * lee `history.scrollRestoration` en el `popstate`, que es ya el modo de la
 * entrada a la que se llega. Con `"auto"` no hace nada --manda la nativa,
 * exactamente como antes de F20-A--; con `"manual"` el navegador no ha movido
 * nada y restituye este hook. Quién pone `"manual"` y cuándo es asunto del
 * interruptor (script de arranque y `ThemeProvider`), no de este fichero, y
 * no se importa nada de él: el contrato es el valor en tiempo de ejecución.
 *
 * LA CLAVE DE CADA ENTRADA es `navigation.currentEntry.key` cuando el
 * navegador expone la Navigation API (es estable ante `replaceState`, que Next
 * y `useHashHistorySeal` hacen a menudo), y `location.href` si no. El respaldo
 * se degrada con la misma URL repetida en la pila: dos entradas `/` comparten
 * ranura. NO se guarda en `history.state`: el `HistoryUpdater` del App Router
 * lo reescribe sin conservar claves ajenas.
 *
 * LO QUE NO HACE: no persiste nada entre documentos (el registro vive en
 * memoria y muere con el documento; la vuelta ENTRE documentos es R2, y la
 * resuelve `useReloadLanding` con su mapa en `sessionStorage`), y no llama a
 * `focus()`: solo coloca el scroll.
 */

interface NavigationEntryLike {
  readonly key?: string;
}

interface NavigationLike {
  readonly currentEntry?: NavigationEntryLike | null;
  addEventListener?: (
    type: "navigate",
    listener: (event: Event) => void,
  ) => void;
  removeEventListener?: (
    type: "navigate",
    listener: (event: Event) => void,
  ) => void;
}

/*
 * SOLO LOS RECORRIDOS RESTITUYEN (2026-09-10, rojo de la familia 32 del
 * candado en oscuro con `reduce`). Chrome dispara `popstate` también en una
 * navegación a FRAGMENTO dentro del documento: el clic en `#story` (push) y,
 * sobre todo, el segundo clic al MISMO fragmento, que es un reemplazo con la
 * MISMA clave de entrada. Sonda literal: `navigate replace` -> `popstate`
 * (misma `currentEntry.key`) -> 12 ms después `scrollTo({top: 0})` desde
 * `applyStoredReadingPosition`, porque el registro de esa entrada guardaba el
 * 0 del lector. Un `popstate` no dice por sí solo qué navegación lo causó; el
 * evento `navigate` de la Navigation API sí (`navigationType`), y llega antes,
 * en la misma tarea. Con la API se restituye SOLO si la última navegación fue
 * un `traverse` (Atrás/Adelante); push/replace no restituyen y desarman lo que
 * hubiera armado. Sin la API se conserva el criterio anterior (decide el modo):
 * el interruptor ya no pone `"manual"` en esos motores (`scrollRestorationFor`).
 */
function readNavigation(): NavigationLike | undefined {
  return (window as Window & { navigation?: NavigationLike }).navigation;
}

/** Identidad de la entrada ACTIVA del historial. Ver el docblock de arriba. */
export function historyEntryKey(): string {
  const { navigation } = window as Window & { navigation?: NavigationLike };
  const key = navigation?.currentEntry?.key;
  return typeof key === "string" && key !== "" ? key : window.location.href;
}

/** `true` solo si la entrada activa está en `"manual"`. Un motor sin la
 *  propiedad devuelve `undefined`, que cuenta como la nativa. */
export function isManualScrollRestoration(): boolean {
  try {
    return window.history.scrollRestoration === "manual";
  } catch {
    return false;
  }
}

/** Lo que se anota de cada entrada: la posición y la ruta que la pintaba,
 *  para no aplicarla hasta que esa ruta vuelva a estar montada (R4). */
interface HistoryReadingRecord {
  readonly position: ReadingPositionSnapshot;
  readonly routePathname: string;
}

/**
 * @param pathname Ruta que está RENDERIZADA ahora (la de `usePathname`). En
 * R4 el `popstate` llega con la legal todavía montada: la restitución espera
 * a que esta ruta sea la de la entrada de llegada.
 */
export function useHistoryScrollRestoration(pathname: string): void {
  const pathnameRef = useRef(pathname);
  /** Arma la restitución pendiente si su ruta ya está montada. Lo publica el
   *  efecto de montaje y lo invoca el efecto de la ruta. */
  const armIfRouteMountedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const records = new Map<string, HistoryReadingRecord>();
    let lastKey = historyEntryKey();
    let pending: HistoryReadingRecord | null = null;
    let cancelCorrection: (() => void) | null = null;
    let frameId: number | null = null;
    const navigation = readNavigation();
    const hasNavigateEvents =
      typeof navigation?.addEventListener === "function";

    function snapshot(): HistoryReadingRecord {
      return {
        position: { scrollY: window.scrollY, anchor: captureReadingAnchor() },
        routePathname: pathnameRef.current,
      };
    }

    /** Anota la entrada activa. Suspendido mientras hay una restitución
     *  pendiente o armada: sus eventos `scroll` (recortes del re-maquetado)
     *  pisarían la ranura de destino. */
    function record(): void {
      frameId = null;
      if (pending !== null || cancelCorrection !== null) return;
      lastKey = historyEntryKey();
      // Con "auto" nadie leerá este registro (el `popstate` retorna antes de
      // usarlo): se ahorran las lecturas de layout de `captureReadingAnchor`.
      // El modo se lee AHORA, no al montar: el interruptor lo cambia en vivo.
      if (!isManualScrollRestoration()) return;
      records.set(lastKey, snapshot());
    }

    function onScroll(): void {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(record);
    }

    function cancelArmed(): void {
      if (cancelCorrection === null) return;
      cancelCorrection();
      cancelCorrection = null;
    }

    function armIfRouteMounted(): void {
      const target = pending;
      if (target === null || target.routePathname !== pathnameRef.current) {
        return;
      }
      pending = null;
      cancelArmed();
      cancelCorrection = scheduleBranchSettledCorrection({
        settleMs: FRAGMENT_LANDING_SETTLE_MS,
        onFinish: () => {
          cancelCorrection = null;
        },
        apply: () => {
          applyStoredReadingPosition(target.position);
        },
      });
    }

    /** Tipo de la última navegación vista por la Navigation API; `null` sin
     *  la API. Se consume en cada `popstate`. */
    let lastNavigationType: string | null = null;

    function onNavigate(event: Event): void {
      const { navigationType } = event as Event & { navigationType?: string };
      lastNavigationType =
        typeof navigationType === "string" ? navigationType : null;
    }

    function onPopState(): void {
      const arrivingKey = historyEntryKey();
      const causedBy = lastNavigationType;
      lastNavigationType = null;
      cancelArmed();
      pending = null;

      // Con la API, un `popstate` que no viene de un recorrido (salto a
      // fragmento, push o replace) no restituye: la entrada no se abandona
      // hacia una posición anotada, se navega a un destino nuevo.
      const notATraversal = hasNavigateEvents && causedBy !== "traverse";
      if (!isManualScrollRestoration() || notATraversal) {
        // "auto": manda la nativa. Solo se sigue la pista de la entrada.
        lastKey = arrivingKey;
        return;
      }

      // Con "manual" el navegador no ha movido nada y el DOM sigue siendo el
      // de la entrada que se abandona (Next aplica el recorrido en una
      // transición): es el último momento para anotarla.
      records.set(lastKey, snapshot());
      lastKey = arrivingKey;
      pending = records.get(arrivingKey) ?? null;
      armIfRouteMounted();
    }

    armIfRouteMountedRef.current = armIfRouteMounted;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPopState);
    navigation?.addEventListener?.("navigate", onNavigate);
    return () => {
      armIfRouteMountedRef.current = null;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPopState);
      navigation?.removeEventListener?.("navigate", onNavigate);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      cancelArmed();
    };
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    armIfRouteMountedRef.current?.();
  }, [pathname]);
}
