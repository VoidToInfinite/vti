# Implementación del plan premium ≥90/100 — Fases 1-5 (2026-08-10)

Fuente estratégica: nota del vault `01-Projects/vti/typescript/specs/2026-08-09-plan-premium-por-fases-90.md` (rúbrica, baselines, decisiones de Fase 0). Este documento es el plan OPERATIVO por tareas para SDD. Baseline: HEAD `4c69b42`, rama `feature/general-refactoring`, árbol limpio, compuesto medido 65/100 (Nielsen 22/40 · técnico 14/20 · craft 18,5/25), CWV lab en §3.1 de la nota del vault (LCP claro móvil 1504 ms / throttled 5628 ms; CLS oscuro escritorio 0,0799).

## Global Constraints (vinculantes para TODAS las tareas)

1. **`RULES.md` entero es vinculante** (47 reglas). Ante conflicto entre este plan y RULES.md: parar y reportar, no elegir en silencio. `task/lessons.md` es lectura obligada para cada implementador ANTES de tocar CSS, jsdom, styled-components o scroll.
2. **Gate por tarea:** `pnpm run ci` (JAMÁS `pnpm ci` a secas — ejecuta el clean-install interno y sale 0 sin correr nada). La cifra literal de salida va en el report. Sin dev server ni procesos pesados en paralelo durante la suite (timeouts falsos documentados; los canarios son los tests de página completa).
3. **Tests de CSS/jsdom:** bug inyectado obligatorio antes de dar el test por bueno (romper→rojo→restaurar→verde; deshacer INVIRTIENDO la edición, nunca `git checkout --`). Reglas dentro de `@media` se atan por `document.styleSheets` (jsdom no evalúa media queries). `createGlobalStyle` NO inyecta bajo jsdom: nada de `GlobalStyles` es verificable por suite. Sin snapshots.
4. **i18n:** paridad es/en en el mismo commit; claves nuevas con su candado; centinelas de máquina (p. ej. `POR_COMPLETAR`) no se traducen ni se tocan. Cero afirmaciones de negocio nuevas en el copy: nada que el dueño no haya confirmado.
5. **Estilos:** tokens de tema obligatorios; literal nuevo exige docblock con porqué; animar solo `transform`/`opacity` (excepciones existentes documentadas); `prefers-reduced-motion` cubierto en todo lo nuevo; todo `<svg>` inline nuevo con `width`/`height`/`flex: none` propios.
6. **Decisiones de Fase 0 (vault §5) son vinculantes:** identidad «proyecto creativo»; línea C del hero (texto exacto en Task 14); `hero.support` fuera del pliegue; tema = piel con contenido unificado; `prefers-color-scheme` inicial + anti-flash; CTAs de Features a `#contact`; `/en` no indexable; claves fósiles se conservan documentadas; numeración honesta; `sizes` móvil solo Story; radios de tarjeta 16px; `overshoot` identidad sancionada; kicker con voz en Features. Los datos D-D/D-B pendientes NO se inventan: `POR_COMPLETAR` se queda donde está.
7. **Git:** un commit temático por tarea como mínimo, mensajes con prefijo convencional en español (estilo del repo). **PROHIBIDO push.** Prohibido `git checkout --`/`git restore` sobre ficheros con trabajo sin commitear.
8. **Verificación visual:** todo cambio visual se mira en navegador real con frames (playwright-cli; el build `out/` se puede servir por interception o `npx serve out -l 31xx`). NO arrancar `pnpm dev`; no tocar el navegador del usuario; `document.visibilityState === "visible"` antes de medir. Lo no visto se declara pendiente, no se reporta como visto.
9. **Assets:** el pipeline de cada escena lo define SU manifest (`Image.resize(LANCZOS)` + `save WEBP method=6`; la CALIDAD es por escena, se decide midiendo PSNR sobre el compuesto). Donde exista test byte a byte, se actualiza con la evidencia, no se relaja.
10. **Ámbito:** ninguna tarea toca `netlify.toml` command, `.github/workflows/` (salvo Task 24 donde se indica), `.claude/`, ni hace cambios de arquitectura no listados. Server-side (Route Handlers, middleware…) prohibido: `output: "export"`.

## Verificaciones intermedias del orquestador (no son tareas)

- **Gate F2** (tras Task 13): re-medición CWV lab de los 5 escenarios del baseline §3.1 + crítica impeccable intermedia. Los números van al ledger.
- **Gate F4** (tras Task 18): crítica impeccable intermedia.
- **Cierre:** review final de rama (Opus) → una fix wave → re-review → gate completo → graphify → re-medición formal completa + CWV → vault.

