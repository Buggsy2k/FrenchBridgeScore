import { useState, useRef, useEffect } from 'react';
import type { CachedPlayer } from '../models/types';

interface PlayerSelectProps {
  index: number;
  fullName: string;
  alias: string;
  cachedId: string | null;
  cachedPlayers: CachedPlayer[];
  usedFullNames: string[];
  onSelect: (index: number, fullName: string, alias: string, cachedId: string | null) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onEnter?: () => void;
}

export default function PlayerSelect({
  index,
  fullName,
  alias,
  cachedPlayers,
  usedFullNames,
  onSelect,
  inputRef,
}: PlayerSelectProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const available = cachedPlayers.filter(
    (p) =>
      !usedFullNames.includes(p.fullName) ||
      p.fullName === fullName
  );

  const filtered = query.trim()
    ? available.filter(
        (p) =>
          p.fullName.toLowerCase().includes(query.toLowerCase()) ||
          p.alias.toLowerCase().includes(query.toLowerCase())
      )
    : available;

  function selectPlayer(p: CachedPlayer) {
    onSelect(index, p.fullName, p.alias, p.id);
    setShowDropdown(false);
    setQuery('');
    setHighlightIdx(-1);
  }

  function openDropdown() {
    setShowDropdown(true);
    setQuery('');
    setHighlightIdx(-1);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function handleBlur() {
    setTimeout(() => {
      setShowDropdown(false);
      setQuery('');
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && filtered[highlightIdx]) {
        selectPlayer(filtered[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setQuery('');
    }
  }

  // Expose a focusable element via inputRef
  useEffect(() => {
    inputRef?.(searchRef.current);
  });

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex gap-2 cursor-pointer"
        onClick={openDropdown}
      >
        <div className="w-[70%] min-w-0 bg-gray-700 rounded-lg px-3 py-1.5 text-base sm:text-lg truncate">
          {fullName || <span className="text-gray-500">Player {index + 1}</span>}
        </div>
        <div className="w-[30%] min-w-0 bg-gray-700 rounded-lg px-2 py-1.5 text-base sm:text-lg text-center truncate">
          {alias || <span className="text-gray-500">Alias</span>}
        </div>
      </div>
      {showDropdown && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-700 rounded-lg shadow-lg overflow-hidden">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search players…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIdx(-1); }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-600 px-3 py-2 text-sm focus:outline-none"
          />
          {filtered.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto">
              {filtered.map((p, i) => (
                <li
                  key={p.id}
                  onMouseDown={() => selectPlayer(p)}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    i === highlightIdx ? 'bg-blue-600' : 'hover:bg-gray-600'
                  }`}
                >
                  <span className="font-medium">{p.fullName}</span>
                  {p.alias !== p.fullName && (
                    <span className="text-gray-400 ml-2">({p.alias})</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-2 text-sm text-gray-400">No matching players</p>
          )}
        </div>
      )}
    </div>
  );
}
