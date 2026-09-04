import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { REVEAL, DECK, OVERLAY, PRESS, AMBIENT } from "./vocabulary";
import { STORY_FIGURE_FLOAT_MS } from "@/components/sections/Story/story.layers";
import { motion } from "@/theme/tokens/motion";

/**
 * Contrato cerrado (regla 40 del manual): los cuatro grupos se aseveran con
 * `toEqual` completo, mismo criterio que `system.test.ts` aplica a
 * `motion.duration`/`motion.easing`. Quien añada, quite o cambie un campo de
 * cualquiera de los cuatro grupos actualiza estos objetos esperados en el
 * MISMO commit — la aserción nunca se relaja para que el test vuelva a
 * pasar sin más.
 *
 * Validado con bug inyectado (regla 34): se cambió temporalmente
 * `REVEAL.durationMs` de 480 a 999 en `vocabulary.ts`, se confirmó que
 * "REVEAL expone su contrato exacto" se ponía en rojo (valor recibido 999
 * frente al 480 esperado), se restauró el valor original y se confirmó que
 * la suite completa de este fichero volvía a verde. Ver el informe de la
 * tarea para la salida literal de las dos ejecuciones.
 *
 * Fix wave B (2026-08-12): `REVEAL` pierde `stepMs`, `DECK` pierde
 * `slideDurationMs`/`slideShift`/`scrubMs`/`sceneDepthShift` y `PRESS` pierde
 * `hoverLift` -- los seis campos sin consumidor real de producción que
 * `vocabulary-consumers.test.ts` (medición corregida a nivel de CAMPO en
 * esta misma revisión) atrapó (los cinco primeros ya los traía la review de
 * rama; `hoverLift` lo encontró el propio candado nuevo). Ver el docblock de
 * cabecera de `vocabulary.ts` para el porqué completo, y los docblocks de
 * `DECK`/`PRESS` en ese mismo fichero para la deuda de migración/duplicación
 * que queda abierta en `src/components/**`.
 *
 * Fix wave D (hallazgo D2, 2026-08-12): `DECK` recupera `sceneDepthShift`/
 * `slideShift` -- esta vez CON consumidor real (`story.layers.ts`/
 * `journey.layers.ts`, dentro de `src/components/**`), así que el contrato
 * esperado de abajo pasa de dos campos a cuatro. `slideDurationMs`/`scrubMs`
 * siguen retirados: no tenían el defecto de duplicación que motivó esta
 * reintroducción (ver el docblock de `DECK` en `vocabulary.ts`).
 */
describe("vocabulary", () => {
  it("REVEAL expone su contrato exacto", () => {
    const expectedReveal = {
      durationMs: 480,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      shift: "16px",
    };
    expect(REVEAL).toEqual(expectedReveal);
  });

  it("DECK expone su contrato exacto", () => {
    const expectedDeck = {
      railDurationMs: 200,
      exitDurationMs: 200,
      sceneDepthShift: "6dvh",
      slideShift: "40px",
    };
    expect(DECK).toEqual(expectedDeck);
  });

  /*
   * Crítica externa #14 (2026-09-02): `openMs`/`closeMs` pasan de 180/120
   * (dos literales que no existían en ninguna escala) al peldaño más cercano
   * de `motion.durationMs` -- `base` (200) y `fast` (100). Ver el docblock de
   * OVERLAY en `vocabulary.ts` para los deltas y para por qué se redondea en
   * vez de ampliar la escala.
   */
  it("OVERLAY expone su contrato exacto (Task 17, plan premium F1-F5)", () => {
    const expectedOverlay = {
      openMs: 200,
      closeMs: 100,
      closedScale: 0.97,
    };
    expect(OVERLAY).toEqual(expectedOverlay);
  });

  it("PRESS expone su contrato exacto", () => {
    const expectedPress = {
      durationMs: 100,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      activeScale: 0.98,
      hoverGuard: "(hover: hover) and (pointer: fine)",
    };
    expect(PRESS).toEqual(expectedPress);
  });

  /*
   * Task 20 (motion resto) colapsa AMBIENT de cinco campos a tres: `pulseMs`
   * se fusiona en `breathMs` (storyCosmicBeing.parts.tsx pasa a consumirlo) y
   * `orbitSlowMs` se retira porque Sol.tsx lo deriva de `AMBIENT.orbitMs * 2`
   * (mismo valor exacto, 40000, sin necesitar un cuarto campo). Ver el
   * docblock de AMBIENT en vocabulary.ts para el criterio completo.
   */
  it("AMBIENT expone su contrato exacto (crítica #18: cuatro campos, con glowMs)", () => {
    const expectedAmbient = {
      breathMs: 5400,
      glowMs: 7000,
      floatMs: 9000,
      orbitMs: 20000,
    };
    expect(AMBIENT).toEqual(expectedAmbient);
  });

  it("REVEAL y PRESS comparten la misma curva de easing (D del docblock final de vocabulary.ts)", () => {
    // Documenta la coincidencia deliberada, no accidental: si algun dia deja
    // de ser cierta, esta asercion obliga a decidirlo a proposito en vez de
    // que el drift pase desapercibido.
    expect(REVEAL.easing).toBe(PRESS.easing);
  });
});

