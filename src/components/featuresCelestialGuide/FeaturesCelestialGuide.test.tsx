import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { FeaturesCelestialGuide } from "./FeaturesCelestialGuide";
import { FEATURES_CELESTIAL_LAYERS } from "./featuresCelestialGuide.layers";

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
 * jsdom no implementa `IntersectionObserver`, y desde que `useSceneParallax`
 * guarda su bucle por visibilidad (2026-07-31) montar esta escena lo
 * construye: sin este stub, el render lanza `IntersectionObserver is not
 * defined`. Mismo patron que ya usan `Story.test.tsx` y compania para el
 * observer de `useReveal`. El stub no dispara interseccion por si solo, que
 * es justo lo que estos tests quieren: comprueban el MARCADO de las capas,
 * no su animacion.
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

describe("FeaturesCelestialGuide", () => {
  it("renderiza las 10 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<FeaturesCelestialGuide />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(FEATURES_CELESTIAL_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = FEATURES_CELESTIAL_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.src} 2560w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<FeaturesCelestialGuide />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });
});
