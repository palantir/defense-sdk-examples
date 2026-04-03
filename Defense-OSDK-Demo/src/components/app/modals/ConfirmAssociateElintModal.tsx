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
import { useSelector, useDispatch } from "react-redux";
import { Dialog, Button, Intent, Toaster, Position } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";
import { associateElintWithUnit, clearSelectedElint } from "../../../store/features/osdk/osdkSlice";
import { selectSelectedElint, selectSelectedUnit, selectAssociatingElint, selectAssociatedElints, selectLoadingAssociatedElints, selectElintAssociationError } from "../../../store/features/osdk/osdkSelectors";
import styles from "./ConfirmAssociateElintModal.module.scss";

const AppToaster = Toaster.create({
  position: Position.TOP,
});

const ConfirmAssociateElintModal: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const selectedElint = useSelector(selectSelectedElint);
  const selectedUnit = useSelector(selectSelectedUnit);
  const associatingElint = useSelector(selectAssociatingElint);
  const associatedElints = useSelector(selectAssociatedElints);
  const loadingAssociatedElints = useSelector(selectLoadingAssociatedElints);

  const isOpen = selectedElint != null && selectedUnit != null;

  const isAlreadyAssociated = useMemo(() => {
    if (selectedElint == null || associatedElints.length === 0) {
      return false;
    }
    const elintPrimaryKey = (selectedElint as any).$primaryKey;
    return associatedElints.some((linkedElint: any) => linkedElint.$primaryKey === elintPrimaryKey);
  }, [selectedElint, associatedElints]);

  const handleConfirm = () => {
    if (selectedElint != null && selectedUnit != null) {
      dispatch(associateElintWithUnit({ elint: selectedElint, unit: selectedUnit }));
    }
  };

  const handleCancel = () => {
    dispatch(clearSelectedElint());
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

  const unitTitle = (selectedUnit as any)?.$title ?? (selectedUnit as any)?.$primaryKey ?? t("unknown");
  const elintTitle = (selectedElint as any)?.$title ?? (selectedElint as any)?.$primaryKey ?? t("unknown");

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
                  <span className={styles.value}>{(selectedUnit as any)?.affiliation ?? t("notAvailable")}</span>
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
                  <span className={styles.value}>{(selectedElint as any)?.elnot ?? t("notAvailable")}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("timestampLabel")}</span>
                  <span className={styles.value}>{formatTimestamp((selectedElint as any)?.reportedTimestamp)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("positionLabel")}</span>
                  <span className={styles.value}>{formatPosition((selectedElint as any)?.reportedPosition)}</span>
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
  const associatingElint = useSelector(selectAssociatingElint);
  const elintAssociationError = useSelector(selectElintAssociationError);
  const selectedElint = useSelector(selectSelectedElint);
  const previousAssociatingRef = useRef(false);

  useEffect(() => {
    const wasAssociating = previousAssociatingRef.current;
    const isNowDone = !associatingElint;

    if (wasAssociating && isNowDone) {
      if (elintAssociationError != null) {
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

    previousAssociatingRef.current = associatingElint;
  }, [associatingElint, elintAssociationError, selectedElint, t]);

  return null;
};

export default ConfirmAssociateElintModal;
