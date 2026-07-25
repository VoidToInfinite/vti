import { describe, it, expect } from "vitest";
import { createStarfield } from "./starfield";

describe("starfield", () => {
  it("crea un unico objeto dibujable (un draw call)", () => {
    const s = createStarfield(100);
    expect(s.points.type).toBe("Points");
    expect(s.points.children).toHaveLength(0);
    s.dispose();
  });

  it("genera 3 componentes por particula", () => {
    const s = createStarfield(100);
    const pos = s.points.geometry.getAttribute("position");
    expect(pos.count).toBe(100);
    expect(pos.itemSize).toBe(3);
    s.dispose();
  });

  it("update NO reconstruye la geometria", () => {
    const s = createStarfield(100);
    const before = s.points.geometry.getAttribute("position");
    s.update(0.5);
    expect(s.points.geometry.getAttribute("position")).toBe(before);
    s.dispose();
  });

  it("el progreso mueve la camara-objeto hacia dentro (eje z)", () => {
    const s = createStarfield(100);
    s.update(0);
    const z0 = s.points.position.z;
    s.update(1);
    expect(s.points.position.z).toBeGreaterThan(z0);
    s.dispose();
  });

  it("dispose libera geometria y material", () => {
    const s = createStarfield(10);
    const geo = s.points.geometry;
    s.dispose();
    expect(geo.getAttribute("position")).toBeUndefined();
  });
});
