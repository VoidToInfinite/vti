import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, act } from "@testing-library/react";
import type { RefObject } from "react";
import { useParallaxLayers } from "./useParallaxLayers";
import type { ParallaxTarget, ParallaxAmplitude } from "./useParallaxLayers";

const AMP: ParallaxAmplitude = { x: 26, y: 15 };

let ioTrigger: (isIntersecting: boolean) => void;

/**
 * Mock de `IntersectionObserver` para la rama con `sceneRef` (D3, spec
 * 2026-08-04), mismo patron que `useSceneParallax.test.tsx`: solo se
 * instala en los tests que lo necesitan (via `vi.stubGlobal`), nunca en el
 * `beforeEach` global -- los tests de la rama de siempre (sin `sceneRef`)
 * dependen de que `IntersectionObserver` NO exista, exactamente como en
 * produccion antes de esta entrega.
 */
function stubIntersectionObserver(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        ioTrigger = (v: boolean) => cb([{ isIntersecting: v }]);
      }
    },
  );
}

/**
 * Ref ESTABLE, creada una vez por test y pasada tal cual a `renderHook`.
 * Crearla inline dentro del callback de render devolveria un objeto NUEVO en
 * cada render (leccion 2026-07-31: `useStoryDeck`/`useSlideDeck`) -- aqui el
 * efecto del hook depende de `sceneRef`, asi que un ref inestable lo
 * resuscribiria por completo en cada render, un escenario que produccion no
 * tiene.
 */
function sceneOf(el: HTMLElement) {
  return { current: el };
}

/**
 * Mock minimo de `matchMedia`. `usePointer` (consumido por el hook) llama a
 * `window.matchMedia` de verdad al montar; jsdom no lo implementa, asi que
 * sin este stub cualquier render lanza "matchMedia is not a function".
 * `fineMatches` controla si el puntero queda habilitado (arranca su propio
 * rAF interno); `reducedMatches` siempre es `false` salvo que se pida.
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

/** Envuelve un elemento suelto en el `RefObject` que pide `ParallaxTarget`. */
function targetOf(el: HTMLElement, depth: number): ParallaxTarget {
  return { ref: { current: el }, depth };
}

/** Mueve el puntero a la esquina inferior derecha => x, y -> +1 normalizado. */
function moveToCorner(): void {
  window.dispatchEvent(
    new MouseEvent("pointermove", {
      clientX: window.innerWidth,
      clientY: window.innerHeight,
    }),
  );
}

