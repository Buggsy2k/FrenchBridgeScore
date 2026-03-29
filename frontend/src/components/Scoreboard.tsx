import { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateScore } from '../models/gameLogic';

export default function Scoreboard() {
  const { game, editCompletedHand } = useGame();
  const [editingHand, setEditingHand] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { bid: number; tricks: number }>>({});

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
    setEditingHand(h.handNumber);
  }

  async function saveEdit(h: typeof completedHands[number]) {
    const edits = game!.players.map((p) => ({
      playerId: p.id,
      bid: drafts[p.id]?.bid ?? 0,
      tricksTaken: drafts[p.id]?.tricks ?? 0,
    }));
    await editCompletedHand(h.handNumber, edits);
    setEditingHand(null);
    setDrafts({});
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-1 px-1 text-gray-400">Cards</th>
                {game.players.map((p) => {
                  const isLeader = lastTotals && lastTotals[p.id] === leadScore && leadScore > 0;
                  return (
                    <th
                      key={p.id}
                      className={`text-center py-1 px-1 truncate max-w-[5rem] ${
                        isLeader ? 'text-yellow-400' : 'text-gray-400'
                      }`}
                    >
                      {p.name}{isLeader ? ' ★' : ''}
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
                      <td className="py-2 px-1 text-gray-500 align-top">{h.cardsDealt}</td>
                      {game.players.map((p) => {
                        const d = drafts[p.id] ?? { bid: 0, tricks: 0 };
                        const pts = calculateScore(d.bid, d.tricks);
                        return (
                          <td key={p.id} className="text-center py-2 px-1 align-top">
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
                            onClick={() => { setEditingHand(null); setDrafts({}); }}
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
                    <td className="py-1 px-1 text-gray-500">{h.cardsDealt}</td>
                    {game.players.map((p) => {
                      const r = h.results.find((x) => x.playerId === p.id);
                      const total = runningTotals[i]?.[p.id] ?? 0;
                      const made = r ? r.bid === r.tricksTaken : false;
                      return (
                        <td key={p.id} className="text-center py-1 px-1">
                          {r && (
                            <div className="text-xs leading-tight">
                              {made ? (
                                <span className="text-green-400/70">{r.score}</span>
                              ) : (
                                <>
                                  <span className="text-red-400/50 line-through">{r.bid}</span>
                                  <span className="text-red-400/50 ml-0.5">{r.tricksTaken}</span>
                                </>
                              )}
                            </div>
                          )}
                          <span className="font-bold tabular-nums">{total}</span>
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
    </div>
  );
}
