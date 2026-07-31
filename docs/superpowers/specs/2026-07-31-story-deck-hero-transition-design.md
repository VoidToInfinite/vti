# Spec — Story como presentación de 6 diapositivas + transición Hero→Story

**Fecha:** 2026-07-31 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `bc9015c`

**Encargo del usuario (literal):**

> - scroll: al hacer scroll desde la seccion **Hero** hasta la seccion **Story**, animar como si pasase a una presentacion. Cuando se sale de la seccion **Story** y se vuelve a la seccion **Hero**, se vea una animacion estilo "rewind".
> - seccion **Story**: convertir la seccion en 6 diapositivas (1 titulo y introduccion + (1 por cada punto de la seccion) + texto nota final) manteniendo la vista del usuario atada (posible scroll-snap o carousell) pasando por las 6 diapositivas ocupando el ancho y alto de la vista del dispositivo. La imagen del parallax debe ocupar el ancho y alto de la pantalla del dispositivo y el contenido debe estar a un maximo de 1280px de ancho. Estilo: experiencia visual. Background-color: secundary[1100].

---

## 1. Estado actual (medido, no de memoria)

- `Story.tsx` tiene dos ramas por `themeName`. La **clara** (grid figura + contenido) queda intacta en esta entrega. La **oscura** es hoy una caja de `STORY_DARK_MAX_WIDTH` (1280px) × `STORY_DARK_HEIGHT` (90dvh), centrada, con `StoryCosmicHeart` de fondo absoluto y una única columna de contenido a ancho `grid.prose`: kicker + h2 + body + 4 pilares + nota, todo junto en una sola pantalla.
- Los 4 puntos de la sección son los pilares `learn` / `create` / `grow` / `practice` (`Home.story.pillars.*`), numerados `01 —` … `04 —` por el componente, no por i18n. **1 intro + 4 pilares + 1 nota = exactamente las 6 diapositivas del encargo**: no hay ambigüedad de conteo ni claves i18n nuevas que crear.
- `StoryCosmicHeart` son 8 capas WebP con blending **aditivo** sobre `STORY_COSMIC_HEART_VOID = "#05030f"`, animadas por `useSceneParallax` (puntero + scroll + deriva en reposo, rAF escribiendo `transform` capa a capa).
- `useSceneParallax` normaliza el scroll como `clamp(-rect.top / window.innerHeight, -1, 1)` sobre el **ref que se le pasa**.
- **En todo el repo no existe ni un solo uso de `scroll-snap` ni de `position: sticky`** (verificado por búsqueda global). Las dos técnicas de esta entrega son terreno nuevo aquí: se verifican en navegador, no se dan por supuestas.
- `Hero` es `min-height: 100vh/100dvh` y cierra por abajo con `ScHeroFoot`, un degradado hacia `EYE_SURFACE` (tema oscuro). No hay hoy ninguna animación ligada al scroll entre Hero y Story: la continuidad es un velo estático.
- `useStage()` (fases `backdrop → chrome → settled`) es **terminal** y solo cubre la coreografía de CARGA. No sirve para esta transición, que es reversible y ligada al scroll: se necesita maquinaria propia.

Baseline de calidad en este HEAD: `typecheck` y `lint` limpios; `check-format` falla solo en `graphify-out/**`; `pnpm test` = 509 verdes + **1 fallo preexistente** en `app/home-page.flujo.test.tsx` (timeout), ajeno a Story; `check-spelling` roto de antes. Ninguno se corrige aquí.

## 2. Objetivo

En **tema oscuro**, Story deja de ser una pantalla y pasa a ser una **presentación de 6 diapositivas a pantalla completa**. Al bajar desde el Hero, la escena "se abre" como quien pasa a modo presentación; al subir de vuelta, la misma transición se reproduce hacia atrás con carácter de **rewind**. Mientras se recorre la presentación, la vista queda atada: la escena se fija en pantalla y el scroll avanza las diapositivas.

## 3. Decisiones de alcance

