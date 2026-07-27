import { useEffect } from 'react'
import { AlertTriangle, Ban, UserX, X } from 'lucide-react'
import type { GameParticipantSummary } from '../../services/game'

type ModeratePlayerModalProps = {
  player: GameParticipantSummary
  onClose: () => void
  onRemove: () => void | Promise<void>
  onBan: () => void | Promise<void>
  busy?: boolean
}

export default function ModeratePlayerModal({
  player,
  onClose,
  onRemove,
  onBan,
  busy = false,
}: ModeratePlayerModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderate-player-title"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-500" size={28} />
            <div>
              <h2 id="moderate-player-title" className="text-xl font-bold text-gray-800 sm:text-2xl">
                Manage player
              </h2>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">
                Choose what to do with{' '}
                <span className="font-semibold text-gray-800">{player.username}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRemove()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50 sm:text-base"
          >
            <UserX size={18} />
            Remove from game
          </button>
          <p className="px-1 text-xs text-gray-500">
            They leave this game now, but can rejoin with the code or invite link.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void onBan()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 sm:text-base"
          >
            <Ban size={18} />
            Ban from this game
          </button>
          <p className="px-1 text-xs text-gray-500">
            They leave and cannot rejoin this game until it ends.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 sm:text-base"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
