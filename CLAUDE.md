# CLAUDE.md — vti (VoidToInfinite)

Manual operativo del repo. Escrito para que un agente que entra por primera vez pueda trabajar sin más contexto que este fichero, `RULES.md` y las lecturas obligadas de la sección 3.

## 1. Qué es este proyecto

`vti` es la landing de VoidToInfinite: un sitio estático construido con **Next.js 16 (App Router)**, **React 19** y **styled-components 6** (con `compiler.styledComponents` activado en `next.config.ts`), maquetado en TypeScript estricto. El i18n es **i18next + react-i18next**, síncrono, con los namespaces `common` y `home` cargados en `src/i18n/config.ts`; el namespace `legal` se registra aparte, a nivel de módulo, desde `LegalDocument.tsx` (así no viaja en el bundle de la home). Los tests corren con **Vitest + Testing Library** sobre jsdom. El gestor de paquetes es **pnpm**, fijado por `packageManager: "pnpm@11.10.0"` en `package.json` (Corepack lo resuelve); `engines.node` exige `>=22.4`. El despliegue es a **Netlify**, sirviendo el directorio `out/`.

**Restricción de arquitectura, no detalle de configuración:** `next.config.ts` declara `output: "export"`. Esto significa que **no hay servidor Next en producción**: nada de Route Handlers (`app/api/`), `headers()`/`cookies()` dinámicos, middleware, ISR ni Server Actions. Cualquier funcionalidad que dependa de ejecución en servidor no es viable en este repo tal como está configurado hoy; si una tarea la necesita, es una decisión de arquitectura que se para y se consulta, no algo que se resuelve escribiendo el código de todos modos.

## 2. Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo (`next dev`) |
| `pnpm build` | Build de producción (`next build`, genera `out/`) |
| `pnpm start` | Sirve el `out/` ya construido (`npx serve out`) — no es un servidor Next |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm check-format` | Prettier (escribe / solo lista diferencias) |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm check` | `typecheck + lint + check-format` |
| `pnpm run ci` | `typecheck + lint + check-format + detect-anti-patterns + test` |

**El gate de calidad completo del repo es `pnpm run ci`** (no `pnpm check`, que no ejecuta tests ni el detector). Es el comando que corre `.github/workflows/ci.yml` en cada push a `main` y cada pull request, y el primer eslabón del `command` de `netlify.toml` antes de cada despliegue — pero desde el 2026-09-05 ya no es lo ÚNICO que corren esos dos: detrás del gate van `pnpm build` y `pnpm measure:js` (el workflow los ejecuta como dos pasos propios; Netlify encadena `command = "pnpm run ci && pnpm build && pnpm measure:js"`). El motivo es que el censo del bundle solo se puede contrastar contra el artefacto: el sello de `scripts/home-js-baseline.json` es una función pura sobre el propio JSON, así que un recorte coordinado del censo pasaba `pnpm run ci` en verde. Un `pnpm run ci` local sin build sigue sin verlo, a propósito; lo que ya no puede es ser la última palabra. `scripts/build-pipeline.test.mjs` ata esa secuencia en los dos ficheros. Antes de dar una tarea por terminada, `pnpm run ci` tiene que haberse ejecutado de verdad y su salida literal es la que se reporta — no una suposición de que "seguro que pasa". **Desde el 2026-08-12 (Task 24, plan premium F1-F5, regla 48 de `RULES.md`)** el paso `detect-anti-patterns` (`scripts/detect-anti-patterns.mjs`) corre entre `check-format` y `test`: analiza estáticamente `.ts`/`.tsx` de `src/`/`app/` buscando diez familias de anti-patrones recurrentes (`transition: all`, `ease-in` suelto, degradados repetidos, `!important`, texto con degradado recortado, franja lateral, `border-radius` literal, curvas de rebote fuera de token, kickers y numeraciones repetidas), con una allowlist documentada para lo que el repo ya sancionó — exit code ≠0 si aparece algo nuevo sin sancionar.

Existe además `pnpm check-spelling` (`cspell` sobre todo `.md`/`.ts(x)`/`.js(x)`). **Corregido parcialmente el 2026-08-12 (Task 25):** estaba roto por declarar `locale: es` sin ningún diccionario español real instalado; se añadió `@cspell/dict-es-es` y se amplió el `locale` a todo tipo de fichero (antes solo cubría `.ts(x)`/`.js(x)`, nunca `.md`). Cayó de 111.199 avisos en 264 ficheros a **2.627 en 221** (−97,6%, sobre todo jerga propia del repo sin diccionario). Sigue **fuera de `pnpm run ci`** y del workflow de GitHub Actions a propósito — 2.627 es "ruido razonable" pero todavía demasiado para un gate no interactivo sin curar antes la lista de términos propios. No lo uses como señal de que algo está mal sin revisar primero si el aviso es jerga conocida.

## 3. Lecturas obligadas antes de tocar nada

En este orden, según lo que vayas a hacer:

