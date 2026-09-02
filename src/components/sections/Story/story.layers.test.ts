import { describe, it, expect } from "vitest";
import { motion } from "@/theme/tokens/motion";
import { type } from "@/theme/tokens/type";
import {
  STORY_DARK_HEIGHT,
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_NOTE_WEIGHT,
  STORY_DECK_PADDING_INLINE_END,
  STORY_DECK_PILLAR_BODY_SIZE,
  STORY_DECK_PILLAR_SUBTITLE_SIZE,
  STORY_DECK_PILLAR_TITLE_SIZE,
  STORY_DECK_TAIL_SCREENS,
  STORY_DECK_TITLE_SIZE,
  STORY_DECK_TRACK_HEIGHT,
  STORY_SCRUB_MS,
  STORY_SLIDES,
} from "./story.layers";

/**
 * Constantes de la presentacion de Story (spec
 * `2026-07-31-story-deck-hero-transition-design.md`). Solo se aseveran las
 * que tienen una RELACION que puede desincronizarse en silencio: un valor
 * suelto no necesita test, pero una constante que dice "vale lo mismo que
 * este token" o "se deriva de estas otras dos" si -- es el mismo criterio
 * con el que `useNavDetach.test.tsx` ata `NAV_DETACH_ANIM_MS` a
 * `motion.duration.slower`.
 */
describe("constantes de la presentacion de Story", () => {
  it("STORY_SCRUB_MS no se desvia de la escala de movimiento del tema", () => {
    // El docblock de la constante afirma que esta atada a
    // `motion.duration.slow`. Sin esta asercion esa afirmacion seria una
    // nota de buenas intenciones: cualquiera podria mover la constante o el
    // token por separado y el comentario quedaria mintiendo.
    expect(STORY_SCRUB_MS).toBe(parseInt(motion.duration.slow, 10));
  });

  it("la pista mide una diapositiva por cada slide mas la cola de hold de Journey", () => {
    // Desde D3 (spec 2026-08-02-journey-overlay-transition-design.md) la
    // pista ya no mide solo `STORY_SLIDES` pantallas: suma
    // `STORY_DECK_TAIL_SCREENS`, la zona de hold en la que el stage sigue
    // pegado mientras Journey se superpone. La comparacion se hace contra
    // las CONSTANTES, nunca contra el literal `7`: si alguna de las dos
    // cambiara (numero de diapositivas, o el ancho del solape de Journey),
    // este test tiene que seguir describiendo la derivacion real en vez de
    // congelar un numero que dejaria de significar lo mismo.
    expect(STORY_DECK_TRACK_HEIGHT).toBe(
      `calc((${STORY_SLIDES} + ${STORY_DECK_TAIL_SCREENS}) * ${STORY_DARK_HEIGHT})`,
    );
  });

  it("la cola de hold mide exactamente una pantalla, la misma medida que el solape de Journey", () => {
    // STORY_DECK_TAIL_SCREENS se expresa en pantallas (adimensional) y debe
    // valer 1: es la misma magnitud que JOURNEY_OVERLAY_RISE
    // (journey.layers.ts), que la igualdad numerica entre los dos ficheros
    // ata como test aparte (Journey.test.tsx, invariante D5) para no acoplar
    // los datos de las dos secciones importando uno desde el otro.
    expect(STORY_DECK_TAIL_SCREENS).toBe(1);
  });

  it("son 6 diapositivas: 1 intro + 4 pilares + 1 nota", () => {
    // El reparto del encargo. Atado aqui porque el componente y el hook lo
    // consumen por separado y ninguno de los dos, por si solo, revela el
    // porque del numero.
    expect(STORY_SLIDES).toBe(6);
  });

  it("cada diapositiva ocupa el alto completo de la vista", () => {
    expect(STORY_DARK_HEIGHT).toBe("100dvh");
  });
});

/**
 * Escala tipográfica de la presentación oscura (spec
 * `2026-07-31-story-deck-tipografia-design.md` §3/§5). Estas aserciones son
 * un contrato con el ENCARGO del usuario, no con el navegador: jsdom no
 * resuelve `clamp()` ni `@media`, así que no hay forma de comprobar aquí
 * cuánto mide el texto en pantalla. Lo que SÍ se puede comprobar, y es lo que
 * importa fijar, es que el TOPE de cada `clamp()` (o el valor único del
 * subtítulo) siga siendo exactamente el tamaño de cartel que pidió el
 * encargo. Si alguien cambia un tope al retocar la composición, este test lo
 * señala.
 */
