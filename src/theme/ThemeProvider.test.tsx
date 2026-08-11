import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import { ThemeProvider, useTheme } from "./ThemeProvider";

/**
 * `ThemeProvider` llama a `window.matchMedia("(prefers-color-scheme: dark)")`
 * de verdad en su efecto de corrección post-montaje (Task 9); jsdom no lo
 * implementa (mismo stub mínimo que StageProvider.test.tsx/Hero.qa.test.tsx,
 * adaptado a la query concreta que aquí importa).
 */
function stubMatchMedia(prefersDark: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark")
        ? prefersDark
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Sonda: expone `themeName` y `changeSource` como texto plano. */
function Probe(): ReactElement {
  const { themeName, changeSource } = useTheme();
  return (
    <p data-testid="probe">
      {themeName}:{changeSource}
    </p>
  );
}

function renderProbe(): void {
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ThemeProvider — resolución de tema post-montaje (Task 9, decisión D-C)", () => {
  it("arranca en light en el primer render, SIEMPRE (idéntico al HTML estático horneado)", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(true);
    // Sin act(): se comprueba el estado ANTES de que el efecto de montaje
    // corra, que es exactamente lo que React ya hizo síncronamente en el
    // primer commit -- el mismo estado que produce el build estático.
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // El efecto ya se disparó (React Testing Library envuelve render() en
    // act() por su cuenta), así que esto documenta el resultado FINAL, no
    // el instante intermedio -- ver el siguiente test para el "sin storage
    // ni prefers" que sí se queda en light.
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });

  it("storage 'dark' gana aunque el sistema prefiera claro", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(false);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });

  it("storage 'light' explícito gana aunque el sistema prefiera oscuro (D-C: storage > prefers)", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    stubMatchMedia(true);
    renderProbe();
    // Resuelto === "light" === el default con el que ya arrancó: la
    // corrección no dispara ningún setState (ver el guard en
    // ThemeProvider.tsx), así que changeSource se queda en "initial".
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");
  });

  it("sin storage, decide el sistema: prefers-color-scheme dark corrige a oscuro", () => {
    stubMatchMedia(true);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });

  it("sin storage y sin preferencia de sistema, se queda en el default claro sin corrección", () => {
    stubMatchMedia(false);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");
  });

  it("toggleTheme tras la carga sigue marcando la fuente como 'user', no 'hydration'", () => {
    stubMatchMedia(false);
    function ProbeConToggle(): ReactElement {
      const { themeName, changeSource, toggleTheme } = useTheme();
      return (
        <div>
          <p data-testid="probe">
            {themeName}:{changeSource}
          </p>
          <button onClick={toggleTheme}>alternar</button>
        </div>
      );
    }
    render(
      <ThemeProvider>
        <ProbeConToggle />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:user");
  });
});
