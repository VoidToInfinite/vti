import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { navGroupsFor } from "@/config/navigation";
import { LegalNoticeDocument } from "./LegalNoticeDocument";

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
    const { container } = renderWithProviders(<LegalNoticeDocument />);
    const cabecera = container.querySelector("header");
    expect(cabecera).not.toBeNull();

    const hrefs = Array.from(cabecera!.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    const destinos = navGroupsFor("es").flatMap((grupo) =>
      grupo.items.map((item) => item.href),
    );
    // Misma cuenta que en /privacidad: los destinos del modelo, más la marca y
    // los dos enlaces de idioma.
    expect(hrefs).toHaveLength(destinos.length + 3);
    for (const destino of destinos) {
      expect(hrefs, `falta el destino ${destino}`).toContain(destino);
    }
  });
});