| # | Decisión | Porqué |
| --- | --- | --- |
| D1 | **Todo el encargo se implementa SOLO en tema oscuro.** La rama clara de `Story` no se toca. | El punto 2 del encargo es explícitamente oscuro, y las 6 diapositivas solo existen ahí. Una transición "de presentación" que desembocara en una Story clara que NO es presentación quedaría descolgada. Si se quiere también en claro es una entrega aditiva posterior. **Supuesto declarado, no consultado** — el usuario pidió no pausar salvo por datos que solo él pueda dar. |
| D2 | La técnica es **pin por `position: sticky` sobre una pista alta** (`track` de `6 × 100dvh` con un `stage` pegajoso de `100dvh`), NO un contenedor de scroll anidado con `overflow-y: scroll`. | Un contenedor anidado con su propio scroll crea el clásico atrapamiento de rueda (la página deja de avanzar hasta agotar el interior) y obliga a secuestrar eventos. El pin no secuestra nada: el usuario sigue haciendo scroll de página normal, y la escena permanece en pantalla porque está pegada. Además da gratis un progreso continuo `0..1` que es **reversible por construcción** — que es justo lo que el "rewind" del encargo necesita. |
| D3 | El **snap** se añade como `scroll-snap-align: start` en 6 anclas dentro de Story + `scroll-snap-type: y proximity` en `html`. `proximity`, nunca `mandatory`. | Es la única forma de tener snap sin contenedor anidado. Con `proximity`, los elementos SIN `scroll-snap-align` (todo el resto de la página) quedan intactos, y el usuario puede parar entre diapositivas si quiere. `mandatory` en el scroller raíz secuestraría la página entera. **Riesgo asumido:** es la primera vez que este repo usa snap; si en navegador real interfiere con el `scroll-behavior: smooth` global o con los saltos a anclas del navbar, **se retira el snap y se queda solo el pin**, que por sí solo ya cumple "la vista del usuario atada" (§12). |
| D4 | El progreso lo calcula un hook nuevo `useStoryDeck(trackRef)` que escribe variables CSS (`--story-enter`, `--story-progress`) por rAF sobre el elemento, y expone por estado de React **solo** `index` (0–5) y `direction` (`forward`/`rewind`). | Mismo principio que `useSceneParallax`: cero re-renders por frame. Pero el índice y la dirección SÍ son estado de React porque se materializan como atributos `data-slide`/`data-dir`, y un atributo es lo único de toda esta coreografía que jsdom puede verificar (`@media` y animaciones no las evalúa). Cambian ~6 veces por pasada, no por frame. |
| D5 | El rAF **solo corre mientras la pista intersecta el viewport** (`IntersectionObserver` que arranca y para el bucle). | La presentación es 6 pantallas de una página de ~10: sin la guarda, el bucle correría durante toda la sesión. Mismo criterio de "no animar lo que no se ve" que ya aplica `useReveal`. |
| D6 | **Bajo `prefers-reduced-motion: reduce` la presentación se desmonta como tal**: la pista pasa a alto automático, el `stage` deja de ser pegajoso y las 6 diapositivas se apilan en flujo normal, todas visibles, sin pin, sin snap y sin rAF. | Congelar la presentación dejaría 5 de 6 diapositivas invisibles (están superpuestas): sería una pérdida de CONTENIDO, no solo de movimiento. La degradación correcta de un carrusel accesible es volver a documento. Es una regla más fuerte que "quitar la animación" y hay que escribirla como tal. |
| D7 | La escena `StoryCosmicHeart` pasa a ocupar el viewport completo: `STORY_COSMIC_HEART_SIZES` deja de declarar el tope de 1200px y pasa a `100vw`. | El encargo lo pide literalmente ("la imagen del parallax debe ocupar el ancho y alto de la pantalla"). El `sizes` actual mentiría al navegador y le haría elegir la pista pequeña en pantallas anchas. |
| D8 | **`background-color: secondary[1100]` se expresa como `theme.data.semantic.bg`, no como paso de paleta cruda.** | Medido: `secondary[1100]` es `oklch(0.22 0.093 311.928)` y `semantic.ts:63` declara `bg: color.secondary[1100]` para el tema oscuro — **son el mismo valor**. Como la presentación solo existe en oscuro (D1), usar el rol semántico da exactamente el color pedido sin saltarse la capa de tokens. |
| D9 | La escena **conserva** su `STORY_COSMIC_HEART_VOID` (`#05030f`) dentro de su grupo de blending. El `secondary[1100]` de D8 es el fondo del **stage**, no el del lienzo aditivo. | Reconciliación explícita de una tensión real: el arte de las 8 capas se calibró contra ese negro exacto (D11 de la spec del 2026-07-29); repintarlo a `oklch(0.22 …)` desviaría la suma aditiva de lo que el arte reconstruye. El color del encargo se ve donde importa —durante la apertura/cierre de la presentación, en los bordes cuando el stage está escalado, y bajo cualquier zona no cubierta por la escena—, y el lienzo calibrado se queda donde el arte lo necesita. |
| D10 | El término de **scroll** del parallax de la escena queda ~0 mientras el stage está pegado, y no se compensa tocando `useSceneParallax`. En su lugar, la profundidad la aporta un `transform` de la ENVOLTURA de la escena, gobernado por `--story-progress`. | Con el stage pegado, `rect.top` de la escena se queda en ~0 por definición, así que la fórmula del hook devuelve ~0: es el comportamiento CORRECTO (la escena no se está desplazando). `useSceneParallax` lo comparten Journey/Features/Contact: tocarlo para este caso arriesga tres regresiones a cambio de nada. Un `transform` en un envoltorio POR ENCIMA de `ScScene` es seguro: el grupo de blending es `ScScene` (que ya lleva `isolation: isolate`), así que no se aísla nada que hoy no lo esté. El puntero y la deriva siguen vivos con el stage pegado. |
| D11 | El contenido de cada diapositiva se acota a `STORY_DARK_MAX_WIDTH`, la constante que YA vale `"1280px"`, cambiándole el significado (antes acotaba la sección entera, ahora acota el contenido) y su docblock. No se crea un token nuevo. | El valor pedido ya existe con ese nombre en el archivo de la propia sección. Crear un tercer `1280px` en los tokens de tema (ya hay `grid.navMax`) sería ruido. |
| D12 | `STORY_DARK_HEIGHT` pasa de `90dvh` a `100dvh`. | El encargo pide "ocupando el ancho y alto de la vista del dispositivo". Las otras secciones oscuras siguen a 90dvh: la divergencia es deliberada y solo de Story. |
| D13 | Se añade un **raíl de progreso** de 6 marcas, decorativo (`aria-hidden`), que refleja `data-slide`. | Una presentación a pantalla completa sin ninguna señal de "por dónde voy / cuánto queda" desorienta; forma parte de "mantener la vista del usuario atada" y del "estilo: experiencia visual" del encargo. Es la única pieza de UI que el encargo no nombra explícitamente: se declara aquí para que sea trivial retirarla si no gusta. |
| D14 | Se conservan intactos: `id="story"`, `aria-labelledby="story-title"`, el ÚNICO `h2`, los 4 pilares con su numeración `01 —`…`04 —` generada por el componente, el texto de la nota, las 8 capas con sus `data-part`/`alt=""`/`srcset`, y la ausencia de `figureAlt` en oscuro. | Son contratos atados por 13 tests de `Story.test.tsx`, 2 de `StoryCosmicHeart.test.tsx` y `hero-story.integration.test.tsx` (que exige que `#story` exista y sea un `SECTION`). Ninguno se relaja: la reescritura pasa por ellos. |
| D15b | **`html, body { overflow-x: hidden }` de `GlobalStyles` pasa a `overflow-x: clip`.** No es cosmético: es condición necesaria para que D2 funcione. | `overflow-x: hidden` obliga al eje contrario a computar `auto`, lo que convierte a `html`/`body` en **contenedor de scroll** — y un `position: sticky` se pega respecto a ese contenedor, no respecto al viewport, que es exactamente el fallo por el que "sticky no pega" en la mitad de los casos reales. `overflow: clip` recorta igual pero **no** crea contenedor de scroll, así que el pin funciona y la protección contra desbordamiento horizontal se conserva. Es un cambio global de una palabra, con soporte en Chrome 90+/Firefox 81+/Safari 16+; se verifica en navegador que ninguna sección desborda en horizontal después. |
| D15c | La rama oscura de `ScStory` **pierde su `overflow: hidden`**. | Mismo motivo que D15b, un nivel más abajo: cualquier ancestro del stage con `overflow` distinto de `visible`/`clip` rompe el pin. El recorte que ese `overflow: hidden` daba (overscan del parallax) pasa al `ScStage`, que es quien debe recortar y **no** es ancestro de sí mismo. |
| D15 | Las 6 diapositivas viven **todas en el DOM** a la vez, sin `aria-hidden` en las no visibles. | Solo llevan texto, nada focalizable, así que no ensucian el orden de tabulación; y un lector de pantalla recorre la sección entera de corrido, que es mejor que exponerle una sola diapositiva. Mismo criterio que el `opacity: 0` del intro del navbar: ocultar visualmente no es ocultar semánticamente. |

