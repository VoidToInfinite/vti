# DESIGN.md

Sistema visual real del proyecto **vti**, tal y como está en el código hoy. No es una aspiración ni una guía de estilo redactada aparte: cada afirmación de este documento está verificada contra el archivo fuente citado. Cuando una decisión tuvo una medición detrás (un ratio de contraste, un tiempo en milisegundos, una geometría), el número se copia literal del código y de sus docblocks — nunca se redondea ni se reconstruye de memoria.

Convención de lectura: **sistema** = un token o regla que vive en `src/theme/` o `src/motion/` y que cualquier componente puede consumir. **Literal por escena** = un valor de arte transcrito verbatim de un mockup aprobado, que vive junto a la escena que lo usa y nunca se reescribe a mano ni se sustituye por un token — solo se importa.

---

## 1. Principios

- **Cada decisión con su porqué.** El repo tiene el hábito de documentar en el propio código no solo el valor elegido, sino la medición que lo motivó y, cuando aplica, el valor anterior que resultó insuficiente. Ejemplo: `src/theme/tokens/color.ts` explica que `L[7]` (el paso 700 de la escalera de luminosidad) bajó de 0.58 a 0.53 porque, a 0.58, `neutral[700]` (`textSubtle`) y `primary[700]` (`brandSolid`/`focus`) no llegaban a los ratios AA exigidos sobre los fondos claros del sistema.
- **Sistema vs. literal por escena, siempre distinguidos.** Un token de `src/theme/tokens/` es un rol reutilizable que cambia con el tema o se comparte entre componentes. Un literal de `*.layers.ts` es arte de una composición concreta, transcrito de un mockup, y vive fuera de la capa de tokens a propósito — mezclar los dos convertiría un ajuste de marca en una cirugía por archivo.
- **La corrección se escribe, no se borra.** Cuando una decisión anterior resultó falsa (un valor que no pasaba AA, una constante que dejó de tener sentido), el docblock que la sustituye explica qué había antes y por qué cambió, en vez de solo mostrar el valor final.
- **Este documento hereda ese mismo hábito**: ver el criterio de registro en la sección 9.

---

## 2. Color

### 2.1 Generación (`src/theme/tokens/color.ts`)

Todo el color del sistema se genera desde dos tablas compartidas por los seis hues:

- **Escalera de luminosidad `L`**, 12 pasos (`STEPS = 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100`): `0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.53, 0.5, 0.42, 0.32, 0.22`.
- **Multiplicador de croma `CMUL`**, con pico en el paso 500 (`1`) y decaimiento hacia los dos extremos: `0.1, 0.2, 0.42, 0.66, 0.9, 1, 0.94, 0.82, 0.72, 0.62, 0.5, 0.36`.

Seis rampas resultantes, todas `oklch(L C H)`, sin un solo hexadecimal en la capa de tokens:

| Rampa       | Hue        | Croma pico                                      |
| ----------- | ---------- | ----------------------------------------------- |
| `primary`   | 235.851    | 0.158                                           |
| `secondary` | 311.928    | 0.259                                           |
| `success`   | 140        | 0.17                                            |
| `warning`   | 70         | 0.16                                            |
| `error`     | 12         | 0.24                                            |
| `neutral`   | 286 (frío) | croma casi nulo (tabla `nc` propia, pico 0.006) |

**Decisión pagada:** `L[7]` (paso 700) bajó de 0.58 a 0.53 tras la auditoría AA. El docblock de `color.ts` remite a `semantic.ts` para el detalle de cada rol afectado.

### 2.2 Roles semánticos (`src/theme/tokens/semantic.ts`)

Cada rol lleva la medición que lo justifica escrita al lado, en el propio archivo.

**Claro:**

