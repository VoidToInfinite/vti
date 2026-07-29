# Spec — Landing v2: secciones de tema claro, retirada de Three.js y gate por tema

**Fecha:** 2026-07-28 · **Rama:** `feature/mejoras-hero-navbar` · **HEAD de partida:** `3c03975` **Fuente de verdad del diseño:** `C:\Users\Daniel\Downloads\Landing v2.dc.html` (mockup aprobado por el usuario) + 6 figuras PNG adjuntas (ver §6). El hero y el navbar existentes NO se rediseñan: esta entrega completa lo que hay DEBAJO del hero.

## 1. Encargo (literal del usuario)

- Eliminar todo resto de Three.js.
- **Tema claro:** secciones completas según `Landing v2.dc.html`; cada sección aparece al hacer scroll.
- **Tema oscuro:** solo hero y footer. No añadir estas secciones al tema oscuro.
- Entregar contexto, specs y todo lo necesario actualizados en el vault.
- No entregar hasta que esté correcto, verificado y documentado.

## 2. Decisiones de alcance (planificador)

| # | Decisión | Porqué |
| --- | --- | --- |
| D1 | `About` se ELIMINA (componente, tests, claves i18n, uso en page). | El mockup no tiene sección About; su función de declaración de marca la cubre el tagline del footer («Together, we go beyond.»). El mockup es la fuente de verdad de la página completa. |
| D2 | Secciones de tema claro: `Story` («Why VoidToInfinite») → `Journey` → `Features` → `Contact`, en ese orden, con ids `story`, `journey`, `features`, `contact`. | Orden y anclas del mockup. `GlobalStyles` ya da `scroll-margin-top` a `:where(section[id])`. |
| D3 | El gate por tema es un componente cliente `HomeSections` que lee `useTheme()` y devuelve `null` en oscuro. | El export estático prerenderiza tema claro (ThemeProvider arranca en `"light"`), así que el HTML estático contiene las secciones (SEO intacto). El visitante con oscuro guardado las ve desmontarse en la corrección de hidratación — mismo patrón ya asumido por el hero. |
| D4 | Three.js se retira ENTERO: `src/three/*`, `src/hooks/useScrollProgress*` (único consumidor era Story), deps `three` y `@types/three` de package.json + lockfile. `public/hero/eye/*` y `assets/hero-eye/*` NO se tocan (son WebP del hero oscuro, no Three.js). | `useScrollProgress` verificado sin más consumidores (grep 2026-07-28). |
| D5 | El navbar gana enlaces de sección (Story/Journey/Features/Contact) SOLO en tema claro y solo ≥ md. En oscuro no se renderizan (sus destinos no existen). | El mockup los tiene; en oscuro serían anclas muertas. |
| D6 | El footer se rediseña según el mockup y vive en LOS DOS temas. Las columnas Explore/Discover (anclas de sección) solo se renderizan en claro; el bloque de marca + Resources + barra inferior viven en ambos. | Requisito «oscuro = hero + footer» + anclas muertas. |
| D7 | El CTA «Read the story» del hero apunta a `#story`; en oscuro esa ancla no existe y el click no navega. Se ACEPTA y se reporta: el hero está fuera de alcance y su coreografía es reciente y delicada. | Cambio mínimo; decisión reversible aparte. |
| D8 | El email pasa a `mailto:hello@voidtoinfinite.com` (mockup del usuario). Se señala en la entrega para confirmación: el buzón no es verificable desde aquí. | El mockup es material del usuario; mantener `por-completar` contradiría la fuente de verdad que él mismo entregó. |
| D9 | Los enlaces Resources/legales sin destino real siguen la convención `example.invalid` + `por-completar` de `links.ts`. NO se inventan URLs. | Protocolo de veracidad + convención ya establecida en el repo. |
| D10 | Los colores propios de estas secciones NO entran en los tokens semánticos (contratos cerrados por `system.test.ts`): viven como constantes nombradas en `<seccion>.layers.ts`, con el valor VERBATIM del mockup y un comentario de origen. | Mismo precedente que `eye.layers.ts`/`aura.layers.ts`. Copiar verbatim elimina el riesgo de error de conversión. |
| D11 | Espaciado/tipografía: tokens del tema (`space`, `type`, `radius`, `motion`, `grid`, `breakPoint`). Solo las medidas de geometría propias del arte (tamaños de figura, offsets) se quedan como constantes en `layers.ts`. | Estándares de la casa. |
| D12 | Movimiento: solo `transform`/`opacity`, con guard `prefers-reduced-motion` que fuerza el estado final (patrón ya presente en Features/Story). Reveal por `useReveal` (IntersectionObserver, `once: true`). | Estándares + hook existente. |

