/*
 * (c) Copyright 2024 Palantir Technologies Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export interface TargetBoard {
  rid: string;
  title: string;
}

interface TargetBoardsState {
  boards: TargetBoard[];
  loading: boolean;
  error: string | null;
  userId: string | null;
}

const initialState: TargetBoardsState = {
  boards: [],
  loading: false,
  error: null,
  userId: null,
};

const targetBoardsSlice = createSlice({
  name: "targetBoards",
  initialState,
  reducers: {
    loadTargetBoards: (state) => {
      state.loading = true;
      state.error = null;
    },
    setTargetBoards: (state, action: PayloadAction<TargetBoard[]>) => {
      state.boards = action.payload;
      state.loading = false;
    },
    setTargetBoardsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setCurrentUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
  },
});

// Export actions
export const {
  loadTargetBoards,
  setTargetBoards,
  setTargetBoardsError,
  setCurrentUserId,
} = targetBoardsSlice.actions;

// Export selectors
export const selectTargetBoards = (state: RootState) =>
  state.targetBoards.boards;
export const selectTargetBoardsLoading = (state: RootState) =>
  state.targetBoards.loading;
export const selectTargetBoardsError = (state: RootState) =>
  state.targetBoards.error;
export const selectCurrentUserId = (state: RootState) =>
  state.targetBoards.userId;

export default targetBoardsSlice.reducer;