## 4. Arquitectura (rama oscura de `Story`)

```
<ScStory id="story" aria-labelledby="story-title">          {/* fondo semantic.bg (= secondary[1100], D8) */}
  <ScTrack ref=trackRef>                                    {/* position: relative; height: calc(6 * 100dvh) */}
    <ScStage data-slide={0..5} data-dir="forward|rewind">   {/* position: sticky; top: 0; height: 100dvh; overflow: hidden;
                                                                 transform/radio gobernados por --story-enter */}
      <ScSceneWrap>                                          {/* transform gobernado por --story-progress (D10) */}
        <StoryCosmicHeart />                                 {/* absolute inset 0 -> llena el stage (D7) */}
      </ScSceneWrap>
      <ScDeck>                                               {/* max-width STORY_DARK_MAX_WIDTH; margin-inline auto */}
        <ScSlide data-state="past|current|next"> × 6
      </ScDeck>
      <ScRail aria-hidden="true" />                          {/* 6 marcas, D13 */}
    </ScStage>
    <ScSnapPoints aria-hidden="true">                        {/* absolute inset 0; pointer-events none */}
      <ScSnapPoint /> × 6                                    {/* height 100dvh; scroll-snap-align: start (D3) */}
    </ScSnapPoints>
  </ScTrack>
</ScStory>
```

