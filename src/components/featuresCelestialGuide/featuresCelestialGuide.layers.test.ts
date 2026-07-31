import { describe, it, expect } from "vitest";
import {
  FEATURES_CELESTIAL_LAYERS,
  FEATURES_CELESTIAL_VOID,
} from "./featuresCelestialGuide.layers";

describe("featuresCelestialGuide.layers", () => {
  it("tiene las 10 capas, de fondo a frente, con la figura/holograma al final", () => {
    expect(FEATURES_CELESTIAL_LAYERS).toHaveLength(10);
    const depths = FEATURES_CELESTIAL_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(FEATURES_CELESTIAL_LAYERS.at(-1)?.part).toBe("figura-holograma");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /features/celestial-guide/", () => {
    for (const layer of FEATURES_CELESTIAL_LAYERS) {
      expect(layer.src).toMatch(/^\/features\/celestial-guide\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/features\/celestial-guide\/.+-1024\.webp$/,
      );
    }
  });

  it("FEATURES_CELESTIAL_VOID es el mismo negro-azulado verbatim que Journey (misma generacion de paquete)", () => {
    expect(FEATURES_CELESTIAL_VOID).toBe("#02040e");
  });
});
