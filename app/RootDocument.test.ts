import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, it, expect } from "vitest";

/*
 * ESTE FICHERO SE LLAMABA `app/layout.test.ts` HASTA EL 2026-09-06 y cubría
 * `app/layout.tsx`, el root layout único. Ese fichero desapareció al arreglar
 * el `<html lang>` por rama (P1 de la crítica externa #19): hoy el documento lo
 * escribe `app/RootDocument.tsx` y los exports de metadata viven en
 * `app/rootMetadata.ts`. Ninguna de las condiciones que se protegían aquí se ha
 * aflojado — se han movido al fichero donde ahora vive lo que vigilan, y dos de
 * ellas se han reforzado (ver los bloques de `themeColor` y de los exports
 * compartidos).
 *
 * Candado de FUENTE, no de render (H1: leer código real antes de decidir).
 * `app/RootDocument.tsx` invoca `Hanken_Grotesk(...)`/`JetBrains_Mono(...)` de
 * `next/font/google` en el TOP-LEVEL del módulo, así que un simple
 * `import("./RootDocument")` ya ejecuta esas llamadas al cargar el fichero.
 * Probado en vivo en este mismo entorno de Vitest (jsdom +
 * `@vitejs/plugin-react`, sin ningún mock de `next/font/google` en
 * `vitest.config.ts`/`vitest.setup.ts`): el módulo que importa `next/font/
 * google` trae dos claves (`default`, `module.exports`) y la llamada revienta
 * con
 *
 *   TypeError: (0 , Hanken_Grotesk) is not a function
 *
 * porque el plugin de Next que sustituye esas llamadas por los metadatos de
 * fuente reales solo existe dentro del propio `next build`/`next dev` -- Vitest
 * no lo aplica. Por eso este test lee el FICHERO con `node:fs` (mismo patrón
 * que `footer.layers.test.ts`) en vez de importar/renderizar `RootDocument`.
 * Donde sí hace falta renderizarlo —el `<html lang>` de cada raíz— se hace en
 * `app/root-lang.test.tsx`, que sustituye `next/font/google` por un doble con
 * la misma forma y lo declara.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

function fuente(...ruta: string[]): string {
  return readFileSync(join(AQUI, ...ruta), "utf-8");
}

/**
 * La misma fuente sin comentarios. Se despoja SIEMPRE antes de buscar: los
 * docblocks de este repo citan literalmente lo que declaran, así que sin esto
 * la cita ganaría la búsqueda y comentar la línea real dejaría el candado en
 * verde (lección del 2026-08-11).
 */
function fuenteSinComentarios(...ruta: string[]): string {
  return fuente(...ruta)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\/.*$/gm, "");
}

