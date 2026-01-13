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
import { PayloadAction } from "@reduxjs/toolkit";
import { call, put, select, takeLatest } from "redux-saga/effects";
import { THIRD_PARTY_APP } from "../../config";
import { selectLoadedTargetBoard } from "./targetApiGateway.selectors";
import {
  addObservation,
  AddObservationPayload,
  createTarget,
  CreateTargetPayload,
  loadTarget,
  loadTargets,
  setAddObservationError,
  setAddObservationResponse,
  setCreateTargetError,
  setCreateTargetResponse,
  setTargetBoardColumns,
  setTargets,
  Target,
  updateSingleTarget,
} from "./targetApiGateway.slice";
import auth from "../../auth";

/**
 * Helper function to extract location data from various location formats
 */
function extractLocationFromTargetData(
  targetData: any
): Target["location"] | undefined {
  if (!targetData) return undefined;

  // Try to extract location from lastObservationLocation field (might be JSON string)
  let lastObsLocation = targetData.lastobservationlocation;
  if (lastObsLocation && typeof lastObsLocation === "string") {
    try {
      lastObsLocation = JSON.parse(lastObsLocation);
    } catch (e) {
      console.warn("Failed to parse lastObservationLocation JSON", e);
      lastObsLocation = null;
    }
  }

  if (lastObsLocation) {
    // Handle GeoJSON format (type: "Point", coordinates: [lon, lat])
    if (
      lastObsLocation.type === "Point" &&
      Array.isArray(lastObsLocation.coordinates)
    ) {
      // GeoJSON Point format has coordinates as [longitude, latitude]
      const [longitude, latitude] = lastObsLocation.coordinates;
      if (typeof longitude === "number" && typeof latitude === "number") {
        console.log(
          `Extracted GeoJSON location: lat ${latitude}, lon ${longitude}`
        );
        return {
          latitude: latitude,
          longitude: longitude,
          radius: 100, // Default radius
          elevation: 0, // Default elevation
        };
      }
    }
    // Handle standard format with latitude/longitude properties
    else if (
      typeof lastObsLocation.latitude === "number" &&
      typeof lastObsLocation.longitude === "number"
    ) {
      return {
        latitude: lastObsLocation.latitude,
        longitude: lastObsLocation.longitude,
        radius: lastObsLocation.radius ?? 100,
        elevation: lastObsLocation.elevation ?? 0,
      };
    }
    // Handle format with lat/lng properties
    else if (lastObsLocation.lat && lastObsLocation.lng) {
      return {
        latitude: lastObsLocation.lat,
        longitude: lastObsLocation.lng,
        radius: lastObsLocation.radius ?? 100,
        elevation: lastObsLocation.elevation ?? 0,
      };
    }
  }

  console.log("Could not extract location from target data:", targetData);
  return undefined;
}

/**
 * Fetch a single target by its ID using the ontology endpoints
 * This is used for loading individual targets, e.g. when adding observations
 */
function* fetchSingleTarget(targetId: string): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }

    const response: Response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/v2/ontologies/${THIRD_PARTY_APP.ONTOLOGY}/objects/targetOntologyTarget/${targetId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
    );

    if (response.ok) {
      const targetData = yield response.json();

      if (targetData) {
        // Extract location data
        const location = extractLocationFromTargetData(targetData);

        // Create target object
        const targetObj: Target = {
          rid: targetData.__rid,
          name: targetData.name || "Unnamed Target",
          column: "Unknown", // We don't have column info when fetching a single target directly
          location,
          baseRevisionId: 0, // This may need to be handled differently
        };

        yield put(updateSingleTarget(targetObj));
        return targetObj;
      }
    } else {
      console.error("Error fetching target details:", yield response.text());
      return null;
    }
  } catch (error) {
    console.error("Error in fetchSingleTarget saga:", error);
    return null;
  }
}

/**
 * Fetches all targets for a board using the ontology endpoints with the traversal pattern:
 * board --> columns --> pucks --> targets
 */
