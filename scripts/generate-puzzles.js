/**
 * Puzzle generator for FlowGrid
 *
 * Approach: Generate a solved grid first (all cells filled with non-crossing paths),
 * then extract endpoints. This guarantees every puzzle has at least one valid solution.
 */

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "pink"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSolvedGrid(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const paths = [];
  let colorIdx = 0;

  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const emptyCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === null) emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length === 0) break;
    if (colorIdx >= COLORS.length) return null;

    const color = COLORS[colorIdx];
    const start = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const path = [start];
    grid[start[0]][start[1]] = color;

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let stuck = 0;

    while (stuck < 10) {
      const [cr, cc] = path[path.length - 1];
      const neighbors = shuffle(dirs)
        .map(([dr, dc]) => [cr + dr, cc + dc])
        .filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === null);

      if (neighbors.length === 0) {
        stuck++;
        if (path.length === 1) {
          grid[start[0]][start[1]] = null;
          break;
        }
        break;
      }

      let chosen = neighbors[0];
      path.push(chosen);
      grid[chosen[0]][chosen[1]] = color;
      stuck = 0;
    }

    if (path.length >= 2) {
      paths.push({ color, path: [...path] });
      colorIdx++;
    } else if (path.length === 1) {
      grid[path[0][0]][path[0][1]] = null;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) return null;
    }
  }

  return { grid, paths };
}

function gridToFlows(paths) {
  return paths.map(({ color, path }) => [
    color,
    [path[0][0], path[0][1]],
    [path[path.length - 1][0], path[path.length - 1][1]],
  ]);
}

function totalPathLength(paths) {
  return paths.reduce((sum, p) => sum + p.path.length, 0);
}

function generatePuzzle(size) {
  for (let i = 0; i < 1000; i++) {
    const result = generateSolvedGrid(size);
    if (result) {
      const flows = gridToFlows(result.paths);
      const total = totalPathLength(result.paths);
      if (total === size * size && flows.length >= Math.floor(size * 0.6) && flows.length <= COLORS.length) {
        return { size, flows, optimalMoves: flows.length };
      }
    }
  }
  return null;
}

function formatPuzzle(puzzle) {
  const flowStrs = puzzle.flows
    .map(([color, [r1, c1], [r2, c2]]) => `      ["${color}", [${r1}, ${c1}], [${r2}, ${c2}]]`)
    .join(",\n");
  return `  {\n    size: ${puzzle.size},\n    flows: [\n${flowStrs},\n    ],\n  }`;
}

// Generate puzzles for all sizes
const sizes = [
  { size: 5, count: 20 },
  { size: 6, count: 20 },
  { size: 7, count: 20 },
  { size: 8, count: 20 },
];

const allPuzzles = {};

for (const { size, count } of sizes) {
  console.log(`Generating ${size}x${size} puzzles...`);
  const puzzles = [];
  let failures = 0;
  while (puzzles.length < count && failures < 5000) {
    const p = generatePuzzle(size);
    if (p) {
      puzzles.push(p);
      process.stdout.write(`  ${puzzles.length}/${count}\r`);
      failures = 0;
    } else {
      failures++;
    }
  }
  allPuzzles[size] = puzzles;
  console.log(`\nGenerated ${puzzles.length} ${size}x${size} puzzles`);
}

// Output as JS
const output = `/**
 * FlowGrid Puzzle Definitions (auto-generated)
 *
 * Each puzzle is guaranteed to have at least one solution
 * where every cell is filled with non-crossing paths.
 *
 * Colors: red, blue, green, yellow, purple, orange, cyan, pink
 */

// ── 5×5 Puzzles ──────────────────────────────────────────

const puzzles5x5 = [
${allPuzzles[5].map(formatPuzzle).join(",\n")},
];

// ── 6×6 Puzzles ──────────────────────────────────────────

const puzzles6x6 = [
${allPuzzles[6].map(formatPuzzle).join(",\n")},
];

// ── 7×7 Puzzles ──────────────────────────────────────────

const puzzles7x7 = [
${allPuzzles[7].map(formatPuzzle).join(",\n")},
];

// ── 8×8 Puzzles ──────────────────────────────────────────

const puzzles8x8 = [
${allPuzzles[8].map(formatPuzzle).join(",\n")},
];

const ALL_PUZZLES = { 5: puzzles5x5, 6: puzzles6x6, 7: puzzles7x7, 8: puzzles8x8 };

export function getDailySeed() {
  const now = new Date();
  return (
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate()
  );
}

export function getDailyPuzzle(size) {
  const seed = getDailySeed();
  const pool = ALL_PUZZLES[size] || puzzles5x5;
  return { puzzle: pool[seed % pool.length], puzzleNumber: seed % 10000 };
}

export function getPuzzle(size, index) {
  const pool = ALL_PUZZLES[size] || puzzles5x5;
  return pool[index % pool.length];
}

export const PUZZLES = ALL_PUZZLES;
`;

const fs = require("fs");
fs.writeFileSync("data/puzzles.js", output);
console.log("\nWrote data/puzzles.js");
