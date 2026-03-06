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
import { RootState } from "../../../store/store";
import { associateElintWithUnit, clearSelectedElint } from "../../../store/features/osdk/osdkSlice";
import styles from "./ConfirmAssociateElintModal.module.scss";

const AppToaster = Toaster.create({
  position: Position.TOP,
});

const ConfirmAssociateElintModal: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const selectedElint = useSelector((state: RootState) => state.osdk.selectedElint);
  const selectedUnit = useSelector((state: RootState) => state.osdk.selectedUnit);
  const associatingElint = useSelector((state: RootState) => state.osdk.associatingElint);
  const elintAssociationError = useSelector((state: RootState) => state.osdk.elintAssociationError);
  const associatedElints = useSelector((state: RootState) => state.osdk.associatedElints);
  const loadingAssociatedElints = useSelector((state: RootState) => state.osdk.loadingAssociatedElints);

  const isOpen = selectedElint !== null && selectedUnit !== null;
  const previousAssociatingRef = useRef(false);

  const isAlreadyAssociated = useMemo(() => {
    if (!selectedElint || associatedElints.length === 0) {
      return false;
    }
    const elintPrimaryKey = (selectedElint as any).$primaryKey;
    return associatedElints.some((linkedElint: any) => linkedElint.$primaryKey === elintPrimaryKey);
  }, [selectedElint, associatedElints]);

  useEffect(() => {
    const wasAssociating = previousAssociatingRef.current;
    const isNowDone = !associatingElint;

    if (wasAssociating && isNowDone) {
      if (elintAssociationError) {
        AppToaster.show({
          message: t("associationError"),
          intent: Intent.DANGER,
          timeout: 5000,
        });
      } else if (selectedElint === null) {
        AppToaster.show({
          message: t("associationSuccess"),
          intent: Intent.SUCCESS,
          timeout: 3000,
        });
      }
    }

    previousAssociatingRef.current = associatingElint;
  }, [associatingElint, elintAssociationError, selectedElint, t]);

  const handleConfirm = () => {
    if (selectedElint && selectedUnit) {
      dispatch(associateElintWithUnit({ elint: selectedElint, unit: selectedUnit }));
    }
  };

  const handleCancel = () => {
    dispatch(clearSelectedElint());
  };

  const formatPosition = (position: any): string => {
    if (!position || !position.coordinates || position.coordinates.length < 2) {
      return t("noPosition");
    }
    const [lng, lat] = position.coordinates;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return t("notAvailable");
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getUnitTitle = () => {
    return (selectedUnit as any)?.$title || (selectedUnit as any)?.$primaryKey || t("unknown");
  };

  const getElintTitle = () => {
    return (selectedElint as any)?.$title || (selectedElint as any)?.$primaryKey || t("unknown");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title={isAlreadyAssociated ? t("alreadyAssociatedTitle") : t("confirmAssociateElintTitle")}
      className="confirmAssociateElintDialog"
      canOutsideClickClose={!associatingElint}
      canEscapeKeyClose={!associatingElint}
      usePortal={true}
      autoFocus={true}
    >
      <div className={styles.content}>
        {loadingAssociatedElints ? (
          <p className={styles.confirmText}>{t("loadingAssociatedElints")}</p>
        ) : isAlreadyAssociated ? (
          <p className={styles.confirmText}>
            {t("alreadyAssociatedMessage", {
              elint: getElintTitle(),
              unit: getUnitTitle()
            })}
          </p>
        ) : (
          <>
            <p className={styles.confirmText}>{t("confirmAssociateElintMessage")}</p>

            <div className={styles.detailsSection}>
              <div className={styles.detailGroup}>
                <h4>{t("unit")}</h4>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("unitId")}:</span>
                  <span className={styles.value}>{getUnitTitle()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("affiliation")}:</span>
                  <span className={styles.value}>{(selectedUnit as any)?.affiliation || t("notAvailable")}</span>
                </div>
              </div>

              <div className={styles.detailGroup}>
                <h4>{t("elint")}</h4>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("elintId")}:</span>
                  <span className={styles.value}>{getElintTitle()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("elnot")}:</span>
                  <span className={styles.value}>{(selectedElint as any)?.elnot || t("notAvailable")}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("timestamp")}:</span>
                  <span className={styles.value}>{formatTimestamp((selectedElint as any)?.reportedTimestamp)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("position")}:</span>
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
            onClick={handleCancel}
            intent={Intent.PRIMARY}
          >
            {t("ok")}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCancel}
              disabled={associatingElint}
              intent={Intent.NONE}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              loading={associatingElint}
              intent={Intent.PRIMARY}
              disabled={associatingElint || loadingAssociatedElints}
            >
              {t("confirm")}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
};

export default ConfirmAssociateElintModal;
