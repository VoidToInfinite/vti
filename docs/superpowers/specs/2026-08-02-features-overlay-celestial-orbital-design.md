# Spec — Transición Journey→Features por superposición + Features a sangre con la escena «Celestial Orbital»

**Fecha:** 2026-08-02 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `6eb4653`

**Encargo del usuario (literal):**

> - scroll: al hacer scroll desde la seccion **Journey** en la ultima diapositiva, cuando se hace scroll hacia abajo para pasar a la seccion **Features**, la seccion **Features** debe ir apareciendo de forma vertical hacia arriba superponiendose a la seccion **Journey**. Estilo: transicion apareciendo desde abajo hasta alcanzar el alto, ocupando el ancho total y el alto del dispositivo igual que la seccion **Journey**.
> - seccion **Features**: cambiar las imagenes y convertir la imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo y el contenido debe estar a un maximo de 1280px de ancho. Estilo: experiencia visual. Background-color: secundary[1100].

Adjunto del encargo: `Features_Dark_Theme_2_celestial_parallax_capas_3_FIXED.zip` (Downloads).

---

## 1. Estado actual (medido en el árbol, no de memoria)

`git rev-parse HEAD` = `6eb4653c57bf1dc567649ba704ce931f6d4fa264`, rama `feature/landing-motion-interactions`, `git status --porcelain` vacío.

Estructura vigente de las dos secciones en **tema oscuro**:

| Pieza | Medida hoy | Fichero |
| --- | --- | --- |
| `ScJourney` (`$fullBleed`) | `position: relative; z-index: 1; background-color: semantic.bg; margin-block-start: calc(-1 * 100dvh)` | `Journey.tsx:103` |
| `ScJourneyTrack` | `height: calc(8 × 100dvh)` = `JOURNEY_DECK_TRACK_HEIGHT`, **sin cola** | `journey.deck.tsx:45`, `journey.layers.ts:244` |
| `ScJourneyStage` | `position: sticky; top: 0; height: 100dvh; overflow: hidden` | `journey.deck.tsx:68` |
| `useSlideDeck` en Journey | `{ cssVarPrefix: "journey" }` — **sin `tailScreens`** (defecto `0`) | `Journey.tsx:606` |
| `ScFeatures` (`$fullBleed`) | `position: relative; overflow: hidden; max-width: 1280px; min-height: 80vh; margin-inline: auto; flex; justify-content: flex-end` | `Features.tsx:95` |
| `FeaturesCelestialGuide` → `ScScene` | `position: absolute; inset: 0` (por tanto, hoy: 1280 × ≥80vh) | `featuresCelestialGuide.parts.tsx:14` |
| Escena de Features | 10 capas WebP, blending **aditivo** (`plus-lighter`, fallback `screen`) sobre `--void #02040e` | `featuresCelestialGuide.parts.tsx:45`, `.layers.ts:31` |
| `FEATURES_CELESTIAL_SIZES` | `"(min-width: 1280px) 1280px, 100vw"` | `featuresCelestialGuide.layers.ts:98` |
| `FEATURES_DARK_MAX_WIDTH` / `_MIN_HEIGHT` | `"1280px"` / `"80vh"` | `features.layers.ts:227-228` |

**Prosa obsoleta detectada al medir** (se corrige con esta entrega): el docblock de la rama oscura de `Features.tsx:30-33` afirma que la escena es _«imagen plana, sin capas — a diferencia de Story/Journey no hay parallax que fingir aquí»_. Es falso desde `49e8ef6` (2026-07-30), que dio a esta escena sus 10 capas y su `useSceneParallax`. El comentario quedó sin actualizar; describe una entrega anterior a la del mismo día.

Baseline de calidad medida en este HEAD antes de tocar nada: se reporta en §11 con la salida literal.

## 2. Objetivo

En **tema oscuro**: al terminar la presentación de 8 diapositivas de Journey, Features **sube desde el borde inferior del viewport y cubre a Journey**, que permanece pegada detrás hasta quedar tapada por completo. Features ocupa el ancho total y el alto del dispositivo; su escena de parallax —arte nuevo, «Celestial Orbital»— va a sangre y mide **siempre** una pantalla exacta; su contenido queda topado a 1280px, sobre `secondary[1100]`.

Es, literalmente, el mismo encargo que la spec `2026-08-02-journey-overlay-transition-design.md` resolvió un peldaño más arriba de la página (Story→Journey), con el mismo vocabulario. Esta spec **reutiliza esa técnica**, no inventa una nueva; lo que sí es propio de Features son D3 (revierte una decisión tomada esta misma mañana), D7 (la escena pegada) y todo el bloque de arte (D12-D16).

## 3. Decisiones de diseño

