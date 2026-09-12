# Story — el statement pasa de presentación anclada a reveal por observador (2026-08-07)

**Rama:** `feature/general-refactoring` · **Sección:** `Story` (rama CLARA) · **Ficheros en alcance:** `src/components/sections/Story/Story.tsx`, `src/components/sections/Story/Story.test.tsx`

**Encargo del usuario (verbatim, 2026-08-07).** Orquestar con Opus como planificador, revisor y documentador y Sonnet como agentes de implementación; mejorar la presentación y las microanimaciones del **tema claro**. Resultado pedido en la sección **Story**:

> Animación quitar el scroll snap y cambiar a un scroll observer para cuando se llegue al elemento realice la acción, es decir, `ScStatementStage` al llegar se muestre el primer texto apareciendo desde la izquierda, el segundo desde el centro con opacidad y el tercero desde la derecha. Cuando se realice scroll hacia arriba, las animaciones se realiza a la inversa.

**Spec anterior de esta pieza:** `2026-08-06-story-features-tema-claro-design.md` (D12: el statement a pantalla completa; D13: el statement se recorre con el scroll vía `useSlideDeck`). Esta entrega **revierte el mecanismo de D13** y conserva D12 (composición, tipografía, marcado, contenido i18n).

---

## 1. Estado actual medido (lectura de código, 2026-08-07)

`StoryLight` (`Story.tsx`) monta hoy, para el statement:

| Pieza | Qué es hoy | Origen |
| --- | --- | --- |
| `ScStatementTrack` | `<section id="statement">` con `height: calc((3 + 1) * 100dvh)` = **400dvh** de pista de scroll | D13 |
| `ScStatementStage` | `position: sticky; top: 0; height: 100dvh` — el **pin** que retiene la frase mientras la pista pasa por debajo | D13 |
| `useSlideDeck(trackRef, stageRef, 3, { tailScreens: 1, cssVarPrefix: "statement" })` | motor de progreso por scroll; publica `index` 0..2 | D13 |
| `data-visible={statementIndex >= i}` | atributo POR LÍNEA, calculado en el JSX | D13 |
| `ScStatementFirst/Second/Third` | `translateX(-16%)` / `scale(0.9)` / `translateX(16%)`, con `&[data-visible="true"]` reseteando a `opacity: 1; transform: none` | D12 + D13 |

Nota terminológica que importa para no arreglar lo que no está roto: **el bloque no declara hoy `scroll-snap-type` ni `scroll-snap-align`** — se retiraron del repo el 2026-07-31 (ver `GlobalStyles.tsx:77` y `story.deck.tsx:534`), y `Story.test.tsx` D13.1 ya fija esa ausencia. Lo que el encargo llama "scroll snap" es el **efecto** que hoy produce el par pista + pin: el scroll queda retenido 400dvh mientras la frase se descubre paso a paso. **Eso** es lo que se retira.

---

## 2. Decisiones

### D1 — El statement deja de ser una presentación de scroll

Se retiran de `StoryLight`:

- la llamada a `useSlideDeck` y sus dos refs (`statementTrackRef`, `statementStageRef`),
- las constantes que solo existían para dar geometría a esa pista: `STORY_STATEMENT_LINES`, `STORY_STATEMENT_TAIL_SCREENS`, `STORY_STATEMENT_SCREEN_HEIGHT`, `STORY_STATEMENT_TRACK_HEIGHT`.

`useSlideDeck` **no se toca**: la rama OSCURA (`StoryDeckDark`) lo sigue consumiendo con `cssVarPrefix: "story"`, y el hook es compartido con Journey. Se borra el **consumo**, no el motor.

Las constantes muertas se **borran**, no se dejan exportadas: mismo criterio que ya aplicó D13 al retirar los tres retardos de la cascada («una constante huérfana es justo lo que alguien reintroduce por costumbre»).

### D2 — Pista y stage se funden en un solo bloque en flujo

