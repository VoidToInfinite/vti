# VTI — Sistema de interfaz de lujo · design spec

**Fecha:** 2026-07-24 · **Estado:** aprobado en brainstorm, pendiente de revisión del spec · **Proyecto:** `vti` (landing VoidToInfinite) · **Autor:** Daniel Mosquera + Claude Code

> Este documento es un **contrato**, no una sugerencia. Define el sistema de interfaz de lujo de VTI como **design tokens** (código vivo, styled-components) **+ especificaciones de componentes** (este doc). Donde una decisión podía ir por varios caminos, el porqué queda escrito para que sobreviva a la implementación.

---

## 0 · Decisiones tomadas en el brainstorm (base de este spec)

| Eje | Decisión |
| --- | --- |
| Fundación visual | **Adoptar la DS vti-sdk** (OKLCH, 5 hues ancla + neutral, Hanken Grotesk + JetBrains Mono, spacing base-8, radii squircle) **y diseñar encima las capas de lujo** que aún no existen. |
| Formato de entrega | **Ambos:** tokens como **código vivo** (theme styled-components extendido) **+ este documento** de specs de componentes y lenguaje de movimiento. |
| Glassmorphism | Permitido **solo donde se lo gana** (capas flotantes). Gobernado por regla, no solo por token. §8. |
| Movimiento | **Un único lenguaje** de movimiento que todos los componentes referencian. §9. |
| Relación con el resto | Es la **fundación** (P0/P1 del roadmap del spec de producto) sobre la que cabalga el _viaje cinemático 3D_ (spec aparte, pendiente). Lo que comparten (glass en nav, coreografía de revelado) se marca en su sitio. |

**Fuera de esta pasada:** escribir código (el usuario lo pidió explícitamente). Este spec habilita el plan de implementación posterior; no lo ejecuta.

---

## 1 · Objetivo y principios

**Objetivo:** un sistema de interfaz que se sienta _caro_ — no por ornamento, sino por disciplina: contraste, ritmo, restraint y un movimiento coherente. La UI es plana, opaca y en calma; el espectáculo vive fuera de este sistema (el ojo cósmico del viaje).

**Principios (el filtro anti-decoración):**

1. **Cada efecto declara su trabajo.** Si un hover, una sombra o un glass no dirige la atención, confirma una acción o comunica jerarquía, no entra.
2. **Tres capas de token, dependencia estricta.** Un componente nunca lee un primitivo. Primitivo → semántico → componente. §2.
3. **Restraint por defecto.** Borde de 1px antes que sombra. Plano antes que glass. Opaco antes que translúcido. El lujo es lo que _no_ se pone.
4. **Un solo lenguaje de movimiento.** No hay dos hovers inventados a mano. §9.
5. **Accesible de raíz.** AA en ambos temas, foco visible siempre, `prefers-reduced-motion` global, targets ≥44px, i18n-safe. §15.

---

## 2 · Arquitectura de tokens (3 capas)

```
Primitivos            Semánticos                     De componente
(escalas crudas)  →   (roles, sin números)       →   (apuntan a semánticos)
color.blue[500]       color.brand                    button.bg.solid
neutral[1000]         color.text                     card.border
space[5]              —                              input.radius
```

- **Primitivos:** las escalas OKLCH, la escala tipográfica, spacing, radii, etc. Valores crudos. No se usan directamente en componentes.
- **Semánticos:** roles con intención (`surface`, `text-muted`, `brand`, `border`, `focus`…). **El dark mode vive aquí:** es un re-mapeo de roles, no una paleta nueva.
- **De componente:** tokens que un componente concreto consume (`button.bg.solid`, `card.border`). Aíslan al componente de cambios en los primitivos — la migración HSL→OKLCH no debería tocar ni un componente que use bien esta capa.

**Regla dura:** si un componente referencia `theme.color.blue[500]` en vez de `theme.semantic.brand`, es un bug de arquitectura.

