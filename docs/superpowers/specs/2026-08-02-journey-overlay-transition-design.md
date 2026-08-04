# Spec — Transición Story→Journey por superposición + Journey a sangre en tema oscuro

**Fecha:** 2026-08-02 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `3394bcb`

**Encargo del usuario (literal):**

> - scroll: al hacer scroll desde la seccion **Story** en la ultima diapositiva, cuando se hace scroll hacia abajo para pasar a la seccion **Journey**, la seccion **Journey** debe ir apareciendo de forma vertical hacia arriba superponiendose a la seccion **Story**. Estilo: transicion apareciendo desde abajo hasta alcanzar el alto, ocupando el ancho total y el alto del dispositivo.
> - seccion **Journey**: convertir la imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo y el contenido debe estar a un maximo de 1280px de ancho. Estilo: experiencia visual. Background-color: secundary[1100].

---

## 1. Estado actual (medido en el árbol, no de memoria)

`git rev-parse HEAD` = `3394bcb`, rama `feature/landing-motion-interactions`, árbol limpio salvo `graphify-out/**` (generado).

**El HEAD de partida ya contiene un intento de este mismo encargo** (`3394bcb`, "feat(journey): scroll overlay transition Story→Journey + dark theme visual improvements"). Lo que se ha comprobado sobre él, uno por uno:

- **Sí** está registrado en el vault (`01-Projects/vti.md`, entrada del 2026-08-02) y **sí** existe la spec que su código cita — pero solo en el vault (`01-Projects/vti/typescript/specs/2026-08-01-landing-motion-interactions-scroll-journey-design.md`), **no** en `docs/superpowers/specs/` de este repo, que es donde el comentario de `Journey.tsx` parecía apuntar. La referencia era ambigua, no inventada; queda desambiguada en el código con esta entrega.
- **No** está registrado en `task/todo.md`, cuyo cierre de sesión del 2026-08-01 deja la rama en `ff39732`.
- El registro del vault afirma que `3394bcb` está **pusheado**, y **es falso**: `git log origin/feature/landing-motion-interactions -1` da `ff39732`, y `git status -sb` reporta `ahead 1`. Se corrige en el mismo registro con esta entrega.

Esta entrega **sustituye** ese intento; los defectos técnicos que corrige están en §2.

Estructura vigente de las dos secciones en **tema oscuro**:

| Pieza | Medida hoy | Fichero |
| --- | --- | --- |
| `ScStory` ($fullBleed) | `position: relative`, sin medida propia, `background-color: semantic.bg` | `Story.tsx:115` |
| `ScTrack` | `height: calc(6 × 100dvh)` = `STORY_DECK_TRACK_HEIGHT` | `story.deck.tsx:37` |
| `ScStage` | `position: sticky; top: 0; height: 100dvh; overflow: hidden` | `story.deck.tsx:65` |
| `useStoryDeck` | `span = rect.height - vh`; `progress = -rect.top / span`; `index = round(progress × (slides-1))` | `useStoryDeck.ts:143` |
| `ScJourney` ($fullBleed) | `max-width: 1280px; height: 90dvh; margin-inline: auto`, `transform: translateY(...)` por variable CSS | `Journey.tsx:60` |
| `JourneyCosmicPortal` → `ScScene` | `position: absolute; inset: 0` (por tanto, hoy: 1280 × 90dvh) | `journeyCosmicPortal.parts.tsx:19` |
| `JOURNEY_PORTAL_SIZES` | `"(min-width: 1280px) 1280px, 100vw"` | `journeyCosmicPortal.layers.ts:93` |

Baseline de calidad medido en este HEAD antes de tocar nada: se reporta en §11 con la salida literal.

## 2. Por qué el intento de `3394bcb` no cumple el encargo (causa raíz, no estética)

Tres defectos independientes, todos de raíz:

1. **Un `transform: translateY` sobre un elemento en flujo no superpone nada.** El elemento conserva su caja en el flujo; trasladarlo solo deja un hueco visible donde estaba su caja y lo pinta desplazado. Para que Journey **se superponga** a Story, su caja tiene que ocupar físicamente el mismo tramo de documento que Story (margen negativo) o salir del flujo. Lo que hoy se ve no es una superposición: es Journey moviéndose dentro de su propio hueco, con Story terminando antes.
2. **El cálculo del offset es un lazo de realimentación cerrado.** `getBoundingClientRect()` devuelve el rectángulo **ya transformado**. El handler deriva `scrollOffset` de `rect.top` y escribe ese valor en el `transform` que mueve `rect.top`. La variable no converge al progreso pretendido sino al punto fijo de su propia ecuación.
3. **`transition` sobre una propiedad gobernada por scroll frame a frame introduce latencia por diseño.** Cada tick de scroll arranca una transición de `motion.duration.slow`; el resultado va sistemáticamente por detrás del gesto.

