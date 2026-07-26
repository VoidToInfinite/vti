import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { HeroBackdrop } from "./HeroBackdrop";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { AURA_STAGGER } from "@/components/aura/aura.layers";
import { HERO_STEP_MS, HERO_TRANSITION_MS } from "./hero.transition";

/**
 * Mock minimo de `matchMedia`. `usePointer` (Eye/Aura) y los hooks de `Sol`
 * lo llaman de verdad al montar; jsdom no lo implementa. El puntero se deja
 * SIEMPRE deshabilitado (`fineMatches: false`): estos tests verifican la
 * maquina de estados del cruce, no el parallax (ya cubierto en
 * Eye.test.tsx/Aura.test.tsx), y con el puntero deshabilitado el rAF interno
 * de `usePointer` no arranca -- el unico `requestAnimationFrame` que corre
 * durante estos tests es el que orquesta `HeroBackdrop` (el margen de un
 * frame del paso 2 de la spec S6.1).
 */
function stubMatchMedia(reducedMatches = false): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion")
        ? reducedMatches
        : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

// El unico requestAnimationFrame vivo en estos tests es el margen de un
// frame de HeroBackdrop (nextFrame, tras decode()): se dispara SINCRONO
// para que la cadena de promesas (decode -> rAF) se resuelva por microtareas
// sin depender de un reloj real ni de los timers falsos de vitest, que solo
// controlan aqui el temporizador de desmontaje (HERO_TRANSITION_MS).
function stubSyncRaf(): void {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}

function stackOf(stack: "eye" | "aura"): HTMLElement | null {
  return document.querySelector(`[data-stack="${stack}"]`);
}

function partOf(part: string): HTMLElement | null {
  return document.querySelector(`[data-part="${part}"]`);
}

// La carrera decode()+rAF de HeroBackdrop.tsx se resuelve por microtareas
// (jsdom no implementa `img.decode`, asi que cae en su fallback inmediato;
// el rAF esta stubbeado sincrono): ninguna de las dos depende del reloj. Lo
// que si hace falta es esperar bastantes vueltas de la cola de microtareas
// para que esa cadena (Promise.race -> Promise.all -> rAF -> setState)
// termine de resolverse -- `act(async () => ...)` solo aguanta la promesa
// que le pasan, asi que los ticks se dan DENTRO del propio callback.
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}

