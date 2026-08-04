# Spec — Transición Features→Contacto por superposición, Contacto a sangre con formulario mínimo, y Footer oscuro «animado v2»

**Fecha:** 2026-08-03 · **Rama:** `feature/landing-motion-interactions` · **HEAD de partida:** `6c79c5f`

**Encargo del usuario (literal):**

```text
Objetivo: orquesta Opus como planeador, revisor y documentador utilizando Sonnet
como agentes/subagentes, mejorar la transicion y presentacion de la seccion
Contacto y mejorar presentacion Footer en tema oscuro.
Resultado:
- Contacto y Footer: obtener los estilos del archivo HTML.
- Contacto: los inputs de formulario debe ser solo el email y boton de accion.
  Mantener tarjetas e iconos de contacto.
Formato: entrega el contexto, specs y todo lo necesario actualizados en el vault.
Restricciones: no entreges resultados hasta que este todo correcto, verificado y
documentado cumpliendo la reglas del proyecto.
Checkpoints: pausa solo por acciones destructivas o irreversible. Pausa si
aparece un cambio del alcance fuera del brief. Pausa si necesitas un dato que
solo yo pueda dar. Si no, sigue hasta cuando termines.
```

Adjunto del encargo: `Footer animado v2.dc.html` (Downloads, 2026-08-03 21:57) + captura de la escena de Contacto.

---

## 1. Estado actual (medido en el árbol, no de memoria)

`git rev-parse HEAD` = `6c79c5ff6e2dd39f33133f983780c6612625c1c8`, rama `feature/landing-motion-interactions`, `git status --porcelain` **vacío**.

Baseline de calidad medida en este HEAD **antes de tocar nada**:

- `pnpm vitest run --maxWorkers=4` → **604 tests en 57 ficheros, todos verdes**.
- `pnpm typecheck` → exit 0, sin salida. `pnpm lint` → exit 0, sin salida.
- `pnpm check-format` → señala **solo** `graphify-out/**` (13 ficheros), ninguno de código. Fallo preexistente, fuera del alcance (§10).

Estructura vigente de las piezas que toca esta entrega:

| Pieza | Medida hoy | Fichero |
| --- | --- | --- |
| `ScFeatures` (`$fullBleed`) | `position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0,1fr); background-color: semantic.bg; margin-block-start: calc(-1 * 100dvh)`; **sin `overflow`** | `Features.tsx:140-164` |
| `ScDarkSceneSlot` (Features) | `grid-area: 1 / 1; align-self: start; position: sticky; top: 0; height: 100dvh`; `reduce` → `position: static` | `Features.tsx:512-522` |
| `ScDarkFrame` (Features) | `grid-area: 1 / 1; z-index: 1; min-height: 100dvh; max-width: 1280px; padding: space[8] space[6]; flex; align-items: center; justify-content: flex-end` | `Features.tsx:538-551` |
| `ScContact` (`$fullBleed`) | `position: relative; **overflow: hidden**; max-width: 1280px; height: 90dvh; margin-inline: auto; flex; align-items: center; justify-content: flex-end`; **sin `z-index`, sin `margin` negativo** | `Contact.tsx:54-74` |
| `CONTACT_DARK_MAX_WIDTH` / `_HEIGHT` | `"1280px"` / `"90dvh"` | `contact.layers.ts:146-147` |
| Contenido oscuro de Contact | kicker + h2 + cuerpo (2 líneas) + `ScRow` con chip de email estático y CTA `<a href={links.email}>` | `Contact.tsx:390-420, 422-451` |
| `ContactNeonGalaxy` | 7 capas, blending aditivo (`screen`/`plus-lighter`) sobre `--void #02040e`; incluye ya una capa `03-estrellas` | `contactNeonGalaxy.layers.ts:26-69`, `.parts.tsx:26-42` |
| `ScFooter` | `background-color: semantic.surfaceSunken; border-top: 1px solid semantic.border`; sin `position`, sin `z-index`, **sin reveal** | `Footer.tsx:32-35` |
| Columnas Explore/Discover del footer | montadas **solo si `isLight`** | `Footer.tsx:185-219` |
| `Footer.test.tsx` | test vigente: en oscuro esas columnas **no existen** y sus anclas tampoco | `Footer.test.tsx:49-62` |
| `Input` / `Field` | ya existen, con tokens del tema y altura 44px | `src/components/ui/Input/Input.tsx` |
| `links` | `email` (mailto real), `github`, `discord` reales; `docs/guides/privacy/terms/accessibility/playground` son `example.invalid` a propósito | `src/config/links.ts:10-22` |

**Dos premisas obsoletas detectadas al medir** (las dos se corrigen con esta entrega):

1. **El gate por tema de las columnas del footer ya no describe la página.** `Footer.tsx:20-25` justifica ocultar Explore/Discover en oscuro porque _«son anclas a las 4 secciones de tema claro … que en oscuro no existen — serían anclas muertas»_. Es falso desde la entrega que eliminó el gate por tema de `HomeSections` (`HomeSections.tsx:7-16`: _«las 4 se montan siempre»_). Medido hoy: `id="story"`, `id="journey"`, `id="features"` e `id="contact"` existen en **las dos** ramas de sus respectivas secciones (`Story.tsx:363,482`, `Journey.tsx:479,634`, `Features.tsx:621,706`, `Contact.tsx:425,455`). El footer oscuro se quedó con 2 columnas por una condición que ya no es cierta — y ese empobrecimiento **es** parte de lo que el encargo pide arreglar.
2. **`ScContact` se llama `$fullBleed` y no es a sangre.** Es la única de las 4 secciones oscuras que sigue siendo una caja centrada de `1280px × 90dvh` entre dos secciones a sangre (Features arriba, Footer abajo), y la única que no participa en la cadena de solapes Story→Journey→Features. Ese contraste de caja es el defecto de presentación que se ve hoy en la costura Features→Contacto.

## 2. Objetivo

En **tema oscuro**:

1. **Transición**: al terminar el contenido de Features, la escena «Celestial Orbital» se queda pegada una pantalla de reposo y **Contacto sube desde el borde inferior del viewport y la cubre**, exactamente igual que Features cubre a Journey y Journey a Story. La costura se marca con el **haz de luz** del mockup: una línea de 2px que se dibuja desde el centro hacia los dos lados al entrar, con un barrido periódico y un pulso central.
2. **Presentación de Contacto**: sección a sangre (ancho de viewport), escena de fondo pegada midiendo siempre una pantalla, contenido topado a 1280px en dos columnas — a la izquierda kicker/título/cuerpo y **tres tarjetas de contacto con icono**; a la derecha una **tarjeta de formulario con un único campo (correo) y un botón de acción**.
3. **Footer**: fondo casi negro del mockup, el mismo haz de luz como costura superior, campo de estrellas titilantes, y las cuatro columnas de navegación reales (Explore/Discover dejan de esconderse en oscuro).

La **rama clara no se toca** en ninguna de las tres piezas.

## 3. Decisiones de diseño

