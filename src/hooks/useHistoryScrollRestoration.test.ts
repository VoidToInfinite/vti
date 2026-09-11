import { renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { captureReadingAnchor } from "./themeScrollAnchor";
import { FRAGMENT_LANDING_SETTLE_MS } from "./useFragmentLanding";
import { useHistoryScrollRestoration } from "./useHistoryScrollRestoration";

/* `captureReadingAnchor` envuelto en un espía que delega en el real: cuenta
   las lecturas de layout sin cambiar lo que devuelven. */
vi.mock("./themeScrollAnchor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./themeScrollAnchor")>();
  return {
    ...actual,
    captureReadingAnchor: vi.fn(actual.captureReadingAnchor),
  };
});

/*
 * LO QUE ESTE FICHERO PRUEBA Y LO QUE NO. jsdom no implementa
 * `history.scrollRestoration` (`"scrollRestoration" in history` es `false`) ni
 * restituye scroll, así que el MODO se simula con `Object.defineProperty` y el
 * scroll con `scrollY` definido a mano: aquí se ata el MECANISMO (qué se
 * anota, bajo qué entrada, cuándo se restituye y cuándo NO), no los píxeles
 * de un navegador real.
 *
 * MATRIZ: modo `"manual"`, `"auto"` y ausente; R3 (misma ruta montada) y R4
 * (la ruta de llegada se monta después); entrada de llegada con y sin
 * registro; gesto humano (rueda) antes de la restitución. La clave de entrada
 * se simula con una Navigation API mínima (`navigation.currentEntry.key`).
 */

let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
let scrollToMock: ReturnType<typeof vi.fn>;
let setTimeoutSpy: MockInstance;
let entryKey: string;
let mode: string | undefined;

function flushFrame(): void {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

/** El lector se desplaza hasta `y` en la entrada activa y el registro
 *  agrupado por frame lo anota. */
function scrollTo(y: number): void {
  setScrollY(y);
  window.dispatchEvent(new Event("scroll"));
  flushFrame();
}

/** Recorrido del historial hacia `key`. Con "manual" el navegador no mueve el
 *  scroll: `scrollY` se queda donde estaba. */
function traverseTo(key: string): void {
  navigateTo(key, "traverse");
}

let navigationTarget: EventTarget;

/** Navegación dentro del documento con su tipo: la Navigation API avisa con
 *  `navigate` y, en la misma tarea, Chrome dispara `popstate` (también en un
 *  salto a fragmento). */
function navigateTo(key: string, navigationType: string): void {
  navigationTarget.dispatchEvent(
    Object.assign(new Event("navigate"), { navigationType }),
  );
  entryKey = key;
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function armados(): number {
  return setTimeoutSpy.mock.calls.filter(
    ([, delay]) => delay === FRAGMENT_LANDING_SETTLE_MS,
  ).length;
}

function renderAt(pathname: string) {
  return renderHook(({ route }) => useHistoryScrollRestoration(route), {
    initialProps: { route: pathname },
  });
}

beforeEach(() => {
  frames = new Map();
  nextFrameId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  scrollToMock = vi.fn();
  vi.stubGlobal("scrollTo", scrollToMock);
  setTimeoutSpy = vi.spyOn(window, "setTimeout");
  entryKey = "entrada-a";
  navigationTarget = new EventTarget();
  Object.defineProperty(navigationTarget, "currentEntry", {
    get: () => ({ key: entryKey }),
  });
  vi.stubGlobal("navigation", navigationTarget);
  mode = "manual";
  Object.defineProperty(window.history, "scrollRestoration", {
    configurable: true,
    get: () => mode,
  });
  setScrollY(0);
});

afterEach(() => {
  Reflect.deleteProperty(window.history, "scrollRestoration");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useHistoryScrollRestoration: coste del registro", () => {
  it("con 'auto' el scroll no lee layout: cero llamadas a captureReadingAnchor", () => {
    mode = "auto";
    vi.mocked(captureReadingAnchor).mockClear();
    renderAt("/");

    scrollTo(3000);
    scrollTo(6000);
    expect(captureReadingAnchor).not.toHaveBeenCalled();

    // Contraste: el mismo gesto con "manual" SÍ anota, luego el espía mira.
    mode = "manual";
    scrollTo(7000);
    expect(captureReadingAnchor).toHaveBeenCalledTimes(1);
  });
});

describe("useHistoryScrollRestoration con la entrada de llegada en 'manual'", () => {
  it("R3: Atrás a una entrada de la misma ruta restituye su posición UNA vez", () => {
    renderAt("/");
    scrollTo(3000);

    entryKey = "entrada-b";
    scrollTo(9000);

    traverseTo("entrada-a");
    expect(scrollToMock).not.toHaveBeenCalled();

    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 3000,
      behavior: "instant",
    });

    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
  });

  it("Adelante: la entrada que se abandona se anota en el popstate y se restituye al volver", () => {
    renderAt("/");
    scrollTo(3000);
    entryKey = "entrada-b";
    scrollTo(9000);

    traverseTo("entrada-a");
    flushFrame();
    flushFrame();
    setScrollY(3000);

    traverseTo("entrada-b");
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 9000,
      behavior: "instant",
    });
  });

  it("R4: con otra ruta montada, espera a que la ruta de llegada se monte", () => {
    const { rerender } = renderAt("/");
    scrollTo(3000);

    entryKey = "entrada-legal";
    rerender({ route: "/privacidad" });
    scrollTo(0);

    traverseTo("entrada-a");
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(armados()).toBe(0);

    rerender({ route: "/" });
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 3000,
      behavior: "instant",
    });
  });

  it("una entrada sin registro no mueve nada", () => {
    renderAt("/");
    scrollTo(3000);

    traverseTo("entrada-desconocida");
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(armados()).toBe(0);
  });

  it("una intención humana antes de la restitución la aborta", () => {
    renderAt("/");
    scrollTo(3000);
    entryKey = "entrada-b";
    scrollTo(9000);

    traverseTo("entrada-a");
    window.dispatchEvent(new Event("wheel"));
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
  });
});

