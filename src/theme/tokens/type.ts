/**
 * Variantes vivas de la escala tipográfica: 9 desde la crítica externa #14
 * (2026-09-02, retirada de `deckTitle`, ver el hueco que dejó más abajo), 10
 * entre la #11 y esa fecha, 9 desde la crítica externa #9 (2026-08-17), 12
 * antes de esa.
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
 */
export type TypeVariant =
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