| Rol | Valor | Ratio medido |
| --- | --- | --- |
| `bg` | `neutral[50]` | — |
| `surface` | blanco (`oklch(1 0 0)`) | — |
| `surfaceSunken` | `neutral[100]` | — |
| `text` | `neutral[1000]` | — |
| `textMuted` | `neutral[800]` | — |
| `textSubtle` | `neutral[700]` | 5.06 / 5.28 / 4.70 (sobre `bg`/`surface`/`surfaceSunken`) |
| `brand` | `primary[500]` | — |
| `brandSolid` | `primary[800]` | 5.84:1 |
| `brandText` | `primary[800]` | igual valor OKLCH que `brandSolid` — mismo primitivo, dos roles de uso distinto (fondo de botón sólido vs. color de texto de marca), no un colapso accidental |
| `focus` | `primary[700]` | 4.86:1 sobre `bg`, 5.07:1 sobre `surface` |
| `success` | `success[800]` | 5.47:1 |
| `warning` | `warning[800]` | 5.89:1 |
| `error` | `error[700]` | — |

Antes de la corrección: `neutral[600]` daba 2.98/3.11/2.77 (falla 4.5:1); `primary[700]` daba 4.17:1 en `brandSolid`/`onBrand` (falla 4.5:1); `primary[500]` daba 2.18:1 en `focus`/`bg` (falla el 3:1 que exige WCAG 1.4.11/2.4.11 al indicador de foco, y afectaba a todos los elementos interactivos del sitio); `success[700]`/`warning[700]` daban 3.89/4.22:1 (fallan 4.5:1, y no hay paso intermedio 750).

**Oscuro:** `bg` = `secondary[1100]`, `surface` = `neutral[1000]`, `text` = `neutral[50]`, `textMuted` = `neutral[300]`, `textSubtle` = `neutral[400]`, `brand` = `primary[400]`, `brandSolid` = `primary[500]`, `brandText` = `primary[300]`, `focus` = `primary[400]`, `onBrand` = `neutral[1100]`, `success`/`warning`/`error` = paso 500 de su rampa.

### 2.3 REGLA DE CONTRASTE DE LA CASA

Dos lecciones pagadas, hoy regla fija (`src/theme/tokens/contrast.ts`):

1. Cuando un token de `palette` porta glifos (texto, iconos), su contraste se mide contra el **fondo real** sobre el que se pinta — no contra `surface` genérico.
2. Se mide por el **píxel peor** del rectángulo, nunca por la media.

Cuando el fondo es un `color-mix` (superficie semitransparente compuesta sobre otro fondo), `contrastRatioOverAlpha` reproduce la mezcla en RGB lineal — el espacio donde una interpolación de color es físicamente correcta — y la contrasta contra el resultado. El propio docblock advierte que un navegador real compone alfa en el espacio de la superficie (con gamma), así que el número calculado y el medido en navegador no tienen por qué coincidir al decimal; se comprobaron los dos caminos al escribirlo y ambos dan holgadamente por encima de AA en los dos temas. Para una medición al píxel sobre el render real, la vía documentada es pintar en un canvas 1×1 y leerlo.

### 2.4 Pares de acentos

- **Features** (`accentColor`/`accentColorHover`, `src/components/sections/Features/Features.tsx`): el paso claro (600 de la rampa `primary`/`secondary`, según la tarjeta) pinta iconos y CTA; el paso oscuro (700) pinta el número del badge. Medido: el paso 600 sobre el fondo `color-mix(in oklab, accentColor 12%, semantic.surface)` del propio badge da entre 2.69:1 y 3.46:1 según la tarjeta — no llega a AA (4.5:1). El paso 700 sobre el mismo fondo da 4.52:1/5.21:1/4.66:1, que sí cumple en las tres.
- **Story** (`pillarColor`/`pillarBadgeAccent`, `src/components/sections/Story/Story.tsx`): mismo patrón. `pillarColor` sigue siendo el acento de `ScPillarNumber` en la rama oscura; `pillarBadgeAccent` es un acento distinto para el número del badge, motivado por la misma medición (tres de los cuatro acentos de `pillarColor` no llegaban a AA sobre el `color-mix` del badge).

### 2.5 Excepciones sancionadas (literales de arte)

Viven siempre en un `*.layers.ts`, con manifest y docblock, y se importan — nunca se reescriben:

