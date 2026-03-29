# French Bridge — Workspace Instructions

## Project Overview

French Bridge is a card game scorekeeper app. Players bid on tricks each hand, and scoring rewards exact predictions.

## Stack

- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4
- **State**: React Context wrapping a service layer
- **Storage**: localStorage (MVP); designed for future ASP.NET Core + PostgreSQL backend

## Architecture

```
src/
  models/types.ts        — Domain types (Player, Hand, GameState, etc.)
  models/gameLogic.ts    — Pure functions: scoring, hand sequences, state transitions
  services/IGameService  — Abstract interface (swap for real API later)
  services/LocalStorage… — MVP localStorage implementation
  context/GameContext.tsx — React Context: state + actions (startGame, submitBids, submitResults)
  components/            — UI components consumed via useGame() hook
```

**Layering**: Components → Context → Service → Game Logic (pure). Keep pure logic in `gameLogic.ts`, side-effects in services, and UI in components.

## Game Rules

- Hand sequence: 1, 2, …, peak, peak, peak-1, …, 1 (peak appears twice → 2×peak total hands)
- Max peak = floor(51 / playerCount)
- **Scoring**: bid=took=0 → 10pts; bid=took=1 → 15pts; bid=took≥2 → N×10pts; mismatch → 0pts
- Bids are simultaneous (shown after all entered)

## Conventions

- Components use `useGame()` hook from GameContext — never import the service directly
- DigitInputRow is the shared numeric input; takes `players`, `values`, `maxValue`, `onChange`
- Mobile-first: large touch targets, `inputMode="numeric"`, responsive layouts
- Dark theme with Tailwind utility classes (gray-800/900 backgrounds, white text)

## Build & Dev

- **Dev server**: `cd frontend && npm run dev` (port 5173)
- **Build**: `cd frontend && npm run build` (runs `tsc && vite build`)
- After editing any `frontend/src/` file, run `cd frontend && npm run build` to verify it compiles
