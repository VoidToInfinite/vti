import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SectionBeam } from "./SectionBeam";
import {
  BEAM_CORE,
  BEAM_MID,
  BEAM_TAIL,
  HOTSPOT_GLOW,
  SECTION_BEAM_Z,
  SWEEP_CORE,
  SWEEP_GLOW,
  SWEEP_MID,
} from "./sectionBeam.layers";

/*
 * Mockea IntersectionObserver a mano, igual que `Contact.test.tsx`: el
 * componente usa `useReveal` internamente y jsdom no lo implementa.
 */
let trigger: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (v) => cb([{ isIntersecting: v }]);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Texto CSS de las reglas que styled-components inyectó para un elemento
 * (jsdom no evalúa NINGÚN `@media`, así que un guard de
 * `prefers-reduced-motion` solo se puede atar inspeccionando el TEXTO de la
 * regla, nunca con `getComputedStyle`). Mismo helper que ya usan
 * `Contact.test.tsx`/`Story.test.tsx`.
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

function renderBeam(): { beam: HTMLElement; children: HTMLElement[] } {
  const { container } = renderWithProviders(<SectionBeam />);
  const beam = container.firstElementChild as HTMLElement;
  const children = Array.from(beam.children) as HTMLElement[];
  return { beam, children };
}

describe("SectionBeam: marcado (decorativo, anatomia de 5 elementos)", () => {
  it("es un contenedor aria-hidden, sin nombre accesible ni texto, con exactamente 5 hijos", () => {
    const { beam, children } = renderBeam();
    expect(beam).toHaveAttribute("aria-hidden", "true");
    expect(beam).not.toHaveAccessibleName();
    expect(beam.textContent).toBe("");
    expect(children).toHaveLength(5);
  });

  /*
   * El apilamiento local es lo unico que impide que la costura quede tapada
   * por un hermano posterior: los dos consumidores montan detras del haz
   * piezas POSICIONADAS con fondo propio (el slot pegado de la escena en
   * Contacto, el campo de estrellas en el Footer), y dos elementos
   * posicionados con `z-index: auto` se pintan en orden de DOM. Es un fallo
   * que no rompe ningun test de marcado ni deja rastro en consola: solo se
   * ve mirando la pagina. Se asevera contra la constante importada, nunca
   * contra un literal escrito a mano.
   */
  it("declara z-index propio para no quedar tapado por hermanos posicionados posteriores", () => {
    const { beam } = renderBeam();
    expect(getComputedStyle(beam).zIndex).toBe(String(SECTION_BEAM_Z));
  });
});

describe("SectionBeam: estado en reposo (D8 -- sin revelar, el haz NO esta dibujado)", () => {
  it("los dos semihaces de dibujado arrancan en scaleX(0)", () => {
    const { children } = renderBeam();
    const [drawLeft, drawRight] = children;
    expect(getComputedStyle(drawLeft).transform).toBe("scaleX(0)");
    expect(getComputedStyle(drawRight).transform).toBe("scaleX(0)");
  });

  it("los dos semihaces de barrido arrancan en scaleX(0) y opacity 0", () => {
    const { children } = renderBeam();
    const [, , sweepLeft, sweepRight] = children;
    for (const el of [sweepLeft, sweepRight]) {
      expect(getComputedStyle(el).transform).toBe("scaleX(0)");
      expect(getComputedStyle(el).opacity).toBe("0");
    }
  });

  it("el punto caliente central arranca visible a opacity 0.55 (brillo fijo, no una revelacion)", () => {
    const { children } = renderBeam();
    const hotspot = children[4];
    expect(getComputedStyle(hotspot).opacity).toBe("0.55");
  });
});

describe("SectionBeam: el dibujado se dispara con useReveal, no al montar (D8)", () => {
  it("data-revealed pasa de false a true al intersectar", () => {
    const { beam } = renderBeam();
    expect(beam).toHaveAttribute("data-revealed", "false");
    act(() => trigger(true));
    expect(beam).toHaveAttribute("data-revealed", "true");
  });

  it('beamDraw esta declarada bajo una regla cuyo selector lleva [data-revealed="true"] (falsable: sin el atributo en el selector, la cadena no aparece)', () => {
    const { children } = renderBeam();
    const [drawLeft, drawRight] = children;
    for (const el of [drawLeft, drawRight]) {
      const css = cssRuleTextFor(el);
      // Sonda positiva: confirma que el helper SI ve `animation:` en alguna
      // regla de este elemento -- si no la viera, el assert de abajo
      // pasaria por vacuidad.
      expect(css).toContain("animation:");

      const reglaAnimacion = css
        .split("\n")
        .find(
          (linea) => linea.includes("animation:") && !linea.includes("@media"),
        );
      expect(reglaAnimacion).toBeDefined();

      // El atributo tiene que ir DELANTE de la propia clase (selector
      // DESCENDIENTE, `[data-revealed="true"] .clase`), no pegado a ella
      // (selector CALIFICADO, `.clase[data-revealed="true"]`): las dos formas
      // contienen la misma subcadena `[data-revealed="true"]`, asi que un
      // simple `.toContain(...)` no distinguiria la forma correcta del fallo
      // silencioso que documenta `CLAUDE.md §5.1` (el atributo vive en el
      // CONTENEDOR -- ver docblock de `ScSectionBeam` -- nunca en el propio
      // hijo). Verificado con el bug inyectado a proposito: con
      // `&[data-revealed="true"]` la regla generada es
      // `.hash[data-revealed="true"] {...}` y este `startsWith` cae en rojo.
      expect((reglaAnimacion as string).trimStart()).toMatch(
        /^\[data-revealed="true"\]\s/,
      );
    }
  });
});

