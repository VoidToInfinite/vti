# PROYECT.md — VTI

> Ficha operativa del proyecto: identificación, stack, estructura del repo, estado actual y roadmap. Se actualiza cuando cambia alguno de esos hechos. Para lo que la web comunica al visitante (copy, propuesta de valor, coherencia del mensaje), ver `PRODUCT.md`.

## 1. Identificación

- **Nombre:** VoidToInfinite (VTI).
- **Dominio:** `voidtoinfinite.com` (`SITE.url`, `src/config/site.ts`).
- **Repositorio:** GitHub, `VoidToInfinite/vti` (remoto `origin`, `https://github.com/VoidToInfinite/vti.git`).
- **Deploy:** Netlify, configurado vía `netlify.toml`. Comando de build `pnpm build`, directorio publicado `out/` (exportación estática de Next.js). No requiere el plugin `@netlify/plugin-nextjs`, precisamente porque no hay nada del lado servidor que ese plugin tenga que adaptar.
- **Rama de trabajo actual:** `feature/general-refactoring`.

## 2. Stack y restricciones

- **Next.js 16**, App Router, con `output: "export"` (`next.config.ts`): el build genera HTML estático puro en `out/`, sin servidor Node en producción.
- **React 19**, componentes funcionales, `reactStrictMode: true`.
- **styled-components 6.4**, con el compilador de Next (`compiler: { styledComponents: true }`).
- **i18next / react-i18next**, con namespaces `home`, `legal` y `common`, en español (canónico) e inglés (`src/i18n/locales/{es,en}/`).
- **Vitest** + Testing Library para tests, colocados junto al código que prueban.
- **pnpm 11**, fijado con `packageManager: "pnpm@11.10.0"` y gestionado vía Corepack.
- **Node 22+** (`engines.node: ">=22.4"`, `.nvmrc` → `22`).

**Qué NO puede hacer este proyecto**, por ser una exportación estática:

- **Sin servidor propio.** No hay proceso Node sirviendo la app en producción; Netlify sirve ficheros estáticos de `out/`.
- **Sin API routes.** No existe ningún `route.ts` bajo `app/`; cualquier lógica de servidor (envío de formularios, por ejemplo) queda fuera de alcance mientras se mantenga `output: "export"`.
- **Sin middleware.** No hay `middleware.ts` en la raíz; no hay forma de interceptar peticiones antes de que lleguen al HTML estático.

El formulario de contacto, en consecuencia, no envía nada a un servidor propio: abre la aplicación de correo del propio visitante vía `mailto:` (documentado también en la Política de privacidad, sección «Si nos escribes por correo»).

## 3. Estructura del repo

```
app/                    App Router: layout, page, not-found, robots, sitemap, opengraph-image,
                         y las dos rutas legales (aviso-legal/, privacidad/)
src/
  components/
    layout/              Navbar, Footer, ThemeToggle, LanguageSelector, Brand
    legal/                LegalDocument, LegalHeader, documentos de privacidad y aviso legal
    scenes/               Las 7 escenas 3D/ilustradas (aura, eye, sectionBeam,
                           storyCosmicBeing, journeyCosmicPortal, featuresCelestialOrbital,
                           contactCosmicGuardian) — movidas aquí el 2026-08-08 (antes vivían
                           sueltas bajo components/)
    sections/             Hero, Story, Journey, Features, Contact, NotFound, HomeSections
    ui/                   Button, Card, IconButton, Input, Typography, Logo, VisuallyHidden
  config/                 site.ts (identidad + rutas), links.ts (destinos de CTA), legal.ts
                           (LEGAL_ENTITY + versiones), navigation.ts, storage.ts (claves de
                           localStorage centralizadas)
  hooks/                  useReveal, useParallaxLayers, usePointer, useScrolled,
                           useSectionProgress, useSlideDeck, useNavDetach,
                           useThemeScrollReset, useSceneParallax
  i18n/                   I18nProvider, config, locales/{es,en}/{home,legal,common}.json
  motion/                 stage.ts, StageProvider, timings.ts (coreografía de entrada/tema)
  seo/                    metadata.ts, jsonLd.ts, JsonLdScript
  theme/                  ThemeProvider, GlobalStyles, themes.ts, tokens/
```