| # | Decisión | Porqué |
| --- | --- | --- |
| **D1** | Todo el encargo se implementa **solo en tema oscuro**. La rama clara de `Features` no se toca (ni el grid de tarjetas, ni los patrones SVG, ni las figuras por tarjeta, ni `FEATURE_CARD_VISUALS`). | La presentación de Journey —el punto de partida de la transición— solo existe en oscuro. Mismo criterio que D1 de las dos specs anteriores de esta serie. **Supuesto declarado, no consultado**: el usuario pidió no pausar salvo por datos que solo él pueda dar. |
| **D2** | La superposición es **CSS puro**: Features lleva `margin-block-start` negativo de una pantalla (`FEATURES_OVERLAY_RISE`) y `position: relative; z-index: 2`. Ni un `useEffect`, ni un ref, ni una variable CSS de scroll. | Copia exacta de D2 de `2026-08-02-journey-overlay-transition-design.md`, cuyo razonamiento sigue vigente: `ScJourneyStage` **ya** es `position: sticky`, así que mientras está pegado cualquier hermano posterior con margen negativo le pasa por encima como consecuencia del flujo normal. Sin JavaScript en el camino crítico del scroll. Los tres defectos de raíz que aquella spec documentó (transform sobre elemento en flujo, lazo cerrado sobre `getBoundingClientRect`, `transition` sobre propiedad gobernada por scroll) quedan evitados por construcción. |
| **D3** | Se añade una **zona de hold** de una pantalla al final de la pista de Journey: `JOURNEY_DECK_TAIL_SCREENS = 1` y `JOURNEY_DECK_TRACK_HEIGHT` pasa de `8 × 100dvh` a `(8 + 1) × 100dvh`. **Revierte a propósito D9** de `2026-08-02-journey-deck-8-diapositivas-design.md`. | Aquella decisión escribió, literalmente, que la pista de Journey no lleva cola porque _«nada tiene que superponerse a Journey — Features, la sección siguiente, no lo pide»_. El encargo de hoy es exactamente que Features **sí** lo pida. Sin la cola, Features empezaría a tapar en `progress = 7/8 = 0.875` (diapositiva 8 todavía activa) y la cita de cierre nunca se vería sin tapar. La aritmética completa está en §4. |
| **D4** | `JourneyDeckDark` pasa `tailScreens: JOURNEY_DECK_TAIL_SCREENS` a `useSlideDeck`. **El hook no se toca.** | La opción ya existe y ya está probada (`SlideDeckOptions.tailScreens`, D4 de la spec de las 8 diapositivas, escrita para Story). Journey era el consumidor que la dejaba en su defecto `0`; hoy deja de serlo. Que el cambio quepa en una línea es la prueba de que aquel diseño genérico era el correcto. |
| **D5** | El solape de Features y la zona de hold de Journey son **la misma medida** (una pantalla), declaradas en dos constantes de ficheros distintos (`FEATURES_OVERLAY_RISE` y `JOURNEY_DECK_TAIL_SCREENS`) y atadas por un **test** que importa las dos. | Mismo razonamiento que D5 de la spec Story→Journey, y misma lección del repo (`task/lessons.md`, 2026-08-02: _«una invariante entre dos ficheros de datos no la sostiene un comentario en cada uno»_). Si el hold es más corto que el solape queda una banda de la escena de Journey sin tapar; si es más largo, Features empieza a subir con la cita todavía viva. |
| **D6** | Bajo `prefers-reduced-motion: reduce`, el margen negativo de Features **se anula** (`margin-block-start: 0`). | Bajo `reduce`, `ScJourneyTrack` pasa a `height: auto` y `ScJourneyStage` a `position: static` (D12 de la spec de las 8 diapositivas): ya no hay pin. Un margen negativo de una pantalla sobre un Journey en flujo normal **taparía contenido real** de la última diapositiva. Perder movimiento es aceptable; perder contenido no. |
| **D7** | La sección pasa a `display: grid` de una sola celda y la escena vive en un **slot pegado** que comparte esa celda con el contenido: slot `grid-area: 1 / 1; align-self: start; position: sticky; top: 0; height: FEATURES_DARK_HEIGHT (100dvh)`, contenido `grid-area: 1 / 1; z-index: 1`. La sección pierde `max-width`, `margin-inline: auto`, `min-height: 80vh`, `display: flex` y `overflow: hidden`. | Es la única forma de cumplir el encargo _sin condiciones_: «la imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo». Un `ScScene` con `inset: 0` sobre la sección (lo que hizo Journey en su D7) solo mide una pantalla **mientras el contenido quepa en una pantalla**; el contenido de Features —tres identidades con título, cuerpo, cuatro bullets y CTA cada una— es el más alto de la página y desborda una pantalla en viewports de portátil. Con `inset: 0` la escena se estiraría a la altura real de la sección y el `object-fit: cover` recortaría el arte por los lados justo donde vive el vacío que el texto ocupa. El slot pegado desacopla las dos medidas: la escena mide siempre una pantalla y el contenido mide lo que mide. **Las dos piezas se superponen compartiendo celda de grid, no con márgenes negativos**: un `margin-block-end` negativo en el slot alteraría su rectángulo de restricción de `sticky` y lo dejaría viajar una pantalla más allá del final de la sección, pintando sobre Contact. La celda compartida superpone sin tocar ninguna caja, y es el recurso que este repo ya usa en `ScJourneySlide` (`grid-area: 1 / 1`). **`overflow: hidden` en la sección deja de ser opcional: sería el ancestro que desactivaría este `sticky`** — mismo fallo silencioso que D7 de la spec Story→Journey documentó para `ScJourney`. El recorte del overscan lo hace `ScScene`, que ya declara su propio `overflow: hidden`. |
| **D8** | El contenido se acota con una constante **propia**, `FEATURES_CONTENT_MAX_WIDTH = "1280px"`. Se eliminan `FEATURES_DARK_MAX_WIDTH` y `FEATURES_DARK_MIN_HEIGHT`. | Mismo cambio de sujeto que D8 de la spec Story→Journey: el 1280px del encargo describe ahora el **contenido**, no la caja de la sección. `FEATURES_DARK_MAX_WIDTH` acotaba la sección entera (escena incluida) y `FEATURES_DARK_MIN_HEIGHT` (80vh) era el compromiso que evitaba recortar contenido; con D7 ninguna de las dos tiene ya sujeto. Reutilizar la primera para el contenido escondería que ha cambiado de significado. |
| **D9** | `FEATURES_ORBITAL_SIZES` = `"100vw"` (la escena anterior declaraba `"(min-width: 1280px) 1280px, 100vw"`). | Con la escena a sangre, el `sizes` anterior le mentiría al navegador y le haría elegir la pista de 1024px en pantallas anchas. Mismo cambio y mismo motivo que D9 de la spec Story→Journey. |
| **D10** | `background-color` se expresa como `theme.data.semantic.bg`, **no** como `palette.secondary[1100]` en crudo. | Medido en el repo: `src/theme/tokens/semantic.ts:63` declara `bg: color.secondary[1100]` para el tema oscuro, y `color.ts:1-3,38` da el literal `oklch(0.22 0.093 311.928)`. **Es el mismo valor del encargo**, y como esta rama solo existe en oscuro (D1) el rol semántico lo da sin saltarse la capa de tokens. Precedente ya fijado dos veces (D8 de la spec 2026-07-31, D10 de la spec Story→Journey). |
| **D11** | `z-index: 2` en Features (Journey es `z-index: 1`, Story no declara ninguno). | Escalera explícita de la página: Story (auto) → Journey (1) → Features (2). Ninguna necesita token de `zIndex.ts`, cuyo tramo más bajo (`raised: 10`) ya está por encima; el navbar (`stickyNav: 100`) queda intacto sobre las tres. `Contact`, que va después, no se solapa con Features (no lleva margen negativo), así que su `z-index: auto` no compite con el 2 de Features en ninguna región de la página. |
| **D12** | La escena se **sustituye entera**, no se actualiza: `FeaturesCelestialGuide` (10 capas, blending aditivo) → **`FeaturesCelestialOrbital`** (7 capas, alpha normal). Directorio, rutas públicas y manifest nuevos. | Es otro arte y otro modelo de composición. El paquete nuevo trae `00_fondo` **opaca (RGB)** y seis capas RGBA de alpha recta pensadas para apilarse con alpha normal; aplicarles `plus-lighter` las lavaría. Precedente exacto del repo: `JourneyAstralPathway` → `JourneyCosmicPortal` (2026-08-01), por este mismo motivo y con esta misma consecuencia de nombre. Conservar el nombre «Celestial Guide» sobre el arte «Celestial Orbital» dejaría mintiendo cada docblock de los tres ficheros. |
| **D13** | Orden de pintado = el que usa el **demo del paquete** (`demo/index.html:152-159`): fondo → ondas → órbita → **plataforma → iconos** → figura → partículas. El README del paquete lista el par intermedio al revés. | **Medido, no supuesto**: compuestos los siete PNG máster en los dos órdenes, la diferencia es de `0.0/255` de media por canal y el bounding box de la diferencia es `None` (solo 18 píxeles tienen alfa en las dos capas a la vez). Son equivalentes en fidelidad, así que se elige el orden coherente con el parallax: la plataforma tiene menos profundidad que los iconos (0.18 vs 0.30) y pintarla _encima_ de ellos leería como un plano cercano moviéndose más despacio que uno lejano. |
| **D14** | Profundidades = columna de **puntero** del README normalizada a 1.0 en la capa más cercana. Amplitudes: `pointerAmp {x:10, y:6}`, `scrollAmp 32`. | Normalizar a 1.0 aísla del retuneo del proveedor (`task/lessons.md`, 2026-08-01) y es lo que ya hace `JourneyCosmicPortal`. Las amplitudes **no** se toman del paquete (calibrado para un hero suelto: `MAX = 32px` de puntero, `240px` de scroll): se fijan para **conservar el recorrido que esta sección ya tiene**. Hoy `pointerAmp {x:22,y:13} × depth máx 0.46` = 10.1/6.0 px y `scrollAmp 70 × 0.46` = 32.2 px; con el ancla en 1.0, `{x:10,y:6}` y `32` reproducen 10.0/6.0 y 32.0. Cambiar el fondo no debe retunear el movimiento de la sección. |
| **D15** | Bajo `prefers-reduced-motion: reduce`, el slot de la escena pasa a `position: static`. | El `sticky` en sí no es animación, pero un fondo que se queda clavado mientras el texto pasa por delante es movimiento relativo, que es justo lo que `reduce` pide evitar. En `static` el slot conserva su celda y su pantalla de alto: la escena aparece una vez, con sus proporciones intactas, detrás del principio del contenido, y el resto de la sección queda sobre el `background-color`, que es exactamente el `secondary[1100]` del encargo. Mismo criterio y mismo desenlace que el guard de `ScJourneySceneWrap` (D12 de la spec de las 8 diapositivas): se degrada el movimiento, no la identidad visual. |
| **D16** | Se retiran `src/components/featuresCelestialGuide/**`, `public/features/celestial-guide/**` (20 WebP) y `assets/features-celestial-guide/**` (10 WebP máster + manifest). El paquete nuevo **no** versiona imágenes: solo `assets/features-celestial-orbital/manifest.json`. | Dejar los ficheros de una escena que ya no monta nadie es exactamente la deuda que este repo evita. Todo está en la historia de git, así que la retirada es reversible. No versionar los másteres del paquete nuevo sigue el criterio de `story-cosmic-being` (2026-07-31) y `journey-cosmic-portal` (2026-08-01), cuyos manifests documentan el zip de origen en `Downloads` en vez de arrastrar decenas de MB al repo; la escena «Celestial Guide» era la excepción, no la regla (sus 10 WebP de 3344px pesan 4,8 MiB). |

