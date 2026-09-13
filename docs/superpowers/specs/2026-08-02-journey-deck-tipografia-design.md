# Spec — Journey (oscuro): escala tipográfica de cartel de la presentación

**Fecha:** 2026-08-02 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `6b706b5`

**Encargo del usuario (literal):**

> - seccion **Journey**: -- Journey deck step label: font-size: clamp(1.75rem, 10vw, 11rem);font-weight: 900; -- Journey deck step body (new called subtitle): clamp(1rem, 1.4vw, 1.115rem); -- Journey quote: font-size: clamp(2.5rem, 11vw, 8rem); font-weight: 900;

---

## 1. Estado actual (medido en el árbol, no de memoria)

`git rev-parse HEAD` = `6b706b5`, rama `feature/landing-motion-interactions`, árbol limpio y en sync con `origin`.

La presentación oscura de Journey son 8 diapositivas (spec `2026-08-02-journey-deck-8-diapositivas-design.md`): intro, seis pasos y la cita de cierre. Las tres piezas que toca este encargo, tal como están hoy:

| Pieza | Constante | Valor hoy | Peso / interlineado hoy |
| --- | --- | --- | --- |
| Etiqueta del paso | `JOURNEY_DECK_STEP_LABEL_SIZE` | `clamp(1.75rem, 5vw, 3rem)` | `type.scale.h5.weight` (600) · `h5.lineHeight` (**1.35**) |
| Cuerpo del paso | `JOURNEY_DECK_STEP_BODY_SIZE` | `clamp(1rem, 1.4vw, 1.115rem)` | `type.scale.body` |
| Cita de cierre | `JOURNEY_DECK_QUOTE_SIZE` | `clamp(1.75rem, 5.5vw, 3.5rem)` | 600 literal · `display.lineHeight` (1.03) |

Datos medidos que gobiernan las decisiones de §3:

- `type.scale` **se detiene en el peso 800** (`display`). El 900 del encargo queda fuera de la escala del sistema; ya existe precedente sancionado para exactamente esto: `STORY_DECK_NOTE_WEIGHT = 900`, con un test que ata que ningún peso del sistema lo alcanza.
- `type.scale.h5.lineHeight` vale **1.35** y `type.scale.display.lineHeight` vale **1.03** (`src/theme/tokens/type.ts`).
- Textos reales (`src/i18n/locales/es/home.json`): las seis etiquetas son de **una sola palabra**, de 4 a 10 caracteres (la más larga, "Evoluciona"). La cita mide **45 caracteres**; la nota de cierre de Story, que ya vive a `clamp(2.5rem, 11vw, 8rem)` con peso 900, mide 37 entre `noteLead` y `noteAccent`.
- El tamaño y el peso que pide el encargo para la cita son **exactamente** `STORY_DECK_NOTE_SIZE` y `STORY_DECK_NOTE_WEIGHT`.

Baseline en este HEAD: `pnpm vitest run --maxWorkers=2` → **587/587** en 57 ficheros; `typecheck` y `lint` sin errores; `check-format` sin rutas de `docs`/`src`/`task`/`app`.

## 2. Objetivo

Llevar la diapositiva de paso y la de cierre a escala de **cartel**: la etiqueta del paso pasa a ser el elemento dominante de su diapositiva, el texto que la acompaña pasa a jugar el rol de **subtítulo**, y la cita de cierre alcanza el mismo peso visual que la nota de cierre de Story.

## 3. Decisiones

