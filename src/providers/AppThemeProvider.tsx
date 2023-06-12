"use client";

import React from "react";
import { useSelector } from "react-redux";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { RootState } from "@/context/redux/store";

interface IAppThemeProvider {
  children: React.ReactElement | React.ReactNode | React.ReactNode[];
}

const AppThemeProvider: React.FC<IAppThemeProvider> = ({ children }) => {
  const theme: DefaultTheme = useSelector(
    (state: RootState) => state.theme.theme
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default AppThemeProvider;
