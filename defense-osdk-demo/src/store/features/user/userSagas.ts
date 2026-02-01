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
import { call, put, takeLatest, delay } from "redux-saga/effects";
import { PalantirApiError } from "@osdk/client";
import { Users } from "@osdk/foundry.admin";
import { client } from "../../../client";
import { getCurrentUser, setCurrentUser, setUserError } from "./userSlice";
import { loadTargetBoards } from "../targeting/targetingSlice";

/**
 * Fetches the current user
 */
export function* fetchCurrentUserSaga(): any { // Generator<any, string | null, any> {
  try {
    console.log("Fetching current user");
    const result = yield call([Users, "getCurrent"], client);

    if (result && result.id) {
      console.log(`Current user ID: ${result.id}`);
      yield put(setCurrentUser(result.id));

      // Load target boards after the user is loaded
      // Add a small delay to ensure the user is in the store
      yield delay(100);
      yield put(loadTargetBoards());

      return result.id;
    } else {
      console.error("Failed to get current user ID");
      yield put(setUserError("Failed to get current user ID"));
      return null;
    }
  } catch (error) {
    if (error instanceof PalantirApiError) {
      console.error("API error fetching current user:", error.errorName);
      yield put(setUserError(`API error: ${error.errorName}`));
    } else {
      console.error("Error fetching current user:", error);
      yield put(setUserError("Failed to fetch current user"));
    }
    return null;
  }
}

export default function* userSaga(): Generator<any, void, unknown> {
  yield takeLatest(getCurrentUser.type, fetchCurrentUserSaga);
}
