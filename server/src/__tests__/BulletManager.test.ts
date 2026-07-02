import { describe, it, expect } from "vitest";
import { BulletManager } from "../game/BulletManager";
import { GameState } from "shared/schemas/GameState";
import { ShooterShotType } from "shared/types/enums";

function makeState() {
  const s = new GameState();
  s.worldWidth = 800;
  s.worldHeight = 600;
  return s;
}

// Colyseus ArraySchema doesn't support numeric index access outside a room context.
// Use forEach to extract items for assertions.
function bullets(state: GameState) {
  const arr: ReturnType<typeof state.bullets.at>[] = [];
  state.bullets.forEach(b => arr.push(b));
  return arr as NonNullable<ReturnType<typeof state.bullets.at>>[];
}

describe("BulletManager", () => {
  it("spawns a player bullet at the given position", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    expect(state.bullets.length).toBe(1);
    expect(bullets(state)[0].x).toBe(400);
    expect(bullets(state)[0].isEnemy).toBe(false);
  });

  it("spawns 3 bullets for Spread shot type", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Spread);
    expect(state.bullets.length).toBe(3);
  });

  it("marks Piercing bullets with piercing=true", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Piercing);
    expect(bullets(state)[0].piercing).toBe(true);
  });

  it("Heavy bullet has a larger width than Rapid", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Heavy);
    expect(bullets(state)[0].width).toBeGreaterThan(4);
  });

  it("moves player bullets upward on update", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    const startY = bullets(state)[0].y;
    mgr.update(1 / 60);
    expect(bullets(state)[0].y).toBeLessThan(startY);
  });

  it("moves enemy bullets downward on update", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnEnemyBullet(400, 100);
    const startY = bullets(state)[0].y;
    mgr.update(1 / 60);
    expect(bullets(state)[0].y).toBeGreaterThan(startY);
  });

  it("removes bullets that travel off screen", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    // mutate via forEach since ArraySchema numeric index set is also unreliable in test
    state.bullets.forEach(b => { b.y = -200; });
    mgr.update(1 / 60);
    expect(state.bullets.length).toBe(0);
  });

  it("enforces fire rate cooldown per player", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    expect(state.bullets.length).toBe(1);
  });
});