## 3. Composición de la página

```tsx
// app/page.tsx (server component, sin cambios de contrato de imports)
<Navbar />
<main>
  <Hero />
  <HomeSections />   {/* cliente: claro → Story+Journey+Features+Contact; oscuro → null */}
</main>
<Footer />
```

`HomeSections` vive en `src/components/sections/HomeSections.tsx`, `"use client"`, lee `useTheme()`. Sin ThemeProvider anidados nuevos: las secciones claras resuelven contra el tema ambiental (que ES claro cuando se montan).

**Costura Hero→Story en claro:** el hero claro (Aura pastel) termina en su propio pie. Flow B debe leer `Hero.tsx`/`HeroBackdrop.tsx`, medir en qué color termina el borde inferior del hero claro y decidir si Story necesita rampa (criterio: sin filo duro visible; la decisión y su evidencia se documentan en el propio componente). El `ScSeam` negro actual y el `ThemeProvider(basicDarkTheme)` de Story DESAPARECEN con la reescritura.

## 4. Contrato i18n (congelado — Flow A lo escribe, B–F lo consumen)

### 4.1 `home.json` — se ELIMINAN `Home.about`, `Home.sections` y las claves viejas de

`Home.story`/`Home.contact`; se conservan `Head`, `hero`, `swipeUp`, `cta`.

Estructura nueva (EN; ES en §4.2):

