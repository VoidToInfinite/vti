import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyCameraProgress, START_Z, END_Z } from "./camera";

const cam = (): THREE.PerspectiveCamera =>
  new THREE.PerspectiveCamera(60, 1, 0.1, 100);

describe("camera", () => {
  it("en progreso 0 esta en la posicion de partida", () => {
    const c = cam();
    applyCameraProgress(c, 0);
    expect(c.position.z).toBeCloseTo(START_Z, 5);
  });

  it("en progreso 1 ha llegado al final del descenso", () => {
    const c = cam();
    applyCameraProgress(c, 1);
    expect(c.position.z).toBeCloseTo(END_Z, 5);
  });

  it("avanza hacia dentro de forma monotona", () => {
    const c = cam();
    applyCameraProgress(c, 0.25);
    const a = c.position.z;
    applyCameraProgress(c, 0.75);
    expect(c.position.z).toBeLessThan(a);
  });

  it("recorta valores fuera de rango en vez de extrapolar", () => {
    const c = cam();
    applyCameraProgress(c, 5);
    expect(c.position.z).toBeCloseTo(END_Z, 5);
    applyCameraProgress(c, -3);
    expect(c.position.z).toBeCloseTo(START_Z, 5);
  });

  it("a mitad de progreso ya recorrio mas de la mitad del trayecto (curva ease-out, no lineal)", () => {
    // Si alguien sustituyera el ease por una interpolacion lineal (t => t),
    // en p=0.5 la fraccion recorrida seria exactamente 0.5 y este test
    // fallaria. Con ease-out 1-(1-t)^2, ease(0.5) = 0.75.
    const c = cam();
    applyCameraProgress(c, 0.5);
    const total = END_Z - START_Z;
    const recorrido = c.position.z - START_Z;
    const fraccion = recorrido / total;
    expect(fraccion).toBeGreaterThan(0.5);
    expect(fraccion).toBeCloseTo(0.75, 5);
  });
});
