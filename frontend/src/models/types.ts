// ─── Core Domain Models ───

/** A player stored in the persistent player cache (localStorage). */
export interface CachedPlayer {
  id: string;
  fullName: string;
  alias: string;
}

export interface Player {
  id: string;
  name: string;      // alias used during game display
  fullName: string;   // full name for identification
  order: number;      // 0-based seating position
}

export interface HandBid {
  playerId: string;
  bid: number;
}

export interface HandResult {
  playerId: string;
  bid: number;
  tricksTaken: number;
  score: number;
}

export interface Hand {
  handNumber: number; // 1-based index in the sequence
  cardsDealt: number;
  dealerPlayerId: string;
  phase: 'bidding' | 'results' | 'complete';
  bids: HandBid[];
  results: HandResult[];
}

export interface GameConfig {
  playerNames: string[];   // aliases used during game
  playerFullNames: string[]; // full names for cache
  firstDealerIndex: number;
  maxHands: number;
}

export type GamePhase = 'setup' | 'playing' | 'finished';

export interface GameState {
  id: string;
  config: GameConfig;
  players: Player[];
  hands: Hand[];
  currentHandIndex: number; // index into hands[]
  phase: GamePhase;
  createdAt: string;
}

// ─── Derived / computed helpers ───

export interface PlayerScore {
  playerId: string;
  playerName: string;
  totalScore: number;
  handScores: { handNumber: number; score: number; bid: number; tricksTaken: number }[];
}
