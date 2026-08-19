import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocaleShell, Providers } from "./providers";

/*
 * `ThemeProvider` (dentro de `Providers`) lee `window.matchMedia` de verdad
 * en su efecto de corrección post-montaje (Task 9, prefers-color-scheme);
 * jsdom no lo implementa. Mismo stub mínimo que ThemeProvider.test.tsx/
 * Hero.test.tsx.
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
  window.localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/*
 * `LocaleShell` es el ÚNICO sitio real del repo que monta `SkipLink`/
 * `BackToTop` (Task 2): ninguno de los tests de `SkipLink.tsx`/
 * `BackToTop.tsx` por separado prueba que están conectados al árbol real de
 * proveedores en la posición correcta. Este archivo cubre justo ese hueco,
 * sin duplicar `renderWithProviders` (que envolvería el árbol en un SEGUNDO
 * juego de ThemeProvider/I18nextProvider): el par `Providers` + `LocaleShell`
 * ya trae los suyos, y montarlos juntos aquí reproduce el anidamiento real
 * (root layout → layout de rama).
 */
describe("Providers + LocaleShell", () => {
  it("SkipLink precede a los children en orden de documento (brief Task 2, punto 3: 'orden')", () => {
    render(
      <Providers>
        <LocaleShell locale="es">
          <main
            id="main"
            tabIndex={-1}
          >
            <button>contenido</button>
          </main>
        </LocaleShell>
      </Providers>,
    );

    const skipLink = screen.getByRole("link", {
      name: "Saltar al contenido",
    });
    const contenido = screen.getByRole("button", { name: "contenido" });

    expect(skipLink).toHaveAttribute("href", "#main");
    expect(
      skipLink.compareDocumentPosition(contenido) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("monta sin errores junto a contenido real, y BackToTop no aparece sin scroll", () => {
    render(
      <Providers>
        <LocaleShell locale="es">
          <main
            id="main"
            tabIndex={-1}
          >
            <p>Contenido de la página</p>
          </main>
        </LocaleShell>
      </Providers>,
    );

    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("LocaleShell traduce el chrome global al idioma que recibe (por eso envuelve a SkipLink y no solo a la página)", () => {
    render(
      <Providers>
        <LocaleShell locale="en">
          <main
            id="main"
            tabIndex={-1}
          >
            <p>Page content</p>
          </main>
        </LocaleShell>
      </Providers>,
    );

    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Saltar al contenido" }),
    ).not.toBeInTheDocument();
  });
});

/*
 * CANDADO DE PESO, NO DE COMPORTAMIENTO (2026-08-19).
 *
 * La partición `Providers` (sin idioma, en el root layout) / `LocaleShell`
 * (con idioma, en cada rama) existe porque montar el árbol ENTERO desde las
 * ramas dejaba el root layout sin ninguna frontera de cliente, y con ello los
 * mismos módulos en dos grupos de chunks hermanos —el de `app/(es)/` y el de
 * `/_not-found`, que viaja en el manifiesto de cliente de TODAS las páginas—:
 * Turbopack los emitía dos veces y la portada pagaba 313.928 B brotli en vez
 * de 285.430 B. El presupuesto vigente es 290.000 B (`PRE-LAUNCH-QA.md` §4).
 *
 * Eso NO se puede observar desde jsdom: no hay build, no hay chunks y no hay
 * `out/index.html` que medir. Lo que sí se puede candar —y es la condición
 * ESTRUCTURAL de la que depende todo lo anterior— es que el root layout siga
 * montando `Providers`, y que la 404 y las dos ramas de idioma monten
 * `LocaleShell` y NO `Providers`. Si alguien vuelve a subir el tema a las
 * ramas (o a bajar `Providers` a la 404), este candado cae antes de que la
 * regresión llegue a medirse en un build.
 *
 * La 404 llega hoy a `LocaleShell` a través de `NotFoundLocaleShell`
 * (2026-08-20, idioma resuelto desde la URL rota): son dos eslabones y el
 * candado recorre los dos — ver el `it` correspondiente.
 *
 * Se lee la FUENTE con `node:fs`, mismo patrón que `app/layout.test.ts`, y se
 * despojan comentarios ANTES de buscar (lección del 2026-08-11: `toContain`
 * sobre fuente cruda da por activa una línea comentada, y aquí los docblocks
 * citan los dos nombres a propósito).
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

function fuenteSinComentarios(...ruta: string[]): string {
  return readFileSync(join(AQUI, ...ruta), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("dónde se monta cada mitad del árbol (candado de presupuesto)", () => {
  it("el root layout monta `Providers` — el ancestro común que impide la copia doble", () => {
    const source = fuenteSinComentarios("layout.tsx");

    expect(source).toContain("<Providers>{children}</Providers>");
  });

  it.each([
    ["(es)", ["(es)", "layout.tsx"], "es"],
    ["en", ["en", "layout.tsx"], "en"],
  ])(
    "el layout de la rama %s monta `LocaleShell`, no `Providers`",
    (_rama, ruta, locale) => {
      const source = fuenteSinComentarios(...ruta);

      expect(source).toContain(`<LocaleShell locale="${locale}">`);
      expect(source).not.toContain("<Providers");
    },
  );

  /*
   * DESDE EL 2026-08-20 LA 404 MONTA `LocaleShell` A TRAVÉS DE UNA CÁSCARA, y
   * el candado sigue a la cadena entera en vez de aflojarse.
   *
   * El `locale="es"` fijo se retiró al arreglar la 404 inglesa (`GET
   * /en/lo-que-sea` respondía en castellano): el idioma lo resuelve ahora
   * `NotFoundLocaleShell` leyendo la URL rota en cliente. La condición que
   * este bloque protege NO ha cambiado —la 404 no puede montar `Providers`,
   * porque su árbol viaja en el manifiesto de cliente de todas las páginas—,
   * así que se comprueban los DOS eslabones: que la página monte la cáscara, y
   * que la cáscara siga montando `LocaleShell`. Comprobar solo el primero
   * dejaría pasar una cáscara que montara cualquier otra cosa.
   */
  it("la 404 monta `LocaleShell` vía `NotFoundLocaleShell`, no `Providers` (su árbol viaja en TODAS las páginas)", () => {
    const pagina = fuenteSinComentarios("not-found.tsx");

    expect(pagina).toContain("<NotFoundLocaleShell>");
    expect(pagina).not.toContain("<Providers");

    const cascara = fuenteSinComentarios("NotFoundLocaleShell.tsx");

    expect(cascara).toContain("<LocaleShell locale={locale}>");
    expect(cascara).not.toContain("<Providers");
  });
});
