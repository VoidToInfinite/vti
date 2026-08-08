import { describe, it, expect } from "vitest";
import {
  CONTACT_GUARDIAN_LAYERS,
  CONTACT_GUARDIAN_SIZES,
} from "./contactCosmicGuardian.layers";

describe("contactCosmicGuardian.layers", () => {
  it("tiene las 3 capas del kit, ninguna mas ninguna menos", () => {
    expect(CONTACT_GUARDIAN_LAYERS).toHaveLength(3);
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /contact/cosmic-guardian/, sin rastro de la escena saliente ni de los orbes excluidos", () => {
    for (const layer of CONTACT_GUARDIAN_LAYERS) {
      expect(layer.src).toMatch(/^\/contact\/cosmic-guardian\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/contact\/cosmic-guardian\/.+-1024\.webp$/,
      );
      expect(layer.src).not.toContain("neon-galaxy");
      expect(layer.srcSmall).not.toContain("neon-galaxy");
    }
  });

  it("el orden de pintado es fondo, figura, polvo", () => {
    const parts = CONTACT_GUARDIAN_LAYERS.map((l) => l.part);
    expect(parts).toEqual(["fondo", "figura", "polvo"]);
  });

  it("la profundidad maxima es exactamente 1 (polvo) y la minima es exactamente 0 (fondo)", () => {
    const depths = CONTACT_GUARDIAN_LAYERS.map((l) => l.depth);
    expect(Math.max(...depths)).toBe(1);
    expect(Math.min(...depths)).toBe(0);

    expect(CONTACT_GUARDIAN_LAYERS.at(-1)?.part).toBe("polvo");
    expect(CONTACT_GUARDIAN_LAYERS.at(-1)?.depth).toBe(1);

    expect(CONTACT_GUARDIAN_LAYERS.at(0)?.part).toBe("fondo");
    expect(CONTACT_GUARDIAN_LAYERS.at(0)?.depth).toBe(0);
  });

  it("solo el polvo lleva blend screen; fondo y figura van en normal", () => {
    const fondo = CONTACT_GUARDIAN_LAYERS.find((l) => l.part === "fondo");
    const figura = CONTACT_GUARDIAN_LAYERS.find((l) => l.part === "figura");
    const polvo = CONTACT_GUARDIAN_LAYERS.find((l) => l.part === "polvo");
    expect(fondo?.blend).toBe("normal");
    expect(figura?.blend).toBe("normal");
    expect(polvo?.blend).toBe("screen");
  });

  it("CONTACT_GUARDIAN_SIZES es 100vw a secas: la escena va a sangre", () => {
    expect(CONTACT_GUARDIAN_SIZES).toBe("100vw");
  });

  it("el modulo no menciona neon-galaxy ni orbes", () => {
    const serialized = JSON.stringify(CONTACT_GUARDIAN_LAYERS);
    expect(serialized.toLowerCase()).not.toContain("neon-galaxy");
    expect(serialized.toLowerCase()).not.toContain("orb");
  });
});
