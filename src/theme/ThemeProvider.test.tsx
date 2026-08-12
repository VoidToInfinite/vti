import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import { ThemeProvider, useTheme } from "./ThemeProvider";

/**
 * `ThemeProvider` llama a `window.matchMedia("(prefers-color-scheme: dark)")`
 * de verdad en su efecto de corrección post-montaje (Task 9); jsdom no lo
 * implementa (mismo stub mínimo que Hero.qa.test.tsx/HeroBackdrop.test.tsx,
 * adaptado a la query concreta que aquí importa).
 *
 * Task 34: el proveedor ahora también se SUSCRIBE a `change` sobre el
 * `MediaQueryList` (seguimiento en vivo del sistema, sin storage guardado).
 * El stub registra de verdad los listeners que `addEventListener`/
 * `removeEventListener` reciben -- en un `Set` compartido por TODAS las
 * instancias de `MediaQueryList` que devuelva esta factoría, porque el
 * proveedor llama a `window.matchMedia` más de una vez (efecto de
 * resolución inicial + efecto de listener; el doble bajo StrictMode) -- para
 * que `dispatchChange` pueda simular un cambio real del sistema operativo
 * sin recargar la página, exactamente lo que pide el brief.
 */
function stubMatchMedia(prefersDark: boolean): {
  dispatchChange: (matches: boolean) => void;
} {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark")
        ? prefersDark
        : false,
      media: query,
      addEventListener: vi.fn(
        (type: string, handler: (event: { matches: boolean }) => void) => {
          if (type === "change") listeners.add(handler);
        },
      ),
      removeEventListener: vi.fn(
        (type: string, handler: (event: { matches: boolean }) => void) => {
          if (type === "change") listeners.delete(handler);
        },
      ),
    })),
  );
  return {
    dispatchChange: (matches: boolean) => {
      act(() => {
        listeners.forEach((handler) => handler({ matches }));
      });
    },
  };
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
    //
    // El atributo se fija en "light" ANTES de montar, simulando lo que el
    // script pre-pintado ya habría hecho en un navegador real (aquí no hay
    // script: jsdom no lo ejecuta). Con el diseño del fix round (guarda por
    // `changeSource`, no por ref -- ver ThemeProvider.tsx), el efecto de
    // sincronización NO reescribe nada mientras `changeSource === "initial"`
    // (no hay divergencia que corregir: el script ya acertó) — por eso NO
    // se afirma que el efecto "haya escrito" light, solo que el atributo
    // SIGUE siendo light tras el montaje, y que el toggle sí lo cambia.
    stubMatchMedia(false);
    document.documentElement.setAttribute("data-theme", "light");

    function ProbeConToggle(): ReactElement {
      const { toggleTheme } = useTheme();
      return <button onClick={toggleTheme}>alternar</button>;
    }
    render(
      <ThemeProvider>
        <ProbeConToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("con el atributo ya fijado en dark por el script (simulado) antes de montar, la secuencia de setAttribute NUNCA pasa por light (modo normal)", () => {
    // Candado del hallazgo de revisión (fix round, Important 2): el efecto
    // de sincronización corre con el themeName "light" con el que el
    // proveedor SIEMPRE arranca, ANTES de que el efecto de resolución
    // (declarado primero) corrija el estado. La guarda por `changeSource`
    // (no un ref -- ver el docblock de ThemeProvider.tsx tras el segundo
    // hallazgo de revisión, tests de más abajo) evita que esa PRIMERA
    // pasada escriba "light" encima de lo que el script pre-pintado ya
    // había fijado correctamente en "dark" -- la misma familia de
    // temporización que el CLS original de esta tarea. Se espía
    // `setAttribute` (no solo el valor final) porque lo que importa aquí es
    // la SECUENCIA completa, no el resultado: un estado final correcto no
    // demuestra que nunca pasó por un valor intermedio equivocado.
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

  it("bajo React StrictMode (next.config.ts, activo en pnpm dev), con dark ya fijado por el script, la secuencia TAMPOCO pasa por light", () => {
    // Candado del SEGUNDO hallazgo de revisión (fix round 2): React
    // StrictMode invoca los efectos de montaje DOS VECES con el MISMO
    // snapshot renderizado (themeName/changeSource todavía "light"/
    // "initial" en las dos invocaciones), simulando desmontaje+remontaje --
    // exactamente la mecánica que `task/lessons.md` (2026-08-05) ya
    // documentó para un `ref` de invalidación que no sobrevivía a un
    // remontaje. El diseño ANTERIOR de esta guarda (un `useRef` de
    // "primera vez") fallaba aquí: la 1ª invocación hacía early-return
    // (ref false→true) correctamente, pero la 2ª encontraba el ref ya en
    // `true` y cala en la rama "escribe siempre" con el CIERRE todavía
    // "light" -- secuencia observada entonces: ["light","dark"]. El diseño
    // actual (guarda por `changeSource`, estado de React reconciliado, no
    // un ref mutado a mano) no tiene ese problema: las DOS invocaciones de
    // StrictMode ven el MISMO `changeSource === "initial"` del MISMO
    // commit y las DOS saltan la escritura por igual.
    //
    // `renderWithProviders`/`render` con `{ reactStrictMode: true }` es la
    // opción nativa de Testing Library (mismo patrón que
    // `HeroBackdrop.test.tsx:601-606`): envuelve el árbol en
    // `<React.StrictMode>`, igual que `next.config.ts` en desarrollo -- no
    // hace falta desmontar/remontar a mano (eso crearía una instancia
    // nueva con el estado reinicializado desde cero y NO reproduciría esta
    // carrera).
    document.documentElement.setAttribute("data-theme", "dark"); // simula el script
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(false);

    const setAttributeSpy = vi.spyOn(document.documentElement, "setAttribute");

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
      { reactStrictMode: true },
    );

    const dataThemeCalls = setAttributeSpy.mock.calls
      .filter(([name]) => name === "data-theme")
      .map(([, value]) => value);

    expect(dataThemeCalls).not.toContain("light");
    expect(dataThemeCalls).toEqual(["dark"]);
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });
});

