# Story como presentación de 6 diapositivas + transición Hero→Story — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-31-story-deck-hero-transition-design.md` (léela entera antes de tocar nada: las decisiones D1–D15c contienen los porqués que este plan da por sabidos).

**Goal:** En tema oscuro, `Story` deja de ser una pantalla y pasa a ser una presentación de 6 diapositivas a pantalla completa, con la escena fijada mientras se recorre; al bajar desde el Hero la presentación se abre, y al subir se cierra con carácter de rewind.

**Architecture:** pista alta (`6 × 100dvh`) + `stage` pegajoso (`position: sticky`) que ocupa el viewport. Un hook nuevo `useStoryDeck` calcula el progreso por rAF, escribe `--story-enter`/`--story-progress` como variables CSS sobre el stage y expone por estado de React solo `index` y `direction`, que se materializan como `data-slide`/`data-dir`.

**Tech Stack:** Next.js 16 (export estático) + React 19 + TypeScript strict + styled-components 6 + Vitest/Testing Library.

## Global Constraints

- TypeScript strict, sin `any`, tipos de retorno explícitos en toda función exportada.
- **Solo se anima `transform`/`opacity`.** Esta entrega no repite la desviación del navbar: aquí no hay ninguna razón para animar propiedades de layout.
- Cero literales de color, medida o duración en los componentes: todo por token de tema o por constante de `story.layers.ts`.
- Cero claves i18n nuevas o perdidas. El contenido de las 6 diapositivas sale tal cual de `Home.story.*`.
- **La rama CLARA de `Story.tsx` no se toca.** Ni su JSX, ni sus styled, ni sus tests.
- Toda `@keyframes` vive únicamente dentro de `@media (prefers-reduced-motion: no-preference)`; el bloque `reduce` devuelve la presentación a documento en flujo (D6), no a "lo mismo pero quieto".
- jsdom NO evalúa `@media` ni anima: lo verificable se materializa como ATRIBUTO (`data-slide`, `data-dir`, `data-state`); los bloques de media se verifican por TEXTO del CSS inyectado; `getComputedStyle` se asevera contra el token/constante importada, nunca contra un literal.
- No se tocan: `useSceneParallax`, `useStage`/`StageProvider`, `useReveal`, `Hero.tsx`, `HomeSections.tsx`, ni los tests existentes de `Story`/`StoryCosmicHeart`/`hero-story.integration`.
- Baseline que NO debe empeorar: `pnpm test` = 509 verdes + 1 fallo preexistente en `app/home-page.flujo.test.tsx`; `check-format` falla solo en `graphify-out/**`.

---

## Task 1: Constantes, `sizes` de la escena y desbloqueo del pin

**Files:**

- Modify: `src/components/sections/Story/story.layers.ts`
- Modify: `src/components/storyCosmicHeart/storyCosmicHeart.layers.ts`
- Modify: `src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts` (solo si cierra el valor de `SIZES`)
- Modify: `src/theme/GlobalStyles.tsx`

**Interfaces:** produce las constantes que consumen Task 2 y Task 3.

- [ ] **Step 1: `story.layers.ts`**

Cambiar y documentar:

- `STORY_DARK_HEIGHT`: `"90dvh"` → `"100dvh"` (D12). Actualizar su docblock: ahora es el alto de UNA diapositiva a pantalla completa, y las demás secciones oscuras siguen a 90dvh a propósito.
- `STORY_DARK_MAX_WIDTH`: mismo valor `"1280px"`, docblock nuevo (D11): antes acotaba la sección entera; ahora acota **el contenido** de cada diapositiva, mientras la escena va a sangre.

Añadir (con docblock cada una, en español, explicando el porqué):

```ts
export const STORY_SLIDES = 6; // 1 intro + 4 pilares + 1 nota
export const STORY_DECK_TRACK_HEIGHT = `calc(${STORY_SLIDES} * ${STORY_DARK_HEIGHT})`;
export const STORY_SLIDE_SHIFT = "40px"; // desplazamiento de entrada/salida de cada diapositiva
export const STORY_STAGE_ENTER_SCALE = 0.92; // escala del stage antes de abrirse (--story-enter = 0)
export const STORY_SCENE_DEPTH_SHIFT = "6%"; // recorrido del envoltorio de la escena a lo largo de --story-progress (D10)
export const STORY_SCRUB_MS = 320; // duracion del scrub de rewind; atado por test a motion.duration.slow
```

- [ ] **Step 2: `storyCosmicHeart.layers.ts` — `SIZES` a viewport completo (D7)**

