import { describe, expect, it } from "vitest";

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
 * candado lee el fichero, mismo precedente que app/layout.test.ts.
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
