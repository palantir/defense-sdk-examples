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

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, Users } from "@osdk/foundry.admin";
import {
  unit,
  elint,
  collateralConcernCandidateWithGeometry,
  trackedEntity,
  unitHierarchyNodeRelationship,
  associateIntelligenceWithIntelligenceSubject,
  intelligenceSubject,
} from "@defense-osdk/sdk";
import { client } from "../client";
import { OntologyLinkTypes, OntologyActionParams } from "../constants";
import { useSelection } from "./SelectionContext";
import { Affiliations } from "../constants";
import { type AsyncLoaded, IDLE, LOADING, loaded, failed } from "../types/AsyncLoaded";

export interface UnitHierarchyData {
  parents: unit.OsdkInstance[];
  children: unit.OsdkInstance[];
}

export interface MapData {
  elints: elint.OsdkInstance[];
  collateralConcerns: collateralConcernCandidateWithGeometry.OsdkInstance[];
  unitLocations: Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>;
}

// --- Fetch functions ---

async function fetchCurrentUser(): Promise<User> {
  const user = await Users.getCurrent(client);
  if (user == null) {
    throw new Error("No current user found");
  }
  return user;
}

async function fetchElints(): Promise<elint.OsdkInstance[]> {
  const elintClient = client(elint);
  const result = await elintClient.fetchPage({
    $select: ["intelligenceEllipseGeometry", "reportedPosition", "semiMajorAxisMeters", "semiMinorAxisMeters", "axisOrientation", "elnot", "reportedTimestamp"],
  });
  // $select narrows the return type; $as(elint) is a no-op for same-type conversion so `as` is needed
  return result.data as elint.OsdkInstance[];
}

async function fetchCollateralConcerns(): Promise<collateralConcernCandidateWithGeometry.OsdkInstance[]> {
  const ccClient = client(collateralConcernCandidateWithGeometry);
  const result = await ccClient.fetchPage({ $select: ["geometry"] });
  return result.data ?? [];
}

