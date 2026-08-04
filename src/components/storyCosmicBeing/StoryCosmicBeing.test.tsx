import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StoryCosmicBeing } from "./StoryCosmicBeing";
import { STORY_COSMIC_BEING_LAYERS } from "./storyCosmicBeing.layers";

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
 * jsdom no implementa IntersectionObserver, y useSceneParallax guarda su
 * bucle por visibilidad: sin este stub, el render lanza IntersectionObserver
 * is not defined. Mismo patron que StoryCosmicHeart.test.tsx. El stub no
 * dispara interseccion por si solo, que es justo lo que estos tests quieren:
 * comprueban el MARCADO de las capas, no su animacion.
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

describe("StoryCosmicBeing", () => {
  it("renderiza las 11 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<StoryCosmicBeing />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(STORY_COSMIC_BEING_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = STORY_COSMIC_BEING_LAYERS[i];
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("src", layer.src);
      expect(img.getAttribute("srcset")).toBe(
        `${layer.srcSmall} 1024w, ${layer.src} 1280w`,
      );
      expect(img).toHaveAttribute("data-part", layer.part);
    });
  });

  it("ninguna imagen tiene nombre accesible (son decorativas, alt vacio)", () => {
    const { container } = render(<StoryCosmicBeing />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });

  it("space-base se compone en blend normal; las otras diez capas en el aditivo (plus-lighter con fallback screen)", () => {
    const { container } = render(<StoryCosmicBeing />);
    const imgs = Array.from(container.querySelectorAll("img"));
    const [base, ...rest] = imgs;

    expect(base).toHaveAttribute("data-part", "space-base");
    expect(getComputedStyle(base as HTMLElement).mixBlendMode).toBe("normal");

    expect(rest).toHaveLength(10);
    rest.forEach((img) => {
      expect(getComputedStyle(img).mixBlendMode).toBe("screen");
    });
  });
});
