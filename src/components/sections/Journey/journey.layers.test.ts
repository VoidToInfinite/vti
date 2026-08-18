import { describe, it, expect } from "vitest";
import { type } from "@/theme/tokens/type";
import {
  STORY_DECK_NOTE_SIZE,
  STORY_DECK_NOTE_WEIGHT,
} from "@/components/sections/Story/story.layers";
import {
  JOURNEY_STEPS,
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_PADDING_INLINE_END,
  JOURNEY_DECK_QUOTE_SIZE,
  JOURNEY_DECK_QUOTE_WEIGHT,
  JOURNEY_DECK_STEP_ICON_SIZE,
  JOURNEY_DECK_STEP_LABEL_SIZE,
  JOURNEY_DECK_STEP_LABEL_WEIGHT,
  JOURNEY_DECK_STEP_SUBTITLE_SIZE,
  JOURNEY_DECK_TAIL_SCREENS,
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

  it("la pista SI lleva cola (D3, reversion de D9): mide JOURNEY_SLIDES + JOURNEY_DECK_TAIL_SCREENS pantallas", () => {
    // Contra las CONSTANTES, nunca contra el literal `9`: un numero escrito
    // a mano deja de proteger la formula en cuanto JOURNEY_SLIDES o
    // JOURNEY_DECK_TAIL_SCREENS cambien de valor (task/lessons.md,
    // 2026-08-01). Igual que STORY_DECK_TRACK_HEIGHT, esta formula SI tiene
    // termino de adicion: comparar contra la cadena exacta demuestra la
    // PRESENCIA de la cola, no solo el numero de pantallas.
    expect(JOURNEY_DECK_TRACK_HEIGHT).toBe(
      `calc((${JOURNEY_SLIDES} + ${JOURNEY_DECK_TAIL_SCREENS}) * ${JOURNEY_DARK_HEIGHT})`,
    );
  });

  it("JOURNEY_DECK_TAIL_SCREENS vale exactamente 1 pantalla", () => {
    expect(JOURNEY_DECK_TAIL_SCREENS).toBe(1);
  });

  /*
   * Critica externa #10, hallazgo A ("tramo muerto de ~1.250 px al final del
   * deck"): la cola NO se puede recortar desde Journey, y este test lo
   * demuestra con la geometria en vez de dejarlo en prosa. La derivacion
   * completa vive en el docblock de JOURNEY_DECK_TAIL_SCREENS
   * (journey.layers.ts); aqui se comprueban las dos costuras que fijan el
   * valor, calculadas sobre una pantalla arbitraria para que el resultado no
   * dependa de ningun viewport concreto.
   */
  it("la cola es la UNICA solucion de las dos costuras con Features (T = R y R = 1)", () => {
    const p = 900; // una pantalla cualquiera: las dos costuras son en `p`
    const S = JOURNEY_SLIDES;
    const T = JOURNEY_DECK_TAIL_SCREENS;
    // R = el solape de Features, en pantallas. La igualdad R === T frente a
    // FEATURES_OVERLAY_RISE la ata Features.test.tsx (invariante D5, importa
    // los dos ficheros); aqui se parte de ella y se comprueba que ademas
    // cierra la SEGUNDA costura, que aquel test no cubre.
    const R = T;

    const spanDelDeck = (S + T) * p - p - T * p;
    const progresoLlegaA1 = spanDelDeck;
    const stageSeDespega = (S + T - 1) * p;
    const featuresEmpiezaACubrir = (S + T - R - 1) * p;
    const featuresCubreDelTodo = (S + T - R) * p;

    // Costura 1: Features no empieza a tapar la cita antes de que el deck
    // termine su recorrido.
    expect(featuresEmpiezaACubrir).toBe(progresoLlegaA1);
    // Costura 2: el stage no se despega antes de que Features cubra del
    // todo -- si lo hiciera, subiria una banda de la escena destapada.
    expect(stageSeDespega).toBe(featuresCubreDelTodo);
    // Las dos a la vez solo se cumplen con T = 1 (y R = T).
    expect(T).toBe(1);
    // Y el reparto resultante: la cita se lee limpia media ventana de indice
    // (media pantalla) antes de que Features empiece a subir.
    expect(featuresEmpiezaACubrir - (S - 1.5) * p).toBe(0.5 * p);
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
 * 5, `2026-08-02-journey-deck-8-diapositivas-design.md`, actualizada por
 * `2026-08-02-journey-deck-tipografia-design.md`, T2/T5/T6). Igual que en
 * `story.layers.test.ts`: jsdom no resuelve `clamp()` ni `@media`, asi que
 * lo unico verificable aqui es que el TOPE de cada `clamp()` (o el valor
 * unico de las que no llevan clamp) siga siendo exactamente el tamano que
 * pide el encargo -- es un contrato con el USUARIO, no con el navegador
 * (punto 1 de la spec de tipografia, §6).
 */
describe("escala tipografica de la presentacion de Journey (contrato con la spec)", () => {
  it("el h2 de intro tiene tope 4rem, mismo tramo que Story", () => {
    expect(JOURNEY_DECK_TITLE_SIZE).toBe("clamp(2rem, 6vw, 4rem)");
    expect(JOURNEY_DECK_TITLE_SIZE).toMatch(/, 4rem\)$/);
  });

  it("la etiqueta de paso tiene tope 11rem, cadena literal del encargo (T2)", () => {
    // Cadena LITERAL del encargo del usuario ("Journey deck step label:
    // font-size: clamp(1.75rem, 10vw, 11rem)"), atada tal cual: jsdom no
    // resuelve clamp(), pero si puede fijar que el tope no se mueva sin que
    // alguien lo decida.
    expect(JOURNEY_DECK_STEP_LABEL_SIZE).toBe("clamp(1.75rem, 10vw, 11rem)");
    expect(JOURNEY_DECK_STEP_LABEL_SIZE).toMatch(/, 11rem\)$/);
  });

  it("el subtitulo de paso tiene tope 1.115rem, cadena literal del encargo (T2/T5)", () => {
    // Cadena LITERAL del encargo ("Journey deck step body (new called
    // subtitle): clamp(1rem, 1.4vw, 1.115rem)"). El VALOR no cambio con el
    // renombrado de T5 -- sigue siendo exactamente el mismo tramo que ya
    // tenia la constante antes de renombrarse (docblock de
    // JOURNEY_DECK_STEP_SUBTITLE_SIZE, journey.layers.ts).
    expect(JOURNEY_DECK_STEP_SUBTITLE_SIZE).toBe(
      "clamp(1rem, 1.4vw, 1.115rem)",
    );
    expect(JOURNEY_DECK_STEP_SUBTITLE_SIZE).toMatch(/, 1\.115rem\)$/);
  });

  it("el icono de paso crece a 48px", () => {
    expect(JOURNEY_DECK_STEP_ICON_SIZE).toBe("48px");
  });

  it("la cita de cierre tiene tope 8rem, cadena literal del encargo (T6)", () => {
    // Cadena LITERAL del encargo ("Journey quote: font-size: clamp(2.5rem,
    // 11vw, 8rem)"). Falsable de verdad: si alguien revirtiera esta entrega
    // sin darse cuenta y devolviera el tope a 3.5rem (el valor de D10, la
    // decision ANTERIOR que esta entrega revierte a proposito), esta
    // asercion lo detecta.
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe("clamp(2.5rem, 11vw, 8rem)");
    expect(JOURNEY_DECK_QUOTE_SIZE).toMatch(/, 8rem\)$/);
  });

  it("el hueco derecho de la diapositiva en pantallas grandes es 8rem", () => {
    expect(JOURNEY_DECK_PADDING_INLINE_END).toBe("8rem");
  });
});

