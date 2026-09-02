import { describe, it, expect } from "vitest";
import { motion } from "./motion";

/**
 * Contrato de la escala de movimiento, complementario a `system.test.ts`
 * (que ya cierra `motion.duration`/`motion.easing` con `toEqual`). Este
 * fichero canda las DOS propiedades que la crítica externa #14 (2026-09-02)
 * añadió al token y que un `toEqual` de valores no puede expresar:
 *
 * 1. Que `duration` y `durationMs` son la MISMA escala en dos formatos, no
 *    dos escalas que hoy coinciden.
 * 2. Que `easing.settle` es la curva que absorbió `EASE_ENTRANCE`
 *    (`Sol.tsx`) — con la medición ejecutada aquí, no citada de memoria.
 */

type Bezier = readonly [number, number, number, number];

/** Componente de una cúbica de Bézier con extremos en 0 y 1. */
function component(p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

/** `y(x)` de una `cubic-bezier(x1, y1, x2, y2)`, por bisección sobre `t`. */
function yAtX([x1, y1, x2, y2]: Bezier, x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i += 1) {
    const t = (lo + hi) / 2;
    if (component(x1, x2, t) < x) lo = t;
    else hi = t;
  }
  return component(y1, y2, (lo + hi) / 2);
}

/** Distancia máxima de PROGRESO entre dos curvas al mismo instante. */
function maxProgressGap(a: Bezier, b: Bezier, samples = 10_000): number {
  let max = 0;
  for (let i = 0; i <= samples; i += 1) {
    const x = i / samples;
    max = Math.max(max, Math.abs(yAtX(a, x) - yAtX(b, x)));
  }
  return max;
}

/** `x(y)` de una `cubic-bezier(x1, y1, x2, y2)`, por bisección sobre `t`. */
function xAtY([x1, y1, x2, y2]: Bezier, y: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i += 1) {
    const t = (lo + hi) / 2;
    if (component(y1, y2, t) < y) lo = t;
    else hi = t;
  }
  return component(x1, x2, (lo + hi) / 2);
}

/**
 * Desfase TEMPORAL máximo entre dos curvas para un mismo progreso, como
 * fracción de la duración, junto con el progreso en el que ocurre el pico.
 */
function maxTimeGap(
  a: Bezier,
  b: Bezier,
  samples = 10_000,
): { gap: number; atProgress: number } {
  let gap = 0;
  let atProgress = 0;
  for (let i = 1; i < samples; i += 1) {
    const y = i / samples;
    const d = Math.abs(xAtY(a, y) - xAtY(b, y));
    if (d > gap) {
      gap = d;
      atProgress = y;
    }
  }
  return { gap, atProgress };
}

