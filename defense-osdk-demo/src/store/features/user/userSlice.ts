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
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";

interface UserState {
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUserId: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    getCurrentUser: (state) => {
      state.loading = true;
      state.error = null;
    },
    setCurrentUser: (state, action: PayloadAction<string>) => {
      state.currentUserId = action.payload;
      state.loading = false;
      state.error = null;
    },
    setUserError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { getCurrentUser, setCurrentUser, setUserError } =
  userSlice.actions;

export default userSlice.reducer;
