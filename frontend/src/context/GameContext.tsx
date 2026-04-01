import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { GameConfig, GameState, TrumpSuit, CompletedGame, PlayerStats } from '../models/types';
import type { PlayerScore } from '../models/types';
import { computeScoreboard, renamePlayers, editHand, replacePlayer, addPlayerToGame, removePlayerFromGame, reorderPlayers, setHandTrumpSuit, buildCompletedGame, computePlayerStats, endGameEarly } from '../models/gameLogic';
import { LocalStorageGameService } from '../services/LocalStorageGameService';
import type { IGameService } from '../services/IGameService';

interface LastGameConfig {
  playerIds: string[];
  playerNames: string[];
  playerFullNames: string[];
  firstDealerIndex: number;
  maxHands: number;
}

interface GameContextValue {
  game: GameState | null;
  scoreboard: PlayerScore[];
  lastConfig: LastGameConfig | null;
  savedGame: GameState | null;
  startGame: (config: GameConfig) => Promise<void>;
  submitBids: (bids: { playerId: string; bid: number }[], trumpSuit?: TrumpSuit) => Promise<void>;
  submitResults: (results: { playerId: string; tricksTaken: number }[]) => Promise<void>;
  updatePlayerNames: (names: Record<string, string>) => Promise<void>;
  editCompletedHand: (handNumber: number, edits: { playerId: string; bid: number; tricksTaken: number }[], trumpSuit?: TrumpSuit) => Promise<void>;
  replaceGamePlayer: (oldPlayerId: string, newPlayer: { id: string; name: string; fullName: string }) => Promise<void>;
  addGamePlayer: (newPlayer: { id: string; name: string; fullName: string }) => Promise<void>;
  removeGamePlayer: (playerId: string) => Promise<void>;
  reorderGamePlayers: (playerIds: string[]) => Promise<void>;
  setCurrentTrumpSuit: (trumpSuit?: TrumpSuit) => Promise<void>;
  resumeGame: () => void;
  dismissSavedGame: () => void;
  resetGame: () => void;
  endCurrentGame: () => Promise<void>;
  // Game history
  completedGames: CompletedGame[];
  playerStats: PlayerStats[];
  saveCurrentGame: () => Promise<void>;
  loadHistory: () => Promise<void>;
  deleteHistoryGame: (id: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const service: IGameService = new LocalStorageGameService();

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [lastConfig, setLastConfig] = useState<LastGameConfig | null>(null);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);

  // On mount, check for an in-progress game to offer recovery and load history
  useEffect(() => {
    const activeId = service.getActiveGameId();
    if (activeId) {
      service.getGame(activeId).then((g) => {
        if (g && g.phase === 'playing') {
          setSavedGame(g);
        } else {
          service.clearActiveGameId();
        }
      });
    }
    service.getCompletedGames().then(setCompletedGames);
  }, []);

  const scoreboard = useMemo(() => (game ? computeScoreboard(game) : []), [game]);

  const startGame = useCallback(async (config: GameConfig) => {
    const g = await service.createGame(config);
    service.setActiveGameId(g.id);
    setSavedGame(null);
    setGame(g);
  }, []);

  const handleSubmitBids = useCallback(
    async (bids: { playerId: string; bid: number }[], trumpSuit?: TrumpSuit) => {
      if (!game) return;
      const updated = await service.submitBids(game.id, bids, trumpSuit);
      setGame(updated);
    },
    [game]
  );

  const handleSubmitResults = useCallback(
    async (results: { playerId: string; tricksTaken: number }[]) => {
      if (!game) return;
      const updated = await service.submitResults(game.id, results);
      setGame(updated);
    },
    [game]
  );

  const updatePlayerNames = useCallback(
    async (names: Record<string, string>) => {
      if (!game) return;
      const updated = renamePlayers(game, names);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const editCompletedHand = useCallback(
    async (handNumber: number, edits: { playerId: string; bid: number; tricksTaken: number }[], trumpSuit?: TrumpSuit) => {
      if (!game) return;
      const updated = editHand(game, handNumber, edits, trumpSuit);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const replaceGamePlayer = useCallback(
    async (oldPlayerId: string, newPlayer: { id: string; name: string; fullName: string }) => {
      if (!game) return;
      const updated = replacePlayer(game, oldPlayerId, newPlayer);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const addGamePlayer = useCallback(
    async (newPlayer: { id: string; name: string; fullName: string }) => {
      if (!game) return;
      const updated = addPlayerToGame(game, newPlayer);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const removeGamePlayer = useCallback(
    async (playerId: string) => {
      if (!game) return;
      const updated = removePlayerFromGame(game, playerId);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const reorderGamePlayers = useCallback(
    async (playerIds: string[]) => {
      if (!game) return;
      const updated = reorderPlayers(game, playerIds);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const setCurrentTrumpSuit = useCallback(
    async (trumpSuit?: TrumpSuit) => {
      if (!game) return;
      const updated = setHandTrumpSuit(game, game.currentHandIndex, trumpSuit);
      await service.saveGame(updated);
      setGame(updated);
    },
    [game]
  );

  const resumeGame = useCallback(() => {
    if (savedGame) {
      setGame(savedGame);
      setSavedGame(null);
    }
  }, [savedGame]);

  const dismissSavedGame = useCallback(() => {
    service.clearActiveGameId();
    setSavedGame(null);
  }, []);

  const resetGame = useCallback(() => {
    if (game) {
      setLastConfig({
        playerIds: game.players.map((p) => p.id),
        playerNames: game.players.map((p) => p.name),
        playerFullNames: game.players.map((p) => p.fullName),
        firstDealerIndex: game.config.firstDealerIndex,
        maxHands: game.config.maxHands,
      });
    }
    service.clearActiveGameId();
    setGame(null);
  }, [game]);

  const endCurrentGame = useCallback(async () => {
    if (!game || game.phase !== 'playing') return;
    const updated = endGameEarly(game);
    await service.saveGame(updated);
    setGame(updated);
  }, [game]);

  const playerStats = useMemo(() => computePlayerStats(completedGames), [completedGames]);

  const saveCurrentGame = useCallback(async () => {
    if (!game || game.phase !== 'finished') return;
    const completed = buildCompletedGame(game);
    await service.saveCompletedGame(completed);
    setCompletedGames((prev) => [...prev, completed]);
  }, [game]);

  const loadHistory = useCallback(async () => {
    const history = await service.getCompletedGames();
    setCompletedGames(history);
  }, []);

  const deleteHistoryGame = useCallback(async (id: string) => {
    await service.deleteCompletedGame(id);
    setCompletedGames((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      game,
      scoreboard,
      lastConfig,
      savedGame,
      startGame,
      submitBids: handleSubmitBids,
      submitResults: handleSubmitResults,
      updatePlayerNames,
      editCompletedHand,
      replaceGamePlayer,
      addGamePlayer,
      removeGamePlayer,
      reorderGamePlayers,
      setCurrentTrumpSuit,
      resumeGame,
      dismissSavedGame,
      resetGame,
      endCurrentGame,
      completedGames,
      playerStats,
      saveCurrentGame,
      loadHistory,
      deleteHistoryGame,
    }),
    [game, scoreboard, lastConfig, savedGame, startGame, handleSubmitBids, handleSubmitResults, updatePlayerNames, editCompletedHand, replaceGamePlayer, addGamePlayer, removeGamePlayer, reorderGamePlayers, setCurrentTrumpSuit, resumeGame, dismissSavedGame, resetGame, endCurrentGame, completedGames, playerStats, saveCurrentGame, loadHistory, deleteHistoryGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