| Constante | Valor | Archivo |
| --- | --- | --- |
| `EYE_SURFACE` | `oklch(0 0 0)` | `src/components/scenes/eye/eye.layers.ts` |
| `AURA_SURFACE` | `oklch(0.942 0.023 285)` | `src/components/scenes/aura/aura.layers.ts` |
| `CONTACT_GUARDIAN_VOID` | `#0d0416` | `src/components/scenes/contactCosmicGuardian/contactCosmicGuardian.layers.ts` |
| `FOOTER_DARK_BG` | `oklch(0.055 0.01 288)` | `src/components/layout/Footer/footer.layers.ts` |

A estas se suman paradas verbatim de mockups en piezas concretas: por ejemplo `STORY_HALO_GRADIENT`, `STORY_ACCENT_GRADIENT_LIGHT`/`_DARK` (`src/components/sections/Story/story.layers.ts`) y las constantes de acento de Gaming en Features (`FEATURES_GAMING_TITLE_GRADIENT`, `FEATURES_GAMING_ACCENT`/`_HOVER`, `src/components/sections/Features/features.layers.ts`) — hues que no coinciden con `primary`/`secondary` de marca y que, por tanto, no son sustituibles por un paso de rampa sin cambiar el arte.

---

## 3. Tipografía

### 3.1 Familias

- **Hanken Grotesk** — cuerpo, `--font-body`.
- **JetBrains Mono** — números de badge, `--font-mono`, con `preload: false` desde 2026-08-08.

Ambas vía `next/font/google`, `display: swap`, autoalojadas, con métricas de fallback generadas por Next (neutralizan el CLS del swap).

### 3.2 Escala del sistema (`src/theme/tokens/type.ts`)

12 variantes (`display`, `h1`…`h5`, `bodyLg`, `body`, `bodySm`, `caption`, `overline`, `code`), cada una con `size`/`weight`/`lineHeight`/`tracking`.

**Dos problemas documentados honestamente, no ocultos:**

1. **h4→h5 colapsa por abajo.** `h4` = 1.25rem (20px) → `h5` = 1.125rem (18px): un salto de solo 1.11× entre dos pasos consecutivos de la escala.
2. **h5 = bodyLg en tamaño exacto.** Ambos son `1.125rem`; solo divergen en peso (`h5` 600 vs `bodyLg` 400) e interlineado (`h5` 1.35 vs `bodyLg` 1.55).

### 3.3 Segundo nivel: tipografía por escena

Un segundo nivel de tamaños vive fuera de `type.ts`, por escena, y no pasa por la escala del sistema:

- **Titular del hero**: `clamp(34px, 8vw, 258px)` — literal pedido por el usuario, excepción de identidad.
- **Subtítulo del hero**: `clamp(15px, 2vw, 22px)`.
- **Statement de Story**: fórmula `min()` de tres términos, estimada sin navegador — riesgo de desbordamiento con `white-space: nowrap` (ver deuda visual, §9).
- Escalas de cartel propias de `journey.layers.ts` y `story.deck.tsx`, y aproximadamente una docena de tamaños sueltos más, cada uno en el archivo de la composición que lo usa.

**Regla que gobierna este segundo nivel:** un tamaño fuera de la escala se admite cuando es literal de un mockup aprobado o encargo explícito del usuario, y se documenta en el mismo archivo con el porqué — nunca como un atajo sin registro.

### 3.4 Reglas transversales

- `text-wrap: balance` en `h1`-`h3`/`display`; `balance` + `text-wrap-style` en cuerpos.
- `hyphens: auto` global, con `manual` en la marca.
- Medida de línea: `65ch` (`grid.prose`) para cuerpo largo, `34ch` (`grid.proseTight`) para subtítulos — a los 65ch de `prose` y 24px, el subtítulo del hero sería una única línea interminable, lo contrario de un subtítulo.

### 3.5 Gotcha: `forwardedAs`

Sobre `styled(Typography)` se usa `forwardedAs`, **nunca** `as`. Con `as`, styled-components consume el prop y descarta `Typography` entero — medido, no teórico. El patrón aparece en seis archivos del repo (`Story.tsx`, `Hero.tsx`, `Features.tsx`, `story.deck.tsx` y sus tests).

