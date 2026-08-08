import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
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
 * Candado de sincronía con el código real, adaptado a la centralización de
 * esta entrega. ANTES `ThemeProvider.tsx`/`I18nProvider.tsx` declaraban su
 * propio literal `const STORAGE_KEY = "vti-theme"` / `"vti-lang"`, y este
 * test comparaba ese literal contra `STORAGE_REGISTRY` para detectar un
 * rename que los desincronizara. AHORA los dos importan `STORAGE_KEYS` de
 * `storage.ts`, así que ya no PUEDEN divergir por construcción -- lo que
 * queda por comprobar, leyendo el CÓDIGO FUENTE real (mismo patrón que
 * `Contact.test.tsx` y `footer.layers.test.ts`), es que de verdad importan
 * de aquí y no han vuelto a declarar un literal propio.
 */
describe("sincronía de STORAGE_REGISTRY con las claves de localStorage reales", () => {
  const here = dirname(fileURLToPath(import.meta.url));

  it("ThemeProvider.tsx importa STORAGE_KEYS.theme en vez de declarar su propio literal", () => {
    const source = readFileSync(
      join(here, "..", "theme", "ThemeProvider.tsx"),
      "utf-8",
    );
    expect(source).toContain('import { STORAGE_KEYS } from "@/config/storage"');
    expect(source).toContain("STORAGE_KEYS.theme");
    expect(source).not.toMatch(/const STORAGE_KEY\s*=\s*"vti-/);
    expect(STORAGE_REGISTRY.some((entry) => entry.id === "vti-theme")).toBe(
      true,
    );
  });

  it("I18nProvider.tsx importa STORAGE_KEYS.lang en vez de declarar su propio literal", () => {
    const source = readFileSync(
      join(here, "..", "i18n", "I18nProvider.tsx"),
      "utf-8",
    );
    expect(source).toContain('import { STORAGE_KEYS } from "@/config/storage"');
    expect(source).toContain("STORAGE_KEYS.lang");
    expect(source).not.toMatch(/const STORAGE_KEY\s*=\s*"vti-/);
    expect(STORAGE_REGISTRY.some((entry) => entry.id === "vti-lang")).toBe(
      true,
    );
  });
});

/**
 * Candado nuevo de esta entrega: `STORAGE_KEYS` (declarado en este mismo
 * fichero) es la ÚNICA fuente admitida del literal `"vti-*"`. Antes de esta
 * entrega había TRES copias del literal (`ThemeProvider.tsx`,
 * `I18nProvider.tsx`, `LanguageSelector.tsx`); esta barredura por `fs` sobre
 * `src/` es lo único que impide que una cuarta copia se cuele en el futuro
 * sin que nadie la note -- el test anterior solo vigila los dos ficheros que
 * ya conocemos, este vigila CUALQUIER fichero.
 *
 * Se excluyen los ficheros de test: el propio `STORAGE_REGISTRY` obliga a
 * declarar el literal aquí en las aserciones (`toEqual(["vti-lang", ...`),
 * y decenas de tests de otros componentes siembran
 * `window.localStorage.setItem("vti-theme", ...)` directamente para no
 * depender de un montaje completo de `ThemeProvider` -- ninguno de los dos
 * usos es un "escritor" que pueda desincronizarse de `storage.ts`, son
 * lectores del valor ya declarado aquí.
 */
describe("candado: STORAGE_KEYS es la única declaración admitida del literal", () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const storageFilePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "storage.ts",
  );

  function listSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...listSourceFiles(full));
      } else if (
        /\.(ts|tsx)$/.test(entry.name) &&
        !/\.test\.(ts|tsx)$/.test(entry.name)
      ) {
        files.push(full);
      }
    }
    return files;
  }

  it('ningún fichero de src/ fuera de config/storage.ts contiene el literal "vti-"', () => {
    const offenders = listSourceFiles(srcRoot).filter((file) => {
      if (file === storageFilePath) return false;
      return readFileSync(file, "utf-8").includes('"vti-');
    });
    expect(offenders).toEqual([]);
  });
});
