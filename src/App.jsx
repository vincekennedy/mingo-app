
import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, Plus, Trash2, Play, RotateCcw, Trophy, Copy, Check, Users, X, AlertCircle, LogIn, UserPlus, LogOut, Home, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { authService } from './services/auth';
import { gameService } from './services/game';
import { boardService } from './services/board';
import { winClaimsService } from './services/winClaims';
import { storageService } from './services/storage';
import { supabase } from './lib/supabase';

export default function Mingo() {
  const [screen, setScreen] = useState('home'); // home, login, register, email-confirmation, dashboard, setup, host, play
  const [currentUser, setCurrentUser] = useState(null);
  const [userGames, setUserGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [items, setItems] = useState(Array(24).fill({ text: '', imageUrl: null }));
  const [boardSize, setBoardSize] = useState(5);
  const [board, setBoard] = useState([]);
  const [marked, setMarked] = useState(new Set());
  const [hasWon, setHasWon] = useState(false);
  const [useFreeSpace, setUseFreeSpace] = useState(true);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);
  const [gameTitle, setGameTitle] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [pendingWinClaim, setPendingWinClaim] = useState(null);
  const [winConfirmed, setWinConfirmed] = useState(false);
  const [winRejected, setWinRejected] = useState(false);
  const [selectedIncorrectItems, setSelectedIncorrectItems] = useState(new Set());
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);
  const confettiIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Authentication and user management - check on mount
  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
      // Get user profile with username
      const profile = await authService.getUserProfile(user.id);
      const username = profile?.username || user.email?.split('@')[0] || 'User';
      
      // Set current user state
      setCurrentUser({
        id: user.id,
        email: user.email,
        username,
      });
      
      // Load user games
      await loadUserGames(user.id);
          
          // Redirect to dashboard if on home screen
          if (screen === 'home') {
            setScreen('dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };
    checkAuth();
    
    // Listen for auth state changes (e.g., token refresh, logout from another tab)
    const { data: { subscription } } = authService.onAuthStateChange(async (user, event) => {
      if (event === 'SIGNED_OUT' || !user) {
        setCurrentUser(null);
        setUserGames([]);
        setSelectedGame(null);
        if (screen === 'dashboard' || screen === 'host' || screen === 'play') {
          setScreen('home');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await authService.getUserProfile(user.id);
        const username = profile?.username || user.email?.split('@')[0] || 'User';
        setCurrentUser({
          id: user.id,
          email: user.email,
          username,
        });
        // Load user games
        await loadUserGames(user.id);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Only run on mount

  const loadUserGames = async (userId) => {
    if (!userId || !currentUser) {
      setUserGames([]);
      return;
    }
    
    try {
      // Get games from Supabase
      const games = await gameService.getUserGames(userId);
      
      // Check for pending wins (only for host games)
      const hostGameCodes = games.filter(g => g.isHost).map(g => g.gameCode);
      const pendingWinsMap = hostGameCodes.length > 0 
        ? await winClaimsService.checkPendingWinsForGames(hostGameCodes)
        : {};
      
      // Load board state for each game
      const gamesWithState = await Promise.all(
        games.map(async (game) => {
          const boardState = await boardService.loadBoardState(game.gameCode, userId);
          return {
            ...game,
            boardState: boardState ? {
              board: boardState.board,
              marked: boardState.marked,
              hasWon: boardState.hasWon,
            } : null,
            pendingWin: pendingWinsMap[game.gameCode] || false,
          };
        })
      );
      
      setUserGames(gamesWithState);
    } catch (error) {
      console.error('Error loading user games:', error);
      setUserGames([]);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Storage helpers (move before useEffect that uses them)
  const setStorage = async (key, value) => {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    
    try {
      // Always use localStorage as primary storage
      localStorage.setItem(key, valueToStore);
      
      // Also try window.storage if available (Cursor-specific, for cross-tab sync)
      if (window.storage && typeof window.storage.set === 'function') {
        try {
          await window.storage.set(key, valueToStore, true);
        } catch (storageError) {
          console.warn('window.storage.set error:', storageError);
          // Continue even if window.storage fails, localStorage is primary
        }
      }
    } catch (error) {
      console.error('Storage set error:', error);
      // If localStorage fails, try one more time
      try {
        localStorage.setItem(key, valueToStore);
      } catch (e) {
        console.error('localStorage set error:', e);
        throw new Error('Failed to save to storage. Your browser may have storage disabled.');
      }
    }
  };

  const getStorage = async (key) => {
    try {
      // Always try localStorage first as it's the standard approach
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        return localValue;
      }
      
      // Fallback to window.storage if available (Cursor-specific)
      if (window.storage && typeof window.storage.get === 'function') {
        try {
          const result = await window.storage.get(key, true);
          if (result?.value) {
            return result.value;
          }
        } catch (storageError) {
          console.warn('window.storage.get error:', storageError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Storage get error:', error);
      // Final fallback to localStorage
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('localStorage.getItem error:', e);
        return null;
      }
    }
  };

  // Authentication functions (Supabase)
  const registerUser = async (username, email, password) => {
    try {
      // Create user in Supabase auth
      const user = await authService.signUp(username, email, password);
      
      // Check if email confirmation is required (no session means confirmation needed)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Email confirmation is required
        // Supabase automatically sends confirmation email
        // Store the email for the confirmation screen
        setCurrentUser({
          id: user.id,
          email: user.email,
          username: username,
        });
        setScreen('email-confirmation');
        return true;
      }
      
      // User is already confirmed (email confirmation disabled or auto-confirmed)
      // Get user profile with username
      let profile = null;
      try {
        profile = await authService.getUserProfile(user.id);
      } catch (profileError) {
        console.warn('Could not read profile immediately after signup:', profileError.message);
        console.warn('This is normal if RLS is blocking reads');
        console.warn('User account was created successfully - profile will be accessible');
      }
      
      // Set current user state
      const userUsername = profile?.username || username;
      setCurrentUser({
        id: user.id,
        email: user.email,
        username: userUsername,
      });
      
      // Load user games
      try {
        await loadUserGames(user.id);
      } catch (gamesError) {
        console.warn('Could not load games immediately after signup:', gamesError.message);
      }
      
      setScreen('dashboard');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Provide user-friendly error messages
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        throw new Error('Email already registered. Please use a different email or login.');
      } else if (error.message?.includes('username') && error.message?.includes('unique')) {
        throw new Error('Username already taken. Please choose a different username.');
      } else if (error.message?.includes('password') && error.message?.includes('length')) {
        throw new Error('Password must be at least 6 characters.');
      } else if (error.message?.includes('Invalid email') || (error.message?.includes('email') && error.message?.includes('format'))) {
        throw new Error('Invalid email address format.');
      } else if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        // Don't change RLS errors - they have specific instructions
        throw error;
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error('Registration timed out. Your account may have been created. Please try logging in.');
      }
      // Pass through the original error message for more specific errors
      throw error;
    }
  };

  const loginUser = async (email, password) => {
    try {
      // Sign in with Supabase
      const user = await authService.signIn(email, password);
      
      // Get user profile with username
      const profile = await authService.getUserProfile(user.id);
      
      // Set current user state
      const userUsername = profile?.username || email.split('@')[0];
      setCurrentUser({
        id: user.id,
        email: user.email,
        username: userUsername,
      });
      
      // Load user games
      await loadUserGames(user.id);
      setScreen('dashboard');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Provide user-friendly error messages
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please check your email to confirm your account.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  };

  const logoutUser = async () => {
    try {
      // Sign out from Supabase
      await authService.signOut();
      
      // Clear local state
      setCurrentUser(null);
      setUserGames([]);
      setSelectedGame(null);
      resetToHome();
      setScreen('home');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setCurrentUser(null);
      setUserGames([]);
      setSelectedGame(null);
      resetToHome();
      setScreen('home');
    }
  };

  const endGame = async (gameCodeToEnd) => {
    if (!currentUser) return;

    try {
      // End game in Supabase (host only)
      const updatedGame = await gameService.endGame(gameCodeToEnd, currentUser.id);
      
      console.log('Game ended successfully:', updatedGame);
      
      // Reload games list to refresh the UI
      await loadUserGames(currentUser.id);
      
      // If we're currently viewing this game, go back to dashboard
      if (gameCode === gameCodeToEnd && (screen === 'host' || screen === 'play')) {
        setSelectedGame(null);
        setGameCode('');
        setBoard([]);
        setMarked(new Set());
        setGameConfig(null);
        setScreen('dashboard');
      }
    } catch (error) {
      console.error('Error ending game:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      alert(error.message || 'Error ending game. Please try again.');
    }
  };

  // addGameToUser is no longer needed - handled by gameService.joinGame

  const saveBoardState = async (gameCodeToSave) => {
    if (!currentUser) return;
    const codeToSave = gameCodeToSave || gameCode;
    if (!codeToSave || !board || board.length === 0) return;

    try {
      await boardService.saveBoardState(codeToSave, currentUser.id, {
        board,
        marked,
        hasWon,
        pendingWinClaim,
        winConfirmed,
        winRejected,
      });
    } catch (error) {
      console.error('Error saving board state:', error);
    }
  };

  // Auto-save board state when marked changes or win state changes
  useEffect(() => {
    if (currentUser && gameCode && board.length > 0 && (screen === 'play' || screen === 'host')) {
      const timeoutId = setTimeout(() => {
        saveBoardState(gameCode);
      }, 500); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [marked, hasWon, pendingWinClaim, winConfirmed, winRejected, currentUser, gameCode, screen]);

  const loadBoardState = async (gameCodeToLoad) => {
    if (!currentUser) return false;

    try {
      // Get game from Supabase
      const game = await gameService.getGame(gameCodeToLoad);
      if (!game) return false;

      const config = game.config;
      setGameConfig(config);
      setGameCode(gameCodeToLoad);
      setBoardSize(config.boardSize || 5);
      setUseFreeSpace(config.useFreeSpace !== undefined ? config.useFreeSpace : true);
      
      // Check if user is host
      setIsHost(game.host_id === currentUser.id);
      
      // Get board state from Supabase
      const boardState = await boardService.loadBoardState(gameCodeToLoad, currentUser.id);
      if (boardState && boardState.board && boardState.board.length > 0) {
        setBoard(boardState.board);
        setMarked(boardState.marked);
        setHasWon(boardState.hasWon || false);
        
        // Get win claim status
        const claimStatus = await winClaimsService.getUserClaimStatus(gameCodeToLoad, currentUser.id);
        if (claimStatus) {
          setPendingWinClaim(claimStatus.status === 'pending' ? {
            type: claimStatus.type,
            indices: claimStatus.indices,
            items: claimStatus.items,
            claimId: claimStatus.id,
            timestamp: claimStatus.timestamp,
          } : null);
          setWinConfirmed(claimStatus.status === 'confirmed');
          setWinRejected(claimStatus.status === 'rejected');
        } else {
          setPendingWinClaim(null);
          setWinConfirmed(false);
          setWinRejected(false);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading board state:', error);
      return false;
    }
  };

  const selectGame = async (game) => {
    // Save current game state if switching games
    if (gameCode && gameCode !== game.gameCode && currentUser && board.length > 0) {
      await saveBoardState(gameCode);
    }
    
    setSelectedGame(game);
    const loaded = await loadBoardState(game.gameCode);
    if (!loaded) {
      // If no saved state, set up game config
      setIsHost(game.isHost);
      setGameConfig(game.config);
      setGameCode(game.gameCode);
      setGameTitle(game.config?.title || '');
      setBoardSize(game.config.boardSize || 5);
      setUseFreeSpace(game.config.useFreeSpace !== undefined ? game.config.useFreeSpace : true);
      if (!game.isHost) {
        // Player: generate board immediately
        await generateBoardFromConfig(game.config, game.gameCode);
      } else {
        // Host: show "Game Created!" screen (host screen) - they can click "Start Playing" to generate board
        setBoard([]);
        setMarked(new Set());
        setScreen('host');
      }
    } else {
      // Board state was loaded - show play screen (host or player)
      setScreen('play');
    }
  };

  const addItem = () => {
    setItems([...items, { text: '', imageUrl: null }]);
  };

  const removeItem = async (index) => {
    // If item has an image, delete it from storage
    const item = items[index];
    if (item && typeof item === 'object' && item.imageUrl) {
      try {
        await storageService.deleteImage(item.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
        // Continue with removal even if delete fails
      }
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    if (typeof currentItem === 'string') {
      newItems[index] = { text: value, imageUrl: null };
    } else {
      newItems[index] = { ...currentItem, text: value };
    }
    setItems(newItems);
  };

  const updateItemImage = async (index, file) => {
    if (!file || !currentUser) {
      alert('Please log in to upload images.');
      return;
    }

    try {
      // Delete old image if exists
      const currentItem = items[index];
      if (currentItem && typeof currentItem === 'object' && currentItem.imageUrl) {
        try {
          await storageService.deleteImage(currentItem.imageUrl);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // Use gameCode if available, otherwise use temp identifier
      const storageCode = gameCode || `temp-${Date.now()}`;
      
      // Upload new image
      const imageUrl = await storageService.uploadImage(file, storageCode, currentUser.id);
      
      const newItems = [...items];
      const itemToUpdate = typeof newItems[index] === 'string' 
        ? { text: '', imageUrl: null }
        : { ...newItems[index] };
      newItems[index] = { ...itemToUpdate, imageUrl, text: itemToUpdate.text || '' };
      setItems(newItems);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Error uploading image. Please try again.');
    }
  };

  const removeItemImage = async (index) => {
    const currentItem = items[index];
    if (currentItem && typeof currentItem === 'object' && currentItem.imageUrl) {
      try {
        await storageService.deleteImage(currentItem.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    const newItems = [...items];
    const itemToUpdate = typeof newItems[index] === 'string' 
      ? { text: newItems[index], imageUrl: null }
      : { ...newItems[index], imageUrl: null };
    newItems[index] = itemToUpdate;
    setItems(newItems);
  };

  const updateBoardSize = (size) => {
    setBoardSize(size);
    const neededItems = useFreeSpace ? size * size - 1 : size * size;
    // Adjust items array to match needed items
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill({ text: '', imageUrl: null })]);
    }
  };

  const updateFreeSpace = (hasFreeSpace) => {
    setUseFreeSpace(hasFreeSpace);
    const neededItems = hasFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize;
    // Adjust items array to match needed items
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill({ text: '', imageUrl: null })]);
    }
  };

  const createGame = async () => {
    // Filter items that have either text or image
    const validItems = items.filter(item => {
      if (typeof item === 'string') {
        // Legacy format: just text string
        return item.trim() !== '';
      }
      // New format: object with text and/or imageUrl
      return (item.text && item.text.trim() !== '') || item.imageUrl;
    });
    
    const totalCells = boardSize * boardSize;
    const neededItems = useFreeSpace ? totalCells - 1 : totalCells;

    if (validItems.length < neededItems) {
      alert(`You need at least ${neededItems} items for a ${boardSize}x${boardSize} board${useFreeSpace ? ' (with free space)' : ''}`);
      return;
    }

    const code = generateCode();
    
    // Normalize items format (convert strings to objects for backward compatibility)
    const normalizedItems = validItems.map(item => {
      if (typeof item === 'string') {
        return { text: item, imageUrl: null };
      }
      return item;
    });
    
    const config = {
      items: normalizedItems,
      boardSize,
      useFreeSpace,
      title: gameTitle.trim() || null
    };

    if (!currentUser) {
      alert('Please log in to create a game.');
      return;
    }

    setGameCode(code);
    setGameConfig(config);
    setIsHost(true);
    
    // Store in Supabase
    try {
      await gameService.createGame(code, currentUser.id, config);
      console.log(`Game ${code} created and stored successfully`);
      
      // Reload user games to show the new game
      await loadUserGames(currentUser.id);
    } catch (error) {
      console.error('Storage error:', error);
      alert(`Could not save game: ${error.message || 'Please try again.'}`);
      return;
    }

    setScreen('host');
  };

  const joinGame = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 5) {
      alert('Please enter a 5-character game code');
      return;
    }

    if (!currentUser) {
      alert('Please log in to join a game.');
      return;
    }

    try {
      // Get game from Supabase
      const game = await gameService.joinGame(code, currentUser.id);
      
      if (!game || !game.config) {
        alert('Game not found or invalid. Please check the code and try again.');
        return;
      }

      const config = game.config;
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
      
      // Try to load saved board state first
      const boardState = await boardService.loadBoardState(code, currentUser.id);
      if (boardState && boardState.board && boardState.board.length > 0) {
        // Restore board state
        setBoard(boardState.board);
        setMarked(boardState.marked);
        setHasWon(boardState.hasWon || false);
        setScreen('play');
        
        // Reload user games to update the list
        await loadUserGames(currentUser.id);
      } else {
        // Generate new board
        await generateBoardFromConfig(config, code);
        
        // Reload user games to update the list
        await loadUserGames(currentUser.id);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      if (error.message?.includes('not found')) {
        alert(`Game "${code}" not found. Please check the code and try again.`);
      } else if (error.message?.includes('already joined')) {
        // User already joined, just load the game
        await joinGame(); // Retry to load existing state
      } else {
        alert(`Error joining game: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const generateBoardFromConfig = async (config, gameCodeToUse = null) => {
    const { items: validItems, boardSize: size, useFreeSpace: freeSpace } = config;
    const totalCells = size * size;
    const neededItems = freeSpace ? totalCells - 1 : totalCells;

    // Normalize items format (handle both string and object formats)
    const normalizedItems = validItems.map(item => {
      if (typeof item === 'string') {
        return { text: item, imageUrl: null };
      }
      return item;
    });

    // Better shuffle algorithm (Fisher-Yates)
    const shuffled = [...normalizedItems];
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
        newBoard.push({ text: 'FREE', isFree: true, imageUrl: null });
      } else {
        const item = selected[positions[itemIndex]];
        newBoard.push({ 
          text: item.text || '', 
          imageUrl: item.imageUrl || null,
          isFree: false 
        });
        itemIndex++;
      }
    }

    setBoard(newBoard);
    setMarked(freeSpace ? new Set([centerIndex]) : new Set());
    setHasWon(false);
    setPendingWinClaim(null);
    setWinConfirmed(false);
    setWinRejected(false);
    setScreen('play');
    
    // Save generated board to Supabase
    const codeToSave = gameCodeToUse || gameCode;
    if (currentUser && codeToSave) {
      try {
        await boardService.saveGeneratedBoard(codeToSave, currentUser.id, config, newBoard, freeSpace ? new Set([centerIndex]) : new Set());
      } catch (error) {
        console.error('Error saving generated board:', error);
      }
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmWin = async () => {
    if (!pendingWinClaim?.claimId || !gameCode) return;
    
    try {
      await winClaimsService.confirmClaim(pendingWinClaim.claimId);
      setPendingWinClaim(null);
      setSelectedIncorrectItems(new Set()); // Reset selection
      
      // Show dialog to choose whether to end game or continue
      setShowEndGameDialog(true);
    } catch (error) {
      console.error('Error confirming win:', error);
      alert('Error confirming win. Please try again.');
    }
  };

  const handleEndGameAfterWin = async () => {
    if (!gameCode) return;
    
    try {
      await gameService.markGameAsEnded(gameCode);
      setShowEndGameDialog(false);
      
      // Update dashboard
      if (currentUser) {
        await loadUserGames(currentUser.id);
      }
      
      // If we're currently viewing this game, go back to dashboard
      if (screen === 'host' || screen === 'play') {
        setSelectedGame(null);
        setGameCode('');
        setBoard([]);
        setMarked(new Set());
        setGameConfig(null);
        setScreen('dashboard');
      }
    } catch (error) {
      console.error('Error ending game after win:', error);
      alert('Error ending game. Please try again.');
    }
  };

  const handleContinueAfterWin = () => {
    setShowEndGameDialog(false);
    // Game continues - players can keep playing
  };

  const rejectWin = async () => {
    if (!pendingWinClaim?.claimId) return;
    
    try {
      // Convert selected incorrect items Set to Array
      const incorrectIndices = Array.from(selectedIncorrectItems);
      
      // Map item indices to board indices
      const incorrectBoardIndices = incorrectIndices.map(itemIdx => {
        // pendingWinClaim.indices contains the board indices for each item in the win claim
        return pendingWinClaim.indices[itemIdx];
      });

      await winClaimsService.rejectClaim(pendingWinClaim.claimId, incorrectBoardIndices);
      setPendingWinClaim(null);
      setSelectedIncorrectItems(new Set()); // Reset selection
      
      // Update dashboard
      if (currentUser) {
        await loadUserGames(currentUser.id);
      }
    } catch (error) {
      console.error('Error rejecting win:', error);
      alert('Error rejecting win. Please try again.');
    }
  };

  const toggleIncorrectItem = (itemIndex) => {
    const newSelected = new Set(selectedIncorrectItems);
    if (newSelected.has(itemIndex)) {
      newSelected.delete(itemIndex);
    } else {
      newSelected.add(itemIndex);
    }
    setSelectedIncorrectItems(newSelected);
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
    
    // Save board state after marking if logged in
    if (currentUser && gameCode) {
      saveBoardState(gameCode);
    }
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
        // Player won - submit claim for host verification
        const submitWinClaim = async () => {
          if (!currentUser) return;
          
          try {
            const claimData = await winClaimsService.submitClaim(gameCode, currentUser.id, {
              type: winResult.type,
              items: winResult.items,
              indices: winResult.indices,
            });
            
            setPendingWinClaim({
              type: winResult.type,
              items: winResult.items,
              indices: winResult.indices,
              claimId: claimData.id,
              timestamp: new Date(claimData.created_at).getTime(),
            });
          } catch (error) {
            console.error('Error submitting win claim:', error);
            alert('Error submitting win claim. Please try again.');
          }
        };
        submitWinClaim();
      } else if (winResult && isHost) {
        // Host won - auto-confirm for host (no verification needed)
        setHasWon(true);
        setWinConfirmed(true);
      }
    }
  }, [marked, screen, hasWon, pendingWinClaim, winConfirmed, winRejected, board, boardSize, isHost, gameCode]);

  // Poll for win claims and update dashboard if on dashboard
  useEffect(() => {
    if (currentUser && screen === 'dashboard') {
      // Poll user games for pending wins
      const pollPendingWins = async () => {
        if (currentUser) {
          try {
            const games = await gameService.getUserGames(currentUser.id);
            const hostGameCodes = games.filter(g => g.isHost).map(g => g.gameCode);
            const pendingWinsMap = hostGameCodes.length > 0 
              ? await winClaimsService.checkPendingWinsForGames(hostGameCodes)
              : {};
            
            // Reload games to update pending win status
            await loadUserGames(currentUser.id);
          } catch (error) {
            console.error('Error polling pending wins:', error);
          }
        }
      };
      
      pollPendingWins();
      const interval = setInterval(pollPendingWins, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser, screen]);

  // Poll for win claims (host) or confirmation status (player)
  useEffect(() => {
    if (gameCode && isHost && (screen === 'host' || screen === 'play') && currentUser) {
      // Host polls for win claims (even when playing)
      const checkWinClaims = async () => {
        try {
          const claims = await winClaimsService.getPendingClaims(gameCode);
          if (claims && claims.length > 0) {
            const latestClaim = claims[0]; // Get most recent claim
            if (!pendingWinClaim || pendingWinClaim.claimId !== latestClaim.id) {
              setPendingWinClaim({
                type: latestClaim.type,
                items: latestClaim.items,
                indices: latestClaim.indices,
                claimId: latestClaim.id,
                userId: latestClaim.userId,
                username: latestClaim.username,
                timestamp: latestClaim.timestamp,
              });
              setSelectedIncorrectItems(new Set()); // Reset selection for new claim
            }
          } else if (pendingWinClaim) {
            // No pending claims, clear if we had one
            setPendingWinClaim(null);
          }
        } catch (error) {
          console.error('Error checking win claims:', error);
        }
      };

      checkWinClaims();
      pollIntervalRef.current = setInterval(checkWinClaims, 2000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    } else if (gameCode && screen === 'play' && !isHost && pendingWinClaim && currentUser) {
      // Player polls for confirmation/rejection
      const checkConfirmation = async () => {
        try {
          const claimStatus = await winClaimsService.getUserClaimStatus(gameCode, currentUser.id);
          if (claimStatus) {
            if (claimStatus.status === 'confirmed' && !winConfirmed) {
              setWinConfirmed(true);
              setHasWon(true);
              setPendingWinClaim(null);
            } else if (claimStatus.status === 'rejected' && !winRejected) {
              // Unselect incorrect items from player's board
              if (claimStatus.incorrectIndices && Array.isArray(claimStatus.incorrectIndices) && claimStatus.incorrectIndices.length > 0) {
                setMarked(prevMarked => {
                  const newMarked = new Set(prevMarked);
                  claimStatus.incorrectIndices.forEach(boardIndex => {
                    newMarked.delete(boardIndex);
                  });
                  return newMarked;
                });
              }
              
              setWinRejected(true);
              setPendingWinClaim(null);
              setHasWon(false);
              
              // Clear notification and reset after rejection - allow player to try again
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
    // Save current board state if logged in and in a game
    if (currentUser && gameCode && board.length > 0) {
      saveBoardState(gameCode);
    }
    
    // Navigate to dashboard if logged in, otherwise home
    if (currentUser) {
      setScreen('dashboard');
      loadUserGames(currentUser.id);
    } else {
      setScreen('home');
    }
    
    setItems(Array(24).fill({ text: '', imageUrl: null }));
    setBoardSize(5);
    setBoard([]);
    setMarked(new Set());
    setHasWon(false);
    setUseFreeSpace(true);
    setGameCode('');
    setJoinCode('');
    setGameConfig(null);
    setGameTitle('');
    setIsHost(false);
    setPendingWinClaim(null);
    setWinConfirmed(false);
    setWinRejected(false);
    setSelectedIncorrectItems(new Set());
    setSelectedGame(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Get version info
  const getVersion = () => {
    // @ts-ignore - injected by Vite
    const vercelEnv = typeof __VERCEL_ENV__ !== 'undefined' ? __VERCEL_ENV__ : (import.meta.env.MODE === 'development' ? 'development' : 'production')
    // @ts-ignore - injected by Vite
    const commitHash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'
    // @ts-ignore - injected by Vite
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : import.meta.env.VITE_APP_VERSION || '0.0.0'
    
    if (import.meta.env.MODE === 'development') {
      // In local development, show first 5 chars of commit hash
      return commitHash.substring(0, 5)
    } else if (vercelEnv === 'preview') {
      // In preview deployments, show CalVer + first 5 chars of commit hash
      return `${appVersion}+${commitHash.substring(0, 5)}`
    } else {
      // In production, show CalVer version only
      return appVersion
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-4 sm:p-8 relative">
      {/* User Profile Banner - top right */}
      {currentUser && (
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            onClick={() => setScreen('dashboard')}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white sm:w-5 sm:h-5" />
            </div>
            <span className="text-sm sm:text-base font-semibold text-gray-800 max-w-[100px] sm:max-w-[150px] truncate">
              {currentUser.username}
            </span>
          </button>
        </div>
      )}
      {/* Version display - bottom left */}
      <div className="fixed bottom-2 left-2 text-white text-xs opacity-60 font-mono z-10">
        v{getVersion()}
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2">🎲 Mingo</h1>
          <p className="text-white text-base sm:text-lg opacity-90">Create & Play Custom Bingo</p>
        </div>

        {screen === 'login' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Login</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const email = formData.get('email');
                const password = formData.get('password');
                try {
                  await loginUser(email, password);
                } catch (error) {
                  alert(error.message || 'Login failed. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
              >
                <LogIn size={20} /> Login
              </button>
            </form>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Don't have an account?</p>
              <button
                onClick={() => setScreen('register')}
                className="text-purple-600 font-semibold hover:text-purple-700 text-sm sm:text-base mt-2"
              >
                Register here
              </button>
            </div>
            <button
              onClick={() => setScreen('home')}
              className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
            >
              Back
            </button>
          </div>
        )}

        {screen === 'register' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Create Account</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const username = formData.get('username');
                const email = formData.get('email');
                const password = formData.get('password');
                const confirmPassword = formData.get('confirmPassword');
                
                if (password !== confirmPassword) {
                  alert('Passwords do not match');
                  return;
                }
                
                if (password.length < 6) {
                  alert('Password must be at least 6 characters');
                  return;
                }
                
                if (username.length < 3) {
                  alert('Username must be at least 3 characters');
                  return;
                }
                
                try {
                  await registerUser(username, email, password);
                } catch (error) {
                  alert(error.message || 'Registration failed. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <input
                name="username"
                type="text"
                placeholder="Username (min 3 characters)"
                required
                minLength={3}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <input
                name="password"
                type="password"
                placeholder="Password (min 6 characters)"
                required
                minLength={6}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                required
                minLength={6}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
              >
                <UserPlus size={20} /> Create Account
              </button>
            </form>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Already have an account?</p>
              <button
                onClick={() => setScreen('login')}
                className="text-purple-600 font-semibold hover:text-purple-700 text-sm sm:text-base mt-2"
              >
                Login here
              </button>
            </div>
            <button
              onClick={() => setScreen('home')}
              className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
            >
              Back
            </button>
          </div>
        )}

        {screen === 'dashboard' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome, {currentUser?.username}!</h2>
                <p className="text-sm text-gray-600">Your Games</p>
              </div>
              <button
                onClick={logoutUser}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>

            {userGames.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't joined any games yet.</p>
                <button
                  onClick={() => {
                    setScreen('setup');
                  }}
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
                      onClick={() => selectGame(game)}
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
                              endGame(game.gameCode);
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
                onClick={() => {
                  setSelectedGame(null);
                  setScreen('setup');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
              >
                <Play size={20} /> Create New Game
              </button>
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setJoinCode('');
                  setScreen('home');
                }}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition"
              >
                Join Game with Code
              </button>
            </div>
          </div>
        )}

        {screen === 'email-confirmation' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Check Your Email</h2>
              <p className="text-gray-600 text-sm sm:text-base">
                We've sent a confirmation email to
              </p>
              <p className="text-purple-600 font-semibold text-base sm:text-lg mt-1">
                {currentUser?.email || 'your email address'}
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Next steps:</strong>
              </p>
              <ol className="text-sm text-gray-600 text-left space-y-1 list-decimal list-inside">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the confirmation link in the email</li>
                <li>Return here and log in with your account</li>
              </ol>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setScreen('login')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
              >
                <LogIn size={20} /> Go to Login
              </button>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setScreen('home');
                }}
                className="w-full px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {screen === 'home' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 space-y-4">
            {currentUser ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-gray-600 mb-2">Logged in as: <span className="font-bold text-purple-600">{currentUser.username}</span></p>
                  <button
                    onClick={() => setScreen('dashboard')}
                    className="text-purple-600 font-semibold hover:text-purple-700 text-sm"
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
                  onClick={() => setScreen('login')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
                >
                  <LogIn size={20} /> Login
                </button>
                <button
                  onClick={() => setScreen('register')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
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
                Game Title (Optional)
              </label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="Enter a title for your game"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm sm:text-base"
              />
            </div>

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
                  Bingo Items ({items.filter(i => {
                    if (typeof i === 'string') return i.trim() !== '';
                    return (i.text && i.text.trim() !== '') || i.imageUrl;
                  }).length} of {useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize} filled)
                </label>
                <button
                  onClick={addItem}
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
                          onChange={(e) => updateItem(index, e.target.value)}
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
                                updateItemImage(index, file);
                              }
                            }}
                            disabled={!currentUser}
                          />
                          📷 Image
                        </label>
                        {index >= (useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize) && (
                          <button
                            onClick={() => removeItem(index)}
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
                            onClick={() => removeItemImage(index)}
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
                onClick={() => {
                  if (currentUser) {
                    setScreen('dashboard');
                  } else {
                    setScreen('home');
                  }
                }}
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

        {screen === 'host' && gameCode && (
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
                                onChange={() => toggleIncorrectItem(idx)}
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
                      onClick={rejectWin}
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
                      onClick={confirmWin}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition shadow-lg"
                    >
                      <Check size={20} /> Confirm Win
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEndGameDialog && isHost && (
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
                    onClick={handleContinueAfterWin}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition shadow-lg"
                  >
                    <Play size={20} /> Continue Playing
                  </button>
                  <button
                    onClick={handleEndGameAfterWin}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition shadow-lg"
                  >
                    <X size={20} /> End Game
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Game Created!</h2>
                {gameConfig?.title && (
                  <h3 className="text-lg sm:text-xl font-semibold text-purple-600 mb-2">{gameConfig.title}</h3>
                )}
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
                  onClick={async () => {
                    // Generate board for host and switch to play screen
                    if (gameConfig && gameCode) {
                      await generateBoardFromConfig(gameConfig, gameCode);
                    } else if (gameConfig) {
                      await generateBoardFromConfig(gameConfig);
                    } else {
                      alert('Game configuration not found. Please try selecting the game again.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
                >
                  <Play size={20} className="sm:w-6 sm:h-6" /> Start Playing
                </button>
                <button
                  onClick={resetToHome}
                  className="w-full px-6 py-2 sm:py-3 bg-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-400 transition text-sm sm:text-base"
                >
                  {currentUser ? 'Back to Dashboard' : 'Back to Home'}
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
                                onChange={() => toggleIncorrectItem(idx)}
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
                      onClick={rejectWin}
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
              <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
                <div className="text-center mb-2">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Game Code</p>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-purple-600">{gameCode}</p>
                </div>
                {currentUser && (
                  <button
                    onClick={resetToHome}
                    className="w-full mt-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    <Home size={16} /> Back to Dashboard
                  </button>
                )}
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
                <p className="text-sm mt-1 opacity-90">Incorrect items have been unselected. Please continue playing.</p>
              </div>
            )}

            {hasWon && winConfirmed && (
              <div className="bg-yellow-400 text-gray-900 p-4 sm:p-6 rounded-2xl text-center shadow-2xl animate-pulse">
                <Trophy size={40} className="sm:w-12 sm:h-12 mx-auto mb-2" />
                <h2 className="text-2xl sm:text-3xl font-bold">BINGO! 🎉</h2>
                <p className="text-base sm:text-lg">You won! Win confirmed!</p>
              </div>
            )}

            {gameConfig?.title && (
              <div className="text-center mb-4">
                <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{gameConfig.title}</h2>
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
                    {cell.imageUrl ? (
                      <img
                        src={cell.imageUrl}
                        alt={cell.text || 'Bingo item'}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="break-words leading-tight">{cell.text}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={async () => {
                  if (gameConfig && gameCode) {
                    await generateBoardFromConfig(gameConfig, gameCode);
                  } else if (gameConfig) {
                    await generateBoardFromConfig(gameConfig);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition shadow-lg text-sm sm:text-base"
              >
                <Shuffle size={18} className="sm:w-5 sm:h-5" /> New Board
              </button>
              <button
                onClick={resetToHome}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition shadow-lg text-sm sm:text-base"
              >
                <RotateCcw size={18} className="sm:w-5 sm:h-5" /> {currentUser ? 'Back to Dashboard' : 'End Game'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}