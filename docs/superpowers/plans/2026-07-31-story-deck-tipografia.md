# Story (oscuro): escala tipográfica y texto de inspiración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Spec:** `docs/superpowers/specs/2026-07-31-story-deck-tipografia-design.md` (léela entera: las decisiones T1–T9 contienen los porqués que este plan da por sabidos).

**Goal:** dar a la presentación oscura de Story la escala tipográfica de cartel que pide el encargo (h2 4rem, título de pilar 3rem, subtítulo 1rem, cuerpo 1.115rem, nota 8rem, todos responsive), añadir un texto de inspiración por pilar y destacar "new beginning" con el mismo tratamiento que "ToInfinite" en el Hero.

## Global Constraints

- **La rama CLARA de `Story.tsx` no se toca**, ni sus tests. Es la prueba de que nada se ha filtrado.
- Ninguna clave i18n se borra ni se renombra: solo se añaden, con paridad es/en en el mismo cambio.
- Cero literales de medida en los componentes: los cinco tamaños salen de constantes de `story.layers.ts`.
- Se declara `text-wrap: balance` (no `text-wrap-style`, ver T6 de la spec).
- "new beginning" usa `gradientTextClip` **importado** de `@/components/layout/Brand/BrandName`, sin duplicar el degradado (T7).
- jsdom no evalúa `@media` ni resuelve `clamp()`: `getComputedStyle` devuelve la cadena TAL CUAL se escribió, así que se asevera contra la constante importada, nunca contra un literal.
- Baseline que no debe empeorar: `pnpm test` 535/535; `check-format` solo `graphify-out/**`.

---

## Task 1: i18n y constantes de tamaño

**Files:**

- Modify: `src/i18n/locales/es/home.json`
- Modify: `src/i18n/locales/en/home.json`
- Modify: `src/components/sections/Story/story.layers.ts`
- Modify: `src/components/sections/Story/story.layers.test.ts`

- [ ] **Step 1: claves nuevas de i18n**

En `Home.story`, **añadir sin tocar ni reordenar nada de lo existente**. Bajo cada `pillars.<key>`, junto a `title` y `body`, una clave `inspiration`. Y al nivel de `Home.story`, junto a `note` (que se queda como está), `noteLead` y `noteAccent`.

Español (`es/home.json`):

```
pillars.learn.inspiration:
"Empieza por una pregunta que te incomode. Sigue el hilo aunque no lleve donde esperabas. Lo que aprendes así no se olvida. Se queda contigo y cambia cómo miras lo siguiente."

pillars.create.inspiration:
"Una idea vaga no se defiende sola. Ponla en pie, dale forma, enséñasela a alguien. En cuanto existe fuera de tu cabeza, empieza a mejorar. Y tú con ella."

pillars.grow.inspiration:
"Nadie llega lejos explicándose solo a sí mismo. Cuenta lo que sabes, aunque te parezca poco. Alguien lo necesitaba hoy. Mañana serás tú quien lo necesite."

pillars.practice.inspiration:
"Lee menos, prueba más. Rompe algo a propósito y arréglalo. El error que entiendes vale más que el acierto que copiaste. Ahí es donde el conocimiento se vuelve tuyo."

noteLead:  "Cada idea puede ser un"
noteAccent: "nuevo comienzo."
```

Inglés (`en/home.json`):

```
pillars.learn.inspiration:
"Start with a question that unsettles you. Follow it even when it leads somewhere else. What you learn this way does not fade. It stays, and it changes how you see the next thing."

pillars.create.inspiration:
"A vague idea cannot defend itself. Build it, shape it, show it to someone. The moment it exists outside your head, it starts getting better. So do you."

pillars.grow.inspiration:
"Nobody gets far explaining things only to themselves. Say what you know, even if it feels small. Someone needed it today. Tomorrow you will be the one who needs it."

pillars.practice.inspiration:
"Read less, try more. Break something on purpose and fix it. A mistake you understand beats an answer you copied. That is where knowledge becomes yours."

noteLead:  "Every idea can become a"
noteAccent: "new beginning."
```

Copia los textos **literalmente**, con sus acentos y su puntuación. No los reescribas, no los "mejores" y no los traduzcas de nuevo: son copia de marca ya aprobada en el plan.

- [ ] **Step 2: constantes de tamaño en `story.layers.ts`**

Cinco constantes nuevas, cada una con docblock en español explicando el PORQUÉ (qué rol ocupa, por qué ese mínimo, y que el máximo es el valor literal del encargo):

