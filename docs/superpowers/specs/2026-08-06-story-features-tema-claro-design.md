# Story y Features en tema claro: presentación de tarjetas y microanimaciones

**Fecha:** 2026-08-06 · **Rama:** `feature/general-refactoring` **Encargo:** «mejora la presentación y microanimaciones del tema claro. Secciones **Story** y **Features** actualizadas según el HTML adjunto.» **Mockup de referencia:** `Landing v2.dc (1).html` (entregado por el usuario el 2026-08-06).

---

## 0. Qué cambia y qué no

Este documento cubre **solo las ramas CLARAS** de `Story` y `Features`. Las ramas oscuras (`StoryDeckDark` con su presentación de diapositivas, y la rama oscura de `Features` con `FeaturesCelestialOrbital`) **no se tocan**: son coreografías completas con specs propias (`2026-07-29-story-dark-cosmic-heart-design.md`, `2026-08-02-features-overlay-celestial-orbital-design.md`) y el encargo dice «tema claro».

El mockup está en **inglés** y el sitio prerenderiza en **español**. Las cadenas nuevas se traducen al español siguiendo el registro de la copia ya existente; el inglés se toma literal del mockup.

---

## 1. Estado actual medido (leído del código, no de memoria)

### Story, rama clara (`StoryLight`, `Story.tsx:435`)

- Cabecera: `ScKicker` (overline, `semantic.brandText`), `ScTitle` (h2 con `ScAccent` en degradado) y `ScBody`. **Sin barra** delante del kicker.
- Los cuatro pilares son **filas de lista** (`ScPillarRow`): `grid-template-columns: 2.5rem 1fr`, separadas por `border-block-start`, con el número como texto suelto («01 —») y dos líneas de copia (título + `body`).
- La clave i18n `Home.story.pillars.<key>.inspiration` **existe y está traducida en es/en, pero la rama clara no la consume**: hoy solo la usa la rama oscura (`Story.tsx:653`).
- Reveal: un único `useReveal` sobre `ScGrid`, sin escalonado.

### Features, rama clara (`Features.tsx`)

- Cabecera: `ScKicker` + un `h2` compuesto por las TRES palabras de marca coloreadas («Learning Imagination Gaming»), que es además el destino de `aria-labelledby`.
- Tres tarjetas con `ScItem`/`ScCard`, con **`$fullWidth` para `learning`** (layout asimétrico).
- Borde y sombra fijos por tarjeta (`FEATURE_CARD_VISUALS`), hover que solo cambia sombra, borde y `translateY`.
- Sin badge numérico, sin etiqueta de categoría, sin panel de imagen con círculo.

---

## 2. Decisiones

### D1 — Alcance quirúrgico

Solo `StoryLight` y la rama clara de `Features`, más las claves i18n nuevas y una declaración `@property` global. `story.deck.tsx`, `StoryCosmicBeing`, `FeaturesCelestialOrbital` y las ramas oscuras quedan **intactos**. Cualquier styled-component compartido por las dos ramas (`ScKicker`, `ScAccent`, `ScCheckIcon`, `ScCta`…) solo puede cambiar si el cambio es **neutro para la rama oscura**; si no lo es, se crea una variante clara aparte. Es la misma regla que la spec de tipografía del deck ya fijó al extraer `ScDeckTitle`.

### D2 — Los cuatro pilares de Story pasan de filas a tarjetas

Rejilla `repeat(auto-fit, minmax(15rem, 1fr))` con `gap: space[4]`, debajo del cuerpo de texto (mockup L86). Cada tarjeta:

| Pieza | Mockup | Token del sistema |
| --- | --- | --- |
| Fondo | `#FFFFFF` | `semantic.surface` |
| Borde | `1px solid oklch(0.945 0.006 262)` | `1px solid semantic.border` |
| Radio | `26px` | `radius["2xl"]` (24px) |
| Sombra reposo | doble sombra suave | `elevation[1]` |
| Sombra hover | doble sombra más profunda | `elevation[3]` |
| Relleno | `26px 26px 28px` | `space[5]` |
| Badge | `38×38`, radio `13px`, `color-mix(… 12%, white)` | `2.375rem`, `radius.lg`, `color-mix(in oklab, <acento> 12%, semantic.surface)` |
| Nº del badge | monoespaciada, 12px, bold | `type.fontMono`, `type.scale.caption` |
| Etiqueta «Step» | 10px, `letter-spacing .2em`, uppercase, `--text-muted` | variante `overline`, `semantic.textSubtle` |
| Título | 18px bold | `Typography variant="h5"` |
| Lead | 14px semibold, `--text-secondary` | `bodySm`, `semantic.textMuted` |
| Inspiración | 13px, `line-height 1.7`, `--text-muted` | `caption`/`bodySm`, `semantic.textSubtle` |

