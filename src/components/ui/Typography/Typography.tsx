import type { ElementType, ReactNode } from "react";
import styled, { css } from "styled-components";

export type TypographyVariant = "h1" | "h2" | "h3" | "lead" | "body";

interface TypographyProps {
  variant: TypographyVariant;
  children: ReactNode;
  className?: string;
}

const variantElement: Record<TypographyVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  lead: "p",
  body: "p",
};

const variantStyles = {
  h1: css`
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    line-height: 1.1;
  `,
  h2: css`
    font-size: clamp(1.5rem, 3.5vw, 2.25rem);
    font-weight: 600;
    line-height: 1.2;
  `,
  h3: css`
    font-size: clamp(1.15rem, 2.5vw, 1.5rem);
    font-weight: 600;
    line-height: 1.3;
  `,
  lead: css`
    font-size: clamp(1.05rem, 1.5vw, 1.25rem);
    font-weight: 400;
    line-height: 1.6;
  `,
  body: css`
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.6;
  `,
};

const ScTypography = styled.p<{ $variant: TypographyVariant }>`
  margin: 0;
  font-family: ${({ theme }) => theme.data.typography.main.font};
  color: ${({ theme }) => theme.data.typography.primaryColor[500]};
  ${({ $variant }) => variantStyles[$variant]}
`;

export function Typography({ variant, children, className }: TypographyProps) {
  return (
    <ScTypography
      as={variantElement[variant]}
      $variant={variant}
      className={className}
    >
      {children}
    </ScTypography>
  );
}
