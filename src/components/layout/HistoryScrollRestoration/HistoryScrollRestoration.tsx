"use client";

import { usePathname } from "next/navigation";
import { useHistoryScrollRestoration } from "@/hooks/useHistoryScrollRestoration";

/**
 * Componente nulo que monta el restituidor de los recorridos del historial
 * (`useHistoryScrollRestoration`, F20-A). Existe solo porque `Providers` llama
 * a sus hooks por encima de `ThemeProvider` y la ruta renderizada llega por
 * `usePathname`, que tiene que leerse dentro del árbol. No pinta nada.
 *
 * `usePathname` puede devolver `null` fuera del App Router (los tests que
 * montan `Providers` a pelo): ahí ninguna restitución pendiente encuentra su
 * ruta y el hook se queda anotando, sin mover nada.
 */
export function HistoryScrollRestoration(): null {
  const pathname: string | null = usePathname();
  useHistoryScrollRestoration(pathname ?? "");
  return null;
}
