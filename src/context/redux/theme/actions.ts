import { createAction } from "@reduxjs/toolkit";
import { DefaultTheme } from "styled-components";
import TOGGLE_THEME from "@/constants/theme";

// Non-String Action Types
// const S_TOGGLE_THEME = Symbol(TOGGLE_THEME);

/**
 * ThemeReducer action: TOGGLE_THEME
 */
const toggleTheme = createAction(TOGGLE_THEME, (theme: DefaultTheme) => {
  return {
    payload: theme,
    debounce: 300,
  };
});

export default toggleTheme;
