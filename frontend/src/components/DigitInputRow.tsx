import { useRef, useEffect, useCallback } from 'react';
import type { Player } from '../models/types';

interface DigitInputRowProps {
  players: Player[];
  values: Record<string, number | null>;
  maxValue: number;
  onChange: (playerId: string, value: number) => void;
  autoFocus?: boolean;
  /** Ref to the element that should receive focus after the last input */
  nextFocusRef?: React.RefObject<HTMLElement | null>;
  /** If set, show a dealer icon next to this player */
  dealerPlayerId?: string;
  /** Optional per-player content shown to the right of the input, keyed by player id */
  rightLabels?: Record<string, React.ReactNode>;
}

/**
 * A row of single-digit input cells, one per player.
 * - Typing a valid digit auto-advances to the next field.
 * - Backspace on an empty field moves back and clears the previous.
 * - After the last player, focus moves to nextFocusRef (action button).
 */
export default function DigitInputRow({
  players,
  values,
  maxValue,
  onChange,
  autoFocus = false,
  nextFocusRef,
  dealerPlayerId,
  rightLabels,
}: DigitInputRowProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      const playerId = players[index].id;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const currentVal = values[playerId];
        if (currentVal !== null && currentVal !== undefined) {
          // Clear current field
          onChange(playerId, null as unknown as number);
        } else if (index > 0) {
          // Move back to previous field and clear it
          const prevId = players[index - 1].id;
          onChange(prevId, null as unknown as number);
          inputRefs.current[index - 1]?.focus();
        }
        return;
      }

      // Only accept single digit keys 0-9
      if (e.key.length === 1 && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const digit = parseInt(e.key, 10);
        if (digit > maxValue) return; // reject out of range silently
        onChange(playerId, digit);

        // Auto-advance
        if (index < players.length - 1) {
          inputRefs.current[index + 1]?.focus();
        } else {
          // Last player — defer focus to action button so React can re-render and enable it
          requestAnimationFrame(() => nextFocusRef?.current?.focus());
        }
        return;
      }

      // Block all other printable characters
      if (e.key.length === 1) {
        e.preventDefault();
      }
    },
    [players, values, maxValue, onChange, nextFocusRef]
  );

  return (
    <div className="space-y-3">
      {players.map((player, i) => {
        const val = values[player.id];
        const filled = val !== null && val !== undefined;
        return (
          <div key={player.id} className="flex items-center gap-3">
            <span className="text-lg sm:text-xl font-semibold w-28 sm:w-36 truncate text-right flex items-center justify-end gap-1">
              {dealerPlayerId === player.id && (
                <span
                  className="inline-flex items-center justify-center w-7 h-9 bg-white rounded text-red-600 text-lg font-bold leading-none shadow"
                  title="Dealer"
                >
                  ♥
                </span>
              )}
              {player.name}
            </span>
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              readOnly={false}
              value={filled ? String(val) : ''}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onChange={() => {/* controlled via onKeyDown */}}
              onFocus={(e) => e.target.select()}
              className={`
                w-14 h-14 sm:w-16 sm:h-16 text-center text-3xl sm:text-4xl font-bold rounded-xl
                border-2 outline-none transition-all caret-transparent select-all
                ${
                  filled
                    ? 'bg-gray-700 border-gray-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }
                focus:border-blue-400 focus:ring-4 focus:ring-blue-400/30 focus:bg-gray-700
              `}
            />
            {rightLabels && rightLabels[player.id] !== undefined
              ? rightLabels[player.id]
              : <span className="text-sm text-gray-500 w-10">/ {maxValue}</span>
            }
          </div>
        );
      })}
    </div>
  );
}
