import { describe, it, expect } from "vitest";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { basicLightTheme, basicDarkTheme } from "@/theme/themes";

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
