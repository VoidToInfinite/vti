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

/**
 * Cinco rampas, no las seis que hubo hasta la crítica externa #14
 * (2026-09-02).
 *
 * RETIRADA en esa revisión — `success` (hue 140, croma pico 0,17) — con censo
 * propio de consumidores previo sobre `src/` y `app/` (`color.success`,
 * `palette.success`, `theme.data.palette.success`, acceso por corchete y
 * desestructuración): **cero**. Su única aparición en código era su propia
 * declaración aquí más las tres del contrato de `color.test.ts` (la tabla de
 * hues y las dos de croma pico), y una mención en prosa en el docblock de
 * `brandAccentContrast.test.ts`. Doce valores OKLCH generados en cada carga
 * para nadie.
 *
 * No es una retirada aislada: es el segundo paso de la que empezó la crítica
 * externa #10 (2026-08-18), cuando el ROL semántico `success` se retiró de
 * `semantic.ts` por tener un consumidor único e inalcanzable (la rama
 * `intent === "success"` de `Button.tsx`, que ningún call site de producción
 * podía activar). Aquella revisión dejó la rampa primitiva viva y lo declaró
 * por escrito: "retirar un hue entero de la paleta toca las tablas
 * compartidas por los seis y su propio contrato, una decisión con más alcance
 * del que cierra este censo". Ese alcance es el de esta entrega, y las tablas
 * resultaron ser tres líneas de test.
 *
 * Sus dos vecinas SIGUEN VIVAS y no se tocan, cada una con un rol semántico y
 * un consumidor real: `warning` la pinta el callout de las páginas legales y
 * `error` la validación del formulario de contacto (ver `semantic.ts`).
 *
 * Si algún día el producto necesita un estado de éxito —un formulario
 * enviado, una copia confirmada—, la rampa vuelve en el MISMO commit que su
 * rol semántico y su consumidor, no antes: es el criterio que este repo ya
 * aplicó a `REVEAL.stepMs`, a `space.px` y a `grid.columns`.
 */
export const color = {
  primary: ramp(235.851, 0.158),
  secondary: ramp(311.928, 0.259),
  warning: ramp(70, 0.16),
  error: ramp(12, 0.24),
  neutral: neutral(),
} as const;

export type ColorPrimitives = typeof color;
