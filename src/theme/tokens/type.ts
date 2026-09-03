/**
 * Variantes vivas de la escala tipográfica: 12 desde la crítica externa #15
 * (2026-09-02, que añade `wordmark`), 11 desde la #14 (2026-09-02, que retira
 * `deckTitle` y añade `deckClosing` y `deckBody`), 10 entre la #11 y esa
 * fecha, 9 desde la crítica externa #9 (2026-08-17), 12 antes de esa.
 *
 * Que la #14 retire un peldaño de deck y añada dos no es contradictorio, y
 * conviene leerlo junto: `deckTitle` se fue porque su tamaño pasó a ser el de
 * `h2` —un segundo nombre para un estilo que ya existía—, mientras que los
 * dos nuevos nombran medidas que NINGUNA variante de documento expresa (un
 * cartel de 8rem y un tramo fluido de 1→1.115rem) y que estaban escritas byte
 * a byte en dos ficheros de sección cada una. El criterio es el mismo en los
 * tres casos: un peldaño existe si dice algo que la escala no decía ya.
 *
 * RETIRADAS en esa revisión — `h4`, `bodyLg` y `code` — con censo propio de
 * consumidores previo (patrones `variant="X"`, `theme.data.type.scale.X`,
 * acceso por corchete, desestructuración y alias local de `theme.data`):
 * **cero usos de las tres en `src/` y en `app/`**. Sus únicas apariciones eran
 * su propia declaración, el contrato de `type.test.ts` y los tests del propio
 * `Typography`, que las ejercitaban sin que ninguna pantalla del sitio las
 * pidiera.
 *
 * Cada una traía además su propio motivo, no solo el recuento a cero:
 *
 * - `h4` (1.25rem) y `h5` (1.125rem) están a 1,11× — un salto que `DESIGN.md`
 *   ya listaba como defecto de la escala («colapsa por abajo»). Con `h4`
 *   fuera, el salto real pasa a ser `h3`→`h5` (1.5 → 1.125rem, 1,33×), del
 *   orden del resto de la escala.
 * - `bodyLg` (1.125rem/400) coincidía EXACTAMENTE en tamaño con `h5`, la otra
 *   mitad del mismo defecto declarado en `DESIGN.md`. Solo se alcanzaba a
 *   través del alias muerto `lead` de `Typography`, retirado en el mismo
 *   cambio.
 * - `code` no era solo un peldaño sin uso: era un peldaño ROTO. `ScTypography`
 *   (`Typography.tsx`) fija `font-family: type.fontBody` para TODAS las
 *   variantes sin excepción, así que un `variant="code"` nunca se pintó
 *   monoespaciado — la única promesa que distinguía a esa variante no se
 *   cumplía en ninguna parte. (`type.fontMono` NO se retira: lo consume
 *   `Story.tsx` por su cuenta, verificado.)
 *
 * AQUÍ VIVIÓ `deckTitle`, añadido en la crítica externa #11 (2026-08-18) y
 * RETIRADO en la #14 (2026-09-02). Ver el hueco documentado dentro de
 * `scale`, en el sitio exacto que ocupaba, para las dos mitades de su
 * historia: por qué nació y por qué se va.
 *
 * PENDIENTE fuera de este fichero, declarado en vez de corregido en silencio
 * desde una tarea que no es dueña de ese documento: `DESIGN.md` sigue diciendo
 * «12 variantes» y enumerando las tres retiradas, y su lista de deuda conocida
 * sigue apuntando los dos defectos que este cambio cierra (`h4`→`h5` y
 * `h5`=`bodyLg`) más «variante `lead` sin ningún consumidor».
 *
 * ---------------------------------------------------------------------------
 * EL PELDAÑO LLAMADO `h5` ES EL CUARTO, Y ESE NOMBRE ES DEUDA — no un
 * descuido. Declarado en la crítica externa #15 (2026-09-02, hallazgo C7).
 * ---------------------------------------------------------------------------
 *
 * Los peldaños con nombre de titular van hoy `h1` (2.5rem) → `h2` (2rem) →
 * `h3` (1.5rem) → `h5` (1.125rem): cuatro rangos, y el cuarto lleva el
 * nombre del quinto. Es el residuo exacto de la #14, que retiró `h4` (1.25rem)
 * por cero consumidores y por estar a 1,11× de `h5` — la retirada era
 * correcta, pero dejó el hueco en el NOMBRE en vez de correr la numeración.
 *
 * CENSO propio antes de decidir (patrones `variant="h5"`, `scale.h5`,
 * `scale["h5"]`, `<h5`, `styled.h5`, `as="h5"`, sobre `src/` y `app/`, tests
 * incluidos), a HEAD `8474ea7`:
 *
 *   - `Story.tsx:1554`         `variant="h5"` -- y con `forwardedAs="p"`.
 *   - `Features.tsx:968`       `type.scale.h5.weight`.
 *   - `story.deck.tsx:711-713` `weight` / `lineHeight` / `tracking`.
 *   - `journey.deck.tsx:695`   `tracking`.
 *
 * Resultado: NINGUNO depende semánticamente de un `<h5>` real. El único que
 * pasa por `Typography` fuerza el `<p>` a propósito, y los otros tres leen
 * propiedades sueltas dentro de sus propias piezas styled. Medido en el árbol
 * entero: el sitio no renderiza ni un `<h5>`, así que renombrar el peldaño no
 * moldea ni un píxel — es un cambio de vocabulario puro.
 *
 * POR QUÉ EL RENAME NO SE EJECUTA AQUÍ, y qué exige exactamente: los cuatro
 * consumidores viven en `src/components/sections/`, fuera del alcance de la
 * tarea que escribe esta nota, y esta ola tiene cinco sesiones editando el
 * MISMO árbol de trabajo. Renombrar la clave sin tocarlos deja `pnpm
 * typecheck` en rojo para todas ellas a la vez (`scale.h5` deja de existir y
 * `variant="h5"` deja de tipar). Los cuatro puntos de edición son los del
 * censo de arriba, más `Typography.tsx` (su tabla de elemento por defecto) y
 * los dos contratos cerrados de `type.test.ts` (`toEqual` y la lista de
 * titulares). Es un rename mecánico de seis ficheros, no un rediseño.
 *
 * LO QUE SÍ SE CIERRA en esta revisión, porque es la mitad que hace daño:
 * `Typography` ya NO mapea este peldaño a un `<h5>` real. Un `<h5>` colgando
 * de la estructura real del sitio (`h1` → `h2` → `h3`) es un salto de nivel;
 * el docblock del hueco que dejó esa entrada, en `Typography.tsx`, lleva el
 * razonamiento completo. Queda el nombre, que no rompe nada — solo miente.
 *
 * Y NO SE RELLENA EL HUECO CON UN `h4` NUEVO, que es la otra salida posible:
 * sería revertir a los tres días una decisión de la #14 tomada con su censo y
 * su medición escritos (1,11× de salto, cero consumidores) sin que haya
 * aparecido ni un consumidor ni una razón nueva. El criterio de este fichero
 * no cambia por la incomodidad de un nombre: un peldaño existe si dice algo
 * que la escala no decía ya.
 */
