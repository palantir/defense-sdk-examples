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
import { isLoading, isIdle, isError } from "../../../types/AsyncLoaded";
import styles from "./TrackedEntityHistory.module.scss";

interface TrackedEntityHistoryProps {
  unit: unit.OsdkInstance;
}

const TrackedEntityHistory: React.FC<TrackedEntityHistoryProps> = () => {
  const { t } = useTranslation();
  const { trackedEntityObservations: observationsState } = useOsdkData();

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (timestamp == null) {
      return t("noTimestamp");
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatPosition = (position: any): string => {
    if (position == null || !Array.isArray(position.coordinates) || position.coordinates.length < 2) {
      return t("noPosition");
    }
    const [lng, lat] = position.coordinates;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  if (isLoading(observationsState) || isIdle(observationsState)) {
    return (
      <div className={styles.historyCard}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("locationHistoryTitle")}</h3>
        </div>
        <div className={styles.loading}>{t("loadingObservations")}</div>
      </div>
    );
  }

  if (isError(observationsState)) {
    return (
      <div className={styles.historyCard}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("locationHistoryTitle")}</h3>
        </div>
        <div className={styles.error}>{observationsState.error.message}</div>
      </div>
    );
  }

  const observations = observationsState.status === "loaded" ? observationsState.value : [];

  return (
    <div className={styles.historyCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("locationHistoryTitle")}</h3>
        <span className={styles.count}>
          {observations.length} {t("observations")}
        </span>
      </div>

      {observations.length === 0 ? (
        <div className={styles.empty}>{t("noObservations")}</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("timestamp")}</th>
                <th>{t("position")}</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs, index) => (
                <tr key={obs.$primaryKey ?? index}>
                  <td>{formatTimestamp(obs.geotrackableTimestamp as string | undefined)}</td>
                  <td>{formatPosition(obs.geotrackablePosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TrackedEntityHistory;
