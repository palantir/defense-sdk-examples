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
import { RootState } from "../../store";

interface UiState {
  // Modal management
  modalContent: string | null;

  // Map context menu
  contextMenuLocation: { lat: number; lon: number } | null;

  // Selection state
  selectedTargetId: string | null;
}

const initialState: UiState = {
  modalContent: null,
  contextMenuLocation: null,
  selectedTargetId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setModalContent: (state, action: PayloadAction<string | null>) => {
      state.modalContent = action.payload;
    },
    setContextMenuLocation: (
      state,
      action: PayloadAction<{ lat: number; lon: number } | null>,
    ) => {
      state.contextMenuLocation = action.payload;
    },
    setSelectedTarget: (state, action: PayloadAction<string | null>) => {
      state.selectedTargetId = action.payload;
    },
  },
});

export const { setModalContent, setContextMenuLocation, setSelectedTarget } =
  uiSlice.actions;

export default uiSlice.reducer;
