
import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, Plus, Trash2, Play, RotateCcw, Trophy, Copy, Check, Users, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [isHost, setIsHost] = useState(false);
  const [pendingWinClaim, setPendingWinClaim] = useState(null);
  const [winConfirmed, setWinConfirmed] = useState(false);
  const [winRejected, setWinRejected] = useState(false);
  const confettiIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

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
    setIsHost(true);
    
    // Store in persistent storage (try window.storage, fallback to localStorage)
    try {
      const configString = JSON.stringify(config);
      
      // Try window.storage first (if available)
      if (window.storage && typeof window.storage.set === 'function') {
        try {
          await window.storage.set(`game:${code}`, configString, true);
          await window.storage.set(`win:${code}`, JSON.stringify({ status: null, claim: null }), true);
        } catch (e) {
          console.warn('window.storage not available, using localStorage');
          // Fallback to localStorage
          localStorage.setItem(`game:${code}`, configString);
          localStorage.setItem(`win:${code}`, JSON.stringify({ status: null, claim: null }));
        }
      } else {
        // Use localStorage directly
        localStorage.setItem(`game:${code}`, configString);
        localStorage.setItem(`win:${code}`, JSON.stringify({ status: null, claim: null }));
      }
    } catch (error) {
      console.error('Storage error:', error);
      // Try localStorage as fallback
      try {
        localStorage.setItem(`game:${code}`, JSON.stringify(config));
        localStorage.setItem(`win:${code}`, JSON.stringify({ status: null, claim: null }));
      } catch (localError) {
        console.error('localStorage error:', localError);
        alert('Could not save game. Please try again.');
        return;
      }
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
      const gameData = await getStorage(`game:${code}`);

      if (!gameData) {
        alert('Game not found. Please check the code and try again.');
        return;
      }

      const config = JSON.parse(gameData);
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        alert('Invalid game configuration. Please check the code and try again.');
        return;
      }

      // Reset player state
      setPendingWinClaim(null);
      setWinConfirmed(false);
      setWinRejected(false);
      setHasWon(false);
      setMarked(new Set());
      
      setGameConfig(config);
      setGameCode(code);
      setBoardSize(config.boardSize || 5);
      setUseFreeSpace(config.useFreeSpace !== undefined ? config.useFreeSpace : true);
      setIsHost(false);
      
      // Generate unique board for this player
      generateBoardFromConfig(config);
    } catch (error) {
      console.error('Error joining game:', error);
      alert(`Error joining game: ${error.message}. Please check the code and try again.`);
    }
  };

  const generateBoardFromConfig = (config) => {
    const { items: validItems, boardSize: size, useFreeSpace: freeSpace } = config;
    const totalCells = size * size;
    const neededItems = freeSpace ? totalCells - 1 : totalCells;

    // Better shuffle algorithm (Fisher-Yates)
    const shuffled = [...validItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Select items for this board
    const selected = shuffled.slice(0, neededItems);
    
    // Randomize the board positions
    const positions = [];
    for (let i = 0; i < selected.length; i++) {
      positions.push(i);
    }
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    const newBoard = [];
    const centerIndex = Math.floor(totalCells / 2);
    
    let itemIndex = 0;
    for (let i = 0; i < totalCells; i++) {
      if (freeSpace && i === centerIndex) {
        newBoard.push({ text: 'FREE', isFree: true });
      } else {
        newBoard.push({ text: selected[positions[itemIndex]], isFree: false });
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

  const setStorage = async (key, value) => {
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        await window.storage.set(key, typeof value === 'string' ? value : JSON.stringify(value), true);
      } else {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (e) {
        console.error('localStorage set error:', e);
      }
    }
  };

  const getStorage = async (key) => {
    try {
      if (window.storage && typeof window.storage.get === 'function') {
        const result = await window.storage.get(key, true);
        return result?.value || localStorage.getItem(key);
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage get error:', error);
      return localStorage.getItem(key);
    }
  };

  const confirmWin = async () => {
    try {
      const claim = {
        ...pendingWinClaim,
        status: 'confirmed',
        confirmedAt: Date.now()
      };
      await setStorage(`win:${gameCode}`, JSON.stringify(claim));
      setPendingWinClaim(null);
      // Reset claim after a delay to allow player to see confirmation
      setTimeout(async () => {
        try {
          await setStorage(`win:${gameCode}`, JSON.stringify({ status: null, claim: null }));
        } catch (error) {
          console.error('Error resetting win claim:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Error confirming win:', error);
    }
  };

  const rejectWin = async () => {
    try {
      const claim = {
        ...pendingWinClaim,
        status: 'rejected',
        rejectedAt: Date.now()
      };
      await setStorage(`win:${gameCode}`, JSON.stringify(claim));
      setPendingWinClaim(null);
      // Reset claim after a delay to allow player to see rejection
      setTimeout(async () => {
        try {
          await setStorage(`win:${gameCode}`, JSON.stringify({ status: null, claim: null }));
        } catch (error) {
          console.error('Error resetting win claim:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Error rejecting win:', error);
    }
  };

  const toggleCell = (index) => {
    if (board[index].isFree || hasWon || pendingWinClaim || winRejected) return;
    
    const newMarked = new Set(marked);
    if (newMarked.has(index)) {
      newMarked.delete(index);
    } else {
      newMarked.add(index);
    }
    setMarked(newMarked);
  };

  const checkWin = () => {
    // Check rows
    for (let row = 0; row < boardSize; row++) {
      let win = true;
      const winIndices = [];
      for (let col = 0; col < boardSize; col++) {
        const index = row * boardSize + col;
        if (!marked.has(index)) {
          win = false;
          break;
        }
        winIndices.push(index);
      }
      if (win) {
        const winItems = winIndices.map(idx => board[idx].text);
        return { type: 'row', row, indices: winIndices, items: winItems };
      }
    }

    // Check columns
    for (let col = 0; col < boardSize; col++) {
      let win = true;
      const winIndices = [];
      for (let row = 0; row < boardSize; row++) {
        const index = row * boardSize + col;
        if (!marked.has(index)) {
          win = false;
          break;
        }
        winIndices.push(index);
      }
      if (win) {
        const winItems = winIndices.map(idx => board[idx].text);
        return { type: 'column', column: col, indices: winIndices, items: winItems };
      }
    }

    // Check diagonal 1 (top-left to bottom-right)
    let diagonal1 = true;
    const diag1Indices = [];
    for (let i = 0; i < boardSize; i++) {
      const index = i * boardSize + i;
      if (!marked.has(index)) {
        diagonal1 = false;
        break;
      }
      diag1Indices.push(index);
    }
    if (diagonal1) {
      const winItems = diag1Indices.map(idx => board[idx].text);
      return { type: 'diagonal', diagonal: 1, indices: diag1Indices, items: winItems };
    }

    // Check diagonal 2 (top-right to bottom-left)
    let diagonal2 = true;
    const diag2Indices = [];
    for (let i = 0; i < boardSize; i++) {
      const index = i * boardSize + (boardSize - 1 - i);
      if (!marked.has(index)) {
        diagonal2 = false;
        break;
      }
      diag2Indices.push(index);
    }
    if (diagonal2) {
      const winItems = diag2Indices.map(idx => board[idx].text);
      return { type: 'diagonal', diagonal: 2, indices: diag2Indices, items: winItems };
    }

    return null;
  };

  // Check for win condition
  useEffect(() => {
    if (screen === 'play' && !hasWon && !pendingWinClaim && !winConfirmed && !winRejected && board.length > 0 && boardSize > 0) {
      const winResult = checkWin();
      if (winResult && !isHost) {
        // Player won - store claim for host verification
        const storeWinClaim = async () => {
          try {
            const claim = {
              status: 'pending',
              type: winResult.type,
              items: winResult.items,
              indices: winResult.indices,
              timestamp: Date.now()
            };
            await setStorage(`win:${gameCode}`, JSON.stringify(claim));
            setPendingWinClaim(claim);
          } catch (error) {
            console.error('Error storing win claim:', error);
          }
        };
        storeWinClaim();
      } else if (winResult && isHost) {
        // Host won - auto-confirm for host (no verification needed)
        setHasWon(true);
        setWinConfirmed(true);
      }
    }
  }, [marked, screen, hasWon, pendingWinClaim, winConfirmed, winRejected, board, boardSize, isHost, gameCode]);

  // Poll for win claims (host) or confirmation status (player)
  useEffect(() => {
    if (gameCode && isHost && (screen === 'host' || screen === 'play')) {
      // Host polls for win claims (even when playing)
      const checkWinClaims = async () => {
        try {
          const result = await getStorage(`win:${gameCode}`);
          if (result) {
            const claim = JSON.parse(result);
            if (claim && claim.status === 'pending' && (!pendingWinClaim || pendingWinClaim.timestamp !== claim.timestamp)) {
              setPendingWinClaim(claim);
            }
          }
        } catch (error) {
          console.error('Error checking win claims:', error);
        }
      };

      checkWinClaims();
      pollIntervalRef.current = setInterval(checkWinClaims, 1000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    } else if (gameCode && screen === 'play' && !isHost && pendingWinClaim) {
      // Player polls for confirmation/rejection
      const checkConfirmation = async () => {
        try {
          const result = await getStorage(`win:${gameCode}`);
          if (result) {
            const claim = JSON.parse(result);
            if (claim && claim.status === 'confirmed' && !winConfirmed) {
              setWinConfirmed(true);
              setHasWon(true);
              setPendingWinClaim(null);
            } else if (claim && claim.status === 'rejected' && !winRejected) {
              setWinRejected(true);
              setPendingWinClaim(null);
              setHasWon(false);
              // Reset after rejection - allow player to try again
              setTimeout(() => {
                setWinRejected(false);
              }, 4000);
            }
          }
        } catch (error) {
          console.error('Error checking confirmation:', error);
        }
      };

      checkConfirmation();
      pollIntervalRef.current = setInterval(checkConfirmation, 1000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [gameCode, screen, isHost, pendingWinClaim, winConfirmed, winRejected]);

  // Trigger confetti when win is confirmed
  useEffect(() => {
    if (hasWon && winConfirmed && screen === 'play' && !isHost) {
      // Trigger confetti animation when win is confirmed by host
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      // Initial confetti burst from center
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Continuous confetti for duration
      confettiIntervalRef.current = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (confettiIntervalRef.current) {
            clearInterval(confettiIntervalRef.current);
            confettiIntervalRef.current = null;
          }
          return;
        }

        const particleCount = Math.floor(50 * (timeLeft / duration));
        
        // Launch confetti from different positions
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Cleanup interval after duration
      const timeoutId = setTimeout(() => {
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current);
          confettiIntervalRef.current = null;
        }
      }, duration);

      // Cleanup on unmount or when dependencies change
      return () => {
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current);
          confettiIntervalRef.current = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [hasWon, winConfirmed, screen, isHost]);

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
    setIsHost(false);
    setPendingWinClaim(null);
    setWinConfirmed(false);
    setWinRejected(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
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
          <div className="space-y-4 sm:space-y-6">
            {/* Win Verification Modal */}
            {pendingWinClaim && (
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
                      <p className="font-semibold text-gray-700 mb-2">Win Type: <span className="capitalize">{pendingWinClaim.type}</span></p>
                      <p className="font-semibold text-gray-700 mb-3">Selected Items ({pendingWinClaim.items?.length || 0}):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pendingWinClaim.items?.map((item, idx) => (
                          <div key={idx} className="bg-white border-2 border-purple-300 rounded-lg p-2 text-sm font-semibold text-gray-800">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={rejectWin}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition shadow-lg"
                    >
                      <X size={20} /> Reject
                    </button>
                    <button
                      onClick={confirmWin}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition shadow-lg"
                    >
                      <Check size={20} /> Confirm Win
                    </button>
                  </div>
                </div>
              </div>
            )}

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
          </div>
        )}

        {screen === 'play' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Win Verification Modal for Host */}
            {isHost && pendingWinClaim && (
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
                      <p className="font-semibold text-gray-700 mb-2">Win Type: <span className="capitalize">{pendingWinClaim.type}</span></p>
                      <p className="font-semibold text-gray-700 mb-3">Selected Items ({pendingWinClaim.items?.length || 0}):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pendingWinClaim.items?.map((item, idx) => (
                          <div key={idx} className="bg-white border-2 border-purple-300 rounded-lg p-2 text-sm font-semibold text-gray-800">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={rejectWin}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition shadow-lg"
                    >
                      <X size={20} /> Reject
                    </button>
                    <button
                      onClick={confirmWin}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition shadow-lg"
                    >
                      <Check size={20} /> Confirm Win
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gameCode && (
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Game Code</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-purple-600">{gameCode}</p>
              </div>
            )}

            {pendingWinClaim && !winConfirmed && !winRejected && (
              <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
                <AlertCircle size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
                <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
                <p className="text-base sm:text-lg mt-2">Waiting for host verification...</p>
                <p className="text-sm mt-1 opacity-75">Your win claim has been submitted. Please wait.</p>
              </div>
            )}

            {winRejected && (
              <div className="bg-red-400 text-white p-4 sm:p-6 rounded-2xl text-center shadow-2xl">
                <X size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
                <h2 className="text-2xl sm:text-3xl font-bold">Win Rejected</h2>
                <p className="text-base sm:text-lg mt-2">Your win claim was not verified by the host.</p>
                <p className="text-sm mt-1 opacity-75">Please continue playing.</p>
              </div>
            )}

            {hasWon && winConfirmed && (
              <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
                <Trophy size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
                <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
                <p className="text-base sm:text-lg">You won! Win confirmed!</p>
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