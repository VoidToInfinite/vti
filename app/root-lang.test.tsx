import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * LAS FUENTES SE SUSTITUYEN PORQUE EL PLUGIN QUE LAS RESUELVE NO EXISTE FUERA
 * DE `next build`, no para esquivar nada. Comprobado en este mismo entorno:
 * `import("next/font/google")` bajo Vitest devuelve un módulo con dos claves
 * (`default`, `module.exports`) y `Hanken_Grotesk` NO es una función — la
 * llamada revienta con «fn is not a function». El doble devuelve la misma forma
 * que devuelve el plugin real (`className`, `variable`, `style`), que es lo
 * único que `RootDocument` consume, y no toca NADA de lo que este fichero
 * comprueba: el `lang` de cada raíz.
 *
 * `vi.mock` se iza por encima de los `import` estáticos, así que los tres
 * ficheros de convención de abajo se cargan ya con el doble puesto.
 */
vi.mock("next/font/google", () => ({
  Hanken_Grotesk: () => ({
    className: "fuente-cuerpo",
    variable: "--font-body-doble",
    style: { fontFamily: "Hanken Grotesk" },
  }),
  JetBrains_Mono: () => ({
    className: "fuente-mono",
    variable: "--font-mono-doble",
    style: { fontFamily: "JetBrains Mono" },
  }),
}));

import EsLayout from "./(es)/layout";
import EnLayout from "./en/layout";
import GlobalNotFound from "./global-not-found";

/*
 * DOS APIS QUE JSDOM NO IMPLEMENTA y que el árbol real consulta al montar:
 * `matchMedia` (`ThemeProvider`, y varios hooks del árbol de `Navbar`) e
 * `IntersectionObserver` (`Footer` monta `SectionBeam`, que usa `useReveal`).
 * Mismos stubs mínimos que `app/not-found.test.tsx` y `app/providers.test.tsx`.
 * `renderToStaticMarkup` no ejecuta efectos, pero sí el cuerpo de cada
 * componente, y alguno los lee durante el render.
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

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

/** Atributo `lang` de la etiqueta `<html>` de un HTML ya renderizado. */
function langDelDocumento(html: string): string | null {
  const apertura = html.match(/<html\b[^>]*>/);
  if (!apertura) return null;
  return apertura[0].match(/\slang="([^"]*)"/)?.[1] ?? null;
}

/*
 * CADA RAMA DE IDIOMA HORNEA SU PROPIO `<html lang>` (P1 #1 de la crítica
 * externa #19, 2026-09-06; WCAG 3.1.1 «Idioma de la página», nivel A).
 *
 * EL DEFECTO, medido sobre el build de `f3594ad` servido en local antes de
 * tocar nada: las SIETE superficies del sitio se servían con `lang="es"`,
 * inglesas incluidas. Reproducido en el `out/` de este mismo árbol antes del
 * arreglo:
 *
 *   out/index.html            <html lang="es"
 *   out/en.html               <html lang="es"     ← inglés anunciado como español
 *   out/privacidad.html       <html lang="es"
 *   out/en/privacy.html       <html lang="es"     ← ídem
 *   out/aviso-legal.html      <html lang="es"
 *   out/en/legal-notice.html  <html lang="es"     ← ídem
 *   out/404.html              <html lang="es"
 *
 * `I18nProvider` corregía el atributo tras montar, así que un lector de
 * pantalla con JavaScript acababa leyendo inglés con fonética inglesa; lo que
 * quedaba mal era el HTML SERVIDO EN CRUDO — lo que ve un rastreador que no
 * ejecuta JavaScript, un traductor automático y cualquier tecnología de apoyo
 * antes de que hidrate nada.
 *
 * POR QUÉ ESTE CANDADO RENDERIZA Y NO LEE LA FUENTE. Un `toContain('lang="en"')`
 * sobre `app/en/layout.tsx` pasaría en verde aunque ese `lang` no llegara al
 * documento (porque `RootDocument` lo ignorara, porque otro componente lo
 * pisara, o porque el atributo viajara a un elemento que no es `<html>`). Aquí
 * se renderiza el fichero de convención REAL con `renderToStaticMarkup` —el
 * mismo renderizador de servidor que usa el build— y se lee el atributo del
 * `<html>` que sale.
 *
 * MATRIZ DE LO QUE CUBRE (regla de la lección 2026-09-06): las TRES raíces que
 * el sitio tiene —rama castellana, rama inglesa y 404 global— por su `lang`
 * horneado. Queda FUERA a propósito: (a) el tema, que no toca este atributo;
 * (b) el ancho/DPR/`reduce`, que no existen en un render de servidor; (c) la
 * corrección en CLIENTE del idioma de la 404 bajo `/en/*`, que ya tiene su
 * candado en `app/not-found.test.tsx` («una URL rota bajo /en monta … el
 * `<html lang>` vivo en `en`»); y (d) el atributo sobre el ARTEFACTO servido,
 * que se mide en navegador desde `scripts/check-site-surfaces.mjs` (familia
 * `lang-del-documento-por-ruta`). Las seis rutas del sitio no se enumeran una a
 * una porque ninguna declara documento: lo heredan de su raíz, y el barrido de
 * más abajo comprueba justo eso.
 *
 * VALIDADO CON BUG INYECTADO (2026-09-06): sustituyendo `lang="en"` por
 * `lang="es"` en `app/en/layout.tsx`, este bloque se pone en rojo con
 *
 *   AssertionError: /en, /en/privacy y /en/legal-notice se sirven con
 *   lang="es": el defecto P1 de la crítica #19: expected 'es' to be 'en'
 *   // Object.is equality
 *
 * y con el fichero restaurado vuelve a verde (3 passed).
 */
