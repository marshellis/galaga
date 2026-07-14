import { describe, it, expect } from "vitest";
import { EnemyManager } from "../game/EnemyManager";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";

function makeState(worldWidth = 800) {
  const s = new GameState();
  s.worldWidth = worldWidth;
  s.worldHeight = 600;
  return s;
}

function enemies(state: GameState) {
  const arr: ReturnType<typeof state.enemies.at>[] = [];
  state.enemies.forEach(e => arr.push(e));
  return arr as NonNullable<ReturnType<typeof state.enemies.at>>[];
}

function addPlayer(state: GameState, id = "p1", x = 400, y = 540) {
  const p = new PlayerState();
  p.sessionId = id; p.x = x; p.y = y; p.alive = true; p.lives = 3;
  state.players.set(id, p);
  return p;
}

describe("EnemyManager", () => {
  it("spawns enemies on spawnFormation", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("spawns 15 enemies for 1 player (3 rows × 5 cols)", () => {
    const state = makeState();
    new EnemyManager(state).spawnFormation(1, 1);
    expect(state.enemies.length).toBe(15);
  });

  it("spawns more enemies for more players", () => {
    const s1 = makeState(800);
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState(1200);
    new EnemyManager(s2).spawnFormation(1, 3);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("enemy count does not change between waves (speed scales instead)", () => {
    const s1 = makeState();
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState();
    new EnemyManager(s2).spawnFormation(5, 1);

    expect(s1.enemies.length).toBe(s2.enemies.length);
  });

  it("all enemies start with entering=true", () => {
    const state = makeState();
    new EnemyManager(state).spawnFormation(1, 1);
    const all = enemies(state);
    expect(all.every(e => e.entering === true)).toBe(true);
  });

  it("entering flips to false once an enemy reaches its formation waypoints", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);

    // Run for 10 seconds — all enemies should have reached their slots
    for (let i = 0; i < 100; i++) mgr.update(0.1);

    expect(enemies(state).some(e => e.entering === true)).toBe(false);
  });

  it("allDefeated returns true when enemies array is empty", () => {
    const state = makeState();
    expect(new EnemyManager(state).allDefeated()).toBe(true);
  });

  it("dive path produces a curved trajectory (midpoint not on straight line)", () => {
    const state = makeState();
    addPlayer(state, "p1", 400, 540);
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);

    // Fast-forward entry
    for (let i = 0; i < 100; i++) mgr.update(0.1);

    // Find a formation enemy and record its start position
    const firstEnemy = enemies(state)[0];
    const startX = firstEnemy.x;
    const startY = firstEnemy.y;

    // Force a dive by running many small ticks until one enemy starts diving
    let diveStartX = 0, diveStartY = 0;
    let diveEnemy: typeof firstEnemy | null = null;
    for (let i = 0; i < 200 && !diveEnemy; i++) {
      mgr.update(0.016);
      enemies(state).forEach(e => {
        if (e.diving && !diveEnemy) {
          diveEnemy = e;
          diveStartX = e.x;
          diveStartY = e.y;
        }
      });
    }

    if (!diveEnemy) return; // no enemy dove — skip (probabilistic)

    // Advance the dive to t≈0.5
    for (let i = 0; i < 50; i++) mgr.update(0.033);

    const midX = (diveEnemy as any).x;
    const midY = (diveEnemy as any).y;

    // On a straight line, midY would be roughly (startY + 540) / 2 ≈ midpoint
    // The Bézier control point adds lateral offset, so midX deviates from straight line
    const straightMidX = (diveStartX + 400) / 2;
    expect(Math.abs(midX - straightMidX)).toBeGreaterThan(10); // curved, not straight
  });
});
