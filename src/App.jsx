
import React, { useState, useEffect } from 'react';
import { Shuffle, Plus, Trash2, Play, RotateCcw, Trophy, Copy, Check, Users } from 'lucide-react';

export default function Mingo() {
  const [screen, setScreen] = useState('home'); // home, setup, host, play
  const [items, setItems] = useState(Array(24).fill(''));
  const [boardSize, setBoardSize] = useState(5);
  const [board, setBoard] = useState([]);
  const [marked, setMarked] = useState(new Set());
  const [hasWon, setHasWon] = useState(false);
  const [useFreeSpace, setUseFreeSpace] = useState(true);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const addItem = () => {
    setItems([...items, '']);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const updateBoardSize = (size) => {
    setBoardSize(size);
    const neededItems = useFreeSpace ? size * size - 1 : size * size;
    // Adjust items array to match needed items
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill('')]);
    }
  };

  const updateFreeSpace = (hasFreeSpace) => {
    setUseFreeSpace(hasFreeSpace);
    const neededItems = hasFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize;
    // Adjust items array to match needed items
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill('')]);
    }
  };

  const createGame = async () => {
    const validItems = items.filter(item => item.trim() !== '');
    const totalCells = boardSize * boardSize;
    const neededItems = useFreeSpace ? totalCells - 1 : totalCells;

    if (validItems.length < neededItems) {
      alert(`You need at least ${neededItems} items for a ${boardSize}x${boardSize} board${useFreeSpace ? ' (with free space)' : ''}`);
      return;
    }

    const code = generateCode();
    const config = {
      items: validItems,
      boardSize,
      useFreeSpace
    };

    setGameCode(code);
    setGameConfig(config);
    
    // Store in persistent storage
    try {
      await window.storage.set(`game:${code}`, JSON.stringify(config), true);
    } catch (error) {
      console.error('Storage error:', error);
    }

    setScreen('host');
  };

  const joinGame = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 5) {
      alert('Please enter a 5-character game code');
      return;
    }

    try {
      const result = await window.storage.get(`game:${code}`, true);
      if (!result) {
        alert('Game not found. Please check the code and try again.');
        return;
      }

      const config = JSON.parse(result.value);
      setGameConfig(config);
      setGameCode(code);
      setBoardSize(config.boardSize);
      setUseFreeSpace(config.useFreeSpace);
      generateBoardFromConfig(config);
    } catch (error) {
      alert('Game not found. Please check the code and try again.');
    }
  };

  const generateBoardFromConfig = (config) => {
    const { items: validItems, boardSize: size, useFreeSpace: freeSpace } = config;
    const totalCells = size * size;
    const neededItems = freeSpace ? totalCells - 1 : totalCells;

    const shuffled = [...validItems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, neededItems);
    
    const newBoard = [];
    const centerIndex = Math.floor(totalCells / 2);
    
    let itemIndex = 0;
    for (let i = 0; i < totalCells; i++) {
      if (freeSpace && i === centerIndex) {
        newBoard.push({ text: 'FREE', isFree: true });
      } else {
        newBoard.push({ text: selected[itemIndex], isFree: false });
        itemIndex++;
      }
    }

    setBoard(newBoard);
    setMarked(freeSpace ? new Set([centerIndex]) : new Set());
    setHasWon(false);
    setScreen('play');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCell = (index) => {
    if (board[index].isFree || hasWon) return;
    
    const newMarked = new Set(marked);
    if (newMarked.has(index)) {
      newMarked.delete(index);
    } else {
      newMarked.add(index);
    }
    setMarked(newMarked);
  };

  const checkWin = () => {
    for (let row = 0; row < boardSize; row++) {
      let win = true;
      for (let col = 0; col < boardSize; col++) {
        if (!marked.has(row * boardSize + col)) {
          win = false;
          break;
        }
      }
      if (win) return true;
    }

    for (let col = 0; col < boardSize; col++) {
      let win = true;
      for (let row = 0; row < boardSize; row++) {
        if (!marked.has(row * boardSize + col)) {
          win = false;
          break;
        }
      }
      if (win) return true;
    }

    let diagonal1 = true;
    let diagonal2 = true;
    for (let i = 0; i < boardSize; i++) {
      if (!marked.has(i * boardSize + i)) diagonal1 = false;
      if (!marked.has(i * boardSize + (boardSize - 1 - i))) diagonal2 = false;
    }

    return diagonal1 || diagonal2;
  };

  useEffect(() => {
    if (screen === 'play' && !hasWon) {
      if (checkWin()) {
        setHasWon(true);
      }
    }
  }, [marked]);

  const resetToHome = () => {
    setScreen('home');
    setItems(Array(24).fill(''));
    setBoardSize(5);
    setBoard([]);
    setMarked(new Set());
    setHasWon(false);
    setUseFreeSpace(true);
    setGameCode('');
    setJoinCode('');
    setGameConfig(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2">🎲 Mingo</h1>
          <p className="text-white text-base sm:text-lg opacity-90">Create & Play Custom Bingo</p>
        </div>

        {screen === 'home' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
            <button
              onClick={() => setScreen('setup')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg sm:text-xl rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              <Play size={24} className="sm:w-7 sm:h-7" /> Create New Game
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-gray-700 font-semibold text-sm sm:text-base">
                Join Existing Game
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 5-digit code"
                maxLength={5}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-center text-xl sm:text-2xl font-mono uppercase"
              />
              <button
                onClick={joinGame}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
              >
                <Users size={20} className="sm:w-6 sm:h-6" /> Join Game
              </button>
            </div>
          </div>
        )}

        {screen === 'setup' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8">
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
                Board Size
              </label>
              <select
                value={boardSize}
                onChange={(e) => updateBoardSize(Number(e.target.value))}
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
                  onChange={(e) => updateFreeSpace(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                Include FREE space in center
              </label>
            </div>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <label className="text-gray-700 font-semibold text-sm sm:text-base">
                  Bingo Items ({items.filter(i => i.trim()).length} of {useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize} filled)
                </label>
                <button
                  onClick={addItem}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm sm:text-base"
                >
                  <Plus size={18} className="sm:w-5 sm:h-5" /> Add Extra Item
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1 p-2 sm:p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
                    />
                    {index >= (useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize) && (
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 sm:px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <Trash2 size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setScreen('home')}
                className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
              >
                Back
              </button>
              <button
                onClick={createGame}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
              >
                <Play size={20} className="sm:w-6 sm:h-6" /> Create Game
              </button>
            </div>
          </div>
        )}

        {screen === 'host' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Game Created!</h2>
              <p className="text-sm sm:text-base text-gray-600">Share this code with players:</p>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 sm:p-6 rounded-xl">
              <div className="text-3xl sm:text-5xl font-bold font-mono text-purple-600 mb-3 sm:mb-4 tracking-wider">
                {gameCode}
              </div>
              <button
                onClick={copyCode}
                className="flex items-center justify-center gap-2 mx-auto px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
              >
                {copied ? <Check size={18} className="sm:w-5 sm:h-5" /> : <Copy size={18} className="sm:w-5 sm:h-5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => generateBoardFromConfig(gameConfig)}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
              >
                <Play size={20} className="sm:w-6 sm:h-6" /> Start Playing
              </button>
              <button
                onClick={resetToHome}
                className="w-full px-6 py-2 sm:py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {screen === 'play' && (
          <div className="space-y-4 sm:space-y-6">
            {gameCode && (
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Game Code</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-purple-600">{gameCode}</p>
              </div>
            )}

            {hasWon && (
              <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
                <Trophy size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
                <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
                <p className="text-base sm:text-lg">You won!</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-8">
              <div 
                className="grid gap-1.5 sm:gap-2 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
                  maxWidth: `min(100%, ${boardSize * 120}px)`
                }}
              >
                {board.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => toggleCell(index)}
                    className={`
                      aspect-square p-1 sm:p-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center text-center transition-all
                      ${cell.isFree 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-gray-900 cursor-default' 
                        : marked.has(index)
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-95'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100 text-gray-800 hover:scale-105 hover:shadow-lg active:scale-95'
                      }
                    `}
                  >
                    <span className="break-words leading-tight">{cell.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => generateBoardFromConfig(gameConfig)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition shadow-lg text-sm sm:text-base"
              >
                <Shuffle size={18} className="sm:w-5 sm:h-5" /> New Board
              </button>
              <button
                onClick={resetToHome}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition shadow-lg text-sm sm:text-base"
              >
                <RotateCcw size={18} className="sm:w-5 sm:h-5" /> End Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}