/**
 * Constantes de arte propias de la sección Journey (spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §7.2),
 * transcritas VERBATIM del mockup aprobado
 * `C:\Users\Daniel\Downloads\Landing v2.dc.html` líneas 103-155 (D10: estos
 * colores/geometría no entran en los tokens semánticos — `system.test.ts` no
 * se toca).
 *
 * Lo que SÍ usa tokens del tema (D11) vive directamente en `Journey.tsx`:
 * espaciado (`theme.data.space`), radios (`theme.data.radius`), breakpoints
 * y — para el color de cada disco/etiqueta de paso — la rampa de color ya
 * existente (`theme.data.palette.<hue>[<paso>]`), porque el mockup referencia
 * esos mismos nombres (`var(--primary-500)`, `var(--secondary-600)`, etc.):
 * son el mismo sistema de tokens, no un color inventado aparte. Solo lo que
 * el sistema de tokens NO modela (el degradado pastel de la tarjeta, el
 * borde/sombra de los discos, el trazo del path punteado, el degradado de la
 * cita y la sombra de la figura) se congela aquí como literal.
 */

export type JourneyStepId =
  "discover" | "learn" | "imagine" | "create" | "share" | "evolve";

export interface JourneyStep {
  readonly id: JourneyStepId;
  /**
   * Desplazamiento vertical (`transform: translateY`) del paso en el grid de
   * 6 columnas, mockup L114-143. Solo se aplica ≥ `lg` (spec §7.2: "< lg...
   * sin offsets"); por debajo el layout es un grid simple sin transform.
   */
  readonly offsetY: number;
  /** Rampa de color del tema (mockup: `var(--<ramp>-<paso>)`) para el icono
   *  y la etiqueta `0N · Label` de este paso. */
  readonly colorRamp: "primary" | "secondary" | "error";
  readonly colorStep: 500 | 600 | 700;
  /** `box-shadow` VERBATIM del disco (mockup, un valor por paso — no siguen
   *  una única fórmula, así que se listan literales en vez de derivarlos). */
  readonly discShadow: string;
}

/**
 * Orden y geometría EXACTOS del mockup (L114-143): índice = escalón `0N` y
 * escalón del stagger de reveal (`Journey.tsx` multiplica el índice por el
 * paso de ~90ms, mismo mecanismo que `ScItem` en `Features.tsx`).
 */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: "discover",
    offsetY: 0,
    colorRamp: "primary",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.6 0.12 260 / 0.14)",
  },
  {
    id: "learn",
    offsetY: 26,
    colorRamp: "primary",
    colorStep: 600,
    discShadow: "0 8px 20px oklch(0.6 0.12 260 / 0.14)",
  },
  {
    id: "imagine",
    offsetY: 6,
    colorRamp: "secondary",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.6 0.15 290 / 0.14)",
  },
  {
    id: "create",
    offsetY: 30,
    colorRamp: "secondary",
    colorStep: 600,
    discShadow: "0 8px 20px oklch(0.6 0.15 290 / 0.14)",
  },
  {
    id: "share",
    offsetY: 2,
    colorRamp: "secondary",
    colorStep: 700,
    discShadow: "0 8px 20px oklch(0.55 0.2 300 / 0.14)",
  },
  {
    id: "evolve",
    offsetY: 24,
    colorRamp: "error",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.66 0.24 12 / 0.14)",
  },
] as const;

/** Fondo pastel de la tarjeta, VERBATIM del mockup (línea 104). */
export const JOURNEY_CARD_BACKGROUND =
  "linear-gradient(135deg, #FFEBFDEB, #E3F6FFEB)";

/** Borde de los 6 discos, idéntico para todos los pasos (mockup L115 etc.). */
export const JOURNEY_DISC_BORDER = "oklch(0.9 0.03 275)";

/**
 * Path punteado detrás de los pasos (mockup L112), solo ≥ `lg` (spec §7.2).
 * `viewBox`/`d`/trazo copiados verbatim; el propio `<svg>` no lleva
 * `<defs>`/gradiente/patrón (a diferencia de las tarjetas de Features), así
 * que no necesita un id propio.
 */
export const JOURNEY_PATH_VIEWBOX = "0 0 760 96";
export const JOURNEY_PATH_D =
  "M63,28 C105,28 148,54 190,54 S275,34 317,34 S402,58 444,58 S529,30 571,30 S656,52 698,52";
export const JOURNEY_PATH_STROKE = "oklch(0.72 0.1 290 / 0.45)";

/** Degradado de texto de la cita final (mockup L145), estático (la spec no
 *  pide animarlo, a diferencia del degradado del hero en `BrandName.tsx`). */
export const JOURNEY_QUOTE_GRADIENT =
  "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";

/** `filter: drop-shadow(...)` de la figura (mockup L154). */
export const JOURNEY_FIGURE_SHADOW =
  "drop-shadow(0 16px 34px oklch(0.55 0.15 285 / 0.22))";

/**
 * Geometría de la figura (mockup L154), absoluta y SOLO ≥ `xl` (spec §7.2).
 * `width`/`height`/`top` son literales directos del mockup (`width: 305px`,
 * `height: 441px`, `top: 183px`, relativos a la caja de padding de la
 * tarjeta, que es el ancestro `position: relative` más cercano).
 *
 * `right` NO es literal directo: el mockup posiciona con `left: 880px` sobre
 * un lienzo de `max-width: 1280px` con padding `0 32px` (contenido =
 * 1216px) y una tarjeta con padding `var(--space-7)` (48px) por lado. El
 * botón derecho de la figura queda en 880 + 305 = 1185px, a 1216 − 1185 =
 * 31px del borde derecho de la tarjeta. Nuestro contenedor usa el token
 * `grid.containerMax` (1200px, no 1280px del mockup — D11: el contenedor usa
 * el token existente, no el literal del mockup), así que se ancla por
 * `right` (31px, derivado de la aritmética de arriba) en vez de por `left`:
 * a cualquier ancho de tarjeta cercano al mockup, el resultado visual es el
 * mismo disco de figura pegado a la esquina inferior derecha, recortado por
 * el `overflow: hidden` de la tarjeta (mockup L104) — motivo por el que el
 * valor exacto de `top`/`right` no es crítico: `top: 183px` + `height: 441px`
 * excede la altura natural de la tarjeta y el propio mockup cuenta con que
 * el overflow lo recorte.
 */
export const JOURNEY_FIGURE_WIDTH = "305px";
export const JOURNEY_FIGURE_HEIGHT = "441px";
export const JOURNEY_FIGURE_TOP = "183px";
export const JOURNEY_FIGURE_RIGHT = "31px";
export const JOURNEY_FIGURE_SIZES = "305px";

export const JOURNEY_FIGURE_SRC = "/figures/journey-presenting-1024.webp";
export const JOURNEY_FIGURE_SRC_SMALL = "/figures/journey-presenting-640.webp";
