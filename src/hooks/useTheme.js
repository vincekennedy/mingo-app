import { useState } from 'react';
import {
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
} from '../lib/theme';

/**
 * User preference theme + per-game shell theme.
 */
export function useTheme() {
  const [userTheme, setUserTheme] = useState(() => getStoredTheme());
  const [gameTheme, setGameTheme] = useState(() => getStoredTheme());

  const updateUserTheme = (value) => {
    setUserTheme(setStoredTheme(value));
  };

  const updateGameTheme = (value) => {
    setGameTheme(resolveTheme(value));
  };

  const applyThemeFromConfig = (config) => {
    setGameTheme(resolveTheme(config?.theme));
  };

  const resetGameThemeToUser = () => {
    setGameTheme(resolveTheme(userTheme));
  };

  return {
    userTheme,
    gameTheme,
    updateUserTheme,
    updateGameTheme,
    applyThemeFromConfig,
    resetGameThemeToUser,
  };
}
