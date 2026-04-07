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
import { useOsdkData } from "../../../context/OsdkDataContext";
import { isLoading, isIdle, isError, isLoaded } from "../../../types/AsyncLoaded";
import styles from "./AssociatedElint.module.scss";

interface AssociatedELINTProps {
  unit: unit.OsdkInstance;
}

const AssociatedELINT: React.FC<AssociatedELINTProps> = () => {
  const { t } = useTranslation();
  const { associatedElints: elintsState } = useOsdkData();

  const formatPosition = (position: GeoJSON.Point | undefined): string => {
    if (position == null || position.coordinates.length < 2) {
      return t("noPosition");
    }
    const [lng, lat] = position.coordinates;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatDimensions = (semiMajor: number | undefined, semiMinor: number | undefined): string => {
    if (semiMajor === undefined || semiMinor === undefined) {
      return t("notAvailable");
    }
    return `${semiMajor.toFixed(0)}m × ${semiMinor.toFixed(0)}m`;
  };

  if (isLoading(elintsState) || isIdle(elintsState)) {
    return (
      <div className={`${styles.elintCard} ${styles.compact}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("associatedELINTTitle")}</h3>
        </div>
        <div className={styles.loading}>{t("loadingElint")}</div>
      </div>
    );
  }

  if (isError(elintsState)) {
    return (
      <div className={`${styles.elintCard} ${styles.compact}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("associatedELINTTitle")}</h3>
        </div>
        <div className={styles.error}>{elintsState.error.message}</div>
      </div>
    );
  }

  const elints = isLoaded(elintsState) ? elintsState.value : [];
  const isEmpty = elints.length === 0;

  return (
    <div className={styles.elintCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("associatedELINTTitle")}</h3>
        <span className={styles.count}>
          {elints.length} {t("elintReports")}
        </span>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <div>{t("noLinkedELINT")}</div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("elintId")}</th>
                <th>{t("position")}</th>
                <th>{t("dimensions")}</th>
                <th>{t("orientation")}</th>
              </tr>
            </thead>
            <tbody>
              {elints.map((elintReport, index) => (
                <tr key={elintReport.$primaryKey ?? index}>
                  <td>{elintReport.$title ?? elintReport.$primaryKey ?? `ELINT-${index + 1}`}</td>
                  <td>{formatPosition(elintReport.reportedPosition)}</td>
                  <td>{formatDimensions(elintReport.semiMajorAxisMeters, elintReport.semiMinorAxisMeters)}</td>
                  <td>{elintReport.axisOrientation != null ? `${elintReport.axisOrientation.toFixed(1)}°` : t("notAvailable")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.instruction}>{t("selectElintFromMap")}</div>
    </div>
  );
};

export default AssociatedELINT;
