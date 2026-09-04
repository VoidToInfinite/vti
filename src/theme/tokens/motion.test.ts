import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { motion } from "./motion";

/**
 * Contrato de la escala de movimiento, complementario a `system.test.ts`
 * (que ya cierra `motion.duration`/`motion.easing`/`motion.staggerMs` con
 * `toEqual`). Este fichero canda las propiedades que un `toEqual` de valores
 * no puede expresar:
 *
 * 1. Que `duration` y `durationMs` son la MISMA escala en dos formatos, no
 *    dos escalas que hoy coinciden.
 * 2. Que `easing.settle` es la curva que absorbió `EASE_ENTRANCE`
 *    (`Sol.tsx`) — con la medición ejecutada aquí, no citada de memoria.
 * 3. Que ningún peldaño de `staggerMs` —la escala de retardos que añadió la
 *    crítica externa #16 (2026-09-03)— se queda sin consumidor real
 *    (candado por PELDAÑO, no por escala).
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

/*
 * Candado de la escala de RETARDOS (crítica externa #16, 2026-09-03).
 *
 * Existe porque esta misma crítica trae DOS hallazgos que tiran en
 * direcciones opuestas: uno pide una escala de retardos que no existía (L5)
 * y el otro pide podar las hojas de vocabulario sin consumidor (L6). Añadir
 * la escala sin candado sería crear el problema del segundo mientras se
 * arregla el primero — y este repo ya lo pagó una vez: `REVEAL.stepMs` (60
 * ms, exactamente el mismo rol) vivió tres tareas documentado y sin un solo
 * consumidor, hasta que la fix wave B lo retiró.
 *
 * Mide por PELDAÑO y no por escala, por el mismo motivo por el que
 * `vocabulary-consumers.test.ts` pasó de medir por grupo a medir por campo:
 * una escala de tres peldaños puede pasar un candado de escala con dos de
 * ellos muertos.
 */
describe("motion.staggerMs: la escala de retardos (crítica externa #16)", () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const EXTENSIONES = new Set([".ts", ".tsx"]);

  function recorrer(dir: string, out: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const completo = join(dir, entrada);
      if (statSync(completo).isDirectory()) recorrer(completo, out);
      else if (EXTENSIONES.has(extname(completo))) out.push(completo);
    }
    return out;
  }

  /* Mismo despojo de comentarios, y por el mismo motivo, que
   * `vocabulary-consumers.test.ts`: los docblocks de esta ola CITAN
   * `motion.staggerMs.base` en prosa para explicar la migración, y sin
   * despojarlos esas citas bastarían para que el candado pasara con el
   * código real sin consumir nada. El guard `(?<!:)` evita truncar una línea
   * por el `//` de una URL dentro de un string. */
  function despojar(fuente: string): string {
    return fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
  }

  function consumidoresDe(peldano: string): string[] {
    const patron = new RegExp(`\\bstaggerMs\\.${peldano}\\b`);
    const salida: string[] = [];
    for (const fichero of recorrer(srcRoot)) {
      const relativo = fichero.slice(srcRoot.length + 1).replace(/\\/g, "/");
      if (relativo === "theme/tokens/motion.ts") continue; // la fuente
      if (relativo.endsWith(".test.ts") || relativo.endsWith(".test.tsx"))
        continue;
      if (patron.test(despojar(readFileSync(fichero, "utf8"))))
        salida.push(relativo);
    }
    return salida;
  }

  it("cada peldaño tiene al menos un consumidor real en código de producción", () => {
    const sinConsumidor = (
      Object.keys(motion.staggerMs) as Array<keyof typeof motion.staggerMs>
    ).filter((peldano) => consumidoresDe(peldano).length === 0);

    expect(sinConsumidor).toEqual([]);
  });

  /*
   * La otra mitad, y la que da filo al candado de arriba: no basta con que
   * "alguien" lea cada peldaño, hace falta que sean piezas DISTINTAS. Si los
   * tres los leyera un único fichero, la escala no sería un vocabulario
   * compartido sino tres constantes de ese fichero con un rodeo por el token.
   */
  it("los tres peldaños se reparten entre al menos dos ficheros distintos", () => {
    const ficheros = new Set(
      (
        Object.keys(motion.staggerMs) as Array<keyof typeof motion.staggerMs>
      ).flatMap((peldano) => consumidoresDe(peldano)),
    );
    expect(ficheros.size).toBeGreaterThanOrEqual(2);
  });

  /*
   * Los tres peldaños tienen que ser MAGNITUDES DISTINGUIBLES y ordenadas:
   * una escala cuyos peldaños se solapan no ayuda a elegir, solo a dudar.
   * `tight < base < loose` es lo que sus propios nombres prometen.
   */
  it("es una escala ordenada y sin peldaños repetidos", () => {
    const { tight, base, loose } = motion.staggerMs;
    expect(tight).toBeLessThan(base);
    expect(base).toBeLessThan(loose);
    const valores = Object.values(motion.staggerMs);
    expect(new Set(valores).size).toBe(valores.length);
  });
});

