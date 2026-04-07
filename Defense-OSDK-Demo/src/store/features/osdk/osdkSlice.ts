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

import { User } from "@osdk/foundry.admin";
import { unit, elint, collateralConcernCandidateWithGeometry, trackedEntity } from "@defense-osdk/sdk";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { castDraft } from "immer";

export interface UnitHierarchyData {
  parents: unit.OsdkInstance[];
  children: unit.OsdkInstance[];
}


interface OsdkState {

  user: User | null;
  loadingUser: boolean;
  userError: string | null;

  units: unit.OsdkInstance[];
  loadingUnits: boolean;
  unitsError: string | null;

  elints: elint.OsdkInstance[];
  loadingElints: boolean;
  elintsError: string | null;

  collateralConcerns: collateralConcernCandidateWithGeometry.OsdkInstance[];
  loadingCollateralConcerns: boolean;
  collateralConcernsError: string | null;

  unitLocations: Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>;

  selectedUnit: unit.OsdkInstance | null;
  loadingUnitLocations: boolean;
  unitLocationsError: string | null;

  loadingMapData: boolean;

  unitHierarchy: UnitHierarchyData | null;
  loadingUnitHierarchy: boolean;
  unitHierarchyError: string | null;

  selectedElint: elint.OsdkInstance | null;
  associatingElint: boolean;
  elintAssociationError: string | null;

  associatedElints: elint.OsdkInstance[];
  loadingAssociatedElints: boolean;
  associatedElintsError: string | null;

  trackedEntityObservations: trackedEntity.OsdkInstance[];
  loadingTrackedEntityObservations: boolean;
  trackedEntityObservationsError: string | null;
}

const initialState: OsdkState = {
  user: null,
  loadingUser: false,
  userError: null,

  units: [],
  loadingUnits: false,
  unitsError: null,

  elints: [],
  loadingElints: false,
  elintsError: null,

  collateralConcerns: [],
  loadingCollateralConcerns: false,
  collateralConcernsError: null,

  unitLocations: [],
  loadingUnitLocations: false,
  unitLocationsError: null,

  selectedUnit: null,

  loadingMapData: false,

  unitHierarchy: null,
  loadingUnitHierarchy: false,
  unitHierarchyError: null,

  selectedElint: null,
  associatingElint: false,
  elintAssociationError: null,

  associatedElints: [],
  loadingAssociatedElints: false,
  associatedElintsError: null,

  trackedEntityObservations: [],
  loadingTrackedEntityObservations: false,
  trackedEntityObservationsError: null,
};

