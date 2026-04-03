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

import React, { useCallback, useState } from 'react';
import { Button, Menu, MenuItem, Popover, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { useTheme, ThemeValues, ThemeName } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import styles from './ThemeSwitcher.module.scss';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = useCallback((newTheme: ThemeName) => {
    setTheme(newTheme);
    setIsOpen(false);
  }, [setTheme]);

  const menu = (
    <Menu className={styles.menu}>
      {ThemeValues.map(({ id, label }) => (
        <MenuItem
          key={id}
          className={theme === id ? styles.active : ''}
          icon={theme === id ? IconNames.TICK : IconNames.BLANK}
          text={label}
          onClick={() => handleThemeChange(id)}
        />
      ))}
    </Menu>
  );

  return (
    <Popover
      content={menu}
      isOpen={isOpen}
      position={Position.BOTTOM_RIGHT}
      onInteraction={(state) => setIsOpen(state)}
    >
      <Button
        aria-label={t('themeSettings') ?? 'Theme Settings'}
        className={styles.button}
        icon={IconNames.COG}
        minimal
      />
    </Popover>
  );
};

export default ThemeSwitcher;
