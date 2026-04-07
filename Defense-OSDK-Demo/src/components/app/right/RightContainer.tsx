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

import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelection } from "../../../context/SelectionContext";
import { useOsdkData } from "../../../context/OsdkDataContext";
import UnitCard from "./UnitCard";
import AssociatedELINT from "./AssociatedElint";
import TrackedEntityHistory from "./TrackedEntityHistory";
import UnitHierarchyView from "./UnitHierarchyView";
import { Affiliations } from "../../../constants";
import styles from "./RightContainer.module.scss";

const RightContainer: React.FC = () => {
  const { t } = useTranslation();
  const { selectedUnit, clearSelectedUnit, selectUnit } = useSelection();
  const { unitHierarchy, loadingUnitHierarchy, unitHierarchyError } = useOsdkData();

  const handleClearSelection = useCallback(() => {
    clearSelectedUnit();
  }, [clearSelectedUnit]);

  const handleSelectUnit = useCallback((unit: any) => {
    selectUnit(unit);
  }, [selectUnit]);

  // Check unit affiliation
  const affiliation = selectedUnit?.affiliation?.toLowerCase();
  const isHostile = affiliation === Affiliations.HOSTILE;
  const isFriendly = affiliation?.includes(Affiliations.FRIEND);

  return (
    <div className={styles.container}>
      {selectedUnit ? (
        <div className={styles.content}>
          <UnitCard unit={selectedUnit} onClose={handleClearSelection} />
          {isHostile && (
            <>
              <AssociatedELINT unit={selectedUnit} />
              <TrackedEntityHistory unit={selectedUnit} />
            </>
          )}
          {isFriendly && (
            <UnitHierarchyView
              unit={selectedUnit}
              parents={unitHierarchy?.parents ?? []}
              children={unitHierarchy?.children ?? []}
              loading={loadingUnitHierarchy}
              error={unitHierarchyError ?? undefined}
              onSelectUnit={handleSelectUnit}
            />
          )}
        </div>
      ) : (
        <div className={styles.placeholder}>
          {t("selectUnitPrompt")}
        </div>
      )}
    </div>
  );
};

export default RightContainer;
