"use client";

import styled, { css } from "styled-components";
import Length from "@/types/Length.types";
import { TypographyType } from "./Typography.types";

export interface ScTypographyProps {
  type?: TypographyType;
}

const getFontStyles = (
  fontSize: Length,
  lineHeight: Length,
  padding?: Length[]
) => css`
  font-size: ${fontSize};
  line-height: ${lineHeight};
  ${padding &&
  css`
    padding: ${padding.join(" ")};
  `}
`;

const titleStyles = css`
  font-family: ${({ theme }) => theme.data.typography.main.font};
`;

const textStyles = css`
  font-family: ${({ theme }) => theme.data.typography.secondary.font};
`;

const getTitleStyles = (size: Length) => css`
  ${titleStyles}
  ${getFontStyles(size, size)}
`;

const getTextStyles = (size: Length) => css`
  ${textStyles}
  ${getFontStyles(size, size)}
`;

const H1Styles = css`
  ${getTitleStyles("96px")}
  display: block;
  overflow: hidden;

  font-weight: 300;
  letter-spacing: -1.5px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("124.8px", "124.8px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("144px", "144px")}
  }
`;

const H1NavTitle = css`
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: default;
`;

const TYPOGRAPHY_TYPE = {
  h1: H1Styles,
  h2: "",
  h3: "",
  h4: "",
  h5: "",
  h6: "",
  p1: "",
  p2: "",
  h1NavTitle: H1NavTitle,
  pHeroTitle: "",
  pHeroText: "",
  pCardTitle: "",
  pCardSubtitle: "",
  pCardText: "",
};

export const ScTitleH1 = styled.h1<ScTypographyProps>`
  /* Definir estilos por tamaño */
  ${({ type }) => (type ? TYPOGRAPHY_TYPE[type] : H1Styles)}
`;

export const ScTitleH2 = styled.h2<ScTypographyProps>`
  ${getFontStyles("60px", "62px")}

  font-weight: 300;
  letter-spacing: -0.5px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("78px", "78px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("90px", "90px")}
  }
`;

export const ScTitleH3 = styled.h3<ScTypographyProps>`
  ${getTitleStyles("48px")}

  font-weight: 400;
  letter-spacing: 0px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("62.4px", "62.4px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("72px", "72px")}
  }
`;

export const ScTitleH4 = styled.h4<ScTypographyProps>`
  ${getTitleStyles("34px")}

  font-weight: 400;
  letter-spacing: 0.25px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("44.2px", "44.2px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("51px", "51px")}
  }
`;

export const ScTitleH5 = styled.h5<ScTypographyProps>`
  ${getTitleStyles("24px")}

  font-weight: 400;
  letter-spacing: 0px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("31.2px", "31.2px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("36px", "36px")}
  }
`;

export const ScTitleH6 = styled.h6<ScTypographyProps>`
  ${getTitleStyles("20px")}

  font-weight: 300;
  letter-spacing: 0.15px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("26px", "26px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("30px", "30px")}
  }
`;

export const ScHeroTitle = styled.p<ScTypographyProps>`
  ${getFontStyles("2.5rem", "2.4rem", ["1.5rem", "0rem"])}

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("3rem", "2.8rem", ["2rem", "0rem", "1.5rem", "0rem"])}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("4rem", "3.8rem", ["2rem", "0rem"])}
  }

  @media ${({ theme }) => theme.data.breakPoint.xl} {
    ${getFontStyles("5.5rem", "5.3rem", ["2rem", "0rem", "1rem", "0rem"])}
  }
`;

export const ScHeroText = styled.p<ScTypographyProps>`
  ${getFontStyles("15px", "1.8rem", ["1rem", "0.25rem"])}
  margin: 0px auto;
  text-align: center;
  hyphens: none;
  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("1.25rem", "2.2rem", ["1rem", "0rem"])}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("1.5rem", "2.2rem", ["2rem", "0rem"])}
  }
`;

export const ScText1 = styled.p<ScTypographyProps>`
  ${getTextStyles("14px")}
  ${getFontStyles("14px", "1.25rem")}
  font-weight: 400;
  letter-spacing: 0.25px;

  @media ${({ theme }) => theme.data.breakPoint.sm} {
    ${getFontStyles("16px", "1.5rem")}
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("1.25rem", "1.75rem", ["1rem", "0rem"])}
  }
`;

export const ScText2 = styled.p<ScTypographyProps>`
  ${getTextStyles("0.875rem")}
  ${getFontStyles("0.875rem", "1rem")}
  letter-spacing: 0.25px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("0.875rem", "1rem", ["1rem", "0rem"])}
  }
`;

export const ScCardTitle = styled(ScTitleH4)`
  ${getFontStyles("1.5rem", "2rem", ["0.5rem", "0rem"])}

  font-weight: 400;
  letter-spacing: 0.25px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("44.2px", "44.5px")}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("51px", "52px")}
  }
`;

export const ScCardText = styled(ScText1)`
  color: ${({ theme }) => theme.data.typography.secondary.font};
`;

export const ScSubtitle = styled(ScText1)`
  ${getFontStyles("0.9rem", "0.9rem", ["4px", "0px"])}
  color: ${({ theme }) => theme.data.typography.tertiaryColor[500]};
  letter-spacing: 0.15px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    ${getFontStyles("1rem", "1rem", ["6px", "0px"])}
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${getFontStyles("1.1rem", "1.1rem", ["8px", "0px"])}
  }
`;
