import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  type RenderResult,
} from "@/test/test-utils";
import { HeroBackdrop } from "./HeroBackdrop";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { AURA_STAGGER } from "@/components/scenes/aura/aura.layers";
import { EYE_STAGGER } from "@/components/scenes/eye/eye.layers";
import {
  HERO_BACKDROP_HOLD_MS,
  HERO_HANDOFF_MS,
  HERO_STEP_MS,
} from "./hero.transition";

/**
 * Mock minimo de `matchMedia`. `usePointer` (Eye/Aura) y los hooks de `Sol`
 * lo llaman de verdad al montar; jsdom no lo implementa. El puntero se deja
 * SIEMPRE deshabilitado (`fineMatches: false`): estos tests verifican la
 * maquina de estados del fondo (carga + relevo secuencial), no el parallax
 * (ya cubierto en Eye.test.tsx/Aura.test.tsx), y con el puntero deshabilitado
 * el rAF interno de `usePointer` no arranca -- el unico `requestAnimationFrame`
 * que corre durante estos tests es el que orquesta `HeroBackdrop` (el margen
 * de un frame tras decode(), `nextFrame()`).
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
// sin depender de un reloj real ni de los timers falsos de vitest, que aqui
// solo controlan los temporizadores del relevo secuencial
// (HERO_BACKDROP_HOLD_MS, HERO_HANDOFF_MS).
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

/*
 * Retardo de escalonado de UNA capa del ojo, extraido de `animationDelay`
 * (longhand, jsdom la devuelve tal como se escribio -- lesson 2026-07-25).
 * Las capas CON glow (iris, pupil) declaran DOS animaciones en la misma
 * lista (`<glow>, heroEyeIn/Out`, eyeStagger en eye.parts.tsx), asi que su
 * `animationDelay` computado es una lista de DOS valores ("0s, 440ms"): el
 * escalonado de carga/cruce va SIEMPRE el ultimo de la lista (spec S6.1,
 * "gana la ULTIMA de animation-name"), asi que su retardo tambien es
 * SIEMPRE el ultimo componente de `animationDelay`. Las capas SIN glow
 * (mascot, background, eyelid, nebula, socket, scrim) solo declaran esa
 * unica animacion, asi que su lista tiene un solo valor -- tomar "el
 * ultimo" generaliza a los dos casos sin necesitar una rama aparte por
 * capa.
 */
