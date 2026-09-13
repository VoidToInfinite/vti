import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import { STORAGE_KEYS, STORAGE_REGISTRY } from "./storage";

describe("STORAGE_REGISTRY", () => {
  /*
   * Contrato CERRADO (regla 40): la lista se actualiza en el commit que añade
   * la entrada, nunca se relaja a un `toContain`. `vti-reading-position` entra
   * el 2026-09-06 con la crítica externa #19 (P1 #2, la recarga en tema oscuro
   * devolvía al lector una sección atrás); su porqué está en el docblock de
   * `src/hooks/useReloadLanding.ts`.
   */
  it("declara exactamente vti-theme y vti-reading-position", () => {
    const ids = STORAGE_REGISTRY.map((entry) => entry.id).sort();
    expect(ids).toEqual(["vti-reading-position", "vti-theme"]);
  });

  /*
   * CANDADO DE LA VIDA ÚTIL DECLARADA (crítica externa #19). La posición de
   * lectura es la PRIMERA entrada de este registro que no sobrevive al cierre
   * de la pestaña, y ese hecho es exactamente lo que la hace proporcionada:
   * declararla como `localStorage` la convertiría en un rastro persistente sin
   * cambiar una sola línea del hook que la escribe, y la tabla de
   * `/privacidad` —que pinta `kind` literalmente— lo diría mal a partir de ese
   * momento.
   *
   * No es un espejo del valor del código: lo que ata es la CONDICIÓN de que un
   * dato de sesión se declare como tal. Si mañana alguien mueve la escritura a
   * `localStorage`, este test le exige tocar también la declaración, que es
   * donde el revisor puede verlo.
   */
  it("la posición de lectura se declara como almacenamiento DE SESIÓN, no persistente", () => {
    const entry = STORAGE_REGISTRY.find(
      (candidate) => candidate.id === STORAGE_KEYS.readingPosition,
    );
    expect(entry, "la posición de lectura no está declarada").toBeDefined();
    expect(entry?.kind).toBe("sessionStorage");
  });

  /*
   * El complementario: `STORAGE_KEYS` es la fuente del literal, así que un
   * rename que dejara la clave del hook y la del registro apuntando a strings
   * distintos no lo vería nadie. Aquí se afirma el literal UNA vez, y el
   * candado de barredura de más abajo impide que exista una segunda copia.
   */
  it("STORAGE_KEYS declara la clave de la posición de lectura", () => {
    expect(STORAGE_KEYS.readingPosition).toBe("vti-reading-position");
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

  /*
   * Mismo candado, misma familia, entrada distinta: `vti-lang` se retiró el
   * 2026-09-02 (D3, decisión del dueño) porque `I18nProvider` la escribía al
   * MONTAR -- con el idioma de la ruta, sin que nadie eligiera nada y sin un
   * solo lector en `src/` ni en `app/`. Reintroducirla en este array volvería
   * a poner su fila en la tabla de `/privacidad` describiendo «una elección
   * hecha por ti» que el visitante no ha hecho.
   */
  it("no queda rastro de vti-lang", () => {
    expect(STORAGE_REGISTRY.map((entry) => entry.id)).not.toContain("vti-lang");
  });
});

/**
 * Candado que cruza los DOS ficheros de los que sale la tabla de
 * `/privacidad` (regla 41 de `RULES.md`: una invariante entre ficheros vive en
 * un test que importa los dos). `LegalDocument.tsx` pinta una fila por entrada
 * de `STORAGE_REGISTRY` y resuelve su nombre y su finalidad con
 * `t("Legal.common.storage.<id>.name"/".purpose")`. Las dos mitades pueden
 * divergir en los dos sentidos, y ninguna de las dos divergencias es visible
 * sin este test:
 *
 * - Sobra copia (el caso REAL de esta entrega): al retirar `vti-lang` del
 *   registro, sus dos claves i18n se quedan sin consumidor. La tabla ya no las
 *   pinta, así que ningún test de render lo nota, y quedan como copia legal
 *   huérfana describiendo almacenamiento que el sitio no escribe (regla 32).
 * - Falta copia: una entrada nueva en el registro sin sus claves i18n. i18next
 *   no lanza -- devuelve la propia ruta -- así que la tabla se pintaría con
 *   `Legal.common.storage.vti-x.name` en la celda.
 *
 * Se comprueba en los DOS idiomas: una fila que existiera solo en castellano
 * dejaría la tabla inglesa incompleta.
 */
describe("la copia legal de la tabla describe EXACTAMENTE lo que declara el registro", () => {
  const ids = [...STORAGE_REGISTRY.map((entry) => entry.id)].sort();

  it.each([
    ["es", esLegal],
    ["en", enLegal],
  ])(
    "%s: Legal.common.storage tiene una entrada por id, ni una más",
    (_lang, legal) => {
      expect(Object.keys(legal.Legal.common.storage).sort()).toEqual(ids);
    },
  );

  it.each([
    ["es", esLegal],
    ["en", enLegal],
  ])(
    "%s: la fila de idioma retirada no reaparece en la copia",
    (_lang, legal) => {
      expect(Object.keys(legal.Legal.common.storage)).not.toContain("vti-lang");
    },
  );
});

/**
 * Candado de sincronía con el código real, adaptado a la centralización de
 * esta entrega. ANTES `ThemeProvider.tsx`/`I18nProvider.tsx` declaraban su
 * propio literal `const STORAGE_KEY = "vti-theme"` / `"vti-lang"`, y este
 * test comparaba ese literal contra `STORAGE_REGISTRY` para detectar un
 * rename que los desincronizara. DESPUÉS los dos importaron `STORAGE_KEYS` de
 * `storage.ts`, así que dejaron de PODER divergir por construcción -- lo que
 * quedaba por comprobar, leyendo el CÓDIGO FUENTE real (mismo patrón que
 * `Contact.test.tsx` y `footer.layers.test.ts`), era que de verdad importaran
 * de aquí y no hubieran vuelto a declarar un literal propio.
 *
 * DESDE D3 (2026-09-02) los dos ficheros ya no se miden con la misma vara:
 * `ThemeProvider.tsx` sigue siendo un escritor y se comprueba igual;
 * `I18nProvider.tsx` dejó de escribir, así que su mitad afirma la ausencia
 * (ver el comentario de su propio `it`).
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

  /*
   * AQUÍ VIVIÓ el gemelo de arriba para `I18nProvider.tsx`, que exigía
   * `STORAGE_KEYS.lang`. D3 (2026-09-02) retira esa clave: el proveedor ya no
   * escribe NADA, así que la propiedad que hay que atar es la contraria.
   *
   * Se comprueba sobre la FUENTE, además del candado de comportamiento que
   * vive en `I18nProvider.test.tsx` (espía sobre `setItem`), porque los dos
   * cazan cosas distintas: el espía mira lo que ocurre al montar con el
   * `locale` que el test pasa; esto mira que no quede ninguna escritura en el
   * fichero, ni siquiera en una rama que el test no ejercite.
   */
  it("I18nProvider.tsx no escribe en localStorage ni conserva el literal retirado", () => {
    const source = readFileSync(
      join(here, "..", "i18n", "I18nProvider.tsx"),
      "utf-8",
    );
    const codigo = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(codigo).not.toContain("localStorage");
    expect(codigo).not.toContain("STORAGE_KEYS");
    expect(STORAGE_REGISTRY.some((entry) => entry.id === "vti-lang")).toBe(
      false,
    );
  });

  /*
   * El tercer escritor del sitio, desde la crítica externa #19:
   * `useReloadLanding.ts`. Se mide con la misma vara que `ThemeProvider.tsx`
   * —importa `STORAGE_KEYS` en vez de declarar su propio literal— y con una
   * mitad más que aquel no necesita: que escriba en `sessionStorage` y NO en
   * `localStorage`. Esa es la propiedad que sostiene la fila de `/privacidad`
   * («se borra al cerrar la pestaña») y la única que un cambio de una palabra
   * en el hook puede romper sin que ningún test de comportamiento se entere:
   * los dos almacenes tienen la misma API, así que un test que espíe
   * `setItem` sobre el almacén equivocado pasaría en verde igual.
   */
  it("useReloadLanding.ts importa STORAGE_KEYS y escribe en sessionStorage, nunca en localStorage", () => {
    const source = readFileSync(
      join(here, "..", "hooks", "useReloadLanding.ts"),
      "utf-8",
    );
    const codigo = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(codigo).toContain('import { STORAGE_KEYS } from "@/config/storage"');
    expect(codigo).toContain("STORAGE_KEYS.readingPosition");
    expect(codigo).not.toMatch(/const STORAGE_KEY\s*=\s*"vti-/);
    expect(codigo).toContain("window.sessionStorage");
    expect(
      codigo,
      "la posición de lectura dejaría de morir con la pestaña",
    ).not.toContain("localStorage");
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
 * declarar el literal aquí en las aserciones (`toEqual(["vti-theme"])`), el
 * candado de la clave RETIRADA tiene que nombrarla para prohibirla, el de
 * `I18nProvider.test.tsx` siembra el residuo que un visitante antiguo aún
 * tiene en su navegador, y decenas de tests de otros componentes siembran
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
