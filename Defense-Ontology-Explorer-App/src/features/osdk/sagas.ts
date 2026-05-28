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
import client, { auth, foundryUrl, $ontologyRid } from "../../client";
import {
  fetchDomainsSuccess,
  fetchDomainsFailure,
  fetchInterfaceObjectsSuccess,
  fetchInterfaceObjectsFailure,
  fetchFullObjectSuccess,
  fetchFullObjectFailure,
  fetchInterfaceObjectsStart,
} from "./slice";
import { DomainCategory, DomainMetadata } from "./types";
import {
  selectSelectedInterface,
  selectSelectedObjectType,
  selectSelectedObjectPrimaryKey,
  selectDomainMap,
  selectInterfaceObjects,
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
        const interfaceApiName = InterfaceType.apiName;
        const token = await auth();
        const response = await fetch(
          `${foundryUrl}/api/v2/ontologies/${$ontologyRid}/objectSets/loadObjectsMultipleObjectTypes?preview=true`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "x-osdk-request-context": JSON.stringify({ finalMethodCall: "fetchPage" }),
            },
            body: JSON.stringify({
              objectSet: {
                type: "interfaceBase",
                interfaceType: interfaceApiName,
              },
              select: [],
              selectV2: [],
              loadPropertySecurities: false,
              excludeRid: true,
              snapshot: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.data && result.data.length > 0) {
          return result.data;
        }

        if (result.interfaceToObjectTypeMappings) {
          const mappings = result.interfaceToObjectTypeMappings[interfaceApiName] || {};
          const objectTypes = Object.keys(mappings);

          return objectTypes.map(objectType => ({
            $objectType: objectType,
            $primaryKey: null,
          }));
        }

        return [];
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

function* fetchObjectsByTypeSaga(): SagaIterator {
  const selectedObjectType = yield select(selectSelectedObjectType);
  if (selectedObjectType) {
    try {
      yield put(fetchInterfaceObjectsStart());
      const existingObjects = yield select(selectInterfaceObjects);

      const fetchByType = async () => {
        const token = await auth();
        const response = await fetch(
          `${foundryUrl}/api/v2/ontologies/${$ontologyRid}/objectSets/loadObjectsMultipleObjectTypes?preview=true`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "x-osdk-request-context": JSON.stringify({ finalMethodCall: "fetchPage" }),
            },
            body: JSON.stringify({
              objectSet: {
                type: "base",
                objectType: selectedObjectType,
              },
              select: [],
              selectV2: [],
              loadPropertySecurities: false,
              excludeRid: false,
              snapshot: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      };

      const result = yield call(fetchByType);

      const filteredObjects = existingObjects.filter(
        (obj: any) => obj.$objectType !== selectedObjectType
      );

      const updatedObjects = result.data && result.data.length > 0
        ? [...filteredObjects, ...result.data]
        : [...filteredObjects, { $objectType: selectedObjectType, $primaryKey: null }];

      yield put(fetchInterfaceObjectsSuccess(updatedObjects));
    } catch (error) {
      yield put(
        fetchInterfaceObjectsFailure(
          error instanceof Error
            ? error.message
            : "Error fetching objects by type"
        )
      );
    }
  }
}

function* fetchFullObjectSaga(): SagaIterator {
  const selectedObjectPrimaryKey = yield select(selectSelectedObjectPrimaryKey);
  const selectedObjectType = yield select(selectSelectedObjectType);
  if (selectedObjectPrimaryKey && selectedObjectType) {
    try {
      const Type = ($DefenseOntology as any)[selectedObjectType];
      if (!Type) {
        throw new Error(`Type ${selectedObjectType} not found`);
      }
      const object = yield call(
        client(Type).fetchOneWithErrors,
        selectedObjectPrimaryKey
      );

      let mediaContent = null;
      if (object.value.mediaReference) {
        try {
          const fetchContents = () =>
            object.value.mediaReference.fetchContents();
          const response = yield call(fetchContents);
          if (response.ok) {
            const blob = yield call([response, "blob"]);
            mediaContent = URL.createObjectURL(blob);
          }
        } catch (error) {
          yield put(
            fetchFullObjectFailure(
              error instanceof Error ? error.message : "Error fetching object"
            )
          );
        }
      }
      const serializableObject = { ...object.value };
      yield put(
        fetchFullObjectSuccess({ ...serializableObject, mediaContent })
      );
    } catch (error) {
      yield put(
        fetchFullObjectFailure(
          error instanceof Error ? error.message : "Error fetching object"
        )
      );
    }
  }
}

export function* osdkSaga() {
  yield all([
    takeLatest("osdk/fetchDomainsStart", fetchDomainsSaga),
    takeLatest("osdk/setSelectedInterface", fetchInterfaceObjectsSaga),
    takeLatest("osdk/setSelectedObjectType", fetchObjectsByTypeSaga),
    takeLatest("osdk/setSelectedObjectPrimaryKey", fetchFullObjectSaga),
  ]);
}