`STORY_COSMIC_HEART_SIZES` pasa a `"100vw"`. Reescribir su docblock: la escena ya NO se acota a `grid.containerMax`; desde esta entrega llena el ancho y el alto de la pantalla, así que declarar 1200px haría que el navegador eligiera la pista pequeña en pantallas anchas. Si `storyCosmicHeart.layers.test.ts` cierra ese valor, actualizarlo en el mismo commit (mismo criterio de contrato cerrado que `system.test.ts`).

- [ ] **Step 3: `GlobalStyles.tsx` — desbloquear `position: sticky` (D15b)**

`html, body { overflow-x: hidden; }` → `overflow-x: clip;`, con comentario en español explicando: `hidden` obliga al eje contrario a computar `auto` y convierte a `html`/`body` en contenedor de scroll, y un `position: sticky` se pega respecto a ESE contenedor en vez de al viewport — es la causa clásica de "sticky no pega". `clip` recorta igual pero no crea contenedor de scroll. Recordar que **no se escriben tests contra `GlobalStyles`** (`createGlobalStyle` no inyecta nada bajo jsdom): se verifica en navegador.

También en `GlobalStyles`, añadir en `html` el snap de D3:

```
scroll-snap-type: y proximity;
```

con comentario: `proximity` y no `mandatory` porque el scroller es la página entera; solo las anclas de Story declaran `scroll-snap-align`, así que el resto de la página queda intacta, y `proximity` permite atravesar la presentación sin pararse en cada diapositiva. Anotar que si en la verificación en navegador interfiere con `scroll-behavior: smooth` o con los saltos a anclas, **se retira esta línea** y el pin se queda solo (D3).

- [ ] **Step 4: verificar**

```bash
pnpm vitest run src/components/storyCosmicHeart src/components/sections/Story
pnpm typecheck
pnpm lint
```

Los tres limpios, con los tests existentes de Story y de la escena todavía en verde (este task no cambia comportamiento observable por ellos salvo el `sizes`).

---

## Task 2: Hook `useStoryDeck` (TDD)

**Files:**

- Create: `src/hooks/useStoryDeck.ts`
- Create: `src/hooks/useStoryDeck.test.tsx`

**Contrato exacto:**

```ts
export type StoryDeckDirection = "forward" | "rewind";

export interface StoryDeckState {
    /** Diapositiva activa, 0..STORY_SLIDES-1. */
    index: number;
    /** Sentido del ultimo desplazamiento significativo dentro de la pista. */
    direction: StoryDeckDirection;
}

export function useStoryDeck(
    trackRef: RefObject<HTMLElement | null>,
    stageRef: RefObject<HTMLElement | null>,
    slides: number,
): StoryDeckState;
```

`slides` entra por parámetro y NO se importa de `story.layers.ts`: así el hook no queda cableado a las 6 diapositivas de Story (podría gobernar otra presentación mañana) y, de paso, este task no depende del Task 1 y los dos pueden ir en paralelo. Quien lo consume (Task 3) le pasa `STORY_SLIDES`.

**Comportamiento:**

1. Observa `trackRef` con `IntersectionObserver`. El bucle de rAF **solo corre mientras la pista intersecta el viewport** (D5); al dejar de intersectar se cancela.
2. En cada frame, con `rect = trackRef.current.getBoundingClientRect()` y `vh = window.innerHeight`:
    - `enter = clamp(1 - rect.top / vh, 0, 1)`
    - `span = rect.height - vh`; `progress = span > 0 ? clamp(-rect.top / span, 0, 1) : 0`
    - Escribe sobre `stageRef.current.style`: `--story-enter` y `--story-progress`, con 4 decimales (`toFixed(4)`), como cadenas sin unidad.
3. `index = clamp(Math.round(progress * (slides - 1)), 0, slides - 1)`. Se sube a estado de React **solo cuando cambia**.
4. `direction`: se compara `rect.top` con el del frame anterior. Movimiento hacia abajo en la página (`rect.top` decreciente) ⇒ `"forward"`; hacia arriba ⇒ `"rewind"`. Se ignoran deltas menores de 2px (umbral anti-jitter, constante nombrada en el archivo). Se sube a estado **solo cuando cambia**.
5. Bajo `prefers-reduced-motion: reduce` (leído con `matchMedia` y escuchando cambios, mismo patrón que `useSceneParallax`): NO se registra ningún rAF, NO se escribe ninguna variable CSS, `index` se queda en 0 y `direction` en `"forward"` (D6).
6. Limpieza al desmontar: cancelar rAF, desconectar el observer y quitar el listener de `matchMedia`. Sin fugas.

- [ ] **Step 1: test primero, en ROJO**

