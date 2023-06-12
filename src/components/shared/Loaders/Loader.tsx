"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/context/redux/store";
import Icon from "@/components/featured/Icon/Icon";
import { ScOrb, ScPageLoaderWraper } from "./Loader.sc";

const Loader = () => {
  const isLoaded: boolean = useSelector(
    (state: RootState) => state.page.isLoaded
  );
  return (
    <ScPageLoaderWraper className={isLoaded ? "d0n3" : ""}>
      <div>
        <Icon
          name="voidToInfinite"
          size={75}
          src="voidToInfinite"
          strokeWidth={1.5}
          title="Loading data..."
        />
        <ScOrb />
      </div>
    </ScPageLoaderWraper>
  );
};

export default Loader;
