import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { type as typo } from "./type";

describe("type tokens", () => {
  it("familias apuntan a variables CSS self-hosted", () => {
    expect(typo.fontBody).toBe("var(--font-body)");
    expect(typo.fontMono).toBe("var(--font-mono)");
  });

  it("escala tipográfica completa tiene los valores canónicos correctos", () => {
    const expectedScale = {
      deckClosing: {
        size: "clamp(2.5rem, 11vw, 8rem)",
        weight: 900,
        lineHeight: 1.03,
        tracking: "0",
      },
      display: {
        size: "clamp(2.5rem, 4.4vw, 3.5rem)",
        weight: 800,
        lineHeight: 1.03,
        tracking: "-0.02em",
      },
      h1: {
        size: "2.5rem",
        weight: 700,
        lineHeight: 1.1,
        tracking: "-0.018em",
      },
      h2: {
        size: "2rem",
        weight: 700,
        lineHeight: 1.15,
        tracking: "-0.014em",
      },
      h3: {
        size: "1.5rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "-0.012em",
      },
      wordmark: {
        size: "1.15rem",
        weight: 700,
        lineHeight: 1.2,
        tracking: "0.02em",
      },
      h5: {
        size: "1.125rem",
        weight: 600,
        lineHeight: 1.35,
        tracking: "0",
      },
      deckBody: {
        size: "clamp(1rem, 1.4vw, 1.115rem)",
        weight: 400,
        lineHeight: 1.6,
        tracking: "0",
      },
      body: {
        size: "1rem",
        weight: 400,
        lineHeight: 1.6,
        tracking: "0",
      },
      bodySm: {
        size: "0.875rem",
        weight: 400,
        lineHeight: 1.55,
        tracking: "0",
      },
      caption: {
        size: "0.75rem",
        weight: 500,
        lineHeight: 1.4,
        tracking: "0.01em",
      },
      overline: {
        size: "0.6875rem",
        weight: 600,
        lineHeight: 1.2,
        tracking: "0.18em",
      },
    };

    expect(typo.scale).toEqual(expectedScale);
  });

  /*
   * Recuento cerrado de la escala, NUEVO con la crítica externa #9
   * (2026-08-17). El `toEqual` de arriba ya es un contrato cerrado sobre los
   * VALORES, pero no dejaba escrito en ninguna parte CUÁNTOS peldaños tiene la
   * escala -- aquel cambio la bajó de 12 a 9 (`h4`, `bodyLg` y `code`
   * retirados por cero consumidores; ver el docblock de `TypeVariant` en
   * `type.ts` para el censo y el motivo de cada una).
   *
   * Se añade en el mismo cambio que la retirada, no como aserción aparte:
   * quien vuelva a añadir un peldaño tiene que tocar los dos sitios a la vez,
   * que es justo lo que la regla 40 pide de un contrato cerrado. Y así ha
   * funcionado: la crítica externa #11 (2026-08-18) subió el recuento a 10 al
   * añadir `deckTitle`, y la #14 (2026-09-02) lo deja en 11 -- retira ese
   * peldaño y añade `deckClosing` y `deckBody` --, las dos veces actualizando
   * esta cifra CON el `toEqual` de arriba, nunca relajando ninguno de los dos.
   * La #15 (2026-09-02) la sube a 12 al añadir `wordmark`, el rótulo de marca
   * de las dos cabeceras del sitio, por el mismo camino.
   */
  it("la escala tiene exactamente 12 peldaños vivos", () => {
    expect(Object.keys(typo.scale)).toHaveLength(12);
  });

  /*
   * ESTE CANDADO NACIÓ EN LA CRÍTICA #11 (2026-08-18) apuntando a
   * `deckTitle`; la #14 (2026-09-02) retira aquel peldaño y lo repunta a
   * `deckClosing`, que hereda su papel: es el único peldaño cuyo máximo
   * supera al de `display`, y su docblock declara que eso es deliberado --
   * tipografía de CARTEL (una diapositiva a sangre completa), no de
   * documento. Sin este candado, esa afirmación viviría solo en prosa, y la
   * siguiente revisión que viera un 8rem por encima del techo de `display`
   * podría "corregirlo" creyendo que arregla una fuga de la escala,
   * cambiando de paso lo que pintan los cierres de los dos decks.
   *
   * Se afirma la RELACIÓN (deckClosing > display) además del número, y la
   * UNICIDAD sobre la escala entera: si algún día `display` se recalibrara,
   * lo que tiene que seguir siendo cierto es el orden; y si alguien colara un
   * tercer peldaño de cartel, este test lo obliga a declararse aquí.
   */
  it("deckClosing es el único peldaño por encima del techo de display, y es deliberado", () => {
    const tope = (size: string): number =>
      parseFloat(/,\s*([\d.]+)rem\)$/.exec(size)?.[1] ?? size);
    expect(tope(typo.scale.deckClosing.size)).toBe(8);
    expect(tope(typo.scale.display.size)).toBe(3.5);

    const porEncima = Object.entries(typo.scale)
      .filter(([, v]) => tope(v.size) > tope(typo.scale.display.size))
      .map(([k]) => k);
    expect(porEncima).toEqual(["deckClosing"]);
  });

  /*
   * El 900 de `deckClosing` es el peso MÁS ALTO de la escala, y romper el
   * techo de 800 que rigió hasta la #14 es una decisión, no un descuido: tres
   * constantes de sección declaraban un 900 como "excepción deliberada hasta
   * que la escala del sistema incorpore un 900" (`STORY_DECK_NOTE_WEIGHT`,
   * `JOURNEY_DECK_QUOTE_WEIGHT`, `JOURNEY_DECK_STEP_LABEL_WEIGHT`). Esta
   * aserción es el registro de que la escala ya lo incorporó -- lo que obliga
   * a cada una de esas tres a declarar si deriva o si se queda fuera, que es
   * lo que hacen sus docblocks y sus tests.
   */
  it("deckClosing declara el peso más alto de la escala (900)", () => {
    const pesos = Object.values(typo.scale).map((v) => v.weight);
    expect(typo.scale.deckClosing.weight).toBe(900);
    expect(Math.max(...pesos)).toBe(900);
  });

  /*
   * FORMA de la escala de titulares, NUEVO con la crítica externa #15
   * (2026-09-02, hallazgo C7). El `toEqual` de arriba canda los VALORES uno a
   * uno, pero no dice nada de la propiedad que hace que una escala sea una
   * escala: que sus rangos de titular estén ordenados y no se solapen.
   *
   * La lista literal `["h1", "h2", "h3", "h5"]` es el REGISTRO del hallazgo,
   * no su bendición: son cuatro rangos y el cuarto lleva el nombre del
   * quinto, residuo de la retirada de `h4` en la #14. El docblock de
   * `TypeVariant` lleva el censo de consumidores y los seis puntos de edición
   * que exige el rename; este `toEqual` es lo que obliga a pasar por aquí el
   * día que alguien lo ejecute — o el día que alguien intente rellenar el
   * hueco con un `h4` nuevo sin leer por qué se retiró.
   *
   * El orden descendente y la ausencia de empates SÍ son invariantes de
   * diseño y sobreviven al rename: dos peldaños de titular al mismo tamaño
   * son dos nombres para un estilo (el defecto que la #14 pagó con `h5` =
   * `bodyLg`), y un orden roto es una escala que ya no se lee como una
   * escalera.
   */
  it("los rangos de titular descienden en tamaño, sin empates, y hoy NO hay h4", () => {
    const titulares = Object.keys(typo.scale).filter((k) => /^h\d$/.test(k));
    expect(titulares).toEqual(["h1", "h2", "h3", "h5"]);

    const tamanos = titulares.map((k) =>
      parseFloat(typo.scale[k as keyof typeof typo.scale].size),
    );
    expect(tamanos).toEqual([...tamanos].sort((a, b) => b - a));
    expect(new Set(tamanos).size).toBe(tamanos.length);
  });

  /*
   * `deckBody` comparte SUELO con `body` y no techo: el mínimo de su
   * `clamp()` es exactamente `body.size`, y esa es la razón por la que no es
   * un capricho tener los dos peldaños (su docblock lo explica). La
   * aserción ata la relación, no la cadena: si algún día `body` se
   * recalibrara, lo que tiene que seguir siendo cierto es que el suelo del
   * tramo fluido sigue siendo el tamaño base de lectura del sitio.
   */
  it("deckBody arranca exactamente en el tamaño de body y crece desde ahí", () => {
    expect(typo.scale.deckBody.size).toContain(`clamp(${typo.scale.body.size}`);
    expect(typo.scale.deckBody.size).toMatch(/, 1\.115rem\)$/);
  });
});

