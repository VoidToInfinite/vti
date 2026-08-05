import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ALWAYS_ON_CATEGORY,
  CONSENT_CATEGORIES,
  STORAGE_REGISTRY,
  storageByCategory,
} from "./cookies";

describe("STORAGE_REGISTRY", () => {
  it("tiene exactamente 3 entradas", () => {
    expect(STORAGE_REGISTRY).toHaveLength(3);
  });

  it("las tres entradas son 'necessary' -- si alguien añade almacenamiento no exento sin pensarlo, este test avisa", () => {
    for (const entry of STORAGE_REGISTRY) {
      expect(entry.category).toBe("necessary");
    }
  });

  it("los id no se repiten", () => {
    const ids = STORAGE_REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declara exactamente vti-theme, vti-lang y vti-consent", () => {
    const ids = STORAGE_REGISTRY.map((entry) => entry.id).sort();
    expect(ids).toEqual(["vti-consent", "vti-lang", "vti-theme"]);
  });
});

describe("storageByCategory", () => {
  it("'analytics' está vacía -- cero scripts de terceros hoy", () => {
    expect(storageByCategory("analytics")).toEqual([]);
  });

  it("'marketing' está vacía -- cero scripts de terceros hoy", () => {
    expect(storageByCategory("marketing")).toEqual([]);
  });

  it("'necessary' devuelve las 3 entradas, en el orden de declaración", () => {
    expect(storageByCategory("necessary").map((entry) => entry.id)).toEqual([
      "vti-theme",
      "vti-lang",
      "vti-consent",
    ]);
  });
});

describe("CONSENT_CATEGORIES / ALWAYS_ON_CATEGORY", () => {
  it("CONSENT_CATEGORIES incluye a ALWAYS_ON_CATEGORY", () => {
    expect(CONSENT_CATEGORIES).toContain(ALWAYS_ON_CATEGORY);
  });

  it("ALWAYS_ON_CATEGORY es 'necessary'", () => {
    expect(ALWAYS_ON_CATEGORY).toBe("necessary");
  });

  it("expone exactamente necessary, analytics y marketing, en ese orden", () => {
    expect(CONSENT_CATEGORIES).toEqual(["necessary", "analytics", "marketing"]);
  });
});

/**
 * Candado de sincronía con el código real (encargo del flujo S2, spec §1):
 * `vti-theme` y `vti-lang` no viven importados desde ningún módulo -- son
 * literales de `localStorage` en `ThemeProvider.tsx`/`I18nProvider.tsx`, así
 * que la única forma de que renombrar uno de esos literales rompa ESTE test
 * es leer el CÓDIGO FUENTE real de esos ficheros y comparar contra el `id`
 * declarado aquí. Mismo patrón que `Contact.test.tsx` (lectura de
 * `readFileSync` sobre el propio fichero fuente) y `footer.layers.test.ts`.
 * Sin este candado, `STORAGE_REGISTRY` podría declarar `vti-theme` mientras
 * el código de verdad ya hubiera pasado a usar otra clave, y ni la política
 * de privacidad ni el panel de preferencias se enterarían.
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
