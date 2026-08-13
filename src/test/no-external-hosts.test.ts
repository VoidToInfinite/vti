import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Task 18 (M5, "privacidad radical a la superficie") -- candado-CANDADO del
 * hecho que la nueva línea de `Contact.tsx` (`ScPrivacyNote`, clave
 * `Home.contact.privacyNote`) pone en la superficie: este sitio no hace
 * peticiones a terceros. La auditoría de craft (`design-taste-frontend`,
 * 2026-08-08) lo calificó como "la única prueba sostenible del sitio con el
 * código delante", y las mediciones CWV del gate F2 solo registraron
 * peticiones al propio origen en los 5 escenarios -- este test es la versión
 * ESTÁTICA y determinista de esa misma comprobación: ningún `https?://`
 * hardcodeado en `src/` NI EN `app/` puede resolver a un host fuera de una
 * allowlist documentada, uno por uno, con el motivo de por qué NO es una
 * petición del sitio a un tercero.
 *
 * Fix de revisión (2026-08-12): la primera versión de este candado solo
 * escaneaba `src/`. `app/layout.tsx` -- el sitio CANÓNICO donde Next.js
 * espera que se pegue un snippet de analítica de terceros (`<Script
 * src="https://…">` en el `<head>`/`<body>` del layout raíz) -- quedaba
 * fuera: un rastreador añadido ahí habría pasado el gate en verde mientras
 * la interfaz seguía afirmando "no hay analítica ni rastreo". Verificado hoy
 * (review de rama) que la afirmación SIGUE siendo cierta -- el HTML
 * exportado no contiene ningún host de terceros -- pero eso era una
 * propiedad del código actual, no del candado: el candado no lo habría
 * detectado si dejara de serlo. Ahora escanea las dos raíces del código de
 * aplicación real de este repo: `src/` y `app/` (rutas del App Router,
 * metadata técnica -- `sitemap.ts`/`robots.ts`/`opengraph-image.tsx` -- y
 * sus tests).
 *
 * `next/font/google` (import real en `app/layout.tsx`, `Hanken_Grotesk`/
 * `JetBrains_Mono`) es el contraejemplo que cualquiera va a buscar al leer
 * "no hay peticiones a terceros" con ese import delante -- y NO lo es: Next
 * self-hospeda los ficheros de fuente en `build time` (los descarga UNA vez
 * al compilar y los sirve como asset propio, `/​_next/static/media/*.woff2`,
 * mismo origen que el resto del sitio) en vez de que el NAVEGADOR del
 * visitante pida nada a `fonts.googleapis.com`/`fonts.gstatic.com` en
 * tiempo de carga -- documentado por Next.js como el motivo de ser de la
 * optimización (https://nextjs.org/docs/app/getting-started/fonts, "no
 * requests are sent to Google by the browser"). No hay ningún literal
 * `https?://fonts.g*` en el código fuente -- el propio import
 * `from "next/font/google"` es una cadena de módulo (`node_modules`), no una
 * URL, y este candado nunca la habría visto de todas formas (el patrón solo
 * busca literales `https?://`).
 *
 * Deliberadamente NO se intenta distinguir "código que se ejecuta en el
 * navegador" de "comentario de test" o "cita de especificación": el brief de
 * la tarea (`task-18-brief.md`, punto 3) pide "un hostname externo en src/"
 * a secas, y separar ambos casos habría exigido parsear AST para diferenciar
 * un string literal de un comentario -- justo la clase de fragilidad que el
 * propio brief autoriza a documentar y omitir. La alternativa elegida (grep
 * de texto + allowlist de HOSTS, no de URLs completas) es simple, no
 * depende de qué archivo concreto cite la URL, y el repo real solo tiene
 * nueve hosts distintos citados en total entre las dos raíces (verificado
 * con `grep -rnoE "https?://[a-zA-Z0-9.:_/-]+" src/ app/` al escribir esta
 * revisión) -- lejos de la "llena de excepciones" que el brief advierte como
 * señal para omitir el candado.
 *
 * Los NUEVE hosts de la allowlist, y por qué ninguno es una petición del
 * SITIO a un tercero:
 *
 * - `schema.org`: identificador de vocabulario JSON-LD (`@context`/`@type`
 *   en `src/seo/jsonLd.ts`) -- un dato declarativo dentro de un `<script
 *   type="application/ld+json">`, nunca una URL que el navegador solicite.
 * - `developers.google.com` / `datatracker.ietf.org`: citas de
 *   especificación en comentarios de `src/test/assets-budget.test.ts`
 *   (protocolo de veracidad, §0 de CLAUDE.md) -- texto de documentación, no
 *   código que se ejecute ni se sirva.
 * - `nextjs.org`: cita de documentación oficial en un comentario de
 *   `app/layout.tsx` (y su test, `app/layout.test.ts`) explicando por qué
 *   hace falta `data-scroll-behavior="smooth"` en `<html>` -- mismo caso que
 *   `developers.google.com`/`datatracker.ietf.org`, texto de documentación
 *   citado con su URL, no una petición de red.
 * - `voidtoinfinite.com`: el dominio CANÓNICO del propio sitio
 *   (`src/config/site.ts`, metadata/sitemap/`src/config/site.test.ts`, y
 *   `app/not-found.tsx`/su test) -- no es un tercero, es el sitio hablando
 *   de sí mismo.
 * - `dev.voidtoinfinite.com`: subdominio propio del SDK (`links.playground`/
 *   `links.sdk`, `src/config/links.ts`) -- un DESTINO al que el CTA del hero
 *   navega si el visitante lo pulsa, no una petición que el sitio dispare
 *   por su cuenta.
 * - `github.com` / `discord.gg`: mismo caso -- destinos de las tarjetas de
 *   comunidad de `Contact.tsx`/`Footer.tsx` (`links.github`/`links.discord`),
 *   navegación del usuario, no petición del sitio.
 * - `example.invalid`: TLD reservado por RFC 2606 (ver el docblock de
 *   `links.ts`), usado como marcador en `Button.test.tsx` -- no resuelve a
 *   ningún host real.
 *
 * Verificado con el bug inyectado a propósito (regla 34 de RULES.md, informe
 * de la tarea): añadir temporalmente a este mismo fichero una constante con
 * una URL absoluta de esquema https hacia el host `plausible.io` (el
 * separador de esquema se omite EN ESTE PÁRRAFO a propósito, para que la
 * propia documentación del candado no dispare el candado que documenta) puso
 * el test en rojo, señalando exactamente ese host; retirada la línea, el
 * test volvió a verde. Re-verificado en esta revisión: un `<Script src="`
 * seguido del esquema https y el host `tracker.example` (mismo truco de
 * separar el esquema del host EN ESTE PÁRRAFO, por el mismo motivo) temporal
 * en `app/layout.tsx` -- el sitio que motivó cubrir `app/` -- también puso
 * el test en rojo, señalando ese host; retirado, volvió a verde.
 */

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(srcRoot, "..");
const appRoot = join(repoRoot, "app");

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".json"]);