---

## Task 1 — Navegación accesible: sección activa y grupo de idioma

**Objetivo:** el navbar (escritorio y hoja móvil) señala la sección activa con `aria-current`, y el selector de idioma tiene semántica correcta.

1. Sección activa: los enlaces de sección del navbar y de la hoja reflejan la sección visible con `aria-current="true"` (o `location` para anclas; elegir uno y documentarlo). Detección por el motor existente (`useSectionProgress`/IntersectionObserver ya presentes en `src/hooks/` — reutilizar, no crear un observer nuevo). Indicador visual ligado al MISMO estado (token de tema, no color nuevo), animando solo `opacity`/`transform`.
2. Grupo de idioma (`LanguageSelector`): nombre accesible del grupo (p. ej. `role="group"` + `aria-label` i18n) y semántica de los botones coherente (hoy `aria-pressed` con semántica de radio sin nombre de grupo — resolver con `aria-pressed` + grupo etiquetado, o patrón radiogroup completo; documentar la elección en el propio componente).
3. Desplegables del navbar: `aria-haspopup` correcto en los disparadores si falta.
4. Tests: estado activo (mock del observer), nombre del grupo, paridad i18n de claves nuevas. Los tests de estructura del navbar existentes se actualizan sin relajar contratos.

**Aceptación:** cero `aria-current` era el hallazgo (grep hoy = 0); tras la tarea, grep ≥2 consumidores reales y test en verde validado con bug inyectado (quitar el atributo → rojo).

## Task 2 — Skip link y volver-arriba

1. Skip link «Saltar al contenido» como primer elemento enfocable del `body`, visualmente oculto hasta `:focus-visible` (patrón estándar), destino `#main`/landmark principal existente (añadir `id` si falta, sin re-maquetar). i18n es/en.
2. Botón volver-arriba: aparece tras ~2 pantallas de scroll (umbral por token/constante documentada), fijo, área táctil ≥44px, `aria-label` i18n, respeta `safe-area` si Task 13 ya aterrizó (si no, se deja preparado), scroll respetando `prefers-reduced-motion` (instantáneo bajo `reduce`).
3. Ambos con foco visible del sistema del repo. Tests: presencia/orden del skip link, aparición del botón (mock de scroll), reduce.

## Task 3 — Tres cierres pequeños: «Copiar», h1 de la 404, CTA de tarjeta

1. **Feedback de «Copiar»** (panel del formulario de Contact): éxito → confirmación visible + `role="status"` (patrón ya existente en el formulario); fallo de clipboard → mensaje alternativo con la dirección seleccionable. Hoy falla en silencio.
2. **h1 de la 404:** sale del reset global `h1..h6 { font-size: 1em }` con tamaño de título real vía token de tipografía (Typography del repo), sin tocar el reset global.
3. **CTA de tarjeta de Features a ≥14px** (hoy 12px): usar el escalón tipográfico del sistema más cercano ≥14px; verificar contraste AA del estado resultante.
4. Tests de los tres (el de la 404 sobre el componente, no sobre GlobalStyles — jsdom no lo ve).

## Task 4 — Pista de scroll del deck

Spec mínima ya escrita (spec de motion, hueco D5-1): indicio visible de que los decks (Story/Journey) avanzan con scroll — clave i18n `deck.scrollHint` en `common` (es/en), `opacity` como ÚNICA propiedad animada, desvanecimiento al primer avance del deck (estado del deck existente, no listener nuevo), y **no se declara bajo `prefers-reduced-motion: reduce`** (se muestra estático o no se muestra; decidir y documentar). Aria: `aria-hidden="true"` (los raíles ya comunican por otra vía; la pista es visual). Tests: presencia inicial, desvanecimiento al avanzar (mock), ausencia de la animación bajo reduce vía styleSheets.

## Task 5 — `aria-busy` y spinner en el cambio de tema

El toggle de tema dispara un viaje (`useThemeScrollReset`) con hasta ~3 s de silencio. Entrega:

