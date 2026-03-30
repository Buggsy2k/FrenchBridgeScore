import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { CompletedGame, TrumpSuit } from '../models/types';

const SUIT_ICONS: Record<TrumpSuit, { icon: string; color: string }> = {
  hearts: { icon: '♥', color: 'text-red-500' },
  spades: { icon: '♠', color: 'text-gray-900' },
  diamonds: { icon: '♦', color: 'text-red-500' },
  clubs: { icon: '♣', color: 'text-gray-900' },
};

interface Props {
  onBack: () => void;
  onStats: () => void;
}

export default function GameHistory({ onBack, onStats }: Props) {
  const { completedGames, deleteHistoryGame } = useGame();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = [...completedGames].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteHistoryGame(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Game History</h1>
          <button onClick={onStats} className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            Stats →
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-lg">
            No saved games yet. Finish a game and tap "Save Results" to see it here.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                expanded={expandedId === game.id}
                onToggle={() => setExpandedId(expandedId === game.id ? null : game.id)}
                onDelete={() => handleDelete(game.id)}
                confirmDelete={confirmDeleteId === game.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  expanded,
  onToggle,
  onDelete,
  confirmDelete,
}: {
  game: CompletedGame;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
}) {
  const sorted = [...game.scoreboard].sort((a, b) => b.totalScore - a.totalScore);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  // Count trump suits
  const suitCounts: Partial<Record<TrumpSuit, number>> = {};
  for (const h of game.hands) {
    if (h.trumpSuit) {
      suitCounts[h.trumpSuit] = (suitCounts[h.trumpSuit] ?? 0) + 1;
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div>
          <div className="text-lg font-bold">
            🏆 {game.winner.playerName} — {game.winner.totalScore}pts
          </div>
          <div className="text-gray-400 text-sm">
            {formatDate(game.completedAt)} at {formatTime(game.completedAt)} · {game.players.length} players · {game.hands.length} hands
          </div>
        </div>
        <span className="text-gray-500 text-xl">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Standings */}
          <div className="space-y-1">
            {sorted.map((ps, rank) => {
              const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
              return (
                <div
                  key={ps.playerId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-lg ${
                    rank === 0 ? 'bg-yellow-900/30' : 'bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7">{medal || `${rank + 1}.`}</span>
                    <span className="font-semibold">{ps.playerName}</span>
                  </div>
                  <span className="font-bold tabular-nums">{ps.totalScore}</span>
                </div>
              );
            })}
          </div>

          {/* Trump suit tally */}
          {Object.keys(suitCounts).length > 0 && (
            <div className="flex justify-center gap-3">
              {(['hearts', 'spades', 'diamonds', 'clubs'] as TrumpSuit[]).map((suit) =>
                suitCounts[suit] ? (
                  <span key={suit} className="flex items-center gap-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded bg-gray-600 text-lg leading-none ${SUIT_ICONS[suit].color}`}>
                      {SUIT_ICONS[suit].icon}
                    </span>
                    <span className="text-gray-400 text-sm">{suitCounts[suit]}</span>
                  </span>
                ) : null
              )}
            </div>
          )}

          {/* Delete button */}
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
      )}
    </div>
  );
}
