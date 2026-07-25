import { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { generateItemsFromTitle } from '../services/generateItems';
import { gameService } from '../services/game';
import {
  DEFAULT_GENERATION_TONE,
  resolveGenerationTone,
  sanitizeGenerationInstructions,
  type GenerationToneId,
} from '../lib/generationTone';
import { normalizeWinConfig, type WinMode } from '../lib/winDetection';
import {
  generateRandomGameCode,
  isValidGameCode,
  normalizeGameCode,
} from '../lib/joinLink';
import { resolveTheme } from '../lib/theme';

type AppUser = { id: string; email?: string | null; username: string; isGuest?: boolean };
type ShowToast = (
  message: string,
  opts?: { variant?: 'error' | 'success' | 'info'; durationMs?: number },
) => void;
type GameVisibility = 'private' | 'public';

type SetupItem = { text: string; imageUrl: string | null };
type SetupItemEntry = SetupItem | string;

type DuplicateGameConfig = {
  items?: unknown[];
  boardSize?: number;
  useFreeSpace?: boolean;
  title?: string;
  generationTone?: string;
  generationInstructions?: string;
  theme?: string;
  winMode?: string;
  linesToWin?: number;
  [key: string]: unknown;
};

type GameSummaryForDuplicate = {
  config?: DuplicateGameConfig | null;
  visibility?: string | null;
};

type UseGameSetupContext = {
  currentUser: AppUser | null;
  gameTheme: string;
  showToast: ShowToast;
  applyThemeFromConfig: (config: DuplicateGameConfig) => void;
  resetGameThemeToUser: () => void;
  onNavigateSetup: () => void;
  onCreated: (payload: {
    id: string;
    code: string;
    config: Record<string, unknown>;
    visibility: GameVisibility;
  }) => void | Promise<void>;
  loadUserGames: (userId: string) => Promise<void>;
};

const emptyItems = (): SetupItem[] => Array(24).fill({ text: '', imageUrl: null });

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function normalizeConfigItem(item: unknown): SetupItem {
  if (typeof item === 'string') {
    return { text: item, imageUrl: null };
  }
  if (item && typeof item === 'object') {
    const obj = item as { text?: string; imageUrl?: string | null };
    return { text: obj.text || '', imageUrl: obj.imageUrl || null };
  }
  return { text: '', imageUrl: null };
}

/**
 * Setup-screen draft board config (separate from live session).
 */
export function useGameSetup({
  currentUser,
  gameTheme,
  showToast,
  applyThemeFromConfig,
  resetGameThemeToUser,
  onNavigateSetup,
  onCreated,
  loadUserGames,
}: UseGameSetupContext) {
  const [items, setItems] = useState<SetupItemEntry[]>(() => emptyItems());
  const [boardSize, setBoardSize] = useState(5);
  const [useFreeSpace, setUseFreeSpace] = useState(true);
  const [winMode, setWinMode] = useState<WinMode>('standard');
  const [linesToWin, setLinesToWin] = useState(1);
  const [gameVisibility, setGameVisibility] = useState<GameVisibility>('private');
  const [gameTitle, setGameTitle] = useState('');
  const [generationTone, setGenerationTone] = useState<GenerationToneId>(DEFAULT_GENERATION_TONE);
  const [generationInstructions, setGenerationInstructions] = useState('');
  const [customEntryCode, setCustomEntryCode] = useState('');
  const [generatingItems, setGeneratingItems] = useState(false);
  const [generateStatusIndex, setGenerateStatusIndex] = useState(0);

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

  const addItem = () => {
    setItems([...items, { text: '', imageUrl: null }]);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item && typeof item === 'object' && item.imageUrl) {
      try {
        await storageService.deleteImage(item.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    if (typeof currentItem === 'string') {
      newItems[index] = { text: value, imageUrl: null };
    } else if (currentItem) {
      newItems[index] = { ...currentItem, text: value };
    }
    setItems(newItems);
  };

  const updateItemImage = async (index: number, file: File | null | undefined) => {
    if (!file || !currentUser) {
      showToast('Please log in to upload images.');
      return;
    }

    try {
      const currentItem = items[index];
      if (currentItem && typeof currentItem === 'object' && currentItem.imageUrl) {
        try {
          await storageService.deleteImage(currentItem.imageUrl);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      const storageKey = `temp-${Date.now()}`;
      const imageUrl = await storageService.uploadImage(file, storageKey, currentUser.id);

      const newItems = [...items];
      const itemToUpdate =
        typeof newItems[index] === 'string'
          ? { text: '', imageUrl: null }
          : { ...(newItems[index] as SetupItem) };
      newItems[index] = { ...itemToUpdate, imageUrl, text: itemToUpdate.text || '' };
      setItems(newItems);
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast(getErrorMessage(error, 'Error uploading image. Please try again.'));
    }
  };

  const removeItemImage = async (index: number) => {
    const currentItem = items[index];
    if (currentItem && typeof currentItem === 'object' && currentItem.imageUrl) {
      try {
        await storageService.deleteImage(currentItem.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    const newItems = [...items];
    const itemToUpdate =
      typeof newItems[index] === 'string'
        ? { text: newItems[index] as string, imageUrl: null }
        : { ...(newItems[index] as SetupItem), imageUrl: null };
    newItems[index] = itemToUpdate;
    setItems(newItems);
  };

  const updateBoardSize = (size: number) => {
    setBoardSize(size);
    const neededItems = useFreeSpace ? size * size - 1 : size * size;
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill({ text: '', imageUrl: null })]);
    }
  };

  const updateFreeSpace = (hasFreeSpace: boolean) => {
    setUseFreeSpace(hasFreeSpace);
    const neededItems = hasFreeSpace ? boardSize * boardSize - 1 : boardSize * boardSize;
    if (items.length < neededItems) {
      setItems([...items, ...Array(neededItems - items.length).fill({ text: '', imageUrl: null })]);
    }
  };

  const updateWinMode = (mode: string) => {
    setWinMode(mode as WinMode);
    if (mode !== 'standard') setLinesToWin(1);
  };

  const updateLinesToWin = (n: number | string) => {
    const value = Math.min(3, Math.max(1, Number(n) || 1));
    setLinesToWin(value);
  };

  const updateGameVisibility = (value: string) => {
    setGameVisibility(value === 'public' ? 'public' : 'private');
  };

  const updateGenerationTone = (value: string) => {
    setGenerationTone(resolveGenerationTone(value));
  };

  const updateGenerationInstructions = (value: string) => {
    setGenerationInstructions(sanitizeGenerationInstructions(value));
  };

  const updateCustomEntryCode = (value: string) => {
    setCustomEntryCode(normalizeGameCode(value).slice(0, 12));
  };

  const resetDraft = () => {
    setItems(emptyItems());
    setBoardSize(5);
    setUseFreeSpace(true);
    setWinMode('standard');
    setLinesToWin(1);
    setGameVisibility('private');
    setGameTitle('');
    setGenerationTone(DEFAULT_GENERATION_TONE);
    setGenerationInstructions('');
    setCustomEntryCode('');
  };

  const startNewSetup = () => {
    setWinMode('standard');
    setLinesToWin(1);
    setGameVisibility('private');
    resetGameThemeToUser();
    setGenerationTone(DEFAULT_GENERATION_TONE);
    setGenerationInstructions('');
    setCustomEntryCode('');
    onNavigateSetup();
  };

  const duplicateSetupFromGame = (game: GameSummaryForDuplicate) => {
    const config = game?.config;
    if (!config?.items || !Array.isArray(config.items) || config.items.length === 0) {
      showToast('This game has no item list to reuse.');
      return;
    }
    const size = config.boardSize || 5;
    const free = config.useFreeSpace !== undefined ? config.useFreeSpace : true;
    const rules = normalizeWinConfig(config);
    const normalizedItems = config.items.map(normalizeConfigItem);
    setGameTitle(config.title || '');
    setBoardSize(size);
    setUseFreeSpace(free);
    setWinMode(rules.winMode);
    setLinesToWin(rules.linesToWin);
    setGameVisibility(game.visibility === 'public' ? 'public' : 'private');
    applyThemeFromConfig(config);
    setGenerationTone(resolveGenerationTone(config.generationTone));
    setGenerationInstructions(sanitizeGenerationInstructions(config.generationInstructions));
    setCustomEntryCode('');
    setItems(normalizedItems);
    onNavigateSetup();
  };

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
        'This will replace your current bingo item texts (images on slots will be cleared). Continue?',
      );
      if (!replace) return;
    }

    setGeneratingItems(true);
    setGenerateStatusIndex(0);
    try {
      const generated = await generateItemsFromTitle(title, neededItemCount, {
        tone: resolveGenerationTone(generationTone),
        instructions: sanitizeGenerationInstructions(generationInstructions),
      });
      setItems(generated.map((text) => ({ text, imageUrl: null })));
    } catch (error) {
      console.error('Generate items error:', error);
      showToast(getErrorMessage(error, 'Could not generate items. Please try again.'));
    } finally {
      setGeneratingItems(false);
    }
  };

  const createGame = async () => {
    const validItems = items.filter((item) => {
      if (typeof item === 'string') {
        return item.trim() !== '';
      }
      return (item.text && item.text.trim() !== '') || item.imageUrl;
    });

    const totalCells = boardSize * boardSize;
    const neededItems = useFreeSpace ? totalCells - 1 : totalCells;

    if (validItems.length < neededItems) {
      showToast(
        `You need at least ${neededItems} items for a ${boardSize}x${boardSize} board${useFreeSpace ? ' (with free space)' : ''}`,
      );
      return;
    }

    const trimmedCustom = normalizeGameCode(customEntryCode);
    if (trimmedCustom && !isValidGameCode(trimmedCustom)) {
      showToast('Entry code must be 4–12 letters or numbers.');
      return;
    }
    const code = trimmedCustom || generateRandomGameCode();

    const normalizedItems = validItems.map((item) => {
      if (typeof item === 'string') {
        return { text: item, imageUrl: null };
      }
      return item;
    });

    const visibility: GameVisibility = gameVisibility === 'public' ? 'public' : 'private';
    const config: Record<string, unknown> = {
      items: normalizedItems,
      boardSize,
      useFreeSpace,
      title: gameTitle.trim() || null,
      winMode,
      linesToWin: winMode === 'standard' ? linesToWin : 1,
      theme: resolveTheme(gameTheme),
      generationTone: resolveGenerationTone(generationTone),
      generationInstructions: sanitizeGenerationInstructions(generationInstructions) || null,
    };

    if (!currentUser) {
      showToast('Please log in to create a game.');
      return;
    }

    try {
      const created = await gameService.createGame(code, currentUser.id, config, {
        visibility,
      });
      setCustomEntryCode('');
      console.log(`Game ${code} created and stored successfully`);
      await onCreated({
        id: created.id,
        code,
        config,
        visibility,
      });
      try {
        await loadUserGames(currentUser.id);
      } catch (loadError) {
        console.error('Error refreshing games after create:', loadError);
      }
    } catch (error) {
      console.error('Storage error:', error);
      showToast(`Could not save game: ${getErrorMessage(error, 'Please try again.')}`);
    }
  };

  return {
    items,
    boardSize,
    useFreeSpace,
    winMode,
    linesToWin,
    gameVisibility,
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
  };
}
