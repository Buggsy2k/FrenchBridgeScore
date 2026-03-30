import type { GameConfig, GameState } from '../models/types';
import type { IGameService } from './IGameService';
import { createGame, submitBids, submitResults } from '../models/gameLogic';

const STORAGE_KEY = 'frenchbridge_games';
const ACTIVE_GAME_KEY = 'frenchbridge_active_game';

function loadAll(): Record<string, GameState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, GameState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export class LocalStorageGameService implements IGameService {
  async createGame(config: GameConfig): Promise<GameState> {
    const game = createGame(config);
    const all = loadAll();
    all[game.id] = game;
    saveAll(all);
    return game;
  }

  async getGame(id: string): Promise<GameState | null> {
    const all = loadAll();
    return all[id] ?? null;
  }

  async saveGame(game: GameState): Promise<void> {
    const all = loadAll();
    all[game.id] = game;
    saveAll(all);
  }

  async submitBids(
    gameId: string,
    bids: { playerId: string; bid: number }[]
  ): Promise<GameState> {
    const all = loadAll();
    const game = all[gameId];
    if (!game) throw new Error(`Game ${gameId} not found`);
    const updated = submitBids(game, bids);
    all[gameId] = updated;
    saveAll(all);
    return updated;
  }

  async submitResults(
    gameId: string,
    results: { playerId: string; tricksTaken: number }[]
  ): Promise<GameState> {
    const all = loadAll();
    const game = all[gameId];
    if (!game) throw new Error(`Game ${gameId} not found`);
    const updated = submitResults(game, results);
    all[gameId] = updated;
    saveAll(all);
    return updated;
  }

  async listGames(): Promise<{ id: string; createdAt: string; playerNames: string[] }[]> {
    const all = loadAll();
    return Object.values(all).map((g) => ({
      id: g.id,
      createdAt: g.createdAt,
      playerNames: g.players.map((p) => p.name),
    }));
  }

  async deleteGame(id: string): Promise<void> {
    const all = loadAll();
    delete all[id];
    saveAll(all);
  }

  getActiveGameId(): string | null {
    return localStorage.getItem(ACTIVE_GAME_KEY);
  }

  setActiveGameId(id: string): void {
    localStorage.setItem(ACTIVE_GAME_KEY, id);
  }

  clearActiveGameId(): void {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  }
}
