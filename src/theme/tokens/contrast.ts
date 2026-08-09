/**
 * Helper de contraste WCAG AA sobre colores `oklch(L C H)`.
 *
 * Implementa la conversión `oklch(L C H)` → OKLab → sRGB lineal (matriz
 * estándar CSS Color 4 / Björn Ottosson) y el cálculo de ratio de contraste
 * WCAG, sin dependencias externas. Usado por `contrast.test.ts` (validación
 * AA de los roles semánticos) y por `semantic.test.ts` (medición real del
 * contraste dark onBrand/brandSolid).
 */

interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function parseOklch(s: string): Oklch {
  const match = s.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+)\)$/);
  if (!match) throw new Error(`Formato oklch inválido: ${s}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** oklch(L C H) → RGB lineal (clamp final por canal, sin mapeo de gamut previo). */
function oklchToLinearSrgb(oklch: Oklch): { r: number; g: number; b: number } {
  const { l: L, c: C, h: H } = oklch;
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return { r: clamp01(r), g: clamp01(g), b: clamp01(bLin) };
}

/** Luminancia relativa WCAG sobre canales YA lineales (sin gamma-decode adicional). */
export function relativeLuminance(oklchStr: string): number {
  const { r, g, b } = oklchToLinearSrgb(parseOklch(oklchStr));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos colores oklch(). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Canal sRGB (0-255) -> lineal, formula estandar WCAG (gamma-decode). */
function srgbChannelToLinear(channel: number): number {
  const cs = channel / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

/**
 * Luminancia relativa WCAG de un literal hex sRGB (`#rrggbb`).
 *
 * Existe porque el void de las escenas decorativas oscuras (Story, Contact,
 * Journey, Features -- `*_VOID` en cada `*.layers.ts` de
 * `src/components/scenes/`) se declara VERBATIM en hex, nunca convertido a
 * `oklch()` (cada `*_VOID` documenta por que: "un redondeo de conversion
 * desviaria el resultado del aditivo"). `contrastRatio` por si sola no puede
 * medir contra eso -- `parseOklch` solo acepta el formato `oklch(L C H)`.
 * No hace falta pasar por OKLab para esto: el sRGB ya es el espacio nativo
 * de un literal hex, así que la formula WCAG de luminancia relativa se
 * aplica directamente sobre sus canales linealizados.
 */
export function relativeLuminanceHex(hex: string): number {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/**
 * Ratio de contraste WCAG entre un color `oklch()` (un token de tema) y un
 * literal hex sRGB (el void de una escena decorativa). Mismo criterio
 * lighter/darker que `contrastRatio` -- la única diferencia es de dónde sale
 * cada luminancia.
 */
export function contrastRatioHex(oklchStr: string, hex: string): number {
  const l1 = relativeLuminance(oklchStr);
  const l2 = relativeLuminanceHex(hex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ratio de contraste de un texto sobre una superficie SEMITRANSPARENTE
 * compuesta encima de un fondo.
 *
 * Existe porque el sistema estrenó su primera superficie con alfa: el
 * marcador de dato pendiente de las páginas legales (`ScMark`,
 * `legalPage.parts.tsx`) pinta `color-mix(in oklch, semantic.warning 30%,
 * transparent)` sobre el fondo de la página. `contrastRatio` no puede medir
 * eso: recibe dos colores opacos, y el color efectivo bajo la letra no es ni
 * el acento ni el fondo, sino la composición de los dos.
 *
 * La mezcla se hace en RGB LINEAL, que es donde una interpolación de color
 * es físicamente correcta. Un navegador real compone alfa en el espacio de
 * la superficie (con gamma), así que el número de aquí y el medido en
 * navegador no tienen por qué coincidir al decimal — se comprobaron los dos
 * caminos al escribir esto y los dos dan holgadamente por encima de AA en
 * los dos temas, así que la diferencia no cambia ninguna decisión. Para una
 * medición al píxel sobre el render real, la vía es pintar en un canvas 1×1
 * y leerlo (lección del 2026-08-04 sobre `getComputedStyle` y `oklch()`).
 */
export function contrastRatioOverAlpha(
  text: string,
  overlay: string,
  overlayAlpha: number,
  backdrop: string,
): number {
  const o = oklchToLinearSrgb(parseOklch(overlay));
  const b = oklchToLinearSrgb(parseOklch(backdrop));
  const mix = (co: number, cb: number): number =>
    co * overlayAlpha + cb * (1 - overlayAlpha);
  const compuesto =
    0.2126 * mix(o.r, b.r) + 0.7152 * mix(o.g, b.g) + 0.0722 * mix(o.b, b.b);

  const lTexto = relativeLuminance(text);
  const lighter = Math.max(lTexto, compuesto);
  const darker = Math.min(lTexto, compuesto);
  return (lighter + 0.05) / (darker + 0.05);
}
