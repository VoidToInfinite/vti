/**
 * Constantes de arte de la sección Features (spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §7.3),
 * transcritas VERBATIM de `Landing v2.dc.html` (líneas 157-210, citadas en
 * cada bloque) — decisión D10 de la spec: los colores propios de estas
 * tarjetas no son tokens semánticos (no cambian con el tema; la sección solo
 * vive en claro) y viven aquí, no en `theme/tokens/`.
 *
 * ## Qué SÍ es verbatim y qué es una equivalencia deliberada
 *
 * El mockup resuelve sus colores de rol (`var(--primary-600)`,
 * `var(--secondary-700)`…) contra una hoja de tokens externa
 * (`_ds/.../tokens/colors.css`) que NO está presente en el `.html` entregado
 * ni en ningún archivo local accesible — es un enlace relativo a un paquete
 * de herramienta de diseño que no se pudo resolver (protocolo de veracidad:
 * no se inventa el valor numérico de esa variable). Como el propio nombre de
 * paso (`primary-500`, `primary-600`, `primary-800`…) coincide exactamente
 * con la escalera `STEPS` de `theme/tokens/color.ts`, esos casos se resuelven
 * en el COMPONENTE contra el token real del tema
 * (`theme.data.palette.primary[600]`, etc.) en vez de fabricar aquí un
 * `oklch(...)` que nadie puede verificar. Lo que SÍ es un literal `oklch()`
 * o `#hex` escrito directamente en el `style` del mockup (bordes, fondos,
 * sombras, patrones decorativos, y los dos acentos de Gaming que no usan
 * `var()`) se transcribe tal cual en este archivo.
 */

export type FeatureKey = "learning" | "imagination" | "gaming";

export const FEATURE_KEYS: readonly FeatureKey[] = [
  "learning",
  "imagination",
  "gaming",
] as const;

/** Radio de esquina de las tres tarjetas (mockup L164/179/194: `border-radius: 22px`).
 *  No coincide con ningún paso de `theme.tokens.radius` (xl=16px, 2xl=24px):
 *  se conserva el valor exacto del arte en vez de redondear a un token. */
export const FEATURES_CARD_RADIUS = "22px";

/** Duración del hover del CTA de texto (mockup L176/191/206: `transition:
 *  transform 150ms …, color 150ms …`). No coincide con ningún paso de
 *  `theme.tokens.motion.duration` (fast=100ms, base=200ms): se conserva el
 *  valor exacto. El easing SÍ es un token (`motion.easing.standard`, ver
 *  `Features.tsx`) — coincide literalmente con `cubic-bezier(0.4, 0, 0.2, 1)`. */
export const FEATURES_CTA_TRANSITION_MS = "150ms";

/** Desplazamiento horizontal del CTA en hover, igual en las tres tarjetas
 *  (mockup L176/191/206: `transform: translateX(3px)`). */
export const FEATURES_CTA_HOVER_TRANSLATE_X = "3px";

/** Altura mínima del CTA de texto. El mockup usa 40px en Learning (L176) y
 *  36px en Imagination/Gaming (L191/206); la diferencia de 4px es
 *  imperceptible y no está motivada por ningún contenido distinto, así que
 *  se unifica a un solo valor en vez de replicar una asimetría que lee como
 *  artefacto de exportación, no como intención de diseño. */
export const FEATURES_CTA_MIN_HEIGHT = "40px";

/** Trazo del check de los bullets: mismo `path` en las tres tarjetas
 *  (mockup L171-174/186-189/201-204). */
export const FEATURES_CHECK_ICON_PATH = "M20 6L9 17l-4-4";

/** Degradado de texto del término "Gaming" en el `h2` (mockup L160): los dos
 *  stops son literales `oklch()` en el propio mockup, no una `var()` — se
 *  transcriben tal cual, sin pasar por la escalera de tema. */
export const FEATURES_GAMING_TITLE_GRADIENT =
  "linear-gradient(100deg, oklch(0.72 0.15 292), oklch(0.77 0.13 335))";

