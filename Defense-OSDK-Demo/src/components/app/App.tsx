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

import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components/spinner/spinner";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOsdkData } from "../../context/OsdkDataContext";
import { isLoading, isLoaded } from "../../types/AsyncLoaded";
import styles from "./App.module.scss";
import LeftMapContainer from "./left/LeftMapContainer";
import RightContainer from "./right/RightContainer";
import ConfirmAssociateElintModal, { AssociationToaster } from "./modals/ConfirmAssociateElintModal";
import ThemeSwitcher from "./ThemeSwitcher";

const App: React.FC = () => {
  const { t } = useTranslation();

  const { user: userState } = useOsdkData();

  // Set the browser tab title using i18n
  useEffect(() => {
    document.title = t("browserTitle");
  }, [t]);

  return (
    <div className={styles.appContainer}>
      {/* Title Bar */}
      <div className={styles.titleBar}>
        <h1 className={styles.title}>{t('title')}</h1>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.exploreText}>{t('viewThe')}</span>
          <a
            href="https://www.palantir.com/docs/defense-osdk/api"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.defenseOsdkLink}
          >
            {t('defenseOsdkDocumentation')}
          </a>
        </div>
        <div className={styles.headerRight}>
          {isLoading(userState) ? (
            <Spinner size={SpinnerSize.SMALL} />
          ) : (
            <>
              <span className={styles.greeting}>
                👋 {t('hello')}, {isLoaded(userState) ? userState.value.givenName : t('user')}!
              </span>
              <ThemeSwitcher />
            </>
          )}
        </div>
      </header>

      {/* Workspace */}
      <div className={styles.workspace}>
        <div className={styles.leftMap}>
          <LeftMapContainer />
        </div>
        <div className={styles.rightContainer}>
          <RightContainer />
        </div>
      </div>

      <ConfirmAssociateElintModal />
      <AssociationToaster />
    </div>
  );
};

export default App;