describe("escala tipográfica de la presentación de Story (contrato con el encargo)", () => {
  /*
   * Critica externa #14 (2026-09-02), decision D4 del dueno: el h2 de intro
   * del deck BAJA al rango de Features/Contact -- 2rem = 32px, la escala `h2`
   * del sistema -- en vez de los hasta 64px que pintaba el peldano
   * `deckTitle`, hoy retirado. Esta asercion cambio de "tope 4rem" a esto;
   * el porque completo vive en el docblock de la constante
   * (`story.layers.ts`) y en el hueco que `deckTitle` dejo en `type.scale`.
   */
  it("critica #14: el h2 de intro es el h2 del sistema, sin tamano propio", () => {
    expect(STORY_DECK_TITLE_SIZE).toBe(type.scale.h2.size);
    expect(STORY_DECK_TITLE_SIZE).toBe("2rem");
  });

  /*
   * Critica externa #11 (2026-08-18), hallazgo C: este es el UNICO de los
   * cinco tamanos de cartel de Story que deja de ser literal -- el mismo
   * `clamp()` estaba escrito byte a byte en `journey.layers.ts`, y una medida
   * que comparten dos secciones ya no es una medida de seccion (regla 13 de
   * RULES.md). Los otros cuatro siguen siendo literales de ESTA composicion, y
   * el docblock del bloque en `story.layers.ts` explica por que.
   *
   * La asercion de valor (`toBe(type.scale.h2.size)`) no prueba la migracion
   * por si sola: pasaria igual con el literal, que resuelve a la misma
   * cadena. La propiedad "el numero vive en el token, no en este fichero"
   * solo se observa en la FUENTE (task/lessons.md, 2026-08-12, Task 19), asi
   * que se lee el fichero despojado de comentarios -- que ademas impide que
   * el candado se desactive comentandolo.
   *
   * Los DOS literales prohibidos son los dos que esta constante ha declarado
   * a mano en su historia: el `clamp()` de antes de la #11 y el `"2rem"` al
   * que la #14 baja el titular. Sin el segundo, "migrado al token" y
   * "reescrito a mano con el valor nuevo" volverian a ser indistinguibles.
   */
  it("critica #11/#14: STORY_DECK_TITLE_SIZE deriva del token, no escribe el valor a mano", async () => {
    expect(STORY_DECK_TITLE_SIZE).toBe(type.scale.h2.size);

    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "story.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("typeTokens.scale.h2.size");
    expect(fuente).not.toContain("clamp(2rem, 6vw, 4rem)");
    expect(fuente).not.toContain('"2rem"');
  });

  it("el título de pilar tiene tope 3rem", () => {
    expect(STORY_DECK_PILLAR_TITLE_SIZE).toBe("clamp(1.75rem, 5vw, 3rem)");
    expect(STORY_DECK_PILLAR_TITLE_SIZE).toMatch(/, 3rem\)$/);
  });

  it("el subtítulo de pilar vale 1rem, sin clamp", () => {
    expect(STORY_DECK_PILLAR_SUBTITLE_SIZE).toBe("1rem");
  });

  it("el cuerpo de pilar tiene tope 1.115rem", () => {
    expect(STORY_DECK_PILLAR_BODY_SIZE).toBe("clamp(1rem, 1.4vw, 1.115rem)");
    expect(STORY_DECK_PILLAR_BODY_SIZE).toMatch(/, 1\.115rem\)$/);
  });

  it("la nota de cierre tiene tope 8rem", () => {
    expect(STORY_DECK_NOTE_SIZE).toBe("clamp(2.5rem, 11vw, 8rem)");
    expect(STORY_DECK_NOTE_SIZE).toMatch(/, 8rem\)$/);
  });

  it("la nota de cierre pesa 900, por encima de toda la escala del sistema", () => {
    // El encargo pide 900 y `type.scale` se detiene en 800 (`display`), asi
    // que esto es una excepcion deliberada, no un token olvidado. La segunda
    // asercion es la que da valor: si algun dia alguien anadiera un 900 a la
    // escala, esta constante deberia desaparecer en favor del token -- y este
    // test es el que obliga a tomar esa decision en vez de dejar las dos
    // fuentes conviviendo en silencio.
    expect(STORY_DECK_NOTE_WEIGHT).toBe(900);
    const pesosDelSistema = Object.values(type.scale).map((v) => v.weight);
    expect(Math.max(...pesosDelSistema)).toBeLessThan(STORY_DECK_NOTE_WEIGHT);
  });

  it("el hueco derecho de la diapositiva en pantallas grandes es 8rem", () => {
    expect(STORY_DECK_PADDING_INLINE_END).toBe("8rem");
  });
});
