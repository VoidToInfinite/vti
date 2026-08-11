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
  // El efecto nuevo de Task 9 escribe en `document.documentElement`, un
  // nodo global que sobrevive entre tests (RTL solo desmonta el árbol
  // renderizado, no restaura atributos del <html> real de jsdom).
  document.documentElement.removeAttribute("data-theme");
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

  it("un toggle de USUARIO tras la carga actualiza data-theme en <html>, no solo el estado de React", () => {
    // Candado del bug encontrado en autorrevisión: el script pre-pintado de
    // app/layout.tsx fija data-theme UNA sola vez, antes de hidratar, y
    // nunca vuelve a ejecutarse. Sin este efecto de sincronización, un
    // toggle posterior actualizaría themeName (colores vía
    // styled-components) pero dejaría el atributo -- y con él las variables
    // CSS de GlobalStyles.tsx que Hero.tsx consume -- congelado en el valor
    // de la carga.
    stubMatchMedia(false);
    document.documentElement.removeAttribute("data-theme");

    function ProbeConToggle(): ReactElement {
      const { toggleTheme } = useTheme();
      return <button onClick={toggleTheme}>alternar</button>;
    }
    render(
      <ThemeProvider>
        <ProbeConToggle />
      </ThemeProvider>,
    );

    // Tras la carga en claro (sin storage, sin preferencia de sistema), el
    // atributo debe reflejar "light" -- el mismo efecto que Task 9 añadió.
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("con el atributo ya fijado en dark por el script (simulado) antes de montar, la secuencia de setAttribute NUNCA pasa por light", () => {
    // Candado del hallazgo de revisión (fix round, Important 2): el efecto
    // de sincronización corre con el themeName "light" con el que el
    // proveedor SIEMPRE arranca, ANTES de que el efecto de resolución
    // (declarado primero) corrija el estado. Sin la guarda de
    // `attributeSyncedRef`, esa PRIMERA pasada escribiría "light" encima de
    // lo que el script pre-pintado ya había fijado correctamente en "dark"
    // -- la misma familia de temporización que el CLS original de esta
    // tarea. Se espía `setAttribute` (no solo el valor final) porque lo que
    // importa aquí es la SECUENCIA completa, no el resultado: un estado
    // final correcto no demuestra que nunca pasó por un valor intermedio
    // equivocado.
    document.documentElement.setAttribute("data-theme", "dark"); // simula el script
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(false);

    const setAttributeSpy = vi.spyOn(document.documentElement, "setAttribute");

    renderProbe();

    const dataThemeCalls = setAttributeSpy.mock.calls
      .filter(([name]) => name === "data-theme")
      .map(([, value]) => value);

    expect(dataThemeCalls).not.toContain("light");
    expect(dataThemeCalls).toEqual(["dark"]);
  });
});
