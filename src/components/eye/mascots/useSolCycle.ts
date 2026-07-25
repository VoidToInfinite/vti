"use client";
import { useEffect, useRef, useState } from "react";
import {
  SOL_AUTO_CYCLE_MS,
  SOL_MANUAL_OVERRIDE_LIMIT,
  SOL_MANUAL_OVERRIDE_MS,
} from "./Sol.constants";

export type SolVariant = "sol" | "compass";

export interface SolCycle {
  variant: SolVariant;
  requestToggle: () => void;
}

function otherVariant(variant: SolVariant): SolVariant {
  return variant === "sol" ? "compass" : "sol";
}

/**
 * El ciclo de identidad de Sol, portado desde `vti-sdk`
 * (`src/widgets/landing-fx/useSolCycle.ts`).
 *
 * Una cara programada alterna con su propio reloj cada `SOL_AUTO_CYCLE_MS`,
 * para siempre. Un click (`requestToggle`) fuerza la cara contraria de
 * inmediato y vuelve a la programada tras `SOL_MANUAL_OVERRIDE_MS`, con un
 * tope de `SOL_MANUAL_OVERRIDE_LIMIT` cambios manuales por ventana — el
 * contador se reinicia con el reloj programado, no de forma deslizante.
 */
export function useSolCycle(): SolCycle {
  const [scheduled, setScheduled] = useState<SolVariant>("sol");
  const [override, setOverride] = useState<SolVariant | null>(null);

  const scheduledRef = useRef<SolVariant>(scheduled);
  const overrideRef = useRef<SolVariant | null>(override);
  const clicksUsed = useRef(0);
  const overrideTimer = useRef<number | null>(null);

  // Se sincronizan por efecto (no se escriben durante el render) para que el
  // intervalo de abajo -- montado una sola vez a proposito, para que un cambio
  // de cara no reinicie su cuenta atras de 8 minutos -- pueda leer el valor
  // vigente cuando dispare.
  useEffect(() => {
    scheduledRef.current = scheduled;
    overrideRef.current = override;
  }, [scheduled, override]);

  useEffect(() => {
    const id = window.setInterval(() => {
      scheduledRef.current = otherVariant(scheduledRef.current);
      setScheduled(scheduledRef.current);
      clicksUsed.current = 0;
    }, SOL_AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (overrideTimer.current !== null) {
        window.clearTimeout(overrideTimer.current);
      }
    };
  }, []);

  const requestToggle = (): void => {
    if (clicksUsed.current >= SOL_MANUAL_OVERRIDE_LIMIT) return;
    clicksUsed.current += 1;

    const next = otherVariant(overrideRef.current ?? scheduledRef.current);
    overrideRef.current = next;
    setOverride(next);

    if (overrideTimer.current !== null) {
      window.clearTimeout(overrideTimer.current);
    }
    overrideTimer.current = window.setTimeout(() => {
      overrideRef.current = null;
      overrideTimer.current = null;
      setOverride(null);
    }, SOL_MANUAL_OVERRIDE_MS);
  };

  return { variant: override ?? scheduled, requestToggle };
}
