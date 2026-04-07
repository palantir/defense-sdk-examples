/*
 * (c) Copyright 2026 Palantir Technologies Inc. All rights reserved.
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

import React, { createContext, useCallback, useContext, useState } from "react";
import { unit, elint } from "@defense-osdk/sdk";

interface SelectionContextType {
  selectedUnit: unit.OsdkInstance | null;
  selectUnit: (u: unit.OsdkInstance) => void;
  clearSelectedUnit: () => void;
  selectedElint: elint.OsdkInstance | null;
  selectElint: (e: elint.OsdkInstance) => void;
  clearSelectedElint: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUnit, setSelectedUnit] = useState<unit.OsdkInstance | null>(null);
  const [selectedElint, setSelectedElint] = useState<elint.OsdkInstance | null>(null);

  const selectUnit = useCallback((u: unit.OsdkInstance) => {
    setSelectedUnit(u);
  }, []);

  const clearSelectedUnit = useCallback(() => {
    setSelectedUnit(null);
    setSelectedElint(null);
  }, []);

  const selectElint = useCallback((e: elint.OsdkInstance) => {
    setSelectedElint(e);
  }, []);

  const clearSelectedElint = useCallback(() => {
    setSelectedElint(null);
  }, []);

  return (
    <SelectionContext.Provider value={{
      clearSelectedElint,
      clearSelectedUnit,
      selectElint,
      selectUnit,
      selectedElint,
      selectedUnit,
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = (): SelectionContextType => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
};
