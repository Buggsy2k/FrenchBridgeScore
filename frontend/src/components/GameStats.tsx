import { useGame } from '../context/GameContext';

interface Props {
  onBack: () => void;
}

export default function GameStats({ onBack }: Props) {
  const { playerStats, completedGames } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300 text-lg font-semibold">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Player Stats</h1>
          <div className="w-16" />
        </div>

        <div className="text-center text-gray-400 text-sm">
          {completedGames.length} game{completedGames.length !== 1 ? 's' : ''} recorded
        </div>

        {playerStats.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-lg">
            No stats yet. Save some completed games first.
          </div>
        ) : (
          <div className="space-y-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
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
