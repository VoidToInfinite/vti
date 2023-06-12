"use client";

import React from "react";
import { Provider } from "react-redux";
import { AppStore } from "@/context/redux/store";
import AppThemeProvider from "@/providers/AppThemeProvider";
import { AppNotificationProvider } from "@/providers/AppNotificationProvider";
import GlobalStyles from "@/styles/GlobalStyles";
import "@/context/i18n/i18n";

interface IAppStore {
  children: React.ReactElement | React.ReactNode;
}

const AppProvider = ({ children }: IAppStore) => (
  <Provider store={AppStore}>
    <AppThemeProvider>
      <GlobalStyles />
      <AppNotificationProvider>{children}</AppNotificationProvider>
    </AppThemeProvider>
  </Provider>
);

export default AppProvider;
