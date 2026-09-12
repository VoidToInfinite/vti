import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { navGroupsFor, navBarWideSectionsFor } from "@/config/navigation";
import { LegalNoticeDocument } from "./LegalNoticeDocument";
import { LocaleShell } from "../../../../app/providers";

/*
 * Las dos cáscaras legales son casi idénticas, y ésa es exactamente la razón
 * de este archivo: el contrato de cabecera se comprueba a fondo sobre
 * `/privacidad` (`PrivacyDocument.test.tsx`, ver su docblock), y aquí se ata
 * lo único que aquel no puede ver -- que la SEGUNDA cáscara no se quedó atrás
 * en la migración. Un copiar-pegar a medias dejaría `/aviso-legal` con la
 * cabecera sobria de tres enlaces y `/privacidad` con la navegación completa:
 * las dos identidades que esta entrega existe para eliminar, ahora dentro de
 * la misma sección del sitio.
 */

/*
 * `usePathname()` devuelve `null` fuera del contexto del App Router, y con
 * `null` el selector de idioma cae a la portada por su propia guarda
 * conservadora: los DOS enlaces de idioma apuntarían a la home y colisionarían
 * con el de la marca, dejando 14 destinos distintos donde el modelo declara
 * 15. Se simula la ruta REAL de la página, mismo patrón y mismo motivo que
 * `PrivacyDocument.test.tsx` y `LanguageSelector.test.tsx`.
 */
vi.mock("next/navigation", async () => {
  const real =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...real, usePathname: () => "/aviso-legal" };
});

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

describe("LegalNoticeDocument", () => {
  it("monta la MISMA cabecera de navegación completa que /privacidad", () => {
    const { container } = renderWithProviders(
      <LocaleShell locale="es">
        <LegalNoticeDocument />
      </LocaleShell>,
    );
    const cabecera = container.querySelector("header");
    expect(cabecera).not.toBeNull();

    const hrefs = Array.from(cabecera!.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    const destinos = navGroupsFor("es").flatMap((grupo) =>
      grupo.items.map((item) => item.href),
    );
    /*
     * Misma cuenta que en /privacidad, y por el mismo motivo: los destinos del
     * modelo, más la marca y los dos enlaces de idioma, más la copia por
     * régimen de los destinos anchos (`navBarWideSectionsFor`), que viven a la
     * vez en la fila y en el panel «Más» porque quien apaga una u otra es una
     * `@container` que jsdom no evalúa. El docblock de
     * `PrivacyDocument.test.tsx` explica la reescritura completa.
     */
    const anchos = navBarWideSectionsFor("es").map((item) => item.href);
    expect(hrefs).toHaveLength(destinos.length + 3 + anchos.length);
    expect(new Set(hrefs).size).toBe(destinos.length + 3);
    for (const destino of destinos) {
      expect(hrefs, `falta el destino ${destino}`).toContain(destino);
    }
  });
});
