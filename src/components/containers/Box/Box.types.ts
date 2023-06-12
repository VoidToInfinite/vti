import { AppGlobalProps } from "@/global/AppGlobal.types";
import { IBackground } from "@/types/Background.types";
import { IBox } from "@/types/Box.types";
import { IHeightWidth } from "@/types/HeightWidth.types";
import { IMarginPadding } from "@/types/MarginPadding.types";

interface BoxProps
  extends AppGlobalProps,
    IMarginPadding,
    IHeightWidth,
    IBackground,
    IBox {
  // Additional properties
  id?: string;
  className?: string;
}

export default BoxProps;
