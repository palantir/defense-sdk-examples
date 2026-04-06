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

import { call, put, takeLatest, all } from "redux-saga/effects";
import { client } from "../../../client";
import { User, Users } from "@osdk/foundry.admin";
import { unit, elint, collateralConcernCandidateWithGeometry, trackedEntity, unitHierarchyNodeRelationship, associateIntelligenceWithIntelligenceSubject, intelligenceSubject } from "@defense-osdk/sdk";
import { loadUser, loadUnits, setUnits, setUser, loadElints, setElints, loadCollateralConcerns, setCollateralConcerns, loadUnitLocations, setUnitLocations, loadMapData, startLoadingMapData, finishLoadingMapData, loadUnitHierarchy, setUnitHierarchy, setUnitHierarchyError, associateElintWithUnit, setElintAssociationSuccess, setElintAssociationError, loadAssociatedElints, setAssociatedElints, setAssociatedElintsError, loadTrackedEntityObservations, setTrackedEntityObservations, setTrackedEntityObservationsError } from "./osdkSlice";
import { OntologyLinkTypes, OntologyActionParams } from "../../../constants";


function* fetchUser(): any {
  try {
    const user: User = yield call(Users.getCurrent, client);
    if (!user) {
      yield put(setUser(null));
      return;
    }
    yield put(setUser(user));
  } catch (e) {
    console.error("Error fetching current user:", e);
    yield put(setUser(null));
  }
}

function* fetchUnits(): any {
  try {
    const result = yield call([client(unit), "fetchPage"]);
    const units: unit.OsdkInstance[] = result.data;
    yield put(setUnits(units ?? []));
  } catch (e) {
    console.error("Error fetching units:", e);
    yield put(setUnits([]));
  }
}

function* fetchElints(): any {
  try {
    const result = yield call(
      [client(elint), "fetchPage"],
      { $select: ["intelligenceEllipseGeometry", "reportedPosition", "semiMajorAxisMeters", "semiMinorAxisMeters", "axisOrientation", "elnot", "reportedTimestamp"] }
    );
    const elints: elint.OsdkInstance[] = result.data;
    yield put(setElints(elints ?? []));
  } catch (e) {
    console.error("Error fetching ELINT:", e);
    yield put(setElints([]));
  }
}

function* fetchCollateralConcerns(): any {
  try {
    const result = yield call([client(collateralConcernCandidateWithGeometry), "fetchPage"], {
      $select: ["geometry"]
    });
    const collateralConcerns: collateralConcernCandidateWithGeometry.OsdkInstance[] = result.data;
    yield put(setCollateralConcerns(collateralConcerns ?? []));
  } catch (e) {
    console.error("Error fetching collateral concerns:", e);
    yield put(setCollateralConcerns([]));
  }
}

