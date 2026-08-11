import type { ReactElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HERO_COPY_RETURN_MS } from "@/components/sections/Hero/hero.transition";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { useThemeScrollReset } from "./useThemeScrollReset";

// ThemeProvider lee "vti-theme" de localStorage al montar (ver
// ThemeProvider.tsx) — mismo patron ya usado por ThemeToggle.test.tsx para
// fijar el tema de arranque en los tests.
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/**
 * Combina el hook bajo prueba con `useTheme()`. No hay ningún `vi.mock` de
 * contexto de React en este repo (comprobado con Grep antes de escribir este
 * archivo): la evidencia de que `toggleTheme` se invocó es el propio
 * `themeName` resultante, el MISMO criterio que ya usa
 * `ThemeToggle.test.tsx` ("click dispara toggleTheme: el tema activo
 * cambia").
 */
function useHarness() {
  const reset = useThemeScrollReset();
  const theme = useTheme();
  return { ...reset, themeName: theme.themeName };
}

function renderHarness() {
  return renderHook(() => useHarness(), { wrapper: Wrapper });
}

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

function stubMatchMedia(reducedMatches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * Hero de prueba: mismo `id="hero"` que busca `willCrossfade` en el hook
 * (`document.getElementById("hero") !== null`, ver useThemeScrollReset.ts).
 * Task 17 retiró `isInHeroZone()`: ya no hace falta un `getBoundingClientRect`
 * a medida, solo que el elemento exista en el documento.
 */
function mountHero(): void {
  const hero = document.createElement("section");
  hero.id = "hero";
  document.body.appendChild(hero);
}

let scrollToMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setScrollY(0);
  stubMatchMedia(false);
  scrollToMock = vi.fn();
  vi.stubGlobal("scrollTo", scrollToMock);
});

