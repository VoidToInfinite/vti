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

beforeEach(stubMatchMedia);
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
