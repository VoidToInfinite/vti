import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { contrastRatio } from "@/theme/tokens/contrast";
import { semanticLight } from "@/theme/tokens/semantic";
import { AURA_SURFACE } from "./aura.layers";
import { ScAuraBase, ScAuraFoot } from "./aura.parts";

/**
 * ScAuraFoot es la rampa de la costura Hero -> Story en tema claro (spec
 * S6.4, revisada: Story pasa a ser clara mas adelante, ya no siempre
 * oscura). Este archivo prueba la pieza directamente (sin montar Aura
 * entera), igual que aura.layers.test.ts prueba aura.layers.ts sin montar
 * Aura.
 */

/** Extrae las paradas oklch() de un background-image de gradiente lineal. */
function stops(backgroundImage: string): string[] {
  return backgroundImage.match(/oklch\([^)]*\)/g) ?? [];
}

/**
 * Separa una parada `oklch(L C H)` u `oklch(L C H / A)` en su color OPACO
 * (sin la barra de alfa, que `parseOklch` de contrast.ts no acepta) y su
 * alfa (1 si no declara barra).
 */
function parseStop(stop: string): { colorOnly: string; alpha: number } {
  const match = stop.match(
    /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
  );
  expect(match, `parada inesperada: ${stop}`).not.toBeNull();
  const [, l, c, h, a] = match as RegExpMatchArray;
  return { colorOnly: `oklch(${l} ${c} ${h})`, alpha: a ? Number(a) : 1 };
}

/**
 * Luminancia relativa WCAG de un oklch() SIN alfa, via contrastRatio contra
 * el negro puro: contrastRatio(c, negro) = (L(c) + 0.05) / 0.05, porque la
 * luminancia del negro es 0 y c siempre es igual o mas claro. Evita duplicar
 * la conversion OKLCH -> sRGB lineal que ya vive en contrast.ts (que no
 * exporta la luminancia por si sola).
 */
function luminanceOf(colorOnly: string): number {
  return contrastRatio(colorOnly, "oklch(0 0 0)") * 0.05 - 0.05;
}

function footElement(): HTMLElement {
  const { container } = renderWithProviders(<ScAuraFoot data-part="foot" />);
  return container.firstElementChild as HTMLElement;
}

describe("ScAuraFoot (rampa de continuidad del pie claro)", () => {
  it("es estrictamente monotona en luminancia CRECIENTE, compuesta sobre el peor caso (fondo negro)", () => {
    // Contrato INVERTIDO respecto a la version que descendia hacia
    // EYE_SURFACE: esta rampa ASCIENDE hacia un fondo claro, asi que el peor
    // caso para probar que nunca da un paso atras es el fondo que MINIMIZA
    // la luminancia compuesta en cada parada -- negro, no blanco. Si crece
    // incluso ahi, crece bajo cualquier fondo real (mismo patron que exige
    // la leccion del velo de continuidad, task/lessons.md 2026-07-25: se
    // calcula, no se afirma).
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    expect(paradas.length).toBe(4);

    const compuestas = paradas.map((stop) => {
      const { colorOnly, alpha } = parseStop(stop);
      return alpha * luminanceOf(colorOnly) + (1 - alpha) * 0;
    });

    for (let i = 1; i < compuestas.length; i += 1) {
      expect(
        compuestas[i],
        `la parada ${i} (${paradas[i]}, L=${compuestas[i].toFixed(4)}) no puede ser mas oscura que la ${i - 1} (${paradas[i - 1]}, L=${compuestas[i - 1].toFixed(4)})`,
      ).toBeGreaterThan(compuestas[i - 1]);
    }
  });

  it("la ultima parada es exactamente semantic.bg: el fondo claro generico, no EYE_SURFACE", () => {
    // Story todavia no es clara en este repo (nota de incertidumbre en el
    // docblock de ScAuraFoot): semantic.bg es la mejor suposicion
    // documentada del tono que heredaria si adopta el tema estandar, no una
    // medida del Story real.
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    expect(paradas.at(-1)).toBe(semanticLight.bg);
  });

  it("la primera parada usa AURA_SURFACE con alfa 0, no negro transparente", () => {
    // Si la primera parada fuera `transparent` (negro transparente), el
    // tramo inicial de la rampa oscureceria antes de aclarar. Anclarla al
    // mismo tono que ya pinta el campo (AURA_SURFACE) hace que el arranque
    // de la rampa sea invisible sobre el propio fondo de Aura, no un salto.
    const paradas = stops(getComputedStyle(footElement()).backgroundImage);
    const { colorOnly, alpha } = parseStop(paradas[0]);
    expect(alpha).toBe(0);
    expect(colorOnly).toBe(AURA_SURFACE);
  });

  it("es puramente decorativa: no captura el puntero", () => {
    expect(getComputedStyle(footElement()).pointerEvents).toBe("none");
  });
});