| # | Decisión | Porqué |
| --- | --- | --- |
| **D1** | Todo el encargo se implementa **solo en tema oscuro**. La rama clara de `Contact` (tarjeta pastel, anillos concéntricos, figura que saluda, chip+CTA) y la del `Footer` (fondo `surfaceSunken`, `border-top`, sin haz ni estrellas) quedan **byte a byte iguales**. | El mockup adjunto es un boceto de tema oscuro: fija `data-theme='dark'` en su propio `<script>` (L19) y su cuerpo es `oklch(.08 .012 288)` (L22). La rama clara ya tiene su mockup aprobado y entregado (`Landing v2.dc.html`). Mismo criterio D1 que las tres specs anteriores de esta serie. **Supuesto declarado, no consultado**: el usuario pidió no pausar salvo por datos que solo él pueda dar. |
| **D2** | La superposición Features→Contacto es **CSS puro**: `ScContact` (oscuro) lleva `margin-block-start` negativo de una pantalla (`CONTACT_OVERLAY_RISE`) y `position: relative; z-index: 3`. Ni `useEffect`, ni ref, ni variable CSS de scroll. | Copia exacta de D2 de `2026-08-02-features-overlay-celestial-orbital-design.md` y de la spec Story→Journey. El slot de la escena de Features **ya** es `position: sticky`, así que mientras está pegado cualquier hermano posterior con margen negativo le pasa por encima como consecuencia del flujo normal, resuelto en el compositor. `z-index: 3` completa la escalera de página: Story (auto) → Journey (1) → Features (2) → Contacto (3). |
| **D3** | Se añade a Features una **zona de hold** de una pantalla: un tercer hijo de grid `ScDarkTail` (`grid-row: 2`, `height: FEATURES_TAIL_HOLD`, `aria-hidden`) y el slot de la escena pasa de `grid-area: 1 / 1` a `grid-column: 1; grid-row: 1 / span 2`. | Sin hold, el metro final de Features es contenido real (la tercera identidad con su CTA) y Contacto lo taparía al subir. Es el mismo problema que D3 de la spec de Features resolvió en Journey con `JOURNEY_DECK_TAIL_SCREENS`, pero Features **no tiene deck**, así que no hay `tailScreens` que activar: el hold se declara como caja. **Por qué el slot tiene que abarcar las dos filas y no basta con `padding-block-end` en la sección o en el marco:** (a) un `position: sticky` está confinado a su **área de grid**, no a la caja de padding de la sección, así que padding en `ScFeatures` dejaría a la escena despegándose una pantalla antes de que Contacto la cubra — una pantalla de fondo plano a la vista; (b) `ScDarkFrame` es `align-items: center`, de modo que un `padding-block-end` suyo descentraría el contenido media pantalla hacia arriba. Ampliar el área del slot no toca ninguna de las dos cajas. Se usa `span 2` y **no** `1 / -1`: con filas implícitas, `-1` resuelve a la última línea **explícita** y no abarcaría la fila del hold — fallo silencioso clásico de CSS Grid. |
| **D4** | El solape de Contacto y el hold de Features son **la misma medida** (una pantalla), declarados en dos constantes de ficheros distintos (`CONTACT_OVERLAY_RISE` y `FEATURES_TAIL_HOLD`) y atados por un **test** que importa las dos. | Tercera vez que aparece esta invariante en la página (Story↔Journey, Journey↔Features) y misma lección del repo (`task/lessons.md`, 2026-08-02): _«una invariante entre dos ficheros de datos no la sostiene un comentario en cada uno»_. Si el hold es más corto que el solape, asoma una banda de contenido de Features sin tapar; si es más largo, queda una pantalla muerta antes de que Contacto empiece a subir. |
| **D5** | Bajo `prefers-reduced-motion: reduce`: el margen negativo de Contacto se anula (`margin-block-start: 0`), el hold de Features colapsa (`height: 0`), y el slot de la escena de Contacto pasa a `position: static`. | Bajo `reduce` no hay pin en ninguna sección (D15 de la spec anterior ya dejó el slot de Features en `static`): un margen negativo sobre un Features en flujo normal **taparía contenido real**, y una pantalla de hold sería scroll muerto sin nada que sostener. Perder movimiento es aceptable; perder contenido no. El hold colapsa con `height: 0` y no con `display: none` para que la forma del grid (y por tanto el `span 2` del slot) no cambie entre modos. |
| **D6** | `ScContact` (oscuro) se rehace con la **misma anatomía que Features**: `display: grid` de una columna, slot de escena pegado (`grid-column: 1; grid-row: 1; align-self: start; position: sticky; top: 0; height: CONTACT_DARK_HEIGHT = 100dvh`) y marco de contenido en la misma celda (`grid-row: 1`, `max-width: CONTACT_CONTENT_MAX_WIDTH = 1280px`). **Pierde `overflow: hidden`, `height` fija, `max-width` de sección y `margin-inline: auto`.** | El contenido nuevo (tres tarjetas + formulario) desborda una pantalla en móvil y en portátiles bajos, exactamente el caso que motivó D7 en Features: con la escena a `inset: 0` sobre la sección, `object-fit: cover` recortaría el arte justo donde vive el vacío que ocupa el texto. **`overflow: hidden` no es cosmético aquí: sería el ancestro que desactiva en silencio el `sticky` del slot** — mismo fallo que este repo ya documentó tres veces (`task/lessons.md`, 2026-07-31). El recorte del overscan lo hace `ScScene` de la propia escena, que declara el suyo y no es ancestro de sí mismo. `CONTACT_DARK_HEIGHT` pasa de `90dvh` a `100dvh`: con la sección a sangre y solapándose, una escena de 90dvh dejaría 10dvh de fondo plano bajo el pin. |
| **D7** | El haz de luz de la costura se implementa como **componente propio compartido**, `src/components/sectionBeam/` (`SectionBeam.tsx` + `sectionBeam.layers.ts` + `sectionBeam.parts.tsx`), consumido por Contacto y por el Footer. | Dos consumidores con la misma pieza, ~40 líneas de CSS y cinco literales `oklch()` verbatim del mockup: duplicarla sería dos fuentes de verdad para una animación que tiene que ir sincronizada entre dos costuras consecutivas de la misma página. Se coloca como directorio de primer nivel de `src/components/` (junto a `aura`, `eye`, `contactNeonGalaxy`, …) porque es un **composite decorativo**, no un átomo del sistema de diseño (`src/components/ui/` = Button/Card/Input/Typography/Logo/IconButton). El trío `Componente.tsx` + `*.layers.ts` (datos y literales) + `*.parts.tsx` (styled estructurales) es exactamente la convención que ya usan las cuatro escenas. |
| **D8** | El dibujado del haz (`beamDraw`) **se dispara con `useReveal`**, no al montar. Los efectos infinitos (`beamOut`, `beamPulse`, `glowPulse`, `starTwinkle`) se declaran solo bajo `prefers-reduced-motion: no-preference` y el bloque `reduce` fuerza `animation: none` explícito. | En el mockup el haz se dibuja al cargar porque el boceto es una página de dos secciones; en la landing real, Contacto y el Footer están a ~8 pantallas del pliegue y la animación de entrada habría terminado mucho antes de que nadie la vea — la costura llegaría ya dibujada y la transición se perdería. `useReveal` es el mecanismo que el repo ya usa para esto y ya está probado. El guard explícito de las infinitas es obligatorio por la lección del 2026-07-25: con el colapso global `animation-iteration-count: 1 !important`, una animación infinita corre **una vez** y deja un fotograma arbitrario, no el último. |
| **D9** | El footer estrena `useReveal` **solo para su costura** (haz + estrellas), no para su contenido. | El docblock de `Footer.tsx:27-29` documenta «sin reveal» como decisión sobre el **contenido** (el footer está debajo del pliegue final y no debe aparecer con retardo). Eso sigue vigente: los enlaces y el copyright se montan visibles. Lo que sí necesita saber cuándo se le mira es el haz, por el mismo motivo que D8. |
| **D10** | El campo de estrellas del footer es una **tabla de constantes precalculada** (`FOOTER_STARS`, 24 entradas) en `footer.layers.ts`, no un `Math.random()` en render. | No es preferencia de estilo: este sitio es **static export** (`output: 'export'`), y un `Math.random()` durante el render produce marcado distinto en build y en cliente — mismatch de hidratación garantizado. El mockup lo resuelve con un LCG sembrado (`s = (s * 16807) % 2147483647`, L184) porque su runtime no hidrata; aquí la forma correcta de «sembrado y determinista» es congelar el resultado en datos. Además hace el campo testeable por constantes en vez de por muestreo. |
| **D11** | Contacto **no** estrena campo de estrellas propio. | `ContactNeonGalaxy` ya trae una capa `03-estrellas` (`contactNeonGalaxy.layers.ts:37-42`) con parallax por profundidad. Añadir 56 `<div>` titilantes encima sería un segundo cielo sobre el primero. El footer sí lo estrena porque no tiene escena: hoy es un rectángulo plano de `surfaceSunken`. |
| **D12** | El formulario es **un único campo de correo + un botón de acción**, montado sobre los componentes existentes `Field` + `Input` + `Button`, dentro de una tarjeta translúcida (`CONTACT_FORM_BG`/`CONTACT_FORM_BORDER`, verbatim del mockup L87). Se descartan los campos Nombre, Asunto y Mensaje del mockup. | Es literalmente lo que pide el encargo. Reutilizar `Field`+`Input` (y no un `<input>` suelto) trae gratis el `id`/`aria-describedby`/`aria-invalid` cableados y el borde de error derivado del atributo accesible, que es el contrato que `Input.tsx:38-46` documenta. |
| **D13** | Al enviar, el formulario **abre el cliente de correo** con `mailto:` (destinatario `links.email`, asunto y cuerpo de i18n, con la dirección escrita incrustada en el cuerpo). **No** se implementa el estado «Mensaje enviado» del mockup. | No hay backend: el sitio es un export estático y no hay endpoint al que postear. El mockup resuelve su `onSubmit` con `setState({sent:true})` (L221) y pinta «Mensaje enviado — gracias por escribir» (L104) **sin enviar nada**: portarlo sería escribir en la interfaz una afirmación falsa. El `mailto:` es la misma mecánica que el CTA que esta sección ya tiene hoy (`Contact.tsx:413-418`, `href={links.email}`), así que el botón hace algo real y verificable. Si en el futuro hay endpoint, este es el punto de cambio, y queda declarado. |
| **D14** | Las **tres tarjetas** son Correo (`links.email`), Comunidad (`links.discord`) y Código (`links.github`), con iconos de trazo en línea del mismo estilo que el mockup. Se descarta la tarjeta «Visita el sitio» del mockup (L67-70). | Las tarjetas del mockup son Escríbenos / Visita el sitio / Únete a la comunidad. «Visita el sitio → www.voidtoinfinite.com» sería, en la landing real, un enlace a la página en la que ya estás. Las otras dos vías reales de la marca están en `links.ts` y ya las usa `Socials`, así que las tres tarjetas quedan con tres destinos reales y cero enlaces muertos o circulares. `links.docs`/`guides`/`playground` **no** se usan aquí: siguen siendo `example.invalid` a propósito. |
| **D15** | El bloque «Síguenos» del mockup (L76-84) **no** se porta a Contacto. | `Socials` vive en el footer desde la spec `2026-07-28-landing-v2-secciones-design.md` §7.5, a dos pantallas escasas de aquí. El mockup lo duplica porque es un boceto de dos secciones sueltas; en la página real serían dos listas idénticas de las mismas tres redes casi seguidas. El encargo pide mantener «tarjetas e iconos de contacto», que es D14, no una segunda barra social. |
| **D16** | El footer oscuro deja de ocultar las columnas Explore y Discover. El test `Footer.test.tsx:49-62` que afirma lo contrario **se sustituye por su contrario**. | §1, premisa obsoleta 1: las cuatro anclas existen hoy en las dos ramas. Es el mismo movimiento que D3 de la spec de Features (revertir a propósito una decisión anterior y darle la vuelta a su test), y el que hace que el footer oscuro tenga las cuatro columnas del mockup en vez de dos. |
| **D17** | El fondo del footer oscuro pasa a `FOOTER_DARK_BG = "oklch(0.055 0.01 288)"` (verbatim del mockup L112) y el `border-top` se sustituye por el haz **solo en oscuro**. | El `surfaceSunken` oscuro del sistema es `oklch(0.22 0.004 286)`: sobre él, la costura con el `#02040e` de la galaxia de Contacto se ve como un escalón claro. El literal del mockup es un negro de esa misma familia y no es un rol semántico reutilizable, así que entra como constante de composición (D10 de la spec de las secciones: literales de UNA composición no ascienden a token). En claro, `surfaceSunken` y el `border-top` se conservan intactos (D1). |
| **D18** | Ningún literal `oklch()` del mockup se «traduce» a un paso de `palette.*`. Se copian verbatim a `sectionBeam.layers.ts` / `contact.layers.ts` / `footer.layers.ts`, citando su línea de origen. | Los haces usan hue `311.928` — exactamente el de `palette.secondary` — pero con cromas (`.13`, `.18`, `.19`, `.06`, `.17`) que no coinciden con ningún paso de la rampa, y mezclan un hue `235.851` (el primario) en las paradas intermedias. Sustituirlos por pasos de la rampa cambiaría el arte; derivarlos con `color-mix` introduciría un valor calculado que el mockup no pidió. Mismo criterio ya escrito en `contact.layers.ts:1-29` y en `CONTACT_CTA_HOVER_SHADOW`. |
| **D19** | Copia nueva: 13 claves de i18n nuevas en `home` (tarjetas + formulario) y 0 en `common`, con paridad es/en en el mismo commit. | El candado `src/i18n/locales.test.ts` compara rutas de clave namespace a namespace y falla si una falta en un idioma. Las columnas del footer no necesitan claves nuevas: `Common.Footer.explore`/`discover` y `Common.Navigation.*` ya existen y hoy solo estaban condicionadas por tema (D16). |
| **D20** | La **pareja de columnas** del contenido oscuro se topa a `CONTACT_CONTENT_PAIR_MAX = "860px"` y se **alinea a la derecha** (`margin-inline-start: auto`) dentro del marco de 1280px. _(Decisión tomada durante la verificación en navegador, no en la primera redacción — ver §12.)_ | 860px es el ancho del `Container` del propio mockup (L54, `hint-size="100%,860px"`): el boceto compone sus dos columnas dentro de 860, no de 1280. Y la alineación a la derecha no es gusto: la escena `ContactNeonGalaxy` concentra su masa luminosa —figura holográfica y los tres orbes— en la mitad IZQUIERDA, y su viñeta está escrita para oscurecer la derecha. **Medido, no estimado**: compuestas las 7 capas en un canvas a 1440×900 con el mismo `cover` + `scale(1.06)` de producción, la luminancia media por franjas de 40px vale 135/150/108 sobre 255 en `x` 160-240 (la figura), cae a 26-16 en `x` 320-480 y se queda plana en 11-15 desde `x = 520`. Con la pareja ocupando los 1216px del marco, la columna de copia caía justo encima de la figura; con el tope de 860 arranca en `x ≈ 468`, ya fuera de la masa del arte. |