1. `aria-busy="true"` en el botón mientras el viaje+cruce dura, retirado al asentarse. **PROHIBIDO `disabled`** (lección 2026-08-04: roba el foco).
2. El spinner huérfano de `Button` se conecta como indicador visible durante ese estado (cierra el deferred «spinner muerto»). Si al integrarlo el spinner resulta inviable ahí (p. ej. el IconButton no lo soporta sin cirugía), se documenta y se entrega solo `aria-busy` + indicador visual mínimo (opacity), reportándolo como desviación.
3. Test: `aria-busy` presente durante el estado y ausente después; foco permanece en el botón (aserción sobre la AUSENCIA de `disabled`, la causa — no el síntoma).

## Task 6 — Candado del deck accesible y salida de pertenencia en Story

1. **Candado del deck con lector de pantalla:** hoy el deck lee sus diapositivas completas en orden por accidente (veredicto favorable medido en la auditoría). Escribir el test que FIJA ese contrato (orden del DOM de las diapositivas + ausencia de `aria-hidden` sobre el contenido textual de cada una) para que no se rompa en silencio.
2. **Salida de pertenencia:** el cierre de Story ofrece el enlace a Discord (grupo Comunidad de `NAV_GROUPS`, cero URLs nuevas), en ambos temas, como enlace real con PRESS del vocabulario. i18n es/en.

## Task 7 — Micro-perf sin riesgo

1. Congelar el `scale` del parallax de escenas (`useSceneParallax` — recorrido ±3,6% que fuerza rasterizaciones): el `scale` queda constante; solo se traslada. Verificar que ninguna escena pierde encuadre (los overscan existentes lo absorben; si alguna lo pierde, reportar antes de forzar).
2. Sacar `border-radius` del scrub del deck de Story (único repintado por scroll del repo): el radio deja de interpolarse con el progreso (valor fijo o salto por estado).
3. Retirar la dependencia `uuid` (0 imports en `src/` — verificar con grep antes; si aparece un import, reportar en vez de retirar) + `pnpm install` para el lockfile.
4. Typo EN «Lenguage» → «Language» (con su candado si la clave tiene test de valor).

## Task 8 — Candado de CI de presupuesto de assets

Test Vitest nuevo (corre dentro de `pnpm test`, sin red) sobre `public/`:

1. Presupuesto de bytes por carpeta de escena (fijar el techo en el valor ACTUAL medido + margen ~5%, documentando cada cifra — el objetivo es cazar regresiones, no aspirar).
2. Tope por fichero individual (mismo criterio).
3. Invariante de `srcset`: todo descriptor `w` declarado en el código coincide con el ancho real del WebP al que apunta (leer dimensiones del fichero binario — WebP guarda el ancho en su cabecera; sin dependencias nuevas si es viable con parsing propio documentado; si no es viable sin dependencia, reportar la opción antes de añadirla).

## Task 9 — Anti-flash de tema + `prefers-color-scheme` inicial

Decisiones D-C. Entrega:

1. Script inline en el `<head>` (permitido en export estático vía `app/layout.tsx`) que ANTES del primer pintado resuelve el tema: `localStorage` (clave de `STORAGE_KEYS`) → si no hay, `prefers-color-scheme` → fija el atributo/clase que el ThemeProvider consume. Sin FOUC ni re-maquetación al hidratar.
2. `ThemeProvider` pasa a inicializar desde ese estado (fuente única; el script y el provider comparten la MISMA lógica de resolución — extraerla a una constante serializable, no duplicarla a mano).
3. El CLS 0,0799 del arranque oscuro en escritorio (baseline §3.1) debe quedar en ~0: verificación en navegador real con PerformanceObserver (mismo método del baseline).
4. `theme-color` del `<head>` coherente por esquema (ya existe doble; verificar que sigue correcto).
5. Tests: resolución de tema (localStorage gana a prefers; prefers aplica sin storage), y el candado de que el script está en el HTML exportado (leer `out/` en el gate de la tarea con `pnpm build`).

## Task 10 — Hero visible en el HTML prerenderizado (palanca LCP)

La entrega de mayor impacto en LCP (baseline throttled 5628 ms; umbral 2500). Hoy TODo el hero arranca `opacity: 0` hasta hidratar (760-1570 ms de pantalla vacía). Entrega:

