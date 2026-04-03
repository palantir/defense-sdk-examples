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
import { unit } from "@defense-osdk/sdk";
import styles from "./UnitHierarchyView.module.scss";

interface UnitHierarchyViewProps {
  children: unit.OsdkInstance[];
  error?: string;
  loading?: boolean;
  parents: unit.OsdkInstance[];
  unit: unit.OsdkInstance;
  onSelectUnit?: (unit: unit.OsdkInstance) => void;
}

interface HierarchyNodeProps {
  indentLevel: number;
  isLast?: boolean;
  showLines?: boolean;
  unitInstance: unit.OsdkInstance;
  onSelect?: (unit: unit.OsdkInstance) => void;
}

const HierarchyNode: React.FC<HierarchyNodeProps> = ({ indentLevel, isLast = true, showLines = true, unitInstance, onSelect }) => {
  const { t } = useTranslation();
  const nodeTitle = (unitInstance as any).$title ?? t("unknownNode");

  const handleClick = useCallback(() => {
    onSelect?.(unitInstance);
  }, [onSelect, unitInstance]);

  return (
    <div
      key={(unitInstance as any).$primaryKey}
      className={styles.treeRow}
      style={{ paddingLeft: `${indentLevel * 20}px` }}
    >
      <div className={styles.treeLines}>
        {showLines && indentLevel > 0 && (
          <>
            <div className={styles.verticalLine} />
            <div className={styles.horizontalLine} />
            {!isLast && <div className={styles.verticalLineExtend} />}
          </>
        )}
      </div>
      <div
        className={`${styles.nodeContent} ${onSelect != null ? styles.clickable : ''}`}
        title={nodeTitle}
        onClick={onSelect != null ? handleClick : undefined}
      >
        <div className={styles.nodeName}>{nodeTitle}</div>
      </div>
    </div>
  );
};

const UnitHierarchyView: React.FC<UnitHierarchyViewProps> = ({
  unit: unitInstance,
  parents,
  children,
  loading = false,
  error,
  onSelectUnit
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={styles.hierarchyCard}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("unitHierarchyTitle")}</h3>
        </div>
        <div className={styles.loading}>{t("loadingHierarchy")}</div>
      </div>
    );
  }

  if (error != null) {
    return (
      <div className={styles.hierarchyCard}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("unitHierarchyTitle")}</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const hasNoData = parents.length === 0 && children.length === 0;
  const childIndentLevel = parents.length > 0 ? 2 : 1;

  return (
    <div className={styles.hierarchyCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("unitHierarchyTitle")}</h3>
      </div>

      {hasNoData ? (
        <div className={styles.empty}>{t("noHierarchyData")}</div>
      ) : (
        <div className={styles.treeContainer}>
          <div className={styles.tree}>
            {parents.map((parentUnit) => (
              <HierarchyNode
                key={(parentUnit as any).$primaryKey}
                indentLevel={0}
                showLines={false}
                unitInstance={parentUnit}
                onSelect={onSelectUnit}
              />
            ))}

            <div
              className={styles.treeRow}
              style={{ paddingLeft: `${parents.length > 0 ? 20 : 0}px` }}
            >
              <div className={styles.treeLines}>
                {parents.length > 0 && (
                  <>
                    <div className={styles.verticalLine} />
                    <div className={styles.horizontalLine} />
                  </>
                )}
              </div>
              <div
                className={`${styles.nodeContent} ${styles.currentUnit}`}
                title={(unitInstance as any).$title ?? t("unknownNode")}
              >
                <div className={styles.nodeName}>
                  {(unitInstance as any).$title ?? t("unknownNode")}
                </div>
              </div>
            </div>

            {children.map((childUnit, index) => (
              <HierarchyNode
                key={(childUnit as any).$primaryKey}
                indentLevel={childIndentLevel}
                isLast={index === children.length - 1}
                unitInstance={childUnit}
                onSelect={onSelectUnit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitHierarchyView;
