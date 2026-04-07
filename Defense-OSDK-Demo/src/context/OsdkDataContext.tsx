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

export interface UnitHierarchyData {
  parents: unit.OsdkInstance[];
  children: unit.OsdkInstance[];
}

// --- Fetch functions (extracted from sagas) ---

async function fetchCurrentUser(): Promise<User | undefined> {
  try {
    const user = await Users.getCurrent(client);
    return user ?? undefined;
  } catch (e) {
    console.error("Error fetching current user:", e);
    return undefined;
  }
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

// --- Context ---

interface OsdkDataContextType {
  user?: User;
  loadingUser: boolean;

  elints: elint.OsdkInstance[];
  collateralConcerns: collateralConcernCandidateWithGeometry.OsdkInstance[];
  unitLocations: Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>;
  loadingMapData: boolean;

  unitHierarchy?: UnitHierarchyData;
  loadingUnitHierarchy: boolean;
  unitHierarchyError?: string;

  associatedElints: elint.OsdkInstance[];
  loadingAssociatedElints: boolean;
  associatedElintsError?: string;

  trackedEntityObservations: trackedEntity.OsdkInstance[];
  loadingTrackedEntityObservations: boolean;
  trackedEntityObservationsError?: string;

  associatingElint: boolean;
  elintAssociationError?: string;

  associateElintWithUnit: (elintInstance: elint.OsdkInstance, unitInstance: unit.OsdkInstance) => Promise<void>;
  refreshAssociatedElints: (unitInstance: unit.OsdkInstance) => Promise<void>;
}

const OsdkDataContext = createContext<OsdkDataContextType | undefined>(undefined);

export const OsdkDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedUnit } = useSelection();

  // User
  const [user, setUser] = useState<User>();
  const [loadingUser, setLoadingUser] = useState(true);

  // Map data
  const [elints, setElints] = useState<elint.OsdkInstance[]>([]);
  const [collateralConcerns, setCollateralConcerns] = useState<collateralConcernCandidateWithGeometry.OsdkInstance[]>([]);
  const [unitLocations, setUnitLocations] = useState<Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }>>([]);
  const [loadingMapData, setLoadingMapData] = useState(true);

  // Unit hierarchy
  const [unitHierarchy, setUnitHierarchy] = useState<UnitHierarchyData>();
  const [loadingUnitHierarchy, setLoadingUnitHierarchy] = useState(false);
  const [unitHierarchyError, setUnitHierarchyError] = useState<string>();

  // Associated ELINTs
  const [associatedElints, setAssociatedElints] = useState<elint.OsdkInstance[]>([]);
  const [loadingAssociatedElints, setLoadingAssociatedElints] = useState(false);
  const [associatedElintsError, setAssociatedElintsError] = useState<string>();

  // Tracked entity observations
  const [trackedEntityObservations, setTrackedEntityObservations] = useState<trackedEntity.OsdkInstance[]>([]);
  const [loadingTrackedEntityObservations, setLoadingTrackedEntityObservations] = useState(false);
  const [trackedEntityObservationsError, setTrackedEntityObservationsError] = useState<string>();

  // Association mutation
  const [associatingElint, setAssociatingElint] = useState(false);
  const [elintAssociationError, setElintAssociationError] = useState<string>();

  // Fetch user on mount
  useEffect(() => {
    setLoadingUser(true);
    fetchCurrentUser().then((u) => {
      setUser(u);
      setLoadingUser(false);
    });
  }, []);

  // Fetch map data on mount
  useEffect(() => {
    setLoadingMapData(true);
    Promise.all([
      fetchElints().catch((e): elint.OsdkInstance[] => { console.error("Error fetching ELINT:", e); return []; }),
      fetchCollateralConcerns().catch((e): collateralConcernCandidateWithGeometry.OsdkInstance[] => { console.error("Error fetching collateral concerns:", e); return []; }),
      fetchUnitLocations().catch((e): Array<{ unit: unit.OsdkInstance; location: { lat: number; lng: number } }> => { console.error("Error fetching unit locations:", e); return []; }),
    ]).then(([elintData, ccData, locData]) => {
      setElints(elintData);
      setCollateralConcerns(ccData);
      setUnitLocations(locData);
      setLoadingMapData(false);
    });
  }, []);

  // Fetch unit-dependent data when selection changes
  useEffect(() => {
    if (selectedUnit == null) {
      setUnitHierarchy(undefined);
      setLoadingUnitHierarchy(false);
      setUnitHierarchyError(undefined);
      setAssociatedElints([]);
      setLoadingAssociatedElints(false);
      setAssociatedElintsError(undefined);
      setTrackedEntityObservations([]);
      setLoadingTrackedEntityObservations(false);
      setTrackedEntityObservationsError(undefined);
      return;
    }

    const affiliation = selectedUnit.affiliation?.toLowerCase();
    const isFriendly = affiliation?.includes(Affiliations.FRIEND);
    const isHostile = affiliation === Affiliations.HOSTILE;

    if (isFriendly) {
      setLoadingUnitHierarchy(true);
      setUnitHierarchyError(undefined);
      fetchUnitHierarchy(selectedUnit)
        .then(setUnitHierarchy)
        .catch((err) => {
          console.error("Error fetching unit hierarchy:", err);
          setUnitHierarchyError("Error loading hierarchy");
        })
        .finally(() => setLoadingUnitHierarchy(false));
    } else {
      setUnitHierarchy(undefined);
      setUnitHierarchyError(undefined);
    }

    if (isHostile) {
      setLoadingAssociatedElints(true);
      setAssociatedElintsError(undefined);
      fetchAssociatedElintsForUnit(selectedUnit)
        .then(setAssociatedElints)
        .catch((err) => {
          console.error("Error fetching associated ELINTs:", err);
          setAssociatedElintsError("Failed to load associated ELINT");
        })
        .finally(() => setLoadingAssociatedElints(false));

      setLoadingTrackedEntityObservations(true);
      setTrackedEntityObservationsError(undefined);
      fetchTrackedEntityObservationsForUnit(selectedUnit)
        .then(setTrackedEntityObservations)
        .catch((err) => {
          console.error("Error fetching tracked entity observations:", err);
          setTrackedEntityObservationsError("Failed to load observations");
        })
        .finally(() => setLoadingTrackedEntityObservations(false));
    } else {
      setAssociatedElints([]);
      setAssociatedElintsError(undefined);
      setTrackedEntityObservations([]);
      setTrackedEntityObservationsError(undefined);
    }
  }, [selectedUnit]);

  const refreshAssociatedElints = useCallback(async (unitInstance: unit.OsdkInstance) => {
    setLoadingAssociatedElints(true);
    setAssociatedElintsError(undefined);
    try {
      const data = await fetchAssociatedElintsForUnit(unitInstance);
      setAssociatedElints(data);
    } catch (err) {
      console.error("Error fetching associated ELINTs:", err);
      setAssociatedElintsError("Failed to load associated ELINT");
    } finally {
      setLoadingAssociatedElints(false);
    }
  }, []);

  const doAssociateElintWithUnit = useCallback(async (elintInstance: elint.OsdkInstance, unitInstance: unit.OsdkInstance) => {
    setAssociatingElint(true);
    setElintAssociationError(undefined);
    try {
      await performAssociateElintWithUnit(elintInstance, unitInstance);
      await refreshAssociatedElints(unitInstance);
    } catch (err) {
      console.error("Error associating ELINT with unit:", err);
      setElintAssociationError("Failed to associate ELINT");
    } finally {
      setAssociatingElint(false);
    }
  }, [refreshAssociatedElints]);

  return (
    <OsdkDataContext.Provider value={{
      associateElintWithUnit: doAssociateElintWithUnit,
      associatedElints,
      associatedElintsError,
      associatingElint,
      collateralConcerns,
      elintAssociationError,
      elints,
      loadingAssociatedElints,
      loadingMapData,
      loadingTrackedEntityObservations,
      loadingUnitHierarchy,
      loadingUser,
      refreshAssociatedElints,
      trackedEntityObservations,
      trackedEntityObservationsError,
      unitHierarchy,
      unitHierarchyError,
      unitLocations,
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
