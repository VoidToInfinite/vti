/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define a type for the slice state
export interface ITicTacToeState {
  board: string[][];
  currentPlayer: string;
  winner: string;
  position: { x: number; y: number };
}

// Define the initial state using that type
const initialState: ITicTacToeState = {
  board: [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ],
  currentPlayer: "X",
  winner: "",
  position: { x: 0, y: 0 },
};

export const tictactoeSlice = createSlice({
  name: "tictactoe",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    placePiece: (state, action: PayloadAction<ITicTacToeState>) => {
      const { position } = action.payload;
      const { currentPlayer } = state;
      const board = [...state.board];
      board[position.x][position.y] = currentPlayer;
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      state.currentPlayer = nextPlayer;
      state.board = board;
      return state;
    },
  },
});

export const { placePiece } = tictactoeSlice.actions;
export default tictactoeSlice.reducer;