## 4. Aritmética de la coreografía (verificable)

Sea `F` la posición en documento del inicio de `ScFeatures` (rama oscura), `c` la altura de su contenido real (`ScDarkFrame`, ≥ 1 pantalla) y `1p` = una pantalla = `100dvh`.

- Altura de Features hoy: `c`. Con D3: `c + 1p`.
- El slot de la escena está pegado mientras su área de grid (filas 1+2, de `F` a `F + c + 1p`) lo permita: se despega cuando el borde inferior del área alcanza el borde inferior del slot, es decir en `scrollY = F + c + 1p − 1p = F + c`.
- Contacto empieza en documento en `F + (c + 1p) − 1p (solape) = F + c`.
- Su borde superior toca el borde **inferior** del viewport en `scrollY = F + c − 1p`, y el **superior** en `scrollY = F + c`.

| Tramo de `scrollY` | Qué se ve |
| --- | --- |
| `… F + c − 1p` | Contenido de Features pasando por delante de la escena pegada |
| `F + c − 1p … F + c` | Contacto sube desde el borde inferior del viewport con el haz dibujándose en su canto. Su borde superior **coincide exactamente, en todo el recorrido, con el borde inferior del contenido de Features** (las dos rectas valen `F + c − scrollY`): lo que Contacto tapa es la fila de hold —espacio vacío con la escena pegada detrás—, nunca contenido |
| `F + c` | Contacto cubre el 100%; el slot de Features se despega **en ese mismo punto** — sin costura visible |
| `> F + c` | El slot de la escena de Contacto se pega a `top: 0`; su contenido pasa por delante |

