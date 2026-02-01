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
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components/spinner/spinner";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import DataFilter from "../DataFilter";
import MapView from "../MapView";
import SelectedDataView from "../SelectedDataView";
import { selectLoading } from "../../store/features/targeting/targetingSelectors";
import {
  setModalContent as setModalContentAction,
  setContextMenuLocation as setContextMenuLocationAction,
} from "../../store/features/ui/uiSlice";
import {
  selectModalContent,
  selectContextMenuLocation,
} from "../../store/features/ui/uiSelectors";
import { getCurrentUser } from "../../store/features/user/userSlice";
import {
  loadTargets,
  setSelectedTargetBoard,
  setTargets,
  loadTargetBoards,
} from "../../store/features/targeting/targetingSlice";

// Simple AppAuthGate component that just renders children
// Since auth is now handled by @osdk/oauth in a simpler way
export const AppAuthGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  // Use selectors from our new store structure
  const loading = useSelector(selectLoading);
  const modalContent = useSelector(selectModalContent);
  const contextMenuLocation = useSelector(selectContextMenuLocation);

  // Local state for selected target and filters
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  // Get dispatch for dispatching actions
  const dispatch = useDispatch();

  // Initialize app by loading user and target boards
  useEffect(() => {
    dispatch(getCurrentUser());
    dispatch(loadTargetBoards());
  }, [dispatch]);

  // Create wrapped versions of the action creators
  const setModalContent = (content: string | null) =>
    dispatch(setModalContentAction(content));
  const setContextMenuLocation = (
    location: { lat: number; lon: number } | null,
  ) => dispatch(setContextMenuLocationAction(location));

  // Handle board selection change
  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    if (boardId) {
      setSelectedTarget(null);
      dispatch(setTargets([]));
      dispatch(setSelectedTargetBoard(boardId));
      dispatch(loadTargets());
    }
  };

  return (
    <div className="main-container">
      {loading && (
        <div className="spinner-overlay">
          <Spinner intent="primary" size={SpinnerSize.LARGE} />
        </div>
      )}
      <h1>Defense OSDK Demo</h1>
      <div className="content-container">
        <div className="left-container">
          <DataFilter
            selectedBoardId={selectedBoardId}
            onBoardChange={handleBoardChange}
            selectedLayer=""
            onLayerChange={() => {}}
          />
          <MapView
            setSelectedTarget={setSelectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            selectedTarget={selectedTarget}
            setContextMenuLocation={setContextMenuLocation}
          />
        </div>
        <div className="right-container">
          <SelectedDataView
            selectedTarget={selectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            contextMenuLocation={contextMenuLocation}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