---

## 3 · Tokens — Color (OKLCH)

### 3.1 Primitivos — 6 escalas de 12 pasos (50→1100), solo barre la luminosidad

Anclas heredadas de vti-sdk: primary `#00B7FF` (hue 235.851), secondary `#9B0DD3` (311.928), success `#73C12A`, warning `#FFA100`, error `#FF3877`, neutral `#111113`. Cada hue mantiene su tono; barre L (y C pico en medios). **Los valores de abajo son la rampa propuesta, derivada de las anclas; se validan a AA en implementación** (no son cifras oficiales de vti-sdk, son la escala de trabajo de este sistema).

**Escalera de luminosidad L (idéntica para todos los hues):**

| paso | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 | 1100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **L** | .985 | .96 | .92 | .86 | .78 | .737 | .66 | .58 | .50 | .42 | .32 | .22 |

**primary (blue, hue 235.851)** — croma pico en 400–600:

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 | 1100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.985 .012 236` | `.96 .03 236` | `.92 .06 236` | `.86 .10 236` | `.78 .14 236` | `.737 .158 236` | `.66 .142 236` | `.58 .12 236` | `.50 .107 236` | `.42 .09 236` | `.32 .07 236` | `.22 .05 236` |

**neutral (cool gray, hue ~286, croma casi nulo)** — el caballo de batalla (bg/surface/text/border):

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 | 1100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `.985 0 0` | `.975 .002 286` | `.92 .004 286` | `.86 .004 286` | `.71 .006 286` | `.55 .006 286` | `.47 0 0` | `.40 0 0` | `.32 0 0` | `.24 .004 286` | `.178 0 0` | `.11 .004 286` |

**secondary (violet 311.928), success, warning, error** — misma escalera de L; anclas de croma en 500: `secondary[500] = .55 .259 311.928` · `success[500] ≈ .74 .17 140` · `warning[500] ≈ .80 .16 70` · `error[500] ≈ .64 .24 12`. Rampas completas se generan con la escalera de L y el croma decayendo hacia los extremos, y se ajustan a AA en código.

> **No hay hue "info".** El `primary` azul dobla como info (regla vti-sdk).

### 3.2 Semánticos — light

| Rol | Valor | Uso |
| --- | --- | --- |
| `bg` | neutral-50 | fondo de página |
| `surface` | white `oklch(1 0 0)` | cards, inputs, nav |
| `surface-sunken` | neutral-100 | wells, code blocks |
| `border` | neutral-300 | bordes de 1px por defecto |
| `border-strong` | neutral-400 | hover/focus de contenedores |
| `text` | neutral-1000 | texto principal |
| `text-muted` | neutral-800 | secundario |
| `text-subtle` | neutral-600 | terciario, captions |
| `brand` | primary-500 | acentos, iconos activos |
| `brand-solid` | primary-700 | fondo de botón sólido (light) |
| `brand-text` | primary-800 | links sobre fondo claro (AA) |
| `focus` | primary-500 | anillo de foco |
| `success/warning/error` | -500 / -700 | estados |
| `on-brand` | white | texto sobre sólidos de marca |

### 3.3 Semánticos — dark (re-mapeo, no paleta nueva)

| Rol | Valor | Nota |
| --- | --- | --- |
| `bg` | neutral-1100 | ≈ `#111113` |
| `surface` | neutral-1000 |  |
| `surface-sunken` | neutral-1100 |  |
| `border` | neutral-800 |  |
| `border-strong` | neutral-700 |  |
| `text` | neutral-50 |  |
| `text-muted` | neutral-300 |  |
| `brand-solid` | **primary-500** | step 500 en dark (no 700) porque es el que **libra AA sobre página oscura** |
| `brand-text` | primary-300 |  |
| `on-brand` | neutral-1100 | texto oscuro sobre azul brillante |

---

## 4 · Tokens — Tipografía