const osdkSlice = createSlice({
  name: "osdk",
  initialState,
  reducers: {
    loadUser: (state) => {
      state.loadingUser = true,
      state.user = null
    },
    setUser: (state, action: PayloadAction<User | null>) =>  {
      state.user = action.payload;
      state.loadingUser = false;
    },
    setUserError: (state, action: PayloadAction<string>) => {
      state.userError = action.payload;
      state.loadingUser = false;
    },

    loadUnits: (state) => {
      state.loadingUnits = true;
      state.unitsError = null;
    },
    setUnits: (state, action: PayloadAction<unit.OsdkInstance[]>) => {
      state.units = castDraft(action.payload);
      state.loadingUnits = false;
    },
    setUnitsError: (state, action: PayloadAction<string>) => {
      state.unitsError = action.payload;
      state.loadingUnits = false;
    },

    loadElints: (state) => {
      state.loadingElints = true;
      state.elintsError = null;
    },
    setElints: (state, action: PayloadAction<elint.OsdkInstance[]>) => {
      state.elints = castDraft(action.payload);
      state.loadingElints = false;
    },
    setElintsError: (state, action: PayloadAction<string>) => {
      state.elintsError = action.payload;
      state.loadingElints = false;
    },

    loadCollateralConcerns: (state) => {
      state.loadingCollateralConcerns = true;
      state.collateralConcernsError = null;
    },
    setCollateralConcerns: (state, action: PayloadAction<collateralConcernCandidateWithGeometry.OsdkInstance[]>) => {
      state.collateralConcerns = castDraft(action.payload);
      state.loadingCollateralConcerns = false;
    },
    setCollateralConcernsError: (state, action: PayloadAction<string>) => {
      state.collateralConcernsError = action.payload;
      state.loadingCollateralConcerns = false;
    },

    loadUnitLocations: (state) => {
      state.loadingUnitLocations = true;
      state.unitLocationsError = null;
    },
    setUnitLocations: (state, action: PayloadAction<Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>>) => {
      state.unitLocations = castDraft(action.payload);
      state.loadingUnitLocations = false;
    },
    setUnitLocationsError: (state, action: PayloadAction<string>) => {
      state.unitLocationsError = action.payload;
      state.loadingUnitLocations = false;
    },

    selectUnit: (state, action: PayloadAction<unit.OsdkInstance>) => {
      state.selectedUnit = castDraft(action.payload);
    },
    clearSelectedUnit: (state) => {
      state.selectedUnit = null;
      state.associatedElints = [];
      state.loadingAssociatedElints = false;
      state.associatedElintsError = null;
      state.trackedEntityObservations = [];
      state.loadingTrackedEntityObservations = false;
      state.trackedEntityObservationsError = null;
    },

    loadMapData: (state) => {
      state.loadingMapData = true;
    },
    startLoadingMapData: (state) => {
      state.loadingMapData = true;
    },
    finishLoadingMapData: (state) => {
      state.loadingMapData = false;
    },

    loadUnitHierarchy: (state, _action: PayloadAction<unit.OsdkInstance>) => {
      state.loadingUnitHierarchy = true;
      state.unitHierarchyError = null;
    },
    setUnitHierarchy: (state, action: PayloadAction<UnitHierarchyData>) => {
      state.unitHierarchy = castDraft(action.payload);
      state.loadingUnitHierarchy = false;
    },
    setUnitHierarchyError: (state, action: PayloadAction<string>) => {
      state.unitHierarchyError = action.payload;
      state.loadingUnitHierarchy = false;
    },
    clearUnitHierarchy: (state) => {
      state.unitHierarchy = null;
      state.loadingUnitHierarchy = false;
      state.unitHierarchyError = null;
    },

    selectElint: (state, action: PayloadAction<elint.OsdkInstance>) => {
      state.selectedElint = castDraft(action.payload);
    },
    clearSelectedElint: (state) => {
      state.selectedElint = null;
    },

    associateElintWithUnit: (state, _action: PayloadAction<{ elint: elint.OsdkInstance; unit: unit.OsdkInstance }>) => {
      state.associatingElint = true;
      state.elintAssociationError = null;
    },
    setElintAssociationSuccess: (state) => {
      state.associatingElint = false;
      state.selectedElint = null;
    },
    setElintAssociationError: (state, action: PayloadAction<string>) => {
      state.associatingElint = false;
      state.elintAssociationError = action.payload;
      state.selectedElint = null;
    },

    loadAssociatedElints: (state, _action: PayloadAction<unit.OsdkInstance>) => {
      state.loadingAssociatedElints = true;
      state.associatedElintsError = null;
    },
    setAssociatedElints: (state, action: PayloadAction<elint.OsdkInstance[]>) => {
      state.associatedElints = castDraft(action.payload);
      state.loadingAssociatedElints = false;
    },
    setAssociatedElintsError: (state, action: PayloadAction<string>) => {
      state.associatedElintsError = action.payload;
      state.loadingAssociatedElints = false;
    },
    clearAssociatedElints: (state) => {
      state.associatedElints = [];
      state.loadingAssociatedElints = false;
      state.associatedElintsError = null;
    },

    loadTrackedEntityObservations: (state, _action: PayloadAction<unit.OsdkInstance>) => {
      state.loadingTrackedEntityObservations = true;
      state.trackedEntityObservationsError = null;
    },
    setTrackedEntityObservations: (state, action: PayloadAction<trackedEntity.OsdkInstance[]>) => {
      state.trackedEntityObservations = castDraft(action.payload);
      state.loadingTrackedEntityObservations = false;
    },
    setTrackedEntityObservationsError: (state, action: PayloadAction<string>) => {
      state.trackedEntityObservationsError = action.payload;
      state.loadingTrackedEntityObservations = false;
    },
    clearTrackedEntityObservations: (state) => {
      state.trackedEntityObservations = [];
      state.loadingTrackedEntityObservations = false;
      state.trackedEntityObservationsError = null;
    },
  },
});

export const {
  loadUser,
  setUser,
  setUserError,

  loadUnits,
  setUnits,
  setUnitsError,

  loadElints,
  setElints,
  setElintsError,

  loadCollateralConcerns,
  setCollateralConcerns,
  setCollateralConcernsError,

  loadUnitLocations,
  setUnitLocations,
  setUnitLocationsError,

  selectUnit,
  clearSelectedUnit,

  loadMapData,
  startLoadingMapData,
  finishLoadingMapData,

  loadUnitHierarchy,
  setUnitHierarchy,
  setUnitHierarchyError,
  clearUnitHierarchy,

  selectElint,
  clearSelectedElint,
  associateElintWithUnit,
  setElintAssociationSuccess,
  setElintAssociationError,

  loadAssociatedElints,
  setAssociatedElints,
  setAssociatedElintsError,
  clearAssociatedElints,

  loadTrackedEntityObservations,
  setTrackedEntityObservations,
  setTrackedEntityObservationsError,
  clearTrackedEntityObservations,

} = osdkSlice.actions;

export default osdkSlice.reducer;
