import { describe, it, expect } from "vitest";
import {
  FEATURES_ORBITAL_LAYERS,
  FEATURES_ORBITAL_SIZES,
} from "./featuresCelestialOrbital.layers";

describe("featuresCelestialOrbital.layers", () => {
  it("tiene las 7 capas del paquete, ninguna mas ninguna menos", () => {
    expect(FEATURES_ORBITAL_LAYERS).toHaveLength(7);
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /features/celestial-orbital/, sin rastro de la escena saliente", () => {
    for (const layer of FEATURES_ORBITAL_LAYERS) {
      expect(layer.src).toMatch(/^\/features\/celestial-orbital\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/features\/celestial-orbital\/.+-1024\.webp$/,
      );
      expect(layer.src).not.toContain("celestial-guide");
      expect(layer.srcSmall).not.toContain("celestial-guide");
    }
  });

  it("el orden de pintado es el del demo del paquete (D13): fondo, ondas, orbita, plataforma, iconos, figura, particulas", () => {
    // La plataforma pinta DEBAJO de los iconos (orden del demo), no encima
    // (orden del README): medido, no supuesto — ver el docblock de
    // `FEATURES_ORBITAL_LAYERS`.
    const parts = FEATURES_ORBITAL_LAYERS.map((l) => l.part);
    expect(parts).toEqual([
      "fondo",
      "ondas",
      "orbita",
      "plataforma",
      "iconos",
      "figura",
      "particulas",
    ]);
  });

  it("la profundidad maxima es exactamente 1 (particulas) y la minima es la del fondo", () => {
    const depths = FEATURES_ORBITAL_LAYERS.map((l) => l.depth);
    expect(Math.max(...depths)).toBe(1);
    expect(FEATURES_ORBITAL_LAYERS.at(-1)?.part).toBe("particulas");
    expect(FEATURES_ORBITAL_LAYERS.at(-1)?.depth).toBe(1);

    const fondoDepth = FEATURES_ORBITAL_LAYERS.find(
      (l) => l.part === "fondo",
    )?.depth;
    expect(fondoDepth).toBe(Math.min(...depths));
    expect(FEATURES_ORBITAL_LAYERS.at(0)?.part).toBe("fondo");
  });

  it("FEATURES_ORBITAL_SIZES es 100vw a secas (D9): la escena va a sangre", () => {
    expect(FEATURES_ORBITAL_SIZES).toBe("100vw");
  });
});