```
Home.story.kicker            "Why VoidToInfinite?"
Home.story.titleLead         "From curiosity"
Home.story.titleAccent       "to creation."
Home.story.body              "VoidToInfinite is a space where learning meets imagination and play drives progress. We explore ideas, build meaningful skills and transform curiosity into experiences that can be shared with others."
Home.story.note              "Every idea can become a new beginning."
Home.story.figureAlt         "Celestial figure pointing upward"
Home.story.pillars.learn.title  "Learn with purpose"
Home.story.pillars.learn.body   "Knowledge that inspires understanding and opens new possibilities."
Home.story.pillars.create.title "Create with clarity"
Home.story.pillars.create.body  "Ideas become meaningful when they can be explored, built and shared."
Home.story.pillars.grow.title   "Grow together"
Home.story.pillars.grow.body    "Learning becomes infinite when knowledge moves between people."

Home.journey.kicker          "Inspiration"
Home.journey.title           "Your journey has no final step."
Home.journey.body            "Every discovery creates a new question. Every skill opens another path. The journey continues as long as curiosity remains."
Home.journey.quote           "The destination is not infinity. The journey is."
Home.journey.figureAlt       "Celestial figure presenting the journey with an open palm"
Home.journey.steps.discover.label "Discover"   .body "Explore ideas, ask questions and observe the world differently."
Home.journey.steps.learn.label    "Learn"      .body "Build knowledge, develop understanding and shape your perspective."
Home.journey.steps.imagine.label  "Imagine"    .body "Connect ideas and discover possibilities that do not exist yet."
Home.journey.steps.create.label   "Create"     .body "Transform your thinking into something visible, useful or meaningful."
Home.journey.steps.share.label    "Share"      .body "Open your work to feedback, collaboration and new interpretations."
Home.journey.steps.evolve.label   "Evolve"     .body "Keep learning, redefining and expanding what is possible."

Home.features.kicker         "Features"
Home.features.learning.title "Learning"
Home.features.learning.body  "Every expert was once a beginner. Learn at your own pace, follow the questions that matter to you, and watch small steps become real understanding."
Home.features.learning.bullets.one    "Curated paths that grow with you"
Home.features.learning.bullets.two    "Real projects, not just theory"
Home.features.learning.bullets.three  "Progress you can see and feel"
Home.features.learning.bullets.four   "A rhythm that respects your time"
Home.features.learning.cta   "Explore Learning"
Home.features.learning.figureAlt "Celestial figure studying a holographic tablet"
Home.features.imagination.title "Imagination"
Home.features.imagination.body  "Your ideas deserve a place to live. Turn “what if” into something real you can share."
Home.features.imagination.bullets.one   "A safe space to experiment freely"
Home.features.imagination.bullets.two   "Tools that spark new connections"
Home.features.imagination.bullets.three "From rough sketch to real concept"
Home.features.imagination.bullets.four  "Every idea counts, even small ones"
Home.features.imagination.cta   "Explore Imagination"
Home.features.imagination.figureAlt "Celestial figure thinking with a radiant heart"
Home.features.gaming.title   "Gaming"
Home.features.gaming.body    "Play is how we learn best. Compete, collaborate and celebrate every win — big or small."
Home.features.gaming.bullets.one   "Challenges that sharpen your skills"
Home.features.gaming.bullets.two   "Friendly competition, real connection"
Home.features.gaming.bullets.three "Teamwork that turns into friendship"
Home.features.gaming.bullets.four  "Every achievement worth celebrating"
Home.features.gaming.cta     "Explore Gaming"
Home.features.gaming.figureAlt "Celestial figure raising a golden star trophy"

Home.contact.kicker          "Contact"
Home.contact.titleLead       "Let’s build something"
Home.contact.titleAccent     "infinite."
Home.contact.body            "Have a question, idea, or collaboration in mind?"
Home.contact.bodySecond      "Reach out via email — we’d love to hear from you."
Home.contact.email           "hello@voidtoinfinite.com"
Home.contact.cta             "Contact via email"
Home.contact.ctaAria         "Contact via email — opens your email application"
Home.contact.figureAlt       "Celestial figure waving hello"
```

### 4.2 ES (traducción de la casa; misma estructura, paridad total)

```
story: kicker "¿Por qué VoidToInfinite?" · titleLead "De la curiosidad" · titleAccent "a la creación."
body "VoidToInfinite es un espacio donde el aprendizaje se encuentra con la imaginación y el juego impulsa el progreso. Exploramos ideas, construimos habilidades con sentido y transformamos la curiosidad en experiencias que se pueden compartir."
note "Cada idea puede ser un nuevo comienzo."
figureAlt "Figura celestial señalando hacia arriba"
pillars: learn "Aprende con propósito" / "Conocimiento que inspira comprensión y abre nuevas posibilidades."
         create "Crea con claridad" / "Las ideas cobran sentido cuando se pueden explorar, construir y compartir."
         grow "Crece en comunidad" / "El aprendizaje se vuelve infinito cuando el conocimiento circula entre personas."

journey: kicker "Inspiración" · title "Tu viaje no tiene un último paso."
body "Cada descubrimiento crea una pregunta nueva. Cada habilidad abre otro camino. El viaje continúa mientras quede curiosidad."
quote "El destino no es el infinito. El viaje lo es."
figureAlt "Figura celestial presentando el viaje con la palma abierta"
steps: discover "Descubre" / "Explora ideas, hazte preguntas y observa el mundo de otra manera."
       learn "Aprende" / "Construye conocimiento, desarrolla comprensión y da forma a tu perspectiva."
       imagine "Imagina" / "Conecta ideas y descubre posibilidades que todavía no existen."
       create "Crea" / "Transforma tu pensamiento en algo visible, útil o con significado."
       share "Comparte" / "Abre tu trabajo a comentarios, colaboración y nuevas interpretaciones."
       evolve "Evoluciona" / "Sigue aprendiendo, redefiniendo y ampliando lo posible."

features: kicker "Características"
learning body "Todo experto fue antes principiante. Aprende a tu ritmo, sigue las preguntas que te importan y observa cómo los pasos pequeños se convierten en comprensión real."
learning bullets "Rutas cuidadas que crecen contigo" / "Proyectos reales, no solo teoría" / "Progreso que se ve y se siente" / "Un ritmo que respeta tu tiempo"
learning cta "Explora Learning" · figureAlt "Figura celestial estudiando una tableta holográfica"
imagination body "Tus ideas merecen un lugar donde vivir. Convierte el «¿y si…?» en algo real que puedas compartir."
imagination bullets "Un espacio seguro para experimentar" / "Herramientas que despiertan conexiones" / "Del boceto a un concepto real" / "Cada idea cuenta, incluso las pequeñas"
imagination cta "Explora Imagination" · figureAlt "Figura celestial pensando con un corazón radiante"
gaming body "Jugando es como mejor aprendemos. Compite, colabora y celebra cada victoria, grande o pequeña."
gaming bullets "Retos que afilan tus habilidades" / "Competición sana, conexión real" / "Trabajo en equipo que se vuelve amistad" / "Cada logro merece celebrarse"
gaming cta "Explora Gaming" · figureAlt "Figura celestial alzando un trofeo de estrella dorada"
(Los títulos Learning/Imagination/Gaming son nombres propios de la marca: NO se traducen.)

contact: kicker "Contacto" · titleLead "Construyamos algo" · titleAccent "infinito."
body "¿Tienes una pregunta, una idea o una colaboración en mente?"
bodySecond "Escríbenos por correo: nos encantará leerte."
email "hello@voidtoinfinite.com" · cta "Contactar por correo"
ctaAria "Contactar por correo: abre tu aplicación de correo"
figureAlt "Figura celestial saludando"
```

