import { describe, it, expect } from "vitest";
import {
  AURA_LAYERS,
  AURA_ORB_DEPTH,
  AURA_STAGGER,
  AURA_SURFACE,
  AURA_ASPECT,
  AURA_PRELOADS,
  auraAvifSrcSet,
} from "./aura.layers";
import { parseOklch } from "@/theme/tokens/contrast";

describe("aura.layers", () => {
  it("expone exactamente las cuatro capas publicadas, en el orden de pintado (energia detras de las manos)", () => {
    // Contrato cerrado: nº de capas Y orden. El orden de pintado (spec §15.3)
    // NO es el mismo que el orden de revelado del stagger (AURA_STAGGER): la
    // energía va detrás de las manos, no delante como en el primer lote. El
    // quinto escalón (el orbe) no es una capa de esta tabla — vive en
    // AURA_ORB_DEPTH porque lo renderiza `Sol`, no un WebP (spec §5.2).
    expect(AURA_LAYERS.map((layer) => layer.part)).toEqual([
      "field",
      "energy",
      "handLeft",
      "handRight",
    ]);
  });

  it("cada capa apunta a su ruta publicada, con variante estrecha y profundidad medida", () => {
    expect(AURA_LAYERS).toEqual([
      {
        part: "field",
        src: "/hero/aura/00-field.webp",
        srcSmall: "/hero/aura/00-field-1024.webp",
        depth: 0,
        fullBleed: true,
        avif: true,
      },
      {
        part: "energy",
        src: "/hero/aura/01-energy.webp",
        srcSmall: "/hero/aura/01-energy-1024.webp",
        depth: 0.15,
        fullBleed: false,
        avif: true,
      },
      {
        part: "handLeft",
        src: "/hero/aura/02-hand-left.webp",
        srcSmall: "/hero/aura/02-hand-left-1024.webp",
        depth: 0.3,
        fullBleed: false,
        avif: true,
      },
      {
        part: "handRight",
        src: "/hero/aura/03-hand-right.webp",
        srcSmall: "/hero/aura/03-hand-right-1024.webp",
        depth: 0.3,
        fullBleed: false,
        avif: true,
      },
    ]);
  });

  it("solo el campo va a sangre; el resto vive dentro del marco del sujeto", () => {
    // El campo es un degradado difuso (estirarlo es invisible); las manos y
    // la energía tienen forma reconocible y se anclan por el orbe (spec §5.2).
    const fullBleedParts = AURA_LAYERS.filter((layer) => layer.fullBleed).map(
      (layer) => layer.part,
    );
    expect(fullBleedParts).toEqual(["field"]);
  });

  it("las dos manos comparten profundidad a propósito: son el mismo plano físico", () => {
    const handLeft = AURA_LAYERS.find((layer) => layer.part === "handLeft");
    const handRight = AURA_LAYERS.find((layer) => layer.part === "handRight");
    expect(handLeft?.depth).toBe(handRight?.depth);
  });

  it("la energia es menos profunda que las manos: pinta detras de ellas, no delante", () => {
    // Revisión 2026-07-27 (spec §15.3/§15.4): el segundo lote compone la
    // energía DETRÁS de las manos, así que su profundidad de parallax tiene
    // que ser MENOR que la de las manos (0.30), no mayor como en el primer
    // lote (0.55) — lo que está detrás se mueve menos con el cursor.
    const energy = AURA_LAYERS.find((layer) => layer.part === "energy");
    const handLeft = AURA_LAYERS.find((layer) => layer.part === "handLeft");
    expect(energy?.depth).toBeLessThan(handLeft?.depth as number);
    expect(energy?.depth).toBeGreaterThan(0);
  });

  it("el orbe (Sol) es la capa mas profunda de la composicion, por encima incluso de la energia", () => {
    // La energía SÍ tiene presencia real bajo el orbe en el arte nuevo (spec
    // §15.4), pero `Sol`, opaco, sigue tapando esa zona igual que antes, así
    // que sigue siendo la capa más cercana al espectador.
    const deepestPublished = Math.max(
      ...AURA_LAYERS.map((layer) => layer.depth),
    );
    expect(AURA_ORB_DEPTH).toBeGreaterThan(deepestPublished);
  });

  it("AURA_SURFACE es el pastel medido del campo y lo entiende el helper de contraste", () => {
    expect(AURA_SURFACE).toBe("oklch(0.942 0.023 285)");
    expect(() => parseOklch(AURA_SURFACE)).not.toThrow();
    expect(parseOklch(AURA_SURFACE)).toEqual({ l: 0.942, c: 0.023, h: 285 });
  });

  it("AURA_ASPECT es la misma relacion de aspecto del lienzo que EYE_ASPECT: mismo tamano de origen", () => {
    expect(AURA_ASPECT).toBe("1672 / 941");
  });

  it("AURA_STAGGER escalona orbe -> campo -> energia -> mano izquierda -> mano derecha, el orden exacto del encargo (revision 2026-07-27)", () => {
    // Cierra el contrato del escalonado de revelado (tema claro): Sol
    // (el orbe) va primero, tal y como pide el brief, y las manos van al
    // final -- el mismo orden en que el brief las enumera.
    expect(AURA_STAGGER).toEqual([
      "orb",
      "field",
      "energy",
      "handLeft",
      "handRight",
    ]);
  });

  it("AURA_STAGGER contiene exactamente los part de AURA_LAYERS mas 'orb': el orden de REVELADO es distinto del de PINTADO", () => {
    // No basta con comparar longitudes: este test ata el CONJUNTO (sin
    // importar el orden) para que el escalonado no pueda perder ni ganar una
    // pieza respecto a la tabla de pintado + el orbe, aunque los DOS ordenes
    // (revelado aqui, pintado en AURA_LAYERS) sigan siendo legitimamente
    // distintos -- auraStep() busca por nombre de data-part, no por
    // posicion, asi que no tienen por que coincidir.
    const paintedParts = AURA_LAYERS.map((layer) => layer.part);
    expect(new Set(AURA_STAGGER)).toEqual(new Set([...paintedParts, "orb"]));
  });
});

