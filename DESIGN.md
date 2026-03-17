# FlowGrid — Design Document

## Concept
Connect color pairs on a grid without crossing paths. Fill every cell. Daily puzzles + free play.

**URL:** flowgrid.mattatencio.com

---

## Research Summary

### How Flow Free Works
- Grid with colored dot pairs (each color appears exactly twice)
- Draw paths connecting matching dots — orthogonal only (no diagonals)
- Paths cannot cross or overlap
- **Every cell must be filled** — this is the real puzzle constraint
- Drawing over an existing path overwrites it (no undo needed)

### Why It's Fun
- Rules take 5 seconds to learn; hard puzzles require real thought
- Watching the grid fill with color is inherently satisfying
- Zero penalty for experimenting — just redraw
- Quick sessions: 5x5 in 10-30s, 8x8 in 2-5 min
- The "aha" moment when you realize a path *must* go a certain way

### Key Strategy Patterns
- Corners must be used by adjacent endpoints
- Edges often force specific paths
- The fill constraint eliminates "obvious" short routes

---

## Design

### Visual Direction
- **Dark theme** (consistent with Spectrum: `#07070f` background)
- **Bright, saturated colors** for flow paths — high contrast on dark
- Grid cells with subtle borders, rounded pipe segments
- Endpoints shown as filled circles, paths as rounded rectangles
- Completion animation: pulse/glow when grid fills

### Color Palette (8 colors, accessible)
| Color   | Hex       | Use        |
|---------|-----------|------------|
| Red     | `#ef4444` | Pair 1     |
| Blue    | `#3b82f6` | Pair 2     |
| Green   | `#22c55e` | Pair 3     |
| Yellow  | `#eab308` | Pair 4     |
| Purple  | `#a855f7` | Pair 5     |
| Orange  | `#f97316` | Pair 6     |
| Cyan    | `#06b6d4` | Pair 7     |
| Pink    | `#ec4899` | Pair 8     |

### Layout (Mobile-First)
```
┌─────────────────────┐
│  FlowGrid    ⚙️  📊  │  ← Header (title, settings, stats)
│                     │
│  Daily Puzzle #42   │  ← Puzzle info
│  6×6  ●●●●●○       │  ← Size + colors connected indicator
│                     │
│  ┌─┬─┬─┬─┬─┬─┐     │
│  │ │●│ │ │ │●│     │  ← Grid (square, centered)
│  ├─┼─┼─┼─┼─┼─┤     │
│  │●│ │ │ │ │ │     │
│  ├─┼─┼─┼─┼─┼─┤     │
│  │ │ │ │●│ │ │     │
│  ├─┼─┼─┼─┼─┼─┤     │
│  │ │ │●│ │ │ │     │
│  ├─┼─┼─┼─┼─┼─┤     │
│  │ │●│ │ │●│ │     │
│  ├─┼─┼─┼─┼─┼─┤     │
│  │●│ │ │ │ │●│     │
│  └─┴─┴─┴─┴─┴─┘     │
│                     │
│  Moves: 12          │  ← Move counter
│  [Reset] [New]      │  ← Actions
│                     │
└─────────────────────┘
```

### Interaction Model
- **Pointer down** on endpoint or existing path → start drawing that color
- **Pointer move** to adjacent cell → extend path
- **Pointer up** → finalize path segment
- Drawing over another color's path → overwrites it
- Tapping an endpoint with a complete path → clears that color's path

### Data Model
```javascript
// Grid: 2D array
cell = {
  color: 'red' | null,       // which color occupies this cell
  type: 'empty' | 'endpoint' | 'path'
}

// Paths: per-color ordered coordinate arrays
paths = {
  red: [[0,1], [0,2], [0,3], [1,3]],
  blue: [[2,0], [2,1], [2,2]],
  // ...
}

// Puzzle definition
puzzle = {
  size: 6,
  endpoints: [
    { color: 'red', positions: [[0,1], [4,5]] },
    { color: 'blue', positions: [[1,0], [3,2]] },
    // ...
  ]
}
```