Las dos igualdades no son coincidencia: el solape y el hold son la misma pantalla (D4), así que Contacto arranca en documento exactamente donde acaba el contenido de Features, y el área de grid del slot (filas 1+2) acaba exactamente una pantalla más abajo.

**Y así es como se justifica D3, no por analogía**: sin la fila de hold, Contacto empezaría en `F + c − 1p`, es decir **dentro** del marco de contenido, y su subida taparía la última pantalla de la tercera identidad de Features. Y sin el `span 2` del slot, el área del slot terminaría en `F + c` y la escena se despegaría justo cuando empieza la subida: Contacto ascendería sobre fondo plano en vez de sobre la escena.

### Verificación previa de la mecánica (sonda en navegador real, antes de implementar)

Réplica mínima de la anatomía (marco de `180vh`, hold de `100vh`, slot `grid-row: 1 / span 2`, sección siguiente con `margin-block-start: -100vh`), montada en el navegador del dev server y barrida con `scroll-behavior: instant`. `vh = 837`, sección en `F = 419`, marco `419 → 1925` (`c = 1506`), hold `1925 → 2762`, sección siguiente en documento `1925`:

| `scrollY` | `slot` (top,bottom) | `frame` bottom | `after` top |
| --- | --- | --- | --- |
| 419 | **(0, 837)** pegado | 1506 | 1506 |
| 1256 | **(0, 837)** pegado | 669 | **669** |
| 1674 | **(0, 837)** pegado | 251 | **251** |
| 1925 | **(0, 837)** última posición pegada | **0** | **0** |
| 2093 | (−168, 669) despegado | −168 | −168 |

Los tres hechos que la sonda cierra: (a) `grid-row: 1 / span 2` **sí** extiende el viaje del `sticky` a través de la fila de hold — sin él el slot se habría despegado en 1088; (b) `after top === frame bottom` en **todos** los puntos del recorrido, así que la subida no tapa contenido; (c) «Contacto cubre el 100%» y «el slot se despega» ocurren en el **mismo** `scrollY` (1925). La sonda vive fuera del repo (`task/`, ignorado por git) y no deja rastro.

Nota sobre el parallax durante el relevo: `useSceneParallax` deriva su término de scroll de `-rect.top / innerHeight` sobre `sceneRef`. Mientras el slot de Contacto está pegado ese `rect.top` vale 0 y el término no aporta; **durante la subida sí aporta** (`rect.top` recorre `+1p → 0`), que es justo cuando se ve. Sale gratis porque Contacto no está pegado durante su propia entrada — igual que Features.

## 5. El mockup: qué se porta y qué no

Fuente: `Footer animado v2.dc.html` (Downloads, 2026-08-03). Su `<helmet>` enlaza un design system externo (`_ds/voidtoinfinite-design-system-93a4548b-…/tokens/*.css`) **que no está en Downloads** — verificado: el directorio `_ds` no existe. Por tanto los `var(--*)` no se pueden leer y se mapean **por rol**, con el mismo criterio ya escrito en `contact.layers.ts:22-29`:

| `var()` del mockup | Rol de este sistema |
| --- | --- |
| `--text-default` | `semantic.text` |
| `--text-secondary` | `semantic.textMuted` |
| `--secondary-400` / `--secondary-300` | `palette.secondary[400]` / `palette.secondary[300]` |
| `--radius-full` / `--radius-xl` / `--radius-2xl` / `--radius-sm` | `radius.full` / `radius.xl` / `radius["2xl"]` / `radius.sm` |
| `--space-1…8` | `space[1…8]` (misma escala, coinciden por definición) |
| `--font-weight-semibold` / `--font-weight-bold` | `600` / `700` (los valores de `type.scale`) |
| `--success-500` | `semantic.success` — **no se usa** (D13 retira el estado «enviado») |

Lo que sí se porta, verbatim:

