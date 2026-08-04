# Spec — Journey como presentación de 8 diapositivas (tema oscuro)

**Fecha:** 2026-08-02 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `3394bcb` + la entrega de `2026-08-02-journey-overlay-transition-design.md` sin commitear

**Encargo del usuario (literal):**

> - seccion **Journey**: convertir la seccion en 8 diapositivas (1 titulo y introduccion + (1 por cada punto de la seccion) + texto nota final) manteniendo la vista del usuario atada (posible scroll-snap o carousell) pasando por las 8 diapositivas ocupando el ancho y alto de la vista del dispositivo. La imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo y el contenido debe estar a un maximo de 1280px de ancho. Estilo: experiencia visual. Background-color: secundary[1100].

---

## 1. Estado actual (medido, no de memoria)

Esta entrega se apila sobre la anterior del mismo día (`2026-08-02-journey-overlay-transition-design.md`, sin commitear en el árbol). Tras ella, en **tema oscuro**:

- `ScJourney` es una sección a sangre de `min-height: 100dvh`, con `background-color: semantic.bg`, `z-index: 1`, `overflow: hidden` y `margin-block-start: calc(-1 * JOURNEY_OVERLAY_RISE)` — el solape que la hace subir sobre el `stage` pegado de Story.
- Su contenido es **una sola pantalla**: `ScDarkContent` (tope `JOURNEY_CONTENT_MAX_WIDTH` = 1280px) con kicker + h2 + body + los 6 pasos como filas verticales + la cita, todo junto, revelado por `useReveal`.
- El fondo es `JourneyCosmicPortal` (6 capas, `ScScene` en `position: absolute; inset: 0`), ya a sangre.
- `useStoryDeck` gobierna la presentación de Story: escribe `--story-enter` / `--story-progress` sobre el `stage` y expone `index` / `direction`. Su docblock declara explícitamente que **no sabe que gobierna Story** y que puede gobernar cualquier presentación de N diapositivas.

**Los 8 tramos del encargo salen exactos, sin ambigüedad ni claves i18n nuevas.** Medido en `src/i18n/locales/es/home.json` → `Home.journey`: `kicker` + `title` + `body` (la intro), `steps` con **6** entradas (`discover`, `learn`, `imagine`, `create`, `share`, `evolve` — cada una con `label` y `body`) y `quote` (la nota final). **1 + 6 + 1 = 8.**

## 2. Objetivo

En tema oscuro, Journey deja de ser una pantalla y pasa a ser una **presentación de 8 diapositivas a pantalla completa**, con la vista atada mientras se recorren. La escena de parallax sigue a sangre y el contenido sigue topado a 1280px, sobre `secondary[1100]`. La entrada a la presentación es la que ya existe: el solape sobre Story de la entrega anterior.

## 3. Decisiones de diseño

