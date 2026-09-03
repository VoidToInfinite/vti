# Spec — Navbar: despegue al hacer scroll ("slime detach")

**Fecha:** 2026-07-31 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `1b9613a` **Encargo del usuario (literal):**

> - scroll: cuando se hace scroll, el ancho máximo es de 1280px centrado en la pantalla y separado del top con un margin-top de 4px o 8px.
> - animación: cuando se hace scroll, el navbar pasa del width 100% sin border radius a máximo de 1280px con border radius 16px vértices. Dicha animación debe dar verse como si se despegase de manera óptima y fluida. Al hacer scroll hacia abajo, despegarse y de abajo hacia arriba pegarse como slime.

---

> **Enmienda 2026-08-11 (Task 10, plan premium F1-F5).** Todo lo que esta spec dice sobre el DESPEGUE (`data-scrolled`, `data-detach`, `ScBar`/`ScSurface`, `peelOff`/`stickOn`, `NAV_DETACH_ANIM_MS`) sigue vigente sin un solo cambio. Lo que ya NO describe el código es el mecanismo de la ENTRADA DE CARGA que menciona de pasada en §1 y §4: `data-intro` y `useStage()` desaparecieron de `Navbar.tsx`: la entrada es hoy una `@keyframes` estática (`navbarDrop`) con `animation-delay: HERO_CHROME_OFFSET_MS`, presente en el CSS del HTML exportado. El retardo de 760 ms se conserva verbatim. Motivo y medición completos en la §5.5 de `2026-07-27-hero-coreografia-carga-tema-design.md`. Consecuencia para esta spec: `opacity`/`transform` salieron de la lista de `transition` de `ScHeader` (una `@keyframes` sobre una propiedad impide que su `transition` exista), y esa lista quedó con una sola entrada, `padding-inline` — el bloque `&[data-scrolled="true"]` sigue cambiando solo su valor, que es justo lo que D1 pedía proteger.

## 1. Estado actual (medido, no de memoria)

`src/components/layout/Navbar/Navbar.tsx` monta un único `ScHeader` (`<header>`, `position: fixed`, `top/left/right: 0`) que lleva TODO a la vez: posicionamiento, la banda de cristal (`glass.bg` + `backdrop-filter` + `border-bottom`) y la animación de entrada de la carga (`data-intro`, `opacity`/`transform`). Dentro va `ScNav` (`<nav>`, `height: var(--nav-height)` = 3.5rem) con marca, enlaces de sección (solo tema claro, ≥ md) y acciones.

Estados existentes que NO se tocan:

| Estado | Origen | Efecto |
| --- | --- | --- |
| `data-scrolled` | `useScrolled(8)` | activa el cristal; alimentaba también `EyeCornerMark visible={scrolled}`, retirado después (ver §14) |
| `data-intro` | `useStage()` (`phase === "backdrop"`) | entrada en la carga: `opacity` + `translateY(-8px)` |

Baseline de calidad de esta rama, medido antes de empezar: `typecheck` y `lint` limpios; `check-format` falla **solo** en `graphify-out/**` (artefactos generados); `pnpm test` = 495 verdes + **1 fallo preexistente** en `app/home-page.flujo.test.tsx` (tema oscuro, timeout de 5000 ms), ajeno a Navbar; `check-spelling` con 31122 incidencias preexistentes. Ninguno se corrige en esta entrega: se mantienen aislados y se verifica que no crecen.

## 2. Objetivo

Al cruzar el umbral de scroll, la barra deja de ser una banda a sangre y se convierte en una **píldora flotante**: 1280px de ancho máximo, centrada, separada 8px del borde superior (y de los laterales cuando el viewport es más estrecho que 1280px + los márgenes), con 16px de radio en las cuatro esquinas, cristal, borde y sombra. La transición entre los dos estados tiene que leerse como material que **se despega** al bajar y que **vuelve a pegarse** al subir — no como un cambio de tamaño mecánico.

## 3. Decisiones de alcance

