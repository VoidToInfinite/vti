/**
 * Constantes de arte de Contact ("Let's build something infinite."), tema
 * claro. Mismo precedente que `aura.layers.ts`/`eye.layers.ts`/
 * `story.layers.ts`: los colores propios de esta sección NO entran en los
 * tokens semánticos del sistema (D10, spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §2/§7.4)
 * — son literales decorativos de UNA composición concreta, no roles de UI
 * que deban cambiar con el tema (Contact solo se monta en tema claro, vía
 * `HomeSections`). Se copian VERBATIM del mockup aprobado
 * (`Landing v2.dc.html`, sección `#contact`, líneas 212-238) y se citan aquí
 * con su línea de origen para que un futuro retoque compare contra la
 * fuente, no contra un número sin contexto.
 *
 * Los colores que SÍ resuelven a un rol de token existente (kicker ->
 * `semantic.brandText`, el degradado del CTA -> `palette.primary[600]`/
 * `palette.secondary[600]`, borde del chip -> `semantic.border`) se
 * referencian directamente desde `Contact.tsx` contra el tema, sin
 * duplicarlos aquí — mismo criterio que ya aplica `Story.tsx`/`Hero.tsx`.
 *
 * Mapeo de rol de texto (el mockup usa un design system externo no incluido
 * en el HTML, `_ds/.../tokens/colors.css`, cuyas variables no están
 * disponibles para leer aquí): `var(--text-secondary)` (cuerpo/chip) se
 * mapea al rol `semantic.textMuted` de este sistema; `var(--text-default)`
 * a `semantic.text`; `var(--border-default)` a `semantic.border`. Mismo
 * criterio de mapeo por rol, no por nombre literal, que ya usa el resto del
 * repo (p. ej. `accent()` en `Button.tsx`).
 */

/** Borde y sombra de la tarjeta (mockup L213). El fondo del propio degradado
 * pastel de la tarjeta va en `CONTACT_CARD_GRADIENT`. */
export const CONTACT_CARD_BORDER = "oklch(0.88 0.04 270)";
export const CONTACT_CARD_GRADIENT =
  "linear-gradient(110deg, #EFF4FC 0%, #F5F2FB 55%, #F9F0F7 100%)";
/** Color de sombra; la geometría (offset/blur) vive junto al selector que la usa. */
export const CONTACT_CARD_SHADOW = "oklch(0.6 0.1 265 / 0.1)";

/**
 * Degradado de texto de "infinito." (mockup L216): tres paradas propias
 * (`235`, `255`, `292`), distintas de los hue de `palette.primary`
 * (`235.851`) / `palette.secondary` (`311.928`) del sistema — el hue 235 es
 * casi idéntico al primario, pero 255/292 no lo son, así que no es
 * sustituible por un paso de `palette.*`. Al igual que `STORY_ACCENT_GRADIENT`
 * (`story.layers.ts`), el mockup no le aplica `vtiGradientShift` a este span
 * (solo al "ToInfinite" del hero), así que se declara estático, sin animación.
 */
export const CONTACT_TITLE_ACCENT_GRADIENT_LIGHT =
  "linear-gradient(110deg, oklch(0.52 0.13 235), oklch(0.66 0.15 255), oklch(0.72 0.15 292))";

/**
 * Variante oscura del degradado (2026-07-30, mismo criterio que
 * `STORY_ACCENT_GRADIENT_DARK`/`JOURNEY_QUOTE_GRADIENT_DARK`): misma familia
 * de hue (235/255/292), luminosidad mucho mayor para legibilidad sobre el
 * negro-azulado de `ContactNeonGalaxy` (`CONTACT_NEON_VOID`, `#02040e`).
 */
export const CONTACT_TITLE_ACCENT_GRADIENT_DARK =
  "linear-gradient(110deg, oklch(0.78 0.13 235), oklch(0.82 0.13 255), oklch(0.86 0.12 292))";

/** Fondo translúcido del chip de email (mockup L219, tema claro): blanco con
 * alfa sobre el degradado pastel de la tarjeta — no es un rol semántico
 * (`semantic.surface` es opaco), es la superposición específica de esta
 * pieza. */
export const CONTACT_CHIP_BG_LIGHT = "rgba(255, 255, 255, 0.82)";

/** Variante oscura del chip (2026-07-30): mismo negro-azulado que
 * `CONTACT_NEON_VOID` con alfa, en vez de blanco translúcido — sobre la
 * escena oscura un chip blanco leería como un error, no como una superficie
 * de contenido. */
export const CONTACT_CHIP_BG_DARK = "rgba(2, 4, 14, 0.55)";

