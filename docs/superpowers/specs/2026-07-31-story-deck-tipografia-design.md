# Spec — Story (oscuro): escala tipográfica de la presentación y texto de inspiración

**Fecha:** 2026-07-31 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `da935d5`

**Encargo del usuario (literal):**

> - H2, font-size 4rem para pantallas grandes haciendo reposive a mobil.
> - Pillar title, font-size 3rem para pantallas grandes haciendo reposive a mobil.
> - Pillar subtitle, font-size 1rem y coger el texto actual de body.
> - Pillar body, generar un nuevo texto de inspiracion de 4 lineas por cada Pillar. font-size: 1.115rem. para pantallas grandes haciendo reposive a mobil. Estilo: texto body: text-wrap-style: balance.
> - Nota final, font-size 8rem para pantallas grandes haciendo reposive a mobil. La palabra "new beginning" darle estilo igual que el titulo "ToInfinite" del H1 del **Hero**. Estilo: text-wrap-style: balance.

---

## 1. Estado actual (medido)

- La presentación oscura de Story son 6 diapositivas: intro (kicker + `h2#story-title` + body), 4 pilares (`01 —`…`04 —` + `title` + `body`) y la nota de cierre.
- La tipografía sale hoy de `Typography` con sus variantes (`h2`, `h5`, `bodySm`): tamaños heredados del layout de LISTA de la rama clara, no calibrados para una diapositiva a pantalla completa.
- i18n: `Home.story.pillars.<key>.{title, body}` y `Home.story.note`. **La rama CLARA consume `pillars.<key>.body` y `note`** (`Story.test.tsx` lo ata en las líneas 98, 112, 130 y 190/215).
- El tramo "ToInfinite" del H1 del Hero se pinta con `gradientTextClip`, un bloque `css` **ya exportado** desde `BrandName.tsx` y ya compartido con los CTA del Hero. Incluye el degradado (`heroGradient`), el recorte a texto, la animación `gradientShift` bajo `no-preference`, el fallback bajo `reduce`, el fallback `@supports not (background-clip: text)` y un `text-shadow: none` que su docblock marca como **obligatorio, no cosmético**.

Baseline en este HEAD: `pnpm test` **535/535, cero fallos**; `typecheck`/`lint` limpios; `check-format` solo `graphify-out/**`.

## 2. Decisiones de alcance

| # | Decisión | Porqué |
| --- | --- | --- |
| T1 | **Solo tema oscuro.** La rama clara de Story no se toca. | Continuidad con D1 de la spec de la presentación: las diapositivas solo existen en oscuro. |
| T2 | El texto actual del pilar (`pillars.<key>.body`) **no se renombra ni se mueve**: en la diapositiva se pinta como SUBTÍTULO. El texto de inspiración entra en una clave NUEVA, `pillars.<key>.inspiration`. | El encargo dice "Pillar subtitle... coger el texto actual de body", que es exactamente lo que hace pintar `body` en el rol de subtítulo. Renombrarlo a `subtitle` obligaría a tocar la rama clara —que también lo consume— y eso está fuera del brief. La clave nueva evita el problema entero. |
| T3 | La nota se parte en `noteLead` + `noteAccent`. `note` se conserva intacta para la rama clara. | Envolver "new beginning" exige dos nodos de texto, y partir una frase traducida desde el código es frágil (el orden de las palabras cambia entre idiomas). Es el mismo patrón que la propia sección ya usa para el titular (`titleLead`/`titleAccent`), así que no introduce una convención nueva. La duplicación de la frase entre `note` y `noteLead`+`noteAccent` es deliberada y está documentada: es el precio de no tocar la rama clara. |
| T4 | Los tamaños se declaran como constantes `clamp()` en `story.layers.ts`, no como literales en los componentes ni como tokens nuevos de `type.scale`. | La regla de la casa prohíbe literales de medida en componentes; y `type.scale` es un contrato cerrado del SISTEMA, mientras que estos tamaños son de ESTA composición (4rem/3rem/8rem son medidas de cartel, no de la escala de texto del sitio). `story.layers.ts` es donde esta sección ya guarda sus propias medidas. El máximo de cada `clamp()` es exactamente el valor pedido. |
| T5 | El "responsive a móvil" se resuelve con `clamp(min, preferido-en-vw, max)`, no con `@media`. | Un `clamp` con término en `vw` escala de forma continua en todo el rango, sin saltos en los puntos de ruptura — que es lo que un cartel de 8rem necesita para no romper en cada ancho intermedio. Y evita multiplicar bloques `@media` por cada uno de los cinco tamaños. |
| T6 | Se declara `text-wrap: balance`, **no** `text-wrap-style: balance`. | El encargo nombra la propiedad de CSS Text 4, pero `text-wrap-style` es la longhand nueva y su soporte es más estrecho que el de la shorthand `text-wrap`, que ya está en Chrome 114+/Safari 17.5+/Firefox 121+. El efecto pedido —repartir las líneas de forma equilibrada— es idéntico. Se anota aquí para que la divergencia con la letra del encargo sea explícita y no un descuido. |
| T7 | "new beginning" usa el bloque `gradientTextClip` importado de `BrandName.tsx`, sin duplicar el degradado. | Es literalmente el mismo tratamiento del tramo "ToInfinite" del Hero, y ya está exportado y compartido con los CTA. Copiarlo produciría dos definiciones que pueden divergir; importarlo garantiza que la nota y el Hero recorran el mismo color en el mismo instante. Su `text-shadow: none` y sus tres redes de seguridad vienen incluidos. |
| T8 | El texto de inspiración se escribe como **cuatro frases cortas en un solo párrafo**, no como cuatro líneas literales con saltos forzados. | "4 líneas" con saltos duros se rompe en móvil (cada línea forzada vuelve a envolverse y el resultado son 7 u 8). Cuatro frases + `text-wrap: balance` + un tope de medida dan cuatro líneas en pantalla grande y degradan de forma legible al estrechar. **Es la única interpretación del encargo que he tenido que elegir; se marca aquí para que sea fácil de revertir si se quería literal.** |
| T9 | Ninguna clave i18n se borra ni se renombra. Solo se AÑADEN: `pillars.<key>.inspiration` (×4), `noteLead` y `noteAccent`, en es y en. | Paridad es/en obligatoria y atada por `locales.test.ts`. Añadir no rompe a ningún consumidor existente. |

