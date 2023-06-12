import { INotification } from "@/components/featured/PopupNotification/PopupNotification.types";
import { createSlice } from "@reduxjs/toolkit";
import { addNotification, setNotifications } from "./actions";

// Define a type for the slice state
export interface INotificationsState {
  notifications: INotification[];
}

// Define the initial state using that type
const initialState: INotificationsState = {
  notifications: [],
};

/**
 * `createSlice` will infer the state type from the `initialState` argument
 */
export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(addNotification, (state, action) => {
      state.notifications.push(action.payload);
    });
    builder.addCase(setNotifications, (state, action) => {
      return {
        ...state,
        notifications: action.payload,
      };
    });
  },
});

export default notificationsSlice.reducer;
