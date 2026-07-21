import { AlertCircle, Check, X } from 'lucide-react';
import { formatClaimType } from '../../lib/winDetection';

export default function WinVerificationModal({
  pendingWinClaim,
  selectedIncorrectItems,
  onToggleIncorrectItem,
  onReject,
  onConfirm,
}) {
  if (!pendingWinClaim) return null;

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
          <p className="text-gray-600 mb-4">A player has claimed a bingo win. Please verify the selected items:</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="font-semibold text-gray-700 mb-2">
              Win Type: <span className="capitalize">{formatClaimType(pendingWinClaim.type)}</span>
            </p>
            <p className="font-semibold text-gray-700 mb-3">Selected Items ({pendingWinClaim.items?.length || 0}):</p>
            <p className="text-sm text-gray-600 mb-3">Select the incorrect items (if any) to reject:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pendingWinClaim.items?.map((item, idx) => (
                <label
                  key={idx}
                  className={`bg-white border-2 rounded-lg p-2 text-sm font-semibold cursor-pointer transition-all ${
                    selectedIncorrectItems.has(idx)
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-purple-300 text-gray-800 hover:border-purple-500'
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
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onReject}
            disabled={selectedIncorrectItems.size === 0}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition shadow-lg ${
              selectedIncorrectItems.size === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            <X size={20} /> Reject {selectedIncorrectItems.size > 0 && `(${selectedIncorrectItems.size} incorrect)`}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition shadow-lg"
          >
            <Check size={20} /> Confirm Win
          </button>
        </div>
      </div>
    </div>
  );
}
