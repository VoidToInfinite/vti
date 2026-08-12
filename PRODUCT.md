# PRODUCT.md — VoidToInfinite

> Este documento describe lo que la web **dice hoy**, no lo que el proyecto aspira a ser. Se actualiza cuando cambia el copy (`src/i18n/locales/`) o los destinos declarados en `src/config/`. Toda cita proviene del código y el copy real del repo, verificada contra `src/i18n/locales/es/` y `src/i18n/locales/en/` el 2026-08-08, con una pasada de actualización el 2026-08-09 tras la implementación de la auditoría premium (Tareas 1-13: formulario de Contacto, copy de CTA, grupo de navegación «Comunidad», kicker del hero). Lo que el repo no dice se marca `_por completar_`; nada se rellena por inferencia.

## 1. Qué es

Una landing estática de una sola página, construida con Next.js 16 y exportada a Netlify, que presenta la marca VoidToInfinite. No es un producto con funcionalidad propia: el Aviso legal (`Legal.legalNotice.sections[actividad]`) la define explícitamente como

> «una web informativa: no vende productos ni servicios, no permite realizar compras ni reservas, no ofrece registro ni cuentas de usuario, no aloja contenido publicado por visitantes y no presta ningún servicio contratable en línea».

### La ambigüedad de la entidad

Qué es VoidToInfinite —la entidad, no la web— es hoy ambiguo: conviven **tres definiciones** distintas en tres piezas distintas del copy, y ninguna cede el paso a las otras.

- **Como equipo.** `SITE.description` (`src/config/site.ts`, consumida como `<meta name="description">`, `og:description` y `description` del `WebPage` de JSON-LD):

    > «VoidToInfinite es un equipo creativo que construye aprendizaje, imaginación y juego en una misma travesía. Descubre su historia, su viaje y cómo participar.»

    El Aviso legal refuerza esta misma lectura: «Este sitio presenta al equipo VoidToInfinite y su trabajo.»

- **Como espacio.** `Home.story.body` (sección Story, la pieza de escritura mejor trabajada del sitio):

    > «VoidToInfinite es un espacio donde el aprendizaje se encuentra con la imaginación y el juego impulsa el progreso.»

- **Como proyecto.** Definición que existió en la clave `Home.Head.description` («Proyecto VoidToInfinite») hasta que se borró en la entrega del 2026-08-08 por ser una clave muerta (keyword stuffing sin consumidor). Se documenta aquí porque formaba parte del mismo problema de fondo —tres marcos distintos para nombrar la misma cosa— aunque ya no esté en el código vivo.

Naturaleza jurídica y organizativa de VoidToInfinite (persona física, sociedad, colectivo informal…): `_por completar_`. Es la decisión 11 de la lista del §10 y, además, el dato del que depende poder rellenar `LEGAL_ENTITY` (`src/config/legal.ts`) para que las páginas legales sean publicables.

## 2. Propuesta de valor

- **Titular declarado** (`SITE.homeTitle`, el `<title>` de la home): «Aprendizaje, imaginación y juego».
- **Tesis** (`Home.features.intro`):

    > «Aprendizaje, imaginación y juego son la misma curiosidad vista desde tres ángulos. Cada uno te da una manera distinta de convertir lo que sabes en algo real.»

- **Cuatro pilares** (`Home.story.pillars.*`, sección Story), cada uno con su título, su línea de cuerpo y una reflexión personal en segunda persona:
    1. **Aprende con propósito** — «Conocimiento que inspira comprensión y abre nuevas posibilidades.»
    2. **Crea con claridad** — «Las ideas cobran sentido cuando se pueden explorar, construir y compartir.»
    3. **Crece en comunidad** — «El aprendizaje se vuelve infinito cuando el conocimiento circula entre personas.»
    4. **La práctica lo hace real** — «El conocimiento se vuelve tuyo cuando lo pones a prueba: tropiezos incluidos.»
