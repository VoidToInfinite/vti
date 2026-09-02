import { describe, it, expect } from "vitest";
import { type as typeTokens } from "@/theme/tokens/type";
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
  /*
   * Critica externa #14 (2026-09-02), decision D4 del dueno: el h2 de intro
   * del deck BAJA al rango de Features/Contact -- 2rem = 32px, la escala `h2`
   * del sistema -- en vez de los hasta 64px que pintaba el peldano
   * `deckTitle`, hoy retirado. "Mismo tramo que Story" sigue siendo cierto y
   * por un motivo mas fuerte que antes: las dos secciones leen el MISMO
   * peldano de la escala.
   */
  it("critica #14: el h2 de intro es el h2 del sistema, sin tamano propio", () => {
    expect(JOURNEY_DECK_TITLE_SIZE).toBe(typeTokens.scale.h2.size);
    expect(JOURNEY_DECK_TITLE_SIZE).toBe("2rem");
  });

  /*
   * Critica externa #11 (2026-08-18), hallazgo C: la constante DERIVA de un
   * peldano de la escala del sistema, ya no declara el literal.
   *
   * Hacen falta LAS DOS aserciones, y la segunda es la unica que prueba algo.
   * `toBe(typeTokens.scale.h2.size)` pasaria igual con el literal escrito a
   * mano -- resuelve a la misma cadena -- asi que la propiedad "el numero
   * vive en el token, no en este fichero" solo se observa en la FUENTE
   * (task/lessons.md, 2026-08-12, Task 19; mismo patron que
   * `Hero.qa.test.tsx` usa para `grid.heroCopyMax`). Se despojan los
   * comentarios antes de buscar: sin eso, el `clamp(...)` citado en prosa
   * dentro del docblock de la propia constante haria fallar el `not.toContain`
   * sobre codigo que si esta migrado.
   *
   * Los DOS literales prohibidos son los dos que esta constante ha declarado
   * a mano en su historia: el `clamp()` de antes de la #11 y el `"2rem"` al
   * que la #14 baja el titular.
   */
  it("critica #11/#14: JOURNEY_DECK_TITLE_SIZE deriva del token, no escribe el valor a mano", async () => {
    expect(JOURNEY_DECK_TITLE_SIZE).toBe(typeTokens.scale.h2.size);

    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "journey.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("typeTokens.scale.h2.size");
    expect(fuente).not.toContain("clamp(2rem, 6vw, 4rem)");
    expect(fuente).not.toContain('"2rem"');
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
    // Cadena del encargo ("Journey deck step body (new called subtitle):
    // clamp(1rem, 1.4vw, 1.115rem)"). El VALOR no cambio con el renombrado de
    // T5 ni con la tokenizacion de la critica #14 (2026-09-02): lo que cambio
    // es de donde sale -- hoy es `type.scale.deckBody`, el peldano que nombra
    // el cuerpo de lectura de una diapositiva de deck y que esta seccion
    // comparte con el cuerpo de pilar de Story.
    expect(JOURNEY_DECK_STEP_SUBTITLE_SIZE).toBe(
      typeTokens.scale.deckBody.size,
    );
    expect(JOURNEY_DECK_STEP_SUBTITLE_SIZE).toMatch(/, 1\.115rem\)$/);
  });

  it("el icono de paso crece a 48px", () => {
    expect(JOURNEY_DECK_STEP_ICON_SIZE).toBe("48px");
  });

  it("la cita de cierre tiene tope 8rem, cadena del encargo (T6)", () => {
    // Cadena del encargo ("Journey quote: font-size: clamp(2.5rem, 11vw,
    // 8rem)"), hoy servida por `type.scale.deckClosing` (critica externa #14,
    // 2026-09-02). Falsable de verdad: si alguien revirtiera esta entrega sin
    // darse cuenta y devolviera el tope a 3.5rem (el valor de D10, la decision
    // ANTERIOR que esta entrega revierte a proposito), el segundo assert lo
    // detecta aunque el primero siguiera pasando por leer el token.
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe(typeTokens.scale.deckClosing.size);
    expect(JOURNEY_DECK_QUOTE_SIZE).toMatch(/, 8rem\)$/);
  });

  it("el hueco derecho de la diapositiva en pantallas grandes es 8rem", () => {
    expect(JOURNEY_DECK_PADDING_INLINE_END).toBe("8rem");
  });
});

/**
 * Punto 2 de §6 de la spec de tipografia: los dos pesos 900 de Journey
 * (etiqueta de paso y cita de cierre). Hasta la critica externa #14
 * (2026-09-02) los dos tests eran REPLICA EXACTA del que protege
 * `STORY_DECK_NOTE_WEIGHT` y afirmaban lo mismo -- que 900 era estrictamente
 * mayor que el peso maximo de `type.scale` --, con el punto de decision
 * escrito: si algun dia la escala incorporase un 900, habia que decidir si la
 * constante desaparece en favor del token.
 *
 * La #14 incorporo ese 900 (`type.scale.deckClosing`) y las dos constantes
 * tomaron caminos DISTINTOS, que es justo lo que el punto de decision pedia
 * decidir en vez de dejar conviviendo: la cita de cierre deriva del peldano
 * (es exactamente ese rol) y la etiqueta de paso NO (viste otro rol, con otro
 * tamano, y `TypeStyle` es un paquete de cuatro propiedades, no un peso
 * suelto). Los dos tests de abajo afirman cada camino, no el mismo dos veces.
 */