function* fetchTargetsForBoard(): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }

    const boardRid = yield select(selectLoadedTargetBoard);
    const ontologyId = THIRD_PARTY_APP.ONTOLOGY;

    console.log(
      `Fetching targets for board ${boardRid} using ontology ${ontologyId}`
    );

    // Step 1: Get columns for the board
    console.log(`Fetching columns for board ${boardRid}`);
    const columnsResponse = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/v2/ontologies/${ontologyId}/objects/targetOntologyTargetBoard/${boardRid}/links/columns?pageSize=100`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
    );

    if (!columnsResponse.ok) {
      const error = yield columnsResponse.text();
      console.error("Error fetching columns:", error);
      return;
    }

    const columnsData = yield columnsResponse.json();
    const columns = columnsData.data || [];
    console.log(`Found ${columns.length} columns`);

    // Store column information (ID, short ID, and name)
    const columnInfos: { id: string; shortId: string; name: string }[] = [];

    for (const column of columns) {
      // Extract the short column ID (everything after the last ".")
      const fullId = column.targetboardcolumnid;
      const shortId = fullId.includes(".")
        ? fullId.substring(fullId.lastIndexOf(".") + 1)
        : fullId;

      columnInfos.push({
        id: fullId,
        shortId: shortId,
        name: column.name || "Unknown Column",
      });
    }

    // Create a map for quick lookups
    const columnMap = new Map();
    columnInfos.forEach((col) => {
      columnMap.set(col.id, col);
    });

    // Update columns in state
    if (columnInfos.length > 0) {
      yield put(setTargetBoardColumns(columnInfos));
    }

    // Step 2: Collect all puck IDs across all columns in a single request per column
    const allPucks = [];
    const puckToColumnMap = new Map(); // Map puck ID to column name for later use

    for (const column of columns) {
      const columnId = column.targetboardcolumnid;
      const columnName = column.name || "Unknown Column";

      console.log(`Fetching pucks for column ${columnName} (${columnId})`);
      const pucksResponse = yield call(() =>
        fetch(
          `${THIRD_PARTY_APP.CLIENT_URL}/api/v2/ontologies/${ontologyId}/objects/targetOntologyColumn/${columnId}/links/pucks?pageSize=100`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
      );

      if (!pucksResponse.ok) {
        console.error(
          `Error fetching pucks for column ${columnId}:`,
          yield pucksResponse.text()
        );
        continue;
      }

      const pucksData = yield pucksResponse.json();
      const pucks = pucksData.data || [];
      console.log(`Found ${pucks.length} pucks in column ${columnName}`);

      // Store pucks and their column association
      for (const puck of pucks) {
        allPucks.push(puck);
        puckToColumnMap.set(puck.targetpuckid, columnName);
      }
    }

    console.log(`Processing ${allPucks.length} total pucks across all columns`);

    // Step 3: Get targets for all pucks - one request per puck
    const allTargets: Target[] = [];

    for (const puck of allPucks) {
      const puckId = puck.targetpuckid;
      const columnName = puckToColumnMap.get(puckId) || "Unknown Column";

      // Get target for this puck
      console.log(`Fetching target for puck ${puckId}`);
      const targetResponse = yield call(() =>
        fetch(
          `${THIRD_PARTY_APP.CLIENT_URL}/api/v2/ontologies/${ontologyId}/objects/targetOntologyPuck/${puckId}/links/target`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
      );

      if (!targetResponse.ok) {
        console.error(
          `Error fetching target for puck ${puckId}:`,
          yield targetResponse.text()
        );
        continue;
      }

      const targetData = yield targetResponse.json();
      const targets = targetData.data || [];
      console.log(`Found ${targets.length} targets for puck ${puckId}`);

      // Process each target and add to our list
      for (const target of targets) {
        // Extract location data
        const location = extractLocationFromTargetData(target);

        // Create target object for state update
        const targetObj: Target = {
          rid: target.__rid || target.targetid,
          name: target.name || "Unnamed Target",
          column: columnName,
          location,
          baseRevisionId: target.baseRevisionId || 0,
        };

        allTargets.push(targetObj);
      }
    }

    console.log(
      `Loaded ${allTargets.length} targets across ${columns.length} columns`
    );
    yield put(setTargets(allTargets));
  } catch (error) {
    console.error("Error in fetchTargetsForBoard saga:", error);
  }
}

/**
 * Legacy implementation of createNewTarget using the TWB API
 * Kept for reference
 */
/*
function* createNewTarget(action: PayloadAction<CreateTargetPayload>): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }
    const payload = {
      name: action.payload.name,
      targetBoard: action.payload.targetBoardId,
      column: action.payload.column,
      location: {
        manualLocation: {
          lat: action.payload.latitude,
          lng: action.payload.longitude,
          circularErrorInMeters: action.payload.radius || 100.0,
          hae: { elevationInMeters: 0.0, linearErrorInMeters: 0.0 },
          msl: { elevationInMeters: 0.0, linearErrorInMeters: 0.0 },
          agl: { elevationInMeters: 0.0, linearErrorInMeters: 0.0 },
        },
      },
      security: {
        portionMarkings: action.payload.classificationMarkings || [],
      },
      targetType: action.payload.targetType || "Unknown",
      description: action.payload.description || "",
    };

    console.log("Creating new target with payload:", payload);
    const response: Response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/target?preview=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
    );

    if (response.ok) {
      const data = yield response.json();
      const targetRid = data.targetRid;
      console.log("Target created successfully. Target RID:", targetRid);
      yield put(setCreateTargetResponse(data));
      yield put(setCreateTargetError(null));

      if (targetRid) {
        yield call(fetchSingleTarget, targetRid);
      }
    } else {
      const error = yield response.json();
      throw new Error(error.message);
    }
  } catch (error: any) {
    yield put(
      setCreateTargetError(
        error.message || "An error occurred while creating target."
      )
    );
    console.error("Error in createNewTarget saga: ", error);
  }
}
*/

/**
 * Create a new target using the ontology action API
 */
function* createNewTarget(action: PayloadAction<CreateTargetPayload>): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }

    // Prepare the ontology action payload
    const ontologyPayload = {
      parameters: {
        targetBoardId: action.payload.targetBoardId,
        columnId: action.payload.column,
        classificationMarkings: action.payload.classificationMarkings || ["U"],
        name: action.payload.name,
        description: action.payload.description || "",
        targetType: action.payload.targetType || "Unknown",
        observationTimestamp: formatTimestamp(
          action.payload.observationTimestamp
        ),
        latitude: action.payload.latitude,
        longitude: action.payload.longitude,
        // entityId: // use the phonograph object RID if nominating an existing entity
      },
      options: {
        returnEdits: "ALL",
      },
    };

    console.log("Creating new target with ontology action:", ontologyPayload);
    const ontologyId = THIRD_PARTY_APP.ONTOLOGY;

    const response: Response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/v2/ontologies/${ontologyId}/actions/twb-writeback-target-ontology-create-target/apply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ontologyPayload),
        }
      )
    );

    if (response.ok) {
      const data = yield response.json();
      console.log("Target created successfully:", data);
      yield put(setCreateTargetResponse(data));
      yield put(setCreateTargetError(null));

      // Refresh the targets list to include the new target
      yield call(fetchTargetsForBoard);
    } else {
      const errorText = yield response.text();
      console.error("Error response from create target:", errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }

      throw new Error(errorData.message || "Failed to create target");
    }
  } catch (error: any) {
    yield put(
      setCreateTargetError(
        error.message || "An error occurred while creating target."
      )
    );
    console.error("Error in createNewTarget saga:", error);
  }
}

function* addNewObservation(action: PayloadAction<AddObservationPayload>): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }

    const payload = {
      name: action.payload.name,
      baseRevisionId: action.payload.baseRevisionId,
      location: {
        manualLocation: {
          lat: action.payload.latitude,
          lng: action.payload.longitude,
          circularErrorInMeters: action.payload.radius ?? 0,
        },
      },
    };

    const response: Response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/target/${action.payload.targetId}?preview=true`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
    );

    if (response.ok) {
      const data = yield response.json();
      yield put(setAddObservationResponse(data));
      yield put(setAddObservationError(null));

      yield call(fetchSingleTarget, action.payload.targetId);
    } else {
      const error = yield response.json();
      throw new Error(error.message);
    }
  } catch (error: any) {
    yield put(
      setAddObservationError(
        error.message || "An error occurred while adding observation."
      )
    );
    console.error("Error in addNewObservation saga: ", error);
  }
}

