import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from "@/test/test-utils";
import esHome from "@/i18n/locales/es/home.json";
import { FRAGMENT_LANDING_SETTLE_MS } from "@/hooks/useFragmentLanding";
import { useTheme } from "@/theme/ThemeProvider";
import { HomeSections } from "./HomeSections";

/*
 * Las 4 secciones (spec 2026-07-30) ya tienen tratamiento propio para los
 * dos temas -- este componente ya no bifurca por tema (era un gate
 * incremental mientras se construian una a una, ver el docblock de
 * HomeSections.tsx): siempre monta las 4, en orden. Cada una resuelve su
 * propia rama claro/oscuro internamente. Las 4 usan `useReveal`
 * (IntersectionObserver) -- mismo stub minimo que Story.test.tsx/etc.
 */

function stubMatchMedia(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.location.hash = "";
});

describe("HomeSections", () => {
  /*
   * CANDADO DE LA CRÍTICA #6, P0-1. `About` estuvo entre Features y Contacto
   * desde su entrega (Fase 3, 2026-08-14) y en la rama OSCURA era invisible:
   * la cadena de solapes hace que cada sección suba 100dvh sobre la cola de la
   * anterior, y Contacto —que mide exactamente un viewport y sube exactamente
   * un viewport— cubría About entera. Medido: `#about` en 15471→16003 y
   * `#contact` en 15103→16003 con z-index 3 contra 2, sin ninguna posición de
   * scroll en la que About se viera.
   *
   * Por qué este test y no uno de visibilidad: jsdom no hace layout ni pinta,
   * así que NO puede detectar un solape. Lo que sí puede atar es la invariante
   * estructural que lo evita — **About va después de Contacto, fuera de la
   * cadena** —, y esa invariante es exactamente lo que se rompió.
   *
   * Si alguien vuelve a mover About dentro de la cadena, este test se pone en
   * rojo antes de que nadie tenga que abrir un navegador en tema oscuro.
   */
  it("About va DESPUÉS de Contacto: dentro de la cadena de solapes quedaría tapada en oscuro", () => {
    const { container } = renderWithProviders(<HomeSections />);
    const ids = [...container.querySelectorAll("section[id]")].map((n) => n.id);
    const iContacto = ids.indexOf("contact");
    const iAbout = ids.indexOf("about");
    expect(
      iContacto,
      "no se encontró la sección de contacto",
    ).toBeGreaterThanOrEqual(0);
    expect(iAbout, "no se encontró la sección about").toBeGreaterThanOrEqual(0);
    expect(
      iAbout,
      "About vuelve a estar dentro de la cadena de solapes: en oscuro la cubre Contacto",
    ).toBeGreaterThan(iContacto);
  });

  /*
   * En CLARO son CINCO secciones desde el 2026-08-06, no cuatro: `Story`
   * emite ademas `#statement`, la nota de cierre promovida a pantalla
   * completa (spec `2026-08-06-story-features-tema-claro-design.md`, D12).
   * Va entre `#story` y `#journey`, exactamente donde la coloca el mockup
   * `Landing v2.dc`.
   *
   * Desde la Task 15 (unificacion de contenido, D-C, 2026-08-11) la lista es
   * la MISMA en los dos temas: la rama oscura emite tambien `#statement` --
   * su diapositiva de cierre, con la misma frase y la misma salida a Discord,
   * pasa a ser `<section id="statement">` (anidada dentro de `#story`, que es
   * donde el deck coloca su cierre; el orden del documento sale identico).
   * Este fichero es exactamente el "contrato de estructura que vive en OTRO
   * fichero" de la leccion del 2026-08-06: cualquier entrega que anada o
   * quite un elemento de nivel de seccion pasa por aqui.
   *
   * El orden se sigue aseverando ENTERO, no relajado a "contiene": es la
   * unica propiedad que este test protege, y una lista parcial dejaria pasar
   * que una seccion se colara en medio de otras dos.
   */
  it("en tema claro (por defecto, sin nada guardado) monta las 5 secciones, en orden story/statement/journey/features/contact/about", () => {
    const { container } = renderWithProviders(<HomeSections />);

    const ids = Array.from(container.querySelectorAll("section")).map(
      (el) => el.id,
    );
    expect(ids).toEqual([
      "story",
      "statement",
      "journey",
      "features",
      "contact",
      "about",
    ]);
  });

  it("en tema claro, el titulo real de Story esta presente (region con nombre accesible)", () => {
    renderWithProviders(<HomeSections />);

    const region = screen.getByRole("region", {
      name: (accessibleName) =>
        accessibleName.includes(esHome.Home.story.titleLead) &&
        accessibleName.includes(esHome.Home.story.titleAccent),
    });
    expect(region).toHaveAttribute("id", "story");
  });

  /*
   * El complementario del de arriba, y desde la Task 15 su ESPEJO EXACTO: la
   * misma lista, con las mismas cinco secciones y en el mismo orden. Que las
   * dos aserciones sean identicas ES el candado -- mientras lo sean, ninguna
   * rama tiene una seccion que la otra no tenga. Si una entrega futura las
   * separa otra vez, este par de tests lo dice en el acto.
   *
   * PRECIO de ese espejo, y por que hace falta la ultima asercion: mientras
   * las dos listas fueron DISTINTAS (5 en claro, 4 en oscuro), este test
   * cazaba de rebote una regresion de hidratacion -- si el arbol oscuro no
   * llegaba a montarse, la lista se quedaba en la clara y el `toEqual`
   * fallaba. Siendo identicas eso deja de ser cierto: el test pasaria aunque
   * el tema nunca hidratara a oscuro. Se recupera la propiedad con un
   * marcador EXCLUSIVO del arbol oscuro (`[data-slide-index]`: el deck de
   * diapositivas de Story, que la rama clara no monta jamas). Sin el, el
   * fichero pierde la unica pieza capaz de distinguir "monta las secciones de
   * la rama oscura" de "monta las de la clara".
   */
  it("en tema oscuro (guardado en localStorage) monta las MISMAS 5 secciones que en claro, en el mismo orden", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<HomeSections />);

    await waitFor(() => {
      const ids = Array.from(container.querySelectorAll("section")).map(
        (el) => el.id,
      );
      expect(ids).toEqual([
        "story",
        "statement",
        "journey",
        "features",
        "contact",
        "about",
      ]);
      expect(
        container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse: sin deck de diapositivas, la lista de secciones de arriba es la de la rama CLARA",
      ).toBeGreaterThan(0);
    });
  });

  /*
   * Paridad de CONTENIDO entre ramas (Task 15, D-C), no solo de estructura:
   * un candado que renderiza las dos y compara los textos que cada una
   * ofrece para las claves que la unificacion toca. No compara el arbol
   * entero -- el arte y el vehiculo de presentacion SI ramifican por tema, y
   * exigir igualdad literal ahi seria exigir un solo diseno -- sino las
   * piezas concretas cuya divergencia senalaron las auditorias: el h2 de
   * Features, su kicker y su parrafo de entrada, y la frase de cierre de
   * Story con su enlace de comunidad.
   */
  it("Task 15: el h2/kicker/intro de Features y la frase de cierre de Story dicen lo MISMO en los dos temas", async () => {
    const textos = [
      esHome.Home.features.kicker,
      esHome.Home.features.title,
      esHome.Home.features.intro,
      esHome.Home.story.statement.third,
      esHome.Home.story.communityLink,
    ];

    const claro = renderWithProviders(<HomeSections />);
    for (const texto of textos) {
      expect(claro.container.textContent, `falta en CLARO: ${texto}`).toContain(
        texto,
      );
    }
    claro.unmount();

    window.localStorage.setItem("vti-theme", "dark");
    const oscuro = renderWithProviders(<HomeSections />);
    await waitFor(() => {
      // Mismo marcador exclusivo que el test de arriba, y por el mismo
      // motivo: sin el, este candado pasaria comparando la rama clara
      // consigo misma.
      expect(
        oscuro.container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse",
      ).toBeGreaterThan(0);
      for (const texto of textos) {
        expect(
          oscuro.container.textContent,
          `falta en OSCURO: ${texto}`,
        ).toContain(texto);
      }
    });
  });

  /*
   * Task 16 (unificacion parte 2, 2026-08-11): el mismo candado de paridad,
   * ahora sobre Journey y Contacto. Dos mitades distintas:
   *
   * - TEXTO: los seis pasos de Journey y toda la copia del bloque de
   *   contacto. Los ORDINALES ("01".."06") NO entran en esta lista: son
   *   visibles solo en la rama clara por decision del dueno (D16 de la spec
   *   de las 8 diapositivas, reconfirmada el 2026-08-11) y la oscura da su
   *   senal de posicion con texto para lector de pantalla, que se verifica
   *   en Journey.test.tsx. Lo que ESTE fichero protege es que ninguna rama
   *   se quede sin la senal, cada una en su forma.
   * - SALIDAS Y CONTROLES: que en las DOS ramas haya un `<form>` con un
   *   campo de correo real y enlaces a Discord y GitHub. Esta mitad es la
   *   que de verdad cierra el hallazgo #1 de la critica del 2026-08-11 --
   *   la rama clara tenia el texto "correo" por todas partes y ni un solo
   *   control con el que escribirlo.
   */
  it("Task 16: los pasos de Journey, la senal de posicion y el formulario + salidas de Contacto existen en los DOS temas", async () => {
    const posicionOscura = esHome.Home.journey.stepPosition
      .replace("{{current}}", "1")
      .replace("{{total}}", "6");
    const textos = [
      esHome.Home.journey.steps.discover.label,
      esHome.Home.journey.steps.evolve.label,
      esHome.Home.contact.form.label,
      esHome.Home.contact.form.submit,
      esHome.Home.contact.cards.community.title,
      esHome.Home.contact.cards.code.title,
    ];

    function comprobar(container: HTMLElement, rama: string): void {
      for (const texto of textos) {
        expect(container.textContent, `falta en ${rama}: ${texto}`).toContain(
          texto,
        );
      }
      const form = container.querySelector("form");
      expect(form, `sin <form> en ${rama}`).not.toBeNull();
      expect(
        form?.querySelector('input[type="email"]'),
        `sin campo de correo real en ${rama}`,
      ).not.toBeNull();
      expect(
        container.querySelector('a[href*="discord"]'),
        `sin salida a Discord en ${rama}`,
      ).not.toBeNull();
      expect(
        container.querySelector('a[href*="github"]'),
        `sin salida a GitHub en ${rama}`,
      ).not.toBeNull();
    }

    const claro = renderWithProviders(<HomeSections />);
    comprobar(claro.container, "CLARO");
    // Senal de posicion UNIFICADA (ola G, 2026-08-18; contrato actualizado,
    // no relajado — regla 40): NINGUNA rama pinta el ordinal "01 · " (el
    // claro lo retiro para igualar con el oscuro, que nunca lo pinto por
    // decision D16/Task 16) y LAS DOS anuncian las mismas palabras a lector
    // de pantalla ("Paso N de 6", misma clave de i18n).
    expect(claro.container.textContent).toContain(posicionOscura);
    expect(claro.container.textContent).not.toContain(
      `01 · ${esHome.Home.journey.steps.discover.label}`,
    );
    claro.unmount();

    window.localStorage.setItem("vti-theme", "dark");
    const oscuro = renderWithProviders(<HomeSections />);
    await waitFor(() => {
      expect(
        oscuro.container.querySelectorAll("[data-slide-index]").length,
        "el arbol oscuro no llego a montarse",
      ).toBeGreaterThan(0);
      comprobar(oscuro.container, "OSCURO");
      expect(oscuro.container.textContent).toContain(posicionOscura);
      expect(oscuro.container.textContent).not.toContain(
        `01 · ${esHome.Home.journey.steps.discover.label}`,
      );
    });
  });

  /*
   * CANDADO DE CABLEADO DEL HALLAZGO A (crítica externa #11): este componente
   * es el que decide qué rama de tema se monta, así que es el que tiene que
   * consumir `useFragmentLanding`. El mecanismo (cuándo, cuántas veces, las
   * guardas) se prueba entero en `src/hooks/useFragmentLanding.test.ts`; lo
   * único que este test protege es que el hook siga ENCHUFADO aquí -- si
   * alguien lo retira, la navegación con fragmento vuelve a aterrizar a miles
   * de píxeles del destino en tema oscuro y ningún test del hook se enteraría.
   *
   * Se ejercita por el TOPE y no por los frames: `vi.useFakeTimers` con solo
   * `setTimeout`/`clearTimeout` falseados deja la cola de `requestAnimationFrame`
   * de jsdom sin avanzar en un test síncrono, que es exactamente el camino de
   * "pestaña sin frames" que el hook cubre con su temporizador de seguridad.
   *
   * jsdom no maqueta ni implementa la navegación por fragmento, así que aquí
   * NO se puede afirmar dónde aterriza el lector -- solo a quién se le pide el
   * desplazamiento y con qué opciones. La comprobación de píxeles es en
   * navegador real (regla 44).
   */
  it("crítica #11: consume useFragmentLanding, así que una carga con fragmento reposiciona su destino", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      window.location.hash = "#contact";
      const { container } = renderWithProviders(<HomeSections />);

      const destino = container.querySelector<HTMLElement>("#contact");
      expect(destino, "no se encontró la sección de contacto").not.toBeNull();
      const scrollIntoView = vi.fn();
      destino!.scrollIntoView = scrollIntoView;

      act(() => {
        vi.advanceTimersByTime(FRAGMENT_LANDING_SETTLE_MS);
      });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "instant",
        block: "start",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * CRÍTICA EXTERNA #14, P0 (ola J, 2026-09-02). Medido en Chrome real: al
   * conmutar el tema con la lectura en Características, los nodos
   * `<section id="features">` y `<section id="contact">` -- que React REUTILIZA
   * entre ramas, porque las dos los renderizan en la misma posición del árbol
   * -- conservaban el `data-inview` que la rama clara les había escrito
   * ("true" y "false" respectivamente), FOSILIZADO, mientras Story y Viaje
   * quedaban limpias (sus decks oscuros son componentes distintos y remontan
   * nodos nuevos). `useActiveSection` leía esa señal muerta y el navbar -- y
   * con él el enlace de idioma -- anunciaban «Características» en toda la
   * página.
   *
   * POR QUÉ ESTE CANDADO VIVE AQUÍ Y NO SOLO EN EL HOOK: el mecanismo de la
   * retracción ya está probado pieza a pieza en `useSectionProgress.test.tsx`,
   * pero lo que produjo el defecto no fue el hook en abstracto -- fue el
   * CABLEADO real: Features y Contacto llaman al hook en las dos ramas y solo
   * atan el ref en una. Este componente es el único sitio donde ese cableado
   * se ve entero, y la conmutación de tema en caliente (no un montaje nuevo
   * con `localStorage` ya puesto, como hacen los tests de arriba) es la única
   * forma de ejercitar el nodo REUTILIZADO, que es el que se fosilizaba.
   *
   * Es además la evidencia de por qué NO se remontan las cuatro secciones con
   * `key={themeName}` -- la tercera vía que el encargo dejaba abierta: con la
   * retracción hecha por su dueño, ningún nodo sobrevive con la señal puesta,
   * así que remontar el árbol entero (y con él escenas, imágenes y estado de
   * reveal) en cada conmutación sería pagar un precio de más por un problema
   * que ya no existe.
   */
  describe("crítica #14: conmutar de tema no deja señal de scrollspy fosilizada", () => {
    let observados: {
      target: Element;
      emit: (isIntersecting: boolean) => void;
    }[] = [];

    /** Reemplaza el stub mínimo del `beforeEach` de arriba por uno que sí
     *  guarda a quién observa cada `IntersectionObserver`, para poder disparar
     *  la intersección de UNA sección concreta. */
    function stubIntersectionObserverConDisparo(): void {
      observados = [];
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          private readonly cb: (entries: { isIntersecting: boolean }[]) => void;
          constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
            this.cb = cb;
          }
          observe(target: Element): void {
            observados.push({
              target,
              emit: (v: boolean) => this.cb([{ isIntersecting: v }]),
            });
          }
          unobserve(): void {}
          disconnect(): void {}
        },
      );
    }

    function emitirInterseccion(el: Element): void {
      const entradas = observados.filter((o) => o.target === el);
      if (entradas.length === 0) {
        throw new Error(`ningún IntersectionObserver observa #${el.id}`);
      }
      for (const entrada of entradas) entrada.emit(true);
    }

    /** El toggle real del proveedor: conmuta el tema EN CALIENTE, que es el
     *  gesto que el defecto necesitaba (los tests de arriba montan cada rama
     *  desde cero y nunca reutilizan un nodo). */
    function ConmutadorDeTema(): ReactElement {
      const { toggleTheme } = useTheme();
      return <button onClick={toggleTheme}>conmutar tema</button>;
    }

    it("las secciones que la rama clara marcó quedan sin data-inview al pasar a oscuro", async () => {
      stubIntersectionObserverConDisparo();
      const { container } = renderWithProviders(
        <>
          <ConmutadorDeTema />
          <HomeSections />
        </>,
      );

      const features = container.querySelector<HTMLElement>("#features");
      const contact = container.querySelector<HTMLElement>("#contact");
      expect(
        features,
        "no se encontró la sección de características",
      ).not.toBeNull();
      expect(contact, "no se encontró la sección de contacto").not.toBeNull();

      act(() => {
        emitirInterseccion(features!);
        emitirInterseccion(contact!);
      });

      // Precondición: en claro la señal EXISTE. Sin esto, el resto del test
      // pasaría también con el hook desconectado, sin probar nada.
      expect(features!.dataset.inview).toBe("true");
      expect(contact!.dataset.inview).toBe("true");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "conmutar tema" }));
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll("[data-slide-index]").length,
          "el árbol oscuro no llegó a montarse: la conmutación no ocurrió",
        ).toBeGreaterThan(0);
      });

      const conSenal = Array.from(
        container.querySelectorAll("section[data-inview]"),
      ).map((n) => n.id);
      expect(
        conSenal,
        "una sección conserva la señal escrita por la rama clara: el scrollspy la leerá como si describiera la posición actual",
      ).toEqual([]);
    });

    /*
     * Bug inyectado a propósito (regla 34), ejecutado en esta tarea: vaciar
     * `retract()` en `useSectionProgress.ts` -- devolver el hook a lo que
     * hacía cuando llegó la crítica, escribir y no borrar nunca -- pone este
     * test en rojo reproduciendo el hallazgo palabra por palabra:
     * "expected [ 'features', 'contact' ] to deeply equal []", las DOS
     * secciones cuyo nodo React reutiliza, y solo esas.
     *
     * Lo que este candado NO aísla, y conviene saberlo antes de fiarse de él
     * para otra cosa: quitar SOLO el latido (`syncTargetRef.current?.()`) lo
     * deja en VERDE, porque aquí corre el `requestAnimationFrame` real de
     * jsdom durante la espera y la guarda de `tick()` acaba retractando por su
     * cuenta. Los tres caminos de la retracción se distinguen uno a uno en
     * `useSectionProgress.test.tsx`, donde el reloj de frames se pilota a
     * mano; este test prueba el CABLEADO y el desenlace, no cuál de los tres
     * llegó antes.
     */
  });
});