| # | Decisión | Porqué |
| --- | --- | --- |
| D1 | La barra se parte en tres capas: `ScHeader` (posición fija + intro, sin chrome visual), `ScBar` (la geometría: ancho, centrado, separación) y `ScSurface` (el chrome: cristal, borde, radio, sombra), hermana de `ScNav`. | Separar geometría de superficie es lo que permite deformar la superficie (squash/stretch del slime) **sin deformar el texto ni los iconos**: `ScSurface` no contiene nada. Es el mismo principio que ya usa `eye.parts.tsx` con sus capas decorativas. |
| D2 | El "despegue" horizontal se anima con `max-width` + `padding-inline` (propiedades de layout, ver §4), NO con `transform: scaleX`. **Desviación explícita** de la regla de la casa "anima solo `transform`/`opacity`". | `scaleX` exige un factor `1280px / ancho-del-viewport` que CSS **no puede calcular** (`calc()` no permite dividir longitud entre longitud): obligaría a un `ResizeObserver` que escribiera una variable por JS. Y `scaleX` deforma el radio de las esquinas (elipses) exactamente en el estado final, que es el que se ve el 100% del tiempo. La alternativa `clip-path: inset()` da geometría exacta pero recorta la sombra y el borde, que son justo las señales de "está despegado". El coste real de la desviación está acotado: `ScHeader` es `position: fixed`, o sea fuera de flujo — reflowar su ancho recalcula el layout de ~8 nodos suyos y **no** reflowa el documento; además ocurre una vez por cruce de umbral (dos veces por sesión típica), no por frame. Se verifica en navegador que la transición no produce jank. |
| D3 | El slime SÍ es puro `transform`: `ScSurface` lleva `@keyframes` de `scaleY`/`scaleX` (squash & stretch, `transform-origin: top center`) que se disparan solo en el cruce de umbral. | La deformación elástica es lo que convierte "cambia de ancho" en "se despega": conservación de volumen (estira en Y, pellizca en X) es el principio de animación clásico. Compuesto en GPU, sin coste de layout. |
| D4 | El disparo de esas `@keyframes` NO se cuelga de `data-scrolled` sino de un estado propio `data-detach` (`idle` \| `detaching` \| `attaching`), producido por un hook nuevo `useNavDetach` y devuelto a `idle` pasada la animación. | Colgarlo de `data-scrolled` haría que la animación de "pegarse" se ejecutara **en el montaje** de cada carga de página (el elemento entra con `data-scrolled="false"`, la regla existe desde el primer frame). Con un estado que arranca en `idle` y solo cambia ante un cruce REAL, la carga es silenciosa. Además `data-detach` es un atributo, así que la coreografía es verificable en jsdom sin depender de `@media` (que jsdom no evalúa — lección 2026-07-27). |
| D5 | `useNavDetach` toma su línea base leyendo `window.scrollY` en su propio efecto de montaje, no el primer valor que emite `useScrolled`. | `useScrolled` hace un `onScroll()` síncrono al montar: al abrir la página ya scrolleada (ancla, restauración de scroll) emite `false → true` en el commit siguiente. Sin línea base propia, ese cambio se confundiría con un scroll del usuario y dispararía el slime en la carga. |
| D6 | Separación y márgenes laterales salen de una variable CSS nueva `--nav-gap: 0.5rem` declarada en `GlobalStyles` junto a `--nav-height`, **no** de un token de tema. Se elige 8px (de los 4px/8px que ofrece el encargo). | Mismo motivo, ya documentado en `GlobalStyles`, por el que `--nav-height` vive ahí: es una medida de LAYOUT con dos consumidores que no pueden derivarla uno del otro — el Navbar (que la aplica) y el `scroll-margin-top` de las secciones ancladas, que ahora tiene que descontar barra **más** separación (`calc(var(--nav-height) + var(--nav-gap))`). 8px y no 4px: con 16px de radio y sombra `elevation[2]`, 4px lee como un error de imprenta; 8px lee como intención. |
| D7 | El ancho máximo es un token de tema nuevo: `grid.navMax = "1280px"`. No se reutiliza `grid.containerMax` (1200px) ni se escribe el literal en el componente. | El encargo fija 1280px, que no es el ancho de contenido del sitio; son dos medidas distintas y deben poder divergir. Escribirlo como literal violaría la regla de tokens de la casa. Añadir la clave obliga a actualizar el contrato cerrado de `system.test.ts` **en el mismo commit** (lección 2026-07-25) — se hace, sin relajar la aserción. |
| D8 | Se añade una curva nueva `motion.easing.overshoot = "cubic-bezier(0.34, 1.56, 0.64, 1)"`. | Ninguna de las cuatro curvas actuales (`standard`, `decelerate`, `accelerate`, `emphasized`) sobrepasa su valor final: todas son monótonas. Sin sobrepaso no hay rebote, y sin rebote la barra "cambia de tamaño" en vez de "despegarse". Mismo trámite de contrato cerrado que D7. |
| D9 | El cristal deja de conmutarse por `background-color`/`border-color`/`backdrop-filter` y pasa a ser **siempre** el mismo en `ScSurface`, conmutado por `opacity: 0 → 1`. | Una sola propiedad compuesta en GPU en lugar de tres propiedades de pintado. El estado transparente sobre el hero queda idéntico al actual (una superficie con `opacity: 0` no pinta cristal ni proyecta `backdrop-filter`). |
| D10 | La duración de la coreografía vive en una constante exportada `NAV_DETACH_ANIM_MS`, consumida por el hook (temporizador) y por el CSS (duración de las `@keyframes`), con un test que la ata al token `motion.duration.slower`. | Mismo patrón exacto que `HERO_CHROME_OFFSET_MS` en `hero.transition.ts`: un número que JS y CSS tienen que compartir se declara una vez y se ata al token con un test, para que no puedan desincronizarse en silencio. |
| D11 | Fuera de alcance en esta entrega: ocultar/mostrar la barra según la dirección del scroll, barra compacta (reducir `--nav-height` al scrollear), menú móvil, y cualquier cambio en enlaces, i18n o contenido. | El encargo describe geometría + textura de la transición. Todo lo demás es otra entrega. |

