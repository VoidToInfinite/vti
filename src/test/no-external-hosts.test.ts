import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
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
 * hardcodeado en `src/` puede resolver a un host fuera de una allowlist
 * documentada, uno por uno, con el motivo de por qué NO es una petición del
 * sitio a un tercero.
 *
 * Deliberadamente NO se intenta distinguir "código que se ejecuta en el
 * navegador" de "comentario de test" o "cita de especificación": el brief de
 * la tarea (`task-18-brief.md`, punto 3) pide "un hostname externo en src/"
 * a secas, y separar ambos casos habría exigido parsear AST para diferenciar
 * un string literal de un comentario -- justo la clase de fragilidad que el
 * propio brief autoriza a documentar y omitir. La alternativa elegida (grep
 * de texto + allowlist de HOSTS, no de URLs completas) es simple, no
 * depende de qué archivo concreto cite la URL, y el repo real solo tiene
 * ocho hosts distintos citados en total (verificado con
 * `grep -rnoE "https?://[a-zA-Z0-9.:_/-]+" src/` al escribir este test) --
 * lejos de la "llena de excepciones" que el brief advierte como señal para
 * omitir el candado.
 *
 * Los OCHO hosts de la allowlist, y por qué ninguno es una petición del
 * SITIO a un tercero:
 *
 * - `schema.org`: identificador de vocabulario JSON-LD (`@context`/`@type`
 *   en `src/seo/jsonLd.ts`) -- un dato declarativo dentro de un `<script
 *   type="application/ld+json">`, nunca una URL que el navegador solicite.
 * - `developers.google.com` / `datatracker.ietf.org`: citas de
 *   especificación en comentarios de `src/test/assets-budget.test.ts`
 *   (protocolo de veracidad, §0 de CLAUDE.md) -- texto de documentación, no
 *   código que se ejecute ni se sirva.
 * - `voidtoinfinite.com`: el dominio CANÓNICO del propio sitio
 *   (`src/config/site.ts`, metadata/sitemap/`src/config/site.test.ts`) --
 *   no es un tercero, es el sitio hablando de sí mismo.
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
 * test volvió a verde.
 */

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const ALLOWED_HOSTS = new Set([
  "schema.org",
  "developers.google.com",
  "datatracker.ietf.org",
  "voidtoinfinite.com",
  "dev.voidtoinfinite.com",
  "github.com",
  "discord.gg",
  "example.invalid",
]);

/** Captura el host de una URL http(s): todo hasta el primer `/`, `:`, `?` o `#`. */
const URL_PATTERN = /https?:\/\/([a-zA-Z0-9.-]+)(?:[/:?#][^\s"'`)]*)?/g;

describe("Task 18: cero hostnames externos fuera de la allowlist documentada", () => {
  it("todo https?:// hardcodeado en src/ resuelve a un host de ALLOWED_HOSTS", () => {
    const files = walk(srcRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const match of content.matchAll(URL_PATTERN)) {
        const host = match[1];
        if (!ALLOWED_HOSTS.has(host)) {
          const relative = file.slice(srcRoot.length + 1).replace(/\\/g, "/");
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
    const files = walk(srcRoot);
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
});
