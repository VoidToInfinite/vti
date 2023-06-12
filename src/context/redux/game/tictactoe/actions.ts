import { createAction } from "@reduxjs/toolkit";

const PLACE_PIECE = "PLACE_PIECE";

interface IPlacePiece {
  position: { column: number; row: number };
  action: string;
}

const placePiece = createAction<IPlacePiece>(PLACE_PIECE);

export default placePiece;
