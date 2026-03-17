"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

const COLOR_EMOJIS = {
  red: "\u{1F7E5}",
  blue: "\u{1F7E6}",
  green: "\u{1F7E9}",
  yellow: "\u{1F7E8}",
  purple: "\u{1F7EA}",
  orange: "\u{1F7E7}",
  cyan: "\u{1F7E6}",
  pink: "\u{1F7EA}",
};

const AVAILABLE_SIZES = [5, 6, 7, 8];

// ── localStorage helpers ──

function loadStats() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("flowgridStats");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStats(stats) {
  if (typeof window === "undefined") return;
  localStorage.setItem("flowgridStats", JSON.stringify(stats));
}

function defaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalMoves: 0,
    bestMoves: {},
    xp: 0,
    lastPlayDate: null,
  };
}

function loadOnboarding() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("flowgridOnboarding") === "done";
}

// ── Grid helpers ──

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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Component ──

export default function FlowGrid() {
  const [gridSize, setGridSize] = useState(5);
  const [mode, setMode] = useState("daily");
  const [freeIndex, setFreeIndex] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [grid, setGrid] = useState(null);
  const [paths, setPaths] = useState({});
  const [drawing, setDrawing] = useState(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState(defaultStats);
  const [timer, setTimer] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  const gridRef = useRef(null);
  const drawingRef = useRef(null);
  const timerRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  // Load stats + onboarding on mount
  useEffect(() => {
    const s = loadStats();
    if (s) setStats(s);
    if (!loadOnboarding()) setShowOnboarding(true);
  }, []);

  // Timer
  useEffect(() => {
    if (timerEnabled && !won && puzzle) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerEnabled, won, puzzle]);

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
    setTimer(0);
  }, [gridSize, mode, freeIndex]);

  // Star rating based on moves vs flow count
  const getStars = useCallback((moveCount, flowCount) => {
    const ratio = moveCount / flowCount;
    if (ratio <= 1.5) return 3;
    if (ratio <= 2.5) return 2;
    return 1;
  }, []);

  // XP calculation
  const calcXP = useCallback((stars, size) => {
    const base = size * size;
    return base * stars;
  }, []);

  // Check win
  const checkWin = useCallback(
    (currentGrid, currentPaths, currentPuzzle) => {
      if (!currentPuzzle) return false;
      const { size, flows } = currentPuzzle;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!currentGrid[r][c].color) return false;
        }
      }

      for (const [color, [r1, c1], [r2, c2]] of flows) {
        const path = currentPaths[color];
        if (!path || path.length < 2) return false;
        const first = path[0];
        const last = path[path.length - 1];
        const connected =
          (first[0] === r1 && first[1] === c1 && last[0] === r2 && last[1] === c2) ||
          (first[0] === r2 && first[1] === c2 && last[0] === r1 && last[1] === c1);
        if (!connected) return false;
      }

      return true;
    },
    []
  );

  // Record win in stats
  const recordWin = useCallback(
    (moveCount, puzzleSize) => {
      setStats((prev) => {
        const stars = getStars(moveCount, puzzle?.flows.length || 5);
        const xpEarned = calcXP(stars, puzzleSize);
        const today = new Date().toISOString().split("T")[0];
        const isNewDay = prev.lastPlayDate !== today;
        const streakContinues = isNewDay || prev.lastPlayDate === null;

        const key = `${puzzleSize}-${puzzleNumber}`;
        const prevBest = prev.bestMoves[key];
        const newBest =
          prevBest === undefined ? moveCount : Math.min(prevBest, moveCount);

        const updated = {
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + 1,
          currentStreak: streakContinues ? prev.currentStreak + 1 : 1,
          bestStreak: Math.max(
            prev.bestStreak,
            streakContinues ? prev.currentStreak + 1 : 1
          ),
          totalMoves: prev.totalMoves + moveCount,
          bestMoves: { ...prev.bestMoves, [key]: newBest },
          xp: prev.xp + xpEarned,
          lastPlayDate: today,
        };
        saveStats(updated);
        return updated;
      });
    },
    [puzzle, puzzleNumber, getStars, calcXP]
  );

  // Rebuild grid from paths
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

  // Get cell from pointer
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
      const cellData = grid[r][c];

      if (!cellData.color) return;

      const color = cellData.color;
      const currentPath = paths[color] || [];
      let newPath;

      if (cellData.type === "endpoint") {
        const flowDef = puzzle.flows.find((f) => f[0] === color);
        const [, [r1, c1], [r2, c2]] = flowDef;
        newPath = r === r1 && c === c1 ? [[r1, c1]] : [[r2, c2]];
      } else {
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
        if (last[0] === r && last[1] === c) return prevPaths;
        if (!isAdjacent(last, [r, c])) return prevPaths;

        // Backtrack
        if (currentPath.length >= 2) {
          const prev = currentPath[currentPath.length - 2];
          if (prev[0] === r && prev[1] === c) {
            const newPath = currentPath.slice(0, -1);
            const newPaths = { ...prevPaths, [color]: newPath };
            setGrid(rebuildGrid(newPaths, puzzle));
            return newPaths;
          }
        }

        // Loop prevention
        if (currentPath.some((p) => p[0] === r && p[1] === c)) {
          return prevPaths;
        }

        // Check target cell
        const targetGrid = rebuildGrid(prevPaths, puzzle);
        const targetCell = targetGrid[r][c];

        let updatedPaths = { ...prevPaths };
        if (targetCell.color && targetCell.color !== color) {
          if (targetCell.type === "endpoint") return prevPaths;
          const otherColor = targetCell.color;
          const otherPath = updatedPaths[otherColor];
          if (otherPath) {
            const idx = otherPath.findIndex((p) => p[0] === r && p[1] === c);
            if (idx >= 0) {
              updatedPaths[otherColor] = otherPath.slice(0, idx);
            }
          }
        }

        updatedPaths[color] = [...updatedPaths[color], [r, c]];
        setGrid(rebuildGrid(updatedPaths, puzzle));
        return updatedPaths;
      });
    },
    [won, puzzle, getCellFromEvent, rebuildGrid]
  );

  // Stop drawing
  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    setDrawing(null);
    setMoves((m) => m + 1);

    setPaths((currentPaths) => {
      setGrid((currentGrid) => {
        if (checkWin(currentGrid, currentPaths, puzzle)) {
          setWon(true);
          setTimeout(() => setShowWin(true), 300);
          recordWin(moves + 1, puzzle.size);
        }
        return currentGrid;
      });
      return currentPaths;
    });
  }, [puzzle, checkWin, recordWin, moves]);

  // Reset
  const handleReset = useCallback(() => {
    if (!puzzle) return;
    setGrid(buildInitialGrid(puzzle));
    setPaths(buildInitialPaths(puzzle));
    setMoves(0);
    setWon(false);
    setShowWin(false);
    setTimer(0);
  }, [puzzle]);

  // Next puzzle (free play)
  const handleNext = useCallback(() => {
    if (mode === "free") setFreeIndex((i) => i + 1);
  }, [mode]);

  // Toggle mode
  const handleModeToggle = useCallback(() => {
    setMode((m) => (m === "daily" ? "free" : "daily"));
    setFreeIndex(0);
  }, []);

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("flowgridOnboarding", "done");
    }
  }, []);

  // Share results
  const handleShare = useCallback(() => {
    if (!puzzle || !grid) return;
    const { size } = puzzle;
    const stars = getStars(moves, puzzle.flows.length);
    const starStr = "\u2B50".repeat(stars) + "\u2606".repeat(3 - stars);

    let emojiGrid = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c];
        emojiGrid += cell.color ? COLOR_EMOJIS[cell.color] : "\u2B1C";
      }
      emojiGrid += "\n";
    }

    const label =
      mode === "daily" ? `Daily #${puzzleNumber}` : `Puzzle #${puzzleNumber}`;
    const text = `\u{1F9E9} FlowGrid ${label} \u2014 ${size}\u00D7${size}\n\u2705 Solved in ${moves} moves\n${starStr}\n\n${emojiGrid}\nflowgrid.mattatencio.com`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [puzzle, grid, moves, mode, puzzleNumber, getStars]);

  // Connected flow count
  const connectedCount = puzzle
    ? puzzle.flows.filter(([color, [r1, c1], [r2, c2]]) => {
        const path = paths[color];
        if (!path || path.length < 2) return false;
        const first = path[0];
        const last = path[path.length - 1];
        return (
          (first[0] === r1 && first[1] === c1 && last[0] === r2 && last[1] === c2) ||
          (first[0] === r2 && first[1] === c2 && last[0] === r1 && last[1] === c1)
        );
      }).length
    : 0;

  // Pipe connections for rendering
  const getConnections = useCallback(
    (r, c, cellColor) => {
      if (!cellColor || !puzzle) return {};
      const path = paths[cellColor];
      if (!path) return {};

      const idx = path.findIndex((p) => p[0] === r && p[1] === c);
      if (idx === -1) return {};

      const connections = { top: false, bottom: false, left: false, right: false };

      if (idx > 0) {
        const prev = path[idx - 1];
        if (prev[0] === r - 1 && prev[1] === c) connections.top = true;
        if (prev[0] === r + 1 && prev[1] === c) connections.bottom = true;
        if (prev[0] === r && prev[1] === c - 1) connections.left = true;
        if (prev[0] === r && prev[1] === c + 1) connections.right = true;
      }
      if (idx < path.length - 1) {
        const next = path[idx + 1];
        if (next[0] === r - 1 && next[1] === c) connections.top = true;
        if (next[0] === r + 1 && next[1] === c) connections.bottom = true;
        if (next[0] === r && next[1] === c - 1) connections.left = true;
        if (next[0] === r && next[1] === c + 1) connections.right = true;
      }

      return connections;
    },
    [paths, puzzle]
  );

  // Computed stars for win modal
  const winStars = useMemo(() => {
    if (!won || !puzzle) return 0;
    return getStars(moves, puzzle.flows.length);
  }, [won, puzzle, moves, getStars]);

  const winXP = useMemo(() => {
    if (!won || !puzzle) return 0;
    return calcXP(winStars, puzzle.size);
  }, [won, puzzle, winStars, calcXP]);

  if (!grid || !puzzle) return null;

  const totalFlows = puzzle.flows.length;

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <h1 className={styles.title}>FlowGrid</h1>
        <div className={styles.headerRight}>
          <button
            className={styles.iconBtn}
            onClick={() => setTimerEnabled((t) => !t)}
            title="Toggle timer"
          >
            {timerEnabled ? "\u23F1" : "\u23F1\uFE0E"}
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setShowStats(true)}
            title="Stats"
          >
            {"\u{1F4CA}"}
          </button>
        </div>
      </header>

      {/* ── Size Selector ── */}
      <div className={styles.sizeRow}>
        {AVAILABLE_SIZES.map((s) => (
          <button
            key={s}
            className={`${styles.sizeBtn} ${gridSize === s ? styles.active : ""}`}
            onClick={() => setGridSize(s)}
          >
            {s}\u00D7{s}
          </button>
        ))}
      </div>

      {/* ── Info Bar ── */}
      <div className={styles.info}>
        <span className={styles.modeLabel} onClick={handleModeToggle}>
          {mode === "daily" ? `Daily #${puzzleNumber}` : `Free Play #${puzzleNumber}`}
        </span>
        <div className={styles.infoRight}>
          {timerEnabled && (
            <span className={styles.timer}>{formatTime(timer)}</span>
          )}
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
      </div>

      {/* ── Grid ── */}
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
              const connections = getConnections(r, c, cell.color);
              const isEndpoint = cell.type === "endpoint";
              const hasColor = !!cell.color;
              const hex = cell.color ? COLORS[cell.color] : null;

              return (
                <div key={cellKey(r, c)} className={styles.cell}>
                  {hasColor && (
                    <div className={styles.pipe} style={{ "--flow-color": hex }}>
                      {connections.top && <div className={`${styles.segment} ${styles.segTop}`} />}
                      {connections.bottom && <div className={`${styles.segment} ${styles.segBottom}`} />}
                      {connections.left && <div className={`${styles.segment} ${styles.segLeft}`} />}
                      {connections.right && <div className={`${styles.segment} ${styles.segRight}`} />}
                      <div className={`${styles.center} ${isEndpoint ? styles.endpoint : ""}`} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.moveCount}>Moves: {moves}</span>
          <span className={styles.xpBadge}>{stats.xp} XP</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={handleReset}>Reset</button>
          {mode === "free" && (
            <button className={styles.btn} onClick={handleNext}>Next</button>
          )}
        </div>
      </div>

      {/* ── Win Modal ── */}
      {showWin && (
        <div className={styles.overlay} onClick={() => setShowWin(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.winStars}>
              {[1, 2, 3].map((s) => (
                <span key={s} className={s <= winStars ? styles.starFilled : styles.starEmpty}>
                  {s <= winStars ? "\u2B50" : "\u2606"}
                </span>
              ))}
            </div>
            <h2 className={styles.modalTitle}>Solved!</h2>
            <p className={styles.modalSub}>
              {mode === "daily" ? `Daily #${puzzleNumber}` : `Puzzle #${puzzleNumber}`}
              {" \u00B7 "}
              {puzzle.size}\u00D7{puzzle.size}
              {" \u00B7 "}
              {moves} moves
              {timerEnabled ? ` \u00B7 ${formatTime(timer)}` : ""}
            </p>
            <p className={styles.xpGain}>+{winXP} XP</p>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={handleShare}>
                {copied ? "Copied!" : "Share"}
              </button>
              {mode === "free" && (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => { setShowWin(false); handleNext(); }}
                >
                  Next Puzzle
                </button>
              )}
              <button className={styles.btn} onClick={() => setShowWin(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Modal ── */}
      {showStats && (
        <div className={styles.overlay} onClick={() => setShowStats(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Stats</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.gamesPlayed}</div>
                <div className={styles.statLabel}>Played</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {stats.gamesPlayed > 0
                    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                    : 0}%
                </div>
                <div className={styles.statLabel}>Win Rate</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.currentStreak}</div>
                <div className={styles.statLabel}>Streak</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.bestStreak}</div>
                <div className={styles.statLabel}>Best</div>
              </div>
            </div>
            <div className={styles.xpTotal}>
              <span className={styles.xpTotalLabel}>Total XP</span>
              <span className={styles.xpTotalValue}>{stats.xp}</span>
            </div>
            <button
              className={styles.btn}
              style={{ marginTop: 16, width: "100%" }}
              onClick={() => setShowStats(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Onboarding Modal ── */}
      {showOnboarding && (
        <div className={styles.overlay} onClick={dismissOnboarding}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>How to Play</h2>
            <div className={styles.onboardingSteps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>Connect matching color dots by drawing a path</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>Paths go horizontal/vertical only — no diagonals</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>Paths cannot cross or overlap each other</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>4</span>
                <span>Fill every cell on the grid to win</span>
              </div>
            </div>
            <p className={styles.onboardingTip}>
              Tap a dot and drag to draw. Drag backward to undo. Drawing through another path erases it.
            </p>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ marginTop: 16, width: "100%" }}
              onClick={dismissOnboarding}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
