"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ALWAYS_ON_CATEGORY,
  CONSENT_CATEGORIES,
  type ConsentCategory,
} from "@/config/cookies";
import { readConsent, writeConsent } from "./consentStorage";
import type { ConsentDecision } from "./consentTypes";

/**
 * Decisión de partida antes de hidratar: todo denegado salvo la única
 * categoría no conmutable (D11). Es idéntica en servidor y en cliente antes
 * del efecto de sincronización — condición necesaria para que el HTML
 * prerenderizado del export estático no produzca un mismatch de hidratación
 * (D17).
 */
function buildDeniedDecision(): ConsentDecision {
  const decision = {} as ConsentDecision;
  for (const category of CONSENT_CATEGORIES) {
    decision[category] = category === ALWAYS_ON_CATEGORY;
  }
  return decision;
}

/** Decisión con TODAS las categorías aceptadas (para `acceptAll`). */
function buildAcceptedDecision(): ConsentDecision {
  const decision = {} as ConsentDecision;
  for (const category of CONSENT_CATEGORIES) {
    decision[category] = true;
  }
  return decision;
}

interface ConsentContextValue {
  /** `null` mientras no se ha decidido nada (o el registro almacenado
   *  caducó o es inválido — ver `consentStorage.readConsent`). */
  readonly decision: ConsentDecision | null;
  readonly isBannerVisible: boolean;
  readonly isPreferencesOpen: boolean;
  acceptAll(): void;
  rejectAll(): void;
  save(decision: ConsentDecision): void;
  openPreferences(): void;
  closePreferences(): void;
  /**
   * EL GATE. Único punto por el que cualquier script futuro debe pasar
   * antes de cargar una tecnología no exenta de consentimiento (spec D14).
   * Sin este punto único, el primer script que llegue lo esquivará.
   *
   * Uso real esperado, el día que `cookies.ts` declare algo en `analytics`
   * o `marketing`:
   *
   * ```tsx
   * function AnalyticsLoader() {
   *   const { hasConsent } = useConsent();
   *   useEffect(() => {
   *     if (!hasConsent("analytics")) return;
   *     loadAnalyticsScript();
   *   }, [hasConsent]);
   *   return null;
   * }
   * ```
   *
   * Hoy `STORAGE_REGISTRY` (`src/config/cookies.ts`) no declara ninguna
   * entrada en `analytics` ni `marketing` (H5 de la spec): ningún script
   * real pasa todavía por aquí. El gate queda operativo para cuando sí lo
   * haga.
   */
  hasConsent(category: ConsentCategory): boolean;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isPreferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    // Leer localStorage durante el render rompería el HTML prerenderizado
    // del export estático (sin `window`) y arriesgaría un mismatch de
    // hidratación — mismo patrón que ThemeProvider (líneas 49-63) e
    // I18nProvider (líneas 12-21): se sincroniza una sola vez, en cliente,
    // tras montar (D17).
    const record = readConsent(Date.now());
    // Los dos setState de este efecto se agrupan en un único render, así
    // que ningún consumidor ve `hydrated=true` con la decisión vieja
    // (mismo motivo que el agrupado de ThemeProvider.tsx:55-58). El linter
    // solo señala el PRIMER setState del bloque, así que la excepción va
    // aquí y cubre a los dos (mismo comentario que ThemeProvider.tsx:58).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecision(record ? record.categories : null);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ConsentDecision) => {
    writeConsent(next, Date.now());
    setDecision(next);
  }, []);

  const acceptAll = useCallback((): void => {
    persist(buildAcceptedDecision());
  }, [persist]);

  const rejectAll = useCallback((): void => {
    // D12: rechazar cuesta EXACTAMENTE lo mismo que aceptar, así que
    // también persiste un registro. Si "rechazar" no guardara nada, el
    // banner reaparecería en cada visita y rechazar costaría infinitas
    // veces más que aceptar — justo lo que D12 prohíbe.
    persist(buildDeniedDecision());
  }, [persist]);

  const save = useCallback(
    (next: ConsentDecision): void => {
      // `necessary` no es conmutable (D11): se fuerza aquí también, en
      // defensa adicional a que su checkbox ya se pinta disabled+checked
      // en CookiePreferences — la misma regla dura que consentStorage
      // aplica al LEER se repite aquí al ESCRIBIR.
      persist({ ...next, [ALWAYS_ON_CATEGORY]: true });
    },
    [persist],
  );

  const openPreferences = useCallback((): void => setPreferencesOpen(true), []);
  const closePreferences = useCallback(
    (): void => setPreferencesOpen(false),
    [],
  );

  const hasConsent = useCallback(
    (category: ConsentCategory): boolean => {
      if (category === ALWAYS_ON_CATEGORY) return true;
      return decision?.[category] === true;
    },
    [decision],
  );

  // El banner nunca se muestra antes de que el efecto de sincronización
  // haya corrido (spec: "el banner no debe parpadear en la primera
  // pintura"): sin el guard de `hydrated`, el primer render (SSR y el
  // primer paint en cliente) vería `decision === null` incondicionalmente
  // -- incluso para quien YA tiene una decisión guardada -- y el banner
  // destellaría visible un frame antes de que el efecto la recuperase.
  const isBannerVisible = hydrated && decision === null;

  const value = useMemo<ConsentContextValue>(
    () => ({
      decision,
      isBannerVisible,
      isPreferencesOpen,
      acceptAll,
      rejectAll,
      save,
      openPreferences,
      closePreferences,
      hasConsent,
    }),
    [
      decision,
      isBannerVisible,
      isPreferencesOpen,
      acceptAll,
      rejectAll,
      save,
      openPreferences,
      closePreferences,
      hasConsent,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}