---

## 4. Temas

**El tema NO es una piel: es un modo de contenido.** Es la decisión de producto más grande del repo y tiene que estar escrita como tal.

Dos temas en `src/theme/themes.ts` comparten un objeto `shared` (`palette`, `type`, `space`, `radius`, `elevation`, `zIndex`, `motion`, `grid`) y divergen solo en `semantic`, `glass` e `isLight`. Breakpoints idénticos en los dos: `sm` 600px / `md` 768px / `lg` 992px / `xl` 1200px.

Tabla de divergencias de **contenido** por sección (no solo de color):

| Sección | Claro | Oscuro |
| --- | --- | --- |
| Story | 2 secciones de contenido | 1 sección |
| Features | título + intro visibles | solo un overline de 11px con `aria-labelledby`; sin `h2` ni intro |
| Contact | chip + CTA | formulario completo |

Las secciones oscuras, además, pasan de contenedor centrado a sangre completa con decks pegados — un cambio de layout, no solo de paleta.

**Regla del `ThemeProvider` único** (dos bugs pagados): solo hay un `ThemeProvider` en todo el árbol (`app/providers.tsx`, envolviendo `StageProvider`/`I18nProvider`/`children`). `currentColor` y la cascada de CSS heredan del árbol ambiental, no del contextual — cualquier contenedor que separe visualmente dos contextos de tema (p. ej. un componente legal que vive fuera del flujo normal) debe fijar `color` explícito, porque de lo contrario hereda de `body` vía `GlobalStyles` (`a { color: inherit }`), no del tema que uno esperaría por proximidad visual. Ejemplo real del propio código: `src/components/legal/LegalHeader.tsx` fija `color` explícito por este motivo exacto.

---

## 5. Movimiento

### 5.1 Escala (`src/theme/tokens/motion.ts`)

**Duraciones:** `instant` 0ms · `fast` 100ms · `base` 200ms · `slow` 320ms · `slower` 480ms · `ambient` 1500ms · `spin` 700ms · `spinReduced` 2100ms.

**Curvas:** `standard`, `decelerate`, `accelerate`, `emphasized` (las cuatro monótonas) y `overshoot` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — la única que sobrepasa su valor final antes de asentar, reservada al despegue del navbar al hacer scroll, no a transiciones de interfaz normales.

### 5.2 Reglas duras (ya cumplidas por el código, con su porqué medido)

- **Solo `transform`/`opacity`** animan por defecto (más `background-color` en tintes de estado y `box-shadow` acotado a hover). Excepciones vigentes y documentadas: el navbar anima `padding-inline`, `max-width`, `margin-top`, `border-radius`; su panel usa `visibility`.
- **Toda animación infinita** vive solo dentro de `@media (prefers-reduced-motion: no-preference)`, con `animation: none` explícito bajo reduce. El colapso global (`animation-iteration-count: 1 !important`) **no detiene** una animación infinita — la deja aterrizar en un fotograma arbitrario, así que no basta como guard por sí solo. Las 20 apariciones de `infinite` del repo están verificadas y cumplen la regla. Única excepción: el spinner de `Button`, que bajo reduce se ralentiza a `spinReduced` en vez de congelarse — un spinner inmóvil deja de comunicar carga.
- El guard de reduce cubre **los tres estados** de la máquina de fases del hero (`pending`/`active`/`leaving`, ver `HeroBackdrop.test.tsx`).
- Dos `@keyframes` sobre la misma propiedad conviven mal: gana la última declarada en `animation-name`, y una `transition` sobre una propiedad ya tomada por `@keyframes` no llega a existir. De ahí los envoltorios en dos elementos: el parallax vive en el `div` padre, la flotación en el `img` hijo.
- Entrada y hover viven en elementos **distintos**, porque `transition-delay` afecta a todos los cambios de esa propiedad en ese elemento — mezclarlos retrasaría el hover con el delay de la entrada.
- Los retardos (`animation-delay`) también se anulan bajo reduce: el colapso global no los cubre automáticamente, hay que anularlos explícitamente.
- **`scroll-snap` prohibido**, retirado el 2026-07-31 con mediciones (`GlobalStyles.tsx`). Motivo: las anclas de la presentación de Story medían exactamente una pantalla, así que cualquier posición de scroll caía siempre a menos de media pantalla de un ancla. Con esa geometría, `proximity` degeneraba en `mandatory`: pidiendo posiciones concretas y viendo dónde aterrizaba de verdad se midieron tirones de hasta 240px (900→720, 1200→1440, 3100→2880), a veces en contra del sentido del gesto. El anclado hoy es `position: sticky` en el `stage`, sin snap.

