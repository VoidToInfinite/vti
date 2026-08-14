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

    /*
     * `suppressHydrationWarning` en `<html>`, añadido el 2026-08-14 porque el
     * defecto OCURRIÓ: el script anti-flash del `<head>` escribe `data-theme`
     * en ese elemento antes de que React hidrate, y React avisaba en CADA
     * carga ("some attributes of the server rendered HTML didn't match").
     * El docblock del layout llegó a afirmar que la prop no hacía falta; la
     * consola con Next 16.2.11 lo refutó.
     *
     * Se ata por candado de fuente, no por render: `renderWithProviders` no
     * monta el layout raíz, así que jsdom no puede ver esta prop de ninguna
     * otra forma. Mismo patrón que ya usan `footer.layers.test.ts` y el
     * candado de `prefetch={false}` de la Task 32.
     *
     * LO QUE ESTE CANDADO PROTEGE NO ES EL SILENCIO, ES SU ALCANCE: la prop
     * suprime los mismatches de ESE elemento y no los de su subárbol
     * (verificado en navegador real inyectando un mismatch de texto dentro de
     * `About`: seguía reportándose entero con la prop puesta). Si alguien la
     * moviera a un contenedor interior para "silenciar más", empezaría a
     * tapar defectos reales -- y ahí este test dejaría de encontrarla en la
     * etiqueta de `<html>`.
     */
    it("el elemento <html> declara suppressHydrationWarning", async () => {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const here = dirname(fileURLToPath(import.meta.url));
      const source = readFileSync(join(here, "layout.tsx"), "utf-8");

      // Mismo despojado de comentarios: el docblock del propio elemento
      // NOMBRA la prop varias veces al explicar su alcance, así que sin esto
      // el test pasaría en verde aunque la prop no estuviera en el JSX.
      const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      const htmlOpenTag = withoutComments.match(/<html\b[\s\S]*?>/);
      expect(htmlOpenTag).not.toBeNull();
      expect(htmlOpenTag?.[0]).toContain("suppressHydrationWarning");
    });
  },
);

/*
 * Task 9 (anti-flash de tema), MECANISMO DE ENTREGA rehecho en Task 31:
 * candado de FUENTE de que el script de arranque está realmente cableado en
 * app/layout.tsx, con la MISMA técnica de node:fs que el bloque de arriba
 * (RootLayout no se puede importar/renderizar en Vitest, ver su docblock).
 * El candado de que el script TERMINA en el HTML exportado -- el requisito
 * literal del brief -- es un paso posterior a pnpm build (lee out/index.html,
 * verificado como parte de la verificación en navegador de Task 31, no
 * repetido aquí), fuera del alcance de lo que Vitest puede verificar sin
 * depender de que exista un build previo.
 *
 * `next/script strategy="beforeInteractive"` (Task 9 original) se RETIRÓ en
 * Task 31: verificado que, bajo `output: "export"`, no se sirve como
 * `<script>` bloqueante en `<head>` -- corre como chunk asíncrono
 * (109-208 ms tras la navegación, medido), lo bastante tarde para reflotar
 * contenido ya visible tras Task 10 (el CLS 0,0799 de la baseline reaparecía
 * en todo camino que resolviera a tema oscuro). El candado de abajo afirma
 * el mecanismo NUEVO: un `<script>` LITERAL dentro de un `<head>` explícito
 * -- el patrón canónico que la propia documentación de Next.js usa para
 * "preventing flash before hydration" -- y que YA NO se use `next/script`.
 */
describe("app/layout.tsx — anti-flash de tema (Task 9, mecanismo Task 31)", () => {
  it("monta un <script> literal dentro de <head>, con el HTML de buildThemeBootstrapScript()", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "layout.tsx"), "utf-8");

    expect(source).not.toContain('from "next/script"');
    expect(source).toContain(
      'import { buildThemeBootstrapScript } from "@/theme/resolveTheme"',
    );

    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const headBlock = withoutComments.match(/<head>[\s\S]*?<\/head>/);
    expect(
      headBlock,
      "no se encontró un <head>...</head> explícito",
    ).not.toBeNull();

    const scriptTag = headBlock?.[0].match(/<script\b[\s\S]*?\/>/);
    expect(
      scriptTag,
      "no se encontró <script ... /> dentro de <head>",
    ).not.toBeNull();
    expect(scriptTag?.[0]).toContain('id="theme-bootstrap"');
    expect(scriptTag?.[0]).not.toContain("strategy=");
    expect(scriptTag?.[0]).toContain(
      "dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }}",
    );
  });
});

/*
 * Task 13, punto 1 del brief: `viewport-fit=cover`, sin el cual
 * `env(safe-area-inset-*)` resuelve siempre al fallback (ver el docblock del
 * propio export en layout.tsx). Mismo motivo que los dos bloques de arriba
 * para leer el FICHERO con `node:fs` en vez de importar/renderizar
 * `RootLayout`: `next/font/google` revienta fuera de `next build`/`next
 * dev`. El candado de que el meta TERMINA en el HTML exportado con ese
 * valor -- el requisito literal del brief -- es un paso posterior a `pnpm
 * build` (lee `out/index.html`), fuera del alcance de lo que Vitest puede
 * verificar sin depender de un build previo.
 */
describe("app/layout.tsx — safe areas (Task 13)", () => {
  it('el export viewport declara viewportFit: "cover"', async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "layout.tsx"), "utf-8");

    // Despoja los comentarios ANTES de buscar (mismo motivo que el bloque
    // de data-scroll-behavior, arriba de este fichero): la propia línea que
    // declara viewportFit vive detrás de un docblock que la CITA -- sin
    // despojar, ese docblock ganaría la búsqueda por aparecer antes en el
    // fichero. Además, sin este paso, comentar la línea con `// ` (en vez
    // de borrarla) dejaría el candado en verde con la propiedad inactiva:
    // el texto seguiría presente dentro del comentario.
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const viewportExport = withoutComments.match(
      /export const viewport: Viewport = \{[\s\S]*?\n\};/,
    );
    expect(
      viewportExport,
      "no se encontró 'export const viewport: Viewport = {...}'",
    ).not.toBeNull();
    expect(viewportExport?.[0]).toContain('viewportFit: "cover"');
  });
});
