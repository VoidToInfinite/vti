/**
 * Constantes de arte de Story ("Why VoidToInfinite"), tema claro.
 *
 * Mismo precedente que `aura.layers.ts`/`eye.layers.ts`: los colores propios
 * de esta sección NO entran en los tokens semánticos del sistema (D10, spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §2) —
 * son literales decorativos de UNA composición concreta, no roles de UI que
 * deban cambiar con el tema (Story solo se monta en tema claro, vía
 * `HomeSections`). Se copian VERBATIM del mockup aprobado
 * (`Landing v2.dc.html`, sección `#story`, líneas 70-101) y se citan aquí con
 * su línea de origen para que un futuro retoque compare contra la fuente, no
 * contra un número sin contexto.
 *
 * Los colores que SÍ resuelven a un rol de token existente (bordes ->
 * `semantic.border`, kicker -> `semantic.brandText`, numeración de pilares ->
 * pasos de `palette.primary`/`palette.secondary`) se referencian directamente
 * desde `Story.tsx` contra el tema, sin duplicarlos aquí — mismo criterio que
 * ya aplica `Hero.tsx`/`BrandName.tsx` (p. ej. `theme.data.palette.secondary[300]`
 * en `ctaGlow`).
 */

/**
 * Halo radial detrás de la figura (mockup L73): dos paradas de alfa
 * decreciente sobre un violeta/azul frío, disuelto en `transparent` al 72%.
 * Los tres hue (`275`, `260`) no coinciden con los hue de marca del sistema
 * (`235.851` primary, `311.928` secondary), así que no es sustituible por un
 * paso de `palette.*`: es un degradado propio de esta pieza de arte.
 */
export const STORY_HALO_GRADIENT =
  "radial-gradient(circle at 55% 55%, oklch(0.9 0.05 275 / 0.55) 0%, oklch(0.93 0.03 260 / 0.3) 45%, transparent 72%)";

/**
 * Degradado de texto de "to creation." (mockup L78, tema claro): tres
 * paradas propias (`235`, `255`, `290`), distintas de los hue de
 * `palette.primary`/`palette.secondary`. A diferencia del titular del hero
 * (`heroGradient`, `BrandName.tsx`), este NO anima — el mockup no le aplica
 * `vtiGradientShift` a este span, solo al `ToInfinite` del hero — así que se
 * declara estático. Renombrado con sufijo `_LIGHT` (2026-07-29) al añadir la
 * variante oscura de abajo — incluida en la rama clara de `Story.tsx`.
 */
export const STORY_ACCENT_GRADIENT_LIGHT =
  "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";

/**
 * Variante oscura del degradado de texto (spec 2026-07-29 D10): MISMA familia
 * de hue (235/255/290) que la versión clara, con luminosidad mucho mayor
 * (0.78–0.86 en vez de 0.56–0.72) para que el `background-clip: text` siga
 * siendo legible sobre el negro-violeta de `StoryCosmicHeart`
 * (`STORY_COSMIC_HEART_VOID`, `#05030f`). No hay mockup oscuro de esta
 * sección — el spec señala explícitamente que estas paradas se verifican a
 * ojo en el paso de verificación en navegador, no con un contraste medido
 * (el helper `contrast.ts` del repo solo resuelve colores planos, no
 * degradados de texto).
 */
export const STORY_ACCENT_GRADIENT_DARK =
  "linear-gradient(110deg, oklch(0.78 0.13 235), oklch(0.82 0.13 255), oklch(0.86 0.12 290))";

/** Fondo/borde/sombra de la tarjeta flotante de nota (mockup L98). */
export const STORY_CARD_BG = "oklch(0.97 0.018 260)";
export const STORY_CARD_BORDER = "oklch(0.88 0.04 255)";
/** Color de sombra; la geometría (offset/blur) vive junto al selector que la usa. */
export const STORY_CARD_SHADOW = "oklch(0.6 0.1 265 / 0.18)";

/**
 * Geometría de la figura (mockup L74): lienzo 375×548, fuera de la escala de
 * `space`/`grid` porque es el tamaño de UNA imagen concreta, no una medida de
 * layout reutilizable (mismo criterio que `AURA_ORB_SIZE`/`EYE_PUPIL_SIZE`).
 */
export const STORY_FIGURE_WIDTH = "375px";
export const STORY_FIGURE_HEIGHT = "548px";
export const STORY_FIGURE_ASPECT = "375 / 548";

/** Expansión del halo más allá del marco de la figura (mockup L73: `inset: -30px`). */
export const STORY_HALO_INSET = "-30px";

/**
 * Flotación (mockup: keyframe `vtiFloat6`, definido en el `<style>` de
 * cabecera del mockup — `translateY(0)` en 0%/100%, `translateY(-6px)` en
 * 50%). La figura (L74) y la tarjeta de nota (L98) comparten el MISMO
 * keyframe con duraciones distintas: 9s la figura, 7s la tarjeta.
 */
export const STORY_FLOAT_AMPLITUDE = "-6px";
export const STORY_FIGURE_FLOAT_MS = 9000;
export const STORY_CARD_FLOAT_MS = 7000;

/**
 * `sizes` de la figura: se muestra a un ancho fijo de 375px desde `lg` en
 * adelante (mismo punto de corte que el resto del sitio,
 * `theme.data.breakPoint.lg`) y a un ancho fluido por debajo, cuando la
 * sección cae a columna única. Con solo dos pistas publicadas (640w/1024w,
 * spec §6), declarar más ancho del real en el tramo estrecho haría que un
 * móvil de DPR alto se llevase igualmente la pista de 1024px — el mismo
 * razonamiento que ya documenta `AURA_SIZES`.
 */
export const STORY_FIGURE_SIZES =
  "(min-width: 992px) 375px, (min-width: 600px) 60vw, 90vw";
