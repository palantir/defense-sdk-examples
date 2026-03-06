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

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import appI18n from '../components/app/App.i18n.yml?raw';
import rightContainerI18n from '../components/app/right/RightContainer.i18n.yml?raw';
import unitCardI18n from '../components/app/right/UnitCard.i18n.yml?raw';
import trackedEntityHistoryI18n from '../components/app/right/TrackedEntityHistory.i18n.yml?raw';
import unitHierarchyViewI18n from '../components/app/right/UnitHierarchyView.i18n.yml?raw';
import associatedELINTI18n from '../components/app/right/AssociatedElint.i18n.yml?raw';
import confirmAssociateElintModalI18n from '../components/app/modals/ConfirmAssociateElintModal.i18n.yml?raw';
import yaml from 'js-yaml';

// Load all i18n files
const i18nFiles = [appI18n, rightContainerI18n, unitCardI18n, trackedEntityHistoryI18n, unitHierarchyViewI18n, associatedELINTI18n, confirmAssociateElintModalI18n];

// Merge all translations
const resources: Record<string, { translation: Record<string, string> }> = {
  en: { translation: {} },
};

i18nFiles.forEach((fileContent) => {
  const data = yaml.load(fileContent) as {
    messages: Record<string, string>;
    [key: string]: Record<string, string>;
  };

  // Add English translations
  Object.keys(data.messages).forEach((key) => {
    resources.en.translation[key] = data.messages[key];
  });

  // Add other language translations
  Object.keys(data).forEach((lang) => {
    if (lang !== 'messages') {
      if (!resources[lang]) {
        resources[lang] = { translation: {} };
      }
      Object.keys(data[lang]).forEach((key) => {
        resources[lang].translation[key] = data[lang][key];
      });
    }
  });
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
