---
name: game-rules
description: "French Bridge game rules and scoring logic. USE FOR: understanding or modifying scoring, hand sequences, bid validation, trick counting, dealer rotation, game flow, overbid/underbid logic, trump suit tracking, end game early, game history and stats. Reference for how the card game works."
---

# French Bridge Game Rules

## When to Use
- Modifying or debugging scoring logic
- Changing hand sequence or dealer rotation
- Adding bid validation or trick validation
- Understanding game flow for new features
- Trump suit tracking per hand
- Game history and player statistics

## Game Flow

1. **Setup**: Choose players from the persistent player cache (3–8), set first dealer, optionally set peak
2. **Hand sequence**: 1, 2, …, peak, peak, peak−1, …, 1 (peak appears twice → 2×peak total hands)
3. **Each hand**:
   a. Select trump suit (hearts, spades, diamonds, clubs) — optional but tracked
   b. Deal cards (count = hand's `cardsDealt`)
   c. **Bidding phase**: Each player bids simultaneously (0 to cardsDealt)
   d. **Results phase**: Enter tricks taken by each player
   e. Score the hand
4. **Game over** after all hands complete (or ended early)
5. **Save results** to persist game to history for stats tracking

## Key Formulas

- **Max peak** = `floor(51 / playerCount)`
- **Dealer rotation**: `(firstDealerIndex + handIndex) % playerCount`
- **Hand sequence**: `generateHandSequence(peak)` → `[1, 2, ..., peak, peak, peak-1, ..., 1]`

## Scoring

| Condition | Points |
|-----------|--------|
| Bid 0, took 0 | 10 |
| Bid 1, took 1 | 15 |
| Bid N (≥2), took N | N × 10 |
| Bid ≠ took | 0 |

Implementation: `calculateScore(bid, tricksTaken)` in `models/gameLogic.ts`

## Trump Suit

- Each hand can have a trump suit: hearts, spades, diamonds, clubs
- Set via `setHandTrumpSuit()` or passed to `submitBids(bids, trumpSuit)`
- Tracked in `Hand.trumpSuit` field
- Displayed with suit icons (♥ ♠ ♦ ♣) and color coding (red/dark)
- Stats track per-player accuracy by trump suit across games

## Bid Analysis

- **Total bid vs cards dealt**: After all bids entered, compare sum of bids to `hand.cardsDealt`
- **Exact match**: Total bid = cards dealt (yellow highlight, ✓)
- **Overbid**: Total bid > cards dealt → show difference as "N overbid" (red)
- **Underbid**: Total bid < cards dealt → show difference as "N underbid" (red)

## Trick Validation

- Total tricks taken should equal cards dealt (warning shown if not, but submission allowed with override)
- Each player's tricks: 0 to cardsDealt

## State Transitions

```
Hand phases:  bidding → results → complete
Game phases:  setup → playing → finished
```

- `submitBids()`: bidding → results (stores bids + optional trump suit)
- `submitResults()`: results → complete (calculates scores, advances hand or finishes game)
- `endGameEarly()`: playing → finished (trims unplayed hands)

## Game History

- Completed games are saved via `buildCompletedGame()` → `saveCompletedGame()`
- Each `CompletedGame` stores full scoreboard, all hands, winner, and timestamps
- `computePlayerStats()` aggregates across all completed games: wins, win rate, avg score, best score, accuracy
- History persisted in localStorage under `frenchbridge_history` key

## Mid-Game Player Management

- Players can be replaced, added, removed, or reordered mid-game
- `replacePlayer()`: swaps one player for another, updating all historical references
- `addPlayerToGame()`: adds player with zero scores for completed hands
- `removePlayerFromGame()`: removes player and their bid/result data
- `reorderPlayers()`: changes seating order
