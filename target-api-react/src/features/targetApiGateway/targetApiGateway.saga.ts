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
import { THIRD_PARTY_APP } from "../../config";
import { selectLoadedTargetBoard } from "./targetApiGateway.selectors";
import {
  addObservation,
  AddObservationPayload,
  createTarget,
  CreateTargetPayload,
  loadTarget,
  loadTargets,
  loadTargetsWithoutLoading,
  setAddObservationError,
  setAddObservationResponse,
  setCreateTargetError,
  setCreateTargetResponse,
  setTargetBoardColumns,
  setTargets,
  Target,
  updateSingleTarget,
} from "./targetApiGateway.slice";
import auth from "../../client/auth";

function* fetchTargetDetails(targetRid: string, updateState = false): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }
    const response: Response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/target/${targetRid}?preview=true`,
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
      const target = yield response.json();

      if (updateState && target && target.target) {
        // Normalize location for state update
        let location: Target["location"] | undefined = undefined;
        const loc = target.target.location;
        if (loc) {
          if (
            typeof loc.latitude === "number" &&
            typeof loc.longitude === "number"
          ) {
            location = {
              latitude: loc.latitude,
              longitude: loc.longitude,
              radius: loc.radius ?? 100,
              elevation: loc.elevation ?? 0,
            };
          } else if (
            loc.manualLocation &&
            typeof loc.manualLocation.lat === "number" &&
            typeof loc.manualLocation.lng === "number"
          ) {
            location = {
              latitude: loc.manualLocation.lat,
              longitude: loc.manualLocation.lng,
              radius: loc.radius ?? 100,
              elevation: loc.manualLocation.elevation ?? 0,
            };
          } else if (
            loc.center &&
            typeof loc.center.latitude === "number" &&
            typeof loc.center.longitude === "number"
          ) {
            location = {
              latitude: loc.center.latitude,
              longitude: loc.center.longitude,
              radius: loc.radius ?? 100,
              elevation: loc.center.elevation ?? 0,
            };
          }
        }

        const boardRid = yield select(selectLoadedTargetBoard);
        // Get column information for this target
        let tokenForBoard = yield call(auth.getToken);
        const boardResponse = yield call(() =>
          fetch(
            `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/targetBoard/${boardRid}?preview=true`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${tokenForBoard}`,
                "Content-Type": "application/json",
              },
            }
          )
        );

        if (boardResponse.ok) {
          const boardData: any = yield boardResponse.json();
          const targetColumnIds = boardData.targetBoard.targetColumnIds || {};
          const columns = boardData.targetBoard.configuration?.columns || [];

          // Find the column for this target
          const targetColumnMapping = targetColumnIds[targetRid];
          const columnId = targetColumnMapping?.columnId;
          const column = columns.find((c: any) => c.id === columnId);
          const columnName = column?.name || columnId || "Unknown";

          // Create target object for state update
          const targetObj: Target = {
            rid: target.target.rid,
            name: target.target.name,
            column: columnName,
            location,
            baseRevisionId: target.baseRevisionId,
          };

          yield put(updateSingleTarget(targetObj));
        }
      }

      return target;
    } else {
      const error = yield response.json();
      console.error("Error fetching target details:", error);
      return null;
    }
  } catch (error) {
    console.error("Error in fetchTargetDetails saga:", error);
    return null;
  }
}

