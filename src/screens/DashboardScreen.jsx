import { AlertCircle, Loader2, LogOut, Play, X } from 'lucide-react';

export default function DashboardScreen({
  currentUser,
  gamesLoading,
  userGames,
  onLogout,
  onSelectGame,
  onEndGame,
  onCreateGame,
  onJoinWithCode,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome, {currentUser?.username}!</h2>
          <p className="text-sm text-gray-600">Your Games</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {gamesLoading ? (
        <div className="text-center py-8">
          <Loader2 size={32} className="mx-auto text-purple-600 animate-spin mb-3" />
          <p className="text-gray-600">Loading your games…</p>
        </div>
      ) : userGames.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't joined any games yet.</p>
          <button
            onClick={onCreateGame}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
          >
            Create Your First Game
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {userGames.map((game) => (
            <div
              key={game.gameCode}
              className={`w-full p-4 rounded-xl border-2 ${
                game.pendingWin && game.isHost
                  ? 'border-yellow-500 bg-yellow-50'
                  : game.isHost
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <button
                onClick={() => onSelectGame(game)}
                className="w-full flex items-center justify-between text-left mb-2 hover:opacity-80 transition"
              >
                <div className="flex-1">
                  {game.config?.title && (
                    <h3 className="font-bold text-lg text-gray-800 mb-1">{game.config.title}</h3>
                  )}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-lg font-mono text-purple-600">{game.gameCode}</span>
                    {game.isHost && (
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                        HOST
                      </span>
                    )}
                    {game.pendingWin && game.isHost && (
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded flex items-center gap-1 animate-pulse">
                        <AlertCircle size={12} /> Pending Win
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {game.isHost ? 'Host' : 'Player'} • {game.config?.boardSize}x{game.config?.boardSize} board
                  </p>
                </div>
                <Play size={20} className="text-purple-600 flex-shrink-0 ml-2" />
              </button>
              {game.isHost && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to end game ${game.gameCode}? This will remove it from your games list.`)) {
                        onEndGame(game.gameCode);
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <X size={16} /> End Game
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          onClick={onCreateGame}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
        >
          <Play size={20} /> Create New Game
        </button>
        <button
          onClick={onJoinWithCode}
          className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition"
        >
          Join Game with Code
        </button>
      </div>
    </div>
  );
}