/** Sombra de hover del CTA (mockup L223, `style-hover`): mismo hue que
 * `palette.secondary` (311.928) pero con croma 0.233, distinto del 0.243 que
 * produce `palette.secondary[600]` en este sistema — se copia verbatim en
 * vez de derivarse del token para no introducir un valor calculado que el
 * mockup no pidió. */
export const CONTACT_CTA_HOVER_SHADOW = "oklch(0.66 0.233 311.928 / 0.38)";

/** Halo radial detrás de la figura (mockup L228): violeta frío que no
 * coincide con los hue de marca del sistema — pieza de arte propia. */
export const CONTACT_RING_HALO_GRADIENT =
  "radial-gradient(circle, oklch(0.8 0.1 320 / 0.2) 0%, oklch(0.8 0.1 320 / 0.07) 45%, transparent 70%)";
/** Bordes de los dos anillos concéntricos intermedios (mockup L229/230). */
export const CONTACT_RING_A_BORDER = "oklch(0.75 0.1 300 / 0.22)";
export const CONTACT_RING_B_BORDER = "oklch(0.75 0.1 300 / 0.12)";

/** Sombra de la figura que saluda (mockup L234, `filter: drop-shadow(...)`). */
export const CONTACT_FIGURE_SHADOW = "oklch(0.55 0.15 300 / 0.3)";

/**
 * Geometría de la tarjeta y sus anillos (mockup L213/228-230): medidas de
 * UNA composición concreta, fuera de la escala de `space`/`radius` (mismo
 * criterio que `STORY_FIGURE_WIDTH`/`STORY_FIGURE_HEIGHT` en
 * `story.layers.ts` — el `border-radius` de 13px del chip/CTA sí se resuelve
 * al token `radius.lg` más cercano desde `Contact.tsx`, no se duplica aquí,
 * porque es cromo de UI reutilizable, no una medida de arte).
 */
export const CONTACT_RING_HALO_SIZE = "480px";
export const CONTACT_RING_HALO_RIGHT = "40px";
export const CONTACT_RING_A_SIZE = "360px";
export const CONTACT_RING_A_RIGHT = "96px";
export const CONTACT_RING_B_SIZE = "448px";
export const CONTACT_RING_B_RIGHT = "52px";

/** Geometría de la figura que saluda (mockup L233/234). */
export const CONTACT_FIGURE_HEIGHT = "560px";
export const CONTACT_FIGURE_LEFT = "8px";
export const CONTACT_FIGURE_TOP = "-44px";

/**
 * Flotación (mockup: keyframe `vtiFloat4`, definido en el `<style>` de
 * cabecera del mockup — `translateY(0)` en 0%/100%, `translateY(-4px)` en
 * 50%). Solo transform, guard `prefers-reduced-motion` en `Contact.tsx`
 * (mismo criterio que `ctaGlow`/`gradientTextClip` en `BrandName.tsx`/
 * `Hero.tsx`: la animación SOLO se declara bajo `no-preference`, y el bloque
 * `reduce` fuerza `animation: none; transform: none;` explícito en vez de
 * confiar en el colapso global de `GlobalStyles` — jsdom no evalúa `@media`,
 * lección 2026-07-27, así que este guard se ata inspeccionando
 * `document.styleSheets`, nunca `getComputedStyle`).
 */
export const CONTACT_FLOAT_AMPLITUDE = "-4px";
export const CONTACT_FIGURE_FLOAT_MS = 8000;

/**
 * Dimensiones nativas del PNG fuente (spec §6: 1024×1536, medido con
 * System.Drawing) — de ahí sale el ancho aproximado a media que la figura se
 * muestra a 560px de alto: 560 × (1024/1536) ≈ 373px. `sizes` solo declara
 * ancho honesto en el punto de corte donde la figura SÍ se muestra (`md`,
 * spec §7.4); por debajo se oculta entera (mismo criterio que
 * `STORY_FIGURE_SIZES`/Journey, "oculta debajo para no romper el flujo"),
 * así que el valor de fallback no necesita ser preciso.
 */
export const CONTACT_FIGURE_SIZES = "(min-width: 768px) 373px, 100vw";

/**
 * Caja de la rama oscura (2026-07-30, mismo criterio que
 * `STORY_DARK_MAX_WIDTH`/`JOURNEY_PORTAL_MAX_WIDTH`): acotada y centrada, no
 * a sangre. Altura FIJA en `dvh` (no `min-height` como Features): el
 * contenido de Contact es breve (kicker/título/cuerpo/chip+CTA, una sola
 * fila), igual de corto que Story/Journey, así que no hay riesgo de recorte
 * con `overflow: hidden`.
 */
export const CONTACT_DARK_MAX_WIDTH = "1280px";
export const CONTACT_DARK_HEIGHT = "90dvh";
