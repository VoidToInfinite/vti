import { HTMLAttributes } from "react";
import { AppGlobalProps } from "@/global/AppGlobal.types";

export type CustomLinkProps = {
  // add custom properties
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  shallow?: boolean;
  target?: string;
} & HTMLAttributes<HTMLAnchorElement> &
  AppGlobalProps;
