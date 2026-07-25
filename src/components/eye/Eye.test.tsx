import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { Eye } from "./Eye";
import { EYE_LAYERS } from "./eye.layers";

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por `Eye`) llama a
 * `window.matchMedia` de verdad al montar; jsdom no lo implementa, así que
 * sin este stub cualquier render de `<Eye />` lanza "matchMedia is not a
 * function". `fineMatches` controla si el puntero queda habilitado (arranca su
 * propio rAF interno); `reducedMatches` siempre es `false` salvo que se pida.
 */
function stubMatchMedia(fineMatches: boolean, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  // Por defecto sin puntero fino: la mayoría de estos tests solo verifican
  // estructura/accesibilidad, no el seguimiento del cursor.
  stubMatchMedia(false);
  // El tema decide qué mascota ocupa el centro del ojo, y `ThemeProvider` lo
  // lee de localStorage al montar: sin limpiarlo, el test que lo fija a
  // oscuro contaminaría a los siguientes.
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Eye", () => {
  it("es decoracion: todo el ojo queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Eye />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("no expone ninguna capa como imagen accesible (el nombre lo da el DOM real)", () => {
    const { container } = renderWithProviders(<Eye />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // El corolario estructural: toda capa es decorativa, `alt` vacio.
    for (const img of container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt", "");
    }
  });

  it("monta las cinco capas de la composicion, en orden de atras a delante", () => {
    const { container } = renderWithProviders(<Eye />);
    const parts = [...container.querySelectorAll("img[data-part]")].map((img) =>
      img.getAttribute("data-part"),
    );
    expect(parts).toEqual(EYE_LAYERS.map((layer) => layer.part));
  });

  it("ofrece la variante estrecha de cada capa para no servir 1672px a un movil", () => {
    const { container } = renderWithProviders(<Eye />);
    for (const layer of EYE_LAYERS) {
      const img = container.querySelector(`img[data-part="${layer.part}"]`);
      expect(img).toHaveAttribute("src", layer.src);
      expect(img?.getAttribute("srcset")).toContain(layer.srcSmall);
      expect(img).toHaveAttribute("sizes");
    }
  });

  it("aplica className en el elemento raiz (styled(Eye) lo necesita para el hero)", () => {
    const { container } = renderWithProviders(<Eye className="custom" />);
    expect(container.firstElementChild).toHaveClass("custom");
  });

  it("no arranca el rAF de seguimiento cuando el puntero esta deshabilitado (tactil o reduced-motion)", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    renderWithProviders(<Eye />); // matchMedia deshabilitado por el beforeEach
    expect(raf).not.toHaveBeenCalled();
  });

  it("cancela el rAF de seguimiento en curso al desmontar", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const { unmount } = renderWithProviders(<Eye />);
    expect(raf).toHaveBeenCalled();
    unmount();
    expect(caf).toHaveBeenCalledWith(7);
  });

  it("no cancela ni reprograma el rAF de seguimiento al re-renderizar con las mismas props (usePointer() devuelve un objeto nuevo por render)", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(9);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const { rerender } = renderWithProviders(<Eye />);
    // Al montar, tanto `usePointer` (rAF del lerp) como `Eye` (rAF que
    // aplica los transforms) piden un frame cada uno: hay que medir el
    // DELTA tras el re-render, no un total absoluto.
    const callsAfterMount = raf.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    rerender(<Eye />);
    expect(caf).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalledTimes(callsAfterMount);
  });

  it("el parallax desplaza cada capa segun su profundidad, y deja el fondo quieto", () => {
    stubMatchMedia(true); // puntero fino habilitado
    // rAF controlado a mano: se guardan los callbacks pendientes y se ejecutan
    // en tandas, que es la unica forma de avanzar el lerp de `usePointer` (y
    // con el, el rAF del ojo) de manera determinista dentro de jsdom.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { container } = renderWithProviders(<Eye />);

    // Cursor en la esquina inferior derecha del viewport => x, y -> +1.
    window.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth,
        clientY: window.innerHeight,
      }),
    );
    // Varias tandas: el lerp (0.085/frame) necesita tiempo para acercarse al
    // objetivo, y el ojo lee el valor ya suavizado.
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    const transformOf = (part: string): string =>
      container.querySelector<HTMLElement>(`[data-part="${part}"]`)?.style
        .transform ?? "";
    const xOf = (part: string): number =>
      Number(/translate3d\((-?[\d.]+)px/.exec(transformOf(part))?.[1] ?? "0");

    // El fondo (depth 0) no recibe transform nunca: es el plano de referencia.
    expect(transformOf("background")).toBe("");
    // El resto se ordena por profundidad: pupila > iris > nebulosa > parpado.
    expect(xOf("pupil")).toBeGreaterThan(xOf("iris"));
    expect(xOf("iris")).toBeGreaterThan(xOf("nebula"));
    expect(xOf("nebula")).toBeGreaterThan(xOf("eyelid"));
    expect(xOf("eyelid")).toBeGreaterThan(0);
    // La mascota del centro viaja pegada a la pupila, no a su propio ritmo.
    expect(transformOf("mascot")).toBe(transformOf("pupil"));
  });

  it("en tema claro el centro del ojo lo ocupa Sol", () => {
    // ThemeProvider arranca en claro y no hay nada guardado en localStorage.
    const { container } = renderWithProviders(<Eye />);
    const slot = container.querySelector('[data-part="mascot"]');
    expect(slot?.querySelector('[data-face="sol"]')).toBeInTheDocument();
    expect(slot?.querySelector('[data-part="ring1"]')).not.toBeInTheDocument();
  });

  it("en tema oscuro el centro del ojo lo ocupa el Wormhole, que ademas se queda con el pulso", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<Eye />);
    const slot = container.querySelector('[data-part="mascot"]');

    expect(slot?.querySelector('[data-part="ring1"]')).toBeInTheDocument();
    expect(slot?.querySelector('[data-face="sol"]')).not.toBeInTheDocument();
    // El Wormhole trae sus dos ondas de choque: montar ademas el anillo simple
    // del ojo daria tres ondas para el mismo click.
    expect(
      container.querySelector('[data-part="shock"]'),
    ).not.toBeInTheDocument();
    expect(slot?.querySelector('[data-part="shock2"]')).toBeInTheDocument();
  });

  it("con reduced-motion el pointerdown no marca el pulso (no habria animacion que lo apagara)", () => {
    stubMatchMedia(false, true);
    const { container } = renderWithProviders(<Eye />);
    const socket = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(socket);
    expect(socket).not.toHaveAttribute("data-pulsing");
  });

  it("un pointerdown sobre el ojo marca el pulso, y el fin de su animacion lo limpia para que pueda repetirse", () => {
    const { container } = renderWithProviders(<Eye />);
    const socket = container.firstElementChild as HTMLElement;
    const shock = container.querySelector('[data-part="shock"]') as HTMLElement;

    expect(socket).not.toHaveAttribute("data-pulsing");

    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");

    fireEvent.animationEnd(shock);
    expect(socket).not.toHaveAttribute("data-pulsing");

    // Se puede repetir: un segundo click vuelve a marcar el pulso.
    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");
  });
});