| Pieza del mockup | Líneas | Destino |
| --- | --- | --- |
| `@keyframes beamDraw` (scaleX 0→1, 1.6s `cubic-bezier(.16,.8,.3,1)`) | L26 | `sectionBeam.parts.tsx` |
| `@keyframes beamOut` (barrido, `--sweep-dur` 18s por defecto) | L25 | idem |
| `@keyframes beamPulse` (opacidad .55↔1, 4.5s) | L27 | idem |
| `@keyframes glowPulse` (opacidad + `scale(1.04)`, 7s) | L28 | idem (halo superior de Contacto) |
| `@keyframes starTwinkle` (opacidad .12↔1 + `scale(.8→1.15)`) | L29 | `Footer.tsx` |
| Degradados de los cuatro semihaces y del punto caliente central | L46-50, L114-118 | `sectionBeam.layers.ts` (5 literales `oklch()`) |
| Halo radial superior de Contacto | L52 | `contact.layers.ts` |
| Tarjetas de contacto: `background: oklch(1 0 0/.05)`, `border: 1px solid oklch(1 0 0/.12)`, `radius.xl`, `padding: space[3] space[4]`, icono 24px `stroke` | L63-74 | `contact.layers.ts` + `Contact.tsx` |
| Tarjeta del formulario: `background: oklch(1 0 0/.04)`, `border: 1px solid oklch(1 0 0/.12)`, `radius["2xl"]`, `padding: space[5]` | L87 | idem |
| Fondo del footer `oklch(.055 .01 288)` | L112 | `footer.layers.ts` (D17) |
| Chips sociales del footer 34px `radius.full`, borde `oklch(1 0 0/.16)` | L161-164 | **no se porta** — `Socials` ya tiene su propio chip de 44px, que es el mínimo táctil AA (`Socials.tsx:47-48`). Bajar a 34px sería una regresión de accesibilidad. |
| Formulario de 4 campos, `<textarea>`, estado «enviado» | L87-106 | **no se porta** (D12/D13) |
| Campo de estrellas de Contacto | L43 | **no se porta** (D11) |
| Bloque «Síguenos» de Contacto | L76-84 | **no se porta** (D15) |
| Imagen de fondo `assets/contacto-fondo.png` + su velo | L40-41 | **no se porta**: `ContactNeonGalaxy` (7 capas con parallax) es estrictamente más rico que una imagen plana al 55% de opacidad, y el activo ni siquiera está en Downloads |
| Columnas Recursos (Blog/FAQ/Soporte) y Legal (3 enlaces) del footer | L140-157 | **no se porta la lista**: son destinos que no existen en `links.ts`; el footer conserva sus enlaces reales (D16 restaura Explore/Discover, que sí existen) |

## 6. Ficheros afectados

| Fichero | Cambio |
| --- | --- |
| `src/components/sectionBeam/SectionBeam.tsx` | **Nuevo** — componente del haz, con `useReveal` propio |
| `src/components/sectionBeam/sectionBeam.layers.ts` | **Nuevo** — 5 literales `oklch()` verbatim + duraciones/geometría |
| `src/components/sectionBeam/sectionBeam.parts.tsx` | **Nuevo** — styled + `@keyframes` + guards de `reduce` |
| `src/components/sectionBeam/SectionBeam.test.tsx` | **Nuevo** |
| `src/components/sectionBeam/sectionBeam.layers.test.ts` | **Nuevo** |
| `src/components/sections/Features/features.layers.ts` | `FEATURES_TAIL_HOLD` nueva |
| `src/components/sections/Features/Features.tsx` | Rama oscura: `ScDarkTail` + slot a `grid-row: 1 / span 2` |
| `src/components/sections/Features/Features.test.tsx` | Tests del hold (§7.1) + invariante `FEATURES_DARK_HEIGHT === FEATURES_TAIL_HOLD` (§12) |
| `src/components/contactNeonGalaxy/contactNeonGalaxy.parts.tsx` | `ScVignette` pasa a dos regímenes por breakpoint (§12) |
| `src/components/contactNeonGalaxy/ContactNeonGalaxy.test.tsx` | Pasa a `renderWithProviders` (la escena ya no es theme-free, §12) |
| `app/home-page.flujo.test.tsx` | `testTimeout` explícito en el render completo en oscuro (§12) |
| `src/components/sections/Contact/contact.layers.ts` | `CONTACT_OVERLAY_RISE`, `CONTACT_CONTENT_MAX_WIDTH`, `CONTACT_CONTENT_PAIR_MAX`, `CONTACT_CARD_*`, `CONTACT_FORM_*`, `CONTACT_TOP_GLOW`; `CONTACT_DARK_HEIGHT` 90dvh→100dvh; se borra `CONTACT_DARK_MAX_WIDTH` |
| `src/components/sections/Contact/Contact.tsx` | Rama oscura rehecha (D2/D6/D12/D13/D14) |
| `src/components/sections/Contact/Contact.test.tsx` | Tests nuevos (§7.2); los 12 claros se conservan |
| `src/components/layout/Footer/footer.layers.ts` | **Nuevo** — `FOOTER_DARK_BG`, `FOOTER_STARS` (24), `FOOTER_STAR_TWINKLE_*` |
| `src/components/layout/Footer/Footer.tsx` | Rama oscura: fondo, haz, estrellas, columnas restauradas (D16/D17) |
| `src/components/layout/Footer/Footer.test.tsx` | El test de las columnas ocultas se sustituye por su contrario; tests nuevos (§7.3) |
| `src/components/layout/Footer/footer.layers.test.ts` | **Nuevo** |
| `src/components/sectionBeam/*` | **Nuevo** — ver arriba; `SECTION_BEAM_Z` se añadió en integración (§12) |
| `src/i18n/locales/{es,en}/home.json` | 13 claves nuevas bajo `Home.contact.*` (D19) |
| `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md` | **Este documento** |
| `docs/superpowers/plans/2026-08-03-contacto-footer-oscuro.md` | Plan de ejecución |

## 7. Tests

Todos por **texto del CSS inyectado** (`cssRuleTextFor()`/`injectedCss()`, el patrón que estos ficheros ya usan) o por constantes, **nunca** por `getComputedStyle` de algo que jsdom no evalúe. La aserción sobre un bloque `@media` se hace sobre la **línea concreta** que a la vez está en el bloque `reduce` y menciona la propiedad, nunca troceando el stylesheet acumulado (lección 2026-08-02).

### 7.1 Features (hold)

1. **Hold declarado**: el CSS de `ScDarkTail` declara `height` con el valor de `FEATURES_TAIL_HOLD`.
2. **Guard de `reduce` del hold** (D5): línea `height: 0` dentro de un bloque `@media (prefers-reduced-motion: reduce)`.
3. **El slot abarca las dos filas** (D3): el CSS del slot declara `grid-row` con `span 2` y **no** contiene `grid-area: 1 / 1`. Falsable: revertir a `grid-area: 1/1` deja la cadena fuera.
4. **Invariante D4**: `CONTACT_OVERLAY_RISE === FEATURES_TAIL_HOLD`, importando los dos ficheros de datos. Vive en `Contact.test.tsx` (la sección que **sube**, igual que la invariante Journey↔Features vive en `Features.test.tsx`).
5. **No-regresión**: `ScFeatures` sigue **sin** ninguna declaración `overflow` (el fallo que rompería los dos pines en silencio), y conserva su `margin-block-start` negativo y su guard.

### 7.2 Contacto

