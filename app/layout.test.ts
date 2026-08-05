import { describe, it, expect } from "vitest";

/*
 * Candado de FUENTE, no de render (H1: leer código real antes de decidir).
 * `app/layout.tsx` invoca `Hanken_Grotesk(...)`/`JetBrains_Mono(...)` de
 * `next/font/google` en el TOP-LEVEL del módulo, así que un simple
 * `import("./layout")` ya ejecuta esas llamadas al cargar el fichero -- no
 * hace falta renderizar nada. Probado en vivo en este mismo entorno de
 * Vitest (jsdom + `@vitejs/plugin-react`, sin ningún mock de
 * `next/font/google` en `vitest.config.ts`/`vitest.setup.ts`): la importación
 * revienta con
 *
 *   TypeError: (0 , Hanken_Grotesk) is not a function
 *
 * en la línea `const fontBody = Hanken_Grotesk({...})`, porque el plugin de
 * Next que sustituye esas llamadas por los metadatos de fuente reales solo
 * existe dentro del propio `next build`/`next dev` -- Vitest no lo aplica.
 * Por eso este test lee el FICHERO con `node:fs` (mismo patrón que
 * `footer.layers.test.ts`) en vez de importar/renderizar `RootLayout`.
 */
describe(
  "app/layout.tsx — data-scroll-behavior (aviso de Next: " +
    "https://nextjs.org/docs/messages/missing-data-scroll-behavior)",
  () => {
    it('el elemento <html> declara data-scroll-behavior="smooth"', async () => {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(here, "layout.tsx"), "utf-8");

      // El docblock de arriba de este mismo elemento CITA la documentación
      // oficial, que a su vez menciona literalmente `<html>` sin atributos
      // (p.ej. "to your <html> element"). Despojar los comentarios primero
      // evita que esa cita gane la búsqueda por aparecer antes en el fichero
      // que la etiqueta JSX real -- mismo motivo que despoja comentarios
      // `footer.layers.test.ts` antes de buscar `Math.random(`.
      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      // La etiqueta de apertura de `<html>` reparte sus atributos en varias
      // líneas (`lang`, `data-scroll-behavior`, `className`), así que el
      // patrón necesita cruzar saltos de línea hasta el `>` de cierre.
      const htmlOpenTag = withoutComments.match(/<html\b[\s\S]*?>/);
      expect(htmlOpenTag).not.toBeNull();
      expect(htmlOpenTag?.[0]).toContain('data-scroll-behavior="smooth"');
    });
  },
);