/**
 * Candado de PROCEDENCIA (crítica externa #14, 2026-09-02).
 *
 * Los `toEqual` de arriba candan el valor de CADA CAMPO, uno a uno, contra
 * un número escrito en el test: pasan igual si el vocabulario inventa un
 * tiempo que no existe en ninguna escala, siempre que el test lo copie. Lo
 * que estos tests añaden es la PERTENENCIA: todo tiempo y toda curva que
 * este vocabulario exporta tiene que ser un valor que `motion.*` también
 * expone, así que un valor inventado no puede entrar aunque se actualice el
 * contrato de arriba.
 *
 * Lo que estos tests NO pueden ver, y quién lo ve: un literal escrito a mano
 * que resuelva al MISMO valor que el token es indistinguible en tiempo de
 * ejecución (`task/lessons.md`, 2026-08-12). Esa mitad -- la procedencia
 * sintáctica -- la vigila `scripts/detect-anti-patterns.mjs`: desde la
 * crítica externa #14 este fichero no tiene ninguna entrada en el allowlist
 * de `easing-literal` ni de `duration-const`, así que un `cubic-bezier(...)`
 * o un `durationMs: 480` escritos otra vez a mano en `vocabulary.ts` ponen
 * el gate en rojo. Las dos capas juntas cierran el hallazgo; ninguna de las
 * dos sola lo cierra.
 *
 * Se recorren las claves REALES de los grupos exportados, no una lista
 * escrita a mano: un campo `*Ms` nuevo, o un `easing` nuevo en cualquier
 * grupo, queda cubierto el día que se añada sin tocar este fichero (mismo
 * criterio que `vocabulary-consumers.test.ts` usa para medir por campo).
 */
describe("vocabulary: procedencia de tiempos y curvas", () => {
  /*
   * Los cuatro grupos de INTERFAZ. `AMBIENT` queda fuera a propósito y con
   * su propio test más abajo: son bucles de escena decorativa de varios
   * segundos, entre 2,5 y 9,5 veces el peldaño más largo de la escala de
   * interfaz.
   */
  const GRUPOS_DE_INTERFAZ = { REVEAL, DECK, OVERLAY, PRESS } as const;

  const escalaMs: number[] = Object.values(motion.durationMs);
  const escalaCurvas: string[] = Object.values(motion.easing);

  const camposDeTiempo = Object.entries(GRUPOS_DE_INTERFAZ).flatMap(
    ([grupo, valores]) =>
      Object.entries(valores)
        .filter(([campo]) => campo.endsWith("Ms"))
        .map(([campo, valor]) => [`${grupo}.${campo}`, valor] as const),
  );

  const camposDeCurva = Object.entries(GRUPOS_DE_INTERFAZ).flatMap(
    ([grupo, valores]) =>
      Object.entries(valores)
        .filter(([campo]) => campo === "easing")
        .map(([campo, valor]) => [`${grupo}.${campo}`, valor] as const),
  );

  it("hay campos que medir (el barrido de arriba no puede quedarse vacío en silencio)", () => {
    expect(camposDeTiempo.length).toBeGreaterThanOrEqual(6);
    expect(camposDeCurva.length).toBeGreaterThanOrEqual(2);
  });

  it.each(camposDeTiempo)(
    "%s es un peldaño de motion.durationMs",
    (_nombre, valor) => {
      expect(escalaMs).toContain(valor);
    },
  );

  it.each(camposDeCurva)(
    "%s es un peldaño de motion.easing",
    (_nombre, valor) => {
      expect(escalaCurvas).toContain(valor);
    },
  );

  /*
   * Excepción DECLARADA, con su medición: los tres campos de AMBIENT están
   * fuera de la escala a propósito, y este test lo afirma en positivo. Si
   * algún día uno de ellos cayera dentro, no sería un fallo: sería la señal
   * de que ese campo ya puede leer el token, y el test obliga a decidirlo.
   */
  it("AMBIENT es la única excepción, y lo es por orden de magnitud", () => {
    const masLargo = Math.max(...escalaMs);
    expect(masLargo).toBe(2100);

    for (const valor of Object.values(AMBIENT)) {
      expect(escalaMs).not.toContain(valor);
      expect(valor).toBeGreaterThan(masLargo * 2);
    }
  });
});