/*
 * Candado del AVIF del aura. Nacio mixto (2026-08-18) porque la guarda del
 * 5 % dejo "energy" fuera; la critica externa #13 (2026-08-20) demostro que
 * esa guarda se aplico a la pista EQUIVOCADA -- la de 1024 (-4,7 %) en vez de
 * la de 1672 (-11,3 %), que es la que descarga un escritorio y ademas ES el
 * elemento LCP del tema claro. Con la capa convertida, las CUATRO declaran
 * avif: true.
 *
 * La rama `else` del bucle (avif:false => el .avif NO puede existir) se
 * conserva viva a proposito aunque hoy no la ejerza ninguna capa: es la que
 * impide que una capa futura declare `false` y deje un derivado huerfano en
 * `public/`. Por eso el `it` de abajo lleva ADEMAS una sonda positiva
 * explicita -- sin ella, poner las cuatro a `false` y borrar los ficheros
 * pasaria en verde por vacuidad.
 *
 * El 404 silencioso de la convencion se cierra con node:fs. Validado con bug
 * inyectado real: renombrar un .avif -> rojo.
 */
describe("aura AVIF", () => {
  it("las CUATRO capas declaran avif:true y tienen sus dos pistas derivadas en public/", async () => {
    const { statSync, existsSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = join(here, "..", "..", "..", "..", "public");

    for (const layer of AURA_LAYERS) {
      for (const track of [layer.src, layer.srcSmall]) {
        const avif = join(
          publicDir,
          track.replace(/\.webp$/, ".avif").replace(/^\//, ""),
        );
        if (layer.avif) {
          expect(statSync(avif).size, `${track} sin AVIF`).toBeGreaterThan(0);
        } else {
          expect(
            existsSync(avif),
            `${layer.part} declara avif:false pero su fichero existe: o se actualiza la tabla o se borra el fichero`,
          ).toBe(false);
        }
      }
    }
    // Sonda positiva: sin esto, `avif:false` en las cuatro capas + los
    // ficheros borrados pasaria el bucle en verde por vacuidad.
    expect(AURA_LAYERS.filter((l) => l.avif)).toHaveLength(AURA_LAYERS.length);
    // "energy" es la capa que la critica externa #13 rescato de la guarda mal
    // aplicada: su pista de 1672 (la del LCP claro) ahorra -11,3 %, no -4,7 %.
    expect(AURA_LAYERS.find((l) => l.part === "energy")?.avif).toBe(true);
  });

  it("AURA_PRELOADS precarga AVIF tipado en toda capa convertida, y WebP sin type en la que no lo este", () => {
    AURA_PRELOADS.forEach((preload, i) => {
      const layer = AURA_LAYERS[i];
      if (layer.avif) {
        expect(preload.type).toBe("image/avif");
        expect(preload.srcSet).toBe(auraAvifSrcSet(layer));
      } else {
        expect(preload.type).toBeUndefined();
        expect(preload.srcSet).toContain(".webp");
      }
    });
  });
});
