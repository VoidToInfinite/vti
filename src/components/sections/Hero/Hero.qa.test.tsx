import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import i18n from "@/i18n/config";
import enHome from "@/i18n/locales/en/home.json";
import { EYE_SURFACE } from "@/components/eye/eye.layers";
import { Button } from "@/components/ui/Button/Button";
import { contrastRatio } from "@/theme/tokens/contrast";
import { color } from "@/theme/tokens/color";
import { semanticDark } from "@/theme/tokens/semantic";
import { space } from "@/theme/tokens/space";
import { type as typeTokens } from "@/theme/tokens/type";
import { Hero } from "./Hero";

/**
 * Casos de la lente funcional que `Hero.test.tsx` no cubre (TC-J2-02, TC-J3-03
 * ampliado, TC-K1-04, TC-C4-02, TC-M2-01, TC-T1-02 ampliado, TC-M1-02).
 */

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => stubMatchMedia());
afterEach(() => vi.unstubAllGlobals());

/** Todas las reglas inyectadas, incluidas las anidadas dentro de `@media`. */
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

/** Valor en `rem` de un tamano de la escala; de un `clamp()`, su MINIMO. */
function remDe(size: string): number {
  const clamp = size.match(/^clamp\(([^,]+),/);
  const crudo = (clamp ? clamp[1] : size).trim();
  const rem = crudo.match(/^([\d.]+)rem$/);
  expect(rem, `no es un tamano en rem: ${size}`).not.toBeNull();
  return Number((rem as RegExpMatchArray)[1]);
}

const sinEspacios = (s: string): string => s.replace(/\s+/g, "");

describe("Hero (lente funcional)", () => {
  it("la escala decrece de titulo a subtitulo a apoyo, incluso en el peor caso del clamp", () => {
    // jsdom no resuelve clamp()/min()/rem, asi que el ordenamiento en pixeles
    // no es aseverable aqui; SI lo es a nivel de token, que es la fuente de
    // verdad del CSS. Se toma el extremo INFERIOR del clamp del display (el
    // caso mas desfavorable para la jerarquia).
    const titulo = remDe(typeTokens.scale.display.size);
    const subtitulo = remDe(typeTokens.scale.h3.size);
    const apoyo = remDe(typeTokens.scale.body.size);

    expect(titulo).toBeGreaterThan(subtitulo);
    expect(subtitulo).toBeGreaterThan(apoyo);
    expect(typeTokens.scale.display.weight).toBeGreaterThan(
      typeTokens.scale.h3.weight,
    );
    expect(typeTokens.scale.h3.weight).toBeGreaterThan(
      typeTokens.scale.body.weight,
    );
  });

  it("el contenedor del titulo usa el clamp literal del usuario, no el token display", () => {
    // REESCRITO (Flujo 3): ScHeroBrand paso de
    // min(theme.data.type.scale.display.size, 10vw) a un clamp(34px, 8vw,
    // 258px) literal explicito del usuario -- se documenta como excepcion en
    // el propio Hero.tsx, no se corrige a la escala. La asercion de
    // line-height SIGUE leyendo el token (B2 no la toca).
    const { container } = renderWithProviders(<Hero />);
    const titulo = container.querySelector(
      '[data-testid="hero-title"]',
    ) as HTMLElement;

    expect(sinEspacios(getComputedStyle(titulo).fontSize)).toBe(
      sinEspacios("clamp(34px, 8vw, 258px)"),
    );
    expect(getComputedStyle(titulo).lineHeight).toBe(
      String(typeTokens.scale.display.lineHeight),
    );
  });

  it("el subtitulo usa el clamp literal del usuario, no el token h3", () => {
    const { container } = renderWithProviders(<Hero />);
    const subtitulo = container.querySelector(
      '[data-testid="hero-subtitle"]',
    ) as HTMLElement;

    expect(sinEspacios(getComputedStyle(subtitulo).fontSize)).toBe(
      sinEspacios("clamp(15px, 2vw, 22px)"),
    );
  });

  it("el titulo del hero sigue siendo un unico <h1> con el texto exacto 'VoidToInfinite'", () => {
    const { container } = renderWithProviders(<Hero />);
    const encabezados = container.querySelectorAll("h1");
    expect(encabezados).toHaveLength(1);
    expect(encabezados[0].textContent).toBe("VoidToInfinite");
  });

  it("el kicker computa el color de marca del tema oscuro", () => {
    // Ningun test cubria el COLOR del kicker: es el unico rol de color
    // distinto del resto de la copia del hero.
    renderWithProviders(<Hero />);
    expect(getComputedStyle(screen.getByTestId("hero-kicker")).color).toBe(
      semanticDark.brandText,
    );
  });

  it("los colores del hero pasan AA sobre el negro del lienzo", () => {
    // El contraste del HERO no estaba cubierto por ningun test: el kicker usa
    // brandText, un rol distinto al del resto de la copia.
    expect(
      contrastRatio(semanticDark.brandText, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticDark.text, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    // WCAG 1.4.11: el indicador de foco necesita 3:1, no 4.5:1.
    expect(
      contrastRatio(semanticDark.focus, EYE_SURFACE),
    ).toBeGreaterThanOrEqual(3);
  });

  it("con el idioma en ingles, los tres textos salen del locale ingles", async () => {
    // Los tests existentes solo comparan contra `esHome`: la mitad del
    // contrato de paridad no estaba verificada en el componente.
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderWithProviders(<Hero />);
      expect(screen.getByTestId("hero-kicker")).toHaveTextContent(
        enHome.Home.hero.kicker,
      );
      expect(screen.getByTestId("hero-subtitle")).toHaveTextContent(
        enHome.Home.hero.subtitle,
      );
      expect(screen.getByTestId("hero-support")).toHaveTextContent(
        enHome.Home.hero.support,
      );
    } finally {
      await act(async () => {
        await i18n.changeLanguage("es");
      });
    }
  });

  it("bajo prefers-reduced-motion el bloque de copia no anima", () => {
    // `getComputedStyle` de jsdom no evalua `@media`, pero el CSS inyectado si
    // es inspeccionable: se asevera que la regla EXISTE.
    const { container } = renderWithProviders(<Hero />);
    const copia = (
      container.querySelector('[data-testid="hero-kicker"]') as HTMLElement
    ).parentElement as HTMLElement;

    const reduce = reglasDe(copia).filter((texto) =>
      texto.includes("prefers-reduced-motion: reduce"),
    );
    expect(reduce.length).toBeGreaterThan(0);
    expect(reduce.join("\n")).toContain("animation: none");
  });

  it("el pie del hero mide space[8] y cierra exactamente en el negro del lienzo", () => {
    // El test existente solo asevera aria-hidden, textContent y pointer-events:
    // la mitad superior de la rampa (4rem) no estaba atornillada.
    renderWithProviders(<Hero />);
    const pie = screen.getByTestId("hero-foot");
    const estilo = getComputedStyle(pie);

    expect(estilo.height).toBe(space[8]);
    expect(estilo.backgroundImage).toContain(EYE_SURFACE);
    // La ULTIMA parada es el negro opaco: es la que toca la junta con Story.
    const paradas =
      estilo.backgroundImage.match(/oklch\([^)]*\)/g) ?? ([] as string[]);
    expect(paradas.at(-1)).toBe(EYE_SURFACE);
    expect(paradas[0]).toContain("/ 0");
  });

  it("el pie del hero es CSS estatico: ni transicion ni animacion", () => {
    // Una transicion de background-image seria un fallo de rendimiento
    // invisible en revision de codigo.
    renderWithProviders(<Hero />);
    const css = reglasDe(screen.getByTestId("hero-foot")).join("\n");

    expect(css).not.toContain("transition");
    expect(css).not.toContain("animation");
  });

  describe("CTAs animados del hero (Flujo 3)", () => {
    /*
     * heroGradient (BrandName.tsx, reutilizado por ScCtaPrimary/
     * ScCtaSecondary) tiene 4 paradas: semantic.text (L .985), brandText
     * (primary[300], L .86), palette.secondary[300] (L .86) y semantic.text
     * de nuevo. Las dos paradas NO blancas (brandText y secondary[300]) son
     * el "punto mas oscuro" del recorrido -- se mide el contraste contra
     * esas dos, no solo contra el extremo claro.
     */
    it("el label del CTA primario (onBrand) pasa AA contra las dos paradas mas oscuras del degradado", () => {
      expect(
        contrastRatio(semanticDark.onBrand, semanticDark.brandText),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(semanticDark.onBrand, color.secondary[300]),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("el borde animado del CTA secundario pasa el umbral no textual (3:1, WCAG 1.4.11) contra el lienzo", () => {
      expect(
        contrastRatio(semanticDark.brandText, EYE_SURFACE),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(color.secondary[300], EYE_SURFACE),
      ).toBeGreaterThanOrEqual(3);
    });

    it("el label del CTA secundario ghost (brandSolid sobre el lienzo) pasa AA", () => {
      // El texto del CTA secundario NO esta sobre el degradado (solo el
      // borde lo esta): en variant="ghost" el color del label es el accent
      // (brandSolid para intent="primary", el default de Button), y el
      // fondo real detras es el lienzo del ojo.
      expect(
        contrastRatio(semanticDark.brandSolid, EYE_SURFACE),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("renderiza los dos CTA como enlaces (forwardedAs preserva la logica de Button, a diferencia de as)", () => {
      renderWithProviders(<Hero />);
      const acciones = screen.getByTestId("hero-actions");
      const enlaces = acciones.querySelectorAll("a");
      expect(enlaces).toHaveLength(2);
      enlaces.forEach((enlace) => {
        // Si `as` hubiera sustituido a `forwardedAs`, Button entero se
        // descartaria y el <a> no llevaria ninguna clase de ScButton (ver
        // Button.tsx): solo tendria la clase del wrapper del hero. Con
        // forwardedAs, Button sigue envolviendo el label en su propio
        // ScLabel.
        expect(enlace.querySelector("span")).not.toBeNull();
      });
    });

    it.each(["solid", "soft", "outline", "ghost"] as const)(
      "un Button base fuera del hero en variant='%s' no hereda el degradado ni la mascara de los CTA del hero",
      (variant) => {
        const { container } = renderWithProviders(
          <Button
            variant={variant}
            intent="primary"
          >
            Boton de control
          </Button>,
        );
        const boton = container.querySelector("button") as HTMLElement;
        const css = reglasDe(boton).join("\n");

        expect(css).not.toContain("mask-composite");
        expect(getComputedStyle(boton).backgroundImage).not.toContain(
          "linear-gradient(100deg",
        );
      },
    );
  });
});