- **Familias:** `font-body` = **Hanken Grotesk**; `font-mono` = **JetBrains Mono**. Self-hosted vía `next/font/local` (compatible con `output: export`; sin peticiones externas).
- **Escala modular** (~1.2 minor third), `clamp()` para fluidez:

| Token | Tamaño (min→max) | Peso | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| `display` | clamp(2.5, 4.4vw, 3.5rem) | 800 | 1.03 | -0.02em |
| `h1` | 2.5rem (40) | 700 | 1.1 | -0.018em |
| `h2` | 2rem (32) | 700 | 1.15 | -0.014em |
| `h3` | 1.5rem (24) | 600 | 1.2 | -0.012em |
| `h4` | 1.25rem (20) | 600 | 1.3 | -0.008em |
| `h5` | 1.125rem (18) | 600 | 1.35 | 0 |
| `body-lg` | 1.125rem (18) | 400 | 1.55 | 0 |
| `body` | 1rem (16) | 400 | 1.6 | 0 |
| `body-sm` | 0.875rem (14) | 400 | 1.55 | 0 |
| `caption` | 0.75rem (12) | 500 | 1.4 | 0.01em |
| `overline` | 0.6875rem (11) | 600 | 1.2 | 0.18em, uppercase |
| `code` | 0.875rem (14) | 400 (mono) | 1.5 | 0 |

- **Reglas:** una `<h1>` por página (regla dura del producto). Prosa cap **65ch**. `text-wrap: balance` en titulares, `pretty` en prosa. La escala reemplaza las 5 variantes actuales de `Typography` (h1/h2/h3/lead/body → esta escala completa; `lead`=`body-lg`).

---

## 5 · Tokens — Spacing (base-8)

| Token      | px  | Token      | px  |
| ---------- | --- | ---------- | --- |
| `space-0`  | 0   | `space-5`  | 24  |
| `space-px` | 1   | `space-6`  | 32  |
| `space-1`  | 4   | `space-7`  | 48  |
| `space-2`  | 8   | `space-8`  | 64  |
| `space-3`  | 12  | `space-9`  | 96  |
| `space-4`  | 16  | `space-10` | 128 |

**Regla dura:** ningún `rem`/`px` de espaciado hardcodeado en componentes. Todo padding/margin/gap sale de esta escala. Esto **elimina** los `2rem`, `1.5rem`, `0.75rem`, `3.5rem` sueltos que hoy viven en Hero/About/Navbar.

---

## 6 · Tokens — Radii (squircle)

| Token         | px   | Asignación                                          |
| ------------- | ---- | --------------------------------------------------- |
| `radius-xs`   | 2    | tags pequeños                                       |
| `radius-sm`   | 4    | **Input**, checkbox                                 |
| `radius-md`   | 8    | badges, chips                                       |
| `radius-lg`   | 12   | **Button**                                          |
| `radius-xl`   | 16   | **Card**                                            |
| `radius-2xl`  | 24   | **Modal**, sheet                                    |
| `radius-full` | 9999 | **Radio** (única excepción: círculo real), avatares |

---

## 7 · Tokens — Elevación / sombra

Rampa contenida. **Por defecto la UI es plana: borde de 1px, `elevation-0`.** La sombra se reserva para capas que **de verdad flotan**.

| Token | Sombra | Uso |
| --- | --- | --- |
| `elevation-0` | none (borde 1px) | cards, inputs, secciones — **el default** |
| `elevation-1` | `0 1px 2px oklch(0 0 0 / .06)` | card interactiva en hover |
| `elevation-2` | `0 4px 12px oklch(0 0 0 / .10)` | menús, dropdowns, popovers |
| `elevation-3` | `0 12px 32px oklch(0 0 0 / .16)` | modales, sheets |
| `elevation-4` | `0 20px 48px oklch(0 0 0 / .20)` | toasts |

Sombras de baja opacidad, tinte frío, en capas. En dark mode la elevación se comunica más con `surface` + `border` que con sombra (las sombras casi no leen sobre fondo oscuro).