function parseBezier(css: string): Bezier {
  const m = css.match(
    /^cubic-bezier\(\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\)$/,
  );
  if (!m) throw new Error(`No es una cubic-bezier: ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as const;
}

describe("motion.duration / motion.durationMs: una escala, dos formatos", () => {
  it("durationMs expone los siete peldaños como número", () => {
    expect(motion.durationMs).toEqual({
      instant: 0,
      fast: 100,
      base: 200,
      slow: 320,
      slower: 480,
      spin: 700,
      spinReduced: 2100,
    });
  });

  it("las dos formas tienen exactamente las mismas claves", () => {
    expect(Object.keys(motion.duration).sort()).toEqual(
      Object.keys(motion.durationMs).sort(),
    );
  });

  /*
   * El candado real de "una escala, no dos": cada cadena CSS es su número
   * con el sufijo `ms`. Si alguien retoca un peldaño en un formato y no en
   * el otro, este test cae -- que es justo lo que no podía pasar antes de
   * la crítica #14, cuando el mismo número vivía escrito a mano en
   * `motion.ts` y en `src/motion/vocabulary.ts`.
   */
  it("cada cadena CSS es el número de la misma clave con sufijo ms", () => {
    for (const clave of Object.keys(motion.durationMs) as Array<
      keyof typeof motion.durationMs
    >) {
      expect(motion.duration[clave]).toBe(`${motion.durationMs[clave]}ms`);
    }
  });
});

describe("motion.easing.settle (crítica externa #14, 2026-09-02)", () => {
  /*
   * La curva que `EASE_ENTRANCE` declaraba en `Sol.tsx` hasta esta revisión.
   * Se conserva aquí como dato del test -- no como token -- porque es lo
   * único contra lo que la absorción se puede medir una vez retirada del
   * código de producción.
   */
  const EASE_ENTRANCE_RETIRADA: Bezier = [0.22, 1, 0.36, 1];
  /** Duración del morph de identidad de Sol (`MORPH_MS`), en ms. */
  const MORPH_MS = 1100;
  /** Un fotograma a 60 Hz, en ms. */
  const FOTOGRAMA_60HZ = 1000 / 60;

  it("es la curva que vivía como literal propio en src/motion/vocabulary.ts", () => {
    expect(motion.easing.settle).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
  });

  it("es MONÓTONA: no sobrepasa su valor final (eso solo lo hace overshoot)", () => {
    const [, y1, , y2] = parseBezier(motion.easing.settle);
    expect(y1).toBeLessThanOrEqual(1);
    expect(y2).toBeLessThanOrEqual(1);

    // Sonda de no-vacuidad: la única curva de la escala que SÍ sobrepasa
    // sigue haciéndolo, así que la aserción de arriba mide algo real.
    const [, oy1] = parseBezier(motion.easing.overshoot);
    expect(oy1).toBeGreaterThan(1);
  });

  it("absorbe EASE_ENTRANCE: a un mismo instante las dos curvas nunca se separan más de 1,1 puntos de progreso", () => {
    const gap = maxProgressGap(
      parseBezier(motion.easing.settle),
      EASE_ENTRANCE_RETIRADA,
    );
    // 0,0109 medido: 1,09 puntos porcentuales de progreso, pico en x ~ 0,28.
    expect(gap).toBeLessThan(0.011);
  });

  /*
   * La otra mitad de la medición, y la honesta: el desfase TEMPORAL máximo
   * (17,3 ms sobre los 1100 ms del morph) es algo MAYOR que un fotograma a
   * 60 Hz. Lo que lo vuelve irrelevante no es su tamaño sino su sitio: cae
   * en el último 3 % del recorrido, con el morph ya asentado. Este test ata
   * las dos cosas -- el tamaño y el sitio -- para que nadie tenga que
   * fiarse del docblock.
   */
  it("su desfase temporal frente a EASE_ENTRANCE pica en el tramo ya asentado, no en el arranque", () => {
    const { gap, atProgress } = maxTimeGap(
      parseBezier(motion.easing.settle),
      EASE_ENTRANCE_RETIRADA,
    );
    expect(gap * MORPH_MS).toBeLessThan(FOTOGRAMA_60HZ * 1.1);
    expect(atProgress).toBeGreaterThan(0.95);
  });

  it("NO es un duplicado de decelerate ni de standard: las dos están un orden de magnitud más lejos que EASE_ENTRANCE", () => {
    const settle = parseBezier(motion.easing.settle);
    const aEaseEntrance = maxProgressGap(settle, EASE_ENTRANCE_RETIRADA);
    const aDecelerate = maxProgressGap(
      settle,
      parseBezier(motion.easing.decelerate),
    );
    const aStandard = maxProgressGap(
      settle,
      parseBezier(motion.easing.standard),
    );

    expect(aDecelerate).toBeGreaterThan(aEaseEntrance * 10);
    expect(aStandard).toBeGreaterThan(aEaseEntrance * 10);
  });

  it("los seis peldaños de easing son seis curvas DISTINTAS", () => {
    const curvas = Object.values(motion.easing);
    expect(new Set(curvas).size).toBe(curvas.length);
  });
});
