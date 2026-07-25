"use client";

import type {
  ElementType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import styled, { css } from "styled-components";

interface CardProps extends HTMLAttributes<HTMLElement> {
  /**
   * Activa el estado accionable: hover-lift + borde fuerte + elevation-1.
   * Por defecto (`false`) la card es superficie plana — elevation-0, sin
   * glass (regla dura del sistema, §13.2 de la spec: el glass queda
   * reservado a capas flotantes: nav on-scroll, modal, sheet, toast).
   */
  interactive?: boolean;
  /**
   * Elemento/componente a renderizar (`as` de styled-components).
   *
   * Contrato de uso: `interactive` por sí solo NO añade `role`/`tabIndex`.
   * Si necesitas que la card entera sea accionable, pásala junto con un
   * elemento nativamente focuseable: `as="a"` + `href`, o `as="button"`.
   * Usar `interactive` sin `as`/`href` deja un `<div>` con estilos de hover
   * pero inalcanzable por teclado y sin rol semántico — esta es una
   * decisión deliberada: no inventamos una semántica de botón falsa
   * (role="button" + tabIndex + onKeyDown a mano) para no duplicar peor lo
   * que un `<button>`/`<a>` nativo ya resuelve.
   */
  as?: ElementType;
  href?: string;
  children: ReactNode;
}

const ScCard = styled.div<{ $interactive: boolean }>`
  background: ${({ theme }) => theme.data.semantic.surface};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  border-radius: ${({ theme }) => theme.data.radius.xl};
  padding: ${({ theme }) => theme.data.space[6]};
  /* Plana por defecto: elevation-0 explícito (nunca box-shadow implícito). */
  box-shadow: ${({ theme }) => theme.data.elevation[0]};

  ${({ theme, $interactive }) =>
    $interactive &&
    css`
      display: block;
      cursor: pointer;
      transition:
        transform ${theme.data.motion.duration.fast}
          ${theme.data.motion.easing.standard},
        border-color ${theme.data.motion.duration.fast}
          ${theme.data.motion.easing.standard};

      /* hover-lift (§9 de la spec): translateY + tint de borde es la ÚNICA
         primitiva de hover para cards; no se inventa una animación propia. */
      &:hover {
        transform: translateY(-2px);
        border-color: ${theme.data.semantic.borderStrong};
        box-shadow: ${theme.data.elevation[1]};
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
        &:hover {
          transform: none;
        }
      }
    `}
`;

export function Card({
  interactive = false,
  as,
  children,
  ...rest
}: CardProps): ReactElement {
  return (
    <ScCard
      as={as}
      $interactive={interactive}
      {...rest}
    >
      {children}
    </ScCard>
  );
}
