import { Check, Copy, Link2, Play, Printer } from 'lucide-react';
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
  linkCopied,
  currentUser,
  onToggleIncorrectItem,
  onRejectWin,
  onConfirmWin,
  onContinueAfterWin,
  onEndGameAfterWin,
  onCopyCode,
  onCopyJoinLink,
  onOpenPrintableQr,
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
              <h3 className="text-lg sm:text-xl font-semibold mingo-text-brand mb-2">{gameConfig.title}</h3>
            )}
            <div className="flex justify-center mb-2">
              <VisibilityBadge visibility={gameVisibility} />
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Share an invite link, or print a QR flyer for the room.
            </p>
            <p className="mt-2 text-sm mingo-text-brand-strong font-medium">{winRule}</p>
          </div>

          <div className="mingo-surface-brand p-4 sm:p-6 rounded-xl space-y-4">
            <div
              data-testid="game-code"
              className="text-3xl sm:text-5xl font-bold font-mono mingo-text-brand tracking-wider"
            >
              {gameCode}
            </div>

            <button
              type="button"
              onClick={onCopyJoinLink}
              className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 mingo-btn-primary font-bold rounded-xl transition text-sm sm:text-base shadow-lg"
              data-testid="copy-join-link"
            >
              {linkCopied ? <Check size={20} /> : <Link2 size={20} />}
              {linkCopied ? 'Invite link copied!' : 'Share invite link'}
            </button>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                type="button"
                onClick={onCopyCode}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 mingo-btn-brand rounded-lg transition text-sm"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Code copied!' : 'Copy code'}
              </button>
              <button
                type="button"
                onClick={onOpenPrintableQr}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 mingo-btn-secondary rounded-lg transition text-sm"
                data-testid="open-printable-qr"
              >
                <Printer size={18} /> Printable QR flyer
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onStartPlaying}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 mingo-btn-secondary font-bold text-base sm:text-lg rounded-xl transition shadow-lg"
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