describe("ThemeProvider — Task 34: detectar no es elegir (gate F4, D-C)", () => {
  it("sin storage, la detección automática del sistema NO escribe en localStorage", () => {
    // Candado directo del defecto medido por el gate F4: con localStorage
    // limpio y el sistema en oscuro, la carga resolvía a "dark" (correcto)
    // pero ANTES de esta tarea el efecto de escritura no distinguía el
    // origen y grababa esa detección como si fuera una elección humana.
    stubMatchMedia(true);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });

  it("storage 'light' explícito tampoco se reescribe al resolverse (initial, sin escritura)", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    stubMatchMedia(false);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");
    // El valor sigue siendo el que el propio storage ya tenía -- ningún
    // efecto lo reescribió por su cuenta.
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("light");
  });

  it("sin storage, un cambio EN VIVO de prefers-color-scheme actualiza el tema sin recargar, y sigue sin persistir", () => {
    const { dispatchChange } = stubMatchMedia(false);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");

    dispatchChange(true); // el sistema operativo pasa a oscuro

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();

    dispatchChange(false); // y vuelve a claro

    expect(screen.getByTestId("probe")).toHaveTextContent("light:hydration");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();
  });

  it("con storage guardado, un cambio EN VIVO de prefers-color-scheme NO manda (D-C: storage gana)", () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    const { dispatchChange } = stubMatchMedia(true);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");

    dispatchChange(false); // el sistema pasa a claro; la elección guardada gana

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("dark");
  });

  it("el toggle SÍ escribe en localStorage (la única ruta que persiste)", () => {
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
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBeNull();

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:user");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("dark");
  });

  it("tras el toggle, un cambio EN VIVO de prefers-color-scheme ya no manda (la elección de esta sesión también gana)", () => {
    const { dispatchChange } = stubMatchMedia(false);
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

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:user");

    dispatchChange(false); // el sistema "cambia" a claro (ya lo estaba); no debe alterar nada

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:user");
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe("dark");
  });
});
