/**
 * Variantes vivas de la escala tipográfica: 10 desde la crítica externa #11
 * (2026-08-18, ver `deckTitle` más abajo), 9 desde la crítica externa #9
 * (2026-08-17), 12 antes de esa.
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
 * AÑADIDA en la crítica externa #11 (2026-08-18): `deckTitle`, el décimo
 * peldaño. Ver su propio docblock, dentro de `scale`, para el porqué completo
 * — incluido por qué es el único peldaño cuyo máximo supera al de `display`.
 *
 * PENDIENTE fuera de este fichero, declarado en vez de corregido en silencio
 * desde una tarea que no es dueña de ese documento: `DESIGN.md` sigue diciendo
 * «12 variantes» y enumerando las tres retiradas, y su lista de deuda conocida
 * sigue apuntando los dos defectos que este cambio cierra (`h4`→`h5` y
 * `h5`=`bodyLg`) más «variante `lead` sin ningún consumidor».
 */
export type TypeVariant =
  | "deckTitle"
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h5"
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
    /**
     * Titular de la diapositiva de INTRO de una presentación a sangre
     * completa (los decks oscuros de Story y de Journey). Peldaño nuevo de la
     * crítica externa #11 (2026-08-18, hallazgo C, decisión del dueño:
     * «`deckTitle` entra en token de paso»).
     *
     * POR QUÉ EXISTE: el mismo `clamp(2rem, 6vw, 4rem)` estaba escrito byte a
     * byte en DOS ficheros de datos de secciones distintas —
     * `STORY_DECK_TITLE_SIZE` (`story.layers.ts`) y `JOURNEY_DECK_TITLE_SIZE`
     * (`journey.layers.ts`) — y las dos piezas que lo pintan
     * (`ScDeckTitle`/`ScJourneyDeckTitle`) ya leían de aquí el resto de sus
     * propiedades tipográficas. Regla 13 de `RULES.md`: una constante de valor
     * idéntico repetida en dos secciones es un token de tema, no dos
     * constantes. Las dos constantes NO desaparecen — siguen siendo el nombre
     * con el que cada sección habla de su cartel — pero ahora derivan de este
     * peldaño en vez de declarar el literal.
     *
     * ESTO REVISA, no ignora, el criterio que `story.layers.ts` dejó escrito
     * en 2026-07-31 («4rem/3rem/8rem no tienen equivalente en `type.scale` y
     * forzarlos ahí contaminaría un contrato que otras secciones también
     * consumen»). Aquel criterio sigue valiendo para los otros cuatro tamaños
     * de cartel de Story, que son medidas de UNA composición y siguen siendo
     * literales en su fichero. Lo que cambió es el hecho que aquel
     * razonamiento no tenía delante: éste NO es de una composición, es el
     * mismo de DOS, y una medida compartida por dos secciones ya no es una
     * medida de sección.
     *
     * SU MÁXIMO SUPERA A `display` (4rem = 64px frente a 3.5rem = 56px), Y ES
     * DELIBERADO. `display` es el techo de la tipografía de DOCUMENTO: lo más
     * grande que puede pedir una página que se lee desplazándose, con más
     * cosas alrededor compitiendo por la atención. Este peldaño viste otra
     * cosa: el único texto de una diapositiva que ocupa el viewport entero,
     * donde no hay nada alrededor de lo que destacar y donde 56px se leería
     * como un párrafo grande, no como un cartel. Que el techo de documento no
     * sea el techo de cartel no es una fuga de la escala, es la distinción que
     * este peldaño nombra — y por eso el máximo NO se recorta a 3.5rem "por
     * coherencia": eso cambiaría lo que hoy pintan las dos secciones, y esta
     * entrada es refactor de vocabulario, no rediseño.
     *
     * `weight`/`lineHeight`/`tracking` son los de `h2`, sin desviación: es
     * EXACTAMENTE lo que `ScDeckTitle` y `ScJourneyDeckTitle` ya declaraban
     * (cada una leyendo `type.scale.h2.*` para esas tres y el literal solo
     * para el tamaño). El peldaño no inventa ningún valor nuevo; recoge el
     * que las dos piezas ya componían a mano.
     *
     * NO TIENE ENTRADA EN `defaultElement` (`Typography.tsx`) A PROPÓSITO. Sus
     * consumidores son los dos `*.layers.ts`, no `<Typography variant=…>`: las
     * piezas de cartel de los dos decks son elementos planos
     * (`styled.h2`), decisión ya razonada en los docblocks de
     * `story.deck.tsx`/`journey.deck.tsx`. Si alguien lo pidiera por
     * `Typography`, el `??` de ese mapa lo resolvería a `<p>` — que es lo
     * correcto para un tamaño sin semántica de encabezado propia.
     */
    deckTitle: {
      size: "clamp(2rem, 6vw, 4rem)",
      weight: 700,
      lineHeight: 1.15,
      tracking: "-0.014em",
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
    h5: { size: "1.125rem", weight: 600, lineHeight: 1.35, tracking: "0" },
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
