"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from "react";
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
  transition: transform ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};
  ${({ $size }) => sizeStyles[$size]}
  ${({ theme, $variant, $intent }) => {
    const a = accent(theme, $intent);
    if ($variant === "solid")
      return css`
        background: ${a};
        color: ${theme.data.semantic.onBrand};
      `;
    if ($variant === "soft")
      return css`
        background: color-mix(in oklch, ${a} 12%, transparent);
        color: ${a};
      `;
    if ($variant === "outline")
      return css`
        background: transparent;
        color: ${a};
        box-shadow: inset 0 0 0 1px ${theme.data.semantic.borderStrong};
      `;
    return css`
      background: transparent;
      color: ${a};
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
     ralentiza (spinReduced) en vez de detenerse por completo. */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: ${({ theme }) => theme.data.motion.duration.spinReduced};
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
  ...rest
}: ButtonProps): ReactElement {
  return (
    <ScButton
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
