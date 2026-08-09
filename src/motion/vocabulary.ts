/**
 * Vocabulario de coreografía del sitio (spec del vault + adenda Emil,
 * 2026-08-08): segundo nivel sobre `motion.duration`/`motion.easing`
 * (`src/theme/tokens/motion.ts`), que es un contrato CERRADO de
 * TRANSICIONES DE INTERFAZ —hover, foco, aparición de un panel— con
 * `system.test.ts` cerrándolo con `toEqual` + `toHaveLength` (mismo criterio
 * que documenta `timings.ts`, líneas 43-64, para el hero). Este módulo no
 * añade claves a ese objeto: agrupa, por ROL de coreografía —revelado al
 * hacer scroll, presentaciones de diapositivas, press/hover, movimiento
 * ambiental de las escenas 3D—, los valores que YA gobiernan esas piezas hoy
 * (verificados contra el código real, citados fichero:línea en cada grupo
 * más abajo) más dos curvas de easing NUEVAS que la spec/adenda prescribe
 * para reemplazar curvas dispares en Task 9 (ver el porqué al final de este
 * docblock).
 *
 * SIN `"use client"` a propósito, mismo motivo que `timings.ts`: son
 * literales puros sin ningún hook de React, así que cualquier módulo que
 * los importe (cliente o servidor) no hereda una directiva de cliente que no
 * necesita. `timings.ts` es infraestructura de LA PÁGINA (el hero); este
 * módulo es infraestructura de TODO el lenguaje de movimiento del sitio —
 * misma capa, alcance más amplio.
 *
 * Cero consumidores en esta entrega (Task 8 del plan
 * `2026-08-08-implementacion-auditoria-premium.md`): el riesgo visual de
 * crear este módulo es nulo por construcción. Los consumidores llegan en
 * tareas posteriores (Task 9 adopta `PRESS` en las ~10 familias pulsables
 * del sitio; Task 10 adopta `DECK.railDurationMs`/`PRESS.easing` en el
 * desplegable del navbar). `REVEAL.stepMs` y `DECK.exitDurationMs` no tienen
 * consumidor planeado todavía en este lote de tareas (8-14): se documentan
 * igual, verbatim de la spec, para que el vocabulario completo quede
 * disponible de una vez y no haya que reabrir este contrato cerrado cada vez
 * que una tarea futura necesite un valor más de la misma familia.
 *
 * ## Por qué `vocabulary.test.ts` es un contrato cerrado (regla 40 del
 * manual) y no un test de "algunas propiedades"
 *
 * Los cuatro grupos se aseveran con `toEqual` completo (no
 * `toMatchObject`/aserciones campo a campo): quien añada o cambie una clave
 * actualiza la fuente de verdad del test en el MISMO commit, igual que
 * `system.test.ts` hace con `motion.duration`/`motion.easing`. Un test que
 * solo comprobara un subconjunto de campos dejaría pasar en silencio un
 * cambio de valor en un campo no cubierto.
 */

