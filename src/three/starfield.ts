import * as THREE from "three";

/**
 * Default conservador y provisional. La task 3D·T13 lo calibra midiendo en
 * un móvil de gama media; no se ajusta a ojo ni con lógica por dispositivo
 * aquí — esa es responsabilidad de esa task, no de esta.
 */
export const DEFAULT_STAR_COUNT = 1200;

/** Profundidad del campo. El descenso (T12) recorre este rango en z. */
const DEPTH = 24;

export interface Starfield {
  /** El único objeto que `Scene` añade a su grafo (spec §13: un draw call). */
  points: THREE.Points;
  /** `progress` 0→1 ligado al scroll (scrubbed). Solo mueve; no reconstruye. */
  update(progress: number): void;
  /** Libera geometría y material. `Scene` la invoca al desmontar. */
  dispose(): void;
}

/**
 * Campo de estrellas real: miles de partículas en un único `BufferGeometry`
 * / `PointsMaterial` — un solo `THREE.Points`, un solo draw call (spec §13).
 * `update()` nunca reconstruye el buffer de posiciones; solo desplaza y rota
 * el objeto completo, que es lo único que cambia frame a frame.
 */
export function createStarfield(count = DEFAULT_STAR_COUNT): Starfield {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // Distribución en un cilindro alrededor del eje de vuelo: da sensación de
    // atravesar el campo, no de mirarlo desde fuera.
    const angle = (i / count) * Math.PI * 2 * 7.3;
    const radius = 1.5 + (((i * 37) % 100) / 100) * 6;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = -((i / count) * DEPTH);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);

  function update(progress: number): void {
    // Pública: se recorta de nuevo aunque `useScrollProgress` ya llegue
    // recortado — no debe extrapolar si recibe basura.
    const p = Math.max(0, Math.min(1, progress));
    // Avanzar el campo hacia el espectador = volar hacia dentro del vacío.
    points.position.z = p * DEPTH;
    // Deriva ambiente lenta: el vacío nunca se lee como muerto (spec §6).
    points.rotation.z = p * 0.35;
  }

  function dispose(): void {
    // `dispose()` no libera nada por sí mismo: dispatchea el evento "dispose"
    // que `WebGLGeometries`/`WebGLRenderer` escuchan de forma síncrona para
    // ejecutar `gl.deleteBuffer(...)` sobre cada atributo. NO tocar
    // `.attributes` a mano (p.ej. `deleteAttribute`) antes de esta llamada:
    // el listener recorre `geometry.attributes` para decidir qué liberar, y
    // si ya no está el atributo lo salta, dejando el buffer de GPU huérfano.
    geometry.dispose();
    material.dispose();
  }

  return { points, update, dispose };
}
