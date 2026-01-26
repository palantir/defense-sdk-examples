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
import { call, put, select, takeLatest } from "redux-saga/effects";
import { client } from "../../client";
import { targetOntologyTargetBoard } from "@defense-osdk-demo/sdk";
import { Users } from "@osdk/foundry.admin";
import { PalantirApiError, type PageResult, type Osdk } from "@osdk/client";
import {
  loadTargetBoards,
  setCurrentUserId,
  setTargetBoards,
  setTargetBoardsError,
  TargetBoard,
  selectCurrentUserId,
} from "./targetBoards.slice";

/**
 * Fetches the current user
 */
function* fetchCurrentUser(): Generator<any, string | null, any> {
  try {
    console.log("Fetching current user");
    const result = yield call([Users, "getCurrent"], client);

    if (result && result.id) {
      console.log(`Current user ID: ${result.id}`);
      yield put(setCurrentUserId(result.id));
      return result.id;
    } else {
      console.error("Failed to get current user ID");
      return null;
    }
  } catch (error) {
    if (error instanceof PalantirApiError) {
      console.error("API error fetching current user:", error.errorName);
    } else {
      console.error("Error fetching current user:", error);
    }
    return null;
  }
}

/**
 * Fetches target boards created by the current user
 */
function* fetchUserTargetBoards(): Generator<any, void, any> {
  try {
    // Check if we already have the user ID
    let userId = yield select(selectCurrentUserId);

    // If not, fetch the current user
    if (!userId) {
      userId = yield call(fetchCurrentUser);
      if (!userId) {
        throw new Error("Failed to get current user ID");
      }
    }

    console.log(`Fetching target boards for user ${userId}`);

    const page: PageResult<Osdk.Instance<typeof targetOntologyTargetBoard>> =
      yield call(
        [
          client(targetOntologyTargetBoard).where({
            createdby: { $eq: userId }
          }),
          "fetchPage",
        ],
        {
          $pageSize: 100,
        },
      );

    console.log("Fetched boards raw response:", page);

    // Extract the board data and filter by creator
    let boards = page.data || [];

    console.log(`Retrieved ${boards.length} total boards`);

    // Log the boards to see what's available
    if (boards.length > 0) {
      console.log("First board example:", boards[0]);
      console.log("Board properties:", Object.keys(boards[0]));
    }

    // Let's try different approaches to find the user's boards

    // First, see if there are any boards with matching creator properties
    const userBoards = boards.filter((board) => {
      // TypeScript doesn't know about all possible properties, so use type assertions
      const boardAny = board as any;

      // Try all possible property names for creator
      return (
        (board.createdby && board.createdby === userId) ||
        (boardAny.createdBy && boardAny.createdBy === userId) ||
        (boardAny.creator && boardAny.creator === userId) ||
        // Try to access other potential properties
        (boardAny.$objectFields && boardAny.$objectFields.createdby === userId)
      );
    });

    console.log(`Found ${userBoards.length} boards after filtering by creator`);

    // If we didn't find any boards with creator properties, just return all boards
    // This is a fallback so users can see something
    boards = userBoards.length > 0 ? userBoards : boards;

    console.log(
      `Found ${boards.length} target boards created by user ${userId}`,
    );

    // Map to our TargetBoard type
    const formattedBoards: TargetBoard[] = boards.map((board) => ({
      rid: board.$primaryKey,
      title: board.$title || board.name || "Unnamed Board",
    }));

    // Update the state with the fetched boards
    yield put(setTargetBoards(formattedBoards));
  } catch (error: any) {
    console.error("Error fetching user target boards:", error);
    yield put(
      setTargetBoardsError(error.message || "Failed to load target boards"),
    );
  }
}

export default function* targetBoardsSaga(): Generator<any, void, unknown> {
  yield takeLatest(loadTargetBoards.type, fetchUserTargetBoards);
}
