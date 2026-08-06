import { AlertCircle, Check, X } from 'lucide-react';
import { formatClaimType } from '../../lib/winDetection';

type PendingWinClaim = {
  type: string;
  indices: number[];
  items?: string[];
  claimId: string;
  timestamp: number;
  userId?: string;
  username?: string;
};

export type ClaimProofThumb = {
  cellIndex: number;
  itemIndex: number;
  prompt: string;
  signedUrl?: string | null;
};

type WinVerificationModalProps = {
  pendingWinClaim: PendingWinClaim | null;
  selectedIncorrectItems: Set<number>;
  onToggleIncorrectItem: (idx: number) => void;
  onReject: () => void;
  onConfirm: () => void;
  /** When set, show photo review UI instead of honor-system checklist. */
  photoProofMode?: boolean;
  claimProofs?: ClaimProofThumb[];
  photoApprovedItems?: Set<number>;
  onPhotoApprove?: (itemIndex: number) => void;
  onPhotoDeny?: (itemIndex: number) => void;
  proofsLoading?: boolean;
};

export default function WinVerificationModal({
  pendingWinClaim,
  selectedIncorrectItems,
  onToggleIncorrectItem,
  onReject,
  onConfirm,
  photoProofMode = false,
  claimProofs = [],
  photoApprovedItems = new Set(),
  onPhotoApprove,
  onPhotoDeny,
  proofsLoading = false,
}: WinVerificationModalProps) {
  if (!pendingWinClaim) return null;

  const itemCount = pendingWinClaim.items?.length || 0;
  const reviewableCount = claimProofs.length > 0 ? claimProofs.length : itemCount;
  const allApproved =
    photoProofMode &&
    reviewableCount > 0 &&
    photoApprovedItems.size >= reviewableCount &&
    selectedIncorrectItems.size === 0;
  const canConfirm = photoProofMode ? allApproved : true;
  const canReject = photoProofMode
    ? selectedIncorrectItems.size > 0
    : selectedIncorrectItems.size > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="text-yellow-500" size={32} />
            Bingo Win Claim!
          </h2>
        </div>

        <div className="mb-6">
          {pendingWinClaim.username && (
            <p className="text-gray-600 mb-2">
              Player: <span className="font-semibold text-gray-800">{pendingWinClaim.username}</span>
            </p>
          )}
          <p className="text-gray-600 mb-4">
            {photoProofMode
              ? 'Review each photo against the prompt. Approve all to confirm, or deny incorrect ones to reject.'
              : 'A player has claimed a bingo win. Please verify the selected items:'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="font-semibold text-gray-700 mb-2">
              Win Type: <span className="capitalize">{formatClaimType(pendingWinClaim.type)}</span>
            </p>

            {photoProofMode ? (
              <>
                <p className="font-semibold text-gray-700 mb-3">
                  Photos ({claimProofs.length}
                  {proofsLoading ? ' …' : ''})
                </p>
                {proofsLoading && claimProofs.length === 0 && (
                  <p className="text-sm text-gray-500">Loading photos…</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {claimProofs.map((proof) => {
                    const denied = selectedIncorrectItems.has(proof.itemIndex);
                    const approved = photoApprovedItems.has(proof.itemIndex);
                    return (
                      <div
                        key={`${proof.cellIndex}-${proof.itemIndex}`}
                        className={`rounded-xl border-2 bg-white p-3 ${
                          denied
                            ? 'border-red-500'
                            : approved
                              ? 'border-green-500'
                              : 'border-gray-200'
                        }`}
                      >
                        <p className="mb-2 text-sm font-semibold text-gray-800">{proof.prompt}</p>
                        {proof.signedUrl ? (
                          <img
                            src={proof.signedUrl}
                            alt={proof.prompt}
                            className="mb-3 h-40 w-full rounded-lg object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                            No photo
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onPhotoApprove?.(proof.itemIndex)}
                            className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${
                              approved
                                ? 'bg-green-500 text-white'
                                : 'bg-green-50 text-green-800 hover:bg-green-100'
                            }`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onPhotoDeny?.(proof.itemIndex)}
                            className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold ${
                              denied
                                ? 'bg-red-500 text-white'
                                : 'bg-red-50 text-red-800 hover:bg-red-100'
                            }`}
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedIncorrectItems.size > 0 && (
                  <p className="text-sm text-red-600 mt-3 font-semibold">
                    {selectedIncorrectItems.size} photo(s) denied
                  </p>
                )}
                {photoApprovedItems.size > 0 && selectedIncorrectItems.size === 0 && (
                  <p className="text-sm text-green-700 mt-3 font-semibold">
                    {photoApprovedItems.size}/{reviewableCount} approved
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700 mb-3">
                  Selected Items ({pendingWinClaim.items?.length || 0}):
                </p>
                <p className="text-sm text-gray-600 mb-3">Select the incorrect items (if any) to reject:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {pendingWinClaim.items?.map((item, idx) => (
                    <label
                      key={idx}
                      className={`bg-white border-2 rounded-lg p-2 text-sm font-semibold cursor-pointer transition-all ${
                        selectedIncorrectItems.has(idx)
                          ? 'border-red-500 bg-red-50 text-red-900'
                          : 'mingo-border-brand text-gray-800 mingo-border-brand-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIncorrectItems.has(idx)}
                          onChange={() => onToggleIncorrectItem(idx)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span>{item}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedIncorrectItems.size > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-semibold">
                    {selectedIncorrectItems.size} item(s) marked as incorrect
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onReject}
            disabled={!canReject}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition shadow-lg ${
              !canReject ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            <X size={20} /> Reject
            {selectedIncorrectItems.size > 0 && ` (${selectedIncorrectItems.size} incorrect)`}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition shadow-lg ${
              !canConfirm
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            <Check size={20} /> Confirm Win
          </button>
        </div>
      </div>
    </div>
  );
}