describe("SectionBeam: guards de prefers-reduced-motion (D8 -- no confia en el colapso global de GlobalStyles)", () => {
  it("los 5 elementos fuerzan animation: none en su PROPIO bloque reduce (linea concreta, no el stylesheet acumulado de todos los componentes)", () => {
    const { children } = renderBeam();
    for (const el of children) {
      const css = cssRuleTextFor(el);
      const lineaReduce = css
        .split("\n")
        .find(
          (linea) =>
            linea.includes("prefers-reduced-motion: reduce") &&
            linea.includes("animation:"),
        );
      expect(lineaReduce).toBeDefined();
      expect(lineaReduce as string).toContain("animation: none");
    }
  });

  it("los dos semihaces de dibujado fuerzan ademas transform: scaleX(1) en ese mismo bloque reduce, para verse dibujados y quietos", () => {
    const { children } = renderBeam();
    const [drawLeft, drawRight] = children;
    for (const el of [drawLeft, drawRight]) {
      const css = cssRuleTextFor(el);
      const lineaReduce = css
        .split("\n")
        .find((linea) => linea.includes("prefers-reduced-motion: reduce"));
      expect(lineaReduce).toBeDefined();
      expect(lineaReduce as string).toContain("transform: scaleX(1)");
    }
  });

  it("las tres animaciones infinitas (barrido x2 + pulso) solo corren bajo no-preference: apagadas por construccion bajo reduce", () => {
    const { children } = renderBeam();
    const infinitos = [children[2], children[3], children[4]];
    for (const el of infinitos) {
      const css = cssRuleTextFor(el);
      // Sonda positiva: el helper SI ve `animation:` bajo no-preference -- si
      // no la viera, el assert de ausencia de abajo pasaria por vacuidad.
      expect(css).toContain("prefers-reduced-motion: no-preference");
      expect(css).toContain("animation:");

      // La declaracion de nivel superior (fuera de cualquier @media) NO debe
      // traer ya una animacion incondicional: la unica forma de que quede
      // apagada bajo reduce es que viva EXCLUSIVAMENTE dentro del bloque
      // no-preference (mismo patron que `Story.test.tsx`).
      const topLevelRule = css.split("@media")[0];
      expect(topLevelRule).not.toContain("animation:");
    }
  });
});

/*
 * Tonalidad por tema (D1/D2/D5, spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`). No se mide aqui
 * el valor claro EXACTO (eso ya lo cubre `sectionBeam.layers.test.ts` contra
 * los tokens reales importados) -- este archivo comprueba la BIFURCACION en
 * si misma, a nivel del componente montado: que la rama clara NUNCA deja
 * escapar uno de los 7 literales oscuros a la regla CSS inyectada, y que la
 * rama oscura SI los sigue usando tal cual (D5, el invariante duro de esta
 * entrega). `ThemeProvider` arranca siempre en `"light"` (no puede leer
 * `localStorage` durante el render, ver su propio docblock) y solo se
 * corrige a "dark" en un efecto tras montar -- de ahi el `waitFor` en el test
 * oscuro, ausente del claro porque ahi no hace falta esperar ninguna
 * correccion.
 */
describe("SectionBeam: color del haz por tema (D1/D2/D5)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  const DARK_LITERALS = [
    BEAM_CORE,
    BEAM_MID,
    BEAM_TAIL,
    SWEEP_CORE,
    SWEEP_MID,
    SWEEP_GLOW,
    HOTSPOT_GLOW,
  ];

  it("en claro (tema por defecto sin localStorage), ninguna de las 5 piezas contiene alguno de los 7 literales oscuros del haz", () => {
    const { children } = renderBeam();
    expect(children).toHaveLength(5);
    for (const el of children) {
      const css = cssRuleTextFor(el);
      for (const literal of DARK_LITERALS) {
        expect(css).not.toContain(literal);
      }
    }
  });

  it('en oscuro, las 5 piezas SI usan los 7 literales VERBATIM del mockup (D5: "no cambia ni un pixel")', async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { children } = renderBeam();
    const [drawLeft, drawRight, sweepLeft, sweepRight, hotspot] = children;

    // El primer literal que aparezca confirma que el efecto de hidratacion
    // de ThemeProvider ya corrigio el tema a "dark" antes de leer el resto.
    await waitFor(() => {
      expect(cssRuleTextFor(drawLeft)).toContain(BEAM_CORE);
    });

    for (const el of [drawLeft, drawRight]) {
      const css = cssRuleTextFor(el);
      expect(css).toContain(BEAM_CORE);
      expect(css).toContain(BEAM_MID);
      expect(css).toContain(BEAM_TAIL);
    }

    for (const el of [sweepLeft, sweepRight]) {
      const css = cssRuleTextFor(el);
      expect(css).toContain(SWEEP_CORE);
      expect(css).toContain(SWEEP_MID);
      expect(css).toContain(SWEEP_GLOW);
    }

    const hotspotCss = cssRuleTextFor(hotspot);
    expect(hotspotCss).toContain(SWEEP_CORE);
    expect(hotspotCss).toContain(HOTSPOT_GLOW);
  });
});
