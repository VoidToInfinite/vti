import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, fireEvent, act } from "@/test/test-utils";
import { HERO_STEP_MS } from "@/components/sections/Hero/hero.transition";
import { Eye } from "./Eye";
import { EYE_LAYERS, EYE_PRELOADS, EYE_STAGGER } from "./eye.layers";

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por `Eye`) llama a
 * `window.matchMedia` de verdad al montar; jsdom no lo implementa, así que
 * sin este stub cualquier render de `<Eye />` lanza "matchMedia is not a
 * function". `fineMatches` controla si el puntero queda habilitado (arranca su
 * propio rAF interno); `reducedMatches` siempre es `false` salvo que se pida.
 */
function stubMatchMedia(fineMatches: boolean, reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : fineMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * Mock de `IntersectionObserver` para la guarda de visibilidad que
 * `useParallaxLayers` gana con el tercer argumento `sceneRef` (D3, spec
 * 2026-08-04): jsdom no lo implementa, y `Eye` ahora SIEMPRE pasa su raiz
 * (`ScSocket`) como esa ref, asi que cualquier test de aqui que habilite el
 * puntero fino (`stubMatchMedia(true)`) hace que el efecto llegue a
 * `new IntersectionObserver(...)` -- sin este stub esos montajes lanzarian
 * "IntersectionObserver is not defined". Mismo patron exacto que
 * `useParallaxLayers.test.tsx`: `observe`/`disconnect` quedan espiados y el
 * callback capturado en `ioTrigger` para que cada test decida cuando simular
 * que el hero entra o sale del viewport; `ioObserveSpy` se reasigna dentro
 * de la funcion (no una unica instancia module-level) para que "se llamo una
 * vez" en un test no arrastre llamadas de montajes anteriores.
 */
let ioTrigger: (isIntersecting: boolean) => void;
let ioObserveSpy: ReturnType<typeof vi.fn>;
function stubIntersectionObserver(): void {
  ioObserveSpy = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = ioObserveSpy;
      disconnect = vi.fn();
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioTrigger = (v: boolean) => cb([{ isIntersecting: v }]);
      }
    },
  );
}

beforeEach(() => {
  // Por defecto sin puntero fino: la mayoría de estos tests solo verifican
  // estructura/accesibilidad, no el seguimiento del cursor.
  stubMatchMedia(false);
  // El tema decide qué mascota ocupa el centro del ojo, y `ThemeProvider` lo
  // lee de localStorage al montar: sin limpiarlo, el test que lo fija a
  // oscuro contaminaría a los siguientes.
  window.localStorage.clear();
  // Inerte en los tests con el puntero deshabilitado (el efecto de
  // useParallaxLayers corta en `if (!enabled) return` antes de tocar el
  // observer), pero obligatorio para los que si lo habilitan mas abajo.
  stubIntersectionObserver();
});
afterEach(() => vi.unstubAllGlobals());