## 4. Aritmética de la coreografía (verificable)

Sea `T` la posición en documento del inicio de `ScJourneyTrack` y `1p` = una pantalla = `100dvh`. Con `JOURNEY_SLIDES = 8`, `JOURNEY_DECK_TAIL_SCREENS = 1`:

- Altura de pista: `(8 + 1) × 1p = 9p`.
- Recorrido del deck: `span = 9p − 1p (viewport) − 1p (tail) = 7p`. `progress = (scrollY − T) / 7p`.
- La diapositiva 8 (índice 7, la cita) es la activa cuando `round(progress × 7) = 7`, es decir `progress ≥ 13/14 ≈ 0.9286` → `scrollY ≥ T + 6.5p`.
- `progress` llega a 1 en `scrollY = T + 7p`.
- Features empieza en documento en `T + 9p − 1p (solape) = T + 8p`. Su borde superior toca el borde inferior del viewport en `scrollY = T + 7p` y el superior en `scrollY = T + 8p`.
- El `stage` de Journey está pegado mientras `scrollY ∈ [T, T + 8p]`; se despega exactamente en `T + 8p`.

| Tramo de `scrollY` | Qué se ve |
| --- | --- |
| `T + 6.5p … T + 7p` | La cita de cierre sola, a pantalla completa (medio scroll de reposo) |
| `T + 7p … T + 8p` | Features sube desde el borde inferior sobre el Journey pegado, hasta cubrir el viewport |
| `T + 8p` | Features cubre el 100%; Journey se despega **en ese mismo punto** — sin costura visible |
| `> T + 8p` | El slot de la escena de Features se pega a `top: 0`; el contenido pasa por delante |