beforeEach(() => {
  // Por defecto sin puntero fino: la mayoria de estos tests solo verifican
  // que el efecto no arranca cuando no debe.
  stubMatchMedia(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("useParallaxLayers", () => {
  it("no arranca ningun rAF cuando el puntero esta deshabilitado", () => {
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = [targetOf(document.createElement("div"), 0.5)];
    renderHook(() => useParallaxLayers(targets, AMP));

    expect(raf).not.toHaveBeenCalled();
  });

  it("arranca un rAF al montar (con el puntero habilitado) y lo cancela al desmontar", () => {
    stubMatchMedia(true); // puntero fino habilitado
    const raf = vi.fn().mockReturnValue(7);
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);

    const targets = [targetOf(document.createElement("div"), 0.5)];
    const { unmount } = renderHook(() => useParallaxLayers(targets, AMP));
    expect(raf).toHaveBeenCalled();
    const callsAfterMount = raf.mock.calls.length;

    unmount();
    // Al desmontar se cancelan los dos rAF en curso: el del lerp de
    // `usePointer` y el del propio parallax.
    expect(caf).toHaveBeenCalledTimes(callsAfterMount);
  });

  it("usa un unico rAF de parallax por frame, sin importar cuantos objetivos reciban transform", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = Array.from({ length: 4 }, () =>
      targetOf(document.createElement("div"), 0.5),
    );
    renderHook(() => useParallaxLayers(targets, AMP));

    // Al montar: un rAF del lerp de `usePointer` + un rAF del parallax, sin
    // importar que haya 4 objetivos -- NUNCA uno por objetivo.
    expect(pending.length).toBe(2);

    const batch = pending;
    pending = [];
    for (const cb of batch) cb(16);
    // Cada tick vuelve a pedir exactamente un frame por cada uno de los dos
    // bucles (usePointer y el parallax), no 4 + 4.
    expect(pending.length).toBe(2);
  });

  it("escribe transform en los objetivos con profundidad > 0 y deja quieto el de profundidad 0", () => {
    stubMatchMedia(true);
    // rAF controlado a mano: se guardan los callbacks pendientes y se
    // ejecutan en tandas, la unica forma de avanzar el lerp de `usePointer`
    // (y con el, el tick del parallax) de manera determinista en jsdom.
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const background = document.createElement("div");
    const moving = document.createElement("div");
    const targets = [targetOf(background, 0), targetOf(moving, 0.5)];

    renderHook(() => useParallaxLayers(targets, AMP));
    moveToCorner();
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    expect(background.style.transform).toBe("");
    expect(moving.style.transform).toMatch(/^translate3d\(/);
  });

  it("el desplazamiento escrito escala con la profundidad: 0.85 se mueve mas que 0.25", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const shallow = document.createElement("div");
    const deep = document.createElement("div");
    const targets = [targetOf(shallow, 0.25), targetOf(deep, 0.85)];

    renderHook(() => useParallaxLayers(targets, AMP));
    moveToCorner();
    for (let frame = 0; frame < 40; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    const xOf = (el: HTMLElement): number =>
      Number(/translate3d\((-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? "0");

    expect(xOf(shallow)).toBeGreaterThan(0);
    expect(xOf(deep)).toBeGreaterThan(xOf(shallow));
  });

  it("no provoca ningun re-render del componente consumidor durante el parallax (cero setState por frame)", () => {
    stubMatchMedia(true);
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let renders = 0;
    const targets = [targetOf(document.createElement("div"), 0.5)];

    function Consumer(): null {
      renders += 1;
      useParallaxLayers(targets, AMP);
      return null;
    }

    render(<Consumer />);
    const rendersAfterMount = renders;

    moveToCorner();
    act(() => {
      for (let frame = 0; frame < 40; frame += 1) {
        const batch = pending;
        pending = [];
        for (const cb of batch) cb(frame * 16);
      }
    });

    expect(renders).toBe(rendersAfterMount);
  });

  it("sin sceneRef, no se instancia ningun IntersectionObserver: el comportamiento es el de siempre", () => {
    // Retrocompatibilidad explicita (D3, spec 2026-08-04): Eye.tsx y
    // Aura.tsx llaman `useParallaxLayers(targets, amplitude)` sin tercer
    // argumento, y deben seguir arrancando el rAF desde el montaje, sin
    // ninguna guarda de visibilidad -- bit a bit el comportamiento previo.
    stubMatchMedia(true);
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = [targetOf(document.createElement("div"), 0.5)];
    renderHook(() => useParallaxLayers(targets, AMP));

    expect(ioSpy).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalled();
  });

  it("con sceneRef pero sin nodo montado (.current null), cae en la rama de siempre", () => {
    // Segunda mitad de la retrocompatibilidad: un consumidor puede pasar la
    // ref antes de que el nodo se monte (o simplemente no montarlo nunca en
    // una rama condicional). Sin nodo, no hay nada que observar, asi que el
    // hook no debe intentarlo.
    stubMatchMedia(true);
    const ioSpy = vi.fn();
    vi.stubGlobal("IntersectionObserver", ioSpy);
    const raf = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const targets = [targetOf(document.createElement("div"), 0.5)];
    const sceneRef: RefObject<HTMLElement | null> = { current: null };
    renderHook(() => useParallaxLayers(targets, AMP, sceneRef));

    expect(ioSpy).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalled();
  });

  it("con sceneRef, el rAF del parallax no arranca hasta que la escena intersecta (el de usePointer sigue vivo aparte)", () => {
    // Guarda de visibilidad nueva (D3, spec 2026-08-04; leccion
    // 2026-07-31: "un rAF sin guarda de visibilidad se multiplica por cada
    // consumidor del hook" -- aqui Eye Y Aura, cada uno con su propio bucle
    // si algun dia pasan `sceneRef`). `pending.length` distingue el rAF de
    // `usePointer` (siempre vivo mientras `enabled`) del rAF propio del
    // parallax (solo cuando la escena esta en pantalla).
    stubMatchMedia(true);
    stubIntersectionObserver();
    const pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const scene = document.createElement("div");
    const targets = [targetOf(document.createElement("div"), 0.5)];
    const sceneRef = sceneOf(scene);
    renderHook(() => useParallaxLayers(targets, AMP, sceneRef));

    // Solo el rAF interno de `usePointer` esta en marcha.
    expect(pending.length).toBe(1);

    act(() => ioTrigger(true));
    // Ahora tambien el del parallax.
    expect(pending.length).toBe(2);
  });

  it("con sceneRef, al salir de pantalla entra en release: sigue vivo hasta asentar, entonces escribe translate3d(0,0,0) y cancela el rAF", () => {
    // Puntos 1 y 2 del encargo (D3): fuera del viewport ya no se congela el
    // transform -- se libera con el mismo lerp que suaviza el seguimiento
    // normal del cursor, y el bucle se para varios frames DESPUES de perder
    // la interseccion.
    stubMatchMedia(true);
    stubIntersectionObserver();
    let pending: FrameRequestCallback[] = [];
    const caf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", caf);

    const layer = document.createElement("div");
    const targets = [targetOf(layer, 0.5)];
    const scene = document.createElement("div");
    const sceneRef = sceneOf(scene);
    renderHook(() => useParallaxLayers(targets, AMP, sceneRef));

    act(() => ioTrigger(true));
    moveToCorner();
    for (let frame = 0; frame < 30; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }
    expect(layer.style.transform).toMatch(/^translate3d\(/);
    expect(layer.style.transform).not.toBe("translate3d(0.00px, 0.00px, 0)");

    act(() => ioTrigger(false));
    // Justo tras salir, el bucle sigue vivo: nada se cancela todavia.
    expect(caf).not.toHaveBeenCalled();

    // Frames de margen para que el mayor residuo baje de REST_EPSILON. El
    // rAF de `usePointer` sigue vivo y se reprograma solo (no forma parte
    // de lo que se mide aqui), asi que el lote nunca llega a vaciarse antes
    // de que el parallax asiente.
    for (let frame = 0; frame < 150; frame += 1) {
      const batch = pending;
      pending = [];
      if (batch.length === 0) break;
      for (const cb of batch) cb((30 + frame) * 16);
    }

    expect(caf).toHaveBeenCalled();
    // El reposo exacto: sin escala (este hook nunca escribe `scale()`), a
    // diferencia del reposo de `useSceneParallax`.
    expect(layer.style.transform).toBe("translate3d(0.00px, 0.00px, 0)");
  });

  it("con sceneRef, volver a intersectar antes de asentar no reinicia appliedX/Y: el siguiente frame sigue el trayecto, no salta", () => {
    // Punto 3 del encargo: si `appliedX`/`appliedY` se reiniciaran a 0 al
    // cancelar el release, el primer frame tras reentrar arrancaria un lerp
    // COMPLETO hacia la posicion real del puntero en vez del paso normal
    // (~8% del hueco) desde donde ya iba -- un salto grande y facil de
    // distinguir de un paso de lerp corriente.
    stubMatchMedia(true);
    stubIntersectionObserver();
    let pending: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const layer = document.createElement("div");
    const targets = [targetOf(layer, 0.5)];
    const scene = document.createElement("div");
    const sceneRef = sceneOf(scene);
    renderHook(() => useParallaxLayers(targets, AMP, sceneRef));

    act(() => ioTrigger(true));
    moveToCorner();
    for (let frame = 0; frame < 30; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb(frame * 16);
    }

    act(() => ioTrigger(false));
    // 10 frames de release: suficiente para que decaiga sin llegar a
    // asentar (asentar tarda unas cuantas decenas de frames mas).
    for (let frame = 0; frame < 10; frame += 1) {
      const batch = pending;
      pending = [];
      for (const cb of batch) cb((30 + frame) * 16);
    }
    const midMatch = /translate3d\((-?[\d.]+)px/.exec(layer.style.transform);
    expect(midMatch).not.toBeNull();
    const xMid = parseFloat(midMatch![1]);
    expect(Math.abs(xMid)).toBeGreaterThan(0.5); // base no trivial

    act(() => ioTrigger(true));
    const batch = pending;
    pending = [];
    for (const cb of batch) cb(41 * 16);
    const afterMatch = /translate3d\((-?[\d.]+)px/.exec(layer.style.transform);
    expect(afterMatch).not.toBeNull();
    const xAfter = parseFloat(afterMatch![1]);

    // Paso normal de lerp (~8% del hueco): muy por debajo de la mitad del
    // valor de partida. Un reinicio a 0 habria dejado `xAfter` cerca de un
    // 8% de la posicion real del puntero DESDE CERO, una caida mucho mayor.
    expect(Math.abs(xAfter - xMid)).toBeLessThan(Math.abs(xMid) * 0.5);
  });
});