| # | Decisión | Porqué |
| --- | --- | --- |
| **D1** | Solo **tema oscuro**. La rama clara de `Journey` (tarjeta pastel + camino punteado + rejilla de 6 discos + figura) no se toca. | Mismo criterio que D1 de las specs 2026-07-31 y 2026-08-02: la presentación nace de la transición desde Story, que solo existe en oscuro. |
| **D2** | La técnica es **pin por `position: sticky` sobre una pista alta**, exactamente la de Story. **No** se añade `scroll-snap`. | El encargo dice "posible scroll-snap o carousell": es una sugerencia de medio, no un requisito. El snap **ya se probó en esta landing y se retiró el 2026-07-31** tras medirlo — con anclas de una pantalla, `proximity` degeneraba en `mandatory` y producía tirones de hasta 240px, a veces en contra del gesto (el razonamiento y las medidas siguen escritos al final de `story.deck.tsx`). Reintroducirlo sería repetir un experimento ya hecho y ya perdido. El pin por sí solo cumple "la vista del usuario atada", que es el requisito real. |
| **D3** | El número de diapositivas se **deriva**: `JOURNEY_SLIDES = JOURNEY_STEPS.length + 2` (intro + N pasos + cita). Nunca el literal `8`. | Lección vigente del repo (`task/lessons.md`, 2026-08-01): un recuento escrito a mano deja de proteger en silencio en cuanto la fuente cambia — pasó literalmente en este mismo fichero de tests con las capas de la escena. Un test ata que hoy vale 8 y explica el reparto. |
| **D4** | `useStoryDeck` se **generaliza y renombra a `useSlideDeck`** (`src/hooks/useSlideDeck.ts`), con los parámetros opcionales agrupados en un objeto: `{ tailScreens?: number; cssVarPrefix?: string }`. `cssVarPrefix` gobierna el nombre de las variables CSS que escribe (`--<prefix>-enter` / `--<prefix>-progress`), con `"deck"` por defecto. Story pasa `"story"`; Journey pasa `"journey"`. | El hook ya prometía en su docblock servir a cualquier presentación de N diapositivas; hoy la gobierna una segunda, así que el nombre `useStoryDeck` pasaría a mentir. Y sin `cssVarPrefix`, el `stage` de Journey llevaría variables `--story-*`: un lector que las viera ahí buscaría una relación con Story que no existe. Que Story pase `"story"` explícitamente deja `story.deck.tsx` **sin un solo cambio de CSS**: el renombrado no arrastra riesgo visual a la sección que ya funciona. |
| **D5** | Journey **no** hereda la apertura por escala del `stage` (`--story-enter` → `scale`/`border-radius`). La variable se sigue escribiendo (es el contrato del hook) pero **no la consume nadie** en Journey. | Story se abre con una escala porque venía de un Hero sin ninguna transición: había que anunciar "esto pasa a modo presentación". La entrada de Journey **ya existe y es el solape** (D2 de la spec anterior de hoy). Encadenar una escala detrás de la subida serían dos animaciones de entrada compitiendo por el mismo instante. |
| **D6** | **Sin "rewind".** `direction` no se consume y no se renderiza ningún `data-dir` en Journey. | El carácter de rewind fue un requisito literal del encargo de Story ("se vea una animacion estilo rewind"). Este encargo no lo pide. Añadirlo por simetría sería alcance inventado. |
| **D7** | `ScJourney` **pierde `overflow: hidden`**. El recorte del overscan de la escena pasa a `ScJourneyStage`. | Trampa ya pagada una vez en este repo y documentada en `story.deck.tsx` (D15b/D15c): **cualquier ancestro con `overflow` distinto de `visible`/`clip` rompe el `position: sticky` de un descendiente**. Si `ScJourney` conservara el suyo, el pin no engancharía y la presentación entera no funcionaría — sin ningún error, solo scroll normal. El `stage` sí puede recortar: no es ancestro de sí mismo. |
| **D8** | El alto de la sección **deja de vivir en `journeyCosmicPortal.layers.ts`**: `JOURNEY_PORTAL_HEIGHT` se elimina y nace `JOURNEY_DARK_HEIGHT = "100dvh"` en `journey.layers.ts` (mismo nombre y mismo rol que `STORY_DARK_HEIGHT`). | Esa constante nunca describió la escena, describía la caja de la SECCIÓN — vivía en el fichero del fondo por herencia. Ahora además cambia de sujeto (pasa a ser el alto del `stage`), así que moverla es el momento correcto: `journeyCosmicPortal.layers.ts` vuelve a hablar solo de la escena. |
| **D9** | La pista de Journey **no lleva cola**: `JOURNEY_DECK_TRACK_HEIGHT = calc(JOURNEY_SLIDES * JOURNEY_DARK_HEIGHT)` y `tailScreens: 0`. | La cola de Story existe porque Journey tiene que superponérsele. Ninguna sección tiene que superponerse a Journey — Features no lo pide. Se declara explícitamente, y con un test, para que la ausencia de cola se lea como decisión y no como olvido. |
| **D10** | Escala tipográfica de cartel **propia** en `journey.layers.ts`, no importada de `story.layers.ts`, y **calibrada contra el texto real** de esta sección. | Acoplar las escalas haría que retocar el cartel de una moviera el de la otra. Y los contenidos no son equivalentes: la nota de cierre de Story es "nuevo comienzo" (14 caracteres, de ahí su tope de 8rem), mientras que la cita de Journey es "El destino no es el infinito. El viaje lo es." (45 caracteres) — a 8rem ocuparía media pantalla en varias líneas. Los tamaños concretos están en §5. |
| **D11** | La diapositiva de paso se compone **icono → número → etiqueta → cuerpo**, en filas, no `01 · Etiqueta` en una sola línea como hoy. | "01 · Descubre" a tamaño de cartel (3rem) hace que el ordinal pese lo mismo que la palabra que importa. Separado, el número queda como marcador de posición pequeño (rol de `overline`, en el color de rampa del paso) y la etiqueta se lleva el tamaño de cartel entera. El icono crece de 20px a `JOURNEY_DECK_STEP_ICON_SIZE`: en una fila de lista era un adorno, en una diapositiva a pantalla completa es el ancla visual. |
| **D12** | Bajo `prefers-reduced-motion: reduce` la presentación **se desmonta como tal**: pista a `height: auto`, `stage` a `position: static`, deck a `display: block`, las 8 diapositivas en flujo y todas visibles. | Idéntico razonamiento que D6 de la spec 2026-07-31: congelar la presentación dejaría 7 de 8 diapositivas invisibles, y eso es perder **contenido**, no movimiento. El `margin-block-start: 0` del solape bajo `reduce` ya existe de la entrega anterior y sigue siendo necesario. |
| **D13** | Rail decorativo de `JOURNEY_SLIDES` marcas, `aria-hidden`, que refleja `data-slide` por CSS puro y se retira bajo `reduce`. | Mismo patrón y mismo porqué que el de Story: con la vista atada, "por dónde voy" es información que el usuario pierde al no ver la barra de scroll avanzar como espera. Bajo `reduce` deja de tener sentido: todas las diapositivas están ya a la vista. |
| **D14** | **Un solo encabezado** en toda la sección: el `h2#journey-title` de la diapositiva de intro. Las etiquetas de paso son `<p>`, no `<h3>`. | Regla dura ya aplicada en Story (Task 2 de su spec de tipografía) y verificada por el test de página completa que exige un único `h1` y su orden respecto al primer `h2`. `aria-labelledby` de la sección sigue apuntando a ese id. |
| **D15** | La rama oscura se extrae a un componente hijo `JourneyDeckDark`; `useReveal` se queda **solo** en la rama clara. | Copia exacta del problema que Story documentó: `useSlideDeck` llama `window.matchMedia` incondicionalmente en su efecto de montaje, y las reglas de los hooks prohíben llamarlo "solo si el tema es oscuro" dentro de `Journey()`. Si se llamara ahí, correría también en tema claro y rompería los tests claros existentes, que no stubean `matchMedia` porque nunca lo necesitaron. React no ejecuta los hooks de un componente que no renderiza. |
| **D16** | **Enmienda posterior del usuario (mismo día): la numeración de los pasos se RETIRA de la rama oscura.** La diapositiva de paso pasa de icono → número → etiqueta → cuerpo (D11) a **icono → etiqueta → cuerpo**. Se eliminan `ScJourneyStepNumber` y `JOURNEY_DECK_STEP_NUMBER_SIZE`. | Encargo literal: «CAMBIO IMPORTANTE: Quita las numeraciones de la seccion Journey». El alcance SÍ se consultó, porque la numeración vive también en la rama clara como `01 · Descubre`, transcrita verbatim del mockup aprobado, y quitarla de ahí habría tocado diseño aprobado: el usuario respondió **solo la rama oscura**. Efecto colateral que no es cosmético y se resuelve en la misma entrega: el número era la pieza que separaba el icono del texto (`margin-block-start: space[4]`), y la etiqueta llevaba un hueco de `space[2]` pensado para ir pegada DEBAJO del número; al desaparecer el número, la etiqueta hereda el `space[4]` que el icono tenía reservado. |