// Un clic de ThemeToggle que espera a que el cruce entero (decode + rAF +
// el estado "active"/"leaving") se asiente antes de devolver el control:
// solo el desmontaje final (a los HERO_TRANSITION_MS) depende del reloj.
async function clickToggle(): Promise<void> {
  await act(async () => {
    screen.getByRole("button").click();
    await flushMicrotasks();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  stubMatchMedia();
  // `vi.useFakeTimers()` ANTES del stub de rAF, no despues: los timers falsos
  // de vitest sustituyen `requestAnimationFrame` por su propio polyfill
  // ligado al reloj virtual (necesita `advanceTimersByTime` para disparar el
  // callback) -- si el stub sincrono se aplica ANTES, ese polyfill lo pisa
  // en silencio y la cadena decode()+rAF de HeroBackdrop.tsx se queda
  // colgada para siempre (medido: el id devuelto por rAF deja de ser el `0`
  // del stub y pasa a ser el contador interno de los timers falsos).
  vi.useFakeTimers();
  stubSyncRaf();
});

afterEach(() => {
  // Envuelto en act(): Sol trae su propio ciclo de auto-cambio de cara
  // (useSolCycle.ts, window.setInterval) que tambien queda bajo los timers
  // falsos -- drenarlo fuera de act() dispara el aviso "not wrapped in
  // act(...)" de React, aunque ningun test falle por ello.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("HeroBackdrop", () => {
  it("en tema claro monta solo Aura, ya activa (sin pasar por pending)", () => {
    renderWithProviders(<HeroBackdrop />);

    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
    expect(stackOf("eye")).not.toBeInTheDocument();
  });

  it("en tema oscuro monta solo el ojo, ya activo (sin pasar por pending)", () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(<HeroBackdrop />);

    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("al cambiar de tema los dos stacks coexisten, y el saliente desaparece tras HERO_TRANSITION_MS", async () => {
    // Arranca en oscuro: el ajuste de hidratacion (light -> dark, spec S6.1)
    // consume el primer cambio de tema sin cruce -- el toggle real de este
    // test es el SEGUNDO cambio, y ese si anima.
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    await clickToggle(); // dark -> light: toggle real

    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
    // El saliente sigue montado, marcado "leaving": los dos coexisten.
    expect(stackOf("eye")).toHaveAttribute("data-state", "leaving");

    act(() => {
      vi.advanceTimersByTime(HERO_TRANSITION_MS);
    });

    expect(stackOf("eye")).not.toBeInTheDocument();
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
  });

  it("SIN tema guardado, el PRIMER toggle del usuario ya cruza (no se lo come el ajuste de hidratacion)", async () => {
    // Es el caso mas comun de todos: visitante nuevo, localStorage vacio, el
    // proveedor arranca en "light" y NO genera ningun ajuste de hidratacion.
    // Un guard basado en "ignora el primer cambio que veas" se comeria aqui el
    // unico toggle real -- y precisamente este es el momento que la
    // coreografia existe para lucir. El discriminante correcto es
    // `changeSource` del proveedor, que sabe si el cambio fue humano.
    expect(window.localStorage.getItem("vti-theme")).toBeNull();
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    await clickToggle(); // light -> dark, primer y unico cambio de la sesion

    // Si el cruce se hubiera saltado, el ojo estaria "active" y Aura ya no
    // estaria en el arbol: los dos tienen que coexistir durante la ventana.
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).toHaveAttribute("data-state", "leaving");
  });

  it("el ajuste de hidratacion NO cruza: con tema guardado distinto del defecto, se aplica de golpe", () => {
    // La contrapartida del test anterior. `ThemeProvider` arranca en "light" y
    // se corrige a "dark" en su efecto de montaje: ese cambio se observa desde
    // HeroBackdrop igual que un toggle, pero animarlo produciria un fundido en
    // CADA carga de pagina de quien tenga el tema oscuro guardado.
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(<HeroBackdrop />);

    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("los transition-delay de las capas de Aura siguen el orden de AURA_STAGGER (leido de la constante)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );

    await clickToggle(); // dark -> light: Aura entra, queda "active"

    // "base" comparte escalon con "field" (spec §6.2.1): mismo indice, 0.
    const delayOf = (part: string): string =>
      getComputedStyle(partOf(part) as HTMLElement).transitionDelay;

    expect(delayOf("base")).toBe(delayOf("field"));

    for (const part of AURA_STAGGER) {
      const step = AURA_STAGGER.indexOf(part);
      expect(delayOf(part)).toBe(`${step * HERO_STEP_MS}ms`);
    }
  });

  it("al salir, el retardo de las capas de Aura se cuenta en REVERSO (el campo, opaco, se apaga el ultimo)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );

    await clickToggle(); // dark -> light
    act(() => {
      vi.advanceTimersByTime(HERO_TRANSITION_MS);
    }); // se asienta: solo Aura, activa

    await clickToggle(); // light -> dark: ahora Aura es la que SALE

    expect(stackOf("aura")).toHaveAttribute("data-state", "leaving");
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    const delayOf = (part: string): string =>
      getComputedStyle(partOf(part) as HTMLElement).transitionDelay;
    const total = AURA_STAGGER.length;

    for (const part of AURA_STAGGER) {
      const step = AURA_STAGGER.indexOf(part);
      expect(delayOf(part)).toBe(`${(total - 1 - step) * HERO_STEP_MS}ms`);
    }
    // El campo (escalon 0) se apaga con el MAYOR retardo -- el ultimo en irse.
    expect(delayOf("field")).toBe(`${(total - 1) * HERO_STEP_MS}ms`);
  });

  it("dos cambios de tema rapidos no dejan un stack huerfano montado", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );

    // Dos clics seguidos, sin esperar a que el primero asiente: dark -> light
    // -> dark. El primer cruce (hacia Aura) queda invalidado a medias.
    await act(async () => {
      screen.getByRole("button").click();
      screen.getByRole("button").click();
      await flushMicrotasks();
    });

    act(() => {
      vi.advanceTimersByTime(HERO_TRANSITION_MS);
    });

    // El tema final es "dark": solo el ojo debe quedar montado.
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("bajo reduced-motion el saliente se desmonta igual: por temporizador, no por transitionend", async () => {
    stubMatchMedia(true); // prefers-reduced-motion: reduce
    window.localStorage.setItem("vti-theme", "dark");
    renderWithProviders(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );

    await clickToggle(); // dark -> light

    expect(stackOf("eye")).toHaveAttribute("data-state", "leaving");

    // Ningun "transitionend" se dispara jamas bajo reduced-motion (no hay
    // transicion CSS que emitirlo) -- si el desmontaje dependiera de ese
    // evento, el stack saliente se quedaria montado para siempre.
    act(() => {
      vi.advanceTimersByTime(HERO_TRANSITION_MS);
    });

    expect(stackOf("eye")).not.toBeInTheDocument();
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
  });
});
