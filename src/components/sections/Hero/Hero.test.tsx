import { useEffect, type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { type as typeTokens } from "@/theme/tokens/type";
import { StageProvider, useStage } from "@/motion/StageProvider";
import { HERO_CHROME_OFFSET_MS } from "./hero.transition";
import { Hero } from "./Hero";

/**
 * Mismo stub minimo de `matchMedia` que `Eye.test.tsx`: `Hero` monta `<Eye />`,
 * que consume `usePointer()`, y ese hook llama a `window.matchMedia` de verdad
 * al montar. jsdom no lo implementa, asi que sin este stub cualquier render de
 * `<Hero />` lanza "matchMedia is not a function".
 */
function stubMatchMedia(fineMatches = false, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => stubMatchMedia());
afterEach(() => vi.unstubAllGlobals());

/**
 * `Hero` consume `useStage()` (tarea C5): sin un `StageProvider` en el
 * arbol, el hook lanza. `renderWithProviders` (test-utils.tsx) es un helper
 * COMPARTIDO con otros flujos y no se toca (CLAUDE.md §9): se envuelve aqui,
 * localmente, igual que en Navbar.test.tsx.
 */
function renderHero(): RenderResult {
  return renderWithProviders(
    <StageProvider>
      <Hero />
    </StageProvider>,
  );
}

/**
 * Fuerza la fase de pagina a "chrome" (spec §7.4, tarea C6): monta una sonda
 * que llama a `markBackdropRevealed()` en su primer efecto -- el mismo
 * gancho que en produccion usa `HeroBackdrop` -- y avanza el reloj falso
 * exactamente `HERO_CHROME_OFFSET_MS` (la CONSTANTE importada que
 * StageProvider usa para programar la transicion). Requiere
 * `vi.useFakeTimers()` activo en el test que la llama.
 */
function RevealBackdrop(): ReactElement | null {
  const { markBackdropRevealed } = useStage();
  useEffect(() => {
    markBackdropRevealed();
  }, [markBackdropRevealed]);
  return null;
}

function renderHeroInChrome(): RenderResult {
  const result = renderWithProviders(
    <StageProvider>
      <RevealBackdrop />
      <Hero />
    </StageProvider>,
  );
  act(() => {
    vi.advanceTimersByTime(HERO_CHROME_OFFSET_MS);
  });
  return result;
}

/** Devuelve el elemento marcado con ese gancho de test o falla el test. */
function testId(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  expect(el, `falta [data-testid="${id}"]`).not.toBeNull();
  return el as HTMLElement;
}

/** `true` si `a` precede a `b` en el orden del documento. */
function precede(a: Element, b: Element): boolean {
  return Boolean(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

/** Texto CSS de todas las reglas inyectadas por styled-components, planas
 *  (incluidas las anidadas dentro de @media): mismo patron que Eye.test.tsx
 *  para leer el bloque de prefers-reduced-motion. */
function allCssRules(): string[] {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
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
  return reglas;
}

describe("Hero", () => {
  it("muestra la marca VoidToInfinite", () => {
    // getByText(/VoidToInfinite/i) dejo de encontrar el nodo cuando BrandName
    // se partio en dos <span> ("Void"/"ToInfinite", ver BrandName.tsx): el
    // matcher por defecto de Testing Library solo concatena los nodos de
    // texto DIRECTOS de un elemento (no recorre descendientes), asi que ni
    // el <h1> (sin texto directo, solo dos <span> hijos) ni ningun <span>
    // individual (cada uno con solo media palabra) igualaban el regex
    // completo. toHaveTextContent SI usa el textContent recursivo -- mismo
    // patron que ya usa el test de mas abajo ("mantiene UN solo
    // encabezado...") para el mismo <h1>.
    renderHero();
    expect(screen.getByRole("heading")).toHaveTextContent(/VoidToInfinite/i);
  });

  /*
   * D6 (spec 2026-08-04): `useThemeScrollReset` busca `document.getElementById
   * ("hero")` para decidir si el usuario esta en la "zona del hero" antes de
   * cambiar de tema. Sin este id la deteccion degrada silenciosamente a la
   * regla de `scrollY` (ver el hook), que en una pagina con hero real seria
   * incorrecta -- por eso este candado vive en el propio Hero, no solo en el
   * test del hook que consume el id.
   */
  it("la seccion raiz tiene id='hero'", () => {
    const { container } = renderHero();
    const seccion = container.querySelector("section");
    expect(seccion).not.toBeNull();
    expect(seccion).toHaveAttribute("id", "hero");
  });

  /*
   * El CTA primario YA NO apunta al playground (encargo 2026-08-08): el
   * enlace "Explorar los componentes" desaparece del hero y "Leer la
   * historia" pasa a ser la accion principal, con destino interno #story.
   */
  it("expone el CTA primario hacia la seccion Story", () => {
    renderHero();
    const cta = screen.getByRole("link", {
      name: /historia|story/i,
    });
    expect(cta).toHaveAttribute("href", "#story");
  });

  /*
   * Sustituye al test que buscaba /presente|present/ en la copia. Aquel
   * comentario describia claves (Home.description, Home.additionalDescription)
   * que ya no existen, y su asercion -- "al menos un nodo contiene la palabra
   * presente" -- pasaba igual con la copia hardcodeada en el JSX. Este test es
   * estrictamente mas fuerte: compara los dos textos contra los strings
   * IMPORTADOS del locale, asi que falla si alguien deja de pasar por i18n o
   * cambia el JSON sin querer.
   *
   * El kicker (Home.hero.kicker) salio de esta lista: el usuario retiro el
   * <ScKicker> del JSX de Hero.tsx (ya no se monta), asi que ya no hay nodo
   * que comparar. La clave sigue existiendo en el JSON -- locales.test.ts la
   * usa para su paridad es/en -- por si se recupera el kicker mas adelante.
   */
  it("los dos textos del bloque salen de i18n, no de literales en el JSX", () => {
    const { container } = renderHero();
    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      esHome.Home.hero.subtitle,
    );
    expect(testId(container, "hero-support")).toHaveTextContent(
      esHome.Home.hero.support,
    );
  });

  it("mantiene UN solo encabezado en la seccion, y es el h1 de la marca", () => {
    const { container } = renderHero();
    const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent(/VoidToInfinite/i);
  });

  it("subtitulo y apoyo son P: ninguno usurpa un encabezado", () => {
    const { container } = renderHero();
    expect(testId(container, "hero-subtitle").tagName).toBe("P");
    expect(testId(container, "hero-support").tagName).toBe("P");
  });

  it("el orden del DOM es titulo, subtitulo, apoyo, acciones", () => {
    const { container } = renderHero();
    const orden = [
      "hero-title",
      "hero-subtitle",
      "hero-support",
      "hero-actions",
    ].map((id) => testId(container, id));

    for (let i = 0; i < orden.length - 1; i += 1) {
      expect(
        precede(orden[i], orden[i + 1]),
        `${orden[i].dataset.testid} deberia preceder a ${orden[i + 1].dataset.testid}`,
      ).toBe(true);
    }
  });

  /*
   * Este test es ademas el candado del bug que cazo en esta entrega: con
   * as="p" (en vez de forwardedAs="p") styled-components consume el prop y
   * renderiza un <p> pelado, descartando el componente envuelto -- el
   * subtitulo salia sin NINGUNA regla de Typography (font-size vacio, color
   * canvastext). Aseverar el tier completo, y no solo "son distintos", es lo
   * que lo detecta.
   */
  it("subtitulo y apoyo se diferencian en al menos dos propiedades tipograficas", () => {
    const { container } = renderHero();
    const sub = getComputedStyle(testId(container, "hero-subtitle"));
    const apoyo = getComputedStyle(testId(container, "hero-support"));

    // Cada uno computa SU tier de la escala, no el del otro. El subtitulo ya
    // no consume typeTokens.scale.h3.size: ScSubtitle sobrescribe font-size
    // con el clamp(15px, 2vw, 22px) literal del usuario (ver excepcion
    // documentada en Hero.tsx), pero SIGUE computando el peso de h3 --
    // font-weight no se toco.
    expect(sub.fontSize).toBe("clamp(15px, 2vw, 22px)");
    expect(sub.fontWeight).toBe(String(typeTokens.scale.h3.weight));
    expect(apoyo.fontSize).toBe(typeTokens.scale.body.size);
    expect(apoyo.fontWeight).toBe(String(typeTokens.scale.body.weight));

    const distintas = (
      ["fontSize", "fontWeight", "letterSpacing"] as const
    ).filter((prop) => sub[prop] !== apoyo[prop]);
    expect(distintas.length).toBeGreaterThanOrEqual(2);
  });

  /*
   * Tarea C5/C6 (spec §7.4): mientras la fase de pagina siga en "backdrop",
   * el intro de la copia NO ha arrancado -- los cuatro hijos quedan a
   * opacity 0 por regla ESTATICA (`&[data-intro="pending"] > *`), sin
   * ninguna animacion en marcha. Sin este test, un `data-intro="in"` por
   * defecto (en vez de derivarlo de `useStage().phase`) pasaria
   * desapercibido: el test de mas abajo, que fuerza la fase a "chrome",
   * seguiria en verde igual.
   */
  it("la copia no anima en la fase 'backdrop': los cuatro hijos quedan en opacity 0", () => {
    const { container } = renderHero();
    // Se llega al contenedor (ScCopy) por el parentElement del titulo, el
    // primer hijo que sigue existiendo tras retirarse el kicker: sigue
    // siendo el mismo elemento que antes, solo cambia el gancho para
    // alcanzarlo.
    const copia = testId(container, "hero-title").parentElement;
    expect(copia).not.toBeNull();
    expect(copia).toHaveAttribute("data-intro", "pending");

    const hijos = Array.from((copia as HTMLElement).children);
    expect(hijos).toHaveLength(4);
    hijos.forEach((hijo, i) => {
      expect(
        getComputedStyle(hijo).opacity,
        `hijo ${i + 1} deberia estar en opacity 0 en fase backdrop`,
      ).toBe("0");
    });
  });

  /*
   * CANDADO RF-6. Se asevera sobre animationDelay y NUNCA sobre animationName:
   * jsdom no expande la shorthand animation:, asi que animationName sale vacio
   * (medido). El primer hijo no declara delay -- entra a 0ms -- por eso la
   * tabla empieza en el segundo.
   *
   * Se monta en fase "chrome" (tarea C6: el intro ya no arranca en el
   * montaje, ver el test de arriba) forzando `markBackdropRevealed()` y
   * avanzando el reloj falso `HERO_CHROME_OFFSET_MS` -- la aserción exacta
   * de los tres retardos, contra los mismos literales de siempre (que a su
   * vez son los que declara Hero.tsx), NO cambia: el escalonado interno de
   * 80ms sigue siendo el mismo, solo cambia CUANDO arranca. Con el kicker
   * fuera, el retardo de 320ms (nth-child(5)) ya no tiene hijo que lo
   * reciba -- la tabla se queda en tres pares en vez de cuatro.
   */
  it("los cuatro hijos del bloque entran escalonados con paso de 80ms", () => {
    vi.useFakeTimers();
    try {
      const { container } = renderHeroInChrome();
      const copia = testId(container, "hero-title").parentElement;
      expect(copia).not.toBeNull();
      expect(copia).toHaveAttribute("data-intro", "in");
      const hijos = Array.from((copia as HTMLElement).children);
      expect(hijos).toHaveLength(4);

      const esperado = ["80ms", "160ms", "240ms"];
      esperado.forEach((delay, i) => {
        expect(
          getComputedStyle(hijos[i + 1]).animationDelay,
          `hijo ${i + 2} deberia entrar a ${delay}`,
        ).toBe(delay);
      });
    } finally {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
    }
  });

  it("existe el bloque prefers-reduced-motion: reduce que fuerza la copia visible de inmediato en los dos estados de data-intro", () => {
    renderHero();
    const reglas = allCssRules();

    const bloqueReduce = reglas.filter(
      (regla) =>
        regla.includes("@media (prefers-reduced-motion: reduce)") &&
        regla.includes('[data-intro="pending"]') &&
        regla.includes("opacity: 1") &&
        regla.includes("animation: none"),
    );
    expect(bloqueReduce.length).toBeGreaterThan(0);
  });

  it("el pie del hero es decorativo e inerte", () => {
    const { container } = renderHero();
    const pie = testId(container, "hero-foot");
    expect(pie).toHaveAttribute("aria-hidden", "true");
    expect(pie.textContent).toBe("");
    expect(getComputedStyle(pie).pointerEvents).toBe("none");
  });

  it("el unico CTA conserva destino y etiqueta", () => {
    const { container } = renderHero();
    const acciones = testId(container, "hero-actions");
    const enlaces = acciones.querySelectorAll("a");

    // UNO, no dos: el CTA al playground se retiro con el encargo del
    // 2026-08-08 -- si alguien lo reintroduce sin decidirlo, este numero lo
    // delata.
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute("href", "#story");
    expect(enlaces[0]).toHaveTextContent(esHome.Home.cta.story);
  });
});
