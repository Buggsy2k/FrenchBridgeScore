import { useState, useRef, useCallback } from 'react';
import type { CachedPlayer } from '../models/types';
import {
  getCachedPlayers,
  upsertCachedPlayers,
  updateCachedPlayer,
  deleteCachedPlayer,
  reorderCachedPlayer,
} from '../services/PlayerCacheService';

interface Props {
  onBack: () => void;
  embedded?: boolean;
}

export default function ManagePlayers({ onBack, embedded }: Props) {
  const [players, setPlayers] = useState(() => getCachedPlayers());
  const [fullName, setFullName] = useState('');
  const [alias, setAlias] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editAlias, setEditAlias] = useState('');
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setPlayers(getCachedPlayers());
  }

  const startLongPress = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setReorderingId((prev) => (prev === id ? null : id));
    }, 400);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  function handleReorder(id: string, direction: 'up' | 'down') {
    reorderCachedPlayer(id, direction);
    refresh();
  }

  function handleAdd() {
    const fn = fullName.trim();
    const al = alias.trim() || fn;
    if (!fn) return;
    upsertCachedPlayers([{ fullName: fn, alias: al }]);
    refresh();
    setFullName('');
    setAlias('');
    nameRef.current?.focus();
  }

  function startEdit(p: CachedPlayer) {
    setEditingId(p.id);
    setEditFullName(p.fullName);
    setEditAlias(p.alias);
  }

  function saveEdit() {
    if (!editingId) return;
    const fn = editFullName.trim();
    const al = editAlias.trim() || fn;
    if (!fn) return;
    updateCachedPlayer(editingId, fn, al);
    setEditingId(null);
    refresh();
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteCachedPlayer(id);
    if (editingId === id) setEditingId(null);
    refresh();
  }

  const content = (
    <div className={embedded ? 'p-5 sm:p-6 space-y-6' : 'bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg space-y-6'}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition text-2xl leading-none"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Manage Players
          </h1>
        </div>

        {/* Add new player */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Add New Player
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={nameRef}
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-2 min-w-0 bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Alias (optional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-1 min-w-0 bg-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={!fullName.trim()}
              className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-30 font-medium transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Player list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-400">
              Players ({players.length})
            </label>
            <span className="text-xs text-gray-500 italic">Long press to reorder</span>
          </div>
          {players.length > 0 ? (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {players.map((p) =>
                editingId === p.id ? (
                  <li key={p.id} className="flex flex-col sm:flex-row gap-2 bg-gray-700/70 rounded-lg px-3 py-2">
                    <div className="flex gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-2 min-w-0 bg-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-1 min-w-0 bg-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 items-center justify-end">
                      <button
                        onClick={saveEdit}
                        className="text-green-400 hover:text-green-300 text-sm font-medium transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-400 hover:text-gray-200 text-sm transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 select-none ${
                      reorderingId === p.id ? 'bg-blue-900/40 ring-1 ring-blue-500' : 'bg-gray-700/50'
                    }`}
                    onTouchStart={() => startLongPress(p.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => startLongPress(p.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {reorderingId === p.id && (
                      <div className="flex flex-col gap-0.5 mr-2">
                        <button
                          onClick={() => handleReorder(p.id, 'up')}
                          disabled={players.indexOf(p) === 0}
                          className="text-gray-300 hover:text-white disabled:opacity-20 text-xs leading-none px-1 py-0.5"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleReorder(p.id, 'down')}
                          disabled={players.indexOf(p) === players.length - 1}
                          className="text-gray-300 hover:text-white disabled:opacity-20 text-xs leading-none px-1 py-0.5"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.fullName}</span>
                      {p.alias !== p.fullName && (
                        <span className="text-gray-400 ml-2">({p.alias})</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-gray-400 hover:text-blue-400 transition"
                        aria-label={`Edit ${p.fullName}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-400 hover:text-red-400 transition"
                        aria-label={`Delete ${p.fullName}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="text-gray-500">No players saved yet. Add some above!</p>
          )}
        </div>
      </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {content}
    </div>
  );
}
