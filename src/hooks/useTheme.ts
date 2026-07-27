import { useState } from 'react'
import type { ThemeId } from '../lib/theme'
import {
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
} from '../lib/theme'

/** User preference theme + per-game shell theme. */
export function useTheme() {
  const [userTheme, setUserTheme] = useState<ThemeId>(() => getStoredTheme())
  const [gameTheme, setGameTheme] = useState<ThemeId>(() => getStoredTheme())

  const updateUserTheme = (value: string | null | undefined) => {
    setUserTheme(setStoredTheme(value))
  }

  const updateGameTheme = (value: string | null | undefined) => {
    setGameTheme(resolveTheme(value))
  }

  const applyThemeFromConfig = (
    config: { theme?: string | null } | null | undefined,
  ) => {
    setGameTheme(resolveTheme(config?.theme))
  }

  const resetGameThemeToUser = () => {
    setGameTheme(resolveTheme(userTheme))
  }

  return {
    userTheme,
    gameTheme,
    updateUserTheme,
    updateGameTheme,
    applyThemeFromConfig,
    resetGameThemeToUser,
  }
}