---

## 8 · Tokens — Glass + política de gobierno

**Tokens:**

| Token          | Valor                                |
| -------------- | ------------------------------------ |
| `glass-blur`   | 14px (`backdrop-filter: blur()`)     |
| `glass-bg`     | `surface` al 68% de alpha            |
| `glass-border` | highlight superior 1px `white / .12` |

**Gobierno (regla dura — esto es lo que hace que el glass "se gane su sitio"):**

- ✅ **Permitido** en capas que flotan sobre espectáculo o sobre contenido en scroll: **nav al hacer scroll** (sobre el ojo/hero), **modal / sheet / command surface**, **toasts**.
- ❌ **Prohibido** en todo lo estático: cards, inputs, secciones, footer. Esos son **planos, opacos, borde 1px**.
- **Por qué:** si una card llevara glass, rompería la estrategia de contraste (una UI calmada hace que el único espectáculo —el ojo— se sienta caro). Glass en todas partes = glass en ninguna.
- **Fallback:** sin soporte de `backdrop-filter`, la capa cae a `surface` opaco (nunca queda ilegible).

---

## 9 · Tokens — Motion (el lenguaje único)

Una sola gramática. **Todos** los componentes referencian estas primitivas; nada bespoke.

**Duraciones:** `instant` 0 · `fast` 100 · `base` 200 · `slow` 320 · `slower` 480 · `ambient` 1500ms+.

**Easings:** `standard` `cubic-bezier(0.4,0,0.2,1)` · `decelerate` (entrada) `cubic-bezier(0,0,0.2,1)` · `accelerate` (salida) `cubic-bezier(0.4,0,1,1)` · `emphasized` `cubic-bezier(0.2,0,0,1)`.

**Primitivas nombradas:**

| Primitiva | Qué hace | Timing | Dónde |
| --- | --- | --- | --- |
| `enter-rise` | translateY(8–12px)+opacity 0→1 | base · decelerate · stagger 120ms | revelado de secciones, listas |
| `fade-through` | opacity out→in | base · standard | swaps de contenido, transiciones de tema |
| `press` | scale(0.98) | fast · standard | botones, targets al pulsar |
| `hover-lift` | translateY(-2px) + tint de borde/bg | fast · standard | cards y botones interactivos |
| `shimmer` | barrido de gradiente en loop | ambient · linear | skeletons de carga |
| `expand/collapse` | altura (grid-rows) + opacity | base · standard | acordeones, help/error de forms |
| `focus-ring` | aparición del anillo | **instant, sin animar** | todo interactivo |

**Reglas duras (revisadas 2026-07-25 — ver nota):**

- **Prohibido animar propiedades de _layout_:** `width`, `height`, `margin`, `padding`, `top`/`right`/`bottom`/`left`, `font-size`. Disparan recálculo de layout en cada frame; ninguna transición del sistema las toca.
- **Preferentes (compositor):** `transform` y `opacity`. Son la primera opción siempre que expresen el efecto.
- **Permitidas para tintes de estado (_paint_):** `color`, `background-color`, `border-color`, `box-shadow`. Son baratas sobre elementos pequeños y son lo que hace legible un cambio de estado. La primitiva `hover-lift` las usa por definición.
- **Excepción cara y acotada:** `backdrop-filter` solo puede transicionar en cambios disparados por **cruce de umbral**, nunca por frame. Único uso permitido hoy: la Navbar al pasar a glass (§13.3).
- `prefers-reduced-motion: reduce` → todo colapsa a opacidad o a instantáneo; el foco **nunca** se anima; los loops ambiente se congelan. Un indicador de carga en curso se **ralentiza**, no se congela (si se congelara dejaría de comunicar que algo está pasando): esa excepción debe declararse con `!important`, porque el reset global lo lleva.