`ScStatementTrack` + `ScStatementStage` desaparecen y vuelven a ser **un único** `ScStatement` = `<section id="statement">`, que es exactamente la forma que la pieza tenía en D12, antes de que D13 la partiera en dos para poder anclarla.

Geometría del bloque:

- `min-height: 100dvh` — **no** `height`. El cartel conserva la presencia a pantalla completa que el usuario aprobó en D12, pero deja de imponer una altura fija: si la frase creciera (traducción más larga, tipografía mayor), el bloque crece con ella en vez de recortarla.
- `display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;` y el `padding` `space[8] space[6]` — heredados tal cual del actual `ScStatementStage`.
- **Sin** `position: sticky`, **sin** `top`, **sin** altura de varias pantallas. El documento pierde las ~300dvh de pista que D13 añadía: el resto de la página sube, y no hay nada más que ajustar porque ninguna otra pieza mide contra `#statement` (verificado por grep: la única mención fuera de `Story.tsx`/`Story.test.tsx` es un comentario en `HomeSections.test.tsx:52`).

`dvh`, no `vh`, por el mismo motivo que el resto del fichero: una `vh` fija no descuenta la barra de dirección móvil.

### D3 — El disparo es un `IntersectionObserver`, y es de ida y vuelta

`useReveal<HTMLParagraphElement>({ once: false })`, montado sobre **el párrafo** (`ScStatementText`), no sobre la sección.

Dos decisiones dentro de esta, las dos con motivo:

1. **`once: false`** es lo que entrega literalmente el requisito «cuando se realice scroll hacia arriba, las animaciones se realiza a la inversa»: `useReveal` con `once: false` pone `revealed` a `false` cuando el nodo deja de intersecar, y el CSS vuelve solo a su estado base (`opacity: 0` + el `transform` de entrada de cada línea). El `once: true` por defecto haría el efecto irreversible — es justo el defecto que D13 citaba como imposible de cumplir.
2. **Se observa el párrafo, no la sección.** `useReveal` usa `threshold: 0.2`: sobre una sección de `min-height: 100dvh` eso dispara cuando aún hay un 80% de bloque vacío por delante y el texto todavía no está en pantalla — el usuario vería la animación ya terminada al llegar. El párrafo ES el texto, así que su intersección al 20% coincide con «se llegó al elemento». El `rootMargin: "0px 0px -12% 0px"` por defecto de `useReveal` (D7 de la spec de navegación fluida) se conserva sin tocar.

`useReveal` devuelve una **callback-ref**, no una `RefObject` — es lo que ya consumen los otros 5 puntos del repo, y no requiere identidad estable (a diferencia de `useSlideDeck`/ `useSectionProgress`, que escriben en el elemento en cada frame). Se pasa tal cual a `ScStatementText`.

### D4 — Dirección de entrada de cada línea: verbatim del encargo, y ya implementada

| Línea | i18n | Entrada pedida | Declaración (ya existente, **no se toca**) |
| --- | --- | --- | --- |
| 1ª | `Home.story.statement.first` | «desde la izquierda» | `transform: translateX(-16%)` → `none` |
| 2ª | `Home.story.statement.second` | «desde el centro con opacidad» | `transform: scale(0.9)` → `none`, con `opacity: 0` → `1` |
| 3ª | `Home.story.statement.third` | «desde la derecha» | `transform: translateX(16%)` → `none` |

Las tres conservan `opacity: 0` de base y su transición `${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING}` (900ms / `cubic-bezier(0.22,0.61,0.36,1)`, valores del mockup). **Esta entrega no cambia ni una de estas declaraciones**: lo único que cambia es QUIÉN las dispara.

### D5 — La cascada vuelve, y su inversa es de verdad inversa

El encargo enumera las tres líneas en orden («el primero…, el segundo…, el tercero…»): entran **escalonadas**, no las tres a la vez. Se restauran los tres retardos que D13 borró, con los valores del mockup:

```
STORY_STATEMENT_DELAY_FIRST_MS  = 0
STORY_STATEMENT_DELAY_SECOND_MS = 220
STORY_STATEMENT_DELAY_THIRD_MS  = 440
```