La igualdad entre «cuándo Features cubre del todo» y «cuándo Journey se despega» no es coincidencia: las dos valen `T + trackHeight − 1p` porque el solape y el hold son la misma pantalla (D5).

Nota sobre el término de scroll del parallax durante el relevo: `useSceneParallax` deriva su progreso de `-rect.top / innerHeight` sobre `sceneRef`. Mientras el slot está pegado, ese `rect.top` vale 0 y el término de scroll no aporta —comportamiento correcto del hook, ya documentado en Story y Journey—, pero **durante la subida sí aporta**, que es cuando se ve: `rect.top` recorre `+1p → 0` y las siete capas se separan en profundidad conforme la sección entra. Es el mismo efecto que Story/Journey compran con un envoltorio extra gobernado por `--<prefix>-progress`; aquí sale gratis porque Features no está pegada durante su propia entrada.

## 5. Arte: el paquete «Celestial Orbital»

Fuente: `Features_Dark_Theme_2_celestial_parallax_capas_3_FIXED.zip` (Downloads, entregado 2026-08-02). Lienzo `3344 × 1882`. Siete capas máster PNG; `00_fondo` es RGB, las otras seis RGBA de alpha recta.

| # publicado | Fichero del paquete | Alfa | `depth` (normalizada) | README (puntero) |
| --- | --- | --- | --- | --- |
| `01-fondo` | `00_fondo.png` | opaca (RGB) | 0.091 | 0.05 |
| `02-ondas` | `10_ondas.png` | recta | 0.255 | 0.14 |
| `03-orbita` | `20_orbita.png` | recta | 0.400 | 0.22 |
| `04-plataforma` | `40_plataforma.png` | recta | 0.327 | 0.18 |
| `05-iconos` | `30_iconos.png` | recta | 0.545 | 0.30 |
| `06-figura` | `50_figura.png` | recta | 0.691 | 0.38 |
| `07-particulas` | `60_particulas.png` | recta | 1.000 | 0.55 |

Composición: **alpha normal, sin `mix-blend-mode`** (D12). `01-fondo` es el suelo opaco del stack, igual que `01-background` en Journey.

Encoder: `Pillow: Image.resize(LANCZOS) → save WEBP quality=85 method=6`, anchos `[2560, 1024]` (→ `2560×1441` y `1024×576`).

**El filtro y el `method` no se suponen**: se probó el pipeline contra un activo que **no cambia** (`task/lessons.md`, 2026-08-01) recodificando los 10 WebP máster de `assets/features-celestial-guide/` a las dos pistas y comparando sha256 contra los 20 ficheros desplegados en `public/features/celestial-guide/`. Con `q=85` el resultado fue `0/20`; con `q=90, method=6, LANCZOS`, **`20/20` byte a byte**. Eso demuestra el filtro y el `method` — y, de paso, que la escena saliente se desplegó a q90, no a los q85 que documenta el manifest de _Journey_ (cada escena eligió la suya).

**La calidad sí se elige por escena, y se mide.** Curva sobre la escena COMPUESTA a 2560px (que es lo que ve el usuario, no una capa suelta), comparando el compuesto de las 7 capas recodificadas contra el compuesto de los 7 másteres:

