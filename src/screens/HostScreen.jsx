import { useState } from 'react';
import { Check, Copy, Link2, Play, QrCode } from 'lucide-react';
import PlayerListSidebar from '../components/game/PlayerListSidebar';
import VisibilityBadge from '../components/game/VisibilityBadge';
import JoinQrCode from '../components/game/JoinQrCode';
import WinVerificationModal from '../components/modals/WinVerificationModal';
import EndGameDialog from '../components/modals/EndGameDialog';
import { describeWinRule } from '../lib/winDetection';
import { buildJoinUrl } from '../lib/joinLink';

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
  onStartPlaying,
  onResetToHome,
}) {
  const winRule = describeWinRule(gameConfig);
  const [showQr, setShowQr] = useState(true);
  const joinUrl = gameCode ? buildJoinUrl(gameCode) : '';

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
              Share the code, link, or QR — players can join in one tap.
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                type="button"
                onClick={onCopyCode}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-3 mingo-btn-brand rounded-lg transition text-sm sm:text-base"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Code copied!' : 'Copy code'}
              </button>
              <button
                type="button"
                onClick={onCopyJoinLink}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-3 mingo-btn-secondary rounded-lg transition text-sm sm:text-base"
                data-testid="copy-join-link"
              >
                {linkCopied ? <Check size={18} /> : <Link2 size={18} />}
                {linkCopied ? 'Link copied!' : 'Copy join link'}
              </button>
            </div>

            {joinUrl && (
              <p
                className="text-xs sm:text-sm text-gray-600 break-all font-mono"
                data-testid="join-link-url"
              >
                {joinUrl}
              </p>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                  <QrCode size={20} className="mingo-text-brand" /> Scan to join
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Great for bar nights and events — put this on a phone or TV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="text-sm font-semibold mingo-link-brand shrink-0"
                aria-expanded={showQr}
              >
                {showQr ? 'Hide' : 'Show'}
              </button>
            </div>
            {showQr && joinUrl && (
              <div className="pt-1">
                <JoinQrCode url={joinUrl} size={180} />
              </div>
            )}
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