Defectos menores del mismo commit, también corregidos aquí: `--journey-scroll-opacity` se escribe siempre a `"1"` (código muerto); el listener de `scroll` no coalesce por rAF ni está guardado por `IntersectionObserver`, a diferencia de `useStoryDeck` y `useSceneParallax`, que sí lo hacen en este mismo repo; y el efecto corre también en **tema claro**, donde no hay nada que animar.

## 3. Objetivo

En **tema oscuro**: al terminar la presentación de Story, Journey **sube desde el borde inferior del viewport y cubre a Story**, que permanece fija detrás hasta quedar tapada por completo. Journey ocupa el ancho total y el alto del dispositivo; su escena de parallax va a sangre; su contenido queda centrado y topado a 1280px, sobre `secondary[1100]`.

## 4. Decisiones de diseño

| # | Decisión | Porqué |
| --- | --- | --- |
| **D1** | Todo el encargo se implementa **solo en tema oscuro**. La rama clara de `Journey` no se toca (ni su caja, ni su tarjeta, ni su camino punteado, ni la figura). | La presentación de 6 diapositivas de Story —el punto de partida de la transición— solo existe en oscuro. Una superposición que arrancara desde una Story clara que no es presentación no tendría desde dónde empezar. Mismo criterio que D1 de la spec 2026-07-31. **Supuesto declarado, no consultado**: el usuario pidió no pausar salvo por datos que solo él pueda dar. |
| **D2** | La superposición es **CSS puro**: Journey lleva `margin-block-start` negativo de una pantalla y `position: relative; z-index: 1`. **Se borra por completo** el `useEffect`, el `journeyRef` y las variables `--journey-scroll-*` de `3394bcb`. | Es la contrapartida exacta de los tres defectos de §2. El `ScStage` de Story **ya** es `position: sticky`: mientras está pegado, cualquier hermano posterior con margen negativo le pasa por encima como consecuencia del flujo normal, sin medir nada, sin rAF y sin latencia. El navegador compone ese avance en el hilo del compositor; no hay JavaScript en el camino crítico del scroll. |
| **D3** | Se añade una **zona de hold** de una pantalla al final de la pista de Story: `STORY_DECK_TRACK_HEIGHT` pasa de `6 × 100dvh` a `(6 + 1) × 100dvh`. | Sin ella el solape se come el recorrido de la última diapositiva: con la pista de 6 pantallas, Journey empezaría a tapar a `progress = 0.8` (diapositiva 5 todavía activa) y la diapositiva 6 nunca se vería sin tapar. La zona de hold es el tramo en el que el `stage` sigue pegado, la presentación ya ha terminado y **lo único** que ocurre es que Journey sube. La aritmética completa está en §5. |
| **D4** | `useStoryDeck` gana una opción `tailScreens` (por defecto `0`): número de alturas de viewport al final de la pista que **no** forman parte del recorrido de diapositivas. `span = rect.height - vh - tailScreens × vh`. | La zona de hold no puede repartirse entre las diapositivas o el problema de D3 solo se desplaza. La opción se expresa en **pantallas** (adimensional), no en px: así se recalcula sola en cada `resize` sin que el hook tenga que conocer `dvh`. Se mantiene genérica —el hook sigue sin saber que gobierna Story— y con `0` por defecto no altera a ningún consumidor existente. |
| **D5** | El solape de Journey y la zona de hold de Story son **la misma medida** (una pantalla), declarada en dos constantes distintas (`JOURNEY_OVERLAY_RISE` y `STORY_DECK_TAIL_SCREENS`) y atada por un **test** que importa las dos y comprueba la igualdad. | Son dos secciones distintas: importar constantes de Story dentro de `journey.layers.ts` acoplaría los ficheros de datos de ambas. Pero la invariante es real y romperla deja un salto visible (si el solape es menor que el hold, aparece una banda de la escena de Story sin tapar; si es mayor, Journey empieza a subir con la diapositiva 6 todavía viva). Un comentario no impide la regresión; un test sí. |
| **D6** | Bajo `prefers-reduced-motion: reduce`, el margen negativo de Journey **se anula** (`margin-block-start: 0`). | Bajo `reduce`, `ScTrack` pasa a `height: auto` y `ScStage` a `position: static` (D6 de la spec 2026-07-31): ya no hay pin. Un margen negativo de una pantalla sobre un Story en flujo normal **taparía contenido real** de la última diapositiva. Es la misma clase de fallo que la spec anterior evitó al degradar la presentación a documento: perder movimiento es aceptable, perder contenido no. |
| **D7** | La sección oscura de Journey pasa a **sangre**: pierde `max-width` y `margin-inline: auto`; `min-height: 100dvh`; `display: grid; place-items: center`. La escena (`ScScene`, `position: absolute; inset: 0`) hereda esa caja y pasa a ocupar el viewport completo sin tocar `journeyCosmicPortal.parts.tsx`. | Es literalmente lo que pide el encargo ("la imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo"). `min-height` y no `height`: con seis pasos + cita, en viewports cortos el contenido excede una pantalla, y `height` fijo lo recortaría. Con `min-height` la escena crece con la sección y sigue cubriéndola entera. |
| **D8** | El contenido se acota con una constante **propia**, `JOURNEY_CONTENT_MAX_WIDTH = "1280px"`, en `journey.layers.ts`. `JOURNEY_PORTAL_MAX_WIDTH` (que hoy describe la caja de la **escena**) se **elimina**. | El 1280px del encargo ahora describe el contenido, no la escena — es otra medida con el mismo número. Dejar la constante vieja apuntando a la escena sería un nombre que miente; reutilizarla para el contenido escondería que ha cambiado de sujeto. Su otro uso, `JOURNEY_PORTAL_SIZES`, desaparece con D9. |
| **D9** | `JOURNEY_PORTAL_SIZES` pasa de `"(min-width: 1280px) 1280px, 100vw"` a `"100vw"`. | Con la escena a sangre, el `sizes` anterior le mentiría al navegador y le haría elegir la pista de 1024px en pantallas anchas. Mismo cambio y mismo motivo que D7 de la spec 2026-07-31 para `STORY_COSMIC_HEART_SIZES`. |
| **D10** | `background-color` se expresa como `theme.data.semantic.bg`, **no** como `palette.secondary[1100]` en crudo (que es lo que hace `3394bcb`). | Medido en el repo: `semantic.ts:63` declara `bg: color.secondary[1100]` para el tema oscuro — **es el mismo valor**, y como esta rama solo existe en oscuro (D1) el rol semántico da exactamente el color del encargo sin saltarse la capa de tokens. Es además el precedente ya fijado para el mismo `secondary[1100]` en D8 de la spec 2026-07-31. |
| **D11** | El `z-index: 1` de Journey se compara contra `ScStory`, que es `position: relative` **sin** `z-index` (auto). | Basta `1` para pintar por encima; no hace falta ningún token de `zIndex.ts`, cuyo tramo más bajo (`raised: 10`) ya está por encima de lo que este solape necesita. El navbar (`zIndex.stickyNav: 100`) queda intacto por encima de los dos. |