describe("Eye", () => {
  it("es decoracion: todo el ojo queda fuera del arbol de accesibilidad", () => {
    const { container } = renderWithProviders(<Eye />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("no expone ninguna capa como imagen accesible (el nombre lo da el DOM real)", () => {
    const { container } = renderWithProviders(<Eye />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // El corolario estructural: toda capa es decorativa, `alt` vacio.
    for (const img of container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt", "");
    }
  });

  it("monta las cinco capas de la composicion, en orden de atras a delante", () => {
    const { container } = renderWithProviders(<Eye />);
    const parts = [...container.querySelectorAll("img[data-part]")].map((img) =>
      img.getAttribute("data-part"),
    );
    expect(parts).toEqual(EYE_LAYERS.map((layer) => layer.part));
  });

  it("ofrece la variante estrecha de cada capa para no servir 1672px a un movil", () => {
    const { container } = renderWithProviders(<Eye />);
    for (const layer of EYE_LAYERS) {
      const img = container.querySelector(`img[data-part="${layer.part}"]`);
      expect(img).toHaveAttribute("src", layer.src);
      expect(img?.getAttribute("srcset")).toContain(layer.srcSmall);
      expect(img).toHaveAttribute("sizes");
    }
  });

  it("solo el fondo (candidata a LCP, la unica capa no aditiva) pide prioridad alta; las otras cuatro no compiten por ancho de banda (auditoria 2026-08-08, paridad con Aura)", () => {
    const { container } = renderWithProviders(<Eye />);
    const background = container.querySelector('img[data-part="background"]');
    expect(background).toHaveAttribute("loading", "eager");
    expect(background).toHaveAttribute("fetchpriority", "high");

    for (const layer of EYE_LAYERS.filter((l) => l.additive)) {
      const img = container.querySelector(`img[data-part="${layer.part}"]`);
      expect(img).not.toHaveAttribute("loading");
      expect(img).not.toHaveAttribute("fetchpriority");
    }
  });

  it("aplica className en el elemento raiz (styled(Eye) lo necesita para el hero)", () => {
    const { container } = renderWithProviders(<Eye className="custom" />);
    expect(container.firstElementChild).toHaveClass("custom");
  });

  it("no arranca el rAF de seguimiento cuando el puntero esta deshabilitado (tactil o reduced-motion)", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    renderWithProviders(<Eye />); // matchMedia deshabilitado por el beforeEach
    expect(raf).not.toHaveBeenCalled();
  });

  it("cancela el rAF de seguimiento en curso al desmontar", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const { unmount } = renderWithProviders(<Eye />);
    // El hero esta en pantalla al montar (escenario real): sin disparar la
    // interseccion el bucle propio de useParallaxLayers se queda en
    // `running = false` a la espera del primer cruce y este test dejaria de
    // ejercitar su rAF, no el de usePointer.
    act(() => ioTrigger(true));
    expect(raf).toHaveBeenCalled();
    unmount();
    expect(caf).toHaveBeenCalledWith(7);
  });

  it("no cancela ni reprograma el rAF de seguimiento al re-renderizar con las mismas props (usePointer() devuelve un objeto nuevo por render)", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(9);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const { rerender } = renderWithProviders(<Eye />);
    act(() => ioTrigger(true));
    // Al montar, tanto `usePointer` (rAF del lerp) como `Eye` (rAF que
    // aplica los transforms) piden un frame cada uno: hay que medir el
    // DELTA tras el re-render, no un total absoluto.
    const callsAfterMount = raf.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    rerender(<Eye />);
    expect(caf).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalledTimes(callsAfterMount);
  });

  it("el parallax desplaza cada capa segun su profundidad, y deja el fondo quieto", () => {
    stubMatchMedia(true); // puntero fino habilitado
    // rAF controlado a mano: se guardan los callbacks pendientes y se ejecutan
    // en tandas, que es la unica forma de avanzar el lerp de `usePointer` (y
    // con el, el rAF del ojo) de manera determinista dentro de jsdom.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { container } = renderWithProviders(<Eye />);
    // El hero esta en pantalla al montar: sin disparar la interseccion el
    // bucle de useParallaxLayers nunca arranca (D3, guarda de visibilidad) y
    // ninguna capa llegaria a recibir transform.
    act(() => ioTrigger(true));

    // Cursor en la esquina inferior derecha del viewport => x, y -> +1.
    window.dispatchEvent(
      new MouseEvent("pointermove", {
        clientX: window.innerWidth,
        clientY: window.innerHeight,
      }),
    );
    // Varias tandas: el lerp (0.085/frame) necesita tiempo para acercarse al
    // objetivo, y el ojo lee el valor ya suavizado.
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    const transformOf = (part: string): string =>
      container.querySelector<HTMLElement>(`[data-part="${part}"]`)?.style
        .transform ?? "";
    const xOf = (part: string): number =>
      Number(/translate3d\((-?[\d.]+)px/.exec(transformOf(part))?.[1] ?? "0");

    // El fondo (depth 0) no recibe transform nunca: es el plano de referencia.
    expect(transformOf("background")).toBe("");
    // El resto se ordena por profundidad: pupila > iris > nebulosa > parpado.
    expect(xOf("pupil")).toBeGreaterThan(xOf("iris"));
    expect(xOf("iris")).toBeGreaterThan(xOf("nebula"));
    expect(xOf("nebula")).toBeGreaterThan(xOf("eyelid"));
    expect(xOf("eyelid")).toBeGreaterThan(0);
    // La mascota del centro viaja pegada a la pupila, no a su propio ritmo.
    expect(transformOf("mascot")).toBe(transformOf("pupil"));
  });

  it("el centro del ojo lo ocupa siempre el Wormhole, sin importar el tema", () => {
    // localStorage en "light" es la prueba de que la eleccion YA NO depende
    // del tema: si `Eye` volviera a ramificar por `themeName`, este test lo
    // detectaria de inmediato.
    window.localStorage.setItem("vti-theme", "light");
    const { container } = renderWithProviders(<Eye />);
    const slot = container.querySelector('[data-part="mascot"]');

    expect(slot?.querySelector('[data-part="ring1"]')).toBeInTheDocument();
    expect(slot?.querySelector('[data-face="sol"]')).not.toBeInTheDocument();
  });

  it("no monta el anillo de choque simple: la coreografia del pulso es del Wormhole", () => {
    // El Wormhole trae sus dos ondas de choque propias: montar ademas el
    // anillo simple del ojo daria tres ondas para el mismo click.
    const { container } = renderWithProviders(<Eye />);
    expect(
      container.querySelector('[data-part="shock"]'),
    ).not.toBeInTheDocument();
  });

  it("con reduced-motion el pointerdown no marca el pulso (no habria animacion que lo apagara)", () => {
    stubMatchMedia(false, true);
    const { container } = renderWithProviders(<Eye />);
    const socket = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(socket);
    expect(socket).not.toHaveAttribute("data-pulsing");
  });

  it("un pointerdown sobre el ojo marca el pulso, y el fin de su animacion lo limpia para que pueda repetirse", () => {
    const { container } = renderWithProviders(<Eye />);
    const socket = container.firstElementChild as HTMLElement;
    // La ultima onda del Wormhole (`shock2`) es la que lleva el handler de
    // fin de pulso (ver comentario en `Wormhole.tsx`): con `ScShock` fuera
    // de `Eye`, es el unico elemento que cierra el ciclo.
    const shock2 = container.querySelector(
      '[data-part="shock2"]',
    ) as HTMLElement;

    expect(socket).not.toHaveAttribute("data-pulsing");

    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");

    fireEvent.animationEnd(shock2);
    expect(socket).not.toHaveAttribute("data-pulsing");

    // Se puede repetir: un segundo click vuelve a marcar el pulso.
    fireEvent.pointerDown(socket);
    expect(socket).toHaveAttribute("data-pulsing", "true");
  });

  it("D3 (spec 2026-08-04): al montar, useParallaxLayers observa la raiz del ojo (ScSocket) -- antes no se instanciaba ningun IntersectionObserver", () => {
    // Solo con el puntero habilitado el efecto de useParallaxLayers llega a
    // leer sceneRef: con el puntero deshabilitado (el defecto del
    // beforeEach) corta antes en `if (!enabled) return` y nunca toca el
    // observer, asi que esta comprobacion necesita su propio
    // stubMatchMedia(true).
    stubMatchMedia(true);
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    renderWithProviders(<Eye />);

    expect(ioObserveSpy).toHaveBeenCalledTimes(1);
  });
});

/**
 * Escalonado de carga/cruce de temas del ojo (tarea B4, spec S4.1/S6.1-S6.2).
 * Bateria separada de la de arriba: monta <Eye/> con y sin un ancestro
 * [data-state], que es lo que las piezas del ojo leen via el selector
 * DESCENDIENTE [data-state="..."] & (eye.parts.tsx, funcion eyeStagger).
 *
 * Todas las piezas escalonadas ("socket", cada `layer.part` de EYE_LAYERS,
 * "mascot" y "scrim") se localizan por su atributo data-part, que Eye.tsx ya
 * escribe en las cinco capas, la mascota y el velo -- y ahora tambien en el
 * lienzo (tarea B3).
 */
describe("Eye (escalonado de carga/cruce de temas)", () => {
  const ALL_PARTS = [
    "socket",
    ...EYE_LAYERS.map((layer) => layer.part),
    "mascot",
    "scrim",
  ];

  beforeEach(() => {
    stubMatchMedia(false);
    window.localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  function partEl(container: HTMLElement, part: string): HTMLElement {
    return container.querySelector(`[data-part="${part}"]`) as HTMLElement;
  }

  /**
   * `animationDelay` computado puede ser una lista separada por comas cuando
   * la pieza tiene glow (p.ej. "0s,440ms": el glow no lleva retardo, el
   * escalonado si) -- medido en este entorno (jsdom + styled-components v6):
   * al declarar las propiedades como LONGHAND (no como la abreviatura
   * `animation`), `getComputedStyle` SI las resuelve, listas incluidas
   * (comprobado tambien para `animationName` y `animationFillMode`, ver los
   * tests de mas abajo) -- a diferencia de la abreviatura, que la leccion de
   * 2026-07-25 documenta que jsdom no expande. La entrada del escalonado va
   * SIEMPRE la ULTIMA de la lista (spec S6.1), asi que basta leer el ULTIMO
   * valor para comparar el retardo del escalonado en piezas con y sin glow
   * por igual.
   */
  function staggerDelay(el: HTMLElement): string {
    const delay = getComputedStyle(el).animationDelay;
    return delay.split(",").pop()?.trim() ?? delay;
  }

  it("sin ancestro [data-state], todas las piezas (incluidos socket y scrim) se ven a opacidad 1", () => {
    // Candado central del defecto: Eye.test.tsx (arriba) monta <Eye/> fuera
    // de cualquier backdrop, exactamente asi, y tiene que verse normal -- si
    // el defecto de eyeStagger fuera opacity: 0, TODO el ojo desaparaceria
    // sin que ningun test existente lo notase.
    const { container } = renderWithProviders(<Eye />);
    for (const part of ALL_PARTS) {
      expect(getComputedStyle(partEl(container, part)).opacity).toBe("1");
    }
  });

  it('con un ancestro [data-state="active"], el animationDelay de cada pieza sigue EYE_STAGGER (incluidos los sinonimos)', () => {
    const { container } = renderWithProviders(
      <div data-state="active">
        <Eye />
      </div>,
    );

    for (const part of EYE_STAGGER) {
      const step = EYE_STAGGER.indexOf(part);
      expect(staggerDelay(partEl(container, part))).toBe(
        `${step * HERO_STEP_MS}ms`,
      );
    }

    // Sinonimos (spec S4.1): "socket" comparte escalon con "mascot" (el
    // primero, 0), "scrim" con "pupil" (el ultimo).
    expect(staggerDelay(partEl(container, "socket"))).toBe(
      staggerDelay(partEl(container, "mascot")),
    );
    expect(staggerDelay(partEl(container, "scrim"))).toBe(
      staggerDelay(partEl(container, "pupil")),
    );
  });

  it('con un ancestro [data-state="leaving"], el retardo se invierte y mascot/socket reciben el MAYOR (los ultimos en apagarse)', () => {
    const { container } = renderWithProviders(
      <div data-state="leaving">
        <Eye />
      </div>,
    );
    const total = EYE_STAGGER.length;

    for (const part of EYE_STAGGER) {
      const step = EYE_STAGGER.indexOf(part);
      expect(staggerDelay(partEl(container, part))).toBe(
        `${(total - 1 - step) * HERO_STEP_MS}ms`,
      );
    }

    // El requisito central del brief: mascot/socket (escalon 0) reciben el
    // retardo MAYOR de toda la tabla -- son los ULTIMOS en apagarse.
    const mayorRetardo = `${(total - 1) * HERO_STEP_MS}ms`;
    expect(staggerDelay(partEl(container, "mascot"))).toBe(mayorRetardo);
    expect(staggerDelay(partEl(container, "socket"))).toBe(mayorRetardo);
  });

  it("las capas con glow (iris, pupil) declaran DOS animaciones, con la del escalonado SIEMPRE la ultima de la lista", () => {
    // Medido empiricamente en este entorno (jsdom + styled-components v6):
    // al declarar `animation-name`/`animation-fill-mode` como longhand (no
    // como la abreviatura `animation`), `getComputedStyle` SI devuelve la
    // lista completa separada por comas -- no hizo falta caer a
    // `document.styleSheets` (patron de Hero.qa.test.tsx/aura.parts.test.tsx)
    // para esta asercion en concreto.
    const { container } = renderWithProviders(
      <div data-state="active">
        <Eye />
      </div>,
    );

    // "eyelid" no tiene glow: su animationName activo es UN solo nombre, el
    // del escalonado (heroEyeIn). Las capas CON glow lo referencian como su
    // segunda entrada -- mismo hash, porque es el MISMO keyframe -- asi que
    // comparar contra el nombre de una capa sin glow evita depender de un
    // hash interno de styled-components escrito a mano.
    const nombreEscalonadoSolo = getComputedStyle(
      partEl(container, "eyelid"),
    ).animationName;

    for (const part of ["iris", "pupil"]) {
      const el = partEl(container, part);
      const nombres = getComputedStyle(el).animationName.split(",");
      expect(nombres).toHaveLength(2);
      expect(nombres[1]).toBe(nombreEscalonadoSolo);

      // fill-mode: el glow (primera entrada) no necesita sostener nada
      // ("none", su valor inicial); el escalonado (ultima) sostiene el
      // fotograma `from` durante su retardo ("backwards").
      const fillModes = getComputedStyle(el).animationFillMode.split(",");
      expect(fillModes).toHaveLength(2);
      expect(fillModes[1]).toBe("backwards");
    }
  });

  it('con [data-state="leaving"], las capas con glow sostienen el fill forwards en la entrada del escalonado', () => {
    const { container } = renderWithProviders(
      <div data-state="leaving">
        <Eye />
      </div>,
    );

    for (const part of ["iris", "pupil"]) {
      const fillModes = getComputedStyle(
        partEl(container, part),
      ).animationFillMode.split(",");
      expect(fillModes).toHaveLength(2);
      // La salida sostiene el opacity: 0 final CONTRA la animacion infinita
      // del glow (spec S6.1: medido, "forwards" gana la pugna).
      expect(fillModes[1]).toBe("forwards");
    }
  });

  it("existe el bloque prefers-reduced-motion: reduce con animation: none para los tres estados", () => {
    // GlobalStyles.tsx colapsa animation-duration a 0.001ms bajo reduce pero
    // NO toca animation-delay (spec S6.5): sin este guard, una pieza con
    // 550ms de retardo y fill: backwards quedaria invisible medio segundo y
    // luego aparaceria de golpe. createGlobalStyle no inyecta nada bajo
    // jsdom+vitest (leccion 2026-07-25), pero ESTE guard vive en un
    // styled.* normal (ScLayer/ScSocket/etc via eyeStagger), que si inyecta
    // sus reglas -- se puede leer directamente del CSSOM.
    renderWithProviders(<Eye />);

    const reglas: string[] = [];
    const walk = (rules: CSSRuleList): void => {
      Array.from(rules).forEach((rule) => {
        reglas.push(rule.cssText);
        const anidadas = (rule as CSSGroupingRule).cssRules;
        if (anidadas) walk(anidadas);
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        walk(sheet.cssRules);
      } catch {
        /* hoja inaccesible: no aporta */
      }
    });

    const bloqueReduce = reglas.filter(
      (regla) =>
        regla.includes("@media (prefers-reduced-motion: reduce)") &&
        regla.includes('[data-state="active"]') &&
        regla.includes('[data-state="leaving"]') &&
        regla.includes('[data-state="pending"]') &&
        regla.includes("animation: none") &&
        regla.includes("opacity: 1"),
    );
    expect(bloqueReduce.length).toBeGreaterThan(0);
  });

  /** Todas las reglas inyectadas, incluidas las anidadas dentro de @media. */
  function todasLasReglas(): string[] {
    const out: string[] = [];
    const walk = (rules: CSSRuleList): void => {
      Array.from(rules).forEach((rule) => {
        out.push(rule.cssText);
        const anidadas = (rule as CSSGroupingRule).cssRules;
        if (anidadas) walk(anidadas);
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        walk(sheet.cssRules);
      } catch {
        /* hoja inaccesible: no aporta */
      }
    });
    return out;
  }

  /** Reglas cuyo selector menciona alguna de las clases del elemento. */
  function reglasDe(el: HTMLElement): string[] {
    const clases = Array.from(el.classList);
    return todasLasReglas().filter((texto) =>
      clases.some((cls) => texto.includes(`.${cls}`)),
    );
  }

  it("el guard AMBIENTAL de reduce (sin ancestro [data-state]) apaga la respiracion de la corona en un <Eye/> montado suelto", () => {
    // eyeStagger declara DOS guards de reduce distintos (ver su docblock en
    // eye.parts.tsx): uno AMBIENTAL, incondicional, que apaga glowStrong/
    // glowSoft cuando NO hay ningun ancestro [data-state] (el caso de este
    // test, exactamente como lo monta Eye.test.tsx sin backdrop); y tres
    // calificados por [data-state="..."] que solo entran en juego dentro de
    // HeroBackdrop. Sin el ambiental, la respiracion de la corona seguiria
    // encendida bajo reduced-motion en cualquier <Eye/> montado suelto -- ese
    // es el bug que este candado cierra. Se distingue del bloque calificado
    // buscando un bloque de reduce cuyo selector NO contenga "[data-state":
    // una asercion que solo comprobara "existe algun bloque de reduce"
    // pasaria igual aunque el guard ambiental desapareciera, porque el
    // bloque calificado (ya cubierto por el test de arriba) seguiria ahi.
    const { container } = renderWithProviders(<Eye />);
    const iris = partEl(container, "iris");

    const bloquesReduce = reglasDe(iris).filter((regla) =>
      regla.includes("@media (prefers-reduced-motion: reduce)"),
    );
    expect(bloquesReduce.length).toBeGreaterThan(0);

    const bloqueAmbiental = bloquesReduce.find(
      (regla) => !regla.includes("[data-state"),
    );
    expect(bloqueAmbiental).toBeDefined();
    expect(bloqueAmbiental).toContain("animation: none");
  });
});

/**
 * Fallback sin JavaScript de `eyeStagger` (Task 10 del plan premium,
 * 2026-08-11), espejo del que `aura.parts.test.tsx` cubre para la
 * composicion clara. Sin JS, `HeroBackdrop` nunca corre su carrera de
 * `decode()` y su envoltorio se queda en `data-state="pending"` para
 * siempre: sin este guard, el ojo queda invisible de forma permanente.
 *
 * jsdom no evalua NINGUN `@media` (regla 36 de RULES.md), asi que se
 * inspecciona `document.styleSheets`, acotando la busqueda al bloque
 * `@media (scripting: none)` concreto.
 */
describe("Eye bajo @media (scripting: none) (fallback sin JavaScript)", () => {
  /** Reglas de estilo declaradas DENTRO de un `@media (scripting: none)`. */
  function reglasSinScripting(): CSSStyleRule[] {
    const out: CSSStyleRule[] = [];
    const walk = (rules: CSSRuleList, dentro: boolean): void => {
      Array.from(rules).forEach((rule) => {
        const media = (rule as CSSMediaRule).media;
        const aqui =
          dentro || (media ? /scripting:\s*none/.test(media.mediaText) : false);
        const anidadas = (rule as CSSGroupingRule).cssRules;
        if (anidadas) {
          walk(anidadas, aqui);
          return;
        }
        if (aqui && (rule as CSSStyleRule).selectorText !== undefined) {
          out.push(rule as CSSStyleRule);
        }
      });
    };
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        walk(sheet.cssRules, false);
      } catch {
        /* hoja inaccesible: no aporta */
      }
    });
    return out;
  }

  it('devuelve las capas a opacity: 1 en "pending", con el selector DESCENDIENTE y sin animacion', () => {
    const { container } = renderWithProviders(<Eye />);
    const iris = container.querySelector('[data-part="iris"]') as HTMLElement;
    expect(iris).not.toBeNull();
    const clases = Array.from(iris.classList);

    const propias = reglasSinScripting().filter((regla) =>
      clases.some((cls) => regla.selectorText.includes(`.${cls}`)),
    );
    expect(propias.length).toBeGreaterThan(0);

    propias.forEach((regla) => {
      // FORMA del selector sobre selectorText (regla 35 de RULES.md): el
      // atributo data-state vive en el envoltorio del stack (ScEyeStack,
      // HeroBackdrop.tsx), no en la capa -- tiene que ser DESCENDIENTE.
      expect(regla.selectorText).toMatch(/^\[data-state="pending"\]\s/);
      expect(regla.style.opacity).toBe("1");
      // El escalonado del ojo sale por animation, no por transition: sin
      // apagarla, el fill backwards del heroEyeIn que nunca llega a
      // dispararse dejaria la capa gobernada por una animacion muerta.
      expect(regla.style.animation).toBe("none");
    });
  });
});

/*
 * Candado de `EYE_PRELOADS` (Ola A.1, 2026-08-16). Existe porque el navegador
 * solo trata una precarga y la petición del `<img>` como la MISMA cosa si
 * `imagesrcset`/`imagesizes` coinciden con `srcSet`/`sizes` carácter a
 * carácter; si divergen, la imagen se descarga DOS veces y el arreglo de
 * rendimiento se convierte en un defecto de rendimiento.
 *
 * NO es tautológico aunque las dos partes salgan de `EYE_LAYERS`: `Eye.tsx`
 * construye su `srcSet` con su propia plantilla literal, y `EYE_PRELOADS`
 * construye la suya. Este test compara lo que el componente RENDERIZA de
 * verdad contra la lista que el script de arranque inyecta — que es
 * exactamente el punto por donde pueden separarse.
 *
 * Validado con el bug inyectado a propósito: cambiando `1672w` por `1673w` en
 * la plantilla de `EYE_PRELOADS` (`eye.layers.ts`), este test cae en rojo;
 * restaurado, vuelve a verde.
 */
describe("Eye: las precargas del arranque coinciden con lo que se renderiza", () => {
  it("cada capa renderizada tiene una precarga con su srcSet y su sizes exactos", () => {
    const { container } = renderWithProviders(<Eye />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(EYE_LAYERS.length);
    expect(EYE_PRELOADS).toHaveLength(EYE_LAYERS.length);

    imgs.forEach((img, i) => {
      expect(
        img.getAttribute("srcset"),
        `la capa ${i} renderiza un srcSet que ninguna precarga reproduce: el navegador descargaría la imagen dos veces`,
      ).toBe(EYE_PRELOADS[i].srcSet);
      expect(img.getAttribute("sizes")).toBe(EYE_PRELOADS[i].sizes);
    });
  });
});