6. **Solape declarado** (D2): el CSS de la rama oscura declara `margin-block-start` con `CONTACT_OVERLAY_RISE` en negativo, y `z-index: 3`.
7. **Guard de `reduce` del solape** (D5): línea `margin-block-start: 0` dentro de un bloque `reduce`.
8. **Escena pegada** (D6): el slot declara `position: sticky` y `top: 0` con `height` derivado de `CONTACT_DARK_HEIGHT`; guard `position: static` bajo `reduce`; y **ningún `overflow`** en `ScContact` — es el fallo silencioso.
9. **Tope de contenido** (D6): el marco declara `max-width` leyendo `CONTACT_CONTENT_MAX_WIDTH`, no un literal.
10. **Tres tarjetas con destino real** (D14): hay exactamente 3 enlaces de tarjeta, con `href` igual a `links.email`, `links.discord` y `links.github` **importados de `@/config/links`**, cada uno con su icono `aria-hidden` y su texto de i18n. Falsable: ninguna comparación contra un literal escrito a mano.
11. **Formulario mínimo** (D12): dentro del `<form>` hay **exactamente un** control de formulario (`getAllByRole` de textbox + el `input[type=email]`), es `type="email"` y `required`, tiene etiqueta accesible de i18n, y hay **exactamente un** `<button type="submit">`. Falsable: añadir un segundo campo pone el test en rojo — que es justo la regresión que el encargo prohíbe.
12. **Envío por `mailto:`** (D13): al enviar con un correo válido, el componente navega a una URL que empieza por `links.email` y lleva el correo escrito en el cuerpo; y el DOM **no** contiene ningún texto de «enviado». Se asevera sobre un doble de la navegación, no sobre `window.location` real.
13. **Ningún estado falso** (D13): no existe ninguna clave i18n ni ningún nodo con la afirmación «mensaje enviado».
14. **No-regresión de la rama clara**: los 12 tests claros existentes de `Contact.test.tsx` siguen verdes **sin tocarlos**.

### 7.3 Footer

15. **Columnas en oscuro** (D16): en tema oscuro existen las columnas Explore y Discover con sus 4 + 3 enlaces y sus anclas `#story`/`#journey`/`#features`/`#contact`. **Sustituye** al test vigente que afirma lo contrario.
16. **Fondo oscuro** (D17): el CSS del footer declara `background-color` con `FOOTER_DARK_BG` en oscuro y con `semantic.surfaceSunken` en claro; el `border-top` solo aparece en claro.
17. **Estrellas deterministas** (D10): `FOOTER_STARS` tiene 24 entradas, todas con `top`/`left` en `%`, tamaño en `px` y retardo propio; se renderiza una por entrada, todas dentro de un contenedor `aria-hidden`; y el módulo **no** contiene `Math.random`.
18. **Guard de `reduce` de las estrellas** (D8): la animación de titileo solo se declara bajo `no-preference` y el bloque `reduce` fuerza `animation: none`.
19. **Haz solo en oscuro**: `SectionBeam` no se monta en la rama clara del footer.
20. **No-regresión de la rama clara**: los tests claros existentes de `Footer.test.tsx` siguen verdes.

### 7.4 SectionBeam

21. **Marcado**: el contenedor es `aria-hidden`, no aporta texto ni foco, y monta los 5 elementos del mockup (2 semihaces de dibujado, 2 de barrido, 1 punto caliente).
22. **Dibujado atado al reveal** (D8): la animación `beamDraw` se declara bajo el selector `[data-revealed="true"]`; sin ese atributo no hay animación. Falsable: quitar el selector deja la cadena fuera.
23. **Guards de `reduce`** (D8): las tres animaciones infinitas (`beamOut`, `beamPulse`, y `glowPulse` en su consumidor) tienen su `animation: none` explícito dentro de un bloque `reduce` — **no** se confía en el colapso global.
24. **Literales verbatim** (D18): las 5 constantes de color del haz mantienen sus valores exactos del mockup, comprobados contra las cadenas citadas en §5.

## 8. Accesibilidad

- Contacto conserva `id="contact"` y `aria-labelledby="contact-title"`; el solape es puramente visual y no cambia el orden del DOM ni el de tabulación.
- D5 es el requisito duro: bajo `reduce` no hay solape (no se tapa contenido), no hay hold (no hay scroll muerto), no hay fondo clavado (no hay movimiento relativo) y no queda ninguna animación infinita en un fotograma arbitrario.
- El haz y el campo de estrellas son `aria-hidden`, sin texto y sin foco.
- El campo de correo se monta con `Field` (label visible asociado por `id`, `aria-describedby` para la ayuda) e `Input` (`aria-invalid` derivado del atributo, no de un prop). El botón es un `<button type="submit">` real, no un `<div>`.
- Las tres tarjetas son enlaces `<a>` con texto propio; sus iconos son `aria-hidden` y no aportan el nombre accesible.
- Los chips sociales del footer conservan sus 44px (§5): no se bajan a los 34px del mockup.
- Contraste del texto sobre el arte: la viñeta de `ContactNeonGalaxy` (`to left`) oscurece la derecha, que es donde vive el contenido. Se **verifica en navegador**, no se supone.

## 9. i18n

13 claves nuevas bajo `Home.contact.*`, con paridad es/en escrita en el mismo commit (el candado `locales.test.ts` falla si falta una):

`cards.email.title` · `cards.email.value` · `cards.community.title` · `cards.community.value` · `cards.code.title` · `cards.code.value` · `form.label` · `form.placeholder` · `form.help` · `form.submit` · `form.submitAria` · `form.subject` · `form.body`

Las dos últimas son el asunto y el cuerpo del `mailto:` de D13 (`form.body` interpola `{{email}}` con la dirección escrita). No estaban en la primera redacción de esta spec: se añadieron al ver que el envío no podía construir un mensaje sin texto traducible — ver §12.

Ninguna clave se retira: `Home.contact.email`, `.cta`, `.ctaAria` y `.figureAlt` las sigue consumiendo la **rama clara**, intacta (D1). `Common.Footer.*` y `Common.Navigation.*` no cambian (D16 solo quita una condición).

## 10. No-objetivos (YAGNI)

- **No** se toca la rama clara de Contacto ni la del Footer, ni ninguna rama de Story/Journey. De Features solo se toca la rama oscura, y solo para añadir el hold.
- **No** se implementa el estado «Mensaje enviado» del mockup (D13) ni ningún backend de formulario.
- **No** se portan los campos Nombre/Asunto/Mensaje, ni el bloque «Síguenos» de Contacto, ni el campo de estrellas de Contacto, ni la imagen `contacto-fondo.png` (§5).
- **No** se cambian los enlaces del footer ni se inventan destinos (Blog/FAQ/Soporte/Legal del mockup no existen en `links.ts`).
- **No** se toca `useSceneParallax`, `useSlideDeck` ni `useReveal`: los tres se consumen tal cual.
- **No** se convierte Contacto en un deck de diapositivas.
- **No** se corrigen los fallos preexistentes del gate ajenos a esta entrega (`check-format` sobre `graphify-out/**`, `check-spelling`).

## 11. Definición de «hecho»

