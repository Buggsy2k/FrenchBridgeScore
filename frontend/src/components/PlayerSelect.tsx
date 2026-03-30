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
  cachedId,
  cachedPlayers,
  usedFullNames,
  onSelect,
  inputRef,
  onEnter,
}: PlayerSelectProps) {
  const [query, setQuery] = useState(fullName);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  // Sync query when fullName changes externally (e.g. lastConfig)
  useEffect(() => {
    setQuery(fullName);
  }, [fullName]);

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
    setQuery(p.fullName);
    onSelect(index, p.fullName, p.alias, p.id);
    setShowDropdown(false);
    setHighlightIdx(-1);
  }

  function handleInputChange(value: string) {
    setQuery(value);
    setShowDropdown(true);
    setHighlightIdx(-1);
    // If typing a new name, treat it as both fullName and alias (no cached ID)
    onSelect(index, value, alias || value, null);
  }

  function handleBlur() {
    // Delay to allow dropdown click
    setTimeout(() => {
      setShowDropdown(false);
      // If user typed something not matched, use query as fullName and alias
      if (query.trim() && query !== fullName) {
        onSelect(index, query.trim(), alias || query.trim(), null);
      }
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && highlightIdx >= 0 && filtered[highlightIdx]) {
        selectPlayer(filtered[highlightIdx]);
      } else {
        setShowDropdown(false);
        onEnter?.();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2">
        <input
          ref={(el) => {
            localInputRef.current = el;
            inputRef?.(el);
          }}
          type="text"
          placeholder={`Player ${index + 1} name`}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-gray-700 rounded-lg px-3 py-1.5 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Alias"
          value={alias}
          onChange={(e) => onSelect(index, fullName, e.target.value, cachedId)}
          className="w-20 sm:w-24 shrink-0 bg-gray-700 rounded-lg px-2 py-1.5 text-base sm:text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {showDropdown && filtered.length > 0 && (
        <ul className="absolute z-10 left-0 right-24 mt-1 bg-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
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
      )}
    </div>
  );
}
