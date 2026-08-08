import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { STORAGE_REGISTRY } from "./storage";

describe("STORAGE_REGISTRY", () => {
  it("declara exactamente vti-theme y vti-lang", () => {
    const ids = STORAGE_REGISTRY.map((entry) => entry.id).sort();
    expect(ids).toEqual(["vti-lang", "vti-theme"]);
  });

  it("los id no se repiten", () => {
    const ids = STORAGE_REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * Candado del hecho legal que sostiene la ausencia de banner (2026-08-08):
   * todo lo que este sitio escribe es de PRIMERA PARTE. En el momento en que
   * alguien declare aquí una entrada de un tercero, el análisis del art. 22.2
   * LSSI-CE deja de sostenerse y hace falta consentimiento previo — este test
   * es el punto en el que esa decisión tiene que pasar por revisión, en vez de
   * colarse con una línea más en el array.
   */
  it("todo el almacenamiento declarado es de primera parte", () => {
    for (const entry of STORAGE_REGISTRY) {
      expect(entry.provider, `${entry.id} no es de primera parte`).toBe(
        "first-party",
      );
    }
  });

  /*
   * Candado de la retirada del sistema de consentimiento: `vti-consent` era la
   * entrada que guardaba la decisión del banner. Sin banner no hay decisión
   * que guardar, y reintroducir la clave sin reintroducir el mecanismo
   * completo dejaría almacenamiento huérfano en el equipo del visitante.
   */
  it("no queda rastro de vti-consent", () => {
    expect(STORAGE_REGISTRY.map((entry) => entry.id)).not.toContain(
      "vti-consent",
    );
  });
});

/**
 * Candado de sincronía con el código real: `vti-theme` y `vti-lang` no viven
 * importados desde ningún módulo — son literales de `localStorage` en
 * `ThemeProvider.tsx`/`I18nProvider.tsx`, así que la única forma de que
 * renombrar uno de esos literales rompa ESTE test es leer el CÓDIGO FUENTE
 * real de esos ficheros y comparar contra el `id` declarado aquí. Mismo patrón
 * que `Contact.test.tsx` y `footer.layers.test.ts`. Sin este candado,
 * `STORAGE_REGISTRY` podría declarar `vti-theme` mientras el código de verdad
 * ya usara otra clave, y la política de privacidad no se enteraría.
 */
describe("sincronía de STORAGE_REGISTRY con las claves de localStorage reales", () => {
  const here = dirname(fileURLToPath(import.meta.url));

  it("'vti-theme' es la clave real que usa ThemeProvider.tsx", () => {
    const source = readFileSync(
      join(here, "..", "theme", "ThemeProvider.tsx"),
      "utf-8",
    );
    // Sonda positiva: el fichero SÍ declara una STORAGE_KEY -- así una
    // lectura del fichero equivocado (o uno vacío) no pasaría por vacuidad.
    expect(source).toMatch(/const STORAGE_KEY = "[^"]+"/);
    expect(source).toContain('const STORAGE_KEY = "vti-theme"');
    expect(STORAGE_REGISTRY.some((entry) => entry.id === "vti-theme")).toBe(
      true,
    );
  });

  it("'vti-lang' es la clave real que usa I18nProvider.tsx", () => {
    const source = readFileSync(
      join(here, "..", "i18n", "I18nProvider.tsx"),
      "utf-8",
    );
    expect(source).toMatch(/const STORAGE_KEY = "[^"]+"/);
    expect(source).toContain('const STORAGE_KEY = "vti-lang"');
    expect(STORAGE_REGISTRY.some((entry) => entry.id === "vti-lang")).toBe(
      true,
    );
  });
});
