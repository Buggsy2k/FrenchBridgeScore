import type { CachedPlayer } from '../models/types';

const STORAGE_KEY = 'frenchbridge_players';

function loadPlayers(): CachedPlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlayers(players: CachedPlayer[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export function getCachedPlayers(): CachedPlayer[] {
  return loadPlayers();
}

export function upsertCachedPlayers(players: { fullName: string; alias: string }[]): void {
  const existing = loadPlayers();
  for (const p of players) {
    const match = existing.find(
      (e) => e.fullName.toLowerCase() === p.fullName.toLowerCase()
    );
    if (match) {
      match.alias = p.alias;
    } else {
      existing.push({
        id: crypto.randomUUID(),
        fullName: p.fullName,
        alias: p.alias,
      });
    }
  }
  savePlayers(existing);
}

export function updateCachedPlayer(id: string, fullName: string, alias: string): void {
  const existing = loadPlayers();
  const player = existing.find((p) => p.id === id);
  if (player) {
    player.fullName = fullName;
    player.alias = alias;
    savePlayers(existing);
  }
}

export function deleteCachedPlayer(id: string): void {
  const existing = loadPlayers().filter((p) => p.id !== id);
  savePlayers(existing);
}

export function reorderCachedPlayer(id: string, direction: 'up' | 'down'): void {
  const existing = loadPlayers();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= existing.length) return;
  [existing[idx], existing[targetIdx]] = [existing[targetIdx], existing[idx]];
  savePlayers(existing);
}
