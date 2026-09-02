"use client";

import type { ComponentProps, ReactElement } from "react";
import styled from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";

/**
 * Kicker de sección: la línea corta, en versalitas y color de marca, que
 * precede al `h2` de cada sección de la home.
 *
 * NACE en la integración de la ola K (crítica externa #15, 2026-09-02,
 * evaluador de Craft, dimensión 5): hasta esa ronda `Story.tsx:591` y
 * `Features.tsx:333` declaraban DOS `ScKicker` byte a byte idénticos
 * (`text-transform: uppercase` + `semantic.brandText` sobre la variante
 * `overline` de `Typography`), y la regla decorativa de 1.75rem × 2px que
 * acompaña al kicker (`ScEyebrowBar`, D4 del mockup de Story claro) solo se
 * pintaba en UNA de las cuatro combinaciones sección × tema. Una de cuatro
 * improvisa; o va en las cuatro o en ninguna. Va en las cuatro, y vive aquí
 * como un solo primitivo con la regla incorporada.
 *
 * La regla es un `::before` del propio kicker, no un `<span aria-hidden>`
 * hermano: es decoración pura (no tiene nombre ni entra en el árbol de
 * accesibilidad de ninguna forma) y así el consumidor no tiene que
 * recordar un segundo elemento ni su `aria-hidden`. Sus dos medidas son
 * literales documentados del mockup (L75): ningún paso de `space` mide
 * 1.75rem ni 2px, y convertirlas a tokens inventaría un peldaño para un
 * solo uso.
 *
 * `variant` NO es configurable: un kicker es `overline` por definición
 * (`Typography` lo mapea a `<span>`); exponerlo invitaría a que otra sección
 * lo escalara a un `h*` y rompiera la estructura de encabezados, que la
 * crítica #15 midió sin un solo salto de nivel.
 */
const ScKicker = styled(Typography)<{ $withRule: boolean }>`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
  ${({ $withRule }) =>
    $withRule &&
    `
    display: flex;
    align-items: center;
    gap: 0.75rem;

    &::before {
      content: "";
      display: block;
      flex: none;
      width: 1.75rem;
      height: 2px;
      background-color: currentColor;
    }
  `}
`;

type KickerProps = Omit<ComponentProps<typeof Typography>, "variant"> & {
  /** Regla decorativa de 1.75rem × 2px delante del texto. Por defecto sí:
   *  la crítica #15 pidió que fuera en las cuatro combinaciones o en
   *  ninguna, y se eligió en las cuatro. */
  readonly withRule?: boolean;
};

export function Kicker({
  withRule = true,
  children,
  ...rest
}: KickerProps): ReactElement {
  return (
    <ScKicker
      {...rest}
      variant="overline"
      $withRule={withRule}
    >
      {children}
    </ScKicker>
  );
}
