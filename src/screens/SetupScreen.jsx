import { Play, Plus, Sparkles, Trash2, X } from 'lucide-react';

export default function SetupScreen({
  currentUser,
  gameTitle,
  setGameTitle,
  generatingItems,
  neededItemCount,
  onGenerateItems,
  boardSize,
  onUpdateBoardSize,
  useFreeSpace,
  onUpdateFreeSpace,
  winMode,
  onUpdateWinMode,
  linesToWin,
  onUpdateLinesToWin,
  gameVisibility,
  onUpdateGameVisibility,
  items,
  onAddItem,
  onUpdateItem,
  onUpdateItemImage,
  onRemoveItem,
  onRemoveItemImage,
  onBack,
  onCreateGame,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8">
      <div className="mb-6">
        <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
          Game Title
        </label>
        <input
          type="text"
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value)}
          placeholder="Enter a title for your game (used to generate items)"
          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        />
        <button
          type="button"
          onClick={onGenerateItems}
          disabled={generatingItems || !gameTitle.trim()}
          className="mt-3 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={18} />
          {generatingItems
            ? 'Generating…'
            : `Generate ${neededItemCount} items from title`}
        </button>
        <p className="mt-2 text-xs sm:text-sm text-gray-500">
          Optional: AI fills the item list from your title. You can edit anything before creating the game.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="setup-board-size" className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
          Board Size
        </label>
        <select
          id="setup-board-size"
          value={boardSize}
          onChange={(e) => onUpdateBoardSize(Number(e.target.value))}
          className="w-full p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        >
          <option value={3}>3x3</option>
          <option value={4}>4x4</option>
          <option value={5}>5x5</option>
          <option value={6}>6x6</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm sm:text-base">
          <input
            type="checkbox"
            checked={useFreeSpace}
            onChange={(e) => onUpdateFreeSpace(e.target.checked)}
            className="w-4 h-4 sm:w-5 sm:h-5"
          />
          Include FREE space in center
        </label>
      </div>

      <div className="mb-6">
        <label htmlFor="setup-win-mode" className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
          Win mode
        </label>
        <select
          id="setup-win-mode"
          value={winMode}
          onChange={(e) => onUpdateWinMode(e.target.value)}
          className="w-full p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        >
          <option value="standard">Standard (lines)</option>
          <option value="four_corners">Four corners</option>
          <option value="x">X (both diagonals)</option>
          <option value="blackout">Blackout (full board)</option>
        </select>
        <p className="mt-2 text-xs sm:text-sm text-gray-500">
          One win rule per game. Players claim when that pattern is complete.
        </p>
      </div>

      {winMode === 'standard' && (
        <div className="mb-6">
          <label htmlFor="setup-lines-to-win" className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
            Bingos required
          </label>
          <select
            id="setup-lines-to-win"
            value={linesToWin}
            onChange={(e) => onUpdateLinesToWin(Number(e.target.value))}
            className="w-full p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
          >
            <option value={1}>1 line</option>
            <option value={2}>2 lines</option>
            <option value={3}>3 lines</option>
          </select>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="setup-visibility" className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
          Visibility
        </label>
        <select
          id="setup-visibility"
          value={gameVisibility}
          onChange={(e) => onUpdateGameVisibility(e.target.value)}
          className="w-full p-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
        >
          <option value="private">Private (code only)</option>
          <option value="public">Public (listed in lobby)</option>
        </select>
        <p className="mt-2 text-xs sm:text-sm text-gray-500">
          Private games stay off the public lobby. Anyone with the exact code can still join.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
          <label className="text-gray-700 font-semibold text-sm sm:text-base">
            Bingo Items ({items.filter(i => {
              if (typeof i === 'string') return i.trim() !== '';
              return (i.text && i.text.trim() !== '') || i.imageUrl;
            }).length} of {useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize} filled)
          </label>
          <button
            onClick={onAddItem}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" /> Add Extra Item
          </button>
        </div>

        <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
          {items.map((item, index) => {
            const itemValue = typeof item === 'string' ? item : (item?.text || '');
            const itemImageUrl = typeof item === 'string' ? null : (item?.imageUrl || null);

            return (
              <div key={index} className="flex flex-col gap-2 p-2 border-2 border-gray-200 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemValue}
                    onChange={(e) => onUpdateItem(index, e.target.value)}
                    placeholder={`Item ${index + 1} (text)`}
                    disabled={!!itemImageUrl}
                    className={`flex-1 p-2 sm:p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base ${
                      itemImageUrl ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <label className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition cursor-pointer text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUpdateItemImage(index, file);
                        }
                      }}
                      disabled={!currentUser}
                    />
                    📷 Image
                  </label>
                  {index >= (useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize) && (
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="px-2 sm:px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      <Trash2 size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
                {itemImageUrl && (
                  <div className="relative">
                    <img
                      src={itemImageUrl}
                      alt={`Item ${index + 1}`}
                      className="w-full h-32 object-contain rounded border-2 border-purple-300"
                    />
                    <button
                      onClick={() => onRemoveItemImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
        >
          Back
        </button>
        <button
          onClick={onCreateGame}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
        >
          <Play size={20} className="sm:w-6 sm:h-6" /> Create Game
        </button>
      </div>
    </div>
  );
}
