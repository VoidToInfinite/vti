import type * as THREE from "three";

export const START_Z = 6;
/**
 * El campo de estrellas (`starfield.ts`) es estático: ocupa z ∈ [0, −24]
 * (su `DEPTH`) en coordenadas locales y ya no se traslada. Toda la
 * sensación de "volar hacia dentro" la produce solo esta cámara. `END_Z`
 * se elige para recorrer el túnel de verdad sin llegar a agotarlo: en
 * `progress = 1` (el punto de mayor desplazamiento) deben seguir quedando
 * estrellas por delante — verificado en starfield.test.ts.
 */
export const END_Z = -18;

/** Ease-out sobre el progreso: la entrada al vacío acelera y luego se asienta,
 *  en vez de avanzar de forma lineal y mecánica (spec §8, `camera settle`). */
function ease(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Mapea el progreso de scroll (0→1) a la posición de la cámara.
 *
 * `scrubbed`: sin duración propia. El usuario controla el tiempo; esta función
 * es pura y sin estado, así que la escena solo avanza si el scroll avanza.
 */
export function applyCameraProgress(
  camera: THREE.PerspectiveCamera,
  progress: number,
): void {
  const p = ease(Math.max(0, Math.min(1, progress)));
  camera.position.z = START_Z + (END_Z - START_Z) * p;
}