describe("useHistoryScrollRestoration: solo los recorridos restituyen", () => {
  /*
   * El rojo de la familia 32 (2026-09-10): segundo clic al MISMO fragmento
   * con el scroll de vuelta en 0. Es un `replace` con la MISMA clave de
   * entrada, cuyo registro guardaba el 0; Chrome dispara `popstate` y el hook
   * restituía ese 0 detrás del salto.
   */
  it.each(["push", "replace"])(
    "un salto a fragmento (%s) no restituye ni arma nada",
    (navigationType) => {
      renderAt("/");
      entryKey = "entrada-story";
      scrollTo(772);
      scrollTo(0);

      navigateTo("entrada-story", navigationType);
      flushFrame();
      flushFrame();
      expect(scrollToMock).not.toHaveBeenCalled();
      expect(armados()).toBe(0);
    },
  );

  it("un salto a fragmento desarma la restitución de un recorrido previo", () => {
    renderAt("/");
    scrollTo(3000);
    entryKey = "entrada-b";
    scrollTo(9000);

    traverseTo("entrada-a");
    navigateTo("entrada-a", "replace");
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("sin Navigation API decide el modo, como antes (el interruptor ya no pone 'manual' ahí)", () => {
    vi.stubGlobal("navigation", undefined);
    // Sin la API la clave es `location.href`: dos URL distintas, dos ranuras.
    window.history.replaceState(null, "", "/");
    renderAt("/");
    scrollTo(3000);
    window.history.replaceState(null, "", "/#contact");
    scrollTo(9000);

    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 3000,
      behavior: "instant",
    });
  });
});

