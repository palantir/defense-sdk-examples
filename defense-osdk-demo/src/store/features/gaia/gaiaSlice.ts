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

// Define types for the Gaia Map API response
export interface GaiaMapMetadata {
  mapRid: string;
  mapGid: string;
  name: string;
  createdAt?: string;
  lastModified?: string;
  numLayers?: number;
  numElements?: number;
}

export interface SearchMapsResponse {
  results?: GaiaMapMetadata[];
  nextPageToken?: string;
}

// Define types for Load Map With Extension API
export type GaiaLayerId = string;

export interface GaiaLayerMetadata {
  id: GaiaLayerId;
  subLayerIds?: GaiaLayerId[];
  label?: string;
}

export interface LoadMapResponse {
  title: string;
  rootLayerIds?: GaiaLayerId[];
  layers?: Record<GaiaLayerId, GaiaLayerMetadata>;
}

// Define types for Load Layers API
export interface GaiaFeature {
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  style?: {
    label?: {
      text?: string;
      textRotation?: number;
      textColor?: string;
      textAlignment?: string;
    };
  };
}

export interface GaiaElement {
  id: string;
  parentId: string;
  features: GaiaFeature[];
  displayFields?: Record<string, any>;
}

export interface GaiaLayerWithElements {
  id: string;
  elements?: GaiaElement[];
}

export interface LoadLayersResponse {
  layers: Record<GaiaLayerId, GaiaLayerWithElements>;
}

// Define the state interface
interface GaiaState {
  searchResults: SearchMapsResponse | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedMap: GaiaMapMetadata | null;
  loadedMapData: LoadMapResponse | null;
  mapDataLoading: boolean;
  mapDataError: string | null;
  selectedLayerId: GaiaLayerId | null;
  selectedLayerIds: GaiaLayerId[];
  loadedLayersData: LoadLayersResponse | null;
  layersDataLoading: boolean;
  layersDataError: string | null;
}

// Initial state
const initialState: GaiaState = {
  searchResults: null,
  loading: false,
  error: null,
  searchQuery: "",
  selectedMap: null,
  loadedMapData: null,
  mapDataLoading: false,
  mapDataError: null,
  selectedLayerId: null,
  selectedLayerIds: [],
  loadedLayersData: null,
  layersDataLoading: false,
  layersDataError: null,
};

// Create the slice
const gaiaSlice = createSlice({
  name: "gaia",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    searchGaiaMapsRequest: (state, action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
      state.searchQuery = action.payload;
    },
    searchGaiaMapsSuccess: (
      state,
      action: PayloadAction<SearchMapsResponse>,
    ) => {
      state.loading = false;
      state.searchResults = action.payload;
    },
    searchGaiaMapsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
      state.error = null;
    },
    selectMap: (state, action: PayloadAction<GaiaMapMetadata>) => {
      state.selectedMap = action.payload;
      state.loadedMapData = null;
      state.selectedLayerId = null;
    },
    loadMapDataRequest: (state, _action: PayloadAction<{ mapGid: string }>) => {
      state.mapDataLoading = true;
      state.mapDataError = null;
    },
    loadMapDataSuccess: (state, action: PayloadAction<LoadMapResponse>) => {
      state.mapDataLoading = false;
      state.loadedMapData = action.payload;
    },
    loadMapDataFailure: (state, action: PayloadAction<string>) => {
      state.mapDataLoading = false;
      state.mapDataError = action.payload;
    },
    setSelectedLayerId: (state, action: PayloadAction<GaiaLayerId | null>) => {
      state.selectedLayerId = action.payload;
    },
    toggleLayerSelection: (state, action: PayloadAction<GaiaLayerId>) => {
      const layerId = action.payload;
      const index = state.selectedLayerIds.indexOf(layerId);
      if (index > -1) {
        state.selectedLayerIds.splice(index, 1);
      } else {
        state.selectedLayerIds.push(layerId);
      }
    },
    clearLayerSelections: (state) => {
      state.selectedLayerIds = [];
    },
    loadLayersRequest: (
      state,
      _action: PayloadAction<{ mapGid: string; layerIds: GaiaLayerId[] }>,
    ) => {
      state.layersDataLoading = true;
      state.layersDataError = null;
    },
    loadLayersSuccess: (state, action: PayloadAction<LoadLayersResponse>) => {
      state.layersDataLoading = false;
      state.loadedLayersData = action.payload;
    },
    loadLayersFailure: (state, action: PayloadAction<string>) => {
      state.layersDataLoading = false;
      state.layersDataError = action.payload;
    },
  },
});

// Export actions and reducer
export const {
  setSearchQuery,
  searchGaiaMapsRequest,
  searchGaiaMapsSuccess,
  searchGaiaMapsFailure,
  clearSearchResults,
  selectMap,
  loadMapDataRequest,
  loadMapDataSuccess,
  loadMapDataFailure,
  setSelectedLayerId,
  toggleLayerSelection,
  clearLayerSelections,
  loadLayersRequest,
  loadLayersSuccess,
  loadLayersFailure,
} = gaiaSlice.actions;

export default gaiaSlice.reducer;
