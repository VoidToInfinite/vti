export type WrapperType = "modal" | "notify";

export interface IWrapper {
  id: string;
  children?: React.ReactNode | React.ReactNode[];
  wrapperType: WrapperType;
}
