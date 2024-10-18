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

interface NoLocationTableProps {
  targetsWithoutLocation: any[];
  setSelectedTarget: (target: any) => void;
}

const NoLocationTable: React.FC<NoLocationTableProps> = ({ targetsWithoutLocation, setSelectedTarget }) => {
  return (
    <div className="target-table-container">
      <h3>Targets without observed location</h3>
      <table className="target-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Target RID</th>
          </tr>
        </thead>
        <tbody>
          {targetsWithoutLocation.map(target => (
            <tr key={target.targetid} onClick={() => setSelectedTarget(target)}>
              <td><img src="/symbol-diamond.svg" alt="diamond icon" width="25" height="25" /></td>
              <td>{target.name}</td>
              <td>{target.targetid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NoLocationTable;