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
import {
  selectClientToken,
  selectLoadedTargetBoard,
} from "./targetApiGateway.selectors";
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
  setClientToken,
  setTargets,
  Target,
} from "./targetApiGateway.slice";
import { generateCodeChallenge, generateCodeVerifier } from "../../pkceUtils";
import { openBrowserAndGetAuthCode } from "../../authUtils";

function* fetchAuthToken(): any {
  try {
    // 1. Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = yield call(generateCodeChallenge, codeVerifier);

    // 2. Build the authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: THIRD_PARTY_APP.CLIENT_ID,
      redirect_uri: THIRD_PARTY_APP.REDIRECT_URL,
      state: Math.random().toString(36).substring(2), // CSRF protection
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    const authUrl = `${THIRD_PARTY_APP.CLIENT_URL}/multipass/api/oauth2/authorize?${params}`;

    // 3. Open browser window for user to authenticate
    const authorizationCode = yield call(
      openBrowserAndGetAuthCode,
      authUrl,
      THIRD_PARTY_APP.REDIRECT_URL
    );

    // 4. Exchange the authorization code for an access token (NO client_secret needed)
    const response: Response = yield call(() =>
      fetch(`${THIRD_PARTY_APP.CLIENT_URL}/multipass/api/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: THIRD_PARTY_APP.REDIRECT_URL,
          client_id: THIRD_PARTY_APP.CLIENT_ID,
          code_verifier: codeVerifier,
        }),
      })
    );

    if (response.ok) {
      const data = yield response.json();
      const token = data.access_token;
      yield put(setClientToken(token));
      return token;
    } else {
      const error = yield response.json();
      console.error("Error fetching auth token:", error);
      return null;
    }
  } catch (error) {
    console.error("Error in fetchAuthToken saga:", error);
    return null;
  }
}

function* fetchTargetDetails(targetRid: string): any {
  console.log(`🔍 fetchTargetDetails: Starting for RID: ${targetRid}`);

  try {
    const token = (yield select(selectClientToken)) as string;
    console.log(`🔑 fetchTargetDetails: Token exists: ${!!token}`);

    if (!token) {
      console.error("❌ fetchTargetDetails: No token available");
      throw new Error("Authentication failed");
    }

    const url = `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/target/${targetRid}?preview=true`;
    console.log(`🌐 fetchTargetDetails: Fetching from URL: ${url}`);

    const response: Response = yield call(() =>
      fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    );

    console.log(
      `📡 fetchTargetDetails: Response status: ${response.status} ${response.statusText}`
    );

    if (response.ok) {
      const target = yield response.json();
      console.log(`📦 fetchTargetDetails: Raw response data:`, target);

      // Log the structure to understand what we're getting
      console.log(`📋 fetchTargetDetails: Target structure analysis:`, {
        hasTarget: !!target.target,
        targetKeys: target.target ? Object.keys(target.target) : [],
        targetName: target.target?.name,
        targetRid: target.target?.rid,
        hasLocation: !!target.target?.location,
        locationStructure: target.target?.location
          ? Object.keys(target.target.location)
          : [],
        hasCenter: !!target.target?.location?.center,
        centerData: target.target?.location?.center,
        baseRevisionId: target.baseRevisionId,
      });

      console.log(
        `✅ fetchTargetDetails: Successfully got target data for ${target.target?.name || "unnamed"}`
      );
      return target;
    } else {
      console.error(`❌ fetchTargetDetails: HTTP Error ${response.status}`);

      try {
        const errorText = yield response.text();
        console.error(`❌ fetchTargetDetails: Error response body:`, errorText);
        const error = JSON.parse(errorText);
        console.error(`❌ fetchTargetDetails: Parsed error:`, error);
      } catch (parseError) {
        console.error(`❌ fetchTargetDetails: Could not parse error response`);
      }

      return null;
    }
  } catch (error) {
    console.error(`❌ fetchTargetDetails: Exception occurred:`, error);
    if (error instanceof Error) {
      console.error(`❌ fetchTargetDetails: Error stack:`, error.stack);
    }
    return null;
  } finally {
    console.log(`🏁 fetchTargetDetails: Finished for RID: ${targetRid}`);
  }
}

function* fetchTargetsForBoard(): any {
  console.log("🚀 fetchTargetsForBoard: Starting...");

  try {
    const token = (yield select(selectClientToken)) as string;
    console.log(
      "🔑 Token exists:",
      !!token,
      token ? `(${token.substring(0, 20)}...)` : "null"
    );

    if (!token) {
      console.error("❌ No token available - authentication failed");
      throw new Error("Authentication failed");
    }

    const boardRid = yield select(selectLoadedTargetBoard);
    console.log("📋 Board RID:", boardRid);

    if (!boardRid) {
      console.error("❌ No board RID available");
      return;
    }

    const url = `${THIRD_PARTY_APP.CLIENT_URL}/api/gotham/v1/twb/targetBoard/${boardRid}?preview=true`;
    console.log("🌐 Fetching from URL:", url);

    const response = yield call(() =>
      fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    );

    console.log("📡 Response status:", response.status, response.statusText);

    if (response.ok) {
      const data: any = yield response.json();
      console.log("📦 Response data:", data);
      console.log("📦 Has targetBoard:", !!data.targetBoard);
      console.log("📦 Has targets array:", !!data.targetBoard?.targets);
      console.log("📦 Target RIDs:", data.targetBoard?.targets);

      if (data.targetBoard && data.targetBoard.targets) {
        const targets: Target[] = [];
        const targetRids = data.targetBoard.targets;
        const targetColumnIds = data.targetBoard.targetColumnIds || {};
        const columns = data.targetBoard.configuration?.columns || [];

        console.log(`🎯 Processing ${targetRids.length} target RIDs...`);
        console.log(
          "📋 Available columns:",
          columns.map((c: any) => ({ id: c.id, name: c.name }))
        );

        for (const [targetIndex, targetRid] of targetRids.entries()) {
          console.log(
            `  🎯 Processing target ${targetIndex + 1}/${targetRids.length}: ${targetRid}`
          );

          // Get the column for this target
          const targetColumnMapping = targetColumnIds[targetRid];
          const columnId = targetColumnMapping?.columnId;
          const column = columns.find((c: any) => c.id === columnId);
          const columnName = column?.name || columnId || "Unknown";

          console.log(`  📂 Target column: ${columnName} (ID: ${columnId})`);

          try {
            const targetDetails = yield call(fetchTargetDetails, targetRid);
            console.log(`  📋 Target details response:`, targetDetails);

            if (targetDetails && targetDetails.target) {
              console.log(
                `  ✅ Got target details for: ${targetDetails.target?.name || "unnamed"}`
              );

              // Debug location structure to understand different formats
              console.log(`  🌍 Location analysis:`, {
                hasLocation: !!targetDetails.target.location,
                location: targetDetails.target.location,
                locationKeys: targetDetails.target.location
                  ? Object.keys(targetDetails.target.location)
                  : [],
              });

              let location = undefined;
              if (targetDetails.target.location) {
                let lat, lng, radius, elevation;

                // Check for different location structures
                if (targetDetails.target.location.manualLocation) {
                  // Structure 1: location.manualLocation.lat/lng
                  lat = targetDetails.target.location.manualLocation.lat;
                  lng = targetDetails.target.location.manualLocation.lng;
                  radius = targetDetails.target.location.radius;
                  elevation =
                    targetDetails.target.location.manualLocation.elevation;
                  console.log(
                    `  📍 Using manualLocation coordinates: lat=${lat}, lng=${lng}`
                  );
                } else if (targetDetails.target.location.center) {
                  // Structure 2: location.center.latitude/longitude
                  lat = targetDetails.target.location.center.latitude;
                  lng = targetDetails.target.location.center.longitude;
                  radius = targetDetails.target.location.radius;
                  elevation = targetDetails.target.location.center.elevation;
                  console.log(
                    `  📍 Using center coordinates: lat=${lat}, lng=${lng}`
                  );
                } else if (
                  targetDetails.target.location.latitude !== undefined
                ) {
                  // Structure 3: location.latitude/longitude (direct)
                  lat = targetDetails.target.location.latitude;
                  lng = targetDetails.target.location.longitude;
                  radius = targetDetails.target.location.radius;
                  elevation = targetDetails.target.location.elevation;
                  console.log(
                    `  📍 Using direct coordinates: lat=${lat}, lng=${lng}`
                  );
                }

                // Create location object if we found valid coordinates
                if (lat !== undefined && lng !== undefined) {
                  location = {
                    latitude: lat,
                    longitude: lng,
                    radius: radius || 100, // Default radius if not provided
                    elevation: elevation || 0, // Default elevation if not provided
                  };
                  console.log(`  ✅ Created location object:`, location);
                } else {
                  console.warn(
                    `  ⚠️ No valid coordinates found in location:`,
                    targetDetails.target.location
                  );
                }
              }

              const targetObj: Target = {
                rid: targetDetails.target.rid,
                name: targetDetails.target.name,
                column: columnName,
                location: location,
                baseRevisionId: targetDetails.baseRevisionId,
              };
              targets.push(targetObj);
              console.log(
                `  ➕ Added target to array. Total targets: ${targets.length}`
              );
            } else {
              console.warn(`  ⚠️ No target details returned for: ${targetRid}`);
            }
          } catch (targetError) {
            console.error(
              `  ❌ Error fetching target ${targetRid}:`,
              targetError
            );
          }
        }

        console.log(
          `✅ Successfully processed ${targets.length} targets total`
        );
        yield put(setTargets(targets));
        console.log("✅ Targets set in Redux store");
      } else {
        console.warn("⚠️ No targetBoard or targets array found in response");
        yield put(setTargets([]));
      }
    } else {
      console.error("❌ HTTP Error:", response.status, response.statusText);

      try {
        const errorText = yield response.text();
        console.error("❌ Error response body:", errorText);
        const errorJson = JSON.parse(errorText);
        console.error("❌ Parsed error:", errorJson);
      } catch (parseError) {
        console.error("❌ Could not parse error response");
      }
    }
  } catch (error) {
    console.error("❌ Error in fetchTargetsForBoard saga:", error);
    if (error instanceof Error) {
      console.error("❌ Error stack:", error.stack);
    }
  } finally {
    console.log("🏁 fetchTargetsForBoard: Finished");
  }
}

function* createNewTarget(action: PayloadAction<CreateTargetPayload>): any {
  try {
    const token = (yield select(selectClientToken)) as string;
    if (!token) throw new Error("Authentication failed");

    const payload = {
      name: action.payload.name,
      targetBoard: action.payload.targetBoardId,
      column: action.payload.column,
      location: {
        manualLocation: {
          lat: action.payload.latitude,
          lng: action.payload.longitude,
          circularErrorInMeters: action.payload.radius || 100,
          hae: 0, 
          msl: 0, 
          agl: 0   
        }
      },
      security: {
        portionMarkings: action.payload.classificationMarkings || [],
      },
      targetType: action.payload.targetType || "Unknown",
      description: action.payload.description || "",
    };

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
      yield put(setCreateTargetResponse(data));
      yield put(setCreateTargetError(null));
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
    const token = (yield select(selectClientToken)) as string;
    if (!token) throw new Error("Authentication failed");

    const payload = {
      name: action.payload.name,
      baseRevisionId: action.payload.baseRevisionId,
      location: {
        center: {
          longitude: action.payload.longitude,
          latitude: action.payload.latitude,
          elevation: action.payload.elevation,
        },
        radius: action.payload.radius,
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
    yield fetchAuthToken();
    yield fetchTargetsForBoard();
  });
  yield takeLatest(loadTargetsWithoutLoading.type, function* () {
    yield fetchAuthToken();
    yield delay(3000);
    yield fetchTargetsForBoard();
  });
  yield takeLatest(
    createTarget.type,
    function* (action: PayloadAction<CreateTargetPayload>) {
      yield fetchAuthToken();
      yield createNewTarget(action);
    }
  );
  yield takeLatest(
    addObservation.type,
    function* (action: PayloadAction<AddObservationPayload>) {
      yield fetchAuthToken();
      yield addNewObservation(action);
    }
  );
}