## 4. Composición resultante

```
<ScHeader role=banner data-scrolled data-detach data-intro>   {/* fixed, top/left/right 0, z-index stickyNav, intro opacity+transform;
                                                                   padding-inline 0 -> var(--nav-gap) = separacion lateral */}
  <ScBar>                                                     {/* width auto; margin-inline auto;
                                                                   max-width 100vw -> navMax; margin-top 0 -> var(--nav-gap) */}
    <ScSurface aria-hidden="true" data-nav-surface />          {/* absolute inset 0; glass + border + radius + elevation;
                                                                   opacity 0 -> 1; @keyframes peelOff / stickOn */}
    <ScNav>                                                   {/* relative; height var(--nav-height); contenido intacto */}
      marca (Logo + BrandName) · enlaces de sección (claro, ≥ md) · acciones
    </ScNav>
  </ScBar>
</ScHeader>
```

**Por qué el ancho se anima con `max-width` y no con `width`.** La formulación evidente (`width: 100%` → `width: calc(100% - 2 * var(--nav-gap))`) obliga al motor a interpolar entre un porcentaje y un `calc()` mixto: está definido en la especificación, pero si algún motor no lo resolviera el ancho **saltaría** en vez de animarse, y el fallo sería justo el efecto que se está construyendo. La formulación elegida evita el problema por completo:

- `ScBar` es un bloque con `width: auto`, así que **rellena** lo que le deje su contenedor.
- El hueco lateral lo pone `ScHeader` con `padding-inline` (longitud pura: `0` ↔ `8px`).
- El tope lo pone `max-width`, que va de `100vw` (que no limita nada: es ≥ el ancho disponible) a `1280px`. Las dos son **longitudes absolutas**, así que la interpolación es la más simple que existe.
- `margin-inline: auto` centra en cuanto el tope entra en juego.

Reparto de responsabilidades de la `transition`: `ScHeader` ya tenía una lista propia (intro: `opacity`/`transform`) y solo se le **añade** una entrada (`padding-inline`), nunca se le redeclara la lista — redeclararla dentro del bloque de estado borraría las entradas del intro. La coreografía dependiente del sentido vive en `ScBar`, cuya lista de transición es exclusivamente suya (`max-width` + `margin-top`) y se puede redeclarar entera sin efectos colaterales.

