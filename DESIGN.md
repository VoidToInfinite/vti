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

Todo el color del sistema se genera desde dos tablas compartidas por los **cinco** hues (eran seis hasta la crítica externa #14, 2026-09-02, que retiró `success` por cero consumidores; la cifra de este párrafo y la del siguiente se corrigieron el 2026-09-03 al revisar esta sección en la #16 — la tabla de abajo ya listaba cinco):

- **Escalera de luminosidad `L`**, 12 pasos (`STEPS = 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100`): `0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.53, 0.5, 0.42, 0.32, 0.22`.
- **Multiplicador de croma `CMUL`**, con pico en el paso 500 (`1`) y decaimiento hacia los dos extremos: `0.1, 0.2, 0.42, 0.66, 0.9, 1, 0.94, 0.82, 0.72, 0.62, 0.5, 0.36`.

Cinco rampas resultantes, todas `oklch(L C H)`, sin un solo hexadecimal en la capa de tokens:

| Rampa       | Hue        | Croma pico                                      |
| ----------- | ---------- | ----------------------------------------------- |
| `primary`   | 235.851    | 0.158                                           |
| `secondary` | 311.928    | 0.259                                           |
| `warning`   | 70         | 0.16                                            |
| `error`     | 12         | 0.24                                            |
| `neutral`   | 286 (frío) | croma casi nulo (tabla `nc` propia, pico 0.006) |

**Decisión pagada:** `L[7]` (paso 700) bajó de 0.58 a 0.53 tras la auditoría AA. El docblock de `color.ts` remite a `semantic.ts` para el detalle de cada rol afectado.

**Un paso sin consumidor no es una hoja muerta** (crítica externa #16, 2026-09-03). El censo por paso da 30 de 60 sin consumidor directo — `warning` 2/12, `error` 3/12, `primary` 6/12, `neutral` 10/12, `secondary` 9/12 — y aun así no se poda ninguno: no son 60 hojas escritas a mano, son la salida de `ramp()` recorriendo la escalera compartida `STEPS`, así que «retirar `warning[50]`» no existe como operación (o se acorta `STEPS` para las cinco rampas, o se bifurca la fábrica y `Record<Step, string>` deja de ser cierto para todos sus lectores). La escalera es además el espacio de búsqueda del que se elige por contraste medido: `Contact.tsx` documenta que eligió `error[300]` porque `error[400]` daba 4,30:1 — el paso 400 no tiene consumidor y hizo falta que existiera para poder descartarlo. Lo que sí se poda es una RAMPA ENTERA sin un solo consumidor, y ese precedente ya se aplicó una vez (`success`, #14). Detalle completo y método en el docblock de `color.ts`.

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
| `warning` | `warning[800]` | 5.89:1 |
| `error` | `error[700]` | — |

El rol `success` (`success[800]`, 5.47:1 medido) se retiró el 2026-08-18 (ola de la crítica #10): su único camino era la rama `intent="success"` de Button, que ningún call site de producción alcanzaba — vocabulario inalcanzable, mismo criterio que `space.px`/`grid.columns`. La rampa primitiva `color.success` sobrevivió sin consumidor hasta la crítica externa #14 (2026-09-02), que la contó (doce valores, cero consumidores en `src/` y `app/`) y la retiró de `color.ts`; su candado es el tipo de la tabla de rampas, no una aserción de runtime.

Antes de la corrección: `neutral[600]` daba 2.98/3.11/2.77 (falla 4.5:1); `primary[700]` daba 4.17:1 en `brandSolid`/`onBrand` (falla 4.5:1); `primary[500]` daba 2.18:1 en `focus`/`bg` (falla el 3:1 que exige WCAG 1.4.11/2.4.11 al indicador de foco, y afectaba a todos los elementos interactivos del sitio); `success[700]`/`warning[700]` daban 3.89/4.22:1 (fallan 4.5:1, y no hay paso intermedio 750).

**Oscuro:** `bg` = `secondary[1100]`, `surface` = `secondary[1000]` (hasta la crítica externa #14 era `neutral[1000]`, croma 0 sobre un `bg` de croma 0,093 — la hoja móvil se leía gris sobre morado; el paso 1000 de la misma rampa es la única respuesta dentro del sistema a «mismo tono que `bg`, un paso más claro», y los siete pares de contraste sobre `surface` SUBEN con el cambio, de 12,150 a 12,904 en `text`; `surfaceSunken` se queda neutra a propósito: comparte L con `bg` y su croma cero es lo único que la separa del fondo), `text` = `neutral[50]`, `textMuted` = `neutral[300]`, `textSubtle` = `neutral[400]`, `brand` = `primary[400]`, `brandSolid` = `primary[500]`, `brandText` = `primary[300]`, `focus` = `primary[400]`, `onBrand` = `neutral[1100]`, `warning`/`error` = paso 500 de su rampa (`success` retirado, ver arriba).

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

9 variantes (`display`, `h1`, `h2`, `h3`, `h5`, `body`, `bodySm`, `caption`, `overline`), cada una con `size`/`weight`/`lineHeight`/`tracking`.

**Enmienda 2026-08-17 (crítica externa #9):** eran 12; se retiraron tres variantes con cero consumidores en todo el repo — `h4`, `bodyLg` y `code` — y con ellas se disolvieron los dos problemas que esta sección documentaba desde su origen: el colapso `h4`→`h5` (1,11×; sin `h4`, el salto real es `h3`→`h5` = 1,33×) y la igualdad de tamaño `h5` = `bodyLg`. `code` además nunca funcionó: `ScTypography` fijaba `fontBody` para todas las variantes, así que jamás se pintó monoespaciado (`type.fontMono` sigue vivo con su consumidor real en Story). El recuento de 9 quedó cerrado por candado en `type.test.ts`.

### 3.3 Segundo nivel: tipografía por escena

Un segundo nivel de tamaños vive fuera de `type.ts`, por escena, y no pasa por la escala del sistema:

- **Titular del hero**: `clamp(34px, 8vw, 258px)` — literal pedido por el usuario, excepción de identidad.
- **Subtítulo del hero**: `clamp(15px, 2vw, 22px)`.
- **Statement de Story**: fórmula `min()` de tres términos, estimada sin navegador — riesgo de desbordamiento con `white-space: nowrap` (ver deuda visual, §9).
- Escalas de cartel propias de `journey.layers.ts` y `story.deck.tsx`, y aproximadamente una docena de tamaños sueltos más, cada uno en el archivo de la composición que lo usa.

**Regla que gobierna este segundo nivel:** un tamaño fuera de la escala se admite cuando es literal de un mockup aprobado o encargo explícito del usuario, y se documenta en el mismo archivo con el porqué — nunca como un atajo sin registro.

### 3.4 Reglas transversales

- `text-wrap: balance` en `h1`-`h3`/`display` y en las piezas de cartel de los decks (nota de cierre, cita); **los cuerpos (`body`/`bodySm`) NO equilibran desde la crítica externa #14 (2026-09-02, decisión D1 del dueño)**: el equilibrado minimiza la línea más larga sin cambiar el número de líneas, así que deja de llenar la caja y anula la promesa de `grid.prose` (medido A/B sobre los mismos nodos: 53,5 caracteres por línea con equilibrado, 64,5 sin él). Cuidado con los `styled(Typography)` que declaran su propio `text-wrap`: ganan la cascada y hay que revisarlos uno a uno.
- `hyphens: auto` global, con `manual` en la marca.
- Medida de línea: `56ch` (`grid.prose`) para cuerpo largo. El objetivo siempre fue 60-75 **caracteres** por línea; el valor histórico `65ch` estaba en la unidad equivocada — la unidad `ch` es el ancho del glifo «0», y Hanken Grotesk rinde 1,259 caracteres por ch (medido, crítica externa #8, 2026-08-17), así que 65ch entregaban 79-82 caracteres reales. 52 × 1,259 ≈ 65,5 caracteres, dentro del objetivo. **Corregido otra vez en la crítica externa #13 (2026-08-19), y por otro motivo:** esa división da la caja donde 65 caracteres CABEN, no la que los ENTREGA — con bandera derecha la línea corta por palabra y desperdicia el hueco de la que no entra (8-10 % medido con `Range.getClientRects()`), así que 52ch realizaba 59 de media, bajo el suelo de 60. La derivación completa es `65 ÷ (1,259 × 0,92) = 56ch`, y el camino empírico sobre el corpus converge en el mismo entero. **Condición de validez (crítica externa #14, 2026-09-02):** el factor 0,92 se midió sobre corte greedy con bandera derecha; con `text-wrap: balance` en el cuerpo la caja deja de ser la restricción activa y el ancho no decide el recuento — por eso ensanchar de 52 a 56ch en la ola I no movió los 59 realizados. Sin equilibrado en cuerpos, la derivación vuelve a describir lo que se ve. El contrato es por SUPERFICIE, no por línea: con bandera derecha ninguna medida única garantiza un suelo línea a línea. `grid.proseTight` (34ch) se RETIRÓ en la crítica externa #13 por cero consumidores (destino declarado en su docblock). El tope de la copia del hero es `grid.heroCopyMax` (70ch) desde el 2026-08-18 (ola de la crítica #10) — antes era un literal repetido cinco veces entre `Hero.tsx` y `GlobalStyles.tsx`; no es una medida de prosa (su docblock explica por qué no se llama `proseWide`: es tope de columna, como `navMax`, no una promesa de recuento de caracteres).

### 3.5 Gotcha: `forwardedAs`

Sobre `styled(Typography)` se usa `forwardedAs`, **nunca** `as`. Con `as`, styled-components consume el prop y descarta `Typography` entero — medido, no teórico. El patrón aparece en seis archivos del repo (`Story.tsx`, `Hero.tsx`, `Features.tsx`, `story.deck.tsx` y sus tests).

---

## 4. Temas

**Enmienda 2026-08-12 (Task 25, plan premium F1-F5).** La afirmación de esta sección hasta hoy era "el tema NO es una piel: es un modo de contenido", y la tabla de abajo documentaba divergencias reales de contenido (no solo de color) entre Story/Features/Contact. Las Tasks 15 y 16 del plan premium (2026-08-11, decisión D-C del dueño confirmada en la Fase 0: "tema = piel con contenido unificado", ver `PRODUCT.md` §10) **invirtieron esa decisión**: las cuatro secciones comparten hoy un único árbol de contenido entre temas (mismo copy, mismos landmarks, mismas salidas), verificado en navegador real con la lista de `<section>` del DOM idéntica en los dos temas (`["hero","story","statement","journey","features","contact"]`, `task-15-report.md` §1). Lo que sigue ramificando por tema es **el vehículo** (contenedor: tarjeta/deck de diapositivas) **y el arte** (escena de fondo vs. ausencia de escena), no el contenido. La corrección se escribe, no se borra: la tabla vieja describía un estado real hasta el 2026-08-11; queda sustituida por la de abajo, que describe el estado real de hoy.

Dos temas en `src/theme/themes.ts` comparten un objeto `shared` (`palette`, `type`, `space`, `radius`, `elevation`, `zIndex`, `motion`, `grid`) y divergen solo en `semantic`, `glass` e `isLight`. Breakpoints idénticos en los dos: `sm` 600px / `md` 768px / `lg` 992px / `xl` 1200px.

Tabla de divergencias por sección, **contenido unificado desde las Tasks 15-16** (2026-08-11):

| Sección | Contenido (idéntico en los dos temas) | Lo que sigue ramificando por tema |
| --- | --- | --- |
| Story | Kicker + `<h2>` + cuerpo + 4 pilares + frase de cierre + salida a Discord | Vehículo: 4 tarjetas (claro) vs. deck de 6 diapositivas, la de cierre incluida (oscuro); arte: sin escena vs. `StoryCosmicBeing` |
| Features | Kicker con voz + `<h2>` + intro + 3 identidades (título, cuerpo, 4 bullets, CTA a `#contact`) | Vehículo: rejilla bento asimétrica (claro, Task 22) vs. lista de bloques (oscuro); arte: figura propia por tarjeta vs. `FeaturesCelestialOrbital` |
| Journey | `<h2>` + entradilla + 6 pasos (etiqueta + frase; posición «Paso N de 6» anunciada a AT en ambas ramas — el ordinal visible `01`… se retiró del claro en la ola G, 2026-08-18, para igualar con el oscuro, que nunca lo pintó por decisión D16/Task 16) + cita de cierre | Vehículo: tarjeta con ruta punteada (claro) vs. deck de 8 diapositivas (oscuro); arte |
| Contact | `<h2>` + cuerpo + formulario real con validación + panel de confirmación copiable + salidas Discord/GitHub + nota de privacidad (Task 18) | Vehículo: tarjeta pastel acotada (claro) vs. sección a sangre completa con escena pegada (oscuro); arte: figura + anillos vs. `ContactCosmicGuardian` |

Las secciones oscuras, además, pasan de contenedor centrado a sangre completa con decks pegados — un cambio de layout (vehículo), no de contenido ni solo de paleta.

**Fuera de esta enmienda, declarado `_por completar_` a propósito:** `PRODUCT.md` (§2, §4, §8, §9) todavía describe el estado de contenido PRE-unificación (chip de Contacto en claro, Features oscuro sin `h2`/intro, etc.) — es una re-sincronización de alcance mayor que esta tarea no cubre; queda anotada como seguimiento pendiente, no corregida de paso.

**Regla del `ThemeProvider` único** (dos bugs pagados): solo hay un `ThemeProvider` en todo el árbol (`app/providers.tsx`, envolviendo `I18nProvider`/`children`). `currentColor` y la cascada de CSS heredan del árbol ambiental, no del contextual — cualquier contenedor que separe visualmente dos contextos de tema (p. ej. un componente legal que vive fuera del flujo normal) debe fijar `color` explícito, porque de lo contrario hereda de `body` vía `GlobalStyles` (`a { color: inherit }`), no del tema que uno esperaría por proximidad visual. Ejemplo real del propio código: `src/components/legal/LegalHeader.tsx` fija `color` explícito por este motivo exacto.

---

## 5. Movimiento

### 5.1 Escala (`src/theme/tokens/motion.ts`)

**Duraciones:** `instant` 0ms · `fast` 100ms · `base` 200ms · `slow` 320ms · `slower` 480ms · `spin` 700ms · `spinReduced` 2100ms. Siete peldaños, no ocho: `ambient` 1500ms figuró aquí hasta el 2026-09-03 pero se había retirado del código por cero consumidores (commit `3734fd0`) — deriva documental corregida al revisar esta sección en la crítica externa #16. Cada peldaño existe además en formato numérico (`motion.durationMs.<paso>`) para quien necesita el número y no la cadena CSS: es el MISMO objeto leído de dos maneras, no dos escalas.

**Retardos (`motion.staggerMs`, desde la crítica externa #16, 2026-09-03):** `tight` 60ms · `base` 80ms · `loose` 110ms. Es la tercera magnitud del movimiento —cuándo empieza una pieza respecto a su hermana— y hasta esa fecha no tenía dónde nacer, así que cada sección se inventó la suya (medido: 22 de 26 retardos eran valores sueltos entre 80 y 1.800 ms). Las tres cifras salen del censo de lo que el repo ya escribía por su cuenta, no de una progresión inventada: 60 es el paso de la cascada de tarjetas de Story y de los dos escalones centrales de la cabecera de Features, 80 el más repetido (copia del hero, primer escalón de las dos cabeceras, tarjetas de Features) y 110 el del escalonado de capas del fondo del hero. Solo existe en formato numérico, a propósito: todos sus consumidores multiplican el peldaño por un índice o lo suman para acumular una cascada, así que un gemelo en cadena nacería sin consumidores. Los 90ms de Journey se quedan deliberadamente sin peldaño (ver el docblock del token).

**Curvas:** `standard`, `decelerate`, `accelerate`, `emphasized`, `settle` (las cinco monótonas) y `overshoot` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — la única que sobrepasa su valor final antes de asentar, reservada al despegue del navbar al hacer scroll, no a transiciones de interfaz normales. `settle` (`cubic-bezier(0.23, 1, 0.32, 1)`) entró en la crítica externa #14 absorbiendo dos curvas que vivían como literales propios (la de `src/motion/vocabulary.ts`, la más usada del CSS servido, y la `EASE_ENTRANCE` de `Sol.tsx`); faltaba en esta lista desde entonces, corregido aquí.

**Excepción sancionada — `overshoot`** (Task 23, plan premium F1-F5; mismo CRITERIO que el cristal del navbar en §8 — excepción de identidad acotada, medida y documentada con su porqué, aunque §8 sea un párrafo descriptivo y no siga este mismo formato de cuatro puntos; corregido 2026-08-12, Task 25, tras verificar que la frase original ("mismo formato") no era exacta — §8 no tiene una estructura de cuatro puntos que citar como precedente formal): la única curva no monótona del sistema (`y` fuera de `[0, 1]` en su `cubic-bezier`) es también la única identidad de marca que un rebote puede aportar en este repo — se conserva a propósito, no por omisión.

- **Qué es y dónde se usa (único consumidor):** `motion.easing.overshoot` (`src/theme/tokens/motion.ts`). El único punto del código que lo consume es `ScBar` (`src/components/layout/Navbar/Navbar.tsx`), en la transición de `max-width` cuando el navbar lleva `[data-scrolled="true"]` — el "despegue" de la píldora del navbar al hacer scroll (spec `2026-07-31-navbar-scroll-detach-design.md`). Ningún otro componente del repo lo importa (verificado por grep antes de escribir esta entrada).
- **Por qué el detector anti-slop lo marca como tell:** la skill `impeccable` (`scripts/detector/registry/antipatterns.mjs`) declara la regla `bounce-easing` (categoría `slop`): cualquier `cubic-bezier` cuyo componente `y` se salga de `[0, 1]` — la firma matemática de un rebote — se marca con la descripción _"Bounce and elastic easing feel dated and tacky. Real objects decelerate smoothly — use exponential easing (ease-out-quart/quint/expo) instead."_ `overshoot` encaja exactamente en esa firma.
- **Por qué se conserva pese al tell:** el rebote no es un adorno repetido por todo el sitio (lo que sí leería como plantilla genérica de IA) — es un gesto de marca ACOTADO a un único punto de interacción (el despegue del navbar al iniciar el scroll), no ambiental ni en bucle: no corre mientras nadie interactúa, y solo se ve una vez por transición de estado. Mismo criterio que ya sanciona el cristal del navbar (§8) y el degradado de `BrandName` (§2.5): una firma de identidad deliberada, medida y acotada, no el resultado de copiar un valor por defecto.
- **Qué la revertiría:** que un consumidor nuevo quisiera reutilizar `overshoot` fuera de este único gesto (extendería el efecto de "acotado" a "recurrente", perdiendo el argumento que lo sostiene), o que una revisión de diseño mida en navegador real que el rebote lee como genérico/anticuado en vez de distintivo sobre el detach real del navbar — cualquiera de las dos reabre la decisión.

### 5.2 Reglas duras (ya cumplidas por el código, con su porqué medido)

- **Solo `transform`/`opacity`** animan por defecto (más `background-color` en tintes de estado y `box-shadow` acotado a hover). Cuatro excepciones vigentes y documentadas (recontadas el 2026-08-12, Task 25, y de nuevo el 2026-08-12, fix wave C de la review final de rama — ver «Cuarta pasada» más abajo para el porqué de dos recuentos el mismo día):
    1. El navbar anima `padding-inline`, `max-width`, `margin-top`, `border-radius` (`ScBar`, despegue al hacer scroll).
    2. `visibility` — el panel de navegación (`ScNavPanel`/`ScNavSheet`) y, desde el 2026-08-12 (fix wave A de la review de rama), las diapositivas no actuales de los dos decks (`ScSlide` en `story.deck.tsx`, `ScJourneySlide` en `journey.deck.tsx`). En los decks no es una elección estética: `opacity: 0` + `pointer-events: none` dejaba las diapositivas ocultas DENTRO del orden de tabulación —`pointer-events` no saca de él— y el enlace de Discord del cierre de Story recibía el foco siendo invisible (WCAG 2.4.7). `visibility: hidden` sí lo saca, y se revierte tanto en `[data-state="current"]` como bajo `prefers-reduced-motion: reduce`, donde todas las diapositivas se muestran a la vez. Esta entrada se quedó corta unas horas: la fix wave C recontó las excepciones antes de que la fix wave A añadiera estos dos consumidores el mismo día — deriva documental por orden de commits entre tareas paralelas, exactamente el patrón que esta sección existe para evitar.
    3. **`background-position`** — `gradientShift` (`src/components/layout/Brand/BrandName.tsx`), el degradado de marca animado. `background-position`/`background-size` no son propiedades de compositor: no hay forma de mover un degradado recortado a texto (`background-clip: text`) solo con `transform`/`opacity`, así que la excepción es estructural, no una omisión. Tres consumidores reales (verificado por grep, 2026-08-12): el wordmark "ToInfinite" (`heroGradient`, el degradado ES el texto) y los dos CTA con texto legible encima, `ScCtaPrimary` (Hero) y `ScSubmitButton` (Contact) — estos dos consumen `ctaGradient`, separado de `heroGradient` en la Task 33 precisamente para poder resolver el contraste AA de cada uno por rama de tema sin tocar el título. Documentado en el propio origen (docblock de cabecera de `gradientShift`, `BrandName.tsx:16-27`) desde su creación; lo que faltaba era este catálogo central.
    4. **`--vti-angle`** — `cardBorderSpin` (`src/components/sections/Features/Features.tsx`, consumida por `ScCardBorder`), el giro del borde cónico de marca de las tarjetas de Features en `:hover`. Anima una propiedad personalizada (`--vti-angle`, registrada con `@property` en `GlobalStyles.tsx` como `<angle>` interpolable) en vez de `transform`/`opacity` — no hay forma de girar un `conic-gradient` de fondo sin animar el ángulo en sí, así que la excepción es estructural, mismo motivo que `background-position` arriba. Declarada en el propio docblock de `ScCardBorder` (D7 de la spec `2026-08-06-story-features-tema-claro-design.md`, `Features.tsx:594-603`): "se acepta por los mismos motivos que la excepción ya sancionada del degradado de `BrandName`" — un efecto de marca ACOTADO al hover (no ambiental, no corre mientras nadie interactúa) y declarado solo bajo `@media (prefers-reduced-motion: no-preference)` (bajo `reduce` el hover conserva `translateY`/`box-shadow` pero nunca el giro del borde). Documentada en el código desde su origen (Task 23 la tocó solo para el radio, sin cambiar el mecanismo) pero nunca había llegado a este catálogo central — mismo defecto de fondo que ya corrigió el `background-position` de arriba en la Task 25; corregido aquí 2026-08-12, fix wave C.

**Excepción retirada — `filter` del CTA claro de Contacto.** Vivía aquí hasta hoy como cuarta excepción del catálogo: ~~el CTA claro de Contacto (`ScCta`, `mailto:` a `#contact`, `src/components/sections/Contact/Contact.tsx`) animaba además `filter` y subía a `brightness(1.05)` en `:hover`~~. **El componente ya no existe** (Task 16, plan premium F1-F5, 2026-08-11; corregido aquí 2026-08-12, fix wave C de la review final de rama). `git log -S "ScCta" -- src/components/sections/Contact/` muestra el commit `71ff656` ("el formulario real vive tambien en la rama clara, y el chip que lo simulaba desaparece"), cuyo propio mensaje lo dice sin ambigüedad: "Fuera `ScChip`/`ScChipIcon`/`ScRow`... y `ScCta`: ese ancla abría el MISMO mailto que el boton de envio, que ahora existe en las dos ramas". La entrada anterior de este documento (`git log` sin `-S`, "Segunda pasada" más abajo) afirmaba lo contrario citando una verificación de git — esa verificación fue correcta el 2026-08-09 (`ScCta` no había cambiado en las Tareas 1-13), pero quedó desactualizada dos días después, cuando Task 16 retiró el componente entero; el catálogo no se volvió a cruzar contra `git log` hasta hoy. Verificado también en el código vivo: `Contact.tsx` no declara ningún `styled.a` llamado `ScCta` ni ninguna regla `filter`/`brightness` en `:hover` — las dos apariciones que quedan del nombre en el fichero (líneas 383 y 1002) son comentarios históricos que documentan qué vivía ahí antes de Task 16. Ningún otro componente del repo reutiliza el patrón `filter: brightness()` en hover (verificado por grep sobre `src/`), así que no hay a dónde reapuntar la excepción — se retira del catálogo en vez de reubicarse, y su hueco lo ocupa la excepción real de `--vti-angle` de arriba.

- **Toda animación infinita** vive solo dentro de `@media (prefers-reduced-motion: no-preference)`, con `animation: none` explícito bajo reduce. El colapso global (`animation-iteration-count: 1 !important`) **no detiene** una animación infinita — la deja aterrizar en un fotograma arbitrario, así que no basta como guard por sí solo. **Cifra de `infinite` recontada el 2026-08-09, reconciliada de nuevo el 2026-08-12 (Task 25, mismo comando, mismo resultado)** (metodología: `grep -rnoE "\binfinite\b" src --include="*.ts" --include="*.tsx"`, excluyendo `*.test.*` y comentarios/prosa): **32 apariciones literales** en código real, repartidas en 12 ficheros — la cifra no cambió pese a que las Tasks 19-20 del plan premium F1-F5 migraron varias de estas animaciones de literal a `AMBIENT`/token (ningún consumidor se añadió ni se retiró, solo cambió de dónde lee el número) (`BrandName.tsx` 1, `Footer.tsx` 1, `eye.parts.tsx` 3, `Sol.tsx` 9, `Wormhole.tsx` 6, `sectionBeam.parts.tsx` 3, `storyCosmicBeing.parts.tsx` 1, `Contact.tsx` 3, `Features.tsx` 1, `Hero.tsx` 2, `Story.tsx` 1, `Button.tsx` 1). De esas 32, varias son la MISMA animación infinita redeclarada en un estado (`[data-pulse="true"]`/`[data-state="active"|"leaving"]`) porque la propiedad abreviada `animation` sustituye la lista entera — contadas como reglas CSS distintas da 27 declaraciones. La cifra de 20 que este documento traía hasta ahora no se ha podido reconciliar con ninguna metodología reconstruible (no hay script de la auditoría original que reproducir); se sustituye por la recontada aquí, con su comando declarado, en vez de forzarla a coincidir. Las 32 cumplen la regla (guardadas bajo `no-preference`, con `animation: none` explícito bajo `reduce`). Incluye el spinner de `Button` (`Button.tsx:224`, 1 de las 32): bajo reduce se ralentiza a `spinReduced` en vez de congelarse — un spinner inmóvil deja de comunicar carga —, pero sigue siendo **código muerto**: `grep` confirma que ningún consumidor de producción pasa `loading` a un `<Button>` (el único JSX de producción con `<ScSubmitButton>`/`styled(Button)` es `Contact.tsx`, que no le pasa `loading`; la única llamada con `loading` está en `Hero.qa.test.tsx`, un test).
- El guard de reduce cubre **los tres estados** de la máquina de fases del hero (`pending`/`active`/`leaving`, ver `HeroBackdrop.test.tsx`).
- Dos `@keyframes` sobre la misma propiedad conviven mal: gana la última declarada en `animation-name`, y una `transition` sobre una propiedad ya tomada por `@keyframes` no llega a existir. De ahí los envoltorios en dos elementos: el parallax vive en el `div` padre, la flotación en el `img` hijo.
- Entrada y hover viven en elementos **distintos**, porque `transition-delay` afecta a todos los cambios de esa propiedad en ese elemento — mezclarlos retrasaría el hover con el delay de la entrada.
- Los retardos (`animation-delay`) también se anulan bajo reduce: el colapso global no los cubre automáticamente, hay que anularlos explícitamente.
- **`scroll-snap` prohibido**, retirado el 2026-07-31 con mediciones (`GlobalStyles.tsx`). Motivo: las anclas de la presentación de Story medían exactamente una pantalla, así que cualquier posición de scroll caía siempre a menos de media pantalla de un ancla. Con esa geometría, `proximity` degeneraba en `mandatory`: pidiendo posiciones concretas y viendo dónde aterrizaba de verdad se midieron tirones de hasta 240px (900→720, 1200→1440, 3100→2880), a veces en contra del sentido del gesto. El anclado hoy es `position: sticky` en el `stage`, sin snap.

### 5.3 Coreografía de carga (`src/motion/timings.ts` + `src/components/sections/Hero/hero.transition.ts`)

Valores derivados, no elegidos a mano:

| Constante | Valor | Derivación |
| --- | --- | --- |
| `HERO_FADE_MS` | 420 | duración del fundido de una capa — valor calibrado a ojo sobre el render; la derivación «2 × base» que figuraba aquí era falsa (2 × 200 = 400 ≠ 420; corregido 2026-08-17, ver el docblock de `src/motion/timings.ts`) |
| `HERO_STEP_MS` | 110 | paso del stagger entre capas — desde la crítica externa #16 (2026-09-03) lee `motion.staggerMs.loose`, mismo valor y distinta procedencia |
| `HERO_STAGGER_STEPS` | 6 | `Math.max` entre `EYE_STAGGER.length` (6, oscuro) y `AURA_STAGGER.length` (5, claro) |
| `HERO_STACK_MS` | 970 | `HERO_FADE_MS + (HERO_STAGGER_STEPS − 1) × HERO_STEP_MS` = 420 + 5×110 |
| `HERO_DECODE_TIMEOUT_MS` | 600 | tope de espera de `img.decode()` antes de arrancar igualmente |
| `HERO_CHROME_OFFSET_MS` | 760 | `(HERO_STAGGER_STEPS − 1) × HERO_STEP_MS + HERO_FADE_MS / 2` = 550 + 210 |
| `HERO_HANDOFF_MS` | 1070 | `HERO_BACKDROP_HOLD_MS + HERO_STACK_MS` = 100 + 970 |
| `HERO_COPY_RETURN_MS` | 1830 | `HERO_HANDOFF_MS + HERO_CHROME_OFFSET_MS` = 1070 + 760 |

`hero.transition.ts` NO duplica estos timings núcleo: los reexporta desde `src/motion/timings.ts`, que es su fuente de verdad.

**Máquina de fases (retirada 2026-08-11, Task 27 del plan premium).** `src/motion/stage.ts` y `src/motion/StageProvider.tsx` publicaban `"backdrop" → "chrome" → "settled"`, terminal, con `STAGE_FALLBACK_MS` (1570 ms, `HERO_DECODE_TIMEOUT_MS + HERO_STACK_MS`) como red de seguridad, para que el navbar y la copia del hero supieran cuándo arrancar su propia entrada. Se retiró entera: desde la Task 10 (mismo día) ninguno de los dos leía ya `phase` — su entrada pasó a `@keyframes` + `animation-delay` estáticos, sin ninguna dependencia de JS —, así que la máquina se había quedado sin ningún consumidor real y su red de seguridad no protegía ya nada. `HeroBackdrop.tsx` conserva íntegro su propio decode-gating (§6 más abajo); lo único que cambió es que ya no avisa a nadie al terminar. Medición completa en §5.5/§5.6 de `docs/superpowers/specs/2026-07-27-hero-coreografia-carga-tema-design.md`. Los timings propios del cruce de la copia del hero (`HERO_COPY_OUT_MS` 100, `HERO_COPY_IN_MS` 320, `HERO_BACKDROP_HOLD_MS` 100) siguen siendo propios de `hero.transition.ts`, porque su hook (`useHeroCopySwap`) necesita `"use client"` y `src/motion/timings.ts` se mantiene deliberadamente sin esa directiva.

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

- ~~Flash claro→oscuro al hidratar: al recuperar el tema guardado, la página re-maqueta por completo (5 secciones claras ↔ 4 oscuras en contenido, no solo un recoloreado). Arreglo candidato: script inline en `<head>` que resuelva el tema antes del primer pintado.~~ **Resuelto (Task 9, plan premium F1-F5, 2026-08-11; MECANISMO DE ENTREGA rehecho por Task 31, mismo día — corregido en esta entrada 2026-08-12, fix wave C: la versión anterior de este párrafo seguía describiendo el mecanismo que Task 31 retiró, el mismo error que el propio `resolveTheme.ts` tuvo que corregirse a sí mismo el 2026-08-11).** Task 9 resolvía el tema (localStorage → `prefers-color-scheme` → default, función pura `resolveInitialTheme`, `src/theme/resolveTheme.ts`) inyectándolo con `next/script strategy="beforeInteractive"`. **Ese mecanismo de entrega se retiró** (Task 31): verificado leyendo `out/index.html` literal tras `pnpm build` bajo `output: "export"` (no la prosa de la documentación de Next, escrita pensando en SSR clásico) — `beforeInteractive` NO se sirve como `<script>` bloqueante dentro de `<head>` en un export estático. Vive como `self.__next_s.push(...)`, un script síncrono normal pero como PRIMER hijo de `<body>`, ejecutado por el runtime propio de Next (`app-bootstrap.ts`) dentro de un chunk asíncrono — medido en 109-208 ms tras la navegación, bastante después de que el navegador ya pintó el HTML estático. Con Task 9 sola esto no era observable, porque el `<h1>` del hero arrancaba en `opacity: 0` (escalonado de entrada, gateado a la fase "chrome" de la máquina de fases retirada en Task 27): nada visible reflowaba cuando `data-theme` llegaba tarde. Task 10 (mismo día) hizo ese `<h1>` visible desde el primer pintado para ganar LCP, y a partir de ahí la llegada tardía del atributo SÍ reflotaba contenido ya pintado (el `vw` del título y las 4 variables `-lg` de alineación, `GlobalStyles.tsx`): el CLS 0,0799 de la baseline REAPARECÍA en todo camino que resolviera a tema oscuro, confirmado por el gate de integración F2 con una tabla de 5 caminos (detalle completo: `task-31-report.md`). **Mecanismo real hoy:** un `<script id="theme-bootstrap" dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }} />` LITERAL, síncrono, dentro de un `<head>` explícito de `app/layout.tsx` (hermano de `<body>`) — el patrón que la propia documentación oficial de Next.js reserva para "Preventing flash before hydration" (`docs/01-app/02-guides/preventing-flash-before-hydration.mdx`), confirmado vía context7 antes de escribir el código (commit `24c0c25`). El parser HTML lo ejecuta en línea sin depender de ningún chunk JS, bloqueando el resto del documento hasta terminar: garantía real de "antes del primer pintado del `<body>`", no solo "antes de hidratar". `dangerouslySetInnerHTML` es deliberado y seguro (mismo criterio que `JsonLdScript.tsx`): el texto lo construye `buildThemeBootstrapScript()` íntegramente en este repo, nunca de entrada de usuario ni de red. **Por qué `beforeInteractive` no vale en este repo y no debe reintroducirse:** bajo `output: "export"` (CLAUDE.md §1 — no hay servidor Next en producción) no existe forma de que Next sirva ese script como bloqueante síncrono en el HTML exportado; la garantía de "antes de interactuar" que promete esa API no es la misma que "antes del primer pintado", y la brecha entre las dos es exactamente donde vivía el CLS de 0,0799. Cualquier agente que "restaure" `next/script strategy="beforeInteractive"` por parecer la vía más idiomática de Next reintroduce este bug. `ThemeProvider` comparte la misma función pura (`resolveInitialTheme`) para su corrección post-montaje. CLS re-medido en navegador real tras Task 31, en los 5 caminos de resolución: **0** en los cinco (baseline 0,0799 desaparecido). El re-maquetado por contenido divergente entre temas que esta entrada describía además dejó de aplicar con la unificación de contenido de las Tasks 15-16 (§4).
- ~~760-1570 ms de pantalla vacía al cargar: todo el hero arranca en `opacity: 0`. Arreglo candidato: sacar la capa base del escalonado, o dar un estado inicial visible al HTML prerenderizado.~~ **Resuelto (Task 10, plan premium F1-F5, 2026-08-11):** la coreografía de carga del hero se reexpresó como `@keyframes`/`animation-delay` CSS estáticos, presentes en el HTML exportado sin depender de JS; el `<h1>`/copy es candidato LCP elegible desde el primer pintado. LCP re-medido en navegador real (Chrome, caché fría, `PerformanceObserver`): claro escritorio 1268→**184 ms** (−85,5%), claro móvil 1292→**432 ms** (−66,6%), móvil CPU 4×+Slow 4G 4520→**932 ms** (−79,4%, dentro del objetivo <2500ms con 2,7× de margen). Detalle: `task-10-report.md`.
- Anchos de contenido conviviendo sin token único: `grid.navMax` (1280px, Story/Journey) vs `grid.containerMax` (1200px, Features/Contact/Footer), con canaletas divergentes. (El tercer ancho que esta entrada contaba — el `70ch` literal de la copia del hero — se tokenizó como `grid.heroCopyMax` en la ola de la crítica #10, 2026-08-18; la divergencia navMax/containerMax sigue abierta.)
- ~~Sin navegación a secciones por debajo de 768px (decisión de alcance ya documentada, no un olvido).~~ **Resuelto (Tarea 10 de la implementación de la auditoría premium, 2026-08-09 — numeración de aquella entrega, anterior y distinta de la Task 10 de este plan premium F1-F5):** hoja de navegación móvil (`NavSheet.tsx`) monta los mismos grupos que el panel de escritorio, incluido `onSite` (Historia/Viaje/Características/Contacto) — verificado con grep, `NAV_GROUPS` es la fuente única para las dos superficies. El flujo completo de la hoja (foco inicial, Escape, cierre por toque fuera) sigue con QA visual pendiente, ver `PRE-LAUNCH-QA.md` §6, ítem 45.
- ~~Features en oscuro: el único encabezado es un overline de 11px con `aria-labelledby`; la rama clara tiene `h2` + intro que la oscura no consume.~~ **Resuelto (Task 11, dieta de ornamento A, 2026-08-09):** el kicker sigue siendo el `h2` real (`forwardedAs="h2"`, mismo `aria-labelledby`), pero sube de la variante `overline` (11px) a `h5` (18px) -- ya no es más pequeño que su propio cuerpo (`bodySm`, 14px). La rama clara sigue sin `intro` en la oscura (eso no era el hallazgo que esta tarea cerraba, sigue sin resolver). **Superado del todo por la Task 15 (2026-08-11, §4):** la unificación de contenido da a la rama oscura el `h2`+`intro` completos, idénticos a la clara.

**MEDIA**

- Escala tipográfica colapsa por abajo: `h4→h5` es un salto de 1.11×; `h5` = `bodyLg` en tamaño exacto.
- Anillo de foco con especificidad cero (`:where()`) y contraste no medido sobre arte (WCAG **1.4.11** "Non-text Contrast" — corregido 2026-08-12, Task 25: el criterio citado aquí hasta hoy, 2.4.11 "Focus Not Obscured", no es el criterio de contraste; ver `PRE-LAUNCH-QA.md` §6 ítem 40, que ya traía esta misma corrección desde 2026-08-09 y que esta entrada no había recogido). Sigue sin medirse en navegador real; QA pendiente.
- ~~Formulario de contacto vía `mailto` sin validación ni salida de fallo — `Field`/`Input` ya soportan estado de error, no está conectado.~~ **Resuelto.** Rama oscura: Tarea 1 de la implementación de la auditoría premium, 2026-08-09 (campo vacío, validación de formato, panel de confirmación copiable). Rama clara: **Task 16 del plan premium F1-F5, 2026-08-11** — el chip con la dirección en texto plano se retira; las dos ramas montan hoy el MISMO `<form>` real con validación y panel de confirmación (`contactChannels`, único árbol de JSX). Verificado en navegador real, flujo completo (correo inválido → error accesible `role="status"` → corregir → válido → panel con «Copiar dirección»), en las dos ramas, `task-16-report.md` §5.
- ~~Interacción de contacto distinta por tema (chip en claro, formulario en oscuro) — coherente con "el tema es modo de contenido" (§4), pero sin resolver como experiencia única.~~ **Resuelto junto con el punto anterior (Task 16, 2026-08-11).** Ya no aplica además la lectura de "§4" que motivaba esta entrada: el tema pasó a ser piel con contenido unificado (§4, enmienda 2026-08-12) — la premisa que hacía "coherente" la divergencia dejó de existir a la vez que la propia divergencia.
- ~~Desplegables del navbar sin `aria-haspopup` ni flechas indicadoras.~~ **Cerrado con criterio inverso al que esta entrada pedía (2026-08-16/17, críticas #8-#9):** `aria-haspopup="true"` es sinónimo ARIA exacto de `"menu"` y prometería un patrón de menú (flechas, Home/End) que el disclosure no implementa — se retiró en vez de añadirse, y el patrón quedó como disclosure APG puro (`aria-expanded` + `aria-controls`). Las flechas indicadoras (chevrones) sí existen desde antes.
- `aria-pressed` en los botones de idioma, que son mutuamente excluyentes (semántica de grupo radio, no de toggles independientes); el grupo no tiene etiqueta accesible.
- ~~El botón de tema teletransporta la vista a top sin aviso (`aria-busy` propuesto y no implementado).~~ **Resuelto en dos tiempos:** `aria-busy` se implementó en la Task 5 (plan premium F1-F5), y el viaje a top se retiró en la Task 17; desde el 2026-08-17 el cambio de tema conserva además la sección de lectura (ancla por sección dominante + desplazamiento, `themeScrollAnchor.ts`).
- Tema claro sin coreografía de entrada entre secciones — pendiente decidir si es intencional o orden de construcción.
- ~~Statement de Story: tres `white-space: nowrap` con tope estimado a mano, sin verificar en navegador real — riesgo de desbordamiento.~~ **Parcialmente resuelto (Tarea 7, 2026-08-09):** el `padding-inline` pasó de fijo a mobile-first (`theme.data.space[4]` bajo 600px, `space[6]` desde ahí) y se verificó en navegador real (no jsdom) que a 320/375/599/600px, en ES, el statement mide exactamente 24,00 / 28,58 / 47,25 / 44,67px de fuente sin desbordamiento horizontal (`scrollWidth === clientWidth` en los cuatro anchos). Lo que sigue sin verificar: 768/1280/1920px (fuera del rango que cubrió esta tarea) y el idioma EN, cuya línea más larga a 320px se confirmó más corta que la ES por conteo de caracteres pero **no se remidió en navegador** — inferencia declarada, no medición directa.

**BAJA**

- ~~Variante `lead` de `Typography` sin ningún consumidor.~~ **Resuelto (2026-08-17, crítica #9):** el shim `lead` se eliminó junto con las variantes muertas `h4`/`bodyLg`/`code` (ver §3.2, enmienda).
- `brandSolid` = `brandText` en el tema claro (mismo primitivo, ver §2.2 — documentado, no un bug, pero listado por si un futuro retoque quiere separarlos).
- Tres andamiajes de numeración de pilares/badges conviviendo sin unificar.
- `height: 200px` fijo en una figura de Journey (candidato a `min-height`).
- Uso desigual de la escala de elevación tras el commit `7a2d2ac`.
- **Deck de Story: la deuda «59,8ch bajo el suelo de 60ch» quedó DISUELTA el 2026-08-17 al corregir la unidad de `grid.prose`.** La entrada original (Task 22, 2026-08-12) contaba el suelo de legibilidad en `ch` cuando la regla tipográfica se cuenta en **caracteres** — el mismo error de unidad que inflaba `grid.prose` (ver §3.4): 59,8ch de Hanken Grotesk son ~75 caracteres reales, que ya estaba DENTRO del rango 60-75, no debajo. Con `prose` en 56ch el token pasa a ser el límite efectivo del deck (~65,5 caracteres). Pendiente solo el juicio a ojo del reflow (ítem 60 de `PRE-LAUNCH-QA.md`, reescrito con esta misma corrección).

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

### Segunda pasada (2026-08-09, documentación tras las Tareas 1-13 de la auditoría premium)

El encargo de esta pasada asumía que la excepción de `filter` del CTA de Contacto (`ScCta`, hover a `brightness(1.05)`) había sido eliminada por la Tarea 9. **No es lo que dice el código.** Se leyó `src/components/sections/Contact/Contact.tsx` línea a línea (la regla vive en las líneas 341-378) y se cruzó contra el informe real de la Tarea 9 (`task-9-report.md`): esa tarea sí tocó `Contact.tsx`, pero sobre un componente distinto — `ScCardLink`, la tarjeta de Discord/GitHub de la rama oscura, a la que le separó `:hover` de `:focus-visible` — y no menciona `filter` ni `brightness` en ningún punto. `git log` confirma que `ScCta` no ha cambiado en ninguno de los commits de las Tareas 1-13. La excepción de `filter` sigue viva hoy, tal y como la sancionaba el material de origen, y se documenta como tal en §5.2 de este documento en vez de darla por retirada.

La cifra de `infinite` («20 apariciones») tampoco se pudo reconciliar: un recuento reproducible hoy (comando declarado en §5.2) da 32 apariciones literales, no 20 ni 21. No se ha encontrado ningún script o metodología de la auditoría original que explique la cifra previa, así que no se ha intentado forzar la coincidencia — se sustituye por el recuento verificado, con su método a la vista.

### Tercera pasada (2026-08-12, Task 25 — documentación tras el plan premium F1-F5, Tasks 1-27/33-35)

Doce puntos de deriva del plan (punto 1 de `## Task 25` en `docs/superpowers/plans/2026-08-10-implementacion-plan-premium-f1-f5.md` — ese plan no numera secciones con `§`, solo `## Task N`; la cita a "§6" que traía esta entrada apuntaba a un destino inexistente en ese documento, corregido 2026-08-12, fix wave C de la review final de rama) cruzados contra el código real y los informes de tarea (`.superpowers/sdd/2026-08-10-implementacion-plan-premium-f1-f5/task-*-report.md`) antes de escribir esta pasada:

- **§4 (tema = piel vs. modo de contenido):** la afirmación central de la sección ya no era cierta tras las Tasks 15-16 (contenido unificado). Corregida con tabla nueva, enmienda fechada, historia conservada.
- **§5.1 (`overshoot`, precedente de formato):** la frase citaba un "mismo formato que el cristal del navbar, §8" que no existe (§8 es un párrafo descriptivo, no una plantilla de cuatro puntos). Corregida para citar el criterio real (excepción de identidad, medida y documentada) sin sobre-afirmar una estructura formal inexistente.
- **§5.2 (excepciones a `transform`/`opacity`):** el catálogo tenía tres excepciones documentadas cuando el código sostiene cuatro — `background-position` (`gradientShift`, tres consumidores reales) faltaba del catálogo central pese a estar documentada en su propio origen desde su creación. Añadida como la tercera; `filter` de `ScCta` pasa a ser, explícitamente, la cuarta. ~~Esta última afirmación era ya falsa en el momento de escribirse:~~ Task 16 (2026-08-11, un día antes de esta misma pasada) había retirado `ScCta` por completo; esta pasada no volvió a cruzar `git log -S` antes de reafirmar la excepción como vigente, el mismo error de fondo que ya cometía la "Segunda pasada" de arriba, solo que sin la excusa de la fecha. Corregido en «Cuarta pasada», más abajo (2026-08-12, fix wave C).
- **§5.2 (cifra de `infinite`):** reconciliada de nuevo con el mismo comando: sigue en 32, verificado hoy.
- **§9 (deuda visual):** cuatro hallazgos ya resueltos por tareas de esta sesión (flash al hidratar → Task 9; pantalla vacía al cargar → Task 10; navegación móvil <768px → Tarea 10 de la auditoría premium 2026-08-09; formulario/interacción de Contacto → Task 16) seguían listados como abiertos. Marcados resueltos con su evidencia, sin borrar el hallazgo original. Corregido también el número de criterio WCAG citado (2.4.11 → 1.4.11), ya corregido en `PRE-LAUNCH-QA.md` desde 2026-08-09 pero no arrastrado aquí hasta hoy. Añadido un hallazgo BAJA nuevo (deck de Story a 59,8ch, Task 22).

Verificado también, sin encontrar discrepancia: el vocabulario de motion (`REVEAL`/`AMBIENT`) tiene hoy consumidores reales tras las Tasks 19-20 (este documento no afirmaba lo contrario en ningún punto, así que no requería corrección) y la máquina de fases del stage, retirada en la Task 27, ya quedó documentada correctamente en la propia Task 27 (§5.3 de este documento, verificado sin cambios necesarios).

### Cuarta pasada (2026-08-12, fix wave C — review final de rama, área de gobernanza)

La review final de rama marcó el área de gobernanza como no aprobada por dos hallazgos Critical, los dos en este documento. Verificado cada uno contra código y `git` reales antes de corregir:

- **§5.2, excepción `ScCta`/`filter`:** la "Tercera pasada" de arriba (Task 25, 2026-08-12) reafirmó esta excepción como vigente citando una verificación de `git log` — pero esa verificación cubría las Tareas 1-13 (hasta 2026-08-09), no Task 16 (2026-08-11), que había retirado `ScCta` entero un día antes de que se escribiera la propia Tercera pasada. `git log -S "ScCta" -- src/components/sections/Contact/` muestra el commit `71ff656`, cuyo mensaje lo declara sin ambigüedad. Verificado también que el patrón `filter`/`brightness()` en hover no se reubicó a ningún otro componente (grep sobre `src/`, cero resultados). Excepción retirada del catálogo.
- **§5.2, catálogo incompleto:** con el hueco de `ScCta` ya detectado, se buscó si el catálogo de "excepciones sancionadas" tenía otros huecos reales. Los encontró: `Features.tsx` declara en su propio docblock (`Features.tsx:594-603`, D7 de la spec `2026-08-06-story-features-tema-claro-design.md`) una excepción sancionada al mismo criterio que `background-position` — `--vti-angle`, la propiedad personalizada que gira el borde cónico de `ScCardBorder` en hover — que nunca había llegado a este catálogo central. Añadida como la nueva cuarta excepción, ocupando el hueco que deja `ScCta` al retirarse.
- **§9, anti-flash de tema:** la entrada describía el mecanismo de entrega como `next/script strategy="beforeInteractive"` — exactamente el mecanismo que Task 31 retiró por no ser síncrono bajo `output: "export"`, causa raíz de la reaparición del CLS de 0,0799 documentada en el propio `task-31-report.md`. Reescrita para documentar el mecanismo real (`<script dangerouslySetInnerHTML>` literal en un `<head>` explícito de `app/layout.tsx`) y el porqué explícito de que `beforeInteractive` no vale bajo este `output: "export"`, para que ningún agente futuro lo reintroduzca "arreglando" lo que parece raro.
- **Tercera pasada, cita a "§6" del plan:** "Doce puntos de deriva del plan (§6 de `docs/...plan-premium-f1-f5.md`)" citaba una sección que no existe en ese documento — el plan numera por `## Task N`, no por `§`. Reapuntada al punto 1 de `Task 25`, la sección real de la que salen los doce puntos.

Ninguna de las cuatro correcciones cambia código ni comportamiento: las cuatro son de esta pasada documental.

---

Este documento se actualiza en la misma entrega que cambia lo que describe.