- **Diferenciación frente a alternativas:** `_por completar_`. El copy no se compara con ningún producto, plataforma o competidor; no hay ninguna frase de posicionamiento relativo.

## 3. Audiencias

- **Voz explícita:** segunda persona del singular, dirigida a UN individuo curioso en fase de aprendizaje, no a un profesional consolidado ni a una organización. Ejemplos del propio copy: «Todo experto fue antes principiante…» (Features, bullet de Aprende), «Un ritmo que respeta tu tiempo» (mismo bloque).
- **Segmentos implícitos** (marcados como implícitos porque ninguna sección los nombra como audiencia; se infieren de a qué destino lleva cada CTA o enlace):
    - quien quiere **aprender** (bloque Learning de Features);
    - quien quiere **crear/imaginar** (bloque Imagination de Features);
    - quien quiere **jugar o competir** (bloque Gaming de Features);
    - desarrolladores, alcanzables vía el enlace «Explora el código» a GitHub — dentro de Contacto solo existe en el **tema oscuro**, pero desde el 2026-08-09 (Tarea 6) también hay un enlace a GitHub en el grupo «Comunidad» del navbar y del pie, presente en **los dos temas**;
    - comunidad, alcanzable vía «Únete a la comunidad» (Discord) dentro de Contacto oscuro, y desde el 2026-08-09 también vía el mismo grupo «Comunidad» de navbar/pie en los dos temas.
- **B2B / colaboración:** mencionada de refilón en el cuerpo de Contacto («¿Tienes una pregunta, una idea o una colaboración en mente?») y reconocida formalmente en la Política de privacidad, que contempla «la aplicación de medidas precontractuales a petición tuya cuando escribes para plantear una colaboración o un encargo» como base legal alternativa del tratamiento del correo. No existe ninguna sección de la landing que le hable directamente a esta audiencia. Segmentación real (tamaño, tipo de colaboración buscada): `_por completar_`.

## 4. Tono de voz

### Común a ambos idiomas

Cálido, íntimo, en segunda persona, de frases cortas y con gusto por la paradoja. El imperativo llega a lo áspero cuando quiere: «Lee menos, prueba más. Rompe algo a propósito y arréglalo.» (pilar «La práctica lo hace real»). Cero jerga corporativa, cero superlativos, cero cifras en ningún punto del copy de producto. Vocabulario recurrente de campo semántico cósmico: infinito, viaje, celestial, void.

### Español vs. inglés

El español es la versión canónica: idioma por defecto del sitio, el que se prerrenderiza en el HTML, el de la metadata y el de los documentos legales. El inglés es una traducción fiel salvo **dos divergencias verificadas vigentes** (dos más se cerraron durante la implementación de la auditoría premium, ver abajo):

1. **Tagline del pie.** ES: «Sigue siempre adelante.» (`Common.Footer.tagline`) — EN: «Together, we go beyond.» Son dos declaraciones de marca distintas, no una traducción la una de la otra.
2. **Rol título/badge invertido en las identidades de Features.** En inglés, `title` lleva el sustantivo («Learning», «Imagination», «Gaming») y `badge` el verbo («Learn», «Create», «Play»); en español es al revés: `title` lleva el verbo («Aprende», «Imagina», «Juega») y `badge` el sustantivo («Aprendizaje», «Imaginación», «Juego»). Esto además se filtra al menú «Descubre» del navbar en español, que termina listando imperativos como si fueran nombres de destino.
3. **Verbo de los CTA de Features — CERRADA el 2026-08-09.** EN usaba «Explore» y ES «Empieza a» («Empieza a aprender / imaginar / jugar»): un verbo de exploración frente a uno de inicio no prometen lo mismo, y la versión canónica era la que prometía de más. La Tarea 5 de la implementación de la auditoría alineó el ES con el EN: hoy ambos exploran — «Explora el aprendizaje / la imaginación / el juego» frente a «Explore Learning / Imagination / Gaming» (verificado contra `src/i18n/locales/{es,en}/home.json`). El destino de los tres CTA sigue siendo `#contact` (decisión 13, §10 — abierta).
4. **Rayas EN sin equivalente en ES — CERRADA el 2026-08-09.** `home.json` en inglés usaba el em-dash (`—`) en 5 valores (`story.pillars.practice.body`, `features.gaming.body`, `contact.bodySecond`, `contact.ctaAria`, `contact.form.submitAria`) donde el ES equivalente, clave a clave, usaba dos puntos o coma — no eran traducciones de la misma puntuación, sino dos registros distintos para el mismo inciso. La Tarea 5 reescribió los 5 valores EN con la puntuación nativa del inciso en inglés (coma o dos puntos, fiel al ES de cada clave), dejando `home.json` en los dos idiomas a cero rayas. `legal.json` queda fuera de este cierre: el inglés legal se reescribió sin rayas por decisión del orquestador (3 incisos, sin pérdida de fidelidad normativa) y el español legal conserva sus 6 rayas como incisos RAE legítimos, exención nombrada en el candado de `locales.test.ts`.