/**
 * Punto 2 de §6 de la spec de tipografia: los dos pesos 900 (etiqueta de
 * paso y cita de cierre) estan fuera de la escala del sistema. REPLICA
 * EXACTA del test que ya protege `STORY_DECK_NOTE_WEIGHT`
 * (`story.layers.test.ts`), con el mismo patron de dos aserciones: el valor
 * concreto (900) y que ese valor sea estrictamente mayor que el peso maximo
 * que declara `type.scale` hoy. La segunda asercion es la que da valor real:
 * si algun dia la escala del sistema incorporase un 900, este test obliga a
 * decidir si la constante desaparece en favor del token, en vez de dejar dos
 * fuentes conviviendo en silencio.
 */
describe("los pesos 900 de Journey estan fuera de la escala del sistema (T3/T6)", () => {
  it("JOURNEY_DECK_STEP_LABEL_WEIGHT pesa 900, por encima de toda la escala del sistema", () => {
    expect(JOURNEY_DECK_STEP_LABEL_WEIGHT).toBe(900);
    const pesosDelSistema = Object.values(type.scale).map((v) => v.weight);
    expect(Math.max(...pesosDelSistema)).toBeLessThan(
      JOURNEY_DECK_STEP_LABEL_WEIGHT,
    );
  });

  it("JOURNEY_DECK_QUOTE_WEIGHT pesa 900, por encima de toda la escala del sistema", () => {
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(900);
    const pesosDelSistema = Object.values(type.scale).map((v) => v.weight);
    expect(Math.max(...pesosDelSistema)).toBeLessThan(
      JOURNEY_DECK_QUOTE_WEIGHT,
    );
  });
});

/**
 * Punto 3 de §6 de la spec de tipografia (T7): la cita de cierre de Journey
 * coincide HOY, en tamano y en peso, con la nota de cierre de Story. Este
 * test NO ES un acoplamiento -- las dos parejas de constantes siguen viviendo
 * cada una en su fichero, sin que ninguna importe a la otra en el codigo de
 * produccion (`journey.layers.ts` declara sus propios literales, no
 * reexporta los de `story.layers.ts`) -- es un PUNTO DE DECISION: si algun
 * dia Story y Journey divergen a proposito, este test es donde se decide esa
 * divergencia, actualizando la asercion con su porque, en vez de que alguien
 * la descubra por sorpresa comparando capturas de pantalla en el navegador.
 */
describe("coincidencia de la cita de Journey con la nota de Story (T7, punto de decision declarado)", () => {
  it("JOURNEY_DECK_QUOTE_SIZE coincide hoy con STORY_DECK_NOTE_SIZE", () => {
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe(STORY_DECK_NOTE_SIZE);
  });

  it("JOURNEY_DECK_QUOTE_WEIGHT coincide hoy con STORY_DECK_NOTE_WEIGHT", () => {
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(STORY_DECK_NOTE_WEIGHT);
  });
});