La parte que **no** es una simple restauración: al salir, el escalonado se **invierte**. Se declara en CSS puro aprovechando que `transition-delay` se toma del estado AL QUE se transita:

- regla **base** del elemento (estado oculto, el que gana cuando `data-revealed` vuelve a `false`) → retardo INVERSO: 1ª línea `440ms`, 2ª `220ms`, 3ª `0ms`. Al retroceder, la frase se deshace empezando por la derecha.
- regla `[data-revealed="true"] &` (estado visible) → retardo DIRECTO: 0 / 220 / 440ms.

En el montaje, la regla base ya lleva su retardo pero no hay transición que correr (es el estilo inicial, no un cambio) — no produce ningún efecto observable.

El selector es **descendiente** (`[data-revealed="true"] &`), NO `&[data-revealed="true"]`: el atributo vive en el párrafo, que es el PADRE de las tres líneas. Es la lección §5.1 del manual global (git `63c7fa9`) y el mismo patrón que ya usan `ScTitle`/`ScBody`/`ScPillarCardItem` en este mismo fichero. Sustituye al `&[data-visible="true"]` de D13, que evaluaba el estado sobre el propio elemento porque el atributo lo escribía el JSX línea a línea.

Con ello, `data-visible` desaparece del JSX: ya no hay tres atributos calculados, hay uno solo (`data-revealed`) sobre el párrafo — el mismo mecanismo que gobierna la rejilla de pilares unas líneas más arriba, en este mismo componente.

### D6 — `prefers-reduced-motion: reduce`

Se conserva el guard de las tres líneas (`transition: none; opacity: 1; transform: none`) y se le **añade `transition-delay: 0ms`**, que D13 había podido retirar porque no había retardos que anular. Sin él, un usuario con `reduce` vería la primera línea con 440ms de retardo colgando de una transición que ya no existe — inofensivo en la práctica, pero es exactamente la clase de resto que el guard existe para barrer, y el resto del fichero (`ScTitle`, `ScBody`, `ScEyebrowRow`, `ScPillarCardItem`) ya lo declara así.

La pareja pista/stage ya no existe, así que **desaparecen** sus guards de `reduce` (`height: auto` en la pista, `position: static` en el stage): sin pin ni pista, no hay nada que degradar. `min-height: 100dvh` no es movimiento y se conserva bajo `reduce`.

### D7 — Invariante conservado: nada de `scroll-snap`

Ninguna regla que inyecte este bloque puede declarar `scroll-snap-type` ni `scroll-snap-align` (regresión medida y retirada el 2026-07-31). El test D13.1 se conserva, actualizado a los elementos nuevos, y ahora fija ADEMÁS que el bloque no declara `position: sticky` — el efecto que el encargo pide retirar.

### D8 — Alcance cerrado

Se tocan **dos ficheros**: `Story.tsx` y `Story.test.tsx`. No se toca `useReveal`, `useSlideDeck`, `useSectionProgress`, `story.deck.tsx`, `story.layers.ts`, i18n, tokens, ni la rama OSCURA. El `useSectionProgress` de `StoryLight` (desplazamiento de la figura) se queda intacto: es otra pieza, con su propio prefijo `--story-*`.

---

## 3. Definition of Done

1. `pnpm test` completo en verde (no solo `Story.test.tsx`), con salida literal en el informe.
2. `pnpm check` (typecheck + lint + formato) sin errores nuevos, con salida literal.
3. Verificación en navegador real (la hace Opus, los subagentes no tienen navegador):
    - la página ya no retiene el scroll en `#statement`;
    - al llegar, las tres líneas entran escalonadas y desde sus tres direcciones;
    - al retroceder, se deshacen en orden inverso;
    - `#statement` no declara `position: sticky` en el CSSOM real.
4. `graphify update .`.
5. Registro en el vault (`vibe-ai-vault`) según la regla 10, y `task/todo.md` + `task/lessons.md` actualizados.