`ScStage` es el único hijo en flujo de `ScTrack`, así que se pega desde el borde superior de la pista y permanece pegado los `5 × 100dvh` restantes. Las anclas de snap van absolutas para no alterar ese cálculo.

**Reparto de las diapositivas** (sin claves i18n nuevas):

| # | Contenido |
| --- | --- |
| 1 | `Home.story.kicker` + `h2#story-title` (`titleLead` + `titleAccent` con degradado) + `Home.story.body` |
| 2–5 | Un pilar por diapositiva: número `01 —`…`04 —` con su color de rampa + `pillars.<key>.title` + `pillars.<key>.body` |
| 6 | `Home.story.note` |

## 5. Movimiento

Tres capas de movimiento, todas gobernadas por variables CSS que escribe el rAF del hook — nunca por estado de React por frame.

**a) Apertura de la presentación (`--story-enter`, 0 → 1).** Se calcula desde que el borde superior de la pista está a un viewport de distancia hasta que toca el borde superior. El stage va de `scale(0.92)` + `border-radius: radius["2xl"]` a `scale(1)` + radio 0, y la escena de `opacity` reducida a plena. Leído: la presentación **se abre** al llegar y **se cierra** al salir. Al subir, la misma variable decrece: la reversibilidad es estructural, no una segunda animación.

