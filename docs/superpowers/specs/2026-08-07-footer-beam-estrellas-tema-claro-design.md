# Footer — `SectionBeam` y el campo de estrellas se habilitan y se adaptan al tema claro (2026-08-07)

**Rama:** `feature/general-refactoring` · **Sección:** `Footer` (rama CLARA) + el componente compartido `SectionBeam`

**Encargo del usuario (verbatim, 2026-08-07).** «El footer, habilitar y adaptar los componentes `SectionBeam` y `ScStars` para el tema claro.»

---

## 1. Estado actual medido (lectura de código, 2026-08-07)

| Pieza | Hoy | Dónde |
| --- | --- | --- |
| `SectionBeam` | montado con `{isDark && <SectionBeam />}` | `Footer.tsx:353` |
| `ScStars` (24 `ScStar`) | montado con `{isDark && (...)}` | `Footer.tsx:354-363` |
| `ScFooter` rama clara | `background-color: semantic.surfaceSunken` + `border-top: 1px solid semantic.border`, **sin `position: relative`** | `Footer.tsx:68-79` |
| `ScInner` | `position: relative; z-index: 1` **solo** si `$dark` | `Footer.tsx:190-195` |
| Color del haz | 7 literales VERBATIM del mockup oscuro, L 0.7–0.97 | `sectionBeam.layers.ts:24-36` |
| Tinte de estrella | 3 literales VERBATIM, L 0.73–1.0, alfa 0.95 | `footer.layers.ts:61-63` |
| Halo de estrella | `glow: string \| null`, box-shadow completo con el mismo tinte a alfa 0.7 | `footer.layers.ts:47` |

El problema no es solo el gate. **Todo el arte de las dos piezas es claro-sobre-oscuro**: el haz va de L 0.7 a L 0.97 y las estrellas de L 0.73 a L 1.0, contra un fondo de L 0.055 (`FOOTER_DARK_BG`). El fondo del footer CLARO es `semantic.surfaceSunken` = `neutral[100]` = **L 0.96**. Quitar el `isDark &&` sin tocar el color entregaría dos piezas invisibles: blanco sobre casi blanco. De ahí que el encargo diga «habilitar **y adaptar**».

`Contact.tsx:973` monta el haz bajo su propio `if (themeName !== "light")`. **Queda fuera de esta entrega** (el encargo dice "el footer"): el componente pasa a soportar los dos temas, pero quién lo monta en Contacto no se toca.

---

## 2. Decisiones

### D1 — El criterio de traducción: se invierte la RELACIÓN con el fondo, no se recolorea a ojo

En oscuro, las dos piezas son **más claras** que su fondo (Δ L de +0.65 a +0.95). En claro tienen que ser **más oscuras** que el suyo, con el mismo orden interno: el núcleo es lo más denso y la cola se desvanece hacia `transparent`.

Segunda regla, y es la que decide los valores concretos: **la rama oscura conserva sus literales VERBATIM del mockup (D18 de la spec del 2026-08-03, intocables), y la rama clara NO inventa literales nuevos — se construye con pasos reales de `theme.data.palette`.** No hay mockup claro de esta pieza, así que la alternativa a los tokens sería inventarme siete colores; el manual del repo (§5, "tokens de tema obligatorios, sin colores hardcodeados") ya dice cuál de las dos es la correcta. El alfa se añade con `color-mix(in oklab, <token> N%, transparent)`, que es premultiplicado y por tanto NO desplaza el tono — mismo recurso que ya usa `ScCardBadge` en `Story.tsx`.

### D2 — Paleta del haz en claro

Los siete valores, cada uno con su paso de rampa. `secondary` es hue 311.928 y `primary` 235.851 — los MISMOS hues que usan los literales oscuros, así que el haz claro es la misma pieza en otra tonalidad, no otra pieza.

