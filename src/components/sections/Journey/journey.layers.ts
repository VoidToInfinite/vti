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
 * Ancho reservado para la figura (mockup L154: `width: 305px`), tanto para
 * el `padding-inline-end` que reserva su hueco (`ScBody` en `Journey.tsx`)
 * como para el ancho de su caja de `object-fit: contain`.
 *
 * REVISADO 2026-07-28 (fix de solape con el camino punteado): el mockup
 * posiciona la figura con coordenadas absolutas (`top`/`left`) medidas
 * contra SU propio lienzo estático; portadas literalmente a un layout con
 * contenido real (traducciones de distinto largo, alto de tarjeta
 * variable) la figura acababa montada sobre el camino/rejilla de pasos en
 * cuanto el contenido no coincidía exactamente con el mockup. Se sustituyen
 * `top`/`right`/`height` por un layout que reserva el hueco por
 * construcción (`ScBody`/`ScFigure` en `Journey.tsx`, `inset-block: 0` +
 * `height: 100%` + `object-fit: contain`): la figura entra siempre completa
 * y nunca se superpone al camino, sea cual sea la altura real de la
 * columna. Solo el ANCHO sigue siendo un literal del mockup.
 */
export const JOURNEY_FIGURE_WIDTH = "250px";
export const JOURNEY_FIGURE_SIZES = "305px";

/*
 * Intercambio deliberado 2026-07-28 (edicion manual del usuario, en los dos
 * lados a la vez: Story.tsx pasa a usar journey-presenting-*): Journey usa
 * la figura que originalmente se genero para Story. El alt de i18n
 * (`Home.journey.figureAlt`, "presentando el viaje con la palma abierta")
 * queda desalineado con el contenido real de esta imagen (una figura
 * senalando hacia arriba) -- señalado al usuario, no corregido aqui sin
 * consultar: el texto alternativo es contenido, no geometria de layout.
 */
export const JOURNEY_FIGURE_SRC = "/figures/story-pointing-1024.webp";
export const JOURNEY_FIGURE_SRC_SMALL = "/figures/story-pointing-640.webp";
