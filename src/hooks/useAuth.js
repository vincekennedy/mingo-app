import { useEffect, useRef, useState } from 'react';
import { authService, resolveDisplayName } from '../services/auth';
import { supabase } from '../lib/supabase';
import {
  isValidGameCode,
  parseJoinCodeFromLocation,
  writePendingJoinCode,
} from '../lib/joinLink';

/**
 * Auth bootstrap, register/login/reset/logout.
 * Shared refs live in App for join/print-flyer coordination.
 */
export function useAuth({
  setScreen,
  loadUserGames,
  clearUserGames,
  resumePendingJoin,
  pendingJoinCodeRef,
  printFlyerRef,
  passwordRecoveryRef,
  resetSession,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(null);
  const authReadyRef = useRef(false);

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

    try {
      const fromUrl = parseJoinCodeFromLocation(window.location);
      if (fromUrl) {
        pendingJoinCodeRef.current = fromUrl;
        writePendingJoinCode(fromUrl);
      }
    } catch {
      /* ignore */
    }

    const markAuthReady = () => {
      if (cancelled) return;
      authReadyRef.current = true;
      setAuthReady(true);
    };

    const hydrateLoggedInSession = (user) => {
      if (authReadyRef.current || cancelled) return Promise.resolve();
      if (hydratePromise) return hydratePromise;

      hydratePromise = (async () => {
        try {
          const profile = await authService.ensureUserProfile(user);
          if (cancelled) return;
          const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
          setCurrentUser({
            id: user.id,
            email: user.email,
            username,
            isGuest: Boolean(user.is_anonymous),
          });
          if (printFlyerRef.current) {
            setScreen('print-join');
          } else if (!pendingJoinCodeRef.current) {
            setScreen('dashboard');
          }
          await loadUserGames(user.id, { showLoading: !printFlyerRef.current });
        } finally {
          markAuthReady();
        }
      })();

      return hydratePromise;
    };

    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (cancelled) return;
        if (user && passwordRecoveryRef.current) {
          const profile = await authService.ensureUserProfile(user);
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
        clearUserGames();
        setScreen((prev) =>
          prev === 'dashboard' || prev === 'host' || prev === 'play' ? 'home' : prev
        );
        markAuthReady();
        return;
      }

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !authReadyRef.current) {
        if (passwordRecoveryRef.current) return;
        await hydrateLoggedInSession(user);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (passwordRecoveryRef.current) return;
        const profile = await authService.ensureUserProfile(user);
        if (cancelled) return;
        const username = resolveDisplayName(profile, user.email?.split('@')[0] || 'User');
        setCurrentUser({
          id: user.id,
          email: user.email,
          username,
          isGuest: Boolean(user.is_anonymous),
        });
        if (!pendingJoinCodeRef.current && !printFlyerRef.current) {
          setScreen((prev) =>
            prev === 'home' || prev === 'login' || prev === 'register' ? 'dashboard' : prev
          );
        }
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
    // Mount-only bootstrap; callers are read via closures/refs intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerUser = async (username, email, password) => {
    setAuthError(null);
    setRegistering(true);
    try {
      const user = await authService.signUp(username, email, password);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          username,
        });
        setScreen('email-confirmation');
        return true;
      }

      let profile = null;
      try {
        profile = await authService.getUserProfile(user.id);
      } catch (profileError) {
        console.warn('Could not read profile immediately after signup:', profileError.message);
        console.warn('This is normal if RLS is blocking reads');
        console.warn('User account was created successfully - profile will be accessible');
      }

      const userUsername = resolveDisplayName(profile, username);
      setCurrentUser({
        id: user.id,
        email: user.email,
        username: userUsername,
      });

      try {
        await loadUserGames(user.id);
      } catch (gamesError) {
        console.warn('Could not load games immediately after signup:', gamesError.message);
      }

      const pending = pendingJoinCodeRef.current;
      if (pending && isValidGameCode(pending)) {
        await resumePendingJoin({
          id: user.id,
          email: user.email,
          username: userUsername,
        });
        return true;
      }

      setScreen('dashboard');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        throw new Error('Email already registered. Please use a different email or login.');
      } else if (error.message?.includes('username') && error.message?.includes('unique')) {
        throw new Error('Username already taken. Please choose a different username.');
      } else if (error.message?.includes('password') && error.message?.includes('length')) {
        throw new Error('Password must be at least 6 characters.');
      } else if (
        error.message?.includes('Invalid email') ||
        (error.message?.includes('email') && error.message?.includes('format'))
      ) {
        throw new Error('Invalid email address format.');
      } else if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        throw error;
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error(
          'Registration timed out. Your account may have been created. Please try logging in.'
        );
      }
      throw error;
    } finally {
      setRegistering(false);
    }
  };

  const loginUser = async (email, password) => {
    setAuthError(null);
    setLoggingIn(true);
    try {
      const user = await authService.signIn(email, password);
      const profile = await authService.ensureUserProfile(user);
      const userUsername = resolveDisplayName(profile, email.split('@')[0]);
      setCurrentUser({
        id: user.id,
        email: user.email,
        username: userUsername,
      });

      await loadUserGames(user.id);

      const pending = pendingJoinCodeRef.current;
      if (pending && isValidGameCode(pending)) {
        await resumePendingJoin({
          id: user.id,
          email: user.email,
          username: userUsername,
        });
        return true;
      }

      setScreen('dashboard');
      return true;
    } catch (error) {
      console.error('Login error:', error);
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
      await authService.signOut();
      setCurrentUser(null);
      clearUserGames();
      resetSession();
      setScreen('home');
    } catch (error) {
      console.error('Logout error:', error);
      setCurrentUser(null);
      clearUserGames();
      resetSession();
      setScreen('home');
    }
  };

  return {
    currentUser,
    setCurrentUser,
    authReady,
    registering,
    loggingIn,
    authError,
    setAuthError,
    registerUser,
    loginUser,
    completePasswordReset,
    cancelPasswordRecovery,
    logoutUser,
  };
}
