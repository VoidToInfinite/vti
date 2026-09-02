import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import i18n from "@/i18n/config";
import enHome from "@/i18n/locales/en/home.json";
import { AURA_SURFACE } from "@/components/scenes/aura/aura.layers";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { Button } from "@/components/ui/Button/Button";
import { AMBIENT } from "@/motion/vocabulary";
import { contrastRatio } from "@/theme/tokens/contrast";
import { color } from "@/theme/tokens/color";
import { grid } from "@/theme/tokens/grid";
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
  it("la escala decrece de titulo a subtitulo a linea, incluso en el peor caso del clamp", () => {
    // jsdom no resuelve clamp()/min()/rem, asi que el ordenamiento en pixeles
    // no es aseverable aqui; SI lo es a nivel de token, que es la fuente de
    // verdad del CSS. Se toma el extremo INFERIOR del clamp del display (el
    // caso mas desfavorable para la jerarquia). "linea" es ScTagline (Task
    // 14): ocupa la misma posicion y el mismo token (variant=body) que el
    // ScSupport retirado.
    const titulo = remDe(typeTokens.scale.display.size);
    const subtitulo = remDe(typeTokens.scale.h3.size);
    const linea = remDe(typeTokens.scale.body.size);

    expect(titulo).toBeGreaterThan(subtitulo);
    expect(subtitulo).toBeGreaterThan(linea);
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
      expect(screen.getByTestId("hero-tagline")).toHaveTextContent(
        enHome.Home.hero.tagline,
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

  /*
   * Crítica externa #10 (2026-08-18), hallazgo C — lado CONSUMIDOR de la
   * tokenización del tope de columna. El candado de FUENTE (más abajo, en el
   * segundo describe) prueba que el número ya no se escribe a mano; este
   * prueba lo complementario, que es lo que de verdad se ve: lo que llega al
   * CSS renderizado sigue siendo el MISMO ancho de antes.
   *
   * Se afirma contra el token importado, nunca contra el literal (regla 38, y
   * mismo patrón que `Journey.test.tsx`/`Story.test.tsx` ya usan con
   * `grid.prose`): si algún día el token cambia de valor, este candado no
   * miente sobre lo que el hero pinta, cambia con él.
   */
  it("crítica #10: tagline y subtítulo topan su ancho en grid.heroCopyMax, el mismo valor que declaraban a mano", () => {
    renderHero();
    const tagline = reglasDe(screen.getByTestId("hero-tagline")).join("\n");
    const subtitulo = reglasDe(screen.getByTestId("hero-subtitle")).join("\n");

    expect(tagline).toContain(`max-width: ${grid.heroCopyMax}`);
    expect(subtitulo).toContain(`max-width: ${grid.heroCopyMax}`);
  });

  describe("CTAs animados del hero (Flujo 3)", () => {
    /*
     * ctaGradient (BrandName.tsx, desde la Task 33 -- antes heroGradient,
     * ver su docblock para el porqué del split) tiene 4 paradas:
     * semantic.text, brandText, la parada de 65% (secondary[300] en oscuro,
     * secondary[700] en claro desde la Task 33) y semantic.text de nuevo.
     * Este test SOLO cubría tema oscuro -- el hueco exacto que dejó pasar el
     * hallazgo del evaluador independiente (gate F4, 2026-08-12): la parada
     * de 65% en CLARO (antes secondary[300], L .86) daba 1.69:1 contra el
     * texto blanco del botón, muy por debajo de AA. La cobertura completa
     * (las 3 paradas distintas, en los 2 temas, calculando los extremos del
     * recorrido) vive en `BrandName.contrast.test.ts`, describe "Task 33" --
     * este test se queda como red de regresión del caso oscuro que ya tenía.
     */
    it("el label del CTA primario (onBrand) pasa AA contra las dos paradas mas oscuras del degradado (tema oscuro)", () => {
      expect(
        contrastRatio(semanticDark.onBrand, semanticDark.brandText),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(semanticDark.onBrand, color.secondary[300]),
      ).toBeGreaterThanOrEqual(4.5);
    });

    /*
     * Task 33: candado por RENDER (no solo por token) atado al código real
     * de `Hero.tsx` -- si `ScCtaPrimary` alguna vez revirtiera a
     * `heroGradient` (o a cualquier otro color suelto) en la parada de 65%,
     * este test lo detectaría leyendo el CSS INYECTADO de verdad, no una
     * copia recalculada a mano. `reglasDe` (no `getComputedStyle`): el
     * degradado vive bajo `@media (prefers-reduced-motion: no-preference)`,
     * que jsdom no evalúa (regla 5.2 del CLAUDE.md del repo) -- solo el
     * TEXTO de la regla inyectada es inspeccionable.
     */
    it("Task 33: el degradado renderizado del CTA primario en tema CLARO pasa AA en sus 3 paradas distintas", () => {
      renderHero(); // por defecto: claro (sin localStorage)
      const acciones = screen.getByTestId("hero-actions");
      const enlace = acciones.querySelector("a") as HTMLElement;
      const css = reglasDe(enlace).join("\n");

      // Se aisla la declaracion `background-image: linear-gradient(...);`
      // en vez de acotar por @media (que aparece dos veces en este
      // elemento: el propio de ctaGlow, sin colores, y el del degradado) --
      // asi la extraccion de oklch() no depende de en que orden el CSSOM
      // haya insertado cada regla, solo de que la declaracion exista.
      const declaracionesDeGradiente =
        css.match(/background-image:\s*linear-gradient\([^;]*\);/g) ?? [];
      expect(
        declaracionesDeGradiente.length,
        "no se encontro ninguna declaracion background-image: linear-gradient(...)",
      ).toBeGreaterThan(0);

      const paradas = Array.from(
        new Set(
          declaracionesDeGradiente.flatMap(
            (decl) => decl.match(/oklch\([^)]*\)/g) ?? [],
          ),
        ),
      );
      expect(
        paradas.length,
        "se esperaban 3 colores de parada distintos (semantic.text, semantic.brandText, ctaGradientMidStop)",
      ).toBe(3);

      paradas.forEach((parada) => {
        const ratio = contrastRatio(semanticLight.onBrand, parada);
        expect(
          ratio,
          `parada ${parada} da ${ratio.toFixed(3)}:1 contra onBrand, por debajo de AA (4.5:1)`,
        ).toBeGreaterThanOrEqual(4.5);
      });

      // Sonda de no-vacuidad: secondary[300] (la parada VIEJA) NO puede
      // aparecer entre las paradas renderizadas en tema claro -- si
      // apareciera, seria la prueba de que ctaGradient revirtio a
      // heroGradient sin que el resto del test lo hubiera detectado ya.
      expect(paradas).not.toContain(color.secondary[300]);
    });

    /*
     * Task 19 (motion core, punto 7 del brief -- gate F2: AMBIENT con cero
     * consumidores): gradientShift pasa de un literal escrito a mano
     * (9000ms) a `${AMBIENT.floatMs}ms` (@/motion/vocabulary) -- mismo valor
     * numerico resultante, asi que el CSS renderizado no distingue
     * "literal" de "token" por texto; lo que SI prueba que es el token es
     * que Hero.tsx importa y usa AMBIENT.floatMs de verdad
     * (src/test/vocabulary-consumers.test.ts). Validado con el bug inyectado
     * a proposito (ver informe de la tarea): cambiando temporalmente
     * AMBIENT.floatMs a 9999 en vocabulary.ts, este test se puso en rojo;
     * restaurado, volvio a verde. BrandName.tsx/Contact.tsx tienen su propio
     * candado equivalente sobre este mismo gradientShift.
     */
    it("Task 19: el degradado animado del CTA primario renderiza AMBIENT.floatMs (9000ms)", () => {
      renderHero();
      const acciones = screen.getByTestId("hero-actions");
      const enlace = acciones.querySelector("a") as HTMLElement;
      const css = reglasDe(enlace).join("\n");

      expect(css).toContain("prefers-reduced-motion: no-preference");
      expect(css).toContain(`${AMBIENT.floatMs}ms linear infinite alternate`);
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
        // Sin `intent` explícito: `primary` es el valor por defecto de
        // `Button` y era lo único que este control necesitaba. La prop se
        // retira de aquí en la crítica externa #10 (2026-08-18), donde el
        // union se recortó a `primary`/`neutral`: escribir el propio valor
        // por defecto hacía pasar por call site de producción algo que solo
        // era ruido de test.
        const { container } = renderWithProviders(
          <Button variant={variant}>Boton de control</Button>,
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

  /*
   * Despoja comentarios ANTES de buscar. Dos motivos, los dos ya pagados por
   * el repo (task/lessons.md, 2026-08-11): que una cita en prosa de un
   * docblock no gane la búsqueda por aparecer antes que el código real, y
   * sobre todo que una línea COMENTADA no pueda pasar por línea activa -- un
   * `toContain` sobre fuente cruda se queda en VERDE si el candado se
   * desactiva con `//`, que es exactamente el bug inyectado con el que se
   * valida este bloque.
   */
  function despojarComentarios(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  /*
   * Extrae un bloque CSS del FUENTE contando llaves, en vez de con una clase
   * negada (`[^}]*`, la forma que tenía este candado hasta la crítica externa
   * #10). Desde que `--hero-copy-maxwidth-lg` lee un token, el bloque contiene
   * una interpolación y la primera `}` del fichero deja de ser su final: con
   * la forma anterior el candado habría medido un bloque truncado, dando por
   * ausentes variables que sí están. Contar llaves lo REFUERZA en vez de
   * relajarlo -- antes bastaba con que las cinco variables aparecieran antes
   * de la primera `}`; ahora tienen que aparecer dentro del bloque real.
   */
  function bloqueDe(source: string, apertura: string): string | undefined {
    const inicio = source.indexOf(apertura);
    if (inicio === -1) return undefined;
    let profundidad = 0;
    for (let i = inicio + apertura.length - 1; i < source.length; i += 1) {
      if (source[i] === "{") profundidad += 1;
      else if (source[i] === "}") {
        profundidad -= 1;
        if (profundidad === 0) return source.slice(inicio, i + 1);
      }
    }
    return undefined;
  }

  it("ScHeroBrand declara el fallback CLARO (7vw): sin JS, el resultado es identico al de antes de Task 9", async () => {
    const source = await leerFuente("Hero.tsx");
    expect(source).toContain("var(--hero-title-vw, 7vw)");
  });

  /*
   * Crítica externa #10 (2026-08-18), hallazgo C. `Hero.tsx` escribía a mano
   * el tope de la columna de copia en CUATRO declaraciones (`ScCopy` en su
   * forma centrada y dentro del `min(..., 70%)` de escritorio, `ScTagline` y
   * `ScSubtitle`) mientras el sistema ya tenía dónde nombrarlo. Este es el
   * único candado que puede probar la migración: el CSS RENDERIZADO es
   * idéntico antes y después (el token resuelve al mismo valor), así que la
   * propiedad "el número vive en el token, no en el componente" solo se
   * observa en la FUENTE (task/lessons.md, 2026-08-12, Task 19).
   *
   * El recuento es cerrado a propósito (regla 39/40): si mañana alguien añade
   * una quinta medida al hero, o devuelve una al literal, este número deja de
   * cuadrar y hay que decidirlo a mano, no dejarlo pasar.
   */
  it("crítica #10: Hero.tsx ya no escribe el tope de columna a mano -- las cuatro medidas leen grid.heroCopyMax", async () => {
    const source = despojarComentarios(await leerFuente("Hero.tsx"));
    expect(source).not.toContain("70ch");
    expect(source.match(/theme\.data\.grid\.heroCopyMax/g)?.length ?? 0).toBe(
      4,
    );
  });

  it('GlobalStyles.tsx redefine --hero-title-vw a 8vw SOLO bajo :root[data-theme="dark"]', async () => {
    const source = despojarComentarios(
      await leerFuente("..", "..", "..", "theme", "GlobalStyles.tsx"),
    );
    const bloque = bloqueDe(source, ':root[data-theme="dark"] {');
    expect(
      bloque,
      'no se encontro el bloque :root[data-theme="dark"]',
    ).not.toBeUndefined();
    expect(bloque).toContain("--hero-title-vw: 8vw");
    expect(bloque).toContain("--hero-align-items-lg: center");
    expect(bloque).toContain("--hero-justify-lg: flex-end");
    expect(bloque).toContain("--hero-text-align-lg: center");
    // El override oscuro pasa a leer el token (crítica externa #10): lo que se
    // afirma aquí es el CONSUMO, no el literal, porque el literal ya no vive
    // en este fichero. Su valor lo fija `system.test.ts` -- los dos candados
    // juntos siguen cerrando la misma propiedad de antes (que el fallback
    // claro de Hero.tsx y el override oscuro no queden huérfanos entre sí).
    expect(bloque).toContain("--hero-copy-maxwidth-lg: ${grid.heroCopyMax}");
    expect(bloque).toContain("--hero-actions-justify-lg: center");
  });
});

/*
 * Velo de contraste de la copia del hero (D1, decision del dueno
 * 2026-09-02). El velo es una propiedad puramente de PINTADO: jsdom no
 * pinta, no hace layout y no compone alfa, asi que estos candados solo
 * pueden aseverar lo que es verificable sin motor de render -- que la regla
 * existe, que cuelga del `::before` del bloque de copia, que su color sale
 * del token de fondo del TEMA (dos valores distintos, uno por rama: un
 * literal escrito a mano no podria satisfacer las dos aserciones a la vez) y
 * que no anima nada. La medida real (p05 del h1 >= 3:1 y p05 del parrafo >=
 * 4,5:1 en los dos temas) es de navegador y queda declarada como pendiente
 * de un humano, regla 47.
 */
describe("Hero: velo de contraste de la copia (D1, 2026-09-02)", () => {
  /* Reglas de estilo (el OBJETO, no su texto) cuyo selector menciona alguna
     de las clases del elemento: la FORMA de un selector solo se puede
     aseverar sobre `selectorText` (regla 35). */
  function reglasConSelectorDe(el: HTMLElement): CSSStyleRule[] {
    const clases = Array.from(el.classList);
    const out: CSSStyleRule[] = [];
    const walk = (rules: CSSRuleList): void => {
      Array.from(rules).forEach((rule) => {
        const selector = (rule as CSSStyleRule).selectorText;
        if (
          selector !== undefined &&
          clases.some((cls) => selector.includes(`.${cls}`))
        ) {
          out.push(rule as CSSStyleRule);
        }
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

  /** Las reglas `::before` del bloque de copia: la del velo y su guard de
   *  forced-colors, que comparten selector y solo se distinguen por lo que
   *  declaran (el guard vive dentro de un @media anidado). */
  function reglasDelVelo(): {
    base: CSSStyleRule;
    forcedColors: CSSStyleRule | undefined;
  } {
    const copia = screen.getByTestId("hero-copy");
    const before = reglasConSelectorDe(copia).filter((regla) =>
      regla.selectorText.endsWith("::before"),
    );
    const base = before.filter((r) => r.cssText.includes("radial-gradient"));
    expect(
      base,
      "se esperaba exactamente una regla ::before con el degradado del velo",
    ).toHaveLength(1);
    return {
      base: base[0],
      forcedColors: before.find((r) =>
        sinEspacios(r.cssText).includes("display:none"),
      ),
    };
  }

  it.each([
    ["claro", null, semanticLight.bg],
    ["oscuro", "dark", semanticDark.bg],
  ] as const)(
    "en tema %s el velo cuelga del ::before de la copia y tine con el semantic.bg de ESA rama",
    (_nombre, storage, fondo) => {
      if (storage) window.localStorage.setItem("vti-theme", storage);
      renderHero();
      const regla = reglasDelVelo().base;

      // Cuelga del contenedor de la copia, no de un hijo ni del hero.
      const copia = screen.getByTestId("hero-copy");
      expect(
        Array.from(copia.classList).some((cls) =>
          regla.selectorText.includes(`.${cls}`),
        ),
      ).toBe(true);

      // El color sale del token de fondo del tema, con alfa por color-mix:
      // el mismo fichero renderiza DOS valores distintos segun la rama, que
      // es justo lo que un literal escrito a mano no puede hacer.
      const css = sinEspacios(regla.cssText);
      expect(css).toContain("radial-gradient");
      expect(css).toContain(sinEspacios(fondo));
      expect(css).toContain("color-mix(inoklch");
      // Y NO el fondo de la rama contraria.
      const contrario = storage ? semanticLight.bg : semanticDark.bg;
      expect(css).not.toContain(sinEspacios(contrario));
    },
  );

  it("el velo es estatico, no captura el puntero y se retira bajo forced-colors", () => {
    renderHero();
    const { base, forcedColors } = reglasDelVelo();
    const css = sinEspacios(base.cssText);

    // Estatico a proposito (ver el docblock de HERO_SCRIM_ALPHA): hereda el
    // fundido de $hidden de su contenedor y no declara canal propio.
    expect(css).not.toContain("transition");
    expect(css).not.toContain("animation");
    // Ni "transition: all" ni ninguna propiedad de layout animada.
    expect(css).not.toContain("transition:all");
    expect(css).toContain("pointer-events:none");
    // Detras del texto, dentro del contexto de apilamiento de ScCopy.
    expect(css).toContain("z-index:-1");

    // El guard de forced-colors comparte selector con el velo y vive dentro
    // de su propio @media anidado: jsdom no lo evalua (regla 36), asi que se
    // comprueba que la regla existe y a que @media pertenece.
    expect(
      forcedColors,
      "falta el guard de forced-colors del velo",
    ).toBeDefined();
    expect((forcedColors as CSSStyleRule).parentRule?.cssText ?? "").toContain(
      "forced-colors: active",
    );
  });
});
