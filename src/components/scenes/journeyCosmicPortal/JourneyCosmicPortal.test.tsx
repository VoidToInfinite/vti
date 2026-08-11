import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { JourneyCosmicPortal } from "./JourneyCosmicPortal";
import { JOURNEY_PORTAL_LAYERS } from "./journeyCosmicPortal.layers";

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * jsdom no implementa `IntersectionObserver`, y `useSceneParallax` guarda su
 * bucle por visibilidad: sin este stub el render lanza
 * `IntersectionObserver is not defined`. El stub no dispara interseccion por
 * si solo, que es justo lo que estos tests quieren: comprueban el MARCADO de
 * las capas, no su animacion.
 */
function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  stubMatchMedia();
  stubIntersectionObserver();
});
afterEach(() => vi.unstubAllGlobals());

describe("JourneyCosmicPortal", () => {
  it("renderiza las 6 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<JourneyCosmicPortal />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(JOURNEY_PORTAL_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = JOURNEY_PORTAL_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.srcMedium} 1600w, ${layer.src} 2560w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<JourneyCosmicPortal />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });

  /**
   * Este es el contrato que separa esta escena de todas las demas escenas
   * oscuras del sitio, y el que se rompe en silencio si alguien copia
   * `ScLayer` de `storyCosmicBeing.parts.tsx`: el paquete guarda el color
   * DESPREMULTIPLICADO para componer con alpha normal, y sumarlo en aditivo
   * lavaria las capas sin que nada falle.
   *
   * El test es falsable, comprobado antes de escribirlo: jsdom resuelve
   * `mix-blend-mode` de verdad -- devuelve `""` cuando no se declara y
   * `"plus-lighter"` cuando si. No es una asercion que pase siempre.
   */
  it("ninguna capa declara mix-blend-mode: se componen con alpha normal", () => {
    const { container } = render(<JourneyCosmicPortal />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    imgs.forEach((img) => {
      expect(getComputedStyle(img).mixBlendMode).toBe("");
    });
  });
});
