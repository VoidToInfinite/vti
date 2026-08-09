# Plan — Implementación por fases de la auditoría premium (2026-08-08)

Implementa los hallazgos P0/P1/P2 de las auditorías del 2026-08-08 (mobile-first + premium emil/impeccable/tasteskill). Fuentes: vault `01-Projects/vti/typescript/investigacion/ 2026-08-08-auditoria-ui-ux-mobile-first.md` y `2026-08-08-auditoria-premium-craft.md`, specs `2026-08-08-lenguaje-de-movimiento-unificado-spec.md` (con adenda Emil) y `2026-08-08-mobile-first-spec.md`.

## Global Constraints (vinculantes para TODAS las tareas)

1. `RULES.md` entero es vinculante. En particular: regla 17 (tokens, cero literales fuera de `*.layers.ts` sancionados), 18 (solo `transform`/`opacity`; excepciones documentadas), 19 (`scroll-snap` prohibido), 20 (SVG con width/height/flex:none), 27 (nunca `disabled` por la propia activación), 28 (i18n paridad es/en en el MISMO commit), 30 (centinelas), 33-42 (testing; **regla 34: todo test de CSS/jsdom se valida con bug inyectado — ciclo rojo→verde documentado en el informe de la tarea**), 43-47 (DoD).
2. Cada sección de la home tiene DOS ramas de tema (claro/oscuro). Todo cambio visual considera ambas y dice explícitamente si toca una o las dos.
3. `prefers-reduced-motion`: cobertura existente se CONSERVA; toda animación/transición nueva lleva su guard (incluidos `transition-delay`).
4. Sin librerías nuevas. Sin cambios de IA/slugs/anclas/nombres de campos (§11.F tasteskill).
5. Tests: solo de los componentes tocados (política del repo). La suite completa corre como gate de regresión al final de cada tarea: `pnpm run ci` — puede dar timeouts espurios en `app/home-page.flujo.test.tsx`/`HomeSections.test.tsx` bajo carga de máquina (documentado en `task/lessons.md` 2026-08-04): si pasa aislado (`pnpm vitest run <fichero>`), se reporta así, con las dos salidas literales.
6. jsdom no hace layout ni evalúa `@media`; `createGlobalStyle` no inyecta nada en jsdom (lecciones). Lo no testeable en jsdom se declara y queda para la verificación Playwright del orquestador.
7. Commits: uno o más por tarea, mensaje corto con prefijo (`fix:`/`feat:`/`refactor:`/ `docs:`), en español, sin push.
8. Un comentario que deja de describir el código se corrige en el mismo commit (regla 16).
9. Backticks PROHIBIDOS en comentarios dentro de templates de styled-components (regla 23).

---

## Task 1 — Contact: formulario honesto de extremo a extremo (P0)

**Ficheros:** `src/components/sections/Contact/Contact.tsx`, `src/i18n/locales/{es,en}/home.json`, tests de Contact.

1. `Contact.tsx:920` (aprox): `useState(() => links.email.replace(/^mailto:/, ""))` → `useState("")`. El placeholder existente («tu@correo.com») pasa a verse.
2. Conectar el error que `Field`/`Input` ya soportan (`Input.tsx:144-152`): estado de error con mensaje i18n nuevo (es: «Escribe un correo válido.» / en: "Enter a valid email.") si el submit ocurre con valor vacío o sin formato email (validación propia además de la nativa; NO bloquear la nativa). El mensaje va con `role="status"` (no `role="alert"` para no interrumpir; el skill impeccable pedía 3.3.1 + 4.1.3 en el mismo commit).
3. Tras `window.location.assign(mailto)`, revelar un panel persistente (no toast) con la dirección `links.email` en texto plano y un botón «Copiar» (`navigator.clipboard`, con fallback silencioso si no existe), SIN afirmar que nada se envió (decisión D13 se respeta). Claves i18n nuevas con paridad es/en (es: «Si no se ha abierto tu aplicación de correo, escríbenos a» + «Copiar dirección» / en equivalente). El panel también resuelve el caso "mailto sin cliente = botón muerto".
4. El botón de envío NUNCA se deshabilita (regla 27).
5. Tests (Contact.test.tsx): campo arranca vacío; submit con vacío/ inválido muestra el mensaje con `role="status"`; submit válido revela el panel con la dirección; el botón no tiene `disabled`. Ciclo de bug inyectado para las aserciones de CSS/atributos.

