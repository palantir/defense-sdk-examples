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
import { RootState } from "../../store";

// Selector for search results
export const selectGaiaSearchResults = (state: RootState) => {
  return state.gaia.searchResults?.results || [];
};

// Selector for loading state
export const selectGaiaSearchLoading = (state: RootState) => {
  return state.gaia.loading;
};

// Selector for error state
export const selectGaiaSearchError = (state: RootState) => {
  return state.gaia.error;
};

// Selector for search query
export const selectGaiaSearchQuery = (state: RootState) => {
  return state.gaia.searchQuery;
};

// Selector for selected map
export const selectSelectedMap = (state: RootState) => {
  return state.gaia.selectedMap;
};

// Selector for loaded map data
export const selectLoadedMapData = (state: RootState) => {
  return state.gaia.loadedMapData;
};

// Selector for map data loading state
export const selectLayersLoading = (state: RootState) => {
  return state.gaia.mapDataLoading;
};

// Selector for map data error
export const selectLayersError = (state: RootState) => {
  return state.gaia.mapDataError;
};

// Selector for selected layer ID
export const selectSelectedLayerId = (state: RootState) => {
  return state.gaia.selectedLayerId;
};

// Selector for selected layer metadata
export const selectSelectedLayer = (state: RootState) => {
  const layerId = state.gaia.selectedLayerId;
  if (!layerId || !state.gaia.loadedMapData?.layers) {
    return null;
  }
  return state.gaia.loadedMapData.layers[layerId];
};

// Selector for layer IDs (for dropdown)
export const selectLayerIds = (state: RootState) => {
  if (!state.gaia.loadedMapData?.layers) {
    return [];
  }
  return Object.keys(state.gaia.loadedMapData.layers);
};

// Selector for loaded layers data
export const selectLoadedLayersData = (state: RootState) => {
  return state.gaia.loadedLayersData;
};

// Selector for layers data loading state
export const selectLayersDataLoading = (state: RootState) => {
  return state.gaia.layersDataLoading;
};

// Selector for layers data error
export const selectLayersDataError = (state: RootState) => {
  return state.gaia.layersDataError;
};

// Selector for selected layer IDs array
export const selectSelectedLayerIds = (state: RootState) => {
  return state.gaia.selectedLayerIds;
};

// Import for GeoJSON filtering
import { filterGeoJSONElements } from "../../../types/geojson";
import type { LayerElement } from "../../../types/geojson";

// Selector to get all valid GeoJSON elements from loaded layers data
export const selectLoadedLayerGeoJSONElements = (
  state: RootState,
): LayerElement[] => {
  const loadedLayersData = state.gaia.loadedLayersData;
  if (!loadedLayersData || !loadedLayersData.layers) {
    return [];
  }

  const allElements: LayerElement[] = [];

  // Go through all loaded layers and filter their elements
  Object.values(loadedLayersData.layers).forEach((layer) => {
    if (layer && layer.elements) {
      const validElements = filterGeoJSONElements({
        id: layer.id,
        elements: layer.elements as LayerElement[],
      });
      allElements.push(...validElements);
    }
  });

  return allElements;
};

// Selector to get valid GeoJSON elements only from selected layers
export const selectSelectedLayerGeoJSONElements = (
  state: RootState,
): LayerElement[] => {
  const loadedLayersData = state.gaia.loadedLayersData;
  const selectedLayerIds = state.gaia.selectedLayerIds;

  if (
    !loadedLayersData ||
    !loadedLayersData.layers ||
    selectedLayerIds.length === 0
  ) {
    return [];
  }

  const allElements: LayerElement[] = [];

  // Only get elements from selected layers
  selectedLayerIds.forEach((layerId) => {
    const layer = loadedLayersData.layers[layerId];
    if (layer && layer.elements) {
      const validElements = filterGeoJSONElements({
        id: layer.id,
        elements: layer.elements as LayerElement[],
      });
      allElements.push(...validElements);
    }
  });

  return allElements;
};
