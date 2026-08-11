import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import i18n from "@/i18n/config";
import esHome from "@/i18n/locales/es/home.json";
import enHome from "@/i18n/locales/en/home.json";
import { AURA_SURFACE } from "@/components/scenes/aura/aura.layers";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { Button } from "@/components/ui/Button/Button";
import { contrastRatio } from "@/theme/tokens/contrast";
import { color } from "@/theme/tokens/color";
import { semanticDark, semanticLight } from "@/theme/tokens/semantic";
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

/*
 * `Hero` ya no consume `useStage()` desde la revision 2026-08-11 (Task 10:
 * su intro de carga es CSS estatico), y `HeroBackdrop` -- que `Hero` monta
 * -- tampoco desde la Task 27 (misma fecha): la maquina de fases del stage
 * (`useStage()`/`StageProvider`) se retiro entera. Se renderiza `<Hero />`
 * directamente, sin ningun envoltorio de proveedor propio de este archivo.
 */
function renderHero(): RenderResult {
  return renderWithProviders(<Hero />);
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

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

  it("el contenedor del titulo usa el clamp literal del usuario, no el token display, con el factor vw resuelto por variable CSS", () => {
    // REESCRITO (Flujo 3): ScHeroBrand paso de
    // min(theme.data.type.scale.display.size, 10vw) a un clamp(34px, 8vw,
    // 258px) literal explicito del usuario -- se documenta como excepcion en
    // el propio Hero.tsx, no se corrige a la escala. La asercion de
    // line-height SIGUE leyendo el token (B2 no la toca).
    //
    // REESCRITO OTRA VEZ (Task 9, anti-flash de tema): el factor vw ya NO
    // sale de un prop `$light` interpolado por React -- ahora es
    // var(--hero-title-vw, 7vw), la MISMA declaracion CSS sea cual sea el
    // tema (ver el docblock de ScHeroBrand en Hero.tsx). jsdom no resuelve
    // var() (no hace layout, tampoco cascada de custom properties), asi que
    // getComputedStyle(...).fontSize devuelve el texto CRUDO de la
    // declaracion, sin sustituir la variable -- exactamente lo que este test
    // aprovecha para demostrar la propiedad que Task 9 persigue: la
    // declaracion NO cambia con el tema (candado de "sin re-maquetacion").
    const { container } = renderHero();
    const titulo = container.querySelector(
      '[data-testid="hero-title"]',
    ) as HTMLElement;

    expect(sinEspacios(getComputedStyle(titulo).fontSize)).toBe(
      sinEspacios("clamp(34px, var(--hero-title-vw, 7vw), 258px)"),
    );
    expect(getComputedStyle(titulo).lineHeight).toBe(
      String(typeTokens.scale.display.lineHeight),
    );
  });

  it("el clamp del titulo es IDENTICO con o sin tema oscuro en storage: ya no hay re-maquetacion tras la correccion de ThemeProvider", () => {
    // Candado directo del objetivo de Task 9 (CLS 0,0799 medido en el
    // arranque oscuro de escritorio -> ~0): antes de esta tarea, el efecto
    // post-montaje de ThemeProvider recalculaba este MISMO nodo con un
    // literal de CSS distinto (7vw -> 8vw), lo que generaba una clase nueva
    // de styled-components y, con ella, el shift. Si volviera a divergir
    // (alguien reintroduce `${'$light'} &&` en vez de la variable CSS), este
    // test lo detecta sin necesidad de medir CLS en un navegador real.
    window.localStorage.setItem("vti-theme", "dark");
    const conStorageDark = renderHero();
    const tituloDark = conStorageDark.container.querySelector(
      '[data-testid="hero-title"]',
    ) as HTMLElement;
    const fontSizeDark = getComputedStyle(tituloDark).fontSize;
    conStorageDark.unmount();
    window.localStorage.clear();

    const sinStorage = renderHero();
    const tituloClaro = sinStorage.container.querySelector(
      '[data-testid="hero-title"]',
    ) as HTMLElement;
    const fontSizeClaro = getComputedStyle(tituloClaro).fontSize;

    expect(sinEspacios(fontSizeDark)).toBe(sinEspacios(fontSizeClaro));
  });

  it("el subtitulo usa el clamp literal del usuario, no el token h3", () => {
    const { container } = renderHero();
    const subtitulo = container.querySelector(
      '[data-testid="hero-subtitle"]',
    ) as HTMLElement;

    expect(sinEspacios(getComputedStyle(subtitulo).fontSize)).toBe(
      sinEspacios("clamp(15px, 2vw, 22px)"),
    );
  });

  /*
   * El h1 vuelve a ser EXACTAMENTE la marca: la tagline que lo acompaño
   * durante la auditoria SEO del 2026-08-08 se retiro por decision del
   * usuario ese mismo dia. Afirmar el texto exacto (y no un `toContain`)
   * es lo que convierte esto en un candado: cualquier nodo de texto que se
   * cuele dentro del encabezado principal lo pone en rojo.
   */
  it("el titulo del hero es un unico <h1> con la marca y nada mas", () => {
    const { container } = renderHero();
    const encabezados = container.querySelectorAll("h1");
    expect(encabezados).toHaveLength(1);
    expect(encabezados[0].textContent).toBe("VoidToInfinite");
  });

  /*
   * COBERTURA PERDIDA (usuario retiro <ScKicker> de Hero.tsx, ver informe):
   * las dos pruebas que vivian aqui aseveraban `getComputedStyle(...).color`
   * del kicker contra `semanticDark.brandText`/`semanticLight.brandText` --
   * el color de marca por tema. Sin el kicker no queda ningun elemento del
   * hero que resuelva `brandText` como su propiedad `color` PLANA (fuera de
   * un `@media`): el titulo y el label del CTA secundario si consumen
   * brandText, pero como PARADA de un `background-image` degradado recortado
   * a texto (`heroGradient`/`gradientTextClip`, BrandName.tsx), nunca como
   * `color` propio -- su unica declaracion de `color: brandText` vive dentro
   * de `@media (prefers-reduced-motion: reduce)` y `@supports not
   * (background-clip: text)`, que jsdom no evalua para getComputedStyle (ver
   * CLAUDE.md). No hay reapunte fiel: se elimina sin sustituto.
   */

  it("los colores del hero pasan AA sobre el negro del lienzo (tema oscuro)", () => {
    // El contraste del HERO no estaba cubierto por ningun test: brandText es
    // una parada del degradado detras del tramo "ToInfinite" del titulo y del
    // label del CTA secundario (heroGradient/gradientTextClip, ver arriba),
    // un rol de color distinto al del resto de la copia.
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

  /*
   * Amplia la pareja huerfana de arriba con el equivalente del tema claro
   * contra AURA_SURFACE, el pastel medido del fondo de Aura (spec S6.6).
   * Se asevera contra la constante importada, no un literal escrito a mano,
   * asi que sigue en verde aunque AURA_SURFACE cambie de valor (paso ya real:
   * revision 2026-07-27, spec S15.5, bajo de oklch(0.961 0.016 283) a
   * oklch(0.942 0.023 285)). Valores medidos con el fondo actual:
   * semanticLight.text 10.63:1 y semanticLight.brandText 4.88:1 -- los dos
   * pasan AA (4.5:1), con menos margen que antes por ser un fondo mas oscuro.
   */
  it("los colores del hero pasan AA sobre el pastel del lienzo (tema claro)", () => {
    expect(
      contrastRatio(semanticLight.text, AURA_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(semanticLight.brandText, AURA_SURFACE),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("con el idioma en ingles, los dos textos salen del locale ingles", async () => {
    // Los tests existentes solo comparan contra `esHome`: la mitad del
    // contrato de paridad no estaba verificada en el componente.
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    try {
      renderHero();
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
    const { container } = renderHero();
    // Se llega al contenedor (ScCopy) por el parentElement del titulo, el
    // primer hijo que sigue existiendo tras retirarse el kicker.
    const copia = (
      container.querySelector('[data-testid="hero-title"]') as HTMLElement
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
    renderHero();
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

  it("el pie del hero es CSS estatico en tema oscuro: ni transicion ni animacion", () => {
    // Una transicion de background-image seria un fallo de rendimiento
    // invisible en revision de codigo. En OSCURO el pie no cambia de
    // opacidad -- eso solo aplica en claro (ver el siguiente test) -- asi
    // que sigue siendo 100% estatico.
    window.localStorage.setItem("vti-theme", "dark");
    renderHero();
    const css = reglasDe(screen.getByTestId("hero-foot")).join("\n");

    expect(css).not.toContain("transition");
    expect(css).not.toContain("animation");
  });

  it("el pie del hero en tema claro declara la transicion de opacidad, pero ninguna animacion", () => {
    // En CLARO el pie se apaga por opacidad (spec S6.4): la altura y el
    // degradado siguen siendo CSS estatico (ver el test de arriba, que
    // comparten literal), pero ahora hay una transicion de `opacity`
    // deliberada -- lo que no debe aparecer nunca es una animacion.
    renderHero(); // por defecto: claro (sin localStorage)
    const css = reglasDe(screen.getByTestId("hero-foot")).join("\n");

    expect(css).toContain("transition");
    expect(css).toContain("opacity: 0");
    expect(css).not.toContain("animation");
  });

  it("el pie oscuro del hero se apaga por opacidad en tema claro", () => {
    renderHero(); // por defecto: claro (sin localStorage)
    expect(getComputedStyle(screen.getByTestId("hero-foot")).opacity).toBe("0");
  });

  it("el pie oscuro del hero permanece opaco en tema oscuro", () => {
    // En oscuro `opacity` no se declara (ver el test "CSS estatico" de
    // arriba): jsdom no sintetiza el valor inicial de una propiedad nunca
    // declarada y devuelve cadena vacia en vez de "1" (mismo gotcha medido
    // para mix-blend-mode en Aura.test.tsx); el `||` compensa esa
    // diferencia de entorno sin escribir un string a mano.
    window.localStorage.setItem("vti-theme", "dark");
    renderHero();
    const opacity =
      getComputedStyle(screen.getByTestId("hero-foot")).opacity || "1";
    expect(opacity).toBe("1");
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

    /*
     * COBERTURA RETIRADA con el CTA secundario (encargo 2026-08-08): dos
     * pruebas median su borde animado (brandText/secondary[300] >= 3:1
     * contra EYE_SURFACE, WCAG 1.4.11) y su label ghost (brandSolid >= 4.5:1
     * contra EYE_SURFACE). Ese boton ya no existe -- el hero tiene un solo
     * CTA, el primario -- asi que las dos aserciones no describen ningun
     * pixel real. Los pares que seguian importando NO se pierden: brandText
     * contra EYE_SURFACE lo sigue midiendo "los colores del hero pasan AA
     * sobre el negro del lienzo", mas arriba en este mismo archivo (el
     * degradado del titular sigue recorriendo esa parada), y el par
     * onBrand/degradado lo mide el test del CTA primario, justo encima.
     */

    it("renderiza el CTA como enlace (forwardedAs preserva la logica de Button, a diferencia de as)", () => {
      renderHero();
      const acciones = screen.getByTestId("hero-actions");
      const enlaces = acciones.querySelectorAll("a");
      expect(enlaces).toHaveLength(1);
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

/*
 * Candados de FUENTE (Task 9, anti-flash de tema), no de render: la lección
 * de la casa (RULES.md #37) es que `createGlobalStyle` no inyecta nada bajo
 * jsdom + Vitest, así que las reglas ESTÁTICAS de `GlobalStyles.tsx`
 * (`:root[data-theme="dark"] { --hero-title-vw: 8vw; ... }`) no aparecen
 * nunca en `document.styleSheets` de un test, monte lo que monte. El test de
 * arriba ("el clamp del titulo es IDENTICO...") ya prueba, por render, que
 * `Hero.tsx` dejó de depender de React para este valor; lo que falta cerrar
 * -- y solo se puede cerrar leyendo el FICHERO, mismo patrón que
 * `app/layout.test.ts` -- es que el FALLBACK de la variable (el valor claro,
 * el que hornea el build) y el OVERRIDE oscuro (el que activa el script
 * pre-pintado) sean los literales correctos, no huérfanos entre sí.
 */
describe("Hero.tsx / GlobalStyles.tsx — variables CSS del anti-flash (candado de fuente)", () => {
  async function leerFuente(...segments: string[]): Promise<string> {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(here, ...segments), "utf-8");
  }

  it("ScHeroBrand declara el fallback CLARO (7vw): sin JS, el resultado es identico al de antes de Task 9", async () => {
    const source = await leerFuente("Hero.tsx");
    expect(source).toContain("var(--hero-title-vw, 7vw)");
  });

  it('GlobalStyles.tsx redefine --hero-title-vw a 8vw SOLO bajo :root[data-theme="dark"]', async () => {
    const source = await leerFuente(
      "..",
      "..",
      "..",
      "theme",
      "GlobalStyles.tsx",
    );
    const bloque = source.match(/:root\[data-theme="dark"\]\s*\{[^}]*\}/)?.[0];
    expect(
      bloque,
      'no se encontro el bloque :root[data-theme="dark"]',
    ).not.toBeUndefined();
    expect(bloque).toContain("--hero-title-vw: 8vw");
    expect(bloque).toContain("--hero-align-items-lg: center");
    expect(bloque).toContain("--hero-justify-lg: flex-end");
    expect(bloque).toContain("--hero-text-align-lg: center");
    expect(bloque).toContain("--hero-copy-maxwidth-lg: 70ch");
    expect(bloque).toContain("--hero-actions-justify-lg: center");
  });
});