**b) Avance entre diapositivas (`--story-progress`, 0 → 1 sobre el tramo pegado).** `index = round(progress × 5)`. Cada `ScSlide` se posiciona por `data-state`:

| `data-state` | opacity | transform           |
| ------------ | ------- | ------------------- |
| `past`       | 0       | `translateY(-40px)` |
| `current`    | 1       | `translateY(0)`     |
| `next`       | 0       | `translateY(40px)`  |

Solo `opacity`/`transform`: la regla de movimiento de la casa se cumple íntegra aquí (la desviación de la entrega anterior, en el navbar, no se repite en esta).

**c) Carácter de rewind (`data-dir`).** Al invertirse la dirección del scroll dentro de la presentación, `data-dir` pasa a `rewind` y el deck ejecuta una `@keyframes` corta de "scrub" (micro-desplazamiento en X + caída breve de opacidad) además de reproducir (b) hacia atrás. Sin ese detalle, "rewind" sería indistinguible de "ir hacia atrás despacio"; con él, se lee como cinta rebobinando. Declarada ÚNICAMENTE dentro de `@media (prefers-reduced-motion: no-preference)`.

**d) `prefers-reduced-motion: reduce`** → D6: documento apilado, sin pin, sin snap, sin rAF, sin `@keyframes`. No es "la misma presentación más lenta".

## 6. Accesibilidad

- Estructura semántica intacta (D14): `section#story` con `aria-labelledby` y un único `h2`.
- Las 6 diapositivas siempre en el árbol de accesibilidad (D15); ninguna es focalizable.
- El raíl (D13) es `aria-hidden`: es un reflejo del estado, no un control.
- Bajo `reduce`, el contenido completo queda legible en flujo (D6) — el caso que un carrusel mal hecho rompe.
- El pin no captura la rueda ni el teclado: el scroll de página sigue siendo el scroll de página (D2).

## 7. Tokens y constantes

- Modificadas: `STORY_DARK_HEIGHT` (`90dvh` → `100dvh`, D12), `STORY_DARK_MAX_WIDTH` (mismo valor, nuevo significado y docblock, D11), `STORY_COSMIC_HEART_SIZES` (`100vw`, D7).
- Nuevas en `story.layers.ts`: número de diapositivas, alto de la pista, amplitudes de la coreografía y duración del scrub.
- Reutilizados sin cambios: `semantic.bg` (D8), `radius["2xl"]`, la rampa de color de los pilares, `motion.duration.*` / `easing.*`.
- Sin literales de color, medida ni duración en los componentes.

## 8. i18n

Sin cambios: cero claves nuevas, cero claves perdidas. Las 6 diapositivas redistribuyen `Home.story.*` tal cual. Paridad es/en intacta por construcción.

## 9. Tests

- `useStoryDeck.test.tsx` (nuevo): índice por tramo de progreso con `getBoundingClientRect` mockeado; `direction` cambia a `rewind` al invertir el sentido y vuelve a `forward`; el rAF no arranca sin intersección (D5) y se para al salir; bajo `reduce` no se registra ningún rAF (D6); limpieza total al desmontar.
- `Story.test.tsx` (extendido, sin tocar los 13 existentes): en oscuro hay exactamente 6 diapositivas; la 1 lleva el `h2#story-title`, las 2–5 un pilar cada una en orden `01`…`04`, la 6 la nota; `data-slide` arranca en 0 y `data-dir` en `forward`; el stage acota el contenido a `STORY_DARK_MAX_WIDTH`; existe el bloque `reduce` que devuelve la pista a flujo (verificado por TEXTO del CSS inyectado — jsdom no evalúa `@media`); la `@keyframes` del scrub vive solo bajo `no-preference`.
- `storyCosmicHeart.layers.test.ts` (actualizado si cierra el valor de `SIZES`).
- Contratos existentes: los 13 de `Story.test.tsx`, los 2 de `StoryCosmicHeart.test.tsx` y `hero-story.integration.test.tsx` siguen verdes **sin modificarse**.

