import { createSlice } from "@reduxjs/toolkit";
import { DefaultTheme } from "styled-components";
import { ThemeList } from "@/themes/Themes";
import toggleTheme from "./actions";

// Define a type for the slice state
export interface IThemeState {
  theme: DefaultTheme;
}

// Define the initial state using that type
const initialState: IThemeState = {
  theme: ThemeList.BasicLightTheme,
};

/**
 * `createSlice` will infer the state type from the `initialState` argument
 */
export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(toggleTheme, (state, action) => {
      return {
        ...state,
        theme: action.payload,
      };
    });
  },
});

export default themeSlice.reducer;
