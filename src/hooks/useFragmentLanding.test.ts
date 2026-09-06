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
import { THEME_ATTRIBUTE } from "@/theme/resolveTheme";
import {
  FRAGMENT_LANDING_SETTLE_MS,
  useFragmentLanding,
} from "./useFragmentLanding";

/*
 * LO QUE ESTE FICHERO PUEDE PROBAR Y LO QUE NO, escrito antes que los tests
 * para que nadie lea de más en un verde.
 *
 * jsdom no maqueta, no pinta y no implementa la navegación por fragmento
 * (CLAUDE.md §5, punto 2). Aquí NO se puede observar "el lector aterrizó en el
 * sitio correcto": eso es una propiedad de píxeles y solo un navegador real la
 * responde (regla 44 de `RULES.md`; la verificación en navegador de esta ola la
 * hace el orquestador tras integrar). Lo que sí se ata aquí es el MECANISMO
 * completo, que es exactamente donde vivía el defecto: a QUIÉN se le pide el
 * desplazamiento, CON QUÉ opciones, CUÁNDO (después de que la rama efectiva
 * haya montado, nunca antes), CUÁNTAS veces (una) y en qué casos NO se pide.
 */

/*
 * `requestAnimationFrame` propio con cancelación REAL -- mismo patrón y mismo
 * motivo que `useThemeScrollReset.test.tsx`: un `cancelAnimationFrame` de
 * mentira dejaría correr los frames que el hook cree haber cancelado, y el
 * test del cambio de rama dejaría de probar nada. Sirve además para el
 * escenario de pestaña oculta: basta con NO vaciar la cola, que es
 * literalmente lo que hace el navegador ahí.
 */
let frames: Map<number, FrameRequestCallback>;
let nextFrameId: number;