async function fetchUnitLocations(): Promise<Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>> {
  const unitClient = client(unit);
  const result = await unitClient.fetchPage();
  const units: unit.OsdkInstance[] = result.data;

  if (!units || units.length === 0) {
    return [];
  }

  const unitLocations: Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }> = [];

  for (const unitInstance of units) {
    try {
      const asTrackedEntity = unitInstance.$as(trackedEntity);
      const link = asTrackedEntity.$link;

      if (link?.[OntologyLinkTypes.TRACKED_ENTITY] != null) {
        const { data } = await link[OntologyLinkTypes.TRACKED_ENTITY].fetchPage({
          $select: ["geotrackablePosition", "geotrackableTimestamp"],
          $orderBy: { geotrackableTimestamp: "desc" },
          $pageSize: 1,
        });

        if (data && data.length > 0) {
          const latestObservation = data[0];
          const position = latestObservation.geotrackablePosition;

          if (position && position.coordinates && position.coordinates.length === 2) {
            unitLocations.push({
              unit: unitInstance,
              location: {
                lat: position.coordinates[1],
                lng: position.coordinates[0],
              },
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching location for unit ${unitInstance.$title}:`, err);
    }
  }

  return unitLocations;
}

async function getImmediateChildUnits(nodeId: string | number): Promise<unit.OsdkInstance[]> {
  try {
    const { data: relationships } = await client(unitHierarchyNodeRelationship)
      .where({
        [OntologyLinkTypes.HIERARCHY_PARENT_ID]: String(nodeId),
      })
      .fetchPage({ $pageSize: 1000 });

    const childIds = relationships
      .map((rel) => rel[OntologyLinkTypes.HIERARCHY_CHILD_ID])
      .filter((id): id is string => id != null);

    if (childIds.length === 0) {
      return [];
    }

    const { data: allUnits } = await client(unit).fetchPage({ $pageSize: 10000 });
    return childIds
      .map(childId => allUnits.find((u) => u.$primaryKey === childId))
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
        [OntologyLinkTypes.HIERARCHY_CHILD_ID]: String(nodeId),
      })
      .fetchPage({ $pageSize: 1000 });

    const parentIds = relationships
      .map((rel) => rel[OntologyLinkTypes.HIERARCHY_PARENT_ID])
      .filter((id): id is string => id != null);

    if (parentIds.length === 0) {
      return [];
    }

    const { data: allUnits } = await client(unit).fetchPage({ $pageSize: 10000 });
    return parentIds
      .map(parentId => allUnits.find((u) => u.$primaryKey === parentId))
      .filter((u): u is unit.OsdkInstance => u !== undefined);
  } catch (err) {
    console.error(`Error fetching parents for node ${nodeId}:`, err);
    return [];
  }
}

async function fetchUnitHierarchy(unitInstance: unit.OsdkInstance): Promise<UnitHierarchyData> {
  const nodeId = unitInstance.$primaryKey;

  if (!nodeId) {
    return { parents: [], children: [] };
  }

  const [parents, children] = await Promise.all([
    getImmediateParentUnits(nodeId),
    getImmediateChildUnits(nodeId),
  ]);

  return { parents, children };
}

async function fetchAssociatedElintsForUnit(unitInstance: unit.OsdkInstance): Promise<elint.OsdkInstance[]> {
  const asIntelligenceSubject = unitInstance.$as(intelligenceSubject);
  const link = asIntelligenceSubject.$link;

  if (link?.[OntologyLinkTypes.LINKED_INTELLIGENCE] == null) {
    return [];
  }

  const linkedIntelligence = link[OntologyLinkTypes.LINKED_INTELLIGENCE];
  const result = await linkedIntelligence.fetchPage({ $pageSize: 100 });
  return result.data.map(d => d.$as(elint));
}

async function fetchTrackedEntityObservationsForUnit(unitInstance: unit.OsdkInstance): Promise<trackedEntity.OsdkInstance[]> {
  const asTracked = unitInstance.$as(trackedEntity);
  const link = asTracked.$link;

  if (link?.[OntologyLinkTypes.TRACKED_ENTITY] == null) {
    return [];
  }

  const trackedEntityLink = link[OntologyLinkTypes.TRACKED_ENTITY];
  const result = await trackedEntityLink.fetchPage({
    $select: ["geotrackablePosition", "geotrackableTimestamp"],
    $orderBy: { geotrackableTimestamp: "desc" },
    $pageSize: 100,
  });
  return result.data.map(d => d.$as(trackedEntity));
}

async function performAssociateElintWithUnit(
  elintInstance: elint.OsdkInstance,
  unitInstance: unit.OsdkInstance,
): Promise<void> {
  const actionClient = client(associateIntelligenceWithIntelligenceSubject);
  await actionClient.applyAction({
    [OntologyActionParams.INTELLIGENCE_SUBJECT]: {
      $objectType: unitInstance.$objectType,
      $primaryKey: unitInstance.$primaryKey,
    },
    [OntologyActionParams.INTELLIGENCE]: {
      $objectType: elintInstance.$objectType,
      $primaryKey: elintInstance.$primaryKey,
    },
  });
}

// --- Helper to run an async operation and update state ---

async function runAsync<V>(
  setState: (s: AsyncLoaded<V>) => void,
  fn: () => Promise<V>,
): Promise<void> {
  setState(LOADING);
  try {
    setState(loaded(await fn()));
  } catch (err) {
    console.error(err);
    setState(failed(err));
  }
}

// --- Context ---

interface OsdkDataContextType {
  user: AsyncLoaded<User>;
  mapData: AsyncLoaded<MapData>;
  unitHierarchy: AsyncLoaded<UnitHierarchyData>;
  associatedElints: AsyncLoaded<elint.OsdkInstance[]>;
  trackedEntityObservations: AsyncLoaded<trackedEntity.OsdkInstance[]>;
  elintAssociation: AsyncLoaded<void>;
  associateElintWithUnit: (elintInstance: elint.OsdkInstance, unitInstance: unit.OsdkInstance) => Promise<void>;
  refreshAssociatedElints: (unitInstance: unit.OsdkInstance) => Promise<void>;
}

const OsdkDataContext = createContext<OsdkDataContextType | undefined>(undefined);

export const OsdkDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedUnit } = useSelection();

  const [user, setUser] = useState<AsyncLoaded<User>>(LOADING);
  const [mapData, setMapData] = useState<AsyncLoaded<MapData>>(LOADING);
  const [unitHierarchy, setUnitHierarchy] = useState<AsyncLoaded<UnitHierarchyData>>(IDLE);
  const [associatedElints, setAssociatedElints] = useState<AsyncLoaded<elint.OsdkInstance[]>>(IDLE);
  const [trackedEntityObservations, setTrackedEntityObservations] = useState<AsyncLoaded<trackedEntity.OsdkInstance[]>>(IDLE);
  const [elintAssociation, setElintAssociation] = useState<AsyncLoaded<void>>(IDLE);

  // Fetch user on mount
  useEffect(() => {
    runAsync(setUser, fetchCurrentUser);
  }, []);

  // Fetch map data on mount
  useEffect(() => {
    runAsync(setMapData, async () => {
      const [elints, collateralConcerns, unitLocations] = await Promise.all([
        fetchElints(),
        fetchCollateralConcerns(),
        fetchUnitLocations(),
      ]);
      return { elints, collateralConcerns, unitLocations };
    });
  }, []);

  // Fetch unit-dependent data when selection changes
  useEffect(() => {
    if (selectedUnit == null) {
      setUnitHierarchy(IDLE);
      setAssociatedElints(IDLE);
      setTrackedEntityObservations(IDLE);
      return;
    }

    const affiliation = selectedUnit.affiliation?.toLowerCase();
    const isFriendly = affiliation?.includes(Affiliations.FRIEND);
    const isHostile = affiliation === Affiliations.HOSTILE;

    if (isFriendly) {
      runAsync(setUnitHierarchy, () => fetchUnitHierarchy(selectedUnit));
    } else {
      setUnitHierarchy(IDLE);
    }

    if (isHostile) {
      runAsync(setAssociatedElints, () => fetchAssociatedElintsForUnit(selectedUnit));
      runAsync(setTrackedEntityObservations, () => fetchTrackedEntityObservationsForUnit(selectedUnit));
    } else {
      setAssociatedElints(IDLE);
      setTrackedEntityObservations(IDLE);
    }
  }, [selectedUnit]);

  const refreshAssociatedElints = useCallback(async (unitInstance: unit.OsdkInstance) => {
    await runAsync(setAssociatedElints, () => fetchAssociatedElintsForUnit(unitInstance));
  }, []);

  const doAssociateElintWithUnit = useCallback(async (elintInstance: elint.OsdkInstance, unitInstance: unit.OsdkInstance) => {
    setElintAssociation(LOADING);
    try {
      await performAssociateElintWithUnit(elintInstance, unitInstance);
      setElintAssociation(loaded(undefined));
      await refreshAssociatedElints(unitInstance);
    } catch (err) {
      console.error("Error associating ELINT with unit:", err);
      setElintAssociation(failed(err));
    }
  }, [refreshAssociatedElints]);

  return (
    <OsdkDataContext.Provider value={{
      associateElintWithUnit: doAssociateElintWithUnit,
      associatedElints,
      elintAssociation,
      mapData,
      refreshAssociatedElints,
      trackedEntityObservations,
      unitHierarchy,
      user,
    }}>
      {children}
    </OsdkDataContext.Provider>
  );
};

export const useOsdkData = (): OsdkDataContextType => {
  const context = useContext(OsdkDataContext);
  if (context === undefined) {
    throw new Error("useOsdkData must be used within an OsdkDataProvider");
  }
  return context;
};
