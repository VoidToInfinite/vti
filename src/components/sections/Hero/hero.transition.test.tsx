import type { ReactElement } from "react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import {
  HERO_COPY_HOLD_MS,
  HERO_COPY_OUT_MS,
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

describe("useHeroCopySwap", () => {
  it("en la carga inicial sigue al tema activo sin ocultar la copia", () => {
    renderWithProviders(<Probe />);
    expect(probe()).toHaveAttribute("data-layout-theme", "light");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("el ajuste de hidratacion (localStorage) aplica la distribucion nueva sin ocultar la copia", () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(<Probe />);
    expect(probe()).toHaveAttribute("data-layout-theme", "dark");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("un cambio de USUARIO espera HERO_COPY_HOLD_MS, entonces oculta la copia y aplica la distribucion nueva", () => {
    renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    clickToggle(); // light -> dark, cambio real de usuario

    // Tramo 1: la copia sigue VISIBLE y con su aspecto viejo mientras el
    // fondo arranca. Ocultarla ya, o peor, cambiarle la paleta ya, la dejaria
    // ilegible sobre un fondo que todavia es el del tema anterior.
    expect(probe()).toHaveAttribute("data-hidden", "false");
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    act(() => {
      vi.advanceTimersByTime(HERO_COPY_HOLD_MS);
    });

    // Tramo 2: ya oculta, pero la distribucion sigue siendo la VIEJA hasta
    // que el fundido de salida termina.
    expect(probe()).toHaveAttribute("data-hidden", "true");
    expect(probe()).toHaveAttribute("data-layout-theme", "light");

    act(() => {
      vi.advanceTimersByTime(HERO_COPY_OUT_MS);
    });

    // Tramo 3: distribucion nueva aplicada mientras era invisible, y vuelve.
    expect(probe()).toHaveAttribute("data-layout-theme", "dark");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("bajo reduced-motion el cambio de usuario es instantaneo, sin ocultar nada", () => {
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

  it("dos cambios de usuario rapidos no dejan la copia invisible para siempre", () => {
    renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );

    clickToggle(); // light -> dark
    clickToggle(); // dark -> light, antes de que el primero asiente

    act(() => {
      vi.advanceTimersByTime(HERO_COPY_HOLD_MS + HERO_COPY_OUT_MS);
    });

    // El tema final es "light" (light -> dark -> light): la copia tiene que
    // haberse restablecido, no quedarse pegada a un estado intermedio.
    expect(probe()).toHaveAttribute("data-layout-theme", "light");
    expect(probe()).toHaveAttribute("data-hidden", "false");
  });

  it("limpia el temporizador pendiente al desmontar: no revienta al avanzar el reloj despues", () => {
    const { unmount } = renderWithProviders(
      <>
        <ThemeToggle />
        <Probe />
      </>,
    );
    clickToggle();
    // Se desmonta con el temporizador de ESPERA todavia pendiente, que es el
    // caso interesante: si no se limpiara, su callback intentaria ocultar una
    // copia que ya no esta en el arbol.
    expect(probe()).toHaveAttribute("data-hidden", "false");

    expect(() => unmount()).not.toThrow();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(HERO_COPY_HOLD_MS + HERO_COPY_OUT_MS);
      });
    }).not.toThrow();
  });
});
