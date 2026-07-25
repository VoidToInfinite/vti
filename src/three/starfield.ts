import * as THREE from "three";

/**
 * Default conservador, pensado para escritorio/gama alta. **Sin medir**: el
 * spec (§19) pedía calibrar este valor perfilando FPS reales en escritorio y
 * en un móvil de gama media, pero el entorno en el que se implementó esta
 * task no puede componer frames de navegador (sin render real, sin captura
 * de rendimiento posible). Es un punto de partida razonable, no una cifra
 * calibrada — ver `docs/qa-3d-pendiente.md` para el protocolo de medición
 * pendiente y qué hacer si el móvil real baja de 50 FPS.
 */
export const DEFAULT_STAR_COUNT = 1200;

/**
 * Profundidad del campo, en coordenadas locales [0, −DEPTH]. El campo es
 * estático (no se traslada, ver `update()`); es la cámara del descenso
 * (T12, `camera.ts`) la que recorre este rango con su propio `START_Z`/
 * `END_Z`. Si se cambia este valor, `camera.ts` debe revisar `END_Z` para
 * seguir dejando estrellas por delante en `progress = 1`.
 */
const DEPTH = 24;

/**
 * Densidad de partículas según el ancho de viewport. **Cortes SIN MEDIR**
 * (spec §14/§19): son defaults conservadores por rango de ancho de pantalla
 * — un proxy barato de "dispositivo modesto", no una calibración basada en
 * FPS reales de un dispositivo físico. El entorno de desarrollo de esta
 * task no puede perfilar rendimiento de navegador; queda documentado en
 * `docs/qa-3d-pendiente.md` el protocolo que debe correr una persona con
 * acceso a hardware real, y qué hacer si el móvil baja de 50 FPS (reducir
 * estos valores).
 */
export function starCountForViewport(width: number): number {
  if (width <= 640) return 500;
  if (width <= 1024) return 900;
  return DEFAULT_STAR_COUNT;
}

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
    // El campo NO se traslada en z. Quien recorre el túnel es la cámara
    // (camera.ts: START_Z → END_Z). Si el campo también avanzara aquí, el
    // desplazamiento relativo se duplicaría (cámara + campo) y superaría
    // las `DEPTH` (24) unidades de profundidad reales del túnel — las
    // estrellas se agotarían antes de `progress = 1` y el efecto
    // desaparecería justo en el tramo climático del beat (bug real,
    // corregido: ver el test de invariante "quedan estrellas... en p=1"
    // más abajo). El campo permanece fijo en el origen; solo rota.
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
