import { AlertCircle, Loader2, Users, X } from 'lucide-react';

export default function GuestJoinModal({
  guestDisplayName,
  setGuestDisplayName,
  guestJoinError,
  guestJoining,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-name-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="guest-name-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">
              Join as guest
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Pick a display name so others can see you in the player list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guestJoining}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {guestJoinError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2" role="alert">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{guestJoinError}</span>
            </div>
          )}

          <div>
            <label htmlFor="guest-display-name" className="block text-gray-700 font-semibold mb-2 text-sm">
              Display name
            </label>
            <input
              id="guest-display-name"
              type="text"
              value={guestDisplayName}
              onChange={(e) => setGuestDisplayName(e.target.value)}
              placeholder="Your name"
              required
              maxLength={24}
              autoFocus
              disabled={guestJoining}
              className="w-full p-3 border-2 border-gray-300 rounded-lg mingo-focus-brand text-sm sm:text-base disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={guestJoining}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={guestJoining}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 mingo-btn-primary font-bold rounded-xl transition disabled:opacity-60"
            >
              {guestJoining ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Joining…
                </>
              ) : (
                <>
                  <Users size={18} /> Join game
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
