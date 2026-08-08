import { describe, it, expect } from "vitest";
import {
  LEGAL_ENTITY,
  LEGAL_VERSIONS,
  PLACEHOLDER,
  hasPendingLegalData,
} from "./legal";

/**
 * Candado de veracidad (§0 CLAUDE.md, spec §9.1): mientras el usuario no
 * aporte los datos identificativos reales, TODOS los campos string de
 * `LEGAL_ENTITY` tienen que ser EXACTAMENTE `PLACEHOLDER` -- ni vacíos, ni un
 * valor plausible-pero-inventado ("VoidToInfinite S.L.", un NIF con forma
 * válida, una dirección creíble). Un test que solo comprobara `.length > 0`
 * o `!== ""` dejaría pasar cualquiera de esos inventos; comparar con
 * `toBe(PLACEHOLDER)` es el único candado que de verdad lo impide.
 */
describe("LEGAL_ENTITY", () => {
  const stringFields = [
    "name",
    "legalForm",
    "taxId",
    "address",
    "registry",
    "contactEmail",
  ] as const;

  it.each(stringFields)(
    "%s es exactamente el marcador PLACEHOLDER, no un valor inventado",
    (field) => {
      expect(LEGAL_ENTITY[field]).toBe(PLACEHOLDER);
      expect(LEGAL_ENTITY[field]).toBe("POR_COMPLETAR");
    },
  );

  it("dpo es null (no se ha designado Delegado de Protección de Datos)", () => {
    expect(LEGAL_ENTITY.dpo).toBeNull();
  });

  it("ningún campo string está vacío, en blanco o es un marcador distinto al oficial", () => {
    for (const field of stringFields) {
      const value = LEGAL_ENTITY[field];
      expect(value.trim()).not.toBe("");
      // Candado adicional: cualquier variante casi-correcta ("por completar",
      // "PENDIENTE", "TBD"...) tiene que fallar este test tanto como un dato
      // inventado -- solo el marcador exacto y consistente vale.
      expect(value).toBe(PLACEHOLDER);
    }
  });
});

describe("hasPendingLegalData", () => {
  it("es true mientras LEGAL_ENTITY siga con datos sin aportar", () => {
    expect(hasPendingLegalData()).toBe(true);
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
   * La revisión legal del 2026-08-08 no corrigió erratas: cambió el contenido
   * sustantivo de los dos documentos (la privacidad pierde todo lo relativo al
   * consentimiento; el aviso legal absorbe las cláusulas de uso del retirado
   * `/terminos`). Un lector que se hubiera quedado con la 1.x no puede dar por
   * buena su lectura, y eso es lo que comunica el salto de MAYOR -- por eso el
   * candado es sobre la mayor, no sobre la cadena completa: la menor y el
   * parche pueden moverse con retoques posteriores sin tener que tocar aquí.
   */
  it.each(docKeys)(
    "%s está al menos en la versión mayor 2 (revisión sustantiva del 2026-08-08)",
    (key) => {
      const major = Number(LEGAL_VERSIONS[key].version.split(".")[0]);
      expect(major).toBeGreaterThanOrEqual(2);
    },
  );
});
