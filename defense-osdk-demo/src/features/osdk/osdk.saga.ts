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
import { call, delay, put, select, takeLatest } from "redux-saga/effects";
import { selectLoadedTargetBoard } from "./osdk.selectors";
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
  ColumnInfo,
} from "./osdk.slice";
import { client, auth } from "../../client";
import {
  targetOntologyTargetBoard,
  targetOntologyColumn,
  targetOntologyTarget,
  targetOntologyPuck,
  twbWritebackTargetOntologyCreateTarget,
  twbWritebackTargetOntologyAddTargetObservation,
} from "@defense-osdk-demo/sdk";
import type { Osdk } from "@osdk/client";

/**
 * Helper function to extract location data from various location formats
 */
function extractLocationFromTargetData(
  targetData: any,
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
          `Extracted GeoJSON location: lat ${latitude}, lon ${longitude}`,
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
 * Fetch a single target by its ID using the OSDK
 * This is used for loading individual targets, e.g. when adding observations
 */
function* fetchSingleTarget(targetId: string): any {
  try {
    console.log(`Fetching single target with ID ${targetId}`);

    // Use OSDK to fetch the target by primary key
    const targetData: Osdk.Instance<typeof targetOntologyTarget> = yield call(
      [client(targetOntologyTarget), "fetchOne"],
      targetId,
    );

    if (targetData) {
      // Extract location data
      const location = extractLocationFromTargetData(targetData);

      // Get the pucks to determine which column the target is in using $link
      const pucksResponse = yield call([
        targetData.$link.targetPucks,
        "fetchPage",
      ]);

      // Extract the items from the response's data field
      const pucks = pucksResponse.data || [];
      let columnName = "Unknown";

      if (pucks && pucks.length > 0) {
        // Get the first puck's column using $link (accessing link from puck object)
        const columnResponse = yield call([
          pucks[0].$link.columns,
          "fetchPage",
        ]);
        const column = columnResponse.data || [];
        if (column && column.length > 0) {
          columnName = column[0].name || "Unknown Column";
        }
      }

      // Create target object
      const targetObj: Target = {
        rid: targetData.$primaryKey,
        name: targetData.name || "Unnamed Target",
        column: columnName,
        location,
        baseRevisionId: 0, // This may need to be handled differently
      };

      yield put(updateSingleTarget(targetObj));
      return targetObj;
    } else {
      console.error("Error fetching target details: Target not found");
      return null;
    }
  } catch (error) {
    console.error("Error in fetchSingleTarget saga:", error);
    return null;
  }
}

/**
 * Fetches all targets for a board using the OSDK with the traversal pattern:
 * board --> columns --> pucks --> targets
 */
function* fetchTargetsForBoard(): any {
  try {
    const boardRid = yield select(selectLoadedTargetBoard);

    console.log(`Fetching targets for board ${boardRid} using OSDK`);

    try {
      // Step 1: Get the target board
      const board: Osdk.Instance<typeof targetOntologyTargetBoard> = yield call(
        [client(targetOntologyTargetBoard), "fetchOne"],
        boardRid,
      );
      if (!board) {
        console.error(`Board with ID ${boardRid} not found`);
        yield put(setTargets([]));
        return;
      }

      // Step 2: Get columns for the board using $link (accessing link from board object)
      console.log(`Fetching columns for board ${boardRid}`);
      const columnsResponse = yield call([board.$link.columns, "fetchPage"]);
      
      // Extract the items from the response's data field
      const columns = columnsResponse.data || [];
      console.log(`Found ${columns.length} columns`);

      // Store column information (ID, short ID, and name)
      const columnInfos: ColumnInfo[] = [];

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

      // Update columns in state
      if (columnInfos.length > 0) {
        yield put(setTargetBoardColumns(columnInfos));
      }

      // Create a map for quick lookups
      const columnMap = new Map<string, string>();
      columnInfos.forEach((col) => {
        columnMap.set(col.id, col.name);
      });

      // Step 3: Process each column to get its pucks and associated targets
      const allTargets: Target[] = [];

      for (const column of columns) {
        const columnName = column.name || "Unknown Column";

        // Get all pucks for this column using $link (accessing link from column object)
        console.log(`Fetching pucks for column ${columnName}`);
        const pucksResponse = yield call([column.$link.pucks, "fetchPage"]);

        // Extract the items from the response's data field
        const pucks = pucksResponse.data || [];
        console.log(`Found ${pucks.length} pucks in column ${columnName}`);

        // For each puck, get its target
        for (const puck of pucks) {
          console.log(`Fetching target for puck ${puck.targetpuckid}`);

          try {
            // Use $link to fetch the target from the puck (using fetchOne instead of fetch)
            const targetResponse = yield call([puck.$link.target, "fetchOne"]);
            // The response may be the target object directly or might need to access data field
            const target = targetResponse.data
              ? targetResponse.data
              : targetResponse;

            if (target) {
              // Extract location data
              const location = extractLocationFromTargetData(target);

              // Create target object for state update
              const targetObj: Target = {
                rid: target.artifactid || target.targetid,
                name: target.name || "Unnamed Target",
                column: columnName,
                location,
                baseRevisionId: 0, // We don't have baseRevisionId in the SDK
              };

              allTargets.push(targetObj);
            }
          } catch (e) {
            console.error(
              `Error fetching target for puck ${puck.targetpuckid}:`,
              e,
            );
          }
        }
      }

      console.log(
        `Loaded ${allTargets.length} targets across ${columns.length} columns`,
      );
      yield put(setTargets(allTargets));
    } catch (e) {
      console.error("Error fetching targets using OSDK:", e);
      yield put(setTargets([]));
    }
  } catch (error) {
    console.error("Error in fetchTargetsForBoard saga:", error);
    // Ensure loading state is reset even when there's an error
    yield put(setTargets([]));
  }
}

/**
 * Create a new target using the OSDK action API
 */
function* createNewTarget(action: PayloadAction<CreateTargetPayload>): any {
  try {
    console.log("Creating new target with OSDK action");

    // Prepare the action parameters
    const actionParams = {
      targetBoardId: action.payload.targetBoardId,
      columnId: action.payload.column,
      classificationMarkings: action.payload.classificationMarkings || ["U"],
      name: action.payload.name,
      description: action.payload.description || "",
      targetType: action.payload.targetType || "Unknown",
      observationTimestamp: formatTimestamp(
        action.payload.observationTimestamp,
      ),
      latitude: action.payload.latitude,
      longitude: action.payload.longitude,
      entityId: action.payload.entityId, // Optional - use the phonograph object RID if nominating an existing entity
    };

    try {
      // Execute the action using OSDK
      const result = yield call(
        [client(twbWritebackTargetOntologyCreateTarget), "applyAction"],
        actionParams,
        { $returnEdits: true },
      );

      // Process the result based on the edits
      if (result.type === "edits") {
        console.log(
          "Target created successfully:",
          result.editedObjectTypes[0],
        );
        yield put(setCreateTargetResponse(result));
        yield put(setCreateTargetError(null));
      } else {
        console.log("Target created with result:", result);
        yield put(setCreateTargetResponse(result));
        yield put(setCreateTargetError(null));
      }

      // Add a 2-second delay to give the backend time to sync
      console.log("Waiting 2 seconds for backend to sync...");
      yield delay(2000);

      // Set loading state to true and refresh the targets list
      yield put(loadTargets());
    } catch (apiError: any) {
      console.error("OSDK create target error:", apiError);
      throw new Error(apiError.message || "Failed to create target");
    }
  } catch (error: any) {
    yield put(
      setCreateTargetError(
        error.message || "An error occurred while creating target.",
      ),
    );
    console.error("Error in createNewTarget saga:", error);
  }
}

/**
 * Legacy implementation of addNewObservation using the TWB API
 * Kept for reference
 */
/*
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

      // Add a 2-second delay to give the backend time to sync
      console.log("Waiting 2 seconds for backend to sync...");
      yield delay(2000);

      // Reload the target with updated data
      yield put(loadTarget(action.payload.targetId));
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
*/

/**
 * Add a new observation to a target using the OSDK action API
 */
function* addNewObservation(action: PayloadAction<AddObservationPayload>): any {
  try {
    console.log("Adding observation with OSDK action");

    // Prepare the action parameters
    const actionParams = {
      targetId: action.payload.targetId,
      observationTimestamp: formatTimestamp(new Date()),
      latitude: action.payload.latitude,
      longitude: action.payload.longitude,
    };

    try {
      // Execute the action using OSDK
      const result = yield call(
        [client(twbWritebackTargetOntologyAddTargetObservation), "applyAction"],
        actionParams,
        { $returnEdits: true },
      );

      // Process the result based on the edits
      if (result.type === "edits") {
        console.log(
          "Observation added successfully:",
          result.editedObjectTypes[0],
        );
        yield put(setAddObservationResponse(result));
        yield put(setAddObservationError(null));
      } else {
        console.log("Observation added with result:", result);
        yield put(setAddObservationResponse(result));
        yield put(setAddObservationError(null));
      }

      // Add a 2-second delay to give the backend time to sync
      console.log("Waiting 2 seconds for backend to sync...");
      yield delay(2000);

      // Reload the target with updated data
      yield put(loadTarget(action.payload.targetId));
    } catch (apiError: any) {
      console.error("OSDK add observation error:", apiError);
      throw new Error(apiError.message || "Failed to add observation");
    }
  } catch (error: any) {
    yield put(
      setAddObservationError(
        error.message || "An error occurred while adding observation.",
      ),
    );
    console.error("Error in addNewObservation saga: ", error);
  }
}

/**
 * Helper function to ensure timestamps are in ISO format
 */
function formatTimestamp(
  timestamp: string | number | Date | undefined,
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
    },
  );
  yield takeLatest(
    addObservation.type,
    function* (action: PayloadAction<AddObservationPayload>) {
      yield addNewObservation(action);
    },
  );
}