afterEach(() => {
  document.getElementById("hero")?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useThemeScrollReset", () => {
  /*
   * Task 17 (plan premium F1-F5, 2026-08-11): el núcleo del cambio de esta
   * tarea. Hasta aquí, fuera de la "zona del hero", `requestThemeChange`
   * viajaba a `top: 0` ANTES de cambiar el tema (D6) -- el hallazgo #5 de la
   * auditoría independiente midió ese viaje tirando la posición de lectura.
   * Desde Task 17 el tema cambia SIEMPRE en el sitio, sin tocar `scrollTo`,
   * sea cual sea la posición de scroll o si hay o no un `#hero` montado. Este
   * test cubre las tres combinaciones que antes se comportaban distinto.
   */
  it.each([
    ["con #hero montado y scrollY en 0", true, 0],
    ["con #hero montado y scrollY lejos del top", true, 5000],
    ["sin ningún #hero en el documento", false, 5000],
  ] as const)(
    "%s: toggleTheme se llama de inmediato y scrollTo NUNCA se llama",
    (_nombre, conHero, scrollYInicial) => {
      if (conHero) mountHero();
      setScrollY(scrollYInicial);
      const { result } = renderHarness();
      expect(result.current.themeName).toBe("light");

      act(() => {
        result.current.requestThemeChange();
      });

      expect(result.current.themeName).toBe("dark");
      expect(scrollToMock).not.toHaveBeenCalled();
    },
  );

  /*
   * "Tests: restauración (mock)" del brief de Task 17: mockea `scrollY` a
   * mitad de página, cambia de tema, y confirma que la lectura de `scrollY`
   * sigue siendo EXACTAMENTE la misma después -- no una sección equivalente,
   * el mismo píxel. Complementa al test de arriba (que solo ata la ausencia
   * de `scrollTo`): este ata explícitamente el valor que un consumidor real
   * (p. ej. `window.scrollY` leído por cualquier otro hook de scroll del
   * sitio) observaría antes y después del cambio.
   */
  it("la posición de scroll (scrollY) es exactamente la misma antes y después de cambiar de tema, lejos del hero", () => {
    mountHero();
    setScrollY(2500);
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });

    expect(result.current.themeName).toBe("dark");
    expect(window.scrollY).toBe(2500);
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("bajo prefers-reduced-motion: reduce, scrollTo tampoco se llama (ya no hay ningún salto instantáneo a top:0)", () => {
    mountHero();
    setScrollY(5000);
    stubMatchMedia(true);
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });

    expect(result.current.themeName).toBe("dark");
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(5000);
  });

  /*
   * Task 5 (plan premium F1-F5): `busy` cubre el cruce de composiciones del
   * hero (`HeroBackdrop.tsx`), a diferencia del extinto `pending` (que solo
   * cubría el tramo de scroll, retirado en Task 17 junto con el viaje). Ver
   * el docblock de `requestThemeChange`/`ThemeScrollReset` en
   * useThemeScrollReset.ts para el criterio completo.
   */
  describe("busy (Task 5, plan premium F1-F5; simplificado en Task 17)", () => {
    /*
     * Arranque limpio (lección task/lessons.md 2026-07-26): un guard sobre
     * "el primer evento" falla si ese evento puede no ocurrir. Aquí NO hay
     * guard de primer evento -- `busy` solo lo dispara una llamada real a
     * `requestThemeChange`, nunca un cambio de tema observado por su cuenta
     * -- pero este test lo comprueba de todas formas: fuerza el AJUSTE DE
     * HIDRATACION de ThemeProvider (localStorage con tema guardado, el
     * mismo camino que cambia `themeName` SIN pasar por este hook) y
     * confirma que `busy` no se entera.
     */
    it("arranque limpio: el ajuste de hidratacion de ThemeProvider cambia themeName pero NO activa busy", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { result } = renderHarness();

      expect(result.current.themeName).toBe("dark");
      expect(result.current.busy).toBe(false);
    });

    /*
     * Validado con el bug inyectado a propósito: cambiando temporalmente
     * `willCrossfade` a una constante `false` en el hook, este test se pone
     * en rojo (`busy` nunca llega a `true`); restaurado, vuelve a verde.
     */
    it("con #hero montado y sin reduce: busy se activa con el toggle inmediato y se apaga a los HERO_COPY_RETURN_MS del cruce", () => {
      vi.useFakeTimers();
      try {
        mountHero();
        const { result } = renderHarness();
        expect(result.current.busy).toBe(false);

        act(() => {
          result.current.requestThemeChange();
        });
        // El tema ya cambió, en el mismo tick del click.
        expect(result.current.themeName).toBe("dark");
        expect(result.current.busy).toBe(true);

        act(() => {
          vi.advanceTimersByTime(HERO_COPY_RETURN_MS - 1);
        });
        expect(result.current.busy).toBe(true);

        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(result.current.busy).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("sin #hero en el documento: busy se apaga en el mismo tick que el tema cambia, sin esperar a ningún cruce", () => {
      const { result } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });

      expect(result.current.themeName).toBe("dark");
      expect(result.current.busy).toBe(false);
    });

    it("bajo prefers-reduced-motion: busy nunca se observa true (no hay cruce que esperar)", () => {
      mountHero();
      stubMatchMedia(true);
      const { result } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });

      expect(result.current.themeName).toBe("dark");
      expect(result.current.busy).toBe(false);
    });

    it("un segundo clic legítimo durante la ventana de asentamiento la reinicia, en vez de dejar que la vieja apague busy a mitad del cruce nuevo", () => {
      vi.useFakeTimers();
      try {
        mountHero();
        const { result } = renderHarness();

        act(() => {
          result.current.requestThemeChange(); // -> dark
        });
        expect(result.current.busy).toBe(true);

        act(() => {
          vi.advanceTimersByTime(HERO_COPY_RETURN_MS - 50);
        });
        expect(result.current.busy).toBe(true);

        act(() => {
          result.current.requestThemeChange(); // -> light, reinicia la ventana
        });
        expect(result.current.themeName).toBe("light");
        expect(result.current.busy).toBe(true);

        // Si la ventana vieja no se hubiera cancelado, apagaría busy justo
        // aquí (50ms más de reloj desde el primer clic) aunque el cruce
        // nuevo apenas lleve arrancando.
        act(() => {
          vi.advanceTimersByTime(50);
        });
        expect(result.current.busy).toBe(true);

        act(() => {
          vi.advanceTimersByTime(HERO_COPY_RETURN_MS - 50);
        });
        expect(result.current.busy).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("al desmontar durante la ventana de asentamiento, limpia el temporizador sin dejar avisos de act() colgando", () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      try {
        mountHero();
        const { result, unmount } = renderHarness();

        act(() => {
          result.current.requestThemeChange();
        });
        expect(result.current.busy).toBe(true);

        unmount();

        act(() => {
          vi.advanceTimersByTime(HERO_COPY_RETURN_MS + 100);
        });

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });
});