describe(
  "app/RootDocument.tsx — data-scroll-behavior (aviso de Next: " +
    "https://nextjs.org/docs/messages/missing-data-scroll-behavior)",
  () => {
    it('el elemento <html> declara data-scroll-behavior="smooth"', () => {
      // La etiqueta de apertura de `<html>` reparte sus atributos en varias
      // líneas (`lang`, `data-scroll-behavior`, `className`), así que el
      // patrón necesita cruzar saltos de línea hasta el `>` de cierre.
      const htmlOpenTag =
        fuenteSinComentarios("RootDocument.tsx").match(/<html\b[\s\S]*?>/);
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
     * LO QUE ESTE CANDADO PROTEGE NO ES EL SILENCIO, ES SU ALCANCE: la prop
     * suprime los mismatches de ESE elemento y no los de su subárbol
     * (verificado en navegador real inyectando un mismatch de texto dentro de
     * `About`: seguía reportándose entero con la prop puesta). Si alguien la
     * moviera a un contenedor interior para "silenciar más", empezaría a
     * tapar defectos reales -- y ahí este test dejaría de encontrarla en la
     * etiqueta de `<html>`.
     */
    it("el elemento <html> declara suppressHydrationWarning", () => {
      const htmlOpenTag =
        fuenteSinComentarios("RootDocument.tsx").match(/<html\b[\s\S]*?>/);
      expect(htmlOpenTag).not.toBeNull();
      expect(htmlOpenTag?.[0]).toContain("suppressHydrationWarning");
    });
  },
);

/*
 * Task 9 (anti-flash de tema), MECANISMO DE ENTREGA rehecho en Task 31:
 * candado de FUENTE de que el script de arranque está realmente cableado en el
 * documento, con la MISMA técnica de node:fs que el bloque de arriba
 * (`RootDocument` no se puede importar sin doblar `next/font/google`, ver su
 * docblock). El candado de que el script TERMINA en el HTML exportado -- el
 * requisito literal del brief -- es un paso posterior a pnpm build (lee
 * out/index.html; verificado el 2026-09-06 sobre las OCHO páginas del build,
 * las dos portadas, las cuatro legales y las dos 404: `id="theme-bootstrap"`
 * aparece una vez en cada una), fuera del alcance de lo que Vitest puede
 * verificar sin depender de que exista un build previo.
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
describe("app/RootDocument.tsx — anti-flash de tema (Task 9, mecanismo Task 31)", () => {
  it("monta un <script> literal dentro de <head>, con el HTML de buildThemeBootstrapScript()", () => {
    const source = fuente("RootDocument.tsx");

    expect(source).not.toContain('from "next/script"');
    /*
     * Se comprueba el SÍMBOLO importado y su módulo, no la línea de import
     * completa: desde la Ola C (2026-08-16) ese import trae además
     * `THEME_COLORS`, y exigir el literal exacto convertía este candado en un
     * test de cómo Prettier ordena una lista de imports.
     */
    expect(source).toMatch(
      /import \{[^}]*buildThemeBootstrapScript[^}]*\} from "@\/theme\/resolveTheme"/,
    );

    const withoutComments = fuenteSinComentarios("RootDocument.tsx");

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
    /*
     * Se comprueba el MECANISMO (`dangerouslySetInnerHTML` alimentado por el
     * constructor del script), no la línea entera formateada: desde la Ola A.1
     * (2026-08-16) la llamada recibe `EYE_PRELOADS` y Prettier la parte en
     * varias líneas, así que exigir el literal exacto convertía este candado en
     * un test de formato. Lo que NO puede cambiar sin que esto se entere es que
     * el `<script>` siga recibiendo su contenido del constructor y no de otra
     * fuente.
     */
    expect(scriptTag?.[0]).toContain("dangerouslySetInnerHTML");
    expect(scriptTag?.[0]).toMatch(/__html:\s*buildThemeBootstrapScript\(/);
    expect(
      scriptTag?.[0],
      "el script de arranque dejó de recibir las precargas del arte oscuro (Ola A.1): sin ellas el LCP oscuro vuelve a 10,4 s",
    ).toContain("EYE_PRELOADS");
    expect(
      scriptTag?.[0],
      "el script de arranque dejó de recibir las precargas del arte claro (2026-08-17): desde que el HTML estático no emite los <img> de Aura, ésta es la única precarga que le queda al visitante claro",
    ).toContain("AURA_PRELOADS");
  });
});

/*
 * Task 13, punto 1 del brief: `viewport-fit=cover`, sin el cual
 * `env(safe-area-inset-*)` resuelve siempre al fallback (ver el docblock del
 * propio export en `app/rootMetadata.ts`). Mismo motivo que los bloques de
 * arriba para leer el FICHERO con `node:fs`. El candado de que el meta TERMINA
 * en el HTML exportado con ese valor -- el requisito literal del brief -- es un
 * paso posterior a `pnpm build` (verificado el 2026-09-06 en las ocho páginas:
 * `<meta name="viewport" content="width=device-width, initial-scale=1,
 * viewport-fit=cover">`, una sola etiqueta por documento), fuera del alcance de
 * lo que Vitest puede verificar sin depender de un build previo.
 */
describe("app/rootMetadata.ts — safe areas (Task 13)", () => {
  it('ROOT_VIEWPORT declara viewportFit: "cover"', () => {
    const viewportExport = fuenteSinComentarios("rootMetadata.ts").match(
      /export const ROOT_VIEWPORT: Viewport = \{[\s\S]*?\n\};/,
    );
    expect(
      viewportExport,
      "no se encontró 'export const ROOT_VIEWPORT: Viewport = {...}'",
    ).not.toBeNull();
    expect(viewportExport?.[0]).toContain('viewportFit: "cover"');
  });
});

