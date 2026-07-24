import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReveal } from "./useReveal";

let trigger: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

describe("useReveal", () => {
  it("empieza oculto y revela al intersecar", () => {
    const { result } = renderHook(() => useReveal());
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    expect(result.current.revealed).toBe(false);
    act(() => trigger(true));
    expect(result.current.revealed).toBe(true);
  });

  it("vuelve a oculto al salir del viewport cuando once: false", () => {
    const { result } = renderHook(() => useReveal({ once: false }));
    act(() => {
      (result.current.ref as (n: Element | null) => void)(
        document.createElement("div"),
      );
    });
    expect(result.current.revealed).toBe(false);
    act(() => trigger(true));
    expect(result.current.revealed).toBe(true);
    act(() => trigger(false));
    expect(result.current.revealed).toBe(false);
  });
});