`ScSurface` es un `<div>` decorativo con `aria-hidden="true"`: no aporta contenido ni landmark. `ScNav` sigue siendo el único `<nav>` y `ScHeader` el único `banner`, así que el árbol de accesibilidad no cambia.

## 5. Coreografía

Los dos sentidos usan las mismas propiedades pero **distinta escalonadura**, que es lo que los hace distinguibles sin JS extra: la declaración base define el sentido "pegarse" y el bloque `[data-scrolled="true"]` define el sentido "despegarse".

**Despegar (bajar, `false → true`)**

| Capa | Propiedad | De → a | Duración / curva | Retardo |
| --- | --- | --- | --- | --- |
| `ScHeader` | `padding-inline` | `0` → `var(--nav-gap)` | `base` (200ms) / `standard` | 0 |
| `ScBar` | `max-width` | `100vw` → `grid.navMax` (1280px) | `slow` (320ms) / `overshoot` | 0 |
| `ScBar` | `margin-top` | `0` → `var(--nav-gap)` | `base` / `emphasized` | `fast` (100ms) — despega después de encoger |
| `ScSurface` | `opacity` | `0` → `1` | `base` / `standard` | 0 |
| `ScSurface` | `border-radius` | `0` → `radius.xl` (16px) | `base` / `standard` | 0 |
| `ScSurface` | `transform` | `@keyframes peelOff`: `scaleY 1 → 1.06 → 0.98 → 1`, con `scaleX` en contrafase (`1 → 0.996 → 1.003 → 1`) | `NAV_DETACH_ANIM_MS` (480ms) / `standard` | 0 |

Lectura: la banda se estrecha con un tirón que sobrepasa el destino y vuelve, la superficie se estira hacia abajo como material pegajoso que cede, y solo entonces la píldora sube a su separación de 8px.

**Pegar (subir hasta el tope, `true → false`)**

| Capa | Propiedad | De → a | Duración / curva | Retardo |
| --- | --- | --- | --- | --- |
| `ScBar` | `margin-top` | `var(--nav-gap)` → `0` | `fast` (100ms) / `accelerate` | 0 — cae primero |
| `ScBar` | `max-width` | `grid.navMax` → `100vw` | `slow` / `emphasized` | `fast` (100ms) |
| `ScHeader` | `padding-inline` | `var(--nav-gap)` → `0` | `base` / `standard` | 0 |
| `ScSurface` | `opacity` / `border-radius` | `1` → `0` / 16px → `0` | `base` / `standard` | 0 |
| `ScSurface` | `transform` | `@keyframes stickOn`: `scaleY 1 → 0.93 → 1.03 → 1`, `scaleX` en contrafase | `NAV_DETACH_ANIM_MS` / `standard` | 0 |

La asimetría entre los dos sentidos es deliberada y es lo que los hace distinguibles sin JS adicional: al despegar manda el sobrepaso de `overshoot` sobre el ancho y el estiramiento de la superficie; al pegar, la píldora **cae primero** (`margin-top` sin retardo y con `accelerate`) y el ancho la sigue con 100ms de retraso, mientras la superficie se aplasta contra el borde.

Lectura: la píldora cae contra el borde superior, se aplasta en el impacto y se derrama a lo ancho — el orden inverso del despegue, que es lo que da la sensación de slime volviendo a su sitio.

**`prefers-reduced-motion: reduce`**: las `@keyframes` se declaran **únicamente** dentro de `@media (prefers-reduced-motion: no-preference)` (mismo patrón que el pulso de `Story`), así que bajo `reduce` no existen — no hay nada que anular. Las `transition` de `ScBar`/`ScSurface` se anulan con `transition: none` en el bloque `reduce` del propio componente, además del colapso global de duraciones de `GlobalStyles`. El resultado bajo `reduce` es un salto instantáneo entre los dos estados, no una animación lenta.

## 6. Accesibilidad

