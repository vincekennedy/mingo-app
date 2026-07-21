import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { authService, resolveDisplayName } from './services/auth';
import { gameService } from './services/game';
import { boardService } from './services/board';
import { winClaimsService } from './services/winClaims';
import { storageService } from './services/storage';
import { generateItemsFromTitle } from './services/generateItems';
import { supabase } from './lib/supabase';
import { subscribeGame, subscribeDashboard } from './lib/realtime';
import { detectWin, normalizeWinConfig } from './lib/winDetection';
import { useReportModal } from './hooks/useReportModal';
import { useToast } from './hooks/useToast';
import AuthLoadingOverlay from './components/chrome/AuthLoadingOverlay';
import GeneratingItemsOverlay from './components/chrome/GeneratingItemsOverlay';
import UserProfileBanner from './components/chrome/UserProfileBanner';
import VersionBadge from './components/chrome/VersionBadge';
import ReportButton from './components/chrome/ReportButton';
import ReportModal from './components/modals/ReportModal';
import GuestJoinModal from './components/modals/GuestJoinModal';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ForgotPasswordSentScreen from './screens/ForgotPasswordSentScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import RegisterScreen from './screens/RegisterScreen';
import EmailConfirmationScreen from './screens/EmailConfirmationScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import SetupScreen from './screens/SetupScreen';
import HostScreen from './screens/HostScreen';
import PlayScreen from './screens/PlayScreen';

