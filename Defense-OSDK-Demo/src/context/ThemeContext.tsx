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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_STORAGE_KEY, THEME_DATA_ATTRIBUTE } from '../constants';

export const Themes = {
  DEVCON: { id: 'devcon', label: 'DEVCON' },
  KATIE_CLASSIC: { id: 'katie-classic', label: 'Katie Classic' },
  RETRO: { id: 'retro', label: 'Retro' },
  SYNTHWAVE: { id: 'synthwave', label: 'Synthwave' },
} as const;

export type ThemeName = typeof Themes[keyof typeof Themes]['id'];

export const ThemeValues = Object.values(Themes);
const DEFAULT_THEME: ThemeName = Themes.DEVCON.id;

function isValidTheme(value: string | null): value is ThemeName {
  return value != null && ThemeValues.some(({ id }) => id === value);
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = isValidTheme(savedTheme) ? savedTheme : DEFAULT_THEME;

    // Set data-theme attribute immediately to prevent flash of wrong theme
    document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, initialTheme);

    return initialTheme;
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Apply theme to document root
    document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