### Claro vs. oscuro: el tema como modo de contenido

El tema no es solo una paleta: cada tema cambia qué contenido existe, no solo cómo se ve.

| Sección | Claro | Oscuro |
| --- | --- | --- |
| Hero | Aura pastel, copia a la izquierda | Ojo cósmico, copia centrada |
| Story | 4 tarjetas de pilar + statement | Deck de 6 diapositivas; cierra con nota |
| Journey | Tarjeta con 6 pasos y ruta punteada | Deck de 8 diapositivas |
| Features | Kicker + h2 + intro + 3 tarjetas con CTA | Solo kicker + 3 bloques (sin h2 ni intro) |
| Contact | Chip de correo + CTA mailto + figura | Formulario + tarjeta de Discord + tarjeta de GitHub |

Lectura de producto: el tema oscuro es la versión con más recorrido narrativo y más salidas reales (comunidad, código); el tema claro —el que ve todo el mundo por defecto, porque es el tema inicial del sitio— es la versión con menos.

## 5. Mapa de mensajes por sección

| Sección | Kicker (ES) | Mensaje central ES | Mensaje central EN |
| --- | --- | --- | --- |
| Hero | — (`Home.hero.kicker` se retiró, Task 14 del plan premium F3, 2026-08-11: sustituida por `Home.hero.tagline`, la línea descriptiva «Del vacío al infinito: un proyecto para aprender, imaginar y jugar.», que SÍ se renderiza bajo la marca, fuera del `<h1>`) | «Tu presente ya es tu futuro, solo falta que sigas definiéndolo.» + «Del vacío al infinito: un proyecto para aprender, imaginar y jugar.» | «Your present is already your future: you just have to keep defining it.» + «From the void to infinity: a project for learning, imagining and playing.» |
| Story | «¿Por qué VoidToInfinite?» | «De la curiosidad a la creación.» | «From curiosity to creation.» |
| Journey | «Inspiración» | «Tu viaje no tiene un último paso.» + «El destino no es el infinito. El viaje lo es.» | «Your journey has no final step.» + «The destination is not infinity. The journey is.» |
| Features | «Características» | «Tres formas de seguir avanzando.» (solo tema claro) | «Three ways to keep moving.» (solo tema claro) |
| Contact | «Contacto» | «Construyamos algo infinito.» | «Let's build something infinite.» |
| Pie | — | «Sigue siempre adelante.» | «Together, we go beyond.» |

## 6. CTAs y destinos

