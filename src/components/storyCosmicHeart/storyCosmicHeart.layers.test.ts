import { describe, it, expect } from "vitest";
import {
  STORY_COSMIC_HEART_LAYERS,
  STORY_COSMIC_HEART_VOID,
} from "./storyCosmicHeart.layers";

describe("storyCosmicHeart.layers", () => {
  it("tiene las 8 capas, de fondo a frente, con el nucleo del corazon al final", () => {
    expect(STORY_COSMIC_HEART_LAYERS).toHaveLength(8);
    const depths = STORY_COSMIC_HEART_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(STORY_COSMIC_HEART_LAYERS.at(-1)?.part).toBe("heart-core");
    expect(STORY_COSMIC_HEART_LAYERS.at(-1)?.glow).toBe("core");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /story/cosmic-heart/", () => {
    for (const layer of STORY_COSMIC_HEART_LAYERS) {
      expect(layer.src).toMatch(/^\/story\/cosmic-heart\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(/^\/story\/cosmic-heart\/.+-1024\.webp$/);
    }
  });

  it("STORY_COSMIC_HEART_VOID es el negro-violeta verbatim del paquete original", () => {
    expect(STORY_COSMIC_HEART_VOID).toBe("#05030f");
  });
});
