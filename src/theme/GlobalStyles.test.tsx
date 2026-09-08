import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, waitFor } from "@/test/test-utils";
import { HomeSections } from "@/components/sections/HomeSections";
import { THEME_ATTRIBUTE } from "@/theme/resolveTheme";
import { STORAGE_KEYS } from "@/config/storage";

/*
 * Candado del alcance de la tipografía global (2026-08-17).
 *
 * El defecto que protege: la familia tipográfica vivió scoped a `body > main`
 * desde el origen del fichero, así que TODO lo que vive fuera de `<main>`
 * —navbar, hoja de navegación móvil, footer— caía al serif por defecto del
 * navegador. Medido en el build de producción: una fila de la hoja computaba
 * "Times New Roman" mientras un párrafo de `main` computaba "Hanken Grotesk".
 * Tres rondas de crítica externa midieron tipografía siempre DENTRO de main
 * y ninguna lo vio; lo destapó la captura del footer de la 404.
 *
 * POR QUÉ ES UN CANDADO DE FUENTE y no de render (medido, no supuesto): en
 * este entorno de Vitest, montar <GlobalStyles/> con los providers reales
 * inyecta CERO hojas de estilo — document.styleSheets.length === 0 y cero
 * <style> en el documento (los styled components normales SÍ inyectan; el
 * createGlobalStyle de styled-components 6 aquí no). Sin CSSOM que leer, el
 * candado lee el fichero, mismo precedente que app/RootDocument.test.ts (que
 * se llamaba app/layout.test.ts hasta el 2026-09-06).
 *
 * La regex es templada: exige `font-family: type.fontBody` DESPUÉS de
 * `min-height: 100dvh` (única en el fichero, vive en el bloque `body`) y SIN
 * ningún cierre de bloque de primer nivel ("\n  }") entre medias — si la
 * declaración se muda fuera del bloque `body` (por ejemplo, solo quedara la
 * de `body > main`), el cierre del bloque `body` se interpone y el test cae.
 *
 * Validado con bug inyectado real: retirando la línea `font-family` del
 * bloque `body`, rojo; restaurada, verde.
 */
describe("GlobalStyles: la tipografía se declara en body, no solo en main", () => {
  it("el bloque body declara font-family type.fontBody: navbar, hoja y footer la heredan", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "GlobalStyles.tsx"), "utf-8");

    expect(
      source,
      "el bloque body perdió su font-family: todo lo que vive fuera de <main> vuelve a Times New Roman",
    ).toMatch(
      /min-height: 100dvh;(?:(?!\n {2}\})[\s\S])*?font-family: \$\{\(\{ theme \}\) => theme\.data\.type\.fontBody\};/,
    );
  });
});

/*
 * Candado del VALOR de las variables CSS de layout del navbar (crítica externa
 * #18, 2026-09-04).
 *
 * El defecto que atrapa: `--nav-gap` se declaraba como `0.5rem` escrito a
 * mano, que es `space[2]` byte a byte. Es la deriva silenciosa que la regla 17
 * de `RULES.md` previene y el caso exacto que abrió la familia
 * `spacing-literal` del detector -- el día que la escala se retoque, la
 * variable no se entera, y el CSS renderizado no distingue un literal de un
 * token que resuelven al mismo valor (`task/lessons.md`, 2026-08-12). Por eso
 * este candado mide la FUENTE, no el valor pintado: un test de valor pasaría
 * en verde con el literal de vuelta.
 *
 * POR QUÉ LEE EL FICHERO y no el CSSOM: el docblock del candado de tipografía,
 * arriba, ya lo dejó medido en este mismo entorno -- montar `<GlobalStyles/>`
 * con los providers reales inyecta CERO hojas (`document.styleSheets.length
 * === 0`), así que no hay CSSOM que interrogar.
 *
 * NO exige la forma exacta `${space[2]}`: exige que la declaración cite la
 * escala y que no lleve ninguna medida absoluta escrita a mano. Así el candado
 * sobrevive a un cambio de peldaño deliberado (`space[3]`) y sigue cayendo
 * ante una regresión a literal, que es lo que vigila.
 */
