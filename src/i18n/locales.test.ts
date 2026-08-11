import { describe, it, expect } from "vitest";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";
import esLegal from "./locales/es/legal.json";
import enLegal from "./locales/en/legal.json";
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
   * `as unknown as` en este, y no el `as JsonTree` directo de arriba, por un
   * detalle del tipo que TypeScript infiere de un JSON con bloques
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
    it.each(["privacy", "legalNotice"] as const)(
      "el documento '%s' tiene los mismos marcadores en es y en",
      (doc) => {
        const cuenta = (arbol: JsonTree): number =>
          JSON.stringify((arbol.Legal as JsonTree)[doc]).split(PLACEHOLDER)
            .length - 1;

        // Sonda positiva: el documento SÍ lleva marcadores. Sin ella, borrar
        // los de los DOS idiomas dejaría este test en verde mientras la página
        // afirma en silencio unos datos identificativos que nadie ha aportado.
        expect(cuenta(esLegal as unknown as JsonTree)).toBeGreaterThan(0);
        expect(cuenta(esLegal as unknown as JsonTree)).toBe(
          cuenta(enLegal as unknown as JsonTree),
        );
      },
    );
  });

  /*
   * Candado de la revisión legal del 2026-08-08: los dos documentos retirados
   * no pueden volver por la puerta de atrás. Un `Legal.terms` reintroducido en
   * el JSON no rompería ningún typecheck (nadie lo importa) y quedaría ahí,
   * traducido y muerto, hasta que alguien lo enlazara "porque ya estaba".
   */
  describe("documentos retirados", () => {
    it.each(["terms", "accessibility"] as const)(
      "'%s' no reaparece en el namespace legal de ninguno de los dos idiomas",
      (doc) => {
        expect(
          Object.keys((esLegal as unknown as JsonTree).Legal as JsonTree),
        ).not.toContain(doc);
        expect(
          Object.keys((enLegal as unknown as JsonTree).Legal as JsonTree),
        ).not.toContain(doc);
      },
    );
  });

  /*
   * TASK 14 (plan premium F3, 2026-08-11): `kicker` sale de esta lista --
   * la clave `Home.hero.kicker` se retira (sustituida por `Home.hero.tagline`,
   * la linea descriptiva "Del vacio al infinito...") -- y `support` tambien,
   * porque `Home.hero.support` SALE del hero hacia `Home.story.support`
   * (apertura de Story, ver Story.test.tsx). El test de caja natural del
   * kicker se retira con la clave: `Home.hero.tagline` no lleva ningun
   * text-transform en CSS (ScTagline, Hero.tsx), asi que no hay ninguna
   * mayuscula-por-CSS que proteger aqui.
   */
  describe("copia del hero", () => {
    it.each(
      locales.flatMap(({ lang, home }) =>
        (["tagline", "subtitle"] as const).map((key) => ({
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

  /*
   * Candado de rayas (Tarea 5, auditoría de copy, 2026-08-09). Nació porque
   * `en/home.json` tenía 5 em-dashes que eran artefacto de la traducción (2
   * de ellos en etiquetas ARIA) sin equivalente en `es/home.json`, y porque
   * `en/legal.json:145` tenía un inciso con raya abierto que nunca se
   * cerraba. Alcance deliberado, NO los cuatro namespaces:
   *
   * - `common` y `home`, es Y en: cero `—`/`–` en CUALQUIER valor. Este es el
   *   copy de cara al usuario que la auditoría clasificó como "sin raya".
   * - `legal.json` ES queda EXENTO a propósito: sus rayas (líneas 65/145/224)
   *   son incisos RAE legítimos -- «—solo si nos escribes—», «—por ejemplo,
   *   direcciones IP...—» -- y forman parte de la identidad de lengua del
   *   documento legal en español. Retirarlas sería una regresión de estilo,
   *   no una corrección.
   * - `legal.json` EN se reescribió SIN rayas en la misma Tarea 5 (los 3
   *   incisos con raya, incluido el abierto sin cerrar de la línea 145, pasan
   *   a coma/paréntesis, que es la puntuación natural del inciso en inglés),
   *   así que el candado lo exige a cero igual que `common`/`home` -- no
   *   necesita una excepción propia.
   */
  const DASH_PATTERN = /[—–]/;

  function dashOffenders(tree: JsonTree): string[] {
    return keyPaths(tree).filter((path) => {
      const value = valueAt(tree, path);
      return value !== undefined && DASH_PATTERN.test(value);
    });
  }

  describe("candado de rayas (Tarea 5)", () => {
    it.each([
      { name: "common/es", tree: esCommon as JsonTree },
      { name: "common/en", tree: enCommon as JsonTree },
      { name: "home/es", tree: esHome as JsonTree },
      { name: "home/en", tree: enHome as JsonTree },
      {
        name: "legal/en",
        tree: enLegal as unknown as JsonTree,
      },
    ])("$name: ningun valor contiene raya (— ni –)", ({ tree }) => {
      const offenders = dashOffenders(tree);
      expect(
        offenders,
        `Claves con raya sin exención: ${offenders.join(", ")}`,
      ).toEqual([]);
    });

    // Sonda positiva + documentación del exento: legal/es SÍ conserva rayas
    // a propósito (incisos RAE). Sin esta prueba, borrar por error las tres
    // rayas de legal/es dejaría la exención sin sentido y nadie lo notaría.
    it("legal/es SÍ tiene rayas: incisos RAE legítimos, exento a propósito", () => {
      const offenders = dashOffenders(esLegal as unknown as JsonTree);
      expect(offenders.length).toBeGreaterThan(0);
    });
  });

  /*
   * Candado de middot (Tarea 5). Guarda contra el mismo defecto que las
   * rayas -- puntuación decorativa metida a mano en el copy -- pero para el
   * "·": el punto 4 del encargo descartó explícitamente un separador de
   * "middot doble" para el deck de Story, así que este candado impide que
   * ese patrón (o cualquier otro con más de un "·" por valor) entre por otro
   * sitio.
   *
   * La excepción única que tenía este candado -- `Home.hero.kicker`
   * ("Aprendizaje · Imaginación · Juego" / "Learning · Imagination ·
   * Gaming"), un separador de enumeración de tres palabras -- desaparece con
   * la propia clave (Task 14, plan premium F3, 2026-08-11: `kicker` se
   * retira, sustituida por `Home.hero.tagline`, sin ningún "·"). Sin
   * excepciones vivas, la regla queda "cero middots en todo el árbol",
   * literal.
   */
  describe("candado de middot (Tarea 5)", () => {
    it.each([
      { name: "home/es", tree: esHome as JsonTree },
      { name: "home/en", tree: enHome as JsonTree },
      { name: "common/es", tree: esCommon as JsonTree },
      { name: "common/en", tree: enCommon as JsonTree },
    ])("$name: ningun valor tiene mas de 1 middot", ({ tree }) => {
      const offenders = keyPaths(tree).filter((path) => {
        const value = valueAt(tree, path) ?? "";
        const count = (value.match(/·/g) ?? []).length;
        return count > 1;
      });
      expect(
        offenders,
        `Claves con mas de 1 middot: ${offenders.join(", ")}`,
      ).toEqual([]);
    });
  });
});
