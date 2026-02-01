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
import { call, put, takeLatest } from "redux-saga/effects";
import { PayloadAction } from "@reduxjs/toolkit";
import {
  searchGaiaMapsRequest,
  searchGaiaMapsSuccess,
  searchGaiaMapsFailure,
  SearchMapsResponse,
  loadMapDataRequest,
  loadMapDataSuccess,
  loadMapDataFailure,
  LoadMapResponse,
  loadLayersRequest,
  loadLayersSuccess,
  loadLayersFailure,
  LoadLayersResponse,
} from "./gaiaSlice";
import { auth } from "../../../client";

// Function to make the API call for searching maps
function* searchGaiaMaps(
  action: PayloadAction<string>,
): Generator<any, void, any> {
  try {
    const mapName = action.payload;
    const apiUrl = new URL(import.meta.env.VITE_FOUNDRY_API_URL);
    apiUrl.pathname = "/api/gotham/v1/maps";
    apiUrl.searchParams.append("mapName", mapName);
    apiUrl.searchParams.append("preview", "true");

    let token = yield call(auth.getTokenOrUndefined);
    if (!token) {
      token = yield call(auth.signIn);
    }

    const response = yield call(fetch, apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = yield call([response, response.json]);
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    const data: SearchMapsResponse = yield call([response, response.json]);
    console.log("Gaia response: ", data);

    yield put(searchGaiaMapsSuccess(data));
  } catch (error) {
    yield put(
      searchGaiaMapsFailure(
        error instanceof Error ? error.message : "An unknown error occurred",
      ),
    );
  }
}

// Function to make the API call for loading map data with extension
function* loadMapData(
  action: PayloadAction<{ mapGid: string }>,
): Generator<any, void, any> {
  try {
    const { mapGid } = action.payload;
    const apiUrl = new URL(import.meta.env.VITE_FOUNDRY_API_URL);
    apiUrl.pathname = `/api/gotham/v1/maps/loadWithExtension/${mapGid}`;
    apiUrl.searchParams.append("preview", "true");

    let token = yield call(auth.getTokenOrUndefined);
    if (!token) {
      token = yield call(auth.signIn);
    }

    console.log("Calling loadWithExtension with:", {
      url: apiUrl.toString(),
      mapGid: mapGid,
    });

    apiUrl.pathname = `/api/gotham/v1/maps/load/${mapGid}`;
    const response = yield call(fetch, apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Response status:", response.status);
    console.log("Response statusText:", response.statusText);

    if (!response.ok) {
      const text = yield call([response, response.text]);
      console.log("Error response text:", text);
      throw new Error(
        text || `HTTP error ${response.status}: ${response.statusText}`,
      );
    }

    const text = yield call([response, response.text]);
    console.log("Response text:", text);

    if (!text || text.trim() === "") {
      throw new Error("Empty response from server");
    }

    const data: LoadMapResponse = JSON.parse(text);
    console.log("Load Map Data response: ", data);

    yield put(loadMapDataSuccess(data));

    // Automatically load layers after successfully loading the map
    if (data.rootLayerIds && data.rootLayerIds.length > 0) {
      console.log("Auto-loading layers:", data.rootLayerIds);
      yield put(loadLayersRequest({ mapGid, layerIds: data.rootLayerIds }));
    }
  } catch (error) {
    console.error("Load map data error:", error);
    yield put(
      loadMapDataFailure(
        error instanceof Error ? error.message : "An unknown error occurred",
      ),
    );
  }
}

// Function to make the API call for loading layers
function* loadLayers(
  action: PayloadAction<{ mapGid: string; layerIds: string[] }>,
): Generator<any, void, any> {
  try {
    const { mapGid, layerIds } = action.payload;
    const apiUrl = new URL(import.meta.env.VITE_FOUNDRY_API_URL);
    apiUrl.pathname = `/api/gotham/v1/maps/load/${mapGid}/layers`;
    apiUrl.searchParams.append("preview", "true");

    let token = yield call(auth.getTokenOrUndefined);
    if (!token) {
      token = yield call(auth.signIn);
    }

    console.log("Calling loadLayers with:", {
      url: apiUrl.toString(),
      mapGid,
      layerIds,
    });

    const response = yield call(fetch, apiUrl.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        layerIds,
        includeDisplayFields: true,
      }),
    });

    console.log("Load Layers Response status:", response.status);

    if (!response.ok) {
      const text = yield call([response, response.text]);
      console.log("Load Layers Error response text:", text);
      throw new Error(
        text || `HTTP error ${response.status}: ${response.statusText}`,
      );
    }

    const text = yield call([response, response.text]);
    console.log("Load Layers Response text:", text);

    if (!text || text.trim() === "") {
      throw new Error("Empty response from server");
    }

    const data: LoadLayersResponse = JSON.parse(text);
    console.log("Load Layers Data response: ", data);

    yield put(loadLayersSuccess(data));
  } catch (error) {
    console.error("Load layers error:", error);
    yield put(
      loadLayersFailure(
        error instanceof Error ? error.message : "An unknown error occurred",
      ),
    );
  }
}

export function* gaiaSagas(): Generator<any, void, unknown> {
  yield takeLatest(searchGaiaMapsRequest.type, searchGaiaMaps);
  yield takeLatest(loadMapDataRequest.type, loadMapData);
  yield takeLatest(loadLayersRequest.type, loadLayers);
}
