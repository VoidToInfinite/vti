export const STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100,
] as const;
export type Step = (typeof STEPS)[number];
/* Sin `export`: solo lo usan las dos fábricas de rampa de este mismo fichero.
   Estuvo exportado sin un solo consumidor externo desde que se creó el
   sistema; el censo de la crítica externa #8 (2026-08-17) lo confirmó por
   grep sobre `src/` y `app/`. */
type Ramp = Record<Step, string>;

// Escalera de luminosidad compartida por todos los hues (spec §3.1).
// L[7] (paso 700) baja de 0.58 a 0.53 tras la auditoría AA de C1: a 0.58,
// neutral[700] (textSubtle) y primary[700] (brandSolid/focus) no llegaban a
// los ratios WCAG requeridos sobre los fondos claros del sistema. Ver
// semantic.ts para el detalle de cada rol afectado y sus ratios resultantes.
const L = [
  0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.53, 0.5, 0.42, 0.32, 0.22,
];
// Multiplicador de croma: pico en 500, decae hacia los extremos claro/oscuro
const CMUL = [0.1, 0.2, 0.42, 0.66, 0.9, 1, 0.94, 0.82, 0.72, 0.62, 0.5, 0.36];

function ramp(hue: number, peakChroma: number): Ramp {
  const out = {} as Ramp;
  STEPS.forEach((step, i) => {
    out[step] = `oklch(${L[i]} ${+(peakChroma * CMUL[i]).toFixed(3)} ${hue})`;
  });
  return out;
}

// Neutral: croma casi nulo, hue frío 286
function neutral(): Ramp {
  const nc = [0, 0.002, 0.004, 0.004, 0.006, 0.006, 0, 0, 0, 0.004, 0, 0.004];
  const out = {} as Ramp;
  STEPS.forEach((step, i) => {
    out[step] = `oklch(${L[i]} ${nc[i]} 286)`;
  });
  return out;
}

export const color = {
  primary: ramp(235.851, 0.158),
  secondary: ramp(311.928, 0.259),
  success: ramp(140, 0.17),
  warning: ramp(70, 0.16),
  error: ramp(12, 0.24),
  neutral: neutral(),
} as const;

export type ColorPrimitives = typeof color;