/**
 * REVEAL — coreografía de aparición al entrar en el viewport: el patrón
 * fade + `translateY` que disparan `useReveal` (`src/hooks/useReveal.ts`) y
 * el atributo `data-revealed` en las cuatro secciones de la home.
 *
 * - `durationMs: 480` — `motion.duration.slower` (480ms) ya domina este
 *   patrón: `Features.tsx:948-951` (`ScDarkContent`), `Story.tsx:308-311`
 *   (`ScGrid`), `Contact.tsx` (dos bloques con el mismo patrón, líneas 204 y
 *   691 llevan el `translateY(16px)` hermano de esta duración) y
 *   `Journey.tsx:257-260` (`ScStepReveal`, que además documenta en su propio
 *   docblock, líneas 245-247, la unificación deliberada a esta duración).
 * - `shift: "16px"` — mismo patrón, mismos ficheros:línea que arriba
 *   (`Features.tsx:946`, `Story.tsx:306`, `Contact.tsx:204,691`): los
 *   cuatro escriben `transform: translateY(16px)` como estado no revelado.
 *   Excepción NO absorbida aquí (fuera de alcance de esta tarea, se deja
 *   constancia): `Journey.tsx:255` (`ScStepReveal`) usa `translateY(12px)`,
 *   no 16px — un desvío de un único consumidor de cinco, no documentado
 *   antes de esta entrega. `16px` es el valor verbatim de la spec y el que
 *   domina por mayoría (4 de 5); no se toca `Journey.tsx` en esta tarea
 *   porque este módulo todavía no tiene consumidores (ningún componente
 *   adopta `vocabulary.ts` hasta Task 9 en adelante).
 * - `easing: "cubic-bezier(0.23, 1, 0.32, 1)"` — curva NUEVA, verificada
 *   por grep (`0.23, 1, 0.32`) que NO existe hoy en ningún fichero de
 *   `src/`: el patrón de reveal citado arriba usa `motion.easing.decelerate`
 *   (`cubic-bezier(0, 0, 0.2, 1)`) en el código actual. Es un literal
 *   PROPIO de este vocabulario, no una clave nueva de `motion.easing` — ver
 *   el porqué al final de este fichero — que sustituirá a `decelerate` en
 *   ese patrón el día que una tarea futura adopte `REVEAL.easing` (fuera del
 *   alcance de Task 8, que no tiene consumidores).
 * - `stepMs: 60` — sin consumidor dominante hoy: verificado por grep (`60ms`,
 *   stagger/cascade en `src/components/sections/`) que ningún reveal
 *   escalonado actual usa este paso. El escalonado más cercano que existe,
 *   `Journey.tsx:74` (`STEP_STAGGER_MS = 90`), es un valor DISTINTO para un
 *   propósito distinto (paso entre pasos del `ScStepReveal` de Journey, no
 *   entre elementos de una lista genérica). `60` es el valor verbatim de la
 *   spec del vault + adenda Emil para un escalonado de reveal que todavía no
 *   tiene implementación en el repo.
 */
export const REVEAL = {
  durationMs: 480,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  shift: "16px",
  stepMs: 60,
} as const;

/**
 * DECK — coreografía de las presentaciones de diapositivas (Story/Journey,
 * `story.deck.tsx`/`journey.deck.tsx`): el paso de una diapositiva a la
 * siguiente, el rail de progreso decorativo, el scrub de rewind y la
 * profundidad de parallax de la escena que las acompaña.
 *
 * - `slideDurationMs: 320` — `motion.duration.slow` (320ms) ya domina la
 *   transición de opacidad/`transform` de cada diapositiva: `ScSlide`
 *   (`story.deck.tsx:278-281`) y `ScJourneySlide`
 *   (`journey.deck.tsx:237-240`), las dos con el mismo par
 *   `motion.duration.slow` + `motion.easing.decelerate`.
 * - `slideShift: "40px"` — `STORY_SLIDE_SHIFT`
 *   (`story.layers.ts:137`, `"40px"`) y `JOURNEY_SLIDE_SHIFT`
 *   (`journey.layers.ts:308`, `"40px"`): el desplazamiento vertical de
 *   entrada/salida de cada diapositiva, idéntico en las dos presentaciones.
 * - `railDurationMs: 200` — `motion.duration.base` (200ms) ya domina la
 *   transición de las marcas del rail decorativo: `ScRailMark`
 *   (`story.deck.tsx:336-341`) y `ScJourneyRailMark`
 *   (`journey.deck.tsx:293-297`), las dos con el mismo trío
 *   opacity/transform/background-color a `motion.duration.base` +
 *   `motion.easing.standard`.
 * - `scrubMs: 320` — `STORY_SCRUB_MS` (`story.layers.ts:178`, atado por test
 *   a `motion.duration.slow` en `story.layers.test.ts:34`), consumido por el
 *   `@keyframes story-deck-scrub` de `story.deck.tsx:238`: el
 *   micro-desplazamiento en X que hace que retroceder (`data-dir="rewind"`)
 *   se lea como cinta rebobinando. Solo Story lo implementa hoy (verificado
 *   por grep: `journey.deck.tsx` no tiene un scrub equivalente); coincide
 *   numéricamente con `slideDurationMs` pero son dos roles distintos (avance
 *   entre diapositivas vs. detalle de sentido inverso), de ahí que el grupo
 *   los declare como dos campos separados en vez de reusar uno.
 * - `sceneDepthShift: "6dvh"` — `STORY_SCENE_DEPTH_SHIFT`
 *   (`story.layers.ts:169`) y `JOURNEY_SCENE_DEPTH_SHIFT`
 *   (`journey.layers.ts:330`, verificado también por
 *   `journey.layers.test.ts:70`): el recorrido en `transform` del
 *   envoltorio de la escena 3D mientras el stage está pegado, idéntico en
 *   las dos presentaciones.
 * - `exitDurationMs: 200` — sin consumidor con este rol específico
 *   verificado hoy (grep de "exit"/"salida" en `story.deck.tsx`/
 *   `journey.deck.tsx` no encuentra una transición de salida propia,
 *   distinta del rail). El valor numérico SÍ coincide con
 *   `motion.duration.base` (misma familia que `railDurationMs`, arriba) y es
 *   el verbatim de la spec del vault + adenda Emil para la salida de un velo
 *   o capa de la presentación — un rol que ninguna tarea de este lote (8-14)
 *   llega a implementar todavía.
 */