### 5.3 Coreografía de carga (`src/motion/timings.ts` + `src/components/sections/Hero/hero.transition.ts`)

Valores derivados, no elegidos a mano:

| Constante | Valor | Derivación |
| --- | --- | --- |
| `HERO_FADE_MS` | 420 | duración del fundido de una capa (2 × `motion.duration.base`) |
| `HERO_STEP_MS` | 110 | paso del stagger entre capas |
| `HERO_STAGGER_STEPS` | 6 | `Math.max` entre `EYE_STAGGER.length` (6, oscuro) y `AURA_STAGGER.length` (5, claro) |
| `HERO_STACK_MS` | 970 | `HERO_FADE_MS + (HERO_STAGGER_STEPS − 1) × HERO_STEP_MS` = 420 + 5×110 |
| `HERO_DECODE_TIMEOUT_MS` | 600 | tope de espera de `img.decode()` antes de arrancar igualmente |
| `HERO_CHROME_OFFSET_MS` | 760 | `(HERO_STAGGER_STEPS − 1) × HERO_STEP_MS + HERO_FADE_MS / 2` = 550 + 210 |
| `HERO_HANDOFF_MS` | 1070 | `HERO_BACKDROP_HOLD_MS + HERO_STACK_MS` = 100 + 970 |
| `HERO_COPY_RETURN_MS` | 1830 | `HERO_HANDOFF_MS + HERO_CHROME_OFFSET_MS` = 1070 + 760 |
| `STAGE_FALLBACK_MS` | 1570 | `HERO_DECODE_TIMEOUT_MS + HERO_STACK_MS` (peor caso honesto de cuánto puede tardar un hero real en avisar) |

`hero.transition.ts` NO duplica estos timings núcleo: los reexporta desde `src/motion/timings.ts`, que es su fuente de verdad. Los timings propios del cruce de la copia del hero (`HERO_COPY_OUT_MS` 100, `HERO_COPY_IN_MS` 320, `HERO_BACKDROP_HOLD_MS` 100) sí son propios de `hero.transition.ts`, porque su hook (`useHeroCopySwap`) necesita `"use client"` y `src/motion/timings.ts` se mantiene deliberadamente sin esa directiva (evita que `src/motion/stage.ts` — infraestructura de página, no de una sección — la herede por transitividad).

**Máquina de fases** (`src/motion/stage.ts`): `"backdrop" → "chrome" → "settled"`, **terminal**. `"backdrop"` es el estado inicial (fondo revelándose, navbar y copia ocultos). `"chrome"` arranca cuando el fondo avisa o vence `STAGE_FALLBACK_MS`. `"settled"` es definitivo: nada vuelve a `"backdrop"` — los cambios de tema posteriores no reinician el intro.

---

## 6. Patrones de escena y deck

### 6.1 Escena por capas

Cada escena vive en su propio directorio, `src/components/scenes/<nombre>/`, con tres archivos (verificado en las siete escenas: `aura`, `contactCosmicGuardian`, `eye`, `featuresCelestialOrbital`, `journeyCosmicPortal`, `sectionBeam`, `storyCosmicBeing`):

- `<nombre>.layers.ts` — arte verbatim + manifest de capas.
- `<nombre>.parts.tsx` — piezas styled-components.
- `<Nombre>.tsx` — composición (nombre en PascalCase).

