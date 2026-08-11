import { describe, it, expect } from "vitest";
import {
  JOURNEY_PORTAL_LAYERS,
  JOURNEY_PORTAL_POINTER_AMP,
  JOURNEY_PORTAL_SCROLL_AMP,
  JOURNEY_PORTAL_VOID,
} from "./journeyCosmicPortal.layers";

describe("journeyCosmicPortal.layers", () => {
  it("tiene las 6 capas, de fondo a frente, con la figura al final", () => {
    expect(JOURNEY_PORTAL_LAYERS).toHaveLength(6);
    const depths = JOURNEY_PORTAL_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(JOURNEY_PORTAL_LAYERS.at(0)?.part).toBe("background");
    expect(JOURNEY_PORTAL_LAYERS.at(-1)?.part).toBe("figure");
  });

  it("cada capa publica su pista nativa, su pista reducida y su pista intermedia bajo /journey/cosmic-portal/", () => {
    for (const layer of JOURNEY_PORTAL_LAYERS) {
      expect(layer.src).toMatch(/^\/journey\/cosmic-portal\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(
        /^\/journey\/cosmic-portal\/.+-1024\.webp$/,
      );
      expect(layer.srcMedium).toMatch(
        /^\/journey\/cosmic-portal\/.+-1600\.webp$/,
      );
    }
  });

  it("la figura ancla la escala de profundidad en 1.0, como en la demo del paquete", () => {
    // El paquete calcula su parallax con `depth / DMAX`, donde DMAX es la
    // profundidad de la figura (0.24 en la v6, 0.22 en la v1): normalizado,
    // el plano mas cercano vale 1 y las amplitudes de abajo se leen
    // directamente en px. Que el ancla sea 1 es lo que hace que el recorrido
    // maximo no dependa de la version del paquete.
    expect(JOURNEY_PORTAL_LAYERS.at(-1)?.depth).toBe(1);
  });

  it("conserva el recorrido maximo de la escena anterior en vez de la amplitud del paquete", () => {
    // "Astral Pathway" daba 22 x 0.46 = 10.12 px de puntero en x, 13 x 0.46 =
    // 5.98 en y, y 70 x 0.46 = 32.2 de scroll. Con la profundidad maxima ya
    // normalizada a 1, estas constantes SON el recorrido maximo. El test ata
    // que actualizar el fondo no retunee el movimiento de la seccion: si
    // alguien quiere los 46 px que sugiere el paquete, que sea una decision
    // explicita y no un efecto colateral.
    expect(JOURNEY_PORTAL_POINTER_AMP.x).toBeCloseTo(22 * 0.46, 0);
    expect(JOURNEY_PORTAL_POINTER_AMP.y).toBeCloseTo(13 * 0.46, 0);
    expect(JOURNEY_PORTAL_SCROLL_AMP).toBeCloseTo(70 * 0.46, 0);
  });

  it("JOURNEY_PORTAL_VOID es el negro-violeta verbatim del paquete", () => {
    expect(JOURNEY_PORTAL_VOID).toBe("#0b0620");
  });
});
