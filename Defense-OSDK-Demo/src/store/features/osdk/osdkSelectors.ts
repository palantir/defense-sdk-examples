/*
 * (c) Copyright 2026 Palantir Technologies Inc. All rights reserved.
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

export const selectUser = (state: RootState) => state.osdk.user;
export const selectUserLoading = (state: RootState) => state.osdk.loadingUser;
export const selectUserError = (state: RootState) => state.osdk.userError;

export const selectUnits = (state: RootState) => state.osdk.units;
export const selectUnitsLoading = (state: RootState) =>
  state.osdk.loadingUnits;
export const selectUnitsError = (state: RootState) =>
  state.osdk.unitsError;

export const selectElints = (state: RootState) => state.osdk.elints;
export const selectCollateralConcerns = (state: RootState) => state.osdk.collateralConcerns;
export const selectUnitLocations = (state: RootState) => state.osdk.unitLocations;
export const selectLoadingMapData = (state: RootState) => state.osdk.loadingMapData;
export const selectSelectedUnit = (state: RootState) => state.osdk.selectedUnit;
export const selectAssociatingElint = (state: RootState) => state.osdk.associatingElint;
export const selectSelectedElint = (state: RootState) => state.osdk.selectedElint;
export const selectElintAssociationError = (state: RootState) => state.osdk.elintAssociationError;
export const selectAssociatedElints = (state: RootState) => state.osdk.associatedElints;
export const selectLoadingAssociatedElints = (state: RootState) => state.osdk.loadingAssociatedElints;
export const selectAssociatedElintsError = (state: RootState) => state.osdk.associatedElintsError;

export const selectUnitHierarchy = (state: RootState) => state.osdk.unitHierarchy;
export const selectLoadingUnitHierarchy = (state: RootState) => state.osdk.loadingUnitHierarchy;
export const selectUnitHierarchyError = (state: RootState) => state.osdk.unitHierarchyError;

export const selectTrackedEntityObservations = (state: RootState) => state.osdk.trackedEntityObservations;
export const selectLoadingTrackedEntityObservations = (state: RootState) => state.osdk.loadingTrackedEntityObservations;
export const selectTrackedEntityObservationsError = (state: RootState) => state.osdk.trackedEntityObservationsError;