1. **`task/lessons.md`** — versionado a propósito (`.gitignore` ignora `task/*` salvo este fichero, con la excepción declarada en el propio `.gitignore`). Es el historial de errores ya pagados en este repo, con causa raíz y candado. Antes de pelearte con algo que "se comporta raro" en CSS, jsdom, styled-components o scroll, búscalo aquí primero.
2. **`docs/superpowers/specs/`** — el porqué de cada entrega ya hecha, una spec de diseño por fecha. La spec de la sección que vas a tocar es lectura obligatoria antes de cambiarla: explica decisiones (qué rama de tema hace qué, qué mockup se siguió, qué se descartó y por qué) que el código por sí solo no cuenta.
3. **`docs/qa-3d-pendiente.md`** — QA visual que solo un humano puede cerrar (jsdom no pinta, no hace layout y no evalúa `@media`; ver sección 5). Antes de dar por buena una pieza visual o de movimiento, revisa si ya está aquí como pendiente.
4. **`RULES.md`** — las reglas vinculantes de nombres, estructura, clean code/SOLID, estilos y movimiento, i18n, testing y Definition of Done. Se consulta siempre antes de escribir o mover código, no solo cuando algo falla.
5. **`DESIGN.md`, `PRODUCT.md`, `PRE-LAUNCH-QA.md`** — contexto de diseño, producto y checklist de publicación del proyecto. Si en tu sesión alguno de estos tres todavía no existe en la raíz del repo, no lo inventes ni asumas su contenido: trátalo como pendiente y dilo.

## 4. Mapa del repo en 30 segundos