describe("useHistoryScrollRestoration: la entrada que se abandona se anota en el navigate", () => {
  /*
   * P7-1A (2026-09-11), medido en Chrome sobre el build servido: la portada
   * oscura a la que se llega por push nace en "auto" y su UNICO scroll (el
   * salto a y=0) se procesa ANTES de que el interruptor la pase a "manual",
   * asi que `record()` no la anota. Al abandonarla con Atras hacia una legal,
   * el `popstate` ve el modo de LLEGADA ("auto") y tampoco. Al volver con
   * Adelante, `records.get(portada)` falla y el lector hereda la posicion de
   * la legal (1500 px durante 5 s). El `navigate` es el ultimo momento en que
   * la clave, el modo y el DOM siguen siendo los de la entrada que se deja.
   *
   * Aqui el modo depende de la ENTRADA activa, como en el navegador: la
   * portada en "manual" y la legal en "auto".
   */
  let modos: Record<string, string>;

  beforeEach(() => {
    modos = { portada: "manual", legal: "auto", contacto: "manual" };
    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      get: () => modos[entryKey] ?? "auto",
    });
    entryKey = "portada";
  });

  it("C1: portada sin ningun scroll en 'manual' -> Atras a la legal -> Adelante vuelve a y=0", () => {
    const { rerender } = renderAt("/");
    setScrollY(0);

    traverseTo("legal");
    rerender({ route: "/privacidad" });
    setScrollY(1500);
    scrollTo(1500);

    traverseTo("portada");
    expect(scrollToMock).not.toHaveBeenCalled();
    rerender({ route: "/" });
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("push: la portada que paso a 'manual' despues de su scroll se anota al irse y se restituye con Atras", () => {
    modos.portada = "auto";
    const { rerender } = renderAt("/");
    scrollTo(2400);
    modos.portada = "manual";

    navigateTo("legal", "push");
    rerender({ route: "/privacidad" });
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(armados()).toBe(0);
    setScrollY(0);

    traverseTo("portada");
    rerender({ route: "/" });
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 2400,
      behavior: "instant",
    });
  });

  it("un requestAnimationFrame(record) pendiente al navegar se cancela: no anota la entrada de llegada", () => {
    renderAt("/");
    setScrollY(800);
    window.dispatchEvent(new Event("scroll"));
    expect(frames.size).toBe(1);

    navigateTo("contacto", "push");
    expect(frames.size).toBe(0);
    setScrollY(9046);
    flushFrame();

    traverseTo("portada");
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 800,
      behavior: "instant",
    });
  });

  it("push y replace siguen sin restituir por si mismos aunque ahora anoten la entrada que dejan", () => {
    renderAt("/");
    scrollTo(3000);

    navigateTo("contacto", "push");
    flushFrame();
    flushFrame();
    navigateTo("contacto", "replace");
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(armados()).toBe(0);
  });
});

describe("useHistoryScrollRestoration con 'auto' (el sitio antes del interruptor)", () => {
  /*
   * EL CANDADO DE "COMPORTAMIENTO IDÉNTICO AL DE HOY". Con la entrada de
   * llegada en "auto" restituye la nativa y este hook no puede ser un segundo
   * motor: ni `scrollTo` ni una corrección armada, en ninguna de las rutas.
   */
  it.each([
    ["auto", "auto"],
    ["ausente (jsdom, motores sin la propiedad)", undefined],
  ])("modo %s: ni R3 ni R4 mueven el scroll ni arman nada", (_label, value) => {
    mode = value;
    const { rerender } = renderAt("/");
    scrollTo(3000);
    entryKey = "entrada-b";
    scrollTo(9000);

    traverseTo("entrada-a");
    flushFrame();
    flushFrame();

    entryKey = "entrada-legal";
    rerender({ route: "/privacidad" });
    traverseTo("entrada-b");
    rerender({ route: "/" });
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
    expect(armados()).toBe(0);
  });
});

describe("useHistoryScrollRestoration: limpieza", () => {
  it("al desmontar no queda ningún oyente de popstate ni de scroll", () => {
    const { unmount } = renderAt("/");
    scrollTo(3000);
    entryKey = "entrada-b";
    scrollTo(9000);
    unmount();

    traverseTo("entrada-a");
    flushFrame();
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();
  });
});