```ts
export const STORY_DECK_TITLE_SIZE = "clamp(2rem, 6vw, 4rem)";
export const STORY_DECK_PILLAR_TITLE_SIZE = "clamp(1.75rem, 5vw, 3rem)";
export const STORY_DECK_PILLAR_SUBTITLE_SIZE = "1rem";
export const STORY_DECK_PILLAR_BODY_SIZE = "clamp(1rem, 1.4vw, 1.115rem)";
export const STORY_DECK_NOTE_SIZE = "clamp(2.5rem, 11vw, 8rem)";
```

Documenta también por qué el subtítulo es el único sin `clamp` (1rem ya es el tamaño base de lectura; encogerlo lo dejaría por debajo del mínimo cómodo) y por qué se usa `clamp` con término en `vw` en vez de `@media` (escala continua, sin saltos en los puntos de ruptura, y evita multiplicar bloques de media por cada tamaño).

- [ ] **Step 3: atar las constantes al encargo en `story.layers.test.ts`**

Añadir un `describe` que asevere, para cada constante, que su TOPE es el valor pedido por el encargo (`4rem`, `3rem`, `1rem`, `1.115rem`, `8rem`). Es un contrato con el encargo del usuario, no con el navegador: si alguien cambia un tope, el test lo señala. Comenta esa intención en el archivo.

- [ ] **Step 4: verificar**

```bash
pnpm vitest run src/components/sections/Story src/i18n
pnpm typecheck
pnpm lint
```

`locales.test.ts` (en `src/i18n`) valida la paridad es/en: si una clave falta en un idioma, ahí saltará.

---

## Task 2: la diapositiva

**Depende de:** Task 1.

**Files:**

- Modify: `src/components/sections/Story/story.deck.tsx`
- Modify: `src/components/sections/Story/Story.tsx` (SOLO rama oscura)
- Modify: `src/components/sections/Story/Story.test.tsx`

- [ ] **Step 1: tests primero, en ROJO** — en el `describe` de la presentación (tema oscuro), sin tocar ninguno de los tests de la rama clara:

- cada diapositiva de pilar (1–4) muestra su `title`, su `body` y su `inspiration`;
- la diapositiva 5 muestra `noteLead` y `noteAccent`, y `noteAccent` está en un elemento propio (no en el mismo nodo de texto que `noteLead`);
- `getComputedStyle` del `h2#story-title` devuelve `STORY_DECK_TITLE_SIZE`; el título de pilar, `STORY_DECK_PILLAR_TITLE_SIZE`; la nota, `STORY_DECK_NOTE_SIZE` (contra la constante IMPORTADA);
- el CSS inyectado declara `text-wrap: balance` en el cuerpo de pilar y en la nota (por TEXTO del CSS, jsdom no lo computa de forma fiable).

**Y sustituye los dos tests existentes de la rama oscura que aseveraban `getByText(esHome.Home.story.note)`** (hoy en las líneas ~270 y ~343): la nota ya no es un único nodo de texto. Cámbialos por la aserción equivalente sobre `noteLead`/`noteAccent`. **Antes de darlos por buenos, ejecútalos contra la implementación NUEVA sin el cambio y comprueba que fallan** — si pasaran en verde sin tocar nada, no estarían atando lo que dicen atar.

- [ ] **Step 2: implementar**

En `story.deck.tsx`, los styled de la diapositiva: título, título de pilar, subtítulo de pilar, cuerpo de pilar y nota, cada uno con su constante de tamaño. `text-wrap: balance` en el cuerpo de pilar y en la nota. La nota además necesita un `line-height` ajustado: a 8rem el interlineado por defecto del tema abre demasiado.

En `Story.tsx`, rama oscura:

- la diapositiva de pilar pasa a tres piezas: `title` (grande), `body` en el rol de SUBTÍTULO, e `inspiration` como cuerpo;
- la diapositiva 5 renderiza `noteLead` + un tramo `noteAccent` envuelto en un `span` con `gradientTextClip` importado de `@/components/layout/Brand/BrandName`.

Conserva intactos: el `h2#story-title` como único h2, la numeración `01 —`…`04 —` con su `pillarColor`, los `data-slide-index`/`data-state`, y todo lo de la rama clara.

- [ ] **Step 3: verificar**

```bash
pnpm vitest run src/components/sections/Story
pnpm typecheck && pnpm lint
```

---

## Task 3: gate, navegador y cierre

**La ejecuta el hilo principal (revisor), no un subagente.**

- [ ] `pnpm test` completo sin fallos nuevos (baseline 535/535) y `pnpm check`.
- [ ] Navegador real, tema oscuro: los cinco tamaños medidos en pantalla ancha Y en móvil; el degradado de "new beginning" idéntico al del Hero; `text-wrap: balance` aplicado; rama clara sin cambios.
- [ ] `graphify update .`, commits temáticos, registro en el vault.