export default function Mingo() {
  const [screen, setScreen] = useState('home'); // home, login, register, forgot-password, forgot-password-sent, reset-password, email-confirmation, dashboard, setup, host, play
  const [currentUser, setCurrentUser] = useState(null);
  const [userGames, setUserGames] = useState([]);
  const [items, setItems] = useState(Array(24).fill({ text: '', imageUrl: null }));
  const [boardSize, setBoardSize] = useState(5);
  const [board, setBoard] = useState([]);
  const [marked, setMarked] = useState(new Set());
  const [hasWon, setHasWon] = useState(false);
  const [useFreeSpace, setUseFreeSpace] = useState(true);
  const [winMode, setWinMode] = useState('standard');
  const [linesToWin, setLinesToWin] = useState(1);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);
  const [gameTitle, setGameTitle] = useState('');
  const [generatingItems, setGeneratingItems] = useState(false);
  const [generateStatusIndex, setGenerateStatusIndex] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showGuestNameModal, setShowGuestNameModal] = useState(false);
  const [guestDisplayName, setGuestDisplayName] = useState('');
  const [guestJoinError, setGuestJoinError] = useState(null);
  const [guestJoining, setGuestJoining] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [pendingWinClaim, setPendingWinClaim] = useState(null);
  const [winConfirmed, setWinConfirmed] = useState(false);
  const [winRejected, setWinRejected] = useState(false);
  const [selectedIncorrectItems, setSelectedIncorrectItems] = useState(new Set());
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [confirmedWinners, setConfirmedWinners] = useState([]);
  const confettiIntervalRef = useRef(null);
  const pendingWinClaimRef = useRef(null);
  const winConfirmedRef = useRef(false);
  const winRejectedRef = useRef(false);
  const passwordRecoveryRef = useRef(false);
  const gamesLoadIdRef = useRef(0);
  const authReadyRef = useRef(false);
  const [authReady, setAuthReady] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);

  const {
    showReportModal,
    reportCategory,
    setReportCategory,
    reportEmail,
    setReportEmail,
    reportSubject,
    setReportSubject,
    reportDetails,
    setReportDetails,
    reportSubmitting,
    reportError,
    reportSuccess,
    openReportModal,
    closeReportModal,
    handleSubmitReport,
  } = useReportModal({ currentUser, screen, gameCode });
  const { showToast, ToastHost } = useToast();

  const loadUserGames = async (userId, { showLoading = false } = {}) => {
    if (!userId) {
      setUserGames([]);
      if (showLoading) setGamesLoading(false);
      return;
    }

    const loadId = ++gamesLoadIdRef.current;
    if (showLoading) setGamesLoading(true);
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

      if (loadId !== gamesLoadIdRef.current) return;
      setUserGames(gamesWithState);
    } catch (error) {
      console.error('Error loading user games:', error);
      if (loadId !== gamesLoadIdRef.current) return;
      setUserGames([]);
    } finally {
      if (loadId === gamesLoadIdRef.current) {
        setGamesLoading(false);
      }
    }
  };

  // Authentication and user management - check on mount
  useEffect(() => {
    let cancelled = false;
    let hydratePromise = null;

    try {
      const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
      if (hash && new URLSearchParams(hash).get('type') === 'recovery') {
        passwordRecoveryRef.current = true;
      }
    } catch {
      /* ignore malformed hash */
    }

    const markAuthReady = () => {
      if (cancelled) return;
      authReadyRef.current = true;
      setAuthReady(true);
    };

    /** Full bootstrap: set user/dashboard and wait for games before revealing UI */
    const hydrateLoggedInSession = (user) => {
      if (authReadyRef.current || cancelled) return Promise.resolve();
      if (hydratePromise) return hydratePromise;

      hydratePromise = (async () => {
        try {
          const profile = await authService.getUserProfile(user.id);
          if (cancelled) return;
          const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
          setCurrentUser({
            id: user.id,
            email: user.email,
            username,
          });
          setScreen('dashboard');
          await loadUserGames(user.id, { showLoading: true });
        } finally {
          markAuthReady();
        }
      })();

      return hydratePromise;
    };

    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (cancelled) return;
        if (user && passwordRecoveryRef.current) {
          const profile = await authService.getUserProfile(user.id);
          if (cancelled) return;
          const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
          setCurrentUser({
            id: user.id,
            email: user.email,
            username,
          });
          setScreen('reset-password');
          markAuthReady();
          return;
        }
        if (user && !passwordRecoveryRef.current) {
          await hydrateLoggedInSession(user);
        } else {
          markAuthReady();
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        markAuthReady();
      }
    };
    
    // Listen for auth state changes (e.g., token refresh, logout from another tab)
    const { data: { subscription } } = authService.onAuthStateChange(async (user, event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' && user) {
        passwordRecoveryRef.current = true;
        const profile = await authService.getUserProfile(user.id);
        if (cancelled) return;
        const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
        setCurrentUser({
          id: user.id,
          email: user.email,
          username,
        });
        setScreen('reset-password');
        markAuthReady();
        return;
      }
      if (event === 'SIGNED_OUT' || !user) {
        passwordRecoveryRef.current = false;
        hydratePromise = null;
        setCurrentUser(null);
        setUserGames([]);
        setScreen((prev) =>
          prev === 'dashboard' || prev === 'host' || prev === 'play' ? 'home' : prev
        );
        markAuthReady();
        return;
      }

      // Cold start: keep overlay until games are loaded
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !authReadyRef.current) {
        if (passwordRecoveryRef.current) return;
        await hydrateLoggedInSession(user);
        return;
      }

      // After bootstrap: quiet updates only (no overlay flash)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (passwordRecoveryRef.current) return;
        const profile = await authService.getUserProfile(user.id);
        if (cancelled) return;
        const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
        setCurrentUser({
          id: user.id,
          email: user.email,
          username,
        });
        setScreen((prev) => (prev === 'home' || prev === 'login' || prev === 'register' ? 'dashboard' : prev));
        void loadUserGames(user.id, { showLoading: false });
      }
    });

    queueMicrotask(() => {
      checkAuth();
    });
    
    return () => {
      cancelled = true;
      hydratePromise = null;
      subscription.unsubscribe();
    };
  }, []); // Only run on mount

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Authentication functions (Supabase)
  const registerUser = async (username, email, password) => {
    setAuthError(null);
    setRegistering(true);
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
      const userUsername = resolveDisplayName(profile, username);
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
    } finally {
      setRegistering(false);
    }
  };

  const loginUser = async (email, password) => {
    setAuthError(null);
    setLoggingIn(true);
    try {
      // Sign in with Supabase
      const user = await authService.signIn(email, password);
      
      // Get user profile with username
      const profile = await authService.getUserProfile(user.id);
      
      // Set current user state
      const userUsername = resolveDisplayName(profile, email.split('@')[0]);
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
    } finally {
      setLoggingIn(false);
    }
  };

  const completePasswordReset = async (newPassword) => {
    await authService.updatePassword(newPassword);
    passwordRecoveryRef.current = false;
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Could not restore your session. Please log in again.');
    }
    const profile = await authService.getUserProfile(user.id);
    const userUsername = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
    setCurrentUser({
      id: user.id,
      email: user.email,
      username: userUsername,
    });
    await loadUserGames(user.id);
    setScreen('dashboard');
  };

  const cancelPasswordRecovery = async () => {
    passwordRecoveryRef.current = false;
    try {
      await authService.signOut();
    } catch (e) {
      console.error('Sign out after cancel recovery:', e);
    }
    setCurrentUser(null);
    setScreen('login');
  };

  const logoutUser = async () => {
    try {
      // Sign out from Supabase
      await authService.signOut();
      
      // Clear local state
      setCurrentUser(null);
      setUserGames([]);
      resetToHome();
      setScreen('home');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setCurrentUser(null);
      setUserGames([]);
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
      showToast(error.message || 'Error ending game. Please try again.');
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

  // Auto-save board state when marked changes or win state changes.
  // board.length / saveBoardState intentionally omitted from deps: length is gated in
  // the body; saveBoardState is recreated each render and would thrash the debounce.
  useEffect(() => {
    if (currentUser && gameCode && board.length > 0 && (screen === 'play' || screen === 'host')) {
      const timeoutId = setTimeout(() => {
        saveBoardState(gameCode);
      }, 500); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
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
      {
        const rules = normalizeWinConfig(config);
        setWinMode(rules.winMode);
        setLinesToWin(rules.linesToWin);
      }
      
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

  // Fetch players and winners for a game
  const fetchGamePlayers = async (gameCodeToFetch) => {
    if (!gameCodeToFetch) return;
    
    try {
      const [players, winners] = await Promise.all([
        gameService.getGameParticipants(gameCodeToFetch),
        winClaimsService.getConfirmedWinners(gameCodeToFetch),
      ]);
      
      setGamePlayers(players);
      setConfirmedWinners(winners);
    } catch (error) {
      console.error('Error fetching game players:', error);
    }
  };

  const selectGame = async (game) => {
    // Save current game state if switching games
    if (gameCode && gameCode !== game.gameCode && currentUser && board.length > 0) {
      await saveBoardState(gameCode);
    }
    
    const loaded = await loadBoardState(game.gameCode);
    if (!loaded) {
      // If no saved state, set up game config
      setIsHost(game.isHost);
      setGameConfig(game.config);
      setGameCode(game.gameCode);
      setGameTitle(game.config?.title || '');
      setBoardSize(game.config.boardSize || 5);
      setUseFreeSpace(game.config.useFreeSpace !== undefined ? game.config.useFreeSpace : true);
      {
        const rules = normalizeWinConfig(game.config);
        setWinMode(rules.winMode);
        setLinesToWin(rules.linesToWin);
      }
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
      showToast('Please log in to upload images.');
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
      showToast(error.message || 'Error uploading image. Please try again.');
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

  const updateWinMode = (mode) => {
    setWinMode(mode);
    if (mode !== 'standard') setLinesToWin(1);
  };

  const updateLinesToWin = (n) => {
    const value = Math.min(3, Math.max(1, Number(n) || 1));
    setLinesToWin(value);
  };

  const duplicateSetupFromGame = (game) => {
    const config = game?.config;
    if (!config?.items || !Array.isArray(config.items) || config.items.length === 0) {
      showToast('This game has no item list to reuse.');
      return;
    }
    const size = config.boardSize || 5;
    const free = config.useFreeSpace !== undefined ? config.useFreeSpace : true;
    const rules = normalizeWinConfig(config);
    const normalizedItems = config.items.map((item) =>
      typeof item === 'string' ? { text: item, imageUrl: null } : { text: item.text || '', imageUrl: item.imageUrl || null }
    );
    setGameTitle(config.title || '');
    setBoardSize(size);
    setUseFreeSpace(free);
    setWinMode(rules.winMode);
    setLinesToWin(rules.linesToWin);
    setItems(normalizedItems);
    setScreen('setup');
  };

  const neededItemCount = useFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize;

  const generateLoadingMessages = (() => {
    const theme = gameTitle.trim() || 'your theme';
    return [
      `Dreaming up squares for “${theme}”…`,
      'Shuffling witty bingo prompts…',
      'Keeping phrases short and punchy…',
      `Almost ready — packing ${neededItemCount} items…`,
    ];
  })();

  useEffect(() => {
    if (!generatingItems) return undefined;
    const id = setInterval(() => {
      setGenerateStatusIndex((i) => (i + 1) % 4);
    }, 1600);
    return () => clearInterval(id);
  }, [generatingItems]);

  const generateItemsFromGameTitle = async () => {
    const title = gameTitle.trim();
    if (!title) {
      showToast('Enter a game title first, then generate items.');
      return;
    }

    const filledCount = items.filter((item) => {
      if (typeof item === 'string') return item.trim() !== '';
      return (item.text && item.text.trim() !== '') || item.imageUrl;
    }).length;

    if (filledCount > 0) {
      const replace = window.confirm(
        'This will replace your current bingo item texts (images on slots will be cleared). Continue?'
      );
      if (!replace) return;
    }

    setGeneratingItems(true);
    setGenerateStatusIndex(0);
    try {
      const generated = await generateItemsFromTitle(title, neededItemCount);
      setItems(generated.map((text) => ({ text, imageUrl: null })));
    } catch (error) {
      console.error('Generate items error:', error);
      showToast(error.message || 'Could not generate items. Please try again.');
    } finally {
      setGeneratingItems(false);
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
      showToast(`You need at least ${neededItems} items for a ${boardSize}x${boardSize} board${useFreeSpace ? ' (with free space)' : ''}`);
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
      title: gameTitle.trim() || null,
      winMode,
      linesToWin: winMode === 'standard' ? linesToWin : 1,
    };

    if (!currentUser) {
      showToast('Please log in to create a game.');
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
      showToast(`Could not save game: ${error.message || 'Please try again.'}`);
      return;
    }

    setScreen('host');
  };

  const joinGameAsUser = async (user, code) => {
    try {
      // Get game from Supabase
      const game = await gameService.joinGame(code, user.id);
      
      if (!game || !game.config) {
        showToast('Game not found or invalid. Please check the code and try again.');
        return;
      }

      const config = game.config;
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        showToast('Invalid game configuration. Please check the code and try again.');
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
      {
        const rules = normalizeWinConfig(config);
        setWinMode(rules.winMode);
        setLinesToWin(rules.linesToWin);
      }
      setIsHost(false);
      
      // Try to load saved board state first
      const boardState = await boardService.loadBoardState(code, user.id);
      if (boardState && boardState.board && boardState.board.length > 0) {
        // Restore board state
        setBoard(boardState.board);
        setMarked(boardState.marked);
        setHasWon(boardState.hasWon || false);
        setScreen('play');
        
        // Reload user games to update the list
        await loadUserGames(user.id);
      } else {
        // Generate new board
        await generateBoardFromConfig(config, code, user);
        
        // Reload user games to update the list
        await loadUserGames(user.id);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      if (error.message?.includes('not found')) {
        showToast(`Game "${code}" not found. Please check the code and try again.`);
      } else if (error.message?.includes('already joined')) {
        // User already joined, just load the game
        await joinGameAsUser(user, code);
      } else {
        showToast(`Error joining game: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const closeGuestNameModal = () => {
    if (guestJoining) return;
    setShowGuestNameModal(false);
    setGuestDisplayName('');
    setGuestJoinError(null);
  };

  const joinGame = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 5) {
      showToast('Please enter a 5-character game code');
      return;
    }

    if (!currentUser) {
      setGuestJoinError(null);
      setGuestDisplayName('');
      setShowGuestNameModal(true);
      return;
    }

    await joinGameAsUser(currentUser, code);
  };

  const submitGuestJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.toUpperCase().trim();
    if (code.length !== 5) {
      setGuestJoinError('Please enter a 5-character game code.');
      return;
    }

    const desiredName = guestDisplayName.trim();
    if (!desiredName) {
      setGuestJoinError('Enter a display name to continue.');
      return;
    }

    setGuestJoining(true);
    setGuestJoinError(null);
    try {
      const guest = await authService.signInAsGuest(desiredName);
      const user = {
        id: guest.user.id,
        email: guest.user.email || null,
        username: guest.displayName || desiredName,
        isGuest: true,
      };
      setCurrentUser(user);
      setShowGuestNameModal(false);
      setGuestDisplayName('');
      await joinGameAsUser(user, code);
    } catch (guestError) {
      setGuestJoinError(
        guestError.message || 'Could not start guest session. Please log in or try again.'
      );
    } finally {
      setGuestJoining(false);
    }
  };

  const generateBoardFromConfig = async (config, gameCodeToUse = null, userForSave = null) => {
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
    const saveUser = userForSave || currentUser;
    if (saveUser && codeToSave) {
      try {
        await boardService.saveGeneratedBoard(codeToSave, saveUser.id, config, newBoard, freeSpace ? new Set([centerIndex]) : new Set());
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
      showToast('Error confirming win. Please try again.');
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
        setGameCode('');
        setBoard([]);
        setMarked(new Set());
        setGameConfig(null);
        setScreen('dashboard');
      }
    } catch (error) {
      console.error('Error ending game after win:', error);
      showToast('Error ending game. Please try again.');
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
      showToast('Error rejecting win. Please try again.');
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

  const checkWin = (markedCells = marked) => {
    const { winMode: mode, linesToWin: needed } = normalizeWinConfig(
      gameConfig || { winMode, linesToWin }
    );
    return detectWin({
      marked: markedCells,
      board,
      boardSize,
      winMode: mode,
      linesToWin: needed,
    });
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

    // Evaluate win from the updated marks (avoid setState-in-effect)
    if (
      screen === 'play' &&
      !hasWon &&
      !pendingWinClaim &&
      !winConfirmed &&
      !winRejected &&
      board.length > 0 &&
      boardSize > 0
    ) {
      const winResult = checkWin(newMarked);
      if (winResult && !isHost) {
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
            showToast('Error submitting win claim. Please try again.');
          }
        };
        submitWinClaim();
      } else if (winResult && isHost) {
        setHasWon(true);
        setWinConfirmed(true);
      }
    }
  };

  // Keep claim flags in refs so realtime handlers stay fresh without resubscribing
  useEffect(() => {
    pendingWinClaimRef.current = pendingWinClaim;
  }, [pendingWinClaim]);
  useEffect(() => {
    winConfirmedRef.current = winConfirmed;
  }, [winConfirmed]);
  useEffect(() => {
    winRejectedRef.current = winRejected;
  }, [winRejected]);

  // Realtime: player list, claims, and game ended while on host/play
  useEffect(() => {
    if (!gameCode || (screen !== 'play' && screen !== 'host') || !currentUser) {
      return;
    }

    const code = gameCode;

    const refreshHostClaims = async () => {
      try {
        const claims = await winClaimsService.getPendingClaims(code);
        if (claims && claims.length > 0) {
          const latestClaim = claims[0];
          const prev = pendingWinClaimRef.current;
          if (!prev || prev.claimId !== latestClaim.id) {
            setPendingWinClaim({
              type: latestClaim.type,
              items: latestClaim.items,
              indices: latestClaim.indices,
              claimId: latestClaim.id,
              userId: latestClaim.userId,
              username: latestClaim.username,
              timestamp: latestClaim.timestamp,
            });
            setSelectedIncorrectItems(new Set());
          }
        } else if (pendingWinClaimRef.current) {
          setPendingWinClaim(null);
        }
      } catch (error) {
        console.error('Error refreshing win claims:', error);
      }
    };

    const refreshPlayerClaim = async () => {
      try {
        const claimStatus = await winClaimsService.getUserClaimStatus(code, currentUser.id);
        if (!claimStatus) return;

        if (claimStatus.status === 'confirmed' && !winConfirmedRef.current) {
          setWinConfirmed(true);
          setHasWon(true);
          setPendingWinClaim(null);
        } else if (claimStatus.status === 'rejected' && !winRejectedRef.current) {
          if (claimStatus.incorrectIndices && Array.isArray(claimStatus.incorrectIndices) && claimStatus.incorrectIndices.length > 0) {
            setMarked((prevMarked) => {
              const newMarked = new Set(prevMarked);
              claimStatus.incorrectIndices.forEach((boardIndex) => {
                newMarked.delete(boardIndex);
              });
              return newMarked;
            });
          }

          setWinRejected(true);
          setPendingWinClaim(null);
          setHasWon(false);

          setTimeout(() => {
            setWinRejected(false);
          }, 4000);
        }
      } catch (error) {
        console.error('Error refreshing claim status:', error);
      }
    };

    const leaveEndedGame = () => {
      setGameCode('');
      setBoard([]);
      setMarked(new Set());
      setGameConfig(null);
      setPendingWinClaim(null);
      setGamePlayers([]);
      setConfirmedWinners([]);
      setIsHost(false);
      setScreen('dashboard');
      loadUserGames(currentUser.id, { showLoading: false }).catch((error) => {
        console.error('Error reloading games after end:', error);
      });
    };

    fetchGamePlayers(code);
    if (isHost) {
      refreshHostClaims();
    } else if (screen === 'play') {
      refreshPlayerClaim();
    }

    const unsubscribe = subscribeGame(code, {
      onParticipantsChange: () => {
        fetchGamePlayers(code);
      },
      onClaimsChange: () => {
        fetchGamePlayers(code);
        if (isHost) {
          refreshHostClaims();
        } else if (screen === 'play') {
          refreshPlayerClaim();
        }
      },
      onGameChange: (row) => {
        if (row?.status === 'ended') {
          leaveEndedGame();
        }
      },
    });

    return () => {
      unsubscribe();
      setGamePlayers([]);
      setConfirmedWinners([]);
    };
  }, [gameCode, screen, isHost, currentUser]);

  // Realtime: dashboard pending-win badges (RLS scopes win_claims events)
  useEffect(() => {
    if (!currentUser || screen !== 'dashboard' || !authReady) return;

    const unsubscribe = subscribeDashboard(currentUser.id, {
      onChange: () => {
        loadUserGames(currentUser.id, { showLoading: false }).catch((error) => {
          console.error('Error refreshing dashboard from realtime:', error);
        });
      },
    });

    return unsubscribe;
  }, [currentUser, screen, authReady]);

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
    setWinMode('standard');
    setLinesToWin(1);
    setGameCode('');
    setJoinCode('');
    setGameConfig(null);
    setGameTitle('');
    setIsHost(false);
    setPendingWinClaim(null);
    setWinConfirmed(false);
    setWinRejected(false);
    setSelectedIncorrectItems(new Set());
    setGamePlayers([]);
    setConfirmedWinners([]);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-4 sm:p-8 relative">
      {(registering || loggingIn || !authReady) && (
        <AuthLoadingOverlay authReady={authReady} registering={registering} />
      )}

      {generatingItems && (
        <GeneratingItemsOverlay
          generateStatusIndex={generateStatusIndex}
          generateLoadingMessages={generateLoadingMessages}
        />
      )}

      {currentUser && screen !== 'reset-password' && (
        <UserProfileBanner
          username={currentUser.username}
          onOpenDashboard={() => setScreen('dashboard')}
        />
      )}
      <VersionBadge />
      <ReportButton onClick={openReportModal} />
      <ToastHost />

      {showReportModal && (
        <ReportModal
          screen={screen}
          gameCode={gameCode}
          reportCategory={reportCategory}
          setReportCategory={setReportCategory}
          reportEmail={reportEmail}
          setReportEmail={setReportEmail}
          reportSubject={reportSubject}
          setReportSubject={setReportSubject}
          reportDetails={reportDetails}
          setReportDetails={setReportDetails}
          reportSubmitting={reportSubmitting}
          reportError={reportError}
          reportSuccess={reportSuccess}
          onSubmit={handleSubmitReport}
          onClose={closeReportModal}
        />
      )}

      {showGuestNameModal && (
        <GuestJoinModal
          guestDisplayName={guestDisplayName}
          setGuestDisplayName={setGuestDisplayName}
          guestJoinError={guestJoinError}
          guestJoining={guestJoining}
          onSubmit={submitGuestJoin}
          onClose={closeGuestNameModal}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2">🎲 Mingo</h1>
          <p className="text-white text-base sm:text-lg opacity-90">Create & Play Custom Bingo</p>
        </div>

        {screen === 'login' && (
          <LoginScreen
            loggingIn={loggingIn}
            authError={authError}
            onLogin={async (email, password) => {
              setAuthError(null);
              try {
                await loginUser(email, password);
              } catch (error) {
                setAuthError(error.message || 'Login failed. Please try again.');
              }
            }}
            onForgotPassword={() => {
              setAuthError(null);
              setScreen('forgot-password');
            }}
            onRegister={() => {
              setAuthError(null);
              setScreen('register');
            }}
            onBack={() => {
              setAuthError(null);
              setScreen('home');
            }}
          />
        )}

        {screen === 'forgot-password' && (
          <ForgotPasswordScreen
            onSent={() => setScreen('forgot-password-sent')}
            onBack={() => setScreen('login')}
          />
        )}

        {screen === 'forgot-password-sent' && (
          <ForgotPasswordSentScreen onBackToLogin={() => setScreen('login')} />
        )}

        {screen === 'reset-password' && (
          <ResetPasswordScreen
            currentUser={currentUser}
            onSubmit={completePasswordReset}
            onCancel={cancelPasswordRecovery}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            registering={registering}
            authError={authError}
            onValidationError={(msg) => setAuthError(msg)}
            onRegister={async (username, email, password) => {
              setAuthError(null);
              try {
                await registerUser(username, email, password);
              } catch (error) {
                setAuthError(error.message || 'Registration failed. Please try again.');
              }
            }}
            onLogin={() => {
              setAuthError(null);
              setScreen('login');
            }}
            onBack={() => {
              setAuthError(null);
              setScreen('home');
            }}
          />
        )}

        {screen === 'dashboard' && (
          <DashboardScreen
            currentUser={currentUser}
            gamesLoading={gamesLoading}
            userGames={userGames}
            onLogout={logoutUser}
            onSelectGame={selectGame}
            onEndGame={endGame}
            onDuplicateSetup={duplicateSetupFromGame}
            onCreateGame={() => {
              setWinMode('standard');
              setLinesToWin(1);
              setScreen('setup');
            }}
            onJoinWithCode={() => {
              setJoinCode('');
              setScreen('home');
            }}
          />
        )}

        {screen === 'email-confirmation' && (
          <EmailConfirmationScreen
            email={currentUser?.email}
            onGoToLogin={() => setScreen('login')}
            onBackHome={() => {
              setCurrentUser(null);
              setScreen('home');
            }}
          />
        )}

        {screen === 'home' && (
          <HomeScreen
            currentUser={currentUser}
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            onOpenDashboard={() => setScreen('dashboard')}
            onLogin={() => setScreen('login')}
            onRegister={() => setScreen('register')}
            onJoinGame={joinGame}
          />
        )}

        {screen === 'setup' && (
          <SetupScreen
            currentUser={currentUser}
            gameTitle={gameTitle}
            setGameTitle={setGameTitle}
            generatingItems={generatingItems}
            neededItemCount={neededItemCount}
            onGenerateItems={generateItemsFromGameTitle}
            boardSize={boardSize}
            onUpdateBoardSize={updateBoardSize}
            useFreeSpace={useFreeSpace}
            onUpdateFreeSpace={updateFreeSpace}
            winMode={winMode}
            onUpdateWinMode={updateWinMode}
            linesToWin={linesToWin}
            onUpdateLinesToWin={updateLinesToWin}
            items={items}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onUpdateItemImage={updateItemImage}
            onRemoveItem={removeItem}
            onRemoveItemImage={removeItemImage}
            onBack={() => {
              if (currentUser) {
                setScreen('dashboard');
              } else {
                setScreen('home');
              }
            }}
            onCreateGame={createGame}
          />
        )}

        {screen === 'host' && gameCode && (
          <HostScreen
            gameCode={gameCode}
            gameConfig={gameConfig}
            gamePlayers={gamePlayers}
            confirmedWinners={confirmedWinners}
            pendingWinClaim={pendingWinClaim}
            selectedIncorrectItems={selectedIncorrectItems}
            showEndGameDialog={showEndGameDialog}
            isHost={isHost}
            copied={copied}
            currentUser={currentUser}
            onToggleIncorrectItem={toggleIncorrectItem}
            onRejectWin={rejectWin}
            onConfirmWin={confirmWin}
            onContinueAfterWin={handleContinueAfterWin}
            onEndGameAfterWin={handleEndGameAfterWin}
            onCopyCode={copyCode}
            onStartPlaying={async () => {
              if (gameConfig && gameCode) {
                await generateBoardFromConfig(gameConfig, gameCode);
              } else if (gameConfig) {
                await generateBoardFromConfig(gameConfig);
              } else {
                showToast('Game configuration not found. Please try selecting the game again.');
              }
            }}
            onResetToHome={resetToHome}
          />
        )}

        {screen === 'play' && (
          <PlayScreen
            gameCode={gameCode}
            gameConfig={gameConfig}
            gamePlayers={gamePlayers}
            confirmedWinners={confirmedWinners}
            isHost={isHost}
            pendingWinClaim={pendingWinClaim}
            selectedIncorrectItems={selectedIncorrectItems}
            winConfirmed={winConfirmed}
            winRejected={winRejected}
            hasWon={hasWon}
            board={board}
            boardSize={boardSize}
            marked={marked}
            currentUser={currentUser}
            onToggleIncorrectItem={toggleIncorrectItem}
            onRejectWin={rejectWin}
            onConfirmWin={confirmWin}
            onResetToHome={resetToHome}
            onToggleCell={toggleCell}
            onNewBoard={async () => {
              if (gameConfig && gameCode) {
                await generateBoardFromConfig(gameConfig, gameCode);
              } else if (gameConfig) {
                await generateBoardFromConfig(gameConfig);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