## 4. Arquitectura

```
ScJourney ($fullBleed)          position: relative; z-index: 1; background-color: semantic.bg;
                                margin-block-start: calc(-1 * JOURNEY_OVERLAY_RISE);
                                SIN overflow (D7)   ·   @media reduce { margin-block-start: 0 }
└── ScJourneyTrack              position: relative; height: JOURNEY_DECK_TRACK_HEIGHT
                                @media reduce { height: auto }
    └── ScJourneyStage          position: sticky; top: 0; height: JOURNEY_DARK_HEIGHT; overflow: hidden
                                @media reduce { position: static; height: auto }
        ├── ScJourneySceneWrap  absolute, sobredimensionado ±JOURNEY_SCENE_DEPTH_SHIFT,
        │   └── JourneyCosmicPortal        translateY(shift * --journey-progress)
        ├── ScJourneyDeck       z-index 1; height 100%; max-width JOURNEY_CONTENT_MAX_WIDTH;
        │   │                   margin-inline auto; grid; place-items center
        │   └── ScJourneySlide × 8         grid-area 1/1; data-state past|current|next
        └── ScJourneyRail       8 marcas, aria-hidden
```

La escena a sangre y el contenido topado a 1280px conviven porque el tope lo lleva `ScJourneyDeck`, no el `stage`: es el mismo reparto que ya usa Story (D11 de su spec).