| # | Decisión | Porqué |
| --- | --- | --- |
| **T1** | Solo la rama **oscura**. La clara de Journey no se toca. | El encargo nombra "Journey deck", que solo existe en oscuro. Continuidad con D1 de las tres specs anteriores de esta sección. |
| **T2** | `JOURNEY_DECK_STEP_LABEL_SIZE` pasa a `clamp(1.75rem, 10vw, 11rem)`. | Valor literal del encargo. Medido lo que implica: el 11rem solo se alcanza a partir de ~1760px de viewport (10vw = 11rem en 1760); por debajo manda el término `10vw`. Con el deck topado a 1280px, la palabra más larga ("Evoluciona", 10 caracteres) tiene que caber en el ancho útil del deck — se verifica en navegador (§7), no se supone. |
| **T3** | Nace `JOURNEY_DECK_STEP_LABEL_WEIGHT = 900`, constante propia, **no** un token. | El encargo pide 900 y `type.scale` se detiene en 800: es una excepción deliberada, no un token olvidado. Mismo tratamiento y mismo motivo que `STORY_DECK_NOTE_WEIGHT`, incluido su test: si algún día la escala del sistema incorporara un 900, este test obliga a decidir si la constante desaparece en favor del token en vez de dejar dos fuentes conviviendo en silencio. |
| **T4** | La etiqueta cambia de interlineado: de `type.scale.h5.lineHeight` (1.35) a `type.scale.display.lineHeight` (1.03). | **No es cosmético y no lo pide el encargo, pero sin ello el encargo no se ve como pide.** 1.35 es un factor _unitless_: a 11rem resuelve a ~14.9rem de caja de línea para una palabra de una sola línea, ~4rem de aire muerto que empuja el subtítulo fuera de la composición. Es el MISMO problema y la MISMA solución que la nota de Story documentó al subir a 8rem (`ScDeckNote`, `story.deck.tsx`): se reutiliza el valor ya calibrado del sistema para texto de cartel en vez de inventar un número nuevo. |
| **T5** | El cuerpo del paso pasa a llamarse **subtítulo**: `JOURNEY_DECK_STEP_BODY_SIZE` → `JOURNEY_DECK_STEP_SUBTITLE_SIZE` y `ScJourneyStepBody` → `ScJourneyStepSubtitle`. **El valor no cambia** (`clamp(1rem, 1.4vw, 1.115rem)`, idéntico al del encargo y al de hoy). | Es un renombrado de ROL, no de medida: con la etiqueta a 11rem, ese texto deja de ser "el cuerpo" de la diapositiva y pasa a ser lo que acompaña al titular. El encargo lo dice explícitamente ("new called subtitle"). Se renombra de verdad, en constante y en componente, en vez de dejar un nombre que ya no describe lo que la pieza hace. Precedente en la casa: `ScDeckPillarSubtitle`/`STORY_DECK_PILLAR_SUBTITLE_SIZE`. |
| **T6** | `JOURNEY_DECK_QUOTE_SIZE` pasa a `clamp(2.5rem, 11vw, 8rem)` y nace `JOURNEY_DECK_QUOTE_WEIGHT = 900`. | Valores literales del encargo. **Revierte D10 de la spec del 2026-08-02**, que había calibrado la cita a un tope de 3.5rem _precisamente_ para no copiar el 8rem de Story, razonando que la cita (45 caracteres) es tres veces más larga que "nuevo comienzo". El usuario decide lo contrario y su decisión manda; queda escrito que es una reversión consciente de una decisión anterior, no un olvido. |
| **T7** | Los dos valores de T6 coinciden con `STORY_DECK_NOTE_SIZE`/`STORY_DECK_NOTE_WEIGHT`, y aun así se declaran como constantes **propias** de Journey, sin importar las de Story. | Coincidir hoy no es depender. Importar las de Story ataría el cartel de una sección a los retoques de la otra — exactamente lo que D10 evitó y lo que el propio repo ya practica entre secciones. La coincidencia se documenta en el docblock; no se convierte en acoplamiento. |
| **T8** | El icono del paso (`JOURNEY_DECK_STEP_ICON_SIZE`, 48px) **no se toca**. | El encargo no lo menciona. Se observa en navegador cómo queda junto a una etiqueta de hasta 11rem y se reporta; cambiarlo por iniciativa propia sería alcance inventado. |

