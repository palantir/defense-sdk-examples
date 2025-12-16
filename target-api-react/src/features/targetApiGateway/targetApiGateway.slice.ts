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

interface TargetApiGatewayState {
  loadedTargetBoardArtifactId: string | null;
  targetBoardTargets: Target[];
  targetBoardColumns: string[];
  loadedTargetRid: string;
  createTargetResponse: any | null;
  addObservationResponse: any | null;
  createTargetError: string | null;
  addObservationError: string | null;
  loading: boolean;
}

const initialState: TargetApiGatewayState = {
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
};

const targetApiGatewaySlice = createSlice({
  name: "targetApiGateway",
  initialState,
  reducers: {
    loadTargets: (state) => {
      state.loading = true;
    },
    loadTargetsWithoutLoading: (state) => {
      state.loading = true;
    },
    loadTarget: (_state) => {},
    createTarget: (state, _action: PayloadAction<CreateTargetPayload>) => {
      state.loading = true;
    },
    addObservation: (state, _action: PayloadAction<AddObservationPayload>) => {
      state.loading = true;
    },
    setSelectedTargetBoard: (state, action: PayloadAction<string>) => {
      state.loadedTargetBoardArtifactId = action.payload;
    },
    setTargets: (state, action: PayloadAction<Target[]>) => {
      state.targetBoardTargets = action.payload;
      state.loading = false;
    },
    setTargetBoardColumns: (state, action: PayloadAction<string[]>) => {
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
      state.loading = false;
    },
    setCreateTargetError: (state, action: PayloadAction<string | null>) => {
      state.createTargetError = action.payload;
      state.loading = false;
    },
    setAddObservationError: (state, action: PayloadAction<string | null>) => {
      state.addObservationError = action.payload;
      state.loading = false;
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
  loadTargets,
  loadTargetsWithoutLoading,
  loadTarget,
  createTarget,
  addObservation,
  setSelectedTargetBoard,
  setTargets,
  setSelectedTarget,
  setCreateTargetResponse,
  setAddObservationResponse,
  setCreateTargetError,
  setAddObservationError,
  clearCreateTargetResponse,
  clearAddObservationResponse,
  setTargetBoardColumns,
} = targetApiGatewaySlice.actions;

export default targetApiGatewaySlice.reducer;
