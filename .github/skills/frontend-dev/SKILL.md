---
name: frontend-dev
description: "Develop French Bridge frontend features. USE FOR: adding/editing React components, modifying game logic, updating scoring, changing UI layout, fixing frontend bugs, adding new game phases or screens. Covers component patterns, context usage, service layer, and build verification."
---

# Frontend Development

## When to Use
- Adding or editing React components in `frontend/src/components/`
- Modifying game logic in `frontend/src/models/gameLogic.ts`
- Updating types in `frontend/src/models/types.ts`
- Changing context/state management in `frontend/src/context/GameContext.tsx`
- Fixing UI bugs or adjusting layouts

## Architecture

```
Components → useGame() hook → GameContext → IGameService → gameLogic (pure)
```

- **Pure game logic** (`models/gameLogic.ts`): scoring, hand sequences, state transitions. No side effects.
- **Service layer** (`services/`): `IGameService` interface + `LocalStorageGameService` implementation. All persistence lives here.
- **Context** (`context/GameContext.tsx`): wraps service, exposes `game` state + actions (`startGame`, `submitBids`, `submitResults`, `resetGame`) + derived `scoreboard`.
- **Components**: consume context via `useGame()` hook. Never import services directly.

## Key Types

```typescript
Player       { id, name, order }
Hand         { handNumber, cardsDealt, dealerPlayerId, phase, bids[], results[] }
HandBid      { playerId, bid }
HandResult   { playerId, bid, tricksTaken, score }
GameState    { id, config, players, hands[], currentHandIndex, phase, createdAt }
PlayerScore  { playerId, playerName, totalScore, handScores[] }
```

## Component Patterns

- **App.tsx**: Three-state router — no game → `GameSetup`, playing → `ScorekeeperPanel`, finished → `GameOver`
- **DigitInputRow**: Shared numeric input. Props: `players`, `values`, `maxValue`, `onChange`, optional `autoFocus` and `nextFocusRef`. Auto-advances on valid digit, backspace navigation.
- **BiddingForm**: Two-stage (entry → summary review → lock). Shows overbid/underbid count.
- **ResultsForm**: Shows bid reminders, live score preview, warns if total tricks ≠ cards dealt.
- **Scoreboard**: Sorted by total score, leader highlighted, collapsible hand-by-hand detail.

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

## Procedure

1. Read the relevant source files before making changes
2. Follow the layering: pure logic in `gameLogic.ts`, state in context, UI in components
3. Use `useGame()` hook in components — never import services
4. Use `DigitInputRow` for any numeric player input
5. After making changes, run build to verify:
   ```
   cd frontend && npm run build
   ```
6. Fix any TypeScript or build errors before considering the task complete
