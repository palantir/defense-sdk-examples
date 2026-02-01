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
import type { RootState } from "../../store";

// Target board selectors
export const selectTargetBoards = (state: RootState) => state.targeting.boards;
export const selectTargetBoardsLoading = (state: RootState) =>
  state.targeting.loadingBoards;
export const selectTargetBoardsError = (state: RootState) =>
  state.targeting.boardsError;

// Used for fetching target boards - added as compatibility for the targetingSagas
export const selectCurrentUserId = (state: RootState) => null; // This will be obtained from user state instead

// Target selectors
export const selectLoadedTargetBoard = (state: RootState) =>
  state.targeting.loadedTargetBoardArtifactId;
export const selectTargetBoardTargets = (state: RootState) =>
  state.targeting.targetBoardTargets;
export const selectTargetBoardColumns = (state: RootState) =>
  state.targeting.targetBoardColumns;
export const selectLoadedTarget = (state: RootState) =>
  state.targeting.loadedTargetRid;

// Response/error selectors
export const selectCreateTargetResponse = (state: RootState) =>
  state.targeting.createTargetResponse;
export const selectCreateTargetError = (state: RootState) =>
  state.targeting.createTargetError;
export const selectAddObservationResponse = (state: RootState) =>
  state.targeting.addObservationResponse;
export const selectAddObservationError = (state: RootState) =>
  state.targeting.addObservationError;

// Loading state selectors
export const selectLoading = (state: RootState) => state.targeting.loading;
export const selectLoadingSingleTarget = (state: RootState) =>
  state.targeting.loadingSingleTarget;
export const selectLoadingObservation = (state: RootState) =>
  state.targeting.loadingObservation;
