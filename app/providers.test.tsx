import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { LocaleShell, Providers } from "./providers";

/*
 * DOS APIS QUE JSDOM NO IMPLEMENTA, y las dos hacen falta desde que
 * `LocaleShell` monta la cáscara del sitio (2026-09-04, frente del presupuesto):
 *
 * - `window.matchMedia`: lo lee `ThemeProvider` (dentro de `Providers`) en su
 *   efecto de corrección post-montaje (Task 9, prefers-color-scheme), y varios
 *   hooks del árbol de `Navbar` al montar.
 * - `IntersectionObserver`: `Footer` monta `SectionBeam`, que usa `useReveal`
 *   SIEMPRE desde la spec de estrellas del 2026-08-07, no solo en oscuro.
 *
 * Mismos stubs mínimos que `app/not-found.test.tsx` y
 * `app/(es)/legal-pages.test.tsx`, por el mismo motivo.
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
    /*
     * SE PREGUNTA POR EL BOTÓN DE `BackToTop`, NO POR «no hay ningún botón»
     * (2026-09-04). La versión anterior era `queryByRole("button")` a secas y
     * dependía de que el árbol no montara NINGÚN botón; desde que `LocaleShell`
     * monta la cáscara del sitio, el `Navbar` trae los suyos (conmutador de
     * tema, hoja móvil) y ese aserto pasaba a fallar por un motivo que nada
     * tiene que ver con lo que la prueba dice comprobar. Se nombra el botón que
     * SÍ importa aquí, que además es lo que el título del `it` ya prometía.
     */
    expect(
      screen.queryByRole("button", { name: "Volver arriba" }),
    ).not.toBeInTheDocument();
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
 * Las dos cifras de arriba se midieron con el polyfill `nomodule` dentro.
 * Desde el 2026-09-01 el instrumento (`scripts/measure-home-js.mjs`,
 * `pnpm measure:js`) lo excluye, porque ningún navegador moderno lo
 * descarga: la portada de hoy son 257.092 B descargados. La comparación
 * 313.928 contra 285.430 sigue siendo válida —las dos ramas del experimento
 * llevaban el polyfill— pero NO se comparan contra la cifra nueva.
 *
 * Eso NO se puede observar desde jsdom: no hay build, no hay chunks y no hay
 * `out/index.html` que medir. Lo que sí se puede candar —y es la condición
 * ESTRUCTURAL de la que depende todo lo anterior— es que el DOCUMENTO siga
 * montando `Providers`, y que la 404 y las dos ramas de idioma monten
 * `LocaleShell` y NO `Providers`. Si alguien vuelve a subir el tema a las
 * ramas (o a bajar `Providers` a la 404), este candado cae antes de que la
 * regresión llegue a medirse en un build.
 *
 * QUIÉN ES «EL DOCUMENTO» CAMBIÓ EL 2026-09-06, LA CONDICIÓN NO. Hasta esa
 * fecha era `app/layout.tsx`, el root layout único, y por eso este candado leía
 * ese fichero. Al arreglar el `<html lang>` por rama (P1 de la crítica externa
 * #19) ese fichero desapareció: hoy hay TRES raíces —`app/(es)/layout.tsx`,
 * `app/en/layout.tsx` y `app/global-not-found.tsx`— y las tres renderizan el
 * MISMO `app/RootDocument.tsx`, que es quien monta `Providers` una sola vez
 * para todas. El ancestro común sigue existiendo y sigue siendo uno; lo que
 * este bloque comprueba es que las tres raíces sigan pasando por él en vez de
 * abrir cada una su propia frontera de cliente sobre el tema.
 *
 * La 404 llega hoy a `LocaleShell` a través de `NotFoundLocaleShell`
 * (2026-08-20, idioma resuelto desde la URL rota): son dos eslabones y el
 * candado recorre los dos — ver el `it` correspondiente. Desde el 2026-09-06 el
 * árbol de la página vive en `app/NotFoundRoute.tsx` (la convención
 * `global-not-found` obliga a que el fichero de ruta renderice el documento),
 * así que el eslabón que se lee es ese.
 *
 * Se lee la FUENTE con `node:fs`, mismo patrón que `app/RootDocument.test.ts`,
 * y se despojan comentarios ANTES de buscar (lección del 2026-08-11:
 * `toContain` sobre fuente cruda da por activa una línea comentada, y aquí los
 * docblocks citan los dos nombres a propósito).
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

function fuenteSinComentarios(...ruta: string[]): string {
  return readFileSync(join(AQUI, ...ruta), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\/.*$/gm, "");
}

describe("dónde se monta cada mitad del árbol (candado de presupuesto)", () => {
  it("el documento monta `Providers` — el ancestro común que impide la copia doble", () => {
    const source = fuenteSinComentarios("RootDocument.tsx");

    expect(source).toContain("<Providers>{children}</Providers>");
  });

  /*
   * Y las TRES raíces pasan por ese documento en vez de renderizar el suyo. Sin
   * esta comprobación, el `it` de arriba seguiría en verde el día que una raíz
   * nueva —o una de las tres de hoy— dejara de montar `RootDocument`: el
   * fichero seguiría conteniendo su `<Providers>`, pero esa rama abriría su
   * propia frontera de cliente sobre el tema y volvería la copia doble que este
   * bloque entero existe para impedir.
   */
  it.each([
    ["(es)", ["(es)", "layout.tsx"]],
    ["en", ["en", "layout.tsx"]],
    ["404", ["global-not-found.tsx"]],
  ])(
    "la raíz %s renderiza el documento compartido, no uno propio",
    (_raiz, ruta) => {
      const source = fuenteSinComentarios(...ruta);

      expect(source).toMatch(/<RootDocument lang="(es|en)">/);
      expect(source).not.toContain("<Providers");
    },
  );

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
    const pagina = fuenteSinComentarios("NotFoundRoute.tsx");

    expect(pagina).toContain("<NotFoundLocaleShell>");
    expect(pagina).not.toContain("<Providers");

    const cascara = fuenteSinComentarios("NotFoundLocaleShell.tsx");

    expect(cascara).toContain("<LocaleShell locale={locale}>");
    expect(cascara).not.toContain("<Providers");
  });
});

