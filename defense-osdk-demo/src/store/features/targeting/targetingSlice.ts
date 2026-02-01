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

// Target related types
export interface Target {
  rid: string;
  name: string;
  column: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
    elevation: number;
  };
  baseRevisionId: number;
}

export interface CreateTargetPayload {
  classificationMarkings: string[];
  targetType?: string;
  name: string;
  longitude: number;
  description?: string;
  observationTimestamp: string;
  targetBoardId: string;
  latitude: number;
  radius: number;
  column: string;
  entityId?: string; // Optional ID for the target entity, will be auto-generated if not provided
}

export interface AddObservationPayload {
  longitude: number;
  targetId: string;
  name: string;
  latitude: number;
  radius: number;
  elevation: number;
  baseRevisionId: number;
}

export interface ColumnInfo {
  id: string; // Column ID (full primary key)
  shortId: string; // Short column ID used in API payloads (e.g. "DRAFT", "CLOSED")
  name: string; // Column name ($title)
}

// Target Board related types
export interface TargetBoard {
  rid: string;
  title: string;
}

// Main state interface
interface TargetingState {
  // Target board state
  boards: TargetBoard[];
  loadingBoards: boolean;
  boardsError: string | null;

  // Target state
  loadedTargetBoardArtifactId: string | null;
  targetBoardTargets: Target[];
  targetBoardColumns: ColumnInfo[];
  loadedTargetRid: string;
  createTargetResponse: any | null;
  addObservationResponse: any | null;
  createTargetError: string | null;
  addObservationError: string | null;
  loading: boolean;
  loadingSingleTarget: boolean;
  loadingObservation: boolean;
}

const initialState: TargetingState = {
  // Target board state
  boards: [],
  loadingBoards: false,
  boardsError: null,

  // Target state
  loadedTargetBoardArtifactId: null,
  targetBoardTargets: [],
  targetBoardColumns: [],
  loadedTargetRid:
    "ri.gotham-artifact.3736180562172569377-2123486733096639170.cosmos-situation.E1EMjnkk73B6GkYsAr",
  createTargetResponse: null,
  addObservationResponse: null,
  createTargetError: null,
  addObservationError: null,
  loading: false,
  loadingSingleTarget: false,
  loadingObservation: false,
};

const targetingSlice = createSlice({
  name: "targeting",
  initialState,
  reducers: {
    // Target board actions
    loadTargetBoards: (state) => {
      state.loadingBoards = true;
      state.boardsError = null;
    },
    setTargetBoards: (state, action: PayloadAction<TargetBoard[]>) => {
      state.boards = action.payload;
      state.loadingBoards = false;
    },
    setTargetBoardsError: (state, action: PayloadAction<string>) => {
      state.boardsError = action.payload;
      state.loadingBoards = false;
    },

    // Target actions
    loadTargets: (state) => {
      state.loading = true;
    },
    loadTarget: (state, _action: PayloadAction<string>) => {
      state.loadingSingleTarget = true;
    },
    createTarget: (state, _action: PayloadAction<CreateTargetPayload>) => {
      state.loading = true;
    },
    addObservation: (state, _action: PayloadAction<AddObservationPayload>) => {
      state.loading = true;
      state.loadingObservation = true;
    },
    setSelectedTargetBoard: (state, action: PayloadAction<string>) => {
      state.loadedTargetBoardArtifactId = action.payload;
    },
    setTargets: (state, action: PayloadAction<Target[]>) => {
      state.targetBoardTargets = action.payload;
      state.loading = false;
    },
    updateSingleTarget: (state, action: PayloadAction<Target>) => {
      const targetIndex = state.targetBoardTargets.findIndex(
        (target) => target.rid === action.payload.rid,
      );

      if (targetIndex >= 0) {
        // Update existing target
        state.targetBoardTargets[targetIndex] = action.payload;
      } else {
        // Add new target if it doesn't exist
        state.targetBoardTargets.push(action.payload);
      }
      state.loadingSingleTarget = false;
      state.loadingObservation = false;
      state.loading = false; // Reset loading state after target is updated
    },
    setTargetBoardColumns: (state, action: PayloadAction<ColumnInfo[]>) => {
      state.targetBoardColumns = action.payload;
    },
    setSelectedTarget: (state, action: PayloadAction<string>) => {
      state.loadedTargetRid = action.payload;
    },
    setCreateTargetResponse: (state, action: PayloadAction<any>) => {
      state.createTargetResponse = action.payload;
      state.loading = false;
    },
    setAddObservationResponse: (state, action: PayloadAction<any>) => {
      state.addObservationResponse = action.payload;
      // Keep loading true - we'll reset it after the delay and reload
    },
    setCreateTargetError: (state, action: PayloadAction<string | null>) => {
      state.createTargetError = action.payload;
      state.loading = false;
    },
    setAddObservationError: (state, action: PayloadAction<string | null>) => {
      state.addObservationError = action.payload;
      state.loading = false;
      state.loadingObservation = false;
    },
    clearCreateTargetResponse: (state) => {
      state.createTargetResponse = null;
    },
    clearAddObservationResponse: (state) => {
      state.addObservationResponse = null;
    },
  },
});

export const {
  // Target board actions
  loadTargetBoards,
  setTargetBoards,
  setTargetBoardsError,

  // Target actions
  loadTargets,
  loadTarget,
  createTarget,
  addObservation,
  setSelectedTargetBoard,
  setTargets,
  updateSingleTarget,
  setSelectedTarget,
  setCreateTargetResponse,
  setAddObservationResponse,
  setCreateTargetError,
  setAddObservationError,
  clearCreateTargetResponse,
  clearAddObservationResponse,
  setTargetBoardColumns,
} = targetingSlice.actions;

export default targetingSlice.reducer;
