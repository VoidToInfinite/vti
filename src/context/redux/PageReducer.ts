/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define a type for the slice state
export interface IPageState {
  isLoaded: boolean;
}

// Define the initial state using that type
const initialState: IPageState = {
  isLoaded: false,
};

export const pageSlice = createSlice({
  name: "page",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setIsLoaded: (state, action: PayloadAction<boolean>) => {
      state.isLoaded = action.payload;
    },
  },
});

export const { setIsLoaded } = pageSlice.actions;
export default pageSlice.reducer;
