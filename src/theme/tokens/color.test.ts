import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { color, STEPS } from "./color";

// Parser para extraer componentes de oklch(L C H)
function parseOklch(s: string): { l: number; c: number; h: number } {
  const match = s.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+)\)$/);
  if (!match) throw new Error(`Formato oklch inválido: ${s}`);
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

describe("color primitives", () => {
  it("cada hue tiene los 12 pasos como oklch()", () => {
    for (const ramp of Object.values(color)) {
      expect(Object.keys(ramp).map(Number)).toEqual([...STEPS]);
      for (const v of Object.values(ramp)) expect(v).toMatch(/^oklch\(/);
    }
  });

  it("la luminosidad decrece de 50 a 1100", () => {
    const l = (s: string) => Number(s.slice(6).split(" ")[0]);
    expect(l(color.primary[50])).toBeGreaterThan(l(color.primary[1100]));
  });

  it("escalera de luminosidad es exacta en todos los pasos", () => {
    // L[7] (paso 700) es 0.53, no 0.58: bajado en la auditoría AA de C1
    // (ver color.ts y semantic.ts) porque neutral[700]/primary[700] no
    // llegaban a los ratios WCAG requeridos con 0.58.
    const expectedL = [
      0.985, 0.96, 0.92, 0.86, 0.78, 0.737, 0.66, 0.53, 0.5, 0.42, 0.32, 0.22,
    ];

    // Verifica en primary
    STEPS.forEach((step, i) => {
      const parsed = parseOklch(color.primary[step]);
      expect(parsed.l).toBe(expectedL[i]);
    });

    // Verifica en neutral (comparten escalera)
    STEPS.forEach((step, i) => {
      const parsed = parseOklch(color.neutral[step]);
      expect(parsed.l).toBe(expectedL[i]);
    });
  });

  /*
   * Cinco rampas, no seis: `success` se retiró en la crítica externa #14
   * (2026-09-02) por cero consumidores en todo el repo — ver el docblock de
   * `color` en `color.ts`. Las tres tablas de este fichero (hues y las dos de
   * croma pico) se actualizan en el mismo cambio en vez de dejar una clave
   * que resolvería a `undefined`: como `hues` está tipado contra
   * `keyof typeof color`, reintroducir la rampa sin volver aquí rompe el
   * typecheck, que es exactamente la propiedad que se quiere conservar.
   */
  it("cada rampa de hue usa su ancla en todos los pasos", () => {
    const hues: Record<
      keyof typeof color,
      number | { value: number; neutral: boolean }
    > = {
      primary: 235.851,
      secondary: 311.928,
      warning: 70,
      error: 12,
      neutral: 286,
    };

    for (const [rampName, expectedHue] of Object.entries(hues)) {
      const ramp = color[rampName as keyof typeof color];
      STEPS.forEach((step) => {
        const parsed = parseOklch(ramp[step]);
        const hueValue =
          typeof expectedHue === "number" ? expectedHue : expectedHue.value;
        expect(parsed.h).toBe(hueValue);
      });
    }
  });

  it("croma en paso 500 es exactamente el pico para cada rampa de hue", () => {
    const peakChromas: Record<string, number> = {
      primary: 0.158,
      secondary: 0.259,
      warning: 0.16,
      error: 0.24,
    };

    for (const [rampName, expectedPeakChroma] of Object.entries(peakChromas)) {
      const ramp = color[rampName as keyof typeof color];
      const parsed = parseOklch(ramp[500]);
      expect(parsed.c).toBe(expectedPeakChroma);
    }
  });

  it("croma en paso 500 es el máximo de la rampa", () => {
    const peakChromas: Record<string, number> = {
      primary: 0.158,
      secondary: 0.259,
      warning: 0.16,
      error: 0.24,
    };

    for (const [rampName] of Object.entries(peakChromas)) {
      const ramp = color[rampName as keyof typeof color];
      const cromas = STEPS.map((step) => parseOklch(ramp[step]).c);
      const maxChroma = Math.max(...cromas);
      const peak500Chroma = parseOklch(ramp[500]).c;
      expect(peak500Chroma).toBe(maxChroma);
    }
  });
});

/*
 * CANDADO DE RAMPAS SIN CONSUMIDOR -- critica externa #17 (2026-09-03).
 *
 * POR QUE LA UNIDAD ES LA RAMPA Y NO EL PASO. Dos criticas seguidas (#16 y
 * #17) han contado los mismos 30 pasos de 60 sin consumidor directo y han
 * llegado a la misma conclusion: no se poda ninguno, porque un paso no
 * existe como cosa retirable. Estas rampas son la SALIDA de `ramp(hue,
 * peakChroma)` recorriendo la escalera compartida `STEPS`, asi que "retirar
 * warning[50]" solo se puede hacer acortando `STEPS` -- y entonces pierden
 * el paso las cinco, incluidas las que si lo consumen -- o bifurcando la
 * fabrica para devolver un `Ramp` parcial, con lo que `Record<Step, string>`
 * deja de ser cierto para `semantic.ts` y `contrast.ts`. El docblock de
 * `color.ts` lleva el razonamiento entero.
 *
 * Lo que SI es retirable es una rampa completa, y ya ocurrio: `success` se
 * fue en la #14 con cero consumidores en todo el repo. Ese es el liston que
 * este candado afirma, para que la proxima rampa que se quede sin nadie
 * salte en `pnpm test` en vez de esperar a una critica externa -- y para que
 * el analisis de los 30 pasos no haya que volver a escribirlo cada ronda.
 *
 * Comentarios DESPOJADOS antes de buscar (leccion del repo, 2026-08-11): el
 * docblock de `color.ts` CITA `palette.warning[50]` y compania en prosa para
 * explicar la decision, y sin despojarlos esas citas bastarian para que el
 * candado pasara sin consumo real.
 */
describe("cada rampa tiene consumidor real (critica externa #17)", () => {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const EXTENSIONES = new Set([".ts", ".tsx"]);

  function recorrer(dir: string, out: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const completo = join(dir, entrada);
      if (statSync(completo).isDirectory()) recorrer(completo, out);
      else if (EXTENSIONES.has(extname(completo))) out.push(completo);
    }
    return out;
  }

  function despojar(fuente: string): string {
    return fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
  }

  const ficheros = [
    ...recorrer(join(raiz, "src")),
    ...recorrer(join(raiz, "app")),
  ]
    .map((f) => ({
      ruta: f.slice(raiz.length + 1).replace(/\\/g, "/"),
      texto: despojar(readFileSync(f, "utf-8")),
    }))
    .filter(
      ({ ruta }) =>
        ruta !== "src/theme/tokens/color.ts" &&
        !ruta.endsWith(".test.ts") &&
        !ruta.endsWith(".test.tsx"),
    );

  function pasosVivosDe(rampa: string): number[] {
    return STEPS.filter((paso) => {
      const patron = new RegExp(`\\b(?:palette|color)\\.${rampa}\\[${paso}\\]`);
      return ficheros.some((f) => patron.test(f.texto));
    }).map(Number);
  }

  /* Sonda positiva: si el mecanismo estuviera roto (raiz equivocada, regex
     mal escrita) el bloque de abajo pasaria por vacuidad al no encontrar
     nada. `warning` es la rampa mas flaca de las cinco -- dos pasos vivos,
     500 y 800 -- asi que sirve de calibre exacto del instrumento. */
  it("sonda positiva: el censo reproduce los dos pasos vivos de warning", () => {
    expect(ficheros.length).toBeGreaterThan(50);
    expect(pasosVivosDe("warning")).toEqual([500, 800]);
  });

  for (const rampa of Object.keys(color)) {
    it(`${rampa} tiene al menos un paso con consumidor de produccion`, () => {
      const vivos = pasosVivosDe(rampa);
      expect(
        vivos,
        `palette.${rampa}: los doce pasos sin un solo consumidor -- ese es el liston de retirada (precedente: \`success\`, critica #14), no el de un paso suelto`,
      ).not.toHaveLength(0);
    });
  }
});