El **acento** de cada tarjeta salía de `pillarColor(index)` (`Story.tsx:89`), reutilizado tal cual.

> **Corrección de esta decisión, tras medir (2026-08-06).** Reutilizar `pillarColor` para el número del badge **incumplía la §3 de esta misma spec**: medidos sobre el fondo `color-mix` del badge, tres de los cuatro acentos se quedaban en 2.06:1, 2.45:1 y 3.05:1, muy por debajo del 4.5:1 de AA. D2 y §3 se contradecían y **gana §3**: un requisito de accesibilidad no cede ante una preferencia de reutilización. El propio mockup ya lo resolvía así — sus cuatro badges usan los pasos OSCUROS de la rampa (`--primary-700`, `--secondary-600`, `--secondary-700`, `--primary-600`), no los claros, precisamente porque el número tiene que leerse.
>
> `Story.tsx` estrena `pillarBadgeAccent()`, que continúa la misma rampa un paso más abajo. Contraste medido **en el navegador real, con `color-mix()` resuelto por el motor**: **4.88 · 4.99 · 5.51 · 7.45**. `pillarColor` no se toca: sigue siendo el acento de `ScPillarNumber`, pieza de la rama oscura, donde el fondo y los ratios son otros.

`Home.story.pillars.<key>.inspiration` pasa a consumirse también aquí, que es exactamente el segundo párrafo que el mockup pinta en cada tarjeta (L94, L103, L112, L121).

### D3 — Hover de tarjeta

`transform: translateY(-3px)` + subida de sombra, con `transition` de `transform`/`box-shadow` a `motion.duration.base`/`easing.standard` y guard de `prefers-reduced-motion: reduce`. `box-shadow` **no es** una propiedad de compositor: se acepta por la misma excepción ya sancionada para los tintes de estado (enmienda de §9 del sistema de lujo), acotada a hover y nunca ambiental.

### D4 — Eyebrow con barra, en las dos secciones

Barra de `1.75rem × 2px` en `semantic.brandText` + la etiqueta uppercase existente, con `gap: space[2]`. La barra es `aria-hidden`: es puntuación visual, no contenido.

### D5 — Features: tres tarjetas iguales

Se retira el caso especial `$fullWidth` de `learning`. Rejilla `repeat(auto-fit, minmax(17.5rem, 1fr))`, `gap: space[5]`, `align-items: stretch` (mockup L196).

### D6 — Features: cabecera nueva

El `h2` deja de ser las tres palabras de marca coloreadas y pasa a ser una frase real, con un párrafo de entrada debajo (mockup L193-194). `aria-labelledby="features-title"` apunta al `h2` nuevo. Claves i18n nuevas: `Home.features.title` y `Home.features.intro`.

Las tres palabras coloreadas (`ScSpanLearning`/`ScSpanImagination`/`ScSpanGaming`) **siguen existiendo**: las usa la rama oscura y no se tocan.

### D7 — Borde cónico animado en hover (Features)

Mecánica del mockup (L197): la tarjeta es un envoltorio con `padding: 1.5px` cuyo fondo es el borde, y dentro va la superficie blanca con radio interior. En reposo el fondo es `semantic.border`; al hover pasa a `conic-gradient(from var(--vti-angle), brand, secondary, brand, secondary, brand)` girando con `animation: 3200ms linear infinite`.

Para que el ángulo pueda interpolarse hace falta registrarlo:

```css
@property --vti-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
}
```

Va en `GlobalStyles.tsx` y **no dentro del styled-component**: `@property` es una regla de nivel superior de la hoja, y styled-components inyecta el CSS de un componente anidado bajo su clase.

