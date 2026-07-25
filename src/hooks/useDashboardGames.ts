import { useEffect, useRef, useState } from 'react'
import { gameService, type UserGameSummary } from '../services/game'
import { boardService, type LoadedBoardState } from '../services/board'
import { winClaimsService } from '../services/winClaims'
import { subscribeDashboard } from '../lib/realtime'
import type { AppUser, Screen } from '../types/app'

export type DashboardGame = UserGameSummary & {
  boardState: LoadedBoardState | null
}

type UseDashboardGamesArgs = {
  currentUser: AppUser | null
  screen: Screen | string
  authReady: boolean
}

/** Dashboard game list + pending-win badges. */
export function useDashboardGames({
  currentUser,
  screen,
  authReady,
}: UseDashboardGamesArgs) {
  const [userGames, setUserGames] = useState<DashboardGame[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const gamesLoadIdRef = useRef(0)

  const loadUserGames = async (
    userId: string | null | undefined,
    { showLoading = false }: { showLoading?: boolean } = {},
  ) => {
    if (!userId) {
      setUserGames([])
      if (showLoading) setGamesLoading(false)
      return
    }

    const loadId = ++gamesLoadIdRef.current
    if (showLoading) setGamesLoading(true)
    try {
      const games = await gameService.getUserGames(userId)

      const hostGameIds = games.filter((g) => g.isHost).map((g) => g.gameId)
      const pendingWinsMap =
        hostGameIds.length > 0
          ? await winClaimsService.checkPendingWinsForGames(hostGameIds)
          : {}

      const gamesWithState = await Promise.all(
        games.map(async (game) => {
          const boardState = await boardService.loadBoardState(game.gameId, userId)
          return {
            ...game,
            boardState: boardState
              ? {
                  board: boardState.board,
                  marked: boardState.marked,
                  hasWon: boardState.hasWon,
                }
              : null,
            pendingWin: pendingWinsMap[game.gameId] || false,
          }
        }),
      )

      if (loadId !== gamesLoadIdRef.current) return
      setUserGames(gamesWithState)
    } catch (error) {
      console.error('Error loading user games:', error)
      if (loadId !== gamesLoadIdRef.current) return
      setUserGames([])
    } finally {
      if (loadId === gamesLoadIdRef.current) {
        setGamesLoading(false)
      }
    }
  }

  const clearUserGames = () => {
    setUserGames([])
  }

  useEffect(() => {
    if (!currentUser || screen !== 'dashboard' || !authReady) return

    const unsubscribe = subscribeDashboard(currentUser.id, {
      onChange: () => {
        loadUserGames(currentUser.id, { showLoading: false }).catch((error) => {
          console.error('Error refreshing dashboard from realtime:', error)
        })
      },
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, screen, authReady])

  return {
    userGames,
    gamesLoading,
    loadUserGames,
    clearUserGames,
  }
}
