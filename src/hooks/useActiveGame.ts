import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import confetti from 'canvas-confetti'
import { gameService, type GameParticipantSummary, type GameVisibility, type UserGameSummary } from '../services/game'
import { boardService, type BoardStatePayload } from '../services/board'
import { winClaimsService } from '../services/winClaims'
import { subscribeGame } from '../lib/realtime'
import type { AppUser, Screen, SetScreen, ShowToast } from '../types/app'
import { errorMessage } from '../types/app'
import {
  detectWin,
  normalizeWinConfig,
  type BoardCell,
  type WinMode,
  type WinResult,
} from '../lib/winDetection'
import { buildJoinUrl, clearJoinPathFromUrl, normalizeGameCode } from '../lib/joinLink'
import { openPrintableJoinFlyer } from '../lib/printJoinFlyer'

export type { AppUser, Screen }

/** Board cell as stored/generated in active play (extends winDetection BoardCell with imageUrl). */
type LiveBoardCell =
  | BoardCell
  | { text?: string; isFree?: boolean; imageUrl?: string | null }

type GameConfigItem = string | { text?: string; imageUrl?: string | null }

type GameConfig = {
  items?: GameConfigItem[]
  boardSize?: number
  useFreeSpace?: boolean
  title?: string
  winMode?: string
  linesToWin?: number
  [key: string]: unknown
}

type ActiveWinClaim = {
  type: string
  indices: number[]
  items: string[]
  claimId: string
  timestamp: number
  userId?: string
  username?: string
}

type HydrateActiveGameParams = {
  id: string
  code: string
  config: GameConfig
  visibility?: GameVisibility | string
  isHost?: boolean
  board?: LiveBoardCell[]
  marked?: Set<number>
  hasWon?: boolean
  pendingWinClaim?: ActiveWinClaim | null
  winConfirmed?: boolean
  winRejected?: boolean
}

type UseActiveGameParams = {
  currentUser: AppUser | null
  screen: Screen
  setScreen: SetScreen
  showToast: ShowToast
  loadUserGames: (userId: string, options?: { showLoading?: boolean }) => Promise<void>
  applyThemeFromConfig: (config: GameConfig | Record<string, unknown> | null) => void
  joinInFlightRef: MutableRefObject<boolean>
  clearPendingJoin: () => void
  closeJoinModal: () => void
}

function isLiveCellFree(cell: LiveBoardCell | undefined): boolean {
  return typeof cell === 'object' && cell !== null && Boolean(cell.isFree)
}

function asGameConfig(value: unknown): GameConfig {
  if (value && typeof value === 'object') {
    return value as GameConfig
  }
  return {}
}

/**
 * Active game session: board play, win claims, presence, realtime.
 */
