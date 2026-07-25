import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { GameVisibility } from '../services/game'
import type { PrintJoinInfo } from '../lib/printJoinFlyer'

export type { GameVisibility }

/** Logged-in or guest user as used across App / hooks. */
export type AppUser = {
  id: string
  email?: string | null
  username: string
  isGuest?: boolean
}

export type Screen =
  | 'home'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'forgot-password-sent'
  | 'reset-password'
  | 'email-confirmation'
  | 'dashboard'
  | 'setup'
  | 'host'
  | 'play'
  | 'print-join'

export type ShowToast = (
  message: string,
  opts?: { variant?: 'error' | 'success' | 'info'; durationMs?: number },
) => void

export type SetScreen = Dispatch<SetStateAction<Screen>>

export type MutableBoolRef = MutableRefObject<boolean>
export type MutableStringRef = MutableRefObject<string>
export type MutablePrintFlyerRef = MutableRefObject<boolean>

export type { PrintJoinInfo }

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message
  }
  return fallback
}