/** Acento propio de Gaming para el check de los bullets y el CTA (mockup
 *  L201-204 y L206): literal `oklch()`, no `var(--secondary-*)` — es un
 *  matiz deliberadamente distinto del `secondary` de tema, así que no se
 *  sustituye por un token. */
export const FEATURES_GAMING_ACCENT = "oklch(0.62 0.17 340)";
/** Estado hover del acento de Gaming (mockup L206: `color: oklch(0.55 0.18 340)`). */
export const FEATURES_GAMING_ACCENT_HOVER = "oklch(0.55 0.18 340)";

export interface FeaturePatternShape {
  readonly type: "path" | "circle";
  readonly d?: string;
  readonly cx?: number;
  readonly cy?: number;
  readonly r?: number;
}

export interface FeatureCardVisual {
  /** `border` de la tarjeta en reposo. */
  readonly border: string;
  /** `border-color` en `:hover`. */
  readonly borderHover: string;
  /** `background` (degradado de fondo) de la tarjeta. */
  readonly background: string;
  /** `box-shadow` en reposo. */
  readonly shadow: string;
  /** `box-shadow` en `:hover`. */
  readonly shadowHover: string;
  /** `transform: translateY(...)` en `:hover`. Distinto en Imagination
   *  (-11px) frente a Learning/Gaming (-5px) — verbatim del mockup pese a la
   *  asimetría (ver docblock de `FEATURE_CARD_VISUALS`). */
  readonly hoverTranslateY: string;
  /** id único del `<pattern>` SVG decorativo (`aria-hidden`). */
  readonly patternId: string;
  /** `stroke` del patrón (con su propia alfa, literal `oklch()`). */
  readonly patternStroke: string;
  /** Valor de `patternTransform="rotate(N)"` del mockup. */
  readonly patternRotate: number;
  /** Figuras geométricas del patrón, en el orden en que el mockup las declara. */
  readonly patternShapes: readonly FeaturePatternShape[];
  /** `filter: drop-shadow(...)` de la figura de la tarjeta. */
  readonly figureDropShadow: string;
  /**
   * Alto de la figura ≥ md, en px FIJOS, no en `%` como el mockup (96%/92%).
   * Medido en navegador (revisión 2026-07-28): el `%` del mockup funciona
   * porque SU tarjeta declara `height: 300px`; la nuestra dimensiona por
   * contenido, y un alto porcentual contra un padre cuyo alto depende a su
   * vez del hijo crea una dependencia circular que infló las tarjetas hasta
   * ~620px. Se congela el resultado que el mockup calculaba: 96%/92% de sus
   * 300px → 288px/276px.
   */
  readonly figureHeight: string;
}

/**
 * Geometría y color propios de cada tarjeta (mockup L163-208). El orden de
 * pintado real lo decide `FEATURE_KEYS` (Learning → Imagination → Gaming),
 * este registro solo asocia datos por clave.
 *
 * La asimetría de `hoverTranslateY` (Imagination -11px frente a -5px de las
 * otras dos) se verificó releyendo el mockup dos veces: no es un error de
 * transcripción, el `style-hover` de L179 dice literalmente
 * `translateY(-11px)`. Se conserva tal cual — la instrucción es verbatim, no
 * "verbatim salvo que parezca raro".
 */
