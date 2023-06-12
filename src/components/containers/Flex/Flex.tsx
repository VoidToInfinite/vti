import React from "react";
import ScFlex from "./Flex.sc";
import type { FlexProps } from "./Flex.types";

/* eslint-disable react/jsx-props-no-spreading */
const Flex: React.FC<FlexProps> = ({
  children,
  container,
  alignItems,
  justifyContent,
  flexDirection,
  flexWrap,
  gap,
  ...props
}) => (
  <ScFlex
    container={container}
    alignItems={alignItems}
    justifyContent={justifyContent}
    flexDirection={flexDirection}
    flexWrap={flexWrap}
    gap={gap}
    {...props}
  >
    {children}
  </ScFlex>
);

export default Flex;