## 3. Escala tipográfica

| Rol | Constante | Valor | Encargo |
| --- | --- | --- | --- |
| `h2` de la intro | `STORY_DECK_TITLE_SIZE` | `clamp(2rem, 6vw, 4rem)` | 4rem en grande |
| Título de pilar | `STORY_DECK_PILLAR_TITLE_SIZE` | `clamp(1.75rem, 5vw, 3rem)` | 3rem en grande |
| Subtítulo de pilar | `STORY_DECK_PILLAR_SUBTITLE_SIZE` | `1rem` | 1rem |
| Cuerpo de pilar | `STORY_DECK_PILLAR_BODY_SIZE` | `clamp(1rem, 1.4vw, 1.115rem)` | 1.115rem en grande |
| Nota de cierre | `STORY_DECK_NOTE_SIZE` | `clamp(2.5rem, 11vw, 8rem)` | 8rem en grande |

El subtítulo es el único sin `clamp`: 1rem ya es el tamaño base de lectura y encogerlo lo dejaría por debajo del mínimo cómodo.

## 4. Contenido nuevo (es/en)

`pillars.<key>.inspiration`, cuatro frases por pilar, en la voz de la marca (aprender, imaginar, jugar, compartir, practicar). `noteLead`/`noteAccent` reparten la frase que hoy vive en `note`, con el tramo destacado en `noteAccent`: "nuevo comienzo." en español y "new beginning." en inglés.

## 5. Tests

- `story.layers.test.ts` (extendido): cada constante nueva existe y su tope coincide con el valor del encargo (4rem/3rem/1rem/1.115rem/8rem), aseverado sobre la cadena `clamp` — es un contrato con el encargo, no con el navegador.
- `Story.test.tsx` (extendido): en oscuro, cada diapositiva de pilar muestra su `title`, su `body` (como subtítulo) y su `inspiration`; la diapositiva 5 muestra `noteLead` y `noteAccent`, y el tramo acentuado es un elemento propio. `getComputedStyle` del `h2`, del título de pilar y de la nota devuelve la constante importada.
- **Dos tests existentes de la rama oscura cambian de contrato y se SUSTITUYEN, no se relajan:** los que aseveraban `getByText(note)` (líneas 270 y 343 del archivo actual), porque la nota ya no es un único nodo de texto. Se cambian por la aserción equivalente sobre `noteLead`/`noteAccent`. Antes de darlos por buenos hay que verlos en rojo contra la implementación nueva sin el cambio.
- Los tests de la rama CLARA (incluidos los que usan `pillars.*.body` y `note`) **no se tocan y deben seguir verdes**: son la prueba de que T1/T2/T3 no se han filtrado al tema claro.
- `locales.test.ts` garantiza la paridad es/en de las claves nuevas sin tocarlo.

## 6. Ficheros afectados

| Fichero | Acción |
| --- | --- |
| `src/i18n/locales/es/home.json` · `.../en/home.json` | +6 claves cada uno (4 `inspiration`, `noteLead`, `noteAccent`) |
| `src/components/sections/Story/story.layers.ts` | +5 constantes de tamaño |
| `src/components/sections/Story/story.layers.test.ts` | ata las 5 al encargo |
| `src/components/sections/Story/story.deck.tsx` | estilos tipográficos de la diapositiva |
| `src/components/sections/Story/Story.tsx` | rama oscura: subtítulo, inspiración y nota partida |
| `src/components/sections/Story/Story.test.tsx` | extiende + sustituye los dos tests de la nota |

## 7. No-objetivos

Tema claro; la escala `type.scale` del sistema; el resto de secciones; la coreografía de la presentación (pin, progreso, rewind), que no se toca.

## 8. Definition of Done

- [ ] `pnpm test` sin fallos nuevos respecto al baseline (535/535).
- [ ] `typecheck`/`lint` limpios; `check-format` sin diferencias fuera de `graphify-out/**`.
- [ ] Verificación en navegador real, tema oscuro: los cinco tamaños en pantalla ancha y en móvil, el degradado animado en "new beginning" idéntico al del Hero, `text-wrap: balance` aplicado, y la rama clara sin cambios.
- [ ] `graphify update .`, registro en el vault, commits temáticos en español.