## 5. Aritmética de la coreografía (verificable)

Sea `T` la posición en documento del inicio de `ScTrack` y `1p` = una pantalla = `100dvh`. Con `STORY_SLIDES = 6`, `STORY_DECK_TAIL_SCREENS = 1`:

- Altura de pista: `(6 + 1) × 1p = 7p`.
- Recorrido del deck: `span = 7p − 1p (viewport) − 1p (tail) = 5p`. `progress = (scrollY − T) / 5p`.
- La diapositiva 6 (índice 5) es la activa cuando `round(progress × 5) = 5`, es decir `progress ≥ 0.9` → `scrollY ≥ T + 4.5p`.
- `progress` llega a 1 en `scrollY = T + 5p`.
- Journey empieza en documento en `T + 7p − 1p (solape) = T + 6p`. Su borde superior toca el borde inferior del viewport en `scrollY = T + 5p` y el superior en `scrollY = T + 6p`.
- El `stage` de Story está pegado mientras `scrollY ∈ [T, T + 6p]`; se despega exactamente en `T + 6p`.

Secuencia resultante:

| Tramo de `scrollY` | Qué se ve |
| --- | --- |
| `T + 4.5p … T + 5p` | Diapositiva 6 sola, a pantalla completa (medio scroll de reposo) |
| `T + 5p … T + 6p` | Journey sube desde el borde inferior sobre el Story pegado, hasta cubrir el viewport |
| `T + 6p` | Journey cubre el 100%; Story se despega **en ese mismo punto** — sin costura visible |

La igualdad entre "cuándo Journey cubre del todo" y "cuándo Story se despega" no es coincidencia: las dos valen `T + trackHeight − 1p` porque el solape y el hold son la misma pantalla (D5).

