export type TypographyType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "h1NavTitle"
  | "p1"
  | "p2"
  | "pHeroTitle"
  | "pHeroText"
  | "pCardTitle"
  | "pCardSubtitle"
  | "pCardText";

interface ITypography {
  id?: string;
  type: TypographyType;
  value: string;
}

export default ITypography;