1. La coreografía de carga del hero se re-expresa como **animaciones CSS estáticas** (`@keyframes` + delays) presentes en el CSS del HTML exportado, de modo que texto y fondo del hero sean visibles/animen SIN JavaScript y el `<h1>`/copy sea candidato LCP elegible en el primer pintado. La máquina de fases JS queda para lo que de verdad necesita JS (cruce de tema, decode-gating), sin doble-animación (una propiedad = un dueño; lección `@keyframes` vs transition).
2. `prefers-reduced-motion`: la versión estática colapsa a visible-inmediato (guard en el mismo CSS).
3. Enmienda de la spec de coreografía (`docs/superpowers/specs/2026-07-27-hero-coreografia-carga-tema-design.md` §7.2/§5.3): párrafo fechado explicando el cambio de mecanismo y su porqué (LCP), sin reescribir la historia.
4. Verificación en navegador real: con JS deshabilitado el hero entero se ve; LCP re-medido en los escenarios claro escritorio/móvil (esperado: caída sustancial del LCP throttled; cifras literales al report).
5. Tests: estructura (el hero no depende de `data-state` para ser visible en SSR), styleSheets para los keyframes/guards. El E2E visual queda para el gate F2 del orquestador.

**Es la tarea más delicada del plan: Opus, y ante cualquier conflicto con la máquina de fases existente, parar y reportar en vez de forzar.**

## Task 11 — Pista 1600w y recompresión de color de las dos capas caras

1. Generar pista intermedia ~1600px para las escenas 2560w (Features/Journey/Contact, capas que hoy solo tienen 1024/2560), con el pipeline del manifest de CADA escena (LANCZOS + method 6 + calidad de esa escena), actualizando `srcset` y manifests. El descriptor `w` nuevo debe pasar el candado de Task 8.
2. Recompresión de color de `07-geometry.webp` (5,74 bpp) y `01-nebula.webp` (3,37 bpp) de Story: barrido de calidad con PSNR sobre el compuesto (umbral del repo: PSNR ≥ ~48 dB como referencia de la pasada alfa; documentar el elegido), solo si el ahorro es real (>10% del peso de la capa); si no compensa, se reporta con la curva y no se toca.
3. Presupuesto re-medido tras la tarea: peso del tema oscuro móvil (DPR3 emulado) — objetivo ≤3 MB; cifra literal al report y a los manifests.
4. Tests byte a byte de escenas afectadas actualizados con la evidencia nueva.

## Task 12 — `sizes` móvil solo en Story

Decisión D-E. En la escena de Story (storyCosmicBeing) únicamente: `sizes="(max-width: 700px) 340px, 100vw"`; docblock reescrito con la decisión y la fecha; el contrato de test de Story que asevere `"100vw"` se actualiza. Los de Features/Journey/Contact NO se tocan (se re-juzgan tras la 1600w — el orquestador lo hará en el gate F2 con capturas; esta tarea no los toca).

## Task 13 — Safe areas y táctil

1. `viewport-fit=cover` en el viewport meta + `env(safe-area-inset-*)` en las piezas fijas (navbar, hoja móvil, botón volver-arriba, footer si procede) — hoy cero usos.
2. `touch-action: manipulation` en los pulsables (familias PRESS) para eliminar el retardo de doble-tap donde aplique.
3. Tests por styleSheets de las declaraciones nuevas; verificación visual en el gate F2.

## Task 14 — Hero: línea C, retirada del kicker huérfano, `hero.support` a Story

Decisiones D-A. Texto EXACTO (verbatim, con puntuación):

- ES: `Del vacío al infinito: un proyecto para aprender, imaginar y jugar.`
- EN: `From the void to infinity: a project for learning, imagining and playing.`

1. La línea se renderiza bajo la marca, FUERA del `<h1>` (el `<h1>` sigue siendo exactamente `VoidToInfinite` — contrato existente). Escalón tipográfico entre marca y CTA, token del sistema.
2. La clave huérfana `Home.hero.kicker` se sustituye/renombra por la clave nueva de esta línea (sin dejar huérfanas; candado de `locales.test.ts` actualizado).
3. `hero.support` (párrafo «Aunque el infinito…») SALE del hero y pasa a la apertura de Story (antes del primer contenido actual de Story, mismo tono narrativo), en ambos temas — coordinar con la unificación (Task 15): si Task 15 aún no aterrizó, colocarlo en la(s) rama(s) actual(es) sin duplicar el string (una clave, un render por tema si hace falta).
4. El pliegue resultante (marca + línea + CTA dentro del fold a 375×812) se verifica midiendo en navegador real; cifra al report.
5. Tests: hero (estructura y textos), Story (llegada del párrafo), paridad es/en, candados actualizados sin relajar.

## Task 15 — Unificación de contenido, parte 1: Story y Features (tema = piel)

