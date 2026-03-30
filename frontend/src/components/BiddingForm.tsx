import { useState, useRef, useMemo, useEffect } from 'react';
import type { Player, Hand, TrumpSuit } from '../models/types';
import DigitInputRow from './DigitInputRow';

const SUITS: { value: TrumpSuit; icon: string; color: string }[] = [
  { value: 'hearts', icon: '♥', color: 'text-red-500' },
  { value: 'spades', icon: '♠', color: 'text-gray-900' },
  { value: 'diamonds', icon: '♦', color: 'text-red-500' },
  { value: 'clubs', icon: '♣', color: 'text-gray-900' },
];

interface BiddingFormProps {
  hand: Hand;
  players: Player[];
  onSubmit: (bids: { playerId: string; bid: number }[], trumpSuit?: TrumpSuit) => void;
  onTotalBidChange?: (total: number) => void;
}

export default function BiddingForm({ hand, players, onSubmit, onTotalBidChange }: BiddingFormProps) {
  const [values, setValues] = useState<Record<string, number | null>>(
    () => Object.fromEntries(players.map((p) => [p.id, null]))
  );
  const [showSummary, setShowSummary] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<TrumpSuit | null>(null);
  const lockBtnRef = useRef<HTMLButtonElement | null>(null);

  const allFilled = players.every((p) => values[p.id] !== null && values[p.id] !== undefined);
  const totalBid = useMemo(
    () => players.reduce((s, p) => s + (values[p.id] ?? 0), 0),
    [players, values]
  );

  useEffect(() => {
    onTotalBidChange?.(totalBid);
  }, [totalBid, onTotalBidChange]);

  function handleChange(playerId: string, value: number) {
    setValues((prev) => ({ ...prev, [playerId]: value as number | null }));
  }

  function handleLock() {
    if (!allFilled) return;
    const bids = players.map((p) => ({ playerId: p.id, bid: values[p.id]! }));
    onSubmit(bids, trumpSuit ?? undefined);
  }

  // Auto-focus the lock button when summary is shown
  useEffect(() => {
    if (showSummary && allFilled) {
      lockBtnRef.current?.focus();
    }
  }, [showSummary, allFilled]);

  // Summary view (flip-the-screen)
  if (showSummary && allFilled) {
    const bidsMatch = totalBid === hand.cardsDealt;
    return (
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-xl p-4 space-y-2">
          {players.map((p) => (
            <div key={p.id} className="flex justify-between text-2xl font-semibold px-2">
              <span>{p.name}</span>
              <span className="text-3xl">{values[p.id]}</span>
            </div>
          ))}
          <hr className="border-gray-600 my-2" />
          <div className="flex justify-between text-2xl font-bold px-2">
            <span>Total</span>
            <span className={bidsMatch ? 'text-yellow-400' : 'text-red-400'}>
              {totalBid} / {hand.cardsDealt}
              {bidsMatch
                ? ' ✓ Even Bid'
                : totalBid > hand.cardsDealt
                  ? ` — ${totalBid - hand.cardsDealt} Overbid`
                  : ` — ${hand.cardsDealt - totalBid} Underbid`}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSummary(false)}
            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-lg font-bold transition"
          >
            ← Edit Tricks
          </button>
          <button
            ref={lockBtnRef}
            onClick={handleLock}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-lg font-bold transition"
          >
            Start Hand
          </button>
        </div>
      </div>
    );
  }

  // Entry view
  return (
    <div className="space-y-4">
      {/* Trump suit picker */}
      <div className="flex justify-between">
        {SUITS.map((s) => (
          <button
            key={s.value}
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTrumpSuit(trumpSuit === s.value ? null : s.value)}
            className={`w-14 h-14 rounded-lg text-3xl flex items-center justify-center transition ${
              trumpSuit === s.value
                ? 'bg-blue-600 ring-2 ring-blue-400'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <span className={s.color}>{s.icon}</span>
          </button>
        ))}
      </div>

      <DigitInputRow
        players={players}
        values={values}
        maxValue={hand.cardsDealt}
        onChange={handleChange}
        autoFocus
        nextFocusRef={lockBtnRef}
        dealerPlayerId={hand.dealerPlayerId}
      />

      <div className="text-center text-lg">
        <span className="text-gray-400">Tricks wanted: </span>
        <span
          className={`font-bold ${
            totalBid === hand.cardsDealt ? 'text-yellow-400' : 'text-white'
          }`}
        >
          {totalBid}
        </span>
        <span className="text-gray-500"> / {hand.cardsDealt}</span>
      </div>

      <button
        ref={lockBtnRef}
        onClick={() => allFilled && setShowSummary(true)}
        disabled={!allFilled}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold transition"
      >
        Review Tricks
      </button>
    </div>
  );
}
