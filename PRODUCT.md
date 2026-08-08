# PRODUCT.md — VoidToInfinite

> Este documento describe lo que la web **dice hoy**, no lo que el proyecto aspira a ser. Se actualiza cuando cambia el copy (`src/i18n/locales/`) o los destinos declarados en `src/config/`. Toda cita proviene del código y el copy real del repo, verificada contra `src/i18n/locales/es/` y `src/i18n/locales/en/` el 2026-08-08. Lo que el repo no dice se marca `_por completar_`; nada se rellena por inferencia.

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
    - desarrolladores, únicamente alcanzables vía el enlace «Explora el código» a GitHub, que solo existe en el **tema oscuro** de Contacto;
    - comunidad, únicamente alcanzable vía «Únete a la comunidad» (Discord), también solo en tema oscuro.
- **B2B / colaboración:** mencionada de refilón en el cuerpo de Contacto («¿Tienes una pregunta, una idea o una colaboración en mente?») y reconocida formalmente en la Política de privacidad, que contempla «la aplicación de medidas precontractuales a petición tuya cuando escribes para plantear una colaboración o un encargo» como base legal alternativa del tratamiento del correo. No existe ninguna sección de la landing que le hable directamente a esta audiencia. Segmentación real (tamaño, tipo de colaboración buscada): `_por completar_`.

## 4. Tono de voz

### Común a ambos idiomas

Cálido, íntimo, en segunda persona, de frases cortas y con gusto por la paradoja. El imperativo llega a lo áspero cuando quiere: «Lee menos, prueba más. Rompe algo a propósito y arréglalo.» (pilar «La práctica lo hace real»). Cero jerga corporativa, cero superlativos, cero cifras en ningún punto del copy de producto. Vocabulario recurrente de campo semántico cósmico: infinito, viaje, celestial, void.

### Español vs. inglés

El español es la versión canónica: idioma por defecto del sitio, el que se prerrenderiza en el HTML, el de la metadata y el de los documentos legales. El inglés es una traducción fiel salvo **tres divergencias verificadas**:

1. **Tagline del pie.** ES: «Sigue siempre adelante.» (`Common.Footer.tagline`) — EN: «Together, we go beyond.» Son dos declaraciones de marca distintas, no una traducción la una de la otra.
2. **Rol título/badge invertido en las identidades de Features.** En inglés, `title` lleva el sustantivo («Learning», «Imagination», «Gaming») y `badge` el verbo («Learn», «Create», «Play»); en español es al revés: `title` lleva el verbo («Aprende», «Imagina», «Juega») y `badge` el sustantivo («Aprendizaje», «Imaginación», «Juego»). Esto además se filtra al menú «Descubre» del navbar en español, que termina listando imperativos como si fueran nombres de destino.
3. **Verbo de los CTA de Features.** EN usa «Explore» («Explore Learning», «Explore Imagination», «Explore Gaming»); ES usa «Empieza a» («Empieza a aprender», «Empieza a imaginar», «Empieza a jugar»). Un verbo de exploración frente a un verbo de inicio no prometen lo mismo.

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
| Hero | «Aprendizaje · Imaginación · Juego» (tagline del `<h1>` desde 2026-08-08) | «Tu presente ya es tu futuro, solo falta que sigas definiéndolo.» | «Your present is already your future: you just have to keep defining it.» |
| Story | «¿Por qué VoidToInfinite?» | «De la curiosidad a la creación.» | «From curiosity to creation.» |
| Journey | «Inspiración» | «Tu viaje no tiene un último paso.» + «El destino no es el infinito. El viaje lo es.» | «Your journey has no final step.» + «The destination is not infinity. The journey is.» |
| Features | «Características» | «Tres formas de seguir avanzando.» (solo tema claro) | «Three ways to keep moving.» (solo tema claro) |
| Contact | «Contacto» | «Construyamos algo infinito.» | «Let's build something infinite.» |
| Pie | — | «Sigue siempre adelante.» | «Together, we go beyond.» |

## 6. CTAs y destinos

| CTA | ES | EN | Destino | Estado |
| --- | --- | --- | --- | --- |
| Hero | «Leer la historia» | «Read the story» | `#story` | OK |
| Features ×3 | «Empieza a aprender / imaginar / jugar» | «Explore Learning / Imagination / Gaming» | `#contact` | Promesa no cumplida: el CTA promete «empieza» y entrega un mailto genérico |
| Contacto (claro) | «Contactar por correo» | «Contact via email» | `mailto:hello@voidtoinfinite.com` | OK |
| Contacto (oscuro) | «Escríbenos» | «Write to us» | `mailto:` prerrellenado | El campo etiquetado «Tu correo» viene precargado con la dirección de VTI, no con un campo vacío para el visitante — contradicción entre la etiqueta y el valor |
| Contacto (oscuro) | «Únete a la comunidad» | «Join the community» | `discord.gg/CuGhqdG3g3` | Solo existe en tema oscuro |
| Contacto (oscuro) | «Explora el código» | «Explore the code» | `github.com/voidtoinfinite` | Solo existe en tema oscuro |
| Navbar / Pie | «VTI - SDK» | «VTI - SDK» | `dev.voidtoinfinite.com` | Sin ninguna explicación de qué es en ningún texto del sitio |
| Pie | Privacidad · Aviso legal | Privacy · Legal | `/privacidad` · `/aviso-legal` | Publicados, pero con `LEGAL_ENTITY` en `POR_COMPLETAR` |

