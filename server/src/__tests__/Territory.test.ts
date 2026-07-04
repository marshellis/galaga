import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyState } from "shared/schemas/EnemyState";
import { BulletState } from "shared/schemas/BulletState";
import { BulletManager } from "../game/BulletManager";
import { CollisionDetector } from "../game/CollisionDetector";
import { CompetitiveSubtype, EnemyType, GameMode } from "shared/types/enums";

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Competitive;
  state.subType = CompetitiveSubtype.Territory;

  const p1 = new PlayerState();
  p1.sessionId = "p1"; p1.x = 200; p1.y = 540; p1.alive = true; p1.score = 0; p1.territoryZone = 0;
  state.players.set("p1", p1);

  const p2 = new PlayerState();
  p2.sessionId = "p2"; p2.x = 600; p2.y = 540; p2.alive = true; p2.score = 0; p2.territoryZone = 1;
  state.players.set("p2", p2);

  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, p1, p2, bm, cd };
}

function enemyAt(state: GameState, x: number, y = 300) {
  const e = new EnemyState();
  e.id = `e-${Math.random()}`; e.x = x; e.y = y; e.hp = 1; e.alive = true; e.type = EnemyType.Basic;
  state.enemies.push(e);
  return e;
}

function bullet(state: GameState, ownerId: string, ex: number) {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = ex; b.y = 300;
  b.width = 4; b.height = 12; b.ownerId = ownerId; b.isEnemy = false;
  state.bullets.push(b);
  return b;
}

describe("Territory mode — zone scoring", () => {
  it("kill in zone 0 (x < 400) scores for player with territoryZone 0", () => {
    const { state, p1, p2, cd } = setup();
    enemyAt(state, 200); // zone 0 (x < 400)
    bullet(state, "p2", 200); // p2 fires the killing bullet
    cd.check();
    // points go to zone owner (p1), not bullet owner (p2)
    expect(p1.score).toBe(100);
    expect(p2.score).toBe(0);
  });

  it("kill in zone 1 (x >= 400) scores for player with territoryZone 1", () => {
    const { state, p1, p2, cd } = setup();
    enemyAt(state, 600); // zone 1 (x >= 400)
    bullet(state, "p1", 600); // p1 fires the killing bullet
    cd.check();
    // points go to zone owner (p2), not bullet owner (p1)
    expect(p2.score).toBe(100);
    expect(p1.score).toBe(0);
  });
});