export type TypeVariant =
  | "deckClosing"
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "wordmark"
  | "h5"
  | "deckBody"
  | "body"
  | "bodySm"
  | "caption"
  | "overline";

/* Sin `export`: solo lo usa el `satisfies` del final de este mismo fichero.
   Estuvo exportado sin un solo consumidor externo desde que se creó el
   sistema; el censo de la crítica externa #8 (2026-08-17) lo confirmó por
   grep sobre `src/` y `app/`. */
interface TypeStyle {
  size: string;
  weight: number;
  lineHeight: number;
  tracking: string;
}

export const type = {
  fontBody: "var(--font-body)",
  fontMono: "var(--font-mono)",
  scale: {
    /*
     * AQUÍ VIVIÓ `deckTitle` — "titular de la diapositiva de INTRO de una
     * presentación a sangre completa", `clamp(2rem, 6vw, 4rem)` con el resto
     * de propiedades copiadas de `h2`. Nació en la crítica externa #11
     * (2026-08-18, hallazgo C) y se RETIRA en la #14 (2026-09-02, decisión D4
     * del dueño). Las dos mitades de la historia, porque ninguna se entiende
     * sin la otra:
     *
     * POR QUÉ NACIÓ: el mismo `clamp()` estaba escrito byte a byte en
     * `STORY_DECK_TITLE_SIZE` (`story.layers.ts`) y `JOURNEY_DECK_TITLE_SIZE`
     * (`journey.layers.ts`) — dos secciones, un solo valor, ninguna sabiendo
     * de la otra. Regla 13 de `RULES.md`: una constante de valor idéntico
     * repetida en dos secciones es un token de tema. Ese diagnóstico era
     * correcto y NO es lo que se revisa aquí: las dos constantes siguen
     * derivando de un peldaño de esta escala, solo que ahora del que ya
     * existía.
     *
     * POR QUÉ SE VA: el peldaño tokenizó la duplicación, pero heredó el
     * TAMAÑO que ninguna de las dos secciones había justificado nunca frente
     * al resto de la página. Medido a 1440x900 por el evaluador de Craft: el
     * `<h2>` de Story y de Journey en tema oscuro pintaba 64 px (el tope de
     * 4rem de este `clamp()`), mientras Features y Contact, en el mismo tema
     * y en la misma página, pintaban su `<h2>` a 32 px (la escala `h2`;
     * Features con su propio `clamp(1.5rem, min(5vw, 3.6dvh), h2)`). El mismo
     * rango semántico a dos tamaños distintos: no una jerarquía, una
     * incoherencia. Decisión del dueño: UN SOLO h2 dentro del oscuro, y son
     * Story y Journey los que bajan al rango de Features/Contact.
     *
     * Con ese cambio, el peldaño se quedaba sin nada propio que decir: sus
     * cuatro propiedades pasaban a ser, una a una, las de `h2` — que es de
     * donde ya salían `weight`/`lineHeight`/`tracking` — así que habría sido
     * un segundo nombre para el mismo estilo. `STORY_DECK_TITLE_SIZE` y
     * `JOURNEY_DECK_TITLE_SIZE` derivan hoy de `h2.size` directamente, y las
     * piezas que los pintan (`ScDeckTitle`, `ScJourneyDeckTitle`) componen ya
     * un `h2` completo del sistema.
     *
     * LO QUE SÍ SIGUE DIFERENCIANDO CLARO Y OSCURO, y por eso queda escrito:
     * el VEHÍCULO, no el tamaño del titular. En oscuro, ese `<h2>` es el
     * cartel de la diapositiva de intro de un deck a sangre completa —
     * elemento plano (`styled.h2`), con su propio equilibrado y su propio
     * ritmo vertical dentro de la diapositiva; en claro, el mismo rango vive
     * dentro de una tarjeta acotada y pasa por `Typography`. Esa diferencia
     * es una decisión de composición (`DESIGN.md` §4: "tema = piel con
     * contenido unificado"), no el accidente de dos escalas que nadie
     * comparó.
     */

    /**
     * CIERRE de una presentación a sangre completa: el texto climático de su
     * última diapositiva. Lo visten hoy la nota de cierre de Story
     * (`ScDeckNote`) y la cita de cierre de Journey (`ScJourneyQuote`).
     * Peldaño nuevo de la crítica externa #14 (2026-09-02, hallazgo P3 del
     * evaluador de Craft).
     *
     * POR QUÉ EXISTE: el mismo `clamp(2.5rem, 11vw, 8rem)` estaba escrito
     * byte a byte en `STORY_DECK_NOTE_SIZE` (`story.layers.ts`) y
     * `JOURNEY_DECK_QUOTE_SIZE` (`journey.layers.ts`) — y con él, el mismo
     * peso 900. Regla 13 de `RULES.md`: una constante de valor idéntico
     * repetida en dos secciones es un token de tema, no dos constantes. Las
     * cuatro constantes siguen existiendo como el nombre con el que cada
     * sección habla de su cierre; lo que dejan de hacer es declarar el valor.
     *
     * ESTO REVISA, a propósito, la decisión T7 de la spec de tipografía de
     * Journey (2026-08-02), que había dejado escrito que las dos parejas
     * coincidían pero NO se acoplaban («coincidir hoy no es depender»), con
     * un test cruzado como punto donde decidir una futura divergencia. Aquel
     * razonamiento trataba la coincidencia como una casualidad revisable; la
     * #14 la reclasifica: los dos textos visten el MISMO rol estructural —el
     * cierre de un deck— igual que el titular de intro vestía el mismo rol en
     * las dos secciones, que es el caso que la #11 ya resolvió tokenizando.
     * El punto de decisión no desaparece, se muda: divergir hoy significa
     * sacar a una de las dos secciones de este peldaño, con su porqué escrito,
     * en vez de editar un literal sin que nadie se entere.
     *
     * SU MÁXIMO SUPERA AL DE `display` (8rem = 128px frente a 3.5rem = 56px),
     * Y ES DELIBERADO, con el mismo argumento que sostuvo al retirado
     * `deckTitle` mientras vivió: `display` es el techo de la tipografía de
     * DOCUMENTO —lo más grande que puede pedir una página que se lee
     * desplazándose, con más cosas alrededor—, y esto viste el único texto de
     * una diapositiva que ocupa el viewport entero. Que el techo de documento
     * no sea el techo de cartel es la distinción que este peldaño nombra, no
     * una fuga de la escala.
     *
     * EL PESO 900 ROMPE EL TECHO DE 800 QUE LA ESCALA TENÍA HASTA HOY, y eso
     * es exactamente lo que tres tests de sección llevaban pidiendo desde
     * 2026-08-02: los docblocks de `STORY_DECK_NOTE_WEIGHT`,
     * `JOURNEY_DECK_QUOTE_WEIGHT` y `JOURNEY_DECK_STEP_LABEL_WEIGHT` declaran
     * que el 900 es una excepción deliberada «hasta que la escala del sistema
     * incorpore un 900», y sus tests obligaban a tomar esa decisión en ese
     * momento en vez de dejar dos fuentes conviviendo. Es este momento: las
     * dos constantes de CIERRE pasan a derivar de aquí. La tercera
     * (`JOURNEY_DECK_STEP_LABEL_WEIGHT`, la etiqueta de paso de Journey) NO
     * deriva, y su docblock explica por qué: viste otro rol, con otro tamaño,
     * y `TypeStyle` es un paquete de cuatro propiedades, no un peso suelto que
     * se pueda compartir sin arrastrar el resto.
     *
     * `lineHeight` (1.03, el de `display`) y `tracking` (0, el de `bodySm`)
     * son EXACTAMENTE los que `ScDeckNote` y `ScJourneyQuote` ya componían a
     * mano leyendo esos dos peldaños. El peldaño no inventa ningún valor: los
     * recoge. Que las dos piezas sigan leyéndolos de `display`/`bodySm` en vez
     * de de aquí es deuda declarada, no descuido — los dos `*.deck.tsx` están
     * fuera del alcance del cambio que estrena este peldaño.
     */
    deckClosing: {
      size: "clamp(2.5rem, 11vw, 8rem)",
      weight: 900,
      lineHeight: 1.03,
      tracking: "0",
    },
    display: {
      size: "clamp(2.5rem, 4.4vw, 3.5rem)",
      weight: 800,
      lineHeight: 1.03,
      tracking: "-0.02em",
    },
    h1: {
      size: "2.5rem",
      weight: 700,
      lineHeight: 1.1,
      tracking: "-0.018em",
    },
    h2: {
      size: "2rem",
      weight: 700,
      lineHeight: 1.15,
      tracking: "-0.014em",
    },
    h3: {
      size: "1.5rem",
      weight: 600,
      lineHeight: 1.2,
      tracking: "-0.012em",
    },
    /**
     * RÓTULO DE MARCA de una cabecera de sitio: el texto «VoidToInfinite» que
     * acompaña al logotipo en la barra superior. Lo visten hoy los dos
     * `ScBrandLink` del repo — el de `Navbar.tsx` (home) y el de
     * `LegalHeader.tsx` (páginas legales). Peldaño nuevo de la crítica externa
     * #15 (2026-09-02, hallazgo C6 del evaluador de Craft).
     *
     * POR QUÉ EXISTE: el mismo `1.15rem` estaba escrito byte a byte en esos
     * dos ficheros, sin que ninguno supiera del otro. Regla 13 de `RULES.md`:
     * un valor idéntico repetido en dos sitios es un token, no dos literales.
     * Y era además el único de los literales de tamaño del repo que NO
     * duplicaba un peldaño vivo — los otros tres (`0.875rem` de
     * `LanguageSelector`, `1rem` de `Footer` y de `Journey`) sí, y su arreglo
     * es leer el peldaño que ya existía.
     *
     * POR QUÉ NO ES `h5`, aunque estén a 1,02× (1.15rem = 18,4px frente a
     * 1.125rem = 18px). No es un rango de TITULAR: es el rótulo de la marca,
     * y el sistema ya distingue exactamente así en otra escala — `grid.navMax`
     * (1280px) frente a `grid.containerMax` (1200px), «magnitudes con
     * propósitos distintos, que deben poder divergir sin arrastrarse la una a
     * la otra». Meterlo en `h5` ataría el rótulo de la cabecera al cuarto
     * rango de titular de los documentos: recalibrar uno movería el otro sin
     * que nadie lo pidiera, y en la dirección contraria un ajuste de marca
     * retocaría los títulos de tarjeta de Story y de Features. Fundirlos
     * además CAMBIARÍA lo que se pinta hoy (18,4px → 18px), que es un cambio
     * de diseño; nombrar una medida repetida no lo es.
     *
     * QUÉ DESCRIBE CADA PROPIEDAD, y cuál no se midió. Tres salen del rótulo
     * REAL, leídas de las dos piezas que lo componen: `size` de los dos
     * `ScBrandLink`; `weight` (700) y `tracking` (0.02em) de `ScBrandName`
     * (`BrandName.tsx`), que es el `<span>` que pinta el texto dentro del
     * enlace. `lineHeight` NO se mide de ninguna declaración: el rótulo es un
     * `inline-flex` de una sola línea dentro de una fila centrada, así que
     * hoy hereda el `1.4em` de `body` — un valor ya computado en píxeles que
     * no describe ningún rol. Se declara 1.2, el paso tenso de la escala
     * (`h3`, `overline`), y se deja escrito que es la única de las cuatro sin
     * consumidor.
     *
     * DEUDA DECLARADA, no descuido: hoy solo `LegalHeader.tsx` lee este
     * peldaño (y solo su `size`). `Navbar.tsx` está fuera del alcance de la
     * tarea que estrena el token, y `ScBrandName` sigue escribiendo su 700 y
     * su 0.02em a mano — los tres puntos quedan para quien sea dueño de esos
     * ficheros, con el peldaño ya disponible.
     */
    wordmark: {
      size: "1.15rem",
      weight: 700,
      lineHeight: 1.2,
      tracking: "0.02em",
    },
    /**
     * EL CUARTO RANGO DE TITULAR. Su nombre es deuda declarada (ver el
     * docblock de `TypeVariant`, arriba); esta entrada documenta otra cosa: un
     * hallazgo de la crítica externa #17 (2026-09-03) que se midió y resultó
     * FALSO, y que conviene dejar escrito para que la próxima ronda no lo
     * vuelva a levantar.
     *
     * EL HALLAZGO: «`h5.size` tiene CERO consumidores mientras `h5.weight`,
     * `h5.lineHeight` y `h5.tracking` suman seis en tres ficheros». La primera
     * mitad de la frase es CIERTA como recuento textual y se reproduce igual
     * hoy: la cadena `scale.h5.size` no aparece ni una vez en `src/` ni en
     * `app/`, mientras las otras tres propiedades sí (`Features.tsx` lee
     * `weight`; `story.deck.tsx`, las tres; `journey.deck.tsx`, `tracking`).
     *
     * POR QUÉ LA CONCLUSIÓN NO SE SIGUE: `ScTypography` (`Typography.tsx`) no
     * lee las propiedades por su nombre, lee el peldaño POR ÍNDICE —
     * `theme.data.type.scale[$variant].size`, y lo mismo para las otras tres—,
     * así que un `<Typography variant="h5">` consume las CUATRO de golpe sin
     * escribir ninguna. Y hay uno: `ScCardTitle`, el título de las cuatro
     * tarjetas de pilar de Story (`Story.tsx`), que pasa `variant="h5"` con
     * `forwardedAs="p"`.
     *
     * MEDIDO EN NAVEGADOR REAL, no deducido del código — servidor de
     * desarrollo a 1440x900, tema claro, `document.visibilityState` en
     * `visible`, `getComputedStyle` sobre los cuatro títulos de tarjeta:
     *
     *   font-size    18px    = 1.125rem = ESTE `size`
     *   line-height  24.3px  = 18 x 1.35 = ESTE `lineHeight`
     *
     * El peso computa 700 porque `ScCardTitle` lo pisa a propósito en su
     * propia declaración, no porque el peldaño no se lea. Es decir: el único
     * campo que el recuento textual daba por muerto es el que está pintando
     * ahora mismo cuatro títulos de la home.
     *
     * LA LECCIÓN, y por eso el candado de `type.test.ts` mide por PELDAÑO y no
     * por campo: en esta escala el campo NO es la unidad de consumo. `TypeStyle`
     * es un paquete de cuatro propiedades que `Typography` aplica entero —el
     * mismo argumento que el docblock de `deckClosing` ya usa para negarse a
     * compartir un peso suelto—, así que un censo por campo produce muertes
     * falsas en cuanto alguien consume el peldaño por la vía normal. Es
     * exactamente lo contrario de lo que necesita el vocabulario de movimiento
     * (`vocabulary-consumers.test.ts`), donde cada campo SÍ se lee por su
     * nombre y el censo por grupo escondía cuatro campos muertos detrás de dos
     * vivos. Dos escalas, dos unidades de censo, y la diferencia es cómo las
     * lee el código, no una preferencia.
     */
    h5: { size: "1.125rem", weight: 600, lineHeight: 1.35, tracking: "0" },
    /**
     * CUERPO DE LECTURA dentro de una diapositiva a sangre completa: el
     * párrafo que acompaña al elemento dominante de la diapositiva, no el
     * cartel. Lo visten hoy el cuerpo de pilar de Story (`ScDeckPillarBody`)
     * y el subtítulo de paso de Journey (`ScJourneyStepSubtitle`). Peldaño
     * nuevo de la crítica externa #14 (2026-09-02, hallazgo P3 del evaluador
     * de Craft).
     *
     * POR QUÉ EXISTE: el mismo `clamp(1rem, 1.4vw, 1.115rem)` estaba escrito
     * byte a byte en `STORY_DECK_PILLAR_BODY_SIZE` y
     * `JOURNEY_DECK_STEP_SUBTITLE_SIZE`. El docblock de la segunda ya
     * afirmaba en prosa que era «el mismo tramo que `STORY_DECK_PILLAR_BODY_
     * SIZE` viste para un texto del mismo rol de lectura en Story» — una
     * invariante que vivía en la memoria de quien escribió los dos ficheros,
     * que es justo lo que la regla 13 de `RULES.md` manda convertir en token.
     *
     * POR QUÉ NO ES `body`, y por eso ocupa un peldaño propio entre `h5` y
     * `body`: `body` es 1rem fijo y esto es un tramo FLUIDO que crece hasta
     * 1.115rem con el ancho del viewport. Comparten el suelo —el mínimo del
     * `clamp()` es exactamente `body.size`, y es deliberado: por debajo del
     * tamaño base de lectura del sitio ninguno de los dos párrafos debe
     * caer— pero no el techo. Su sitio en el fichero es el que le toca por
     * tamaño: la escala se lee como una escalera descendente y este peldaño
     * cae entre 1.125rem y 1rem.
     *
     * `weight`/`lineHeight`/`tracking` son los de `body`, sin desviación: es
     * EXACTAMENTE lo que las dos piezas ya componían a mano (cada una leyendo
     * `type.scale.body.*` para esas tres y el literal solo para el tamaño).
     * Que sigan leyéndolas de `body` en vez de de aquí es deuda declarada:
     * los dos `*.deck.tsx` están fuera del alcance del cambio que estrena
     * este peldaño.
     */
    deckBody: {
      size: "clamp(1rem, 1.4vw, 1.115rem)",
      weight: 400,
      lineHeight: 1.6,
      tracking: "0",
    },
    body: { size: "1rem", weight: 400, lineHeight: 1.6, tracking: "0" },
    bodySm: {
      size: "0.875rem",
      weight: 400,
      lineHeight: 1.55,
      tracking: "0",
    },
    caption: {
      size: "0.75rem",
      weight: 500,
      lineHeight: 1.4,
      tracking: "0.01em",
    },
    overline: {
      size: "0.6875rem",
      weight: 600,
      lineHeight: 1.2,
      tracking: "0.18em",
    },
  } satisfies Record<TypeVariant, TypeStyle>,
} as const;