/**
 * CANDADO DEL RITMO DE FLOTACIÓN: una sola fuente y una sola unidad (crítica
 * externa #18, 2026-09-04).
 *
 * EL DEFECTO QUE ATRAPA, medido antes de arreglarlo sobre el build de
 * producción servido (tema oscuro, 1440x900, `document.visibilityState` en
 * `visible`): el mismo ritmo ambiental estaba declarado CUATRO veces y en DOS
 * sistemas de unidades. `AMBIENT.floatMs` (9000, el token), un gemelo literal
 * `STORY_FIGURE_FLOAT_MS = 9000` en `story.layers.ts`, el literal CSS `"9s"`
 * de `eye.parts.tsx` y —con otro número y otro rol— el 8000 de Contacto. En
 * el CSS realmente servido convivían `9000ms` x8 con `9s` x3, y `7000ms` con
 * `7s` x3: mismo número, dos idiomas, indistinguibles al leer el CSS
 * renderizado.
 *
 * LOS TRES TESTS MIDEN TRES COSAS DISTINTAS, a propósito:
 *  1. La FUENTE: que la constante de Story no vuelva a declarar el número.
 *     Un test de valor no bastaría — `9000 === AMBIENT.floatMs` pasa en verde
 *     con el literal de vuelta (`task/lessons.md`, 2026-08-12), así que este
 *     lee el fichero.
 *  2. La UNIDAD: que ningún fichero nuevo escriba una duración en SEGUNDOS.
 *     La lista de los que todavía lo hacen está cerrada y es la deuda
 *     declarada de esta ola (el arte del mascota y del agujero de gusano,
 *     fuera del alcance de este cambio); cualquier fichero de más pone el
 *     gate en rojo.
 *  3. El PAR: que los dos resplandores superpuestos del ojo no acaben
 *     colapsados en el mismo peldaño. Es el riesgo que introduce tokenizar
 *     —"los dos son ambientales, que lean el mismo campo"— y destruiría lo
 *     único que hace que la composición funcione: que no laten a la vez.
 */
describe("el ritmo de flotación tiene UNA fuente y UNA unidad (crítica #18)", () => {
  const raizProyecto = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  const RAICES = ["src", "app"];
  const EXTENSIONES = new Set([".ts", ".tsx"]);

  function recorrer(dir: string, salida: string[] = []): string[] {
    for (const entrada of readdirSync(dir)) {
      const completo = join(dir, entrada);
      if (statSync(completo).isDirectory()) recorrer(completo, salida);
      else if (EXTENSIONES.has(extname(completo))) salida.push(completo);
    }
    return salida;
  }

  function ficherosDeProduccion(): string[] {
    return RAICES.flatMap((raiz) => recorrer(join(raizProyecto, raiz))).filter(
      (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
    );
  }

  function relativo(fichero: string): string {
    return fichero
      .slice(raizProyecto.length + 1)
      .split("\\")
      .join("/");
  }

  /* Mismo despojo que el resto de censos del repo: sin él, los docblocks de
     esta ola —que citan `"9s"` y `9000` en prosa para explicar la migración—
     bastarían para poner el candado en rojo por hablar del problema. */
  function despojar(fuente: string): string {
    return fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
  }

  it("Story no declara el ritmo: lo lee de AMBIENT.floatMs", () => {
    const fuente = readFileSync(
      join(raizProyecto, "src/components/sections/Story/story.layers.ts"),
      "utf-8",
    );
    const declaracion = /export const STORY_FIGURE_FLOAT_MS =([^;]*);/.exec(
      fuente,
    )?.[1];

    expect(
      declaracion,
      "desapareció la declaración de STORY_FIGURE_FLOAT_MS",
    ).toBeDefined();
    expect(
      declaracion,
      "STORY_FIGURE_FLOAT_MS volvió a declarar su propio número: el ritmo de flotación tiene otra vez dos fuentes",
    ).toContain("AMBIENT.floatMs");
    expect(STORY_FIGURE_FLOAT_MS).toBe(AMBIENT.floatMs);
  });

  /*
   * Los DOS ficheros de la lista son deuda declarada, no excepción de diseño:
   * `Sol.tsx` (70s, 6s, 3.4s) y `Wormhole.tsx` (34s, 24s, 18s) son arte del
   * ojo fuera del alcance de esta entrega, y el 18s del segundo tiene además
   * gemelo en milisegundos vivo en el CSS servido (`SECTION_BEAM_SWEEP_MS =
   * 18000`). Cuando se migren, este array se queda vacío y el test lo sigue
   * midiendo igual.
   */
  it("ningún fichero NUEVO escribe una duración en segundos", () => {
    const enSegundos = /(?<![\w.$])(\d+(?:\.\d+)?)s(?![\w-])/;
    const conSegundos = ficherosDeProduccion()
      .filter((fichero) => {
        const codigo = despojar(readFileSync(fichero, "utf-8"));
        return codigo.split(/\r?\n/).some((linea) => {
          const m = enSegundos.exec(linea);
          return m !== null && parseFloat(m[1]) !== 0;
        });
      })
      .map(relativo)
      .sort();

    expect(conSegundos).toEqual([
      "src/components/scenes/eye/mascots/Sol.tsx",
      "src/components/scenes/eye/mascots/Wormhole.tsx",
    ]);
  });

  it("los dos resplandores superpuestos del ojo NO comparten peldaño", () => {
    expect(AMBIENT.glowMs).not.toBe(AMBIENT.floatMs);

    const fuente = despojar(
      readFileSync(
        join(raizProyecto, "src/components/scenes/eye/eye.parts.tsx"),
        "utf-8",
      ),
    );
    expect(fuente).toContain("AMBIENT.glowMs");
    expect(fuente).toContain("AMBIENT.floatMs");
  });
});