> **Nota de enmienda (2026-07-25).** La redacción original decía "solo `transform`/`opacity`", pero su propia lista de exclusión era enteramente de propiedades de layout, y la primitiva `hover-lift` que este mismo documento define incluye "tint de borde/bg" — contradicción detectada en la revisión final de la implementación, cuando 3 de los 5 componentes animados incumplían la regla leída al pie de la letra mientras cumplían §13.2. El propósito de la regla es **rendimiento**, no purismo: layout es lo caro, paint no. Enmendado con aprobación del usuario.

---

## 10 · Tokens — Z-index

| Token          | Valor |
| -------------- | ----- |
| `z-base`       | 0     |
| `z-raised`     | 10    |
| `z-sticky-nav` | 100   |
| `z-dropdown`   | 200   |
| `z-overlay`    | 900   |
| `z-modal`      | 1000  |
| `z-toast`      | 1100  |
| `z-max`        | 9999  |

---

## 11 · Tokens — Layout / grid

- `container-max` **1200px**, centrado; padding inline responsivo (`space-4` móvil → `space-7` desktop).
- `prose-max` **65ch**.
- Grid de **12 columnas**, gutter `space-5` (24px).
- Breakpoints: se conservan los actuales del repo — `sm` 600 · `md` 768 · `lg` 992 · `xl` 1200 — y se añade `2xl` 1536. (La DS vti-sdk define más pasos; no se necesitan todos para una landing. Ver decisión abierta §18.)
- Ritmo vertical de sección: `space-9`/`space-10` entre bloques narrativos.

---

## 12 · Tokens — Focus y varios

- `focus-ring`: **2px solid `focus` (primary-500), offset 2px**, vía `:focus-visible`. Token único, nunca color-only, nunca animado.
- `hairline`: 1px `border`.
- `scrim`: `neutral-1100 / .55` para overlays de modal.
- `opacity-disabled`: 0.5.

---

## 13 · Especificaciones de componentes

**Esqueleto común** (cada componente se especifica con estas 7 casillas): `anatomía` · `variantes` · `tamaños` · `estados` (default / hover / **focus-visible** / active / disabled / **loading** donde aplique) · `tokens que consume` · `motion` (primitivas de §9) · `a11y` (roles, foco, target ≥44px) · `glass` (sí/no + por qué).

### 13.1 Button

- **Variantes:** `solid` (marca), `soft` (tint), `outline`, `ghost`. **Intents:** primary, neutral, success, danger.
- **Tamaños:** `sm` 36px, `md` **44px (default, target mínimo)**, `lg` 52px. Radio `radius-lg`. Padding inline `space-4`/`space-5`.
- **Estados:** hover → `hover-lift` + tint (`brand-solid` un paso más oscuro). focus-visible → `focus-ring`. active → `press`. disabled → `opacity-disabled`, sin eventos. **loading** → label se sustituye por spinner inline, **el ancho se preserva** (sin salto), `aria-busy="true"`, botón inhabilitado.
- **Tokens:** solid → bg `brand-solid`, text `on-brand`; outline → border `border-strong`, text `text`.
- **Motion:** `press` + `hover-lift`. **Glass:** no.

### 13.2 Card

- **Anatomía:** contenedor `surface`, borde 1px `border`, radio `radius-xl`, padding `space-5`/`space-6`. Slots: media, header, body, footer/acciones.
- **Variantes:** `static` (default) · `interactive` (toda la card es link/botón).
- **Estados (interactive):** hover → `border-strong` + `elevation-0`→`elevation-1` + `hover-lift`. focus-visible → `focus-ring` en la card entera.
- **Motion:** `hover-lift`. **Glass:** **no** (es estática → plana, por §8).

### 13.3 Navigation (top nav + menú móvil)

