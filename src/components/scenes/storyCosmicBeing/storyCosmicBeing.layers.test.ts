import { describe, it, expect } from "vitest";
import {
  STORY_COSMIC_BEING_LAYERS,
  STORY_COSMIC_BEING_SCROLL_AMP,
  STORY_COSMIC_BEING_SIZES,
  STORY_COSMIC_BEING_VOID,
  storyCosmicBeingAvifSrcSet,
} from "./storyCosmicBeing.layers";

describe("storyCosmicBeing.layers", () => {
  it("tiene las 11 capas, de fondo a frente, con el nucleo del corazon al final", () => {
    expect(STORY_COSMIC_BEING_LAYERS).toHaveLength(11);
    const depths = STORY_COSMIC_BEING_LAYERS.map((l) => l.depth);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]).toBeGreaterThan(depths[i - 1]);
    }
    expect(STORY_COSMIC_BEING_LAYERS.at(-1)?.part).toBe("heart-core");
    expect(STORY_COSMIC_BEING_LAYERS.at(-1)?.glow).toBe("core");
  });

  it("cada capa publica su pista nativa y su pista reducida bajo /story/cosmic-being/", () => {
    for (const layer of STORY_COSMIC_BEING_LAYERS) {
      expect(layer.src).toMatch(/^\/story\/cosmic-being\/.+\.webp$/);
      expect(layer.srcSmall).toMatch(/^\/story\/cosmic-being\/.+-1024\.webp$/);
    }
  });

  it("STORY_COSMIC_BEING_VOID es el negro-violeta verbatim del manifest de esta escena", () => {
    expect(STORY_COSMIC_BEING_VOID).toBe("#05010e");
  });

  it("solo space-base declara blend normal (es opaca); las otras diez son aditivas (plus-lighter)", () => {
    const [base, ...rest] = STORY_COSMIC_BEING_LAYERS;
    expect(base?.part).toBe("space-base");
    expect(base?.blend).toBe("normal");
    expect(rest).toHaveLength(10);
    rest.forEach((layer) => expect(layer.blend).toBe("plus-lighter"));
  });

  it("STORY_COSMIC_BEING_SIZES declara el breakpoint movil de la Decision D-E (2026-08-09): 340px bajo 700px, 100vw en el resto", () => {
    expect(STORY_COSMIC_BEING_SIZES).toBe("(max-width: 700px) 340px, 100vw");
  });

  /*
   * Task 20 (motion resto): STORY_COSMIC_BEING_SCROLL_AMP pasa de 190 a 32,
   * igualando la CONSTANTE de amplitud de sus tres hermanas
   * (CONTACT_GUARDIAN_SCROLL_AMP/FEATURES_ORBITAL_SCROLL_AMP/
   * JOURNEY_PORTAL_SCROLL_AMP, las tres en 32). Verificado en navegador real
   * (ver el docblock de la propia constante e informe de la tarea) que la
   * escena sigue leyendose como parallax, con la ventana de transicion de
   * entrada/salida del pin mas suave. Validado con el bug inyectado a
   * proposito: revirtiendo temporalmente a 190, este test se puso en rojo;
   * restaurado, volvio a verde.
   */
  it("Task 20: STORY_COSMIC_BEING_SCROLL_AMP iguala la constante de amplitud de sus hermanas (32, no 190)", () => {
    expect(STORY_COSMIC_BEING_SCROLL_AMP).toBe(32);
  });
});

/*
 * Candado de la convencion AVIF (2026-08-17). storyCosmicBeingAvifSrcSet
 * deriva las rutas .avif por sustitucion de extension en vez de duplicar
 * once pares de rutas en la tabla; el riesgo real de esa convencion -- que
 * el fichero derivado NO exista y el <source> apunte a un 404 silencioso
 * (el navegador con AVIF elegiria esa pista y la capa no pintaria) -- se
 * cierra aqui comprobando con node:fs que cada AVIF derivado existe de
 * verdad en public/, con tamano mayor que cero.
 *
 * Validado con bug inyectado real: renombrando temporalmente
 * 07-geometry.avif, este test cae en rojo; restaurado, vuelve a verde.
 */
