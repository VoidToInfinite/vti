import type { ElementType } from "react";
import styled from "styled-components";

const ScBrandName = styled.span`
  display: inline-flex;
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.data.semantic.text};
`;

interface BrandNameProps {
  /**
   * Polymorphic tag override (styled-components' built-in `as` prop, so it
   * never leaks onto the DOM node as a literal `as` attribute). Defaults to
   * `span`. Pass `"h1"` for the one place per page that should render the
   * brand as the page's main heading (e.g. the Hero).
   */
  as?: ElementType;
}

export function BrandName({ as }: BrandNameProps) {
  return <ScBrandName as={as}>VoidToInfinite</ScBrandName>;
}