### Win Condition
1. Every color pair is connected (path from endpoint A to endpoint B)
2. Every cell on the grid is filled (no empty cells)

---

## Tech Stack (mirrors Spectrum)

| Layer        | Tech                        |
|--------------|-----------------------------|
| Framework    | Next.js 16 (App Router)     |
| Language     | JavaScript (no TypeScript)  |
| Styling      | CSS Modules                 |
| PWA          | @ducanh2912/next-pwa        |
| Deployment   | Vercel                      |
| DNS          | Cloudflare (DNS-only)       |
| Persistence  | localStorage                |
| Rendering    | CSS Grid (divs, not canvas) |

---

## Puzzle Generation Strategy

### Approach: Generate Solution First
1. Fill entire grid with non-crossing random paths (snake walk)
2. Mark start/end of each path as endpoints
3. Validate with backtracking solver (ensure unique solution)
4. Discard ambiguous puzzles, keep good ones

### Pre-generated Puzzle Packs
- Generate offline, store as JSON in `/data/puzzles.js`
- ~30-50 puzzles per grid size (5x5, 6x6, 7x7, 8x8)
- Daily puzzle: `seed = YYYYMMDD`, `index = seed % puzzles[size].length`

### Difficulty Levers
- **Grid size**: 5x5 (easy) → 8x8 (hard)
- **Color count**: More colors on same grid = easier (shorter paths)
- **Path length**: Longer intertwined paths = harder

---

## Feature Tiers

### V1 — Ship It (MVP, ~1 hour)
- [x] 5x5 and 6x6 grid sizes
- [x] Touch/mouse path drawing with pointer events
- [x] 15-20 pre-built puzzles per size (hand-crafted or simple generator)
- [x] Win detection (all connected + all filled)
- [x] Move counter
- [x] Reset puzzle button
- [x] Daily puzzle mode (date-seeded)
- [x] PWA (manifest, service worker, standalone)
- [x] Dark theme, mobile-first layout
- [x] Completion celebration (simple animation)

### V2 — Polish (post-feedback)
- [ ] 7x7 and 8x8 grid sizes
- [ ] Algorithmic puzzle generator (not just hand-crafted)
- [ ] Star rating (1-3 stars based on move count vs optimal)
- [ ] Timer (optional, toggleable)
- [ ] Stats modal (games played, win rate, streak, best times)
- [ ] Streak tracking (localStorage)
- [ ] XP system (like Spectrum)
- [ ] Share results (emoji grid — "I solved today's FlowGrid in 14 moves!")
- [ ] Smooth path drawing animation
- [ ] Onboarding tutorial modal

### V3 — Robust Features (if it has legs)
- [ ] "Impossible mode" daily challenge (9x9+ with tight move limit)
- [ ] Hint system (reveal one path segment)
- [ ] Level packs (themed collections)
- [ ] Leaderboard (serverless, Vercel KV or similar)
- [ ] Puzzle of the week (community voted)
- [ ] Color-blind friendly mode (patterns/shapes on paths)
- [ ] Haptic feedback on mobile
- [ ] Undo last path draw
- [ ] Sound effects (subtle, toggleable)

---

## Shareable Results Format
```
🧩 FlowGrid #42 — 6×6
✅ Solved in 18 moves
⭐⭐⭐ Perfect!

🟥🟥🟥🟦🟦🟦
🟥🟩🟩🟦🟨🟨
🟥🟩🟪🟪🟨🟧
🟥🟩🟪🟧🟧🟧
🟥🟩🟩🟩🟩🟧
🟥🟥🟥🟥🟥🟧

flowgrid.mattatencio.com
```

---

## localStorage Keys
| Key                    | Type    | Purpose                    |
|------------------------|---------|----------------------------|
| `flowgridStats`        | object  | Games played, wins, streak |
| `flowgridDaily`        | string  | Last daily puzzle date     |
| `flowgridDailyState`   | object  | In-progress daily state    |
| `flowgridOnboarding`   | boolean | Tutorial dismissed         |
