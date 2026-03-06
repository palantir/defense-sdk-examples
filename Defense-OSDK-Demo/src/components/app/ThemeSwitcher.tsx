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

import React, { useState } from 'react';
import { Button, Menu, MenuItem, Popover, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import styles from './ThemeSwitcher.module.scss';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (newTheme: 'devcon' | 'katie-classic' | 'retro' | 'synthwave') => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const menu = (
    <Menu className={styles.menu}>
      <MenuItem
        text="DEVCON"
        icon={theme === 'devcon' ? IconNames.TICK : IconNames.BLANK}
        onClick={() => handleThemeChange('devcon')}
        className={theme === 'devcon' ? styles.active : ''}
      />
      <MenuItem
        text="Katie Classic"
        icon={theme === 'katie-classic' ? IconNames.TICK : IconNames.BLANK}
        onClick={() => handleThemeChange('katie-classic')}
        className={theme === 'katie-classic' ? styles.active : ''}
      />
      <MenuItem
        text="Retro"
        icon={theme === 'retro' ? IconNames.TICK : IconNames.BLANK}
        onClick={() => handleThemeChange('retro')}
        className={theme === 'retro' ? styles.active : ''}
      />
      <MenuItem
        text="Synthwave"
        icon={theme === 'synthwave' ? IconNames.TICK : IconNames.BLANK}
        onClick={() => handleThemeChange('synthwave')}
        className={theme === 'synthwave' ? styles.active : ''}
      />
    </Menu>
  );

  return (
    <Popover
      content={menu}
      position={Position.BOTTOM_RIGHT}
      isOpen={isOpen}
      onInteraction={(state) => setIsOpen(state)}
    >
      <Button
        icon={IconNames.COG}
        minimal
        className={styles.button}
        aria-label={t('themeSettings') || 'Theme Settings'}
      />
    </Popover>
  );
};

export default ThemeSwitcher;