describe("el <html lang> de cada raíz (crítica #19, WCAG 3.1.1)", () => {
  it("la rama castellana hornea lang=es", () => {
    const html = renderToStaticMarkup(
      <EsLayout>
        <main id="main">contenido</main>
      </EsLayout>,
    );

    expect(langDelDocumento(html)).toBe("es");
  });

  it("la rama inglesa hornea lang=en", () => {
    const html = renderToStaticMarkup(
      <EnLayout>
        <main id="main">content</main>
      </EnLayout>,
    );

    expect(
      langDelDocumento(html),
      '/en, /en/privacy y /en/legal-notice se sirven con lang="es": el defecto P1 de la crítica #19',
    ).toBe("en");
  });

  /*
   * La 404 hornea castellano A PROPÓSITO y no es una excepción olvidada: bajo
   * `output: "export"` existe un único `out/404.html` para las dos ramas y su
   * contenido horneado ES castellano, así que `lang="es"` describe lo que el
   * documento dice de verdad. El idioma de una URL rota inglesa lo corrige
   * `NotFoundLocaleShell` + `I18nProvider` sobre el DOM vivo, y eso tiene su
   * propio candado en `app/not-found.test.tsx`.
   */
  it("la 404 global hornea lang=es, que es el idioma de su HTML estático", () => {
    const html = renderToStaticMarkup(<GlobalNotFound />);

    expect(langDelDocumento(html)).toBe("es");
  });
});

/*
 * LO QUE IMPIDE QUE EL ARREGLO SE DESHAGA POR LA PUERTA DE AL LADO.
 *
 * Los tres `it` de arriba comprueban las tres raíces que HOY existen. Este
 * bloque comprueba que sigan siendo esas tres y que el mecanismo que las hace
 * posible siga en pie: sin `experimental.globalNotFound`, la convención
 * `app/global-not-found.tsx` se ignora, la entrada `/_not-found` vuelve a
 * exigir un `layout` en el segmento raíz y el build muere con «doesn't have a
 * root layout» — o, peor, alguien lo resucita y el sitio vuelve a tener un solo
 * `lang` para los dos idiomas sin que ningún render lo cante.
 *
 * VALIDADO CON BUG INYECTADO, uno por `it` (2026-09-06). Con
 * `globalNotFound: false` en `next.config.ts`:
 *
 *   AssertionError: sin la bandera, `app/global-not-found.tsx` se ignora y el
 *   build exige un app/layout.tsx que impone un solo lang: expected 'import
 *   type { NextConfig } from "next…' to match
 *   /experimental:\s*\{[^}]*globalNotFound…/
 *
 * Con `app/global-not-found.tsx` renderizando su propio `<html>` en vez de
 * montar `RootDocument`:
 *
 *   AssertionError: expected [ 'app/global-not-found.tsx', …(1) ] to deeply
 *   equal [ 'app/RootDocument.tsx' ]
 *
 * Y con una `app/pruebas/page.tsx` fuera de las dos raíces de idioma:
 *
 *   AssertionError: pruebas/page.tsx no cuelga de ninguna raíz de idioma: su
 *   <html lang> no está decidido: expected false to be true
 *   // Object.is equality
 *
 * En los tres casos el fichero se restauró y el bloque volvió a verde.
 */
