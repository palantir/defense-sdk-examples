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
import { call, put, takeLatest, select, all } from "redux-saga/effects";
import client from "../../client";
import {
  fetchDomainsSuccess,
  fetchDomainsFailure,
  fetchInterfaceObjectsSuccess,
  fetchInterfaceObjectsFailure,
  fetchInterfaceObjectsStart,
} from "./slice";
import { DomainCategory, DomainMetadata } from "./types";
import {
  selectSelectedInterface,
  selectDomainMap,
} from "./selectors";
import * as $DefenseOntology from "@defense-ontology-explorer-app/sdk";
import { SagaIterator } from "redux-saga";

function* fetchDomainsSaga(): SagaIterator {
  try {
    const existingDomainMap = yield select(selectDomainMap);
    yield put(fetchDomainsSuccess(existingDomainMap));
  } catch (error) {
    yield put(
      fetchDomainsFailure(
        error instanceof Error
          ? error.message
          : "Error fetching defense ontology domain metadata"
      )
    );
  }
}

function* fetchInterfaceObjectsSaga(): SagaIterator {
  const selectedInterface = yield select(selectSelectedInterface);
  if (selectedInterface) {
    try {
      yield put(fetchInterfaceObjectsStart());

      const InterfaceType = ($DefenseOntology as any)[selectedInterface];
      if (!InterfaceType) {
        throw new Error(`Interface ${String(selectedInterface)} not found`);
      }

      const fetchObjects = async () => {
        const objects: any[] = [];
        for await (const obj of client(InterfaceType).asyncIter()) {
          objects.push(obj);
        }
        return objects;
      };

      const objects = yield call(fetchObjects);
      yield put(fetchInterfaceObjectsSuccess(objects));
    } catch (error) {
      yield put(
        fetchInterfaceObjectsFailure(
          error instanceof Error
            ? error.message
            : "Error fetching interface objects"
        )
      );
    }
  }
}

export function* osdkSaga() {
  yield all([
    takeLatest("osdk/fetchDomainsStart", fetchDomainsSaga),
    takeLatest("osdk/setSelectedInterface", fetchInterfaceObjectsSaga),
  ]);
}
