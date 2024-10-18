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
import React from 'react';
import { Target } from '../features/targetApiGateway/targetApiGateway.slice';
import AddObservation from './modals/AddObservation';

interface TargetViewProps {
  selectedTarget: Target;
  setModalContent: (content: string | null) => void;
  modalContent: string | null;
  contextMenuLocation: { lat: number; lon: number } | null;
}

const TargetView: React.FC<TargetViewProps> = ({ selectedTarget, setModalContent, modalContent, contextMenuLocation }) => {
  const renderModal = () => {
    if (modalContent === 'addObservation' && contextMenuLocation) {
      return (
        <AddObservation
          selectedTarget={selectedTarget}
          onClose={() => setModalContent(null)}
          initialLat={contextMenuLocation.lat}
          initialLon={contextMenuLocation.lon}
        />
      );
    }
    return null;
  };

  return (
    <div className="target-view">
      {selectedTarget ? (
        <div className="target-details">
          <h3 className="target-name">{selectedTarget.name}</h3>
          <p><strong>Target RID:</strong> {selectedTarget.rid}</p>
          <p><strong>Column:</strong> {selectedTarget.column}</p>
          <p><strong>Last Observed Location:</strong> {
            selectedTarget.location 
            && selectedTarget.location.latitude !== undefined 
            && selectedTarget.location.longitude !== undefined 
            ? `[${selectedTarget.location.latitude}, ${selectedTarget.location.longitude}]` 
            : '[]'
          }</p>
        </div>
      ) : (
        <div className="target-placeholder">
          Select a target
        </div>
      )}
      {renderModal()}
    </div>
  );
};

export default TargetView;