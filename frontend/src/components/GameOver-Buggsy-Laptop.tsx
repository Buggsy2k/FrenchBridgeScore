import { useState } from 'react';
import { useGame } from '../context/GameContext';
import Scoreboard from './Scoreboard';

export default function GameOver() {
  const { game, scoreboard, resetGame, saveCurrentGame, completedGames } = useGame();
  const [saved, setSaved] = useState(false);

  if (!game) return null;

  // Check if this game was already saved (by gameId match)
  const alreadySaved = saved || completedGames.some((g) => g.gameId === game.id);

  const sorted = [...scoreboard].sort((a, b) => b.totalScore - a.totalScore);

  async function handleSave() {
    await saveCurrentGame();
    setSaved(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-center">🏆 Game Over</h1>

          {/* Final standings */}
          <div className="space-y-2">
            {sorted.map((ps, rank) => {
              const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
              return (
                <div
                  key={ps.playerId}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xl ${
                    rank === 0
                      ? 'bg-yellow-900/30 border-2 border-yellow-500/50'
                      : 'bg-gray-700/40'
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

          <div className="flex flex-col gap-3">
            {!alreadySaved ? (
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-xl font-bold transition"
              >
                Save Results
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl bg-gray-700 text-center text-gray-400 text-xl font-bold">
                ✓ Saved
              </div>
            )}
            <button
              onClick={resetGame}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xl font-bold transition"
            >
              New Game
            </button>
          </div>
        </div>

        {/* Detailed scoreboard */}
        <Scoreboard />
      </div>
    </div>
  );
}
