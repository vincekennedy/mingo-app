import { Trophy, Users } from 'lucide-react';

export default function PlayerListSidebar({ gamePlayers, confirmedWinners, emptyLabel = 'No players yet...' }) {
  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sticky top-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          Players ({gamePlayers.length})
        </h3>
        {gamePlayers.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{emptyLabel}</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {gamePlayers.map((player) => {
              const hasWon = confirmedWinners.includes(player.id);
              return (
                <li
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    hasWon
                      ? 'bg-yellow-100 border-2 border-yellow-400'
                      : player.isHost
                      ? 'bg-purple-100 border border-purple-300'
                      : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${
                      hasWon ? 'text-yellow-800' : 'text-gray-800'
                    }`}>
                      {player.username}
                    </p>
                    {player.isHost && (
                      <span className="text-xs text-purple-600 font-medium">Host</span>
                    )}
                  </div>
                  {hasWon && (
                    <div className="flex items-center gap-1 text-yellow-600" title="Bingo Winner!">
                      <Trophy size={18} className="flex-shrink-0" />
                      <span className="text-xs font-bold hidden sm:inline">BINGO!</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