- **Top nav:** sticky, `z-sticky-nav`. Sobre el hero arranca **transparente**; al hacer scroll pasa a **glass** (`glass-blur` + `glass-bg` + hairline inferior) — este es el **glass ganado** de §8. Izquierda: marca (el _corner mark_ del ojo, continuidad con el viaje). Derecha: LanguageSelector, ThemeToggle, CTA primario.
- **Móvil:** botón de menú → **sheet** (glass, `z-modal`) con **focus trap**, cierre por Esc/backdrop, `aria-expanded`.
- **Estados:** link activo `aria-current="page"`, subrayado/tint de marca. focus-visible en cada item.
- **Motion:** transición transparente→glass ligada a scroll (`fade-through` del fondo); sheet entra con `enter-rise`. **Glass:** **sí**, y es su caso canónico.

### 13.4 Forms

- **Field (wrapper):** `label` (arriba, `caption`/`body-sm` 600) · control · `help` (`text-subtle`) · `error` (`error`, con icono). `label` siempre asociado (`htmlFor`/`id`).
- **Input / Textarea:** alto 44px (input), radio `radius-sm`, borde 1px `border`; focus → `border-strong` + `focus-ring`; error → borde `error` + mensaje; disabled/readonly diferenciados. **Sin** animación de "shake" (respeta reduced-motion). Textarea: resize vertical, min 3 líneas.
- **Select:** custom accesible (listbox, teclado) con fallback a `<select>` nativo; misma métrica que Input.
- **Checkbox:** radio `radius-sm`, check con `fade-through` (no bounce). **Radio:** `radius-full` (la excepción de la DS). Ambos: target ≥44px aunque el glifo sea 20–24px.
- **Validación:** el `error`/`help` aparece con `expand/collapse`. Mensajes por i18n. `aria-invalid`, `aria-describedby`.
- **Glass:** no (controles estáticos).

### 13.5 Soporte

- **Link:** `brand-text`, subrayado en hover; focus-ring; inline vs standalone.
- **Badge / Tag:** `soft` tint, `radius-md`, `caption`.
- **Spinner:** SVG rotatorio (transform only), tamaños sm/md; `role="status"` + label i18n oculto.
- **Skeleton:** bloque `surface-sunken` con `shimmer`; respeta reduced-motion (se queda estático).

---

## 14 · Loading sequences

Sistema coherente, no spinners sueltos:

1. **Skeleton (`shimmer`)** — para contenido que llega async (previews, listas). Congela en reduced-motion.
2. **Botón loading** — label↔spinner sin salto de ancho, `aria-busy`.
3. **Revelado de sección** — al entrar en viewport (`IntersectionObserver`), los bloques suben con `enter-rise` + stagger 120ms. **Comparte mecánica con el beat "el sistema se materializa" del viaje** (Features): las cards se ensamblan con este mismo revelado.
4. **Page-enter** — primera pintura: contenido crítico visible ya (SSG estático), realce sutil con `enter-rise` solo en el bloque hero.

Todo `transform`/`opacity`. Sin bloqueo de scroll, sin spinners de página completa.

---

## 15 · Accesibilidad y theming

- **Contraste:** AA en ambos temas; dark usa sólidos step-500 justamente porque libran AA sobre página oscura.
- **Foco:** `focus-ring` en todo interactivo, nunca color-only, nunca animado.
- **Motion:** `prefers-reduced-motion` global (§9).
- **Targets:** ≥44px (los tamaños `sm` de controles reservan área táctil).
- **Semántica:** landmarks, headings en orden, una `<h1>`/página, `button` vs `a` correctos.
- **Theming:** light/dark por re-mapeo de roles semánticos (§3.2/3.3); persistencia ya existente en el `ThemeProvider`.
- **i18n:** cero texto en tokens ni en componentes; todo string por i18next (es/en a la par).

---

## 16 · Forma del entregable (archivos)

**Código vivo (tokens):**