describe("la estructura que sostiene un <html lang> por rama", () => {
  it("`next.config.ts` declara experimental.globalNotFound y existe app/global-not-found.tsx", () => {
    const config = readFileSync(join(RAIZ, "next.config.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(
      config,
      "sin la bandera, `app/global-not-found.tsx` se ignora y el build exige un app/layout.tsx que impone un solo lang",
    ).toMatch(/experimental:\s*\{[^}]*globalNotFound:\s*true/);
    expect(existsSync(join(AQUI, "global-not-found.tsx"))).toBe(true);
  });

  it("NO vuelve a existir un app/layout.tsx: un root layout único impone un solo lang a los dos idiomas", () => {
    expect(existsSync(join(AQUI, "layout.tsx"))).toBe(false);
  });

  /*
   * El documento lo escribe UN solo componente. Si mañana una raíz nueva
   * renderizara su propio `<html>` en vez de montar `RootDocument`, se llevaría
   * consigo su propio `lang` —y su propio script anti-flash, y sus propias
   * fuentes— sin que los tres renders de arriba se enteren, porque solo miran
   * las raíces que ya conocen.
   */
  it("solo `RootDocument.tsx` renderiza un <html>, así que solo hay un sitio donde el lang puede escribirse", () => {
    const culpables = ficherosDeApp()
      .filter(
        (ruta) => !ruta.endsWith(".test.tsx") && !ruta.endsWith(".test.ts"),
      )
      .filter((ruta) =>
        /<html\b/.test(
          readFileSync(ruta, "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
            .replace(/\/\/.*$/gm, ""),
        ),
      )
      .map((ruta) => relative(RAIZ, ruta).replace(/\\/g, "/"));

    expect(culpables).toEqual(["app/RootDocument.tsx"]);
  });

  /*
   * Toda página cuelga de una de las dos raíces de idioma. Una `page.tsx`
   * fuera de `app/(es)/` y de `app/en/` no tendría root layout —el build
   * moriría— o lo tomaría prestado del que no le toca; en los dos casos el
   * `lang` de esa URL deja de estar decidido por su rama.
   */
  it("las seis rutas del sitio cuelgan de una de las dos raíces de idioma", () => {
    const paginas = ficherosDeApp()
      .filter((ruta) => ruta.endsWith("page.tsx"))
      .map((ruta) => relative(join(RAIZ, "app"), ruta).replace(/\\/g, "/"));

    // Sonda positiva: con el barrido vacío, el `every` de abajo pasaría por
    // vacuidad. El sitio tiene seis páginas desde el 2026-08-18.
    expect(paginas.length).toBeGreaterThanOrEqual(6);
    for (const pagina of paginas) {
      expect(
        pagina.startsWith("(es)/") || pagina.startsWith("en/"),
        `${pagina} no cuelga de ninguna raíz de idioma: su <html lang> no está decidido`,
      ).toBe(true);
    }
  });
});

/** Ficheros `.ts`/`.tsx` bajo `app/`, recursivo. */
function ficherosDeApp(dir = join(RAIZ, "app")): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...ficherosDeApp(ruta));
      continue;
    }
    if (entrada.name.endsWith(".tsx") || entrada.name.endsWith(".ts")) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}
