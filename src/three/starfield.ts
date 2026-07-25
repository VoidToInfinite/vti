import * as THREE from "three";

export interface Starfield {
  /** El único objeto que `Scene` añade a su grafo (spec §13: un draw call). */
  points: THREE.Points;
  /** Se llama una vez por frame con el progreso de scroll 0→1. */
  update(progress: number): void;
  /** Libera geometría y material. `Scene` la invoca al desmontar. */
  dispose(): void;
}

/**
 * Stub mínimo y funcional: la task 3D·T8 ("Starfield en un draw call")
 * sustituye el contenido de esta función por el campo de partículas real
 * (miles de estrellas en un único `BufferGeometry`/`PointsMaterial`,
 * posicionadas y animadas según `progress`), manteniendo el mismo contrato
 * (`{ points, update, dispose }`) que `Scene.tsx` ya consume. Sin esto,
 * `Scene.tsx` no compila (TS strict, sin módulo que importar) ni tiene nada
 * que añadir a la escena — sí es autosuficiente para ejercitar el ciclo de
 * vida completo (montaje, resize, pausa por intersección/visibilidad,
 * limpieza) que es el objeto real de la task 7.
 */
export function createStarfield(): Starfield {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(0), 3),
  );
  const material = new THREE.PointsMaterial({ size: 0.02 });
  const points = new THREE.Points(geometry, material);

  return {
    points,
    update(): void {
      // Sin contenido todavía: T8 anima aquí el campo de partículas leyendo
      // `progress` para desplazar la cámara/puntos a través de él.
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
