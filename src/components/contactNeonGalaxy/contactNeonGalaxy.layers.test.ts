import { describe, it, expect } from "vitest";
import {
  CONTACT_NEON_LAYERS,
  CONTACT_NEON_VOID,
} from "./contactNeonGalaxy.layers";

describe("contactNeonGalaxy.layers", () => {
  it("tiene las 7 capas, de fondo a frente, con la figura/holograma al final", () => {
    expect(CONTACT_NEON_LAYERS).toHaveLength(7);
    const depths = CONTACT_NEON_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(CONTACT_NEON_LAYERS.at(-1)?.part).toBe("figura-holograma");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /contact/neon-galaxy/", () => {
    for (const layer of CONTACT_NEON_LAYERS) {
      expect(layer.src).toMatch(/^\/contact\/neon-galaxy\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/contact\/neon-galaxy\/.+-1024\.webp$/,
      );
    }
  });

  it("CONTACT_NEON_VOID es el mismo negro-azulado verbatim que Journey/Features (misma generacion de paquete)", () => {
    expect(CONTACT_NEON_VOID).toBe("#02040e");
  });
});
