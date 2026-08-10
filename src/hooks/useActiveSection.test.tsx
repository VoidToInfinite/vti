import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NAV_GROUPS } from "@/config/navigation";
import { useActiveSectionKey } from "./useActiveSection";

/** Mismos `key` que el hook deriva internamente de `NAV_GROUPS` (grupo
 *  `onSite`, items `kind: "section"`): "story", "journey", "features",
 *  "contact", en ese orden. Se derivan aquí de la MISMA fuente (regla 39),
 *  nunca de un array literal que pudiera desincronizarse de `navigation.ts`. */
const SECTION_IDS =
  NAV_GROUPS.find((group) => group.key === "onSite")
    ?.items.filter((item) => item.kind === "section")
    .map((item) => item.key) ?? [];

/** Monta en `document.body` un `<div>` por cada id de `SECTION_IDS`, vacíos
 *  de `data-inview` (como arrancan las secciones reales antes de su primera
 *  intersección, ver `useSectionProgress`). */
function mountSections(): void {
  for (const id of SECTION_IDS) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
}

function unmountSections(): void {
  for (const id of SECTION_IDS) {
    document.getElementById(id)?.remove();
  }
}

function setInView(id: string, inView: boolean): void {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no existe la sección de prueba #${id}`);
  el.dataset.inview = inView ? "true" : "false";
}

function fireScroll(): void {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

beforeEach(() => {
  mountSections();
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
});

afterEach(() => {
  unmountSections();
  vi.unstubAllGlobals();
});

describe("useActiveSectionKey", () => {
  it("empieza en null cuando ninguna sección tiene data-inview", () => {
    const { result } = renderHook(() => useActiveSectionKey());
    expect(result.current).toBeNull();
  });

  it("devuelve el key de la sección con data-inview='true' tras un scroll", () => {
    const { result } = renderHook(() => useActiveSectionKey());
    expect(result.current).toBeNull();

    setInView("journey", true);
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("no crea ningún IntersectionObserver propio (reutiliza data-inview, no un observer nuevo)", () => {
    const ObserverSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ObserverSpy);

    const { result } = renderHook(() => useActiveSectionKey());
    setInView("features", true);
    fireScroll();

    expect(result.current).toBe("features");
    expect(ObserverSpy).not.toHaveBeenCalled();
  });

  it("con dos secciones contiguas a la vez en data-inview='true', gana la ÚLTIMA en el orden de la página", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    // "story" y "journey" solapando en la franja de transición: el usuario
    // ya ha visto casi toda "story" y está mirando "journey".
    setInView("story", true);
    setInView("journey", true);
    fireScroll();

    expect(result.current).toBe("journey");
  });

  it("vuelve a null cuando la sección deja de estar en pantalla", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    setInView("contact", true);
    fireScroll();
    expect(result.current).toBe("contact");

    setInView("contact", false);
    fireScroll();
    expect(result.current).toBeNull();
  });

  it("se actualiza también con un evento resize", () => {
    const { result } = renderHook(() => useActiveSectionKey());

    setInView("features", true);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe("features");
  });

  it("singleton de módulo: dos componentes que llaman al hook a la vez comparten un único listener de scroll", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useActiveSectionKey());
    renderHook(() => useActiveSectionKey());

    const scrollCalls = addSpy.mock.calls.filter(([evt]) => evt === "scroll");
    expect(scrollCalls).toHaveLength(1);
    addSpy.mockRestore();
  });

  it("limpia los listeners de scroll/resize cuando se desmonta el último suscriptor", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useActiveSectionKey());

    unmount();

    const scrollCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "scroll",
    );
    const resizeCalls = removeSpy.mock.calls.filter(
      ([evt]) => evt === "resize",
    );
    expect(scrollCalls.length).toBeGreaterThan(0);
    expect(resizeCalls.length).toBeGreaterThan(0);
    removeSpy.mockRestore();
  });
});
