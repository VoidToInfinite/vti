import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { focusRing } from "./focus";
import { themes } from "../themes";

/*
 * ANILLO DE FOCO ÚNICO (crítica externa #14, P1 de Craft, 2026-09-02).
 *
 * El defecto que protegen estos candados: el sitio tenía TRES vocabularios de
 * anillo de foco -- el `outline` global, un halo aditivo de 4px por
 * `box-shadow` en seis controles, y un anillo sustitutivo de 3px con
 * `outline: none` en las marcas de raíl de los decks oscuros -- así que el
 * indicador cambiaba según el componente y según la rama de tema. El censo
 * completo y el porqué de la decisión viven en el docblock de `focus.ts`.
 *
 * jsdom no pinta ni hace layout (regla 44) y `createGlobalStyle` no inyecta
 * nada bajo Vitest (lección del repo, 2026-07-25), así que NINGÚN test puede
 * afirmar aquí que el anillo se VE. Lo que sí se puede atar, y es lo que
 * decide si el defecto vuelve, es dónde está DECLARADO: un solo token, un
 * solo consumidor, cero copias sueltas.
 */
describe("focusRing: la geometría del anillo de foco", () => {
  it("declara exactamente grosor, estilo y offset -- ni un valor más", () => {
    expect(focusRing).toEqual({
      width: "2px",
      style: "solid",
      offset: "2px",
    });
  });

  /*
   * Los valores son los que el anillo global YA tenía antes de la
   * unificación: para la inmensa mayoría de elementos del sitio esta entrega
   * no cambia un solo píxel. Este candado es el que obliga a que un cambio
   * de geometría del anillo sea una decisión deliberada y no un efecto
   * colateral de mover código de sitio.
   */
  it("el trazo es continuo y de al menos 2px (WCAG 2.4.7: el indicador tiene que verse)", () => {
    expect(focusRing.style).toBe("solid");
    expect(parseFloat(focusRing.width)).toBeGreaterThanOrEqual(2);
  });

  it("viaja en el tema, idéntico en las dos pieles (es geometría, no color)", () => {
    expect(themes.light.focusRing).toBe(focusRing);
    expect(themes.dark.focusRing).toBe(focusRing);
  });
});

/**
 * Quita comentarios de bloque y de línea antes de buscar en el fuente.
 *
 * Es obligatorio y no un adorno: los seis componentes que perdieron su anillo
 * conservan un comentario que EXPLICA lo que había ahí, y esos comentarios
 * mencionan `semantic.focus` y `outline: none` literalmente. Sin este paso,
 * los candados de más abajo darían rojo por la documentación del propio
 * arreglo. Es además la lección del repo del 2026-08-11 en su forma inversa:
 * un candado que busca texto crudo de fuente no puede distinguir código de
 * comentario si no despoja primero.
 *
 * El `//` solo se trata como comentario cuando no va precedido de `:`, para
 * no truncar una línea por el `//` de una URL (el esquema seguido de dos barras).
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

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

describe("candado: el anillo de foco se declara en UN solo sitio", () => {
  const themeDir = dirname(fileURLToPath(import.meta.url));
  const srcRoot = join(themeDir, "..", "..");
  const appRoot = join(srcRoot, "..", "app");
  const globalStyles = join(themeDir, "..", "GlobalStyles.tsx");

  /**
   * Sin excepciones. `Card.tsx` fue la última deuda declarada: la tarea que
   * unificó el anillo (ola de cinco agentes en paralelo sobre el mismo árbol,
   * 2026-09-02) no tenía ese fichero en su dominio y dejó su halo de
   * `box-shadow` sancionado aquí; la integración de la misma ola lo saldó
   * borrando el `box-shadow` del bloque `&:focus-visible` -- el
   * `border-color` y la elevación de ese bloque son afordancias propias de
   * la card y se quedan. La lista se conserva vacía a propósito: si alguien
   * vuelve a necesitar una excepción, tiene que escribirla aquí con su porqué.
   */
  const DEUDA_DECLARADA: string[] = [];

  const sourceFiles = [
    ...listSourceFiles(srcRoot),
    ...listSourceFiles(appRoot),
  ];

  it("solo GlobalStyles.tsx consume el rol semantic.focus", () => {
    // Sonda positiva: si el recorrido no encontrara ficheros, el test de
    // abajo pasaría por vacuidad sin comprobar nada.
    expect(sourceFiles.length).toBeGreaterThan(50);

    const consumidores = sourceFiles.filter((file) =>
      stripComments(readFileSync(file, "utf-8")).includes("semantic.focus"),
    );

    expect(consumidores.sort()).toEqual(
      [globalStyles, ...DEUDA_DECLARADA].sort(),
    );
  });

  it("ningún fichero apaga el anillo global con outline: none", () => {
    const offenders = sourceFiles.filter((file) =>
      /outline\s*:\s*none/.test(stripComments(readFileSync(file, "utf-8"))),
    );

    expect(offenders).toEqual([]);
  });

  it("GlobalStyles.tsx compone el anillo con el token, no con literales", () => {
    const source = stripComments(readFileSync(globalStyles, "utf-8"));

    expect(source).toContain("theme.data.focusRing.width");
    expect(source).toContain("theme.data.focusRing.style");
    expect(source).toContain("theme.data.focusRing.offset");
    // El anillo tampoco puede volver a escribirse a mano al lado del token.
    expect(source).not.toMatch(/outline:\s*\d/);
    expect(source).not.toMatch(/outline-offset:\s*\d/);
  });
});
