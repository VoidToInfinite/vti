import type { ThemeDefinition } from "./theme.types";
import { color } from "./tokens/color";
import { semanticLight, semanticDark } from "./tokens/semantic";
import { type as typeTokens } from "./tokens/type";
import { space, inlineSpace } from "./tokens/space";
import { radius } from "./tokens/radius";
import { elevation } from "./tokens/elevation";
import { zIndex } from "./tokens/zIndex";
import { motion } from "./tokens/motion";
import { glassLight, glassDark } from "./tokens/glass";
import { grid } from "./tokens/grid";
import { focusRing } from "./tokens/focus";

/*
 * BREAKPOINTS COMPARTIDOS (crítica externa #14, P3).
 *
 * Hasta el 2026-09-02 este bloque se escribía DOS veces, byte a byte, uno
 * dentro de `basicLightTheme` y otro dentro de `basicDarkTheme`. Nunca fue
 * una decisión: un breakpoint no es piel -- el ancho al que el layout cambia
 * de forma no depende de si el sitio está en claro o en oscuro --, así que
 * pertenece a `shared` como cualquier otro token de sistema.
 *
 * Es una MUDANZA, no un rediseño: los cuatro valores son los mismos. Lo que
 * cambia es que ahora los dos temas comparten la MISMA referencia, así que
 * una divergencia silenciosa entre ramas ya no es representable (candado en
 * `themes.test.ts`, con `toBe`, el mismo criterio que ya ataba `palette`).
 *
 * EN `em`, NO EN `px` (frente F, 2026-09-05), y con el MISMO valor a la raíz
 * por defecto: 37.5em = 600, 48em = 768, 62em = 992, 75em = 1200, todos
 * contra los 16 px de fábrica. Una media query en `em` se evalúa contra el
 * tamaño de fuente INICIAL del navegador —la preferencia del usuario, no el
 * `font-size` de la página—, así que a 16 px es idéntica byte a byte a la de
 * `px` y con la preferencia al 200 % cada escalón se dobla. Es la técnica
 * estándar de reflow bajo zoom de texto.
 *
 * EL MECANISMO, COMPROBADO EN EL INSTRUMENTO Y NO SUPUESTO. Sonda propia en
 * Chrome con las DOS formas del mismo escalón en una hoja insertada a mano,
 * leyendo qué regla aplica de verdad (`getComputedStyle`, no `matchMedia` a
 * secas), con la raíz movida por `Page.setFontSizes`:
 *
 *     raíz   viewport   aplica 48em   aplica 768px
 *     16 px    320 px       no             no
 *     16 px    768 px       SI             SI
 *     16 px    834 px       SI             SI
 *     16 px   1536 px       SI             SI
 *     32 px    320 px       no             no
 *     32 px    768 px       no             SI     <- el defecto
 *     32 px    834 px       no             SI     <- el defecto
 *     32 px   1536 px       SI             SI
 *
 * Con la tipografía de fábrica las dos columnas son la misma; con la
 * preferencia al 200 % solo la de `em` se entera, y vuelve a encenderse
 * exactamente en 1536 = 48 x 32.
 *
 * POR QUÉ HACÍA FALTA, medido en Chrome sobre el build de producción servido
 * (`Page.setFontSizes` a 32 px, `prefers-reduced-motion: reduce`, tema claro,
 * la tarjeta de Contacto):
 *
 *     viewport   pista de la tarjeta        columna del formulario   rótulo del CTA
 *     320 px     222px (una columna)        222 px                   108,00 px, 3 líneas
 *     768 px     278,83px + 199,16px        278,83 px                 58,83 px, 8 líneas
 *     834 px     317,33px + 226,66px        317,33 px                 91,33 px, 3 líneas
 *
 * A 768 px con la raíz a 32, `md` en píxeles seguía dando por buena una
 * rejilla de dos columnas sobre lo que para el usuario son 24rem —el ancho de
 * un móvil pequeño a la raíz de fábrica—, y la columna del formulario se
 * quedaba con menos rótulo que la banda de 320. El escalón está en PÍXELES y
 * por eso ignoraba la preferencia de tamaño de texto; en `em` deja de
 * ignorarla.
 *
 * QUÉ NO SE TOCA, y no es un olvido: las `@container` de `navbarContainer.ts`
 * siguen en `em` sobre su propio contenedor (miden espacio real y ya resuelven
 * `em` contra la fuente del contenedor, ver su docblock), y los atributos
 * `sizes` de las imágenes conservan sus `(max-width: …px)` porque no son
 * layout: son pistas de selección de pista para el navegador.
 */
const breakPoint = {
  sm: "screen and (min-width: 37.5em)",
  md: "screen and (min-width: 48em)",
  lg: "screen and (min-width: 62em)",
  xl: "screen and (min-width: 75em)",
} as const;

const shared = {
  palette: color,
  type: typeTokens,
  space,
  inlineSpace,
  radius,
  elevation,
  zIndex,
  motion,
  grid,
  focusRing,
  breakPoint,
} as const;

export const basicLightTheme: ThemeDefinition = {
  name: "light",
  isLight: true,
  semantic: semanticLight,
  glass: glassLight,
  ...shared,
};

export const basicDarkTheme: ThemeDefinition = {
  name: "dark",
  isLight: false,
  semantic: semanticDark,
  glass: glassDark,
  ...shared,
};

export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, ThemeDefinition> = {
  light: basicLightTheme,
  dark: basicDarkTheme,
};
