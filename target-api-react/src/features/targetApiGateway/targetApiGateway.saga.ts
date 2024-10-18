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
import { PayloadAction } from '@reduxjs/toolkit';
import { call, delay, put, select, takeLatest } from 'redux-saga/effects';
import { THIRD_PARTY_APP } from '../../config';
import { selectLoadedTargetBoard, selectServiceUserToken } from './targetApiGateway.selectors';
import {
  addObservation,
  AddObservationPayload,
  createTarget,
  CreateTargetPayload,
  loadTargets,
  loadTargetsWithoutLoading,
  setAddObservationError,
  setAddObservationResponse,
  setCreateTargetError,
  setCreateTargetResponse,
  setServiceUserToken,
  setTargets,
  Target
} from './targetApiGateway.slice';

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

function* fetchTargetDetails(targetRid: string): any {
  try {
    const token = (yield select(selectServiceUserToken)) as string;
    if (!token) throw new Error('Authentication failed');

    const response: Response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/cosmos/target/${targetRid}?preview=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    );

    if (response.ok) {
      const target = yield response.json();
      return target;
    } else {
      const error = yield response.json();
      console.error('Error fetching target details:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchTargetDetails saga:', error);
    return null;
  }
}

function* fetchTargetsForBoard(): any {
  try {
    const token = (yield select(selectServiceUserToken)) as string;
    if (!token) throw new Error('Authentication failed');

    const boardRid = yield select(selectLoadedTargetBoard);

    const response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/cosmos/targetCollection/${boardRid}?preview=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    );
    if (response.ok) {
      const data: any = yield response.json();
      if (data.collection && data.collection.columns) {
        const targets: Target[] = [];
        for (const column of data.collection.columns) {
          for (const target of column.targets) {
            const targetDetails = yield call(fetchTargetDetails, target.targetRid);
            if (targetDetails) {
              const targetObj: Target = {
                rid: targetDetails.target.rid,
                name: targetDetails.target.name,
                column: column.name,
                location: targetDetails.target.location ? {
                  latitude: targetDetails.target.location.center.latitude,
                  longitude: targetDetails.target.location.center.longitude,
                  radius: targetDetails.target.location.radius,
                  elevation: targetDetails.target.location.center.elevation
                } : undefined,
                baseRevisionId: targetDetails.baseRevisionId
              };
              targets.push(targetObj);
            }
          }
        }
        yield put(setTargets(targets));
      }
    } else {
      const error = yield response.json();
      console.error('Error fetching targets for board:', error);
    }
  } catch (error) {
    console.error('Error in fetchTargetsForBoard saga: ', error);
  }
}

function* createNewTarget(action: PayloadAction<CreateTargetPayload>): any {
  try {
    const token = (yield select(selectServiceUserToken)) as string;
    if (!token) throw new Error('Authentication failed');

    const payload = {
      name: action.payload.name,
      collection: action.payload.targetBoardId,
      column: action.payload.column,
      location: {
        center: {
          longitude: action.payload.longitude,
          latitude: action.payload.latitude
        },
        radius: action.payload.radius
      },
      security: {
        portionMarkings: action.payload.classificationMarkings || []
      },
      targetType: action.payload.targetType || 'Unknown',  
      description: action.payload.description || ''
    };

    const response: Response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/cosmos/target?preview=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );

    if (response.ok) {
      const data = yield response.json();
      yield put(setCreateTargetResponse(data));
      yield put(setCreateTargetError(null));
    } else {
      const error = yield response.json();
      throw new Error(error.message);
    }
  } catch (error: any) {
    yield put(setCreateTargetError(error.message || 'An error occurred while creating target.'));
    console.error('Error in createNewTarget saga: ', error);
  }
}

function* addNewObservation(action: PayloadAction<AddObservationPayload>): any {
  try {
    const token = (yield select(selectServiceUserToken)) as string;
    if (!token) throw new Error('Authentication failed');

    const payload = {
      name: action.payload.name,
      baseRevisionId: action.payload.baseRevisionId,
      location: {
        center: {
          longitude: action.payload.longitude,
          latitude: action.payload.latitude,
          elevation: action.payload.elevation,
        },
        radius: action.payload.radius
      }
    };

    const response: Response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/cosmos/target/${action.payload.targetId}?preview=true`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );

    if (response.ok) {
      const data = yield response.json();
      yield put(setAddObservationResponse(data));
      yield put(setAddObservationError(null));
    } else {
      const error = yield response.json();
      throw new Error(error.message);
    }
  } catch (error: any) {
    yield put(setAddObservationError(error.message || 'An error occurred while adding observation.'));
    console.error('Error in addNewObservation saga: ', error);
  }
}

export default function* targetApiGatewaySaga(): Generator<any, void, unknown> {
  yield takeLatest(loadTargets.type, function*() {
    yield fetchAuthToken();
    yield fetchTargetsForBoard();
  });
  yield takeLatest(loadTargetsWithoutLoading.type, function*() {
    yield fetchAuthToken();
    yield delay(3000);
    yield fetchTargetsForBoard();
  });
  yield takeLatest(createTarget.type, function* (action: PayloadAction<CreateTargetPayload>) {
    yield fetchAuthToken();
    yield createNewTarget(action);
  });
  yield takeLatest(addObservation.type, function* (action: PayloadAction<AddObservationPayload>) {
    yield fetchAuthToken();
    yield addNewObservation(action);
  });
}