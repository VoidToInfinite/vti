import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import {
  useDeckFit,
  DECK_FIT_ATTRIBUTE,
  DECK_FITS,
  DECK_DOES_NOT_FIT,
  DECK_FIT_TOLERANCE_PX,
} from "./useDeckFit";

/*
 * CANDADO DEL MOTOR DE "CABE / NO CABE" (crítica externa #19, P1 número 3;
 * WCAG 1.4.4). El defecto que cierra está medido en el docblock del hook: con
 * la raíz a 32 px y 320 px de ancho, el enlace de comunidad del cierre de
 * Story quedaba 706 px por debajo del borde por el que el escenario recorta.
 *
 * QUÉ ATA, y qué NO. Ata la CONDICIÓN, no el valor: que un contenido más alto
 * que el escenario produzca el estado de linealización, que uno que cabe no lo
 * produzca, que la respuesta cambie cuando el contenido cambia, y que la medida
 * no dependa del estado que ella misma provoca -- que es donde vive el bucle
 * que este hook tiene que evitar. NO mide píxeles reales: jsdom no hace layout,
 * así que la geometría se fabrica con `Object.defineProperty` sobre
 * `clientHeight`/`scrollHeight`, exactamente como el resto de la suite fabrica
 * `getBoundingClientRect`. Lo que la geometría real produce se verifica en
 * navegador, sobre el build (informe de la ola S).
 *
 * ## Validado con el bug inyectado a propósito (regla 34 de RULES.md)
 *
 * Las dos líneas van copiadas de la salida, no predichas.
 *
 * SABOTAJE 1 -- la comparación "como suena", la que entra en bucle:
 * `disponible` pasa de `Math.min(stage.clientHeight, window.innerHeight)` a
 * `stage.clientHeight` a secas. Rojo en DOS casos, 2 failed | 6 passed:
 *
 *   × sigue diciendo NO CABE cuando el escenario ya creció por estar linealizado
 *     → expected 'true' to be 'false' // Object.is equality
 *   × un cambio de alto de ventana re-mide aunque ninguna caja observada se mueva
 *     → expected 'true' to be 'false' // Object.is equality
 *
 * SABOTAJE 2 -- el atributo se escribe en el ESCENARIO en vez de en la pista
 * (`stage.setAttribute` en lugar de `track.setAttribute`). Rojo en seis casos,
 * 6 failed | 2 passed (pasan los dos que NO esperan atributo escrito):
 *
 *   FAIL  src/hooks/useDeckFit.test.tsx > useDeckFit: el pin es condicional a que la diapositiva quepa > marca la pista con el estado de NO CABE cuando una diapositiva supera el alto del escenario
 *   AssertionError: expected null to be 'false' // Object.is equality
 *
 * SABOTAJE 3 (2026-09-06) -- la medida NO se vuelve a tomar sin el estado
 * puesto: la guarda `cabe && track.getAttribute(...) === DECK_DOES_NOT_FIT`
 * pasa a `false && ...`, o sea el hook se cree el `scrollHeight` medido en la
 * columna ancha que él mismo produjo. Es la implementación anterior al arreglo
 * del bucle, y es exactamente lo que se midió oscilando en Chrome. Rojo en los
 * DOS casos nuevos, `Tests  2 failed | 8 passed (10)`:
 *
 *   × no vuelve a pinar el deck porque la diapositiva encoja AL linealizarse
 *     → expected 'true' to be 'false' // Object.is equality
 *   × vuelve a pinar el deck cuando la diapositiva cabe TAMBIEN en la geometria pegada
 *     → expected 'true' to be 'false' // Object.is equality
 *
 * SABOTAJE 4 (2026-09-06) -- la segunda lectura se convierte en un PESTILLO:
 * `if (!cabe)` pasa a `if (true)`, así que una vez escrito el estado de NO CABE
 * el deck no vuelve a pinarse nunca. Es la salida fácil del bucle, y la que
 * dejaría el deck linealizado para siempre aunque el visitante devuelva el
 * texto a su tamaño. Rojo en TRES casos, `Tests  3 failed | 7 passed (10)`:
 *
 *   × vuelve a CABE cuando la diapositiva encoge, y al revés
 *   × un cambio de alto de ventana re-mide aunque ninguna caja observada se mueva
 *   × vuelve a pinar el deck cuando la diapositiva cabe TAMBIEN en la geometria pegada
 *     → expected 'false' to be 'true' // Object.is equality
 */

/** Callbacks vivos de los `ResizeObserver` falsos, en orden de creación. */
let observadores: (() => void)[];
/** Elementos que cada `ResizeObserver` falso llegó a observar. */
let observados: Element[];
/** Número de `disconnect()` recibidos por los observers falsos. */
let desconexiones: number;

