import React from "react";
import ScBox from "./Box.sc";
import BoxProps from "./Box.types";

const Box: React.FC<BoxProps> = ({
  children,
  id,
  className,
  maxWidth,
  minWidth,
  width,
  maxHeight,
  minHeight,
  height,
  padding,
  backgroundColor,
  alignSelf,
  justifySelf,
  flex,
  flexBasis,
  flexGrow,
  flexShrink,
  gridArea,
  gridColumn,
  gridColumnStart,
  gridColumnEnd,
  gridRow,
  gridRowStart,
  gridRowEnd,
}) => (
  <ScBox
    id={id}
    className={className}
    maxWidth={maxWidth}
    minWidth={minWidth}
    width={width}
    maxHeight={maxHeight}
    minHeight={minHeight}
    height={height}
    padding={padding}
    backgroundColor={backgroundColor}
    alignSelf={alignSelf}
    justifySelf={justifySelf}
    flex={flex}
    flexBasis={flexBasis}
    flexGrow={flexGrow}
    flexShrink={flexShrink}
    gridArea={gridArea}
    gridColumn={gridColumn}
    gridColumnStart={gridColumnStart}
    gridColumnEnd={gridColumnEnd}
    gridRow={gridRow}
    gridRowStart={gridRowStart}
    gridRowEnd={gridRowEnd}
  >
    {children}
  </ScBox>
);

export default Box;