`src/components/` tiene hoy exactamente **cinco** categorías (`layout`, `legal`, `scenes`, `sections`, `ui`), verificadas contra el árbol real del repo. Es el resultado de la reorganización del 2026-08-08 que sacó las siete escenas de nivel de `components/` a su propia carpeta `scenes/` (41 renombrados, 18 ficheros de imports actualizados).

## 4. Estado actual

**Auditoría integral, 2026-08-08.** Orquestada por Fable (planificación, revisión, documentación), con 5 agentes Opus de auditoría (arquitectura, visual/UX, rendimiento, SEO, producto) y subagentes Sonnet de implementación. Punto de partida: rama `feature/general-refactoring`, HEAD `78987a2`.

**Baseline medido antes de tocar nada:** `pnpm check` salía en rojo solo por Prettier (typecheck y ESLint ya estaban verdes); `pnpm test` daba 5 tests rojos de 982 (977 verdes), heredados del commit `7a2d2ac` («wip: ajustes visuales del usuario»); no había CI; `pnpm check` no ejecutaba tests; `check-spelling` estaba roto (76.035 incidencias en 228 ficheros, sin diccionario español).

**Gate final tras la auditoría: 993/993 tests en verde, en 78 ficheros modificados.** Ese estado describe el momento en que se escribieron los seis documentos de la raíz (2026-08-08), con los cambios aún sin commitear.

**Actualización 2026-08-09:** los hallazgos de esa auditoría se implementaron en 13 tareas secuenciales (ver `.superpowers/sdd/2026-08-08-implementacion-auditoria-premium/progress.md`), cada una con su propio commit temático sin push. La rama `feature/general-refactoring` está hoy 37 commits por delante de `origin/feature/general-refactoring`. El último gate completo verificado (Tarea 13) dio **81 ficheros de test, 1094 tests, todos en verde**. `git status` a día de hoy solo tiene dos cosas pendientes de confirmar: `.impeccable/` (output de otra skill, sin versionar desde el arranque de esta sesión) y una edición viva del usuario en `Footer.tsx` sin commitear.

Resumen de lo aplicado en esta ola:

- **Tests heredados** actualizados a la intención real del commit `7a2d2ac`, con ciclo rojo/verde por aserción (min-height y centrado de Contact en tema claro, ausencia de borde/fondo en reposo de las tarjetas de Features, hover unificado con Story, bullets a una columna en ambas ramas).
- **SEO:** `ScHeroBrand` pasa a ser el `<h1>` real de la página; la 404 se convierte en Server Component con metadata propia (`noindex`, sin canónica heredada); JSON-LD `Organization` gana `description` y `email`; `theme-color` pasa a depender del esquema; se borran claves i18n muertas. La tagline descriptiva que se añadió dentro del `<h1>` (`Home.hero.kicker`) **se retiró el mismo día por decisión del usuario**: el encabezado vuelve a ser solo la marca, y la clave sigue en los locales sin consumidor. El hallazgo SEO de fondo —un `<h1>` que no describe de qué trata el sitio— queda abierto en el roadmap, pendiente de la forma que el usuario quiera darle.
- **Rendimiento:** cabeceras de caché en `netlify.toml`; gate de deploy `pnpm run ci && pnpm build`; `fetchPriority="high"` limitado a la capa candidata a LCP del Aura; fuente `JetBrains_Mono` sin precarga; `usePointer` convertido en singleton de módulo (un solo listener y un solo rAF para toda la app); el namespace `legal` de i18next sale del bundle de la home.
- **Arquitectura:** `STORAGE_KEYS` centralizado en `src/config/storage.ts` y consumido por todos los providers que tocan `localStorage`, con un candado que impide literales `"vti-` sueltos fuera de ese registro; `src/motion/timings.ts` deja de forzar `"use client"` innecesario; `BackOrbs` (componente muerto) se borra; se añade `task/*` con excepción de `task/lessons.md` al control de versiones; se añade el script `"ci"` y `.github/workflows/ci.yml`.
- **Estructura:** las 7 escenas se mueven a `src/components/scenes/` (ver §3).

## 5. Roadmap priorizado de entregas pendientes

Documentado pero **no aplicado** en la auditoría del 2026-08-08 — requiere ojo humano, una decisión del usuario, o una entrega propia por el volumen de trabajo:

