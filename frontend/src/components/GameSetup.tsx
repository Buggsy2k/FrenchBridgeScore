import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { calculateMaxHands, generateHandSequence } from '../models/gameLogic';
import { getCachedPlayers, upsertCachedPlayers } from '../services/PlayerCacheService';
import PlayerSelect from './PlayerSelect';

interface PlayerEntry {
  fullName: string;
  alias: string;
}

interface Props {
  onManagePlayers: () => void;
}

export default function GameSetup({ onManagePlayers }: Props) {
  const { startGame, lastConfig } = useGame();

  const [cachedPlayers, setCachedPlayers] = useState(() => getCachedPlayers());
  const refreshCache = useCallback(() => setCachedPlayers(getCachedPlayers()), []);

  const [playerCount, setPlayerCount] = useState(lastConfig?.playerNames.length ?? 4);
  const [players, setPlayers] = useState<PlayerEntry[]>(() => {
    if (lastConfig) {
      return lastConfig.playerNames.map((alias, i) => ({
        fullName: lastConfig.playerFullNames?.[i] ?? alias,
        alias,
      }));
    }
    return Array.from({ length: 4 }, () => ({ fullName: '', alias: '' }));
  });
  const [firstDealerIndex, setFirstDealerIndex] = useState(lastConfig?.firstDealerIndex ?? 0);
  const [customMaxHands, setCustomMaxHands] = useState<number | null>(lastConfig?.maxHands ?? null);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    nameRefs.current[0]?.focus();
  }, []);

  const maxAllowed = useMemo(() => calculateMaxHands(playerCount), [playerCount]);
  const maxHands = customMaxHands ?? Math.min(8, maxAllowed);
  const totalRounds = useMemo(() => generateHandSequence(maxHands).length, [maxHands]);

  function handlePlayerCountChange(count: number) {
    const clamped = Math.max(3, count);
    setPlayerCount(clamped);
    setPlayers((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push({ fullName: '', alias: '' });
      return next.slice(0, clamped);
    });
    if (firstDealerIndex >= clamped) setFirstDealerIndex(0);
    setCustomMaxHands(null);
  }

  function handlePlayerChange(index: number, fullName: string, alias: string) {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = { fullName, alias };
      return next;
    });
  }

  const usedFullNames = players.map((p) => p.fullName).filter((n) => n.trim());
  const allNamed = players.every((p) => p.fullName.trim().length > 0 && p.alias.trim().length > 0);
  const handsValid = maxHands >= 1 && maxHands <= maxAllowed;
  const canStart = allNamed && handsValid;

  async function handleStart() {
    if (!canStart) return;
    const trimmed = players.map((p) => ({
      fullName: p.fullName.trim(),
      alias: p.alias.trim(),
    }));
    // Save to player cache
    upsertCachedPlayers(trimmed);
    refreshCache();
    await startGame({
      playerNames: trimmed.map((p) => p.alias),
      playerFullNames: trimmed.map((p) => p.fullName),
      firstDealerIndex,
      maxHands,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg space-y-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-center tracking-tight flex items-center justify-center gap-3">
          <img src="/favicon.svg" alt="" className="w-10 h-10" />
          French Bridge Scores
        </h1>

        {/* Player count */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Number of Players
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl font-bold disabled:opacity-30"
              onClick={() => handlePlayerCountChange(playerCount - 1)}
              disabled={playerCount <= 3}
            >
              −
            </button>
            <span className="text-2xl font-bold w-8 text-center">{playerCount}</span>
            <button
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl font-bold disabled:opacity-30"
              onClick={() => handlePlayerCountChange(playerCount + 1)}
              disabled={playerCount >= 8}
            >
              +
            </button>
          </div>
        </div>

        {/* Player names */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400">Players</label>
          {players.slice(0, playerCount).map((p, i) => (
            <PlayerSelect
              key={i}
              index={i}
              fullName={p.fullName}
              alias={p.alias}
              cachedPlayers={cachedPlayers}
              usedFullNames={usedFullNames}
              onSelect={handlePlayerChange}
              inputRef={(el) => { nameRefs.current[i] = el; }}
              onEnter={() => {
                if (i < playerCount - 1) {
                  nameRefs.current[i + 1]?.focus();
                } else {
                  startBtnRef.current?.focus();
                }
              }}
            />
          ))}
        </div>

        {/* First dealer */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            First Dealer
          </label>
          <select
            value={firstDealerIndex}
            onChange={(e) => setFirstDealerIndex(Number(e.target.value))}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {players.slice(0, playerCount).map((p, i) => (
              <option key={i} value={i}>
                {p.alias.trim() || p.fullName.trim() || `Player ${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Number of hands */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Hands (peak)
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl font-bold disabled:opacity-30"
              onClick={() => setCustomMaxHands(Math.max(1, maxHands - 1))}
              disabled={maxHands <= 1}
            >
              −
            </button>
            <span className="text-2xl font-bold w-8 text-center">{maxHands}</span>
            <button
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-xl font-bold disabled:opacity-30"
              onClick={() => setCustomMaxHands(Math.min(maxAllowed, maxHands + 1))}
              disabled={maxHands >= maxAllowed}
            >
              +
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Max {maxAllowed} for {playerCount} players &middot;{' '}
            <span className="text-gray-300 font-medium">{totalRounds} total rounds</span>
          </p>
        </div>

        {/* Start game */}
        <button
          ref={startBtnRef}
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xl font-bold transition"
        >
          Start Game
        </button>

        {/* Manage Players link */}
        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={onManagePlayers}
            className="text-sm text-gray-400 hover:text-gray-200 transition"
          >
            Manage Players ({cachedPlayers.length})
          </button>
        </div>
      </div>
    </div>
  );
}