## 6. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `src/hooks/useStoryDeck.ts` | Nuevo parámetro opcional `tailScreens` y su resta en `span` |
| `src/hooks/useStoryDeck.test.tsx` | Test del nuevo `span` |
| `src/components/sections/Story/story.layers.ts` | `STORY_DECK_TAIL_SCREENS`; `STORY_DECK_TRACK_HEIGHT` pasa a `(SLIDES + TAIL) × H` |
| `src/components/sections/Story/Story.tsx` | Pasa `tailScreens` al hook (única línea que cambia) |
| `src/components/sections/Story/story.layers.test.ts` | Tests de las dos constantes |
| `src/components/sections/Journey/journey.layers.ts` | `JOURNEY_CONTENT_MAX_WIDTH`, `JOURNEY_OVERLAY_RISE` |
| `src/components/sections/Journey/Journey.tsx` | Borrado del hack JS; `ScJourney` a sangre + solape; `ScDarkContent` a `JOURNEY_CONTENT_MAX_WIDTH` |
| `src/components/journeyCosmicPortal/journeyCosmicPortal.layers.ts` | `JOURNEY_PORTAL_HEIGHT` → `100dvh`; `JOURNEY_PORTAL_SIZES` → `100vw`; se borra `JOURNEY_PORTAL_MAX_WIDTH` |
| `src/components/sections/Journey/Journey.test.tsx` | Tests nuevos (§7) |

## 7. Tests

Todos por **texto del CSS inyectado** (`injectedCss()`, patrón que este mismo fichero ya usa) o por constantes, **nunca** por `getComputedStyle` de algo que jsdom no evalúe. Lección vigente del repo (`task/lessons.md`, 2026-08-01): antes de escribir una aserción que dependa de que jsdom resuelva una propiedad, hay que demostrar con un sondeo desechable que sabe distinguir el caso bueno del malo.

1. **Solape declarado**: el CSS de la rama oscura declara `margin-block-start` con el valor de `JOURNEY_OVERLAY_RISE` en negativo. Falsable: sin la declaración, el bloque no contiene la cadena.
2. **Guard de `reduce`**: existe un bloque `@media (prefers-reduced-motion: reduce)` que devuelve `margin-block-start` a `0`. Es la protección de D6 y la que más barato se rompe en un refactor.
3. **Tope de contenido**: el CSS declara `max-width: 1280px` leyendo el valor de `JOURNEY_CONTENT_MAX_WIDTH`, no un literal escrito a mano (lección 2026-08-01: un recuento/medida escrito a mano deja de proteger en silencio).
4. **Regresión de `3394bcb`**: el CSS inyectado y el módulo **no** contienen `--journey-scroll-offset` ni `--journey-scroll-opacity`. Impide que el hack vuelva por copia-pega.
5. **Invariante D5**: `JOURNEY_OVERLAY_RISE === STORY_DARK_HEIGHT` y `STORY_DECK_TAIL_SCREENS === 1`.
6. **Pista**: `STORY_DECK_TRACK_HEIGHT` se deriva de `STORY_SLIDES + STORY_DECK_TAIL_SCREENS`, comprobado contra las constantes, no contra el literal `7`.
7. **`tailScreens` en el hook**: con `tailScreens = 1` el progreso alcanza 1 una pantalla antes que con `0`, para la misma geometría de pista.
8. **No-regresión de la rama clara**: los 8 tests claros existentes de `Journey.test.tsx` siguen verdes sin cambios.

## 8. Accesibilidad

- La sección conserva `id="journey"` y `aria-labelledby="journey-title"`; el solape es puramente visual y no cambia el orden del DOM ni el de tabulación.
- D6 es el requisito de accesibilidad duro de esta entrega: bajo `reduce` no hay solape y no se tapa nada.
- La escena sigue siendo `aria-hidden` y decorativa.
- Journey queda **encima** de Story en pintado, pero Story sigue en el DOM debajo; ningún contenido de Story queda oculto para un lector de pantalla, porque bajo `reduce`/sin JS la presentación degrada a documento completo.

## 9. i18n

Sin claves nuevas. `Home.journey.*` se consume igual en las dos ramas. No hay texto nuevo que traducir.

## 10. No-objetivos (YAGNI)