/*
 * LA CÁSCARA DEL SITIO SE MONTA UNA SOLA VEZ, Y ESTE ES EL CANDADO QUE LO
 * SOSTIENE (2026-09-04, frente del presupuesto de JS).
 *
 * QUÉ PASÓ. `Navbar` y `Footer` los montaban a la vez `app/HomeRoute.tsx`,
 * `app/not-found.tsx` y los dos envoltorios legales. Cada uno de esos ficheros
 * es un Server Component, así que cada uno abría su PROPIA frontera de servidor
 * a cliente sobre los mismos módulos; y como el árbol de la 404 viaja en el
 * manifiesto de cliente de todas las páginas, la cáscara acababa en dos grupos
 * de chunks hermanos y Turbopack la emitía DOS VECES. Medido por chunk sobre el
 * build de `0226846`: dos chunks de 109.716 B crudos con los mismos 17
 * identificadores de módulo, el segundo (28.413 B brotli) íntegramente
 * redundante y descargado solo por las dos portadas. Con la cáscara colgando de
 * `LocaleShell`, el mismo árbol mide 284.559 → 253.853 B brotli (−30.706 B).
 *
 * Es exactamente el defecto que la regla del docblock de `providers.tsx` ya
 * advertía desde el 2026-08-19 —lo que monten a la vez una rama de idioma y la
 * 404 tiene que colgar de un ancestro común— y que nadie volvió a comprobar en
 * cinco olas. Una regla escrita en prosa no es un candado.
 *
 * POR QUÉ BARRE EL REPO ENTERO Y NO UNA LISTA DE CUATRO FICHEROS. Una
 * comprobación que recorre una lista escrita a mano se puede dejar en verde
 * BORRANDO una fila de la lista, y ese es el modo de fallo más caro que tiene
 * este repo (cuatro candados distintos cayeron en él durante la ola Q). Aquí la
 * lista no se escribe: sale del sistema de ficheros, así que un componente nuevo
 * que monte la cáscara entra en el barrido el día que se crea, sin que nadie
 * tenga que acordarse de añadirlo.
 *
 * Y el barrido lleva su propia atadura de extensión: si visitara menos ficheros
 * de los que este repo tiene, el "ninguno la monta" sería cierto por vacuidad.
 * `MINIMO_COMPONENTES_BARRIDOS` es esa cota — el repo tiene 69 componentes no
 * de test el 2026-09-04 —, y la sonda positiva sobre `providers.tsx` demuestra
 * que el patrón que se busca es capaz de encontrar un montaje real.
 */
const RAIZ = join(AQUI, "..");

/** Componentes de producción (los `.test.tsx` quedan fuera) bajo `app/` y `src/`. */
function componentesDelRepo(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...componentesDelRepo(ruta));
      continue;
    }
    if (entrada.name.endsWith(".tsx") && !entrada.name.endsWith(".test.tsx")) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

/**
 * Cota inferior del barrido, no el número exacto: fijar el exacto obligaría a
 * tocar este test cada vez que nace un componente, y lo que aquí importa es que
 * el barrido no se quede vacío o casi vacío sin que nadie lo note.
 */
const MINIMO_COMPONENTES_BARRIDOS = 60;

/** `<Navbar` / `<Footer` como MONTAJE en JSX, no como palabra en una importación. */
const MONTA_CASCARA = /<(?:Navbar|Footer)\b/;

describe("la cáscara del sitio se monta una sola vez (candado de presupuesto)", () => {
  const componentes = [
    ...componentesDelRepo(join(RAIZ, "app")),
    ...componentesDelRepo(join(RAIZ, "src")),
  ];

  it("el barrido ve el repo entero, no una muestra que pueda encoger en silencio", () => {
    expect(componentes.length).toBeGreaterThanOrEqual(
      MINIMO_COMPONENTES_BARRIDOS,
    );
  });

  it("`LocaleShell` monta la cáscara — la sonda positiva que prueba que el patrón encuentra un montaje real", () => {
    const source = fuenteSinComentarios("providers.tsx");

    expect(source).toMatch(MONTA_CASCARA);
    expect(source).toContain("<Navbar />");
    expect(source).toContain("<Footer />");
  });

  it("ningún otro componente del repo vuelve a montarla", () => {
    const culpables = componentes
      .filter((ruta) => ruta !== join(RAIZ, "app", "providers.tsx"))
      .filter((ruta) =>
        MONTA_CASCARA.test(
          readFileSync(ruta, "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
            .replace(/\/\/.*$/gm, ""),
        ),
      )
      .map((ruta) => relative(RAIZ, ruta));

    expect(
      culpables,
      `estos componentes montan Navbar/Footer fuera de LocaleShell, y con ello ` +
        `Turbopack vuelve a emitir la cáscara dos veces en las portadas: ` +
        `${culpables.join(", ")}`,
    ).toEqual([]);
  });
});
