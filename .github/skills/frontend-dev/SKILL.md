---
name: frontend-dev
description: "Develop French Bridge frontend features. USE FOR: adding/editing React components, modifying game logic, updating scoring, changing UI layout, fixing frontend bugs, adding new game phases or screens, trump suit tracking, game history, player management, Android builds. Covers component patterns, context usage, service layer, build verification, and Capacitor deployment."
---

# Frontend Development

## When to Use
- Adding or editing React components in `frontend/src/components/`
- Modifying game logic in `frontend/src/models/gameLogic.ts`
- Updating types in `frontend/src/models/types.ts`
- Changing context/state management in `frontend/src/context/GameContext.tsx`
- Modifying services (`IGameService`, `LocalStorageGameService`, `PlayerCacheService`)
- Fixing UI bugs or adjusting layouts
- Android build or deploy issues

## Architecture

```
Components → useGame() hook → GameContext → IGameService → gameLogic (pure)
```

- **Pure game logic** (`models/gameLogic.ts`): scoring, hand sequences, state transitions, player management, trump suit, game history building. No side effects.
- **Service layer** (`services/`): `IGameService` interface + `LocalStorageGameService` implementation. All persistence lives here, including completed game history.
- **Player cache** (`services/PlayerCacheService.ts`): persistent player roster (CRUD, reorder, import/export). Independent of game state.
- **Context** (`context/GameContext.tsx`): wraps service, exposes `game` state + actions + derived `scoreboard` and `playerStats`.
- **Components**: consume context via `useGame()` hook. Never import services directly.

## Key Types

```typescript
CachedPlayer  { id, fullName, alias }
Player        { id, name, fullName, order }
TrumpSuit     'hearts' | 'spades' | 'diamonds' | 'clubs'
Hand          { handNumber, cardsDealt, dealerPlayerId, trumpSuit?, phase, bids[], results[] }
HandBid       { playerId, bid }
HandResult    { playerId, bid, tricksTaken, score }
GameConfig    { playerIds[], playerNames[], playerFullNames[], firstDealerIndex, maxHands }
GameState     { id, config, players, hands[], currentHandIndex, phase, createdAt }
PlayerScore   { playerId, playerName, totalScore, handScores[] }
CompletedGame { id, gameId, players, hands, config, scoreboard, winner, completedAt, createdAt }
PlayerStats   { playerId, playerName, gamesPlayed, wins, winRate, avgScore, bestScore, totalScore, avgAccuracy }
```

## Context Actions (useGame())

```typescript
// Core game flow
startGame(config)
submitBids(bids[], trumpSuit?)
submitResults(results[])
resetGame()
endCurrentGame()           // end game early

// Mid-game edits
updatePlayerNames(names)
editCompletedHand(handNumber, edits[], trumpSuit?)
setCurrentTrumpSuit(trumpSuit?)

// Player management (mid-game)
replaceGamePlayer(oldPlayerId, newPlayer)
addGamePlayer(newPlayer)
removeGamePlayer(playerId)
reorderGamePlayers(playerIds[])

// Game recovery
resumeGame()
dismissSavedGame()

// Game history
saveCurrentGame()          // persist finished game to history
loadHistory()
deleteHistoryGame(id)

// Derived state
scoreboard: PlayerScore[]
completedGames: CompletedGame[]
playerStats: PlayerStats[]
```

## Component Patterns

- **App.tsx**: Multi-page router — setup, playing, finished, manage players, game report. Capacitor back-button handling.
- **GameSetup**: Player selection from cache, manage players button at top, reorder/remove players, dealer selection.
- **ManagePlayers**: Add/edit/delete cached players, reorder via long-press, import/export JSON. Accepts `embedded` prop for dialog use.
- **EditPlayersDialog**: Mid-game player swap/add/remove/reorder using cached player list.
- **PlayerSelect**: Click-to-open dropdown selecting from cached players.
- **ScorekeeperPanel**: Trump suit picker, bid/result forms, overbid/underbid display, end game early button.
- **BiddingForm**: Two-stage (entry → summary review → lock). Trump suit buttons, skip-review option, `onTotalBidChange` callback.
- **DigitInputRow**: Shared numeric input. Props: `players`, `values`, `maxValue`, `onChange`, `totalBudget`, `onReject`. Auto-advances on valid digit, backspace navigation.
- **ResultsForm**: Shows bid reminders, live score preview, warns if total tricks ≠ cards dealt. Audio/haptic feedback on mismatch.
- **Scoreboard**: Trump suit display per hand, sorted by total score, leader highlighted, collapsible hand-by-hand detail, edit mode.
- **GameOver**: Final standings + "Save Results" button to persist to history.
- **GameReport**: Tabbed view (Games / Stats). Per-game detail with full scoreboard, trump suit tallies, per-player accuracy by suit.
- **GameHistory**: Chronological list of completed games with expand/delete.
- **GameStats**: Aggregate player stats (wins, accuracy, avg score, best score).

## Scoring Rules

```
bid = took = 0  → 10 points
bid = took = 1  → 15 points
bid = took ≥ 2  → bid × 10 points
bid ≠ took      → 0 points
```

## Styling Conventions

- Tailwind CSS v4 utility classes
- Dark theme: `bg-gray-800`, `bg-gray-900`, `text-white`, `text-gray-400`
- Mobile-first: large touch targets (`py-3`, `text-lg`), `inputMode="numeric"`
- Color cues: green for success, red for failure, yellow for leader/exact-match
- Suit colors: hearts/diamonds → `text-red-500`, spades/clubs → `text-gray-900`

## Build & Deploy

```powershell
# Dev server
cd frontend && npm run dev

# TypeScript + Vite build
cd frontend && npm run build

# Android debug deploy to connected device
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd frontend && npx cap run android --target R5CY20VFJ1N

# Release APK (from repo root)
.\build_android_apk.ps1
# Runs: npm run build → cap sync android → node generate-icons.mjs → gradlew assembleRelease
# Output: frontend/android/app/build/outputs/apk/release/app-release.apk
```

## Procedure

1. Read the relevant source files before making changes
2. Follow the layering: pure logic in `gameLogic.ts`, state in context, UI in components
3. Use `useGame()` hook in components — never import services
4. Use `DigitInputRow` for any numeric player input
5. Player IDs come from `PlayerCacheService` — use `config.playerIds` not auto-generated IDs
6. After making changes, run build to verify:
   ```
   cd frontend && npm run build
   ```
7. Fix any TypeScript or build errors before considering the task complete
