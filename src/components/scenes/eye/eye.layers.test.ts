import { describe, it, expect } from "vitest";
import {
  EYE_LAYERS,
  EYE_MASCOT_DEPTH,
  EYE_STAGGER,
  EYE_SURFACE,
  EYE_PRELOADS,
  eyeAvifSrcSet,
} from "./eye.layers";
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

  it("EYE_STAGGER escalona mascota -> fondo -> parpado -> nebulosa -> iris -> pupila, el orden exacto del encargo", () => {
    // Cierra el contrato del escalonado de carga/cruce (tema oscuro): la
    // mascota (sinonimo de "socket") va primero para que el lienzo negro y el
    // Wormhole aparezcan y se apaguen juntos, y "pupil" (sinonimo de "scrim")
    // va el ultimo porque el velo de contraste solo tiene sentido cuando ya
    // hay copia encima que contrastar.
    expect(EYE_STAGGER).toEqual([
      "mascot",
      "background",
      "eyelid",
      "nebula",
      "iris",
      "pupil",
    ]);
  });

  it("los 5 ultimos escalones de EYE_STAGGER son exactamente el orden de EYE_LAYERS: el escalonado no puede divergir de la tabla de capas", () => {
    // EYE_STAGGER = [mascota, ...EYE_LAYERS.part]: la mascota es la unica
    // pieza que no es una entrada de EYE_LAYERS (la renderiza Sol/Wormhole,
    // no un WebP), asi que el resto tiene que coincidir 1:1 con el orden de
    // profundidad ya declarado ahi. Si alguien reordenara EYE_LAYERS sin
    // tocar este array (o viceversa), este test lo detecta.
    expect(EYE_STAGGER.slice(1)).toEqual(EYE_LAYERS.map((layer) => layer.part));
  });
});

/*
 * Candado de la convencion AVIF del ojo (2026-08-18), gemelo del de la
 * escena de Story: las rutas .avif se derivan por extension, y el riesgo de
 * la convencion -- un fichero derivado inexistente al que el <source> y la
 * PRECARGA del script de arranque apuntarian (404 silencioso con
 * fetchpriority high) -- se cierra comprobando con node:fs que cada pista
 * existe en public/. Validado con bug inyectado real: renombrar un .avif
 * pone este test en rojo.
 */
describe("eye AVIF", () => {
  it("cada pista AVIF derivada existe en public/ y no esta vacia", async () => {
    const { statSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = join(here, "..", "..", "..", "..", "public");

    for (const layer of EYE_LAYERS) {
      for (const track of [layer.src, layer.srcSmall]) {
        const avif = track.replace(/\.webp$/, ".avif");
        const stat = statSync(join(publicDir, avif.replace(/^\//, "")));
        expect(stat.size, `${avif} no existe o esta vacia`).toBeGreaterThan(0);
      }
    }
  });

  it("EYE_PRELOADS precarga la pista AVIF con su type: es la que el <picture> elegira", () => {
    EYE_PRELOADS.forEach((preload, i) => {
      expect(preload.type).toBe("image/avif");
      expect(preload.srcSet).toBe(eyeAvifSrcSet(EYE_LAYERS[i]));
    });
  });
});