**Excepción declarada al lenguaje de movimiento de la casa.** Esto anima una propiedad personalizada que repinta un `background-image`, no `transform`/`opacity`. Se acepta por los mismos motivos que la excepción ya sancionada del degradado de `BrandName`: es un efecto de marca, está **acotado al hover** (no es ambiental, no corre mientras nadie lo mira) y se declara solo bajo `@media (prefers-reduced-motion: no-preference)`.

**Degradación conocida y aceptada:** sin soporte de `@property`, `--vti-angle` no interpola y el borde queda como un degradado cónico **estático** en hover. Sigue siendo un borde de marca legible; no hay estado roto. No se añade `@supports` porque el fallback ya es correcto por construcción.

### D8 — Panel de imagen de las tarjetas de Features

Bloque de `13.5rem` de alto, `radius.xl`, fondo `color-mix(in oklab, <acento> 7%, semantic.surface)`, con un círculo decorativo de `11.125rem` en `color-mix(… 16% …)` desbordando por abajo (`aria-hidden`), y la figura por encima con `object-fit: contain` alineada al borde inferior (mockup L203-206).

### D9 — Escalonado del reveal

El mockup escalona con retardos por elemento: **0 / 80 / 140 / 200 / 260 / 320 / 380 ms**, con `opacity 0 → 1` y `translateY(22px) → 0` en **640 ms** `cubic-bezier(0.4,0,0.2,1)` (= `easing.standard`).

Se implementa con **un solo `IntersectionObserver` por sección** (el `useReveal` que ya existe), no con uno por elemento: los hijos declaran su escalón y el CSS aplica el `transition-delay`. Es el mismo patrón que el intro del hero (`data-intro` + `nth-child` en `Hero.tsx`) y evita multiplicar observadores, que es la deuda que `task/lessons.md` ya documenta para los rAF sin guarda.

Bajo `prefers-reduced-motion: reduce`: sin transición y **sin retardo**, visible de inmediato. El guard tiene que anular `transition-delay` explícitamente — `GlobalStyles` colapsa `animation-duration` y `transition-duration`, pero **no** `transition-delay`, y un retardo de 380 ms sobre un elemento invisible es peor que no animar (mismo razonamiento que `ScCopy` en `Hero.tsx`).

### D10 — Badges y etiquetas

- Story: número `01…04` + etiqueta `Home.story.stepLabel` («Paso» / «Step»).
- Features: número `01…03` + etiqueta `Home.features.<key>.badge` («Aprende/Crea/Juega» · «Learn/Create/Play»).

Los números son **decorativos** (`aria-hidden`): el orden ya lo comunica el DOM, y un lector de pantalla que anuncie «cero uno» antes de cada título añade ruido sin información.

---

## 3. Contrato de accesibilidad

- Contraste AA sobre `semantic.surface` para los tres niveles de texto de las tarjetas y para el color del badge sobre su fondo `color-mix`. Se ata con test, siguiendo el precedente de `contrast.test.ts`/`legalPage.contrast.test.ts`.
- El `h2` de Features sigue siendo el destino de `aria-labelledby` de la sección.
- Ni el reveal ni el hover pueden usar `display`/`visibility`/`aria-hidden` sobre contenido real: solo `opacity`/`transform`, que no alteran el árbol de accesibilidad ni el orden de tabulación.
- El área de clic del CTA de cada tarjeta conserva sus 44 px de alto mínimo.

## 4. Qué NO entra en esta entrega

- Las ramas oscuras de las dos secciones.
- Las secciones `Journey`, `Hero`, `Contact` y el pie, que el mockup también contiene: el encargo nombra **Story y Features**.

---

## 5. Segunda ronda (2026-08-06, capturas del usuario)

El usuario aporta dos capturas de cómo debe verse Story y **corrige una premisa de la §4**: el bloque `#statement` del mockup (L127) **no** es una sección nueva ajena a Story — es **la nota de cierre de Story**, promovida a pantalla completa. Se ve al comparar la copia: `Home.story.note` dice literalmente «Cada idea puede ser un nuevo comienzo» / «Every idea can become a new beginning», que es exactamente el texto de las tres líneas del bloque.

Queda por tanto DENTRO del alcance, y la §4 se corrige aquí en su sitio en vez de dejarla mintiendo.

### D11 — La figura iguala la altura de la columna de contenido

