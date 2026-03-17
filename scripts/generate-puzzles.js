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

  // Try to fill the entire grid with snake-like paths
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Find a random empty cell to start a new path
    const emptyCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === null) emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length === 0) break; // Grid is full!

    if (colorIdx >= COLORS.length) return null; // Ran out of colors

    const color = COLORS[colorIdx];
    const start = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const path = [start];
    grid[start[0]][start[1]] = color;

    // Random walk to extend the path
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let stuck = 0;

    while (stuck < 10) {
      const [cr, cc] = path[path.length - 1];
      const neighbors = shuffle(dirs)
        .map(([dr, dc]) => [cr + dr, cc + dc])
        .filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === null);

      if (neighbors.length === 0) {
        stuck++;
        // If path is too short (just 1 cell), undo and try again
        if (path.length === 1) {
          grid[start[0]][start[1]] = null;
          break;
        }
        break; // End this path
      }

      // Pick a neighbor, preferring ones that don't create isolated empty cells
      let chosen = null;
      for (const n of neighbors) {
        chosen = n;
        // Simple heuristic: prefer neighbors that leave connected empty regions
        break;
      }

      path.push(chosen);
      grid[chosen[0]][chosen[1]] = color;
      stuck = 0;
    }

    if (path.length >= 2) {
      paths.push({ color, path: [...path] });
      colorIdx++;
    } else if (path.length === 1) {
      // Undo single-cell path
      grid[path[0][0]][path[0][1]] = null;
    }
  }

  // Check if grid is fully filled
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

function generatePuzzle(size) {
  // Try many times to generate a valid filled grid
  for (let i = 0; i < 500; i++) {
    const result = generateSolvedGrid(size);
    if (result) {
      const flows = gridToFlows(result.paths);
      // Filter out tiny paths (< 2 cells) and ensure reasonable number of colors
      if (flows.length >= Math.floor(size * 0.8) && flows.length <= size + 2) {
        return { size, flows };
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

// Generate puzzles
const count5 = 15;
const count6 = 15;

console.log("Generating 5x5 puzzles...");
const puzzles5 = [];
while (puzzles5.length < count5) {
  const p = generatePuzzle(5);
  if (p) {
    puzzles5.push(p);
    process.stdout.write(`  ${puzzles5.length}/${count5}\r`);
  }
}

console.log(`\nGenerated ${puzzles5.length} 5x5 puzzles`);

console.log("Generating 6x6 puzzles...");
const puzzles6 = [];
while (puzzles6.length < count6) {
  const p = generatePuzzle(6);
  if (p) {
    puzzles6.push(p);
    process.stdout.write(`  ${puzzles6.length}/${count6}\r`);
  }
}

console.log(`\nGenerated ${puzzles6.length} 6x6 puzzles`);

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
${puzzles5.map(formatPuzzle).join(",\n")},
];

// ── 6×6 Puzzles ──────────────────────────────────────────

const puzzles6x6 = [
${puzzles6.map(formatPuzzle).join(",\n")},
];

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
  const pool = size === 5 ? puzzles5x5 : puzzles6x6;
  return { puzzle: pool[seed % pool.length], puzzleNumber: seed % 10000 };
}

export function getPuzzle(size, index) {
  const pool = size === 5 ? puzzles5x5 : puzzles6x6;
  return pool[index % pool.length];
}

export const PUZZLES = { 5: puzzles5x5, 6: puzzles6x6 };
`;

const fs = require("fs");
fs.writeFileSync("data/puzzles.js", output);
console.log("\nWrote data/puzzles.js");
