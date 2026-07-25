import { useEffect, useRef, useState } from 'react';
import { gameService } from '../services/game';
import { boardService } from '../services/board';
import { winClaimsService } from '../services/winClaims';
import { subscribeDashboard } from '../lib/realtime';

/**
 * Dashboard game list + pending-win badges.
 * @param {{ currentUser: { id: string } | null, screen: string, authReady: boolean }} ctx
 */
export function useDashboardGames({ currentUser, screen, authReady }) {
  const [userGames, setUserGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const gamesLoadIdRef = useRef(0);

  const loadUserGames = async (userId, { showLoading = false } = {}) => {
    if (!userId) {
      setUserGames([]);
      if (showLoading) setGamesLoading(false);
      return;
    }

    const loadId = ++gamesLoadIdRef.current;
    if (showLoading) setGamesLoading(true);
    try {
      const games = await gameService.getUserGames(userId);

      const hostGameIds = games.filter((g) => g.isHost).map((g) => g.gameId);
      const pendingWinsMap = hostGameIds.length > 0
        ? await winClaimsService.checkPendingWinsForGames(hostGameIds)
        : {};

      const gamesWithState = await Promise.all(
        games.map(async (game) => {
          const boardState = await boardService.loadBoardState(game.gameId, userId);
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
          };
        })
      );

      if (loadId !== gamesLoadIdRef.current) return;
      setUserGames(gamesWithState);
    } catch (error) {
      console.error('Error loading user games:', error);
      if (loadId !== gamesLoadIdRef.current) return;
      setUserGames([]);
    } finally {
      if (loadId === gamesLoadIdRef.current) {
        setGamesLoading(false);
      }
    }
  };

  const clearUserGames = () => {
    setUserGames([]);
  };

  useEffect(() => {
    if (!currentUser || screen !== 'dashboard' || !authReady) return;

    const unsubscribe = subscribeDashboard(currentUser.id, {
      onChange: () => {
        loadUserGames(currentUser.id, { showLoading: false }).catch((error) => {
          console.error('Error refreshing dashboard from realtime:', error);
        });
      },
    });

    return unsubscribe;
  }, [currentUser, screen, authReady]);

  return {
    userGames,
    gamesLoading,
    loadUserGames,
    clearUserGames,
  };
}