/**
 * Helper function to ensure timestamps are in ISO format
 */
function formatTimestamp(
  timestamp: string | number | Date | undefined
): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  // If it's already an ISO string that matches the format YYYY-MM-DDTHH:MM:SS.sssZ
  if (
    typeof timestamp === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)
  ) {
    return timestamp;
  }

  // If it's a date object, convert to ISO string
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // If it's a number (unix timestamp in milliseconds), convert to ISO string
  if (typeof timestamp === "number") {
    return new Date(timestamp).toISOString();
  }

  // For any other string format, try to parse it as a date
  try {
    return new Date(timestamp).toISOString();
  } catch (e) {
    console.warn("Invalid timestamp format, using current time", timestamp);
    return new Date().toISOString();
  }
}

export default function* targetApiGatewaySaga(): Generator<any, void, unknown> {
  yield takeLatest(loadTargets.type, function* () {
    yield fetchTargetsForBoard();
  });
  yield takeLatest(loadTarget.type, function* (action: PayloadAction<string>) {
    yield fetchSingleTarget(action.payload);
  });
  yield takeLatest(
    createTarget.type,
    function* (action: PayloadAction<CreateTargetPayload>) {
      yield createNewTarget(action);
    }
  );
  yield takeLatest(
    addObservation.type,
    function* (action: PayloadAction<AddObservationPayload>) {
      yield addNewObservation(action);
    }
  );
}
