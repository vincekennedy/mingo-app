import { AlertCircle, Camera, Check, Link2, Printer, RotateCcw, Trophy, X } from 'lucide-react';
import PlayerListSidebar from '../components/game/PlayerListSidebar';
import VisibilityBadge from '../components/game/VisibilityBadge';
import CaptureProofModal from '../components/modals/CaptureProofModal';
import WinVerificationModal, {
  type ClaimProofThumb,
} from '../components/modals/WinVerificationModal';
import ViewPlayerBoardModal from '../components/modals/ViewPlayerBoardModal';
import { describeWinRule, type BoardCell, type WinConfigFields } from '../lib/winDetection';
import type { GameParticipantSummary, GameVisibility } from '../services/game';
import type { AppUser } from '../types/app';

type ScreenGameConfig = WinConfigFields & {
  title?: string;
  boardSize?: number;
  useFreeSpace?: boolean;
  photoProof?: boolean;
};

/** Board cell in active play (object form may include imageUrl). */
type PlayBoardCell =
  | BoardCell
  | { text?: string; isFree?: boolean; imageUrl?: string | null };

type ActiveWinClaim = {
  type: string;
  indices: number[];
  items: string[];
  claimId: string;
  timestamp: number;
  userId?: string;
  username?: string;
};

function normalizePlayCell(cell: PlayBoardCell): {
  text?: string;
  isFree?: boolean;
  imageUrl?: string | null;
} {
  return typeof cell === 'string' ? { text: cell } : cell;
}

