import React from "react";
import { DefaultTheme, StyledComponent } from "styled-components";
import ITypography, { TypographyType } from "./Typography.types";
import {
  ScTitleH1,
  ScTitleH2,
  ScTitleH3,
  ScTitleH4,
  ScTitleH5,
  ScTitleH6,
  ScCardText,
  ScCardTitle,
  ScText1,
  ScText2,
  ScSubtitle,
  ScHeroTitle,
  ScHeroText,
  ScTypographyProps,
} from "./Typography.sc";

/**
 * Switch case
 */
const TEXT_TYPE: Record<TypographyType, typeof ScText1> = {
  h1: ScTitleH1,
  h2: ScTitleH2,
  h4: ScTitleH4,
  h3: ScTitleH3,
  h5: ScTitleH5,
  h6: ScTitleH6,
  h1NavTitle: ScTitleH1,
  p1: ScText1,
  p2: ScText2,
  pHeroTitle: ScHeroTitle,
  pHeroText: ScHeroText,
  pCardTitle: ScCardTitle,
  pCardSubtitle: ScSubtitle,
  pCardText: ScCardText,
};

/**
 * Method to get the typography
 * @param type
 * @returns
 */
const getTypography = (type: TypographyType): typeof ScText1 => {
  const element = TEXT_TYPE[type];
  return element;
};

/**
 * JSX component
 * @param param0
 * @returns
 */
const Typography: React.FC<ITypography> = ({ id, type, value }) => {
  const TypographyElement: StyledComponent<
    "p",
    DefaultTheme,
    ScTypographyProps
  > = getTypography(type);
  return (
    <TypographyElement
      id={id}
      type={type}
    >
      {value}
    </TypographyElement>
  );
};

export default Typography;
