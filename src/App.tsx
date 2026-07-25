import { useLayoutEffect, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  activeShellTheme,
} from './lib/theme';
import { isValidGameCode, normalizeGameCode } from './lib/joinLink';
import { useReportModal } from './hooks/useReportModal';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useDashboardGames } from './hooks/useDashboardGames';
import { useGameSetup } from './hooks/useGameSetup';
import {
  initialPrintJoin,
  initialJoinCode,
  useJoinFlow,
} from './hooks/useJoinFlow';
import { useAuth } from './hooks/useAuth';
import { useActiveGame } from './hooks/useActiveGame';
import type { AppUser, Screen } from './types/app';
import { errorMessage } from './types/app';
import AuthLoadingOverlay from './components/chrome/AuthLoadingOverlay';
import GeneratingItemsOverlay from './components/chrome/GeneratingItemsOverlay';
import UserProfileBanner from './components/chrome/UserProfileBanner';
import VersionBadge from './components/chrome/VersionBadge';
import ReportButton from './components/chrome/ReportButton';
import ReportModal from './components/modals/ReportModal';
import JoinGameModal from './components/modals/JoinGameModal';
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
import PrintJoinFlyerScreen from './screens/PrintJoinFlyerScreen';

export default function Mingo() {
  const [screen, setScreen] = useState<Screen>(initialPrintJoin ? 'print-join' : 'home');

  const pendingJoinCodeRef = useRef<string>(initialPrintJoin ? '' : initialJoinCode);
  const printFlyerRef = useRef<boolean>(Boolean(initialPrintJoin));
  const joinInFlightRef = useRef<boolean>(false);
  const passwordRecoveryRef = useRef<boolean>(false);

  const loadUserGamesRef = useRef<
    (userId: string, opts?: { showLoading?: boolean }) => Promise<void>
  >(async () => {});
  const clearUserGamesRef = useRef<() => void>(() => {});
  const resumePendingJoinRef = useRef<(user: AppUser) => Promise<boolean>>(async () => false);
  const joinAsUserRef = useRef<
    (user: AppUser, code: string, opts?: { isRetry?: boolean }) => Promise<void>
  >(async () => {});
  const resetSessionRef = useRef<() => void>(() => {});
  const clearActiveGameRef = useRef<() => void>(() => {});
  const saveBoardStateRef = useRef<(gameId?: string | null) => Promise<void>>(async () => {});
  const resetDraftRef = useRef<() => void>(() => {});
  const resetJoinCodesRef = useRef<() => void>(() => {});
  const resetGameThemeToUserRef = useRef<() => void>(() => {});
  const clearPendingJoinRef = useRef<() => void>(() => {});
  const closeJoinModalRef = useRef<() => void>(() => {});

  const { showToast, ToastHost } = useToast();
  const {
    userTheme,
    gameTheme,
    updateUserTheme,
    updateGameTheme,
    applyThemeFromConfig,
    resetGameThemeToUser,
  } = useTheme();

  const {
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
  } = useAuth({
    setScreen,
    loadUserGames: (...args) => loadUserGamesRef.current(...args),
    clearUserGames: () => clearUserGamesRef.current(),
    resumePendingJoin: (...args) => resumePendingJoinRef.current(...args),
    pendingJoinCodeRef,
    printFlyerRef,
    passwordRecoveryRef,
    resetSession: () => resetSessionRef.current(),
  });

  const { userGames, gamesLoading, loadUserGames, clearUserGames } = useDashboardGames({
    currentUser,
    screen,
    authReady,
  });

  const {
    boardSize,
    board,
    marked,
    hasWon,
    gameVisibility,
    gameCode,
    gameId,
    copied,
    linkCopied,
    gameConfig,
    isHost,
    pendingWinClaim,
    winConfirmed,
    winRejected,
    selectedIncorrectItems,
    showEndGameDialog,
    gamePlayers,
    confirmedWinners,
    saveBoardState,
    selectGame,
    joinGameAsUser,
    generateBoardFromConfig,
    copyCode,
    copyJoinLink,
    openPrintableQr,
    confirmWin,
    handleEndGameAfterWin,
    handleContinueAfterWin,
    rejectWin,
    toggleIncorrectItem,
    toggleCell,
    endGame,
    clearActiveGame,
    onGameCreated,
    peekPlayer,
    peekBoard,
    peekMarked,
    peekBoardSize,
    peekLoading,
    peekError,
    peekEmptyMessage,
    openPlayerBoard,
    closePlayerBoard,
  } = useActiveGame({
    currentUser,
    screen,
    setScreen,
    showToast,
    loadUserGames,
    applyThemeFromConfig: (config) =>
      applyThemeFromConfig(
        config as { theme?: string | null } | null | undefined,
      ),
    joinInFlightRef,
    clearPendingJoin: () => clearPendingJoinRef.current(),
    closeJoinModal: () => closeJoinModalRef.current(),
  });

  const {
    joinCode,
    setJoinCode,
    pendingJoinCode,
    printFlyer,
    showJoinModal,
    guestDisplayName,
    setGuestDisplayName,
    guestJoinError,
    guestJoining,
    clearPendingJoin,
    openJoinModalForCode,
    closeJoinModal,
    cancelJoinIntent,
    goToLoginForJoin,
    goToRegisterForJoin,
    joinGame,
    submitGuestJoin,
    resumePendingJoin,
    resetJoinCodes,
  } = useJoinFlow({
    authReady,
    currentUser,
    screen,
    passwordRecoveryRef,
    pendingJoinCodeRef,
    printFlyerRef,
    joinInFlightRef,
    showToast,
    setScreen,
    setAuthError,
    onGuestSignedIn: setCurrentUser,
    joinAsUser: (...args) => joinAsUserRef.current(...args),
  });

  const {
    items,
    boardSize: setupBoardSize,
    useFreeSpace,
    winMode,
    linesToWin,
    gameVisibility: setupVisibility,
    gameTitle,
    setGameTitle,
    generationTone,
    generationInstructions,
    customEntryCode,
    generatingItems,
    generateStatusIndex,
    neededItemCount,
    generateLoadingMessages,
    addItem,
    removeItem,
    updateItem,
    updateItemImage,
    removeItemImage,
    updateBoardSize,
    updateFreeSpace,
    updateWinMode,
    updateLinesToWin,
    updateGameVisibility,
    updateGenerationTone,
    updateGenerationInstructions,
    updateCustomEntryCode,
    startNewSetup,
    duplicateSetupFromGame,
    generateItemsFromGameTitle,
    createGame,
    resetDraft,
  } = useGameSetup({
    currentUser,
    gameTheme,
    showToast,
    applyThemeFromConfig,
    resetGameThemeToUser,
    onNavigateSetup: () => setScreen('setup'),
    onCreated: onGameCreated,
    loadUserGames,
  });

  const resetToHome = () => {
    if (currentUser && gameId && board.length > 0) {
      saveBoardStateRef.current(gameId);
    }

    if (currentUser) {
      setScreen('dashboard');
      loadUserGames(currentUser.id);
    } else {
      setScreen('home');
    }

    resetDraftRef.current();
    clearActiveGameRef.current();
    resetJoinCodesRef.current();
    resetGameThemeToUserRef.current();
  };

  // Bind cross-hook seams before passive effects (auth bootstrap) run.
  useLayoutEffect(() => {
    resetGameThemeToUserRef.current = resetGameThemeToUser;
    loadUserGamesRef.current = loadUserGames;
    clearUserGamesRef.current = clearUserGames;
    saveBoardStateRef.current = saveBoardState;
    clearActiveGameRef.current = clearActiveGame;
    joinAsUserRef.current = joinGameAsUser;
    clearPendingJoinRef.current = clearPendingJoin;
    closeJoinModalRef.current = closeJoinModal;
    resumePendingJoinRef.current = resumePendingJoin;
    resetJoinCodesRef.current = resetJoinCodes;
    resetDraftRef.current = resetDraft;
    resetSessionRef.current = resetToHome;
  });

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

  const shellTheme = screen === 'print-join'
    ? DEFAULT_THEME
    : activeShellTheme(screen, gameTheme, userTheme);

  return (
    <div data-theme={shellTheme} className="min-h-screen mingo-shell p-4 sm:p-8 relative">
      {(registering || loggingIn || !authReady) && screen !== 'print-join' && (
        <AuthLoadingOverlay authReady={authReady} registering={registering} />
      )}

      {generatingItems && (
        <GeneratingItemsOverlay
          generateStatusIndex={generateStatusIndex}
          generateLoadingMessages={generateLoadingMessages}
        />
      )}

      {screen === 'print-join' && printFlyer && (
        <div className="fixed inset-0 z-[80] overflow-auto">
          <PrintJoinFlyerScreen
            code={printFlyer.code}
            title={printFlyer.title}
            joinUrl={printFlyer.joinUrl}
          />
        </div>
      )}

      {currentUser && screen !== 'reset-password' && screen !== 'print-join' && (
        <UserProfileBanner
          username={currentUser.username}
          onOpenDashboard={() => setScreen('dashboard')}
        />
      )}
      {screen !== 'print-join' && <VersionBadge />}
      {screen !== 'print-join' && <ReportButton onClick={openReportModal} />}
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

      {showJoinModal && (
        <JoinGameModal
          joinCode={normalizeGameCode(joinCode || pendingJoinCode)}
          guestDisplayName={guestDisplayName}
          setGuestDisplayName={setGuestDisplayName}
          guestJoinError={guestJoinError}
          guestJoining={guestJoining}
          onSubmitGuest={submitGuestJoin}
          onLogin={goToLoginForJoin}
          onRegister={goToRegisterForJoin}
          onClose={cancelJoinIntent}
        />
      )}

      {screen !== 'print-join' && (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2">🎲 Mingo</h1>
          <p className="text-white text-base sm:text-lg opacity-90">Create & Play Custom Bingo</p>
        </div>

        {screen === 'login' && (
          <LoginScreen
            loggingIn={loggingIn}
            authError={authError}
            pendingJoinCode={pendingJoinCode}
            onLogin={async (email, password) => {
              setAuthError(null);
              try {
                await loginUser(email, password);
              } catch (error) {
                setAuthError(errorMessage(error, 'Login failed. Please try again.'));
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
              if (isValidGameCode(pendingJoinCode)) {
                setScreen('home');
                openJoinModalForCode(pendingJoinCode);
              } else {
                setScreen('home');
              }
            }}
          />
        )}

        {screen === 'forgot-password' && (
          <ForgotPasswordScreen
            onSent={() => setScreen('forgot-password-sent')}
            onBack={() => setScreen('login')}
            showToast={showToast}
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
            showToast={showToast}
          />
        )}

        {screen === 'register' && (
          <RegisterScreen
            registering={registering}
            authError={authError}
            pendingJoinCode={pendingJoinCode}
            onValidationError={(msg) => setAuthError(msg)}
            onRegister={async (username, email, password) => {
              setAuthError(null);
              try {
                await registerUser(username, email, password);
              } catch (error) {
                setAuthError(errorMessage(error, 'Registration failed. Please try again.'));
              }
            }}
            onLogin={() => {
              setAuthError(null);
              setScreen('login');
            }}
            onBack={() => {
              setAuthError(null);
              if (isValidGameCode(pendingJoinCode)) {
                setScreen('home');
                openJoinModalForCode(pendingJoinCode);
              } else {
                setScreen('home');
              }
            }}
          />
        )}

        {screen === 'dashboard' && (
          <DashboardScreen
            currentUser={currentUser}
            gamesLoading={gamesLoading}
            userGames={userGames}
            userTheme={userTheme}
            onUpdateUserTheme={updateUserTheme}
            onLogout={logoutUser}
            onSelectGame={selectGame}
            onEndGame={endGame}
            onDuplicateSetup={duplicateSetupFromGame}
            onCreateGame={startNewSetup}
            onJoinWithCode={() => {
              setJoinCode('');
              setScreen('home');
            }}
            onJoinPublicGame={joinGame}
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
            userTheme={userTheme}
            onUpdateUserTheme={updateUserTheme}
            onOpenDashboard={() => setScreen('dashboard')}
            onLogin={() => setScreen('login')}
            onRegister={() => setScreen('register')}
            onJoinGame={joinGame}
            onJoinPublicGame={joinGame}
          />
        )}

        {screen === 'setup' && (
          <SetupScreen
            currentUser={currentUser}
            gameTitle={gameTitle}
            setGameTitle={setGameTitle}
            generationTone={generationTone}
            onUpdateGenerationTone={updateGenerationTone}
            generationInstructions={generationInstructions}
            onUpdateGenerationInstructions={updateGenerationInstructions}
            customEntryCode={customEntryCode}
            onUpdateCustomEntryCode={updateCustomEntryCode}
            generatingItems={generatingItems}
            neededItemCount={neededItemCount}
            onGenerateItems={generateItemsFromGameTitle}
            boardSize={setupBoardSize}
            onUpdateBoardSize={updateBoardSize}
            useFreeSpace={useFreeSpace}
            onUpdateFreeSpace={updateFreeSpace}
            winMode={winMode}
            onUpdateWinMode={updateWinMode}
            linesToWin={linesToWin}
            onUpdateLinesToWin={updateLinesToWin}
            gameVisibility={setupVisibility}
            onUpdateGameVisibility={updateGameVisibility}
            gameTheme={gameTheme}
            onUpdateGameTheme={updateGameTheme}
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
            gameVisibility={gameVisibility}
            gamePlayers={gamePlayers}
            confirmedWinners={confirmedWinners}
            pendingWinClaim={pendingWinClaim}
            selectedIncorrectItems={selectedIncorrectItems}
            showEndGameDialog={showEndGameDialog}
            isHost={isHost}
            copied={copied}
            linkCopied={linkCopied}
            currentUser={currentUser}
            peekPlayer={peekPlayer}
            peekBoard={peekBoard}
            peekMarked={peekMarked}
            peekBoardSize={peekBoardSize}
            peekLoading={peekLoading}
            peekError={peekError}
            peekEmptyMessage={peekEmptyMessage}
            onSelectPlayer={openPlayerBoard}
            onClosePlayerBoard={closePlayerBoard}
            onToggleIncorrectItem={toggleIncorrectItem}
            onRejectWin={rejectWin}
            onConfirmWin={confirmWin}
            onContinueAfterWin={handleContinueAfterWin}
            onEndGameAfterWin={handleEndGameAfterWin}
            onCopyCode={copyCode}
            onCopyJoinLink={copyJoinLink}
            onOpenPrintableQr={openPrintableQr}
            onStartPlaying={async () => {
              if (gameConfig && gameId) {
                await generateBoardFromConfig(gameConfig, gameId);
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
            gameVisibility={gameVisibility}
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
            linkCopied={linkCopied}
            peekPlayer={peekPlayer}
            peekBoard={peekBoard}
            peekMarked={peekMarked}
            peekBoardSize={peekBoardSize}
            peekLoading={peekLoading}
            peekError={peekError}
            peekEmptyMessage={peekEmptyMessage}
            onSelectPlayer={openPlayerBoard}
            onClosePlayerBoard={closePlayerBoard}
            onToggleIncorrectItem={toggleIncorrectItem}
            onRejectWin={rejectWin}
            onConfirmWin={confirmWin}
            onResetToHome={resetToHome}
            onToggleCell={toggleCell}
            onCopyJoinLink={copyJoinLink}
            onOpenPrintableQr={openPrintableQr}
          />
        )}
      </div>
      )}
    </div>
  );
}
