import { renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { STORAGE_KEYS } from "@/config/storage";
import { FRAGMENT_LANDING_SETTLE_MS } from "./useFragmentLanding";
import { useReloadLanding } from "./useReloadLanding";

/*
 * LO QUE ESTE FICHERO PUEDE PROBAR Y LO QUE NO, escrito antes que los tests
 * para que nadie lea de más en un verde.
 *
 * jsdom no maqueta, no pinta, no recarga y no restituye scroll (CLAUDE.md §5,
 * punto 2). Aquí NO se puede observar "el lector volvió a su sección tras
 * recargar": eso es una propiedad de píxeles de un navegador real, y su
 * candado vive en `scripts/check-site-surfaces.mjs` (otro frente de esta ola).
 * Lo que sí se ata aquí es el MECANISMO completo, que es donde vivía el
 * defecto: QUÉ se anota antes de irse, CUÁNDO se decide restituir, CONTRA QUÉ
 * geometría, CUÁNTAS veces (una) y en qué casos NO se restituye en absoluto.
 *
 * MATRIZ DE ESTE CANDADO (regla 2 de la lección del 2026-09-06), porque un
 * candado que no dice qué combinaciones mira miente por omisión:
 *
 * - Tipo de navegación: `reload`, `back_forward`, `navigate` y la ausencia de
 *   entrada. LAS CUATRO se ejercitan; es el eje del defecto.
 * - Rama de tema: se ejercita el CAMBIO de rama (claro -> oscuro), que es la
 *   secuencia real de la hidratación bajo `output: "export"`, y también la
 *   carga que ya venía con la rama definitiva. Los NOMBRES de rama son
 *   irrelevantes para el hook (recibe un `string` opaco), así que no se
 *   multiplica por tema.
 * - Fragmento en la URL: con y sin.
 * - `pathname`: coincidente y distinto.
 * - Relojes: los dos caminos, el doble `requestAnimationFrame` y el tope de la
 *   pestaña sin frames.
 * - Gesto humano: rueda, arrastre táctil y tecla de desplazamiento.
 *
 * QUEDA FUERA A PROPÓSITO, y no por comodidad: `prefers-reduced-motion` y el
 * DPR no entran en ninguna rama de este código (la restitución es
 * `behavior: "instant"` siempre, así que no hay movimiento que la preferencia
 * pueda pedir retirar -- ver `restoreReadingAnchor`), y el ancho de viewport
 * solo entra como `window.innerHeight` dentro de la aritmética del ancla, que
 * tiene su propio candado en `themeScrollAnchor.test.ts`.
 */

/*
 * `requestAnimationFrame` propio con cancelación REAL -- mismo patrón y mismo
 * motivo que `useFragmentLanding.test.ts`: un `cancelAnimationFrame` de
 * mentira dejaría correr los frames que el hook cree haber cancelado. Sirve
 * además para el escenario de pestaña oculta: basta con NO vaciar la cola, que
 * es literalmente lo que hace el navegador ahí.
 */
let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;

function flushFrame(): void {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

const GUARD_EVENTS = ["wheel", "touchmove", "keydown"] as const;
const ALL_GUARD_EVENTS = [...GUARD_EVENTS].sort();

let addSpy: MockInstance;
let removeSpy: MockInstance;

function guardListenersRemoved(): string[] {
  return removeSpy.mock.calls
    .map(([type]) => String(type))
    .filter((type) =>
      GUARD_EVENTS.includes(type as (typeof GUARD_EVENTS)[number]),
    )
    .sort();
}

let scrollToMock: ReturnType<typeof vi.fn>;

/** Entradas que `performance.getEntriesByType("navigation")` devuelve en este
 *  test. Vacía = el navegador no expone la medición, el caso conservador. */
let navigationEntries: PerformanceEntry[];

function setNavigationType(type: string | null): void {
  navigationEntries =
    type === null ? [] : [{ type } as unknown as PerformanceEntry];
}

function setScrollY(value: number): void {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

/** Sección de primer nivel con su `rect` mockeado: jsdom no hace layout, así
 *  que `getBoundingClientRect()` devolvería ceros y ni el ancla se capturaría
 *  ni se restituiría (mismo patrón que `themeScrollAnchor.test.ts`). */
function mountSection(id: string, top: number, height: number): void {
  const el = document.createElement("section");
  el.id = id;
  el.getBoundingClientRect = (): DOMRect =>
    ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
}

/*
 * LA GEOMETRÍA DEL DEFECTO MEDIDO (crítica externa #19, P1 #2, sonda propia
 * sobre el build de `f3594ad`, Chrome 1440x900, tema oscuro):
 *
 *   scroll a y = 9.000 (contact) -> recarga -> y = 5.623 (journey)
 *
 * Antes de irse, el lector estaba en `y = 9.000` con Contacto empezando en el
 * píxel 8.200 del documento, es decir 800 px dentro de la sección. Tras la
 * recarga el navegador lo deja en 5.623 (el final del documento CLARO
 * horneado) y la hidratación monta la rama oscura, donde Contacto vuelve a
 * empezar en el 8.200. La restitución correcta es, por tanto, 8.200 + 800.
 */
const SAVED_SCROLL_Y = 9000;
const CONTACT_TOP_DOC = 8200;
const CONTACT_HEIGHT = 1800;
const OFFSET_IN_CONTACT = SAVED_SCROLL_Y - CONTACT_TOP_DOC;
const BROWSER_RESTORED_SCROLL_Y = 5623;

const SAVED_POSITION = {
  pathname: "/",
  scrollY: SAVED_SCROLL_Y,
  anchor: {
    id: "contact",
    topDoc: CONTACT_TOP_DOC,
    height: CONTACT_HEIGHT,
    scrollY: SAVED_SCROLL_Y,
  },
} as const;

function seedStoredPosition(position: unknown): void {
  window.sessionStorage.setItem(
    STORAGE_KEYS.readingPosition,
    typeof position === "string" ? position : JSON.stringify(position),
  );
}

function readStoredPosition(): unknown {
  const raw = window.sessionStorage.getItem(STORAGE_KEYS.readingPosition);
  return raw === null ? null : JSON.parse(raw);
}

/** La página tal y como queda tras la recarga: el navegador restituyó contra
 *  la geometría clara y la rama oscura ya montó Contacto en su sitio. */
function mountPageAfterReload(): void {
  mountSection(
    "contact",
    CONTACT_TOP_DOC - BROWSER_RESTORED_SCROLL_Y,
    CONTACT_HEIGHT,
  );
  setScrollY(BROWSER_RESTORED_SCROLL_Y);
}

function renderWithBranch(branch = "light") {
  return renderHook(({ branchKey }) => useReloadLanding(branchKey), {
    initialProps: { branchKey: branch },
  });
}

beforeEach(() => {
  frames = new Map();
  nextFrameId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  scrollToMock = vi.fn();
  vi.stubGlobal("scrollTo", scrollToMock);
  addSpy = vi.spyOn(window, "addEventListener");
  removeSpy = vi.spyOn(window, "removeEventListener");
  navigationEntries = [];
  vi.spyOn(window.performance, "getEntriesByType").mockImplementation(
    () => navigationEntries,
  );
  setScrollY(0);
  window.sessionStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.location.hash = "";
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useReloadLanding: lo que se anota antes de irse", () => {
  /*
   * CANDADO (a). Sin esta anotación no hay nada que restituir y el defecto
   * vuelve entero. Se afirma el PAYLOAD COMPLETO y no solo su presencia: la
   * restitución necesita las cuatro cifras del ancla (`topDoc` para saber
   * cuánto se movió la sección, `height` para el techo de encogimiento,
   * `scrollY` para el desplazamiento dentro de ella) y el `pathname` para no
   * aplicarse en otra ruta. Guardar "algo" no basta.
   */
  it("en pagehide guarda ancla, pathname y scrollY bajo la clave registrada", () => {
    mountSection("contact", -800, CONTACT_HEIGHT);
    setScrollY(SAVED_SCROLL_Y);

    renderWithBranch("dark");
    window.dispatchEvent(new Event("pagehide"));

    expect(readStoredPosition()).toEqual({
      pathname: "/",
      scrollY: SAVED_SCROLL_Y,
      anchor: {
        id: "contact",
        topDoc: CONTACT_TOP_DOC,
        height: CONTACT_HEIGHT,
        scrollY: SAVED_SCROLL_Y,
      },
    });
  });

  /*
   * El respaldo de `pagehide`, que no es redundancia: hay motores móviles que
   * descartan una pestaña sin llegar a emitirlo, y `visibilitychange` es el
   * único aviso que se recibe en ese camino. Se comprueba además que NO
   * escribe al volver a ser visible: escribir con la pestaña delante no
   * aporta nada y pisaría la anotación buena con la misma.
   */
  it("al ocultarse la pestaña guarda igual, y no guarda al volver a mostrarse", () => {
    mountSection("contact", -800, CONTACT_HEIGHT);
    setScrollY(SAVED_SCROLL_Y);
    renderWithBranch("dark");

    const visibility = vi.spyOn(document, "visibilityState", "get");

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(readStoredPosition()).toBeNull();

    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(readStoredPosition()).toMatchObject({ scrollY: SAVED_SCROLL_Y });
  });

  it("al desmontar no queda ningún escritor suscrito", () => {
    mountSection("contact", -800, CONTACT_HEIGHT);
    setScrollY(SAVED_SCROLL_Y);

    const { unmount } = renderWithBranch("dark");
    unmount();

    window.dispatchEvent(new Event("pagehide"));
    expect(readStoredPosition()).toBeNull();
  });
});

describe("useReloadLanding: cuándo se restituye", () => {
  /*
   * EL CANDADO DEL P1 #2 (candado b). El defecto no era "no se restituye": era
   * "se restituye contra la geometría equivocada", la del HTML horneado, que
   * bajo `output: "export"` es siempre la rama clara. Este test reproduce esa
   * secuencia exacta -- el efecto se arma con la rama clara y a mitad de la
   * espera la hidratación confirma la oscura -- y ata las dos mitades: la
   * corrección pendiente de la rama vieja queda SIN EFECTO, y la que se aplica
   * lleva el destino calculado sobre la rama que de verdad está montada.
   */
  it("tras una recarga devuelve al lector a su sección, y solo con la rama efectiva ya montada", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    const { rerender } = renderWithBranch("light");

    // Primer frame de la rama CLARA: encola el segundo, que sería el que
    // restituiría contra un maquetado que todavía no es el definitivo.
    flushFrame();
    expect(scrollToMock).not.toHaveBeenCalled();

    rerender({ branchKey: "dark" });

    // El frame heredado de la rama clara caería AQUÍ.
    flushFrame();
    expect(
      scrollToMock,
      "se restituyó con la rama vieja: el maquetado medido no era el definitivo",
    ).not.toHaveBeenCalled();

    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: CONTACT_TOP_DOC + OFFSET_IN_CONTACT,
      behavior: "instant",
    });
  });

  /*
   * El complementario del anterior: el frame de la rama vieja no solo queda
   * sin efecto, queda RETIRADO de la cola. Es la única aserción de este
   * fichero que distingue la cancelación de relojes de la redundancia del
   * guard `settled` en la limpieza del efecto.
   */
  it("al cambiar de rama, la limpieza no deja relojes huérfanos en la cola", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    const { rerender } = renderWithBranch("light");
    flushFrame();
    expect(frames.size, "la rama clara dejó su segundo frame encolado").toBe(1);

    rerender({ branchKey: "dark" });

    expect(
      frames.size,
      "quedan DOS frames en cola: el de la rama vieja sigue vivo",
    ).toBe(1);
  });

  it("una vuelta por el historial se restituye igual que una recarga", () => {
    setNavigationType("back_forward");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).toHaveBeenCalledWith({
      top: CONTACT_TOP_DOC + OFFSET_IN_CONTACT,
      behavior: "instant",
    });
  });

  /*
   * CANDADO (c), y la razón de que la condición de tipo de navegación exista.
   * Sin ella, cualquier visita nueva heredaría la posición de la anterior de
   * la misma pestaña: alguien que llega por un enlace aterrizaría a mitad de
   * la página sin haberlo pedido -- un defecto peor que el que este hook
   * arregla, porque afecta a TODAS las entradas y no solo a las recargas.
   */
  it("en una visita nueva (navigate) NO se restituye nada", () => {
    setNavigationType("navigate");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  /*
   * El caso conservador: sin entrada de navegación no se puede distinguir una
   * recarga de una visita nueva, y ante la duda manda la visita nueva.
   */
  it("sin entrada de navegación que leer, tampoco se restituye", () => {
    setNavigationType(null);
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  /*
   * CANDADO (d). El destino de la URL es lo que la persona pidió
   * explícitamente; la posición guardada, solo lo que había antes. Ese caso es
   * entero de `useFragmentLanding`, y los dos hooks tirando del mismo scroll
   * en el mismo frame darían el peor resultado posible.
   */
  it("con un fragmento en la URL se inhibe entero: ese caso es de useFragmentLanding", () => {
    setNavigationType("reload");
    window.location.hash = "#features";
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  /* CANDADO (f). La posición de la portada no dice nada sobre otra ruta. */
  it("si la posición guardada es de otra ruta, NO se restituye", () => {
    setNavigationType("reload");
    seedStoredPosition({ ...SAVED_POSITION, pathname: "/privacidad" });
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  /*
   * Entre la escritura y la lectura cabe un despliegue con otro formato, y
   * `sessionStorage` es texto que cualquiera puede editar desde las
   * herramientas del navegador. Ni una cosa ni la otra pueden tumbar la
   * página: se descarta la entrada y se deja el scroll como estaba.
   */
  it.each([
    ["no hay nada guardado", null],
    ["la entrada no es JSON", "{no-es-json"],
    [
      "al ancla le falta un número",
      '{"pathname":"/","scrollY":10,"anchor":{}}',
    ],
    ["falta el pathname", '{"scrollY":10,"anchor":null}'],
  ])("%s: no se restituye y no se lanza", (_caso, contenido) => {
    setNavigationType("reload");
    if (contenido !== null) seedStoredPosition(contenido);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });
});

describe("useReloadLanding: cómo se restituye", () => {
  /*
   * EL CONTROL CLARO, medido en la misma sonda: `y = 5.000 -> 5.016` tras
   * recargar, +16 px. Ahí el navegador ya había acertado y la corrección tiene
   * que ser un no-op OBSERVABLE -- ni una llamada a `scrollTo`. Es la mitad
   * del contrato que impide que este hook introduzca un tirón nuevo en la rama
   * que hoy no tiene ningún defecto.
   *
   * Se monta con el ancla EXACTAMENTE donde estaba: la aritmética de
   * `anchoredScrollY` devuelve entonces el `scrollY` de partida y el umbral de
   * 1 px de `restoreReadingAnchor` corta la llamada.
   */
  it("si el navegador ya había acertado, no llama a scrollTo en absoluto", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountSection("contact", CONTACT_TOP_DOC - SAVED_SCROLL_Y, CONTACT_HEIGHT);
    setScrollY(SAVED_SCROLL_Y);

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  /*
   * `behavior: "instant"` no es un detalle de estilo: `"auto"` resolvería al
   * `scroll-behavior: smooth` global de `GlobalStyles.tsx` y convertiría una
   * corrección de colocación en un viaje animado de miles de píxeles -- el
   * defecto que la Task 17 midió y retiró. Este candado fija la palabra.
   */
  it("nunca anima la restitución (jamás smooth ni auto)", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    const [options] = scrollToMock.mock.calls[0] as [ScrollToOptions];
    expect(options.behavior).toBe("instant");
  });

  /*
   * El respaldo por píxel, y la razón de que el `scrollY` se guarde además del
   * ancla: cuando no hubo ninguna sección que capturar no hay ancla a la que
   * volver, y el número guardado es lo único que queda. Es el ÚNICO camino en
   * el que este hook usa el píxel: con ancla manda siempre el ancla.
   */
  it("sin ancla guardada, restituye el scrollY anotado", () => {
    setNavigationType("reload");
    seedStoredPosition({
      pathname: "/",
      scrollY: SAVED_SCROLL_Y,
      anchor: null,
    });
    setScrollY(BROWSER_RESTORED_SCROLL_Y);

    renderWithBranch("dark");
    flushFrame();
    flushFrame();

    expect(scrollToMock).toHaveBeenCalledWith({
      top: SAVED_SCROLL_Y,
      behavior: "instant",
    });
  });

  /*
   * Lección pagada tres veces en este repo (`task/lessons.md` 2026-08-06 y
   * 2026-08-02, CLAUDE.md §5 punto 3): en una pestaña oculta no hay frames.
   * Aquí eso se reproduce literalmente -- la cola de frames NUNCA se vacía --,
   * y sin el tope el lector se quedaría 3.377 px arriba para siempre.
   */
  it("en una pestaña sin frames, el tope restituye igual", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      setNavigationType("reload");
      seedStoredPosition(SAVED_POSITION);
      mountPageAfterReload();

      renderWithBranch("dark");

      vi.advanceTimersByTime(FRAGMENT_LANDING_SETTLE_MS - 1);
      expect(scrollToMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(scrollToMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("los dos relojes corren a la vez pero la restitución se aplica UNA sola vez", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      setNavigationType("reload");
      seedStoredPosition(SAVED_POSITION);
      mountPageAfterReload();

      renderWithBranch("dark");
      flushFrame();
      flushFrame();
      expect(scrollToMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(FRAGMENT_LANDING_SETTLE_MS * 4);
      expect(scrollToMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * La restitución es de la CARGA, no del ciclo de vida. Sin este candado,
   * cada pulsación del conmutador de tema devolvería al lector a la posición
   * con la que se cargó la página -- peleando de frente con la restitución del
   * ancla de lectura de `useThemeScrollReset.ts`, que es justo lo contrario de
   * lo que el lector pidió.
   */
  it("tras restituir, un cambio de rama posterior NO vuelve a saltar", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    const { rerender } = renderWithBranch("dark");
    flushFrame();
    flushFrame();
    expect(scrollToMock).toHaveBeenCalledTimes(1);

    rerender({ branchKey: "light" });
    flushFrame();
    flushFrame();
    rerender({ branchKey: "dark" });
    flushFrame();
    flushFrame();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
  });
});

describe("useReloadLanding: la guarda del control humano", () => {
  /*
   * CANDADO (e). Arrebatarle el scroll a quien ya está leyendo por su cuenta
   * sería un defecto peor que el que este hook arregla. La guarda escucha
   * INTENCIÓN, nunca el evento `scroll`: la propia restitución del navegador
   * al recargar ya emite `scroll`, así que escucharlo abortaría siempre,
   * contra la nada.
   */
  it.each([
    ["rueda del ratón", (): Event => new Event("wheel")],
    ["arrastre táctil", (): Event => new Event("touchmove")],
    [
      "tecla de desplazamiento",
      (): Event => new KeyboardEvent("keydown", { key: "ArrowDown" }),
    ],
  ])(
    "si el lector ya tomó el control del scroll (%s), se aborta y no quedan relojes",
    (_nombre, crearEvento) => {
      setNavigationType("reload");
      seedStoredPosition(SAVED_POSITION);
      mountPageAfterReload();

      renderWithBranch("dark");
      window.dispatchEvent(crearEvento());

      expect(
        frames.size,
        "abortar tiene que cancelar el frame pendiente, no solo desactivarlo",
      ).toBe(0);

      flushFrame();
      flushFrame();

      expect(scrollToMock).not.toHaveBeenCalled();
      expect(
        guardListenersRemoved(),
        "abortar tiene que retirar los tres listeners en el acto",
      ).toEqual(ALL_GUARD_EVENTS);
    },
  );

  /*
   * El complementario, y la razón de que la lista de teclas sea cerrada:
   * escribir en el campo de correo de Contacto o tabular no desplaza nada, y
   * abortar por ello dejaría al lector tirado sin motivo.
   */
  it("una tecla que no desplaza la página no aborta la restitución", () => {
    setNavigationType("reload");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    flushFrame();
    flushFrame();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
  });

  /*
   * Sin nada que restituir no se registra ni un listener: ni guarda, ni
   * relojes. Es la mitad barata del contrato -- una visita nueva no paga nada
   * por la existencia de este hook salvo el escritor, que es lo que la deja
   * preparada para su propia recarga.
   */
  it("cuando no hay nada que restituir, no arma guarda ni relojes", () => {
    setNavigationType("navigate");
    seedStoredPosition(SAVED_POSITION);
    mountPageAfterReload();

    renderWithBranch("dark");

    const armados = addSpy.mock.calls
      .map(([type]) => String(type))
      .filter((type) =>
        GUARD_EVENTS.includes(type as (typeof GUARD_EVENTS)[number]),
      );
    expect(armados).toEqual([]);
    expect(frames.size).toBe(0);
  });
});
