"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import styled from "styled-components";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/Button/Button";

// Lados del cuadrado — mismo dato que Button.sizeStyles (36/44/52px,
// Button.tsx líneas 38-51). Esa tabla vive en un objeto NO exportado de
// Button.tsx: no hay forma de importarla sin exportarla, y exportarla solo
// para este consumo sería más cambio que el necesario. Por eso se redeclara
// aquí, literal, con los mismos tres números — no es una tabla de decisión
// nueva, es el mismo dato ya existente vuelto a escribir para dimensionar el
// lado del cuadrado.
const SQUARE_SIDE: Record<ButtonSize, string> = {
  sm: "36px",
  md: "44px",
  lg: "52px",
};

// El icono (width/height="1em") escala con el font-size que fija esta
// tabla, un paso por debajo del lado del cuadrado para dejar aire alrededor.
const ICON_SIDE: Record<ButtonSize, string> = {
  sm: "16px",
  md: "20px",
  lg: "24px",
};

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** SVG ya aria-hidden, con width="1em" height="1em" para heredar el
   *  tamaño de ICON_SIDE. */
  "icon": ReactNode;
  /** Nombre accesible OBLIGATORIO (sin default): un icon-button sin texto
   *  visible depende de esto para tener nombre (WCAG 4.1.2). Redeclarado
   *  aquí como string requerido — ButtonHTMLAttributes lo trae opcional. */
  "aria-label": string;
  "variant"?: ButtonVariant;
  /*
   * `intent` RETIRADO de esta interfaz en la crítica externa #10
   * (2026-08-18). Censo previo sobre `src/` y `app/`: ningún consumidor de
   * `IconButton` la pasó nunca — ni ThemeToggle, ni BackToTop, ni los dos
   * disparadores de `NavSheet` —, así que la prop solo servía para
   * redeclarar el valor por defecto que este componente ya fija por su
   * cuenta. El acento neutro no desaparece con ella: se fija abajo, en el
   * único sitio donde de verdad se decide (ver el JSX de `ScSquare`).
   */
  "size"?: ButtonSize;
}

const ScSquare = styled(Button)<{ $side: string; $iconSide: string }>`
  width: ${({ $side }) => $side};
  padding: 0;
  gap: 0;
  font-size: ${({ $iconSide }) => $iconSide};

  /* Afordancia de descubribilidad — SOLO en esta capa de composición de
     IconButton, NO en ScButton/Button.tsx: un botón de solo icono en ghost
     es invisible en reposo (Button.tsx ~114-120: fondo transparente hasta
     hover). Quien no puede "descubrir" pasando el cursor —baja visión,
     temblor, navegación por switch/conmutador— no sabe que ahí hay un
     control. El anillo vive solo aquí: Button.tsx no cambia, sus 4
     variantes en cualquier otro punto del sitio siguen exactamente igual. */
  &[data-variant="ghost"] {
    box-shadow: inset 0 0 0 1px
      color-mix(in oklch, currentColor 18%, transparent);
  }

  /* Indicador visual mínimo de "en curso" (Task 5, plan premium F1-F5),
     opacity únicamente (regla dura §18). Lee el atributo aria-busy que YA
     está en el DOM (ThemeToggle.tsx lo pasa como prop nativa, no como la
     prop loading de Button.tsx — ver su docblock) en vez de añadir una prop
     $busy nueva: así CSS y ARIA nunca pueden divergir, la misma fuente de
     verdad decide las dos cosas. Valor distinto del 0.5 de
     :disabled/[aria-disabled="true"] (Button.tsx) a propósito — "en curso,
     sigue interactivo" es un estado distinto de "deshabilitado", y nunca
     coinciden aquí (aria-busy no implica disabled), pero conviene que
     tampoco se confundan a la vista si algún consumidor futuro los
     combinara. El transition: none bajo reduce es redundante con el reset
     global de GlobalStyles.tsx (transition-duration: 0.001ms !important)
     pero se declara aquí también, explícita y comprobable: createGlobalStyle
     no inyecta nada bajo jsdom + Vitest (task/lessons.md 2026-07-27), así que
     sin esta declaración local el comportamiento bajo reduce no tendría
     ningún candado propio de este componente. */
  &[aria-busy="true"] {
    opacity: 0.65;
    transition: opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  /* AQUÍ VIVIÓ un [data-variant="ghost"]:focus-visible propio (hallazgo 1,
     D7) que repetía el anillo de descubribilidad de arriba y le sumaba, en
     la MISMA declaración, un halo de 4px contra semantic.focus. Existía por
     una razón puramente mecánica: cuando el anillo de foco se escribía con
     box-shadow había que reescribir en el bloque de foco cualquier otra
     sombra del control (box-shadow no fusiona entre declaraciones, la última
     gana entera) y subir la especificidad por encima del anillo de
     descubribilidad, que empataba con él.

     Retirado el 2026-09-02 (crítica externa #14, P1 de Craft): con el anillo
     único declarado por outline en GlobalStyles.tsx (geometría en
     src/theme/tokens/focus.ts) el problema desaparece en su raíz -- outline
     y box-shadow son propiedades distintas, así que no compiten, y el anillo
     de descubribilidad de arriba sigue pintándose intacto durante el foco
     sin que nadie tenga que repetirlo. */
`;

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  ...rest
}: IconButtonProps): ReactElement {
  return (
    <ScSquare
      $side={SQUARE_SIDE[size]}
      $iconSide={ICON_SIDE[size]}
      data-variant={variant}
      variant={variant}
      /* Literal, ya no una prop con valor por defecto (crítica externa #10,
         2026-08-18): es la ÚNICA decisión que este componente toma sobre el
         acento, y ningún consumidor la sobrescribía. `neutral` resuelve a
         `semantic.text` en `Button.tsx` (`accent()`); sin esta línea, un
         botón de icono heredaría el `primary` con el que arranca `Button` y
         ThemeToggle/BackToTop/NavSheet pasarían a color de marca. El candado
         de esa propiedad vive en `IconButton.test.tsx`. */
      intent="neutral"
      size={size}
      {...rest}
    >
      {icon}
    </ScSquare>
  );
}
