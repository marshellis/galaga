import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyState } from "shared/schemas/EnemyState";
import { BulletState } from "shared/schemas/BulletState";
import { BulletManager } from "../game/BulletManager";
import { CollisionDetector } from "../game/CollisionDetector";
import { CoopSubtype, EnemyType, GameMode, PlayerRole } from "shared/types/enums";

const AOE_RADIUS = 60;

function roleState() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Cooperative;
  state.subType = CoopSubtype.RoleSpecialization;
  return state;
}

function addPlayer(state: GameState, id: string, role: PlayerRole, x = 400, y = 540) {
  const p = new PlayerState();
  p.sessionId = id; p.x = x; p.y = y; p.alive = true;
  p.lives = 3; p.hp = 2; p.role = role; p.score = 0;
  state.players.set(id, p);
  return p;
}

function addEnemy(state: GameState, id: string, x: number, y: number, hp = 1) {
  const e = new EnemyState();
  e.id = id; e.x = x; e.y = y; e.hp = hp; e.alive = true; e.type = EnemyType.Basic;
  state.enemies.push(e);
  return e;
}

function addBullet(state: GameState, x: number, y: number, ownerId: string, aoe = false) {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 12; b.ownerId = ownerId; b.isEnemy = false; b.aoe = aoe;
  state.bullets.push(b);
  return b;
}

function addEnemyBullet(state: GameState, x: number, y: number) {
  const b = new BulletState();
  b.id = `eb-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 10; b.ownerId = "enemy"; b.isEnemy = true;
  state.bullets.push(b);
  return b;
}

describe("Role Specialization — Bomber AOE", () => {
  it("aoe bullet removes all enemies within 60px on first impact", () => {
    const state = roleState();
    addPlayer(state, "p1", PlayerRole.Bomber);
    addEnemy(state, "e1", 400, 300); // hit directly
    addEnemy(state, "e2", 430, 320); // within 60px
    addEnemy(state, "e3", 600, 100); // outside radius
    addBullet(state, 400, 300, "p1", true);
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    cd.check();
    const ids = state.enemies.map(e => e.id);
    expect(ids).not.toContain("e1");
    expect(ids).not.toContain("e2");
    expect(ids).toContain("e3");
  });
});

describe("Role Specialization — Shield", () => {
  it("enemy bullet hitting shield player reduces hp not lives", () => {
    const state = roleState();
    const shield = addPlayer(state, "s1", PlayerRole.Shield);
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    addEnemyBullet(state, shield.x, shield.y);
    cd.check();
    expect(shield.hp).toBe(1);
    expect(shield.lives).toBe(3); // untouched
    expect(shield.alive).toBe(true);
  });

  it("shield player dies when hp reaches 0", () => {
    const state = roleState();
    const shield = addPlayer(state, "s1", PlayerRole.Shield);
    shield.hp = 1;
    const bm = new BulletManager(state);
    const cd = new CollisionDetector(state, bm);
    addEnemyBullet(state, shield.x, shield.y);
    cd.check();
    expect(shield.alive).toBe(false);
  });
});