- [x] **Suite completa en verde con el script real del repo**: `pnpm test` (es decir `vitest run`, **sin** `--maxWorkers`) da **649/649 en 60 ficheros**, frente a la baseline de **604/604 en 57** medida en este mismo HEAD antes de tocar nada. Los +45 cuadran exactamente: **14** de los dos ficheros nuevos de `sectionBeam` (4 + 10), **9** de `footer.layers.test.ts` (nuevo), **+7** en `Footer.test.tsx` (6 → 13), **+5** en `Features.test.tsx` (23 → 28, incluida la invariante que pidió la auditoría) y **+10** en `Contact.test.tsx` (13 → 23). `14 + 9 + 7 + 5 + 10 = 45`. Se ejecutó **tres veces seguidas** con el comando documentado, sin un solo timeout — ver §12 sobre por qué antes no pasaba y qué se arregló.
- [x] **`pnpm typecheck` exit 0** y **`pnpm lint` exit 0**, sin salida. `pnpm check-format` señala **solo** `graphify-out/**` — la misma lista de 13 ficheros que la baseline, ninguno de esta entrega. (`pnpm check-spelling` no forma parte del gate `pnpm check` y falla desde antes de esta entrega con 55 200 incidencias en 171 ficheros: marca cada palabra en español del repo, incluidos ficheros que esta entrega no toca. §10.)
- [x] **Contraste medido, no supuesto** (§8). Método: composición de las 7 capas de `ContactNeonGalaxy` **más la viñeta** en un canvas del tamaño exacto del viewport, con el mismo `cover` + `scale(1.06)` de producción; luminancia relativa WCAG por píxel; para cada pieza de texto se toma su color computado real (convertido de `oklch()` a sRGB por el propio navegador) y se busca el **PEOR píxel** de todo su rectángulo, no la media. Peor caso por ancho:

    | Viewport | Pareja de columnas | Peor ratio (pieza) |
    | --- | --- | --- |
    | 375 × 812 | 32 → 343 (ancho completo, apiladas) | **13.19:1** (cuerpo) |
    | 768 × 900 | 291 → 736 | **11.66:1** (cuerpo) |
    | 1200 × 800 | 472 → 1168 | **11.86:1** (valor de la 3ª tarjeta) |
    | 1440 × 900 | 528 → 1328 | **10.26:1** (cuerpo) |

    Todos por encima de AAA (7:1), y el peor píxel de cada bloque, no su media. Los dos defectos reales que esta medición encontró y cerró están en §12.

- [x] **Transición medida en navegador real**, a 1440×900 (`vh = 900`). Geometría: Features en documento `13500`, alto `1800` (= 900 de marco + 900 de hold), slot con `grid-row: 1 / span 2` y `position: sticky`, `overflow` de `ScFeatures` **`visible`**. Contacto en documento **`14400` = 13500 + 900**, es decir exactamente el borde inferior del contenido de Features; `margin-block-start` computado **`-900px`**, `z-index` **3**, `overflow` **`visible`**, `background-color` **`rgb(2, 4, 14)`** (= `#02040e`). Barrido con `scroll-behavior: auto` forzado:

    | `scrollY` | `fSlot` (top, bottom) | `frame` bottom | `contact` top |
    | --- | --- | --- | --- |
    | 12600 | (900, 1800) sin pegar | 1800 | 1800 |
    | 13500 | **(0, 900) pegado** | 900 | **900** (borde inferior del viewport) |
    | 13950 | (0, 900) pegado | 450 | **450** |
    | 14400 | (0, 900) **última posición pegada** | 0 | **0** (cubre el 100%) |
    | 14500 | (−100, 800) **despegado** | −100 | −100 |

    `contact top === frame bottom` en **todos** los puntos: la subida no tapa contenido. Y «Contacto cubre el 100%» y «el slot se despega» ocurren en el **mismo** `scrollY` (14400): sin costura, tal como predice §4.

- [x] **Cajas medidas en navegador**: sección **1440 × 900** (a sangre, ancho = viewport), slot de la escena **900** exactos, marco de contenido **1280px** (`max-width` computado `1280px`), pareja de columnas **860px** empezando en `x = 468` (copia 369 + hueco + formulario 443). Footer: `background-color` **`oklch(0.055 0.01 288)`**, `border-top-width` **`0px`**, `position` **`relative`**, **24** estrellas montadas y animando, `ScInner` en `z-index: 1`. **375×812**: `scrollWidth === clientWidth === 375` (**sin scroll horizontal**), Features `1967` (= 1155 + 812), Contacto en `13335` = 12180 + 1155 con `margin-block-start` **`-812px`**, columnas apiladas a 311px. **Cero errores en consola** en los dos anchos.
- [x] **Guards de `reduce` comprobados en el CSSOM real** del navegador: dentro de `@media (prefers-reduced-motion: reduce)` hay `margin-block-start: 0px` en tres clases (Journey, Features y Contacto), `position: static` en los slots de escena, `height: 0px` en `ScDarkTail` (el hold), y `animation-name: none` en las dos mitades del dibujado del haz —con `transform: scaleX(1)` explícito—, en los dos barridos, en el punto caliente, en el halo superior de Contacto y en las 24 clases de estrella. Nota de método: el CSSOM serializa `animation: none` como `animation: auto ease 0s 1 normal none running none`; buscar la cadena literal `animation: none` da **cero** resultados y sería un falso negativo.
- [x] **Rama clara verificada intacta en navegador**: Contacto con `margin-block-start: 0px`, `z-index: auto`, `max-width: 1200px` (`containerMax`), `display: block`, **0 formularios, 0 inputs, 0 haces** y su figura `<img>` en su sitio; Footer con `background-color: oklch(0.96 0.002 286)` (= `surfaceSunken` claro), `border-top-width: 1px`, `position: static`, **0 haces y 0 estrellas**. Los tests claros preexistentes siguen verdes sin haberlos tocado.
- [ ] Registro en el vault (`01-Projects/vti.md` + copia de esta spec) y en `task/todo.md` / `task/lessons.md`.

## 12. Desviaciones de implementación

**La mecánica del hold se verificó ANTES de implementarla, y menos mal.** La primera redacción de §4 afirmaba que el hold daba «una pantalla de reposo y DESPUÉS Contacto sube». Una sonda mínima en navegador real (§4, réplica de la anatomía con marco de 180vh y hold de 100vh) demostró que lo que ocurre es otra cosa, y mejor: el borde superior de Contacto **coincide exactamente** con el borde inferior del contenido de Features durante todo el recorrido, así que lo que la subida tapa es la fila de hold, no el reposo. La conclusión práctica es la misma —no se oculta contenido— pero la descripción era falsa y se corrigió. La sonda también cerró las dos incógnitas de CSS que el diseño daba por buenas: que `grid-row: 1 / span 2` **sí** extiende el viaje del `sticky` (sin él el slot se habría despegado una pantalla antes) y que las dos transiciones ocurren en el mismo `scrollY`.

**`SECTION_BEAM_Z` no estaba en la spec y es lo único que impide que la costura sea invisible.** El componente del haz se entregó sin `z-index` propio. Sus dos consumidores montan detrás piezas **posicionadas** con fondo (el slot pegado de la escena en Contacto, el campo de estrellas en el Footer) y dos posicionados con `z-index: auto` se pintan **en orden de DOM**: el haz habría quedado tapado. Se detectó en la revisión de integración, no en los tests —ninguno podía verlo, porque no se pierde ni un nodo ni una palabra—, y se añadió la constante, la declaración y un test que la ata contra la constante importada.

**D20 (el tope de 860px y la alineación a la derecha) nació de una medición, no del diseño.** La primera implementación dejaba la pareja de columnas ocupando los 1216px del marco. En el navegador se vio que la columna de copia caía justo encima de la figura holográfica de `ContactNeonGalaxy`. En vez de mover el texto «a ojo», se compusieron las 7 capas en un canvas con el mismo `cover` + `scale(1.06)` de producción y se midió la luminancia media por franjas de 40px, que da el borde del arte en `x ≈ 500` a 1440px de viewport. El número elegido no es ese borde sino el ancho del `Container` del propio mockup (860px, L54), que resulta dejar la pareja empezando en `x ≈ 468`. Que el mockup y la medición converjan es la señal de que el 860 no era arbitrario en el boceto.

