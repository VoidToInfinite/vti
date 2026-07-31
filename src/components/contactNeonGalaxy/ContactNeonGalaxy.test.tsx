import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ContactNeonGalaxy } from "./ContactNeonGalaxy";
import { CONTACT_NEON_LAYERS } from "./contactNeonGalaxy.layers";

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

describe("ContactNeonGalaxy", () => {
  it("renderiza las 7 capas como imagenes decorativas dentro de un contenedor aria-hidden", () => {
    const { container } = render(<ContactNeonGalaxy />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(CONTACT_NEON_LAYERS.length);
    imgs.forEach((img, i) => {
      const layer = CONTACT_NEON_LAYERS[i];
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
    const { container } = render(<ContactNeonGalaxy />);
    container
      .querySelectorAll("img")
      .forEach((img) => expect(img).not.toHaveAccessibleName());
  });
});
