import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { Eye } from "./Eye";

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por `Eye`) llama a
 * `window.matchMedia` de verdad al montar; jsdom no lo implementa, así que
 * sin este stub cualquier render de `<Eye />` lanza "matchMedia is not a
 * function" (encontrado al poner en verde el test del brief: no traía este
 * stub). `fineMatches` controla si el puntero queda habilitado (arranca su
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
});
afterEach(() => vi.unstubAllGlobals());

describe("Eye", () => {
  it("es decoracion: todo el ojo queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Eye />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("no expone el logo como imagen accesible (el nombre lo da el DOM real)", () => {
    renderWithProviders(<Eye />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renderiza las capas del ojo", () => {
    const { container } = renderWithProviders(<Eye />);
    expect(
      container.querySelector('[data-part="universe"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-part="iris"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="pupil"]')).toBeInTheDocument();
  });

  it("aplica className en el elemento raiz (styled(Eye) lo necesita en tasks posteriores)", () => {
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
