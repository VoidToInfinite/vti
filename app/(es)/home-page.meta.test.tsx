import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SITE } from "@/config/site";
import i18n from "@/i18n/config";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import HomePage from "./page";

/*
 * EL TÍTULO DE LA PESTAÑA DE LA HOME SIGUE AL IDIOMA (crítica externa #8,
 * 2026-08-17).
 *
 * Archivo aparte de `home-page.flujo.test.tsx` a propósito: aquel es la lente
 * de FLUJO (orden de secciones, un solo h1, gate por tema) y este mide una
 * propiedad del DOCUMENTO, no del árbol. Se monta la página real -- no el
 * componente suelto -- porque lo que la crítica señalaba no era que
 * `DocumentMeta` funcionara, sino que la home no lo montaba.
 *
 * El `<h1>` de la home es la MARCA (`BrandName as="h1"`, Hero.tsx), no el
 * título de la pestaña: la igualdad h1 == título solo aplica a la 404 y a las
 * dos legales, donde el titular ES el título del documento (ver
 * `app/not-found.test.tsx` y `LegalDocument.test.tsx`). Aquí la propiedad
 * comprobable es la otra mitad del defecto: que el título deje de ser
 * castellano horneado cuando el visitante elige inglés.
 *
 * Validado con bug inyectado -- ver el docblock de
 * `src/seo/useDocumentMeta.test.tsx`.
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

async function cambiarIdioma(lang: "es" | "en"): Promise<void> {
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
}

function descriptionContent(): string | null {
  return (
    document.head
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? null
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  for (const meta of Array.from(
    document.head.querySelectorAll('meta[name="description"]'),
  )) {
    meta.remove();
  }
  document.title = "";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  if (i18n.language !== "es") await cambiarIdioma("es");
});

describe("home: el título del documento sigue al idioma", () => {
  it("en español la pestaña dice el título de la home, con la marca", () => {
    renderWithProviders(<HomePage />);

    expect(document.title).toBe(
      `${esCommon.Common.Meta.home.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    // El mismo texto que el HTML estático hornea vía `SITE.homeTitle`: en
    // castellano, build y cliente tienen que coincidir exactamente.
    expect(document.title).toBe(
      `${SITE.homeTitle}${TITLE_SEPARATOR}${SITE.name}`,
    );
  });

  it("al pasar a inglés la pestaña cambia de idioma, sin rastro del castellano", async () => {
    renderWithProviders(<HomePage />);
    await cambiarIdioma("en");

    expect(document.title).toBe(
      `${enCommon.Common.Meta.home.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    expect(document.title).not.toContain(SITE.homeTitle);
  });

  it("la descripción del documento acompaña al idioma", async () => {
    renderWithProviders(<HomePage />);
    expect(descriptionContent()).toBe(SITE.description);

    await cambiarIdioma("en");
    expect(descriptionContent()).toBe(enCommon.Common.Meta.home.description);
    expect(descriptionContent()).not.toBe(SITE.description);
  });
});