/*
 * CANDADO DE PELDAÑOS SIN CONSUMIDOR — crítica externa #17 (2026-09-03).
 *
 * POR QUÉ EXISTE. Esta escala ya ha perdido cinco peldaños por el mismo
 * motivo (`h4`, `bodyLg` y `code` en la #9; `deckTitle` en la #14; y `lead`,
 * su alias, en la #9), y las cinco veces el cero se descubrió por un censo
 * MANUAL escrito en un docblock: una lista de patrones de grep que quien
 * viniera después tenía que acordarse de repetir. Nada obligaba a hacerlo, y
 * nada avisaba el día que el último consumidor de un peldaño se iba. Este
 * bloque convierte ese censo en una aserción que corre en cada `pnpm test`.
 *
 * MIDE POR PELDAÑO, NO POR CAMPO, y esa es la decisión de fondo. El hallazgo
 * que abrió esta revisión decía que `h5.size` tenía cero consumidores frente
 * a seis de `h5.weight`/`lineHeight`/`tracking`; el recuento textual es
 * exacto y la conclusión es falsa, porque `ScTypography` lee el peldaño POR
 * ÍNDICE (`theme.data.type.scale[$variant].size`) y consume sus cuatro
 * propiedades de una vez. Medido en navegador real: los títulos de las
 * tarjetas de pilar de Story pintan 18px / 24.3px, que son `h5.size` y
 * `h5.lineHeight`. Un censo por CAMPO sobre esta escala declararía muerto
 * justo lo que se está pintando. El docblock de `h5` en `type.ts` lleva la
 * medición completa.
 *
 * Es la unidad de censo CONTRARIA a la de `vocabulary-consumers.test.ts`, y
 * a propósito: allí cada campo se lee por su nombre y medir por grupo
 * escondía cuatro campos muertos detrás de dos vivos. La unidad correcta no
 * es una preferencia de estilo, es cómo lee el código a cada escala.
 *
 * DOS VÍAS DE CONSUMO, porque las dos son reales y ninguna sola basta:
 * `scale.<peldaño>` (la pieza styled que lee propiedades sueltas) y
 * `variant="<peldaño>"` (el consumidor que pasa por `Typography`). Con solo
 * la primera, `Story.tsx` desaparecería y `h5` daría cero; con solo la
 * segunda, `deckClosing` y `deckBody` —que nadie pasa por `Typography`—
 * darían cero. Ningún fichero de producción pasa `variant` desde una
 * variable, verificado por grep, así que el censo estático los ve a todos.
 *
 * Comentarios DESPOJADOS antes de buscar, por la lección del repo
 * (`task/lessons.md`, 2026-08-11): los docblocks de este mismo fichero y los
 * de `type.ts` CITAN `scale.h5` y `variant="h5"` en prosa para explicar el
 * hallazgo, y sin despojarlos esas citas bastarían para que el candado
 * pasara sin que el código consumiera nada. El guard `(?<!:)` evita truncar
 * una línea por el `//` de una URL dentro de un string, mismo criterio y
 * mismo límite conocido que `vocabulary-consumers.test.ts`.
 */