| Rol | Oscuro (VERBATIM, no se toca) | Claro (nuevo) |
| --- | --- | --- |
| `BEAM_CORE` | `oklch(0.85 0.13 311.928)` | `palette.secondary[600]` |
| `BEAM_MID` (25%) | `oklch(0.75 0.18 311.928 / 0.6)` | `color-mix(in oklab, palette.secondary[500] 60%, transparent)` |
| `BEAM_TAIL` (60%) | `oklch(0.7 0.19 311.928 / 0.2)` | `color-mix(in oklab, palette.secondary[400] 20%, transparent)` |
| `SWEEP_CORE` | `oklch(0.97 0.06 311.928)` | `palette.secondary[700]` |
| `SWEEP_MID` (20%) | `oklch(0.9 0.12 235.851 / 0.5)` | `color-mix(in oklab, palette.primary[600] 50%, transparent)` |
| `SWEEP_GLOW` | `oklch(0.8 0.17 311.928 / 0.9)` | `color-mix(in oklab, palette.secondary[600] 45%, transparent)` |
| `HOTSPOT_GLOW` | `oklch(0.8 0.17 311.928 / 0.95)` | `color-mix(in oklab, palette.secondary[600] 50%, transparent)` |

Dos detalles que no son simetría automática:

- **El barrido es más OSCURO que el dibujado, al revés que en oscuro.** En el mockup el barrido es casi blanco (L 0.97) porque es el destello que pasa por encima de un haz ya claro. Sobre fondo claro, "más brillante" es invisible: el destello se lee como una pasada más densa, así que `SWEEP_CORE` cae a `secondary[700]` (L 0.53), por debajo del `secondary[600]` (L 0.66) del núcleo del dibujado.
- **Los dos `drop-shadow` bajan de alfa 0.9/0.95 a 0.45/0.5.** Un halo oscuro sobre fondo claro es una sombra, no un resplandor, y a alfa 0.9 se lee como una mancha sucia bajo la línea. La mitad de alfa conserva la difusión sin ensuciar.

### D3 — El campo de estrellas en claro: tintes y halos

| Ranura | Oscuro (VERBATIM) | Claro |
| --- | --- | --- |
| `white` (17 de 24) | `oklch(1 0 0 / 0.95)` | `palette.neutral[500]` a alfa `FOOTER_STAR_LIGHT_ALPHA` |
| `secondary` (4) | `oklch(0.73 0.195 311.928 / 0.95)` | `palette.secondary[500]` a la misma alfa |
| `primary` (3) | `oklch(0.8 0.117 235.851 / 0.95)` | `palette.primary[500]` a la misma alfa |

`FOOTER_STAR_LIGHT_ALPHA = 0.8`, no 0.95 como en oscuro: **un punto oscuro sobre fondo claro pesa más que uno claro sobre fondo oscuro con el mismo alfa** — la asimetría perceptiva habitual del contraste simultáneo. 24 puntos a alfa 0.95 sobre `neutral[100]` leerían como suciedad, no como polvo de estrellas. `FOOTER_STAR_LIGHT_GLOW_ALPHA = 0.35` (frente a 0.7 en oscuro), por el mismo motivo que D2 da para los `drop-shadow` del haz.

Geometría, tamaños, duraciones, retardos y el keyframe `starTwinkle` **no cambian**: es la misma constelación, en otra tinta.

### D4 — La tabla de 24 estrellas guarda DATOS, no cadenas de CSS ya compuestas

Hoy cada fila lleva `tint: string` (el literal oscuro completo) y `glow: string | null` (el `box-shadow` completo, con ese mismo literal embebido a alfa 0.7). Con dos tonalidades eso obliga a duplicar la tabla entera o a hacer cirugía de cadenas sobre el `box-shadow` — las dos, peores que el cambio de forma:

- `tint: string` → `tintKey: "white" | "secondary" | "primary"`
- `glow: string | null` → `glowBlurPx: number | null`