Decisión D-C (enmienda F4). La entrega grande. En Story y Features:

1. **Un solo árbol de contenido** (estructura, copy, salidas) para ambos temas; lo que ramifica por tema es el ARTE (escenas/capas/fondos) y el estilo, no el contenido. La rama con MÁS contenido/salidas es la base canónica (en Features: la clara con h2+tesis+intro; en Story: evaluar cuál — documentar la elección en el commit).
2. **Features gana además su kicker con voz** (decisión D-E): un kicker con voz propia (no genérico; propuesta del implementador, sin claims de negocio nuevos, revisado en la review), segundo kicker sancionado junto al de Story. h2 con tesis + intro visibles en AMBOS temas.
3. Numeración honesta aplicada de paso si el árbol lo toca (fuera «Paso» de los pilares de Story; fuera el 01/02/03 decorativo de Features) — si esta tarea ya lo resuelve, Task 21 se cierra como subsumida.
4. `HomeSections.test.tsx` (contrato de estructura COMPLETA por tema) se actualiza a la estructura unificada — el candado sigue afirmando la lista entera, ahora idéntica en contenido para ambos temas.
5. Los tests de contraste por tema siguen midiendo contra el fondo/arte REAL de cada tema (la unificación de contenido no unifica fondos).
6. Verificación visual en ambos temas (frames reales) del resultado; capturas al workspace.

**Opus. Si la unificación revela una decisión de contenido que el plan no cubre (p. ej. qué versión de un párrafo divergente gana), el implementador la lista en el report con su elección razonada — la review la arbitra; solo se escala al humano si hay claim de negocio en juego.**

## Task 16 — Unificación, parte 2: Journey y Contact

1. Journey: paridad de contenido entre temas (los 6 pasos claros conectados con la numeración real que Journey SÍ conserva; el deck oscuro y el camino claro cuentan lo mismo con arte distinto).
2. Contact: experiencia única — formulario con validación + panel de dirección copiable en AMBOS temas (hoy el chip solo existe en una rama); salidas Discord/GitHub presentes en ambos; un solo árbol de copy.
3. `min-height: 50dvh` de Contact claro resuelto contra su docblock (dice 100dvh): decidir cuál es el correcto MIDIENDO (viewport corto y largo), corregir el que esté mal (código o docblock) con la medición en el commit.
4. Mismos candados que Task 15 (estructura, contraste por tema, i18n).

## Task 17 — El cambio de tema conserva la posición + paridad de motion del panel/hoja

1. Cambiar de tema fuera del hero NO devuelve a `top: 0`: la sección visible se conserva (por ancla de sección o restauración de scroll tras el cruce; integrarse con `useThemeScrollReset` y el `aria-busy` de Task 5). Con contenido unificado (Tasks 15-16) el layout ya no re-maqueta, así que la restauración es estable.
2. Paridad de motion entre panel de escritorio y hoja móvil: asimetría entrada/salida 180/120 ms y cierre `scale(0.97)` en ambos (valores del vocabulario).
3. Tests: restauración (mock), styleSheets para los valores de motion; verificación real en el gate F4.

## Task 18 — Privacidad radical a la superficie (M5)

La única prueba sostenible del sitio con el código delante: **cero peticiones a terceros, cero analytics, cero cookies de rastreo** (verificable en el propio repo y en el baseline CWV: solo requests al origen). Entrega:

1. Una línea visible cerca del formulario de Contact (ambos temas, es/en), factual y verificable — sin superlativos: p. ej. ES «Navegar por esta web no envía ningún dato tuyo a terceros.» EN «Browsing this site sends none of your data to third parties.» (el implementador puede afinar la redacción sin añadir claims).
2. Coherencia con las páginas legales (que ya declaran el tratamiento del correo): la línea no contradice nada de `/privacidad`.
3. Test de la clave y paridad; test-candado opcional que falle si aparece un hostname externo en `src/` (grep de `https?://` fuera de allowlist `links.ts` — si resulta frágil, documentar y omitir).

## Task 19 — Motion core: D7 terminado, hovers unificados, curva propia, EXIT

Spec de motion (pasos 4-9 pendientes) + adenda Emil. Todo por `vocabulary.ts`/tokens:

