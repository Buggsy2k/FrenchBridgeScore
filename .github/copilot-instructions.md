# French Bridge — Workspace Instructions

## Project Overview

French Bridge is a card game scorekeeper app. Players bid on tricks each hand, and scoring rewards exact predictions. Runs as a web app and Android app via Capacitor.

## Stack

- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4
- **State**: React Context wrapping a service layer
- **Storage**: localStorage (MVP); designed for future ASP.NET Core + PostgreSQL backend
- **Mobile**: Capacitor 8 for Android (APK builds via Gradle)

## Architecture

```
src/
  models/types.ts        — Domain types (Player, Hand, GameState, TrumpSuit, CompletedGame, PlayerStats)
  models/gameLogic.ts    — Pure functions: scoring, hand sequences, state transitions, player management
  services/IGameService  — Abstract interface (swap for real API later)
  services/LocalStorage… — MVP localStorage implementation (games + completed game history)
  services/PlayerCache…  — Persistent player cache (CRUD + reorder)
  context/GameContext.tsx — React Context: state + actions + derived scoreboard/playerStats
  components/            — UI components consumed via useGame() hook
```

**Layering**: Components → Context → Service → Game Logic (pure). Keep pure logic in `gameLogic.ts`, side-effects in services, and UI in components.

## Game Rules

- Hand sequence: 1, 2, …, peak, peak, peak-1, …, 1 (peak appears twice → 2×peak total hands)
- Max peak = floor(51 / playerCount)
- **Scoring**: bid=took=0 → 10pts; bid=took=1 → 15pts; bid=took≥2 → N×10pts; mismatch → 0pts
- Bids are simultaneous (shown after all entered)
- Trump suit tracked per hand (hearts, spades, diamonds, clubs)

## Conventions

- Components use `useGame()` hook from GameContext — never import the service directly
- DigitInputRow is the shared numeric input; takes `players`, `values`, `maxValue`, `onChange`, `totalBudget`
- Mobile-first: large touch targets, `inputMode="numeric"`, responsive layouts
- Dark theme with Tailwind utility classes (gray-800/900 backgrounds, white text)
- Player IDs come from the persistent player cache (`PlayerCacheService`), not generated at game time

## Build & Dev

- **Dev server**: `cd frontend && npm run dev` (port 5173)
- **Build**: `cd frontend && npm run build` (runs `tsc && vite build`)
- **Android debug deploy**: `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr" ; cd frontend ; npx cap run android --target R5CY20VFJ1N`
- **Android release APK**: `.\build_android_apk.ps1` (builds frontend → cap sync → generate icons → Gradle assembleRelease)
- After editing any `frontend/src/` file, run `cd frontend && npm run build` to verify it compiles