- **No** se toca la rama clara de `Journey` ni la de `Story`.
- **No** se regeneran los WebP de la escena. Con la escena a sangre, en viewports de más de 1280 px CSS a DPR 2 el activo de 2560 px queda submuestreado. Los másteres de 3344 px **no están versionados** (solo `assets/journey-cosmic-portal/manifest.json`), así que en esta entrega no se puede producir una pista mayor. Se declara como deuda conocida, no se disimula.
- **No** se añade snap, ni pin propio de Journey, ni scroll secuestrado.
- **No** se toca `useSceneParallax`, compartido por cuatro escenas.
- **No** se corrigen los fallos preexistentes del gate ajenos a esta entrega (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 11. Definición de "hecho"

- [x] Suite verde en su totalidad: `pnpm vitest run --maxWorkers=2` da **563/563** en 56 ficheros, frente a la baseline de **556** medida en este mismo HEAD antes de tocar nada. Ver la nota de §12 sobre por qué la cifra se reporta con concurrencia acotada.
- [x] `pnpm typecheck` y `pnpm lint` sin salida (exit 0). `pnpm check-format` señala solo `graphify-out/**`, ya señalado antes de esta entrega.
- [x] Transición verificada en navegador real. Medido a 1440×900: pista 6300 px (7 × 900); `margin-block-start: -900px`; `--story-progress` = 1.0000 en `scrollY` 5400, que es exactamente donde el borde superior de Journey toca el borde inferior del viewport; Journey cubre el 100% en 6300; el `stage` sigue en `top: 0` en 6300 y pasa a −20 en 6320, junto con Journey. Los dos últimos coinciden: no hay costura.
- [x] Escena a sangre medida en navegador: sección y escena a 1440 × 900 (= viewport) y contenido a 1280 px; en 375×812 la sección crece a 1039 px y la escena crece con ella (375 × 1039), sin scroll horizontal. `background-color` computado `oklch(0.22 0.093 311.928)` = `secondary[1100]`. Guard de `reduce` comprobado en el CSSOM del navegador, no solo en el texto inyectado.
- [x] Registro en el vault (`01-Projects/vti.md` + copia de esta spec) y en `task/todo.md` / `task/lessons.md`.

## 12. Desviaciones de implementación

**D5 lo escribió el hilo principal, no ninguno de los dos agentes.** El test de la invariante cruza los ficheros de datos de las dos secciones, y cada agente tenía el alcance acotado al suyo. Los dos, sin embargo, escribieron en su docblock que "la igualdad la ata un test", cada uno dando por hecho que lo escribiría el otro. Se escribió al integrar; hasta ese momento los dos comentarios describían algo que no existía. Lección registrada en `task/lessons.md`.

**Un test hubo que rediseñarlo por no ser falsable.** El guard de `reduce` se escribió primero con el patrón `css.split("@media (prefers-reduced-motion: reduce)").slice(1).join("\n")` que este mismo fichero ya usaba. Ese patrón arrastra todo el stylesheet acumulado, así que la aserción daba verde contra el `margin-block-start: 0.75rem` de OTRO componente y seguía verde al quitar la declaración real. Se rehízo aseverando sobre la línea concreta que a la vez es bloque `reduce` y menciona la propiedad.

**Prosa obsoleta fuera del alcance de los agentes.** `contact.layers.ts` y `features.layers.ts` citaban `JOURNEY_PORTAL_MAX_WIDTH` como precedente de su propia caja acotada. Al eliminarse esa constante, los dos comentarios pasaban a citar algo inexistente: se corrigieron en la integración.

**La cifra de la suite se reporta con la concurrencia acotada, no con `pnpm test` a secas.** Con los workers por defecto y la máquina cargada por la propia sesión, tres tests de página completa caen por **timeout de `waitFor`** (5956/6304/11819 ms), no por aserción. Se comprobó de quién era el fallo en vez de suponerlo: con `git stash push -- src/` el árbol vuelve a `3394bcb` y la misma ejecución **también falla ahí** (554/556, mismos tests), los ficheros pasan en aislamiento (17/17, tres veces), y bajando la concurrencia la suite entera pasa: **563/563 con `--maxWorkers=4`** y, en la ejecución de cierre —con la máquina ya más cargada, hasta el punto de que 4 workers también empezaron a dar un timeout—, **563/563 con `--maxWorkers=2`**. Es contención de CPU, no código. La suite estuvo verde con los workers por defecto tres veces hoy: 556/556 al abrir la sesión, 562/562 a mitad de entrega y 563/563 en la ejecución independiente del auditor QA.

**Auditoría adversarial sin hallazgos.** Un auditor QA independiente recalculó la aritmética de §5 desde el código (sin copiarla de aquí) y verificó los puntos de apilamiento, `place-items` y cobertura de la escena reproduciéndolos en Chromium real. Cerró los ocho puntos sin hallazgos bloqueantes, altos, medios ni bajos.
