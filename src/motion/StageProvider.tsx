"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HERO_CHROME_OFFSET_MS,
  STAGE_CHROME_DURATION_MS,
  STAGE_FALLBACK_MS,
  type StagePhase,
} from "./stage";

interface StageValue {
  readonly phase: StagePhase;
  /** Lo llama HeroBackdrop cuando el stack de la CARGA pasa a "active". */
  readonly markBackdropRevealed: () => void;
}

const StageContext = createContext<StageValue | null>(null);

/**
 * Proveedor de la máquina de fases de LA PÁGINA (spec §7.1, ver el docblock
 * de `StagePhase` en `stage.ts` para el papel de cada fase). Espeja el
 * estilo de `ThemeProvider.tsx`: mismo patrón de contexto + hook, mismos
 * docblocks densos explicando el PORQUÉ, no solo el qué.
 *
 * Se monta DENTRO de `ThemeProvider` en `app/providers.tsx` — no porque
 * consuma su contexto directamente (`STAGE_CHROME_DURATION_MS` se deriva del
 * token de movimiento crudo, ver `stage.ts`, precisamente porque este
 * proveedor no puede depender de qué tema esté activo), sino porque es la
 * ubicación natural de cualquier proveedor "de interfaz global" del árbol, y
 * porque el hero y el navbar que consumen `useStage()` ya viven los dos
 * dentro de ese mismo árbol.
 */