```
src/theme/tokens/
├─ color.ts        primitivos OKLCH (6 escalas × 12) + generador de rampa
├─ semantic.ts     roles light + dark
├─ typography.ts   familias, escala, pesos, tracking
├─ space.ts        base-8
├─ radius.ts       squircle + asignaciones
├─ elevation.ts    sombras
├─ glass.ts        blur/bg/border
├─ motion.ts       duraciones, easings, primitivas
├─ zIndex.ts
└─ grid.ts         container, prose, breakpoints, columnas
src/theme/theme.types.ts   reconstruido (incluye las categorías nuevas; corrige el typo `weigth`)
src/theme/themes.ts        light + dark sobre primitivos + semánticos
src/theme/GlobalStyles.tsx cableado a los nuevos tokens
```

**Documento (specs):** este archivo (`docs/superpowers/specs/2026-07-24-luxury-interface-system-design.md`) + copia registrada en el vault Obsidian.

---

## 17 · Plan de migración (para la fase de implementación — no ahora)

1. **Capa de tokens** — crear `src/theme/tokens/*`, reconstruir `theme.types.ts` y `themes.ts`, añadir fuentes Hanken/JetBrains vía `next/font/local`, cablear `GlobalStyles`.
2. **Re-mapeo semántico** — Navbar, Hero, About, Footer, ThemeToggle, LanguageSelector, Socials, BrandName, Typography pasan de leer pasos crudos (`color.primary[500]`) a **roles semánticos** (`semantic.brand`, `semantic.text`…). Refactor real, deja el código mejor; sin cambio funcional.
3. **Componentes de referencia** — construir en vivo **Button, Card, Input, y upgrade de Nav** (glass on-scroll) como prueba de que tokens + motion resuelven. El resto del roster queda especificado aquí hasta que el viaje lo pida.
4. **Verificación** — `pnpm check` (typecheck+lint+format) + `pnpm test`; AA en ambos temas; QA de reduced-motion.

**Nota de riesgo:** el paso de HSL 9-pasos → OKLCH 12-pasos + capa semántica toca todos los componentes actuales. Es la parte más invasiva; la capa semántica está pensada para que sea la **única** vez que haya que tocarlos por color.

---

## 18 · Decisiones abiertas / fuera de alcance

- **Valores OKLCH exactos:** las rampas de §3.1 son la escala de trabajo derivada de las anclas; los valores finales se **ajustan a AA en código** (posible micro-ajuste de L/C por celda).
- **Breakpoints:** se conservan los 4 del repo + `2xl`. Alinear del todo con los 8 pasos de vti-sdk queda como decisión posterior (no crítico para landing).
- **Roster largo (Select custom, Tabs, Tooltip, Toast…):** especificado el núcleo; el resto se detalla cuando un flujo lo requiera (YAGNI).
- **Construir el roster completo:** fuera de esta pasada; solo se especifica + se construyen los 4 de referencia (en implementación).
- **Spec del viaje cinemático 3D:** documento aparte, pendiente de 3 confirmaciones (copia es/en, dep OGL, enlaces CTA). Este sistema es su fundación.

---

## 19 · Checklist de handoff

- [ ] Tokens en 3 capas; ningún componente lee un primitivo directamente
- [ ] OKLCH validado a AA en light y dark
- [ ] Hanken Grotesk + JetBrains Mono self-hosted (sin peticiones externas; compatible con export estático)
- [ ] Cero spacing/radii hardcodeado — todo desde escala
- [ ] Glass solo en nav-scrolled / modal / sheet / toast; nunca en estático
- [ ] Un único lenguaje de movimiento; solo `transform`/`opacity`
- [ ] `prefers-reduced-motion` colapsa todo; foco nunca animado
- [ ] `focus-ring` en todo interactivo; targets ≥44px
- [ ] Una `<h1>` por página; semántica y landmarks correctos
- [ ] Todo string por i18n (es/en a la par)
- [ ] Dark mode = re-mapeo semántico, no paleta nueva

---

_VoidToInfinite · sistema de interfaz de lujo · v1.0 · fundación para el viaje cinemático._
