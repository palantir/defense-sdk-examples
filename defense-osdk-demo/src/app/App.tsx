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
import React, { useState } from "react";
import { useSelector } from "react-redux";
import NoLocationTable from "../components/NoLocationTable";
import TargetMap from "../components/TargetMap";
import TargetView from "../components/TargetView";
import { selectLoading } from "../features/osdk/osdk.selectors";

// Simple AppAuthGate component that just renders children
// Since auth is now handled by @osdk/oauth in a simpler way
export const AppAuthGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  const loading = useSelector(selectLoading);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [targetsWithoutLocation, setTargetsWithoutLocation] = useState<any[]>(
    [],
  );
  const [contextMenuLocation, setContextMenuLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

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
          <TargetMap
            setSelectedTarget={setSelectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            selectedTarget={selectedTarget}
            setTargetsWithoutLocation={setTargetsWithoutLocation}
            setContextMenuLocation={setContextMenuLocation}
          />
        </div>
        <div className="right-container">
          <TargetView
            selectedTarget={selectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            contextMenuLocation={contextMenuLocation}
          />
          {targetsWithoutLocation.length > 0 && (
            <NoLocationTable
              targetsWithoutLocation={targetsWithoutLocation}
              setSelectedTarget={setSelectedTarget}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
