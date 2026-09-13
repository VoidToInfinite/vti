import { describe, it, expect, afterEach } from "vitest";
import { renderWithProviders, waitFor } from "@/test/test-utils";
import {
  FOOTER_STARS,
  footerStarGlow,
  footerStarTint,
} from "@/components/layout/Footer/footer.layers";
import { themes } from "@/theme/themes";
import { StarField } from "./StarField";

/*
 * `StarField` se extrajo del `Footer` el 2026-09-13 para montarse también en
 * `About`. Los tests del campo DENTRO del pie siguen en `Footer.test.tsx` sin
 * cambios (son la prueba de que la extracción no movió nada); estos atan el
 * contrato de la pieza sola, que es lo que ahora comparten dos consumidores.
 */

afterEach(() => {
  window.localStorage.clear();
});

/** Texto CSS de las reglas inyectadas para un elemento. jsdom no evalúa
 *  ningún `@media`, así que los guardas de movimiento se atan por el TEXTO de
 *  la regla (mismo helper que `Footer.test.tsx`). */
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

async function renderStarField(theme: "light" | "dark"): Promise<HTMLElement> {
  window.localStorage.setItem("vti-theme", theme);
  const { container } = renderWithProviders(<StarField />);
  const field = container.firstElementChild as HTMLElement;
  /* El tema oscuro llega tras el efecto de hidratación del proveedor: se
     espera a que el tinte de la primera estrella sea el de ESE tema. */
  await waitFor(() => {
    const first = field.children[0] as HTMLElement;
    expect(first.style.getPropertyValue("--star-tint")).toBe(
      footerStarTint(themes[theme], FOOTER_STARS[0].tintKey),
    );
  });
  return field;
}

describe("StarField", () => {
  it.each([["light"], ["dark"]] as const)(
    "en tema %s pinta una estrella por entrada de FOOTER_STARS dentro de un contenedor aria-hidden",
    async (theme) => {
      const field = await renderStarField(theme);

      expect(field).toHaveAttribute("aria-hidden", "true");
      expect(field.children).toHaveLength(FOOTER_STARS.length);
    },
  );

  it.each([["light"], ["dark"]] as const)(
    "en tema %s cada estrella escribe sus variables desde la tabla y el tinte del tema activo",
    async (theme) => {
      const field = await renderStarField(theme);

      FOOTER_STARS.forEach((star, index) => {
        const el = field.children[index] as HTMLElement;
        expect(el.style.getPropertyValue("--star-top")).toBe(star.top);
        expect(el.style.getPropertyValue("--star-left")).toBe(star.left);
        expect(el.style.getPropertyValue("--star-size")).toBe(star.size);
        expect(el.style.getPropertyValue("--star-tint")).toBe(
          footerStarTint(themes[theme], star.tintKey),
        );
        expect(el.style.getPropertyValue("--star-glow")).toBe(
          footerStarGlow(themes[theme], star.tintKey, star.glowBlurPx) ??
            "none",
        );
        expect(el.style.getPropertyValue("--star-duration")).toBe(
          `${star.durationMs}ms`,
        );
        expect(el.style.getPropertyValue("--star-delay")).toBe(
          `${star.delayMs}ms`,
        );
      });
    },
  );

  /* La propiedad de rendimiento que el docblock de `ScStar` protege (lección
     del 2026-08-04): el template es ESTÁTICO y las 24 estrellas comparten UNA
     clase. Una variación interpolada por estrella daría 24 clases. */
  it("las 24 estrellas comparten una sola clase: la variación viaja por el atributo style", async () => {
    const field = await renderStarField("dark");
    const clases = new Set(
      Array.from(field.children).map((el) => (el as HTMLElement).className),
    );

    expect(clases.size).toBe(1);
  });

  it("el titileo solo corre bajo no-preference, con la curva de motion.easing.standard, y reduce fuerza animation: none", async () => {
    const field = await renderStarField("light");
    const css = cssRuleTextFor(field.children[0] as HTMLElement);

    const animacion = css
      .split("\n")
      .find(
        (line) =>
          line.includes("prefers-reduced-motion: no-preference") &&
          line.includes("animation:"),
      );
    expect(animacion).toBeDefined();
    expect(animacion as string).toContain("infinite");
    expect(animacion as string).toContain(themes.light.motion.easing.standard);

    const reduce = css
      .split("\n")
      .find(
        (line) =>
          line.includes("prefers-reduced-motion: reduce") &&
          line.includes("animation:"),
      );
    expect(reduce).toBeDefined();
    expect(reduce as string).toContain("animation: none");
  });

  it("el contenedor se extiende sobre su ancestro posicionado y no captura el puntero", async () => {
    const field = await renderStarField("light");
    const css = cssRuleTextFor(field);

    expect(css).toContain("position: absolute");
    expect(css).toMatch(/inset:\s*0/);
    expect(css).toContain("pointer-events: none");
  });
});