export const DECK = {
  slideDurationMs: 320,
  slideShift: "40px",
  railDurationMs: 200,
  scrubMs: 320,
  sceneDepthShift: "6dvh",
  exitDurationMs: 200,
} as const;

/**
 * PRESS — las dos primitivas de movimiento de un control pulsable: hover-lift
 * y press. `Button.tsx:160-161` ya documenta esta pareja como "únicas dos
 * primitivas de movimiento del sistema": este grupo es su vocabulario
 * nombrado, para que Task 9 deje de repetir `theme.data.motion.duration.fast`
 * + una curva de easing distinta en cada una de las ~10 familias pulsables
 * del sitio.
 *
 * - `durationMs: 100` — `motion.duration.fast` (100ms) ya domina el press de
 *   `Button.tsx`: `transition: transform ${motion.duration.fast}
 *   ${motion.easing.standard}` (`Button.tsx:78-81`).
 * - `hoverLift: "-2px"` — `Button.tsx:166`,
 *   `transform: translateY(-2px)` en `:hover`.
 * - `activeScale: 0.98` — `Button.tsx:169`, `transform: scale(0.98)` en
 *   `:active`.
 * - `hoverGuard: "(hover: hover) and (pointer: fine)"` — cadena EXACTA de
 *   `usePointer.ts:191` (`window.matchMedia("(hover: hover) and (pointer:
 *   fine)")`), el hook singleton que ya detecta puntero fino en el resto del
 *   sitio. Task 9 la reutiliza para guardar los hovers que MUEVEN (no los
 *   que solo cambian de color) tras un `@media` interpolado, en vez de que
 *   cada componente escriba la cadena a mano.
 * - `easing: "cubic-bezier(0.23, 1, 0.32, 1)"` — misma curva NUEVA que
 *   `REVEAL.easing` (ver el porqué al final de este fichero), verificada por
 *   grep que no existe hoy en `src/`. `Button.tsx` usa hoy
 *   `motion.easing.standard` (`cubic-bezier(0.4, 0, 0.2, 1)`) para su
 *   transform de press — Task 9, punto 4, sustituye exactamente esa curva
 *   por `PRESS.easing` (`background-color` se queda con `standard`); Task 8
 *   no toca `Button.tsx`.
 */
export const PRESS = {
  durationMs: 100,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  hoverLift: "-2px",
  activeScale: 0.98,
  hoverGuard: "(hover: hover) and (pointer: fine)",
} as const;

