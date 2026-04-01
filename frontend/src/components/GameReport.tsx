import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import type { CompletedGame, TrumpSuit, PlayerScore } from '../models/types';

const SUIT_ICONS: Record<TrumpSuit, { icon: string; color: string }> = {
  hearts:   { icon: '♥', color: 'text-red-500' },
  spades:   { icon: '♠', color: 'text-gray-900' },
  diamonds: { icon: '♦', color: 'text-red-500' },
  clubs:    { icon: '♣', color: 'text-gray-900' },
};

type Tab = 'games' | 'stats';

interface Props {
  onBack: () => void;
}

export default function GameReport({ onBack }: Props) {
  const { completedGames, playerStats, deleteHistoryGame } = useGame();
  const [tab, setTab] = useState<Tab>('games');
  const [viewingGame, setViewingGame] = useState<CompletedGame | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...completedGames].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [completedGames]
  );

  // Combined suit stats across all games
  const suitStats = useMemo(() => {
    const counts: Record<TrumpSuit, number> = { hearts: 0, spades: 0, diamonds: 0, clubs: 0 };
    const wins: Record<TrumpSuit, Record<string, number>> = {
      hearts: {}, spades: {}, diamonds: {}, clubs: {},
    };
    let totalHands = 0;

    for (const game of completedGames) {
      for (const hand of game.hands) {
        if (hand.trumpSuit && hand.phase === 'complete') {
          counts[hand.trumpSuit]++;
          totalHands++;
          // Find who won this hand (highest score)
          let bestPlayer = '';
          let bestScore = -1;
          for (const r of hand.results) {
            if (r.score > bestScore) { bestScore = r.score; bestPlayer = r.playerId; }
          }
          if (bestPlayer && bestScore > 0) {
            wins[hand.trumpSuit][bestPlayer] = (wins[hand.trumpSuit][bestPlayer] ?? 0) + 1;
          }
        }
      }
    }

    // Per-player accuracy by suit
    const playerBySuit: Record<TrumpSuit, Record<string, { accurate: number; total: number }>> = {
      hearts: {}, spades: {}, diamonds: {}, clubs: {},
    };
    for (const game of completedGames) {
      for (const hand of game.hands) {
        if (hand.trumpSuit && hand.phase === 'complete') {
          for (const r of hand.results) {
            const entry = playerBySuit[hand.trumpSuit][r.playerId] ??= { accurate: 0, total: 0 };
            entry.total++;
            if (r.bid === r.tricksTaken) entry.accurate++;
          }
        }
      }
    }

    return { counts, totalHands, wins, playerBySuit };
  }, [completedGames]);

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteHistoryGame(id);
      setConfirmDeleteId(null);
      if (viewingGame?.id === id) setViewingGame(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  // If viewing a single game detail
  if (viewingGame) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <button onClick={() => setViewingGame(null)} className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            ← Back to Games
          </button>
          <GameDetail game={viewingGame} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Reports</h1>
          <div className="w-16" />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setTab('games')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition ${
              tab === 'games' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Games ({sorted.length})
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`flex-1 py-2 rounded-lg text-center font-semibold transition ${
              tab === 'stats' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Stats
          </button>
        </div>

        {/* Content */}
        {tab === 'games' && (
          sorted.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-lg">
              No saved games yet. Finish a game and tap "Save Results" to see it here.
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onView={() => setViewingGame(game)}
                  onDelete={() => handleDelete(game.id)}
                  confirmDelete={confirmDeleteId === game.id}
                />
              ))}
            </div>
          )
        )}

        {tab === 'stats' && (
          completedGames.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-lg">
              No stats yet. Save some completed games first.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Suit overview */}
              <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
                <h2 className="text-lg font-bold text-center">Trump Suits</h2>
                <div className="text-center text-gray-400 text-sm">
                  {suitStats.totalHands} hands across {completedGames.length} game{completedGames.length !== 1 ? 's' : ''}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => {
                    const count = suitStats.counts[suit];
                    const pct = suitStats.totalHands > 0 ? Math.round((count / suitStats.totalHands) * 100) : 0;
                    return (
                      <div key={suit} className="bg-gray-700/40 rounded-xl p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded bg-gray-600 text-xl leading-none ${SUIT_ICONS[suit].color}`}>
                          {SUIT_ICONS[suit].icon}
                        </span>
                        <div className="text-lg font-bold mt-1">{count}</div>
                        <div className="text-gray-500 text-xs">{pct}%</div>
                      </div>
                    );
                  })}
                </div>

                {/* Best accuracy by suit */}
                <div className="space-y-1 pt-1">
                  <div className="text-sm text-gray-400 font-medium">Best accuracy by suit</div>
                  {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => {
                    const entries = Object.entries(suitStats.playerBySuit[suit]);
                    if (entries.length === 0) return null;
                    const best = entries.reduce((a, b) =>
                      (b[1].total > 0 && b[1].accurate / b[1].total > (a[1].total > 0 ? a[1].accurate / a[1].total : -1)) ? b : a
                    );
                    const playerName = completedGames.flatMap((g) => g.players).find((p) => p.id === best[0])?.name ?? '?';
                    const acc = best[1].total > 0 ? Math.round((best[1].accurate / best[1].total) * 100) : 0;
                    return (
                      <div key={suit} className="flex items-center gap-2 text-sm">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded bg-gray-600 text-sm leading-none ${SUIT_ICONS[suit].color}`}>
                          {SUIT_ICONS[suit].icon}
                        </span>
                        <span className="font-semibold">{playerName}</span>
                        <span className="text-gray-500">{acc}% ({best[1].accurate}/{best[1].total})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Player stats */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-center">Player Performance</h2>
                {playerStats.map((ps) => (
                  <div key={ps.playerId} className="bg-gray-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">{ps.playerName}</span>
                      <span className="text-gray-400 text-sm">{ps.gamesPlayed} game{ps.gamesPlayed !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBox label="Wins" value={`${ps.wins}`} sub={`${ps.winRate}%`} highlight={ps.wins > 0} />
                      <StatBox label="Avg Score" value={`${ps.avgScore}`} />
                      <StatBox label="Best Score" value={`${ps.bestScore}`} />
                      <StatBox label="Accuracy" value={`${ps.avgAccuracy}%`} sub="bid = took" />
                    </div>

                    {/* Per-suit accuracy for this player */}
                    <div className="flex justify-center gap-3">
                      {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => {
                        const entry = suitStats.playerBySuit[suit][ps.playerId];
                        if (!entry || entry.total === 0) return null;
                        const acc = Math.round((entry.accurate / entry.total) * 100);
                        return (
                          <div key={suit} className="flex items-center gap-1 text-sm">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded bg-gray-600 text-sm leading-none ${SUIT_ICONS[suit].color}`}>
                              {SUIT_ICONS[suit].icon}
                            </span>
                            <span className="text-gray-400">{acc}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ─── Game List Card ─── */

function GameCard({
  game,
  onView,
  onDelete,
  confirmDelete,
}: {
  game: CompletedGame;
  onView: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
}) {
  const d = new Date(game.completedAt);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const suitCounts: Partial<Record<TrumpSuit, number>> = {};
  for (const h of game.hands) {
    if (h.trumpSuit) suitCounts[h.trumpSuit] = (suitCounts[h.trumpSuit] ?? 0) + 1;
  }

  return (
    <div className="bg-gray-800 rounded-2xl overflow-hidden">
      <button onClick={onView} className="w-full px-4 py-3 text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">
              🏆 {game.winner.playerName} — {game.winner.totalScore}pts
            </div>
            <div className="text-gray-400 text-sm">
              {date} at {time} · {game.players.length} players · {game.hands.length} hands
            </div>
          </div>
          <span className="text-gray-500 text-xl">→</span>
        </div>

        {/* Mini suit tally */}
        {Object.keys(suitCounts).length > 0 && (
          <div className="flex gap-2 mt-1">
            {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) =>
              suitCounts[suit] ? (
                <span key={suit} className="flex items-center gap-0.5 text-sm">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded bg-gray-600 text-sm leading-none ${SUIT_ICONS[suit].color}`}>
                    {SUIT_ICONS[suit].icon}
                  </span>
                  <span className="text-gray-500">{suitCounts[suit]}</span>
                </span>
              ) : null
            )}
          </div>
        )}
      </button>
      <div className="px-4 pb-3">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
            confirmDelete
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
          }`}
        >
          {confirmDelete ? 'Tap Again to Delete' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

/* ─── Full Game Detail (read-only scoreboard) ─── */

function GameDetail({ game }: { game: CompletedGame }) {
  const sorted = [...game.scoreboard].sort((a, b) => b.totalScore - a.totalScore);

  // Build running totals
  const completedHands = game.hands.filter((h) => h.phase === 'complete');
  const runningTotals = useMemo(() => {
    const totals: Record<string, number>[] = [];
    const cumulative: Record<string, number> = {};
    for (const p of game.players) cumulative[p.id] = 0;
    for (const h of completedHands) {
      for (const r of h.results) {
        cumulative[r.playerId] = (cumulative[r.playerId] ?? 0) + r.score;
      }
      totals.push({ ...cumulative });
    }
    return totals;
  }, [game.players, completedHands]);

  const lastTotals = runningTotals[runningTotals.length - 1];
  const leadScore = lastTotals ? Math.max(...game.players.map((p) => lastTotals[p.id] ?? 0)) : 0;

  const d = new Date(game.completedAt);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  // suit counts
  const suitCounts: Record<TrumpSuit, number> = { hearts: 0, spades: 0, diamonds: 0, clubs: 0 };
  for (const h of completedHands) { if (h.trumpSuit) suitCounts[h.trumpSuit]++; }

  return (
    <div className="space-y-4">
      {/* Header with date */}
      <div className="text-center text-gray-400 text-sm">{date} at {time}</div>

      {/* Final standings */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
        {sorted.map((ps, rank) => {
          const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
          return (
            <div
              key={ps.playerId}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-xl ${
                rank === 0 ? 'bg-yellow-900/30 border-2 border-yellow-500/50' : 'bg-gray-700/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8">{medal || `${rank + 1}.`}</span>
                <span className="font-bold">{ps.playerName}</span>
              </div>
              <span className="text-3xl font-bold tabular-nums">{ps.totalScore}</span>
            </div>
          );
        })}
      </div>

      {/* Player accuracy breakdown */}
      <PlayerAccuracyTable scoreboard={sorted} hands={completedHands} />

      {/* Full hand-by-hand scoreboard */}
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-3">
        <h3 className="text-xl font-bold text-center">Scoreboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-gray-400 align-bottom h-24 pb-2">
                  <div className="flex items-end justify-center h-full">
                    <span className="rotate-180 whitespace-nowrap text-sm" style={{ writingMode: 'vertical-rl' }}>Cards</span>
                  </div>
                </th>
                {game.players.map((p) => {
                  const isLeader = lastTotals && lastTotals[p.id] === leadScore && leadScore > 0;
                  return (
                    <th
                      key={p.id}
                      className={`align-bottom h-24 border-l border-gray-700 pb-2 ${
                        isLeader ? 'text-yellow-400' : 'text-gray-400'
                      }`}
                    >
                      <div className="flex items-end justify-center h-full">
                        <span className="rotate-180 whitespace-nowrap text-sm" style={{ writingMode: 'vertical-rl' }}>
                          {p.name}{isLeader ? ' ★' : ''}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {completedHands.map((h, i) => (
                <tr key={h.handNumber} className="border-b border-gray-700/50">
                  <td className="py-0.5 px-1 text-gray-500 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{h.cardsDealt}</span>
                      {h.trumpSuit ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded bg-gray-600 text-lg leading-none ${SUIT_ICONS[h.trumpSuit].color}`}>
                          {SUIT_ICONS[h.trumpSuit].icon}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-600 text-lg leading-none text-gray-500">?</span>
                      )}
                    </div>
                  </td>
                  {game.players.map((p) => {
                    const r = h.results.find((x) => x.playerId === p.id);
                    const total = runningTotals[i]?.[p.id] ?? 0;
                    const made = r ? r.bid === r.tricksTaken : false;
                    return (
                      <td key={p.id} className="text-center py-0.5 px-1 border-l border-gray-700">
                        <div className="flex flex-col items-center leading-none">
                          {r && (
                            <span className="text-lg leading-none">
                              {made ? (
                                <span className="text-green-400/70">{r.score}</span>
                              ) : (
                                <span className="text-red-400/50 line-through">{r.bid}</span>
                              )}
                            </span>
                          )}
                          <span className="font-bold text-lg leading-none tabular-nums">{total}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trump suit tally */}
        {Object.values(suitCounts).some((c) => c > 0) && (
          <div className="flex justify-center gap-4">
            {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => (
              <span key={suit} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded bg-gray-600 text-lg leading-none ${SUIT_ICONS[suit].color}`}>
                  {SUIT_ICONS[suit].icon}
                </span>
                <span className="text-gray-400 text-sm">{suitCounts[suit]}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Per-player accuracy table within a single game ─── */

function PlayerAccuracyTable({ scoreboard, hands }: { scoreboard: PlayerScore[]; hands: CompletedGame['hands'] }) {
  // Per-player: accuracy, avg bid, avg tricks, zero-bid success
  const details = useMemo(() => {
    return scoreboard.map((ps) => {
      const hs = ps.handScores;
      const accurate = hs.filter((h) => h.score > 0).length;
      const zeroBids = hs.filter((h) => h.bid === 0);
      const zeroMade = zeroBids.filter((h) => h.score > 0).length;
      const avgBid = hs.length > 0 ? (hs.reduce((s, h) => s + h.bid, 0) / hs.length) : 0;
      const avgTricks = hs.length > 0 ? (hs.reduce((s, h) => s + h.tricksTaken, 0) / hs.length) : 0;

      // Per-suit accuracy
      const suitAcc: Partial<Record<TrumpSuit, { accurate: number; total: number }>> = {};
      for (const hand of hands) {
        if (!hand.trumpSuit || hand.phase !== 'complete') continue;
        const r = hand.results.find((x) => x.playerId === ps.playerId);
        if (!r) continue;
        const entry = suitAcc[hand.trumpSuit] ??= { accurate: 0, total: 0 };
        entry.total++;
        if (r.bid === r.tricksTaken) entry.accurate++;
      }

      return {
        playerId: ps.playerId,
        playerName: ps.playerName,
        totalScore: ps.totalScore,
        hands: hs.length,
        accurate,
        accuracy: hs.length > 0 ? Math.round((accurate / hs.length) * 100) : 0,
        avgBid: avgBid.toFixed(1),
        avgTricks: avgTricks.toFixed(1),
        zeroBids: zeroBids.length,
        zeroMade,
        suitAcc,
      };
    });
  }, [scoreboard, hands]);

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
      <h3 className="text-lg font-bold text-center">Performance</h3>
      {details.map((d) => (
        <div key={d.playerId} className="bg-gray-700/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold">{d.playerName}</span>
            <span className="text-gray-400 text-sm">{d.accuracy}% accurate</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-gray-500 text-xs">Avg Bid</div>
              <div className="font-semibold">{d.avgBid}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Avg Took</div>
              <div className="font-semibold">{d.avgTricks}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Zero Bids</div>
              <div className="font-semibold">{d.zeroMade}/{d.zeroBids}</div>
            </div>
          </div>
          {/* Suit accuracy row */}
          <div className="flex justify-center gap-3">
            {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => {
              const e = d.suitAcc[suit];
              if (!e || e.total === 0) return null;
              const acc = Math.round((e.accurate / e.total) * 100);
              return (
                <div key={suit} className="flex items-center gap-1 text-sm">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded bg-gray-600 text-sm leading-none ${SUIT_ICONS[suit].color}`}>
                    {SUIT_ICONS[suit].icon}
                  </span>
                  <span className="text-gray-400">{acc}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${highlight ? 'bg-yellow-900/30' : 'bg-gray-700/40'}`}>
      <div className="text-gray-400 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  );
}