describe("GlobalStyles: --nav-gap sale de la escala de espaciado", () => {
  async function leerFuente(): Promise<string> {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    return readFileSync(join(here, "GlobalStyles.tsx"), "utf-8");
  }

  function declaracionDe(source: string, variable: string): string {
    const m = new RegExp(`--${variable}:([^;]*);`).exec(source);
    if (m === null)
      throw new Error(`no existe la declaración de --${variable}`);
    return m[1];
  }

  it("interpola el token space y no una medida escrita a mano", async () => {
    const declaracion = declaracionDe(await leerFuente(), "nav-gap");

    expect(
      declaracion,
      "--nav-gap dejó de citar la escala: el hueco de la píldora del navbar vuelve a ser un literal que se desincroniza de space",
    ).toMatch(/\$\{\s*space\[\d+\]\s*\}/);
    expect(
      declaracion,
      "--nav-gap volvió a llevar una medida absoluta escrita a mano",
    ).not.toMatch(/\d+(?:\.\d+)?(?:rem|px|em)\b/);
  });

  /*
   * SONDA NEGATIVA del mecanismo: `--nav-height` es la variable de al lado y
   * SÍ es un literal a propósito -- la escala `space` gobierna huecos entre
   * cosas, no el tamaño de las cosas, y el propio detector declara ese límite
   * ("un `--nav-height: 3.5rem` NO dispara, y es deliberado"). Si el extractor
   * de arriba estuviera roto y devolviera siempre lo mismo, esta comprobación
   * lo delataría.
   */
  it("sonda negativa: --nav-height sigue siendo un literal, y el extractor lo ve", async () => {
    const declaracion = declaracionDe(await leerFuente(), "nav-height");

    expect(declaracion).toMatch(/\d+(?:\.\d+)?rem\b/);
    expect(declaracion).not.toMatch(/\$\{\s*space\[/);
  });
});

/*
 * Candado de peso del tema oscuro, la mitad que vive en la hoja global (frente
 * U7, 2026-09-08).
 *
 * EL DEFECTO QUE ATRAPA: en una visita oscura el HTML horneado sigue siendo el
 * árbol CLARO hasta que hidrata, y sus figuras llevan `loading="lazy"`. Lo
 * único que impedía que el navegador las pidiera era la distancia al viewport,
 * y ese umbral lo decide Chrome según el tipo de conexión estimado. Medido con
 * el tipo forzado y todo lo demás idéntico: 0 B a 4g, 188.870 B a 3g y hasta
 * 538.720 B a 2g de arte pedido y jamás pintado. La regla
 * `:root[data-theme="dark"] img[src^="/figures/"] { display: none }` le quita
 * la caja, y un elemento sin caja no interseca nunca.
 *
 * LAS DOS MITADES, Y POR QUÉ NINGUNA SOBRA. La primera lee la FUENTE, mismo
 * precedente que los dos candados de arriba: `createGlobalStyle` no inyecta ni
 * una hoja en este entorno, así que no hay CSSOM que interrogar. La segunda
 * afirma lo que la regla DA POR HECHO -- que la rama oscura no pinta ninguna
 * figura de `/figures/` --, porque el día que alguien añada una, la regla la
 * borraría de la pantalla y el candado tiene que hablar antes que el navegador.
 * Su control claro es la guarda de vacuidad: si el árbol dejara de tener
 * figuras en los DOS temas, el cero del oscuro no diría nada.
 *
 * Validado con bug inyectado real: quitando la regla del fichero, el primero en
 * rojo; devolviendo la rama clara de Journey a la rama oscura (una `<img
 * src="/figures/...">` montada en oscuro), el segundo en rojo.
 */
describe("GlobalStyles: en oscuro el árbol claro horneado no pide su arte", () => {
  it("la hoja global le quita la caja a toda figura en una visita oscura", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "GlobalStyles.tsx"), "utf-8");

    expect(
      source,
      "sin esta regla, una visita oscura con conexión estimada lenta descarga hasta 538.720 B de figuras claras que no pinta jamás",
    ).toMatch(
      /:root\[data-theme="dark"\] img\[src\^="\/figures\/"\] \{\s*display: none;\s*\}/,
    );
  });

  describe("la afirmación que la regla da por hecha", () => {
    beforeEach(() => {
      window.localStorage.clear();
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
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
      window.localStorage.clear();
      document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    });

    const figurasDe = (container: HTMLElement): string[] =>
      [...container.querySelectorAll("img")]
        .map((img) => img.getAttribute("src") ?? "")
        .filter((src) => src.startsWith("/figures/"));

    it("la rama OSCURA no monta ni una figura, así que la regla no puede borrar nada visible", async () => {
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
      const { container } = renderWithProviders(<HomeSections />);

      await waitFor(() => {
        expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(
          "dark",
        );
      });

      expect(
        figurasDe(container),
        "la rama oscura monta una figura de /figures/: la regla global de GlobalStyles la está borrando de la pantalla",
      ).toEqual([]);
    });

    it("control de vacuidad: la rama CLARA sí monta figuras", () => {
      window.localStorage.setItem(STORAGE_KEYS.theme, "light");
      const { container } = renderWithProviders(<HomeSections />);

      expect(figurasDe(container).length).toBeGreaterThan(0);
    });
  });
});
