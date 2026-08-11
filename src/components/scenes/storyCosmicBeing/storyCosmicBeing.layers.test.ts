import { describe, it, expect } from "vitest";
import {
  STORY_COSMIC_BEING_LAYERS,
  STORY_COSMIC_BEING_SIZES,
  STORY_COSMIC_BEING_VOID,
} from "./storyCosmicBeing.layers";

describe("storyCosmicBeing.layers", () => {
  it("tiene las 11 capas, de fondo a frente, con el nucleo del corazon al final", () => {
    expect(STORY_COSMIC_BEING_LAYERS).toHaveLength(11);
    const depths = STORY_COSMIC_BEING_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(STORY_COSMIC_BEING_LAYERS.at(-1)?.part).toBe("heart-core");
    expect(STORY_COSMIC_BEING_LAYERS.at(-1)?.glow).toBe("core");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /story/cosmic-being/", () => {
    for (const layer of STORY_COSMIC_BEING_LAYERS) {
      expect(layer.src).toMatch(/^\/story\/cosmic-being\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(/^\/story\/cosmic-being\/.+-1024\.webp$/);
    }
  });

  it("STORY_COSMIC_BEING_VOID es el negro-violeta verbatim del manifest de esta escena", () => {
    expect(STORY_COSMIC_BEING_VOID).toBe("#05010e");
  });

  it("solo space-base declara blend normal (es opaca); las otras diez son aditivas (plus-lighter)", () => {
    const [base, ...rest] = STORY_COSMIC_BEING_LAYERS;
    expect(base?.part).toBe("space-base");
    expect(base?.blend).toBe("normal");
    expect(rest).toHaveLength(10);
    rest.forEach((layer) => expect(layer.blend).toBe("plus-lighter"));
  });

  it("STORY_COSMIC_BEING_SIZES declara el breakpoint movil de la Decision D-E (2026-08-09): 340px bajo 700px, 100vw en el resto", () => {
    expect(STORY_COSMIC_BEING_SIZES).toBe("(max-width: 700px) 340px, 100vw");
  });
});
