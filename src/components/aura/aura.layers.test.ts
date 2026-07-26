import { describe, it, expect } from "vitest";
import {
  AURA_LAYERS,
  AURA_ORB_DEPTH,
  AURA_SURFACE,
  AURA_ASPECT,
} from "./aura.layers";
import { parseOklch } from "@/theme/tokens/contrast";

describe("aura.layers", () => {
  it("expone exactamente las cuatro capas publicadas, en el orden del stagger", () => {
    // Contrato cerrado: nº de capas Y orden. El quinto escalón (el orbe) no
    // es una capa de esta tabla — vive en AURA_ORB_DEPTH porque lo renderiza
    // `Sol`, no un WebP (spec §5.2).
    expect(AURA_LAYERS.map((layer) => layer.part)).toEqual([
      "field",
      "handLeft",
      "handRight",
      "energy",
    ]);
  });

  it("cada capa apunta a su ruta publicada, con variante estrecha y profundidad medida", () => {
    expect(AURA_LAYERS).toEqual([
      {
        part: "field",
        src: "/hero/aura/00-field.webp",
        srcSmall: "/hero/aura/00-field-1024.webp",
        depth: 0,
        fullBleed: true,
      },
      {
        part: "handLeft",
        src: "/hero/aura/01-hand-left.webp",
        srcSmall: "/hero/aura/01-hand-left-1024.webp",
        depth: 0.3,
        fullBleed: false,
      },
      {
        part: "handRight",
        src: "/hero/aura/02-hand-right.webp",
        srcSmall: "/hero/aura/02-hand-right-1024.webp",
        depth: 0.3,
        fullBleed: false,
      },
      {
        part: "energy",
        src: "/hero/aura/03-energy.webp",
        srcSmall: "/hero/aura/03-energy-1024.webp",
        depth: 0.55,
        fullBleed: false,
      },
    ]);
  });

  it("solo el campo va a sangre; el resto vive dentro del marco del sujeto", () => {
    // El campo es un degradado difuso (estirarlo es invisible); las manos y
    // la energía tienen forma reconocible y se anclan por el orbe (spec §5.2).
    const fullBleedParts = AURA_LAYERS.filter((layer) => layer.fullBleed).map(
      (layer) => layer.part,
    );
    expect(fullBleedParts).toEqual(["field"]);
  });

  it("las dos manos comparten profundidad a propósito: son el mismo plano físico", () => {
    const handLeft = AURA_LAYERS.find((layer) => layer.part === "handLeft");
    const handRight = AURA_LAYERS.find((layer) => layer.part === "handRight");
    expect(handLeft?.depth).toBe(handRight?.depth);
  });

  it("el orbe (Sol) es la capa mas profunda de la composicion, por encima incluso de la energia", () => {
    // La energía no cubre el orbe en el arte original (spec §3.3), así que
    // Sol puede montarse como la capa más cercana al espectador.
    const deepestPublished = Math.max(
      ...AURA_LAYERS.map((layer) => layer.depth),
    );
    expect(AURA_ORB_DEPTH).toBeGreaterThan(deepestPublished);
  });

  it("AURA_SURFACE es el pastel medido del campo y lo entiende el helper de contraste", () => {
    expect(AURA_SURFACE).toBe("oklch(0.961 0.016 283)");
    expect(() => parseOklch(AURA_SURFACE)).not.toThrow();
    expect(parseOklch(AURA_SURFACE)).toEqual({ l: 0.961, c: 0.016, h: 283 });
  });

  it("AURA_ASPECT es la misma relacion de aspecto del lienzo que EYE_ASPECT: mismo tamano de origen", () => {
    expect(AURA_ASPECT).toBe("1672 / 941");
  });
});