1. Terminar D7: las 7 piezas hijas de Story (`Story.tsx` reveals internos) y las de Features pasan de 640 ms/`standard`/22px a 480 ms/`decelerate`/16px — padre e hijo con la misma gramática. (Coordinar con el estado post-Task 15: los selectores pueden haber cambiado; la regla es semántica, no de líneas.)
2. Unificar `transition` de hover `base`→`fast` en los puntos inventariados por la spec (Story/Features hover, `features.layers`, `box-shadow` de `Card`).
3. Curva propia de REVEAL: `cubic-bezier(0.23, 1, 0.32, 1)` como token nuevo del vocabulario (nombre semántico), sustituyendo a `decelerate` en los REVEAL (no en el resto); `REVEAL.stepMs` 80→60.
4. Concepto `EXIT` en el vocabulario: `DECK.exitDurationMs: 200` (~0,6× del enter) aplicado a las salidas de diapositiva del deck.
5. `hoverGuard` sobre las reglas de hover que sigan sin guard táctil (inventario por grep `:hover` fuera de `@media (hover: hover)`; las 12 familias PRESS ya lo tienen).
6. Tests: tokens nuevos consumidos (grep-test), styleSheets de las reglas migradas, reduce intacto. QA en cámara lenta queda declarado para el cierre (ojo humano).

## Task 20 — Motion resto: AMBIENT, StoryCosmicBeing, desplegable del navbar

1. Colapso AMBIENT: de 5 valores a 3 (la spec lo deja a juicio del ejecutor: elegir los 3 con más consumidores reales, mapear el resto, documentar en `vocabulary.ts`).
2. `StoryCosmicBeing` a `depth` 1,0: `scrollAmp` 190 → el valor de sus hermanas (32), verificando en navegador real que la escena no pierde su carácter (captura antes/después al workspace; si el cambio la aplana de forma evidente, proponer valor intermedio en el report con ambas capturas).
3. Desplegable del navbar: `transform-origin` correcto, cierre con `scale(0.97)`, asimetría 180/120 ms («cuatro líneas» según la spec).
4. Tests por styleSheets; reduce cubierto.

## Task 21 — Numeración honesta (si no quedó subsumida en Tasks 15-16)

Verificar el estado tras la unificación: fuera «Paso» de los pilares de Story, fuera el 01/02/03 decorativo de Features, Journey conserva su numeración real y la rama clara la conecta con sus 6 pasos. Si Tasks 15-16 ya lo dejaron así, esta tarea se cierra como SKIPPED-subsumida con el grep de evidencia; si no, se aplica aquí con sus tests.

## Task 22 — Tipografía de lectura: rejilla de Features, línea del deck, subtítulo del hero

1. Romper la tercera rejilla consecutiva `auto-fit+minmax` (M4): Features claro cambia de gramática de layout (propuesta del implementador coherente con el mockup/arte: lista con jerarquía, asimetría, o bento — sin librerías). Story/Journey conservan la suya.
2. Cuerpos del deck a longitud de línea legible: tope ~70-75ch a 1280 (hoy 91-110ch), token/`max-width` del sistema.
3. `line-height` del subtítulo del hero: de 1,2× al escalón del sistema para cuerpo (~1,4-1,5), verificando que el pliegue de Task 14 no se rompe (re-medir fold 375×812).
4. Tests de las declaraciones; verificación visual al cierre.

## Task 23 — Radios de tarjeta a 16px + `overshoot` sancionado

1. Tarjetas de 26px → token de radio 16px (donde el token exista; si el token actual ES 24-26, ajustar el token con docblock y verificar consumidores uno a uno con grep — cambio de token es cambio global: listar los afectados en el report).
2. `overshoot` documentado en `DESIGN.md` como excepción sancionada (identidad, único consumidor navbar) — mismo formato que el cristal del navbar.
3. Tests de radio actualizados; verificación visual (tarjetas claro/oscuro).

## Task 24 — Gobernanza horizontal: regla dura + detector en CI

El hallazgo sistémico (sistema vertical sin mecanismo horizontal):

1. Regla nueva en `RULES.md` (sección Estilos): toda `transition`/`animation` nueva usa token de tema o `vocabulary.ts`; un literal nuevo exige docblock con porqué. Redacción breve, estilo de las 47 existentes.
2. `detect.mjs` (el detector del skill impeccable, ya usado a mano) se engancha como script del repo (`scripts/` o `tools/`) con allowlist DOCUMENTADA de excepciones sancionadas (gradient-text de BrandName, overshoot, cristal, side-stripe legal…), y entra en `pnpm run ci` como paso no interactivo con exit code. Si `detect.mjs` no es vendible al repo (licencia/acoplamiento al skill), escribir un detector propio mínimo con las MISMAS familias que hoy están a cero + las sancionadas — documentar la elección.
3. El gate completo debe seguir pasando (obviamente: con el detector dentro y el repo actual limpio, exit 0).