export function StageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // El estado inicial NO puede depender de `window` (SSR-safe, igual que
  // ThemeProvider arrancando siempre en "light"): toda página arranca en
  // "backdrop" en el servidor y se corrige, si hace falta, en un efecto tras
  // montar.
  const [phase, setPhase] = useState<StagePhase>("backdrop");

  // Idempotencia de markBackdropRevealed (spec §7.1): SOLO el primer aviso
  // cuenta. Un cambio de tema posterior dispara HeroBackdrop otra vez, pero
  // no debe reiniciar el intro del navbar/copia -- por eso el guard vive en
  // una ref (no en `phase`, que sigue avanzando) y se consulta de forma
  // síncrona, sin pasar por un render.
  const revealedRef = useRef(false);

  // Los tres temporizadores en vuelo en un momento dado (nunca más de un
  // "chrome" y un "settled" a la vez, más como mucho una red de seguridad
  // pendiente): se guardan en refs, no en estado, porque no pintan nada por
  // sí mismos y su único trabajo es poder cancelarse al desmontar o cuando
  // el aviso real llega antes que la red de seguridad.
  const chromeTimeoutRef = useRef<number | null>(null);
  const settledTimeoutRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);

  // Compartido por el aviso real (markBackdropRevealed) y por la red de
  // seguridad: las dos vías, cuando disparan, hacen exactamente lo mismo a
  // partir de ahí -- pasar a "chrome" y programar "settled" tras la duración
  // de la transición de interfaz (STAGE_CHROME_DURATION_MS). useCallback con
  // deps `[]`: solo cierra sobre `setPhase` (estable, lo garantiza React) y
  // sobre refs (nunca disparan un re-render por sí mismas), así que su
  // identidad es estable para siempre y no hace falta listarlas.
  const enterChrome = useCallback((): void => {
    setPhase("chrome");
    settledTimeoutRef.current = window.setTimeout(() => {
      settledTimeoutRef.current = null;
      setPhase("settled");
    }, STAGE_CHROME_DURATION_MS);
  }, []);

  /*
   * Lo llama HeroBackdrop cuando el stack de la CARGA pasa a "active" (spec
   * §7.2). Programa "chrome" a HERO_CHROME_OFFSET_MS -- el mismo offset que
   * usan el navbar y la copia del hero para no esperar al final exacto del
   * stack (ver el docblock de HERO_CHROME_OFFSET_MS en hero.transition.ts) --
   * y "settled" después.
   *
   * Idempotente: si ya se avisó una vez (revealedRef.current === true), esta
   * llamada no hace nada. Es lo que permite que un consumidor la invoque
   * desde un efecto en CADA render (por ejemplo, HeroBackdrop llamándola
   * cada vez que su propio stack pasa a "active", incluido tras un cruce de
   * temas) sin reprogramar nada ni reiniciar el intro.
   *
   * Identidad estable (useCallback con deps `[]`): la única dependencia
   * externa real es `enterChrome`, que a su vez tiene deps `[]` y por tanto
   * nunca cambia de referencia -- así que la propia identidad de
   * `markBackdropRevealed` tampoco cambia nunca, y un consumidor puede
   * meterla en las dependencias de su propio efecto sin que ese efecto se
   * reprograme en cada render.
   */
  const markBackdropRevealed = useCallback((): void => {
    if (revealedRef.current) return;
    revealedRef.current = true;

    // La red de seguridad ya no hace falta: el aviso real llegó antes.
    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    chromeTimeoutRef.current = window.setTimeout(() => {
      chromeTimeoutRef.current = null;
      enterChrome();
    }, HERO_CHROME_OFFSET_MS);
    // `enterChrome` es la única dependencia real y sí se declara (exigencia
    // del linter): como su propia identidad nunca cambia (deps `[]`), esta
    // dependencia nunca hace que `markBackdropRevealed` se recalcule -- el
    // resultado es el mismo que escribir `[]` a mano, pero sin mentirle al
    // linter sobre lo que el callback usa de verdad.
  }, [enterChrome]);

  // Arranca en el montaje, una sola vez: lee `prefers-reduced-motion` (NUNCA
  // durante el render -- leer `window.matchMedia` ahí rompería el export
  // estático, igual que ThemeProvider.tsx con `localStorage`) y, si no hay
  // preferencia de movimiento reducido, arma la red de seguridad (spec
  // §7.1). Bajo `reduce`: "settled" de inmediato y SIN programar ningún
  // temporizador -- un escalonado con retardo y "fill: backwards" dejaría el
  // navbar invisible un rato y luego aparecería de golpe, peor que no
  // animar (mismo razonamiento que la spec §6.5 aplica a las capas del
  // hero).
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      revealedRef.current = true; // bloquea cualquier temporizador futuro
      // Los dos efectos de "reduce" (marcar revelado y pasar a settled) se
      // agrupan en el mismo bloque; el linter señala el PRIMER setState
      // síncrono del efecto, así que la excepción va aquí y cubre a los
      // dos -- mismo patrón que ThemeProvider.tsx y HeroBackdrop.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("settled");
      return;
    }

    fallbackTimeoutRef.current = window.setTimeout(() => {
      fallbackTimeoutRef.current = null;
      // Guarda de carrera: si el aviso real llegó en el mismo tick en el
      // que este temporizador iba a disparar, no hay nada que hacer -- ya
      // se está gestionando por la vía normal.
      if (revealedRef.current) return;
      revealedRef.current = true;
      enterChrome();
    }, STAGE_FALLBACK_MS);

    return () => {
      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [enterChrome]);

  // Limpieza al desmontar de los dos temporizadores que NO nacen dentro de
  // un efecto propio (chrome y settled: los programan markBackdropRevealed/
  // enterChrome, invocados desde fuera de cualquier efecto de este
  // componente) -- el temporizador de la red de seguridad ya limpia el
  // suyo en el `return` del efecto de arriba.
  useEffect(() => {
    return () => {
      if (chromeTimeoutRef.current !== null) {
        window.clearTimeout(chromeTimeoutRef.current);
      }
      if (settledTimeoutRef.current !== null) {
        window.clearTimeout(settledTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({ phase, markBackdropRevealed }),
    [phase, markBackdropRevealed],
  );

  return (
    <StageContext.Provider value={value}>{children}</StageContext.Provider>
  );
}

export function useStage(): StageValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used within StageProvider");
  return ctx;
}
