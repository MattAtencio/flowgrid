# FlowGrid — Development Guide

## What is this?
FlowGrid is a grid puzzle PWA where players connect color pairs without crossing paths. Fill every cell to win. Deployed at flowgrid.mattatencio.com.

## Tech Stack
- **Next.js 16** (App Router) — JavaScript, no TypeScript
- **CSS Modules** for styling
- **@ducanh2912/next-pwa** for PWA support
- **Vercel** for deployment, **Cloudflare** for DNS (DNS-only, no proxy)
- **localStorage** for persistence (stats, daily progress, onboarding)
- **CSS Grid** for the game board (divs, not canvas)

## Project Structure
```
flowgrid/
├── app/
│   ├── layout.js          # Root layout, PWA meta, fonts
│   ├── page.js            # Home — renders <FlowGrid />
│   └── globals.css        # Global reset, scroll prevention
├── components/
│   ├── FlowGrid.jsx       # Core game component
│   └── FlowGrid.module.css
├── data/
│   └── puzzles.js         # Pre-generated puzzle definitions
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── next.config.mjs        # PWA config (webpack build)
└── package.json
```

## Key Rules
- All client components need `"use client"` directive
- Guard `localStorage` with `typeof window !== "undefined"`
- Mobile-first: `100dvh`, max-width `430px`, no scroll
- No backend — everything client-side
- Build with `--webpack` flag (Turbopack breaks next-pwa)
- Daily puzzles use seeded rotation: `YYYYMMDD % puzzles.length`

## Commands
```bash
npm run dev          # Local dev (Turbopack)
npm run build        # Production build (Webpack, generates SW)
npx vercel --prod    # Deploy to production
```

## Game Mechanics
- Grid of colored dot pairs — connect matching dots with orthogonal paths
- Paths cannot cross or overlap
- Every cell must be filled to win
- Drawing over existing paths overwrites them
- Pointer events for touch + mouse support
- `touch-action: none` on grid to prevent scroll during draw

## Puzzle Format
```javascript
{
  size: 6,
  endpoints: [
    { color: 'red', positions: [[0,1], [4,5]] },
    { color: 'blue', positions: [[1,0], [3,2]] },
  ]
}
```

## Design
- Dark theme: background `#07070f`, text `#e8e8f0`
- Theme color: `#22c55e` (green — differentiates from Spectrum's purple)
- 8 flow colors: red, blue, green, yellow, purple, orange, cyan, pink
- Fonts: consistent with Spectrum (DM Serif Display + Outfit)
