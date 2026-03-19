"use client";

import Link from "next/link";
import styles from "./help.module.css";

export default function HelpPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>FlowGrid</h1>
        <span className={styles.subtitle}>Guide</span>
      </header>

      {/* How to Play */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How to Play</h2>
        <div className={styles.card}>
          <p className={styles.text}>
            FlowGrid is a path-drawing puzzle. Each grid contains pairs of
            colored dots. Your goal is to connect every matching pair with a
            continuous path — and fill every cell on the board.
          </p>
          <ol className={styles.steps}>
            <li>
              <strong>Drag</strong> from any colored dot to start drawing a path.
            </li>
            <li>
              <strong>Draw</strong> horizontally or vertically through empty cells
              toward the matching dot of the same color.
            </li>
            <li>
              <strong>Connect</strong> both dots of every color pair.
            </li>
            <li>
              <strong>Fill</strong> every cell on the grid — no empty spaces
              allowed.
            </li>
          </ol>
          <div className={styles.ruleList}>
            <div className={styles.rule}>
              <span className={styles.ruleIcon} style={{ color: "#ef4444" }}>
                &#x2716;
              </span>
              <span>
                Paths cannot cross or overlap each other. Drawing through an
                existing path will erase it.
              </span>
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleIcon} style={{ color: "#22c55e" }}>
                &#x21A9;
              </span>
              <span>
                You can backtrack along your current path by dragging backward.
              </span>
            </div>
            <div className={styles.rule}>
              <span className={styles.ruleIcon} style={{ color: "#3b82f6" }}>
                &#x27F3;
              </span>
              <span>
                Tap <strong>Reset</strong> to clear all paths and start the
                puzzle fresh.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tips</h2>
        <div className={styles.card}>
          <ul className={styles.tipList}>
            <li>
              <strong>Start with edge dots.</strong> Dots on the border often
              have limited path options, making them easier to route first.
            </li>
            <li>
              <strong>Think about space.</strong> Every cell must be filled, so
              consider how paths can cover the whole grid — not just the shortest
              route.
            </li>
            <li>
              <strong>Work on adjacent pairs.</strong> Connect dots that are close
              together first, then fill remaining space with longer paths.
            </li>
            <li>
              <strong>Look for forced moves.</strong> Some cells only have one
              possible color that can pass through them. Identify those early.
            </li>
            <li>
              <strong>Fewer moves = more stars.</strong> Each completed path
              counts as one move. Solving efficiently earns you up to 3 stars and
              bonus XP.
            </li>
          </ul>
        </div>
      </section>

      {/* Game Modes */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Game Modes</h2>
        <div className={styles.card}>
          <div className={styles.modeItem}>
            <h3 className={styles.modeName}>Daily Puzzle</h3>
            <p className={styles.text}>
              A new puzzle every day for each grid size. Complete it to build
              your streak. Tap the mode label below the size selector to switch.
            </p>
          </div>
          <div className={styles.modeItem}>
            <h3 className={styles.modeName}>Free Play</h3>
            <p className={styles.text}>
              Unlimited puzzles to practice at any size. Great for honing your
              strategy before the daily challenge.
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.card}>
          <p className={styles.text}>
            FlowGrid is a daily path puzzle game inspired by classic flow-connect
            puzzles. It is built as a progressive web app — install it to your
            home screen for the best experience.
          </p>
          <p className={styles.text} style={{ marginTop: 8, opacity: 0.5 }}>
            Created by Matt Atencio.
          </p>
        </div>
      </section>

      {/* Back Button */}
      <div className={styles.backRow}>
        <Link href="/" className={styles.backBtn}>
          Back to Game
        </Link>
      </div>
    </div>
  );
}
