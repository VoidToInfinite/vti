"use client";

import type { ElementType, ReactElement, ReactNode } from "react";
import styled from "styled-components";
import type { TypeVariant } from "@/theme/tokens/type";

/**
 * `lead` no existe en la escala nueva (`theme.data.type.scale`); se conserva
 * como alias de `bodyLg` para no romper a los consumidores actuales (Hero).
 * Su migración a `bodyLg` explícito es responsabilidad de la Task 15.
 */
export type TypographyVariant = TypeVariant | "lead";

const defaultElement: Partial<Record<TypeVariant, ElementType>> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  overline: "span",
  caption: "span",
  code: "code",
};

interface TypographyProps {
  variant: TypographyVariant;
  /** Override del elemento por defecto de la variante. */
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

const ScTypography = styled.p<{ $variant: TypeVariant }>`
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${({ theme, $variant }) => theme.data.type.scale[$variant].size};
  font-weight: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].weight};
  line-height: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].lineHeight};
  letter-spacing: ${({ theme, $variant }) =>
    theme.data.type.scale[$variant].tracking};
  ${({ $variant }) =>
    ($variant.startsWith("h") || $variant === "display") &&
    "text-wrap: balance;"}
`;

export function Typography({
  variant,
  as,
  children,
  className,
}: TypographyProps): ReactElement {
  const resolvedVariant: TypeVariant = variant === "lead" ? "bodyLg" : variant;
  const element: ElementType = as ?? defaultElement[resolvedVariant] ?? "p";
  return (
    <ScTypography
      as={element}
      $variant={resolvedVariant}
      className={className}
    >
      {children}
    </ScTypography>
  );
}
