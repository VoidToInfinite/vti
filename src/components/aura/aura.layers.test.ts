import { describe, it, expect } from "vitest";
import {
  AURA_LAYERS,
  AURA_ORB_DEPTH,
  AURA_SURFACE,
  AURA_ASPECT,
} from "./aura.layers";
import { parseOklch } from "@/theme/tokens/contrast";

describe("aura.layers", () => {
  it("expone exactamente las cuatro capas publicadas, en el orden de pintado (energia detras de las manos)", () => {
    // Contrato cerrado: nº de capas Y orden. El orden de pintado (spec §15.3)
    // NO es el mismo que el orden de revelado del stagger (AURA_STAGGER): la
    // energía va detrás de las manos, no delante como en el primer lote. El
    // quinto escalón (el orbe) no es una capa de esta tabla — vive en
    // AURA_ORB_DEPTH porque lo renderiza `Sol`, no un WebP (spec §5.2).
    expect(AURA_LAYERS.map((layer) => layer.part)).toEqual([
      "field",
      "energy",
      "handLeft",
      "handRight",
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
        part: "energy",
        src: "/hero/aura/01-energy.webp",
        srcSmall: "/hero/aura/01-energy-1024.webp",
        depth: 0.15,
        fullBleed: false,
      },
      {
        part: "handLeft",
        src: "/hero/aura/02-hand-left.webp",
        srcSmall: "/hero/aura/02-hand-left-1024.webp",
        depth: 0.3,
        fullBleed: false,
      },
      {
        part: "handRight",
        src: "/hero/aura/03-hand-right.webp",
        srcSmall: "/hero/aura/03-hand-right-1024.webp",
        depth: 0.3,
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

  it("la energia es menos profunda que las manos: pinta detras de ellas, no delante", () => {
    // Revisión 2026-07-27 (spec §15.3/§15.4): el segundo lote compone la
    // energía DETRÁS de las manos, así que su profundidad de parallax tiene
    // que ser MENOR que la de las manos (0.30), no mayor como en el primer
    // lote (0.55) — lo que está detrás se mueve menos con el cursor.
    const energy = AURA_LAYERS.find((layer) => layer.part === "energy");
    const handLeft = AURA_LAYERS.find((layer) => layer.part === "handLeft");
    expect(energy?.depth).toBeLessThan(handLeft?.depth as number);
    expect(energy?.depth).toBeGreaterThan(0);
  });

  it("el orbe (Sol) es la capa mas profunda de la composicion, por encima incluso de la energia", () => {
    // La energía SÍ tiene presencia real bajo el orbe en el arte nuevo (spec
    // §15.4), pero `Sol`, opaco, sigue tapando esa zona igual que antes, así
    // que sigue siendo la capa más cercana al espectador.
    const deepestPublished = Math.max(
      ...AURA_LAYERS.map((layer) => layer.depth),
    );
    expect(AURA_ORB_DEPTH).toBeGreaterThan(deepestPublished);
  });

  it("AURA_SURFACE es el pastel medido del campo y lo entiende el helper de contraste", () => {
    expect(AURA_SURFACE).toBe("oklch(0.942 0.023 285)");
    expect(() => parseOklch(AURA_SURFACE)).not.toThrow();
    expect(parseOklch(AURA_SURFACE)).toEqual({ l: 0.942, c: 0.023, h: 285 });
  });

  it("AURA_ASPECT es la misma relacion de aspecto del lienzo que EYE_ASPECT: mismo tamano de origen", () => {
    expect(AURA_ASPECT).toBe("1672 / 941");
  });
});
