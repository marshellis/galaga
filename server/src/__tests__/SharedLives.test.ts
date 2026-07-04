import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { BulletState } from "shared/schemas/BulletState";
import { BulletManager } from "../game/BulletManager";
import { CollisionDetector } from "../game/CollisionDetector";
import { CoopSubtype, GameMode } from "shared/types/enums";

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Cooperative;
  state.subType = CoopSubtype.SharedLives;
  state.sharedLives = 3;
  const p = new PlayerState();
  p.sessionId = "p1"; p.x = 400; p.y = 540; p.alive = true; p.lives = 3;
  state.players.set("p1", p);
  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, p, bm, cd };
}

function enemyBullet(state: GameState, x: number, y: number) {
  const b = new BulletState();
  b.id = `eb-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 10; b.ownerId = "enemy"; b.isEnemy = true;
  state.bullets.push(b);
  return b;
}

describe("Shared Lives mode", () => {
  it("enemy bullet hit decrements sharedLives not player.lives", () => {
    const { state, p, cd } = setup();
    enemyBullet(state, 400, 540);
    cd.check();
    expect(state.sharedLives).toBe(2);
    expect(p.lives).toBe(3); // unchanged
    expect(p.alive).toBe(true); // still alive
  });

  it("player dies when sharedLives reaches 0", () => {
    const { state, p, cd } = setup();
    state.sharedLives = 1;
    enemyBullet(state, 400, 540);
    cd.check();
    expect(state.sharedLives).toBe(0);
    expect(p.alive).toBe(false);
  });

  it("individual lives mode still uses player.lives", () => {
    const state = new GameState();
    state.gameMode = GameMode.Cooperative;
    state.subType = CoopSubtype.IndependentLives;
    state.worldWidth = 800; state.worldHeight = 600;
    const p = new PlayerState();
    p.sessionId = "p1"; p.x = 400; p.y = 540; p.alive = true; p.lives = 3;
    state.players.set("p1", p);
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    enemyBullet(state, 400, 540);
    cd.check();
    expect(p.lives).toBe(2);
    expect(state.sharedLives).toBe(0); // untouched
  });
});
