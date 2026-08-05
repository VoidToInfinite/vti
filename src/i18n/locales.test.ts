import { describe, it, expect } from "vitest";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";
import esLegal from "./locales/es/legal.json";
import enLegal from "./locales/en/legal.json";
import esConsent from "./locales/es/consent.json";
import enConsent from "./locales/en/consent.json";
import { namespaces as registeredNamespaces } from "./config";
import { PLACEHOLDER } from "@/config/legal";

/**
 * Candado permanente de los locales. Existe por dos motivos concretos, todos
 * verificados en el repo y no hipotéticos:
 *
 * 1. Paridad es/en. Al escribir este test, `Common.Navigation` tenía
 *    `proyects` en español y `projects` en inglés: una clave huérfana en cada
 *    idioma que ningún componente consumía y que ninguna revisión había visto.
 *    La comparación es de RUTAS completas y recursiva; una comparación
 *    superficial de primer nivel no habría detectado nada.
 * 2. `Home.description` y `Home.additionalDescription` se eliminaron al
 *    reestructurar el hero en kicker/título/subtítulo/apoyo. Reintroducirlas
 *    dejaría dos fuentes de verdad para la misma copia.
 *
 * Nota: la copia de Story y Contact estuvo marcada `[por completar]` mientras
 * el contrato i18n de la landing v2 (spec 2026-07-28) seguía sin cerrar. Esa
 * spec ya define la copia real de Story/Journey/Features/Contact (§4), así
 * que el candado de "copia pendiente" se retiró de este archivo: ya no hay
 * ninguna clave de Home que deba seguir empezando por `[por completar]`.
 */

/*
 * El árbol admite ARRAYS además de objetos y cadenas: el namespace `legal`
 * modela cada documento como una lista de secciones y cada sección como una
 * lista de bloques. Eso no debilita el candado, lo refuerza -- `Object.entries`
 * recorre un array por sus índices, así que la ruta de una hoja queda como
 * `Legal.privacy.sections.3.blocks.1.text` y la paridad es/en pasa a comparar
 * la ESTRUCTURA del documento, no solo sus títulos: un párrafo añadido en
 * español y olvidado en inglés (o dos bloques del mismo `kind` en distinto
 * orden) sale en rojo.
 */
type JsonValue = string | JsonTree | JsonValue[];
type JsonTree = { [key: string]: JsonValue };

/** Rutas hoja del árbol, en notación de puntos (recorrido recursivo). */
function keyPaths(tree: JsonTree | JsonValue[], prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : keyPaths(value, path);
  });
}

/** Valor de una ruta con notación de puntos, o undefined si no existe. */
function valueAt(tree: JsonTree, path: string): string | undefined {
  const found = path
    .split(".")
    .reduce<JsonValue | undefined>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as JsonTree)[key]
          : undefined,
      tree,
    );
  return typeof found === "string" ? found : undefined;
}

const namespaces = [
  { name: "common", es: esCommon as JsonTree, en: enCommon as JsonTree },
  { name: "home", es: esHome as JsonTree, en: enHome as JsonTree },
  /*
   * `as unknown as` en estos dos, y no el `as JsonTree` directo de arriba,
   * por un detalle del tipo que TypeScript infiere de un JSON con bloques
   * heterogéneos: la unión de `{kind,text}` y `{kind,items}` produce miembros
   * con propiedades opcionales de tipo `undefined` (`items?: undefined`), que
   * no encajan en la firma de índice. El recorrido en tiempo de ejecución es
   * el mismo; el doble cast solo le dice al compilador que aquí se trata el
   * JSON como árbol genérico a propósito.
   */
  {
    name: "legal",
    es: esLegal as unknown as JsonTree,
    en: enLegal as unknown as JsonTree,
  },
  {
    name: "consent",
    es: esConsent as unknown as JsonTree,
    en: enConsent as unknown as JsonTree,
  },
];

const locales = [
  { lang: "es", home: esHome as JsonTree },
  { lang: "en", home: enHome as JsonTree },
];

describe("locales", () => {
  /*
   * El candado de paridad solo protege los namespaces que estén en el array
   * `namespaces` de ARRIBA. Añadir un namespace a `config.ts` y olvidarse de
   * añadirlo aquí lo dejaría sin ninguna cobertura, en silencio -- que es
   * exactamente lo que pasó al incorporar `legal` y `consent` en la entrega
   * del 2026-08-05 y lo que este test impide que vuelva a pasar.
   */
  it("todos los namespaces registrados en config.ts tienen candado de paridad", () => {
    expect([...registeredNamespaces].sort()).toEqual(
      namespaces.map(({ name }) => name).sort(),
    );
  });

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

  /*
   * Candado de los marcadores de dato pendiente, escrito porque el defecto
   * OCURRIÓ: la primera traducción inglesa de `legal.json` tradujo el
   * centinela `POR_COMPLETAR` como "PENDING" en sus 8 apariciones. La
   * paridad de rutas de arriba no lo vio -- las claves eran idénticas, lo que
   * cambiaba era el contenido -- y el renderer, que busca el literal
   * `POR_COMPLETAR` para envolverlo en `<mark>`, no marcaba NADA en inglés:
   * medido en navegador real, `/accesibilidad` en español pintaba 2 marcas y
   * en inglés cero. Un lector en inglés veía documentos legales que parecían
   * completos sin estarlo, que es exactamente el fallo que la convención de
   * marcadores existe para impedir.
   *
   * El marcador es un CENTINELA DE MÁQUINA, no prosa: tiene que ser idéntico
   * en los dos idiomas para que un solo renderer lo encuentre y un solo test
   * lo cuente. Por eso se compara el número de apariciones documento a
   * documento, y no solo el total: cinco de más en uno y cinco de menos en
   * otro darían el mismo total y pasarían desapercibidos.
   */
  describe("marcadores de dato pendiente", () => {
    it.each(["privacy", "terms", "accessibility", "legalNotice"] as const)(
      "el documento '%s' tiene los mismos marcadores en es y en",
      (doc) => {
        const cuenta = (arbol: JsonTree): number =>
          JSON.stringify((arbol.Legal as JsonTree)[doc]).split(PLACEHOLDER)
            .length - 1;

        expect(cuenta(esLegal as unknown as JsonTree)).toBe(
          cuenta(enLegal as unknown as JsonTree),
        );
      },
    );
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
