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
 * Cero consumidores en la entrega que lo creó (Task 8 del plan
 * `2026-08-08-implementacion-auditoria-premium.md`): el riesgo visual de
 * crear este módulo era nulo por construcción. Desde entonces los grupos han
 * ido ganando consumidores reales tarea a tarea: Task 9 adoptó `PRESS` en las
 * ~10 familias pulsables del sitio; Task 10 adoptó
 * `DECK.railDurationMs`/`PRESS.easing` en el desplegable del navbar; Task 4
 * (plan `2026-08-10-implementacion-plan-premium-f1-f5.md`) adoptó
 * `DECK.exitDurationMs` en la pista de scroll del deck
 * (`ScScrollHint`/`ScJourneyScrollHint`, `story.deck.tsx`/`journey.deck.tsx`).
 *
 * **Task 19** (mismo plan, "motion core") cerró el defecto de fondo que
 * detectó el gate F2 (2026-08-11, detector B): `REVEAL` y `AMBIENT` seguían a
 * CERO consumidores de producción pese a llevar tareas enteras documentadas
 * -- un vocabulario sin consumidores es un comentario, no un contrato. Esa
 * tarea migró `REVEAL` a consumidor real en `Story.tsx`/`Features.tsx` (ver
 * el docblock de `REVEAL`, abajo, para el detalle fichero por fichero) y
 * migró CUATRO de los cinco campos de `AMBIENT` a consumidor real en
 * `Sol.tsx`/`storyCosmicBeing.parts.tsx`/`BrandName.tsx`/`Hero.tsx`/
 * `Contact.tsx` (ver el docblock de `AMBIENT`, abajo, para qué se migró, qué
 * se dejó fuera a propósito y por qué). `REVEAL.stepMs` sigue sin consumidor
 * dominante: ningún reveal escalonado del repo implementa hoy un paso
 * genérico de 60ms entre elementos (los escalonados que existen usan sus
 * propios arrays de retardo, verbatim de mockup) -- se mantiene documentado
 * para cuando una tarea futura lo necesite, mismo criterio que ya regía antes
 * de esta entrega.
 *
 * ## Por qué `vocabulary.test.ts` es un contrato cerrado (regla 40 del
 * manual) y no un test de "algunas propiedades"
 *
 * Los cinco grupos (el quinto, `OVERLAY`, llegó con Task 17 del plan
 * `2026-08-10-implementacion-plan-premium-f1-f5.md` -- ver su docblock más
 * abajo) se aseveran con `toEqual` completo (no
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
 * **Task 19** migró este grupo de "cero consumidores" (el defecto que
 * detectó el gate F2) a consumidor REAL en `Story.tsx` y `Features.tsx` --
 * import de `REVEAL` desde `@/motion/vocabulary` y uso literal de
 * `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift`, no una coincidencia
 * numérica con tokens sueltos de `motion.*`. Consumidores reales tras esta
 * tarea (verificados por grep, `import.*REVEAL.*from.*vocabulary` + uso de
 * `REVEAL\.` en el mismo fichero):
 * - `Story.tsx`: `ScGrid` (el padre -- D7 ya lo tenía en 480ms/decelerate/
 *   16px desde una tarea anterior; pasa a leer los tres campos del token en
 *   vez de repetir `theme.data.motion.duration.slower`/`easing.decelerate` +
 *   un `16px` suelto) y los CUATRO grupos hijos que D7 dejó pendientes --
 *   `ScEyebrowRow`, `ScTitle`, `ScBody` (con `ScSupportLead` heredando por
 *   composición) y `ScPillarCardItem` (las 4 tarjetas) --, que hasta esta
 *   tarea usaban 640ms/`easing.standard`/22px (`STORY_REVEAL_DURATION_MS`/
 *   `STORY_REVEAL_TRANSLATE`, retiradas: valor idéntico a `REVEAL.*`, regla
 *   13 del manual -- una constante de valor idéntico repetida es un token,
 *   no una constante de fichero).
 * - `Features.tsx`: `ScDarkContent` (rama oscura, ya en 480ms/decelerate/
 *   16px desde D7 -- mismo cambio que `ScGrid`) y `ScReveal` (rama clara,
 *   hasta esta tarea en 640ms/`easing.standard`/22px vía
 *   `FEATURES_LIGHT_REVEAL_DURATION_MS`/`FEATURES_LIGHT_REVEAL_TRANSLATE_Y`,
 *   retiradas de `features.layers.ts` por el mismo motivo que arriba). Las
 *   dos ramas de Features -- que D9 había dejado divergentes a propósito
 *   (mockup nuevo vs. rama intacta) -- convergen así en la MISMA gramática,
 *   igual que ya pedía D7 para las dos ramas de Story.
 *
 * Deliberadamente NO migrados en esta tarea (documentado, no un olvido):
 * `Contact.tsx` (dos bloques) y `Journey.tsx` (`ScStepReveal`) implementan un
 * patrón de valores IDÉNTICO o casi (`Journey.tsx` con `translateY(12px)`,
 * no 16px -- desvío de un único consumidor entre los cinco originales,
 * documentado desde antes de esta tarea) pero el encargo de Task 19 (D7,
 * "terminar" la unificación) acotaba el trabajo a Story/Features. Migrar
 * esos dos ficheros exigiría además decidir sobre el desvío de 12px de
 * Journey (cambiarlo a 16px es un cambio de comportamiento, no un cambio de
 * fuente del mismo valor) -- una decisión que no toca resolver de paso. La
 * combinación de duración/easing/shift que usan ya coincide en Contact.tsx
 * (16px) y en duración/easing en Journey.tsx, así que ninguno de los dos
 * queda VISUALMENTE distinto de `REVEAL`; solo queda sin la indirección del
 * import.
 *
 * - `durationMs: 480` — `motion.duration.slower` (480ms) ya dominaba este
 *   patrón antes del token (histórico, verificado en su momento):
 *   `Features.tsx:948-951` (`ScDarkContent`), `Story.tsx:308-311` (`ScGrid`),
 *   `Contact.tsx` (dos bloques, líneas 204 y 691) y `Journey.tsx:257-260`
 *   (`ScStepReveal`).
 * - `shift: "16px"` — mismo patrón histórico que arriba. Excepción NO
 *   absorbida (declarada desde antes de esta tarea, se mantiene):
 *   `Journey.tsx:255` (`ScStepReveal`) usa `translateY(12px)`, no 16px.
 * - `easing: "cubic-bezier(0.23, 1, 0.32, 1)"` — la curva PROPIA de este
 *   vocabulario (no una clave de `motion.easing` -- ver el porqué al final
 *   de este fichero) que sustituye a `motion.easing.decelerate` en los
 *   consumidores reales de REVEAL (Story.tsx/Features.tsx, arriba). El resto
 *   del repo que sigue usando `decelerate` fuera de un patrón REVEAL (por
 *   ejemplo transiciones de UI que no son reveals de scroll) no se toca --
 *   la sustitución es "en los REVEAL, no en el resto" (punto 3 del brief de
 *   Task 19).
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
 * - `exitDurationMs: 200` — consumidor real desde Task 4 del plan
 *   `2026-08-10-implementacion-plan-premium-f1-f5.md` (posterior a este
 *   lote 8-14, que lo dejó sin implementar): `ScScrollHint`
 *   (`story.deck.tsx`) y `ScJourneyScrollHint` (`journey.deck.tsx`), la
 *   pista de scroll del deck que se desvanece (`opacity`, única propiedad
 *   animada) en cuanto el usuario avanza de la diapositiva 0. El valor
 *   numérico coincide con `motion.duration.base` (misma familia que
 *   `railDurationMs`, arriba) y es el verbatim de la spec del vault + adenda
 *   Emil para la salida de un velo o capa de la presentación — el rol que
 *   describe exactamente ese desvanecimiento.
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
 * OVERLAY — coreografía de las DOS superficies flotantes de navegación: el
 * desplegable de escritorio (`ScNavPanel`, `Navbar.tsx`) y la hoja de
 * navegación móvil (`ScNavSheet`/`ScBurger`, `NavSheet.tsx`). Nace en la Task
 * 9/10 de la auditoría premium (2026-08-08) como `NAV_OVERLAY_OPEN_MS`/
 * `NAV_OVERLAY_CLOSE_MS` (`navOverlay.transition.ts`, ahora retirado) más
 * `NAV_PANEL_CLOSED_SCALE` inline en `Navbar.tsx`; Task 17 (plan premium
 * F1-F5, 2026-08-11) los traslada aquí -- "valores del vocabulario" en su
 * propio brief -- y unifica el tercer campo (`closedScale`) entre las dos
 * superficies, que hasta ahora solo lo tenía el panel.
 *
 * - `openMs: 180` / `closeMs: 120` — asimetría deliberada (regla 26 de
 *   `RULES.md`, D5 del brief de Task 9): abrir presenta contenido que hay que
 *   leer y pide tiempo de lectura; cerrar solo retira algo que el usuario ya
 *   decidió descartar, y alargarlo se siente como una interfaz que no
 *   obedece. Los dos sentidos se declaran como DOS bloques de `transition` en
 *   CSS (base = cerrar, `[data-open="true"]` = abrir), nunca con estado de
 *   React adicional -- ver `ScNavPanel`/`ScNavSheet`.
 * - `closedScale: 0.97` — encogimiento del estado cerrado, sumado al
 *   `translateY` propio de cada superficie. Task 9 lo introdujo SOLO en
 *   `ScNavPanel` (un popover que cuelga de su disparador, así que encoger la
 *   escala refuerza ese origen -- `transform-origin: top left`) y lo
 *   descartó a propósito en `ScNavSheet` (una hoja que DESLIZA desde el borde
 *   inferior, donde añadir escala se leía como "un modal que salta", un
 *   gesto distinto). Task 17 revierte esa exclusión: el brief pide paridad
 *   de motion explícita entre las dos superficies ("cierre con scale(0.97)
 *   en ambos"), motivada por la misma auditoría independiente que detectó el
 *   hallazgo del scroll de tema (ver `useThemeScrollReset.ts`) -- alguien que
 *   abre el panel en escritorio y la hoja en móvil percibe hoy dos
 *   coreografías de cierre distintas para el mismo rol de superficie
 *   (navegación flotante), y esa inconsistencia pesa más que la lectura de
 *   "modal que salta" que motivó la exclusión original. Con
 *   `transform-origin: bottom center` (la hoja no cambia su origen), el
 *   encogimiento es simétrico respecto al eje X y tira ligeramente el borde
 *   superior hacia el inferior -- el mismo patrón de "hoja que se asienta"
 *   que ya usan las hojas inferiores de iOS/Material, no un gesto ajeno.
 *
 * Un literal PROPIO de este vocabulario, no una clave nueva de
 * `motion.duration`/`motion.easing` (mismo criterio que documenta el bloque
 * final de este fichero para `REVEAL.easing`/`PRESS.easing`): `openMs`/
 * `closeMs`/`closedScale` son la coreografía de un ROL concreto (superficie
 * flotante de navegación), no un átomo general del sistema. La curva la
 * sigue aportando `PRESS.easing`, no este grupo: las dos superficies ya la
 * comparten y no hay motivo para duplicarla aquí.
 */
export const OVERLAY = {
  openMs: 180,
  closeMs: 120,
  closedScale: 0.97,
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
 * **Task 19** migró los CINCO campos a consumidor real (el defecto que
 * detectó el gate F2: cero consumidores pese a documentar literales que ya
 * existían en el código). Es una sustitución PURA de literal por token --
 * mismo valor numérico antes y después, cero cambio visual, verificado por
 * grep de que el literal desaparece y `AMBIENT.<campo>` aparece en su lugar:
 *
 * - `breathMs: 5400` — `5.4s` domina tres animaciones de "respiración"/glow
 *   del mismo mascota: `solBreathe`, `haloGlow` y `coreGlow` (las tres en
 *   `Sol.tsx`, `ease-in-out infinite`). Las tres pasan a
 *   `${AMBIENT.breathMs}ms`.
 * - `pulseMs: 6500` — `6.5s`, `heartBeat` (`storyCosmicBeing.parts.tsx`,
 *   `ease-in-out infinite`): el pulso de la escena "Cosmic Being" de Story.
 *   Pasa a `${AMBIENT.pulseMs}ms`.
 * - `floatMs: 9000` — `9000ms`, `gradientShift` domina el degradado animado
 *   de marca en tres consumidores: `BrandName.tsx`, `Hero.tsx` y
 *   `Contact.tsx` (los tres `linear infinite alternate`). Los tres pasan a
 *   `${AMBIENT.floatMs}ms`. No hay una animación literalmente nombrada
 *   "float" con este valor; se agrupa aquí por ser el único movimiento
 *   ambiental de deriva lenta y continua (`background-position` oscilando)
 *   que no encaja en `breathe`/`pulse` (pulsos de escala/sombra) ni en
 *   `orbit`/`orbitSlow` (rotaciones).
 * - `orbitMs: 20000` — `20s`, `coronaMorph` (`Sol.tsx`, `ease-in-out
 *   infinite`): morfa la forma de la corona Y la rota 360° en el mismo
 *   ciclo — el consumidor más cercano a una órbita completa a este ritmo.
 *   Pasa a `${AMBIENT.orbitMs}ms`.
 * - `orbitSlowMs: 40000` — `40s`, `sweepSpin` (`Sol.tsx`, `linear infinite`):
 *   rotación completa de 360° sin morfado, el doble de lenta que `orbitMs` —
 *   la órbita "lenta" del mismo mascota. Pasa a `${AMBIENT.orbitSlowMs}ms`.
 *
 * ## Lo que NO se migró en esta tarea, y por qué (mismo criterio que pide el
 * punto 7 del brief: decidir con el código delante, no forzar)
 *
 * `Sol.tsx` tiene CUATRO animaciones ambientales más sin equivalente exacto
 * en `AMBIENT`: `raysSpin` (70s, `linear infinite`), `rayTwinkle` (6s,
 * `ease-in-out infinite`), `sparkleTwinkle` y `sparkTwinkle` (3.4s cada una,
 * `ease-in-out infinite`, dos capas de destellos distintas). `Wormhole.tsx`
 * tiene TRES rotaciones infinitas propias (`ScSwirl` 34s, `ScRing2` 24s
 * reverse, `ScRing3` 18s) más varias animaciones de pulso DISPARADAS (no
 * ambientales: `ringExplodeStep`/`ringGlowStep`/`corePulseStep`/`shockBurst`/
 * `markPulse`/`swirlFlash` solo corren bajo `[data-pulse="true"]`, con
 * `easing.standard`/`easing.emphasized` ya tokenizados -- no son candidatas a
 * `AMBIENT`, que es exclusivamente para movimiento infinito no disparado).
 * `Footer.tsx` anima el titileo de sus estrellas decorativas con
 * `var(--star-duration)`, un rango ALEATORIO por estrella escrito por
 * propiedad personalizada (no un literal fijo) -- no hay un solo número que
 * migrar ahí.
 *
 * Ninguno de estos siete valores (cuatro de Sol, tres de Wormhole) coincide
 * con ningún campo de `AMBIENT`. Migrarlos de verdad exigiría una de dos
 * cosas: (a) CAMBIAR su duración real para que encaje en uno de los cinco
 * campos existentes -- un cambio de comportamiento del mascota, no un
 * refactor, y el brief de Task 19 autoriza explícitamente a no forzar esto
 * si "pone en riesgo su carácter"; o (b) AÑADIR campos nuevos a `AMBIENT` --
 * que chocaría de frente con el trabajo ya planificado de la Task 20 del
 * mismo plan ("Colapso AMBIENT: de 5 valores a 3"), que además nombra
 * explícitamente a Sol/Wormhole/Footer como su alcance y pide decidir con
 * "el mismo criterio del punto 7 de la Task 19" -- es decir, Task 20 fue
 * escrita esperando encontrar este inventario ya hecho, no resuelto. Ampliar
 * `AMBIENT` ahora, para luego colapsarlo, sería trabajo que se deshace a sí
 * mismo. Se deja aquí el inventario completo (siete literales, dos ficheros,
 * cero coincidencias) para que Task 20 no tenga que rehacerlo.
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
