import { describe, it, expect } from "vitest";
import { EYE_LAYERS, EYE_MASCOT_DEPTH, EYE_SURFACE } from "./eye.layers";
import { parseOklch } from "@/theme/tokens/contrast";

describe("eye.layers", () => {
  it("EYE_SURFACE es el negro del lienzo y lo entiende el helper de contraste", () => {
    // Es el extremo superior de la costura Hero -> Story: si deja de valer el
    // negro que pinta ScSocket, la junta reaparece. Y tiene que ser parseable
    // por parseOklch (sin alfa) para que los tests de contraste de Story
    // puedan consumirlo en vez de reescribir el literal.
    expect(EYE_SURFACE).toBe("oklch(0 0 0)");
    expect(() => parseOklch(EYE_SURFACE)).not.toThrow();
    expect(parseOklch(EYE_SURFACE)).toEqual({ l: 0, c: 0, h: 0 });
  });

  it("la mascota comparte profundidad con la capa de la pupila", () => {
    // La mascota (Wormhole/Sol) se lee como el CONTENIDO de la pupila. Si las
    // dos profundidades divergen, en cuanto el cursor sale del centro la
    // mascota se despega del pozo que la sostiene — y es el tipo de deriva que
    // nadie nota revisando un diff, porque los dos valores viven separados.
    const pupil = EYE_LAYERS.find((layer) => layer.part === "pupil");
    expect(pupil).toBeDefined();
    expect(EYE_MASCOT_DEPTH).toBe(pupil?.depth);
  });

  it("las capas van de atras a delante, con el fondo inmovil", () => {
    const depths = EYE_LAYERS.map((layer) => layer.depth);
    expect(depths[0]).toBe(0);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
  });

  it("solo la base se compone en normal; el resto es luz que se suma", () => {
    // El aditivo es la condicion bajo la que se extrajeron las mascaras (suman
    // 1 por pixel): con blending normal aparecen halos en los bordes con
    // feathering.
    expect(EYE_LAYERS[0].additive).toBe(false);
    expect(EYE_LAYERS.slice(1).every((layer) => layer.additive)).toBe(true);
  });
});
