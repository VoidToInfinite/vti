/**
 * Variantes vivas de la escala tipográfica: 9, no las 12 que hubo hasta la
 * crítica externa #9 (2026-08-17).
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