function flushFrame(): void {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

const GUARD_EVENTS = ["wheel", "touchmove", "keydown"] as const;

/* `MockInstance` sin argumento de tipo (su valor por defecto es `Procedure`) y
 * NO `ReturnType<typeof vi.spyOn<Window, "addEventListener">>`: la restricción
 * de `spyOn` solo admite claves de PROPIEDAD del objeto, y los dos métodos de
 * eventos no la satisfacen. Lo único que este fichero lee del espía es
 * `mock.calls`, que `Procedure` ya expone. */
let addSpy: MockInstance;
let removeSpy: MockInstance;
let setTimeoutSpy: MockInstance;

/** Los eventos de la guarda que se han REGISTRADO, ordenados para comparar. */
function guardListenersAdded(): string[] {
  return addSpy.mock.calls
    .map(([type]) => String(type))
    .filter((type) =>
      GUARD_EVENTS.includes(type as (typeof GUARD_EVENTS)[number]),
    )
    .sort();
}

/** Los eventos de la guarda que se han RETIRADO, ordenados para comparar. */
function guardListenersRemoved(): string[] {
  return removeSpy.mock.calls
    .map(([type]) => String(type))
    .filter((type) =>
      GUARD_EVENTS.includes(type as (typeof GUARD_EVENTS)[number]),
    )
    .sort();
}

const ALL_GUARD_EVENTS = [...GUARD_EVENTS].sort();

/**
 * Sección de destino con su propio espía de `scrollIntoView`. Se pincha en la
 * INSTANCIA y no en `Element.prototype` a propósito: así el espía identifica
 * también a QUÉ elemento se le pidió el desplazamiento, que es justo la mitad
 * del contrato que un `id` inexistente tiene que dejar sin llamar.
 */
function mountSection(id: string): ReturnType<typeof vi.fn> {
  const section = document.createElement("section");
  section.id = id;
  const spy = vi.fn();
  section.scrollIntoView = spy;
  document.body.appendChild(section);
  return spy;
}

function setLoadHash(value: string): void {
  window.location.hash = value;
}

/**
 * La rama EFECTIVA tal y como la deja el script anti-flash del `<head>` antes
 * de que React hidrate (`buildThemeBootstrapScript`). `null` reproduce el caso
 * en que ese script no llegó a correr o lanzó: sin atributo que leer.
 *
 * El nombre del atributo se importa de `resolveTheme.ts` y no se escribe a
 * mano: es el mismo dueño único que lee el código bajo prueba, así que un
 * renombrado no puede dejar estos candados verdes contra un atributo que ya no
 * existe.
 */
function setResolvedTheme(value: string | null): void {
  if (value === null) document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  else document.documentElement.setAttribute(THEME_ATTRIBUTE, value);
}

/**
 * Cuántas veces se ha ARMADO la corrección. Cada armado deja exactamente un
 * `setTimeout` con el tope de espera, así que contarlos cuenta armados -- es
 * el mismo instrumento con el que la sonda de navegador del 2026-09-06
 * distinguió la página que armó una vez (la que se corrigió con la geometría
 * clara) de la que armó dos (la que esperó a la rama efectiva).
 */
function armados(): number {
  return setTimeoutSpy.mock.calls.filter(
    ([, delay]) => delay === FRAGMENT_LANDING_SETTLE_MS,
  ).length;
}

function renderWithBranch(branch = "light") {
  return renderHook(({ branchKey }) => useFragmentLanding(branchKey), {
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
  addSpy = vi.spyOn(window, "addEventListener");
  removeSpy = vi.spyOn(window, "removeEventListener");
  setTimeoutSpy = vi.spyOn(window, "setTimeout");
});

afterEach(() => {
  document.body.innerHTML = "";
  setLoadHash("");
  /* El atributo vive en `<html>`, que jsdom NO recrea entre tests del mismo
     fichero: sin esta línea la rama efectiva de un test se filtraría al
     siguiente. */
  setResolvedTheme(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useFragmentLanding", () => {
  /*
   * EL CANDADO DEL HALLAZGO A (crítica externa #11). El defecto no era "no se
   * corrige", era "se corrige contra la geometría equivocada": bajo
   * `output: "export"` el primer render es siempre la rama clara, y la oscura
   * llega un render después. Este test reproduce esa secuencia exacta -- el
   * efecto se arma con `branchKey: "light"`, y a mitad de la espera la rama
   * cambia -- y ata las dos mitades del contrato: la corrección pendiente de
   * la rama vieja queda SIN EFECTO, y la que se aplica es la de la rama nueva.
   *
   * Desde el 2026-09-06 el montaje declara además la rama EFECTIVA en `<html>`
   * (`dark`), que es lo que el script anti-flash deja escrito en esa carga:
   * así la secuencia que se ejercita es la real y no una en la que el atributo
   * falta. Con la puerta puesta, la pasada clara ni siquiera arma -- lo que
   * este test sigue atando es la propiedad de siempre (no se corrige con la
   * geometría vieja); que además no arme nada lo ata el candado de la puerta,
   * más abajo.
   */
  it("descarta la corrección de la rama vieja y corrige con la rama efectiva ya montada", () => {
    setResolvedTheme("dark");
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    const { rerender } = renderWithBranch("light");

    // Primer frame de la rama CLARA: encola el segundo, que sería el que
    // corregiría contra el maquetado que todavía no es el definitivo.
    flushFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();

    // Llega la hidratación: React limpia el efecto (cancela ese segundo frame)
    // y lo vuelve a arrancar con la rama oscura montada.
    rerender({ branchKey: "dark" });

    // El frame heredado de la rama clara caería AQUÍ. La limpieza del efecto
    // lo desactiva por DOS vías redundantes (lo cancela, y además cierra su
    // clausura): este assert ata la propiedad -- no se corrige con la rama
    // vieja --, no cuál de las dos la sostiene. Ver el comentario de la
    // limpieza en `useFragmentLanding.ts` y el test de relojes huérfanos de
    // más abajo, que sí distingue la cancelación.
    flushFrame();
    expect(
      scrollIntoView,
      "se corrigió con la rama vieja: el maquetado medido no era el definitivo",
    ).not.toHaveBeenCalled();

    flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
  });

  /*
   * El complementario del anterior, y la única aserción del fichero que
   * distingue `cancelClocks()` de la redundancia de `settled` en la limpieza
   * del efecto: el frame de la rama vieja no solo queda sin efecto, queda
   * RETIRADO de la cola. Sin él nadie se enteraría de que la limpieza deja
   * relojes huérfanos corriendo tras un desmontaje -- verificado retirando
   * `cancelClocks()`, con el que la suite entera seguía en verde salvo este
   * test.
   *
   * SE MONTA SIN `data-theme` A PROPÓSITO, y no por descuido: con la rama
   * efectiva declarada, la puerta impide que una rama que no es la efectiva
   * arme relojes, así que el escenario de "la rama vieja dejó un frame
   * encolado" solo existe en el camino de respaldo -- el navegador en el que
   * el script de arranque no llegó a correr y todas las ramas arman. Ahí es
   * donde esta propiedad se puede seguir observando, y ahí sigue haciendo
   * falta.
   */
  it("al cambiar de rama, la limpieza no deja relojes huérfanos en la cola", () => {
    setResolvedTheme(null);
    setLoadHash("#features");
    mountSection("features");

    const { rerender } = renderWithBranch("light");
    flushFrame();
    expect(frames.size, "la rama clara dejó su segundo frame encolado").toBe(1);

    rerender({ branchKey: "dark" });

    expect(
      frames.size,
      "quedan DOS frames en cola: el de la rama vieja sigue vivo",
    ).toBe(1);
  });

  /*
   * `behavior: "instant"` no es un detalle de estilo: `"auto"` resolvería al
   * `scroll-behavior: smooth` global de `GlobalStyles.tsx` y convertiría una
   * corrección de colocación en un viaje animado de hasta 10.000 px -- el
   * defecto que la Task 17 midió y retiró. `block: "start"` es lo que deja que
   * el `scroll-margin-top` global entregue el desfase de cabecera sin que este
   * hook reimplemente esa aritmética.
   */
  it("en una carga que ya venía con la rama definitiva, corrige igual y con las mismas opciones", () => {
    setLoadHash("#contact");
    const scrollIntoView = mountSection("contact");

    renderWithBranch("light");
    flushFrame();
    flushFrame();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
  });

  it("sin fragmento en la URL no arma nada: ni guarda de scroll ni corrección", () => {
    setLoadHash("");
    const scrollIntoView = mountSection("contact");

    renderWithBranch("light");
    flushFrame();
    flushFrame();

    expect(guardListenersAdded()).toEqual([]);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("con un fragmento que no existe en el documento no se le pide el scroll a nadie", () => {
    setLoadHash("#no-existe");
    const scrollIntoView = mountSection("contact");

    renderWithBranch("light");
    flushFrame();
    flushFrame();

    expect(scrollIntoView).not.toHaveBeenCalled();
    // Y la guarda se retira igual: un fragmento roto no puede dejar listeners
    // colgados para siempre.
    expect(guardListenersRemoved()).toEqual(ALL_GUARD_EVENTS);
  });

  /*
   * La guarda del control humano. Escucha INTENCIÓN, nunca el evento `scroll`:
   * el salto al fragmento que hace el propio navegador al cargar ya emite
   * `scroll`, así que escucharlo abortaría siempre, contra la nada.
   */
  it.each([
    ["rueda del ratón", (): Event => new Event("wheel")],
    ["arrastre táctil", (): Event => new Event("touchmove")],
    [
      "tecla de desplazamiento",
      (): Event => new KeyboardEvent("keydown", { key: "ArrowDown" }),
    ],
  ])(
    "si el lector ya tomó el control del scroll (%s) antes de la corrección, se aborta",
    (_nombre, crearEvento) => {
      setLoadHash("#features");
      const scrollIntoView = mountSection("features");

      renderWithBranch("light");
      window.dispatchEvent(crearEvento());

      flushFrame();
      flushFrame();

      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(
        guardListenersRemoved(),
        "abortar tiene que retirar los tres listeners en el acto",
      ).toEqual(ALL_GUARD_EVENTS);
    },
  );

  /*
   * El complementario del anterior, y la razón de que `SCROLL_KEYS` sea una
   * lista cerrada: escribir en el campo de correo de Contacto o tabular no
   * desplaza nada, y abortar por ello dejaría al lector tirado sin motivo.
   */
  it("una tecla que no desplaza la página no aborta la corrección", () => {
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    renderWithBranch("light");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    flushFrame();
    flushFrame();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("tras corregir, los tres listeners de la guarda quedan retirados", () => {
    setLoadHash("#features");
    mountSection("features");

    renderWithBranch("light");
    expect(guardListenersAdded()).toEqual(ALL_GUARD_EVENTS);
    expect(guardListenersRemoved()).toEqual([]);

    flushFrame();
    flushFrame();

    expect(guardListenersRemoved()).toEqual(ALL_GUARD_EVENTS);
  });

  /*
   * Lección pagada tres veces en este repo (`task/lessons.md` 2026-08-06 y
   * 2026-08-02, CLAUDE.md §5 punto 3): en una pestaña oculta no hay frames.
   * Aquí eso se reproduce literalmente -- la cola de frames NUNCA se vacía --,
   * y sin el tope el lector se quedaría a 10.000 px de su destino para
   * siempre.
   */
  it("en una pestaña sin frames, el tope de FRAGMENT_LANDING_SETTLE_MS corrige igual", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      setLoadHash("#features");
      const scrollIntoView = mountSection("features");

      renderWithBranch("light");

      vi.advanceTimersByTime(FRAGMENT_LANDING_SETTLE_MS - 1);
      expect(scrollIntoView).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "instant",
        block: "start",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("los dos relojes corren a la vez pero la corrección se aplica UNA sola vez", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      setLoadHash("#features");
      const scrollIntoView = mountSection("features");

      renderWithBranch("light");
      flushFrame();
      flushFrame();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      // El tope llega después y se encuentra la puerta cerrada (no se cancela
      // a propósito: ver el docblock de `applyOnce`).
      vi.advanceTimersByTime(FRAGMENT_LANDING_SETTLE_MS * 4);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * La corrección es de la CARGA, no del ciclo de vida. Sin este candado, cada
   * pulsación del conmutador de tema volvería a saltar al fragmento con el que
   * se cargó la página -- peleando de frente con la restitución del ancla de
   * lectura de `useThemeScrollReset.ts`, que es justo lo contrario de lo que
   * el lector pidió.
   */
  it("tras corregir, un cambio de rama posterior NO vuelve a saltar al fragmento", () => {
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    const { rerender } = renderWithBranch("light");
    flushFrame();
    flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    rerender({ branchKey: "dark" });
    flushFrame();
    flushFrame();
    rerender({ branchKey: "light" });
    flushFrame();
    flushFrame();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  /*
   * El fragmento se captura UNA vez, en la primera ejecución del efecto. De un
   * `#hash` posterior (un clic en el navbar) ya se ocupa el navegador con la
   * geometría real: reaccionar aquí sería duplicar ese trabajo con datos
   * viejos.
   */
  it("no reacciona a un cambio de hash posterior a la carga", () => {
    setLoadHash("");
    const scrollIntoView = mountSection("features");

    const { rerender } = renderWithBranch("light");
    setLoadHash("#features");
    rerender({ branchKey: "dark" });

    flushFrame();
    flushFrame();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

/*
 * LA PUERTA DE LA RAMA EFECTIVA (2026-09-06).
 *
 * QUÉ DEFECTO ATRAPA: hasta esta fecha el hook armaba su corrección en CADA
 * pasada del efecto, la del HTML horneado incluida, y confiaba en que el
 * commit de la rama oscura limpiara esa corrección antes de que sus relojes
 * vencieran. Medido sobre el build servido de `8213019` con la máquina ocupada
 * (cinco páginas recargando a la vez), el hermano de este hook perdió esa
 * carrera en 9 de 15 recargas: la corrección se aplicaba contra el documento
 * claro (`contactTopDoc` 4.237, alto 6.258) en vez del oscuro (9.174 / 11.008).
 * Este hook armó igual con la geometría clara en las 15 cargas medidas con
 * fragmento; que ninguna llegara a aplicarla fue suerte de la carrera, no una
 * propiedad del código.
 *
 * MATRIZ DE ESTE CANDADO (regla 2 de la lección del 2026-09-06):
 *
 * - Rama efectiva declarada en `<html>`: `dark`, `light` y AUSENTE (el
 *   navegador donde el script anti-flash no llegó a correr).
 * - Rama montada (`branchKey`): coincidente y no coincidente con la anterior.
 * - Lo que se observa al no armar: las TRES vías por las que la corrección
 *   podría escaparse -- los frames encolados, el `setTimeout` del tope y los
 *   tres listeners de la guarda --, y además que ningún reloj posterior la
 *   aplique.
 *
 * QUEDA FUERA: los nombres de rama no significan nada para el hook (recibe un
 * `string` opaco); se usan `light`/`dark` porque son los que el atributo puede
 * traer en el sitio real.
 */
describe("useFragmentLanding: la puerta de la rama efectiva", () => {
  /*
   * CANDADO (a). VERIFICADO CON BUG INYECTADO el 2026-09-06: retirando la
   * línea `if (!isMountedBranchEffective(branchKey)) return;` de
   * `useFragmentLanding.ts`, este test cae con la línea LITERAL
   *
   *   AssertionError: la rama del HTML horneado armó el tope de espera: la
   *   corrección puede aplicarse contra la geometría que no es: expected 1 to
   *   be +0 // Object.is equality
   *
   * y con él el candado (b), `AssertionError: la rama efectiva tiene que
   * armar, y una sola vez: expected 2 to be 1 // Object.is equality` --
   * `Tests 2 failed | 16 passed (18)`.
   */
  it("con la rama efectiva ya resuelta en <html>, la rama del HTML horneado no arma nada", () => {
    setResolvedTheme("dark");
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    renderWithBranch("light");

    expect(
      armados(),
      "la rama del HTML horneado armó el tope de espera: la corrección puede aplicarse contra la geometría que no es",
    ).toBe(0);
    expect(
      frames.size,
      "la rama del HTML horneado encoló frames: son los que ganaron la carrera en las 9 páginas medidas",
    ).toBe(0);
    expect(
      guardListenersAdded(),
      "sin corrección armada no hay nada que proteger: la guarda no se registra",
    ).toEqual([]);

    flushFrame();
    flushFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  /*
   * CANDADO (b). La otra mitad: la puerta no es un apagado, es una espera. En
   * cuanto la hidratación confirma la rama, se arma UNA vez y se corrige UNA
   * vez -- con la geometría que de verdad está montada.
   */
  it("al confirmarse la rama efectiva, arma y corrige exactamente una vez", () => {
    setResolvedTheme("dark");
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    const { rerender } = renderWithBranch("light");
    rerender({ branchKey: "dark" });

    expect(armados(), "la rama efectiva tiene que armar, y una sola vez").toBe(
      1,
    );
    expect(guardListenersAdded()).toEqual(ALL_GUARD_EVENTS);

    flushFrame();
    flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
  });

  /*
   * CANDADO (c). El visitante claro es la mayoría y no puede pagar ni un frame
   * de retraso por esta puerta: su rama montada ya es la efectiva en la
   * PRIMERA pasada del efecto, así que arma ahí mismo.
   */
  it("con la rama efectiva clara y la rama clara montada, arma en la primera pasada", () => {
    setResolvedTheme("light");
    setLoadHash("#contact");
    const scrollIntoView = mountSection("contact");

    renderWithBranch("light");

    expect(armados()).toBe(1);
    flushFrame();
    flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  /*
   * CANDADO (d). El respaldo, y la razón de que la puerta compare contra
   * `null` y no exija coincidencia: sin atributo nadie ha resuelto ningún
   * tema (el script de arranque no corrió, o lanzó con el almacenamiento
   * bloqueado en modo privado estricto), la rama montada es la única que va a
   * haber, y bloquear ahí dejaría al lector sin corrección para siempre.
   */
  it("sin atributo de tema en <html>, la rama montada es la única posible y se arma", () => {
    setResolvedTheme(null);
    setLoadHash("#features");
    const scrollIntoView = mountSection("features");

    renderWithBranch("dark");

    expect(armados()).toBe(1);
    flushFrame();
    flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