/** Recorre `dir` recursivamente y devuelve las rutas de los ficheros a escanear. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.has(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/** Las dos raíces de código de aplicación real de este repo: `src/` y las
 *  rutas del App Router en `app/` (Task 18, fix de revisión 2026-08-12). */
function collectScanFiles(): string[] {
  return [...walk(srcRoot), ...walk(appRoot)];
}

const ALLOWED_HOSTS = new Set([
  "schema.org",
  "developers.google.com",
  "datatracker.ietf.org",
  "nextjs.org",
  "voidtoinfinite.com",
  "dev.voidtoinfinite.com",
  "github.com",
  "discord.gg",
  "www.linkedin.com",
  "example.invalid",
]);

/** Captura el host de una URL http(s): todo hasta el primer `/`, `:`, `?` o `#`. */
const URL_PATTERN = /https?:\/\/([a-zA-Z0-9.-]+)(?:[/:?#][^\s"'`)]*)?/g;

describe("Task 18: cero hostnames externos fuera de la allowlist documentada", () => {
  it("todo https?:// hardcodeado en src/ o app/ resuelve a un host de ALLOWED_HOSTS", () => {
    const files = collectScanFiles();
    const offenders: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const match of content.matchAll(URL_PATTERN)) {
        const host = match[1];
        if (!ALLOWED_HOSTS.has(host)) {
          const relative = file.slice(repoRoot.length + 1).replace(/\\/g, "/");
          offenders.push(`${relative}: ${match[0]} (host ${host})`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  // Sonda positiva: si la allowlist estuviera vacía o el patrón no
  // encontrara nada, el test de arriba pasaría por VACUIDAD (ningún host
  // detectado en absoluto), no porque el repo esté limpio de verdad. Esto
  // confirma que el mecanismo SÍ encuentra URLs reales.
  it("sonda positiva: el propio repo cita al menos un host de cada categoria de la allowlist", () => {
    const files = collectScanFiles();
    const hostsFound = new Set<string>();
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const match of content.matchAll(URL_PATTERN)) {
        hostsFound.add(match[1]);
      }
    }
    expect(hostsFound.size).toBeGreaterThan(0);
    expect(hostsFound.has("github.com")).toBe(true);
    expect(hostsFound.has("discord.gg")).toBe(true);
  });

  // Sonda positiva especifica de esta revision: si `collectScanFiles()`
  // dejara de escanear `app/` (la regresion original de este candado), este
  // test pasaria por VACUIDAD igual que el de arriba -- confirma que la raiz
  // `app/` concreta SI se recorre, no solo que "algun host" aparezca.
  it("sonda positiva: el candado SI escanea app/ (fix de revision 2026-08-12)", () => {
    const files = collectScanFiles();
    const relativePaths = files.map((f) =>
      f.slice(repoRoot.length + 1).replace(/\\/g, "/"),
    );
    expect(relativePaths.some((p) => p.startsWith("app/"))).toBe(true);
    expect(relativePaths).toContain("app/layout.tsx");

    const hostsFound = new Set<string>();
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const match of content.matchAll(URL_PATTERN)) {
        hostsFound.add(match[1]);
      }
    }
    // nextjs.org solo aparece hoy en app/layout.tsx y app/layout.test.ts --
    // si esta asercion pasa es porque app/ se recorrio de verdad.
    expect(hostsFound.has("nextjs.org")).toBe(true);
  });
});
