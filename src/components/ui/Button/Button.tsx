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
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
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
    /* Halo de :focus-visible (hallazgo 1, D7): las cuatro variantes lo
       necesitan y las tres que no tocan box-shadow (solid/soft/ghost) lo
       comparten tal cual. Resuelve contra semantic.focus -- el MISMO rol que
       ya usa el anillo GLOBAL (GlobalStyles.tsx, outline 2px + offset 2px) --
       para que halo y anillo compartan tono en los dos temas sin inventar un
       rol nuevo. Es ADITIVO, nunca sustituye el anillo: el outline sigue
       viviendo intacto en GlobalStyles, esto es una capa aparte (box-shadow,
       propiedad distinta) que ocupa el área justo después de esos 4px
       (2px de ancho + 2px de offset), como un segundo halo más suave. Sin
       transition propia a propósito: aparece tan instantáneo como el propio
       outline (que tampoco se transiciona por defecto), así que no hace
       falta guard de prefers-reduced-motion -- esa regla dura solo aplica a
       transiciones/animaciones que sí existen. */
    const focusHalo = css`
      box-shadow: 0 0 0 4px
        color-mix(in oklch, ${theme.data.semantic.focus} 35%, transparent);
    `;
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
        &:focus-visible {
          ${focusHalo}
        }
      `;
    if ($variant === "soft")
      return css`
        background: color-mix(in oklch, ${a} 12%, transparent);
        color: ${a};
        &:hover:not(:disabled) {
          background: color-mix(in oklch, ${a} 20%, transparent);
        }
        &:focus-visible {
          ${focusHalo}
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
        /* Aquí el halo no puede reusar focusHalo suelto: box-shadow no
           fusiona entre declaraciones distintas (la última gana entera), así
           que perdería el anillo inset propio de outline. Se combinan las
           dos capas en la MISMA declaración, separadas por coma -- la
           sintaxis estándar de box-shadow para apilar sombras. */
        &:focus-visible {
          box-shadow:
            inset 0 0 0 1px ${theme.data.semantic.borderStrong},
            0 0 0 4px
              color-mix(in oklch, ${theme.data.semantic.focus} 35%, transparent);
        }
      `;
    return css`
      background: transparent;
      color: ${a};
      &:hover:not(:disabled) {
        background: color-mix(in oklch, ${a} 10%, transparent);
      }
      &:focus-visible {
        ${focusHalo}
      }
    `;
  }}

  /* Únicas dos primitivas de movimiento del sistema: press y hover-lift.
     Ningún componente inventa su propia duración/curva: salen de motion.
     :not(:disabled) no casa nunca con un <a> (la pseudo-clase :disabled
     solo aplica a form controls), así que el ancla deshabilitada necesita
     su propia exclusión vía [aria-disabled="true"]. */
  &:hover:not(:disabled):not([aria-disabled="true"]) {
    transform: translateY(-2px);
  }
  &:active:not(:disabled):not([aria-disabled="true"]) {
    transform: scale(0.98);
  }
  /* disabled nativo (button) + aria-disabled (ancla, que no admite el
     atributo disabled — ver Button.tsx). pointer-events: none bloquea la
     activación por puntero en ambos casos; en el <a> es lo único que
     realmente impide el click, ya que aria-disabled es solo semántica. */
  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
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
  href,
  ...rest
}: ButtonProps): ReactElement {
  const isDisabled = disabled || loading;
  // Sin `as` (o `as="button"`) se renderiza un <button> nativo: el atributo
  // `disabled` funciona de verdad ahí. Cualquier otro elemento (típicamente
  // `as="a"`) NO admite `disabled` — React emitiría `disabled=""`, HTML
  // inválido que no bloquea foco, Enter, click ni la pseudo-clase
  // `:disabled`. Para esos casos se simula el estado con aria-disabled +
  // tabIndex=-1 + retirar el href, y el bloqueo real de click lo da
  // `pointer-events: none` (ver ScButton).
  const isButtonElement = asProp === undefined || asProp === "button";

  // ScButton es `styled.button`: styled-components solo resuelve el overload
  // de <a> para `as` cuando el valor es un literal en el propio JSX, no una
  // variable — así que su ref queda tipado a HTMLButtonElement pase lo que
  // pase por `asProp`. En runtime el nodo es un HTMLAnchorElement cuando
  // as="a"; este wrapper reenvía ese nodo (subtipo) al ref público, que
  // acepta la unión — un ensanchamiento de tipo válido, sin ningún cast.
  const setRef = (node: HTMLButtonElement | null): void => {
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // `href` no existe en ButtonHTMLAttributes<HTMLButtonElement> (ScButton es
  // `styled.button`), así que no puede pasarse como atributo JSX nombrado
  // sin que tsc lo rechace. Se reintroduce vía spread — igual que ya viaja
  // el resto de props propias de <a> a través de `rest` — para retirarlo de
  // verdad cuando el ancla está deshabilitada.
  const hrefProps = isDisabled && !isButtonElement ? {} : { href };

  return (
    <ScButton
      as={asProp}
      ref={setRef}
      $variant={variant}
      $intent={intent}
      $size={size}
      aria-busy={loading || undefined}
      disabled={isButtonElement ? isDisabled : undefined}
      aria-disabled={!isButtonElement && isDisabled ? true : undefined}
      tabIndex={!isButtonElement && isDisabled ? -1 : undefined}
      {...hrefProps}
      {...rest}
    >
      {loading && <ScSpinner aria-hidden="true" />}
      <ScLabel $hidden={loading}>{children}</ScLabel>
    </ScButton>
  );
}
