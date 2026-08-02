import { describe, it, expect } from "vitest";
import {
  JOURNEY_STEPS,
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_PADDING_INLINE_END,
  JOURNEY_DECK_QUOTE_SIZE,
  JOURNEY_DECK_STEP_BODY_SIZE,
  JOURNEY_DECK_STEP_ICON_SIZE,
  JOURNEY_DECK_STEP_LABEL_SIZE,
  JOURNEY_DECK_TITLE_SIZE,
  JOURNEY_DECK_TRACK_HEIGHT,
  JOURNEY_SCENE_DEPTH_SHIFT,
  JOURNEY_SLIDE_SHIFT,
  JOURNEY_SLIDES,
} from "./journey.layers";

/**
 * Constantes de la presentacion de Journey (spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`). Mismo criterio que
 * `story.layers.test.ts`: solo se aseveran las que tienen una RELACION que
 * puede desincronizarse en silencio -- una derivacion, una formula, o un
 * tope de encargo -- nunca un valor suelto sin ninguna relacion que proteger.
 */
describe("constantes de la presentacion de Journey (test 1 de la spec, D3)", () => {
  it("JOURNEY_SLIDES se deriva de JOURNEY_STEPS.length + 2, nunca de un literal", () => {
    // Falsable: si JOURNEY_SLIDES volviera a ser un literal `8` escrito a
    // mano, esta asercion seguiria siendo cierta HOY (8 === 6 + 2), pero
    // dejaria de proteger la derivacion -- por eso la comparacion es contra
    // la formula, no contra el numero.
    expect(JOURNEY_SLIDES).toBe(JOURNEY_STEPS.length + 2);
    expect(JOURNEY_SLIDES).toBe(8);
  });

  it("la pista NO lleva cola (D9): mide exactamente JOURNEY_SLIDES pantallas, sin ningun termino de mas", () => {
    // A diferencia de STORY_DECK_TRACK_HEIGHT (que suma STORY_DECK_TAIL_SCREENS),
    // esta formula no tiene termino de adicion: comparar contra la cadena
    // exacta demuestra la AUSENCIA de cola, no solo el numero de pantallas.
    expect(JOURNEY_DECK_TRACK_HEIGHT).toBe(
      `calc(${JOURNEY_SLIDES} * ${JOURNEY_DARK_HEIGHT})`,
    );
  });

  it("cada diapositiva ocupa el alto completo de la vista", () => {
    expect(JOURNEY_DARK_HEIGHT).toBe("100dvh");
  });

  it("el desplazamiento de entrada/salida de cada diapositiva es 40px", () => {
    expect(JOURNEY_SLIDE_SHIFT).toBe("40px");
  });

  it("el desplazamiento de profundidad de la escena usa dvh, no %", () => {
    // La unidad importa (docblock de la constante): un % en translateY se
    // resuelve contra el propio elemento, no contra el contenedor -- ver el
    // bug ya pagado en Story (task/lessons.md, 2026-07-31).
    expect(JOURNEY_SCENE_DEPTH_SHIFT).toBe("6dvh");
    expect(JOURNEY_SCENE_DEPTH_SHIFT).toMatch(/dvh$/);
  });
});

/**
 * Escala tipografica de cartel de la presentacion de Journey (spec seccion
 * 5). Igual que en `story.layers.test.ts`: jsdom no resuelve `clamp()` ni
 * `@media`, asi que lo unico verificable aqui es que el TOPE de cada
 * `clamp()` (o el valor unico de las que no llevan clamp) siga siendo
 * exactamente el tamano que pide la spec.
 */
describe("escala tipografica de la presentacion de Journey (contrato con la spec)", () => {
  it("el h2 de intro tiene tope 4rem, mismo tramo que Story", () => {
    expect(JOURNEY_DECK_TITLE_SIZE).toBe("clamp(2rem, 6vw, 4rem)");
    expect(JOURNEY_DECK_TITLE_SIZE).toMatch(/, 4rem\)$/);
  });

  it("la etiqueta de paso tiene tope 3rem, mismo tramo que el titulo de pilar de Story", () => {
    expect(JOURNEY_DECK_STEP_LABEL_SIZE).toBe("clamp(1.75rem, 5vw, 3rem)");
    expect(JOURNEY_DECK_STEP_LABEL_SIZE).toMatch(/, 3rem\)$/);
  });

  it("el cuerpo de paso tiene tope 1.115rem, mismo tramo que el cuerpo de pilar de Story", () => {
    expect(JOURNEY_DECK_STEP_BODY_SIZE).toBe("clamp(1rem, 1.4vw, 1.115rem)");
    expect(JOURNEY_DECK_STEP_BODY_SIZE).toMatch(/, 1\.115rem\)$/);
  });

  it("el icono de paso crece a 48px", () => {
    expect(JOURNEY_DECK_STEP_ICON_SIZE).toBe("48px");
  });

  it("la cita de cierre tiene tope 3.5rem -- NO el de la nota de Story (8rem)", () => {
    // Falsable de verdad: si alguien copiara STORY_DECK_NOTE_SIZE tal cual
    // (tope 8rem) en vez de calibrar contra el texto real de esta cita (45
    // caracteres), esta asercion lo detecta.
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe("clamp(1.75rem, 5.5vw, 3.5rem)");
    expect(JOURNEY_DECK_QUOTE_SIZE).toMatch(/, 3\.5rem\)$/);
    expect(JOURNEY_DECK_QUOTE_SIZE).not.toMatch(/8rem/);
  });

  it("el hueco derecho de la diapositiva en pantallas grandes es 8rem", () => {
    expect(JOURNEY_DECK_PADDING_INLINE_END).toBe("8rem");
  });
});