function stubResizeObserver(): void {
  observadores = [];
  observados = [];
  desconexiones = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private cb: () => void;
      constructor(cb: () => void) {
        this.cb = cb;
        observadores.push(cb);
      }
      observe(objetivo: Element): void {
        observados.push(objetivo);
      }
      disconnect(): void {
        desconexiones += 1;
      }
    },
  );
}

function dispararObservers(): void {
  observadores.forEach((cb) => cb());
}

/**
 * Deck de mentira con la MISMA forma que el real: pista > escenario >
 * diapositivas con `data-slide-index` (el atributo que Story.tsx y Journey.tsx
 * ya escriben y que el hook usa como contrato). La geometría se fabrica porque
 * jsdom no hace layout.
 */
function montarDeck(altos: number[]): {
  track: HTMLElement;
  stage: HTMLElement;
  slides: HTMLElement[];
} {
  const track = document.createElement("div");
  const stage = document.createElement("div");
  track.append(stage);
  document.body.append(track);
  const slides = altos.map((alto, indice) => {
    const slide = document.createElement("div");
    slide.setAttribute("data-slide-index", String(indice));
    definirAlto(slide, "scrollHeight", alto);
    stage.append(slide);
    return slide;
  });
  return { track, stage, slides };
}

function definirAlto(
  elemento: HTMLElement,
  propiedad: "clientHeight" | "scrollHeight",
  valor: number,
): void {
  Object.defineProperty(elemento, propiedad, {
    value: valor,
    configurable: true,
  });
}

/**
 * Deck cuya diapositiva MIDE DISTINTO SEGÚN EL ESTADO QUE EL HOOK ESCRIBE, que
 * es el bucle medido en Chrome (ver el docblock del hook, "El segundo eje que
 * el estado mueve"). No es una licencia del test: la linealización devuelve el
 * `padding-inline-end` del deck a su peldaño simétrico y cambia el `display` a
 * `block`, así que la columna se ensancha y el texto necesita menos alto.
 *
 * `alto` devuelve el número que la geometría real daría en cada estado. Sin
 * esta dependencia, jsdom no puede reproducir el defecto: con un
 * `scrollHeight` constante, la implementación con bucle y la que converge dan
 * exactamente el mismo resultado.
 */
function montarDeckQueEncogeAlLinealizarse(
  alto: () => {
    pegado: number;
    linealizado: number;
  },
): { track: HTMLElement; stage: HTMLElement; slides: HTMLElement[] } {
  const deck = montarDeck([0]);
  Object.defineProperty(deck.slides[0], "scrollHeight", {
    configurable: true,
    get: () =>
      deck.track.getAttribute(DECK_FIT_ATTRIBUTE) === DECK_DOES_NOT_FIT
        ? alto().linealizado
        : alto().pegado,
  });
  return deck;
}

function refsDe(
  track: HTMLElement,
  stage: HTMLElement,
): {
  trackRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
} {
  const trackRef = createRef<HTMLElement>();
  const stageRef = createRef<HTMLElement>();
  Object.assign(trackRef, { current: track });
  Object.assign(stageRef, { current: stage });
  return { trackRef, stageRef };
}

