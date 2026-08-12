import { describe, it, expect } from "vitest";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { basicLightTheme, basicDarkTheme, themes } from "@/theme/themes";
import { ctaGradientMidStop } from "./BrandName";

/**
 * `palette.secondary[300]` es el unico primitivo GENUINAMENTE nuevo del
 * degradado de `ScGradientTail` (BrandName.tsx) y de los CTA del Hero
 * (Hero.tsx): los otros dos stops (`semantic.text`, `semantic.brandText`) ya
 * estan probados con AA sobre `EYE_SURFACE` en `Hero.qa.test.tsx`. Mismo
 * patron: `contrastRatio` + `EYE_SURFACE`, sin renderizar componentes.
 *
 * `palette` es el mismo objeto `color` compartido entre los dos temas
 * (themes.ts: `palette: color` en el `shared` de ambos), asi que el numero
 * no deberia diferir entre tema claro y oscuro -- se mide en los dos de
 * todas formas, como red de regresion, no porque se espere un resultado
 * distinto.
 */
describe("contraste AA del tramo nuevo del degradado del titulo (BrandName)", () => {
  it.each([
    ["light", basicLightTheme],
    ["dark", basicDarkTheme],
  ] as const)(
    "palette.secondary[300] sobre EYE_SURFACE (tema %s) >= 4.5:1",
    (_name, theme) => {
      const ratio = contrastRatio(theme.palette.secondary[300], EYE_SURFACE);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/**
 * Task 33 (gate F4, hallazgo del evaluador independiente 2026-08-12):
 * `ctaGradient` (BrandName.tsx) es el fondo animado de los dos CTA con texto
 * legible ENCIMA -- ScCtaPrimary (Hero.tsx) y ScSubmitButton (Contact.tsx).
 * Antes de esta tarea compartían `heroGradient` con el título, cuya parada de
 * 65% (`palette.secondary[300]`, la más clara de las 3 distintas) media
 * 1.69:1 contra el texto blanco del botón en tema claro -- por debajo de AA
 * (4.5:1).
 *
 * PEOR FOTOGRAMA = los 3 stops, no una muestra: con `background-size: 260%
 * 100%` la interpolación de un `linear-gradient()` sin hint `in <space>` usa
 * OKLab por defecto (CSS Color 4, "Interpolation") -- `L` es un eje lineal
 * propio de ese espacio, así que entre dos paradas ADYACENTES la claridad
 * percibida interpola de forma monótona, nunca sobrepasa el valor de
 * ninguna de las dos paradas que la delimitan. Consecuencia verificable: el
 * contraste MÍNIMO de TODO el recorrido de `background-position` ocurre
 * siempre EN una parada, jamás entre dos -- basta medir los 3 colores
 * distintos de las 4 paradas del degradado (las paradas 0%/100% son el
 * mismo `semantic.text`) para conocer el peor caso real, sin necesidad de
 * muestrear posiciones intermedias.
 *
 * `ctaGradientMidStop` se importa de `BrandName.tsx` (no se duplica el
 * ternario a mano aquí): este test mide la MISMA función que resuelve el
 * color real en pantalla.
 */
describe("Task 33 -- peor fotograma del degradado animado del CTA (contraste AA)", () => {
  const AA_TEXTO_NORMAL = 4.5;

  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ] as const)(
    "las 3 paradas distintas de ctaGradient pasan AA contra semantic.onBrand (tema %s)",
    (_name, theme) => {
      const paradas: Record<string, string> = {
        "0%/100% (semantic.text)": theme.semantic.text,
        "35% (semantic.brandText)": theme.semantic.brandText,
        "65% (ctaGradientMidStop)": ctaGradientMidStop(theme),
      };

      for (const [etiqueta, color] of Object.entries(paradas)) {
        const ratio = contrastRatio(theme.semantic.onBrand, color);
        expect(
          ratio,
          `parada ${etiqueta} = ${color} da ${ratio.toFixed(3)}:1 contra onBrand, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
        ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
      }
    },
  );

  /*
   * Sonda de no-vacuidad: demuestra que la parada VIEJA (secondary[300], la
   * que usaba heroGradient antes del split) de verdad incumplía AA en tema
   * claro -- si esta aserción alguna vez empezara a pasar, sería la señal de
   * que `ctaGradientMidStop` dejó de resolver por rama y el candado de
   * arriba estaría midiendo un color que ya no es el real.
   */
  it("sonda de no-vacuidad: la parada VIEJA (secondary[300]) seguía incumpliendo AA en tema claro", () => {
    const ratio = contrastRatio(
      themes.light.semantic.onBrand,
      themes.light.palette.secondary[300],
    );
    expect(ratio).toBeLessThan(AA_TEXTO_NORMAL);
  });
});
