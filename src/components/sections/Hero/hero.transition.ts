import { AURA_STAGGER } from "@/components/aura/aura.layers";

/**
 * Tiempos del cruce de fondos del hero (tarea C1, spec §5.3): cuánto tarda
 * el fundido de una capa, cuánto se retrasa cada escalón del stagger, y
 * cuánto se espera como máximo a que las imágenes entrantes decodifiquen
 * antes de arrancar la transición de todas formas.
 *
 * `AURA_STAGGER` (el ORDEN del escalonado: campo → mano izquierda → mano
 * derecha → energía → orbe) se importa de `aura.layers.ts` en vez de
 * declararse aquí: es la tabla de capas de Aura más el orbe, así que su
 * fuente natural es el módulo que ya describe esas capas (`aura.layers.ts`).
 * Este archivo solo añade los TIEMPOS —duración, paso, tope de espera—, que
 * `aura.parts.tsx` importa para calcular cada `transition-delay` (spec
 * §6.2.1) y que este mismo archivo usa para derivar `HERO_TRANSITION_MS`.
 *
 * ## Por qué estos números NO salen de `theme.data.motion.duration`
 *
 * La escala de movimiento de la casa (`src/theme/tokens/motion.ts`:
 * `instant/fast/base/slow/slower/ambient/spin/spinReduced`) está pensada
 * para TRANSICIONES DE INTERFAZ —hover, foco, aparición de un panel—, no
 * para una COREOGRAFÍA de cinco escalones con un orden y un retardo
 * relativo entre piezas. Forzar esta coreografía dentro de `motion.duration`
 * obligaría a añadir una clave (`heroStagger`, `heroStep`...) a un objeto
 * que un test de contrato cierra por completo (`system.test.ts`, con
 * `toEqual` + `toHaveLength`: ver la lección de `task/lessons.md` del
 * 2026-07-25 sobre añadir una clave a un objeto de tokens) por una
 * coreografía puntual que no es un rol del sistema de movimiento — igual
 * que `Sol.tsx:147` declara sus 1100 ms de morph como una excepción propia
 * en vez de forzarlos en la escala.
 *
 * `HERO_FADE_MS` sí es un múltiplo reconocible de la escala (2 × `base` =
 * 2 × 200 ms), así que no es un número arbitrario, pero vive aquí, como
 * constante propia de la coreografía, no como alias de `motion.duration`:
 * un alias se rompería en silencio el día que alguien cambiara `base` por
 * una razón de UI ajena a esta transición. El conjunto completo se apaga
 * bajo `prefers-reduced-motion` en `aura.parts.tsx` y en `HeroBackdrop.tsx`,
 * igual que el resto del lenguaje de movimiento del sitio.
 */

/** Duración del fundido de UNA capa del stagger. */
export const HERO_FADE_MS = 420;

/** Paso del stagger entre capas consecutivas. */
export const HERO_STEP_MS = 110;

/**
 * Tope de espera de `img.decode()` antes de arrancar la transición de todas
 * formas (spec §6.1): la condición de fluidez, no una espera indefinida. Ver
 * `HeroBackdrop.tsx` para la carrera completa (`Promise.race` contra este
 * temporizador) y por qué un `.catch()` solo no basta.
 */
export const HERO_DECODE_TIMEOUT_MS = 600;

/**
 * Duración total del cruce: el último escalón (índice
 * `AURA_STAGGER.length - 1`) arranca a `(length - 1) * HERO_STEP_MS` y tarda
 * `HERO_FADE_MS` en completarse. `HeroBackdrop` programa por este valor el
 * temporizador que desmonta el stack saliente (420 + 4×110 = 860 ms).
 */
export const HERO_TRANSITION_MS =
  HERO_FADE_MS + (AURA_STAGGER.length - 1) * HERO_STEP_MS;
