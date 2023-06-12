/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { DefaultTheme } from "styled-components";

function useThemeSwitcher(key: string) {
  const [theme, setTheme] = useState<DefaultTheme>(() => {
    const storageTheme = localStorage.getItem(key)!;
    const themeN: DefaultTheme = JSON.parse(storageTheme);
    return themeN;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(theme));
  }, [key, theme]);

  return [theme, setTheme];
}

export default useThemeSwitcher;
