import { LogIn, UserPlus, Users } from 'lucide-react';
import PublicLobby from '../components/game/PublicLobby';

export default function HomeScreen({
  currentUser,
  joinCode,
  setJoinCode,
  onOpenDashboard,
  onLogin,
  onRegister,
  onJoinGame,
  onJoinPublicGame,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
      {currentUser ? (
        <>
          <div className="text-center mb-4">
            <p className="text-gray-600 mb-2">Logged in as: <span className="font-bold mingo-text-brand">{currentUser.username}</span></p>
            <button
              onClick={onOpenDashboard}
              className="mingo-link-brand font-semibold text-sm"
            >
              Go to Dashboard →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-gray-600 mb-4">Sign in to save your games and play multiple boards</p>
          </div>
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 mingo-btn-primary font-bold text-base sm:text-lg rounded-xl transition shadow-lg"
          >
            <LogIn size={20} /> Login
          </button>
          <button
            onClick={onRegister}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 mingo-btn-secondary font-bold text-base sm:text-lg rounded-xl transition shadow-lg"
          >
            <UserPlus size={20} /> Create Account
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or continue as guest</span>
            </div>
          </div>
        </>
      )}

      <div className="pt-2 border-t border-gray-200">
        <PublicLobby onJoinGame={onJoinPublicGame || onJoinGame} />
      </div>

      <div className="space-y-3 pt-2 border-t border-gray-200">
        <label className="block text-gray-700 font-semibold text-sm sm:text-base">
          Join Existing Game
        </label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter 5-digit code"
          maxLength={5}
          className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg mingo-focus-brand text-center text-xl sm:text-2xl font-mono uppercase"
        />
        <button
          onClick={() => onJoinGame()}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 mingo-btn-secondary font-bold text-base sm:text-lg rounded-xl transition shadow-lg"
        >
          <Users size={20} className="sm:w-6 sm:h-6" /> Join Game
        </button>
      </div>
    </div>
  );
}