/**
 * Guard de prefers-reduced-motion de auraStagger sobre el estado "pending"
 * (bug real detectado en revision, spec S6.5/S7.2). jsdom no evalua
 * @media (prefers-reduced-motion: reduce) al calcular estilos (verificado en
 * este entorno, incluso con un @media (min-width: 0px) siempre-verdadero: no
 * se aplica), asi que getComputedStyle() no distingue el bug presente del
 * arreglado -- por eso, mismo patron que Hero.qa.test.tsx/Eye.test.tsx, se
 * inspecciona el CSS inyectado en document.styleSheets directamente.
 */
describe('auraStagger bajo prefers-reduced-motion: reduce (bug real, "pending" invisible durante la carga)', () => {
  /** Todas las reglas inyectadas, incluidas las anidadas dentro de @media. */
  function todasLasReglas(): string[] {
    const out: string[] = [];
    const walk = (rules: CSSRuleList): void => {
      Array.from(rules).forEach((rule) => {
        out.push(rule.cssText);
        const anidadas = (rule as CSSGroupingRule).cssRules;
        if (anidadas) walk(anidadas);
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        walk(sheet.cssRules);
      } catch {
        /* hoja inaccesible: no aporta */
      }
    });
    return out;
  }

  /** Reglas cuyo selector menciona alguna de las clases del elemento. */
  function reglasDe(el: HTMLElement): string[] {
    const clases = Array.from(el.classList);
    return todasLasReglas().filter((texto) =>
      clases.some((cls) => texto.includes(`.${cls}`)),
    );
  }

  it('el bloque de reduce cubre "pending" ademas de "active"/"leaving", y fuerza opacity: 1', () => {
    // La carga arranca el stack en "pending" (spec S7.2) y se queda ahi hasta
    // que resuelve la carrera de decode(): sin este guard, el fondo pastel
    // queda invisible ese tramo bajo reduced-motion.
    const { container } = renderWithProviders(
      <div data-state="pending">
        <ScAuraBase data-part="base" />
      </div>,
    );
    const el = container.querySelector('[data-part="base"]') as HTMLElement;

    const bloqueReduce = reglasDe(el).find((regla) =>
      regla.includes("@media (prefers-reduced-motion: reduce)"),
    );
    expect(bloqueReduce).toBeDefined();

    // Candado de regresion: si alguien vuelve a quitar "pending" de la lista
    // de selectores del bloque de reduce, esta asercion cae primero -- una
    // asercion generica de "existe algun bloque de reduce" pasaria igual con
    // el bug presente (el bloque de active/leaving nunca se toco).
    expect(bloqueReduce).toContain('[data-state="active"]');
    expect(bloqueReduce).toContain('[data-state="leaving"]');
    expect(bloqueReduce).toContain('[data-state="pending"]');
    expect(bloqueReduce).toMatch(/opacity:\s*1/);
  });

  it('la regla llana [data-state="pending"] & (fuera de reduce) sigue forzando opacity: 0, para no tapar el comportamiento normal', () => {
    // Control: el arreglo vive DENTRO del bloque de reduce, no reemplazando
    // la regla de siempre -- fuera de reduce, "pending" sigue siendo
    // invisible (asi arranca el cruce de temas y la carga con motion normal).
    const { container } = renderWithProviders(
      <div data-state="pending">
        <ScAuraBase data-part="base" />
      </div>,
    );
    const el = container.querySelector('[data-part="base"]') as HTMLElement;

    const reglaLlana = reglasDe(el).find(
      (regla) =>
        regla.includes('[data-state="pending"]') && !regla.includes("@media"),
    );
    expect(reglaLlana).toBeDefined();
    expect(reglaLlana).toMatch(/opacity:\s*0/);
  });
});