**Dos claves de i18n más de las 11 previstas.** La spec no había reparado en que un `mailto:` necesita asunto y cuerpo, y los dos son texto de interfaz traducible: se añadieron `form.subject` y `form.body` (esta última interpola `{{email}}`). Sin ellas, el envío habría tenido que llevar prosa hardcodeada en el componente — justo lo que el estándar del repo prohíbe.

**Colisión de copia entre la tarjeta de correo y el botón.** Las dos claves entregadas por el flujo de i18n decían literalmente lo mismo («Escríbenos» / «Write to us»), lo que además hacía ambiguo cualquier `getByText` en los tests. Lo reportó el flujo de Contacto como hallazgo fuera de su alcance y se corrigió en integración: la tarjeta pasa a «Correo directo» / «Direct email» y el botón conserva el verbo de acción.

**Un test de falsabilidad resultó ser vacuamente verdadero, y lo cazó el propio experimento.** El test que ata el dibujado del haz al reveal comprobaba `.toContain('[data-revealed="true"]')`. Esa subcadena aparece **igual** en el selector correcto (`[data-revealed="true"] .clase`, descendiente) y en el bug que el test existe para impedir (`.clase[data-revealed="true"]`, mismo elemento — el fallo silencioso que documenta `CLAUDE.md §5.1`). Con el bug inyectado el test seguía en verde. Se reescribió a `/^\[data-revealed="true"\]\s/` sobre el texto de la regla y se reejecutó el experimento: rojo con el bug, verde sin él. Es el argumento de por qué la prueba de falsabilidad no es ceremonia — sin ejecutarla, ese test habría entrado como cobertura y no lo era.

**El campo de estrellas costaba 850 ms de render, y la auditoría lo destapó por un camino inesperado.** Un auditor adversarial independiente señaló que la suite NO estaba verde con el script real del repo (`pnpm test`, sin `--maxWorkers`): `app/home-page.flujo.test.tsx` caía por timeout de 5000 ms, de forma reproducible. Ese test es **síncrono** —no tiene ni un `waitFor`—, así que el timeout medía render puro. Medido con una edición invertible (renderizar cero estrellas y comparar): **5160 ms con las 24 estrellas, 4315 ms con cero**. La causa: las cinco interpolaciones por estrella hacían que styled-components generara **una clase por estrella**, con sus dos bloques `@media` cada una — ~72 reglas inyectadas en la hoja en tiempo de ejecución. Se corrigió de raíz pasando la variación a **propiedades personalizadas** en el atributo `style`, con lo que el template queda estático y las 24 estrellas comparten una sola clase. Es una mejora también en producción, no solo en la suite. El timeout explícito que se añadió después (15 000 ms, documentado en el propio test) es lo que queda **después** de esa optimización, no en lugar de ella: el render completo de la página en oscuro son 3830 ms medidos con la máquina descargada, y el presupuesto de 5000 ms es el defecto de la herramienta, no una decisión de nadie.

**La verificación de contraste que §8 prometía encontró dos defectos reales, no uno.** El primero ya está en D20 (la pareja de columnas caía sobre la figura). El segundo apareció al medir a otros anchos: con el tope SOLO en píxeles (`800px`), a 1200×800 el marco pierde la holgura contra su `max-width` de 1280, la pareja arranca en 368 y el peor píxel bajo el cuerpo vuelve a **1.17:1**. La escena se pinta con `object-fit: cover`, así que el borde de su masa luminosa **no vive en un píxel fijo sino en una fracción del ancho** (34-37% en todo el rango medido). Por eso el tope es `min(800px, 58vw)` y no un número suelto. Y a 375, con las columnas apiladas a ancho completo, ningún tope ayuda: ahí el peor píxel bajo el `h2` daba **1.88:1**. La solución para ese régimen no es estrechar el texto —58vw sobre 375 son 218px, ilegible por otra razón— sino **subir el velo de la viñeta de la escena por debajo de `md`**, que es donde el `cover` amplía tanto el arte que el velo no cuesta composición. Los dos regímenes están medidos y documentados en `ScVignette`.

**Efecto colateral de tocar la viñeta: la escena dejó de ser theme-free.** `ScVignette` pasa a leer `theme.data.breakPoint.md` para separar sus dos regímenes, y `ContactNeonGalaxy.test.tsx` renderizaba con el `render` pelado de Testing Library —sin `ThemeProvider`— porque hasta entonces la escena no necesitaba tema. El render reventaba con `Cannot read properties of undefined (reading 'breakPoint')`. Se cambió a `renderWithProviders`, que es el helper estándar del repo, con la razón escrita en el propio import.

**La auditoría también pidió una invariante que faltaba, y tenía razón.** `FEATURES_DARK_HEIGHT` (alto del slot de la escena) y `FEATURES_TAIL_HOLD` (la fila de hold) tienen que medir lo mismo para que «Contacto cubre el 100%» y «el slot se despega» coincidan; hoy valen las dos `"100dvh"`, pero eso era una coincidencia de valor sin candado — y las dos viven en el MISMO fichero sin citarse. Añadido el test en `Features.test.tsx` con la derivación completa escrita.

**Colisión de copia entre la tarjeta de correo y el botón, y una tarjeta sin dato real.** Las claves de i18n hacían que la tarjeta de correo y el botón dijeran literalmente lo mismo («Escríbenos»), lo que además volvía ambiguo cualquier `getByText`; la tarjeta pasa a «Correo directo» / «Direct email». Y la tarjeta de comunidad mostraba una frase de marketing donde sus dos hermanas muestran el dato real (la dirección, el handle de GitHub): pasa a `discord.gg/CuGhqdG3g3`, el destino real de su propio `href`.

**Veredicto de la auditoría adversarial: sin bloqueantes, y ningún test vacuo.** El auditor recalculó la aritmética de §4 desde el código sin copiarla de aquí (coincide), inyectó a mano el bug que protege cada uno de los **12** tests nuevos clave y comprobó que los 12 se ponen en rojo, barrió la cadena de `overflow` hasta `html`/`body` (correcta: `overflow-x: clip`, que no rompe `sticky`), las 6 animaciones infinitas y sus guards, el orden de pintado, las props transitorias, el determinismo del render y la paridad de i18n. Los tres hallazgos con sustancia (suite roja con el script real, formato de este documento, invariante sin candado) están cerrados arriba.

**Deuda declarada, fuera del alcance del encargo: el Navbar sigue apoyado en la premisa que esta entrega revierte.** `Navbar.tsx:493` oculta sus enlaces de sección con `themeName === "light"`, por el mismo motivo obsoleto que el footer (§1, premisa 1). Con D16, el footer oscuro vuelve a ofrecer las cuatro anclas y el navbar oscuro sigue sin ofrecerlas: la misma página, dos criterios. **No se ha tocado a propósito** — el brief del usuario acota la entrega a Contacto y Footer, y ampliarla al Navbar habría sido un cambio de alcance que el propio brief pide no tomar por cuenta propia. Queda anotado como siguiente paso natural.
