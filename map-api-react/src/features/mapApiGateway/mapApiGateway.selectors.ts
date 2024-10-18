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
import { RootState } from "../../app/store";

export const selectServiceUserToken = (state: RootState) => state.mapApiGateway.serviceUserToken;
export const selectLoading = (state: RootState) => state.mapApiGateway.loading;
export const selectLayerId = (state: RootState) => state.mapApiGateway.layerId;
export const selectMapId = (state: RootState) => state.mapApiGateway.mapId;
export const selectLoadLayerResponse = (state: RootState) => state.mapApiGateway.loadLayerResponse;
export const selectLoadLayerError = (state: RootState) => state.mapApiGateway.loadLayerError;