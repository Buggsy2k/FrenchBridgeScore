import { useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { CachedPlayer } from '../models/types';
import {
  getCachedPlayers,
  upsertCachedPlayers,
  updateCachedPlayer,
  deleteCachedPlayer,
  reorderCachedPlayer,
} from '../services/PlayerCacheService';

const EXPORT_FILENAME = 'french-bridge-players.json';

async function exportPlayers(players: CachedPlayer[]): Promise<string> {
  const data = players.map(({ fullName, alias }) => ({ fullName, alias }));
  const json = JSON.stringify(data, null, 2);

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: EXPORT_FILENAME,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({
      path: EXPORT_FILENAME,
      directory: Directory.Cache,
    });
    await Share.share({
      title: 'French Bridge Players',
      text: 'French Bridge player list',
      url: uri,
      dialogTitle: 'Export players',
    });
    return `Shared ${players.length} players.`;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = EXPORT_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
  return `Downloaded ${EXPORT_FILENAME} (${players.length} players).`;
}

function parseImportedPlayers(text: string): { fullName: string; alias: string }[] | null {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;
    const result: { fullName: string; alias: string }[] = [];
    for (const item of parsed) {
      if (typeof item?.fullName !== 'string' || !item.fullName.trim()) return null;
      result.push({
        fullName: item.fullName.trim(),
        alias: typeof item.alias === 'string' && item.alias.trim() ? item.alias.trim() : item.fullName.trim(),
      });
    }
    return result;
  } catch {
    return null;
  }
}

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
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const imported = parseImportedPlayers(text);
      if (!imported || imported.length === 0) {
        setImportError('Invalid file format. Expected a JSON array of players with fullName fields.');
        return;
      }
      const existing = getCachedPlayers();
      const existingNames = new Set(existing.map((p) => p.fullName.toLowerCase()));
      const toAdd = imported.filter((p) => !existingNames.has(p.fullName.toLowerCase()));
      if (toAdd.length > 0) {
        upsertCachedPlayers(toAdd);
        refresh();
      }
      const skipped = imported.length - toAdd.length;
      const parts: string[] = [];
      if (toAdd.length > 0) parts.push(`${toAdd.length} imported`);
      if (skipped > 0) parts.push(`${skipped} skipped (already exist)`);
      setImportSuccess(parts.join(', '));
    };
    reader.readAsText(file);
    e.target.value = '';
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

  async function handleExport() {
    setExportStatus(null);
    setExportError(null);
    try {
      const status = await exportPlayers(players);
      setExportStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(message)) return;
      setExportError(`Export failed: ${message}`);
    }
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

        {/* Export / Import */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Export / Import
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={players.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-sm font-medium transition"
            >
              Export Players
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition"
            >
              Import Players
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {exportStatus && (
            <p className="text-green-400 text-sm">{exportStatus}</p>
          )}
          {exportError && (
            <p className="text-red-400 text-sm">{exportError}</p>
          )}
          {importError && (
            <p className="text-red-400 text-sm">{importError}</p>
          )}
          {importSuccess && (
            <p className="text-green-400 text-sm">{importSuccess}</p>
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
