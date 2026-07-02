import { describe, it, expect } from "vitest";
import { EnemyManager } from "../game/EnemyManager";
import { GameState } from "shared/schemas/GameState";

function makeState(worldWidth = 800) {
  const s = new GameState();
  s.worldWidth = worldWidth;
  s.worldHeight = 600;
  return s;
}

// Colyseus ArraySchema doesn't support numeric index access outside a room context.
// Use forEach to extract items for assertions.
function enemies(state: GameState) {
  const arr: ReturnType<typeof state.enemies.at>[] = [];
  state.enemies.forEach(e => arr.push(e));
  return arr as NonNullable<ReturnType<typeof state.enemies.at>>[];
}

describe("EnemyManager", () => {
  it("spawns enemies on spawnFormation", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("spawns more enemies for more players", () => {
    const s1 = makeState(800);
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState(1200);
    new EnemyManager(s2).spawnFormation(1, 3);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("spawns more enemies on higher waves", () => {
    const s1 = makeState();
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState();
    new EnemyManager(s2).spawnFormation(5, 1);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("allDefeated returns true when enemies array is empty", () => {
    const state = makeState();
    expect(new EnemyManager(state).allDefeated()).toBe(true);
  });

  it("moves enemies horizontally each update", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    const startX = enemies(state)[0].x;
    mgr.update(0.5);
    expect(enemies(state)[0].x).not.toBe(startX);
  });
});