**Reparto de las 8 diapositivas:**

| # | Índice | Contenido | Claves i18n |
| --- | --- | --- | --- |
| 1 | 0 | Kicker + `h2#journey-title` + cuerpo de intro | `Home.journey.kicker` / `.title` / `.body` |
| 2–7 | 1–6 | Icono + número + etiqueta + cuerpo, uno por paso | `Home.journey.steps.<id>.label` / `.body` |
| 8 | 7 | La cita, con el degradado de texto que ya existe | `Home.journey.quote` |

## 5. Constantes nuevas (`journey.layers.ts`)

| Constante | Valor | Justificación |
| --- | --- | --- |
| `JOURNEY_DARK_HEIGHT` | `"100dvh"` | Alto del `stage` = una pantalla, que es lo que pide el encargo. Sustituye a `JOURNEY_PORTAL_HEIGHT` (D8). |
| `JOURNEY_SLIDES` | `JOURNEY_STEPS.length + 2` | Derivado (D3). Hoy = 8. |
| `JOURNEY_DECK_TRACK_HEIGHT` | `calc(JOURNEY_SLIDES * JOURNEY_DARK_HEIGHT)` | Sin cola (D9). |
| `JOURNEY_SLIDE_SHIFT` | `"40px"` | Mismo criterio que `STORY_SLIDE_SHIFT`: se lee como un paso, no como un salto de layout. Solo se anima junto a `opacity`. |
| `JOURNEY_SCENE_DEPTH_SHIFT` | `"6dvh"` | Con el `stage` pegado, `rect.top` de la escena se queda en ~0 y el término de scroll de `useSceneParallax` deja de aportar profundidad. Mismo recurso, misma magnitud y **misma unidad `dvh`** que Story — la unidad no es un detalle: un `%` en `translateY` se resuelve contra el propio elemento y en `top`/`bottom` contra el contenedor, y con el envoltorio sobredimensionado esas dos alturas ya no coinciden. Ese fallo (una banda de fondo asomando por arriba al scrollear) ya se pagó una vez en Story; aquí se hereda la solución, no el bug. |
| `JOURNEY_DECK_TITLE_SIZE` | `clamp(2rem, 6vw, 4rem)` | Mismo rol y contenido de largo comparable que el h2 de intro de Story ("Tu viaje no tiene un último paso.", 33 caracteres). |
| ~~`JOURNEY_DECK_STEP_NUMBER_SIZE`~~ | ~~`"0.8125rem"`~~ | **RETIRADA en D16**: el ordinal desaparece de la rama oscura por enmienda del usuario, y la constante se queda sin sujeto. |
| `JOURNEY_DECK_STEP_LABEL_SIZE` | `clamp(1.75rem, 5vw, 3rem)` | Una sola palabra por paso (máx. "Evoluciona", 10 caracteres): mismo tramo que el título de pilar de Story. |
| `JOURNEY_DECK_STEP_BODY_SIZE` | `clamp(1rem, 1.4vw, 1.115rem)` | Cuerpos de 60–80 caracteres: mismo tramo que el cuerpo de pilar de Story, que es el mismo rol de lectura. |
| `JOURNEY_DECK_STEP_ICON_SIZE` | `"48px"` | En la fila era 20px; a pantalla completa el icono pasa a ser el ancla visual de la diapositiva (D11). Necesita regla `& > svg` propia: `GlobalStyles` fuerza `svg { width: 100% }` y el atributo `width` del icono pierde la cascada (lección ya pagada dos veces en este repo — el Logo y `ScDisc`). |
| `JOURNEY_DECK_QUOTE_SIZE` | `clamp(1.75rem, 5.5vw, 3.5rem)` | **Calibrado, no copiado.** La nota de Story es de 14 caracteres y por eso admite 8rem; esta cita tiene 45. A 8rem serían varias líneas gigantes; a 3.5rem entra como cartel legible sin comerse la escena. |
| `JOURNEY_DECK_PADDING_INLINE_END` | `"8rem"` | Solo ≥ `lg`. Mismo recurso que `STORY_DECK_PADDING_INLINE_END`: rompe a propósito la simetría del padding para desplazar la columna de texto a la izquierda y dejar respirar el lado por el que la escena tiene su figura y su camino de luz. |

