import { describe, it, expect, vi } from "vitest";
import type { Material } from "three";
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
    // El contrato de Starfield siempre crea un unico PointsMaterial (nunca un
    // array); el cast solo estrecha el tipo union de THREE.Points.material.
    const material = s.points.material as Material;
    const geoDisposeSpy = vi.spyOn(s.points.geometry, "dispose");
    const materialDisposeSpy = vi.spyOn(material, "dispose");

    s.dispose();

    expect(geoDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it("no borra el atributo position antes de que el renderer pueda liberarlo (regresion de orden)", () => {
    // El renderer real escucha "dispose" en la geometria para ejecutar
    // gl.deleteBuffer sobre cada atributo (WebGLGeometries.onGeometryDispose).
    // Si el atributo ya no esta cuando ese listener corre, el buffer de GPU
    // queda huerfano. Este test reproduce ese listener y falla si alguien
    // vuelve a llamar deleteAttribute("position") antes de dispose().
    const s = createStarfield(10);
    const geo = s.points.geometry;
    let positionPresenteAlDisparar: boolean | undefined;

    geo.addEventListener("dispose", () => {
      positionPresenteAlDisparar = geo.getAttribute("position") !== undefined;
    });

    s.dispose();

    expect(positionPresenteAlDisparar).toBe(true);
  });
});
