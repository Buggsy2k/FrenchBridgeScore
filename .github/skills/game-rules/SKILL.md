---
name: game-rules
description: "French Bridge game rules and scoring logic. USE FOR: understanding or modifying scoring, hand sequences, bid validation, trick counting, dealer rotation, game flow, overbid/underbid logic. Reference for how the card game works."
---

# French Bridge Game Rules

## When to Use
- Modifying or debugging scoring logic
- Changing hand sequence or dealer rotation
- Adding bid validation or trick validation
- Understanding game flow for new features

## Game Flow

1. **Setup**: Choose players (3–8), set first dealer, optionally set peak
2. **Hand sequence**: 1, 2, …, peak, peak, peak−1, …, 1 (peak appears twice → 2×peak total hands)
3. **Each hand**:
   a. Deal cards (count = hand's `cardsDealt`)
   b. **Bidding phase**: Each player bids simultaneously (0 to cardsDealt)
   c. **Results phase**: Enter tricks taken by each player
   d. Score the hand
4. **Game over** after all hands complete

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

- `submitBids()`: bidding → results (stores bids)
- `submitResults()`: results → complete (calculates scores, advances hand or finishes game)
