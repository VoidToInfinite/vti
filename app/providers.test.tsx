import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

/*
 * `StageProvider` (dentro de `Providers`) lee `window.matchMedia` en un
 * efecto de montaje; jsdom no lo implementa. Mismo stub mínimo que
 * StageProvider.test.tsx/Hero.test.tsx.
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

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/*
 * `Providers` es el ÚNICO sitio real del repo que monta `SkipLink`/
 * `BackToTop` (Task 2): ninguno de los tests de `SkipLink.tsx`/
 * `BackToTop.tsx` por separado prueba que están conectados al árbol real de
 * proveedores en la posición correcta. Este archivo cubre justo ese hueco,
 * sin duplicar `renderWithProviders` (que envolvería el árbol en un SEGUNDO
 * juego de ThemeProvider/I18nextProvider): `Providers` ya trae los suyos.
 */
describe("Providers", () => {
  it("SkipLink precede a los children en orden de documento (brief Task 2, punto 3: 'orden')", () => {
    render(
      <Providers>
        <main
          id="main"
          tabIndex={-1}
        >
          <button>contenido</button>
        </main>
      </Providers>,
    );

    const skipLink = screen.getByRole("link", {
      name: "Saltar al contenido",
    });
    const contenido = screen.getByRole("button", { name: "contenido" });

    expect(skipLink).toHaveAttribute("href", "#main");
    expect(
      skipLink.compareDocumentPosition(contenido) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("monta sin errores junto a contenido real, y BackToTop no aparece sin scroll", () => {
    render(
      <Providers>
        <main
          id="main"
          tabIndex={-1}
        >
          <p>Contenido de la página</p>
        </main>
      </Providers>,
    );

    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
