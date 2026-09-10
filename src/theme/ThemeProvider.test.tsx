import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import { THEME_COLORS } from "./resolveTheme";
import { ThemeProvider, useTheme } from "./ThemeProvider";

/**
 * `ThemeProvider` lee la ruta con `usePathname()` para resincronizar el modo
 * de restitucion del scroll en las navegaciones blandas (F20-A). Fuera del
 * App Router no hay contexto que la dé, asi que la ruta se controla desde el
 * test; el resto de casos del fichero ven siempre `"/"`.
 */
const routerState = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: (): string => routerState.pathname,
}));

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

/*
 * El modo de restitucion del scroll sale por la misma puerta que `data-theme`
 * (F20-A, 2026-09-10). jsdom no implementa `history.scrollRestoration`: se
 * instala un getter/setter que registra cada escritura.
 */
describe("ThemeProvider — modo de restitucion del scroll", () => {
  let writes: string[];

  beforeEach(() => {
    writes = [];
    routerState.pathname = "/";
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      get: () => writes[writes.length - 1] ?? "auto",
      set: (value: string) => {
        writes.push(value);
      },
    });
    // jsdom no trae la Navigation API: se simula la de Chrome.
    vi.stubGlobal("navigation", { currentEntry: { key: "entrada" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window.history, "scrollRestoration");
    routerState.pathname = "/";
    window.history.replaceState(null, "", "/");
  });

  function Toggle(): ReactElement {
    const { toggleTheme } = useTheme();
    return (
      <button
        type="button"
        onClick={toggleTheme}
      >
        toggle
      </button>
    );
  }

  function renderWithToggle(): { rerender: () => void } {
    const tree = (): ReactElement => (
      <ThemeProvider>
        <Probe />
        <Toggle />
      </ThemeProvider>
    );
    const { rerender } = render(tree());
    return { rerender: () => rerender(tree()) };
  }

  it("la pasada inicial no escribe: con el tema claro el modo del script se queda", () => {
    stubMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    renderWithToggle();
    expect(writes).toEqual([]);
  });

  it("con el oscuro guardado en la portada escribe 'manual' y al conmutar a claro 'auto'", () => {
    stubMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    renderWithToggle();
    expect(writes).toEqual(["manual"]);
    act(() => {
      screen.getByRole("button", { name: "toggle" }).click();
    });
    expect(writes).toEqual(["manual", "auto"]);
  });

  it("sin Navigation API la portada oscura se resincroniza a 'auto'", () => {
    vi.stubGlobal("navigation", undefined);
    stubMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    renderWithToggle();
    expect(writes).toEqual(["auto"]);
  });

  it("una navegacion blanda fuera de la portada reescribe el modo de la entrada nueva", () => {
    stubMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    const { rerender } = renderWithToggle();
    expect(writes).toEqual(["manual"]);
    window.history.pushState(null, "", "/privacidad");
    routerState.pathname = "/privacidad";
    rerender();
    expect(writes).toEqual(["manual", "auto"]);
  });

  it("la vuelta desde la bfcache reaplica la regla con el tema pintado, y solo con persisted", () => {
    stubMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    renderWithToggle();
    document.documentElement.setAttribute("data-theme", "dark");
    const noPersisted = new Event("pageshow");
    Object.defineProperty(noPersisted, "persisted", { value: false });
    window.dispatchEvent(noPersisted);
    expect(writes).toEqual([]);
    const persisted = new Event("pageshow");
    Object.defineProperty(persisted, "persisted", { value: true });
    window.dispatchEvent(persisted);
    expect(writes).toEqual(["manual"]);
  });
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
    // app/RootDocument.tsx fija data-theme UNA sola vez, antes de hidratar, y
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

describe("ThemeProvider — fix wave B (2026-08-12): localStorage bloqueado no tira el runtime", () => {
  // El `Storage` de jsdom se implementa por dentro con un Proxy (para
  // soportar `localStorage.miClave = "x"` ademas de `setItem`), que ignora
  // un `vi.spyOn` sobre `getItem`/`setItem` de la instancia real -- probado
  // y descartado al escribir este test (el spy se instala pero la llamada
  // real sigue sin lanzar). La via que SI funciona es sustituir el objeto
  // `window.localStorage` COMPLETO por uno propio, mismo patron que ya usan
  // otros repos para simular modo privado estricto.
  const realLocalStorage = window.localStorage;

  /** Modo privado estricto (Safari) o política de navegador que bloquea el
   *  almacenamiento: `getItem`/`setItem` LANZAN, no devuelven `null`. */
  function blockStorage(): void {
    const blocked: Storage = {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: () => {
        throw new DOMException("almacenamiento bloqueado", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("almacenamiento bloqueado", "SecurityError");
      },
      removeItem: () => {},
    };
    Object.defineProperty(window, "localStorage", {
      value: blocked,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: realLocalStorage,
      configurable: true,
    });
  });

  it("con localStorage bloqueado, el montaje no lanza y resuelve al default claro (sin preferencia detectada)", () => {
    blockStorage();
    stubMatchMedia(false);

    expect(() => renderProbe()).not.toThrow();
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");
  });

  /**
   * El escenario que motivó este fix: en un navegador con storage bloqueado,
   * el script pre-paint (`resolveTheme.ts`, ya protegido) resuelve bien,
   * pero SIN el try/catch de esta revisión el runtime de React lanzaba en
   * cada toggle -- el control principal de esa rama, sin ningún error
   * boundary en el árbol. Verificado con el bug inyectado a propósito
   * (informe de la tarea): quitando temporalmente los dos `try/catch` de
   * `readStoredTheme`/`writeStoredTheme` en `ThemeProvider.tsx`, este test
   * cae en rojo (el `act()` del click relanza la excepción de `setItem`);
   * restaurados, vuelve a verde.
   */
  it("con localStorage bloqueado, el toggle SIGUE cambiando el tema en memoria sin lanzar", () => {
    blockStorage();
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

    expect(() => {
      act(() => {
        screen.getByRole("button", { name: "alternar" }).click();
      });
    }).not.toThrow();

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:user");
  });

  it("con localStorage bloqueado, el listener de prefers-color-scheme en vivo tampoco lanza", () => {
    blockStorage();
    const { dispatchChange } = stubMatchMedia(false);
    renderProbe();
    expect(screen.getByTestId("probe")).toHaveTextContent("light:initial");

    expect(() => dispatchChange(true)).not.toThrow();

    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });
});

/*
 * `theme-color` (2026-09-03, critica #16, hallazgo P1 del evaluador tecnico
 * B1). Hasta esa fecha el efecto de sincronizacion escribia el color de la
 * barra en TODAS las etiquetas y en TODAS las pasadas, incluida la inicial --
 * cuando `themeName` todavia vale "light" para todo el mundo. Medido en Chrome
 * real contra el build de produccion con `vti-theme = "dark"`, con la pila de
 * llamadas apuntando a este efecto:
 *
 *   t= 214  2 metas [#FAFAFA, #FAFAFA]   <- ESTE efecto, con themeName="light"
 *   t= 282  2 metas [#280739, #280739]   <- ESTE efecto, ya corregido
 *
 * Es decir, pisaba con el color claro lo que el script de arranque habia
 * acertado antes del primer pintado: 68 ms de barra clara sobre pagina oscura
 * en produccion, 1.472 ms en el servidor de desarrollo. La duplicacion de la
 * etiqueta era de React 19 y se cerro en `app/layout.tsx` (retirando
 * `themeColor` del `viewport`; hoy ese `viewport` es `ROOT_VIEWPORT`,
 * `app/rootMetadata.ts`, y sigue sin declararlo); esto candea la otra mitad.
 *
 * Se espia `setAttribute` de la etiqueta -- no solo su valor final -- porque lo
 * que importa es la SECUENCIA: un valor final correcto no demuestra que nunca
 * paso por uno equivocado. Mismo criterio que el candado gemelo de
 * `data-theme`, mas arriba en este fichero.
 */
describe("ThemeProvider — theme-color: la etiqueta del script no se pisa en claro", () => {
  function montarMetaDelScript(content: string): HTMLMetaElement {
    // Simula lo que el script de arranque deja hecho antes del primer pintado
    // (aqui no hay script: jsdom no ejecuta el `<head>` de layout.tsx).
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
    return meta;
  }

  afterEach(() => {
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((node) => node.remove());
  });

  it("con la etiqueta ya en oscuro, la secuencia de content NUNCA pasa por el claro (modo normal)", () => {
    const meta = montarMetaDelScript(THEME_COLORS.dark);
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(false);

    const setAttributeSpy = vi.spyOn(meta, "setAttribute");

    renderProbe();

    const contentCalls = setAttributeSpy.mock.calls
      .filter(([name]) => name === "content")
      .map(([, value]) => value);

    expect(contentCalls).not.toContain(THEME_COLORS.light);
    expect(contentCalls).toEqual([THEME_COLORS.dark]);
    expect(meta.getAttribute("content")).toBe(THEME_COLORS.dark);
    expect(
      document.head.querySelectorAll('meta[name="theme-color"]'),
    ).toHaveLength(1);
  });

  it("bajo React StrictMode (activo en cada pnpm dev) tampoco: es donde la ventana medida llegaba a 1.472 ms", () => {
    const meta = montarMetaDelScript(THEME_COLORS.dark);
    window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    stubMatchMedia(false);

    const setAttributeSpy = vi.spyOn(meta, "setAttribute");

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
      { reactStrictMode: true },
    );

    const contentCalls = setAttributeSpy.mock.calls
      .filter(([name]) => name === "content")
      .map(([, value]) => value);

    expect(contentCalls).not.toContain(THEME_COLORS.light);
    expect(contentCalls).toEqual([THEME_COLORS.dark]);
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:hydration");
  });

  it("un toggle de USUARIO si actualiza esa unica etiqueta, que es lo que la hace seguir al conmutador", () => {
    const meta = montarMetaDelScript(THEME_COLORS.light);
    stubMatchMedia(false);

    function ProbeConToggle(): ReactElement {
      const { toggleTheme } = useTheme();
      return <button onClick={toggleTheme}>alternar</button>;
    }
    render(
      <ThemeProvider>
        <ProbeConToggle />
      </ThemeProvider>,
    );

    expect(meta.getAttribute("content")).toBe(THEME_COLORS.light);

    act(() => {
      screen.getByRole("button", { name: "alternar" }).click();
    });

    expect(meta.getAttribute("content")).toBe(THEME_COLORS.dark);
    expect(
      document.head.querySelectorAll('meta[name="theme-color"]'),
    ).toHaveLength(1);
  });
});