## Task 2 — 404 con salida (P0)

**Ficheros:** `src/components/legal/NotFoundContent.tsx` (y/o `app/not-found.tsx`), su test.

1. Añadir un enlace claro de vuelta a la home (`next/link` a `/`, texto i18n nuevo con paridad: es «Volver al inicio» / en "Back to home") dentro del `<main>` existente. NO montar Navbar/Footer completos (la 404 es Server Component con metadata propia; mantenerlo simple y sin arrastrar providers) — un CTA basta para salir de la trampa. OJO: la 404 renderiza fuera de I18nProvider? VERIFICAR cómo obtiene sus strings hoy (`NotFoundContent.tsx`) y seguir el mismo mecanismo exacto.
2. `not-found.tsx:20-22` documenta `robots:{follow:true}` "por si la plantilla incluye navegación": actualizar el comentario — ahora la incluye (regla 16).
3. Test: el enlace existe, apunta a `/`, y es un `<a>` real.

## Task 3 — Reveals con fallback sin-JS (P1 robustez)

**Ficheros:** `src/theme/GlobalStyles.tsx`.

1. Añadir al final del global: bloque `@media (scripting: none)` que fuerza `[data-revealed] , [data-revealed] * { opacity: 1 !important; transform: none !important; }` y equivalentes para los atributos de reveal que existan de verdad — INVENTARIAR primero los atributos/selectores reales que usan los reveals (`useReveal`, `Story.tsx:288-299`, `Features.tsx:344-357`, `Contact.tsx:203-215,690-702`) y cubrirlos todos.
2. Docblock: por qué existe (export estático: sin JS el IO nunca enciende el contenido), soporte del media feature `scripting` (Chrome 120+/Firefox 113+/Safari 17+; en navegadores sin soporte el bloque se ignora y el comportamiento actual se mantiene) y por qué no es testeable en jsdom (createGlobalStyle no inyecta; lección 2026-07-25) — verificación: Playwright con JS deshabilitado, a cargo del orquestador.
3. Sin test unitario posible: la tarea lo declara en su informe (no inventar un test verde que no verifica nada).

## Task 4 — Tres S de P1: scroll-padding, marca 44px, Eye fetchPriority

**Ficheros:** `src/theme/GlobalStyles.tsx`, `src/components/layout/Navbar/Navbar.tsx`, `src/components/scenes/eye/Eye.tsx`, tests de Navbar y Eye.

1. GlobalStyles: `scroll-padding-top: var(--nav-height)` en `html` (WCAG 2.4.11; hoy solo existe `scroll-margin-top` en `:where(section[id])`). Docblock con el porqué.
2. `ScBrandLink` (`Navbar.tsx:361-367`): `min-height: 44px` (ya es inline-flex centrado; no cambia el aspecto, agranda el área táctil). Test de declaración (getComputedStyle contra el literal declarado, no geometría — jsdom no hace layout), con bug inyectado.
3. `Eye.tsx:141-142`: paridad con `Aura.tsx:160-161` — la capa candidata a LCP (VERIFICAR en Aura cuál es el criterio exacto: la capa `field`/primera) recibe `fetchPriority="high"`, el resto `loading="eager"` se mantiene como esté en Aura tras su arreglo (leer Aura y replicar el patrón exacto, incluida la forma del comentario). Test espejo del de Aura si existe.

## Task 5 — Copy: CTA honestos ES, rayas EN, typo, candado

