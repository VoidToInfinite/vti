import { describe, it, expect } from "vitest";
import {
  JOURNEY_ASTRAL_LAYERS,
  JOURNEY_ASTRAL_VOID,
} from "./journeyAstralPathway.layers";

describe("journeyAstralPathway.layers", () => {
  it("tiene las 5 capas, de fondo a frente, con la figura al final", () => {
    expect(JOURNEY_ASTRAL_LAYERS).toHaveLength(5);
    const depths = JOURNEY_ASTRAL_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(JOURNEY_ASTRAL_LAYERS.at(-1)?.part).toBe("figure");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /journey/astral-pathway/", () => {
    for (const layer of JOURNEY_ASTRAL_LAYERS) {
      expect(layer.src).toMatch(/^\/journey\/astral-pathway\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/journey\/astral-pathway\/.+-1024\.webp$/,
      );
    }
  });

  it("JOURNEY_ASTRAL_VOID es el negro-azulado verbatim del paquete original, distinto del de Story", () => {
    expect(JOURNEY_ASTRAL_VOID).toBe("#02040e");
  });
});