El `box-shadow` se compone en el render a partir de `tintKey` + `glowBlurPx` + el tema, con la forma que la tabla ya tenía siempre: `0 0 <blur>px 1px <tinte a la alfa de halo>`. Esto **no inventa** una invariante: `footer.layers.test.ts:69` ya la afirmaba ("cada glow es null o un box-shadow con el mismo tinte a alfa 0.7"), es decir, la relación existía y la estaba vigilando un test porque no estaba expresada en los datos. Ahora lo está, y ese test pasa a comprobar lo que le corresponde (que los blur son números positivos y que los seis halos siguen siendo seis).

El valor oscuro compuesto tiene que salir **byte a byte igual** que el literal actual de cada fila: es el candado de que este cambio de forma no toca el arte oscuro (D5).

### D5 — Invariante duro: la rama OSCURA no cambia ni un píxel

Ni color, ni geometría, ni tiempos, ni orden de apilado. Es arte VERBATIM del mockup y ya está entregado y aprobado. Todo lo de esta spec entra por una bifurcación de tema, y los tests tienen que seguir fijando los literales oscuros exactos que fijan hoy.

La bifurcación se hace con `theme.data.isLight` dentro de los styled-components, **no** con props nuevas en `SectionBeam`: el componente sigue sin API (YAGNI, como declara su propio docblock) y sus dos consumidores lo siguen montando igual. Mismo recurso que `ScAccent` en `Story.tsx`, que ya elige su degradado con `theme.data.isLight`.

### D6 — Cableado del footer claro

1. `ScFooter` rama clara gana `position: relative`. Sin él, el haz (`position: absolute; top: 0`) y el campo de estrellas (`position: absolute; inset: 0`) se anclarían al primer ancestro posicionado que hubiera más arriba — o al viewport — y aparecerían fuera del footer.
2. `ScInner` pasa a declarar `position: relative; z-index: 1` **sin condición**: con las estrellas posicionadas sobre el fondo, el contenido las necesita para no quedar por debajo, y eso ya no depende del tema. Desaparece la prop `$dark` de este componente.
3. `{isDark && ...}` desaparece de las dos piezas en el JSX: se montan siempre.
4. **El `border-top: 1px solid semantic.border` de la rama clara se retira**, sustituido por el haz — el mismo criterio que D17 de la spec del 2026-08-03 aplicó en oscuro ("la frontera entre dos secciones se marca con el haz, no con un borde sólido"). Y hay un motivo extra propio del tema claro: ese borde es hoy `neutral[100]`, es decir **exactamente el mismo color que el fondo del footer** (`surfaceSunken`) tras la edición del usuario del commit `74458b2` — un borde con 1.00:1 de contraste contra la superficie que separa. No se está retirando una separación que funcionara; se está sustituyendo una que ya era invisible por una que sí se ve.
5. `ScFooter` conserva su `$dark` (decide fondo y ahora solo eso).

### D7 — `prefers-reduced-motion` y accesibilidad: sin cambios de contrato

Las dos piezas son decorativas (`aria-hidden`) y no transportan información, así que ningún umbral de contraste WCAG aplica. Los guards de `reduce` existentes (haz dibujado y quieto, estrellas sin titileo en su opacidad mínima) valen igual en las dos tonalidades y **no se tocan**.

### D8 — Alcance

**Flujo A (haz):** `sectionBeam.layers.ts`, `sectionBeam.parts.tsx`, `sectionBeam.layers.test.ts`, `SectionBeam.test.tsx`. **Flujo B (estrellas + cableado):** `footer.layers.ts`, `footer.layers.test.ts`, `Footer.tsx`, `Footer.test.tsx`.

Alcance de ficheros **disjunto**: ningún flujo escribe un fichero del otro. No se toca `Contact.tsx` (ver §1), ni `useReveal`, ni tokens, ni i18n.

---

## 3. Definition of Done