**Ficheros:** `src/i18n/locales/{es,en}/{home,common,legal}.json`, `src/components/sections/Story/Story.tsx` (línea ~1281), `src/i18n/locales/locales.test.ts`, tests que asserten los textos cambiados.

1. ES `home.json`: los 3 CTA de Features «Empieza a aprender/imaginar/jugar» → «Explora el aprendizaje» / «Explora la imaginación» / «Explora el juego» (alinea con EN "Explore Learning/Imagination/Gaming"; cierra la divergencia #3 de PRODUCT.md §4). Actualizar los tests que aserten esos textos.
2. EN `home.json`: las 5 em-dashes (inserciones de traducción; 2 en etiquetas ARIA) → reescribir con dos puntos, coma o punto, fieles al ES equivalente clave a clave.
3. EN `legal.json:145`: el inciso con raya abierto y sin cerrar → cerrarlo o reescribir sin raya (las rayas del ES legal NO se tocan: incisos RAE legítimos, identidad de lengua).
4. `Story.tsx` ~:1281 `{pillar.number} —`: el separador sale del JSX a una clave i18n o a una constante compartida SIN raya (p. ej. «·» NO — usar el patrón que ya use el deck si existe, o simplemente `{pillar.number}` con el espaciado en CSS). Decidir mirando el render real del deck y documentar.
5. EN `common.json`: `Common.Lang.title` "Lenguage" → "Language".
6. **Candado nuevo en `locales.test.ts`**: (a) cero `—` y `–` en TODOS los valores de `{es,en}/home.json` y `common.json` (los legal.json ES quedan exentos y documentado por qué; EN legal también exento salvo que la tarea los deje a cero — decidir y documentar); (b) ración de `·`: ningún valor con más de 1 middot. Validar el candado con bug inyectado (añadir una raya a un JSON → rojo → quitar → verde).

## Task 6 — Salidas en las dos ramas: grupo community (P1)

**Ficheros:** `src/config/navigation.ts`, `src/config/navigation.test.ts` (o donde esté su test de contrato), Navbar/Footer tests que asserten grupos/columnas.

1. Añadir grupo `community` a `NAV_GROUPS` con Discord (`links.discord`) y GitHub (`links.github`), etiquetas i18n nuevas con paridad (es: «Comunidad», «Discord», «GitHub» — los nombres propios no se traducen; título de grupo es «Comunidad» / en "Community"). Los dos son externos: verificar que el mecanismo de NAV_GROUPS soporta externos (el SDK ya lo es — replicar su forma exacta con target/rel/aviso de pestaña).
2. Navbar y Footer los renderizan solos si consumen NAV_GROUPS — VERIFICAR y, si el Footer construye sus columnas aparte, añadir la columna ahí también (con el mismo patrón de enlaces externos del SDK).
3. Actualizar los tests de contrato cerrado (regla 40: se actualizan, no se relajan): el recuento de grupos/enlaces sube. Las tarjetas de Discord/GitHub del Contact oscuro NO se tocan.
4. Consecuencia declarada: el desierto de conversión oscuro gana salidas en el navbar de escritorio y el footer de ambas ramas; en móvil seguirá sin nav hasta la Task 10.

## Task 7 — Statement mobile-first: 24px exactos a 320 (P1)

**Ficheros:** `src/components/sections/Story/Story.tsx` (statement, ~:214-226 y su contenedor), su test.

1. `padding-inline` del cartel pasa a mobile-first: `space[4]` (16px) base, `space[6]` (32px) desde `sm` (600px), declarado UNA vez (propiedad personalizada o token compartido que la fórmula ya lee — `Story.tsx:214-216` lee el pad: mantener una única fuente).
2. La fórmula del tamaño NO se toca; con pad 16: `(320−32)/12 = 24,00px` — exactamente el suelo. Regla 24: el comentario declara la desigualdad y la unidad del término nuevo.
3. Actualizar el comentario que admitía perforar el suelo (regla 16) y el de `DESIGN.md` §9/deuda si procede se hace en Task 14 (no aquí).
4. Test: asevera el padding base y el del breakpoint por `document.styleSheets` (regla 36, jsdom no evalúa @media) con la forma del selector correcta (regla 35), validado con bug inyectado. Aritmética 320/375/599/600 en el informe.

## Task 8 — vocabulary.ts + limpieza de tokens de motion

**Ficheros:** `src/motion/vocabulary.ts` (nuevo) + `vocabulary.test.ts` (nuevo), `src/theme/tokens/motion.ts`, `src/theme/tokens/system.test.ts`.

1. Crear `src/motion/vocabulary.ts` SIN `"use client"`, con los grupos y valores EXACTOS de la spec del vault + adenda Emil:
    - `REVEAL = { durationMs: 480, easing: "cubic-bezier(0.23, 1, 0.32, 1)", shift: "16px", stepMs: 60 }`
    - `DECK = { slideDurationMs: 320, slideShift: "40px", railDurationMs: 200, scrubMs: 320, sceneDepthShift: "6dvh", exitDurationMs: 200 }`
    - `PRESS = { durationMs: 100, easing: "cubic-bezier(0.23, 1, 0.32, 1)", hoverLift: "-2px", activeScale: 0.98, hoverGuard: "(hover: hover) and (pointer: fine)" }`
    - `AMBIENT = { breathMs: 5400, pulseMs: 6500, floatMs: 9000, orbitMs: 20000, orbitSlowMs: 40000 }` Docblocks: origen de cada valor (fichero:línea del código donde ya domina) + por qué las curvas son literales propios y NO claves nuevas de `motion.easing` (contrato cerrado, 96 consumos; misma frontera que `timings.ts`).
2. `vocabulary.test.ts`: contrato cerrado `toEqual` de los 4 grupos (regla 40).
3. Retirar el token muerto `motion.duration.ambient` (0 consumidores verificado) de `tokens/motion.ts` y de `system.test.ts` en el mismo commit. El comentario de `Story.tsx:153` que lo menciona («el más cercano, ambient, es 1500ms») se actualiza (regla 16).
4. NADA consume todavía vocabulary.ts en esta tarea (cero riesgo visual); los consumidores llegan en Task 9.

## Task 9 — Craft de interacción: :active, hover guards, hovers unificados

**Ficheros:** `LanguageSelector`, `Navbar` (ScNavTrigger/ScNavLink/ScNavPanelLink + panel), `Footer` (footerLinkStyles), `legalPage.parts.tsx` (ScBackLink/ScTocLink), `Card.tsx`, `Contact.tsx` (ScCardLink), `Story.tsx` (ScPillarCard + hover 653-657), `Features.tsx` (ScCardBorder + hover 445-449 + features.layers.ts:76), `Button.tsx` (curva del press), tests de cada componente tocado.

Todos los valores desde `vocabulary.PRESS` (importar; primera adopción real):

1. `:active { transform: scale(0.98) }` (0.97 en botones de texto pequeños si el existente de Button usa 0.98 — replicar la escala que Button ya usa) + `transition: transform PRESS.durationMs PRESS.easing` añadido a la lista existente + guard `reduce` que anule la transición nueva, en las ~10 familias pulsables sin él (lista de Emil, verificar cada una): LanguageSelector, ScNavTrigger, ScNavLink, ScNavPanelLink, footerLinkStyles, ScBackLink, ScTocLink, Card, ScCardLink (Contact), ScPillarCard (Story), ScCardBorder y ScCta (Features).
2. Hovers que MUEVEN (translateY/scale) pasan bajo `@media (hover: hover) and (pointer: fine)` — usar `PRESS.hoverGuard` interpolado. Solo los que mueven; los de color pueden quedarse (sticky-hover de color es inofensivo). Inventariar y listar en el informe cuáles se guardan y cuáles no, con el porqué.
3. Unificar la duración del hover-lift de tarjetas: `Story.tsx:653-657` y `Features.tsx:445-449` de `duration.base` (200ms) → `PRESS.durationMs` (100) + `PRESS.easing`; `features.layers.ts:76` 150ms → PRESS; `Card.tsx:49-53` añade `box-shadow` a su lista de transition (hoy la sombra salta).
4. Button.tsx: la curva del press (`transform 100ms cubic-bezier(0.4,0,0.2,1)`) → `PRESS.easing`. `background-color` se queda con `standard`.
5. El desplegable del navbar (`ScNavPanel`): `transform-origin: top left`; estado cerrado añade `scale(0.97)` al translateY existente; asimetría: base (cierre) 120ms, abierto 180ms, con la curva PRESS.easing. `visibility` sigue en la lista (patrón actual se respeta).
6. Tests: cada declaración nueva con su aserción de texto CSS (reglas 35-38) y bug inyectado; el hover guardado se asevera por `document.styleSheets` (regla 36).
7. QUEDA FUERA: detach 480→320+histéresis (identidad D7-bis, decisión), Sol :active (mascota = identidad), spinner muerto de Button (se documenta en Task 14, decisión de retirarlo aparte).

## Task 10 — Hoja de navegación móvil (P1 — la entrega que cambia el método)

**Ficheros:** `src/components/layout/Navbar/` (componente nuevo o sección del existente), `src/config/navigation.ts` (solo consumo), tests del navbar; NO tocar decks.

Spec: vault `2026-08-08-mobile-first-spec.md` §Spec por pieza + orden #4. Resumen vinculante:

1. Bajo `md` (768px): la barra muestra marca (44px, ya de Task 4), toggle de tema y un disparador de hoja de 44×44 (icono hamburguesa SVG inline — regla 20: width/height/ flex:none propios). El selector de idioma SE MUDA dentro de la hoja (no hay hueco: 337px de contenido en 343 disponibles a 375).
2. La hoja: panel inferior (bottom sheet) con `max-height: 70dvh`, filas de `min-height: 44px`: las 4 anclas de sección + grupo Descubre (3) + SDK + community (Discord/GitHub, de Task 6) + selector de idioma. `overscroll-behavior: contain`. PROHIBIDO `overflow: hidden` en html/body o ancestros de sticky (regla 21) — el bloqueo de scroll clásico está vetado: cierre al scrollear la página (listener pasivo que cierra) + focus management.
3. Accesibilidad: patrón del panel existente (`visibility` + `inert` sin desmontar, Escape cierra y devuelve foco al disparador, `aria-expanded` en el disparador, foco que sale cierra). Replicar el contrato de teclado del desplegable de escritorio (Navbar.tsx: 502-649), que es la referencia de la casa.
4. Motion: entrada/salida con transform/opacity, duraciones del vocabulary (DECK.railDurationMs 200 para el fade del velo si lo hay; la hoja 180/120 asimétrico con PRESS.easing), guard `reduce` (aparición instantánea).
5. ≥md: disparador y hoja `display: none` (sin desmontar — mismo patrón del panel), la barra vuelve exactamente a su estado actual (idioma en barra). Cero cambios visuales ≥768px.
6. Tests: disparador visible solo <md por styleSheets (regla 36), contrato inert/aria- expanded/Escape (jsdom sí puede: eventos y atributos), filas presentes (anclas + externos con su aviso de pestaña), idioma dentro. Todos los de CSS con bug inyectado. Los tests existentes del navbar que asserten "sin menú móvil" se actualizan (regla 40: la fuente de verdad cambia de verdad).
7. El comentario `Navbar.tsx:378-380` («sin menú móvil en esta entrega») se reescribe (regla 16).

## Task 11 — Dieta de ornamento A: kickers (P2)

**Ficheros:** `Journey.tsx`, `Features.tsx`, `Contact.tsx` (+ sus .parts/.deck si el kicker vive ahí), sus tests; `Story` NO se toca (conserva su kicker con voz).

1. Retirar el render del kicker/overline en: Journey (ambas ramas: «Inspiración»), Features (rama clara: «Características»; en la OSCURA el overline ES el `<h2>` con `forwardedAs="h2"` — NO retirarlo: en su lugar, subirlo de 11px a la variante `h5` o equivalente legible manteniendo `forwardedAs="h2"`, para que el encabezado real deje de ser más pequeño que su cuerpo — esto resuelve también la deuda ALTA de DESIGN.md §9), Contact (ambas ramas: «Contacto»).
2. Las claves i18n de los kickers retirados: se BORRAN de es y en en el mismo commit (regla 28) salvo que otro consumidor las use (grep antes de borrar; si hay consumidor, documentar y conservar).
3. El espaciado que dejaba el kicker se revisa: el h2 no debe quedar descolgado (ajustar el margen del bloque de cabecera si el kicker aportaba separación — mirar el CSS real).
4. Tests: los que asserten los kickers retirados se actualizan; jerarquía de encabezados sigue sin saltos en las 8 combinaciones (hay tests de estructura — verificar).
5. Informe: capturas pendientes de Playwright (el orquestador las hace).

## Task 12 — Dieta de ornamento B: gradientes de texto y ghost-cards (P2)

**Ficheros:** `Story.tsx` (ScAccent + ScStatementThird), `Contact.tsx` (ScAccent + ScCard), `Features.tsx` (ScSpanGaming), `Journey.tsx` (ScQuoteText + ScDisc), sus tests. `BrandName.tsx` NO se toca (el degradado de «ToInfinite» es marca).

1. Acentos de título con `background-clip: text` → color sólido del tema: usar el token de acento que cada sección ya usa para otros elementos (VERIFICAR contraste AA contra el fondo real de cada uno — infraestructura `contrast.ts`; si el token elegido no llega a 4.5:1 medido con la utilidad del repo, elegir el paso de rampa superior que sí llegue, documentando la medición en el test como hace la casa). Al pasar a color sólido, esas piezas ENTRAN al alcance de los tests de contraste — añadir la aserción (cierra el hueco «6 piezas color:transparent fuera del alcance de contrast.ts»).
2. Ghost-cards: `Contact.tsx:198-200` conserva el borde 1px y ELIMINA la sombra de 44px; `Journey.tsx:307-308` (ScDisc) conserva la sombra-glow y ELIMINA el borde 1px. Docblock en cada uno: la regla es borde O sombra, no ambos (impeccable), y por qué se eligió cada lado (el disco es un glow de escena; la tarjeta clara es una superficie).
3. El keyframe del degradado retirado y sus guards `reduce` asociados a los acentos se limpian (grep de usos del gradiente para no dejar CSS muerto — regla 16).
4. Tests con bug inyectado para las declaraciones nuevas.

## Task 13 — Recompresión del canal alfa de los WebP oscuros (P1 bytes)

**PRECONDICIÓN:** no hay `cwebp` en la máquina. Verificar Python + Pillow (el repo ya usó Pillow para el pipeline de capas). Si no hay herramienta viable, la tarea se cierra como SKIPPED declarado con el comando exacto que el usuario puede correr.

1. Alcance: SOLO las capas WebP de las 4 escenas oscuras de sección (`public/scenes/...` — inventariar desde los `*.layers.ts`) cuyo chunk `ALPH` supere el 30% del peso del fichero (medir con parser de chunks en Python; el hallazgo: 47% del total oscuro es alfa lossless).
2. Recompresión: Pillow `save(..., alpha_quality=80, quality=<la que ya tiene el color — leer del manifest de cada escena>, method=6)` — el color NO se recomprime (mismos parámetros del manifest; lección 2026-08-02: la calidad es por-escena). Verificación por fichero: PSNR del canal alfa ≥ 45 dB y PSNR compuesto RGB premultiplicado ≥ 45 dB contra el original; bytes antes/después en tabla.
3. Los originales se preservan en git (working tree — revertible con git). El manifest de cada escena gana una línea: alfa recomprimido, parámetros y PSNR medidos.
4. Tests de layers no cambian (los sizes/srcset no se tocan). El candado de "descriptor w = ancho real" si existe debe seguir en verde.
5. SIN verificación visual humana esta tarea no cierra la casilla de calidad: se declara pendiente de ojo humano en el informe y en PRE-LAUNCH-QA (Task 14).

## Task 14 — Documentación del repo al día

**Ficheros:** `PRODUCT.md`, `DESIGN.md`, `PRE-LAUNCH-QA.md`, `docs/qa-3d-pendiente.md`, `RULES.md` (§Deuda conocida), `PROYECT.md` (§5).

1. `PRODUCT.md` §4/§5/§6/§9: kicker del hero ya no visible (clave huérfana); divergencia #3 es/en cerrada (CTA «Explora…»); nueva situación del formulario (Task 1); rayas EN corregidas (cuarta divergencia, ahora cerrada); grupo community (Task 6).
2. `DESIGN.md`: §5.2 añade la excepción de `filter` del CTA de Contact (sancionada por spec §7.4) O la retira si Task 9/12 la eliminó (decidir según lo implementado); fija la cifra de `infinite` con base de conteo declarada (20 vs 21 — contar tras las tasks, declarar si incluye el spinner de Button y su estado); §9 actualiza las deudas cerradas (statement, encabezado de Features oscuro, aria-busy pendiente...) SIN borrar historia (la corrección se escribe, regla de la casa).
3. `PRE-LAUNCH-QA.md`: ítem 40 corrige "2.4.11"→"1.4.11" donde describe contraste; añade casilla real de 2.4.11 (scroll-padding — hecha, pendiente confirmar en navegador real); añade a §6 las verificaciones humanas nuevas (alfa recomprimido si Task 13 corrió, kickers/gradientes retirados, hoja móvil).
4. `docs/qa-3d-pendiente.md`: cabecera nueva que declara §1-§7 OBSOLETOS (Three.js retirado) y remite al QA vigente de PRE-LAUNCH-QA §6 + la petición de perfil de FPS actualizada (comparar Story 11 capas plus-lighter contra Features 7 capas alfa normal). §8 se conserva.
5. `RULES.md` §Deuda conocida y `PROYECT.md` §5: marcar lo cerrado por estas tasks (statement, Eye fetchPriority...) y añadir lo nuevo aprendido (spinner muerto de Button: decisión pendiente retirar/conectar).
6. Prosa normal, honesta, con cifras literales de los informes de tareas.

---

## Fuera de alcance (decisiones del usuario, NO implementar)

- Rama móvil de `sizes` (canje nitidez — necesita tu ojo), pista 1600w (build de assets).
- `prefers-color-scheme` como tema inicial; anti-flash de tema; hero prerenderizado (roadmap L, entregas propias).
- Composición del hero (mover `hero.support`): terreno de voz del usuario.
- Curva `overshoot`, radios 24-26px, detach 480ms, Sol :active, spinner de Button, numeraciones 01/02/03, destino final de los CTA de Features: decisiones listadas.
- Push y PR.

## Verificación final (orquestador, no tarea)

Playwright (skill `playwright-cli`) sobre dev server y sobre `pnpm build` servido: ambos temas × 375/1280; capturas de hero/secciones/hoja móvil/404/formulario; formulario E2E (vacío→error, válido→panel); hoja móvil (abrir/cerrar/Escape/idioma dentro/sticky intactos); reveals con JS off (Task 3); consola sin errores. `pnpm run ci` + `graphify update .` + vault (séptima entrega) al cierre.
