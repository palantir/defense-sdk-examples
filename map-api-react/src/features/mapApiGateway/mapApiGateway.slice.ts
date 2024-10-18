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
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Geometry } from 'geojson';

export interface Feature {
  geometry: Geometry;
  style?: {
    fill?: {
      opacity: number;
      color: string;
    };
    stroke?: {
      width: number;
      opacity: number;
      color: string;
    };
    symbol?: {
      symbol: {
        type: string;
        sidc: string;
      };
    };
  };
}

export interface LayerElement {
  id: string;
  parentId: string;
  features: Feature[];
  label: string;
}

export interface Layer {
  id: string;
  elements: LayerElement[];
}

export interface LoadLayersResponse {
  layers: {
    [key: string]: Layer;
  };
}

export interface LoadLayersError {
  name: string;
  errorName: string;
  errorType: string;
  errorInstanceId: string;
  statusCode: number;
  message: string;
}

interface MapApiGatewayState {
  serviceUserToken: string | null;
  loading: boolean;
  mapId: string | null;
  layerId: string | null;
  loadLayerResponse: LoadLayersResponse | null;
  loadLayerError: LoadLayersError | null;
}

const initialState: MapApiGatewayState = {
  serviceUserToken: null,
  loading: false,
  layerId: null,
  mapId: null,
  loadLayerResponse: null,
  loadLayerError: null,
};

const mapApiGatewaySlice = createSlice({
  name: 'mapApiGateway',
  initialState,
  reducers: {
    setServiceUserToken: (state, action: PayloadAction<string>) => {
      state.serviceUserToken = action.payload;
    },
    loadLayer: (state) => {
      state.loading = true;
    },
    setLayerId: (state, action: PayloadAction<string>) => {
      state.layerId = action.payload;
    },
    setMapId: (state, action: PayloadAction<string>) => {
      state.mapId = action.payload;
    },
    setLoadLayerResponse: (state, action: PayloadAction<LoadLayersResponse>) => {
      state.loadLayerResponse = action.payload;
      state.loading = false;
    },
    setLoadLayerError: (state, action: PayloadAction<LoadLayersError | null>) => {
      state.loadLayerError = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setServiceUserToken,
  loadLayer,
  setLayerId,
  setMapId,
  setLoadLayerResponse,
  setLoadLayerError
} = mapApiGatewaySlice.actions;

export default mapApiGatewaySlice.reducer;