1. **Script inline anti-flash de tema.** Elimina el destello claro→oscuro y la re-maquetación que ocurre al hidratar. Por qué importa: es la primera impresión visual del sitio en cada carga, y hoy parpadea.
2. **Estado inicial visible del hero en el HTML prerenderizado.** Hoy todo el hero sale en `opacity: 0` hasta que hidrata. Por qué importa: es el cambio de mayor impacto en LCP —el LCP queda rehén de 246 KB gzip de JS más hidratación más `decode()` de imagen.
3. **Pista intermedia de `srcset` a ~1600px** para Features/Journey/Contact. Sigue sin aplicar — declarado explícitamente fuera de alcance de la implementación de la auditoría (decisión del usuario: es build de assets, no un cambio de código). Por qué importa: sigue siendo la pieza que más bajaría el peso del tema oscuro en móvil. **Recompresión de imagen, actualización 2026-08-09 (Tarea 13):** se recomprimió el canal alfa (no el color) de 38 de 40 WebP con `ALPH > 30%` del peso en las 4 escenas oscuras de sección (`storyCosmicBeing`, `featuresCelestialOrbital`, `journeyCosmicPortal`, `contactCosmicGuardian`; el hero `eye`/`aura` quedó fuera de alcance) — ahorro real medido de 546.210 B (−8,25%) sobre un corpus de 6,5 MB, con PSNR mínimo 56,54 dB (alfa) / 48,70 dB (compuesto premultiplicado), ambos con margen sobre el umbral de 45 dB. Es un criterio distinto (ratio de alfa) del que motivó el hallazgo original (bits por píxel): `01-nebula.webp` bajó de 388.192 a 354.992 B (≈3,37→3,08 bpp, **sigue** sobre el umbral de 2,5), y `07-geometry.webp`/`07-geometry-1024.webp` quedaron fuera del criterio de alfa (29,4%/29,1%, bajo el 30% que usó la tarea) y **siguen intactos** a 5,74/5,87 bpp. El hallazgo original de bpp no se cierra con esta tarea — hace falta una recompresión de color dirigida a esos dos ficheros si se quiere bajar de 2,5 bpp.
4. **Extracción del deck compartido de Story/Journey.** Por qué importa: son 13 componentes styled prácticamente gemelos 1 a 1 entre las dos secciones; mantenerlos duplicados es duplicar también el riesgo de que diverjan por descuido.
5. **Bloque AEO citable «¿Qué es VoidToInfinite?»** (~150 palabras con hechos verificables). Por qué importa: hoy no existe ningún pasaje corto y autocontenido que un motor de respuesta pueda citar; depende de copy que solo puede escribir el usuario, porque exige hechos reales (§10 de `PRODUCT.md`).
6. **Destino real de los 3 CTA de Features.** Hoy los tres apuntan a `#contact`. Por qué importa: es el hallazgo ALTA más visible de `PRODUCT.md` §8 — la promesa del CTA y su destino no coinciden.
7. **Rutas `/en` indexables** (`app/[lang]/` con `generateStaticParams`). Por qué importa: es una decisión de negocio, no solo técnica, y `hreflang` no se añade sin ellas para no declarar algo falso a los rastreadores.
8. Otras entregas documentadas pero de menor prioridad: mecanismo `$compactFrom` de los bullets de Features (decidir si se elimina o se restaura a dos columnas en la rama que lo perdió), stylelint sobre styled-components, Git LFS para `assets/` (32 MB), ignorar snapshots fechados de `graphify-out/` en git, `will-change` dinámico en las capas de escena, dynamic import de las escenas exclusivas del tema oscuro, consolidación de `Common.Lang` con `language.*`, y la decisión sobre las claves fósiles `framework`/`games`/`projects`/`reflection` de `Common.Navigation`.
9. **Añadidas 2026-08-09, descubiertas durante la implementación de la auditoría premium** (detalle completo en `RULES.md` §Deuda conocida): decidir si se retira o se conecta el spinner de `Button` (`loading`/`aria-busy`, hoy sin ningún consumidor de producción); extraer `ScBackLink` a un primitivo compartido en `src/components/ui/` (hoy duplicado entre `NotFoundContent.tsx` y `legalPage.parts.tsx`); consolidar el `switch` de resolución de etiquetas de navegación, repetido tres veces (`NavGroupMenu`, `Footer`, y desde la Tarea 10 también `NavSheetGroup`); unificar el espacio de color de `color-mix()` (`oklch` en 12 ficheros, `oklab` en 4, con `Features.tsx` mezclando los dos dentro del mismo fichero — sin criterio escrito sobre cuál usar).