| q      | Peso 2560 (KiB) | PSNR compuesto |
| ------ | --------------- | -------------- |
| 70     | 1576.8          | 41.87 dB       |
| 80     | 1732.0          | 42.65 dB       |
| **85** | **1868.8**      | **43.22 dB**   |
| 88     | 1991.6          | 43.63 dB       |
| 90     | 2093.1          | 43.84 dB       |
| 93     | 2305.5          | 44.12 dB       |

La rodilla está en q85: de q70 a q85 se pagan 292 KiB por +1.35 dB; de q85 a q90, otros 224 KiB por solo +0.62 dB. Se elige **q85**, misma metodología y misma conclusión que la escena de Journey. Peso total desplegado: **2 286 682 B (2,18 MiB)** en 14 imágenes, frente a 1,30 MiB en las 20 de la escena saliente. El aumento no es del encoder sino del arte (`02-ondas` 771 KB y `06-figura` 463 KB en la pista de 2560 son una malla de partículas y un cuerpo con textura estrellada, mucho más difíciles de comprimir que los orbes planos del arte anterior); se declara como deuda conocida, no se disimula.

Ninguna capa opaca puede descubrir su borde con el parallax: el único plano opaco es `01-fondo`, a profundidad 0.091, cuyo desplazamiento máximo es `6 × 0.091 + 32 × 0.091 ≈ 3.5px` frente a los ~27px de sobreancho vertical que da `overscan 1.06` sobre una pantalla de 900px. Las seis capas restantes son transparentes: desplazarlas no descubre ningún borde, solo las mueve.

El paquete propone además un pulso aditivo del orbe de la mano (`.orb-glow`) y una flotación lenta de iconos/partículas. **No se implementan** (§10): el encargo es la transición, el arte y la caja; añadir dos animaciones nuevas es un cambio de movimiento aparte, y la escena saliente tampoco tenía pulso propio en ninguna capa.

## 6. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `src/components/sections/Journey/journey.layers.ts` | `JOURNEY_DECK_TAIL_SCREENS`; `JOURNEY_DECK_TRACK_HEIGHT` pasa a `(SLIDES + TAIL) × H` (revierte D9) |
| `src/components/sections/Journey/Journey.tsx` | `tailScreens` al hook (una línea) + docblock de la reversión |
| `src/components/sections/Journey/journey.layers.test.ts` | El test «la pista NO lleva cola» se sustituye por su contrario, atado a las constantes |
| `src/components/sections/Features/features.layers.ts` | `FEATURES_OVERLAY_RISE`, `FEATURES_DARK_HEIGHT`, `FEATURES_CONTENT_MAX_WIDTH`; se borran `FEATURES_DARK_MAX_WIDTH` y `FEATURES_DARK_MIN_HEIGHT` |
| `src/components/sections/Features/Features.tsx` | Rama oscura: solape + a sangre + slot de escena pegado + contenido a 1280; docblock obsoleto corregido |
| `src/components/sections/Features/Features.test.tsx` | Tests nuevos (§7) |
| `src/components/featuresCelestialOrbital/**` | **Nuevo** (5 ficheros): `FeaturesCelestialOrbital.tsx`, `.layers.ts`, `.parts.tsx`, `FeaturesCelestialOrbital.test.tsx`, `featuresCelestialOrbital.layers.test.ts` |
| `src/components/featuresCelestialGuide/**` | **Borrado** (5 ficheros: los 3 de código + sus 2 de test) |
| `public/features/celestial-orbital/*.webp` | **Nuevo** (14 ficheros) |
| `public/features/celestial-guide/*.webp` | **Borrado** (20 ficheros) |
| `assets/features-celestial-orbital/manifest.json` | **Nuevo** |
| `assets/features-celestial-guide/**` | **Borrado** (10 WebP + manifest) |
| `src/components/sections/HomeSections.tsx` | Solo el comentario, que nombra `FeaturesCelestialGuide` |

## 7. Tests

Todos por **texto del CSS inyectado** (`injectedCss()`, patrón que estos ficheros ya usan) o por constantes, **nunca** por `getComputedStyle` de algo que jsdom no evalúe. Y la aserción sobre un bloque `@media` se hace sobre la **línea concreta** que a la vez es bloque `reduce` y menciona la propiedad, nunca troceando el stylesheet acumulado (lección del repo, 2026-08-02: ese troceo se contamina con el CSS de otros componentes y da verde contra la declaración equivocada).

