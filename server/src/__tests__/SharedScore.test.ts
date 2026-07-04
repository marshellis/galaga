import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyState } from "shared/schemas/EnemyState";
import { BulletState } from "shared/schemas/BulletState";
import { BulletManager } from "../game/BulletManager";
import { CollisionDetector } from "../game/CollisionDetector";
import { CoopSubtype, EnemyType, GameMode } from "shared/types/enums";

function setup(subType: string) {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Cooperative;
  state.subType = subType;
  const p = new PlayerState();
  p.sessionId = "p1"; p.x = 400; p.y = 540; p.alive = true; p.lives = 3; p.score = 0;
  state.players.set("p1", p);
  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, p, bm, cd };
}

function enemy(state: GameState, x = 400, y = 300, hp = 1) {
  const e = new EnemyState();
  e.id = `e-${Math.random()}`; e.x = x; e.y = y; e.hp = hp;
  e.alive = true; e.type = EnemyType.Basic;
  state.enemies.push(e);
  return e;
}

function bullet(state: GameState, ownerId = "p1") {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = 400; b.y = 300;
  b.width = 4; b.height = 12; b.ownerId = ownerId; b.isEnemy = false;
  state.bullets.push(b);
  return b;
}

describe("Independent Lives + Shared Score mode", () => {
  it("kill adds to sharedScore not player.score", () => {
    const { state, p, cd } = setup(CoopSubtype.IndependentLives);
    enemy(state); bullet(state);
    cd.check();
    expect(state.sharedScore).toBe(100);
    expect(p.score).toBe(0);
  });

  it("shared lives mode still awards player.score", () => {
    const { state, p, cd } = setup(CoopSubtype.SharedLives);
    enemy(state); bullet(state);
    cd.check();
    expect(p.score).toBe(100);
    expect(state.sharedScore).toBe(0);
  });

  it("competitive mode still awards player.score", () => {
    const state = new GameState();
    state.worldWidth = 800; state.worldHeight = 600;
    state.gameMode = "competitive"; state.subType = "score_race";
    const p = new PlayerState();
    p.sessionId = "p1"; p.x = 400; p.y = 540; p.alive = true; p.score = 0;
    state.players.set("p1", p);
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    enemy(state); bullet(state);
    cd.check();
    expect(p.score).toBe(100);
  });
});