Las capas son WebP, animadas con `useSceneParallax` (`src/hooks/useSceneParallax.ts`), con `loading="lazy"` en todas las escenas salvo el hero (`Aura.tsx`/`Eye.tsx`, `loading="eager"`, y solo la capa de mayor prioridad LCP lleva además `fetchPriority="high"`).

`mix-blend-mode` y `transform` viven siempre en el **mismo** elemento: un contexto de apilamiento intermedio entre los dos rompe el modo de mezcla aditivo.

### 6.2 Deck anclado (Story, Journey)

Estructura de dos piezas: pista (`ScTrack`, alto de N pantallas) + escenario (`ScStage`, único hijo en flujo, `position: sticky`). `useSlideDeck` (`src/hooks/useSlideDeck.ts`) mide por `IntersectionObserver` + `scroll`/`resize` coalescidos en un rAF, y escribe `--<prefix>-enter`/`--<prefix>-progress` directamente como propiedades CSS sobre `stageRef.current.style` (nunca como estado de React, porque cambian a frecuencia de scroll). `index`/`direction` sí son estado de React — cambian por diapositiva, no por frame — y cada sección los traduce a `data-state="past"|"current"|"next"` por diapositiva (`slideState()` en `Story.tsx`/`Journey.tsx`).

**Ningún ancestro del escenario puede llevar `overflow` distinto de `visible`/`clip`**: cualquier otro valor desactiva el `sticky` en silencio.

### 6.3 Solape entre secciones

Escalera de z-index explícita: Story sin z-index propio (pinta en orden de DOM) → Journey `z-index: 1` → Features `z-index: 2` → Contact `z-index: 3` — verificado literalmente en `journey.deck.tsx`, `Features.tsx` y `Contact.tsx`. Se combina con `margin-block-start` negativo (con guard de reduce) para que una sección suba sobre la anterior.

La zona de "hold" (donde la escena de fondo se queda sola antes de que la siguiente sección la cubra) es una **caja propia** en una fila de grid nueva — nunca padding: el área de fila terminaría donde termina el contenido, y el pegado se soltaría antes de que la siguiente sección llegara a cubrirlo. Un margen negativo sobre un elemento `sticky` **amplía** su rectángulo de restricción, no lo recorta.

Para superponer dos hijos en el mismo punto del layout: contenedor `grid` + `grid-area: 1 / 1` en ambos hijos (patrón verificado en `Features.tsx`, `story.deck.tsx`, `journey.deck.tsx`).

---

## 7. Reset global y sus consecuencias

`src/theme/GlobalStyles.tsx` es un reset agresivo. Tres reglas del reset generan una obligación en cascada para cualquier componente que las use, y las tres están pagadas con un tropiezo medido:

1. `svg { width: 100%; display: block }` → todo SVG inline que no deba ocupar el 100% de su contenedor tiene que declarar su propio `width`/`height`/`flex: none`.
2. `img, picture, video, iframe, figure { width: 100%; object-fit: cover }` → toda figura con proporción propia tiene que declarar `width: auto` + `object-fit: contain` explícitamente, o el recorte por `cover` la deforma.
3. `body { line-height: 1.4em }` se hereda como **longitud resuelta** (22.4px a 16px de fuente base), no como factor — cualquier contenedor con glifos grandes que confíe en heredar un interlineado proporcional tiene que refijar su propio `line-height`.

**Candado de test:** `jsdom` no hace layout, así que los tests de estas reglas verifican **declaraciones** (vía `styleSheets`/`getComputedStyle` sobre el CSSOM), no el resultado geométrico; y `jsdom` no evalúa ningún `@media`, así que las reglas bajo `prefers-reduced-motion` no se pueden probar por esa vía.

---

## 8. Foco, elevación, z-index, cristal

**Foco:** anillo global `outline: 2px solid semantic.focus` + `outline-offset: 2px`, aplicado dentro de `:where(a, button, input, textarea, select, [tabindex]):focus-visible` — la especificidad de `:where()` es **cero** (hallazgo pendiente: los enlaces de navbar/footer/selector de idioma dependen solo de este anillo, sin refuerzo propio; ver §9). Los átomos con más presencia visual añaden un halo aditivo, `box-shadow 0 0 0 4px color-mix(focus 35%)`, que nunca sustituye al `outline`. `Input` refuerza además con su propio `:focus` — correcto para campos de formulario, donde el borde del control es parte del feedback.

