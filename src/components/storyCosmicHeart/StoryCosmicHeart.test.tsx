import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StoryCosmicHeart } from "./StoryCosmicHeart";
import { STORY_COSMIC_HEART_LAYERS } from "./storyCosmicHeart.layers";

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

describe("StoryCosmicHeart", () => {
  it("renderiza las 8 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<StoryCosmicHeart />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(STORY_COSMIC_HEART_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = STORY_COSMIC_HEART_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.src} 1672w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<StoryCosmicHeart />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });
});