Medido en el navegador antes de tocar nada: la columna de la figura mide **548 px** y la de contenido **863 px**, con `align-items: center` — la tarjeta blanca queda flotando centrada y muy corta, en vez de acompañar al contenido de arriba abajo como en la captura.

La rejilla pasa a `align-items: stretch` y la tarjeta de la figura a ocupar el alto completo de su columna, con la ilustración centrada dentro (`object-fit: contain`). **No se fija una altura en píxeles**: el mockup usa `height: 855px` porque es un lienzo estático; aquí el alto correcto es «el que tenga la otra columna», y eso solo lo sabe el layout en tiempo real. Una constante se desincronizaría en cuanto cambie una línea de copia.

### D12 — La nota pasa a ser un statement a pantalla completa

La tarjeta flotante de la nota (`ScNoteCard` + su sparkle, rama clara) **desaparece**. En su lugar, tras la rejilla de Story, un bloque a **viewport completo** con la frase partida en tres líneas, en mayúsculas, tipografía de cartel fluida y centrada.

Copia: claves nuevas `Home.story.statement.first` / `.second` / `.third` (ya añadidas en es/en). `noteLead`/`noteAccent` **no se tocan**: los consume la diapositiva 5 de la rama oscura, con su propio corte en dos partes.

Entrada de cada línea (mockup L128-130), con `opacity 0 → 1` y **900 ms** `cubic-bezier(0.22, 0.61, 0.36, 1)`:

| Línea | Copia | Transform de entrada | Retardo | Color |
| --- | --- | --- | --- | --- |
| 1 | «Cada idea» | `translateX(-16%)` → 0 | 0 ms | `semantic.text` |
| 2 | «puede ser» | `scale(0.9)` → 1 | 220 ms | `semantic.brandText` |
| 3 | «un nuevo comienzo» | `translateX(16%)` → 0 | 440 ms | el degradado de marca de `ScAccent` |

Marcado: **un solo párrafo** con tres `<span>` en bloque, no tres bloques sueltos. Un lector de pantalla tiene que leer la frase entera y seguida; tres elementos hermanos la parten en tres fragmentos sin sentido propio. Los `<span>` son de presentación, y el `display: block` es lo que permite transformarlos por separado.

Mismas reglas de siempre: `useReveal` (uno, sobre el bloque), retardo por línea en CSS, y guard de `reduce` que anula transición **y retardo** en cada línea.

`white-space: nowrap` con tipografía fluida como la del mockup (`max(24px, min(10.5vw, 19.2vh, 340px))`) puede desbordar horizontalmente en viewports estrechos: el tamaño tiene que estar acotado también por el ancho disponible, y el bloque nunca puede producir scroll horizontal — `overflow-x: clip` global no es excusa para emitirlo.

**Resultado medido en navegador.** El tope se resolvió envolviendo la fórmula del mockup en un `min()` con un término derivado del ancho disponible:

| Viewport | Tamaño resuelto | Línea más ancha | Desbordamiento |
| -------- | --------------- | --------------- | -------------- |
| 1280 px  | 101.3 px        | 997 px          | 0              |
| 375 px   | 25.9 px         | 255 px          | 0              |
| 320 px   | 21.3 px         | 210 px          | 0              |

A 320 px el tope pisa el suelo de 24 px del mockup y baja a 21.3 px. Es la decisión correcta y se declara: «sin scroll horizontal» es invariante dura, «nunca por debajo de 24 px» no lo es.

**Consecuencia estructural.** El statement es una `<section id="statement">` hermana, así que en tema claro la home pasa a montar **cinco** secciones (`story` · `statement` · `journey` · `features` · `contact`), en el mismo orden que el mockup. La rama oscura sigue montando cuatro. `HomeSections.test.tsx` lo afirma entero en las dos ramas.

---

## 6. Tercera ronda (2026-08-06): el statement se recorre con el scroll

Encargo del usuario: «al estar dentro del viewport de aparición de la nota, debe hacerse scroll-snap y cada scroll vertical hacia abajo que realice el usuario se vaya mostrando una a una las opciones. Cuando el usuario scrollea hacia arriba llegando al contenido principal de la sección, ocultar nuevamente la nota.»

### D13 — de cascada automática a presentación anclada

El statement deja de revelarse solo (una cascada de 0/220/440 ms que corría entera en cuanto el bloque entraba en pantalla) y pasa a **recorrerse con el scroll**: el bloque se queda anclado mientras el usuario avanza, y cada paso descubre una línea.

