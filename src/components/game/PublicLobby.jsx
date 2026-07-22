import { useCallback, useEffect, useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import { gameService } from '../../services/game'

const POLL_MS = 20_000

function shortWinLabel(winMode) {
  switch (winMode) {
    case 'four_corners':
      return 'Four corners'
    case 'x':
      return 'X'
    case 'blackout':
      return 'Blackout'
    case 'standard':
    default:
      return 'Standard'
  }
}

export default function PublicLobby({ onJoinGame }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const list = await gameService.listPublicGames(10)
      setGames(list)
      setError(null)
    } catch (err) {
      console.error('Public lobby refresh error:', err)
      setError('Could not load public games.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refresh()
    }, 0)
    const intervalId = setInterval(() => {
      void refresh({ silent: true })
    }, POLL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  return (
    <div className="space-y-3" data-testid="public-lobby">
      <div>
        <h3 className="text-gray-700 font-semibold text-sm sm:text-base">Public Lobby</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Open games anyone can join. Refreshes every few seconds.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 py-2">{error}</p>
      ) : games.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No public games open right now.</p>
      ) : (
        <ul className="space-y-2">
          {games.map((game) => (
            <li
              key={game.code}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border-2 border-teal-200 bg-teal-50"
              data-testid={`public-lobby-game-${game.code}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 truncate">
                  {game.title || 'Untitled game'}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {game.boardSize}x{game.boardSize} · {shortWinLabel(game.winMode)}
                </p>
                <p className="text-xs text-teal-800 mt-1 flex items-center gap-1">
                  <Users size={14} /> {game.playerCount}{' '}
                  {game.playerCount === 1 ? 'player' : 'players'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onJoinGame(game.code)}
                className="shrink-0 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