1. `pnpm test` completo en verde, salida literal.
2. `pnpm check` (typecheck + lint + formato) sin errores nuevos, salida literal.
3. `next build` verde.
4. Verificación en navegador real (la hace Opus): haz y estrellas visibles y legibles en el footer CLARO; footer OSCURO comparado antes/después sin diferencia; `reduce` documentado.
5. `graphify update .` y registro en el vault.

---

## 4. Correcciones de integración (revisión de Opus sobre el trabajo de los dos flujos)

Dos defectos reales que la revisión encontró y el integrador arregló. Ninguno era culpa del flujo que lo entregó: el primero es un hueco de ESTA spec, el segundo un patrón que el flujo B no tenía por qué conocer.

### C1 — `ScBottomBar` también necesita salir por encima de las estrellas (hueco de D6)

D6.2 nombraba solo `ScInner`. `ScBottomBar` (copyright + los cuatro enlaces legales) llevaba el MISMO `position: relative; z-index: 1` condicionado a `$dark`, y se quedó condicionado.

No es cosmético. El orden de pintado dentro de un contexto de apilamiento (CSS 2.1 §9.9.1) coloca los descendientes de bloque **en flujo y sin posicionar** (paso 3) ANTES que los descendientes **posicionados con `z-index: auto`** (paso 6), con independencia del orden del DOM. Con la barra inferior sin posicionar en claro, las 24 estrellas y sus halos se habrían pintado ENCIMA del copyright y de los enlaces legales — aunque en el DOM las estrellas van antes. `ScBottomBar` pierde su `$dark` y declara el par sin condición, igual que `ScInner`.

Medido en navegador tras el arreglo: `ScInner` y `ScBottomBar` resuelven los dos a `position: relative; z-index: 1` en el tema claro.

### C2 — El footer resolvía el tema a mano en vez de leer el ambiental

El flujo B necesitaba el `ThemeDefinition` completo para componer el tinte de cada estrella y lo obtuvo con `themes[themeName]`, importando la tabla de temas. Funciona, pero duplica la fuente de verdad de "qué tema está activo": `ThemeProvider.tsx:90` ya expone exactamente `{ data: themes[themeName] }` a todo el árbol.

Es la misma clase de divergencia que `Navbar.tsx` documenta al retirar su `ThemeProvider` anidado («no hay ningún segundo árbol de tema contra el que algo pueda divergir»). Se sustituye por el `useTheme` de styled-components (importado como `useStyledTheme` para no chocar con el `useTheme` del repo, que devuelve `themeName`): el footer lee ahora el MISMO objeto de tema que están usando sus propios styled-components.

### Verificación del invariante D5 en navegador real

El footer OSCURO, tras los dos flujos y las dos correcciones, reproduce literal a literal su arte anterior — incluida la estrella con halo, cuyo `box-shadow` se compone ahora desde `tintKey` + `glowBlurPx`:

| Medida | Antes de la entrega | Después |
| --- | --- | --- |
| fondo | `oklch(0.055 0.01 288)` | igual |
| `border-top` | `0px` | igual |
| núcleo del haz | `oklch(0.85 0.13 311.928)` | igual |
| halo del punto caliente | `oklch(0.8 0.17 311.928 / 0.95)` | igual |
| estrella 0 | `oklch(1 0 0 / 0.95)`, sin sombra, 1.59375px | igual |
| estrella con halo | — | `oklch(0.73 0.195 311.928 / 0.95)` + `... / 0.7) 0px 0px 10px 1px` |

### Lo que NO se pudo verificar en navegador

El panel del navegador quedó oculto a mitad de la verificación y, sin compositor, no corren `requestAnimationFrame` ni las animaciones CSS (misma familia que la lección del 2026-08-02 sobre la pestaña en segundo plano). Por eso **no** se pudo confirmar en marcha ni el titileo de las estrellas ni el disparo del dibujado del haz por `useReveal` en el tema claro. Las dos son mecánicas PREEXISTENTES que esta entrega no toca — solo cambia el color que pintan — y su CSS está fijado por tests. Queda pendiente de una mirada humana.