/**
 * CANDADO DEL CENSO DE LA BANDA DE INTERFAZ (crítica externa #18,
 * 2026-09-04).
 *
 * QUÉ MIDE Y POR QUÉ NO DUPLICA AL DETECTOR: `scripts/detect-anti-patterns.mjs`
 * vigila las duraciones POR PROCEDENCIA —lo dice su propio docblock, «la
 * familia que mide VALOR sería "fuera de escala"; aquí no hace falta»—, así
 * que sanciona línea a línea que un tiempo no nazca del sistema, pero no sabe
 * ni le importa CUÁNTOS valores distintos existen. Ese recuento es justo lo
 * que la crítica pidió medir para contestar si a la escala le falta un
 * peldaño, y es lo que este test congela.
 *
 * EL DEFECTO QUE ATRAPA: que el vocabulario de duraciones crezca en silencio.
 * Un valor nuevo puede entrar hoy perfectamente sancionado —con su entrada de
 * allowlist y su motivo bien escrito— y el gate seguirá en verde sin que nadie
 * haya comparado ese número con los diecisiete que ya existen. Este test
 * obliga a esa comparación: cuando aparece el decimoctavo, hay que decidir por
 * escrito si es un rol nuevo o el peldaño que por fin faltaba.
 *
 * QUÉ SE EXIME, y por qué exactamente estas dos cosas:
 *  - `0.001ms`, el reset de `prefers-reduced-motion` de `GlobalStyles`: no es
 *    una duración elegida, es la ausencia de duración escrita de forma que el
 *    navegador siga emitiendo `transitionend` (mismo criterio con el que el
 *    detector exime el cero, y ya está sancionado allí por su cuenta).
 *  - Las expresiones aritméticas (`SOL_AUTO_CYCLE_MS = 8 * 60 * 1000`): el
 *    número que sigue al `=` no es la duración, es un factor. Sin esta
 *    exención el censo contaría duraciones de 8 ms y 44 ms que no existen.
 *
 * El resultado del censo y su lectura —que NO falta ningún peldaño, y que el
 * único caso de mismo rol en dos sitios (320 ms) ya tiene el suyo en `slow`
 * sin que ninguno de los dos lo lea— viven en el docblock de cabecera de
 * `motion.ts`, para que el número y su interpretación no se separen.
 */
describe("censo de duraciones de la banda de interfaz (≤1000 ms)", () => {
  const raizProyecto = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
  );
  const EXTENSIONES = new Set([".ts", ".tsx"]);

  function recorrer(dir: string, salida: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const completo = join(dir, entrada);
      if (statSync(completo).isDirectory()) recorrer(completo, salida);
      else if (EXTENSIONES.has(extname(completo))) salida.push(completo);
    }
    return salida;
  }

  function despojar(fuente: string): string {
    return fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
  }

  function censo(): number[] {
    const valores = new Set<number>();
    const ficheros = ["src", "app"]
      .flatMap((raiz) => recorrer(join(raizProyecto, raiz)))
      .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

    for (const fichero of ficheros) {
      for (const linea of despojar(readFileSync(fichero, "utf-8")).split(
        /\r?\n/,
      )) {
        /* Tiempo CSS escrito como literal: `320ms`, `9s`. */
        const literales = /(?<![\w.$])(\d+(?:\.\d+)?)(ms|s)(?![\w-])/g;
        let m: RegExpExecArray | null;
        while ((m = literales.exec(linea)) !== null) {
          const ms = parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1);
          if (ms !== 0 && ms !== 0.001 && ms <= 1000) valores.add(ms);
        }
        /* Duración declarada como constante numérica con nombre. El tercer
           grupo es el carácter que sigue al número: si es un operador, lo que
           se ha capturado es un factor, no una duración. */
        const constantes =
          /\b[A-Za-z_$][\w$]*(?:[a-z]Ms|_MS)\s*[:=]\s*\[?\s*(-?\d[\d_]*(?:\.\d+)?)\s*(\S?)/g;
        while ((m = constantes.exec(linea)) !== null) {
          if (m[2] === "*" || m[2] === "+" || m[2] === "-") continue;
          const ms = parseFloat(m[1].replace(/_/g, ""));
          if (ms !== 0 && ms <= 1000) valores.add(ms);
        }
      }
    }
    return [...valores].sort((a, b) => a - b);
  }

  it("son exactamente diecisiete valores, y estos", () => {
    expect(
      censo(),
      "el vocabulario de duraciones cambió: decide por escrito si el valor nuevo es un rol nuevo o el peldaño que faltaba, y actualiza el censo del docblock de motion.ts en el mismo cambio",
    ).toEqual([
      50, 90, 100, 140, 160, 200, 220, 320, 420, 440, 480, 600, 800, 850, 860,
      900, 1000,
    ]);
  });

  /*
   * La otra mitad: cuatro de esos diecisiete SON peldaños de esta escala, y
   * eso no es casualidad ni ruido — es la parte del vocabulario que ya está
   * sistematizada. Si un día ninguno coincidiera, la escala habría dejado de
   * describir lo que el sitio usa.
   */
  it("cuatro de ellos son peldaños vivos de la escala", () => {
    const escala = new Set<number>(Object.values(motion.durationMs));
    expect(censo().filter((v) => escala.has(v))).toEqual([100, 200, 320, 480]);
  });
});