- Ningún cambio de roles, orden de tabulación ni nombres accesibles: `banner` → `navigation` → mismos controles.
- `ScSurface` es `aria-hidden="true"` y no recibe foco (sin `tabindex`).
- La animación no oculta ni desplaza los objetivos de clic: `ScNav` no se deforma (D1), solo se estrecha su contenedor.
- El anillo de foco global sigue aplicando; el radio de la píldora no recorta ningún control (`ScNav` no desborda `ScBar`).

## 7. Tokens y estilos

- Nuevos: `grid.navMax = "1280px"` (D7), `motion.easing.overshoot` (D8), variable CSS `--nav-gap: 0.5rem` (D6).
- Reutilizados sin cambios: `radius.xl` (16px), `elevation[2]`, `glass.*`, `zIndex.stickyNav`, `motion.duration.{fast,base,slow,slower}`, `space[4]`/`space[6]` (padding interno de `ScNav`), `--nav-height`.
    - **Enmienda 2026-09-03 (ola L, crítica #16):** el relleno interno de `ScNav` ya no es la tabla `space[4]`/`space[6]` por breakpoint. Craft midió que la marca nunca coincidía con el raíl de contenido (1920: 352 frente a 384; 1600: 192/224; 1280: 40/64; 1100: 40/24, con cambio de signo), así que `ScNav` resuelve ahora su `padding-inline` contra `grid.containerMax` + `space[5]`, los mismos tokens de Features, Contacto y el pie, en los dos estados de la barra. La píldora (`grid.navMax`, D7) no cambia. Commit `2c406fa`.
- Cero literales de color, tamaño o duración en el componente salvo los porcentajes/factores de las `@keyframes`, que son la forma de la curva, no medidas del sistema.

## 8. i18n

Sin cambios: esta entrega no crea, borra ni renombra ninguna clave. Paridad es/en intacta por construcción.

## 9. Tests (Vitest + Testing Library, sin snapshots)

- `src/hooks/useNavDetach.test.tsx` (nuevo): arranca en `idle`; un cruce `false → true` da `detaching` y vuelve a `idle` tras `NAV_DETACH_ANIM_MS`; `true → false` da `attaching`; **abrir la página ya scrolleada NO produce fase** (D5); el temporizador se limpia al desmontar; `NAV_DETACH_ANIM_MS` coincide con `motion.duration.slower` (D10).
- `src/components/layout/Navbar/Navbar.test.tsx` (extendido): el `banner` expone `data-detach="idle"` al montar y pasa a `detaching`/`attaching` con el scroll; existe exactamente una superficie `[data-nav-surface]`, con `aria-hidden="true"`; con scroll, `ScBar` computa `max-width` igual a `basicLightTheme.grid.navMax` y la superficie computa `border-radius` igual a `radius.xl` (aserciones contra el token importado, nunca contra un literal — lección 2026-07-25); las `@keyframes` viven dentro de `@media (prefers-reduced-motion: no-preference)` (verificado por el TEXTO del CSS inyectado, patrón `allCssRules()` ya presente en el archivo). Los 17 tests actuales del archivo siguen pasando sin modificarse.
- `src/theme/tokens/system.test.ts` (actualizado): añade `navMax` al `expectedGrid`, sube `toHaveLength(5)` → `6`, añade `overshoot` a `expectedEasing` y sube `Object.keys(motion.easing)` de 4 → 5, más una aserción de valor por clave nueva. Sin relajar ninguna aserción.
- No se escriben tests contra `GlobalStyles`: `createGlobalStyle` no inyecta nada bajo jsdom (lección 2026-07-25). `--nav-gap` y el `scroll-margin-top` se verifican en navegador.

## 10. Ficheros afectados

| Fichero | Acción |
| --- | --- |
| `src/theme/tokens/grid.ts` | añade `navMax` |
| `src/theme/tokens/motion.ts` | añade `easing.overshoot` |
| `src/theme/tokens/system.test.ts` | actualiza los dos contratos cerrados |
| `src/theme/GlobalStyles.tsx` | añade `--nav-gap`; `scroll-margin-top` pasa a `calc(var(--nav-height) + var(--nav-gap))` |
| `src/hooks/useNavDetach.ts` | nuevo (hook + `NAV_DETACH_ANIM_MS`) |
| `src/hooks/useNavDetach.test.tsx` | nuevo |
| `src/components/layout/Navbar/Navbar.tsx` | reestructura en `ScHeader`/`ScBar`/`ScSurface`; coreografía |
| `src/components/layout/Navbar/Navbar.test.tsx` | extiende |

`useScrolled.ts` no se toca: `useNavDetach` lo consume.

## 11. No-objetivos (YAGNI)

Ocultar la barra al bajar; alto compacto al scrollear; menú móvil; cambio de contenido, enlaces o i18n; arreglar el fallo preexistente de `home-page.flujo.test.tsx`; arreglar `check-spelling`; formatear `graphify-out/**`.

## 12. Riesgos y cómo se cierran

| Riesgo | Cierre |
| --- | --- |
| `backdrop-filter` declarado permanentemente sobre una capa con `opacity: 0` podría pintar en algún motor | Verificación en navegador real de los cuatro estados (tema × scroll). Si apareciera, se conmuta el filtro con el estado en vez de dejarlo fijo. |
| Animar `max-width`/`padding-inline` produce jank | Medición en navegador durante la transición; el alcance del reflow está acotado por `position: fixed` (D2). |
| El sobrepaso de `overshoot` sobre `max-width` podría "pasarse" del borde en el sentido de pegarse | En ese sentido la curva es `emphasized` (monótona), no `overshoot` (§5). Al despegar, el sobrepaso ocurre por debajo de 1280px (la píldora se encoge un pelo de más y vuelve), nunca por encima del viewport. |
| Añadir claves rompe los contratos cerrados de tokens | Se actualizan en el mismo commit, sin relajarlos (lección 2026-07-25). |

## 13. Definition of Done

- [ ] `pnpm test` completo: 0 fallos nuevos respecto al baseline (495 verdes + el fallo preexistente de `home-page.flujo.test.tsx`).
- [ ] `pnpm typecheck` y `pnpm lint` limpios; `pnpm check-format` sin diferencias nuevas fuera de `graphify-out/**`.
- [ ] Verificación en navegador real: despegue y pegado en los dos sentidos, 1280px centrados, 8px de separación, 16px de radio, cristal, sombra; los cuatro estados tema × scroll sin regresión de color; `prefers-reduced-motion` emulado = salto instantáneo sin animación; sin errores de consola.
- [ ] `graphify update .`.
- [ ] Registro en el vault (`01-Projects/vti.md` + esta spec referenciada) y lección nueva en `task/lessons.md` si aparece alguna.
- [ ] Árbol de trabajo limpio, commits temáticos en español.

## 14. Addendum (2026-07-31, tras la entrega) — retirada de `EyeCornerMark`

Al ver la barra ya despegada, el usuario pidió eliminar "el elemento que se ve cuando se hace scroll": `EyeCornerMark`, un punto decorativo de 1rem (degradado radial azul→violeta, `oklch` literal como excepción sancionada de marca) que vivía dentro de `ScBrandLink` y pasaba de `opacity: 0` a `1` con `data-scrolled`.

Se retira el uso **y el componente entero** (`src/components/eye/EyeCornerMark.tsx` + su test): el `Navbar` era su único consumidor en todo el repo, verificado por búsqueda global, así que dejarlo habría sido código muerto — mismo criterio que ya se aplicó al retirar `useScrollProgress` cuando `Story` dejó de usarlo (D4 de la spec del 2026-07-28).

El test de integración que ataba la marca al estado de scroll se **sustituye**, no se borra: pasa a aseverar que **no queda ningún elemento que se revele con el scroll** dentro del enlace de marca (`[data-visible]` a cero en todo el árbol tras cruzar el umbral). Así, el contrato que antes protegía "la marca sigue al scroll" ahora protege "el único cambio visual al cruzar el umbral es la propia píldora".

`useScrolled` no se toca: sigue alimentando `data-scrolled` y, a través de `useNavDetach`, toda la geometría de la píldora.