1. **Solape declarado**: el CSS de la rama oscura declara `margin-block-start` con el valor de `FEATURES_OVERLAY_RISE` en negativo. Falsable: sin la declaración, el bloque no contiene la cadena.
2. **Guard de `reduce` del solape** (D6): existe una línea dentro de un bloque `@media (prefers-reduced-motion: reduce)` que devuelve `margin-block-start` a `0`.
3. **Tope de contenido** (D8): el CSS declara `max-width` leyendo `FEATURES_CONTENT_MAX_WIDTH`, no un literal escrito a mano.
4. **Escena pegada** (D7): el CSS declara `position: sticky` y `top: 0` en el slot, con `height` y `margin-block-end` derivados de `FEATURES_DARK_HEIGHT`; y **ningún** `overflow` en `ScFeatures` — es el fallo que rompería el pin en silencio.
5. **Guard de `reduce` del slot** (D15): línea `position: static` dentro de un bloque `reduce`.
6. **Invariante D5**: `FEATURES_OVERLAY_RISE === JOURNEY_DARK_HEIGHT` y `JOURNEY_DECK_TAIL_SCREENS === 1`, importando los dos ficheros de datos.
7. **Pista de Journey** (D3): `JOURNEY_DECK_TRACK_HEIGHT` se deriva de `JOURNEY_SLIDES + JOURNEY_DECK_TAIL_SCREENS`, comprobado contra las constantes y no contra el literal `9`. Sustituye al test vigente que afirma lo contrario.
8. **Escena nueva** (D12/D13/D14): `FEATURES_ORBITAL_LAYERS` tiene 7 entradas, sus rutas apuntan a `/features/celestial-orbital/`, la profundidad máxima es exactamente `1`, y el orden de `part` es el de D13.
9. **`sizes` a sangre** (D9): `FEATURES_ORBITAL_SIZES === "100vw"`.
10. **Composición alpha normal** (D12): el CSS de la capa **no** contiene `mix-blend-mode` — es la diferencia que lavaría el arte si alguien copiara el `parts.tsx` de la escena saliente. Vive en `FeaturesCelestialOrbital.test.tsx` (es donde se renderiza la escena y styled-components inyecta la regla), y asevera sobre las reglas de la **capa**, no sobre el stylesheet completo: otros componentes del sitio usan blending legítimamente. Lleva además una sonda (`toContain("object-fit: cover")`) para que la aserción de ausencia no pueda pasar por vacuidad si el helper dejara de ver el CSS.
11. **Regresión de nombre** (D16): ni el módulo ni el CSS mencionan `celestial-guide`.
12. **No-regresión de la rama clara**: los 11 tests claros existentes de `Features.test.tsx` siguen verdes sin cambios, y los 28 de `Journey.test.tsx` también.

## 8. Accesibilidad

- Features conserva `id="features"` y `aria-labelledby="features-title"`; el solape es puramente visual y no cambia el orden del DOM ni el de tabulación.
- D6 y D15 son los requisitos duros de accesibilidad de esta entrega: bajo `reduce` no hay solape (no se tapa contenido) y no hay fondo clavado (no hay movimiento relativo).
- La escena sigue siendo `aria-hidden` y decorativa; sus `<img>` llevan `alt=""`.
- Features queda **encima** de Journey en pintado, pero Journey sigue en el DOM debajo; ningún contenido de Journey queda oculto para un lector de pantalla, porque bajo `reduce`/sin JS la presentación degrada a documento completo.
- Contraste del texto sobre el arte nuevo: la viñeta (`ScVignette`, gradiente `to left`) oscurece el lado derecho, que es donde vive el contenido. Se verifica en navegador, no se supone.

## 9. i18n

Sin claves nuevas. `Home.features.*` se consume igual en las dos ramas: mismo kicker, mismos tres títulos, mismos 12 bullets, mismos 3 CTA. No hay texto nuevo que traducir, así que no hay riesgo de paridad es/en. `Home.features.<key>.figureAlt` sigue siendo exclusiva de la rama clara (la escena oscura es decorativa).

## 10. No-objetivos (YAGNI)