## 4. Riesgo declarado antes de implementar

La cita a un tope de 8rem con peso 900 dentro de un deck topado a 1280px ocupará **varias líneas**. El `stage` de la diapositiva es `overflow: hidden` y mide una pantalla, así que un desbordamiento no se ve como scroll: se ve como **texto recortado**, que es pérdida de contenido. La referencia dice que el riesgo es asumible —la nota de Story vive a ese mismo tamaño y peso con 37 caracteres frente a los 45 de aquí—, pero no se da por bueno: §7 lo mide en navegador real a `1280×720` y en un viewport ancho, y si desborda se reporta con la cifra, no se disimula.

## 5. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `src/components/sections/Journey/journey.layers.ts` | T2, T3, T5 (renombrado), T6 |
| `src/components/sections/Journey/journey.layers.test.ts` | Aserciones de las constantes nuevas y renombradas |
| `src/components/sections/Journey/journey.deck.tsx` | `ScJourneyStepLabel` (tamaño, peso, interlineado), renombrado a `ScJourneyStepSubtitle`, `ScJourneyQuote` (tamaño, peso) |
| `src/components/sections/Journey/Journey.tsx` | Import y uso del styled renombrado |
| `src/components/sections/Journey/Journey.test.tsx` | Los tests que nombran "cuerpo" del paso |

## 6. Tests

1. **Topes del encargo, atados literalmente**: `JOURNEY_DECK_STEP_LABEL_SIZE`, `JOURNEY_DECK_STEP_SUBTITLE_SIZE` y `JOURNEY_DECK_QUOTE_SIZE` valen exactamente las tres cadenas del encargo. Es un contrato con el usuario, no con el navegador: jsdom no resuelve `clamp()`, pero sí puede fijar que el tope no se mueva sin que alguien lo decida.
2. **Los dos pesos 900 están fuera de la escala del sistema**: `JOURNEY_DECK_STEP_LABEL_WEIGHT` y `JOURNEY_DECK_QUOTE_WEIGHT` valen 900 y `Math.max(...Object.values(type.scale).map(v => v.weight))` es **menor**. Réplica exacta del test que ya protege `STORY_DECK_NOTE_WEIGHT`, y con el mismo valor: obliga a tomar una decisión el día que la escala incorpore un 900.
3. **Coincidencia con Story, declarada y no acoplada** (T7): un test comprueba que el tamaño y el peso de la cita coinciden hoy con los de la nota de Story importando las dos parejas de constantes. Si un día divergen a propósito, ese test es el sitio donde se decide, no un descubrimiento a posteriori en el navegador.
4. **El renombrado es completo**: no queda ninguna referencia viva a `JOURNEY_DECK_STEP_BODY_SIZE` ni a `ScJourneyStepBody`, y la diapositiva de paso sigue mostrando el mismo texto de i18n que antes (el renombrado no puede perder contenido).
5. **No-regresión**: las 8 diapositivas, el pin, los guards de `reduce`, el encabezado único y los tests de la rama clara siguen verdes sin tocarse.

Cada aserción nueva se demuestra **falsable** rompiendo a propósito lo que protege.

## 7. Definición de "hecho"

- [x] Suite completa verde: `pnpm vitest run --maxWorkers=2` da **591/591** en 57 ficheros, frente a los 587 de la baseline de §1. Los cuatro nuevos son los dos pesos 900 contra la escala del sistema y las dos mitades de la comparación declarada con Story (T7).
- [x] `pnpm typecheck` y `pnpm lint` sin salida (exit 0). `pnpm check-format` sin rutas de `docs`/`src`/`task`/`app`.
- [x] **Medido en navegador real, en tres viewports.** El riesgo declarado en §4 **no se materializa en ninguno**: la cita nunca desborda el `stage` y las seis etiquetas caben siempre en una sola línea.

