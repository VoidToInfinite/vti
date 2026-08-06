import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { HomeSections } from "./HomeSections";

/*
 * Las 4 secciones (spec 2026-07-30) ya tienen tratamiento propio para los
 * dos temas -- este componente ya no bifurca por tema (era un gate
 * incremental mientras se construian una a una, ver el docblock de
 * HomeSections.tsx): siempre monta las 4, en orden. Cada una resuelve su
 * propia rama claro/oscuro internamente. Las 4 usan `useReveal`
 * (IntersectionObserver) -- mismo stub minimo que Story.test.tsx/etc.
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
  /*
   * En CLARO son CINCO secciones desde el 2026-08-06, no cuatro: `Story`
   * emite ademas `#statement`, la nota de cierre promovida a pantalla
   * completa (spec `2026-08-06-story-features-tema-claro-design.md`, D12).
   * Va entre `#story` y `#journey`, exactamente donde la coloca el mockup
   * `Landing v2.dc`.
   *
   * El orden se sigue aseverando ENTERO, no relajado a "contiene": es la
   * unica propiedad que este test protege, y una lista parcial dejaria pasar
   * que una seccion se colara en medio de otras dos. La rama OSCURA sigue
   * montando cuatro -- el statement es exclusivo de la clara -- y su propio
   * test, mas abajo, es el complementario que lo demuestra.
   */
  it("en tema claro (por defecto, sin nada guardado) monta las 5 secciones, en orden story/statement/journey/features/contact", () => {
    const { container } = renderWithProviders(<HomeSections />);

    const ids = Array.from(container.querySelectorAll("section")).map(
      (el) => el.id,
    );
    expect(ids).toEqual([
      "story",
      "statement",
      "journey",
      "features",
      "contact",
    ]);
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

  it("en tema oscuro (guardado en localStorage), tras la correccion de hidratacion sigue montando las 4 secciones, en el mismo orden", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      const ids = Array.from(container.querySelectorAll("section")).map(
        (el) => el.id,
      );
      expect(ids).toEqual(["story", "journey", "features", "contact"]);
    });
  });
});