## Task 25 — Documentación del repo al día (deriva + decisiones F0)

1. Los 12 puntos de deriva documental del plan §6: `DESIGN.md` §9 (nav móvil y formulario resueltos; 2.4.11→1.4.11; cuarta excepción de `filter` de ScCta documentada), `docs/qa-3d-pendiente.md` (casillas de §1-§7 obsoletas neutralizadas sin reescribir historia, duplicados señalados, cifra del §6 corregida a 49-50), cifra de `infinite` reconciliada (32), `check-spelling`: añadir diccionario `es` a la config de cspell y RE-MEDIR (si baja a ruido razonable, documentar; si sigue roto, documentar el estado con la cifra nueva — NO se añade al gate en esta tarea).
2. `PRODUCT.md` §10 actualizado con las 13 decisiones de F0 (respondidas) y los datos aún `_por completar_` (D-D/D-B) tal cual; claves fósiles documentadas como roadmap (decisión D-B).
3. `PRE-LAUNCH-QA.md` §6 sincronizado con el ledger de la implementación anterior (los ítems ya verificados con Playwright se marcan con su evidencia) y con lo que esta implementación añade.
4. Cero afirmaciones sin fuente; todo dato con su medición o su enlace.

---

## Task 26 — CTA de Features con AA en las seis combinaciones (encargo directo del dueño, 2026-08-10)

Seguimiento de la deuda que la Task 3 midió y documentó sin resolver (entrada de «Deuda conocida» en `RULES.md` y describe «Task 3: CTA de tarjeta de Features a >=14px» en `Features.test.tsx`, con los seis ratios exactos). El problema de fondo: `ScCta` (`src/components/sections/Features/Features.tsx`) resuelve su color de reposo con `accentColor(theme.data, $key)` — paso 600 de `palette.primary`/`palette.secondary`, o `FEATURES_GAMING_ACCENT` para «gaming» — y `palette` es COMPARTIDA entre `themes.light`/`themes.dark` (`src/theme/themes.ts`), así que un único color de la rampa no puede pasar AA (4.5:1, texto de 14px) a la vez sobre `semantic.surface` claro (blanco de `ScCardSurface`) y sobre `semantic.bg` oscuro. Medido: learning 3.02/5.90 · imagination 3.50/5.08 · gaming 3.98/4.47 (claro/oscuro).

**Requisito:** las SEIS combinaciones (3 tarjetas × 2 ramas) pasan AA ≥4.5:1 medido con `contrastRatio` (`src/theme/tokens/contrast.ts`) contra el fondo real de cada rama — y también en el estado HOVER (hoy `accentColorHover`, paso 700: medir sus seis combinaciones y cubrirlas igual; un hover ilegible es el mismo defecto).

**Vía recomendada (a):** resolución del acento POR RAMA — en claro un paso más oscuro de la misma rampa (700/800, el que pase midiendo), en oscuro conservar o aclarar (gaming necesita subir de 4.47). Es el precedente del propio componente: el número del badge ya resolvió este mismo problema con el paso 700 sobre su fondo mezclado (lección 2026-08-06). Mantener la distinción por tarjeta (learning/imagination/gaming siguen siendo tres acentos distintos) y no introducir una segunda escala de color. Las vías (b) píldora con fondo tintado o (c) refuerzo con subrayado solo se toman si (a) resulta imposible sobre la rampa existente (ningún paso pasa AA sin perder la identidad del acento) — en ese caso, reportar la medición que lo demuestra y aplicar la alternativa con el mismo rigor de medición.

**Entrega:**

1. Resolución por tema en `ScCta` (reposo y hover), documentada en el propio componente con los ratios medidos.
2. El describe documental de `Features.test.tsx` se ACTIVA: aserciones `contrastRatio(...) >= 4.5` para las seis combinaciones de reposo y las seis de hover, reproduciendo la mezcla si algún fondo real es `color-mix` (lección 2026-08-06), validadas con bug inyectado (volver al paso 600 compartido → rojo).
3. La entrada de «Deuda conocida» de `RULES.md` se cierra (se reescribe como resuelta con fecha y ratios finales, sin borrar la historia).
4. Verificación visual en navegador real de las tres tarjetas en ambas ramas (los colores nuevos se miran, no se suponen): capturas al workspace.
5. El contraste del badge y de cualquier otro consumidor de `accentColor`/`accentColorHover` NO se regresa: inventario por grep de consumidores antes de tocar las funciones; si la vía elegida cambia la firma, listar los afectados en el report.

