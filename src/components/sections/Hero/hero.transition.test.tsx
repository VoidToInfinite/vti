import type { ReactElement } from "react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { AURA_STAGGER } from "@/components/aura/aura.layers";
import { EYE_STAGGER } from "@/components/eye/eye.layers";
import {
  HERO_BACKDROP_HOLD_MS,
  HERO_CHROME_OFFSET_MS,
  HERO_COPY_OUT_MS,
  HERO_COPY_RETURN_MS,
  HERO_FADE_MS,
  HERO_HANDOFF_MS,
  HERO_STACK_MS,
  HERO_STAGGER_STEPS,
  HERO_STEP_MS,
  useHeroCopySwap,
} from "./hero.transition";

/**
 * Mismo stub minimo de matchMedia que HeroBackdrop.test.tsx: ThemeToggle no
 * lo necesita, pero useHeroCopySwap lo llama para leer reduced-motion.
 */
function stubMatchMedia(reducedMatches = false): void {
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

/** Sonda: expone layoutTheme/hidden como atributos de datos legibles. */
function Probe(): ReactElement {
  const { layoutTheme, hidden } = useHeroCopySwap();
  return (
    <div
      data-testid="probe"
      data-layout-theme={layoutTheme}
      data-hidden={hidden ? "true" : "false"}
    />
  );
}

function probe(): HTMLElement {
  return screen.getByTestId("probe");
}

function clickToggle(): void {
  act(() => {
    screen.getByRole("button").click();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("constantes derivadas de la coreografia (revision 2026-07-27)", () => {
  // Todas las aserciones comparan contra la FORMULA (recalculada aqui a
  // partir de las constantes de las que se deriva cada una en el modulo),
  // nunca contra un literal escrito a mano: si alguien retoca HERO_FADE_MS o
  // HERO_STEP_MS, este test tiene que seguir en verde sin tocarlo.

  it("HERO_STAGGER_STEPS es el mayor de los dos staggers de composicion", () => {
    expect(HERO_STAGGER_STEPS).toBe(
      Math.max(EYE_STAGGER.length, AURA_STAGGER.length),
    );
  });

  it("HERO_STACK_MS es el fundido de una capa mas el paso acumulado de los escalones restantes del stagger mas largo", () => {
    expect(HERO_STACK_MS).toBe(
      HERO_FADE_MS + (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS,
    );
  });

  it("HERO_BACKDROP_HOLD_MS es exactamente HERO_COPY_OUT_MS: el fondo saliente espera a que la copia ya este apagada", () => {
    expect(HERO_BACKDROP_HOLD_MS).toBe(HERO_COPY_OUT_MS);
  });

  it("HERO_HANDOFF_MS es la espera del fondo mas la duracion completa del stack saliente", () => {
    expect(HERO_HANDOFF_MS).toBe(HERO_BACKDROP_HOLD_MS + HERO_STACK_MS);
  });

  it("HERO_CHROME_OFFSET_MS es el arranque del ultimo escalon mas la mitad de su fundido", () => {
    expect(HERO_CHROME_OFFSET_MS).toBe(
      (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS + HERO_FADE_MS / 2,
    );
  });

  it("HERO_COPY_RETURN_MS es el relevo completo mas el offset de asentamiento del chrome", () => {
    expect(HERO_COPY_RETURN_MS).toBe(HERO_HANDOFF_MS + HERO_CHROME_OFFSET_MS);
  });
});

describe("useHeroCopySwap", () => {
  it("(a) en la carga inicial sigue al tema activo sin ocultar la copia", () => {
    renderWithProviders(<Probe />);
    expect(probe()).toHaveAttribute("data-layout-theme", "light");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("(b) el ajuste de hidratacion (localStorage) aplica la distribucion nueva sin ocultar la copia", () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(<Probe />);
    expect(probe()).toHaveAttribute("data-layout-theme", "dark");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("(c) un cambio de USUARIO oculta la copia en t=0 y la devuelve con la distribucion nueva en HERO_COPY_RETURN_MS", () => {
    renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    clickToggle(); // light -> dark, cambio real de usuario

    // t=0: la copia se oculta INMEDIATAMENTE, sin ningun tramo previo en el
    // que siga visible con su aspecto viejo -- es la primera pieza en
    // desaparecer, ya no hay espera que preceda al ocultado.
    expect(probe()).toHaveAttribute("data-hidden", "true");
    // La distribucion todavia no cambia: sigue siendo la vieja mientras la
    // copia esta invisible, hasta que el temporizador de vuelta se cumpla.
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    act(() => {
      vi.advanceTimersByTime(HERO_COPY_RETURN_MS - 1);
    });

    // Un instante antes del retorno: sigue oculta y con la distribucion vieja.
    expect(probe()).toHaveAttribute("data-hidden", "true");
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    // En HERO_COPY_RETURN_MS: aplica la distribucion nueva y vuelve a
    // mostrarse, los dos en el mismo tick.
    expect(probe()).toHaveAttribute("data-layout-theme", "dark");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("(d) bajo reduced-motion el cambio de usuario es instantaneo, sin ocultar nada", () => {
    stubMatchMedia(true);
    renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );

    clickToggle();

    expect(probe()).toHaveAttribute("data-layout-theme", "dark");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("(e) dos cambios de usuario rapidos no dejan la copia invisible para siempre", () => {
    renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );

    clickToggle(); // light -> dark
    clickToggle(); // dark -> light, antes de que el primero asiente

    act(() => {
      vi.advanceTimersByTime(HERO_COPY_RETURN_MS);
    });

    // El tema final es "light" (light -> dark -> light): la copia tiene que
    // haberse restablecido, no quedarse pegada a un estado intermedio ni
    // invisible por culpa del temporizador cancelado del primer toggle.
    expect(probe()).toHaveAttribute("data-layout-theme", "light");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("(f) limpia el temporizador pendiente al desmontar: no revienta al avanzar el reloj despues", () => {
    const { unmount } = renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );
    clickToggle();
    // Se desmonta con el temporizador de RETORNO todavia pendiente, que es
    // el caso interesante: si no se limpiara, su callback intentaria mostrar
    // una copia que ya no esta en el arbol.
    expect(probe()).toHaveAttribute("data-hidden", "true");

    expect(() => unmount()).not.toThrow();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(HERO_COPY_RETURN_MS);
      });
    }).not.toThrow();
  });
});
