import React from "react";
import ScWrapper from "./Wrapper.sc";
import { IWrapper } from "./Wrapper.types";

const Wrapper: React.FC<IWrapper> = ({
  id,
  children,
  wrapperType = "modal",
}) => (
  <ScWrapper
    id={id}
    wrapperType={wrapperType}
  >
    {children}
  </ScWrapper>
);

export default Wrapper;
