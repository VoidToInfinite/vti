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
});