type PlayScreenProps = {
  gameCode: string;
  gameConfig: ScreenGameConfig | null;
  gameVisibility: GameVisibility;
  gamePlayers: GameParticipantSummary[];
  confirmedWinners: string[];
  isHost: boolean;
  pendingWinClaim: ActiveWinClaim | null;
  selectedIncorrectItems: Set<number>;
  winConfirmed: boolean;
  winRejected: boolean;
  hasWon: boolean;
  board: PlayBoardCell[];
  boardSize: number;
  marked: Set<number>;
  currentUser: AppUser | null;
  linkCopied: boolean;
  peekPlayer: GameParticipantSummary | null;
  peekBoard: PlayBoardCell[] | null;
  peekMarked: Set<number>;
  peekBoardSize: number;
  peekLoading: boolean;
  peekError: string | null;
  peekEmptyMessage: string | null;
  onSelectPlayer: (player: GameParticipantSummary) => void;
  onClosePlayerBoard: () => void;
  onRemovePlayer?: (
    player: GameParticipantSummary,
    options: { ban: boolean },
  ) => void | Promise<void>;
  onToggleIncorrectItem: (itemIndex: number) => void;
  onRejectWin: () => void | Promise<void>;
  onConfirmWin: () => void | Promise<void>;
  onResetToHome: () => void;
  onToggleCell: (index: number) => void;
  onCopyJoinLink: () => void;
  onOpenPrintableQr: () => void;
  photoProofMode?: boolean;
  claimProofs?: ClaimProofThumb[];
  photoApprovedItems?: Set<number>;
  proofsLoading?: boolean;
  onPhotoApprove?: (itemIndex: number) => void;
  onPhotoDeny?: (itemIndex: number) => void;
  myProofUrls?: Record<number, string>;
  proofCaptureIndex?: number | null;
  proofCaptureBusy?: boolean;
  proofCaptureError?: string | null;
  onCancelProofCapture?: () => void;
  onSubmitProofCapture?: (file: File) => void | Promise<void>;
};

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
  linkCopied,
  peekPlayer,
  peekBoard,
  peekMarked,
  peekBoardSize,
  peekLoading,
  peekError,
  peekEmptyMessage,
  onSelectPlayer,
  onClosePlayerBoard,
  onRemovePlayer,
  onToggleIncorrectItem,
  onRejectWin,
  onConfirmWin,
  onResetToHome,
  onToggleCell,
  onCopyJoinLink,
  onOpenPrintableQr,
  photoProofMode = false,
  claimProofs = [],
  photoApprovedItems = new Set(),
  proofsLoading = false,
  onPhotoApprove,
  onPhotoDeny,
  myProofUrls = {},
  proofCaptureIndex = null,
  proofCaptureBusy = false,
  proofCaptureError = null,
  onCancelProofCapture,
  onSubmitProofCapture,
}: PlayScreenProps) {
  const winRule = describeWinRule(gameConfig);
  const capturePrompt =
    proofCaptureIndex !== null && board[proofCaptureIndex] !== undefined
      ? normalizePlayCell(board[proofCaptureIndex]!).text || 'This square'
      : '';

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      <PlayerListSidebar
        gamePlayers={gamePlayers}
        confirmedWinners={confirmedWinners}
        emptyLabel="Loading players..."
        currentUserId={currentUser?.id}
        onSelectPlayer={onSelectPlayer}
        isHostViewer={isHost}
        onRemovePlayer={onRemovePlayer}
      />

      {peekPlayer && (
        <ViewPlayerBoardModal
          playerName={peekPlayer.username}
          board={peekBoard}
          marked={peekMarked}
          boardSize={peekBoardSize}
          loading={peekLoading}
          error={peekError}
          emptyMessage={peekEmptyMessage}
          onClose={onClosePlayerBoard}
        />
      )}

      {proofCaptureIndex !== null && onCancelProofCapture && onSubmitProofCapture && (
        <CaptureProofModal
          promptText={capturePrompt}
          busy={proofCaptureBusy}
          error={proofCaptureError}
          onCancel={onCancelProofCapture}
          onFile={onSubmitProofCapture}
        />
      )}

      <div className="flex-1 space-y-4 sm:space-y-6">
        {isHost && (
          <WinVerificationModal
            pendingWinClaim={pendingWinClaim}
            selectedIncorrectItems={selectedIncorrectItems}
            onToggleIncorrectItem={onToggleIncorrectItem}
            onReject={onRejectWin}
            onConfirm={onConfirmWin}
            photoProofMode={photoProofMode}
            claimProofs={claimProofs}
            photoApprovedItems={photoApprovedItems}
            onPhotoApprove={onPhotoApprove}
            onPhotoDeny={onPhotoDeny}
            proofsLoading={proofsLoading}
          />
        )}

        {gameConfig?.title && (
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{gameConfig.title}</h2>
          </div>
        )}

        {photoProofMode && !pendingWinClaim && !hasWon && (
          <p className="text-center text-sm text-white/90 drop-shadow">
            Photo proof on — tap a square to attach a photo and mark it.
          </p>
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

        <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-8">
          <div
            data-testid="bingo-board"
            className="grid gap-1.5 sm:gap-2 mx-auto w-full"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
              maxWidth: `min(100%, ${boardSize * 120}px)`
            }}
          >
            {board.map((cell, index) => {
              const { text, isFree, imageUrl } = normalizePlayCell(cell);
              const proofUrl = myProofUrls[index];
              const showThumb = proofUrl || imageUrl;

              return (
                <button
                  key={index}
                  onClick={() => onToggleCell(index)}
                  className={`
                  mingo-board-cell relative w-full p-1 sm:p-2 rounded-lg font-semibold flex items-center justify-center text-center transition-all overflow-hidden
                  ${isFree
                    ? 'mingo-cell-free text-gray-900 cursor-default'
                    : marked.has(index)
                    ? 'mingo-cell-marked text-white scale-95'
                    : 'mingo-cell-idle text-gray-800 hover:scale-105 hover:shadow-lg active:scale-95'
                  }
                `}
                >
                  {showThumb ? (
                    <img
                      src={proofUrl || imageUrl || ''}
                      alt={text || 'Bingo item'}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="mingo-board-cell-text">{text}</span>
                  )}
                  {photoProofMode && marked.has(index) && !isFree && proofUrl && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/55 p-0.5 text-white">
                      <Camera size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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

            {isHost && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={onCopyJoinLink}
                  className="w-full px-4 py-2.5 mingo-btn-primary text-sm font-bold rounded-lg transition flex items-center justify-center gap-2"
                  data-testid="share-invite-link"
                >
                  {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
                  {linkCopied ? 'Invite link copied!' : 'Share invite link'}
                </button>
                <button
                  type="button"
                  onClick={onOpenPrintableQr}
                  className="w-full px-4 py-2 mingo-btn-brand text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  data-testid="open-printable-qr"
                >
                  <Printer size={16} /> Printable QR flyer
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:gap-4 sm:flex-row gap-3">
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