| CTA | ES | EN | Destino | Estado |
| --- | --- | --- | --- | --- |
| Hero | «Leer la historia» | «Read the story» | `#story` | OK |
| Features ×3 | «Explora el aprendizaje / la imaginación / el juego» (desde 2026-08-09; antes «Empieza a…») | «Explore Learning / Imagination / Gaming» | `#contact` | Verbo alineado con EN; la promesa ya no es de inicio, pero el destino sigue siendo un mailto genérico — el destino real es la decisión 13 (§10) |
| Contacto (claro) | «Contactar por correo» | «Contact via email» | `mailto:hello@voidtoinfinite.com` | OK |
| Contacto (oscuro) | «Escríbenos» | «Write to us» | `mailto:` con el correo del visitante | Campo vacío desde la Tarea 1 (2026-08-09): arranca en `""` con placeholder «tu@correo.com», valida el formato antes de navegar (`role="status"` sobre el error) y, tras un envío válido, revela un panel persistente con la dirección real de VTI y un botón «Copiar dirección» — la contradicción etiqueta/valor que tenía esta fila está cerrada |
| Contacto (oscuro) | «Únete a la comunidad» | «Join the community» | `discord.gg/CuGhqdG3g3` | Existe en la tarjeta de Contacto oscuro; desde la Tarea 6 hay además un enlace a Discord en el grupo «Comunidad» de navbar/pie, en los dos temas |
| Contacto (oscuro) | «Explora el código» | «Explore the code» | `github.com/voidtoinfinite` | Existe en la tarjeta de Contacto oscuro; desde la Tarea 6 hay además un enlace a GitHub en el grupo «Comunidad» de navbar/pie, en los dos temas |
| Navbar / Pie | «VTI - SDK» | «VTI - SDK» | `dev.voidtoinfinite.com` | Sin ninguna explicación de qué es en ningún texto del sitio |
| Navbar / Pie | «Comunidad» (nuevo, Tarea 6, 2026-08-09) | «Community» | Discord + GitHub, mismos destinos que arriba | `src/config/navigation.ts`, grupo `community`; visible en los dos temas, escritorio y — desde la Tarea 10, vía la hoja de navegación móvil — también por debajo de 768px |
| Pie | Privacidad · Aviso legal | Privacy · Legal | `/privacidad` · `/aviso-legal` | Publicados, pero con `LEGAL_ENTITY` en `POR_COMPLETAR` |

El correo `hello@voidtoinfinite.com` procede del mockup original de la entrega de contacto (decisión de diseño D8); no hay ninguna confirmación registrada en el repo de que ese buzón esté operativo hoy (ver decisión 10, §10).

## 7. El activo infrautilizado

La pieza más honesta del sitio está enterrada en la Política de privacidad, sección «Resumen»:

> «Si solo tienes un minuto: navegar por esta web no nos da ningún dato sobre ti. No hay analítica, ni seguimiento, ni publicidad, ni perfiles.»

Esto no es una declaración de intenciones: es descriptivamente cierto del propio código. Lo único que el sitio escribe en el equipo del visitante son dos claves de `localStorage` (`vti-theme` y `vti-lang`, ambas documentadas también en la propia política, sección «Qué guardamos en tu equipo»), y no hay banner de cookies porque, legalmente, no hace falta uno para ese almacenamiento. Es privacidad radical real, no una promesa de marketing, y hoy es prácticamente invisible: solo la ve quien llega hasta el documento legal. Es candidata natural a subir a la superficie de la landing (por ejemplo, como parte del bloque AEO pendiente, ver `PROYECT.md` §5).

## 8. Hallazgos de coherencia vigentes

**ALTA**

