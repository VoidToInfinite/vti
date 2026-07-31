import { describe, it, expect } from "vitest";
import { motion } from "@/theme/tokens/motion";
import {
  STORY_DARK_HEIGHT,
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_PILLAR_BODY_SIZE,
  STORY_DECK_PILLAR_SUBTITLE_SIZE,
  STORY_DECK_PILLAR_TITLE_SIZE,
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

  it("la pista mide exactamente una diapositiva por cada slide", () => {
    // Si la pista y el numero de diapositivas se desincronizaran, el pin
    // duraria mas o menos scroll del que hay diapositivas que enseñar: o
    // sobraria recorrido muerto al final, o la ultima diapositiva no
    // llegaria a verse entera.
    expect(STORY_DECK_TRACK_HEIGHT).toBe(
      `calc(${STORY_SLIDES} * ${STORY_DARK_HEIGHT})`,
    );
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
  it("el h2 de intro tiene tope 4rem", () => {
    expect(STORY_DECK_TITLE_SIZE).toBe("clamp(2rem, 6vw, 4rem)");
    expect(STORY_DECK_TITLE_SIZE).toMatch(/, 4rem\)$/);
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
});