- **`app/`** — rutas del App Router. **No hay `app/layout.tsx`, y su ausencia es la entrega del 2026-09-06:** el sitio tiene TRES root layouts, uno por documento —`(es)/layout.tsx`, `en/layout.tsx` y `global-not-found.tsx`—, porque dos `<html lang>` distintos exigen dos raíces y un root layout único imponía `lang="es"` también a `/en/*` (P1 de la crítica externa #19, WCAG 3.1.1). Las tres renderizan el MISMO documento, `RootDocument.tsx` (fuentes, script anti-flash, `Providers`, JSON-LD), y comparten `rootMetadata.ts` (`metadataBase` + `viewport`), que cada una re-exporta porque Next solo lee esos exports del fichero de la convención. La 404 vive en `global-not-found.tsx` + `NotFoundRoute.tsx` (ya no en `not-found.tsx`) y necesita `experimental.globalNotFound: true` en `next.config.ts`: sin esa bandera la entrada `/_not-found` vuelve a exigir un layout en el segmento raíz y el build muere. Además: `(es)/page.tsx` (home), `aviso-legal/`, `privacidad/`, `en/`, y la metadata técnica (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`).
- **`src/theme/`** — tokens (`tokens/color.ts`, `space.ts`, `type.ts`, `radius.ts`, `elevation.ts`, `motion.ts`, `glass.ts`, `zIndex.ts`, `grid.ts`, `semantic.ts`), `themes.ts` (claro/oscuro), `ThemeProvider.tsx` y `GlobalStyles.tsx`.
- **`src/motion/`** — `timings.ts`, los números puros de la coreografía del hero (sin `"use client"`, para no invertir la dirección de dependencias hacia las secciones que los consumen) y `vocabulary.ts`. La máquina de fases que vivió aquí (`stage.ts` + `StageProvider.tsx`, decidía **CUÁNDO** arrancaban el navbar y la copia del hero) se retiró el 2026-08-11 (Task 27, plan premium): desde la Task 10, ese mismo día, ninguno de los dos la leía ya —su entrada es `@keyframes` estático— así que se había quedado sin ningún consumidor real. Nadie decide **CÓMO** se anima algo desde aquí — eso vive en cada componente.
- **`src/hooks/`** — el motor compartido de scroll y puntero: `useSectionProgress`, `useSlideDeck`, `useSceneParallax`, `usePointer` (singleton de módulo), `useReveal`, `useScrolled`, `useNavDetach`, `useThemeScrollReset`, `useParallaxLayers`. Antes de escribir un efecto de scroll/puntero nuevo, comprueba si uno de estos ya lo resuelve.
- **`src/components/sections/`** — Hero + las cuatro secciones de la home (`Story`, `Features`, `Journey`, `Contact`), orquestadas por `HomeSections.tsx`. Cada sección se ramifica por tema con vehículo y arte distintos (el copy es único desde las Tasks 15-16, ya no ramifica): ver sección 5, punto 1.
- **`src/components/scenes/`** — escenas decorativas por capas (`aria-hidden`, `alt=""`): `aura`, `eye`, `storyCosmicBeing`, `featuresCelestialOrbital`, `journeyCosmicPortal`, `contactCosmicGuardian`, `sectionBeam`.
- **`src/components/layout/`** — `Navbar`, `Footer`, `Brand`, `LanguageSelector`, `ThemeToggle`.
- **`src/components/legal/`** — `LegalDocument.tsx` (renderer único de las páginas legales), `legalPage.parts.tsx`, `legalAutoLinks.ts`, `documents/` (los envoltorios de cada ruta, que montan `Navbar` + documento + `Footer`). Aquí vivió `LegalHeader.tsx`, una cabecera propia y sobria, hasta el 2026-09-03: se retiró al revertirse D20 (decisión del dueño tras la crítica externa #16 — las legales llevan la navegación completa del sitio, igual que la 404), y el porqué está escrito en el docblock de `documents/PrivacyDocument.tsx`.
- **`src/components/ui/`** — primitivos: `Button`, `Card`, `IconButton`, `Input`, `Logo`, `Typography`, `VisuallyHidden`.
- **`src/config/`** — fuentes de verdad únicas: `site.ts`, `links.ts`, `navigation.ts`, `legal.ts`, `storage.ts` (`STORAGE_KEYS`, el registro único de lo que el sitio escribe en `localStorage`).
- **`src/seo/`** — `metadata.ts`, `jsonLd.ts`, `JsonLdScript.tsx`.
- **`src/i18n/`** — `config.ts`, `I18nProvider.tsx`, `locales/{es,en}/{common,home,legal}.json`.
- **`src/test/test-utils.tsx`** — `renderWithProviders`, el render de test que envuelve los providers reales del árbol (tema, i18n).

## 5. Cinco cosas que cuestan una sesión si no las sabes

1. **Cada sección de la home tiene dos implementaciones completas, una por tema — pero desde el 2026-08-11 (Tasks 15-16, plan premium F1-F5) el CONTENIDO ya no es una de las dos cosas que divergen.** Decisión del dueño (Fase 0, D-C): "tema = piel con contenido unificado". Las cuatro secciones comparten hoy un único árbol de copy/estructura entre temas (mismo `<h2>`, mismo cuerpo, mismas salidas); lo que sigue ramificando por tema es el **vehículo** (tarjeta acotada vs. deck de diapositivas/sección a sangre completa) y el **arte** (escena de fondo o su ausencia). Un cambio "en Story" o "en Features" sigue casi nunca siendo un cambio de una sola rama: hay que tocar vehículo y arte de las dos ramas a la vez (o decidir explícitamente que una se queda igual) — pero ya NO hay que mantener dos copias de copy sincronizadas a mano; hay una sola. Detalle completo: `DESIGN.md` §4.
2. **jsdom no hace layout, no pinta y no evalúa `@media`.** Un test de CSS/animación bajo Vitest no ve nada de eso por observación: hay que inspeccionar `document.styleSheets` o comparar contra `getComputedStyle`/el token importado, nunca fiarse de que "se ve bien" en el test.
3. **En el panel de navegador embebido, `document.visibilityState` suele estar en `hidden`.** Sin pestaña visible no hay frames: ni `requestAnimationFrame`, ni `IntersectionObserver`, ni `loading="lazy"`, ni relojes de animación avanzan. Antes de medir cualquier cosa que dependa de scroll o de un frame, comprueba `visibilityState` primero.
4. **`GlobalStyles` declara reglas globales que pisan lo que no se declara explícitamente:** `svg { width: 100% }` e `img { object-fit: cover }`. Todo `<svg>` inline nuevo necesita su propio `width`, `height` y `flex: none` en su CSS o hereda el 100% global.
5. **`scroll-snap` está retirado con medición y no vuelve sin decisión informada.** Se probó y se quitó el 2026-07-31: con anclas del tamaño del viewport, `proximity` degenera en `mandatory` y roba el control del scroll (medido: 900→720, 1200→1440, 3100→2880 px; tirones de hasta 240 px). El efecto equivalente se entrega con `position: sticky`. Si alguien pide "snap", el efecto se entrega por esa vía y se explica con la medición delante.

## 6. Política de testing del proyecto

**Solo se escriben o actualizan tests de los componentes que se están modificando o creando en la tarea en curso.** No es obligatorio ni deseable perseguir cobertura por fichero fuera de ese alcance. La suite completa (`pnpm test`, dentro de `pnpm run ci`) sigue corriendo siempre como gate de regresión — su función es detectar que un cambio rompió algo que no se tocó a propósito, no exigir que cada tarea amplíe cobertura ajena a su alcance.

**Todo test sobre CSS o sobre comportamiento en jsdom se valida con un bug inyectado a propósito** antes de darlo por bueno: se rompe la implementación real de forma reversible, se comprueba que el test se pone en rojo, se restaura, y solo entonces se confía en que el test en verde significa algo. Un test de CSS que nunca se ha visto fallar no está verificado, está sin probar.

## 7. Al terminar una tarea

1. `graphify update .` (AST-only, sin coste de API) para que el grafo refleje el código nuevo.
2. Gate completo ejecutado — `pnpm run ci` — con la cifra literal de salida (tests en verde/rojo, errores de typecheck/lint si los hay). No se reporta "debería pasar": se reporta lo que pasó.
3. Si hubo una corrección del usuario durante la tarea, una lección nueva en `task/lessons.md` con qué pasó, por qué, y la regla concreta que lo evita la próxima vez.
4. Registro en el vault (nota de proyecto o de error/investigación, según corresponda), siguiendo las reglas globales de registro de sesiones.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
