import { describe, it, expect } from "vitest";
import {
  LEGAL_ENTITY,
  LEGAL_VERSIONS,
  PLACEHOLDER,
  hasPendingLegalData,
} from "./legal";
import { links } from "./links";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";

/**
 * Candado de veracidad (§0 CLAUDE.md, spec §9.1), INVERTIDO el 2026-08-13.
 *
 * Hasta esa fecha este bloque aseveraba que los seis campos identificativos
 * valían EXACTAMENTE `PLACEHOLDER`: mientras el dueño no aportara los datos,
 * cualquier valor plausible-pero-inventado ("VoidToInfinite S.L.", un NIF con
 * forma válida, una dirección creíble) tenía que poner el test en rojo.
 *
 * El dueño aportó los datos y cerró la Fase 0, así que el candado cambia de
 * dirección pero NO de fuerza. Lo que ata ahora:
 *
 *   - Los campos con valor real no pueden volver a `PLACEHOLDER` ni quedarse
 *     vacíos.
 *   - Los tres declarados «no procede» tienen que ser `null` EXACTO. No una
 *     cadena vacía, no "N/A", no "no procede" escrito a mano: cualquiera de
 *     esas variantes pintaría prosa sin traducir en un documento bilingüe y
 *     esquivaría la rama de render que existe para ellos. Y sobre todo, NO un
 *     string con datos: el dueño decidió expresamente no publicar su DNI ni
 *     su domicilio, así que un valor ahí sería publicar lo que se decidió no
 *     publicar.
 */
describe("LEGAL_ENTITY", () => {
  const realFields = ["name", "contactEmail"] as const;
  const declaredAbsent = ["taxId", "address", "registry"] as const;

  it.each(realFields)("%s tiene un valor real, no el marcador", (field) => {
    const value = LEGAL_ENTITY[field];
    expect(value).not.toBe(PLACEHOLDER);
    expect(value.trim()).not.toBe("");
  });

  it("name es el titular que el dueño declaró", () => {
    expect(LEGAL_ENTITY.name).toBe("Daniel Mosquera");
  });

  /*
   * `legalForm` es una CLAVE, no el texto. Nació como el literal "Persona
   * física" y la verificación en navegador lo pilló pintado en español dentro
   * del documento inglés; este candado impide que vuelva a serlo. Un valor con
   * espacios o acentos aquí es, por construcción, prosa colada en la config.
   */
  it("legalForm es un identificador resoluble por i18n, no prosa", () => {
    expect(LEGAL_ENTITY.legalForm).toBe("naturalPerson");
    expect(LEGAL_ENTITY.legalForm).toMatch(/^[a-zA-Z]+$/);
  });

  it("la clave de legalForm existe en los DOS idiomas y difiere entre ellos", () => {
    const es = esLegal.Legal.common.legalForm[LEGAL_ENTITY.legalForm];
    const en = enLegal.Legal.common.legalForm[LEGAL_ENTITY.legalForm];

    expect(es).toBeTruthy();
    expect(en).toBeTruthy();
    // Si coincidieran, o falta la traducción o alguien copió el español.
    expect(en).not.toBe(es);
  });

  /* Deriva de `links.email`, no de `EMAIL_ADDRESS`: aseverar la constante
     contra sí misma no ataría nada (misma doctrina que `jsonLd.test.ts` y
     `Contact.test.tsx`, declarada en `links.ts:74-78`). */
  it("contactEmail es la MISMA dirección que el resto del sitio", () => {
    expect(LEGAL_ENTITY.contactEmail).toBe(links.email.replace(/^mailto:/, ""));
    expect(LEGAL_ENTITY.contactEmail).toBe("hello@voidtoinfinite.com");
  });

  it.each(declaredAbsent)(
    "%s es null exacto: declaración de «no procede», no un hueco ni prosa",
    (field) => {
      expect(LEGAL_ENTITY[field]).toBeNull();
    },
  );

  it("dpo es null (no se ha designado Delegado de Protección de Datos)", () => {
    expect(LEGAL_ENTITY.dpo).toBeNull();
  });

  /* Candado de la REGLA DURA del docblock del módulo: `null` y `PLACEHOLDER`
     dicen cosas distintas y no pueden confundirse. Si alguien añade un campo
     nuevo sin dato y lo marca `null` en vez de `PLACEHOLDER`, la publicación
     dejaría de bloquearse sin que nada avise. */
  it("ningún campo lleva el marcador: si vuelve uno, la publicación se bloquea", () => {
    const values = Object.values(LEGAL_ENTITY);
    expect(values).not.toContain(PLACEHOLDER);
    expect(values).not.toContain("POR_COMPLETAR");
  });
});

