import { AlertCircle, Home, RotateCcw, Shuffle, Trophy, X } from 'lucide-react';
import PlayerListSidebar from '../components/game/PlayerListSidebar';
import VisibilityBadge from '../components/game/VisibilityBadge';
import WinVerificationModal from '../components/modals/WinVerificationModal';
import { describeWinRule } from '../lib/winDetection';

export default function PlayScreen({
  gameCode,
  gameConfig,
  gameVisibility,
  gamePlayers,
  confirmedWinners,
  isHost,
  pendingWinClaim,
  selectedIncorrectItems,
  winConfirmed,
  winRejected,
  hasWon,
  board,
  boardSize,
  marked,
  currentUser,
  onToggleIncorrectItem,
  onRejectWin,
  onConfirmWin,
  onResetToHome,
  onToggleCell,
  onNewBoard,
}) {
  const winRule = describeWinRule(gameConfig);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      <PlayerListSidebar
        gamePlayers={gamePlayers}
        confirmedWinners={confirmedWinners}
        emptyLabel="Loading players..."
      />

      <div className="flex-1 space-y-4 sm:space-y-6">
        {isHost && (
          <WinVerificationModal
            pendingWinClaim={pendingWinClaim}
            selectedIncorrectItems={selectedIncorrectItems}
            onToggleIncorrectItem={onToggleIncorrectItem}
            onReject={onRejectWin}
            onConfirm={onConfirmWin}
          />
        )}

        {gameCode && (
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
            <div className="text-center mb-2">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Game Code</p>
              <p className="text-xl sm:text-2xl font-bold font-mono mingo-text-brand">{gameCode}</p>
              <div className="mt-2 flex justify-center">
                <VisibilityBadge visibility={gameVisibility} />
              </div>
              <p className="mt-2 text-xs sm:text-sm mingo-text-brand-strong font-medium">{winRule}</p>
            </div>
            {currentUser && (
              <button
                onClick={onResetToHome}
                className="w-full mt-2 px-4 py-2 mingo-btn-brand text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <Home size={16} /> Back to Dashboard
              </button>
            )}
          </div>
        )}

        {pendingWinClaim && !winConfirmed && !winRejected && (
          <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
            <AlertCircle size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
            <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
            <p className="text-base sm:text-lg mt-2">Waiting for host verification...</p>
            <p className="text-sm mt-1 opacity-75">Your win claim has been submitted. Please wait.</p>
          </div>
        )}

        {winRejected && (
          <div className="bg-red-400 text-white p-4 sm:p-6 rounded-2xl text-center shadow-2xl">
            <X size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
            <h2 className="text-2xl sm:text-3xl font-bold">Win Rejected</h2>
            <p className="text-base sm:text-lg mt-2">Your win claim was not verified by the host.</p>
            <p className="text-sm mt-1 opacity-90">Incorrect items have been unselected. Please continue playing.</p>
          </div>
        )}

        {hasWon && winConfirmed && (
          <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
            <Trophy size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
            <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
            <p className="text-base sm:text-lg">You won! Win confirmed!</p>
          </div>
        )}

        {gameConfig?.title && (
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{gameConfig.title}</h2>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-8">
          <div
            className="grid gap-1.5 sm:gap-2 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
              maxWidth: `min(100%, ${boardSize * 120}px)`
            }}
          >
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => onToggleCell(index)}
                className={`
                  aspect-square p-1 sm:p-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center text-center transition-all
                  ${cell.isFree
                    ? 'mingo-cell-free text-gray-900 cursor-default'
                    : marked.has(index)
                    ? 'mingo-cell-marked text-white scale-95'
                    : 'mingo-cell-idle text-gray-800 hover:scale-105 hover:shadow-lg active:scale-95'
                  }
                `}
              >
                {cell.imageUrl ? (
                  <img
                    src={cell.imageUrl}
                    alt={cell.text || 'Bingo item'}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <span className="break-words leading-tight">{cell.text}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onNewBoard}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 mingo-btn-secondary-solid font-semibold rounded-xl transition shadow-lg text-sm sm:text-base"
          >
            <Shuffle size={18} className="sm:w-5 sm:h-5" /> New Board
          </button>
          <button
            onClick={onResetToHome}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition shadow-lg text-sm sm:text-base"
          >
            <RotateCcw size={18} className="sm:w-5 sm:h-5" /> {currentUser ? 'Back to Dashboard' : 'End Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
