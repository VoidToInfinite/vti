import { describe, it, expect } from "vitest";
import { EYE_LAYERS, EYE_MASCOT_DEPTH } from "./eye.layers";

describe("eye.layers", () => {
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
