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
import styles from "./UnitCard.module.scss";

interface UnitCardProps {
  unit: unit.OsdkInstance;
  onClose?: () => void;
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, onClose }) => {
  const { t } = useTranslation();

  // Get all properties from the unit, excluding system properties starting with $
  const getUnitProperties = () => {
    const properties: Array<{ key: string; value: any }> = [];

    // Iterate through all keys on the unit object
    Object.keys(unit).forEach((key) => {
      // Skip system properties that start with $
      if (key.startsWith('$')) {
        return;
      }

      const value = (unit as any)[key];

      // Skip undefined, null, and empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Skip functions
      if (typeof value === 'function') {
        return;
      }

      properties.push({ key, value });
    });

    return properties;
  };

  // Format property key for display (convert camelCase to Title Case)
  const formatPropertyKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Format property value for display
  const formatPropertyValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const properties = getUnitProperties();

  return (
    <div className={styles.unitCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>{unit.$title || t("untitledUnit")}</h2>
        {onClose && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("closeButton")}
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.propertiesGrid}>
        {/* All properties in 2 columns */}
        {properties.map(({ key, value }) => (
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