## Task 27 — Retirada de la máquina de fases del stage (encargo directo del dueño, 2026-08-11)

Consecuencia de la Task 10 (commits `865961f..311a167`): `StageProvider.phase` quedó SIN consumidores — la coreografía de copia/navbar es CSS estático, nadie lee la fase, y la red `STAGE_FALLBACK_MS` ya no protege nada (la entrada del navbar es CSS; ninguna página puede quedarse sin él por falta de aviso). Documentado en el docblock de `src/motion/StageProvider.tsx` («ESTADO ABIERTO») y en la §5.5 de la spec de coreografía.

**Objetivo:** retirar la máquina completa, o justificar por escrito por qué se conserva. La retirada es la vía por defecto (código muerto con red de seguridad que no asegura nada); conservarla exige una razón concreta escrita, no inercia.

**Ficheros implicados** (lista del propio docblock): `src/motion/stage.ts`, `src/motion/StageProvider.tsx`, `src/motion/StageProvider.test.tsx`, `app/providers.tsx`, y en `src/components/sections/Hero/HeroBackdrop.tsx` las tres piezas atadas al aviso (`useStage`, `revealedRef`, la dependencia `markBackdropRevealed` de `finishLoad` → pasaría a `useCallback([])`). Más los envoltorios `<StageProvider>` de los tests que montan hero o navbar: `Hero.test.tsx`, `Hero.qa.test.tsx`, `HeroBackdrop.test.tsx`, `hero-story.integration.test.tsx`, `app/home-page.flujo.test.tsx`, `app/providers.test.tsx`.

**Cuidado máximo:** `HeroBackdrop.tsx` es el fichero más delicado del repo (decode-gating + relevo secuencial del cambio de tema). Su comportamiento NO cambia; solo desaparece la notificación. `HERO_CHROME_OFFSET_MS` lo siguen consumiendo `hero.transition.ts` y `Navbar.tsx` desde `@/motion/timings`, no desde `stage.ts` — no debe verse afectado. Al retirar: grep del nombre de cada símbolo retirado incluyendo comentarios y títulos de tests (regla 16 — un comentario que ya no describe el código es peor que ninguno; la Task 10 dejó 4 ficheros de test con comentarios `useStage` obsoletos, ciérralos aquí). La spec de coreografía y `DESIGN.md` reciben su línea fechada si nombran la máquina como viva.

**DoD:** `pnpm run ci` en verde con cifra literal; verificación en navegador real de que la carga del hero y del navbar y el cambio de tema siguen IDÉNTICOS (comparación antes/después con capturas o telemetría); `graphify-out/` fuera del commit.

## Fuera de alcance (NO implementar)

- **Push/PR** (decisión del usuario).
- **Datos D-D/D-B pendientes:** legales (`POR_COMPLETAR` se queda), bloque AEO «¿Qué es VoidToInfinite?» (F3.3/3.5), explicación de VTI-SDK (F3.4) — necesitan hechos del dueño.
- `/en` indexable, hreflang.
- Deck compartido Story/Journey (F5.6 opcional).
- `will-change` dinámico y dynamic import de escenas (F2.6 parcial, recortado por presupuesto de sesión).
- Rama móvil de `sizes` en Features/Journey/Contact (re-juicio tras 1600w, con capturas, en el gate F2 — decisión del dueño si procede).
- QA que exige humano físico: lector de pantalla real (NVDA), dispositivo móvil físico, juicio estético final contra mockup.

## Verificación final (orquestador, no tarea)

1. Review final de rama (Opus, paquete completo) → UNA fix wave → re-review scoped.
2. Gate completo `pnpm run ci` sin procesos pesados + `pnpm build` + spot-check de `out/`.
3. `graphify update .`
4. QA Playwright integral con frames reales (ambos temas, móvil+escritorio, sin-JS, reduce emulado) + capturas.
5. Re-medición CWV (5 escenarios del baseline) + re-medición formal `$impeccable critique` (protocolo dual-agent completo, snapshot con trend).
6. Vault: Registro fechado, estado del plan estratégico actualizado, specs nuevas si las hubo; memoria de proyecto.
