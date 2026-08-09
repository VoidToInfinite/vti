import { AURA_STAGGER } from "@/components/scenes/aura/aura.layers";
import { EYE_STAGGER } from "@/components/scenes/eye/eye.layers";

/**
 * Tiempos NÚCLEO de la coreografía de carga y cruce de fondos del hero
 * (revisión 2026-07-27, spec §5): cuánto tarda el fundido de una capa,
 * cuánto se retrasa cada escalón del stagger, cuánto se espera como máximo a
 * que las imágenes entrantes decodifiquen, cuántos escalones tiene el
 * stagger más largo y cuánto dura un stack completo escalonándose.
 *
 * SIN `"use client"` a propósito. Antes de esta entrega, `src/motion/
 * stage.ts` — la máquina de fases de LA PÁGINA completa (navbar + copia del
 * hero), no solo del hero — importaba estas constantes directamente de
 * `hero.transition.ts`, una sección HOJA, y heredaba su directiva de cliente
 * por transitividad pese a no usar ningún hook: una inversión de capas
 * (`src/motion/` es infraestructura de la página, no debería depender de una
 * sección concreta para sus datos base). Este módulo es la fuente de verdad
 * de esos timings; `hero.transition.ts` los REEXPORTA (junto con
 * `HERO_FADE_MS`/`HERO_STEP_MS`/`HERO_STAGGER_STEPS`, su base de cálculo)
 * para que sus consumidores existentes — `HeroBackdrop.tsx`, `Hero.tsx`,
 * `aura.parts.tsx`, `eye.parts.tsx` y sus tests — no tengan que cambiar el
 * origen de su import.
 *
 * `hero.transition.ts` sigue siendo dueño de los tiempos propios del cruce
 * de la COPIA del hero (`HERO_COPY_OUT_MS`, `HERO_COPY_IN_MS`,
 * `HERO_BACKDROP_HOLD_MS`, `HERO_HANDOFF_MS`, `HERO_COPY_RETURN_MS`) y del
 * hook `useHeroCopySwap` que los consume: ese conjunto sí necesita
 * `"use client"` (usa `useState`/`useEffect`/`useRef`), así que no hay
 * motivo para moverlo aquí — solo lo que un módulo SIN estado de React
 * necesita vive en este archivo.
 *
 * Ahora hay DOS tablas de escalonado, una por composición —`EYE_STAGGER`
 * (oscuro, `eye.layers.ts`) y `AURA_STAGGER` (claro, `aura.layers.ts`)— y
 * ninguna de las dos se declara aquí: cada una es un dato de SU composición
 * (qué capa va antes que cuál), así que su fuente natural es el módulo que
 * ya describe esas capas, no este. Este archivo solo añade los TIEMPOS
 * —duración, paso, tope de espera— que se aplican por igual a cualquier
 * orden, y deriva `HERO_STACK_MS` de la tabla más LARGA de las dos (6
 * escalones en oscuro contra 5 en claro): el presupuesto de la coreografía
 * tiene que caber la composición que más escalones necesita, o el tema
 * oscuro se quedaría sin tiempo para su último paso.
 *
 * ## Por qué estos números NO salen de `theme.data.motion.duration`
 *
 * La escala de movimiento de la casa (`src/theme/tokens/motion.ts`:
 * `instant/fast/base/slow/slower/spin/spinReduced`) está pensada
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
 * Nº de escalones del stagger más largo de las dos composiciones: 6 en
 * oscuro (`EYE_STAGGER`) contra 5 en claro (`AURA_STAGGER`). Se calcula con
 * `Math.max` sobre las dos longitudes, en vez de escribir `6` a mano, porque
 * el número no es un dato propio de este archivo — es un derivado de dos
 * tablas que viven en otros dos módulos, y un literal se desincroniza en
 * silencio el día que cualquiera de las dos gane o pierda un escalón.
 *
 * Resuelve a 6 (`EYE_STAGGER.length`).
 */
export const HERO_STAGGER_STEPS = Math.max(
  EYE_STAGGER.length,
  AURA_STAGGER.length,
);

/**
 * Duración total de UN stack escalonándose (entrando o saliendo): el último
 * escalón (índice `HERO_STAGGER_STEPS - 1`) arranca a `(HERO_STAGGER_STEPS -
 * 1) * HERO_STEP_MS` y tarda `HERO_FADE_MS` en completarse. Se deriva del
 * stagger MÁS LARGO (`HERO_STAGGER_STEPS`), no del de la composición activa
 * en cada caso, porque este valor programa temporizadores compartidos por
 * las dos composiciones (`HeroBackdrop` desmonta el stack saliente con él,
 * sea cual sea el tema): si se derivara del stagger corto, el escalonado de
 * 6 pasos del ojo se quedaría sin los últimos 110 ms de margen.
 *
 * Resuelve a 970 (420 + 5×110), antes 860 (420 + 4×110) cuando solo existía
 * `AURA_STAGGER` de 5 pasos.
 */
export const HERO_STACK_MS =
  HERO_FADE_MS + (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS;

/**
 * Instante, medido desde el ARRANQUE de un stack (carga o entrada de un
 * cruce), en el que su ÚLTIMO escalón va por la mitad de su propio fundido:
 * `(HERO_STAGGER_STEPS - 1) * HERO_STEP_MS` para llegar al arranque de ese
 * escalón, más `HERO_FADE_MS / 2` para llegar a su punto medio. El navbar y
 * la copia usan este offset —no el final del stack— para empezar a entrar:
 * así terminan de asentarse DESPUÉS de la última capa (spec §1: «al final el
 * navbar y los textos»), sin dejar medio segundo de interfaz en blanco
 * esperando a que el fondo termine del todo. Resuelve a 760 (550 + 210).
 */
export const HERO_CHROME_OFFSET_MS =
  (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS + HERO_FADE_MS / 2;
