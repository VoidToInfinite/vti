"use client";

import type {
  ElementType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import styled, { css } from "styled-components";
import { PRESS } from "@/motion/vocabulary";

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
      /* Task 13, punto 2 del brief: elimina el retardo de doble-tap del
         navegador. Solo en la rama $interactive -- una card NO interactiva
         no es pulsable, no tiene :active ni ningún otro feedback de PRESS
         que este atributo tenga sentido de acompañar. */
      touch-action: manipulation;
      /* transform migra a vocabulary.PRESS (Task 9, primera adopción real):
         es la MISMA entrada que gobierna el press de abajo -- CSS no admite
         dos duraciones distintas para la misma propiedad en una sola lista
         de transition, así que hover-lift y press comparten timing, igual
         que ya hace Button.tsx (ver su docblock del press). box-shadow se
         AÑADE a la lista (hoy la sombra salta de elevation[0] a
         elevation[1] sin transición, tanto en hover como en focus-visible):
         no es una animación nueva -- regla 18 --, es poner en transición un
         cambio que el propio hover YA hacía. border-color se queda en
         fast/standard, sin tocar. */
      transition:
        transform ${PRESS.durationMs}ms ${PRESS.easing},
        border-color ${theme.data.motion.duration.fast}
          ${theme.data.motion.easing.standard},
        box-shadow ${theme.data.motion.duration.fast}
          ${theme.data.motion.easing.standard};

      /* hover-lift (§9 de la spec): translateY + tint de borde es la ÚNICA
         primitiva de hover para cards; no se inventa una animación propia.
         Guardado tras PRESS.hoverGuard (Task 9, punto 2 del brief): mueve
         (translateY), así que un tap en táctil no puede dejarlo "pegado". */
      @media ${PRESS.hoverGuard} {
        &:hover {
          transform: translateY(-2px);
          border-color: ${theme.data.semantic.borderStrong};
          box-shadow: ${theme.data.elevation[1]};
        }
      }

      /* Press (Task 9): feedback táctil que faltaba -- comparte la entrada
         de transform de la lista de arriba, así que entra y sale con
         PRESS.durationMs/PRESS.easing igual que el hover-lift. */
      &:active {
        transform: scale(${PRESS.activeScale});
      }

      /* :focus-visible propio (hallazgo 1, D7): la card interactiva depende
         hoy por completo del anillo GLOBAL (GlobalStyles.tsx, outline).
         Reutiliza el mismo lenguaje que el hover -- borde reforzado +
         elevación -- porque para una card "interactive" foco y hover
         comunican la MISMA cosa (esto es accionable), así que no hace falta
         inventar un tercer tratamiento visual; y le suma el halo de foco
         (box-shadow translúcido contra semantic.focus, el mismo rol que ya
         resuelve el anillo global) para que el ESTADO de foco, a diferencia
         del de hover, quede señalizado incluso para quien no puede ver el
         color de un borde 1px pero sí distingue un halo con radio.
         box-shadow reemplaza aquí AL COMPLETO el de hover/base (elevation[0]
         en reposo, elevation[1] en hover): no hace falta apilarlos con coma
         porque, a diferencia del outline de Button.tsx, esta capa no tiene
         un anillo inset propio que preservar -- elevation[1] + halo son las
         dos únicas sombras que tienen sentido en este estado. Sin transition
         propia para el halo, igual que en Button.tsx/IconButton.tsx: aparece
         tan instantáneo como el propio outline global. border-color SÍ
         hereda la transition ya declarada arriba (fast/standard), cubierta
         por el guard de reduced-motion existente más abajo -- no se declara
         una transition nueva, así que no hace falta ampliar ese guard. */
      &:focus-visible {
        border-color: ${theme.data.semantic.borderStrong};
        box-shadow:
          ${theme.data.elevation[1]},
          0 0 0 4px
            color-mix(in oklch, ${theme.data.semantic.focus} 35%, transparent);
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
        &:hover,
        &:active {
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