### 4.3 `common.json`

```
Common.Navigation += story "Story"/"Historia" · journey "Journey"/"Viaje" ·
                     features "Features"/"Características" · contact "Contact"/"Contacto"
Common.Footer = {
  copyright  "© {{year}} VoidToInfinite. All rights reserved." / "© {{year}} VoidToInfinite. Todos los derechos reservados."
  tagline    "Together, we go beyond." / "Juntos, vamos más allá."
  explore    "Explore" / "Explora"
  discover   "Discover" / "Descubre"
  resources  "Resources" / "Recursos"
  documentation "Documentation" / "Documentación"
  guides     "Guides" / "Guías"
  accessibility "Accessibility" / "Accesibilidad"
  privacy    "Privacy Policy" / "Política de privacidad"
  terms      "Terms of Use" / "Términos de uso"
}
```

## 5. `links.ts` (Flow A)

- `email: "mailto:hello@voidtoinfinite.com"` (D8).
- Añadir, con placeholder `https://example.invalid/por-completar-…`: `guides`, `accessibility`, `privacy`, `terms`. Conservar el resto. Actualizar `links.test.ts` (contrato cerrado).

## 6. Assets — figuras (Flow AS)

Origen (Downloads) → nombre canónico:

| Figura | Archivo origen | Destino |
| --- | --- | --- |
| Story (señala arriba) | `ChatGPT Image Jul 28, 2026, 11_07_11 AM Cosmic Figure with Radiant Heart.png` | `story-pointing` |
| Journey (presenta, palma) | `ChatGPT Image Jul 28, 2026, 11_58_45 AM Celestial Galaxy Humanoid with Radiant Chest Core.png` | `journey-presenting` |
| Features/Learning (tableta) | `ChatGPT Image Jul 28, 2026, 05_25_02 PM Celestial Analyst with Holographic Tablet.png` | `feature-learning` |
| Features/Imagination (pensando) | `ChatGPT Image Jul 28, 2026, 05_34_01 PM Celestial Thinker with Radiant Heart.png` | `feature-imagination` |
| Features/Gaming (trofeo) | `ChatGPT Image Jul 28, 2026, 05_41_58 PM Celestial Starbound Trophy Figure.png` | `feature-gaming` |
| Contact (saluda) | `ChatGPT Image Jul 28, 2026, 11_45_24 AM Celestial Galaxy Figure Waving.png` | `contact-waving` |

