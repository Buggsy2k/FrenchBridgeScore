import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { GameConfig, GameState } from '../models/types';
import type { PlayerScore } from '../models/types';
import { computeScoreboard, renamePlayers, editHand } from '../models/gameLogic';
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
  submitBids: (bids: { playerId: string; bid: number }[]) => Promise<void>;
  submitResults: (results: { playerId: string; tricksTaken: number }[]) => Promise<void>;
  updatePlayerNames: (names: Record<string, string>) => Promise<void>;
  editCompletedHand: (handNumber: number, edits: { playerId: string; bid: number; tricksTaken: number }[]) => Promise<void>;
  resumeGame: () => void;
  dismissSavedGame: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const service: IGameService = new LocalStorageGameService();

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [lastConfig, setLastConfig] = useState<LastGameConfig | null>(null);

  // On mount, check for an in-progress game to offer recovery
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
  }, []);

  const scoreboard = useMemo(() => (game ? computeScoreboard(game) : []), [game]);

  const startGame = useCallback(async (config: GameConfig) => {
    const g = await service.createGame(config);
    service.setActiveGameId(g.id);
    setSavedGame(null);
    setGame(g);
  }, []);

  const handleSubmitBids = useCallback(
    async (bids: { playerId: string; bid: number }[]) => {
      if (!game) return;
      const updated = await service.submitBids(game.id, bids);
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
    async (handNumber: number, edits: { playerId: string; bid: number; tricksTaken: number }[]) => {
      if (!game) return;
      const updated = editHand(game, handNumber, edits);
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
      resumeGame,
      dismissSavedGame,
      resetGame,
    }),
    [game, scoreboard, lastConfig, savedGame, startGame, handleSubmitBids, handleSubmitResults, updatePlayerNames, editCompletedHand, resumeGame, dismissSavedGame, resetGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