`useStoryDeck.test.tsx` con `renderHook`. Necesitarás stubs de `IntersectionObserver`, `requestAnimationFrame`/`cancelAnimationFrame` y `matchMedia` — mira `src/hooks/useSceneParallax.test.tsx` y `src/hooks/useReveal.test.tsx`, que ya resuelven exactamente estos tres stubs en este repo; **reutiliza su patrón, no inventes otro**. Casos mínimos:

- sin intersección no se registra ningún `requestAnimationFrame`;
- con intersección y `rect.top = 0`, `rect.height = 6*vh`: `index === 0` y `--story-progress` escrito a `"0.0000"`;
- con `rect.top = -(rect.height - vh)` (final de la pista): `index === STORY_SLIDES - 1` y progreso `"1.0000"`;
- un `rect.top` intermedio cae en el índice correcto (elige un valor que caiga claramente dentro de un tramo, no en la frontera);
- invertir el sentido (dos frames con `rect.top` creciente) pone `direction === "rewind"`, y volver a decrecer lo devuelve a `"forward"`;
- un delta menor que el umbral no cambia `direction`;
- bajo `matchMedia("(prefers-reduced-motion: reduce)")` verdadero no se registra ningún rAF y el estado se queda en `{ index: 0, direction: "forward" }`;
- al desmontar se cancela el rAF pendiente y se desconecta el observer.

Ejecuta y guarda el rojo.

- [ ] **Step 2: implementar hasta verde**, documentando en el archivo (comentarios en español, estilo del repo — mira `useSceneParallax.ts` y `useNavDetach.ts` como referencia de tono): por qué el progreso se escribe como variable CSS y no como estado (cero re-renders por frame), por qué `index`/`direction` SÍ son estado (son atributos, y un atributo es lo único que jsdom puede verificar de toda la coreografía), y por qué el rAF va guardado por `IntersectionObserver`.

- [ ] **Step 3: verificar**

```bash
pnpm vitest run src/hooks
pnpm typecheck
pnpm lint
```

---

## Task 3: La presentación (`story.deck.tsx` + rama oscura de `Story`)

**Depende de:** Task 1 y Task 2.

**Files:**

- Create: `src/components/sections/Story/story.deck.tsx`
- Modify: `src/components/sections/Story/Story.tsx` (SOLO la rama oscura)
- Modify: `src/components/sections/Story/Story.test.tsx` (SOLO añadiendo un `describe` nuevo)

- [ ] **Step 1: tests primero, en ROJO** — `describe` nuevo en `Story.test.tsx`, con el tema en oscuro (`localStorage.setItem("vti-theme","dark")`, igual que el describe oscuro que ya existe), sin tocar ninguno de los 13 tests actuales:

- en oscuro hay exactamente `STORY_SLIDES` elementos `[data-slide-index]`;
- la diapositiva 0 contiene el `h2#story-title`; las 1–4 contienen, en orden, `01 —`…`04 —` con el título i18n de `learn/create/grow/practice`; la 5 contiene el texto de `Home.story.note`;
- el stage arranca con `data-slide="0"` y `data-dir="forward"`;
- `getComputedStyle` del deck devuelve `max-width` igual a `STORY_DARK_MAX_WIDTH` (constante importada, no literal);
- el CSS inyectado contiene un bloque `@media (prefers-reduced-motion: reduce)` que devuelve la pista a flujo (`position: static` en el stage y alto automático en la pista), y la `@keyframes` del scrub aparece SOLO dentro de un bloque `no-preference` (todo por TEXTO del CSS, con el helper de lectura de reglas que ya usan otros tests del repo);
- los 8 `<img>` de la escena siguen presentes en oscuro (no se rompe el contrato existente).

- [ ] **Step 2: `story.deck.tsx`** — los styled de la presentación. Estructura exacta (§4 de la spec):

```
ScTrack        position: relative; height: STORY_DECK_TRACK_HEIGHT
ScStage        position: sticky; top: 0; height: STORY_DARK_HEIGHT; overflow: hidden;
               background: semantic.bg; transform-origin: center;
               transform: scale(...) y border-radius interpolados desde var(--story-enter)
ScSceneWrap    position: absolute; inset: 0; transform desde var(--story-progress) (D10)
ScDeck         position: relative; z-index: 1; height: 100%; max-width: STORY_DARK_MAX_WIDTH;
               margin-inline: auto; display: grid; place-items: center; padding lateral por token
ScSlide        grid-area: 1/1 (las 6 apiladas en la misma celda); opacity/transform por data-state
ScRail         decorativo, 6 marcas, refleja data-slide del stage por selector descendiente
ScSnapPoints   position: absolute; inset: 0; pointer-events: none
ScSnapPoint    height: STORY_DARK_HEIGHT; scroll-snap-align: start
```