describe("storyCosmicBeing AVIF", () => {
  it("cada pista AVIF derivada existe en public/ y no esta vacia", async () => {
    const { statSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = join(here, "..", "..", "..", "..", "public");

    for (const layer of STORY_COSMIC_BEING_LAYERS) {
      for (const track of [layer.src, layer.srcSmall]) {
        const avif = track.replace(/\.webp$/, ".avif");
        const stat = statSync(join(publicDir, avif.replace(/^\//, "")));
        expect(
          stat.size,
          `la pista derivada ${avif} no existe o esta vacia: el <source> AVIF apuntaria a un 404 y la capa no pintaria en navegadores con AVIF`,
        ).toBeGreaterThan(0);
      }
    }
  });

  /*
   * Candado de la premultiplicacion (ola O, frente defensivo). Las diez capas
   * aditivas publican su AVIF con el alfa YA multiplicado dentro del RGB y sin
   * canal alfa: para una capa que se compone en `plus-lighter` (o en su
   * fallback `screen`) sobre una base opaca, la contribucion es `alfa x color`
   * en los dos casos, asi que el resultado en pantalla es el mismo — pero el
   * canal alfa costaba el 90 % del fichero. Medido: las 20 pistas aditivas
   * pasaron de 1.108.805 a 100.388 B (-90,9 %), y la escena entera en su pista
   * ancha de 1.280 px, de 655.523 a 59.696 B.
   *
   * Lo que este candado atrapa es la REGRESION de la causa raiz, con nombre:
   * si alguien vuelve a generar estas pistas con canal alfa (rehaciendo la
   * cadena de Pillow anterior, por ejemplo), el peso se multiplica por diez y
   * el ancla de 1,5 MB del tema oscuro vuelve a depender de que precargue el
   * navegador. El presupuesto en bytes lo vigila aparte
   * `scripts/check-dark-art-weight.mjs`; aqui se vigila el porque.
   *
   * `00-space-base` queda FUERA a proposito: es la unica capa opaca, se compone
   * en blend `normal` y nunca tuvo alfa que premultiplicar.
   *
   * Se detecta leyendo los bytes del fichero: un AVIF con alfa declara su item
   * auxiliar con la URN `urn:mpeg:mpegB:cicp:systems:auxiliary:alpha` en la
   * caja `auxC`, y un AVIF sin alfa no la lleva. Validado con bug inyectado
   * real: restaurando `07-geometry.avif` tal y como estaba en `f486570`, este
   * test se puso en rojo; restaurado el premultiplicado, verde.
   */
  it("las diez capas aditivas publican su AVIF premultiplicado, sin canal alfa", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = join(here, "..", "..", "..", "..", "public");
    const MARCA_ALFA = "urn:mpeg:mpegB:cicp:systems:auxiliary:alpha";

    const aditivas = STORY_COSMIC_BEING_LAYERS.filter(
      (layer) => layer.blend === "plus-lighter",
    );
    expect(aditivas).toHaveLength(10);

    for (const layer of aditivas) {
      for (const track of [layer.src, layer.srcSmall]) {
        const avif = track.replace(/\.webp$/, ".avif");
        const bytes = readFileSync(join(publicDir, avif.replace(/^\//, "")));
        expect(
          bytes.includes(MARCA_ALFA),
          `${avif} lleva canal alfa: esa pista deberia ir premultiplicada (alfa dentro del RGB). Con alfa el fichero pesa ~10x y el peso del tema oscuro vuelve a depender de lo que precargue el navegador.`,
        ).toBe(false);
      }
    }
  });

  it("el srcSet derivado conserva anchos y orden de la pista WebP", () => {
    const layer = STORY_COSMIC_BEING_LAYERS[1];
    expect(storyCosmicBeingAvifSrcSet(layer)).toBe(
      `${layer.srcSmall.replace(".webp", ".avif")} 1024w, ${layer.src.replace(".webp", ".avif")} 1280w`,
    );
  });
});
