import { useGame } from '../context/GameContext';
import Scoreboard from './Scoreboard';

export default function GameOver() {
  const { game, scoreboard, resetGame } = useGame();
  if (!game) return null;

  const sorted = [...scoreboard].sort((a, b) => b.totalScore - a.totalScore);

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

          <button
            onClick={resetGame}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xl font-bold transition"
          >
            New Game
          </button>
        </div>

        {/* Detailed scoreboard */}
        <Scoreboard />
      </div>
    </div>
  );
}
