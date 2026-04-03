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

const THEMES = [
  { id: 'devcon', label: 'DEVCON' },
  { id: 'katie-classic', label: 'Katie Classic' },
  { id: 'retro', label: 'Retro' },
  { id: 'synthwave', label: 'Synthwave' },
] as const;

type ThemeName = typeof THEMES[number]['id'];

const DEFAULT_THEME: ThemeName = 'devcon';

function isValidTheme(value: string | null): value is ThemeName {
  return value != null && THEMES.some(({ id }) => id === value);
}

export { THEMES };
export type { ThemeName };

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    const initialTheme = isValidTheme(savedTheme) ? savedTheme : DEFAULT_THEME;

    // Set data-theme attribute immediately to prevent flash of wrong theme
    document.documentElement.setAttribute('data-theme', initialTheme);

    return initialTheme;
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('app-theme', theme);

    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
