import { describe, it, expect } from "vitest";
import { links } from "@/config/links";
import esLegal from "@/i18n/locales/es/legal.json";
import enLegal from "@/i18n/locales/en/legal.json";
import {
  AEPD_HOST,
  LEGAL_AUTO_LINKS,
  splitAutoLinks,
  type LegalAutoLink,
} from "./legalAutoLinks";

/*
 * Los casos del algoritmo se prueban con destinos de JUGUETE, no con el
 * registro real: así el test describe la función y no se convierte en una
 * copia del registro que dejaría de fallar cada vez que alguien lo cambie.
 * El registro real tiene sus propios candados, más abajo.
 *
 * El host de juguete es `example.invalid` y no uno inventado: el candado
 * `no-external-hosts.test.ts` (Task 18) exige que TODO `https://` de `src/`
 * resuelva a un host de su allowlist, comparando el host EXACTO. Ese TLD está
 * reservado por RFC 2606 (nunca resuelve) y ya vive en esa allowlist con su
 * motivo escrito, así que reusarlo evita abrir una excepción nueva por un
 * fixture — mismo criterio que `vocabulary-consumers.test.ts` dejó dicho.
 * Por eso también el destino CORTO comparte host: lo que ese caso ejercita es
 * el desempate por longitud del TEXTO, no el destino.
 */
const UNO: LegalAutoLink = {
  text: "uno@x.test",
  href: "mailto:uno@x.test",
  external: false,
};
const DOS: LegalAutoLink = {
  text: "example.invalid",
  href: "https://example.invalid",
  external: true,
};
const JUGUETE = [UNO, DOS] as const;

describe("splitAutoLinks", () => {
  it("texto sin ningún destino devuelve un único tramo sin enlace", () => {
    expect(splitAutoLinks("hola mundo", JUGUETE)).toEqual([
      { text: "hola mundo", link: null },
    ]);
  });

  it("texto vacío devuelve un único tramo vacío sin enlace", () => {
    expect(splitAutoLinks("", JUGUETE)).toEqual([{ text: "", link: null }]);
  });

  it("un destino en medio del texto se parte en tres tramos", () => {
    expect(splitAutoLinks("antes uno@x.test despues", JUGUETE)).toEqual([
      { text: "antes ", link: null },
      { text: "uno@x.test", link: UNO },
      { text: " despues", link: null },
    ]);
  });

  it("un destino que ES todo el texto devuelve un único tramo enlazado", () => {
    expect(splitAutoLinks("uno@x.test", JUGUETE)).toEqual([
      { text: "uno@x.test", link: UNO },
    ]);
  });

  it("dos destinos DISTINTOS en el mismo texto se enlazan cada uno con el suyo", () => {
    expect(
      splitAutoLinks(
        "escribe a uno@x.test o visita example.invalid hoy",
        JUGUETE,
      ),
    ).toEqual([
      { text: "escribe a ", link: null },
      { text: "uno@x.test", link: UNO },
      { text: " o visita ", link: null },
      { text: "example.invalid", link: DOS },
      { text: " hoy", link: null },
    ]);
  });

  it("dos apariciones del MISMO destino se enlazan las dos", () => {
    expect(splitAutoLinks("uno@x.test y uno@x.test", JUGUETE)).toEqual([
      { text: "uno@x.test", link: UNO },
      { text: " y ", link: null },
      { text: "uno@x.test", link: UNO },
    ]);
  });

  /*
   * El recorrido elige SIEMPRE la aparición más temprana, no el orden en que
   * el registro declara los destinos: sin esa regla, un texto que nombra
   * primero la sede y después el correo saldría con los tramos cruzados.
   */
  it("el orden de los tramos lo marca el texto, no el orden del registro", () => {
    expect(
      splitAutoLinks("example.invalid antes de uno@x.test", JUGUETE),
    ).toEqual([
      { text: "example.invalid", link: DOS },
      { text: " antes de ", link: null },
      { text: "uno@x.test", link: UNO },
    ]);
  });

  /*
   * A igualdad de posición gana el literal MÁS LARGO. Hoy los dos destinos
   * reales son disjuntos y este desempate no se ejerce en producción; el
   * caso existe para que ampliar el registro con un destino que sea prefijo
   * de otro no se lleve por delante el tramo del otro en silencio.
   */
  it("a igualdad de posición gana el destino más largo", () => {
    const CORTO: LegalAutoLink = {
      text: "example",
      href: "https://example.invalid",
      external: true,
    };
    expect(splitAutoLinks("example.invalid", [CORTO, DOS])).toEqual([
      { text: "example.invalid", link: DOS },
    ]);
  });

  it("no reconstruye nada: la concatenación de los tramos es el texto original", () => {
    const original = "uno@x.test, y también example.invalid. Fin.";
    const recompuesto = splitAutoLinks(original, JUGUETE)
      .map((piece) => piece.text)
      .join("");
    expect(recompuesto).toBe(original);
  });
});

/*
 * Candado del REGISTRO real, que es una invariante entre TRES ficheros y por
 * tanto no la sostiene ningún comentario (regla 41 de RULES.md): el destino
 * (`src/config/links.ts`), el texto legal que lo nombra
 * (`src/i18n/locales/{es,en}/legal.json`) y este registro.
 *
 * Lo que se protege: que un enlace no pueda apuntar a un sitio distinto del
 * que el documento escribe. Si alguien cambia la dirección de correo en
 * `links.ts` y no en el texto legal (o al revés), el enlace desaparecería del
 * documento sin que nada fallara -- que es exactamente el estado del que
 * viene esta tarea, con el correo pintado como texto plano.
 *
 * El valor esperado se deriva de `links.email` y del propio JSON, nunca de
 * `EMAIL_ADDRESS` ni de `LEGAL_AUTO_LINKS[n].text` (lección 2026-08-11: un
 * test que importa la constante bajo prueba no prueba nada).
 */
describe("LEGAL_AUTO_LINKS: el registro y el texto legal no pueden divergir", () => {
  const correo = links.email.replace(/^mailto:/, "");

  it("declara exactamente dos destinos: el correo (no externo) y la AEPD (externa)", () => {
    expect(LEGAL_AUTO_LINKS.map((link) => link.text)).toEqual([
      correo,
      AEPD_HOST,
    ]);
    expect(LEGAL_AUTO_LINKS.map((link) => link.external)).toEqual([
      false,
      true,
    ]);
  });

  it("el href del correo es el mismo destino que consume el resto del sitio", () => {
    expect(LEGAL_AUTO_LINKS[0].href).toBe(links.email);
  });

  it("el href de la AEPD se deriva del host que el propio texto legal nombra", () => {
    expect(LEGAL_AUTO_LINKS[1].href).toBe(`https://${AEPD_HOST}`);
  });

  it.each([
    { idioma: "es", bundle: esLegal },
    { idioma: "en", bundle: enLegal },
  ])(
    "$idioma: los dos literales del registro aparecen de verdad en el texto legal",
    ({ bundle }) => {
      const arbol = JSON.stringify(bundle.Legal);
      for (const link of LEGAL_AUTO_LINKS) {
        expect(
          arbol.includes(link.text),
          `el registro enlaza "${link.text}", que no aparece en el texto legal`,
        ).toBe(true);
      }
    },
  );
});
