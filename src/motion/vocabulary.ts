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
 * **Task 20** (mismo plan, "motion resto") colapsa `AMBIENT` de los cinco
 * campos que dejó Task 19 a TRES (`breathMs`/`floatMs`/`orbitMs`) -- ver el
 * docblock de `AMBIENT`, abajo, para el criterio de selección, el mapeo de
 * los dos campos retirados y la verificación en navegador del único cambio
 * de valor real que produce (`pulseMs` fusionado en `breathMs`).
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
 *
 * ## Fix de revisión (fix wave B, 2026-08-12): el candado media por GRUPO,
 * no por CAMPO, y dejaba huérfanos campos enteros
 *
 * `src/test/vocabulary-consumers.test.ts` (Task 19) solo comprobaba que cada
 * GRUPO tuviera AL MENOS un consumidor real -- así que un grupo con cuatro
 * campos podía pasar el candado con tres de ellos completamente muertos. La
 * review final de rama midió exactamente eso: `REVEAL.stepMs`,
 * `DECK.slideDurationMs`, `DECK.slideShift`, `DECK.scrubMs` y
 * `DECK.sceneDepthShift` tenían CERO consumidores de producción (grep
 * `\bDECK\.<campo>\b`/`\bREVEAL\.<campo>\b`, sin tests ni el propio
 * `vocabulary.ts`) pese a que `DECK` en conjunto sí pasaba el candado
 * (gracias a `railDurationMs`/`exitDurationMs`, que sí tienen consumidor). Y
 * peor: `DECK.sceneDepthShift`/`DECK.slideShift` estaban DUPLICADOS a mano en
 * `story.layers.ts`/`journey.layers.ts` (`STORY_SCENE_DEPTH_SHIFT`/
 * `JOURNEY_SCENE_DEPTH_SHIFT`, `STORY_SLIDE_SHIFT`/`JOURNEY_SLIDE_SHIFT`) --
 * el mismo patrón "literal repetido que debería ser token" que motivó crear
 * este vocabulario en Task 8.
 *
 * `REVEAL` pierde aquí `stepMs` (retirado, ver su docblock) y `DECK` pierde
 * `slideDurationMs`/`slideShift`/`scrubMs`/`sceneDepthShift` (retirados, ver
 * el docblock de `DECK`): los CINCO carecían de consumidor real y ninguno se
 * pudo migrar en esta revisión porque sus consumidores potenciales
 * (`story.deck.tsx`/`journey.deck.tsx`/`story.layers.ts`/`journey.layers.ts`,
 * los cuatro bajo `src/components/**`) están reservados a otra fix wave
 * concurrente de la misma review de rama -- retirar el campo muerto del
 * vocabulario es lo único que esta revisión puede hacer sin invadir ese
 * territorio. La duplicación de `STORY_SCENE_DEPTH_SHIFT`/
 * `JOURNEY_SCENE_DEPTH_SHIFT` y `STORY_SLIDE_SHIFT`/`JOURNEY_SLIDE_SHIFT`
 * en sí SIGUE viva en esos dos ficheros -- no se resuelve retirando el
 * puntero muerto del vocabulario, solo se deja de fingir que ya estaba
 * resuelta. Queda como deuda abierta, declarada aquí a propósito para que
 * una tarea futura que sí pueda tocar `src/components/**` la recoja: migrar
 * esos cuatro ficheros a consumir `DECK.sceneDepthShift`/`DECK.slideShift`
 * directamente (mismos valores exactos, cero cambio visual) y, de paso,
 * `DECK.slideDurationMs` en `ScSlide`/`ScJourneySlide` (hoy leen
 * `theme.data.motion.duration.slow` inline, mismo valor 320) y
 * `DECK.scrubMs` en el `@keyframes story-deck-scrub` de `story.deck.tsx`
 * (hoy `STORY_SCRUB_MS`, mismo valor 320, sin equivalente en Journey).
 *
 * El candado (`vocabulary-consumers.test.ts`) pasa ahora a medir por CAMPO,
 * no por grupo -- itera las claves reales de cada grupo exportado, así que
 * un campo huérfano nuevo (o el día de mañana `slideDurationMs`/`slideShift`/
 * `scrubMs`/`sceneDepthShift` si alguien los reintroduce sin consumidor)
 * sale en rojo de inmediato, sin esperar a que alguien piense en ampliar la
 * lista de grupos comprobados. `OVERLAY` (Task 17, el único grupo que no
 * tenía ningún candado) se añade a esa comprobación en la misma revisión.
 *
 * El candado por campo, ya construido, encontró un SEXTO huérfano que no
 * estaba en la lista de la review de rama: `PRESS.hoverLift` (ver el
 * docblock de `PRESS`, abajo) -- `Button.tsx` cita el campo en un
 * comentario para explicar de dónde sale su `-2px`, pero el código nunca lo
 * importó. Mismo motivo, mismo tratamiento (retirado, no migrado, misma
 * deuda declarada): el único consumidor posible está bajo
 * `src/components/**`, fuera del alcance de esta revisión.
 *
 * ## Fix de revisión (fix wave D, 2026-08-12): `DECK.sceneDepthShift`/
 * `DECK.slideShift` vuelven, esta vez CON consumidores reales -- cierra la
 * deuda que la fix wave B dejó declarada arriba
 *
 * La fix wave B acertó en el diagnóstico (duplicación de
 * `STORY_SCENE_DEPTH_SHIFT`/`JOURNEY_SCENE_DEPTH_SHIFT` = `"6dvh"` y
 * `STORY_SLIDE_SHIFT`/`JOURNEY_SLIDE_SHIFT` = `"40px"`, cuatro literales
 * repetidos a mano en dos ficheros) pero, al no poder tocar
 * `src/components/**`, la única corrección disponible era RETIRAR el token
 * muerto -- lo que invertía la intención del hallazgo original: antes había
 * un token sin consumidores; después había una duplicación sin token. La fix
 * wave D, con `src/components/**` en su alcance, cierra el círculo: reintroduce
 * `sceneDepthShift`/`slideShift` en `DECK` (ver su docblock, abajo, para el
 * porqué de cada uno) Y, en el MISMO movimiento, migra `story.layers.ts`/
 * `journey.layers.ts` para que `STORY_SCENE_DEPTH_SHIFT`/
 * `JOURNEY_SCENE_DEPTH_SHIFT`/`STORY_SLIDE_SHIFT`/`JOURNEY_SLIDE_SHIFT` dejen
 * de ser literales propios y pasen a derivar de `DECK.sceneDepthShift`/
 * `DECK.slideShift` -- mismos valores exactos, cero cambio visual, y ahora la
 * ÚNICA declaración de cada valor vive en `vocabulary.ts`; las cuatro
 * constantes de sección son alias con nombre, no fuentes. `story.deck.tsx`/
 * `journey.deck.tsx` no cambian: siguen importando esas mismas cuatro
 * constantes de sus respectivos `*.layers.ts`, así que heredan el token sin
 * tocar una línea. `slideDurationMs`/`scrubMs` (los otros dos campos que la
 * fix wave B retiró) SIGUEN fuera: no estaban duplicados a mano (el defecto
 * concreto que motivó esta revisión), y migrarlos exigiría decisiones
 * adicionales fuera del alcance de D2 (ver el docblock de `DECK` para el
 * detalle de cada uno) -- se dejan como la misma deuda declarada, ahora más
 * pequeña.
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
 * **Fix wave D (hallazgo D3, revisión final de rama, 2026-08-12)** cierra la
 * divergencia que Task 19 dejó declarada: `Contact.tsx` (dos bloques) y
 * `Journey.tsx` (`ScStepReveal`) seguían en `motion.duration.slower` +
 * `motion.easing.decelerate` sueltos, NO en el token -- y el párrafo de
 * arriba (versión anterior a este fix) afirmaba que "ninguno de los dos
 * queda VISUALMENTE distinto de `REVEAL`", lo cual era FALSO: `decelerate`
 * (`cubic-bezier(0, 0, 0.2, 1)`, `motion.ts`) y `REVEAL.easing`
 * (`cubic-bezier(0.23, 1, 0.32, 1)`) son dos curvas distintas -- coincidir en
 * duración (480ms) no basta para que la ENTRADA se lea igual; la forma de la
 * curva es justo lo que Task 9 introdujo `REVEAL.easing` para reemplazar.
 * Dos curvas de reveal convivían en la misma página, contradiciendo D7 ("D7
 * terminado" era falso a medias).
 *
 * `Contact.tsx` (`ScCard`, `ScDarkContent`) migra COMPLETO a
 * `REVEAL.durationMs`/`REVEAL.easing`/`REVEAL.shift`: su `translateY(16px)`
 * ya coincidía exacto con `REVEAL.shift`, así que es la misma migración de
 * fuente pura que Story.tsx/Features.tsx (Task 19), sin cambio de
 * comportamiento en ningún eje.
 *
 * `Journey.tsx` (`ScStepReveal`) migra `REVEAL.durationMs`/`REVEAL.easing`
 * pero CONSERVA su `translateY(12px)` literal: el desvío de `shift` frente a
 * los 16px del resto (documentado desde antes de esta tarea, ver más abajo)
 * es una decisión de composición ya tomada -- ScStepReveal anima un paso
 * dentro de una rejilla de 6 columnas, un desplazamiento menor que el de un
 * bloque de sección completo -- y unificarla no era el encargo de D3 (que
 * pedía la CURVA, no el desplazamiento). Verificado en navegador real
 * (Chrome, `playwright-cli`, capturas `fixD-*` del informe de la tarea) que
 * sustituir solo `decelerate` por `REVEAL.easing` no cambia el carácter del
 * movimiento de Journey/Contact: las dos curvas comparten forma de
 * "desaceleración pronunciada" a esta duración y este desplazamiento, la
 * diferencia es sutil, no un cambio de lenguaje de movimiento.
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
 * `stepMs` (60, RETIRADO en fix wave B, 2026-08-12): sin consumidor dominante
 * desde que se documentó (Task 19) hasta esta revisión -- verificado por
 * grep (`60ms`, stagger/cascade en `src/components/sections/`) que ningún
 * reveal escalonado del repo usa este paso, y por
 * `src/test/vocabulary-consumers.test.ts` que mide por CAMPO desde esta
 * revisión (antes solo medía que el GRUPO `REVEAL` tuviera algún
 * consumidor, y `durationMs`/`easing`/`shift` ya lo cubrían, así que
 * `stepMs` podía quedarse muerto indefinidamente sin que el candado lo
 * viera). El escalonado más cercano que existe, `Journey.tsx:74`
 * (`STEP_STAGGER_MS = 90`), es un valor DISTINTO para un propósito distinto
 * (paso entre pasos del `ScStepReveal` de Journey, no entre elementos de una
 * lista genérica) -- no hay ningún consumidor real al que migrar `stepMs`,
 * a diferencia de `DECK.sceneDepthShift`/`DECK.slideShift` (ver el docblock
 * de `DECK`, abajo), que sí tienen un destino conocido fuera del alcance de
 * esta revisión. `60` seguía siendo el valor verbatim de la spec del vault +
 * adenda Emil para un escalonado de reveal que nunca llegó a implementarse;
 * si una tarea futura lo necesita, se reintroduce entonces, con su propio
 * consumidor en el mismo commit -- no antes.
 */
export const REVEAL = {
  durationMs: 480,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  shift: "16px",
} as const;

/**
 * DECK — coreografía de las presentaciones de diapositivas (Story/Journey,
 * `story.deck.tsx`/`journey.deck.tsx`): el rail de progreso decorativo y la
 * salida de la pista de scroll de la presentación.
 *
 * - `railDurationMs: 200` — `motion.duration.base` (200ms) ya domina la
 *   transición de las marcas del rail decorativo: `ScRailMark`
 *   (`story.deck.tsx:336-341`) y `ScJourneyRailMark`
 *   (`journey.deck.tsx:293-297`), las dos con el mismo trío
 *   opacity/transform/background-color a `motion.duration.base` +
 *   `motion.easing.standard`. Consumidor real: `NavSheet.tsx` (la hoja de
 *   navegación móvil reutiliza el mismo valor para su propia transición de
 *   opacidad/visibilidad).
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
 *
 * - `sceneDepthShift: "6dvh"` — REINTRODUCIDO en fix wave D (2026-08-12,
 *   hallazgo D2), tras haber sido retirado en fix wave B por falta de
 *   consumidor real (ver más abajo el porqué de esa retirada). Recorrido, en
 *   `transform`, del envoltorio de la escena 3D de Story/Journey
 *   (`ScSceneWrap`/`ScJourneySceneWrap`) mientras el `stage` está pegado por
 *   `position: sticky` y el término de scroll de `useSceneParallax` deja de
 *   aportar profundidad. Consumidores reales:
 *   `STORY_SCENE_DEPTH_SHIFT`/`JOURNEY_SCENE_DEPTH_SHIFT`
 *   (`story.layers.ts`/`journey.layers.ts`) pasan de declarar el literal
 *   `"6dvh"` a mano a derivarlo de `DECK.sceneDepthShift` -- mismo valor
 *   exacto, cero cambio visual; `story.deck.tsx`/`journey.deck.tsx` no
 *   cambian, siguen importando esas dos constantes de sus respectivos
 *   `*.layers.ts` sin tocar una línea.
 * - `slideShift: "40px"` — REINTRODUCIDO en fix wave D, mismo motivo y mismo
 *   tratamiento que `sceneDepthShift`. Desplazamiento vertical de
 *   entrada/salida de cada diapositiva (`data-state="past"`/`"next"`) de
 *   `ScSlide`/`ScJourneySlide`. Consumidores reales:
 *   `STORY_SLIDE_SHIFT`/`JOURNEY_SLIDE_SHIFT` (mismos dos ficheros), con el
 *   mismo criterio de derivación -- mismo valor exacto, `story.deck.tsx`/
 *   `journey.deck.tsx` intactos.
 *
 * ## Dos campos siguen RETIRADOS (`slideDurationMs`, `scrubMs`): no eran el
 * defecto de duplicación que esta revisión cierra
 *
 * `slideDurationMs` (320, pensado para `ScSlide`/`ScJourneySlide`) y
 * `scrubMs` (320, pensado para el `@keyframes story-deck-scrub` de Story)
 * siguen sin consumidor real y NO se reintroducen en fix wave D: a
 * diferencia de `sceneDepthShift`/`slideShift`, ninguno de los dos estaba
 * DUPLICADO a mano entre Story y Journey -- `slideDurationMs` coincidía con
 * `theme.data.motion.duration.slow`, ya consumido inline en
 * `ScSlide`/`ScJourneySlide` sin pasar por este grupo (un solo valor, un
 * solo sitio, nada que desduplicar); `scrubMs` coincidía con
 * `STORY_SCRUB_MS` (`story.layers.ts`, atado por test a
 * `motion.duration.slow`), consumido SOLO por Story, sin gemelo en Journey
 * (`journey.deck.tsx` no tiene scrub propio). El hallazgo que trajo esta
 * revisión (D2 del brief de fix wave D) era específicamente "dos literales
 * iguales por casualidad en dos ficheros donde antes había un token" --
 * migrar estos dos campos sin ese defecto concreto sería alcance nuevo, no
 * el cierre de la deuda declarada. Siguen como deuda abierta: si una tarea
 * futura decide que merecen su propio consumidor, se reintroducen entonces,
 * en el MISMO commit que ese consumidor -- mismo criterio que ya regía antes
 * de este fix.
 */
export const DECK = {
  railDurationMs: 200,
  exitDurationMs: 200,
  sceneDepthShift: "6dvh",
  slideShift: "40px",
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
 *
 * `hoverLift` (`"-2px"`, RETIRADO en fix wave B, 2026-08-12): hallazgo
 * ADICIONAL del candado por campo (`vocabulary-consumers.test.ts`, ver el
 * docblock de cabecera de ese fichero), fuera de la lista que trajo la
 * review de rama para este grupo. `Button.tsx:202` sigue escribiendo
 * `transform: translateY(-2px)` a mano -- el propio docblock de ese bloque
 * (líneas 181-199) CITA `PRESS.hoverLift` en prosa para explicar el origen
 * del valor, pero el CÓDIGO nunca llegó a importar ni consumir el campo. La
 * comprobación de grupo (anterior a esta revisión) no lo veía porque no
 * despojaba comentarios de la misma forma exhaustiva; el candado por campo
 * de esta revisión sí. Mismo motivo que los cuatro campos retirados de
 * `DECK` (ver su docblock): el único consumidor real posible
 * (`Button.tsx`, bajo `src/components/**`) está fuera del alcance de esta
 * revisión -- reservado a otra fix wave concurrente de esta misma review de
 * rama. Se retira en vez de migrar; queda como deuda abierta declarada (ver
 * la sección "Fix de revisión" del docblock de cabecera de este fichero)
 * para que una tarea futura con acceso a `src/components/**` conecte
 * `Button.tsx:202` a `PRESS.hoverLift` -- mismo valor exacto, cero cambio
 * visual.
 */
export const PRESS = {
  durationMs: 100,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  activeScale: 0.98,
  hoverGuard: "(hover: hover) and (pointer: fine)",
} as const;

/**
 * AMBIENT — animaciones infinitas de las escenas decorativas (mascotas del
 * ojo, gradientes de marca): movimiento que respira solo mientras la escena
 * está en pantalla, nunca ligado a una interacción del usuario.
 *
 * **Task 19** migró CINCO campos (`breathMs`/`pulseMs`/`floatMs`/`orbitMs`/
 * `orbitSlowMs`) a consumidor real (el defecto que detectó el gate F2: cero
 * consumidores pese a documentar literales que ya existían en el código).
 * **Task 20** (mismo plan, "motion resto") colapsa esos cinco a los TRES de
 * abajo -- encargo explícito del brief ("de 5 valores a 3, elige los 3 con
 * más consumidores reales, mapea el resto") --, conservando en todos los
 * casos la propiedad que motivó Task 19: sustitución de literal por token
 * verificable por `src/test/vocabulary-consumers.test.ts` (acceso de
 * propiedad real en el fichero, no una cita en comentario).
 *
 * ## Los tres campos elegidos, y el criterio (consumidores reales = FICHEROS
 * distintos que acceden a `AMBIENT.<campo>`, el mismo conteo que hace
 * `realConsumersOf()` en `vocabulary-consumers.test.ts` -- un fichero cuenta
 * una vez aunque use el campo varias veces)
 *
 * - `floatMs: 9000` — 3 ficheros consumidores (`BrandName.tsx`, `Hero.tsx`,
 *   `Contact.tsx`), el único de los cinco campos originales que cruza la
 *   frontera de un solo componente. Gana sin empate.
 * - `breathMs: 5400` — 1 fichero (`Sol.tsx`), pero con TRES usos dentro de
 *   ese fichero (`solBreathe`/`haloGlow`/`coreGlow`) -- la mayor repetición
 *   interna de los cinco campos originales, y el criterio de desempate frente
 *   a `pulseMs`/`orbitMs`/`orbitSlowMs`, los tres empatados a 1 fichero/1 uso.
 * - `orbitMs: 20000` — el tercer campo, elegido frente al empate a tres
 *   (`pulseMs`, `orbitMs`, `orbitSlowMs`) por ser el único ROL que no tiene
 *   una alternativa barata dentro de los otros dos campos: `orbitMs` gobierna
 *   una ROTACIÓN (`coronaMorph`, `Sol.tsx`), un movimiento angular que no se
 *   parece en nada al pulso de escala/opacidad de `breathMs` ni a la deriva
 *   de `background-position` de `floatMs` -- forzarlo a cualquiera de los
 *   otros dos habría convertido una rotación de 20s en un ciclo de 5.4s o
 *   9s, 2-4× más rápido, el tipo de cambio de carácter que este mismo brief
 *   pide evitar.
 *
 * ## El mapeo de los dos campos retirados (`orbitSlowMs`, `pulseMs`)
 *
 * - `orbitSlowMs` (40000, `sweepSpin` en `Sol.tsx`) se retira SIN cambiar su
 *   valor: el propio docblock de Task 19 ya documentaba que "la órbita
 *   'lenta' del mismo mascota" es exactamente el DOBLE de `orbitMs`
 *   (40000 = 20000 × 2) -- una relación matemática real, no una coincidencia
 *   numérica. `Sol.tsx` deriva ahora `sweepSpin` de `AMBIENT.orbitMs * 2`
 *   (constante local `ORBIT_SLOW_MS`, ver ese fichero) en vez de un quinto
 *   campo del vocabulario -- mismo valor exacto (40000ms), cero cambio
 *   visual, verificado por grep de que `AMBIENT.orbitSlowMs` desaparece del
 *   código y `AMBIENT.orbitMs * 2` ocupa su lugar.
 * - `pulseMs` (6500, `heartBeat` en `storyCosmicBeing.parts.tsx`) NO tiene
 *   una relación matemática limpia con ninguno de los tres campos que quedan
 *   (6500 no es múltiplo ni submúltiplo exacto de 5400/9000/20000), así que
 *   su retirada SÍ cambia un valor real: `storyCosmicBeing.parts.tsx` pasa a
 *   consumir `AMBIENT.breathMs` (5400) en vez de `AMBIENT.pulseMs` (6500) --
 *   el pulso del núcleo "heart-core" de la escena "Cosmic Being" de Story
 *   pasa de un ciclo de 6.5s a uno de 5.4s (~17% más rápido). Es el campo
 *   correcto para fusionar `pulseMs`, no `orbitMs`: los dos describen el
 *   MISMO rol de coreografía -- un pulso de opacidad/escala en una capa de
 *   glow, ambiental y no disparado -- para dos mascotas distintas; fusionar
 *   con `orbitMs` habría mezclado un pulso con una rotación, dos roles sin
 *   relación. Verificado en navegador real (Chrome, `playwright-cli`,
 *   capturas `t20-*` del informe de esta tarea) que el cambio de ritmo no
 *   aplana ni cambia el carácter de la escena: es un glow de fondo sutil
 *   (opacity 0.72↔1 sobre una sola capa aditiva de 11), y un 17% de cambio
 *   de cadencia en ese rango no es perceptible como "otra animación" contra
 *   el resto de la composición, a diferencia del recorte de `scrollAmp` de
 *   la misma escena (ver `storyCosmicBeing.layers.ts`), que sí lo era.
 *
 * ## Lo que sigue SIN migrar tras el colapso, y por qué (mismo inventario que
 * dejó Task 19, ahora con MENOS campos a los que encajar -- el argumento de
 * "no forzar" es más fuerte, no más débil)
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
 * con `breathMs`/`floatMs`/`orbitMs` ni con el `orbitMs * 2` derivado.
 * Forzarlos exigiría CAMBIAR su duración real -- un cambio de comportamiento
 * del mascota, no un refactor -- y este brief autoriza explícitamente a no
 * forzar esto si arriesga su carácter. Con solo tres campos disponibles
 * (antes cinco), la probabilidad de que alguno de los siete encajara sin
 * forzar solo bajó; se deja el inventario completo aquí, sin cambios, para
 * que una tarea futura que SÍ decida ampliar `AMBIENT` (o crear un segundo
 * vocabulario de rotaciones lentas) no tenga que rehacerlo.
 *
 * ## Octavo valor sin migrar, distinto de los siete de arriba: `ctaGlowPulse`
 * (`Hero.tsx`, 1600ms) -- fix wave E, hallazgo E4 (detector determinista,
 * 2026-08-13)
 *
 * Los siete de arriba son animaciones AMBIENTALES de verdad (corren solas,
 * sin interacción) que simplemente no encajan en NINGÚN campo por su
 * duración. `ctaGlowPulse` es un caso distinto: NO es ambiental en absoluto
 * -- solo corre mientras hay `:hover`/`:focus-visible` sostenido sobre el
 * CTA del hero (ver su propio docblock, `Hero.tsx`), así que queda excluido
 * de `AMBIENT` por DEFINICIÓN de grupo ("nunca ligado a una interacción del
 * usuario", párrafo de cabecera de este docblock), no por falta de hueco
 * entre los tres campos disponibles. Documentado en su sitio de declaración,
 * no aquí con un valor propio: no hay ningún campo de `AMBIENT` al que
 * pudiera aspirar sin contradecir lo que el grupo significa.
 */
export const AMBIENT = {
  breathMs: 5400,
  floatMs: 9000,
  orbitMs: 20000,
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
 * distintos que hoy resultan iguales, igual que `DECK.railDurationMs` y
 * `DECK.exitDurationMs` comparten valor (200) sin ser el mismo campo (ver
 * `DECK`, arriba). Si el día de mañana una de las dos coreografías necesita
 * una curva distinta, cambia SU campo sin arrastrar al otro — un alias
 * compartido (una sola constante importada por los dos grupos) se rompería
 * en silencio esa vez, mismo razonamiento que `timings.ts` aplica a
 * `HERO_FADE_MS` para no aliasearlo a `motion.duration.base` pese a ser su
 * múltiplo exacto.
 */
