import type { ReactElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import {
  THEME_SCROLL_IDLE_MS,
  THEME_SCROLL_MAX_MS,
  useThemeScrollReset,
} from "./useThemeScrollReset";

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
 * Combina el hook bajo prueba con `useTheme()`. No hay ningun `vi.mock` de
 * contexto de React en este repo (comprobado con Grep antes de escribir este
 * archivo): la evidencia de que `toggleTheme` se invoco es el propio
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

function setInnerHeight(value: number): void {
  Object.defineProperty(window, "innerHeight", {
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
 * Hero de prueba: mismo `id="hero"` que busca `isInHeroZone` en el hook, con
 * `getBoundingClientRect` sustituible para fijar `rect.bottom` a mano (jsdom
 * no hace layout real, ver `task/lessons.md` 2026-07-28).
 */
function mountHero(bottom: number): void {
  const hero = document.createElement("section");
  hero.id = "hero";
  hero.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  document.body.appendChild(hero);
}

let scrollToMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setScrollY(0);
  setInnerHeight(800); // zona del hero: scrollY/rect.bottom < 400 => en zona
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
  it("en la zona del hero: toggleTheme se llama de inmediato y scrollTo NO se llama", () => {
    mountHero(700); // 700 >= 800/2 (400): el hero sigue cubriendo media pantalla
    const { result } = renderHarness();
    expect(result.current.themeName).toBe("light");

    act(() => {
      result.current.requestThemeChange();
    });

    expect(result.current.themeName).toBe("dark");
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });

  it("sin elemento #hero en el documento, degrada a scrollY < innerHeight/2 (mismo criterio de zona)", () => {
    setScrollY(100); // 100 < 400: en zona segun la regla degradada
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });

    expect(result.current.themeName).toBe("dark");
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("fuera de la zona del hero: scrollTo se llama con {top:0, behavior:'smooth'} y toggleTheme AUN NO se ha llamado", () => {
    mountHero(100); // 100 < 400: fuera de zona
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(result.current.themeName).toBe("light"); // todavia no cambio
    expect(result.current.pending).toBe(true);
  });

  it("al dispararse scrollend, toggleTheme se llama exactamente una vez y pending vuelve a false", () => {
    mountHero(100);
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });
    expect(result.current.pending).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });

    expect(result.current.themeName).toBe("dark");
    expect(result.current.pending).toBe(false);
  });

  /*
   * Revision 2026-08-04 (COMPROBACION 1): un `scrollend` puede llegar de un
   * gesto ANTERIOR (un fling con inercia que se estuviera asentando justo
   * cuando el usuario pulso el boton), disparado despues de que este hook
   * ya registrara su listener pero de una posicion que NO es el destino
   * pedido. `onScrollEnd` lo descarta comparando `scrollY` -- este test lo
   * ata dos veces: que el espurio NO cambia el tema, y que el listener
   * sigue vivo para el `scrollend` real que llega despues (candado de que
   * NO se usa `{ once: true }`, ver el hook).
   */
  it("un scrollend espurio (scrollY aun no es 0) se ignora, y el mismo listener sigue vivo para el scrollend real", () => {
    mountHero(100);
    setScrollY(500); // el viaje propio aun no ha llegado arriba
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });
    expect(result.current.pending).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("scrollend")); // espurio: scrollY !== 0
    });
    expect(result.current.themeName).toBe("light");
    expect(result.current.pending).toBe(true);

    setScrollY(0); // el scroll real ya llego arriba
    act(() => {
      window.dispatchEvent(new Event("scrollend")); // el real
    });

    expect(result.current.themeName).toBe("dark");
    expect(result.current.pending).toBe(false);
  });

  it("sin soporte de 'scrollend' (\"onscrollend\" ausente en window), el sondeo por rAF detecta scrollY=0 y cambia el tema", () => {
    mountHero(100);
    setScrollY(500);

    // Simula un navegador sin soporte de scrollend: se retira la propiedad
    // de window (ver el guard `"onscrollend" in window` del hook) y se
    // restaura al terminar el test para no filtrar el experimento a los
    // demas tests del archivo.
    const descriptor = Object.getOwnPropertyDescriptor(window, "onscrollend");
    delete (window as unknown as Record<string, unknown>).onscrollend;

    let rafCallback: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        rafCallback = cb;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    try {
      const { result } = renderHarness();
      act(() => {
        result.current.requestThemeChange();
      });
      expect(rafCallback).toBeDefined();

      // Primer frame: el scroll todavia no llego a 0, sigue pendiente.
      act(() => {
        rafCallback?.(16);
      });
      expect(result.current.themeName).toBe("light");
      expect(result.current.pending).toBe(true);

      // El scroll llega a 0: el siguiente frame del sondeo lo detecta.
      setScrollY(0);
      act(() => {
        rafCallback?.(32);
      });

      expect(result.current.themeName).toBe("dark");
      expect(result.current.pending).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(window, "onscrollend", descriptor);
      }
    }
  });

  /*
   * Revision 2026-08-04 (tope por INACTIVIDAD, ya no por duracion total):
   * sin ningun evento 'scroll' que lo rearme, el tope por inactividad
   * (armado desde el primer instante del viaje, ver el docblock del hook)
   * dispara a los THEME_SCROLL_IDLE_MS -- mucho antes que el techo absoluto
   * THEME_SCROLL_MAX_MS, que solo es la ultima red. Este test sustituye al
   * que ataba el antiguo THEME_SCROLL_TIMEOUT_MS (tope por duracion total,
   * retirado: dependia de adivinar cuanto tarda un scroll suave, un numero
   * que ademas es indemostrable en este entorno -- ver el docblock de
   * THEME_SCROLL_IDLE_MS).
   */
  it("si el scroll nunca progresa (ni scrollend, ni scrollY llega a 0, ni un solo evento 'scroll'), el tope por inactividad cambia el tema igual", () => {
    vi.useFakeTimers();
    try {
      mountHero(100);
      const { result } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });
      expect(result.current.pending).toBe(true);
      expect(result.current.themeName).toBe("light");

      act(() => {
        vi.advanceTimersByTime(THEME_SCROLL_IDLE_MS);
      });

      expect(result.current.themeName).toBe("dark");
      expect(result.current.pending).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * Revision 2026-08-04: el test que de verdad distingue el diseño nuevo
   * (tope por inactividad, se REARMA con cada avance real) del antiguo
   * (tope por duracion total, fijo). Cinco eventos 'scroll' con avance real
   * (scrollY decreciente), cada uno separado por 250ms de reloj falso --
   * por debajo de THEME_SCROLL_IDLE_MS (300ms), asi que NINGUNO deja vencer
   * el tope por inactividad por si solo -- pero la suma del viaje (1250ms)
   * ya supera el antiguo THEME_SCROLL_TIMEOUT_MS de 1200ms: bajo el diseño
   * ANTERIOR el tema ya habria cambiado a mitad de scroll, justo el defecto
   * que motivo este cambio. Con el diseño nuevo el tema sigue "light"
   * durante todo el tramo, y solo cambia cuando el avance se detiene de
   * verdad y pasan THEME_SCROLL_IDLE_MS sin ningun evento mas.
   */
  it("mientras el scroll SIGUE avanzando (eventos 'scroll' con avance real, cada uno por debajo de THEME_SCROLL_IDLE_MS) el tema NO cambia; en cuanto el avance se detiene, cambia", () => {
    vi.useFakeTimers();
    try {
      setScrollY(1000); // posicion de partida, lejos del destino (top: 0)
      mountHero(100);
      const { result } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });
      expect(result.current.pending).toBe(true);

      const posiciones = [800, 600, 400, 200, 0];
      posiciones.forEach((y) => {
        act(() => {
          vi.advanceTimersByTime(250); // < THEME_SCROLL_IDLE_MS (300ms)
          setScrollY(y);
          window.dispatchEvent(new Event("scroll"));
        });
        expect(result.current.themeName).toBe("light");
        expect(result.current.pending).toBe(true);
      });
      // 5 * 250ms = 1250ms de viaje total, por encima del antiguo tope
      // absoluto (1200ms) -- y el tema sigue sin cambiar.

      // El scroll se detiene (no llega ningun evento 'scroll' mas): el tope
      // por inactividad, rearmado por el ultimo evento, dispara a los
      // THEME_SCROLL_IDLE_MS de la ultima lectura.
      act(() => {
        vi.advanceTimersByTime(THEME_SCROLL_IDLE_MS);
      });

      expect(result.current.themeName).toBe("dark");
      expect(result.current.pending).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * El techo absoluto (THEME_SCROLL_MAX_MS) es la red que el tope por
   * inactividad, por si solo, no puede tender: si el scroll siguiera
   * avanzando SIN PARAR NUNCA (aqui: un evento cada 200ms, por debajo de
   * THEME_SCROLL_IDLE_MS, indefinidamente), el tope por inactividad no
   * dispararia jamas -- se rearmaria para siempre. Este test comprueba que,
   * aun asi, el tema cambia en cuanto se alcanza THEME_SCROLL_MAX_MS.
   */
  it("si el scroll avanza sin parar nunca, el techo absoluto (THEME_SCROLL_MAX_MS) cambia el tema igual", () => {
    vi.useFakeTimers();
    try {
      setScrollY(100000);
      mountHero(100);
      const { result } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });
      expect(result.current.pending).toBe(true);

      // Eventos de avance cada 200ms (< THEME_SCROLL_IDLE_MS) hasta rebasar
      // THEME_SCROLL_MAX_MS: el tope por inactividad se reprograma en cada
      // uno y nunca llega a disparar por su cuenta.
      let elapsed = 0;
      let y = 100000;
      while (elapsed < THEME_SCROLL_MAX_MS + 200) {
        act(() => {
          vi.advanceTimersByTime(200);
          y -= 50;
          setScrollY(y);
          window.dispatchEvent(new Event("scroll"));
        });
        elapsed += 200;
      }

      // El techo absoluto ya se cumplio en algun punto de ese bucle, pese a
      // que el scroll seguia "avanzando": nunca se ignoraron los eventos, el
      // techo simplemente no depende de ellos para dispararse.
      expect(result.current.themeName).toBe("dark");
      expect(result.current.pending).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bajo prefers-reduced-motion: reduce, el scroll es 'instant' y el tema cambia en el mismo tick, sin pending", () => {
    mountHero(100); // fuera de zona: sin reduce, esto dispararia el viaje animado
    stubMatchMedia(true);
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: "instant",
    });
    expect(result.current.themeName).toBe("dark");
    expect(result.current.pending).toBe(false);
  });

  it("un segundo clic mientras 'pending' es true no dispara una segunda llamada a toggleTheme", () => {
    mountHero(100);
    const { result } = renderHarness();

    act(() => {
      result.current.requestThemeChange();
    });
    expect(result.current.pending).toBe(true);
    const scrollToCallsTrasElPrimero = scrollToMock.mock.calls.length;

    act(() => {
      result.current.requestThemeChange(); // segundo clic: se ignora
    });

    // Nada nuevo que cancelar ni reprogramar: el viaje en curso sigue igual.
    expect(scrollToMock.mock.calls.length).toBe(scrollToCallsTrasElPrimero);
    expect(result.current.themeName).toBe("light");

    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });

    // El viaje original resuelve una unica vez.
    expect(result.current.themeName).toBe("dark");
  });

  it("al desmontar durante el viaje, limpia temporizador/listener/rAF sin dejar avisos de act() colgando", () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      mountHero(100);
      const { result, unmount } = renderHarness();

      act(() => {
        result.current.requestThemeChange();
      });
      expect(result.current.pending).toBe(true);

      unmount();

      // Si la limpieza fuera incompleta, algun tope o un scrollend tardio
      // llamarian a setState sobre un arbol ya desmontado: React lo reporta
      // por console.error ("Warning: Can't perform a React state update...").
      // Se avanza hasta pasado el TECHO ABSOLUTO (el mas largo de los dos
      // temporizadores): si ese sobreviviera a la limpieza, seria el ultimo
      // en dispararse.
      act(() => {
        vi.advanceTimersByTime(THEME_SCROLL_MAX_MS + 100);
        window.dispatchEvent(new Event("scrollend"));
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