## 6. Aritmética de la coreografía (verificable)

`T` = inicio de la pista de Story en documento; `p` = una pantalla (`100dvh`). Con Story en 6 diapositivas + 1 de cola y Journey en 8 sin cola:

- Pista de Story: `7p`. Journey empieza en `T + 7p − 1p = T + 6p` (solape de la entrega anterior).
- El `stage` de Story se despega en `T + 6p`; Journey cubre el viewport en `T + 6p`. **Coinciden** (invariante ya atada por test).
- Pista de Journey: `8p`, `span = 8p − 1p (viewport) − 0 (sin cola) = 7p`. Su `stage` queda pegado mientras `scrollY ∈ [T + 6p, T + 13p]`.
- `progress = (scrollY − (T + 6p)) / 7p`. `index = round(progress × 7)`.
- La diapositiva 8 (índice 7) es la activa cuando `progress ≥ 1 − 0.5/7 ≈ 0.9286`, es decir `scrollY ≥ T + 12.5p`; le queda media pantalla de reposo antes de que la pista termine en `T + 14p`.

La página crece 7 pantallas netas: Journey pasa de ocupar `1p` (con `1p` de solape) a ocupar `8p` (con el mismo `1p` de solape).

## 7. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `src/hooks/useStoryDeck.ts` → `src/hooks/useSlideDeck.ts` | Renombrado + opciones `{ tailScreens, cssVarPrefix }` |
| `src/hooks/useStoryDeck.test.tsx` → `src/hooks/useSlideDeck.test.tsx` | Renombrado + test del prefijo |
| `src/components/sections/Story/Story.tsx` | Import y llamada con el objeto de opciones (`cssVarPrefix: "story"`) |
| `src/components/sections/Journey/journey.layers.ts` | Constantes de §5 |
| `src/components/sections/Journey/journey.layers.test.ts` | **Nuevo** — derivación de `JOURNEY_SLIDES`, pista sin cola, invariantes |
| `src/components/sections/Journey/journey.deck.tsx` | **Nuevo** — styled estructurales de la presentación |
| `src/components/sections/Journey/Journey.tsx` | Rama oscura → `JourneyDeckDark`; se borran los styled `ScDark*` que quedan sin consumidor |
| `src/components/sections/Journey/Journey.test.tsx` | Tests de la presentación; los claros no se tocan |
| `src/components/journeyCosmicPortal/journeyCosmicPortal.layers.ts` | Se borra `JOURNEY_PORTAL_HEIGHT` (D8) |

## 8. Tests

Por atributos y por texto del CSS inyectado, nunca por `getComputedStyle` de algo que jsdom no evalúe (`@media`, `calc()` con unidades de viewport). Cada aserción nueva debe demostrarse **falsable** rompiendo a propósito lo que protege.

1. **Reparto**: `JOURNEY_SLIDES === JOURNEY_STEPS.length + 2` y hoy vale 8; la pista se deriva de `JOURNEY_SLIDES × JOURNEY_DARK_HEIGHT` **sin cola** (comparado contra las constantes, nunca contra `8`).
2. **Las 8 diapositivas se montan**: hay exactamente `JOURNEY_SLIDES` nodos con `data-slide-index`, y sus índices son `0..JOURNEY_SLIDES-1` sin huecos.
3. **Estado inicial**: la 0 es `current`, las demás `next`; al mover el índice del hook, `past`/`current`/`next` cambian en consecuencia.
4. **Contenido íntegro**: kicker, título, los 6 pares etiqueta/cuerpo y la cita siguen presentes, con el mismo i18n que la rama clara (ninguna diapositiva pierde texto en el reparto).
5. **Un solo encabezado**: exactamente un `h2` en la sección, y es `#journey-title`.
6. **Pin declarado**: el CSS declara `position: sticky` para el `stage` y **no** hay `overflow` distinto de `visible` en `ScJourney` (guard de D7 — es el fallo que rompería la presentación entera en silencio).
7. **Guards de `reduce`**: existe el bloque que devuelve la pista a `height: auto`, el `stage` a `position: static` y las diapositivas a `opacity: 1`.
8. **Tope de contenido**: `max-width` = `JOURNEY_CONTENT_MAX_WIDTH`, leído de la constante.
9. **Prefijo de variables CSS**: `useSlideDeck` con `cssVarPrefix: "journey"` escribe `--journey-progress` y **no** `--story-progress`.
10. **No-regresión**: los tests de la rama clara de Journey y los 25 de Story siguen verdes sin tocarlos.
11. **Segunda mitad de la invariante D5** (añadida al integrar, no estaba en el plan inicial): `JOURNEY_OVERLAY_RISE` tiene que medir además exactamente un `JOURNEY_DARK_HEIGHT`. El test que ya existía ataba el solape contra la cola de Story, y eso deja un hueco: bajar `JOURNEY_DARK_HEIGHT` a `90dvh` —el valor que la sección tenía antes de la entrega de la tarde— dejaría el `stage` más corto que la pantalla y haría asomar una banda del fondo en el relevo, con las dos constantes de la primera aserción todavía cuadrando entre sí. Comprobado: con `90dvh`, **solo** este test se pone rojo (`expected 100 to be 90`) — los otros 26 siguen verdes, que es precisamente la medida del hueco que cierra.
12. **La escena bajo `reduce`** (añadido tras la auditoría adversarial): el envoltorio de la escena declara, dentro del bloque de `reduce`, `top: 0`, `bottom: auto`, una altura explícita leída de `JOURNEY_DARK_HEIGHT` y `transform: none`. Es el único guard de `reduce` que no se deduce mirando el elemento que protege — el porqué está en §13.

