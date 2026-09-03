import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { I18nProvider } from "@/i18n/I18nProvider";
import { navGroupsFor } from "@/config/navigation";
import { routePath, type Locale } from "@/config/site";
import { PrivacyDocument } from "./PrivacyDocument";

/*
 * CANDADO DE LA CABECERA DE LAS PÁGINAS LEGALES (decisión del dueño del
 * 2026-09-03, crítica externa #16).
 *
 * Vive aquí, en el envoltorio, y no en un componente de cabecera propio,
 * porque desde esta entrega ya no hay ninguno: la decisión de QUÉ cabecera
 * lleva una página legal se toma en este fichero, montando el `Navbar` del
 * sitio. `LegalHeader.tsx` y su test se retiran en el mismo movimiento --
 * los cinco candados que aquel archivo sostenía (marca al idioma correcto,
 * los dos enlaces de idioma, el conmutador de tema, el `<header>` semántico y
 * el raíl del sitio) los cubre ya `Navbar.test.tsx` sobre el mismo componente
 * que ahora se monta aquí, así que no se pierde ninguno; lo que este archivo
 * añade es lo que solo se puede comprobar en el punto de ensamblaje.
 *
 * EL CANDADO CENTRAL SE REESCRIBE, NO SE RELAJA (regla 40). Hasta hoy exigía
 * la AUSENCIA de las cuatro anclas de sección del Navbar, porque D20 razonaba
 * que en `/privacidad` esas secciones no existen y las anclas quedarían
 * muertas. La premisa caducó: desde la crítica #6 (P0-2, medido con clic real)
 * las anclas del modelo compartido son ABSOLUTAS (`/#story`), y desde la #12
 * además conscientes del idioma (`/en#story`), así que navegan a la home y
 * aterrizan en su sección. Exigir su ausencia ya no protegía de nada -- de
 * hecho pasaba en verde por vacuidad con la cabecera nueva, porque solo
 * buscaba la forma relativa. Ahora se exige la FORMA CORRECTA: que la
 * cabecera exponga los destinos del modelo y que ninguno sea relativo.
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

/*
 * `usePathname()` devuelve `null` fuera del contexto del App Router, y con
 * `null` el selector de idioma cae a la portada por su propia guarda
 * conservadora -- que es justo lo contrario de lo que este archivo tiene que
 * comprobar. Se simula la ruta REAL de la página, mismo patrón y mismo motivo
 * que `LanguageSelector.test.tsx`.
 */
const rutaSimulada = { current: "/privacidad" as string | null };
vi.mock("next/navigation", async () => {
  const real =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...real, usePathname: () => rutaSimulada.current };
});

beforeEach(() => {
  stubMatchMedia();
  /*
   * `Footer` monta `SectionBeam`, que usa `useReveal` -> `IntersectionObserver`
   * (ausente en jsdom). Mismo stub que `app/(es)/legal-pages.test.tsx` y
   * `app/not-found.test.tsx` por la misma razón.
   */
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
  rutaSimulada.current = "/privacidad";
});

/**
 * Los `<a>` de la cabecera leídos del DOM, no del árbol de accesibilidad: los
 * nueve destinos que viven dentro del panel «Más» están replegados mientras el
 * disparador no se pulse, así que una consulta por rol los dejaría fuera y la
 * cifra dejaría de ser comparable con la que se mide en el navegador.
 */
function enlacesDeCabecera(container: HTMLElement): HTMLAnchorElement[] {
  const cabecera = container.querySelector("header");
  expect(cabecera).not.toBeNull();
  return Array.from(cabecera!.querySelectorAll("a"));
}

/** El prefijo con el que el modelo compone sus anclas en cada idioma. */
function prefijoDeAncla(locale: Locale): string {
  const home = routePath("home", locale);
  return home === "/" ? "/#" : `${home}#`;
}

describe("PrivacyDocument: la cabecera del sitio en una página legal", () => {
  it("expone la navegación COMPLETA: los 12 destinos del modelo más la marca y los dos idiomas", () => {
    const { container } = renderWithProviders(<PrivacyDocument />);
    const enlaces = enlacesDeCabecera(container);

    /*
     * La cifra no se escribe a mano (lección del 2026-08-01: un test que
     * teclea el número de elementos puede mentir en su propio título): sale
     * del modelo compartido, que es quien decide cuántos destinos hay. Los
     * tres que no salen de él son la marca y los dos enlaces de idioma.
     */
    const destinos = navGroupsFor("es").flatMap((grupo) =>
      grupo.items.map((item) => item.href),
    );
    expect(enlaces).toHaveLength(destinos.length + 3);

    const hrefs = enlaces.map((a) => a.getAttribute("href"));
    for (const destino of destinos) {
      expect(hrefs, `falta el destino ${destino} en la cabecera`).toContain(
        destino,
      );
    }
  });

  it("D20 reescrito: toda ancla de la cabecera es ABSOLUTA a la home, ninguna relativa", () => {
    const { container } = renderWithProviders(<PrivacyDocument />);

    // Sonda positiva antes de la aserción de forma: si no hubiera ninguna
    // ancla, un "todas cumplen" pasaría por vacuidad.
    const anclas = enlacesDeCabecera(container)
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.includes("#"));
    expect(anclas.length).toBeGreaterThan(0);

    for (const href of anclas) {
      expect(href.startsWith("#"), `${href} es una ancla RELATIVA`).toBe(false);
      expect(href.startsWith(prefijoDeAncla("es"))).toBe(true);
    }
  });

  it("en la rama inglesa las anclas y la marca conservan /en", () => {
    const { container } = renderWithProviders(
      <I18nProvider locale="en">
        <PrivacyDocument />
      </I18nProvider>,
    );
    const enlaces = enlacesDeCabecera(container);

    // Primer ancla del DOM = la marca (va antes que los destinos de sección).
    expect(enlaces[0]).toHaveAttribute("href", routePath("home", "en"));

    const anclas = enlaces
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href.includes("#"));
    expect(anclas.length).toBeGreaterThan(0);
    for (const href of anclas) {
      expect(href.startsWith(prefijoDeAncla("en")), href).toBe(true);
    }
  });

  it("el selector de idioma sigue llevando a la MISMA página en el otro idioma, no a la portada", () => {
    const { container } = renderWithProviders(<PrivacyDocument />);

    /*
     * Se acota a la CABECERA y se consulta por `hreflang` -- el atributo que
     * declara el idioma del destino -- en vez de por nombre accesible: desde
     * que la página monta el `Navbar`, la hoja móvil monta su propia copia del
     * selector fuera del `<header>`, así que una consulta global por el texto
     * "English" encuentra dos y falla por ambigüedad. Las dos copias son el
     * mismo componente; comprobar la de la cabecera es comprobar el contrato.
     */
    const cabecera = container.querySelector("header");
    expect(cabecera).not.toBeNull();

    const ingles = cabecera!.querySelector('a[hreflang="en"]');
    expect(ingles).not.toBeNull();
    expect(ingles!.getAttribute("href")).toContain(routePath("privacy", "en"));

    const castellano = cabecera!.querySelector('a[hreflang="es"]');
    expect(castellano).not.toBeNull();
    expect(castellano!.getAttribute("href")).toContain(
      routePath("privacy", "es"),
    );
  });

  it("conserva el punto de referencia semántico: un solo <header> con rol banner", () => {
    renderWithProviders(<PrivacyDocument />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
