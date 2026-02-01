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
import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { all } from "redux-saga/effects";

// Import reducers
import userReducer from "./features/user/userSlice";
import targetingReducer from "./features/targeting/targetingSlice";
import uiReducer from "./features/ui/uiSlice";
import gaiaReducer from "./features/gaia/gaiaSlice";

// Import sagas
import userSagas from "./features/user/userSagas";
import targetingSagas from "./features/targeting/targetingSagas";
import { gaiaSagas } from "./features/gaia/gaiaSagas";

// Root saga that combines all feature sagas
function* rootSaga() {
  yield all([
    // Feature-specific sagas
    userSagas(),
    targetingSagas(),
    gaiaSagas(),

    // Add other feature sagas as they are implemented
  ]);
}

const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: {
    user: userReducer,
    targeting: targetingReducer,
    ui: uiReducer,
    gaia: gaiaReducer,
    // Add other feature reducers as they are implemented
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
// Export the RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;

export default store;
