import { describe, it, expect } from "vitest";
import {
  DECK_SLIDE_TRAVEL,
  DECK_SLIDE_TRAVEL_SCREENS,
} from "@/hooks/useSlideDeck";
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
  JOURNEY_QUOTE_EXIT_OPACITY,
  JOURNEY_QUOTE_EXIT_SPAN,
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

  it("la pista SI lleva cola (D3, reversion de D9) y reparte DECK_SLIDE_TRAVEL por hueco (critica #16)", () => {
    // Contra las CONSTANTES, nunca contra los literales `7`/`50dvh`: un
    // numero escrito a mano deja de proteger la formula en cuanto
    // JOURNEY_SLIDES, JOURNEY_DECK_TAIL_SCREENS o el recorrido cambien de
    // valor (task/lessons.md, 2026-08-01). Igual que STORY_DECK_TRACK_HEIGHT,
    // esta formula SI tiene termino de adicion: comparar contra la cadena
    // exacta demuestra la PRESENCIA de la cola, no solo el numero de
    // pantallas.
    expect(JOURNEY_DECK_TRACK_HEIGHT).toBe(
      `calc(${JOURNEY_SLIDES - 1} * ${DECK_SLIDE_TRAVEL} + (1 + ${JOURNEY_DECK_TAIL_SCREENS}) * ${JOURNEY_DARK_HEIGHT})`,
    );
  });

  it("critica #16: la pista pasa de 9 pantallas a 5,5 sin tocar la cola", () => {
    // Las dos mitades de la decision del dueno: cuanto se recorta y que la
    // cola NO es lo que se recorta. Sin la segunda asercion, bajar la cola a
    // 0 daria una pista aun mas corta y este test seguiria en verde.
    const pantallas =
      (JOURNEY_SLIDES - 1) * DECK_SLIDE_TRAVEL_SCREENS +
      (1 + JOURNEY_DECK_TAIL_SCREENS);
    expect(pantallas).toBe(5.5);
    expect(JOURNEY_DECK_TAIL_SCREENS).toBe(1);
    // Lo que eso vale en pixeles en los dos tamanos que midio la critica.
    expect(pantallas * 800).toBe(4400);
    expect(pantallas * 900).toBe(4950);
  });

  it("critica #16: el recorrido NO se escribe a mano en este fichero, se importa del hook (candado de fuente)", async () => {
    // Mismo candado y mismo motivo que su gemelo en `story.layers.test.ts`:
    // la asercion de cadena de arriba pasaria igual con el literal "50dvh"
    // escrito aqui. La propiedad "el numero vive en UN sitio compartido por
    // los dos decks" solo se observa en la FUENTE (task/lessons.md,
    // 2026-08-12, Task 19).
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "journey.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("DECK_SLIDE_TRAVEL");
    expect(fuente).not.toContain('"50dvh"');
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
    const v = DECK_SLIDE_TRAVEL_SCREENS;
    // R = el solape de Features, en pantallas. La igualdad R === T frente a
    // FEATURES_OVERLAY_RISE la ata Features.test.tsx (invariante D5, importa
    // los dos ficheros); aqui se parte de ella y se comprueba que ademas
    // cierra la SEGUNDA costura, que aquel test no cubre.
    const R = T;

    // Alto de la pista, con el recorrido por diapositiva NOMBRADO (critica
    // externa #16): huecos * recorrido + la pantalla del stage + la cola.
    const H = (S - 1) * v * p + (1 + T) * p;
    const spanDelDeck = H - p - T * p;
    const progresoLlegaA1 = spanDelDeck;
    const stageSeDespega = H - p;
    const featuresEmpiezaACubrir = H - R * p - p;
    const featuresCubreDelTodo = H - R * p;

    // Costura 1: Features no empieza a tapar la cita antes de que el deck
    // termine su recorrido.
    expect(featuresEmpiezaACubrir).toBe(progresoLlegaA1);
    // Costura 2: el stage no se despega antes de que Features cubra del
    // todo -- si lo hiciera, subiria una banda de la escena destapada.
    expect(stageSeDespega).toBe(featuresCubreDelTodo);
    // Las dos a la vez solo se cumplen con T = 1 (y R = T).
    expect(T).toBe(1);
    // Y el reparto resultante: la cita se lee limpia media ventana de indice
    // antes de que Features empiece a subir. La ventana encoge con el
    // recorrido (media pantalla cuando `v` valia 1, un cuarto con `v = 0,5`),
    // pero el reparto es el mismo, y por eso se escribe derivado de `v` y no
    // como un numero.
    expect(featuresEmpiezaACubrir - ((S - 1.5) / (S - 1)) * spanDelDeck).toBe(
      0.5 * v * p,
    );
  });

  /*
   * Critica externa #16, decision del dueno: el recorrido por diapositiva se
   * recorta a la mitad. Este test comprueba la propiedad que AUTORIZA ese
   * recorte -- que las dos costuras del relevo con Features se cancelan la
   * altura de la pista -- de la unica forma que demuestra algo: recalculandolo
   * con recorridos DISTINTOS del que el repo usa hoy. Si alguien reescribiera
   * la formula de la pista de manera que la cola dejara de ser independiente
   * del recorrido, el relevo se rompería en silencio (una banda de escena
   * destapada, o la cita tapada a medias) y este test lo veria antes que el
   * navegador.
   */
  it("critica #16: las dos costuras valen con CUALQUIER recorrido, por eso el recorte no toca la cola", () => {
    const p = 900;
    const S = JOURNEY_SLIDES;
    const T = JOURNEY_DECK_TAIL_SCREENS;
    const R = T;

    [1, 0.75, DECK_SLIDE_TRAVEL_SCREENS, 0.25].forEach((v) => {
      const H = (S - 1) * v * p + (1 + T) * p;
      expect(H - R * p - p, `recorrido ${v}`).toBe(H - p - T * p);
      expect(H - p, `recorrido ${v}`).toBe(H - R * p);
    });
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

/*
 * Critica externa #15 (2026-09-02), hallazgo A P2-1: la cita de cierre se
 * cortaba a media frase mientras Features subia como cortina. `progress = 1` y
 * «Features empieza a cubrir» son el MISMO instante por construccion (T = R =
 * 1), asi que la salida de la cita se ancla a ese 1 y termina justo ahi. Ver el
 * docblock de `JOURNEY_QUOTE_EXIT_SPAN` (`journey.layers.ts`) para la secuencia
 * medida completa y las dos vias descartadas.
 *
 * Lo que este candado protege es la DERIVACION, no el numero: el tramo tiene
 * que seguir siendo una fraccion de la ventana de indice de la ultima
 * diapositiva -- que `useSlideDeck` fija en `0,5 / (N - 1)` porque redondea --
 * y no un literal que se desincronice el dia que el viaje gane o pierda un
 * paso (regla 39 de RULES.md).
 */
describe("critica #15: la salida de la cita deriva de la ventana de su diapositiva", () => {
  it("JOURNEY_QUOTE_EXIT_SPAN es el 40 % final de la media ventana de indice de la cita", () => {
    const ventanaDeLaCita = 0.5 / (JOURNEY_SLIDES - 1);

    expect(JOURNEY_QUOTE_EXIT_SPAN).toBeCloseTo(ventanaDeLaCita * 0.4, 4);
    // Con JOURNEY_SLIDES = 8: 0,5/7 = 0,0714 de ventana, 0,0286 de salida.
    expect(JOURNEY_QUOTE_EXIT_SPAN).toBe(0.0286);
    // La salida nunca puede comerse la ventana entera: la cita tiene que
    // llegar a leerse opaca en algun tramo.
    expect(JOURNEY_QUOTE_EXIT_SPAN).toBeLessThan(ventanaDeLaCita);
  });

  it("no escribe el tramo a mano: sale de JOURNEY_SLIDES", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "journey.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("JOURNEY_QUOTE_EXIT_SPAN");
    expect(fuente).toContain("0.5 / (JOURNEY_SLIDES - 1)");
    expect(fuente).not.toContain("JOURNEY_QUOTE_EXIT_SPAN = 0.0286");
  });

  it("la rampa CSS se construye con el tramo derivado y cabe en UNA linea", () => {
    // Anclada en 1 (lo que FALTA para terminar el deck), recortada a [0, 1] y
    // con `0` por defecto para que sin JS la cita se pinte opaca.
    expect(JOURNEY_QUOTE_EXIT_OPACITY).toBe(
      `clamp(0, calc((1 - var(--journey-progress, 0)) / ${JOURNEY_QUOTE_EXIT_SPAN}), 1)`,
    );
    // Una sola linea: el CSSOM conserva los saltos DENTRO de un valor, y un
    // candado que recorra la regla linea a linea solo veria `opacity: clamp(`
    // (medido en la tarea que introdujo esta constante).
    expect(JOURNEY_QUOTE_EXIT_OPACITY).not.toContain("\n");
  });
});
/*
 * Crítica externa #17 (2026-09-03): el docblock del campo `discShadow`
 * afirmaba que los seis valores del mockup «no siguen una única fórmula, así
 * que se listan literales en vez de derivarlos», y los seis eran la MISMA
 * geometría y la MISMA alfa sobre cuatro colores -- dos de ellos repetidos
 * byte a byte. La afirmación se corrigió y la fórmula que negaba existe hoy
 * (`discGlow`, journey.layers.ts).
 *
 * Lo que estos dos tests protegen es la FÓRMULA, no los valores: el CSS
 * renderizado es exactamente el mismo antes y después (medido en navegador
 * sobre los seis discos, dev y build de producción), así que una asercion de
 * valor no distinguiría las dos versiones -- solo la FUENTE lo hace
 * (`task/lessons.md`, 2026-08-12, Task 19; mismo patrón que los cuatro
 * candados de token de más arriba en este fichero).
 */
describe("crítica #17: la sombra de los discos se deriva, no se lista", () => {
  it("los seis pasos comparten geometría y alfa, y solo se distinguen en el color", () => {
    const partes = JOURNEY_STEPS.map((step) =>
      /^0 8px 20px oklch\([\d. ]+ \/ (0\.\d+)\)$/.exec(step.discShadow),
    );

    // Ningún paso se sale de la fórmula (geometría idéntica, sin `spread`).
    expect(partes.every((m) => m !== null)).toBe(true);
    // Y la alfa es una sola para los seis, que era la otra mitad de lo que el
    // docblock viejo negaba.
    expect(new Set(partes.map((m) => m?.[1])).size).toBe(1);
    expect(partes[0]?.[1]).toBe("0.14");

    // Cuatro colores para seis pasos: `discover`/`learn` comparten uno y
    // `imagine`/`create` otro. Falsable: si alguien devolviera un literal
    // propio a cualquiera de los cuatro pasos emparejados, el conjunto
    // pasaría de 4 a 5 o 6.
    const porId = new Map(
      JOURNEY_STEPS.map((step) => [step.id, step.discShadow]),
    );
    expect(new Set(porId.values()).size).toBe(4);
    expect(porId.get("discover")).toBe(porId.get("learn"));
    expect(porId.get("imagine")).toBe(porId.get("create"));
  });

  it("la geometría vive UNA vez en `discGlow`, no seis veces en la tabla", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(join(here, "journey.layers.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(fuente).toContain("const discGlow = (color: string): string =>");
    // Ningún paso vuelve a escribir la sombra entera a mano.
    expect(fuente).not.toContain('discShadow: "0 8px 20px');
    // La geometría aparece exactamente una vez en todo el fichero.
    expect(fuente.split("0 8px 20px").length - 1).toBe(1);
  });
});