/**
 * AMBIENT — animaciones infinitas de las escenas decorativas (mascotas del
 * ojo, gradientes de marca): movimiento que respira solo mientras la escena
 * está en pantalla, nunca ligado a una interacción del usuario.
 *
 * - `breathMs: 5400` — `5.4s` domina tres animaciones de "respiración"/glow
 *   del mismo mascota: `solBreathe` (`Sol.tsx:94`), `haloGlow`
 *   (`Sol.tsx:213`) y `coreGlow` (`Sol.tsx:339`), las tres `ease-in-out
 *   infinite`.
 * - `pulseMs: 6500` — `6.5s`, `heartBeat`
 *   (`storyCosmicBeing.parts.tsx:89`, `ease-in-out infinite`): el pulso de
 *   la escena "Cosmic Being" de Story.
 * - `floatMs: 9000` — `9000ms`, `gradientShift` domina el degradado animado
 *   de marca en tres consumidores: `BrandName.tsx:102`, `Hero.tsx:480` y
 *   `Contact.tsx:880` (los tres `linear infinite alternate`). No hay una
 *   animación literalmente nombrada "float" con este valor; se agrupa aquí
 *   por ser el único movimiento ambiental de deriva lenta y continua
 *   (`background-position` oscilando) que no encaja en `breathe`/`pulse`
 *   (pulsos de escala/sombra) ni en `orbit`/`orbitSlow` (rotaciones).
 * - `orbitMs: 20000` — `20s`, `coronaMorph` (`Sol.tsx:268`, `ease-in-out
 *   infinite`): morfa la forma de la corona Y la rota 360° en el mismo
 *   ciclo — el consumidor más cercano a una órbita completa a este ritmo.
 * - `orbitSlowMs: 40000` — `40s`, `sweepSpin` (`Sol.tsx:362`, `linear
 *   infinite`): rotación completa de 360° sin morfado, el doble de lenta que
 *   `orbitMs` — la órbita "lenta" del mismo mascota.
 */
export const AMBIENT = {
  breathMs: 5400,
  pulseMs: 6500,
  floatMs: 9000,
  orbitMs: 20000,
  orbitSlowMs: 40000,
} as const;

/**
 * ## Por qué `REVEAL.easing`/`PRESS.easing` son literales PROPIOS y NO
 * claves nuevas de `motion.easing`
 *
 * `motion.easing` (`src/theme/tokens/motion.ts`) es un contrato CERRADO:
 * `system.test.ts` lo cierra con `toEqual` (líneas 22-31) +
 * `toHaveLength(5)` (línea 48) — 91 consumos verificados de
 * `theme.data.motion.easing.*` en `src/` (grep, sin contar tests) repartidos
 * en 26 ficheros, todos transiciones de INTERFAZ (hover, foco, aparición de
 * un panel). Añadir una sexta clave (`emphasized2`, `pressCurve`...) a ese
 * objeto para una curva que pertenece a la coreografía de un ROL concreto
 * (revelado al hacer scroll, press) rompería la misma frontera que
 * `timings.ts` ya documenta para `motion.duration` (líneas 43-64 de ese
 * fichero): forzaría una coreografía puntual dentro de un objeto que un test
 * de contrato cierra por completo, por una necesidad que no es un rol
 * general del sistema de movimiento sino de un vocabulario de más alto
 * nivel. Misma frontera, mismo criterio, un nivel más arriba: `motion.*` son
 * los átomos (duración/curva sueltos); `vocabulary.ts` son las moléculas
 * (qué átomos usa cada ROL de coreografía, agrupados con nombre).
 *
 * `REVEAL.easing` y `PRESS.easing` comparten el mismo literal
 * (`cubic-bezier(0.23, 1, 0.32, 1)`) porque la spec del vault + adenda Emil
 * prescribe la MISMA curva de salida para las dos coreografías (entrada al
 * hacer scroll y press de un control) — no es una coincidencia que haya que
 * deduplicar en una constante compartida: son dos campos de dos grupos
 * distintos que hoy resultan iguales, igual que `DECK.slideDurationMs` y
 * `DECK.scrubMs` comparten valor (320) sin ser el mismo campo (ver `DECK`,
 * arriba). Si el día de mañana una de las dos coreografías necesita una
 * curva distinta, cambia SU campo sin arrastrar al otro — un alias
 * compartido (una sola constante importada por los dos grupos) se rompería
 * en silencio esa vez, mismo razonamiento que `timings.ts` aplica a
 * `HERO_FADE_MS` para no aliasearlo a `motion.duration.base` pese a ser su
 * múltiplo exacto.
 */
