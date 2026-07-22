import { Check, Copy, Play } from 'lucide-react';
import PlayerListSidebar from '../components/game/PlayerListSidebar';
import VisibilityBadge from '../components/game/VisibilityBadge';
import WinVerificationModal from '../components/modals/WinVerificationModal';
import EndGameDialog from '../components/modals/EndGameDialog';
import { describeWinRule } from '../lib/winDetection';

export default function HostScreen({
  gameCode,
  gameConfig,
  gameVisibility,
  gamePlayers,
  confirmedWinners,
  pendingWinClaim,
  selectedIncorrectItems,
  showEndGameDialog,
  isHost,
  copied,
  currentUser,
  onToggleIncorrectItem,
  onRejectWin,
  onConfirmWin,
  onContinueAfterWin,
  onEndGameAfterWin,
  onCopyCode,
  onStartPlaying,
  onResetToHome,
}) {
  const winRule = describeWinRule(gameConfig);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      <PlayerListSidebar
        gamePlayers={gamePlayers}
        confirmedWinners={confirmedWinners}
        emptyLabel="No players yet..."
      />

      <div className="flex-1 space-y-4 sm:space-y-6">
        <WinVerificationModal
          pendingWinClaim={pendingWinClaim}
          selectedIncorrectItems={selectedIncorrectItems}
          onToggleIncorrectItem={onToggleIncorrectItem}
          onReject={onRejectWin}
          onConfirm={onConfirmWin}
        />

        {showEndGameDialog && isHost && (
          <EndGameDialog
            onContinue={onContinueAfterWin}
            onEndGame={onEndGameAfterWin}
          />
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Game Created!</h2>
            {gameConfig?.title && (
              <h3 className="text-lg sm:text-xl font-semibold text-purple-600 mb-2">{gameConfig.title}</h3>
            )}
            <div className="flex justify-center mb-2">
              <VisibilityBadge visibility={gameVisibility} />
            </div>
            <p className="text-sm sm:text-base text-gray-600">Share this code with players:</p>
            <p className="mt-2 text-sm text-purple-700 font-medium">{winRule}</p>
          </div>

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 sm:p-6 rounded-xl">
            <div className="text-3xl sm:text-5xl font-bold font-mono text-purple-600 mb-3 sm:mb-4 tracking-wider">
              {gameCode}
            </div>
            <button
              onClick={onCopyCode}
              className="flex items-center justify-center gap-2 mx-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
            >
              {copied ? <Check size={18} className="sm:w-5 sm:h-5" /> : <Copy size={18} className="sm:w-5 sm:h-5" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={onStartPlaying}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
            >
              <Play size={20} className="sm:w-6 sm:h-6" /> Start Playing
            </button>
            <button
              onClick={onResetToHome}
              className="w-full px-6 py-2 sm:py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
            >
              {currentUser ? 'Back to Dashboard' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
