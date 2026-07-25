import { describe, it, expect } from "vitest";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";

/**
 * Candado permanente de los locales. Existe por tres motivos concretos, todos
 * verificados en el repo y no hipotéticos:
 *
 * 1. Paridad es/en. Al escribir este test, `Common.Navigation` tenía
 *    `proyects` en español y `projects` en inglés: una clave huérfana en cada
 *    idioma que ningún componente consumía y que ninguna revisión había visto.
 *    La comparación es de RUTAS completas y recursiva; una comparación
 *    superficial de primer nivel no habría detectado nada.
 * 2. La copia de Story y Contact sigue PENDIENTE por decisión del usuario. El
 *    marcador `[por completar]` es el contrato: si desaparece sin que se haya
 *    escrito la copia real, alguien ha rellenado el hueco inventando voz de
 *    marca. Este test lo convierte en un fallo de build.
 * 3. `Home.description` y `Home.additionalDescription` se eliminaron al
 *    reestructurar el hero en kicker/título/subtítulo/apoyo. Reintroducirlas
 *    dejaría dos fuentes de verdad para la misma copia.
 */

type JsonTree = { [key: string]: string | JsonTree };

/** Rutas hoja del árbol, en notación de puntos (recorrido recursivo). */
function keyPaths(tree: JsonTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : keyPaths(value, path);
  });
}

/** Valor de una ruta con notación de puntos, o undefined si no existe. */
function valueAt(tree: JsonTree, path: string): string | undefined {
  const found = path
    .split(".")
    .reduce<string | JsonTree | undefined>(
      (node, key) =>
        typeof node === "object" && node !== null ? node[key] : undefined,
      tree,
    );
  return typeof found === "string" ? found : undefined;
}

const namespaces = [
  { name: "common", es: esCommon as JsonTree, en: enCommon as JsonTree },
  { name: "home", es: esHome as JsonTree, en: enHome as JsonTree },
];

const locales = [
  { lang: "es", home: esHome as JsonTree },
  { lang: "en", home: enHome as JsonTree },
];

describe("locales", () => {
  describe("paridad es/en", () => {
    it.each(namespaces)(
      "el namespace '$name' tiene EXACTAMENTE las mismas rutas de clave en es y en",
      ({ es, en }) => {
        const esPaths = keyPaths(es);
        const enPaths = keyPaths(en);
        const soloEs = esPaths.filter((path) => !enPaths.includes(path));
        const soloEn = enPaths.filter((path) => !esPaths.includes(path));
        expect(
          { soloEs, soloEn },
          `Rutas sin pareja. Solo en es: [${soloEs.join(", ")}]. Solo en en: [${soloEn.join(", ")}].`,
        ).toEqual({ soloEs: [], soloEn: [] });
      },
    );

    it.each(namespaces)(
      "el namespace '$name' tiene el mismo numero de claves en los dos idiomas",
      ({ es, en }) => {
        expect(keyPaths(es)).toHaveLength(keyPaths(en).length);
      },
    );
  });

  describe("copia pendiente declarada", () => {
    const pendientes = [
      "Home.story.body",
      "Home.story.additional",
      "Home.contact.body",
    ];

    it.each(
      locales.flatMap(({ lang, home }) =>
        pendientes.map((path) => ({ lang, home, path })),
      ),
    )("$lang: $path sigue empezando por [por completar]", ({ home, path }) => {
      const value = valueAt(home, path);
      expect(value).toBeDefined();
      expect(value?.startsWith("[por completar]")).toBe(true);
    });
  });

  describe("copia del hero", () => {
    it.each(
      locales.flatMap(({ lang, home }) =>
        (["kicker", "subtitle", "support"] as const).map((key) => ({
          lang,
          home,
          key,
        })),
      ),
    )("$lang: Home.hero.$key tiene texto real", ({ home, key }) => {
      const value = valueAt(home, `Home.hero.${key}`);
      expect(value).toBeDefined();
      expect(value?.trim()).not.toBe("");
    });

    it.each(locales)(
      "$lang: el kicker va en caja natural, las mayusculas las pone el CSS",
      ({ home }) => {
        // Varios lectores de pantalla deletrean las cadenas escritas en caja
        // alta como si fueran siglas.
        const kicker = valueAt(home, "Home.hero.kicker") ?? "";
        expect(kicker).not.toBe(kicker.toUpperCase());
      },
    );
  });

  describe("claves retiradas", () => {
    it.each(
      locales.flatMap(({ lang, home }) =>
        ["Home.description", "Home.additionalDescription"].map((path) => ({
          lang,
          home,
          path,
        })),
      ),
    )("$lang: $path no reaparece", ({ home, path }) => {
      expect(keyPaths(home)).not.toContain(path);
    });
  });
});
