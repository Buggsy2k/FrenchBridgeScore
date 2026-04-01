import { useState } from 'react';
import { useGame } from '../context/GameContext';
import BiddingForm from './BiddingForm';
import ResultsForm from './ResultsForm';
import Scoreboard from './Scoreboard';

export default function ScorekeeperPanel() {
  const { game, submitBids, submitResults, updatePlayerNames } = useGame();
  const [editingNames, setEditingNames] = useState(false);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  if (!game) return null;

  const currentHand = game.hands[game.currentHandIndex];
  const totalHands = game.hands.length;
  const handsRemaining = totalHands - game.currentHandIndex - (currentHand.phase === 'complete' ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-3 sm:p-4 lg:justify-center">
      {/* Left panel: current hand input */}
      <div className="flex-1 max-w-lg mx-auto w-full lg:flex-initial">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 relative">
          {/* Edit names icon */}
          {editingNames ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-400 font-medium">Edit Names</div>
              {game.players.map((p) => (
                <input
                  key={p.id}
                  type="text"
                  value={draftNames[p.id] ?? p.name}
                  onChange={(e) =>
                    setDraftNames((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-gray-700 text-white text-center text-sm"
                />
              ))}
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingNames(false); setDraftNames({}); }}
                  className="flex-1 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const changes: Record<string, string> = {};
                    for (const [id, name] of Object.entries(draftNames)) {
                      if (name.trim() && name !== game.players.find((p) => p.id === id)?.name) {
                        changes[id] = name.trim();
                      }
                    }
                    if (Object.keys(changes).length > 0) {
                      await updatePlayerNames(changes);
                    }
                    setEditingNames(false);
                    setDraftNames({});
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNames(true)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-300 transition"
              title="Edit player names"
            >
              ✏️
            </button>
          )}

          {/* Hand header */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Hand {currentHand.handNumber}{' '}
              <span className="text-gray-400 text-lg font-normal">of {totalHands} ({handsRemaining} remain)</span>
            </h2>
            <p className="text-lg text-blue-400 font-semibold">
              {currentHand.cardsDealt} card{currentHand.cardsDealt !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Phase-specific form */}
          {currentHand.phase === 'bidding' && (
            <BiddingForm
              hand={currentHand}
              players={game.players}
              onSubmit={submitBids}
            />
          )}
          {currentHand.phase === 'results' && (
            <ResultsForm
              hand={currentHand}
              players={game.players}
              onSubmit={submitResults}
            />
          )}
        </div>
      </div>

      {/* Right panel: persistent scoreboard */}
      <div className="lg:w-96 w-full max-w-lg mx-auto lg:mx-0 lg:flex-initial">
        <Scoreboard />
      </div>
    </div>
  );
}
