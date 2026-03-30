import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { TrumpSuit } from '../models/types';
import BiddingForm from './BiddingForm';
import ResultsForm from './ResultsForm';
import Scoreboard from './Scoreboard';
import EditPlayersDialog from './EditPlayersDialog';

const SUITS: { value: TrumpSuit; icon: string; color: string }[] = [
  { value: 'hearts', icon: '♥', color: 'text-red-500' },
  { value: 'spades', icon: '♠', color: 'text-gray-900' },
  { value: 'diamonds', icon: '♦', color: 'text-red-500' },
  { value: 'clubs', icon: '♣', color: 'text-gray-900' },
];

export default function ScorekeeperPanel() {
  const { game, submitBids, submitResults, setCurrentTrumpSuit } = useGame();
  const [showEditPlayers, setShowEditPlayers] = useState(false);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [totalBid, setTotalBid] = useState<number | null>(null);
  if (!game) return null;

  const currentHand = game.hands[game.currentHandIndex];
  const totalHands = game.hands.length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-3 sm:p-4 lg:justify-center">
      {/* Left panel: current hand input */}
      <div className="flex-1 max-w-lg mx-auto w-full lg:flex-initial">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 relative">
          <button
            onClick={() => setShowEditPlayers(true)}
            className="absolute top-3 right-3 text-gray-600 hover:text-gray-300 transition"
            title="Edit players"
          >
            ✏️
          </button>

          {/* Hand header */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Hand {currentHand.handNumber}{' '}
              <span className="text-gray-400 text-lg font-normal">of {totalHands}</span>
            </h2>
            <div className="flex items-center justify-center gap-4 mt-1">
              <span className="text-lg text-blue-400 font-semibold">
                {currentHand.cardsDealt} card{currentHand.cardsDealt !== 1 ? 's' : ''}
              </span>
              {currentHand.phase === 'bidding' && totalBid !== null && (
                <>
                  <span className="text-lg text-white">—</span>
                  <span className={`text-lg font-semibold ${
                    totalBid === currentHand.cardsDealt ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {totalBid === currentHand.cardsDealt
                      ? 'Even Bid'
                      : totalBid > currentHand.cardsDealt
                        ? `${totalBid - currentHand.cardsDealt} Overbid`
                        : `${currentHand.cardsDealt - totalBid} Underbid`}
                  </span>
                </>
              )}
              {currentHand.phase === 'results' && (() => {
                const tb = currentHand.bids.reduce((s, b) => s + b.bid, 0);
                return (
                  <>
                    <span className="text-lg text-white">—</span>
                    <span className={`text-lg font-semibold ${
                      tb === currentHand.cardsDealt ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tb === currentHand.cardsDealt
                        ? 'Even Bid'
                        : tb > currentHand.cardsDealt
                          ? `${tb - currentHand.cardsDealt} Overbid`
                          : `${currentHand.cardsDealt - tb} Underbid`}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Trump suit display/picker (results phase) */}
            {currentHand.phase === 'results' && (
              <div className="flex items-center justify-center mt-2">
                {showSuitPicker ? (
                  <div className="flex items-center gap-3">
                    {SUITS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCurrentTrumpSuit(s.value);
                          setShowSuitPicker(false);
                        }}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition ${
                          currentHand.trumpSuit === s.value
                            ? 'bg-blue-600 ring-2 ring-blue-400'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <span className={s.color}>{s.icon}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSuitPicker(true)}
                    className="w-10 h-10 rounded-lg text-xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition"
                  >
                    {currentHand.trumpSuit ? (
                      <span className={SUITS.find((s) => s.value === currentHand.trumpSuit)!.color}>
                        {SUITS.find((s) => s.value === currentHand.trumpSuit)!.icon}
                      </span>
                    ) : (
                      <span className="text-gray-500">?</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phase-specific form */}
          {currentHand.phase === 'bidding' && (
            <BiddingForm
              hand={currentHand}
              players={game.players}
              onSubmit={submitBids}
              onTotalBidChange={setTotalBid}
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

      {showEditPlayers && (
        <EditPlayersDialog onClose={() => setShowEditPlayers(false)} />
      )}
    </div>
  );
}
