import { Play, Trophy, X } from 'lucide-react';

export default function EndGameDialog({ onContinue, onEndGame }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 text-center">
      <div className="mb-4">
        <Trophy size={48} className="mx-auto mb-3 text-yellow-500" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Win Confirmed!</h2>
        <p className="text-gray-600 text-sm sm:text-base">
          A player has won. Would you like to end the game or continue playing?
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={onContinue}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition shadow-lg"
        >
          <Play size={20} /> Continue Playing
        </button>
        <button
          onClick={onEndGame}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition shadow-lg"
        >
          <X size={20} /> End Game
        </button>
      </div>
    </div>
  );
}
