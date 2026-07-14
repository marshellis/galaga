import { describe, it, expect } from "vitest";
import { WaveManager } from "../game/WaveManager";
import { EnemyManager } from "../game/EnemyManager";
import { GameState } from "shared/schemas/GameState";

function makeState() {
  const s = new GameState();
  s.worldWidth = 800;
  s.worldHeight = 600;
  return s;
}

describe("WaveManager", () => {
  it("start() sets wave to 1 and spawns enemies", () => {
    const state = makeState();
    const em = new EnemyManager(state);
    const wm = new WaveManager(state, em, 1);
    wm.start();
    expect(state.wave).toBe(1);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("check() does nothing when enemies remain", () => {
    const state = makeState();
    const em = new EnemyManager(state);
    const wm = new WaveManager(state, em, 1);
    wm.start();
    const countAfterStart = state.enemies.length;
    wm.check();
    expect(state.wave).toBe(1);
    expect(state.enemies.length).toBe(countAfterStart);
  });

  it("check() advances to wave 2 and spawns more enemies when all defeated", () => {
    const state = makeState();
    const em = new EnemyManager(state);
    const wm = new WaveManager(state, em, 1);
    wm.start();
    // clear all enemies
    while (state.enemies.length > 0) state.enemies.splice(0, 1);
    wm.check();
    expect(state.wave).toBe(2);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("wave 3 spawns the same enemy count as wave 1 (speed scales, not count)", () => {
    const state1 = makeState();
    const em1 = new EnemyManager(state1);
    const wm1 = new WaveManager(state1, em1, 1);
    wm1.start();
    const wave1Count = state1.enemies.length;

    const state3 = makeState();
    const em3 = new EnemyManager(state3);
    em3.spawnFormation(3, 1);
    expect(state3.enemies.length).toBe(wave1Count);
  });
});