export const FEATURE_CARD_VISUALS: Record<FeatureKey, FeatureCardVisual> = {
  learning: {
    border: "oklch(0.88 0.045 250)",
    borderHover: "oklch(0.8 0.08 250)",
    background: "linear-gradient(160deg, #F0F5FC, #FBFCFE)",
    shadow: "0 14px 30px oklch(0.6 0.12 250 / 0.10)",
    shadowHover: "0 20px 42px oklch(0.6 0.12 250 / 0.18)",
    hoverTranslateY: "-5px",
    patternId: "vtiPatLearn",
    patternStroke: "oklch(0.6 0.12 250 / 0.14)",
    patternRotate: -8,
    patternShapes: [
      {
        type: "path",
        d: "M14 18c3.5-2.3 7-2.3 10.5 0v13c-3.5-2.3-7-2.3-10.5 0zM24.5 18c3.5-2.3 7-2.3 10.5 0v13c-3.5-2.3-7-2.3-10.5 0z",
      },
      { type: "path", d: "M60 52v10M55 57h10" },
      { type: "circle", cx: 66, cy: 20, r: 3 },
    ],
    figureDropShadow: "drop-shadow(0 12px 24px oklch(0.55 0.12 250 / 0.2))",
    figureHeight: "288px",
  },
  imagination: {
    border: "oklch(0.88 0.05 292)",
    borderHover: "oklch(0.8 0.09 292)",
    background: "linear-gradient(160deg, #F5F1FC, #FCFBFE)",
    shadow: "0 14px 30px oklch(0.6 0.14 292 / 0.10)",
    shadowHover: "0 20px 42px oklch(0.6 0.14 292 / 0.18)",
    hoverTranslateY: "-11px",
    patternId: "vtiPatImagine",
    patternStroke: "oklch(0.58 0.15 292 / 0.14)",
    patternRotate: 6,
    patternShapes: [
      { type: "path", d: "M20 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" },
      {
        type: "path",
        d: "M60 48l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z",
      },
      { type: "circle", cx: 64, cy: 18, r: 3.5 },
      { type: "path", d: "M18 58c0-4 3-7 7-7" },
    ],
    figureDropShadow: "drop-shadow(0 12px 24px oklch(0.55 0.14 292 / 0.2))",
    figureHeight: "276px",
  },
  gaming: {
    border: "oklch(0.9 0.05 335)",
    borderHover: "oklch(0.82 0.09 335)",
    background: "linear-gradient(160deg, #FCF0F6, #FEFBFC)",
    shadow: "0 14px 30px oklch(0.66 0.13 335 / 0.10)",
    shadowHover: "0 20px 42px oklch(0.66 0.13 335 / 0.18)",
    hoverTranslateY: "-5px",
    patternId: "vtiPatGame",
    patternStroke: "oklch(0.62 0.14 335 / 0.14)",
    patternRotate: -6,
    patternShapes: [
      {
        type: "path",
        d: "M20 10l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",
      },
      { type: "path", d: "M62 46v12M56 52h12" },
      { type: "circle", cx: 64, cy: 16, r: 3 },
    ],
    figureDropShadow: "drop-shadow(0 12px 24px oklch(0.6 0.15 335 / 0.2))",
    figureHeight: "276px",
  },
};

/** Nombre base de los ficheros WebP publicados en `public/figures/`
 *  (pipeline documentado en `assets/figures/manifest.json`, spec §6). */
export const FEATURE_FIGURE_BASENAME: Record<FeatureKey, string> = {
  learning: "feature-learning",
  imagination: "feature-imagination",
  gaming: "feature-gaming",
};

/** `sizes` de las figuras de Features: en escritorio ocupan una franja fija
 *  dentro de la tarjeta (~240px), nunca el ancho completo del viewport. */
export const FEATURES_FIGURE_SIZES =
  "(max-width: 767px) 45vw, (max-width: 1023px) 200px, 240px";

/**
 * Caja de la rama oscura (2026-07-30, mismo criterio que
 * `STORY_DARK_MAX_WIDTH`/`JOURNEY_PORTAL_MAX_WIDTH`): acotada y centrada, no
 * a sangre. A diferencia de Story/Journey, aquí es `MIN_HEIGHT`, no una
 * altura fija en `dvh`: las tres tarjetas (título+cuerpo+4 bullets+CTA cada
 * una) son bastante más contenido que los pilares de Story o los pasos de
 * Journey, y una caja de altura FIJA con `overflow: hidden` recortaría ese
 * contenido en viewports bajos. `min-height` deja que la sección crezca con
 * el contenido real; el fondo (`object-fit: cover`) cubre cualquier alto que
 * resulte.
 */
export const FEATURES_DARK_MAX_WIDTH = "1280px";
export const FEATURES_DARK_MIN_HEIGHT = "80vh";
