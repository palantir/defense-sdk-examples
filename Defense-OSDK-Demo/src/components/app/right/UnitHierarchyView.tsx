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

import React from "react";
import { useTranslation } from "react-i18next";
import { unit } from "@defense-osdk/sdk";
import styles from "./UnitHierarchyView.module.scss";

interface UnitHierarchyViewProps {
  unit: unit.OsdkInstance;
  parents: unit.OsdkInstance[];
  children: unit.OsdkInstance[];
  loading?: boolean;
  error?: string | null;
  onSelectUnit?: (unit: unit.OsdkInstance) => void;
}

const UnitHierarchyView: React.FC<UnitHierarchyViewProps> = ({
  unit: unitInstance,
  parents,
  children,
  loading = false,
  error = null,
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

  if (error) {
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
            {/* Parents */}
            {parents.map((parentUnit, index) => {
              const nodeTitle = (parentUnit as any).$title || t("unknownNode");
              const indentLevel = 0;

              return (
                <div
                  key={(parentUnit as any).$primaryKey || `parent-${index}`}
                  className={styles.treeRow}
                  style={{ paddingLeft: `${indentLevel * 20}px` }}
                >
                  <div className={styles.treeLines}>
                    {indentLevel > 0 && <div className={styles.verticalLine} />}
                  </div>
                  <div
                    className={`${styles.nodeContent} ${styles.clickable}`}
                    title={nodeTitle}
                    onClick={() => onSelectUnit?.(parentUnit)}
                  >
                    <div className={styles.nodeName}>{nodeTitle}</div>
                  </div>
                </div>
              );
            })}

            {/* Current unit */}
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
                title={(unitInstance as any).$title || t("unknownNode")}
              >
                <div className={styles.nodeName}>
                  {(unitInstance as any).$title || t("unknownNode")}
                </div>
              </div>
            </div>

            {/* Children */}
            {children.map((childUnit, index) => {
              const nodeTitle = (childUnit as any).$title || t("unknownNode");
              const isLast = index === children.length - 1;
              const indentLevel = parents.length > 0 ? 2 : 1;

              return (
                <div
                  key={(childUnit as any).$primaryKey || `child-${index}`}
                  className={styles.treeRow}
                  style={{ paddingLeft: `${indentLevel * 20}px` }}
                >
                  <div className={styles.treeLines}>
                    <div className={styles.verticalLine} />
                    <div className={styles.horizontalLine} />
                    {!isLast && <div className={styles.verticalLineExtend} />}
                  </div>
                  <div
                    className={`${styles.nodeContent} ${styles.clickable}`}
                    title={nodeTitle}
                    onClick={() => onSelectUnit?.(childUnit)}
                  >
                    <div className={styles.nodeName}>{nodeTitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitHierarchyView;