## 9. Accesibilidad

- Un único encabezado (D14); `aria-labelledby` intacto.
- D12 es el requisito duro: bajo `reduce` no se pierde ni una diapositiva de contenido.
- Las diapositivas no activas llevan `pointer-events: none` pero siguen en el DOM y en el orden de lectura, igual que en Story.
- La escena sigue `aria-hidden`.

## 10. i18n

Sin claves nuevas. El reparto usa exactamente las que ya existen. Paridad es/en ya garantizada por el test existente sobre `steps`.

## 11. No-objetivos (YAGNI)

- **No** se añade `scroll-snap` (D2), ni contenedor de scroll anidado, ni secuestro de la rueda.
- **No** se añade rewind (D6) ni apertura por escala del `stage` (D5).
- **No** se toca la rama clara de Journey ni ninguna rama de Story más allá de la llamada al hook.
- **No** se toca `useSceneParallax`, compartido por cuatro escenas.
- **No** se regeneran los WebP: sigue vigente la deuda declarada en la spec anterior (activo de 2560px submuestreado por encima de 1280px CSS a DPR 2; másteres de 3344px no versionados).
- **No** se corrigen los fallos de gate ajenos (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 12. Definición de "hecho"

- [x] Suite completa verde: `pnpm vitest run --maxWorkers=2` da **587/587** en **57 ficheros** (585 al cerrar los dos agentes; +1 por la invariante añadida al integrar, +1 por el guard de `reduce` de la escena que salió de la auditoría, −1 por D16 que retira el test del ordinal al quedarse sin sujeto, +1 por el mismo guard aplicado a Story con autorización del usuario), frente a los 563/56 con que empezó esta entrega (585 al cerrar los dos agentes, más el test 11 de §8 que añadió el hilo principal al integrar y el test 12 que salió de la auditoría adversarial). La concurrencia acotada es la misma condición que la entrega anterior de hoy y por el mismo motivo (§13).
- [x] `pnpm typecheck` y `pnpm lint` sin salida (exit 0). `pnpm check-format` no señala ninguna ruta de `docs`/`src`/`task`/`app`; solo `graphify-out/**`, generado y ya señalado antes.
- [x] Verificado en navegador real, midiendo, no mirando (§13 explica por qué no hay capturas). A `1280×720`: pista de Story 7 pantallas (5040), pista de Journey **8 pantallas** (5760), solape 720 = 1 pantalla, `overflow` de `ScJourney` = `visible` (D7 vivo), `stage` `sticky` de `1280×720` = viewport completo, deck de `1280` con `max-width: 1280px`, **8** nodos `data-slide-index` con índices `0..7` sin huecos, 8 marcas de rail, y el `h2#journey-title` como **único** encabezado de la sección.
- [x] Recorrido completo medido, con el `stage` en `top: 0` en todos los tramos: `progress` `0.0000 → 0.1429 → 0.2857 → 0.4286 → 0.5714 → 0.7143 → 0.8571 → 0.9286 → 1.0000` e `index` `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7`, con el texto de la diapositiva activa cambiando en cada tramo (intro, los seis pasos por orden, la cita). El `stage` se despega en `10080`, justo cuando `progress` llega a 1.
- [x] Solape con Story sin costura: en `scrollY` 5040 el `stage` de Story está en `top: 0` y el borde superior de la sección de Journey también en `0` — la entrega cubre y la anterior se despega en el mismo punto. En `4680`, a mitad de la subida, la sección de Journey está en `360` = media pantalla.
- [x] Los seis guards de `prefers-reduced-motion: reduce` comprobados en el **CSSOM del navegador**, no solo en el texto inyectado: sección `margin-block-start: 0px`, pista `height: auto`, stage `position: static; height: auto`, deck `display: block; height: auto`, diapositiva `opacity: 1; transform: none; pointer-events: auto`, rail `display: none`.
- [x] Tema claro intacto: `margin-block-start: 0`, `z-index: auto`, `max-width: 1200px`, la tarjeta y la figura con `alt` en su sitio, **cero** nodos `data-slide-index`, un solo `h2`.
- [x] Registro en el vault y en `task/`.

## 13. Desviaciones de implementación

**El número de diapositivas del hook y su prefijo de variables no se pudieron verificar por captura: no hay ni una sola imagen de esta entrega.** La captura del panel de navegador **no compone el contenido `position: sticky`**: devuelve el `background-color` de la sección, plano, aunque el DOM esté correcto. No se dio por supuesto — se aisló con un control: se capturó **Story**, que esta entrega no toca (solo cambia su llamada al hook) y que se capturó bien esta misma mañana, y sale igual de plana. Con dos secciones, una de ellas ajena a la entrega, fallando de la misma forma, la causa es la herramienta. Como contraprueba, el Hero (que no lleva `sticky`) se captura perfecto en la misma sesión y el mismo tab. Toda la verificación de §12 es por medición de DOM/CSSOM/geometría, que es lo que sostiene la coreografía. **El pendiente quedó cerrado por el usuario**, que revisó la sección en su navegador y confirmó que se compone correctamente — el único punto de esta entrega que ninguna herramienta de esta sesión podía cubrir.

**Antes de eso hubo un falso positivo que casi se reporta como regresión.** La primera tanda de medidas dio `--journey-progress` vacío, `data-slide` congelado en `0` y —lo que lo delató— **Story igual de muerto**, siendo Story código que esta entrega apenas toca. La causa no era el código: el tab del panel estaba en segundo plano (`document.hidden === true`), y un tab oculto no despacha eventos de `scroll`, no ejecuta `IntersectionObserver` ni corre `requestAnimationFrame`. Comprobado montando un `IntersectionObserver` y un listener de `scroll` propios: **cero callbacks** con el scroll moviéndose de verdad. Con el tab al frente, las mismas medidas salen exactas. Es el mismo síntoma que ya está registrado en `task/lessons.md` (2026-07-27, "la pestaña oculta congela el reloj de las animaciones"); se añade la regla operativa que faltaba: comprobar `document.hidden` **antes** de medir.

**La auditoría adversarial encontró un defecto real, y su arreglo propuesto no servía.** Bajo `prefers-reduced-motion: reduce`, `ScJourneyStage` pasa a `position: static` y con ello deja de ser el _containing block_ de `ScJourneySceneWrap`, que sigue siendo absoluto. El containing block sube entonces a `ScJourneyTrack` (`position: relative` incondicional), cuya altura bajo `reduce` es `auto` — las 8 diapositivas apiladas, varias pantallas. Las seis capas de la escena (`object-fit: cover`) se estiraban a esa altura: el arte quedaba recortado a una franja vertical con un zoom brutal. No se perdía ni una palabra de texto, así que D12 se cumplía en su letra y **ningún test de contenido lo habría visto**.

El arreglo que proponía la auditoría —devolverle al `stage` un `position: relative` bajo `reduce`— **no cierra el fallo**: el `stage` seguiría midiendo `height: auto`, o sea las mismas 8 pantallas, y el estiramiento sería idéntico. Lo que lo cierra es dar al envoltorio una **altura explícita de una pantalla anclada arriba** (`top: 0; bottom: auto; height: JOURNEY_DARK_HEIGHT; transform: none`), que es correcto sea cual sea el ancestro que acabe haciendo de containing block. Se prefiere eso a `display: none` porque bajo `reduce` se degrada el MOVIMIENTO, no la identidad visual: la escena aparece una vez, con sus proporciones intactas, detrás de la primera diapositiva, y el resto del recorrido queda sobre el `secondary[1100]` del encargo. Atado por el test 12 de §8, comprobado falsable (quitando la altura explícita: `expected … to contain 'height: 100dvh'`).

**El mismo patrón existía en `story.deck.tsx`, y el usuario autorizó cerrarlo.** `ScStage` de Story pasaba igualmente a `position: static` bajo `reduce` con un `ScSceneWrap` absoluto sin guard: mismo defecto, preexistente desde el 2026-07-31 y ajeno al brief. Se señaló sin tocarlo y se preguntó; con el «arréglalo» del usuario se aplicó **el mismo guard**, con su propio test falsable en `Story.test.tsx` (quitando la altura explícita: `expected … to contain 'height: 100dvh'`). Las dos secciones quedan con la misma degradación bajo `reduce`: la escena aparece una vez, con proporciones intactas, detrás de la primera diapositiva.

**Recaída en una lección propia del repo.** El comentario que documenta ese guard se escribió, la primera vez, con backticks alrededor de `reduce` y `position: static`. Vive DENTRO del template literal de styled-components, donde un backtick cierra la cadena: rompió el build con `Expected ";" but found "reduce"`. Es exactamente la lección del 2026-07-25 que ya está escrita en `task/lessons.md`. Se reescribió sin backticks y se dejó dicho en el propio comentario por qué no los lleva.

**La enmienda D16 llegó después de cerrar la entrega, y se trató como cambio, no como parche.** No bastaba con borrar el nodo del número: el test que comprobaba la composición de la diapositiva quedaba documentando algo falso en su propio título, y la separación entre el icono y la etiqueta la gobernaba precisamente la pieza eliminada. Los dos tests afectados se reescribieron —título incluido— y ganaron una aserción NEGATIVA explícita (que ningún `0N` aparece en la diapositiva de paso), que es la mitad que de verdad protege el encargo: sin ella seguirían verdes si alguien reintrodujera la numeración. Verificado en navegador real con el tab al frente: las seis diapositivas de paso leen «Descubre …», «Aprende …» sin ordinal, y la rama clara conserva intactos sus `01 · Descubre` … `06 · Evoluciona`.

**Dos excepciones de color respecto a la regla general de los tipográficos de cartel.** `ScJourneyStepIconBox` y `ScJourneyStepNumber` toman el color de la rampa del paso (`stepColor`), no `semantic.text`. Es lo que pide D11 y lo que esas dos piezas ya hacían en las dos ramas anteriores: son marcadores por dato, no texto genérico del cartel — mismo precedente que `ScPillarNumber` en `Story.tsx`.

**`stepColor` se duplica en `journey.deck.tsx`** en vez de importarse de `Journey.tsx`. Son ocho líneas, y la alternativa era invertir la dirección de dependencia: `story.deck.tsx` nunca importa nada de `Story.tsx` y este fichero mantiene el mismo límite. Duplicar aquí es más barato que acoplar un fichero estructural a su consumidor.

**`ScJourneyStage` no declara `background-color`, a diferencia de `ScStage` en Story.** Story lo necesita porque su stage se ESCALA durante la apertura (`--story-enter`) y el borde que asoma detrás tiene que ser el color del encargo. Journey no interpola ninguna escala (D5), así que no hay borde que cubrir: declararlo sería una línea que no explica nada.

**Ocho referencias en prosa a `useStoryDeck` quedaron obsoletas** con el renombrado (D4) — cuatro en `Story.tsx`, una en `story.deck.tsx`, una en `story.layers.ts` y dos en `useSceneParallax`. El agente que hizo el renombrado las declaró en su informe en vez de tocarlas, porque su alcance de edición estaba acotado; las corrigió el hilo principal al integrar. En las dos de `useSceneParallax`, que son citas históricas de una lección fechada, se conserva el nombre viejo entre paréntesis para que la cita siga siendo localizable.

**Herramienta, no producto: `.claude/launch.json` no sirve para arrancar el preview de este repo.** Declara `port: 3000` con `autoPort: true`, pero `runtimeArgs` es `["dev"]` sin `-p`, así que `next dev` **siempre** se ata a 3000 mientras el harness comprueba salud en el puerto que él asignó — el servidor se da por muerto y se mata. Ocurrió dos veces hoy. No se corrige aquí porque es configuración de entorno y está fuera de este encargo; se deja anotado.
