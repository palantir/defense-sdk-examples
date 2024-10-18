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
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { THIRD_PARTY_APP } from '../../config';
import { selectLayerId, selectMapId, selectServiceUserToken } from './mapApiGateway.selectors';
import {
  loadLayer,
  LoadLayersError,
  LoadLayersResponse,
  setLoadLayerError,
  setLoadLayerResponse,
  setServiceUserToken,
} from './mapApiGateway.slice';

function* fetchAuthToken(): any {
  try {
    const response: Response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/multipass/api/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: THIRD_PARTY_APP.CLIENT_ID,
          client_secret: THIRD_PARTY_APP.CLIENT_SECRET,
        }),
      })
    );

    if (response.ok) {
      const data = yield response.json();
      const token = data.access_token;
      yield put(setServiceUserToken(token));
      return token;
    } else {
      const error = yield response.json();
      console.error('Error fetching auth token:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchAuthToken saga:', error);
    return null;
  }
}

function* fetchLoadLayerSaga(): any {
  try {
    const token = (yield select(selectServiceUserToken)) as string;
    if (!token) throw new Error('Authentication failed');
    
    const mapId = yield select(selectMapId);
    const layerId = yield select(selectLayerId);

    const response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/maps/load/${mapId}/layers?preview=true`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layerIds: [layerId],
        }),
      })
    );

    if (response.ok) {
      const data: LoadLayersResponse = yield response.json();
      yield put(setLoadLayerResponse(data));
      yield put(setLoadLayerError(null));
    } else {
      const error: LoadLayersError = yield response.json();
      console.error('Error fetching map layer details:', error);
      yield put(setLoadLayerError(error));
    }
  } catch (error) {
    console.error('Error in fetchLoadLayerSaga:', error);
    yield put(setLoadLayerError(error as LoadLayersError));
  }
}

export default function* mapApiGatewaySaga(): Generator<any, void, unknown> {
  yield takeLatest(loadLayer.type, function* () {
    yield fetchAuthToken();
    yield fetchLoadLayerSaga();
  });
}