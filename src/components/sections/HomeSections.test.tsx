import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { HomeSections } from "./HomeSections";

/*
 * Gate por tema (D3): claro monta las 4 secciones en orden; oscuro no monta
 * ninguna. Las 4 secciones usan `useReveal` (IntersectionObserver) --
 * mismo stub minimo que Story.test.tsx/Features.test.tsx/etc.
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

function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("HomeSections", () => {
  it("en tema claro (por defecto, sin nada guardado) monta las 4 secciones, en orden story/journey/features/contact", () => {
    const { container } = renderWithProviders(<HomeSections />);

    const ids = Array.from(container.querySelectorAll("section")).map(
      (el) => el.id,
    );
    expect(ids).toEqual(["story", "journey", "features", "contact"]);
  });

  it("en tema claro, el titulo real de Story esta presente (region con nombre accesible)", () => {
    renderWithProviders(<HomeSections />);

    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.story.titleLead) &&
        accessibleName.includes(esHome.Home.story.titleAccent),
    });
    expect(region).toHaveAttribute("id", "story");
  });

  it("en tema oscuro (guardado en localStorage), tras la correccion de hidratacion no queda ninguna de las 4 regiones montada", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      expect(container.querySelector("section")).toBeNull();
    });

    for (const id of ["story", "journey", "features", "contact"]) {
      expect(container.querySelector(`#${id}`)).toBeNull();
    }
  });
});
