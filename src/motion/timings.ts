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
 * ### De dónde sale el 420 (corrección de honestidad, crítica externa #8,
 * 2026-08-17)
 *
 * Hasta esta revisión, este párrafo afirmaba que `HERO_FADE_MS` «sí es un
 * múltiplo reconocible de la escala (2 × `base` = 2 × 200 ms)». **Era falso
 * por aritmética elemental: 2 × 200 son 400, no 420.** La afirmación nació
 * en la spec `2026-07-26-hero-aura-tema-claro-design.md` §5.3 —donde se
 * escribe sin operación delante, «un múltiplo reconocible (2 × `base`)»— y
 * se copió al código en el mismo commit que creó el fichero original
 * (`760146e`, `hero.transition.ts`), del que este módulo la heredó verbatim
 * al extraerse.
 *
 * Buscada la derivación real antes de reescribir esto: `git log -S "420"`
 * sobre este fichero y sobre `hero.transition.ts` da tres commits y ninguno
 * la explica (el que introduce el valor es el mismo que introduce la
 * afirmación falsa); en `docs/` el número solo aparece ya escrito —una fila
 * de tabla y un bloque de código que reproducen la constante— nunca
 * calculado. **No existe derivación aritmética: 420 ms es un valor calibrado
 * a ojo sobre el render.** Lo que la documentación sí trata como cierto es
 * su condición de perilla de calibración: `docs/qa-3d-pendiente.md` dice que
 * si la secuencia «se lee plana» se suba `HERO_STEP_MS` ANTES que alargar
 * `HERO_FADE_MS`, y que si el cambio de tema se percibe lento se bajen los
 * dos — instrucciones de ajuste por percepción, no de recálculo.
 *
 * Lo que sigue siendo cierto del párrafo original, y es el motivo real de
 * que el valor viva aquí y no como alias de `motion.duration`: un alias se
 * rompería en silencio el día que alguien cambiara `base` por una razón de
 * UI ajena a esta transición. El conjunto completo se apaga bajo
 * `prefers-reduced-motion` en `aura.parts.tsx` y en `HeroBackdrop.tsx`,
 * igual que el resto del lenguaje de movimiento del sitio.
 *
 * PENDIENTE fuera de este fichero: la misma afirmación falsa sobrevive en
 * `DESIGN.md` (tabla de tiempos del hero, celda de `HERO_FADE_MS`: «2 ×
 * `motion.duration.base`») y en la spec citada arriba. Las dos quedan
 * declaradas aquí en vez de corregidas en silencio desde una tarea que no
 * es dueña de esos documentos.
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
 * Paso del escalonado INTERNO de la copia del hero en la CARGA (spec §5.3,
 * §7.4): la distancia entre el arranque de un hijo del bloque de texto y el
 * del siguiente. 80 ms, no 120.
 *
 * La calibración original (spec §5) se hizo con CINCO hijos —había un
 * kicker, retirado el 2026-08-08— y comparaba ASENTAMIENTOS: con 120 ms el
 * CTA terminaba de entrar a 680 ms desde el arranque del bloque y con 80 ms a
 * 520 ms, y a 80 ms la secuencia se sigue percibiendo como secuencia. Con los
 * CUATRO hijos de hoy las mismas cuentas dan 560 ms y 440 ms: el CTA es el
 * hijo 4, arranca a 3 × 80 = 240 ms y suma los 200 ms de
 * `motion.duration.base`. **440 ms es la cifra vigente de asentamiento de la
 * copia**; cualquier 520 que aparezca en un texto anterior al 2026-08-11 es
 * la del layout de cinco hijos. El PASO no cambia con la revisión de esa
 * fecha, que cambió el MOTOR de esta coreografía de JS a CSS estático — ver
 * el docblock del bloque de intro en `Hero.tsx`.
 *
 * Vive aquí, y no como literal repetido cuatro veces en `Hero.tsx`, para que
 * el candado de test pueda aseverar contra la CONSTANTE importada y no contra
 * una tabla de strings escrita a mano (regla 38 de `RULES.md`). Se reexporta
 * desde `hero.transition.ts` junto al resto, igual que las demás.
 */
export const HERO_COPY_STEP_MS = 80;

/**
 * Instante, medido desde el ARRANQUE de un stack (carga o entrada de un
 * cruce), en el que su ÚLTIMO escalón va por la mitad de su propio fundido:
 * `(HERO_STAGGER_STEPS - 1) * HERO_STEP_MS` para llegar al arranque de ese
 * escalón, más `HERO_FADE_MS / 2` para llegar a su punto medio. Nació para
 * que el navbar y la copia del hero empezaran a entrar ahí —no al final del
 * stack— y terminaran de asentarse DESPUÉS de la última capa (spec §1: «al
 * final el navbar y los textos»), sin dejar medio segundo de interfaz en
 * blanco esperando a que el fondo termine del todo. Resuelve a 760 (550 +
 * 210).
 *
 * QUIÉN LO USA HOY (revisión 2026-08-11, Task 10 — enmienda §5.5 de la spec
 * de coreografía):
 *
 * - **El navbar, en la CARGA:** lo consume verbatim como `animation-delay`
 *   de su `@keyframes` estática (`ScHeader`, `Navbar.tsx`).
 * - **La copia del hero, en el CRUCE DE TEMA:** vía `HERO_COPY_RETURN_MS`
 *   (`hero.transition.ts`), que sigue intacto.
 * - **La copia del hero, en la CARGA: YA NO.** Su entrada pasó a CSS
 *   estático anclado al primer pintado, y este offset mide un instante
 *   relativo a un evento —el arranque del stack— que un reloj CSS no puede
 *   observar; conservarlo habría costado 760 ms de hero sin texto en cada
 *   carga, con el LCP medido colgando de ellos. El navbar sí lo conserva
 *   porque no es candidato LCP en ninguna medición.
 */
export const HERO_CHROME_OFFSET_MS =
  (HERO_STAGGER_STEPS - 1) * HERO_STEP_MS + HERO_FADE_MS / 2;
