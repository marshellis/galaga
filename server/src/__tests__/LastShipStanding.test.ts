import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { BulletState } from "shared/schemas/BulletState";
import { BulletManager } from "../game/BulletManager";
import { CollisionDetector } from "../game/CollisionDetector";
import { CompetitiveSubtype, GameMode } from "shared/types/enums";

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Competitive;
  state.subType = CompetitiveSubtype.LastShipStanding;

  const p1 = new PlayerState();
  p1.sessionId = "p1"; p1.x = 400; p1.y = 540; p1.alive = true; p1.lives = 3;
  state.players.set("p1", p1);

  const p2 = new PlayerState();
  p2.sessionId = "p2"; p2.x = 400; p2.y = 200; p2.alive = true; p2.lives = 3;
  state.players.set("p2", p2);

  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, p1, p2, bm, cd };
}

function playerBullet(state: GameState, ownerId: string, x: number, y: number) {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 12; b.ownerId = ownerId; b.isEnemy = false;
  state.bullets.push(b);
  return b;
}

describe("Last Ship Standing — friendly fire", () => {
  it("player bullet can hit another player", () => {
    const { state, p2, cd } = setup();
    playerBullet(state, "p1", p2.x, p2.y);
    cd.check();
    expect(p2.lives).toBe(2);
  });

  it("player bullet does not hit bullet's own owner", () => {
    const { state, p1, p2, cd } = setup();
    playerBullet(state, "p1", p1.x, p1.y); // aimed at self position
    cd.check();
    expect(p1.lives).toBe(3); // self not harmed
    expect(p2.lives).toBe(3); // too far to be hit
  });

  it("friendly fire is disabled in non-LastShipStanding modes", () => {
    const state = new GameState();
    state.worldWidth = 800; state.worldHeight = 600;
    state.gameMode = GameMode.Competitive;
    state.subType = CompetitiveSubtype.ScoreRace;
    const p1 = new PlayerState();
    p1.sessionId = "p1"; p1.x = 400; p1.y = 400; p1.alive = true; p1.lives = 3;
    const p2 = new PlayerState();
    p2.sessionId = "p2"; p2.x = 400; p2.y = 400; p2.alive = true; p2.lives = 3;
    state.players.set("p1", p1);
    state.players.set("p2", p2);
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    playerBullet(state, "p1", 400, 400);
    cd.check();
    expect(p2.lives).toBe(3); // no friendly fire
  });
});
