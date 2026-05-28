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

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { unit } from "@defense-osdk/sdk";
import styles from "./UnitCard.module.scss";

interface UnitCardProps {
  onClose?: () => void;
  unit: unit.OsdkInstance;
}

function formatPropertyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatPropertyValue(value: unknown): string {
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, onClose }) => {
  const { t } = useTranslation();

  const properties = useMemo(() =>
    Object.entries(unit)
      .filter(([key, value]) =>
        !key.startsWith('$') &&
        value != null &&
        value !== '' &&
        typeof value !== 'function'
      ),
    [unit]
  );

  return (
    <div className={styles.unitCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>{unit.$title ?? t("untitledUnit")}</h2>
        {onClose != null && (
          <button
            aria-label={t("closeButton")}
            className={styles.closeButton}
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.propertiesGrid}>
        {properties.map(([key, value]) => (
          <div key={key} className={styles.property}>
            <span className={styles.label}>{formatPropertyKey(key)}:</span>
            <span className={styles.value}>{formatPropertyValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnitCard;
