import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { JourneyAstralPathway } from "./JourneyAstralPathway";
import { JOURNEY_ASTRAL_LAYERS } from "./journeyAstralPathway.layers";

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

describe("JourneyAstralPathway", () => {
  it("renderiza las 5 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<JourneyAstralPathway />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(JOURNEY_ASTRAL_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = JOURNEY_ASTRAL_LAYERS[i];
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
    const { container } = render(<JourneyAstralPathway />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });
});
