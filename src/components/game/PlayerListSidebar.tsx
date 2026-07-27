import { useId, useState } from 'react'
import { MoreVertical, Trophy, Users } from 'lucide-react'
import type { GameParticipantSummary } from '../../services/game'
import ModeratePlayerModal from '../modals/ModeratePlayerModal'

type PlayerListSidebarProps = {
  gamePlayers: GameParticipantSummary[]
  confirmedWinners: string[]
  emptyLabel?: string
  /** Current user — their row is not clickable for board peek. */
  currentUserId?: string | null
  onSelectPlayer?: (player: GameParticipantSummary) => void
  /** Host can remove / ban other players (not themselves). */
  isHostViewer?: boolean
  onRemovePlayer?: (
    player: GameParticipantSummary,
    options: { ban: boolean },
  ) => void | Promise<void>
}

export default function PlayerListSidebar({
  gamePlayers,
  confirmedWinners,
  emptyLabel = 'No players yet...',
  currentUserId = null,
  onSelectPlayer,
  isHostViewer = false,
  onRemovePlayer,
}: PlayerListSidebarProps) {
  const [moderatePlayer, setModeratePlayer] = useState<GameParticipantSummary | null>(null)
  const [moderateBusy, setModerateBusy] = useState(false)
  const listLabelId = useId()

  const runModerate = async (ban: boolean) => {
    if (!moderatePlayer || !onRemovePlayer) return
    setModerateBusy(true)
    try {
      await onRemovePlayer(moderatePlayer, { ban })
      setModeratePlayer(null)
    } finally {
      setModerateBusy(false)
    }
  }

  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sticky top-4">
        <h3
          id={listLabelId}
          className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"
        >
          <Users size={20} className="mingo-text-brand" />
          Players ({gamePlayers.length})
        </h3>
        {onSelectPlayer && gamePlayers.length > 0 && (
          <p className="text-xs text-gray-500 mb-2">Tap a player to view their board</p>
        )}
        {gamePlayers.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto" aria-labelledby={listLabelId}>
            {gamePlayers.map((player) => {
              const hasWon = confirmedWinners.includes(player.id)
              const isSelf = Boolean(currentUserId && player.id === currentUserId)
              const canPeek = Boolean(onSelectPlayer) && !isSelf
              const canModerate =
                Boolean(isHostViewer && onRemovePlayer) && !isSelf && !player.isHost
              const rowClass = `flex items-center gap-2 p-2 rounded-lg transition-colors w-full text-left ${
                hasWon
                  ? 'bg-yellow-100 border-2 border-yellow-400'
                  : player.isHost
                    ? 'mingo-surface-brand-soft border mingo-border-brand'
                    : 'bg-gray-100 border border-gray-200'
              } ${canPeek ? 'hover:ring-2 hover:ring-offset-1 cursor-pointer' : ''}`

              const content = (
                <>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold truncate ${
                        hasWon ? 'text-yellow-800' : 'text-gray-800'
                      }`}
                    >
                      {player.username}
                      {isSelf ? ' (you)' : ''}
                    </p>
                    {player.isHost && (
                      <span className="text-xs mingo-text-brand font-medium">Host</span>
                    )}
                  </div>
                  {hasWon && (
                    <div
                      className="flex items-center gap-1 text-yellow-600"
                      title="Bingo Winner!"
                    >
                      <Trophy size={18} className="flex-shrink-0" />
                      <span className="text-xs font-bold hidden sm:inline">BINGO!</span>
                    </div>
                  )}
                </>
              )

              return (
                <li key={player.id}>
                  <div className="flex items-stretch gap-1">
                    {canPeek ? (
                      <button
                        type="button"
                        className={`${rowClass} flex-1`}
                        onClick={() => onSelectPlayer?.(player)}
                        aria-label={`View ${player.username}'s board`}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={`${rowClass} flex-1`}>{content}</div>
                    )}

                    {canModerate && (
                      <button
                        type="button"
                        className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-gray-600 hover:bg-gray-50"
                        aria-label={`Manage ${player.username}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setModeratePlayer(player)
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {moderatePlayer && (
        <ModeratePlayerModal
          player={moderatePlayer}
          busy={moderateBusy}
          onClose={() => {
            if (!moderateBusy) setModeratePlayer(null)
          }}
          onRemove={() => runModerate(false)}
          onBan={() => runModerate(true)}
        />
      )}
    </div>
  )
}
