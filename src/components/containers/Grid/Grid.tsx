import React from "react";
import ScGrid from "./Grid.sc";
import type { GridProps } from "./Grid.types";

/* eslint-disable react/jsx-props-no-spreading */
const Grid: React.FC<GridProps> = ({
  children,
  container,
  alignContent,
  justifyItems,
  columnGap,
  rowGap,
  gap,
  gridAutoFlow,
  gridAutoColumns,
  gridAutoRows,
  gridGap,
  gridColumnGap,
  gridRowGap,
  gridTemplate,
  gridTemplateAreas,
  gridTemplateColumns,
  gridTemplateRows,
  ...props
}) => (
  <ScGrid
    container={container}
    alignContent={alignContent}
    justifyItems={justifyItems}
    columnGap={columnGap}
    rowGap={rowGap}
    gap={gap}
    gridGap={gridGap}
    gridAutoColumns={gridAutoColumns}
    gridAutoFlow={gridAutoFlow}
    gridAutoRows={gridAutoRows}
    gridTemplate={gridTemplate}
    gridColumnGap={gridColumnGap}
    gridRowGap={gridRowGap}
    gridTemplateAreas={gridTemplateAreas}
    gridTemplateColumns={gridTemplateColumns}
    gridTemplateRows={gridTemplateRows}
    {...props}
  >
    {children}
  </ScGrid>
);

export default Grid;
