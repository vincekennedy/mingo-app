import { X } from 'lucide-react'
import type { BoardCell } from '../../lib/winDetection'

type PeekBoardCell =
  | BoardCell
  | { text?: string; isFree?: boolean; imageUrl?: string | null }

function normalizeCell(cell: PeekBoardCell): {
  text?: string
  isFree?: boolean
  imageUrl?: string | null
} {
  return typeof cell === 'string' ? { text: cell } : cell
}

export type ViewPlayerBoardModalProps = {
  playerName: string
  board: PeekBoardCell[] | null
  marked: Set<number>
  boardSize: number
  loading: boolean
  error: string | null
  emptyMessage?: string | null
  onClose: () => void
}

export default function ViewPlayerBoardModal({
  playerName,
  board,
  marked,
  boardSize,
  loading,
  error,
  emptyMessage = null,
  onClose,
}: ViewPlayerBoardModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-player-board-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              id="view-player-board-title"
              className="text-xl font-bold text-gray-900"
            >
              {playerName}&apos;s board
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">View only — you can&apos;t mark cells</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500 text-center py-8">Loading board…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 text-center py-8">{error}</p>
        )}

        {!loading && !error && emptyMessage && (
          <p className="text-sm text-gray-500 text-center py-8">{emptyMessage}</p>
        )}

        {!loading && !error && !emptyMessage && board && board.length > 0 && (
          <div
            className="grid gap-1.5 sm:gap-2 mx-auto w-full"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              maxWidth: `min(100%, ${boardSize * 100}px)`,
            }}
          >
            {board.map((cell, index) => {
              const { text, isFree, imageUrl } = normalizeCell(cell)
              return (
                <div
                  key={index}
                  className={`
                    mingo-board-cell w-full p-1 sm:p-2 rounded-lg font-semibold flex items-center justify-center text-center
                    ${
                      isFree
                        ? 'mingo-cell-free text-gray-900'
                        : marked.has(index)
                          ? 'mingo-cell-marked text-white'
                          : 'mingo-cell-idle text-gray-800'
                    }
                  `}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={text || 'Bingo item'}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="mingo-board-cell-text">{text}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
