/**
 * Datos de interaccion y de layout del mascota Sol, portados 1:1 desde
 * `vti-sdk` (`src/widgets/landing-fx/Sol.constants.ts`). Son datos de render y
 * de temporizacion consumidos desde JS; las duraciones puramente decorativas
 * viven en el CSS de `Sol.tsx`, igual que en el origen.
 */

// --- Ciclo de caras -------------------------------------------------------

/** La cara programada (Sol <-> brujula) alterna con este reloj, para siempre. */
export const SOL_AUTO_CYCLE_MS = 8 * 60 * 1000;
/** Un click fuerza la cara contraria durante este tiempo antes de volver. */
export const SOL_MANUAL_OVERRIDE_MS = 44 * 1000;
/** Cambios manuales permitidos por ventana de ciclo (el contador se reinicia
 *  con el reloj programado, no de forma deslizante). */
export const SOL_MANUAL_OVERRIDE_LIMIT = 8;

// --- Inclinacion / giro ----------------------------------------------------

/** Inclinacion maxima hacia el cursor, en grados. */
export const SOL_TILT_MAX_DEG = 11;

// --- Datos de layout del mascota -------------------------------------------

export const SOL_RAY_ANGLES: readonly number[] = Array.from(
  { length: 12 },
  (_, i) => i * 30,
);

export type SolClineGroup = "primary" | "secondary" | "neutral";

export const SOL_CLINE_ANGLES = [
  0, 45, 90, 135, 22.5, 67.5, 112.5, 157.5,
] as const;

export const SOL_CLINE_GROUPS: readonly SolClineGroup[] = [
  "primary",
  "secondary",
  "primary",
  "secondary",
  "neutral",
  "neutral",
  "neutral",
  "neutral",
];

export interface SolSparkLayout {
  top: number;
  left: number;
  delay: number;
}

export const SOL_BASIC_SPARKS: readonly SolSparkLayout[] = [
  { top: 6, left: 62, delay: 0 },
  { top: 72, left: 10, delay: -1.1 },
  { top: 16, left: 12, delay: -2.2 },
  { top: 78, left: 76, delay: -1.7 },
];

export interface SolAuraSparkLayout extends SolSparkLayout {
  size: number;
  dur: number;
}

export const SOL_AURA_SPARKS: readonly SolAuraSparkLayout[] = [
  { top: 17, left: 50, size: 3, dur: 3.2, delay: -0.4 },
  { top: 17.1, left: 69, size: 4, dur: 3.8, delay: -1.6 },
  { top: 35, left: 76, size: 2.6, dur: 2.9, delay: -2.3 },
  { top: 50, left: 86, size: 3.4, dur: 4.1, delay: -0.8 },
  { top: 60.4, left: 88.6, size: 3, dur: 3.5, delay: -3.1 },
  { top: 72.6, left: 72.6, size: 3.8, dur: 3, delay: -1.1 },
  { top: 85.7, left: 59.6, size: 2.8, dur: 4.4, delay: -2.6 },
  { top: 78, left: 42.5, size: 3.2, dur: 3.3, delay: -0.2 },
  { top: 79.4, left: 33, size: 3, dur: 3.9, delay: -3.6 },
  { top: 69.5, left: 16.2, size: 4, dur: 2.8, delay: -1.9 },
  { top: 50, left: 19, size: 2.6, dur: 3.6, delay: -0.6 },
  { top: 32.5, left: 19.7, size: 3.4, dur: 4, delay: -2.9 },
  { top: 30.2, left: 30.2, size: 3, dur: 3.1, delay: -1.4 },
  { top: 11.4, left: 39.6, size: 3.6, dur: 3.7, delay: -4 },
];
