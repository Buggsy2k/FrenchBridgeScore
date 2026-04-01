import { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateScore } from '../models/gameLogic';
import type { TrumpSuit } from '../models/types';

const SUIT_ICONS: Record<TrumpSuit, { icon: string; color: string }> = {
  hearts:   { icon: '♥', color: 'text-red-500' },
  spades:   { icon: '♠', color: 'text-gray-900' },
  diamonds: { icon: '♦', color: 'text-red-500' },
  clubs:    { icon: '♣', color: 'text-gray-900' },
};

export default function Scoreboard() {
  const { game, editCompletedHand } = useGame();
  const [editingHand, setEditingHand] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { bid: number; tricks: number }>>({});
  const [draftTrump, setDraftTrump] = useState<TrumpSuit | ''>('');

  if (!game) return null;

  const completedHands = game.hands.filter((h) => h.phase === 'complete');

  // Build running totals: runningTotals[handIndex][playerId] = cumulative score
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
  const leadScore = lastTotals
    ? Math.max(...game.players.map((p) => lastTotals[p.id] ?? 0))
    : 0;

  function startEditing(h: typeof completedHands[number]) {
    const d: Record<string, { bid: number; tricks: number }> = {};
    for (const r of h.results) {
      d[r.playerId] = { bid: r.bid, tricks: r.tricksTaken };
    }
    setDrafts(d);
    setDraftTrump(h.trumpSuit ?? '');
    setEditingHand(h.handNumber);
  }

  async function saveEdit(h: typeof completedHands[number]) {
    const edits = game!.players.map((p) => ({
      playerId: p.id,
      bid: drafts[p.id]?.bid ?? 0,
      tricksTaken: drafts[p.id]?.tricks ?? 0,
    }));
    await editCompletedHand(h.handNumber, edits, draftTrump || undefined);
    setEditingHand(null);
    setDrafts({});
    setDraftTrump('');
  }

  function updateDraft(playerId: string, field: 'bid' | 'tricks', value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setDrafts((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: num },
    }));
  }

  return (
    <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-3">
      <h3 className="text-xl font-bold text-center">Scoreboard</h3>

      {completedHands.length === 0 ? (
        <p className="text-center text-gray-500 text-sm">No hands completed yet</p>
      ) : (
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
              {completedHands.map((h, i) => {
                const isEditing = editingHand === h.handNumber;

                if (isEditing) {
                  const totalTricks = game.players.reduce((s, p) => s + (drafts[p.id]?.tricks ?? 0), 0);
                  const tricksMatch = totalTricks === h.cardsDealt;
                  return (
                    <tr key={h.handNumber} className="border-b border-blue-500/30 bg-gray-700/30">
                      <td className="py-2 px-1 text-gray-500 align-top w-6 text-center">
                      {h.cardsDealt}
                      <select
                        value={draftTrump}
                        onChange={(e) => setDraftTrump(e.target.value as TrumpSuit | '')}
                        className="block w-full mt-1 bg-gray-600 rounded text-xs text-center py-0.5 border border-gray-500 focus:border-blue-400 outline-none"
                      >
                        <option value="">—</option>
                        <option value="hearts">♥</option>
                        <option value="spades">♠</option>
                        <option value="diamonds">♦</option>
                        <option value="clubs">♣</option>
                      </select>
                    </td>
                      {game.players.map((p) => {
                        const d = drafts[p.id] ?? { bid: 0, tricks: 0 };
                        const pts = calculateScore(d.bid, d.tricks);
                        return (
                          <td key={p.id} className="text-center py-2 px-1 align-top border-l border-gray-700">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={h.cardsDealt}
                                  value={d.bid}
                                  onChange={(e) => updateDraft(p.id, 'bid', e.target.value)}
                                  className="w-8 h-6 text-center text-xs bg-gray-600 rounded border border-gray-500 focus:border-blue-400 outline-none"
                                />
                                <span className="text-gray-500 text-xs">/</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={h.cardsDealt}
                                  value={d.tricks}
                                  onChange={(e) => updateDraft(p.id, 'tricks', e.target.value)}
                                  className="w-8 h-6 text-center text-xs bg-gray-600 rounded border border-gray-500 focus:border-blue-400 outline-none"
                                />
                              </div>
                              <span className={`text-xs ${pts > 0 ? 'text-green-400/70' : 'text-red-400/50'}`}>
                                {pts > 0 ? `+${pts}` : '0'}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-1 align-top">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => saveEdit(h)}
                            disabled={!tricksMatch}
                            className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setEditingHand(null); setDrafts({}); setDraftTrump(''); }}
                            className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 font-medium transition"
                          >
                            ✗
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={h.handNumber}
                    className="border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/30 transition"
                    onClick={() => startEditing(h)}
                  >
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Trump suit tally */}
      {completedHands.length > 0 && (() => {
        const counts: Record<TrumpSuit, number> = { hearts: 0, spades: 0, diamonds: 0, clubs: 0 };
        for (const h of completedHands) {
          if (h.trumpSuit) counts[h.trumpSuit]++;
        }
        const hasTrump = Object.values(counts).some((c) => c > 0);
        if (!hasTrump) return null;
        return (
          <div className="flex justify-center gap-4">
            {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) => (
              <span key={suit} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded bg-gray-600 text-lg leading-none ${SUIT_ICONS[suit].color}`}>
                  {SUIT_ICONS[suit].icon}
                </span>
                <span className="text-gray-400 text-sm">{counts[suit]}</span>
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
