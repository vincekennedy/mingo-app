import { useEffect, useState, type FormEvent, type MutableRefObject } from 'react'
import { authService } from '../services/auth'
import {
  clearJoinPathFromUrl,
  clearPendingJoinCode,
  isValidGameCode,
  normalizeGameCode,
  parseJoinCodeFromLocation,
  resolveInitialJoinCode,
  writePendingJoinCode,
} from '../lib/joinLink'
import { resolveInitialPrintJoin } from '../lib/printJoinFlyer'
import type { AppUser, Screen, SetScreen, ShowToast } from '../types/app'
import { errorMessage } from '../types/app'

export const initialJoinCode = resolveInitialJoinCode()
export const initialPrintJoin = resolveInitialPrintJoin()

type UseJoinFlowArgs = {
  authReady: boolean
  currentUser: AppUser | null
  screen: Screen | string
  passwordRecoveryRef: MutableRefObject<boolean>
  pendingJoinCodeRef: MutableRefObject<string>
  printFlyerRef: MutableRefObject<boolean>
  joinInFlightRef: MutableRefObject<boolean>
  showToast: ShowToast
  setScreen: SetScreen
  setAuthError: (value: string | null) => void
  onGuestSignedIn: (user: AppUser) => void
  joinAsUser: (
    user: AppUser,
    code: string,
    opts?: { isRetry?: boolean },
  ) => void | Promise<void>
}

/**
 * Join deep-link, modal, and guest join flow.
 */
export function useJoinFlow({
  authReady,
  currentUser,
  screen,
  passwordRecoveryRef,
  pendingJoinCodeRef,
  printFlyerRef,
  joinInFlightRef,
  showToast,
  setScreen,
  setAuthError,
  onGuestSignedIn,
  joinAsUser,
}: UseJoinFlowArgs) {
  const [joinCode, setJoinCode] = useState(initialPrintJoin ? '' : initialJoinCode)
  const [pendingJoinCode, setPendingJoinCode] = useState(
    initialPrintJoin ? '' : initialJoinCode,
  )
  const [printFlyer] = useState(initialPrintJoin)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [guestDisplayName, setGuestDisplayName] = useState('')
  const [guestJoinError, setGuestJoinError] = useState<string | null>(null)
  const [guestJoining, setGuestJoining] = useState(false)

  useEffect(() => {
    try {
      const fromUrl = parseJoinCodeFromLocation(window.location)
      if (fromUrl) {
        pendingJoinCodeRef.current = fromUrl
        writePendingJoinCode(fromUrl)
      }
    } catch {
      /* ignore */
    }
  }, [pendingJoinCodeRef])

  const setPendingJoin = (code: string) => {
    const normalized = normalizeGameCode(code)
    if (!isValidGameCode(normalized)) return ''
    pendingJoinCodeRef.current = normalized
    setPendingJoinCode(normalized)
    setJoinCode(normalized)
    writePendingJoinCode(normalized)
    return normalized
  }

  const clearPendingJoin = () => {
    pendingJoinCodeRef.current = ''
    setPendingJoinCode('')
    clearPendingJoinCode()
  }

  const openJoinModalForCode = (code: string) => {
    const normalized = setPendingJoin(code)
    if (!normalized) return
    setGuestJoinError(null)
    setGuestDisplayName('')
    setShowJoinModal(true)
  }

  const closeJoinModal = () => setShowJoinModal(false)

  const cancelJoinIntent = () => {
    if (guestJoining) return
    setShowJoinModal(false)
    setGuestDisplayName('')
    setGuestJoinError(null)
    clearPendingJoin()
    clearJoinPathFromUrl()
  }

  const goToLoginForJoin = () => {
    if (guestJoining) return
    const code = normalizeGameCode(joinCode || pendingJoinCode)
    if (isValidGameCode(code)) setPendingJoin(code)
    setShowJoinModal(false)
    setGuestJoinError(null)
    setAuthError(null)
    setScreen('login')
  }

  const goToRegisterForJoin = () => {
    if (guestJoining) return
    const code = normalizeGameCode(joinCode || pendingJoinCode)
    if (isValidGameCode(code)) setPendingJoin(code)
    setShowJoinModal(false)
    setGuestJoinError(null)
    setAuthError(null)
    setScreen('register')
  }

  const joinGame = async (codeOverride?: string) => {
    const code = normalizeGameCode(codeOverride ?? joinCode)
    if (!isValidGameCode(code)) {
      showToast('Please enter a 5-character game code')
      return
    }

    setPendingJoin(code)

    if (!currentUser) {
      openJoinModalForCode(code)
      return
    }

    await joinAsUser(currentUser, code)
  }

  const submitGuestJoin = async (e: FormEvent) => {
    e.preventDefault()
    const code = normalizeGameCode(joinCode || pendingJoinCode)
    if (!isValidGameCode(code)) {
      setGuestJoinError('Please enter a 4–12 character join code.')
      return
    }

    const desiredName = guestDisplayName.trim()
    if (!desiredName) {
      setGuestJoinError('Enter a display name to continue.')
      return
    }

    setGuestJoining(true)
    setGuestJoinError(null)
    try {
      const guest = await authService.signInAsGuest(desiredName)
      const user: AppUser = {
        id: guest.user.id,
        email: guest.user.email || null,
        username: guest.displayName || desiredName,
        isGuest: true,
      }
      onGuestSignedIn(user)
      setShowJoinModal(false)
      setGuestDisplayName('')
      await joinAsUser(user, code)
    } catch (guestError) {
      setGuestJoinError(
        errorMessage(
          guestError,
          'Could not start guest session. Please log in or try again.',
        ),
      )
    } finally {
      setGuestJoining(false)
    }
  }

  const resumePendingJoin = async (user: AppUser) => {
    const pending = pendingJoinCodeRef.current
    if (!pending || !isValidGameCode(pending)) return false
    setShowJoinModal(false)
    await joinAsUser(user, pending)
    return true
  }

  useEffect(() => {
    if (!authReady || passwordRecoveryRef.current) return
    if (printFlyerRef.current || screen === 'print-join') return
    const code = pendingJoinCodeRef.current || pendingJoinCode
    if (!isValidGameCode(code)) return
    if (joinInFlightRef.current) return
    if (screen === 'play' || screen === 'host' || screen === 'setup') return
    if (
      screen === 'login' ||
      screen === 'register' ||
      screen === 'forgot-password' ||
      screen === 'forgot-password-sent' ||
      screen === 'reset-password' ||
      screen === 'email-confirmation'
    ) {
      return
    }

    if (currentUser) {
      void joinAsUser(currentUser, code)
      return
    }

    if (!showJoinModal) {
      openJoinModalForCode(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser, pendingJoinCode, screen, showJoinModal])

  return {
    joinCode,
    setJoinCode,
    pendingJoinCode,
    printFlyer,
    showJoinModal,
    guestDisplayName,
    setGuestDisplayName,
    guestJoinError,
    guestJoining,
    setPendingJoin,
    clearPendingJoin,
    openJoinModalForCode,
    closeJoinModal,
    cancelJoinIntent,
    goToLoginForJoin,
    goToRegisterForJoin,
    joinGame,
    submitGuestJoin,
    resumePendingJoin,
    resetJoinCodes: () => setJoinCode(''),
    clearJoinPathFromUrl,
  }
}