describe("cada peldaño de la escala tiene consumidor real (crítica externa #17)", () => {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const EXTENSIONES = new Set([".ts", ".tsx"]);

  function recorrer(dir: string, out: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const completo = join(dir, entrada);
      if (statSync(completo).isDirectory()) recorrer(completo, out);
      else if (EXTENSIONES.has(extname(completo))) out.push(completo);
    }
    return out;
  }

  function despojar(fuente: string): string {
    return fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
  }

  const ficheros = [
    ...recorrer(join(raiz, "src")),
    ...recorrer(join(raiz, "app")),
  ]
    .map((f) => ({
      ruta: f.slice(raiz.length + 1).replace(/\\/g, "/"),
      fuente: f,
    }))
    .filter(
      ({ ruta }) =>
        ruta !== "src/theme/tokens/type.ts" && // la fuente, no un consumidor
        !ruta.endsWith(".test.ts") &&
        !ruta.endsWith(".test.tsx"),
    )
    .map(({ ruta, fuente }) => ({
      ruta,
      texto: despojar(readFileSync(fuente, "utf-8")),
    }));

  function consumidoresDe(peldano: string): string[] {
    const patron = new RegExp(`\\bscale\\.${peldano}\\b|variant="${peldano}"`);
    return ficheros.filter((f) => patron.test(f.texto)).map((f) => f.ruta);
  }

  /* Sonda positiva, mismo criterio que `vocabulary-consumers.test.ts`: si el
     mecanismo estuviera roto (raíz equivocada, regex mal escrita, despojo
     demasiado agresivo) el bloque de abajo podría pasar por vacuidad al no
     encontrar NADA. Este test confirma que el instrumento ve las dos vías de
     consumo sobre dos peldaños de consumidor conocido. */
  it("sonda positiva: el censo ve las dos vías de consumo", () => {
    expect(ficheros.length).toBeGreaterThan(50);
    // vía `variant="..."`, la única de este peldaño
    expect(consumidoresDe("h5")).toContain(
      "src/components/sections/Story/Story.tsx",
    );
    // vía `scale....`, la única de este otro
    expect(consumidoresDe("deckBody")).toContain(
      "src/components/sections/Story/story.layers.ts",
    );
  });

  for (const peldano of Object.keys(typo.scale)) {
    it(`${peldano} lo consume al menos un fichero de producción`, () => {
      const consumidores = consumidoresDe(peldano);
      expect(
        consumidores,
        `type.scale.${peldano}: cero consumidores reales -- migra un consumidor o retira el peldaño (y baja el recuento de la escala en el mismo cambio, regla 40)`,
      ).not.toHaveLength(0);
    });
  }
});
