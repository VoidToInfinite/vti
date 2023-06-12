/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AnyAction, combineReducers } from "@reduxjs/toolkit";
import { HYDRATE } from "next-redux-wrapper";
import ThemeReducer, { IThemeState } from "@/context/redux/theme/ThemeReducer";
import TicTacToeReducer, {
  ITicTacToeState,
} from "./game/tictactoe/TicTacToeReducer";
import NotificationsReducer, {
  INotificationsState,
} from "./notifications/NotificationsReducer";
import PageReducer, { IPageState } from "./PageReducer";

export interface AppState {
  notifications: INotificationsState;
  page: IPageState;
  theme: IThemeState;
  ticTacToe: ITicTacToeState;
}

const combinedReducer = combineReducers<AppState>({
  notifications: NotificationsReducer,
  page: PageReducer,
  theme: ThemeReducer,
  ticTacToe: TicTacToeReducer,
});

export const rootReducer = (
  state: ReturnType<typeof combinedReducer>,
  action: AnyAction
) => {
  if (action.type === HYDRATE) {
    const nextState = {
      ...state, // use previous state
      ...action.payload, // apply delta from hydration
    };
    return nextState;
  }
  return combinedReducer(state, action);
};

export type RootReducerState = ReturnType<typeof combinedReducer>;
export default combinedReducer;
