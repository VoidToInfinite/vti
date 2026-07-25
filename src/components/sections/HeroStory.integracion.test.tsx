import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { Hero } from "./Hero/Hero";
import { Story } from "./Story/Story";

/**
 * Huecos de cobertura detectados por la lente funcional (TC-J1-02 y TC-T3-01.3).
 *
 * `Hero.test.tsx` cuenta encabezados DENTRO del contenedor del Hero y
 * `Story.test.tsx` DENTRO del de Story: ninguno de los dos puede ver el
 * documento completo. El criterio de la entrega ("un unico h1 en la pagina y
 * orden h1 -> h2") y el ancla del CTA secundario ("#story" tiene destino real)
 * solo son aseverables montando las dos secciones juntas.
 */

/** Mismo stub minimo de `matchMedia` que `Hero.test.tsx` (usePointer lo llama). */
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

beforeEach(() => {
  stubMatchMedia();
  // Mismo stub que `Story.test.tsx`: `useReveal` observa con IntersectionObserver.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("Hero + Story (pagina)", () => {
  it("la pagina tiene UN solo h1 y es el de la marca", () => {
    const { container } = renderWithProviders(
      <>
        <Hero />
        <Story />
      </>,
    );

    const h1 = container.querySelectorAll("h1");
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(/VoidToInfinite/i);
  });

  it("el orden de encabezados es h1 (marca) y despues h2 (#story-title)", () => {
    const { container } = renderWithProviders(
      <>
        <Hero />
        <Story />
      </>,
    );

    const headings = Array.from(
      container.querySelectorAll("h1,h2,h3,h4,h5,h6"),
    );
    expect(headings.map((h) => h.tagName)).toEqual(["H1", "H2"]);
    expect(headings[1]).toHaveAttribute("id", "story-title");
    expect(
      headings[0].compareDocumentPosition(headings[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("el href del CTA secundario resuelve a un elemento real del documento", () => {
    // Si alguien renombra el id de la seccion, el CTA salta al vacio y el test
    // de cada seccion por separado sigue en verde.
    const { container } = renderWithProviders(
      <>
        <Hero />
        <Story />
      </>,
    );

    const secundario = container.querySelectorAll("a")[1];
    const href = secundario.getAttribute("href") ?? "";
    expect(href.startsWith("#")).toBe(true);
    expect(container.querySelector(href)).not.toBeNull();
  });
});