**Elevación** (`src/theme/tokens/elevation.ts`): 5 pasos (0-4), todos `oklch(0 0 0 / α)` con alfa creciente (0.06 → 0.20) y offset/blur crecientes.

**Z-index** (`src/theme/tokens/zIndex.ts`): 8 pasos semánticos — `base` 0 · `raised` 10 · `stickyNav` 100 · `dropdown` 200 · `overlay` 900 · `modal` 1000 · `toast` 1100 · `max` 9999. Ningún valor arbitrario fuera de esta escala.

**Cristal** (`src/theme/tokens/glass.ts`): único glassmorphism sancionado del sistema, reservado a capas que flotan **sobre contenido en scroll** (navbar scrolleado, panel desplegable) — nunca superficies estáticas. `blur(14px)` en los dos temas; fondo semitransparente por sí solo, para quedar legible incluso sin soporte de `backdrop-filter` (claro `oklch(1 0 0 / 0.68)`, oscuro `oklch(0.178 0 0 / 0.68)`); `-webkit-backdrop-filter` siempre antes que `backdrop-filter` sin prefijo.

---

## 9. Deuda visual conocida

Prioridad tal y como la dejó la auditoría A2 (Opus, 2026-08-08), sin editorializar los hallazgos.

**ALTA**

- Flash claro→oscuro al hidratar: al recuperar el tema guardado, la página re-maqueta por completo (5 secciones claras ↔ 4 oscuras en contenido, no solo un recoloreado). Arreglo candidato: script inline en `<head>` que resuelva el tema antes del primer pintado.
- 760-1570 ms de pantalla vacía al cargar: todo el hero arranca en `opacity: 0`. Arreglo candidato: sacar la capa base del escalonado, o dar un estado inicial visible al HTML prerenderizado.
- Tres anchos de contenido conviviendo sin token único: `grid.navMax` (1280px, Story/Journey) vs `grid.containerMax` (1200px, Features/Contact/Footer), con canaletas divergentes.
- Sin navegación a secciones por debajo de 768px (decisión de alcance ya documentada, no un olvido).
- ~~Features en oscuro: el único encabezado es un overline de 11px con `aria-labelledby`; la rama clara tiene `h2` + intro que la oscura no consume.~~ **Resuelto (Task 11, dieta de ornamento A, 2026-08-09):** el kicker sigue siendo el `h2` real (`forwardedAs="h2"`, mismo `aria-labelledby`), pero sube de la variante `overline` (11px) a `h5` (18px) -- ya no es más pequeño que su propio cuerpo (`bodySm`, 14px). La rama clara sigue sin `intro` en la oscura (eso no era el hallazgo que esta tarea cerraba, sigue sin resolver).

**MEDIA**

- Escala tipográfica colapsa por abajo: `h4→h5` es un salto de 1.11×; `h5` = `bodyLg` en tamaño exacto.
- Anillo de foco con especificidad cero (`:where()`) y contraste no medido sobre arte (WCAG 2.4.11).
- Formulario de contacto vía `mailto` sin validación ni salida de fallo — `Field`/`Input` ya soportan estado de error, no está conectado.
- Interacción de contacto distinta por tema (chip en claro, formulario en oscuro) — coherente con "el tema es modo de contenido" (§4), pero sin resolver como experiencia única.
- Desplegables del navbar sin `aria-haspopup` ni flechas indicadoras.
- `aria-pressed` en los botones de idioma, que son mutuamente excluyentes (semántica de grupo radio, no de toggles independientes); el grupo no tiene etiqueta accesible.
- El botón de tema teletransporta la vista a top sin aviso (`aria-busy` propuesto y no implementado).
- Tema claro sin coreografía de entrada entre secciones — pendiente decidir si es intencional o orden de construcción.
- Statement de Story: tres `white-space: nowrap` con tope estimado a mano, sin verificar en navegador real — riesgo de desbordamiento. Pendiente de verificar a 320/375/768/1280/1920px en es/en.