- Features vende una plataforma («Rutas cuidadas que crecen contigo», «Herramientas que despiertan conexiones», «Retos que afilan tus habilidades»…) que el Aviso legal niega explícitamente («no ofrece registro ni cuentas de usuario… no presta ningún servicio contratable en línea»). Cuál de las dos versiones es la verdad es una decisión que solo puede tomar el usuario antes de tocar más copy (decisión 12, §10).
- Los tres CTA de Features entregan un `mailto:` vía `#contact`. El verbo se alineó a «Explora…» el 2026-08-09 (rebaja la promesa incumplida: explorar ya no promete un producto que empezar), pero el destino real de los tres sigue siendo la decisión 13 (§10).
- ~~GitHub y Discord solo existen en el tema oscuro; el pie no tiene enlaces sociales en ningún tema. El tema por defecto del sitio es el claro, así que la mayoría de visitantes nunca ve estos dos destinos.~~ **Resuelto parcialmente (Tarea 6, 2026-08-09):** el grupo «Comunidad» del navbar y del pie (Discord + GitHub) es visible en **los dos temas**, así que el tema por defecto ya no oculta estos dos destinos. Lo que sigue vigente: dentro de la sección Contacto en sí, las tarjetas de Discord/GitHub solo existen en la rama oscura (Tarea 6 no tocó `Contact.tsx`).
- ~~El campo «Tu correo» del formulario de Contacto (tema oscuro) viene precargado con la dirección de VoidToInfinite, no con un campo vacío: la etiqueta dice «tuyo», el valor es el ajeno.~~ **Resuelto (Tarea 1, 2026-08-09):** el campo arranca vacío (`useState("")`), valida el formato antes de navegar y revela un panel de confirmación con la dirección real de VTI tras un envío válido — ver `PRODUCT.md` §6.
- `LEGAL_ENTITY` (`src/config/legal.ts`) está entera en `POR_COMPLETAR`: las páginas legales están estructuralmente completas pero **no son publicables**, y los propios documentos lo declaran en su propio texto (ver notas de `/privacidad` y `/aviso-legal`).

**MEDIA**

- Features en tema oscuro pierde el `<h2>` y la frase-tesis que sí tiene el tema claro.
- El pie cuenta cosas distintas según el idioma (tagline divergente, §4).
- Título y badge están invertidos entre idiomas en Features, lo que además afecta al menú «Descubre» del navbar en español, que lista imperativos como si fueran nombres de sección.
- «VTI - SDK» aparece en navbar y pie sin que ningún texto del sitio explique qué es (decisión 14, §10).
- Features tiene 12 bullets de beneficio (4 por cada uno de los tres bloques) y ninguno se apoya en una prueba verificable (decisión 15, §10).
- El inglés es invisible para los rastreadores: no hay rutas `/en` indexables (decisión 19, §10).
- Claves de navegación fósiles en `Common.Navigation`: `framework`, `games`, `projects`, `reflection` no tienen consumidor visible en la home actual (decisión 18, §10).

**BAJA**

- El lector en inglés ve el literal español `POR_COMPLETAR` seis veces dentro de los documentos legales en inglés. Esto es **deliberado**: es un centinela de máquina (ver spec de la entrega del 2026-08-04 y la lección del 2026-08-05 en `task/lessons.md` sobre por qué traducirlo lo desactiva); no debe «arreglarse» sin leer esa decisión primero.
- `links.playground` (`src/config/links.ts`) queda sin usar salvo por su propio docblock, que describe un consumidor que ya no lo referencia.
- Puntuación divergente en el subtítulo del hero: coma en español, dos puntos en inglés.

## 9. Recorrido del visitante y preguntas sin responder

Orden real del DOM (`HomeSections.tsx`): **Story → Journey → Features → Contact**, precedido por Hero.

