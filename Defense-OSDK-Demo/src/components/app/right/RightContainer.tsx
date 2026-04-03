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

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { clearSelectedUnit, loadUnitHierarchy, clearUnitHierarchy, selectUnit } from "../../../store/features/osdk/osdkSlice";
import { selectSelectedUnit, selectUnitHierarchy, selectLoadingUnitHierarchy, selectUnitHierarchyError } from "../../../store/features/osdk/osdkSelectors";
import UnitCard from "./UnitCard";
import AssociatedELINT from "./AssociatedElint";
import TrackedEntityHistory from "./TrackedEntityHistory";
import UnitHierarchyView from "./UnitHierarchyView";
import styles from "./RightContainer.module.scss";

const RightContainer: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedUnit = useSelector(selectSelectedUnit);
  const unitHierarchy = useSelector(selectUnitHierarchy);
  const loadingHierarchy = useSelector(selectLoadingUnitHierarchy);
  const hierarchyError = useSelector(selectUnitHierarchyError);

  const handleClearSelection = () => {
    dispatch(clearSelectedUnit());
  };

  const handleSelectUnit = (unit: any) => {
    dispatch(selectUnit(unit));
  };

  // Check unit affiliation
  const affiliation = selectedUnit?.affiliation?.toLowerCase();
  const isHostile = affiliation === 'hostile';
  const isFriendly = affiliation?.includes('friend');

  // Load hierarchy for friendly units
  useEffect(() => {
    if (selectedUnit && isFriendly) {
      dispatch(loadUnitHierarchy(selectedUnit));
    }

    return () => {
      dispatch(clearUnitHierarchy());
    };
  }, [selectedUnit, isFriendly, dispatch]);

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
              loading={loadingHierarchy}
              error={hierarchyError}
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