beforeEach(() => {
  stubResizeObserver();
  window.innerHeight = 800;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("useDeckFit: el pin es condicional a que la diapositiva quepa", () => {
  it("marca la pista con el estado de NO CABE cuando una diapositiva supera el alto del escenario", () => {
    const { track, stage } = montarDeck([2049, 400]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());

    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);
  });

  it("marca la pista con el estado de CABE cuando todas las diapositivas entran", () => {
    const { track, stage } = montarDeck([522, 400]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());

    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);
  });

  /*
   * EL CANDADO CONTRA EL BUCLE. Es el caso que distingue esta implementación de
   * la que "suena bien": una vez linealizado, el escenario deja de medir una
   * pantalla y pasa a medir todo su contenido. Si el alto disponible fuera su
   * `clientHeight` a secas, cada diapositiva "cabría" otra vez, el atributo
   * volvería a CABE, el escenario volvería a pegarse y a medir una pantalla, y
   * la diapositiva volvería a no caber: oscilación en cada frame. Con el
   * mínimo contra el viewport, la respuesta no depende del estado que produce.
   */
  it("sigue diciendo NO CABE cuando el escenario ya creció por estar linealizado", () => {
    const { track, stage } = montarDeck([2049, 400]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);

    // El escenario, ya estático, mide las dos diapositivas apiladas.
    definirAlto(stage, "clientHeight", 2449);
    act(() => dispararObservers());

    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);
  });

  it("vuelve a CABE cuando la diapositiva encoge, y al revés", () => {
    const { track, stage, slides } = montarDeck([400, 400]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);

    definirAlto(slides[1], "scrollHeight", 2049);
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);

    definirAlto(slides[1], "scrollHeight", 400);
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);
  });

  it("la tolerancia deja pasar el subpixel y no un desbordamiento real", () => {
    const { track, stage, slides } = montarDeck([800 + DECK_FIT_TOLERANCE_PX]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);

    definirAlto(slides[0], "scrollHeight", 800 + DECK_FIT_TOLERANCE_PX + 1);
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);
  });

  it("observa el escenario y CADA diapositiva, y se desconecta al desmontar", () => {
    const { track, stage, slides } = montarDeck([400, 400, 400]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    const { unmount } = renderHook(() => useDeckFit(trackRef, stageRef));

    expect(observados).toEqual([stage, ...slides]);

    unmount();
    expect(desconexiones).toBe(1);
  });

  /*
   * Sin `ResizeObserver` el hook no escribe NADA -- ni CABE ni NO CABE -- y el
   * deck se queda exactamente como estaba antes de esta pieza. Es el caso de
   * jsdom, y por eso ningún test existente de Story/Journey cambia de
   * comportamiento por la mera existencia del hook.
   */
  it("sin ResizeObserver no escribe ningun atributo", () => {
    const { track, stage } = montarDeck([2049]);
    definirAlto(stage, "clientHeight", 800);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });
    vi.stubGlobal("ResizeObserver", undefined);

    renderHook(() => useDeckFit(trackRef, stageRef));

    expect(track.hasAttribute(DECK_FIT_ATTRIBUTE)).toBe(false);
  });

  it("un cambio de alto de ventana re-mide aunque ninguna caja observada se mueva", () => {
    const { track, stage } = montarDeck([900]);
    // Escenario ya linealizado: su caja no cambia con el viewport, así que el
    // ResizeObserver no dispara. Lo único que cambia es `window.innerHeight`.
    definirAlto(stage, "clientHeight", 900);
    const trackRef = createRef<HTMLElement>();
    const stageRef = createRef<HTMLElement>();
    Object.assign(trackRef, { current: track });
    Object.assign(stageRef, { current: stage });

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);

    window.innerHeight = 1200;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);
  });

  /*
   * EL CANDADO DEL SEGUNDO EJE: la diapositiva ENCOGE al linealizarse, porque
   * la columna se ensancha. Es el defecto medido en Chrome sobre el build de
   * `6047302` --926 px de alto con el escenario pegado, 794 con el deck ya
   * linealizado, y 800 px de alto disponible en los dos estados-- y el que
   * ninguno de los casos de arriba podía ver: todos fabrican un `scrollHeight`
   * constante, y con un alto constante la implementación que oscila y la que
   * converge dan el mismo resultado.
   *
   * Se comprueba en CADA disparo, no solo al final, porque el defecto es una
   * alternancia: mirar únicamente el último valor haría depender el rojo de la
   * paridad del número de disparos.
   */
  it("no vuelve a pinar el deck porque la diapositiva encoja AL linealizarse", () => {
    const { track, stage } = montarDeckQueEncogeAlLinealizarse(() => ({
      pegado: 926,
      linealizado: 794,
    }));
    definirAlto(stage, "clientHeight", 800);
    const { trackRef, stageRef } = refsDe(track, stage);

    renderHook(() => useDeckFit(trackRef, stageRef));
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);

    for (let disparo = 0; disparo < 6; disparo += 1) {
      act(() => dispararObservers());
      expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);
    }
  });

  /*
   * LA OTRA MITAD, y sin ella el candado de arriba se satisface con un estado
   * que no vuelve nunca: cuando el texto encoge DE VERDAD --el visitante
   * devuelve el tamaño de fuente a su sitio-- la diapositiva cabe en las dos
   * geometrías y el deck tiene que volver a pinarse. La medida sin estado no es
   * un pestillo: es una segunda lectura.
   */
  it("vuelve a pinar el deck cuando la diapositiva cabe TAMBIEN en la geometria pegada", () => {
    const grande = { pegado: 926, linealizado: 794 };
    const pequeño = { pegado: 500, linealizado: 420 };
    let tamaño = grande;
    const { track, stage } = montarDeckQueEncogeAlLinealizarse(() => tamaño);
    definirAlto(stage, "clientHeight", 800);
    const { trackRef, stageRef } = refsDe(track, stage);

    renderHook(() => useDeckFit(trackRef, stageRef));
    act(() => dispararObservers());
    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_DOES_NOT_FIT);

    tamaño = pequeño;
    act(() => dispararObservers());

    expect(track.getAttribute(DECK_FIT_ATTRIBUTE)).toBe(DECK_FITS);
  });
});
