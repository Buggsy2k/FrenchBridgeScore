import type { GameConfig, GameState, Hand, HandResult, Player, PlayerScore, TrumpSuit, CompletedGame, PlayerStats } from './types';

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
    id: config.playerIds[i],
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
  edits: { playerId: string; bid: number; tricksTaken: number }[],
  trumpSuit?: TrumpSuit
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
  hand.trumpSuit = trumpSuit;
  hands[idx] = hand;
  return { ...game, hands };
}

/**
 * Submit bids for the current hand. Returns updated game state.
 */
export function submitBids(game: GameState, bids: { playerId: string; bid: number }[], trumpSuit?: TrumpSuit): GameState {
  const hands = [...game.hands];
  const hand = { ...hands[game.currentHandIndex] };
  hand.bids = bids.map((b) => ({ playerId: b.playerId, bid: b.bid }));
  if (trumpSuit) hand.trumpSuit = trumpSuit;
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

/**
 * Update the trump suit for a specific hand.
 */
export function setHandTrumpSuit(game: GameState, handIndex: number, trumpSuit?: TrumpSuit): GameState {
  const hands = [...game.hands];
  hands[handIndex] = { ...hands[handIndex], trumpSuit };
  return { ...game, hands };
}

/**
 * Replace a player in the game. The new player inherits all score history.
 */
export function replacePlayer(
  game: GameState,
  oldPlayerId: string,
  newPlayer: { id: string; name: string; fullName: string }
): GameState {
  const players = game.players.map((p) =>
    p.id === oldPlayerId
      ? { ...p, id: newPlayer.id, name: newPlayer.name, fullName: newPlayer.fullName }
      : p
  );

  const hands = game.hands.map((h) => ({
    ...h,
    dealerPlayerId: h.dealerPlayerId === oldPlayerId ? newPlayer.id : h.dealerPlayerId,
    bids: h.bids.map((b) =>
      b.playerId === oldPlayerId ? { ...b, playerId: newPlayer.id } : b
    ),
    results: h.results.map((r) =>
      r.playerId === oldPlayerId ? { ...r, playerId: newPlayer.id } : r
    ),
  }));

  return { ...game, players, hands };
}

/**
 * Add a new player to the game. They get zero scores for all completed hands.
 */
export function addPlayerToGame(
  game: GameState,
  newPlayer: { id: string; name: string; fullName: string }
): GameState {
  const order = game.players.length;
  const players = [...game.players, { ...newPlayer, order }];

  const hands = game.hands.map((h) => {
    if (h.phase === 'complete') {
      return {
        ...h,
        bids: [...h.bids, { playerId: newPlayer.id, bid: 0 }],
        results: [
          ...h.results,
          { playerId: newPlayer.id, bid: 0, tricksTaken: 0, score: 0 },
        ],
      };
    }
    if (h.phase === 'results') {
      return {
        ...h,
        bids: [...h.bids, { playerId: newPlayer.id, bid: 0 }],
      };
    }
    return h;
  });

  return { ...game, players, hands };
}

/**
 * Remove a player from the game and all their score data.
 */
export function removePlayerFromGame(game: GameState, playerId: string): GameState {
  const players = game.players
    .filter((p) => p.id !== playerId)
    .map((p, i) => ({ ...p, order: i }));

  const hands = game.hands.map((h) => ({
    ...h,
    dealerPlayerId:
      h.dealerPlayerId === playerId
        ? players[0]?.id ?? ''
        : h.dealerPlayerId,
    bids: h.bids.filter((b) => b.playerId !== playerId),
    results: h.results.filter((r) => r.playerId !== playerId),
  }));

  return { ...game, players, hands };
}

/**
 * Reorder players. Accepts an array of player IDs in the new order.
 */
export function reorderPlayers(game: GameState, playerIds: string[]): GameState {
  const playerMap = new Map(game.players.map((p) => [p.id, p]));
  const players = playerIds
    .map((id, i) => {
      const p = playerMap.get(id);
      return p ? { ...p, order: i } : null;
    })
    .filter((p): p is Player => p !== null);

  return { ...game, players };
}

/**
 * Build a CompletedGame snapshot from a finished GameState.
 */
export function buildCompletedGame(game: GameState): CompletedGame {
  const scoreboard = computeScoreboard(game);
  const sorted = [...scoreboard].sort((a, b) => b.totalScore - a.totalScore);
  const top = sorted[0];
  return {
    id: crypto.randomUUID(),
    gameId: game.id,
    players: game.players,
    hands: game.hands,
    config: game.config,
    scoreboard,
    winner: { playerId: top.playerId, playerName: top.playerName, totalScore: top.totalScore },
    completedAt: new Date().toISOString(),
    createdAt: game.createdAt,
  };
}

/**
 * Compute per-player stats across multiple completed games.
 */
export function computePlayerStats(games: CompletedGame[]): PlayerStats[] {
  const map = new Map<string, {
    name: string;
    scores: number[];
    wins: number;
    totalHands: number;
    accurateHands: number;
  }>();

  for (const game of games) {
    for (const ps of game.scoreboard) {
      let entry = map.get(ps.playerId);
      if (!entry) {
        entry = { name: ps.playerName, scores: [], wins: 0, totalHands: 0, accurateHands: 0 };
        map.set(ps.playerId, entry);
      }
      entry.name = ps.playerName; // use latest name
      entry.scores.push(ps.totalScore);
      if (ps.playerId === game.winner.playerId) entry.wins++;
      for (const hs of ps.handScores) {
        entry.totalHands++;
        if (hs.score > 0) entry.accurateHands++;
      }
    }
  }

  const stats: PlayerStats[] = [];
  for (const [playerId, e] of map) {
    const gamesPlayed = e.scores.length;
    const totalScore = e.scores.reduce((a, b) => a + b, 0);
    stats.push({
      playerId,
      playerName: e.name,
      gamesPlayed,
      wins: e.wins,
      winRate: gamesPlayed > 0 ? Math.round((e.wins / gamesPlayed) * 100) : 0,
      avgScore: gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0,
      bestScore: Math.max(...e.scores, 0),
      totalScore,
      avgAccuracy: e.totalHands > 0 ? Math.round((e.accurateHands / e.totalHands) * 100) : 0,
    });
  }

  return stats.sort((a, b) => b.winRate - a.winRate || b.avgScore - a.avgScore);
}
