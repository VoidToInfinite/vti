import { readFileSync } from "node:fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test/test-utils";
import { SITE } from "@/config/site";
import i18n from "@/i18n/config";
import esCommon from "@/i18n/locales/es/common.json";
import enCommon from "@/i18n/locales/en/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import NotFound, { metadata } from "./not-found";
import { resolveNotFoundLocale } from "./NotFoundLocaleShell";

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

afterEach(async () => {
  vi.unstubAllGlobals();
  // i18next es un singleton del proceso de test: sin esto el idioma se filtra
  // a los demás archivos de la suite.
  if (i18n.language !== "es") {
    await act(async () => {
      await i18n.changeLanguage("es");
    });
  }
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
   * UNA SOLA `<meta name="robots">`, Y LA QUE QUEDA ES LA DEL FRAMEWORK
   * (critica externa #17, 2026-09-03). Medido sobre el build de produccion
   * servido: la 404 emitia DOS -- `noindex` y `noindex, follow` --, la
   * segunda desde el `robots` que esta ruta declaraba. La primera la
   * antepone el limite de not-found de Next y no se puede suprimir, asi que
   * dejar una sola pasa por no anadir la nuestra. Ver el docblock de
   * `not-found.tsx` para por que la directiva efectiva no cambia.
   */
  it("la ruta NO declara robots propio: la unica meta la emite el limite de Next", () => {
    expect(metadata.robots).toBeUndefined();
  });

  /*
   * EL CANARIO DE LA DECISION DE ARRIBA, y la unica parte de ella que no
   * depende de este repo. No declarar `robots` solo es correcto mientras el
   * limite de not-found de Next siga emitiendo el suyo; si una actualizacion
   * lo retira, la 404 se queda sin directiva y una pagina de error pasa a
   * ser indexable. Este candado lee el fichero del framework INSTALADO -- no
   * una version supuesta -- y se pone en rojo el dia que eso cambie, que es
   * el dia en que hay que devolver `robots` a `metadata`.
   *
   * Se comprueba sobre la fuente y no sobre HTML renderizado porque ese
   * limite solo se monta cuando Next dispara la 404 de verdad: en jsdom no
   * hay router que la dispare, y el `out/` del build no existe cuando corre
   * el gate (`pnpm run ci` va antes de `pnpm build`).
   */
  it("el limite de not-found de Next sigue emitiendo su propia meta robots noindex", () => {
    const fuente = readFileSync(
      require.resolve("next/dist/client/components/http-access-fallback/error-boundary.js"),
      "utf8",
    );
    expect(fuente).toContain('name: "robots"');
    expect(fuente).toContain('content: "noindex"');
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

/*
 * EL TÍTULO DE LA PESTAÑA SIGUE AL IDIOMA (crítica externa #8, 2026-08-17).
 *
 * El defecto que cierra este candado: `/privacidad` traducía el título de la
 * pestaña al cambiar de idioma desde la ola D, pero la 404 y la home no --
 * seguían con el castellano horneado en build mientras su `<h1>` ya estaba en
 * inglés. Aquí, además, el `<h1>` y el título salen de la MISMA clave
 * (`notFound.title`), así que la propiedad comprobable es la más fuerte: los
 * dos tienen que contar exactamente lo mismo, en los dos idiomas.
 *
 * La `metadata` de arriba NO se toca: bajo `output: "export"` es lo que ven
 * los rastreadores y es correcta en castellano.
 *
 * Validado con bug inyectado -- ver el docblock de
 * `src/seo/useDocumentMeta.test.tsx`.
 */
describe("404: el título del documento sigue al idioma", () => {
  const COPIA = { es: esCommon.notFound, en: enCommon.notFound } as const;

  it.each(["es", "en"] as const)(
    "%s: la pestaña y el <h1> cuentan lo mismo",
    async (lang) => {
      if (lang !== "es") {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });
      }
      renderWithProviders(<NotFound />);

      const titular = screen.getByRole("heading", { level: 1 });
      expect(titular.textContent).toBe(COPIA[lang].title);
      expect(document.title).toBe(
        `${COPIA[lang].title}${TITLE_SEPARATOR}${SITE.name}`,
      );
    },
  );

  it("la descripción del documento sale del mensaje 404 del idioma activo", async () => {
    renderWithProviders(<NotFound />);
    const descripcion = (): string | null =>
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? null;

    expect(descripcion()).toBe(esCommon.notFound.message);

    await act(async () => {
      await i18n.changeLanguage("en");
    });
    expect(descripcion()).toBe(enCommon.notFound.message);
  });
});

/*
 * LA 404 BAJO `/en` RESPONDE EN INGLÉS (crítica externa #13, 2026-08-20).
 *
 * El defecto que cierra este candado, medido sobre el sitio servido:
 * `GET /en/lo-que-sea` devolvía 404 con el estado HTTP correcto pero
 * enteramente en castellano — `<html lang="es">`, `<title>` «Página no
 * encontrada · VoidToInfinite», cuerpo castellano y el selector marcando
 * Español como idioma actual — a alguien que venía navegando en inglés.
 *
 * Bajo `output: "export"` solo existe UN `404.html`, así que el idioma no
 * puede decidirse en el build: lo resuelve `NotFoundLocaleShell` leyendo
 * `window.location.pathname` tras montar. Estos candados comprueban las dos
 * mitades: la función pura que clasifica el camino, y el efecto real sobre el
 * documento renderizado.
 *
 * La `metadata` exportada arriba NO cambia y sigue en castellano a propósito:
 * es lo que se hornea en `out/404.html` y lo que lee un rastreador sin
 * ejecutar JavaScript.
 *
 * Validado con bug inyectado: sustituir la comparación de prefijo de
 * `resolveNotFoundLocale` por `DEFAULT_LOCALE` fijo (el estado anterior) pone
 * en rojo los cuatro `it` de este bloque.
 */
describe("404 bajo /en: el idioma sigue a la URL rota", () => {
  const CAMINO_ORIGINAL = "/";

  afterEach(() => {
    window.history.pushState({}, "", CAMINO_ORIGINAL);
    document.documentElement.lang = "es";
  });

  it.each([
    ["/en/lo-que-sea", "en"],
    ["/en/privacy/roto", "en"],
    ["/en", "en"],
    ["/lo-que-sea", "es"],
    ["/", "es"],
    // Ni `/english…` ni `/enlaces` son la rama inglesa: el prefijo se exige
    // seguido de `/` o como camino completo, nunca como `startsWith("/en")`.
    ["/english-corner", "es"],
    ["/enlaces", "es"],
  ] as const)("%s resuelve a %s", (camino, esperado) => {
    expect(resolveNotFoundLocale(camino)).toBe(esperado);
  });

  it("una URL rota bajo /en monta el titular, el mensaje y el <title> ingleses", () => {
    window.history.pushState({}, "", "/en/lo-que-sea");
    renderWithProviders(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      enCommon.notFound.title,
    );
    expect(screen.getByText(enCommon.notFound.message)).toBeInTheDocument();
    expect(document.title).toBe(
      `${enCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
    );
    // WCAG 3.1.1: lo que anuncia un lector de pantalla es el DOM vivo, y este
    // es el único mecanismo que corrige el atributo bajo `output: "export"`.
    expect(document.documentElement.lang).toBe("en");
  });

  it("el selector de idioma marca INGLÉS como actual, no español", () => {
    window.history.pushState({}, "", "/en/lo-que-sea");
    const { container } = renderWithProviders(<NotFound />);

    expect(
      container.querySelectorAll('a[hreflang="en"][aria-current="true"]')
        .length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('a[hreflang="es"][aria-current="true"]'),
    ).toHaveLength(0);
  });

  it("una URL rota castellana sigue en castellano -- la 404 española no se rompe", () => {
    window.history.pushState({}, "", "/lo-que-sea");
    renderWithProviders(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      esCommon.notFound.title,
    );
    expect(document.documentElement.lang).toBe("es");
  });
});
