import type { GameConfig, GameState, TrumpSuit, CompletedGame } from '../models/types';

/**
 * Abstract interface for game data operations.
 * MVP: implemented via localStorage.
 * Future: swap to HTTP client targeting ASP.NET Core API.
 */
export interface IGameService {
  createGame(config: GameConfig): Promise<GameState>;
  getGame(id: string): Promise<GameState | null>;
  saveGame(game: GameState): Promise<void>;
  submitBids(gameId: string, bids: { playerId: string; bid: number }[], trumpSuit?: TrumpSuit): Promise<GameState>;
  submitResults(gameId: string, results: { playerId: string; tricksTaken: number }[]): Promise<GameState>;
  listGames(): Promise<{ id: string; createdAt: string; playerNames: string[] }[]>;
  deleteGame(id: string): Promise<void>;
  getActiveGameId(): string | null;
  setActiveGameId(id: string): void;
  clearActiveGameId(): void;
  // Game history
  saveCompletedGame(game: CompletedGame): Promise<void>;
  getCompletedGames(): Promise<CompletedGame[]>;
  deleteCompletedGame(id: string): Promise<void>;
}