export function useActiveGame({
  currentUser,
  screen,
  setScreen,
  showToast,
  loadUserGames,
  applyThemeFromConfig,
  joinInFlightRef,
  clearPendingJoin,
  closeJoinModal,
}: UseActiveGameParams) {
  const [boardSize, setBoardSize] = useState(5)
  const [board, setBoard] = useState<LiveBoardCell[]>([])
  const [marked, setMarked] = useState<Set<number>>(new Set())
  const [hasWon, setHasWon] = useState(false)
  const [useFreeSpace, setUseFreeSpace] = useState(true)
  const [winMode, setWinMode] = useState<WinMode>('standard')
  const [linesToWin, setLinesToWin] = useState(1)
  const [gameVisibility, setGameVisibility] = useState<GameVisibility>('private')
  const [gameCode, setGameCode] = useState('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [pendingWinClaim, setPendingWinClaim] = useState<ActiveWinClaim | null>(null)
  const [winConfirmed, setWinConfirmed] = useState(false)
  const [winRejected, setWinRejected] = useState(false)
  const [selectedIncorrectItems, setSelectedIncorrectItems] = useState<Set<number>>(new Set())
  const [showEndGameDialog, setShowEndGameDialog] = useState(false)
  const [gamePlayers, setGamePlayers] = useState<GameParticipantSummary[]>([])
  const [confirmedWinners, setConfirmedWinners] = useState<string[]>([])
  const [peekPlayer, setPeekPlayer] = useState<GameParticipantSummary | null>(null)
  const [peekBoard, setPeekBoard] = useState<LiveBoardCell[] | null>(null)
  const [peekMarked, setPeekMarked] = useState<Set<number>>(new Set())
  const [peekBoardSize, setPeekBoardSize] = useState(5)
  const [peekLoading, setPeekLoading] = useState(false)
  const [peekError, setPeekError] = useState<string | null>(null)
  const [peekEmptyMessage, setPeekEmptyMessage] = useState<string | null>(null)

  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingWinClaimRef = useRef<ActiveWinClaim | null>(null)
  const winConfirmedRef = useRef(false)
  const winRejectedRef = useRef(false)
  const claimSubmitInFlightRef = useRef(false)
  const showEndGameDialogRef = useRef(false)

  const applyLiveConfig = (
    config: GameConfig,
    visibility?: GameVisibility | string | null,
  ) => {
    setBoardSize(config.boardSize || 5)
    setUseFreeSpace(config.useFreeSpace !== undefined ? config.useFreeSpace : true)
    applyThemeFromConfig(config)
    const rules = normalizeWinConfig(config)
    setWinMode(rules.winMode)
    setLinesToWin(rules.linesToWin)
    if (visibility !== undefined && visibility !== null) {
      setGameVisibility(visibility === 'public' ? 'public' : 'private')
    }
  }

  const clearActiveGame = () => {
    setGameCode('')
    setGameId(null)
    setBoard([])
    setMarked(new Set())
    setHasWon(false)
    setBoardSize(5)
    setUseFreeSpace(true)
    setWinMode('standard')
    setLinesToWin(1)
    setGameVisibility('private')
    setGameConfig(null)
    setIsHost(false)
    setPendingWinClaim(null)
    setWinConfirmed(false)
    setWinRejected(false)
    setSelectedIncorrectItems(new Set())
    setShowEndGameDialog(false)
    setGamePlayers([])
    setConfirmedWinners([])
    setCopied(false)
    setLinkCopied(false)
    setPeekPlayer(null)
    setPeekBoard(null)
    setPeekMarked(new Set())
    setPeekLoading(false)
    setPeekError(null)
    setPeekEmptyMessage(null)
    claimSubmitInFlightRef.current = false
    showEndGameDialogRef.current = false
  }

  const hydrateActiveGame = ({
    id,
    code,
    config,
    visibility,
    isHost: host,
    board: nextBoard,
    marked: nextMarked,
    hasWon: nextHasWon,
    pendingWinClaim: nextClaim,
    winConfirmed: nextConfirmed,
    winRejected: nextRejected,
  }: HydrateActiveGameParams) => {
    setGameId(id)
    setGameCode(code)
    setGameConfig(config)
    setIsHost(Boolean(host))
    applyLiveConfig(config, visibility)
    if (nextBoard) {
      setBoard(nextBoard)
      setMarked(nextMarked || new Set())
      setHasWon(Boolean(nextHasWon))
    }
    if (nextClaim !== undefined) setPendingWinClaim(nextClaim)
    if (nextConfirmed !== undefined) setWinConfirmed(nextConfirmed)
    if (nextRejected !== undefined) setWinRejected(nextRejected)
  }

  const saveBoardState = async (gameIdToSave?: string | null) => {
    if (!currentUser) return
    const idToSave = gameIdToSave || gameId
    if (!idToSave || !board || board.length === 0) return

    try {
      await boardService.saveBoardState(idToSave, currentUser.id, {
        board: board as BoardCell[],
        marked,
        hasWon,
        pendingWinClaim,
        winConfirmed,
        winRejected,
      } as BoardStatePayload)
    } catch (error) {
      console.error('Error saving board state:', error)
    }
  }

  useEffect(() => {
    if (currentUser && gameId && board.length > 0 && (screen === 'play' || screen === 'host')) {
      const timeoutId = setTimeout(() => {
        saveBoardState(gameId)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marked, hasWon, pendingWinClaim, winConfirmed, winRejected, currentUser, gameId, screen])

  const loadBoardState = async (gameCodeToLoad: string) => {
    if (!currentUser) return false

    try {
      const game = await gameService.getGame(gameCodeToLoad)
      if (!game) return false

      const config = asGameConfig(game.config)
      setGameConfig(config)
      setGameCode(game.code)
      setGameId(game.id)
      applyLiveConfig(config, game.visibility)
      setIsHost(game.host_id === currentUser.id)

      const boardState = await boardService.loadBoardState(game.id, currentUser.id)
      if (boardState && boardState.board && boardState.board.length > 0) {
        setBoard(boardState.board as LiveBoardCell[])
        setMarked(boardState.marked)
        setHasWon(boardState.hasWon || false)

        const claimStatus = await winClaimsService.getUserClaimStatus(game.id, currentUser.id)
        if (claimStatus) {
          setPendingWinClaim(
            claimStatus.status === 'pending'
              ? {
                  type: claimStatus.type,
                  indices: claimStatus.indices,
                  items: claimStatus.items,
                  claimId: claimStatus.id,
                  timestamp: claimStatus.timestamp,
                }
              : null,
          )
          setWinConfirmed(claimStatus.status === 'confirmed')
          setWinRejected(claimStatus.status === 'rejected')
        } else {
          setPendingWinClaim(null)
          setWinConfirmed(false)
          setWinRejected(false)
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Error loading board state:', error)
      return false
    }
  }

  const fetchGamePlayers = async (gameIdToFetch: string) => {
    if (!gameIdToFetch) return

    try {
      const [players, winners] = await Promise.all([
        gameService.getGameParticipants(gameIdToFetch),
        winClaimsService.getConfirmedWinners(gameIdToFetch),
      ])

      setGamePlayers(players)
      setConfirmedWinners(winners)
    } catch (error) {
      console.error('Error fetching game players:', error)
    }
  }

  const generateBoardFromConfig = async (
    config: GameConfig,
    gameIdToUse: string | null = null,
    userForSave: AppUser | null = null,
  ) => {
    const idToSave = gameIdToUse || gameId
    const saveUser = userForSave || currentUser

    if (saveUser && idToSave) {
      try {
        const existing = await boardService.loadBoardState(idToSave, saveUser.id)
        if (existing?.board?.length && existing.board.length > 0) {
          setBoard(existing.board as LiveBoardCell[])
          setMarked(existing.marked)
          setHasWon(existing.hasWon || false)
          setPendingWinClaim(null)
          setWinConfirmed(false)
          setWinRejected(false)
          setScreen('play')
          return
        }
      } catch (error) {
        console.error('Error checking existing board:', error)
      }
    }

    const { items: validItems, boardSize: size, useFreeSpace: freeSpace } = config
    const totalCells = size! * size!
    const neededItems = freeSpace ? totalCells - 1 : totalCells

    const normalizedItems = validItems!.map((item) => {
      if (typeof item === 'string') {
        return { text: item, imageUrl: null }
      }
      return item
    })

    const shuffled = [...normalizedItems]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = shuffled[i]
      shuffled[i] = shuffled[j]!
      shuffled[j] = tmp!
    }

    const selected = shuffled.slice(0, neededItems)

    const positions: number[] = []
    for (let i = 0; i < selected.length; i++) {
      positions.push(i)
    }
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = positions[i]
      positions[i] = positions[j]!
      positions[j] = tmp!
    }

    const newBoard: LiveBoardCell[] = []
    const centerIndex = Math.floor(totalCells / 2)

    let itemIndex = 0
    for (let i = 0; i < totalCells; i++) {
      if (freeSpace && i === centerIndex) {
        newBoard.push({ text: 'FREE', isFree: true, imageUrl: null })
      } else {
        const item = selected[positions[itemIndex]!]!
        newBoard.push({
          text: item.text || '',
          imageUrl: item.imageUrl || null,
          isFree: false,
        })
        itemIndex++
      }
    }

    setBoard(newBoard)
    setMarked(freeSpace ? new Set([centerIndex]) : new Set())
    setHasWon(false)
    setPendingWinClaim(null)
    setWinConfirmed(false)
    setWinRejected(false)
    setScreen('play')

    if (saveUser && idToSave) {
      try {
        await boardService.saveGeneratedBoard(
          idToSave,
          saveUser.id,
          config,
          newBoard as BoardCell[],
          freeSpace ? new Set([centerIndex]) : new Set(),
        )
      } catch (error) {
        console.error('Error saving generated board:', error)
      }
    }
  }

  const selectGame = async (game: UserGameSummary) => {
    if (gameId && gameId !== game.gameId && currentUser && board.length > 0) {
      await saveBoardState(gameId)
    }

    const loaded = await loadBoardState(game.gameCode)
    if (!loaded) {
      setIsHost(game.isHost)
      setGameConfig(asGameConfig(game.config))
      setGameCode(game.gameCode)
      setGameId(game.gameId)
      applyLiveConfig(asGameConfig(game.config), game.visibility)
      if (!game.isHost) {
        await generateBoardFromConfig(asGameConfig(game.config), game.gameId)
      } else {
        setBoard([])
        setMarked(new Set())
        setScreen('host')
      }
    } else {
      setScreen('play')
    }
  }

  const joinGameAsUser = async (
    user: AppUser,
    code: string,
    { isRetry = false }: { isRetry?: boolean } = {},
  ) => {
    const normalized = normalizeGameCode(code)
    if (!isRetry) {
      if (joinInFlightRef.current) return
      joinInFlightRef.current = true
    }
    try {
      const game = await gameService.joinGame(normalized, user.id)

      if (!game || !game.config) {
        clearPendingJoin()
        clearJoinPathFromUrl()
        showToast('Game not found or invalid. Please check the code and try again.')
        return
      }

      const config = asGameConfig(game.config)
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        clearPendingJoin()
        clearJoinPathFromUrl()
        showToast('Invalid game configuration. Please check the code and try again.')
        return
      }

      setPendingWinClaim(null)
      setWinConfirmed(false)
      setWinRejected(false)
      setHasWon(false)
      setMarked(new Set())

      setGameConfig(config)
      setGameCode(game.code || normalized)
      setGameId(game.id)
      applyLiveConfig(config, game.visibility)
      setIsHost(false)
      clearPendingJoin()
      clearJoinPathFromUrl()
      closeJoinModal()

      const boardState = await boardService.loadBoardState(game.id, user.id)
      if (boardState && boardState.board && boardState.board.length > 0) {
        setBoard(boardState.board as LiveBoardCell[])
        setMarked(boardState.marked)
        setHasWon(boardState.hasWon || false)
        setScreen('play')
        await loadUserGames(user.id)
      } else {
        await generateBoardFromConfig(config, game.id, user)
        await loadUserGames(user.id)
      }
    } catch (error) {
      console.error('Error joining game:', error)
      const message = errorMessage(error)
      if (message.includes('already joined')) {
        await joinGameAsUser(user, normalized, { isRetry: true })
      } else if (message.includes('not found')) {
        clearPendingJoin()
        clearJoinPathFromUrl()
        showToast(`Game "${normalized}" not found. Please check the code and try again.`)
      } else {
        clearPendingJoin()
        clearJoinPathFromUrl()
        showToast(`Error joining game: ${message}`)
      }
    } finally {
      if (!isRetry) {
        joinInFlightRef.current = false
      }
    }
  }

  const copyCode = () => {
    if (!gameCode) return
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setLinkCopied(false)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyJoinLink = () => {
    if (!gameCode) return
    const url = buildJoinUrl(gameCode)
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setCopied(false)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const openPrintableQr = () => {
    if (!gameCode) return
    const opened = openPrintableJoinFlyer(gameCode, gameConfig?.title || '')
    if (!opened) {
      showToast('Pop-up blocked — allow pop-ups to open the printable QR flyer.')
    }
  }

  const confirmWin = async () => {
    if (!pendingWinClaim?.claimId || !gameCode) return

    try {
      await winClaimsService.confirmClaim(pendingWinClaim.claimId)
      setPendingWinClaim(null)
      setSelectedIncorrectItems(new Set())
      showEndGameDialogRef.current = true
      setShowEndGameDialog(true)
    } catch (error) {
      console.error('Error confirming win:', error)
      showToast('Error confirming win. Please try again.')
    }
  }

  const handleEndGameAfterWin = async () => {
    if (!gameId) return

    try {
      await gameService.markGameAsEnded(gameId)
      showEndGameDialogRef.current = false
      setShowEndGameDialog(false)

      if (currentUser) {
        await loadUserGames(currentUser.id)
      }

      if (screen === 'host' || screen === 'play') {
        clearActiveGame()
        setScreen('dashboard')
      }
    } catch (error) {
      console.error('Error ending game after win:', error)
      showToast('Error ending game. Please try again.')
    }
  }

  const handleContinueAfterWin = () => {
    showEndGameDialogRef.current = false
    setShowEndGameDialog(false)
  }

  const rejectWin = async () => {
    if (!pendingWinClaim?.claimId) return

    try {
      const incorrectIndices = Array.from(selectedIncorrectItems)
      const incorrectBoardIndices = incorrectIndices.map((itemIdx) => {
        return pendingWinClaim.indices[itemIdx]!
      })

      await winClaimsService.rejectClaim(pendingWinClaim.claimId, incorrectBoardIndices)
      setPendingWinClaim(null)
      setSelectedIncorrectItems(new Set())

      if (currentUser) {
        await loadUserGames(currentUser.id)
      }
    } catch (error) {
      console.error('Error rejecting win:', error)
      showToast('Error rejecting win. Please try again.')
    }
  }

  const toggleIncorrectItem = (itemIndex: number) => {
    const newSelected = new Set(selectedIncorrectItems)
    if (newSelected.has(itemIndex)) {
      newSelected.delete(itemIndex)
    } else {
      newSelected.add(itemIndex)
    }
    setSelectedIncorrectItems(newSelected)
  }

  const checkWin = (markedCells: Set<number> = marked): WinResult | null => {
    const { winMode: mode, linesToWin: needed } = normalizeWinConfig(
      gameConfig || { winMode, linesToWin },
    )
    return detectWin({
      marked: markedCells,
      board: board as BoardCell[],
      boardSize,
      winMode: mode,
      linesToWin: needed,
    })
  }

  const toggleCell = (index: number) => {
    if (
      isLiveCellFree(board[index]) ||
      hasWon ||
      pendingWinClaim ||
      winRejected ||
      claimSubmitInFlightRef.current
    ) {
      return
    }

    const newMarked = new Set(marked)
    if (newMarked.has(index)) {
      newMarked.delete(index)
    } else {
      newMarked.add(index)
    }
    setMarked(newMarked)

    if (currentUser && gameId) {
      saveBoardState(gameId)
    }

    if (
      screen === 'play' &&
      !hasWon &&
      !pendingWinClaim &&
      !winConfirmed &&
      !winRejected &&
      board.length > 0 &&
      boardSize > 0
    ) {
      const winResult = checkWin(newMarked)
      if (winResult && !isHost) {
        // Synchronously block further submits before the async claim returns
        // (rapid clicks otherwise create multiple pending claims).
        claimSubmitInFlightRef.current = true
        const submitWinClaim = async () => {
          if (!currentUser) {
            claimSubmitInFlightRef.current = false
            return
          }
          try {
            const claimData = await winClaimsService.submitClaim(gameId!, currentUser.id, {
              type: winResult.type,
              items: winResult.items,
              indices: winResult.indices,
            })
            setPendingWinClaim({
              type: winResult.type,
              items: winResult.items,
              indices: winResult.indices,
              claimId: String(claimData.id),
              timestamp: new Date(String(claimData.created_at)).getTime(),
            })
          } catch (error) {
            console.error('Error submitting win claim:', error)
            claimSubmitInFlightRef.current = false
            showToast('Error submitting win claim. Please try again.')
          }
        }
        submitWinClaim()
      } else if (winResult && isHost) {
        setHasWon(true)
        setWinConfirmed(true)
      }
    }
  }

  useEffect(() => {
    pendingWinClaimRef.current = pendingWinClaim
  }, [pendingWinClaim])
  useEffect(() => {
    winConfirmedRef.current = winConfirmed
  }, [winConfirmed])
  useEffect(() => {
    winRejectedRef.current = winRejected
  }, [winRejected])

  useEffect(() => {
    if (!gameId || (screen !== 'play' && screen !== 'host') || !currentUser) {
      return
    }

    const id = gameId

    const refreshHostClaims = async () => {
      try {
        // Don't resurrect the verification modal after the host already confirmed.
        if (showEndGameDialogRef.current) return

        const claims = await winClaimsService.getPendingClaims(id)
        if (claims && claims.length > 0) {
          const latestClaim = claims[0]!
          const prev = pendingWinClaimRef.current
          if (!prev || prev.claimId !== latestClaim.id) {
            setPendingWinClaim({
              type: latestClaim.type,
              items: latestClaim.items,
              indices: latestClaim.indices,
              claimId: latestClaim.id,
              userId: latestClaim.userId,
              username: latestClaim.username,
              timestamp: latestClaim.timestamp,
            })
            setSelectedIncorrectItems(new Set())
          }
        } else if (pendingWinClaimRef.current) {
          setPendingWinClaim(null)
        }
      } catch (error) {
        console.error('Error refreshing win claims:', error)
      }
    }

    const refreshPlayerClaim = async () => {
      try {
        const claimStatus = await winClaimsService.getUserClaimStatus(id, currentUser.id)
        if (!claimStatus) return

        if (claimStatus.status === 'confirmed' && !winConfirmedRef.current) {
          setWinConfirmed(true)
          setHasWon(true)
          setPendingWinClaim(null)
        } else if (claimStatus.status === 'rejected' && !winRejectedRef.current) {
          if (
            claimStatus.incorrectIndices &&
            Array.isArray(claimStatus.incorrectIndices) &&
            claimStatus.incorrectIndices.length > 0
          ) {
            setMarked((prevMarked) => {
              const newMarked = new Set(prevMarked)
              claimStatus.incorrectIndices.forEach((boardIndex) => {
                newMarked.delete(boardIndex)
              })
              return newMarked
            })
          }

          setWinRejected(true)
          setPendingWinClaim(null)
          setHasWon(false)

          setTimeout(() => {
            setWinRejected(false)
          }, 4000)
        }
      } catch (error) {
        console.error('Error refreshing claim status:', error)
      }
    }

    const leaveEndedGame = () => {
      clearActiveGame()
      setScreen('dashboard')
      loadUserGames(currentUser.id, { showLoading: false }).catch((error) => {
        console.error('Error reloading games after end:', error)
      })
    }

    fetchGamePlayers(id)
    if (isHost) {
      refreshHostClaims()
    } else if (screen === 'play') {
      refreshPlayerClaim()
    }

    const unsubscribe = subscribeGame(id, {
      onParticipantsChange: () => {
        fetchGamePlayers(id)
      },
      onClaimsChange: () => {
        fetchGamePlayers(id)
        if (isHost) {
          refreshHostClaims()
        } else if (screen === 'play') {
          refreshPlayerClaim()
        }
      },
      onGameChange: (row) => {
        if (row?.status === 'ended') {
          leaveEndedGame()
        }
      },
    })

    return () => {
      unsubscribe()
      setGamePlayers([])
      setConfirmedWinners([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, screen, isHost, currentUser])

  useEffect(() => {
    if (hasWon && winConfirmed && screen === 'play' && !isHost) {
      const duration = 3000
      const animationEnd = Date.now() + duration

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })

      confettiIntervalRef.current = setInterval(function () {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          if (confettiIntervalRef.current) {
            clearInterval(confettiIntervalRef.current)
            confettiIntervalRef.current = null
          }
          return
        }

        const particleCount = Math.floor(50 * (timeLeft / duration))

        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      }, 250)

      const timeoutId = setTimeout(() => {
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current)
          confettiIntervalRef.current = null
        }
      }, duration)

      return () => {
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current)
          confettiIntervalRef.current = null
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }
  }, [hasWon, winConfirmed, screen, isHost])

  const endGame = async (gameIdToEnd: string) => {
    if (!currentUser || !gameIdToEnd) return

    try {
      const updatedGame = await gameService.endGame(gameIdToEnd, currentUser.id)
      console.log('Game ended successfully:', updatedGame)
      await loadUserGames(currentUser.id)

      if (gameId === gameIdToEnd && (screen === 'host' || screen === 'play')) {
        clearActiveGame()
        setScreen('dashboard')
      }
    } catch (error) {
      console.error('Error ending game:', error)
      const errObj =
        typeof error === 'object' && error !== null
          ? (error as { message?: unknown; code?: unknown; details?: unknown })
          : null
      console.error('Error details:', {
        message: errObj?.message,
        code: errObj?.code,
        details: errObj?.details,
      })
      showToast(errorMessage(error, 'Error ending game. Please try again.'))
    }
  }

  const onGameCreated = async ({
    id,
    code,
    config,
    visibility,
  }: {
    id: string
    code: string
    config: GameConfig
    visibility?: GameVisibility | string
  }) => {
    hydrateActiveGame({
      id,
      code,
      config,
      visibility,
      isHost: true,
    })
    setScreen('host')
  }

  const closePlayerBoard = () => {
    setPeekPlayer(null)
    setPeekBoard(null)
    setPeekMarked(new Set())
    setPeekLoading(false)
    setPeekError(null)
    setPeekEmptyMessage(null)
  }

  const openPlayerBoard = async (player: GameParticipantSummary) => {
    if (!gameId || !player?.id) return
    if (currentUser && player.id === currentUser.id) return

    setPeekPlayer(player)
    setPeekBoard(null)
    setPeekMarked(new Set())
    setPeekError(null)
    setPeekEmptyMessage(null)
    setPeekLoading(true)

    const sizeFromConfig =
      typeof gameConfig?.boardSize === 'number' && gameConfig.boardSize > 0
        ? gameConfig.boardSize
        : boardSize
    setPeekBoardSize(sizeFromConfig)

    try {
      const state = await boardService.loadBoardState(gameId, player.id)
      if (!state?.board?.length) {
        setPeekEmptyMessage(`${player.username} hasn't started a board yet.`)
        return
      }
      setPeekBoard(state.board as LiveBoardCell[])
      setPeekMarked(state.marked)
      const derivedSize = Math.round(Math.sqrt(state.board.length))
      if (derivedSize > 0) setPeekBoardSize(derivedSize)
    } catch (error) {
      console.error('Error loading player board:', error)
      setPeekError(errorMessage(error, 'Could not load that board. Please try again.'))
    } finally {
      setPeekLoading(false)
    }
  }

  return {
    boardSize,
    board,
    marked,
    hasWon,
    useFreeSpace,
    winMode,
    linesToWin,
    gameVisibility,
    gameCode,
    gameId,
    copied,
    linkCopied,
    gameConfig,
    isHost,
    pendingWinClaim,
    winConfirmed,
    winRejected,
    selectedIncorrectItems,
    showEndGameDialog,
    gamePlayers,
    confirmedWinners,
    peekPlayer,
    peekBoard,
    peekMarked,
    peekBoardSize,
    peekLoading,
    peekError,
    peekEmptyMessage,
    openPlayerBoard,
    closePlayerBoard,
    saveBoardState,
    loadBoardState,
    selectGame,
    joinGameAsUser,
    generateBoardFromConfig,
    copyCode,
    copyJoinLink,
    openPrintableQr,
    confirmWin,
    handleEndGameAfterWin,
    handleContinueAfterWin,
    rejectWin,
    toggleIncorrectItem,
    toggleCell,
    endGame,
    clearActiveGame,
    hydrateActiveGame,
    onGameCreated,
  }
}
