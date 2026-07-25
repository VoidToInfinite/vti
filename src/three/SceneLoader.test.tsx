import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, type ComponentType, type RefObject } from "react";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import type { SceneLoader as SceneLoaderComponent } from "./SceneLoader";

/**
 * El progreso real llega de `useScrollProgress`, que lo crea con `useRef(0)` —
 * un `RefObject<number>` sin `null`. `createRef<number>()` NO sirve aquí: en
 * React 19 tipa `RefObject<number | null>` y no es asignable.
 */
const progressRef = (value = 0): RefObject<number> => ({ current: value });

/**
 * Mock controlable a mano de una `MediaQueryList`: `matches` es mutable y
 * `dispatch()` invoca los listeners de "change" ya registrados. jsdom no
 * dispara el evento de verdad, así que el test que reevalúa en caliente
 * (hallazgo 2) necesita este disparador manual.
 */
function createMediaQueryMock(initialMatches: boolean): {
  matches: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  dispatch: () => void;
} {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  return {
    get matches() {
      return matches;
    },
    set matches(value: boolean) {
      matches = value;
    },
    addEventListener: (_type: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.delete(cb);
    },
    dispatch: () => listeners.forEach((cb) => cb()),
  };
}

function stubMatchMedia(
  reducedMock: ReturnType<typeof createMediaQueryMock>,
): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((q: string) => {
      if (q.includes("reduced-motion")) return reducedMock;
      return createMediaQueryMock(false);
    }),
  );
}

/**
 * jsdom no implementa WebGL: sin este stub, `canvas.getContext("webgl2"/"webgl")`
 * devuelve siempre `null` y `supportsWebGL()` es siempre `false`,
 * independientemente de lo que haga el código bajo prueba (hallazgo 3 — el
 * motivo por el que los tests viejos no aislaban nada).
 */
function stubWebGL(available: boolean): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((
    contextId: string,
  ) =>
    available && (contextId === "webgl2" || contextId === "webgl")
      ? ({} as unknown)
      : null) as typeof HTMLCanvasElement.prototype.getContext);
}

/**
 * Componente-señuelo: probar que `SceneLoader` *intenta* cargar la escena
 * sin depender de que Three.js funcione de verdad dentro de jsdom (que no
 * tiene un WebGL real, solo el `getContext` simulado arriba).
 *
 * Devuelve `wasRequested()`, respaldado por un flag que se marca dentro del
 * factory de `vi.doMock` -- es decir, cuando el runner de módulos de Vitest
 * termina de resolver el `import("./Scene")` de `lazy()`. Esa resolución es
 * asíncrona de verdad (pasa por el pipeline de módulos de Vitest, no es un
 * `.then()` que se asiente en el mismo tick), así que comprobar el flag
 * justo después de `render()` sería tan poco fiable como el `setTimeout(0)`
 * que tenían los tests viejos (hallazgo 3) -- hay que esperar lo suficiente
 * (ver `NEGATIVE_WAIT_MS` más abajo) antes de dar por buena la ausencia.
 */
function stubSceneModule(): { wasRequested: () => boolean } {
  let requested = false;
  vi.doMock("./Scene", () => {
    requested = true;
    return {
      Scene: (() => <div data-testid="scene-mounted" />) as ComponentType<{
        progress: RefObject<number>;
      }>,
    };
  });
  return { wasRequested: () => requested };
}

/**
 * Margen real (no simulado) para los tests "no carga la escena": tiempo de
 * sobra para que, si el código estuviera roto y sí intentara cargarla, el
 * `import("./Scene")` mockeado tenga ocasión de resolverse de verdad y su
 * marcador llegue a montarse. Verificado adversarialmente (ver reporte de
 * la task): con la comprobación de reduced-motion desactivada a propósito,
 * este margen es suficiente para que el test detecte el fallo.
 */
const NEGATIVE_WAIT_MS = 500;

/** Reimporta `SceneLoader` en un módulo fresco (ver `vi.resetModules()` en
 * `beforeEach`): el `lazy(() => import("./Scene"))` de `SceneLoader.tsx` cachea
 * su resultado (éxito o rechazo) para siempre en la instancia del módulo, así
 * que sin este reset todos los tests compartirían el mismo veredicto del
 * primero que renderice la escena. */
async function loadSceneLoader(): Promise<typeof SceneLoaderComponent> {
  const mod = await import("./SceneLoader");
  return mod.SceneLoader;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("./Scene");
});

describe("SceneLoader", () => {
  it("muestra el poster antes de que la escena cargue", async () => {
    stubMatchMedia(createMediaQueryMock(false));
    stubWebGL(false);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
  });

  it("el poster es decoracion (no aporta contenido)", async () => {
    stubMatchMedia(createMediaQueryMock(false));
    stubWebGL(false);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    expect(screen.getByTestId("scene-poster")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("con WebGL disponible y sin reduced-motion, intenta cargar la escena", async () => {
    stubSceneModule();
    stubMatchMedia(createMediaQueryMock(false));
    stubWebGL(true);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    expect(await screen.findByTestId("scene-mounted")).toBeInTheDocument();
  });

  it("con WebGL disponible pero con reduced-motion, no carga la escena y el poster permanece", async () => {
    const sceneModule = stubSceneModule();
    stubMatchMedia(createMediaQueryMock(true));
    stubWebGL(true);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    await new Promise((resolve) => setTimeout(resolve, NEGATIVE_WAIT_MS));
    expect(sceneModule.wasRequested()).toBe(false);
    expect(screen.queryByTestId("scene-mounted")).not.toBeInTheDocument();
    expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
  });

  it("sin WebGL, no carga la escena aunque no haya reduced-motion", async () => {
    const sceneModule = stubSceneModule();
    stubMatchMedia(createMediaQueryMock(false));
    stubWebGL(false);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    await new Promise((resolve) => setTimeout(resolve, NEGATIVE_WAIT_MS));
    expect(sceneModule.wasRequested()).toBe(false);
    expect(screen.queryByTestId("scene-mounted")).not.toBeInTheDocument();
    expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
  });

  it("apaga la escena viva si reduced-motion se activa en caliente", async () => {
    stubSceneModule();
    const reducedMock = createMediaQueryMock(false);
    stubMatchMedia(reducedMock);
    stubWebGL(true);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);
    expect(await screen.findByTestId("scene-mounted")).toBeInTheDocument();

    reducedMock.matches = true;
    act(() => reducedMock.dispatch());

    await waitFor(() => {
      expect(screen.queryByTestId("scene-mounted")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
  });

  it("si el chunk de la escena falla al cargar, el poster sigue presente (no tumba el arbol)", async () => {
    vi.doMock("./Scene", () => {
      throw new Error("chunk failed");
    });
    stubMatchMedia(createMediaQueryMock(false));
    stubWebGL(true);
    const SceneLoader = await loadSceneLoader();

    renderWithProviders(<SceneLoader progress={progressRef()} />);

    await waitFor(() => {
      expect(screen.getByTestId("scene-poster")).toBeInTheDocument();
    });
  });
});
