import thunk from "redux-thunk";
import { Middleware, configureStore } from "@reduxjs/toolkit";
import logger from "./logger";
import combinedReducer from "./RootReducer";

const middlewares: Middleware[] = [thunk];

if (process.env.NODE_ENV === "development") {
  // Agregar logger
  middlewares.push(logger);
}

export const AppStore = configureStore({
  devTools: process.env.NODE_ENV !== "production",
  enhancers: [(defaultEnhancers) => defaultEnhancers],
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(middlewares),
  reducer: combinedReducer,
});

export type RootState = ReturnType<typeof AppStore.getState>;
export type AppDispatch = typeof AppStore.dispatch;