function* fetchUnitLocations(): any {
  try {
    const result = yield call([client(unit), "fetchPage"]);
    const units: unit.OsdkInstance[] = result.data;

    if (!units || units.length === 0) {
      yield put(setUnitLocations([]));
      return;
    }

    const unitLocations: Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }> = [];

    for (const unitInstance of units) {
      try {
        const asTrackedEntity = unitInstance.$as(trackedEntity);
        const link = asTrackedEntity.$link;

        if (link?.[OntologyLinkTypes.TRACKED_ENTITY] != null) {
          const linkedObservations = yield call(async () => {
            const { data } = await link[OntologyLinkTypes.TRACKED_ENTITY].fetchPage({
              $select: ['geotrackablePosition', 'geotrackableTimestamp'],
              $orderBy: { geotrackableTimestamp: 'desc' },
              $pageSize: 1,
            });
            return data;
          });

          if (linkedObservations && linkedObservations.length > 0) {
            const latestObservation = linkedObservations[0];
            const position = latestObservation.geotrackablePosition;

            if (position && position.coordinates && position.coordinates.length === 2) {
              unitLocations.push({
                unit: unitInstance,
                location: {
                  lat: position.coordinates[1],
                  lng: position.coordinates[0]
                }
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching location for unit ${unitInstance.$title}:`, err);
      }
    }

    yield put(setUnitLocations(unitLocations));
  } catch (e) {
    console.error("Error fetching unit locations:", e);
    yield put(setUnitLocations([]));
  }
}

function* fetchUnitHierarchy(action: ReturnType<typeof loadUnitHierarchy>): any {
  try {
    const unitInstance = action.payload;
    const nodeId = unitInstance.$primaryKey;

    if (!nodeId) {
      yield put(setUnitHierarchy({ parents: [], children: [] }));
      return;
    }

    const immediateParents = yield call(getImmediateParentUnits, nodeId);
    const immediateChildren = yield call(getImmediateChildUnits, nodeId);

    yield put(setUnitHierarchy({
      parents: immediateParents,
      children: immediateChildren,
    }));
  } catch (err) {
    console.error("Error fetching unit hierarchy:", err);
    yield put(setUnitHierarchyError("Error loading hierarchy"));
  }
}

async function getImmediateChildUnits(nodeId: string | number): Promise<unit.OsdkInstance[]> {
  try {
    const { data: relationships } = await client(unitHierarchyNodeRelationship)
      .where({
        OntologyLinkTypes.HIERARCHY_PARENT_ID: String(nodeId),
      })
      .fetchPage({ $pageSize: 1000 });

    const childIds = relationships
      .map((rel: any) => rel[OntologyLinkTypes.HIERARCHY_CHILD_ID])
      .filter((id: any) => id);

    if (childIds.length === 0) {
      return [];
    }

    const { data: allUnits } = await client(unit).fetchPage({ $pageSize: 10000 });
    return childIds
      .map(childId => allUnits.find((u: any) => u.$primaryKey === childId))
      .filter((u): u is unit.OsdkInstance => u !== undefined);
  } catch (err) {
    console.error(`Error fetching children for node ${nodeId}:`, err);
    return [];
  }
}

async function getImmediateParentUnits(nodeId: string | number): Promise<unit.OsdkInstance[]> {
  try {
    const { data: relationships } = await client(unitHierarchyNodeRelationship)
      .where({
        OntologyLinkTypes.HIERARCHY_CHILD_ID: String(nodeId),
      })
      .fetchPage({ $pageSize: 1000 });

    const parentIds = relationships
      .map((rel: any) => rel[OntologyLinkTypes.HIERARCHY_PARENT_ID])
      .filter((id: any) => id);

    if (parentIds.length === 0) {
      return [];
    }

    const { data: allUnits } = await client(unit).fetchPage({ $pageSize: 10000 });
    return parentIds
      .map(parentId => allUnits.find((u: any) => u.$primaryKey === parentId))
      .filter((u): u is unit.OsdkInstance => u !== undefined);
  } catch (err) {
    console.error(`Error fetching parents for node ${nodeId}:`, err);
    return [];
  }
}

function* loadMapDataSaga(): any {
  try {
    yield put(startLoadingMapData());
    yield all([
      call(fetchElints),
      call(fetchCollateralConcerns),
      call(fetchUnitLocations)
    ]);
    yield put(finishLoadingMapData());
  } catch (e) {
    console.error("Error loading map data:", e);
    yield put(finishLoadingMapData());
  }
}

function* associateElintWithUnitSaga(action: ReturnType<typeof associateElintWithUnit>): any {
  try {
    const { elint: elintInstance, unit: unitInstance } = action.payload;

    const unitPrimaryKey = unitInstance.$primaryKey;
    const elintPrimaryKey = elintInstance.$primaryKey;
    const unitObjectType = unitInstance.$objectType;
    const elintObjectType = elintInstance.$objectType;

    yield call(
      [client(associateIntelligenceWithIntelligenceSubject), "applyAction"],
      {
        [OntologyActionParams.INTELLIGENCE_SUBJECT]: {
          $objectType: unitObjectType,
          $primaryKey: unitPrimaryKey,
        },
        [OntologyActionParams.INTELLIGENCE]: {
          $objectType: elintObjectType,
          $primaryKey: elintPrimaryKey,
        },
      }
    );

    yield put(setElintAssociationSuccess());
    yield put(loadAssociatedElints(unitInstance));
  } catch (err) {
    console.error("Error associating ELINT with unit:", err);
    yield put(setElintAssociationError("Failed to associate ELINT"));
  }
}

function* fetchAssociatedElints(action: ReturnType<typeof loadAssociatedElints>): any {
  try {
    const unitInstance = action.payload;
    const asIntelligenceSubject = unitInstance.$as(intelligenceSubject);
    const link = asIntelligenceSubject.$link;

    if (link?.[OntologyLinkTypes.LINKED_INTELLIGENCE] == null) {
      yield put(setAssociatedElints([]));
      return;
    }

    const result = yield call(
      [link[OntologyLinkTypes.LINKED_INTELLIGENCE], "fetchPage"],
      {
        $select: ['reportedPosition', 'semiMajorAxisMeters', 'semiMinorAxisMeters', 'axisOrientation', 'intelligenceEllipseGeometry', 'elnot', 'reportedTimestamp'],
        $pageSize: 100,
      }
    );

    const elints: elint.OsdkInstance[] = result.data ?? [];
    yield put(setAssociatedElints(elints));
  } catch (err) {
    console.error("Error fetching associated ELINTs:", err);
    yield put(setAssociatedElintsError("Failed to load associated ELINT"));
  }
}

function* fetchTrackedEntityObservations(action: ReturnType<typeof loadTrackedEntityObservations>): any {
  try {
    const unitInstance = action.payload;
    const asTrackedEntity = unitInstance.$as(trackedEntity);
    const link = asTrackedEntity.$link;

    if (link?.[OntologyLinkTypes.TRACKED_ENTITY] == null) {
      yield put(setTrackedEntityObservations([]));
      return;
    }

    const result = yield call(
      [link[OntologyLinkTypes.TRACKED_ENTITY], "fetchPage"],
      {
        $select: ['geotrackablePosition', 'geotrackableTimestamp'],
        $orderBy: { geotrackableTimestamp: 'desc' },
        $pageSize: 100,
      }
    );

    const observations: trackedEntity.OsdkInstance[] = result.data ?? [];
    yield put(setTrackedEntityObservations(observations));
  } catch (err) {
    console.error("Error fetching tracked entity observations:", err);
    yield put(setTrackedEntityObservationsError("Failed to load observations"));
  }
}

export default function* osdkSagas(): Generator<any, void, unknown> {
  yield takeLatest(loadUser.type, fetchUser);
  yield takeLatest(loadUnits.type, fetchUnits);
  yield takeLatest(loadElints.type, fetchElints);
  yield takeLatest(loadCollateralConcerns.type, fetchCollateralConcerns);
  yield takeLatest(loadUnitLocations.type, fetchUnitLocations);
  yield takeLatest(loadMapData.type, loadMapDataSaga);
  yield takeLatest(loadUnitHierarchy.type, fetchUnitHierarchy);
  yield takeLatest(associateElintWithUnit.type, associateElintWithUnitSaga);
  yield takeLatest(loadAssociatedElints.type, fetchAssociatedElints);
  yield takeLatest(loadTrackedEntityObservations.type, fetchTrackedEntityObservations);
}