function eyeDelayOf(part: string): string {
  const raw = getComputedStyle(partOf(part) as HTMLElement).animationDelay;
  const values = raw.split(",").map((value) => value.trim());
  return values[values.length - 1] ?? "";
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

// Un clic de ThemeToggle que espera a que decode()+rAF del stack entrante se
// resuelvan (el efecto de la carrera de HeroBackdrop.tsx) antes de devolver
// el control. Con el relevo secuencial (spec S7.3) esto YA NO deja el
// entrante en "active": decode() es solo UNA de las dos condiciones del
// relevo (la otra es el reloj, HERO_HANDOFF_MS) -- el entrante queda en
// "pending" hasta que el temporizador del reloj tambien llegue. Los tests
// que necesitan ver el relevo completo avanzan el reloj falso DESPUES de
// este helper.
async function clickToggle(): Promise<void> {
  await act(async () => {
    screen.getByRole("button").click();
    await flushMicrotasks();
  });
}

/*
 * `HeroBackdrop` consumia `useStage()` hasta la Task 27 (2026-08-11):
 * avisaba a `markBackdropRevealed()` cuando la carga revelaba el fondo. La
 * maquina de fases del stage (`useStage()`/`StageProvider`) se retiro
 * entera al quedarse sin ningun consumidor real -- ver el docblock de
 * `finishLoad` en `HeroBackdrop.tsx`. Ya no hace falta ningun envoltorio de
 * proveedor propio de este archivo: `renderWithProviders` (test-utils.tsx)
 * basta tal cual.
 */
function renderHeroBackdrop(children: ReactNode): RenderResult {
  return renderWithProviders(<>{children}</>);
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
  it("carga (tema claro por defecto): el stack arranca en pending y pasa a active tras la carrera", async () => {
    renderHeroBackdrop(<HeroBackdrop />);

    // Recien montado: el stack del tema por defecto (claro -> Aura) arranca
    // en "pending" -- la carga YA NO monta directamente en "active" (spec
    // S7.2).
    //
    // RETIRADO 2026-08-11 (Task 27): este caso comprobaba ADEMAS, con una
    // sonda `useStage()`, que la pagina seguia en "backdrop" aqui y llegaba
    // a "chrome" tras HERO_CHROME_OFFSET_MS una vez resuelta la carrera --
    // es decir, que `HeroBackdrop` avisaba a `markBackdropRevealed()`. Esa
    // llamada se retiro de `HeroBackdrop.tsx` (junto con `useStage()`/
    // `StageProvider` enteros, sin ningun consumidor real desde la Task 10),
    // asi que la aviso ya no existe y no hay nada que sondear: se retira la
    // asercion, no se afloja. Lo que SI sigue siendo cierto -- el
    // decode-gating de "pending" a "active" -- es lo unico que queda abajo.
    expect(stackOf("aura")).toHaveAttribute("data-state", "pending");
    expect(stackOf("eye")).not.toBeInTheDocument();

    await act(async () => {
      await flushMicrotasks();
    });

    // decode() (mas el margen de un frame) resolvio: el stack pasa a
    // "active" -- lo que dispara su propio escalonado de entrada por capa.
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
  });

  it("el ajuste de hidratacion NO cruza: sustituye el stack pendiente sin coexistir y sin doble intro", async () => {
    // La contrapartida del test anterior. `ThemeProvider` arranca en "light"
    // y se corrige a "dark" en su efecto de montaje: ese cambio se observa
    // desde HeroBackdrop igual que un toggle, pero sigue siendo la CARGA
    // asentandose con el tema correcto, no un relevo.
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(<HeroBackdrop />);

    // El pending original (aura, el tema con el que SIEMPRE arranca
    // `ThemeProvider`) nunca llega a pintarse: el ajuste de hidratacion lo
    // sustituye por completo ANTES de que su decode() tenga ocasion de
    // resolver (microtarea, mas lenta que el flush sincrono de efectos del
    // propio montaje -- ver el docblock de HeroBackdrop.tsx).
    expect(stackOf("aura")).not.toBeInTheDocument();
    expect(stackOf("eye")).toHaveAttribute("data-state", "pending");

    await act(async () => {
      await flushMicrotasks();
    });

    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();

    // RETIRADO 2026-08-11 (Task 27): este caso comprobaba ADEMAS, con una
    // sonda `useStage()`, que markBackdropRevealed() solo se habia disparado
    // UNA vez (sin doble intro) leyendo que la fase llegaba a "chrome" con
    // el offset estandar. Esa notificacion ya no existe (ver el test de
    // arriba); el "active" de las dos aserciones de encima ya demuestra que
    // el ajuste de hidratacion no dejo el fondo pegado en "pending".
  });

  it("SIN tema guardado, el PRIMER toggle del usuario ya arranca un relevo real (no se lo come el ajuste de hidratacion)", async () => {
    // Es el caso mas comun de todos: visitante nuevo, localStorage vacio, el
    // proveedor arranca en "light" y NO genera ningun ajuste de hidratacion.
    // Un guard basado en "ignora el primer cambio que veas" se comeria aqui
    // el unico toggle real -- y precisamente este es el momento que la
    // coreografia existe para lucir (task/lessons.md 2026-07-26).
    expect(window.localStorage.getItem("vti-theme")).toBeNull();
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: aura active (nada que hidratar)
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    await clickToggle(); // light -> dark, primer y unico cambio de la sesion

    // Si el relevo se hubiera saltado (el guard equivocado comiendose "el
    // primer cambio"), el ojo nunca llegaria a montarse. Aqui SI se monta,
    // en "pending": prueba de que arranco un relevo real. Aura sigue
    // "active" -- el reloj del colapso (HERO_BACKDROP_HOLD_MS) aun no llego.
    expect(stackOf("eye")).toHaveAttribute("data-state", "pending");
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS);
    });
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("relevo secuencial: a HERO_HANDOFF_MS - 1 el saliente SIGUE montado y el entrante SIGUE pending; a HERO_HANDOFF_MS el saliente se ha ido y el entrante esta active", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    await clickToggle(); // dark -> light: aura pending, decode() ya resuelto

    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS - 1);
    });
    // El reloj del relevo NO ha llegado: el saliente sigue montado (a estas
    // alturas ya "leaving", colapsando) y el entrante sigue "pending" -- ni
    // siquiera con decode() resuelto de sobra puede el entrante adelantarse
    // al reloj (spec S7.3: el MAXIMO de los dos, nunca solo el decode).
    expect(stackOf("eye")).toBeInTheDocument();
    expect(stackOf("aura")).toHaveAttribute("data-state", "pending");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    // El reloj llega exactamente a HERO_HANDOFF_MS: el saliente se desmonta
    // y el entrante pasa a "active" en el mismo tick.
    expect(stackOf("eye")).not.toBeInTheDocument();
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
  });

  it("a HERO_BACKDROP_HOLD_MS el saliente colapsa: pasa de active a leaving", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    await clickToggle(); // dark -> light: aura pending
    // Instante t=0 del relevo: el saliente TODAVIA no colapsa -- la copia
    // (que se apaga en t=0, fuera de este archivo) tiene que desaparecer
    // primero.
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    act(() => {
      vi.advanceTimersByTime(HERO_BACKDROP_HOLD_MS);
    });
    expect(stackOf("eye")).toHaveAttribute("data-state", "leaving");
    // El entrante sigue esperando al reloj del relevo -- HERO_BACKDROP_HOLD_MS
    // es solo el inicio del colapso, no el final.
    expect(stackOf("aura")).toHaveAttribute("data-state", "pending");
  });

  it("reversion a mitad de camino: volver al tema anterior antes del relevo reactiva DIRECTAMENTE, sin pasar por pending", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    await clickToggle(); // dark -> light: aura pending
    expect(stackOf("aura")).toHaveAttribute("data-state", "pending");
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    act(() => {
      vi.advanceTimersByTime(HERO_BACKDROP_HOLD_MS);
    });
    expect(stackOf("eye")).toHaveAttribute("data-state", "leaving"); // a medio colapsar

    await clickToggle(); // light -> dark: reversion, ANTES de HERO_HANDOFF_MS

    // El ojo (que ya estaba montado, "leaving") se reactiva DIRECTAMENTE a
    // "active", sin pasar por "pending" -- ya era visible un instante antes,
    // asi que apagarlo primero solo anadiria un parpadeo. Aura (que nunca
    // paso de "pending", nunca llego a pintarse) se elimina por completo.
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();

    // Nada queda pendiente: avanzar de sobra el reloj del relevo que ya no
    // corresponde a ningun cruce en marcha no cambia nada.
    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS);
    });
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("dos cambios de tema rapidos no dejan un stack huerfano montado", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    // Dos clics seguidos, sin esperar a que el primero asiente: dark -> light
    // -> dark. El primer relevo (hacia Aura) queda invalidado a medias por
    // el token de ejecucion.
    await act(async () => {
      screen.getByRole("button").click();
      screen.getByRole("button").click();
      await flushMicrotasks();
    });

    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS);
    });

    // El tema final es "dark": solo el ojo debe quedar montado.
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");
    expect(stackOf("aura")).not.toBeInTheDocument();
  });

  it("bajo reduced-motion el cambio de tema es INSTANTANEO: sin relevo, sin pending, sin ningun temporizador nuevo", async () => {
    stubMatchMedia(true); // prefers-reduced-motion: reduce
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    // `vi.getTimerCount()` a secas NO sirve aqui (medido: sube de 7 a 9 en
    // este mismo toggle): montar Aura arrastra su propio Sol, que trae su
    // ciclo AMBIENTAL de auto-cambio de cara (`useSolCycle.ts`,
    // `window.setInterval`) -- un temporizador legitimo, que arrancaria
    // igual con o sin `reduce`, y que un conteo global no puede distinguir
    // del relevo. Se espia `window.setTimeout` en su lugar: apunta
    // exactamente a los DOS temporizadores propios del relevo secuencial
    // (HERO_BACKDROP_HOLD_MS, HERO_HANDOFF_MS) sin que el ruido ambiental de
    // otros componentes lo confunda.
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    await clickToggle(); // dark -> light

    // Instantaneo: el saliente ya no esta, el entrante ya esta "active" --
    // sin pasar por "pending" ni por "leaving" en ningun momento observable.
    expect(stackOf("eye")).not.toBeInTheDocument();
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    // Ningun temporizador NUEVO de los dos que arma el relevo secuencial: un
    // relevo de 1070ms por temporizador no lo colapsa ningun media query,
    // asi que la unica forma de que esto sea cierto es que el componente
    // haya leido `prefers-reduced-motion` el mismo, en JS, y se haya saltado
    // el relevo por completo.
    const scheduledDelays = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(scheduledDelays).not.toContain(HERO_BACKDROP_HOLD_MS);
    expect(scheduledDelays).not.toContain(HERO_HANDOFF_MS);

    setTimeoutSpy.mockRestore();
  });

  it("los retardos de ENTRADA de las capas de Aura siguen el orden de AURA_STAGGER (leido de la constante importada)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    await clickToggle(); // dark -> light: aura pending, decode ya resuelto
    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS);
    }); // relevo completo: aura active
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    // "base" comparte escalon con "field" (sinonimo, aura.parts.tsx): mismo
    // indice.
    const delayOf = (part: string): string =>
      getComputedStyle(partOf(part) as HTMLElement).transitionDelay;

    expect(delayOf("base")).toBe(delayOf("field"));

    for (const part of AURA_STAGGER) {
      const step = AURA_STAGGER.indexOf(part);
      expect(delayOf(part)).toBe(`${step * HERO_STEP_MS}ms`);
    }
  });

  it("al salir, el retardo de las capas de Aura se cuenta en REVERSO (orb, escalon 0, recibe el retardo MAYOR)", async () => {
    // Tema por defecto (claro): Aura es el stack de la carga, luego SALE.
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: aura active
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");

    await clickToggle(); // light -> dark: eye pending, aura sigue active
    act(() => {
      vi.advanceTimersByTime(HERO_BACKDROP_HOLD_MS);
    }); // aura -> leaving
    expect(stackOf("aura")).toHaveAttribute("data-state", "leaving");

    const delayOf = (part: string): string =>
      getComputedStyle(partOf(part) as HTMLElement).transitionDelay;
    const total = AURA_STAGGER.length;

    for (const part of AURA_STAGGER) {
      const step = AURA_STAGGER.indexOf(part);
      expect(delayOf(part)).toBe(`${(total - 1 - step) * HERO_STEP_MS}ms`);
    }
    // "orb" (escalon 0, Sol) recibe el MAYOR retardo -- el ultimo en
    // apagarse, exactamente lo que pide el brief ("por ultimo Sol").
    expect(delayOf("orb")).toBe(`${(total - 1) * HERO_STEP_MS}ms`);
  });

  it("los retardos de ENTRADA de las capas del ojo siguen el orden de EYE_STAGGER (por animationDelay, leido de la constante importada)", async () => {
    // Tema por defecto (claro): hace falta cruzar HACIA el ojo para verlo
    // entrando.
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: aura active

    await clickToggle(); // light -> dark: eye pending
    act(() => {
      vi.advanceTimersByTime(HERO_HANDOFF_MS);
    }); // relevo completo: eye active
    expect(stackOf("eye")).toHaveAttribute("data-state", "active");

    // "socket" comparte escalon con "mascot" (indice 0); "scrim" con "pupil"
    // (el ultimo, EYE_STAGGER.length - 1).
    expect(eyeDelayOf("socket")).toBe(eyeDelayOf("mascot"));
    expect(eyeDelayOf("scrim")).toBe(eyeDelayOf("pupil"));

    for (const part of EYE_STAGGER) {
      const step = EYE_STAGGER.indexOf(part);
      expect(eyeDelayOf(part)).toBe(`${step * HERO_STEP_MS}ms`);
    }
  });

  it("al salir, el retardo de las capas del ojo se cuenta en REVERSO (mascot, escalon 0, recibe el retardo MAYOR -- por ultimo el Wormhole)", async () => {
    window.localStorage.setItem("vti-theme", "dark");
    renderHeroBackdrop(
      <>
        <ThemeToggle />
        <HeroBackdrop />
      </>,
    );
    await act(async () => {
      await flushMicrotasks();
    }); // carga: eye active

    await clickToggle(); // dark -> light: aura pending, eye sigue active
    act(() => {
      vi.advanceTimersByTime(HERO_BACKDROP_HOLD_MS);
    }); // eye -> leaving
    expect(stackOf("eye")).toHaveAttribute("data-state", "leaving");

    const total = EYE_STAGGER.length;
    for (const part of EYE_STAGGER) {
      const step = EYE_STAGGER.indexOf(part);
      expect(eyeDelayOf(part)).toBe(`${(total - 1 - step) * HERO_STEP_MS}ms`);
    }
    // "mascot" (escalon 0, el Wormhole) recibe el MAYOR retardo -- el
    // ultimo en apagarse.
    expect(eyeDelayOf("mascot")).toBe(`${(total - 1) * HERO_STEP_MS}ms`);
  });

  it("REGRESION: un remontaje simulado (StrictMode) no deja el fondo pegado en pending para siempre", async () => {
    /*
     * Reproduce el contrato que rompia el bug real (navegar a "/" desde una
     * pagina legal con next/link, medido en navegador): React StrictMode
     * (activo en next.config.ts, reactStrictMode: true) simula, en cada
     * montaje, un desmontaje + remontaje -- invoca la limpieza de TODOS los
     * efectos de ese commit y vuelve a invocar su configuracion, para
     * verificar que el componente sobrevive integro a ese ciclo. La limpieza
     * de desmontaje de HeroBackdrop (mas abajo en HeroBackdrop.tsx) sube
     * `tokenRef.current` en CADA desmontaje, real o simulado -- asi que la
     * SEGUNDA invocacion del efecto de la carrera (la que de verdad importa,
     * la primera queda cancelada por su propio `cancelled`) arranca con
     * `tokenRef.current` ya en 1.
     *
     * ANTES de esta revision, `myToken` salia de `pendingEntry.token` --
     * un campo escrito a mano en el inicializador de `useState`, congelado
     * en 0 para siempre (nadie lo actualiza en un remontaje, solo un cambio
     * de tema real llama a `setPendingEntry` de nuevo). Esa segunda carrera
     * comparaba entonces 0 contra el 1 de `tokenRef.current` -- descarte
     * PERMANENTE de `finishLoad()`, el stack pegado en "pending" para
     * siempre, las cuatro capas en `opacity: 0`. Con el arreglo, `myToken`
     * se lee de `tokenRef.current` en el instante en que el efecto arranca:
     * la segunda invocacion lo captura ya en 1, coincide con el `tokenRef`
     * que comprueba al resolver, y `finishLoad()` se aplica con normalidad.
     *
     * `renderWithProviders` con `reactStrictMode: true` (opcion nativa de
     * Testing Library, RenderOptions) envuelve TODO el arbol -- proveedores
     * incluidos -- en `<StrictMode>`, exactamente como lo hace `next.config.ts`
     * en produccion: no hace falta desmontar/remontar a mano con `unmount()`
     * (eso crearia una instancia nueva, con `tokenRef`/`pendingEntry`
     * reinicializados desde cero, y NUNCA reproduciria esta carrera).
     */
    renderWithProviders(<HeroBackdrop />, { reactStrictMode: true });

    // Recien montado (las dos invocaciones de StrictMode ya corrieron,
    // sincronas dentro de act()): el stack de carga arranca en "pending",
    // decode() todavia no resolvio.
    expect(stackOf("aura")).toHaveAttribute("data-state", "pending");

    await act(async () => {
      await flushMicrotasks();
    });

    // Con el bug, esta asercion fallaba: el stack se quedaba en "pending"
    // para siempre (descarte permanente de finishLoad() por el token
    // desincronizado). Con el arreglo, decode() resuelve y el token
    // coincide: el stack llega a "active".
    expect(stackOf("aura")).toHaveAttribute("data-state", "active");
  });
});
