import { IFlex } from "@/types/Flex.types";
import BoxProps from "../Box/Box.types";

export interface FlexProps extends BoxProps, IFlex {
  // flex properties
  container: boolean;
}
