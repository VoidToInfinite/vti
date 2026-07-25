import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { links } from "@/config/links";
import { type as typeTokens } from "@/theme/tokens/type";
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

describe("Hero", () => {
  it("muestra la marca VoidToInfinite", () => {
    renderWithProviders(<Hero />);
    expect(screen.getByText(/VoidToInfinite/i)).toBeInTheDocument();
  });

  it("expone el CTA primario hacia el playground (north-star)", () => {
    renderWithProviders(<Hero />);
    const cta = screen.getByRole("link", {
      name: /componentes|components/i,
    });
    expect(cta).toHaveAttribute("href");
  });

  /*
   * Sustituye al test que buscaba /presente|present/ en la copia. Aquel
   * comentario describia claves (Home.description, Home.additionalDescription)
   * que ya no existen, y su asercion -- "al menos un nodo contiene la palabra
   * presente" -- pasaba igual con la copia hardcodeada en el JSX. Este test es
   * estrictamente mas fuerte: compara los tres textos contra los strings
   * IMPORTADOS del locale, asi que falla si alguien deja de pasar por i18n o
   * cambia el JSON sin querer.
   */
  it("los tres textos del bloque salen de i18n, no de literales en el JSX", () => {
    const { container } = renderWithProviders(<Hero />);
    expect(testId(container, "hero-kicker")).toHaveTextContent(
      esHome.Home.hero.kicker,
    );
    expect(testId(container, "hero-subtitle")).toHaveTextContent(
      esHome.Home.hero.subtitle,
    );
    expect(testId(container, "hero-support")).toHaveTextContent(
      esHome.Home.hero.support,
    );
  });

  it("mantiene UN solo encabezado en la seccion, y es el h1 de la marca", () => {
    const { container } = renderWithProviders(<Hero />);
    const headings = container.querySelectorAll("h1,h2,h3,h4,h5,h6");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent(/VoidToInfinite/i);
  });

  it("kicker es SPAN y subtitulo y apoyo son P: ninguno usurpa un encabezado", () => {
    const { container } = renderWithProviders(<Hero />);
    expect(testId(container, "hero-kicker").tagName).toBe("SPAN");
    expect(testId(container, "hero-subtitle").tagName).toBe("P");
    expect(testId(container, "hero-support").tagName).toBe("P");
  });

  it("el orden del DOM es kicker, titulo, subtitulo, apoyo, acciones", () => {
    const { container } = renderWithProviders(<Hero />);
    const orden = [
      "hero-kicker",
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
   * jsdom + styled-components v6 resuelven las reglas via window.getComputedStyle
   * devolviendo los valores TAL COMO SE ESCRIBEN (medido en este repo:
   * fontSize -> "0.6875rem", letterSpacing -> "0.18em"). Por eso se compara
   * contra el token importado y no contra pixeles: jsdom no resuelve rem, clamp
   * ni min.
   */
  it("el kicker computa la escala overline en caja alta", () => {
    const { container } = renderWithProviders(<Hero />);
    const estilo = getComputedStyle(testId(container, "hero-kicker"));
    expect(estilo.fontSize).toBe(typeTokens.scale.overline.size);
    expect(estilo.letterSpacing).toBe(typeTokens.scale.overline.tracking);
    expect(estilo.textTransform).toBe("uppercase");
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
    const { container } = renderWithProviders(<Hero />);
    const sub = getComputedStyle(testId(container, "hero-subtitle"));
    const apoyo = getComputedStyle(testId(container, "hero-support"));

    // Cada uno computa SU tier de la escala, no el del otro.
    expect(sub.fontSize).toBe(typeTokens.scale.h3.size);
    expect(sub.fontWeight).toBe(String(typeTokens.scale.h3.weight));
    expect(apoyo.fontSize).toBe(typeTokens.scale.body.size);
    expect(apoyo.fontWeight).toBe(String(typeTokens.scale.body.weight));

    const distintas = (
      ["fontSize", "fontWeight", "letterSpacing"] as const
    ).filter((prop) => sub[prop] !== apoyo[prop]);
    expect(distintas.length).toBeGreaterThanOrEqual(2);
  });

  /*
   * CANDADO RF-6. Se asevera sobre animationDelay y NUNCA sobre animationName:
   * jsdom no expande la shorthand animation:, asi que animationName sale vacio
   * (medido). El primer hijo no declara delay -- entra a 0ms -- por eso la
   * tabla empieza en el segundo.
   */
  it("los cinco hijos del bloque entran escalonados con paso de 80ms", () => {
    const { container } = renderWithProviders(<Hero />);
    const copia = testId(container, "hero-kicker").parentElement;
    expect(copia).not.toBeNull();
    const hijos = Array.from((copia as HTMLElement).children);
    expect(hijos).toHaveLength(5);

    const esperado = ["80ms", "160ms", "240ms", "320ms"];
    esperado.forEach((delay, i) => {
      expect(
        getComputedStyle(hijos[i + 1]).animationDelay,
        `hijo ${i + 2} deberia entrar a ${delay}`,
      ).toBe(delay);
    });
  });

  it("el pie del hero es decorativo e inerte", () => {
    const { container } = renderWithProviders(<Hero />);
    const pie = testId(container, "hero-foot");
    expect(pie).toHaveAttribute("aria-hidden", "true");
    expect(pie.textContent).toBe("");
    expect(getComputedStyle(pie).pointerEvents).toBe("none");
  });

  it("los dos CTA conservan destino, etiqueta y orden", () => {
    const { container } = renderWithProviders(<Hero />);
    const acciones = testId(container, "hero-actions");
    const enlaces = acciones.querySelectorAll("a");

    expect(enlaces).toHaveLength(2);
    expect(enlaces[0]).toHaveAttribute("href", links.playground);
    expect(enlaces[0]).toHaveTextContent(esHome.Home.cta.explore);
    expect(enlaces[1]).toHaveAttribute("href", "#story");
    expect(enlaces[1]).toHaveTextContent(esHome.Home.cta.story);
  });
});
