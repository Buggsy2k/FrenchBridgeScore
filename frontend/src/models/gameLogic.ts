import type { GameConfig, GameState, Hand, HandResult, Player, PlayerScore } from './types';

/**
 * Calculate the maximum number of hands (peak) for a given player count.
 * max = floor((52 - 1) / numberOfPlayers)
 */
export function calculateMaxHands(playerCount: number): number {
  return Math.floor(51 / playerCount);
}

/**
 * Generate the full sequence of card counts for each hand.
 * Pattern: 1, 2, ..., peak, peak, peak-1, ..., 2, 1
 * The peak is repeated (the "second peak"). Total hands = peak * 2.
 */
export function generateHandSequence(peak: number): number[] {
  const sequence: number[] = [];
  for (let i = 1; i <= peak; i++) {
    sequence.push(i);
  }
  for (let i = peak; i >= 1; i--) {
    sequence.push(i);
  }
  return sequence;
}

/**
 * Determine which player is the dealer for hand at index `handIndex`.
 * Dealer rotates clockwise (by player order) each hand.
 */
export function getDealerIndex(firstDealerIndex: number, handIndex: number, playerCount: number): number {
  return (firstDealerIndex + handIndex) % playerCount;
}

/**
 * Calculate the score for a single player in a hand.
 */
export function calculateScore(bid: number, tricksTaken: number): number {
  if (bid !== tricksTaken) return 0;
  if (bid === 0) return 10;
  if (bid === 1) return 15;
  return bid * 10;
}

/**
 * Build the initial GameState from a config.
 */
export function createGame(config: GameConfig): GameState {
  const players: Player[] = config.playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    fullName: config.playerFullNames?.[i] ?? name,
    order: i,
  }));

  const sequence = generateHandSequence(config.maxHands);
  const hands: Hand[] = sequence.map((cards, i) => ({
    handNumber: i + 1,
    cardsDealt: cards,
    dealerPlayerId: players[getDealerIndex(config.firstDealerIndex, i, players.length)].id,
    phase: 'bidding',
    bids: [],
    results: [],
  }));

  return {
    id: crypto.randomUUID(),
    config,
    players,
    hands,
    currentHandIndex: 0,
    phase: 'playing',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Compute cumulative scores for all players across completed hands.
 */
export function computeScoreboard(game: GameState): PlayerScore[] {
  return game.players.map((player) => {
    const handScores = game.hands
      .filter((h) => h.phase === 'complete')
      .map((h) => {
        const result = h.results.find((r) => r.playerId === player.id);
        return {
          handNumber: h.handNumber,
          score: result?.score ?? 0,
          bid: result?.bid ?? 0,
          tricksTaken: result?.tricksTaken ?? 0,
        };
      });

    return {
      playerId: player.id,
      playerName: player.name,
      totalScore: handScores.reduce((sum, hs) => sum + hs.score, 0),
      handScores,
    };
  });
}

/**
 * Rename multiple players at once. Returns updated game state.
 */
export function renamePlayers(game: GameState, names: Record<string, string>): GameState {
  return {
    ...game,
    players: game.players.map((p) => (names[p.id] ? { ...p, name: names[p.id] } : p)),
  };
}

/**
 * Edit a completed hand's bids and results. Recalculates scores.
 */
export function editHand(
  game: GameState,
  handNumber: number,
  edits: { playerId: string; bid: number; tricksTaken: number }[]
): GameState {
  const hands = [...game.hands];
  const idx = hands.findIndex((h) => h.handNumber === handNumber);
  if (idx === -1) return game;
  const hand = { ...hands[idx] };
  hand.bids = edits.map((e) => ({ playerId: e.playerId, bid: e.bid }));
  hand.results = edits.map((e) => ({
    playerId: e.playerId,
    bid: e.bid,
    tricksTaken: e.tricksTaken,
    score: calculateScore(e.bid, e.tricksTaken),
  }));
  hands[idx] = hand;
  return { ...game, hands };
}

/**
 * Submit bids for the current hand. Returns updated game state.
 */
export function submitBids(game: GameState, bids: { playerId: string; bid: number }[]): GameState {
  const hands = [...game.hands];
  const hand = { ...hands[game.currentHandIndex] };
  hand.bids = bids.map((b) => ({ playerId: b.playerId, bid: b.bid }));
  hand.phase = 'results';
  hands[game.currentHandIndex] = hand;
  return { ...game, hands };
}

/**
 * Submit results for the current hand. Returns updated game state.
 */
export function submitResults(
  game: GameState,
  results: { playerId: string; tricksTaken: number }[]
): GameState {
  const hands = [...game.hands];
  const hand = { ...hands[game.currentHandIndex] };

  hand.results = results.map((r) => {
    const bid = hand.bids.find((b) => b.playerId === r.playerId)!.bid;
    return {
      playerId: r.playerId,
      bid,
      tricksTaken: r.tricksTaken,
      score: calculateScore(bid, r.tricksTaken),
    } satisfies HandResult;
  });

  hand.phase = 'complete';
  hands[game.currentHandIndex] = hand;

  const nextIndex = game.currentHandIndex + 1;
  const isFinished = nextIndex >= hands.length;

  return {
    ...game,
    hands,
    currentHandIndex: isFinished ? game.currentHandIndex : nextIndex,
    phase: isFinished ? 'finished' : 'playing',
  };
}
