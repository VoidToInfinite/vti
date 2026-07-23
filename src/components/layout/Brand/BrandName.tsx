import styled from "styled-components";

const ScBrandName = styled.span`
  display: inline-flex;
  font-family: ${({ theme }) => theme.data.typography.main.font};
  font-size: 1em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.data.typography.primaryColor[500]};
`;

export function BrandName() {
  return <ScBrandName>VoidToInfinite</ScBrandName>;
}