/*
 * `viewport` NO declara `themeColor` (2026-09-03, critica #16, hallazgo P1 del
 * evaluador tecnico B1). Declararlo es lo que hacia que React 19 insertara una
 * SEGUNDA `meta[name="theme-color"]` al hidratar: su cache de elementos
 * «hoistable» busca la etiqueta a la que engancharse indexandola por el
 * atributo `content` (rama `case "meta"` de `commitMutationEffectsOnFiber` en
 * `react-dom-client.development.js`), y el script de arranque acababa de
 * cambiar ese `content` de `#FAFAFA` a `#280739` en cada visita oscura. Traza
 * medida en Chrome real contra el build de produccion:
 *
 *   t=  24  1 meta  [#280739]            <- el script de arranque, pre-pintado
 *   t= 204  2 metas [#280739, #FAFAFA]   <- React inserta la segunda, en claro
 *   t= 214  2 metas [#FAFAFA, #FAFAFA]   <- el efecto de ThemeProvider (ya corregido)
 *   t= 282  2 metas [#280739, #280739]
 *
 * Hoy la etiqueta la CREA y la posee el script de arranque, y es unica (los
 * candados del desenlace estan en `src/theme/resolveTheme.test.ts`). Este es de
 * FUENTE, con la misma tecnica de `node:fs` que el resto del fichero: reponer
 * `themeColor` reintroduce el duplicado sin que ningun test de jsdom pueda
 * verlo, porque el duplicado lo crea React durante una hidratacion real.
 *
 * SE REFUERZA EL 2026-09-06: hasta esa fecha el candado miraba UN objeto
 * `viewport` en UN fichero. Desde que hay tres ficheros de convención que
 * exportan `viewport` (los dos root layouts de idioma y `global-not-found`),
 * mirar uno solo dejaría abiertas tres puertas nuevas, así que se barre `app/`
 * entero: `themeColor` no puede aparecer en ningún fichero de producción.
 */
describe("app/ — theme-color no se declara en ningún viewport (critica #16)", () => {
  it("ROOT_VIEWPORT no declara themeColor: la etiqueta la crea el script de arranque", () => {
    const viewportExport = fuenteSinComentarios("rootMetadata.ts").match(
      /export const ROOT_VIEWPORT: Viewport = \{[\s\S]*?\n\};/,
    );
    expect(viewportExport).not.toBeNull();
    expect(
      viewportExport?.[0],
      "ROOT_VIEWPORT volvió a declarar themeColor: React insertará una segunda meta[name=theme-color] al hidratar (crítica #16)",
    ).not.toContain("themeColor");
  });

  it("ningún fichero de app/ declara themeColor, ni siquiera fuera de este módulo", () => {
    const culpables = ficherosDeApp()
      .filter((ruta) => !/\.test\.tsx?$/.test(ruta))
      .filter((ruta) =>
        fuenteSinComentarios(relative(AQUI, ruta)).includes("themeColor"),
      )
      .map((ruta) => relative(AQUI, ruta).replace(/\\/g, "/"));

    expect(culpables).toEqual([]);
  });
});

/*
 * LAS TRES RAÍCES DECLARAN EL MISMO DOCUMENTO (2026-09-06).
 *
 * El riesgo que aparece con la partición por idioma: Next lee `metadata` y
 * `viewport` del FICHERO de cada convención, así que ahora hay TRES sitios
 * donde declararlos y tres oportunidades de que uno se quede atrás — la
 * portada inglesa sin `viewport-fit=cover`, o la 404 sin `metadataBase` (que
 * es exactamente lo que pasaba antes de esta entrega: la heredaba del root
 * layout, y al quedarse sin padre la imagen de Open Graph habría salido con
 * URL relativa).
 *
 * El candado no compara los valores uno a uno: exige que los tres exporten LO
 * MISMO, el valor compartido de `app/rootMetadata.ts`. Un cuarto fichero de
 * convención que declarara su propio objeto entraría en el barrido el día que
 * se cree.
 */
describe("app/ — las tres raíces exportan el documento compartido", () => {
  const RAICES = [
    ["(es)/layout.tsx", "ROOT_METADATA", "ROOT_VIEWPORT"],
    ["en/layout.tsx", "ROOT_METADATA", "ROOT_VIEWPORT"],
    ["global-not-found.tsx", "...ROOT_METADATA", "ROOT_VIEWPORT"],
  ] as const;

  it.each(RAICES)(
    "%s toma su metadata y su viewport de rootMetadata.ts",
    (fichero, metadataEsperada, viewportEsperado) => {
      const source = fuenteSinComentarios(...fichero.split("/"));

      expect(source).toMatch(
        /import \{[^}]*ROOT_METADATA[^}]*\} from "[^"]*rootMetadata"/,
      );
      expect(source).toMatch(
        new RegExp(
          `export const metadata: Metadata = \\{?\\s*${metadataEsperada.replace(
            /\./g,
            "\\.",
          )}`,
        ),
      );
      expect(source).toContain(
        `export const viewport: Viewport = ${viewportEsperado};`,
      );
    },
  );
});

/** Ficheros `.ts`/`.tsx` bajo `app/`, recursivo. */
function ficherosDeApp(dir = AQUI): string[] {
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