El correo `hello@voidtoinfinite.com` procede del mockup original de la entrega de contacto (decisión de diseño D8); no hay ninguna confirmación registrada en el repo de que ese buzón esté operativo hoy (ver decisión 10, §10).

## 7. El activo infrautilizado

La pieza más honesta del sitio está enterrada en la Política de privacidad, sección «Resumen»:

> «Si solo tienes un minuto: navegar por esta web no nos da ningún dato sobre ti. No hay analítica, ni seguimiento, ni publicidad, ni perfiles.»

Esto no es una declaración de intenciones: es descriptivamente cierto del propio código. Lo único que el sitio escribe en el equipo del visitante son dos claves de `localStorage` (`vti-theme` y `vti-lang`, ambas documentadas también en la propia política, sección «Qué guardamos en tu equipo»), y no hay banner de cookies porque, legalmente, no hace falta uno para ese almacenamiento. Es privacidad radical real, no una promesa de marketing, y hoy es prácticamente invisible: solo la ve quien llega hasta el documento legal. Es candidata natural a subir a la superficie de la landing (por ejemplo, como parte del bloque AEO pendiente, ver `PROYECT.md` §5).

## 8. Hallazgos de coherencia vigentes

**ALTA**

- Features vende una plataforma («Rutas cuidadas que crecen contigo», «Herramientas que despiertan conexiones», «Retos que afilan tus habilidades»…) que el Aviso legal niega explícitamente («no ofrece registro ni cuentas de usuario… no presta ningún servicio contratable en línea»). Cuál de las dos versiones es la verdad es una decisión que solo puede tomar el usuario antes de tocar más copy (decisión 12, §10).
- Los tres CTA de Features prometen «empieza a aprender / imaginar / jugar» y entregan un `mailto:` a `#contact` (decisión 13, §10).
- GitHub y Discord solo existen en el tema oscuro; el pie no tiene enlaces sociales en ningún tema. El tema por defecto del sitio es el claro, así que la mayoría de visitantes nunca ve estos dos destinos.
- El campo «Tu correo» del formulario de Contacto (tema oscuro) viene precargado con la dirección de VoidToInfinite, no con un campo vacío: la etiqueta dice «tuyo», el valor es el ajeno.
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

- **Hero:** nombre de marca + promesa emocional + un único CTA («Leer la historia»). Desde la entrega del 2026-08-08 también muestra la categoría del proyecto como tagline visible del `<h1>` («Aprendizaje · Imaginación · Juego»).
- **Story:** la mejor pieza de escritura del sitio; responde el «por qué» existe VoidToInfinite.
- **Journey:** filosofía dirigida al visitante sobre su propio recorrido. Tras dos secciones seguidas de inspiración, empieza a pesar la pregunta implícita «¿y qué hacéis vosotros, concretamente?».
- **Features:** la primera vez que el sitio suena a producto con funcionalidad — y es también su punto de fuga, porque la promesa más alta del sitio (empezar a aprender/crear/jugar) resuelve en un simple `mailto:`.
- **Contact:** tono cálido de cierre; en el tema claro, el visitante llega hasta el final sin haber visto una sola prueba de que el proyecto existe fuera de esta misma landing.

Preguntas que el sitio deja sin responder al final del recorrido: ¿quiénes sois? ¿desde cuándo existe VoidToInfinite? ¿qué habéis hecho ya, concretamente? ¿el aprendizaje que se promete es un producto, es contenido, o es una intención? ¿qué es el SDK? ¿participar es gratis? ¿puedo unirme, y a qué exactamente?

## 10. Datos que necesita dar el dueño

Lista íntegra de 21 puntos, tal como los identificó la auditoría del 2026-08-08. Se separan en dos bloques porque tienen naturaleza distinta: los primeros diez son **bloqueantes legales** (sin ellos, `/privacidad` y `/aviso-legal` no son publicables); los once restantes son **decisiones de producto** (afectan al copy y a la arquitectura de información, no a la legalidad de las páginas).

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

11. ¿Qué es VoidToInfinite hoy — equipo, espacio o proyecto? (§1: las tres definiciones conviven sin que ninguna se haya fijado como la oficial).
12. ¿Existe de verdad la plataforma que Features promete, o el Aviso legal dice la verdad al negarla?
13. ¿A dónde deberían llevar realmente los tres CTA de Features, si no es a un `mailto:` genérico?
14. ¿Qué es el SDK (`VTI - SDK`, `dev.voidtoinfinite.com`) y para quién está pensado?
15. ¿Hay algo ya hecho que se pueda enseñar como prueba (un repositorio, una entrega, un canal activo)?
16. ¿Quiénes están detrás del proyecto?
17. ¿Desde cuándo existe VoidToInfinite?
18. Las claves de navegación `framework`, `games`, `projects` y `reflection`: ¿son secciones planificadas o restos de una iteración anterior?
19. Estrategia de idioma: ¿debe `/en` ser indexable, o el inglés es solo una cortesía para quien ya está en el sitio?
20. ¿Existen otras plataformas propias además de GitHub y Discord que deban enlazarse?
21. Métricas reales, si algún día se quiere aportar prueba social — hoy no existe ninguna cifra verificable en el repo.