Notas de implementación que NO puedes saltarte:

- **`ScStage` no puede tener ningún ancestro con `overflow` distinto de `visible`/`clip`** (D15b/D15c). El `overflow: hidden` que hoy tiene la rama oscura de `ScStory` desaparece; el recorte lo hace `ScStage`.
- Las 6 diapositivas se apilan con `grid-area: 1 / 1` dentro de `ScDeck`, **no** con `position: absolute`: así el grid les da el mismo tamaño sin sacar nada del flujo, y el fallback de `reduce` (Step 4) es un cambio de `grid-auto-flow`, no una reescritura del posicionamiento.
- El estado de cada diapositiva se decide en el JSX (`data-state="past" | "current" | "next"`) comparando su índice con el `index` del hook; el CSS solo reacciona al atributo.
- La interpolación desde `var(--story-enter)`: usa `calc()` sobre la variable (p. ej. `scale(calc(${STORY_STAGE_ENTER_SCALE} + (1 - ${STORY_STAGE_ENTER_SCALE}) * var(--story-enter, 1)))`). Declara el **valor por defecto** en cada `var()` (`var(--story-enter, 1)`) para que el estado sin JS —y el primer frame antes de que el rAF escriba— sea el estado FINAL, no el inicial: si el hook nunca corre, la presentación se ve abierta y legible, no encogida.
- `@keyframes` del scrub (`data-dir="rewind"`): micro-desplazamiento en X + caída breve de opacidad, duración `STORY_SCRUB_MS`, declarada SOLO dentro de `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 3: rama oscura de `Story.tsx`**

Sustituye el `return` oscuro por la estructura de §4 de la spec. Conserva **literalmente**: `id="story"`, `aria-labelledby="story-title"`, el único `h2` con `id="story-title"` (diapositiva 0), los 4 pilares con su numeración `01 —`…`04 —` y su `pillarColor(index)`, el texto de la nota, y `<StoryCosmicHeart />`. La rama clara y todo lo que solo ella usa (figura, halo, tarjeta, sparkle, `ScGrid`) se quedan exactamente como están.

Refs: `trackRef` y `stageRef` locales, pasados a `useStoryDeck`.

- [ ] **Step 4: fallback de `reduce` (D6)**

En `@media (prefers-reduced-motion: reduce)`: `ScTrack` a `height: auto`; `ScStage` a `position: static; height: auto; transform: none`; `ScDeck` a flujo (`display: block` o `grid-auto-flow: row`) para que las 6 diapositivas se apilen **una debajo de otra y todas visibles**; `ScSlide` a `opacity: 1; transform: none`; `ScSnapPoints` a `display: none`. Esto NO es "la misma presentación sin animación": es la degradación a documento, y sin ella 5 de 6 diapositivas serían contenido invisible.

- [ ] **Step 5: verificar**

```bash
pnpm vitest run src/components/sections/Story src/components/storyCosmicHeart
pnpm typecheck && pnpm lint
```

Los 13 tests previos de `Story.test.tsx` + los 2 de `StoryCosmicHeart.test.tsx` + los nuevos, todos verdes, sin modificar los previos.

---

## Task 4: Gate, verificación en navegador y cierre

**Depende de:** Tasks 1–3. La ejecuta el hilo principal (revisor), no un subagente.

- [ ] **Step 1: gate completo** — `pnpm test` sin fallos nuevos respecto al baseline (509 + el preexistente); `pnpm check` con `typecheck`/`lint` limpios y `check-format` sin diferencias fuera de `graphify-out/**`.

- [ ] **Step 2: verificación en navegador real** (obligatoria — jsdom no ve nada de esto). Con el tema en oscuro:
    - el stage se queda clavado (`rect.top === 0`) durante los 5 viewports de la pista, y se despega al final;
    - `--story-enter` va de 0 a 1 al aproximarse y vuelve a bajar al subir; el stage abre y cierra;
    - `data-slide` recorre 0→5 al bajar y 5→0 al subir; `data-dir` cambia a `rewind` al invertir;
    - la escena mide el ancho y el alto completos del viewport, y el deck exactamente 1280px de tope;
    - el fondo del stage computa `oklch(0.22 0.093 311.928)`;
    - el snap se comporta (o se retira, D3);
    - los 4 enlaces de sección del navbar y el CTA del hero siguen saltando bien;
    - `document.documentElement.scrollWidth === clientWidth` (D15b no reintrodujo desbordamiento);
    - consola limpia.
- [ ] **Step 3: `graphify update .`**
- [ ] **Step 4: commits temáticos en español + registro en el vault** con la skill `registro-vault`, y lecciones nuevas en `task/lessons.md` si la verificación descubre alguna.
