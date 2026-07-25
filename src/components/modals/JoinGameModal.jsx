import { AlertCircle, Loader2, LogIn, UserPlus, Users, X } from 'lucide-react';

/**
 * Join chooser: guest (anonymous) display name, or log in / create an account.
 * Deep links and manual code entry both use this so invite URLs are not guest-only.
 */
export default function JoinGameModal({
  joinCode,
  guestDisplayName,
  setGuestDisplayName,
  guestJoinError,
  guestJoining,
  onSubmitGuest,
  onLogin,
  onRegister,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-game-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="join-game-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">
              Join game
            </h2>
            {joinCode ? (
              <p className="text-sm text-gray-500 mt-1">
                Code{' '}
                <span className="font-mono font-bold mingo-text-brand tracking-wider" data-testid="join-modal-code">
                  {joinCode}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Continue as a guest or sign in to keep your boards.
              </p>
            )}
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

        <form onSubmit={onSubmitGuest} className="space-y-4">
          {guestJoinError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
              role="alert"
            >
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{guestJoinError}</span>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Join as guest</p>
            <p className="text-xs text-gray-500 mb-2">
              Fastest for events — pick a name others will see in the player list.
            </p>
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

          <button
            type="submit"
            disabled={guestJoining}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 mingo-btn-primary font-bold rounded-xl transition disabled:opacity-60"
          >
            {guestJoining ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Joining…
              </>
            ) : (
              <>
                <Users size={18} /> Join as guest
              </>
            )}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-500 uppercase tracking-wide">or use an account</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3 text-center">
          Sign in to save progress and rejoin from your dashboard later.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onLogin}
            disabled={guestJoining}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 mingo-btn-brand font-semibold rounded-xl transition disabled:opacity-50 text-sm"
          >
            <LogIn size={18} /> Log in
          </button>
          <button
            type="button"
            onClick={onRegister}
            disabled={guestJoining}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 mingo-btn-secondary font-semibold rounded-xl transition disabled:opacity-50 text-sm"
          >
            <UserPlus size={18} /> Create account
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={guestJoining}
          className="w-full mt-4 px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
