import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Hero } from "./Hero";

/**
 * Mismo stub minimo de `matchMedia` que `Eye.test.tsx`: `Hero` ahora monta
 * `<Eye />`, que consume `usePointer()`, y ese hook llama a
 * `window.matchMedia` de verdad al montar. jsdom no lo implementa, asi que
 * sin este stub cualquier render de `<Hero />` lanza "matchMedia is not a
 * function".
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

  it("el contenido es legible sin el ojo: la copia vive en el DOM", () => {
    renderWithProviders(<Hero />);
    // getAllByText (no getByText): tanto Home.description como
    // Home.additionalDescription (copia real, sin tocar en esta task)
    // contienen la palabra "presente"/"present", asi que hay DOS parrafos
    // que matchean el patron. getByText exige un match unico y lanzaria
    // "multiple elements found" -- no es un bug del Hero, es que el patron
    // del test es mas amplio que el vocabulario real. Se conserva el
    // proposito original (la copia vive en el DOM, legible sin JS) con una
    // consulta que tolera los dos parrafos legitimos.
    const matches = screen.getAllByText(/presente|present/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("mantiene una sola h1 en la seccion", () => {
    const { container } = renderWithProviders(<Hero />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });
});