| Viewport | Etiqueta (`font-size` · líneas) | Ancho del texto más largo ("Evoluciona") vs. ancho útil | Cita (`font-size` · líneas · alto) vs. alto del `stage` |
| --- | --- | --- | --- |
| 1280 × 720 | 128px (10vw, por debajo del tope) · **1 línea** | — · útil 1120px, sin desbordar (`scrollWidth` = `clientWidth`) | 128px (11vw topado a 8rem) · 3 líneas · **395px** en un stage de **720px** |
| 1920 × 1080 | **176px** (tope de 11rem alcanzado) · **1 línea** | **878px** vs. **1120px** útiles — 242px de margen | 128px · 3 líneas · **395px** en un stage de **1080px** |
| 375 × 812 | 37.5px (10vw) · **1 línea** | 187px vs. 311px de caja | 41.25px · 3 líneas · **127px** en un stage de **812px** |

- [x] Peso y interlineado computados verificados en el navegador: etiqueta `font-weight: 900` y `line-height: 131.84px` sobre `font-size: 128px` (= el factor 1.03 de `display`, T4); cita `font-weight: 900`. Subtítulo en `17.84px` = `1.115rem`, el tope del encargo. Sin errores de consola.
- [x] Sin scroll horizontal en móvil; el alto de la diapositiva de paso queda en 236px (1280×720), 286px (1920×1080) y 166px (375×812), muy por debajo del `stage` en los tres casos.
- [x] Registro en el vault y en `task/`.

## 8. No-objetivos

- **No** se toca la rama clara de Journey, ni Story, ni el icono del paso (T8).
- **No** se crean claves i18n ni se cambia ningún texto.
- **No** se importan las constantes de Story (T7).
- **No** se corrigen los fallos de gate ajenos (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 9. Desviaciones de implementación

**El riesgo de §4 se declaró antes y se midió después; no se materializó.** La cita a 8rem con peso 900 ocupa 3 líneas y 395px en un `stage` de 720px o más: entra con holgura en los tres viewports probados. La referencia que se usó para estimarlo —la nota de cierre de Story, 37 caracteres frente a los 45 de aquí, ya viviendo a ese mismo tamaño y peso— resultó buena. Queda dicho que era una estimación hasta que se midió.

**T4 (el interlineado de la etiqueta) no lo pedía el encargo y aun así se hizo.** Sin él, el factor _unitless_ 1.35 de `h5` resolvía a ~14.9rem de caja de línea para una palabra de una sola línea a 11rem: unos 4rem de aire muerto empujando el subtítulo fuera de la composición. El encargo pide un tamaño; entregarlo con el interlineado anterior habría sido cumplir la letra y fallar el resultado. Medido ya con el cambio: 131.84px de caja sobre 128px de texto.

**T6 revierte D10 de la spec del deck, y se dice en el código, no solo aquí.** Aquella decisión había calibrado la cita a un tope de 3.5rem _precisamente_ para no copiar el 8rem de Story, razonando sobre la diferencia de longitud de los dos textos. El usuario decide lo contrario. El docblock de `JOURNEY_DECK_QUOTE_SIZE` deja escrito que es una reversión consciente para que nadie la lea como un descuido y la "corrija" de vuelta.

**El renombrado de T5 alcanzó más prosa de la que el encargo enumeraba.** Además de las dos constantes y el styled, había comentarios en `Journey.tsx` y `journey.deck.tsx` que describían la diapositiva como "icono → etiqueta → cuerpo". Se actualizaron: dejarlos habría sido dejar prosa que miente sobre el rol actual de la pieza, que es exactamente lo que el punto 4 de §6 existe para impedir.

**T8 cumplido, con una observación que no se convierte en cambio.** El icono del paso sigue en 48px, como pedía el no-objetivo. Medido junto a una etiqueta de 176px, la proporción entre los dos cambia mucho respecto a la composición anterior. No se toca —el encargo no lo menciona y cambiarlo sería alcance inventado—, pero queda anotado por si en una próxima iteración se quiere recalibrar.
