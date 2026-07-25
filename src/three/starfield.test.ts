import { describe, it, expect, vi } from "vitest";
import { PerspectiveCamera, type Material } from "three";
import {
  createStarfield,
  DEFAULT_STAR_COUNT,
  starCountForViewport,
} from "./starfield";
import { applyCameraProgress } from "./camera";

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

  it("el campo NO se traslada en z (evita duplicar el recorrido con la camara)", () => {
    // Antes, el campo tambien avanzaba `p * DEPTH` en z ademas de la propia
    // camara (camera.ts): el desplazamiento relativo se duplicaba y el
    // tunel (24 unidades) se agotaba antes de progress=1 (bug real). Ahora
    // solo la camara recorre el tunel; el campo permanece fijo.
    const s = createStarfield(100);
    s.update(0);
    const z0 = s.points.position.z;
    s.update(1);
    expect(s.points.position.z).toBe(z0);
    expect(s.points.position.z).toBe(0);
    s.dispose();
  });

  it("el progreso si sigue rotando el campo (deriva ambiental)", () => {
    const s = createStarfield(100);
    s.update(0);
    const rot0 = s.points.rotation.z;
    s.update(1);
    expect(s.points.rotation.z).toBeGreaterThan(rot0);
    s.dispose();
  });

  it("en progress=1 todavia quedan estrellas por delante de la camara (no se agota el tunel)", () => {
    // Regresion del hallazgo: campo (DEPTH=24) + camara (START_Z..END_Z)
    // movian juntos mas de 24 unidades relativas y el campo desaparecia
    // antes de llegar al final del scroll. Esta invariante falla si alguien
    // vuelve a mover el campo en z, o si END_Z se ajusta mas alla del
    // rango del campo.
    const s = createStarfield(DEFAULT_STAR_COUNT);
    s.update(1);
    const cam = new PerspectiveCamera(60, 1, 0.1, 100);
    applyCameraProgress(cam, 1);

    const pos = s.points.geometry.getAttribute("position");
    let delante = 0;
    for (let i = 0; i < pos.count; i += 1) {
      const worldZ = pos.getZ(i) + s.points.position.z;
      if (worldZ < cam.position.z) delante += 1;
    }

    expect(delante).toBeGreaterThan(0);
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

describe("starCountForViewport", () => {
  // Cortes tomados literalmente del brief (spec §14/§19). Son defaults
  // conservadores SIN MEDIR (ver docs/qa-3d-pendiente.md): el entorno de
  // desarrollo no pudo perfilar FPS en un dispositivo real, así que esto
  // fija el punto de partida, no una calibración validada.
  it("movil (<=640px) usa la densidad reducida de 500", () => {
    expect(starCountForViewport(640)).toBe(500);
  });

  it("justo por encima del corte movil (641px) ya no aplica la reduccion movil", () => {
    expect(starCountForViewport(641)).toBe(900);
  });

  it("tablet (<=1024px) usa la densidad intermedia de 900", () => {
    expect(starCountForViewport(1024)).toBe(900);
  });

  it("justo por encima del corte tablet (1025px) usa el default de escritorio", () => {
    expect(starCountForViewport(1025)).toBe(DEFAULT_STAR_COUNT);
  });

  it("escritorio ancho usa el default sin recortar", () => {
    expect(starCountForViewport(1920)).toBe(DEFAULT_STAR_COUNT);
  });

  it("viewport muy pequeño (por debajo del corte movil) tambien usa 500", () => {
    expect(starCountForViewport(320)).toBe(500);
  });
});