function* fetchTargetsForBoard(): any {
  try {
    let token = yield call(auth.getToken);
    if (!token) {
      token = yield call(auth.signIn);
    }
    const boardRid = yield select(selectLoadedTargetBoard);

    const response = yield call(() =>
      fetch(
        `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/targetBoard/${boardRid}?preview=true`,
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
      const data: any = yield response.json();
      if (data.targetBoard && data.targetBoard.targets) {
        const targets: Target[] = [];
        const targetRids = data.targetBoard.targets;
        const targetColumnIds = data.targetBoard.targetColumnIds || {};
        const columns = data.targetBoard.configuration?.columns || [];

        // Extract column IDs for dropdown
        if (columns && columns.length > 0) {
          const columnIds = columns.map((column: any) => column.id);
          yield put(setTargetBoardColumns(columnIds));
        }

        for (const targetRid of targetRids) {
          // Find the column for this target
          const targetColumnMapping = targetColumnIds[targetRid];
          const columnId = targetColumnMapping?.columnId;
          const column = columns.find((c: any) => c.id === columnId);
          const columnName = column?.name || columnId || "Unknown";

          const targetDetails = yield call(
            fetchTargetDetails,
            targetRid,
            false
          );
          if (targetDetails && targetDetails.target) {
            // Normalize location
            let location: Target["location"] | undefined = undefined;
            const loc = targetDetails.target.location;
            if (loc) {
              if (
                typeof loc.latitude === "number" &&
                typeof loc.longitude === "number"
              ) {
                location = {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  radius: loc.radius ?? 100,
                  elevation: loc.elevation ?? 0,
                };
              } else if (
                loc.manualLocation &&
                typeof loc.manualLocation.lat === "number" &&
                typeof loc.manualLocation.lng === "number"
              ) {
                location = {
                  latitude: loc.manualLocation.lat,
                  longitude: loc.manualLocation.lng,
                  radius: loc.radius ?? 100,
                  elevation: loc.manualLocation.elevation ?? 0,
                };
              } else if (
                loc.center &&
                typeof loc.center.latitude === "number" &&
                typeof loc.center.longitude === "number"
              ) {
                location = {
                  latitude: loc.center.latitude,
                  longitude: loc.center.longitude,
                  radius: loc.radius ?? 100,
                  elevation: loc.center.elevation ?? 0,
                };
              }
            }
            const targetObj: Target = {
              rid: targetDetails.target.rid,
              name: targetDetails.target.name,
              column: columnName,
              location,
              baseRevisionId: targetDetails.baseRevisionId,
            };
            targets.push(targetObj);
          }
        }
        yield put(setTargets(targets));
      }
    } else {
      const error = yield response.json();
      console.error("Error fetching targets for board:", error);
    }
  } catch (error) {
    console.error("Error in fetchTargetsForBoard saga: ", error);
  }
}

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
      const targetRid = data.targetRid; // Use the correct property name
      console.log("Target created successfully. Target RID:", targetRid);
      yield put(setCreateTargetResponse(data));
      yield put(setCreateTargetError(null));

      // If we have a target ID, load the target details to get complete information
      if (targetRid) {
        console.log("Fetching details for newly created target:", targetRid);
        try {
          // Debug: Explicitly fetch the target details
          let fetchToken = yield call(auth.getToken);
          const targetResponse: Response = yield call(() =>
            fetch(
              `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/target/${targetRid}?preview=true`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${fetchToken}`,
                  "Content-Type": "application/json",
                },
              }
            )
          );

          if (targetResponse.ok) {
            const targetData = yield targetResponse.json();
            console.log("Target details fetched:", targetData);

            // Process target data
            if (targetData && targetData.target) {
              // Normalize location for state update
              let location: Target["location"] | undefined = undefined;
              const loc = targetData.target.location;
              if (loc) {
                if (
                  typeof loc.latitude === "number" &&
                  typeof loc.longitude === "number"
                ) {
                  location = {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    radius: loc.radius ?? 100,
                    elevation: loc.elevation ?? 0,
                  };
                } else if (
                  loc.manualLocation &&
                  typeof loc.manualLocation.lat === "number" &&
                  typeof loc.manualLocation.lng === "number"
                ) {
                  location = {
                    latitude: loc.manualLocation.lat,
                    longitude: loc.manualLocation.lng,
                    radius: loc.radius ?? 100,
                    elevation: loc.manualLocation.elevation ?? 0,
                  };
                } else if (
                  loc.center &&
                  typeof loc.center.latitude === "number" &&
                  typeof loc.center.longitude === "number"
                ) {
                  location = {
                    latitude: loc.center.latitude,
                    longitude: loc.center.longitude,
                    radius: loc.radius ?? 100,
                    elevation: loc.center.elevation ?? 0,
                  };
                }
              }

              // If no location found in the response, use the values from the form
              if (!location) {
                location = {
                  latitude: action.payload.latitude,
                  longitude: action.payload.longitude,
                  radius: action.payload.radius || 100,
                  elevation: 0,
                };
              }

              // Create target object
              const targetObj: Target = {
                rid: targetRid,
                name: targetData.target.name || action.payload.name,
                column: action.payload.column,
                location,
                baseRevisionId: targetData.baseRevisionId || 0,
              };

              console.log("Updating state with target:", targetObj);
              yield put(updateSingleTarget(targetObj));
            }
          } else {
            console.error("Failed to fetch target details after creation");
          }
        } catch (fetchError) {
          console.error(
            "Error fetching target details after creation:",
            fetchError
          );
        }
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

      // Reload just the updated target
      yield call(fetchTargetDetails, action.payload.targetId, true);
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

export default function* targetApiGatewaySaga(): Generator<any, void, unknown> {
  yield takeLatest(loadTargets.type, function* () {
    yield fetchTargetsForBoard();
  });
  yield takeLatest(loadTargetsWithoutLoading.type, function* () {
    yield delay(3000);
    yield fetchTargetsForBoard();
  });
  yield takeLatest(loadTarget.type, function* (action: PayloadAction<string>) {
    yield fetchTargetDetails(action.payload, true);
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
