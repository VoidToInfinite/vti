import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { motion } from "@/theme/tokens/motion";
import { useNavDetach, NAV_DETACH_ANIM_MS } from "./useNavDetach";

describe("useNavDetach", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("NAV_DETACH_ANIM_MS coincide con el token motion.duration.slower", () => {
    expect(NAV_DETACH_ANIM_MS).toBe(parseInt(motion.duration.slower, 10));
  });

  it("arranca en idle", () => {
    const { result } = renderHook(() => useNavDetach(8));
    expect(result.current.phase).toBe("idle");
    expect(result.current.scrolled).toBe(false);
  });

  it("un cruce hacia abajo pone la fase en detaching", () => {
    const { result } = renderHook(() => useNavDetach(8));

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 50,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrolled).toBe(true);
    expect(result.current.phase).toBe("detaching");
  });

  it("vuelve a idle pasados NAV_DETACH_ANIM_MS desde el cruce", () => {
    const { result } = renderHook(() => useNavDetach(8));

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 50,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.phase).toBe("detaching");

    act(() => {
      vi.advanceTimersByTime(NAV_DETACH_ANIM_MS);
    });
    expect(result.current.phase).toBe("idle");
  });

  it("un cruce hacia arriba pone la fase en attaching", () => {
    const { result } = renderHook(() => useNavDetach(8));

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 50,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    act(() => {
      vi.advanceTimersByTime(NAV_DETACH_ANIM_MS);
    });
    expect(result.current.phase).toBe("idle");

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.scrolled).toBe(false);
    expect(result.current.phase).toBe("attaching");
  });

  it("montar con scrollY ya por encima del umbral no dispara fase (queda idle con scrolled true)", () => {
    Object.defineProperty(window, "scrollY", {
      value: 50,
      writable: true,
    });

    const { result } = renderHook(() => useNavDetach(8));

    expect(result.current.scrolled).toBe(true);
    expect(result.current.phase).toBe("idle");
  });

  it("dos cruces seguidos reprograman UN solo temporizador, no dos compitiendo", () => {
    // Regresion que este test previene: sin limpiar el temporizador anterior
    // al reprogramar, el que quedo del primer cruce dispararia su `idle` a
    // mitad de la animacion del segundo -- el atributo `data-detach` volveria
    // a "idle" con las @keyframes todavia corriendo, que es justo la
    // desincronizacion que NAV_DETACH_ANIM_MS existe para evitar.
    const { result } = renderHook(() => useNavDetach(8));

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 50, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.phase).toBe("detaching");

    // Segundo cruce ANTES de que el primero termine (200ms < 480ms).
    act(() => {
      vi.advanceTimersByTime(200);
      Object.defineProperty(window, "scrollY", { value: 0, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.phase).toBe("attaching");
    expect(vi.getTimerCount()).toBe(1);

    // t = 500ms desde el primer cruce: el temporizador VIEJO ya habria
    // disparado; el nuevo (programado en t=200) todavia no.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.phase).toBe("attaching");

    act(() => {
      vi.advanceTimersByTime(NAV_DETACH_ANIM_MS);
    });
    expect(result.current.phase).toBe("idle");
  });

  it("no deja temporizadores pendientes tras desmontar", () => {
    const { result, unmount } = renderHook(() => useNavDetach(8));

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 50,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.phase).toBe("detaching");

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
