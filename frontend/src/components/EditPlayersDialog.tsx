import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getCachedPlayers } from '../services/PlayerCacheService';
import ManagePlayers from './ManagePlayers';

interface Props {
  onClose: () => void;
}

export default function EditPlayersDialog({ onClose }: Props) {
  const { game, replaceGamePlayer, addGamePlayer, removeGamePlayer, reorderGamePlayers } = useGame();
  const [cachedPlayers, setCachedPlayers] = useState(() => getCachedPlayers());
  const [showManagePlayers, setShowManagePlayers] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  if (!game) return null;

  if (showManagePlayers) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div
          className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <ManagePlayers
            embedded
            onBack={() => {
              setShowManagePlayers(false);
              setCachedPlayers(getCachedPlayers());
            }}
          />
        </div>
      </div>
    );
  }

  const currentPlayerIds = new Set(game.players.map((p) => p.id));
  const availablePlayers = cachedPlayers.filter((p) => !currentPlayerIds.has(p.id));

  function label(name: string, fullName: string) {
    return name !== fullName ? `${name} (${fullName})` : name;
  }

  async function handleReplace(oldPlayerId: string, newCachedId: string) {
    const cached = cachedPlayers.find((p) => p.id === newCachedId);
    if (!cached) return;
    await replaceGamePlayer(oldPlayerId, {
      id: cached.id,
      name: cached.alias,
      fullName: cached.fullName,
    });
  }

  async function handleAdd(cachedId: string) {
    const cached = cachedPlayers.find((p) => p.id === cachedId);
    if (!cached) return;
    await addGamePlayer({
      id: cached.id,
      name: cached.alias,
      fullName: cached.fullName,
    });
  }

  async function handleRemove(playerId: string) {
    await removeGamePlayer(playerId);
    setConfirmRemoveId(null);
  }

  async function movePlayer(index: number, direction: -1 | 1) {
    const ids = game!.players.map((p) => p.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    await reorderGamePlayers(ids);
  }

  const confirmPlayer = confirmRemoveId
    ? game.players.find((p) => p.id === confirmRemoveId)
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Edit Players</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Current players */}
          <div className="space-y-2">
            {game.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => movePlayer(i, -1)}
                    disabled={i === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none transition"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => movePlayer(i, 1)}
                    disabled={i === game.players.length - 1}
                    className="text-gray-400 hover:text-white disabled:opacity-20 text-xs leading-none transition"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                <select
                  value={p.id}
                  onChange={(e) => handleReplace(p.id, e.target.value)}
                  className="flex-1 min-w-0 bg-gray-700 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={p.id}>{label(p.name, p.fullName)}</option>
                  {availablePlayers.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {label(cp.alias, cp.fullName)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setConfirmRemoveId(p.id)}
                  className="text-gray-400 hover:text-red-400 transition shrink-0"
                  title={`Remove ${p.name}`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Add player */}
          {availablePlayers.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAdd(e.target.value);
              }}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-base text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">+ Add Player</option>
              {availablePlayers.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {label(cp.alias, cp.fullName)}
                </option>
              ))}
            </select>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowManagePlayers(true)}
              className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition"
            >
              Manage Players
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Remove confirmation */}
      {confirmPlayer && (
        <div
          className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirmRemoveId(null)}
        >
          <div
            className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-center">Remove Player?</h3>
            <p className="text-gray-300 text-center">
              Remove <strong>{confirmPlayer.name}</strong> from the game?
              Their scores will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmPlayer.id)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
