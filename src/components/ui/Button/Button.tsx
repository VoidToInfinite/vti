"use client";

import type {
  ButtonHTMLAttributes,
  ElementType,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";

export type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
export type ButtonIntent = "primary" | "neutral" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  intent?: ButtonIntent;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  /** Override del elemento. `as="a"` + `href` para CTAs que navegan. */
  as?: ElementType;
  href?: string;
}

// Color de acento por intent — SIEMPRE un rol semántico, nunca un primitivo
// de paleta (theme.data.palette.*).
function accent(theme: DefaultTheme, intent: ButtonIntent): string {
  const s = theme.data.semantic;
  if (intent === "neutral") return s.text;
  if (intent === "success") return s.success;
  if (intent === "danger") return s.error;
  return s.brandSolid;
}

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    height: 36px;
    padding: 0 ${({ theme }) => theme.data.space[4]};
  `,
  md: css`
    height: 44px;
    padding: 0 ${({ theme }) => theme.data.space[5]};
  `,
  lg: css`
    height: 52px;
    padding: 0 ${({ theme }) => theme.data.space[6]};
  `,
};

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const ScButton = styled.button<{
  $variant: ButtonVariant;
  $intent: ButtonIntent;
  $size: ButtonSize;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  font-weight: 600;
  cursor: pointer;
  /* transform (compositor) + background-color (paint) — ambas permitidas por
     §9 revisada: la regla dura prohíbe propiedades de LAYOUT, no de paint. El
     tinte forma parte de la definición de hover-lift. */
  transition:
    transform ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    background-color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};
  ${({ $size }) => sizeStyles[$size]}
  ${({ theme, $variant, $intent }) => {
    const a = accent(theme, $intent);
    /* Tinte de hover (§13.1: "hover-lift + tint, un paso más oscuro"). Se
       deriva con color-mix del propio acento en vez de añadir un rol
       semántico por intent: así los 4 intents lo obtienen sin multiplicar
       tokens, y sigue sin haber valores de color hardcodeados. */
    if ($variant === "solid")
      return css`
        background: ${a};
        color: ${theme.data.semantic.onBrand};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 88%, black);
        }
      `;
    if ($variant === "soft")
      return css`
        background: color-mix(in oklch, ${a} 12%, transparent);
        color: ${a};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 20%, transparent);
        }
      `;
    if ($variant === "outline")
      return css`
        background: transparent;
        color: ${a};
        box-shadow: inset 0 0 0 1px ${theme.data.semantic.borderStrong};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 10%, transparent);
        }
      `;
    return css`
      background: transparent;
      color: ${a};
      &:hover:not(:disabled) {
        background: color-mix(in oklch, ${a} 10%, transparent);
      }
    `;
  }}

  /* Únicas dos primitivas de movimiento del sistema: press y hover-lift.
     Ningún componente inventa su propia duración/curva: salen de motion. */
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

// El label permanece en el flujo durante loading para que el ancho del
// botón NO salte; el spinner se superpone centrado encima. Se oculta con
// opacity (no visibility): "name from content" del cómputo de nombre
// accesible de ARIA descarta los descendientes con display:none o
// visibility:hidden, y el spinner ya es aria-hidden — con visibility el
// <button> se quedaría sin nombre accesible durante loading. opacity:0
// mantiene el nodo en el árbol de accesibilidad y en el flujo.
const ScLabel = styled.span<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  pointer-events: ${({ $hidden }) => ($hidden ? "none" : "auto")};
`;

const ScSpinner = styled.span`
  position: absolute;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: ${({ theme }) => theme.data.radius.full};
  animation: ${spin} ${({ theme }) => theme.data.motion.duration.spin} linear
    infinite;

  /* Excepción documentada a "reduced-motion congela todo": un spinner
     inmóvil deja de comunicar que hay una carga en curso, así que se
     ralentiza (spinReduced) en vez de detenerse por completo. El
     !important es obligatorio aquí: el reset global de GlobalStyles fuerza
     animation-duration: 0.001ms !important sobre el selector universal bajo
     el mismo media query, y una declaración !important gana SIEMPRE a una
     que no lo es, sin importar la especificidad del selector — así que sin
     !important aquí esta regla perdería contra el reset y la excepción
     documentada no existiría en la práctica: el spinner se congelaría
     igual. */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: ${({ theme }) =>
      theme.data.motion.duration.spinReduced} !important;
  }
`;

export function Button({
  variant = "solid",
  intent = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ref,
  as: asProp,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <ScButton
      as={asProp}
      ref={ref}
      $variant={variant}
      $intent={intent}
      $size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <ScSpinner aria-hidden="true" />}
      <ScLabel $hidden={loading}>{children}</ScLabel>
    </ScButton>
  );
}