Medido 2026-07-28 (System.Drawing, muestreo 16px): los 6 PNG son 1024×1536 RGBA con ~77-84% de píxeles alfa 0 — fondo transparente real, sin necesidad de recorte de fondo.

Pipeline (precedente `assets/hero-aura`): copiar PNG fuente a `assets/figures/` (NO se despliega)

- `manifest.json` (origen, destino, dimensiones, pesos); exportar WebP a `public/figures/` en dos pistas: `<nombre>-1024.webp` (nativa) y `<nombre>-640.webp`. Alfa preservada (verificar corner alpha==0 tras conversión), presupuesto orientativo ≤ 150 KB por pista nativa. Sin trim: lienzo completo, alineación trivial (mismo criterio que el ojo).

## 7. Secciones (estructura y geometría)

Todas: `"use client"`, styled-components, `<section id aria-labelledby>`, tokens del tema, reveal con `useReveal` (contenedor: `opacity: 0; translateY(12-16px)` → visible; guard reduced-motion fuerza estado final; ver patrón exacto en el `ScItem` actual de Features). Colores/geometría del arte: constantes en `<seccion>.layers.ts` con valor verbatim del mockup. Las `<img>` de figuras: `srcset` con las dos pistas WebP, `sizes` acorde, `loading="lazy"`, `decoding="async"`, alt de i18n.

### 7.1 Story — «Why VoidToInfinite» (mockup L70-101)

Grid 2 columnas ≥ lg (figura 375×548 izquierda con halo radial + tarjeta flotante con nota; contenido derecha), columna única debajo (figura primero). Contenido: kicker uppercase (`primary`), `h2` en dos líneas (segunda con degradado de texto del mockup), párrafo, 3 filas de pilares `01 — / título / cuerpo` separadas por `border-top` (`semantic.border`). La tarjeta flotante (icono sparkles + nota) usa la animación float del mockup (solo transform, 7s, reduced-motion la apaga). Numeración «01 —» etc. en el componente, no en i18n.

### 7.2 Journey (mockup L103-155)

Tarjeta `radius.2xl` con fondo degradado pastel (verbatim `linear-gradient(135deg, #FFEBFDEB, #E3F6FFEB)`), header centrado (kicker/`h2`/párrafo), 6 pasos en grid (≥ lg: 6 columnas con offsets verticales alternos del mockup y el path SVG punteado detrás; < lg: 2-3 columnas sin path ni offsets), cita final con degradado de texto, figura 305×441 a la derecha solo ≥ xl (absoluta, como el mockup; oculta debajo para no romper el flujo). Cada paso: disco 56px con icono SVG inline (copiar paths del mockup), etiqueta `0N · Label`, cuerpo. Reveal escalonado de los pasos (~90ms por paso, mismo mecanismo que Features).

### 7.3 Features (mockup L157-210)

Header centrado (kicker + `h2` con los tres términos coloreados como el mockup). Grid: tarjeta Learning a ancho completo (figura izquierda + contenido con bullets en 2 columnas), Imagination y Gaming a media anchura cada una (figura + contenido, bullets en 1 columna); < md todo apilado. Cada tarjeta: borde/gradiente/patrón SVG de fondo verbatim del mockup (el patrón decorativo `aria-hidden`), hover `translateY` + sombra (solo transform/box-shadow con transición corta), bullets con check SVG, CTA de texto `→` hacia `#contact`. Ids de `<pattern>` únicos por tarjeta.

### 7.4 Contact (mockup L212-238)

Tarjeta `radius.2xl` degradado pastel, grid 1.4fr/1fr ≥ md (columna única debajo): izquierda kicker/`h2` (accent con degradado)/dos líneas de cuerpo/chip con el email + CTA `Button as="a" href={links.email}` (o anchor estilizado equivalente del mockup); derecha figura 560px de alto con anillos concéntricos decorativos (`aria-hidden`), float 8s. El chip muestra `Home.contact.email` como texto.