describe("los dos pesos 900 de Journey tras la critica #14 (T3/T6)", () => {
  it("JOURNEY_DECK_STEP_LABEL_WEIGHT se queda fuera de la escala, a proposito", () => {
    expect(JOURNEY_DECK_STEP_LABEL_WEIGHT).toBe(900);

    // Coincide con el peso mas alto que declara la escala, y aun asi NO
    // deriva de el: si algun dia alguien "arregla" esta constante haciendola
    // leer `deckClosing.weight`, el docblock que explica por que no debe
    // hacerlo deja de describir el codigo. Lo que se ata es la INDEPENDENCIA,
    // observada en la fuente igual que los demas candados de token.
    expect(JOURNEY_DECK_STEP_LABEL_WEIGHT).toBe(
      typeTokens.scale.deckClosing.weight,
    );
  });

  it("JOURNEY_DECK_QUOTE_WEIGHT pesa 900 y hoy lo lee de la escala", () => {
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(900);
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(typeTokens.scale.deckClosing.weight);
  });
});

/**
 * Punto 3 de §6 de la spec de tipografia (T7): la cita de cierre de Journey
 * coincide, en tamano y en peso, con la nota de cierre de Story. Hasta la
 * critica externa #14 (2026-09-02) esa coincidencia la sostenian dos parejas
 * de literales identicos byte a byte, y este describe era el PUNTO DE
 * DECISION donde se decidiria una futura divergencia.
 *
 * La #14 (hallazgo P3) la resuelve al reves de como T7 la habia dejado: las
 * dos parejas no coinciden por casualidad, visten el MISMO rol -- el cierre
 * de un deck a sangre completa -- asi que las cuatro constantes derivan hoy
 * del peldano `type.scale.deckClosing`. El test se conserva y sigue teniendo
 * sentido: ahora afirma que ninguna de las dos secciones se ha salido del
 * peldano por su cuenta. Divergir sigue siendo posible -- y sigue decidiendose
 * aqui -- pero exige sacar a una de las dos del token con su porque escrito,
 * no editar un literal y esperar que alguien lo note comparando capturas.
 *
 * Que este test importe de `story.layers.ts` no acopla las dos secciones: es
 * la invariante que cruza dos ficheros viviendo en un test que importa los
 * dos, que es lo que pide la regla 41 de `RULES.md`.
 */
describe("coincidencia de la cita de Journey con la nota de Story (T7, resuelta por token en la #14)", () => {
  it("JOURNEY_DECK_QUOTE_SIZE coincide con STORY_DECK_NOTE_SIZE, y las dos leen deckClosing", () => {
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe(STORY_DECK_NOTE_SIZE);
    expect(JOURNEY_DECK_QUOTE_SIZE).toBe(typeTokens.scale.deckClosing.size);
  });

  it("JOURNEY_DECK_QUOTE_WEIGHT coincide con STORY_DECK_NOTE_WEIGHT, y las dos leen deckClosing", () => {
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(STORY_DECK_NOTE_WEIGHT);
    expect(JOURNEY_DECK_QUOTE_WEIGHT).toBe(typeTokens.scale.deckClosing.weight);
  });
});

/**
 * Candado de FUENTE de la critica externa #14 (2026-09-02, hallazgo P3),
 * mismo patron y mismo motivo que el que ya protege a
 * `JOURNEY_DECK_TITLE_SIZE`: las aserciones de valor de arriba pasarian igual
 * con los literales escritos a mano, porque token y literal resuelven a la
 * misma cadena (`task/lessons.md`, 2026-08-12, Task 19). La propiedad "el
 * numero vive en el token, no en este fichero" solo se observa leyendo el
 * fichero, despojado de comentarios para que los `clamp()` citados en prosa
 * dentro de los docblocks no falseen el resultado.
 *
 * Incluye la INDEPENDENCIA de `JOURNEY_DECK_STEP_LABEL_WEIGHT`: es la unica
 * de las tres constantes de esta familia que sigue declarando su valor a
 * mano, y eso es una decision documentada, no un olvido de migrar.
 */
describe("critica #14: el cierre y el subtitulo de paso derivan del token", () => {
  it("journey.layers.ts no escribe a mano ningun valor que ya nombre la escala", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "journey.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("typeTokens.scale.deckClosing.size");
    expect(fuente).toContain("typeTokens.scale.deckClosing.weight");
    expect(fuente).toContain("typeTokens.scale.deckBody.size");
    expect(fuente).not.toContain("clamp(2.5rem, 11vw, 8rem)");
    expect(fuente).not.toContain("clamp(1rem, 1.4vw, 1.115rem)");

    // La etiqueta de paso conserva su 900 literal a proposito (ver su
    // docblock): el candado de arriba no debe arrastrarla sin querer.
    expect(fuente).toContain("JOURNEY_DECK_STEP_LABEL_WEIGHT = 900");
  });
});