- **No** se toca la rama clara de `Features` ni ninguna rama de `Story`.
- **No** se convierte Features en una presentación de diapositivas. El encargo pide que la sección ocupe el ancho y alto del dispositivo «igual que la sección Journey», que es una descripción del **estado final de la transición**, no una petición de deck. Un deck exigiría repartir las tres identidades en diapositivas, y eso es rediseño de contenido, no de presentación.
- **No** se implementan el pulso del orbe ni la flotación de capas que propone el paquete (§5).
- **No** se toca `useSceneParallax` (cuatro escenas lo comparten) ni `useSlideDeck` (D4: su opción ya existe).
- **No** se regeneran los WebP a más de 2560px. En viewports de más de 1280px CSS a DPR 2 el activo queda submuestreado; el máster de 3344px existe en el zip de Downloads pero solo daría un 30% más de pista a cambio de bastante peso. Se declara como deuda conocida, igual que en la entrega de Journey, no se disimula.
- **No** se corrigen los fallos preexistentes del gate ajenos a esta entrega (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 11. Definición de «hecho»

- [x] **Suite verde en su totalidad**: `pnpm vitest run --maxWorkers=4` da **602/602 en 57 ficheros**, frente a la baseline de **591/591 en 57** medida en este mismo HEAD antes de tocar nada. Los 11 tests nuevos son los 5 de `featuresCelestialOrbital.layers.test.ts`, los 3 de `FeaturesCelestialOrbital.test.tsx` y los 8 nuevos de `Features.test.tsx`, menos los 5 que se van con la escena borrada. Ver §12 sobre por qué la cifra se reporta con concurrencia acotada.
- [x] **`pnpm typecheck` exit 0** y **`pnpm lint` exit 0**, sin salida. `pnpm check-format` señala **solo** `graphify-out/**` — exactamente la misma lista que la baseline, ningún fichero de esta entrega.
- [x] **Transición verificada en navegador real**, medida a 1440×900 (`vh = 900`): pista de Journey `top 6300, height 8100` = **9 × 900** exactas; `margin-block-start` de Features **−900px**; Features arranca en documento en **13500** = `14400 (fin de pista) − 900`. Barrido de scroll con `scroll-behavior: auto` forzado:

    | `scrollY` | `featuresTop` | `journeyStageTop` | `slotTop` |
    | --- | --- | --- | --- |
    | 12600 (`T+7p`) | **900** (borde inferior del viewport) | 0 (pegado) | 900 |
    | 13050 | 450 | 0 (pegado) | 450 |
    | 13500 (`T+8p`) | **0** (cubre el 100%) | **0** (última posición pegada) | 0 |
    | 13600 | −100 | **−100** (despegado) | **0** (el slot toma el relevo) |
    | 14514 | −1014 | −1014 | −900 |

    Features cubre el viewport y Journey se despega **en el mismo `scrollY` (13500)**: no hay costura, tal como predice §4. En 14514, `slotBottom = 0 = featuresBottom`: el slot pegado **nunca** sale de la sección ni pinta sobre Contact — que es exactamente lo que el margen negativo descartado en D7 habría roto.

- [x] **Escena a sangre medida en navegador**: sección `1440 × 1014`, slot y escena `1440 × 900` (= viewport exacto), marco de contenido `max-width: 1280px` → `width: 1280`, columna de texto de 582px entre `x = 746` y `x = 1328` (dentro del vacío del arte, sin montarse sobre la figura). `background-color` computado **`oklch(0.22 0.093 311.928)`** = `secondary[1100]`. `overflow` de `ScFeatures`: **`visible`** (D7). Las 7 capas cargan y el navegador elige la pista de **2560** (`currentSrc` sin sufijo `-1024`), con `mix-blend-mode: normal`, `object-fit: cover`, `transform: scale(1.06)` y `alt=""`. Cero errores en consola.
- [x] **Slot pegado verificado**: la sección mide 1014px (más que una pantalla, tal como anticipa D7) y la escena se queda en 900 exactos mientras el contenido pasa por delante.
- [x] **Guards de `reduce` comprobados en el CSSOM real** del navegador, no solo en el texto inyectado: dentro de `@media (prefers-reduced-motion: reduce)` hay una regla sobre la clase generada de `ScFeatures` con `margin-block-start: 0px` (D6) y otra sobre la de `ScDarkSceneSlot` con `position: static` (D15).
- [x] **375×812**: pista 9 pantallas, solape `−812px`, hueco pista↔sección `812` exactos, escena `375 × 812`, sección 1139, **sin scroll horizontal**.
- [x] **Rama clara intacta**: 3 tarjetas, 3 figuras con `alt` de i18n, `display: flex`, `max-width: 1200px` (`containerMax`), `margin-block-start: 0`, `z-index: auto`; Journey claro conserva su camino punteado.
- [x] Registro en el vault (`01-Projects/vti.md` + copia de esta spec) y en `task/todo.md` / `task/lessons.md`.

## 12. Desviaciones de implementación

**La calidad del encoder cambió de q90 a q85 a mitad de entrega, y el motivo importa.** Esta spec se escribió diciendo «se conserva q90 para no cambiar dos variables a la vez», razonando desde el resultado del test de reproducibilidad. Al medir después la curva de calidad sobre el arte NUEVO (§5) la rodilla salió en q85, igual que en Journey, y el peso a q90 era 273 KiB mayor por +0.62 dB. Se corrigió la decisión y la spec. La lección es que el test de reproducibilidad demuestra el **filtro y el `method`**, no la calidad: esa se elige por escena, con su curva medida delante.

**D7 se rediseñó antes de implementarse.** La primera redacción resolvía la superposición escena↔contenido con un `margin-block-end` negativo sobre el slot. Al repasar la restricción de `position: sticky` se vio que un margen negativo **extiende** el rectángulo dentro del cual el elemento puede viajar: el slot habría podido salirse una pantalla por debajo del final de la sección y pintar sobre Contact. Se sustituyó por una celda de grid compartida (`grid-area: 1 / 1`, el recurso que este repo ya usa en `ScJourneySlide`), que superpone sin tocar ninguna caja. La verificación en navegador (§11, `slotBottom = featuresBottom` en el último tramo) confirma que la variante elegida no tiene ese fallo.

**El inventario de ficheros de §6 estaba mal en la primera redacción.** Decía que la escena saliente eran 3 ficheros; eran 5 (los 3 de código más `featuresCelestialGuide.layers.test.ts` y `FeaturesCelestialGuide.test.tsx`). El error viene de haber escrito el inventario a partir de un listado de shell cuya salida venía recortada por columnas, sin volver a listar el directorio concreto. Lo detectó el agente al ejecutar `git rm -r`, que sí cubrió los cinco.

**Cobertura recuperada en la integración.** Como consecuencia de lo anterior, `FeaturesCelestialGuide.test.tsx` (marcado accesible de la escena: contenedor `aria-hidden`, una `<img>` decorativa por capa con sus dos pistas de `srcSet`) no estaba asignado a ningún flujo y se habría perdido con el borrado. Se reescribió en el hilo principal como `FeaturesCelestialOrbital.test.tsx`, derivando el recuento de `FEATURES_ORBITAL_LAYERS.length` en vez de escribirlo a mano.

**El flujo de Journey extendió su alcance a `Journey.test.tsx`, con razón.** El test «al mover el indice del hook, past/current/next cambian en consecuencia» simulaba la geometría de la pista con la fórmula SIN cola (`span = height − vh`), literal en su propio comentario. Con D3/D4 esa fórmula deja de describir la pista real y el índice salía desplazado (esperado 4, recibido 5). El arreglo es de raíz —recalcular la geometría simulada con la cola, igual que ya hace `useSlideDeck.test.tsx`—, no un reajuste del número esperado.

**La cifra de la suite se reporta con la concurrencia acotada, no con `pnpm test` a secas.** Con los workers por defecto y la máquina cargada por la propia sesión, `app/home-page.flujo.test.tsx` cae por **timeout de `waitFor`** (5000 ms), no por aserción. Se comprobó de quién era el fallo en vez de suponerlo: **el mismo fichero pasa en aislamiento en 2267 ms** (7/7) y la suite entera pasa **601/601 con `--maxWorkers=4`**, que es exactamente la misma configuración con la que se midió la baseline de 591/591. Es contención de CPU, no código — el mismo patrón que la entrega del 2026-08-02 por la mañana ya documentó en su §12.

**Lo que este entorno NO puede verificar, y no se disimula.** El panel del navegador de esta sesión no compone frames (`document.hidden === true` de forma permanente), así que no hay capturas y `requestAnimationFrame` no corre. Todo lo que es LAYOUT —que es el 100% de la superposición, del slot pegado y de las cajas— se midió por `getBoundingClientRect`/`getComputedStyle`/CSSOM y está en §11. Lo que depende de rAF —el avance de `data-slide` y `--journey-progress` de la presentación de Journey, y los `transform` de parallax de las capas— **no** se pudo observar aquí; queda cubierto por los tests unitarios y por la verificación en navegador de la entrega anterior, que no cambia con esta (D4 solo altera el `span`, y su efecto sobre el progreso ya lo prueba `useSlideDeck.test.tsx`).

**Auditoría adversarial: tres hallazgos reales, los tres cerrados.** Un auditor QA independiente recalculó la aritmética de §4 desde el código (sin copiarla de aquí), inyectó a mano el bug que cada test nuevo dice proteger para comprobar que se pone rojo, verificó las 14 imágenes contra el manifest con Pillow y barrió el árbol en busca de referencias huérfanas. Sin bloqueantes ni altos. Lo que sí encontró:

1. **El test 10 de §7 estaba prometido y no implementado** (medio). El código era correcto —`ScLayer` no declara `mix-blend-mode`— pero el escenario concreto contra el que ese test existe (alguien copia el `ScLayer` de la escena saliente, que sí llevaba `screen`/`plus-lighter`) habría dejado la suite verde con el arte lavado, porque no se pierde ni un nodo del DOM ni una palabra de texto. Escrito en `FeaturesCelestialOrbital.test.tsx` y **verificado falsable**: con `mix-blend-mode: screen` inyectado en `ScLayer` el test falla citando la regla exacta de la capa; revertido con la edición inversa (nunca `git checkout`, lección 2026-07-28) y comprobado `diff` byte a byte contra la copia previa.
2. **El DoD de §11 se marcó antes de que `check-format` estuviera realmente limpio** (medio). Esta spec y el plan se editaron DESPUÉS de pasarles Prettier, así que el gate volvía a señalarlos mientras la casilla ya decía que solo señalaba `graphify-out/**`. Es exactamente la clase de autocertificación que el manual prohíbe: la casilla se marcó desde la última ejecución recordada, no desde una nueva. Corregido, y la casilla solo se vuelve a marcar tras reejecutar el comando.
3. **Dos docblocks huérfanos en `contactNeonGalaxy`** (bajo), que citaban `FeaturesCelestialGuide` y `FEATURES_CELESTIAL_VOID` como precedente de los suyos. Es el MISMO efecto colateral que la entrega de la mañana ya documentó en su propio §12 («prosa obsoleta fuera del alcance de los agentes»): un borrado deja mintiendo a la prosa de ficheros que ningún flujo tenía asignados. Corregidos en la integración; el de `CONTACT_NEON_VOID` aprovecha para dejar escrito que ese literal ya no lo comparte con ninguna otra escena.

Los tres son de la misma familia: **cosas que la suite no puede ver porque no pierden contenido**. Que aparecieran pese a haber escrito la spec con la falsabilidad como criterio es el argumento de que la auditoría adversarial no es ceremonia.

---

## Nota 2026-09-03 — la altura de pista que inventaría esta spec ya no es la del código

La tabla de estado de arriba anota `ScJourneyTrack` con `height: calc(8 × 100dvh)` y **sin cola**. Esa aritmética caducó con la ola L (crítica externa #16, commits `175da8a..dfd8b40`): cada diapositiva de los dos decks oscuros consume ahora **media pantalla** de recorrido y no una entera, mediante la constante compartida `DECK_SLIDE_TRAVEL` (`"50dvh"`) de `src/hooks/useSlideDeck.ts`, y la pista se calcula como `(diapositivas − 1) × DECK_SLIDE_TRAVEL + 1 pantalla del stage + cola × pantalla`. Journey lleva además cola desde antes de esa ola (`JOURNEY_DECK_TAIL_SCREENS = 1`), porque Features se le superpone igual que Journey se superponía a Story.

La fila se conserva tal cual porque es un inventario FECHADO del estado que había al escribir esta spec, no una decisión de esta entrega; la decisión y sus cifras viven en la enmienda del 2026-09-03 de `2026-08-02-journey-deck-8-diapositivas-design.md`.