**BAJA**

- Variante `lead` de `Typography` sin ningún consumidor.
- `brandSolid` = `brandText` en el tema claro (mismo primitivo, ver §2.2 — documentado, no un bug, pero listado por si un futuro retoque quiere separarlos).
- Tres andamiajes de numeración de pilares/badges conviviendo sin unificar.
- `height: 200px` fijo en una figura de Journey (candidato a `min-height`).
- Uso desigual de la escala de elevación tras el commit `7a2d2ac`.

**Pendiente de ojo humano (cambios de `7a2d2ac` sin test que los cubra):**

- Figura de Journey (`Journey.tsx`): `height: 150%` + `top: -50px` + `right: -50px` rompe el invariante que su propio docblock describía — riesgo de pintar sobre el header en viewports ≥1200px. El docblock necesita reescribirse para reflejar la geometría real.
- Tarjetas de Features posiblemente invisibles en reposo: blanco sobre `neutral[50]` sin borde ni sombra propios, contraste de superficie estimado en ~1.0:1 — habría que verificarlo en navegador.
- `STORY_FIGURE_WIDTH` (`450px`) y `STORY_FIGURE_ASPECT` (`375 / 548`) desincronizados: el ancho declarado (450px) no coincide con el componente de ancho de la relación de aspecto (375px), aunque la altura (548px) sí coincide en ambos. Desincronización verificada en `src/components/sections/Story/story.layers.ts`, arrastrada desde el commit `74458b2`.

---

## Discrepancias encontradas entre el material de origen y el código real

Verificando cada afirmación del informe de auditoría contra el código antes de escribir este documento (protocolo de veracidad), se encontró **una discrepancia real**, ya corregida en el texto de arriba:

- **El material de origen afirmaba:** "Capas WebP con srcSet 640/1024 (las de sección oscura 1024/2560)".
- **El código dice otra cosa.** Verificado en las siete escenas (`*.layers.ts` + el JSX que consume `srcSet`, p. ej. `src/components/scenes/aura/Aura.tsx:143`): la variante estrecha (`srcSmall`) es **siempre 1024px**, sin excepción, en las siete escenas. La variante nativa/ancha varía por escena: 1672px en los fondos del hero (`aura`, `eye`, mismo lienzo de origen), 1280px en `storyCosmicBeing`, y 2560px (reescalado desde un original más grande — 3344px en el caso de Journey) en `contactCosmicGuardian`, `featuresCelestialOrbital` y `journeyCosmicPortal`. El literal `srcSet` real, tomado de `Aura.tsx`, es `` `${layer.srcSmall} 1024w, ${layer.src} 1672w` `` — no hay ningún "640" en ninguna tabla de capas ni en ningún atributo `sizes` del repo (el breakpoint de `AURA_SIZES`, por ejemplo, es 700px, no 640px). En consecuencia, la regla real no es "640/1024 en claro, 1024/2560 en oscuro" sino "1024px siempre como variante estrecha, con la variante ancha determinada por el lienzo nativo de cada escena".

El resto del material (valores de `color.ts`/`semantic.ts`, la escala de tipografía y sus dos problemas, los breakpoints y tokens de `themes.ts`/`grid.ts`, los ocho pasos de z-index, los cinco de elevación, el par `glass`, los nueve timings de la coreografía del hero y `STAGE_FALLBACK_MS`, la máquina de fases `backdrop → chrome → settled`, el patrón de directorio de escenas, el mecanismo de `useSlideDeck`, la escalera de z-index entre secciones, las tres consecuencias del reset, el anillo de foco con especificidad cero, y los hallazgos de deuda visual incluida la desincronización `STORY_FIGURE_WIDTH`/`STORY_FIGURE_ASPECT`) se verificó contra el código real y coincide con precisión, incluidas las cifras exactas.

---

Este documento se actualiza en la misma entrega que cambia lo que describe.
