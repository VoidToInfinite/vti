import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SITE, routePath } from "@/config/site";
import enCommon from "@/i18n/locales/en/common.json";
import esCommon from "@/i18n/locales/es/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { LocaleShell } from "../../providers";
import EnNotFoundPage, { metadata } from "./page";

/*
 * Candados de la 404 inglesa horneada (`app/en/404/page.tsx`, P2 de la crítica
 * externa #21). El envoltorio `LocaleShell locale="en"` reproduce lo que hace
 * `app/en/layout.tsx` —mismo patrón que `app/en/en-routes.test.tsx`—, que es
 * de donde esta página saca el idioma, la cabecera y el pie.
 *
 * Lo que se ata: que la copia sea la INGLESA (no la castellana de la 404
 * global), que la salida lleve a la portada inglesa y que la metadata no la
 * convierta en una página indexable ni canonicalizable.
 *
 * Lo que NO se ata aquí, a propósito: la cabecera y el pie. No los pinta esta
 * página sino `LocaleShell` (en producción, `app/en/layout.tsx`; en este test,
 * el envoltorio de `renderEnNotFound`), así que un caso que buscara `banner` y
 * `contentinfo` seguiría en verde aunque la página no renderizase nada.
 */
/*
 * Los mismos dobles que `app/not-found.test.tsx`, por el mismo motivo: el árbol
 * de `Navbar` consulta `matchMedia` al montar y `Footer` monta `SectionBeam`,
 * que usa `useReveal` y con él `IntersectionObserver`. jsdom no trae ninguno.
 */
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderEnNotFound(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <LocaleShell locale="en">
      <EnNotFoundPage />
    </LocaleShell>,
  );
}

describe("la 404 inglesa horneada", () => {
  it("pinta el titular y el mensaje ingleses, no los castellanos", () => {
    renderEnNotFound();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      enCommon.notFound.title,
    );
    expect(screen.getByText(enCommon.notFound.message)).toBeInTheDocument();
    expect(screen.queryByText(esCommon.notFound.title)).toBeNull();
  });

  it("la salida «Back to home» lleva a la portada INGLESA", () => {
    const { container } = renderEnNotFound();
    const salidas = Array.from(container.querySelectorAll("main a[href]")).map(
      (a) => a.getAttribute("href"),
    );
    expect(salidas).toContain(routePath("home", "en"));
    expect(salidas).not.toContain(routePath("home", "es"));
  });

  it("su metadata es inglesa, no indexable y sin canónica", () => {
    expect(metadata.title).toBe(
      `${enCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    expect(metadata.description).toBe(enCommon.notFound.message);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: null });
  });
});
