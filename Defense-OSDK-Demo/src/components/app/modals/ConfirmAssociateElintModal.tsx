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

import React, { useEffect, useRef, useMemo } from "react";
import { Dialog, Button, Intent, Toaster, Position } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { useSelection } from "../../../context/SelectionContext";
import { useOsdkData } from "../../../context/OsdkDataContext";
import { isLoading, isLoaded, isError } from "../../../types/AsyncLoaded";
import styles from "./ConfirmAssociateElintModal.module.scss";

const AppToaster = Toaster.create({
  position: Position.TOP,
});

const ConfirmAssociateElintModal: React.FC = () => {
  const { t } = useTranslation();
  const { selectedElint, selectedUnit, clearSelectedElint } = useSelection();
  const {
    elintAssociation,
    associatedElints: elintsState,
    associateElintWithUnit,
  } = useOsdkData();

  const associatingElint = isLoading(elintAssociation);
  const loadingAssociatedElints = isLoading(elintsState);
  const associatedElints = isLoaded(elintsState) ? elintsState.value : [];

  const isOpen = selectedElint != null && selectedUnit != null;

  const isAlreadyAssociated = useMemo(() => {
    if (selectedElint == null || associatedElints.length === 0) {
      return false;
    }
    const elintPrimaryKey = selectedElint.$primaryKey;
    return associatedElints.some((linkedElint) => linkedElint.$primaryKey === elintPrimaryKey);
  }, [selectedElint, associatedElints]);

  const handleConfirm = () => {
    if (selectedElint != null && selectedUnit != null) {
      associateElintWithUnit(selectedElint, selectedUnit).then(() => {
        clearSelectedElint();
      });
    }
  };

  const handleCancel = () => {
    clearSelectedElint();
  };

  const formatPosition = (position: any): string => {
    if (position == null || !Array.isArray(position.coordinates) || position.coordinates.length < 2) {
      return t("noPosition");
    }
    const [lng, lat] = position.coordinates;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (timestamp == null) {
      return t("notAvailable");
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const unitTitle = selectedUnit?.$title ?? selectedUnit?.$primaryKey ?? t("unknown");
  const elintTitle = selectedElint?.$title ?? selectedElint?.$primaryKey ?? t("unknown");

  return (
    <Dialog
      autoFocus={true}
      canEscapeKeyClose={!associatingElint}
      canOutsideClickClose={!associatingElint}
      className="confirmAssociateElintDialog"
      isOpen={isOpen}
      title={isAlreadyAssociated ? t("alreadyAssociatedTitle") : t("confirmAssociateElintTitle")}
      usePortal={true}
      onClose={handleCancel}
    >
      <div className={styles.content}>
        {loadingAssociatedElints ? (
          <p className={styles.confirmText}>{t("loadingAssociatedElints")}</p>
        ) : isAlreadyAssociated ? (
          <p className={styles.confirmText}>
            {t("alreadyAssociatedMessage", {
              elint: elintTitle,
              unit: unitTitle,
            })}
          </p>
        ) : (
          <>
            <p className={styles.confirmText}>{t("confirmAssociateElintMessage")}</p>

            <div className={styles.detailsSection}>
              <div className={styles.detailGroup}>
                <h4>{t("unit")}</h4>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("unitIdLabel")}</span>
                  <span className={styles.value}>{unitTitle}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("affiliationLabel")}</span>
                  <span className={styles.value}>{selectedUnit?.affiliation ?? t("notAvailable")}</span>
                </div>
              </div>

              <div className={styles.detailGroup}>
                <h4>{t("elint")}</h4>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("elintIdLabel")}</span>
                  <span className={styles.value}>{elintTitle}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("elnotLabel")}</span>
                  <span className={styles.value}>{selectedElint?.elnot ?? t("notAvailable")}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("timestampLabel")}</span>
                  <span className={styles.value}>{formatTimestamp(selectedElint?.reportedTimestamp)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("positionLabel")}</span>
                  <span className={styles.value}>{formatPosition(selectedElint?.reportedPosition)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.footer}>
        {isAlreadyAssociated ? (
          <Button
            intent={Intent.PRIMARY}
            onClick={handleCancel}
          >
            {t("ok")}
          </Button>
        ) : (
          <>
            <Button
              disabled={associatingElint}
              intent={Intent.NONE}
              onClick={handleCancel}
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={associatingElint || loadingAssociatedElints}
              intent={Intent.PRIMARY}
              loading={associatingElint}
              onClick={handleConfirm}
            >
              {t("confirm")}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
};

// Separated from the dialog so toast side effects don't trigger dialog re-renders
export const AssociationToaster: React.FC = () => {
  const { t } = useTranslation();
  const { elintAssociation } = useOsdkData();
  const { selectedElint } = useSelection();
  const previousLoadingRef = useRef(isLoading(elintAssociation));

  useEffect(() => {
    const wasLoading = previousLoadingRef.current;
    const isNowDone = !isLoading(elintAssociation);

    if (wasLoading && isNowDone) {
      if (isError(elintAssociation)) {
        AppToaster.show({
          intent: Intent.DANGER,
          message: t("associationError"),
          timeout: 5000,
        });
      } else if (selectedElint == null) {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: t("associationSuccess"),
          timeout: 3000,
        });
      }
    }

    previousLoadingRef.current = isLoading(elintAssociation);
  }, [elintAssociation, selectedElint, t]);

  return null;
};

export default ConfirmAssociateElintModal;