- **Hero:** nombre de marca + promesa emocional + línea descriptiva + un único CTA («Leer la historia»). La tagline de categoría que se probó dentro del `<h1>` el 2026-08-08 («Aprendizaje · Imaginación · Juego», `Home.hero.kicker`) se retiró el mismo día por decisión del usuario y quedó huérfana en los locales. Task 14 del plan premium F3 (2026-08-11) resolvió el hallazgo SEO de fondo (un `<h1>` que no describía de qué trataba el sitio): la clave `Home.hero.kicker` se retira y se sustituye por `Home.hero.tagline` («Del vacío al infinito: un proyecto para aprender, imaginar y jugar.» / «From the void to infinity: a project for learning, imagining and playing.», decisión D-A del dueño), renderizada bajo la marca, fuera del `<h1>`. El párrafo `Home.hero.support` («Aunque el infinito está en todas partes...») salió del hero y aterrizó en la apertura de Story, renombrado a `Home.story.support` — el pliegue a 375×812 queda marca + subtítulo + línea + CTA, medido dentro del viewport en los dos temas.
- **Story:** la mejor pieza de escritura del sitio; responde el «por qué» existe VoidToInfinite.
- **Journey:** filosofía dirigida al visitante sobre su propio recorrido. Tras dos secciones seguidas de inspiración, empieza a pesar la pregunta implícita «¿y qué hacéis vosotros, concretamente?».
- **Features:** la primera vez que el sitio suena a producto con funcionalidad — y es también su punto de fuga, porque su promesa más alta (hoy «Explora el aprendizaje / la imaginación / el juego», suavizada desde el «Empieza a…» original el 2026-08-09) sigue resolviendo en un simple `mailto:`.
- **Contact:** tono cálido de cierre; en el tema claro, la sección en sí no muestra ninguna prueba de que el proyecto existe fuera de esta misma landing — pero desde la Tarea 6 (2026-08-09) el visitante ha podido cruzarse antes con el grupo «Comunidad» del navbar o del pie (Discord + GitHub, visibles en los dos temas), así que el dato ya no depende por completo de llegar a la rama oscura de esta sección.

Preguntas que el sitio deja sin responder al final del recorrido: ¿quiénes sois? ¿desde cuándo existe VoidToInfinite? ¿qué habéis hecho ya, concretamente? ¿el aprendizaje que se promete es un producto, es contenido, o es una intención? ¿qué es el SDK? ¿participar es gratis? ¿puedo unirme, y a qué exactamente?

## 10. Datos que necesita dar el dueño

### Decisiones de Fase 0 ya tomadas (13 de 14 — plan premium F1-F5, encargo del dueño, 2026-08-10)

Fuente estratégica: nota del vault `01-Projects/vti/typescript/specs/2026-08-09-plan-premium-por-fases-90.md` (§5, no accesible desde este repo — se cita tal como la trae el plan operativo, `docs/superpowers/plans/2026-08-10-implementacion-plan-premium-f1-f5.md`, Global Constraint 6). El dueño respondió 13 de las decisiones de Fase 0 pedidas; **la decimocuarta no está identificada en ninguna fuente accesible desde este repo** — se declara `_por completar_` en vez de adivinar cuál es, siguiendo el protocolo de veracidad. Las 13 respondidas, con dónde viven en el código:

1. **Identidad de VoidToInfinite: «proyecto creativo».** Responde directamente la pregunta 11 de más abajo (¿equipo, espacio o proyecto?) — queda marcada RESUELTA.
2. **Línea del hero, candidata C (ya implementada).** Texto exacto, verbatim: ES «Del vacío al infinito: un proyecto para aprender, imaginar y jugar.» / EN «From the void to infinity: a project for learning, imagining and playing.» — clave `Home.hero.tagline`, Task 14 (2026-08-11), ver §5 y §9 de este documento.
3. **`hero.support` fuera del pliegue.** El párrafo «Aunque el infinito…» sale del hero y aterriza en la apertura de Story (`Home.story.support`) — Task 14, mismo commit que el punto anterior.
4. **Tema = piel con contenido unificado.** Revierte la lectura previa de `DESIGN.md` §4 («el tema NO es una piel»): las cuatro secciones comparten hoy un único árbol de contenido; solo el arte y el vehículo (tarjeta vs. deck) ramifican por tema. Tasks 15-16 (2026-08-11) — ver `DESIGN.md` §4, enmienda 2026-08-12. Responde de facto los hallazgos de §8 sobre "Features en oscuro pierde `h2`" e "interacción de contacto distinta por tema", ambos cerrados por esta misma vía (ver esas entradas más abajo).
5. **`prefers-color-scheme` inicial (con anti-flash).** `localStorage` gana a `prefers-color-scheme`; sin storage, decide el sistema — Task 9 (2026-08-11) y su corrección, Task 34 (2026-08-12, "detectar no es elegir": la detección automática dejó de persistirse como si fuera una elección).
6. **CTAs de Features a `#contact`.** Confirma el destino ya vigente (no lo cambia): los tres CTA siguen resolviendo en un `mailto:` vía `#contact`. Responde la pregunta 13 de más abajo — queda marcada RESUELTA (decisión: mantener, no un destino nuevo).
7. **`/en` no indexable.** Responde la pregunta 19 de más abajo — queda marcada RESUELTA. No implica ningún cambio de código en esta ronda (el estado actual, sin rutas `/en` indexables, ya cumplía la decisión); ver "Fuera de alcance" del plan operativo, que excluye explícitamente hacer `/en` indexable o añadir hreflang.
8. **Claves fósiles conservadas como roadmap documentado.** El dueño pidió explícitamente NO borrarlas: `framework`/`games`/`projects`/`reflection` (`Common.Navigation.*`) se conservan como roadmap, no como restos muertos. Responde la pregunta 18 de más abajo — queda marcada RESUELTA. Sin cambio de código en esta ronda (la decisión es "conservar", no "implementar"); la entrada correspondiente de `RULES.md` ("Deuda conocida") queda pendiente de anotar con esta decisión en una tarea futura que toque ese fichero.
9. **Numeración honesta.** Fuera «Paso»/«Step» de los pilares de Story (`Home.story.stepLabel`, retirada es/en); fuera el 01/02/03 decorativo de Features (`ScBadge`); Journey conserva su numeración real y la rama clara la conecta con sus 6 pasos en las dos ramas. Tasks 15-16 (2026-08-11); Task 21 del plan queda subsumida.
10. **`sizes` móvil en las 4 escenas.** Ampliado más allá del alcance original (que preveía solo Story): `storyCosmicBeing` desde la Task 12, y `featuresCelestialOrbital`/`journeyCosmicPortal`/`contactCosmicGuardian` desde la Task 30 (2026-08-11, gate F2, decisión del dueño con capturas delante) — los cuatro con `(max-width: 700px) 340px, 100vw`. Ver `PRE-LAUNCH-QA.md` §4 para la cifra de presupuesto de página resultante (2.405.231 B, por debajo de 3 MB por primera vez).
11. **Radios de tarjeta a 16px.** Las tarjetas de Features bajan de 26px a `theme.data.radius.xl` (16px) — Task 23 (2026-08-12). Ver `DESIGN.md` §5.1/§9.
12. **`overshoot` identidad sancionada.** El rebote del despegue del navbar (`motion.easing.overshoot`) se conserva a propósito pese a que el detector anti-slop lo marca — documentado como excepción de identidad en `DESIGN.md` §5.1, Task 23.
13. **Kicker con voz en Features.** `Home.features.kicker` = «¿Por dónde empiezas?» / «Where do you begin?», paralelo del kicker ya sancionado de Story — Task 15 (2026-08-11), decisión D1 de ese informe.

**Los datos D-D (10 bloqueantes legales) y D-B (producto, pendientes) siguen sin respuesta.** La nota del vault los agrupa como "D-B, 6 de producto" pendientes; **este documento no puede verificar esa cifra de 6 de forma independiente** — cotejando los 13 puntos de arriba contra la lista original de 11 decisiones de producto (11-21, más abajo), 4 quedan resueltas (11, 13, 18, 19) y **7** siguen abiertas (12, 14, 15, 16, 17, 20, 21), no 6. La discrepancia se declara en vez de forzarse: puede deberse a que la enumeración "D-B" del vault no sea 1:1 con la lista de 11 puntos de este documento (por ejemplo, si agrupa dos preguntas relacionadas como una sola decisión pendiente), pero no hay forma de confirmarlo desde este repo. Los siete puntos de producto sin responder, y los diez legales, se marcan `_por completar_` tal cual — no se inventan.

### Datos que necesita dar el dueño