## 10. Ficheros afectados

| Fichero | Acción |
| --- | --- |
| `src/components/sections/Story/story.layers.ts` | constantes de la presentación (D11, D12) |
| `src/components/storyCosmicHeart/storyCosmicHeart.layers.ts` | `SIZES` a `100vw` (D7) |
| `src/components/storyCosmicHeart/storyCosmicHeart.layers.test.ts` | actualizar si cierra `SIZES` |
| `src/hooks/useStoryDeck.ts` + `.test.tsx` | nuevos (D4, D5) |
| `src/components/sections/Story/story.deck.tsx` | nuevo: los styled de pista/stage/deck/slide/raíl |
| `src/components/sections/Story/Story.tsx` | rama oscura reescrita; **rama clara intacta** |
| `src/components/sections/Story/Story.test.tsx` | extendido |
| `src/theme/GlobalStyles.tsx` | `scroll-snap-type: y proximity` en `html` (D3) |

## 11. No-objetivos (YAGNI)

Tema claro (D1); navegación por teclado entre diapositivas (el scroll de página ya la da); transición equivalente en Journey/Features/Contact; tocar `useSceneParallax`, `useStage` o el Hero más allá de lo que la transición exige; arreglar el fallo preexistente de `home-page.flujo.test.tsx`, `check-spelling` ni el formato de `graphify-out/**`.

## 12. Riesgos y cómo se cierran

| Riesgo | Cierre |
| --- | --- |
| `scroll-snap-type` en `html` interfiere con `scroll-behavior: smooth` o con los saltos a anclas del navbar | Verificación en navegador de los 4 enlaces de sección y del CTA del hero. Si interfiere: **se retira el snap**, se queda el pin (D3). |
| `position: sticky` no pega por culpa de un ancestro con `overflow` distinto de `visible` | **Ya identificados dos culpables antes de escribir una línea** (D15b, D15c): `html, body { overflow-x: hidden }` en `GlobalStyles` y el `overflow: hidden` de la rama oscura de `ScStory`. Los dos se corrigen en el mismo commit. Después, medición en navegador del `rect.top` del stage a varias alturas de scroll para confirmar que se queda clavado en 0. |
| `overflow-x: clip` no está soportado y reaparece el desbordamiento horizontal | Soporte real desde Chrome 90 / Firefox 81 / Safari 16. Se verifica en navegador que `document.documentElement.scrollWidth === clientWidth` en las anchuras de prueba. |
| 8 capas a `100vw` en pantallas grandes pesan más | Las pistas ya existen (1024/1672); solo cambia cuál elige el navegador. Se mide el peso real transferido en la pestaña de red. |
| El pin de 6 pantallas hace la página muy larga y "secuestra" la lectura | Es lo que el encargo pide ("vista atada"). El snap es `proximity`, no `mandatory`: se puede atravesar sin pararse en cada diapositiva. |
| jsdom no ve nada de esto | Todo lo verificable se materializa como ATRIBUTO (`data-slide`, `data-dir`, `data-state`); el resto se verifica por texto del CSS inyectado y, sobre todo, en navegador real. |

## 13. Definition of Done

- [ ] `pnpm test` sin fallos nuevos respecto al baseline (509 verdes + el fallo preexistente).
- [ ] `typecheck` y `lint` limpios; `check-format` sin diferencias nuevas fuera de `graphify-out/**`.
- [ ] Verificación en navegador real: apertura al bajar y cierre al subir; el stage pegado durante los 5 viewports; las 6 diapositivas en orden con su contenido; escena a ancho y alto completos; contenido acotado a 1280px; fondo `secondary[1100]`; snap (o su retirada documentada); anclas del navbar sin regresión; consola limpia.
- [ ] `graphify update .`.
- [ ] Registro en el vault + spec referenciada; lecciones nuevas en `task/lessons.md` si aparecen.
- [ ] Árbol limpio, commits temáticos en español.