Se implementa con **`useSlideDeck`**, el mismo motor que ya gobierna la presentación oscura de Story — no con un mecanismo nuevo:

- `ScStatementTrack` da el recorrido de scroll (una pantalla por línea más una de cola, para que la frase completa se lea antes de soltar el ancla). Bajo `reduce`, `height: auto`: sin pin no hace falta recorrido propio.
- `ScStatementStage` es su **único hijo en flujo**, `position: sticky` a `100dvh`: es lo que mantiene la frase quieta en pantalla mientras la pista pasa por debajo.
- `useSlideDeck(trackRef, stageRef, 3, { tailScreens: 1, cssVarPrefix: "statement" })` publica el índice activo.
- La línea `i` es visible cuando `index >= i`.

**La reversibilidad sale gratis y es la parte que el encargo pide explícitamente.** `index` no es un contador que solo suba: lo recalcula la posición real de la pista en cada medición, así que al scrollear hacia arriba baja, y las líneas se ocultan otra vez en orden inverso. Con el `useReveal` anterior (`once: true`) eso era imposible por construcción: una vez revelado, revelado para siempre.

Cada línea conserva su transform de entrada (izquierda / escala / derecha) y su duración. **Lo que desaparece son los retardos escalonados**: ya no hay cascada que escalonar — el paso lo marca el usuario con su scroll, que es justo el cambio conceptual de esta ronda.

### D13.1 — Sobre el `scroll-snap` literal: qué se hace y qué no

El encargo dice «scroll-snap». Se entrega el **efecto** (la sección se queda quieta y se recorre paso a paso) con el pin de `position: sticky`, **no** con la propiedad CSS `scroll-snap-type`.

El motivo no es preferencia, es una regresión medida en este mismo repo. `GlobalStyles.tsx` documenta que `scroll-snap-type: y proximity` vivió en `html` y **se retiró el 2026-07-31** tras medirlo: con anclas de una pantalla exacta, cualquier posición de scroll cae siempre a menos de media pantalla de un ancla, y `proximity` degenera en `mandatory`. Medido entonces pidiendo posiciones concretas y viendo dónde aterrizaba: `900 → 720`, `1200 → 1440`, `3100 → 2880` — tirones de hasta 240 px, a veces **en contra** del gesto. El síntoma que reportó el usuario fue «el scroll a veces no funciona».

El pin da el mismo efecto percibido sin reintroducir esa clase de fallo. Si aun así se quiere la propiedad CSS, es una línea (`scroll-snap-align` en el stage + `scroll-snap-type` en `html`), pero es una decisión que hay que tomar **sabiendo** que reactiva el mecanismo que ya robó el control del scroll una vez.

### D13.2 — Verificación medida

Estructura, medida en navegador a 1280×900:

| Pieza | Medido |
| --- | --- |
| Pista (`#statement`) | 3600 px = **4 pantallas** (3 líneas + 1 de cola) |
| Stage | `position: sticky`, `top: 0`, 900 px = `100dvh` |
| Hijos en flujo de la pista | **1** (el stage, como exige el pin) |
| Estado inicial | línea 1 visible, líneas 2 y 3 ocultas |

Candado de la regresión de 2026-07-31: la única aparición de `scroll-snap-type` en el bundle emitido es el **comentario histórico** de `GlobalStyles` que documenta su retirada, no una declaración activa.

**Lo que NO se pudo medir aquí, y por qué.** El avance línea a línea con un gesto real de scroll no se pudo observar: el panel corre con `document.visibilityState === "hidden"`. Comprobado directamente, no supuesto — instrumentando la propia página con un listener de `scroll`, un bucle de `requestAnimationFrame` y un `IntersectionObserver` propios, y provocando cuatro saltos de scroll reales: **0 eventos de scroll, 0 frames de rAF, 0 callbacks de IntersectionObserver**. Todo mecanismo ligado a scroll de la página queda inerte en ese estado, incluidos los que ya existían antes de esta ronda (`--story-progress`, que escribe `useSectionProgress`, sale vacía por lo mismo).

Es decir: el pin y el recorrido paso a paso quedan **verificados por estructura y por test, no por observación del gesto**. Esa parte necesita una mirada humana en un navegador visible.
