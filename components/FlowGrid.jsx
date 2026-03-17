"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getDailyPuzzle, getPuzzle, PUZZLES } from "@/data/puzzles";
import styles from "./FlowGrid.module.css";

const COLORS = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

function buildInitialGrid(puzzle) {
  const { size, flows } = puzzle;
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ color: null, type: "empty" }))
  );
  for (const [color, [r1, c1], [r2, c2]] of flows) {
    grid[r1][c1] = { color, type: "endpoint" };
    grid[r2][c2] = { color, type: "endpoint" };
  }
  return grid;
}

function buildInitialPaths(puzzle) {
  const paths = {};
  for (const [color, [r1, c1]] of puzzle.flows) {
    paths[color] = [[r1, c1]];
  }
  return paths;
}

function isAdjacent(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function cellKey(r, c) {
  return `${r},${c}`;
}

export default function FlowGrid() {
  const [gridSize, setGridSize] = useState(5);
  const [mode, setMode] = useState("daily"); // "daily" | "free"
  const [freeIndex, setFreeIndex] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [grid, setGrid] = useState(null);
  const [paths, setPaths] = useState({});
  const [drawing, setDrawing] = useState(null); // { color }
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const gridRef = useRef(null);
  const drawingRef = useRef(null);

  // Keep ref in sync for pointer events
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  // Load puzzle
  useEffect(() => {
    let p, num;
    if (mode === "daily") {
      const daily = getDailyPuzzle(gridSize);
      p = daily.puzzle;
      num = daily.puzzleNumber;
    } else {
      p = getPuzzle(gridSize, freeIndex);
      num = freeIndex + 1;
    }
    setPuzzle(p);
    setPuzzleNumber(num);
    setGrid(buildInitialGrid(p));
    setPaths(buildInitialPaths(p));
    setMoves(0);
    setWon(false);
    setShowWin(false);
  }, [gridSize, mode, freeIndex]);

  // Check win condition
  const checkWin = useCallback(
    (currentGrid, currentPaths, currentPuzzle) => {
      if (!currentPuzzle) return false;
      const { size, flows } = currentPuzzle;

      // All cells filled?
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!currentGrid[r][c].color) return false;
        }
      }

      // All flows connected endpoint-to-endpoint?
      for (const [color, [r1, c1], [r2, c2]] of flows) {
        const path = currentPaths[color];
        if (!path || path.length < 2) return false;
        const first = path[0];
        const last = path[path.length - 1];
        const startsAtEndpoint =
          (first[0] === r1 && first[1] === c1 && last[0] === r2 && last[1] === c2) ||
          (first[0] === r2 && first[1] === c2 && last[0] === r1 && last[1] === c1);
        if (!startsAtEndpoint) return false;
      }

      return true;
    },
    []
  );

  // Rebuild grid from paths + puzzle endpoints
  const rebuildGrid = useCallback(
    (newPaths, currentPuzzle) => {
      if (!currentPuzzle) return null;
      const newGrid = buildInitialGrid(currentPuzzle);
      for (const [color, path] of Object.entries(newPaths)) {
        for (const [r, c] of path) {
          if (newGrid[r][c].type !== "endpoint") {
            newGrid[r][c] = { color, type: "path" };
          } else {
            newGrid[r][c] = { ...newGrid[r][c], color };
          }
        }
      }
      return newGrid;
    },
    []
  );

  // Get grid cell from pointer event
  const getCellFromEvent = useCallback(
    (e) => {
      if (!gridRef.current || !puzzle) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
      const cellSize = rect.width / puzzle.size;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size)
        return null;
      return [row, col];
    },
    [puzzle]
  );

  // Start drawing
  const handlePointerDown = useCallback(
    (e) => {
      if (won) return;
      e.preventDefault();
      const cell = getCellFromEvent(e);
      if (!cell) return;
      const [r, c] = cell;
      const currentGrid = grid;
      const cellData = currentGrid[r][c];

      if (!cellData.color) return; // empty cell, ignore

      const color = cellData.color;

      // Start new path from this color
      // If clicking on an endpoint, start fresh from that endpoint
      // If clicking on a path cell, truncate path at that point
      const currentPath = paths[color] || [];
      let newPath;

      if (cellData.type === "endpoint") {
        // Check if this endpoint is the start or we need to check both ends
        const flowDef = puzzle.flows.find((f) => f[0] === color);
        const [, [r1, c1], [r2, c2]] = flowDef;

        if (r === r1 && c === c1) {
          newPath = [[r1, c1]];
        } else {
          newPath = [[r2, c2]];
        }
      } else {
        // Clicked on a path segment — truncate at this point
        const idx = currentPath.findIndex((p) => p[0] === r && p[1] === c);
        if (idx >= 0) {
          newPath = currentPath.slice(0, idx + 1);
        } else {
          return;
        }
      }

      const newPaths = { ...paths, [color]: newPath };
      const newGrid = rebuildGrid(newPaths, puzzle);

      setPaths(newPaths);
      setGrid(newGrid);
      setDrawing({ color });

      // Capture pointer for reliable tracking
      if (e.pointerId !== undefined) {
        e.target.setPointerCapture?.(e.pointerId);
      }
    },
    [grid, paths, puzzle, won, getCellFromEvent, rebuildGrid]
  );

  // Continue drawing
  const handlePointerMove = useCallback(
    (e) => {
      const d = drawingRef.current;
      if (!d || won) return;
      e.preventDefault();

      const cell = getCellFromEvent(e);
      if (!cell) return;
      const [r, c] = cell;
      const { color } = d;

      setPaths((prevPaths) => {
        const currentPath = prevPaths[color];
        if (!currentPath || currentPath.length === 0) return prevPaths;

        const last = currentPath[currentPath.length - 1];

        // Same cell, ignore
        if (last[0] === r && last[1] === c) return prevPaths;

        // Must be adjacent
        if (!isAdjacent(last, [r, c])) return prevPaths;

        // Check if we're backtracking on our own path
        if (currentPath.length >= 2) {
          const prev = currentPath[currentPath.length - 2];
          if (prev[0] === r && prev[1] === c) {
            // Backtrack: remove last cell
            const newPath = currentPath.slice(0, -1);
            const newPaths = { ...prevPaths, [color]: newPath };
            const newGrid = rebuildGrid(newPaths, puzzle);
            setGrid(newGrid);
            return newPaths;
          }
        }

        // Check if cell is already in our own path (loop prevention)
        if (currentPath.some((p) => p[0] === r && p[1] === c)) {
          return prevPaths;
        }

        // Check what's in the target cell
        const targetGrid = rebuildGrid(prevPaths, puzzle);
        const targetCell = targetGrid[r][c];

        // If target cell has another color's path, remove that path from the point of collision
        let updatedPaths = { ...prevPaths };
        if (targetCell.color && targetCell.color !== color) {
          const otherColor = targetCell.color;
          if (targetCell.type === "endpoint") {
            // Can't draw through another color's endpoint
            return prevPaths;
          }
          const otherPath = updatedPaths[otherColor];
          if (otherPath) {
            const idx = otherPath.findIndex(
              (p) => p[0] === r && p[1] === c
            );
            if (idx >= 0) {
              updatedPaths[otherColor] = otherPath.slice(0, idx);
            }
          }
        }

        // Extend path
        const newPath = [...updatedPaths[color], [r, c]];
        updatedPaths[color] = newPath;

        const newGrid = rebuildGrid(updatedPaths, puzzle);
        setGrid(newGrid);

        return updatedPaths;
      });
    },
    [won, puzzle, getCellFromEvent, rebuildGrid]
  );

  // Stop drawing
  const handlePointerUp = useCallback(
    (e) => {
      if (!drawingRef.current) return;
      setDrawing(null);
      setMoves((m) => m + 1);

      // Check win after this move
      setPaths((currentPaths) => {
        setGrid((currentGrid) => {
          if (checkWin(currentGrid, currentPaths, puzzle)) {
            setWon(true);
            setTimeout(() => setShowWin(true), 300);
          }
          return currentGrid;
        });
        return currentPaths;
      });
    },
    [puzzle, checkWin]
  );

  // Reset current puzzle
  const handleReset = useCallback(() => {
    if (!puzzle) return;
    setGrid(buildInitialGrid(puzzle));
    setPaths(buildInitialPaths(puzzle));
    setMoves(0);
    setWon(false);
    setShowWin(false);
  }, [puzzle]);

  // Next free play puzzle
  const handleNext = useCallback(() => {
    if (mode === "free") {
      setFreeIndex((i) => i + 1);
    }
  }, [mode]);

  // Toggle mode
  const handleModeToggle = useCallback(() => {
    setMode((m) => (m === "daily" ? "free" : "daily"));
    setFreeIndex(0);
  }, []);

  // Count connected flows
  const connectedCount = puzzle
    ? puzzle.flows.filter(([color, [r1, c1], [r2, c2]]) => {
        const path = paths[color];
        if (!path || path.length < 2) return false;
        const first = path[0];
        const last = path[path.length - 1];
        return (
          ((first[0] === r1 && first[1] === c1 && last[0] === r2 && last[1] === c2) ||
            (first[0] === r2 && first[1] === c2 && last[0] === r1 && last[1] === c1))
        );
      }).length
    : 0;

  // Get pipe connection classes for a cell
  const getConnectionStyle = useCallback(
    (r, c, cellColor) => {
      if (!cellColor || !puzzle) return {};
      const path = paths[cellColor];
      if (!path) return {};

      const idx = path.findIndex((p) => p[0] === r && p[1] === c);
      if (idx === -1) return {};

      const connections = {
        top: idx > 0 && path[idx - 1][0] === r - 1 && path[idx - 1][1] === c,
        bottom:
          idx < path.length - 1 &&
          path[idx + 1][0] === r + 1 &&
          path[idx + 1][1] === c,
        left: idx > 0 && path[idx - 1][0] === r && path[idx - 1][1] === c - 1,
        right:
          idx < path.length - 1 &&
          path[idx + 1][0] === r &&
          path[idx + 1][1] === c + 1,
      };

      // Also check reverse for bidirectional connections
      if (idx > 0) {
        const prev = path[idx - 1];
        if (prev[0] === r + 1 && prev[1] === c) connections.bottom = true;
        if (prev[0] === r && prev[1] === c + 1) connections.right = true;
      }
      if (idx < path.length - 1) {
        const next = path[idx + 1];
        if (next[0] === r - 1 && next[1] === c) connections.top = true;
        if (next[0] === r && next[1] === c - 1) connections.left = true;
      }

      return connections;
    },
    [paths, puzzle]
  );

  if (!grid || !puzzle) return null;

  const totalFlows = puzzle.flows.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>FlowGrid</h1>
        <div className={styles.controls}>
          <button
            className={`${styles.sizeBtn} ${gridSize === 5 ? styles.active : ""}`}
            onClick={() => setGridSize(5)}
          >
            5×5
          </button>
          <button
            className={`${styles.sizeBtn} ${gridSize === 6 ? styles.active : ""}`}
            onClick={() => setGridSize(6)}
          >
            6×6
          </button>
        </div>
      </header>

      <div className={styles.info}>
        <span className={styles.modeLabel} onClick={handleModeToggle}>
          {mode === "daily" ? `Daily #${puzzleNumber}` : `Free Play #${puzzleNumber}`}
        </span>
        <span className={styles.flowCount}>
          {Array.from({ length: totalFlows }, (_, i) => (
            <span
              key={i}
              className={styles.flowDot}
              style={{
                background:
                  i < connectedCount
                    ? COLORS[puzzle.flows[i][0]]
                    : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </span>
      </div>

      <div className={styles.gridWrapper}>
        <div
          ref={gridRef}
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
            gridTemplateRows: `repeat(${puzzle.size}, 1fr)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const connections = getConnectionStyle(r, c, cell.color);
              const isEndpoint = cell.type === "endpoint";
              const hasColor = !!cell.color;
              const hex = cell.color ? COLORS[cell.color] : null;

              return (
                <div key={cellKey(r, c)} className={styles.cell}>
                  {hasColor && (
                    <div
                      className={styles.pipe}
                      style={{ "--flow-color": hex }}
                    >
                      {connections.top && (
                        <div className={`${styles.segment} ${styles.segTop}`} />
                      )}
                      {connections.bottom && (
                        <div className={`${styles.segment} ${styles.segBottom}`} />
                      )}
                      {connections.left && (
                        <div className={`${styles.segment} ${styles.segLeft}`} />
                      )}
                      {connections.right && (
                        <div className={`${styles.segment} ${styles.segRight}`} />
                      )}
                      <div
                        className={`${styles.center} ${isEndpoint ? styles.endpoint : ""}`}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.moveCount}>Moves: {moves}</div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={handleReset}>
            Reset
          </button>
          {mode === "free" && (
            <button className={styles.btn} onClick={handleNext}>
              Next
            </button>
          )}
        </div>
      </div>

      {showWin && (
        <div className={styles.winOverlay} onClick={() => setShowWin(false)}>
          <div className={styles.winModal}>
            <div className={styles.winEmoji}>🎉</div>
            <h2 className={styles.winTitle}>Solved!</h2>
            <p className={styles.winText}>
              {mode === "daily" ? `Daily #${puzzleNumber}` : `Puzzle #${puzzleNumber}`}
              {" · "}
              {puzzle.size}×{puzzle.size}
              {" · "}
              {moves} moves
            </p>
            <div className={styles.winActions}>
              <button className={styles.btn} onClick={() => setShowWin(false)}>
                Close
              </button>
              {mode === "free" && (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => {
                    setShowWin(false);
                    handleNext();
                  }}
                >
                  Next Puzzle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