### 7.5 Footer (mockup L240-291) — AMBOS temas

Grid de columnas ≥ md (apilado debajo): bloque de marca (Logo + nombre + tagline + `Socials` existente — enlaces REALES del repo, no los del mockup), columna Explore (anclas de sección), columna Discover (Learning/Imagination/Gaming → `#features`), columna Resources (`links.docs/guides/accessibility` — placeholders D9). Barra inferior: copyright + Privacy Policy/Terms of Use/Accessibility (`links.privacy/terms/accessibility`). Explore y Discover solo en claro (D6). Superficie: `semantic.surfaceSunken` + `border-top` como hoy. El footer NO cambia de estructura al cambiar el idioma ni requiere reveal (está debajo del pliegue final; sin IntersectionObserver).

### 7.6 Navbar (Flow F, cambio mínimo)

Bloque `ScNavLinks` (elemento `nav` ya existe; los enlaces van dentro del actual `ScNav`, entre marca y acciones): 4 anclas con `Common.Navigation.*`, visibles solo ≥ md y solo en claro (`useTheme()` ya que Navbar es cliente). Estilo: texto `semantic.text`/`textMuted` con hover `primary` (tokens), sin subrayado (GlobalStyles ya lo gestiona). NO tocar la máquina de intro (`data-intro`), el cristal ni el ThemeToggle.

## 8. Tests (por flujo; Vitest + Testing Library, sin snapshots)

- Cada sección: render con providers reales (`renderWithProviders`), título accesible por rol, figura con alt i18n y `srcset` con las dos pistas, reveal (`data-revealed` false → true al intersectar; mock de IntersectionObserver ya usado en `useReveal.test`), guard reduced-motion atado inspeccionando el CSS inyectado (`document.styleSheets`, lección 2026-07-27: jsdom no evalúa `@media` — verificar el TEXTO del bloque, y validar el test con el bug inyectado).
- `HomeSections`: en claro renderiza las 4 secciones; en oscuro `null` (montar con tema oscuro vía toggle o `localStorage` + hidratación — ver tests existentes del cruce de temas).
- `home-page.flujo.test.tsx`: página completa en claro (hero + 4 secciones + footer) y en oscuro (hero + footer, sin story/journey/features/contact).
- Footer: columnas por tema; copyright con año.
- Navbar: enlaces presentes en claro ≥ md (presencia en DOM; la visibilidad responsive es CSS), ausentes en oscuro; intro intacta (tests existentes siguen verdes).
- i18n: `locales.test.ts` — paridad es/en sigue cubierta con la estructura nueva.
- Los tests que hoy fijan el mundo viejo (`Story.test`, `Story.qa.test`, `hero-story.integration`, `About.test`, `Features.test`, `Contact.test`, suite de `src/three/*`, `useScrollProgress.test`) se REESCRIBEN o ELIMINAN con su flujo propietario. `system.test.ts` no debería cambiar (D10: no se tocan tokens); si un flujo cree necesitar tocarlo, PARA y lo consulta con el orquestador.

## 9. Definition of Done

- [ ] `rg -i three` sin resultados en `src/`, `app/`, `package.json` (docs pueden citarlo como historia).
- [ ] `pnpm test` completo en verde (línea base 2026-07-28: 48 archivos / 481 tests; el total final será distinto — lo que no puede haber es regresión no explicada).
- [ ] `pnpm check` limpio; `pnpm check-spelling` limpio; `pnpm build` OK (export estático).
- [ ] Verificación en navegador real (dev server + Browser pane): claro con las 4 secciones, reveal al scrollear, figuras cargadas (200, srcset correcto); oscuro solo hero+footer; toggle claro↔oscuro sin errores de consola; capturas si el entorno compone frames.
- [ ] Árbol de trabajo limpio: commits temáticos en español (sin push salvo petición).
- [ ] `task/todo.md` actualizado + lecciones si las hay.
- [ ] Vault: entrada de Registro en `01-Projects/vti.md` + spec en `01-Projects/vti/typescript/specs/` con frontmatter de 7 claves.