## 6. Decisiones pendientes del usuario

La lista íntegra de los 21 puntos que solo el usuario puede resolver —10 bloqueantes legales y 11 decisiones de producto— vive en `PRODUCT.md` §10 y no se duplica aquí para evitar que las dos listas diverjan con el tiempo.

Vale la pena remarcar los bloqueantes legales porque condicionan la publicación del sitio tal cual está hoy: mientras `LEGAL_ENTITY` (`src/config/legal.ts`) siga en `POR_COMPLETAR`, `/privacidad` no cumple el artículo 13.1.a RGPD y `/aviso-legal` no cumple el artículo 10.a) ni el 10.e) de la LSSI-CE — lo declaran los propios documentos legales en su texto renderizado, no es una interpretación de esta ficha.

## 7. Documentación del proyecto

| Documento | Existe hoy | Qué es |
| --- | --- | --- |
| `CLAUDE.md` | Sí (reescrito en esta entrega) | Instrucciones de proyecto para agentes: stack y restricciones, comandos y gate real (`pnpm run ci`), lecturas obligadas, mapa del repo, política de testing, checklist de cierre, y la sección graphify (`query`/`path`/`explain` antes que lectura de fuente en crudo). |
| `PRODUCT.md` | Sí (esta entrega) | Qué comunica la web hoy al visitante: propuesta de valor, tono, mapa de mensajes, CTAs, hallazgos de coherencia y la lista de datos que necesita dar el dueño. |
| `PROYECT.md` | Sí (esta entrega, es este documento) | Ficha operativa: identificación, stack, estructura del repo, estado del gate de calidad y roadmap. |
| `task/lessons.md` | Sí | Bitácora de lecciones técnicas capturadas sesión a sesión (causa raíz, regla, candado de test) — 77 entradas fechadas a fecha de hoy, cubre desde bugs de animación en pestaña oculta hasta errores de invalidación de estado en React StrictMode. |
| `task/todo.md` | Sí | Plan de la tarea en curso en cada sesión. |
| `docs/superpowers/` | Sí | Specs (`specs/`) y planes (`plans/`) de cada entrega histórica del proyecto, fechados, uno por feature. |
| `docs/qa-3d-pendiente.md` | Sí | Nota de QA pendiente sobre las escenas 3D del sitio. |
| `RULES.md` | Sí (esta entrega) | Convenciones vinculantes del repo: nombres, clean code/SOLID, estilos y movimiento, i18n, testing y Definition of Done (47 reglas; las pagadas con un error real, marcadas `[L]`), más la deuda conocida. |
| `DESIGN.md` | Sí (esta entrega) | El sistema visual real del proyecto: color OKLCH y regla de contraste, tipografía a dos niveles, temas como modo de contenido, movimiento y coreografía de carga, patrones de escena y deck, reset global y deuda visual. |
| `PRE-LAUNCH-QA.md` | Sí (esta entrega; actualizada 2026-08-09) | Checklist previo a publicar: bloqueante legal, SEO (contra el build y contra el sitio desplegado), presupuestos de rendimiento y QA visual de ojo humano (105 casillas contando el documento completo, tras sumar los ítems 42-49 de las Tareas 1-13). |

Los seis documentos de la raíz (`CLAUDE.md`, `RULES.md`, `DESIGN.md`, `PRODUCT.md`, `PROYECT.md`, `PRE-LAUNCH-QA.md`) se crearon o reescribieron en la auditoría integral del 2026-08-08. Los redactó un equipo de agentes en paralelo, así que las marcas «esta entrega» de esta tabla se refieren todas a esa misma auditoría. **Actualización 2026-08-09 (Tarea 14):** tras implementar los hallazgos de esa auditoría (Tareas 1-13), los seis documentos se revisaron contra el código, el ledger de la implementación (`.superpowers/sdd/2026-08-08-implementacion-auditoria-premium/`) y los informes de cada tarea, para que ninguna afirmación quedara desactualizada por el trabajo hecho desde entonces.
