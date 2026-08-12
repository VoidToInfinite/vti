import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import NotFound, { metadata } from "./not-found";

/*
 * Split de la 404 (auditoria SEO 2026-08-08): `not-found.tsx` paso de
 * Client Component monolitico a cascara de Server Component + metadata
 * propia, con el `<h1>`/`<p>` traducidos movidos a
 * `NotFoundContent.test.tsx` (mismo patron que las paginas legales, ver
 * `PrivacyDocument.tsx`/`app/privacidad/page.tsx`). Este archivo se queda
 * con lo que ESTE fichero declara de verdad: la `metadata` propia (antes
 * inexistente -- la ruta heredaba la de la home) y que el default export
 * siga montando el contenido real.
 */

/*
 * Task 35: desde esta tarea `<NotFound />` monta también `Navbar` y
 * `Footer` (ver el docblock de `not-found.tsx`), así que renderizarlo
 * necesita los mismos stubs de entorno que `app/home-page.flujo.test.tsx` y
 * `app/legal-pages.test.tsx` para las mismas dos APIs ausentes en jsdom:
 * `matchMedia` (varios hooks del árbol de Navbar la consultan al montar,
 * envuelta en try/catch en algunos sitios pero no en todos) y
 * `IntersectionObserver` (`Footer` monta `SectionBeam`, que usa `useReveal`
 * SIEMPRE desde la spec de estrellas 2026-08-07, no solo en oscuro).
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
  stubMatchMedia();
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

describe("not-found metadata", () => {
  it("declara un titulo propio, no el de la home heredado del layout", () => {
    expect(metadata.title).toBe(
      `${esCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
  });

  it("la descripcion sale del mensaje 404 real, no de la de la home", () => {
    expect(metadata.description).toBe(esCommon.notFound.message);
  });

  /*
   * Candado del bug que esta entrega corrige: la version anterior, al
   * heredar la metadata de la home, emitia a la vez `noindex` (de un ajuste
   * suelto) e `index,follow` (de `buildMetadata()`) -- contradictorios. Una
   * 404 debe seguir enlaces (`follow: true`) pero NUNCA indexarse
   * (`index: false`).
   */
  it("robots declara index:false, follow:true -- nunca index:true ni un noindex/follow contradictorio", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  /*
   * `alternates` NO puede quedar sin declarar: un campo de primer nivel que
   * el hijo omite se HEREDA del padre, y `app/layout.tsx` declara la
   * canonica de la home -- medido en `out/404.html` (2026-08-08): la 404
   * emitia `<link rel="canonical" href="https://voidtoinfinite.com">`.
   * `canonical: null` sustituye la herencia y suprime la etiqueta.
   */
  it("anula la canonica heredada con alternates.canonical: null -- una 404 no tiene URL propia que canonicalizar", () => {
    expect(metadata.alternates).toEqual({ canonical: null });
  });
});

describe("NotFound (cascara de servidor)", () => {
  it("monta el contenido traducido real, no un marcador vacio", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });

  /*
   * Task 35 (hallazgo de un evaluador independiente, gate F4, 2026-08-12):
   * la 404 no llevaba cabecera ni pie -- un visitante que aterrizaba aquí
   * veía una superficie sin marca, sin navegación real y sin la salida a
   * las mismas redes/recursos que el resto del sitio. Mismo patrón de
   * aserción que `app/legal-pages.test.tsx` ("monta cabecera propia y
   * pie"): `<header>`/`<footer>` fuera de cualquier landmark
   * article/aside/main/nav/section resuelven a role="banner"/"contentinfo"
   * por defecto (semántica implícita de HTML), sin necesitar ningún
   * `aria-label` adicional.
   */
  it("Task 35: monta la cabecera y el pie reales de la home (Navbar/Footer), no una version reducida", () => {
    const { container } = renderWithProviders(<NotFound />);

    const cabecera = screen.getByRole("banner");
    expect(cabecera).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    // La marca visible (Task 35, punto 1 del brief): el enlace a "/" con el
    // nombre accesible "VoidToInfinite" que monta BrandName dentro de la
    // cabecera.
    const marca = screen.getAllByRole("link", { name: /VoidToInfinite/i });
    expect(marca.length).toBeGreaterThan(0);

    // Un único h1 en toda la página (mismo candado que
    // `home-page.flujo.test.tsx`): BrandName por defecto renderiza un
    // <span>, no un <h1> -- Navbar no compite con el titular de la 404.
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  /*
   * Candado del hallazgo de layout (Task 35, punto 1 del brief): el h1
   * "pegado a (0,0)" era un defecto de CSS real (sin contenedor, sin
   * padding), no algo que jsdom pueda medir por geometría (no hace layout,
   * regla 2 de CLAUDE.md) -- pero SÍ puede afirmar que el `<main>` ya no es
   * un elemento nativo sin clase alguna: styled-components le inyecta una
   * clase con reglas propias (contenedor, padding). La medición real
   * (`getBoundingClientRect().top > 0`) se hace en navegador, ver el
   * informe de la tarea.
   */
  it("Task 35: el <main> de la 404 lleva una clase de styled-components con estilos propios, no un elemento nativo pelado", () => {
    const { container } = renderWithProviders(<NotFound />);
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.classList.length).toBeGreaterThan(0);
  });
});
