import { useState, useRef, useMemo, useCallback } from 'react';
import type { Player, Hand } from '../models/types';
import { calculateScore } from '../models/gameLogic';
import DigitInputRow from './DigitInputRow';

interface ResultsFormProps {
  hand: Hand;
  players: Player[];
  onSubmit: (results: { playerId: string; tricksTaken: number }[]) => void;
}

export default function ResultsForm({ hand, players, onSubmit }: ResultsFormProps) {
  const [values, setValues] = useState<Record<string, number | null>>(
    () => Object.fromEntries(players.map((p) => [p.id, null]))
  );
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  const sayNope = useCallback(() => {
    // Vibrate as haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }
    // Try speech synthesis as well
    try {
      const u = new SpeechSynthesisUtterance('Nope');
      u.rate = 1.1;
      u.pitch = 1.4;
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find((v) => /female|woman|zira|samantha|karen|fiona/i.test(v.name));
      if (femaleVoice) u.voice = femaleVoice;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      // Speech not available — vibration is enough
    }
  }, []);

  const allFilled = players.every((p) => values[p.id] !== null && values[p.id] !== undefined);
  const totalTricks = useMemo(
    () => players.reduce((s, p) => s + (values[p.id] ?? 0), 0),
    [players, values]
  );
  const tricksMatch = totalTricks === hand.cardsDealt;

  function handleChange(playerId: string, value: number) {
    setValues((prev) => ({ ...prev, [playerId]: value as number | null }));
  }

  function handleSubmit() {
    if (!allFilled || !tricksMatch) return;
    const results = players.map((p) => ({
      playerId: p.id,
      tricksTaken: values[p.id]!,
    }));
    onSubmit(results);
  }

  const rightLabels = useMemo(
    () => Object.fromEntries(
      players.map((p) => {
        const bid = hand.bids.find((b) => b.playerId === p.id)?.bid ?? 0;
        return [p.id, (
          <span className="text-2xl sm:text-3xl font-bold text-blue-400 w-10 text-center" title="Bid">
            {bid}
          </span>
        )];
      })
    ),
    [players, hand.bids]
  );

  return (
    <div className="space-y-4">
      <DigitInputRow
        players={players}
        values={values}
        maxValue={hand.cardsDealt}
        totalBudget={hand.cardsDealt}
        onChange={handleChange}
        onReject={sayNope}
        autoFocus
        nextFocusRef={submitBtnRef}
        rightLabels={rightLabels}
        dealerPlayerId={hand.dealerPlayerId}
        dealerSuit={hand.trumpSuit}
      />

      {/* Tricks total + score preview */}
      <div className="space-y-2">
        <div className="text-center text-lg">
          <span className="text-gray-400">Tricks taken: </span>
          <span className={`font-bold ${tricksMatch ? 'text-green-400' : 'text-red-400'}`}>
            {totalTricks}
          </span>
          <span className="text-gray-500"> / {hand.cardsDealt}</span>
          {!tricksMatch && allFilled && (
            <span className="text-red-400 text-sm ml-2">
              — {Math.abs(totalTricks - hand.cardsDealt)} {totalTricks > hand.cardsDealt ? 'over' : 'short'}
            </span>
          )}
        </div>

        {/* Score preview */}
        {allFilled && (
          <div className="bg-gray-800/60 rounded-xl p-3 space-y-1">
            <div className="text-sm text-gray-400 font-medium mb-1">Score preview:</div>
            {players.map((p) => {
              const bid = hand.bids.find((b) => b.playerId === p.id)?.bid ?? 0;
              const tricks = values[p.id]!;
              const pts = calculateScore(bid, tricks);
              const made = bid === tricks;
              return (
                <div key={p.id} className="flex justify-between text-base px-1">
                  <span className="font-semibold">{p.name}</span>
                  <span>
                    <span className="text-gray-400 text-sm mr-2">
                      wanted {bid} / took {tricks}
                    </span>
                    <span
                      className={`font-bold text-lg ${made ? 'text-green-400' : 'text-red-400/70'}`}
                    >
                      {made ? `+${pts}` : '0'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        ref={submitBtnRef}
        onClick={handleSubmit}
        disabled={!allFilled || !tricksMatch}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold transition"
      >
        Submit Results
      </button>
    </div>
  );
}