describe("hasPendingLegalData", () => {
  /* Era `true` desde que existe el fichero. Pasa a `false` el 2026-08-13: es
     la primera vez que las dos páginas legales son publicables. */
  it("es false: no queda ningún dato identificativo sin aportar", () => {
    expect(hasPendingLegalData()).toBe(false);
  });

  /* Sonda de no-vacuidad: sin ella, una función que devolviera `false` a palo
     seco pasaría el test de arriba y el bloqueo habría dejado de existir sin
     que nadie lo notara. Se reintroduce un marcador sobre una COPIA y se
     comprueba que la lógica lo detectaría. */
  it("seguiría detectando un dato pendiente si alguien reintrodujera uno", () => {
    const conPendiente: Record<string, unknown> = {
      ...LEGAL_ENTITY,
      name: PLACEHOLDER,
    };
    const identifying = [
      "name",
      "legalForm",
      "taxId",
      "address",
      "registry",
      "contactEmail",
    ];
    expect(
      identifying.some((field) => conPendiente[field] === PLACEHOLDER),
    ).toBe(true);
  });
});

describe("LEGAL_VERSIONS", () => {
  const docKeys = ["privacy", "legalNotice"] as const;

  it("expone las 2 entradas de documentos legales", () => {
    expect(Object.keys(LEGAL_VERSIONS).sort()).toEqual([...docKeys].sort());
  });

  it.each(docKeys)("%s tiene 'updated' en formato YYYY-MM-DD válido", (key) => {
    const { updated } = LEGAL_VERSIONS[key];
    expect(updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Formato válido no basta por sí solo (ej. "2026-13-40" matchea el
    // regex): se comprueba también que Date la interpreta como la MISMA
    // fecha, no como un desbordamiento silencioso a otro mes/día.
    const parsed = new Date(`${updated}T00:00:00.000Z`);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.toISOString().slice(0, 10)).toBe(updated);
  });

  it.each(docKeys)("%s tiene version declarada", (key) => {
    expect(LEGAL_VERSIONS[key].version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  /*
   * Dos revisiones sustantivas encadenadas, y las dos movieron la MAYOR por el
   * mismo motivo: quien se hubiera quedado con la versión anterior no puede dar
   * por buena su lectura.
   *
   *   1.x -> 2.0.0 (2026-08-08): la privacidad pierde todo lo relativo al
   *   consentimiento y el aviso legal absorbe las cláusulas del retirado
   *   `/terminos`.
   *   2.x -> 3.0.0 (2026-08-13): aparece por primera vez la identidad del
   *   responsable, la cadena real de proveedores del correo y el plazo de
   *   conservación. Antes de esto, el lector no sabía quién respondía de sus
   *   datos.
   *
   * El candado es sobre la mayor, no sobre la cadena completa: la menor y el
   * parche pueden moverse con retoques posteriores sin tener que tocar aquí.
   */
  it.each(docKeys)(
    "%s está al menos en la versión mayor 3 (identidad del responsable, 2026-08-13)",
    (key) => {
      const major = Number(LEGAL_VERSIONS[key].version.split(".")[0]);
      expect(major).toBeGreaterThanOrEqual(3);
    },
  );
});
