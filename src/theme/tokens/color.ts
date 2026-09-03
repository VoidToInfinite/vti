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
 *
 * ## Un PASO sin consumidor no es una hoja muerta (crítica externa #16)
 *
 * El evaluador de Craft de la #16 contó «30 pasos de paleta sin uso» y
 * nombró dos rampas: `warning` con 12 pasos y 2 consumidos, `error` 12/3.
 * La medición es EXACTA — censo propio reproducido con los comentarios
 * despojados, sobre `src/` y `app/`, buscando `palette.<rampa>[<paso>]` y
 * `color.<rampa>[<paso>]` (`semantic.ts` incluido, porque leer desde ahí es
 * consumo real), y comprobando además que nadie indexa una rampa con una
 * variable:
 *
 *   primary    6/12 -> 300, 400, 500, 600, 700, 800
 *   secondary  9/12 -> 300..1100
 *   warning    2/12 -> 500, 800
 *   error      3/12 -> 300, 500, 700
 *   neutral   10/12 -> 50, 100, 300..800, 1000, 1100
 *   TOTAL: 30 pasos de 60 sin consumidor directo. Lecturas por índice
 *   dinámico: ninguna.
 *
 * Y aun así NO se poda ni un paso, por un motivo estructural que el recuento
 * no puede ver: estas rampas no son 60 hojas escritas a mano, son la SALIDA
 * de `ramp(hue, peakChroma)` recorriendo la escalera compartida `STEPS`.
 * «Retirar `warning[50]`» no existe como operación: o se acorta `STEPS`
 * —y entonces se les quita el paso a las cinco rampas, incluidas las que sí
 * lo consumen— o se bifurca la fábrica para que dos rampas devuelvan un
 * `Ramp` parcial, con lo que `Record<Step, string>` deja de ser cierto y el
 * tipo se afloja para todos sus lectores (`semantic.ts`, `contrast.ts`). Se
 * cambiarían 30 valores calculados por un agujero en el sistema de tipos.
 *
 * Es además el mismo argumento que ya conserva `space[10]`: el paso de una
 * escala CONTINUA que todavía no se ha necesitado no es un token suelto sin
 * destino. Aquí la escalera es literalmente el espacio de búsqueda del que
 * se elige por CONTRASTE MEDIDO: `Contact.tsx` documenta que eligió
 * `error[300]` porque `error[400]` daba 4,30:1 y no llegaba a AA. El paso
 * 400 no tiene consumidor y aun así hizo falta que existiera para poder
 * descartarlo — y hará falta la próxima vez que alguien mida.
 *
 * LO QUE SÍ SE PODA, y el precedente está tres párrafos más arriba: una
 * RAMPA ENTERA sin un solo consumidor (`success`, retirada en la #14). Ese
 * es el listón, y ninguna de las cinco que quedan lo pasa: las cinco tienen
 * al menos dos pasos vivos.
 */
export const color = {
  primary: ramp(235.851, 0.158),
  secondary: ramp(311.928, 0.259),
  warning: ramp(70, 0.16),
  error: ramp(12, 0.24),
  neutral: neutral(),
} as const;

export type ColorPrimitives = typeof color;
