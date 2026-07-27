import type { ReactElement } from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HERO_CHROME_OFFSET_MS } from "@/components/sections/Hero/hero.transition";
import { STAGE_CHROME_DURATION_MS, STAGE_FALLBACK_MS } from "./stage";
import { StageProvider, useStage } from "./StageProvider";

/**
 * `StageProvider` llama a `window.matchMedia` de verdad en un efecto de
 * montaje (lee `prefers-reduced-motion`); jsdom no lo implementa. Mismo stub
 * minimo que ya usan Hero.test.tsx/hero.transition.test.tsx.
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

/** Sonda: expone la fase actual como texto y un boton que llama a
 *  `markBackdropRevealed()` -- el mismo gancho que en produccion usa
 *  `HeroBackdrop` cuando su stack pasa a "active". */
function Probe(): ReactElement {
  const { phase, markBackdropRevealed } = useStage();
  return (
    <div>
      <span data-testid="phase">{phase}</span>
      <button onClick={() => markBackdropRevealed()}>reveal</button>
    </div>
  );
}

function currentPhase(): string {
  return screen.getByTestId("phase").textContent ?? "";
}

function clickReveal(): void {
  act(() => {
    screen.getByRole("button").click();
  });
}

beforeEach(() => {
  stubMatchMedia();
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("StageProvider", () => {
  it("arranca en 'backdrop'", () => {
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );
    expect(currentPhase()).toBe("backdrop");
  });

  /*
   * Recorre las tres fases con los TIEMPOS DERIVADOS (nunca literales
   * escritos a mano): HERO_CHROME_OFFSET_MS hasta "chrome" (spec §7.1,
   * mismo offset que usan el navbar y la copia del hero) y
   * STAGE_CHROME_DURATION_MS mas hasta "settled" (motion.duration.slow,
   * ver stage.ts).
   */
  it("markBackdropRevealed lleva backdrop -> chrome -> settled en los tiempos derivados", () => {
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    clickReveal();
    expect(currentPhase()).toBe("backdrop"); // todavia no: falta el offset

    act(() => {
      vi.advanceTimersByTime(HERO_CHROME_OFFSET_MS - 1);
    });
    expect(currentPhase()).toBe("backdrop");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(currentPhase()).toBe("chrome");

    act(() => {
      vi.advanceTimersByTime(STAGE_CHROME_DURATION_MS - 1);
    });
    expect(currentPhase()).toBe("chrome");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(currentPhase()).toBe("settled");
  });

  /*
   * Idempotencia (spec §7.1): SOLO el primer aviso cuenta. Tres clics
   * seguidos, antes de que se cumpla ningun temporizador, no deben dejar mas
   * de UN temporizador programado -- si cada clic reprogramara el suyo, la
   * fase nunca alcanzaria "chrome" en el offset esperado (se reiniciaria en
   * cada clic) y quedarian temporizadores huerfanos sin cancelar.
   */
  it("markBackdropRevealed es idempotente: solo el primer aviso programa un temporizador", () => {
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    act(() => {
      screen.getByRole("button").click();
      screen.getByRole("button").click();
      screen.getByRole("button").click();
    });

    // Un unico temporizador en vuelo (el de "chrome"): la red de seguridad
    // ya se cancelo con el PRIMER clic, y los otros dos no programaron nada.
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(HERO_CHROME_OFFSET_MS);
    });
    expect(currentPhase()).toBe("chrome");

    // Un cambio de tema posterior (simulado aqui como una llamada mas, ya
    // con la fase asentada) tampoco reinicia nada.
    clickReveal();
    act(() => {
      vi.advanceTimersByTime(STAGE_CHROME_DURATION_MS);
    });
    expect(currentPhase()).toBe("settled");
  });

  /*
   * RED DE SEGURIDAD (spec §7.1, obligatoria): si nadie llama a
   * markBackdropRevealed(), la fase avanza igual -- sin ella, una pagina con
   * navbar y sin hero (hoy not-found.tsx) dejaria el navbar invisible para
   * siempre.
   */
  it("red de seguridad: si nadie avisa, la fase avanza igual en STAGE_FALLBACK_MS", () => {
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(STAGE_FALLBACK_MS - 1);
    });
    expect(currentPhase()).toBe("backdrop");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(currentPhase()).toBe("chrome");

    act(() => {
      vi.advanceTimersByTime(STAGE_CHROME_DURATION_MS);
    });
    expect(currentPhase()).toBe("settled");
  });

  it("un aviso real que llega ANTES que la red de seguridad la cancela (no hay doble avance)", () => {
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    clickReveal();
    act(() => {
      vi.advanceTimersByTime(HERO_CHROME_OFFSET_MS);
    });
    expect(currentPhase()).toBe("chrome");

    // Si la red de seguridad no se hubiera cancelado, seguiria pendiente y
    // dispararia aqui -- sin efecto observable porque revealedRef ya esta a
    // true, pero se puede comprobar que no queda ningun temporizador de la
    // red de seguridad avanzando el reloj hasta bien pasado STAGE_FALLBACK_MS
    // sin que la fase retroceda ni se reprograme nada raro.
    act(() => {
      vi.advanceTimersByTime(STAGE_FALLBACK_MS);
    });
    expect(currentPhase()).toBe("settled");
  });

  /*
   * `prefers-reduced-motion: reduce` (spec §6.5/§7.1): "settled" desde el
   * primer render, sin programar NINGUN temporizador -- ni el de "chrome",
   * ni la red de seguridad. Un escalonado con retardo y sin frames pintados
   * dejaria el navbar invisible un rato y luego aparecería de golpe.
   */
  it("bajo reduced-motion arranca en 'settled' sin ningun temporizador pendiente", () => {
    stubMatchMedia(true);
    render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    expect(currentPhase()).toBe("settled");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("limpia todos los temporizadores al desmontar, sin lanzar", () => {
    const { unmount } = render(
      <StageProvider>
        <Probe />
      </StageProvider>,
    );

    // Se desmonta con el temporizador de "chrome" todavia pendiente: el
    // caso interesante, si no se limpiara su callback intentaria actualizar
    // un componente que ya no esta en el arbol.
    clickReveal();
    expect(() => unmount()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(STAGE_FALLBACK_MS + STAGE_CHROME_DURATION_MS);
      });
    }).not.toThrow();
  });

  it("useStage fuera de StageProvider lanza", () => {
    // React registra en consola el error de render sin limite de reintentos;
    // se silencia solo para este test, que verifica precisamente que lanza.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(
      "useStage must be used within StageProvider",
    );

    consoleError.mockRestore();
  });
});