Lista íntegra de 21 puntos, tal como los identificó la auditoría del 2026-08-08. Se separan en dos bloques porque tienen naturaleza distinta: los primeros diez son **bloqueantes legales** (sin ellos, `/privacidad` y `/aviso-legal` no son publicables); los once restantes son **decisiones de producto** (afectan al copy y a la arquitectura de información, no a la legalidad de las páginas). **Estado actualizado 2026-08-12 (Task 25):** de los once de producto, 11/13/18/19 quedan RESUELTOS por las decisiones de Fase 0 de arriba; el resto sigue `_por completar_`.

### Bloqueantes legales

1. Denominación del responsable del tratamiento / titular legal.
2. Forma jurídica.
3. NIF/CIF.
4. Domicilio.
5. Datos registrales, o confirmación explícita de que no aplican.
6. Correo legal y dirección para el ejercicio de derechos RGPD.
7. Proveedor de correo electrónico donde se reciben los mensajes de contacto.
8. Garantía concreta de transferencia internacional de datos aplicable al alojamiento en Netlify (por ejemplo, cláusulas contractuales tipo).
9. Plazo de conservación de las consultas recibidas por correo.
10. Confirmación de que `hello@voidtoinfinite.com` está operativo.

### Decisiones de producto

11. ~~¿Qué es VoidToInfinite hoy — equipo, espacio o proyecto? (§1: las tres definiciones conviven sin que ninguna se haya fijado como la oficial).~~ **RESUELTA (Fase 0, plan premium F1-F5, 2026-08-10): «proyecto creativo».** Ver la lista de decisiones de Fase 0, arriba. El copy de §1 (`SITE.description`, "equipo creativo") y `Home.story.body` ("un espacio") no se han actualizado todavía para reflejar esta decisión — la ambigüedad de §1 sigue viva EN EL COPY hasta que una tarea de contenido lo alinee; lo que queda resuelto es la decisión, no (todavía) su propagación al texto publicado.
12. ¿Existe de verdad la plataforma que Features promete, o el Aviso legal dice la verdad al negarla? `_por completar_`.
13. ~~¿A dónde deberían llevar realmente los tres CTA de Features, si no es a un `mailto:` genérico?~~ **RESUELTA (Fase 0, 2026-08-10): siguen a `#contact`/`mailto:`.** El dueño decidió mantener el destino actual, no uno nuevo — ver la lista de decisiones de Fase 0, arriba.
14. ¿Qué es el SDK (`VTI - SDK`, `dev.voidtoinfinite.com`) y para quién está pensado? `_por completar_` (declarado explícitamente fuera de alcance por el plan operativo del 2026-08-10: "explicación de VTI-SDK, F3.4 — necesita hechos del dueño").
15. ¿Hay algo ya hecho que se pueda enseñar como prueba (un repositorio, una entrega, un canal activo)? `_por completar_`.
16. ¿Quiénes están detrás del proyecto? `_por completar_`.
17. ¿Desde cuándo existe VoidToInfinite? `_por completar_`.
18. ~~Las claves de navegación `framework`, `games`, `projects` y `reflection`: ¿son secciones planificadas o restos de una iteración anterior?~~ **RESUELTA (Fase 0, 2026-08-10): se conservan como roadmap documentado — encargo explícito del dueño de no borrarlas.** Ver la lista de decisiones de Fase 0, arriba. Sin cambio de código todavía: la decisión es "conservar y documentar", no "implementar"; `RULES.md` ("Deuda conocida", entrada "Claves `Common.Navigation.*` fósiles") sigue sin la anotación de esta decisión, pendiente de una tarea que toque ese fichero.
19. ~~Estrategia de idioma: ¿debe `/en` ser indexable, o el inglés es solo una cortesía para quien ya está en el sitio?~~ **RESUELTA (Fase 0, 2026-08-10): `/en` NO indexable.** Confirma el estado actual del código — ver la lista de decisiones de Fase 0, arriba.
20. ¿Existen otras plataformas propias además de GitHub y Discord que deban enlazarse? `_por completar_`.
21. Métricas reales, si algún día se quiere aportar prueba social — hoy no existe ninguna cifra verificable en el repo. `_por completar_`.
