import { describe, it, expect } from "vitest";
import { CollisionDetector } from "../game/CollisionDetector";
import { BulletManager } from "../game/BulletManager";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyState } from "shared/schemas/EnemyState";
import { BulletState } from "shared/schemas/BulletState";
import { EnemyType } from "shared/types/enums";

function enemies(state: GameState) {
  const arr: EnemyState[] = [];
  state.enemies.forEach(e => arr.push(e));
  return arr;
}

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  const player = new PlayerState();
  player.sessionId = "p1"; player.x = 400; player.y = 540;
  player.alive = true; player.lives = 3; player.hp = 1; player.score = 0;
  state.players.set("p1", player);
  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, player, bm, cd };
}

function enemy(state: GameState, x: number, y: number, hp = 1, type = EnemyType.Basic) {
  const e = new EnemyState();
  e.id = "e1"; e.x = x; e.y = y; e.hp = hp; e.alive = true; e.type = type;
  state.enemies.push(e);
  return e;
}

function playerBullet(state: GameState, x: number, y: number, piercing = false, width = 4) {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = x; b.y = y;
  b.width = width; b.height = 12; b.ownerId = "p1";
  b.isEnemy = false; b.piercing = piercing;
  state.bullets.push(b);
  return b;
}

function enemyBullet(state: GameState, x: number, y: number) {
  const b = new BulletState();
  b.id = `eb-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 10; b.ownerId = "enemy";
  b.isEnemy = true; b.piercing = false;
  state.bullets.push(b);
  return b;
}

describe("CollisionDetector", () => {
  it("player bullet hitting basic enemy removes both and awards 100 points", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300);
    playerBullet(state, 400, 300);
    cd.check();
    expect(state.enemies.length).toBe(0);
    expect(state.bullets.length).toBe(0);
    expect(player.score).toBe(100);
  });

  it("player bullet hitting boss enemy awards 200 points on kill", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300, 1, EnemyType.Boss);
    playerBullet(state, 400, 300);
    cd.check();
    expect(player.score).toBe(200);
  });

  it("normal bullet reduces 2-HP enemy to 1 HP without killing", () => {
    const { state, cd } = setup();
    enemy(state, 400, 300, 2);
    playerBullet(state, 400, 300);
    cd.check();
    expect(state.enemies.length).toBe(1);
    expect(enemies(state)[0].hp).toBe(1);
  });

  it("heavy bullet (width>=10) deals 2 damage", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300, 2);
    playerBullet(state, 400, 300, false, 10);
    cd.check();
    expect(state.enemies.length).toBe(0);
    expect(player.score).toBe(100);
  });

  it("enemy bullet hitting player reduces lives and removes bullet", () => {
    const { state, player, cd } = setup();
    enemyBullet(state, 400, 540);
    cd.check();
    expect(player.lives).toBe(2);
    expect(state.bullets.length).toBe(0);
  });

  it("player dies when lives reach 0", () => {
    const { state, player, cd } = setup();
    player.lives = 1;
    enemyBullet(state, 400, 540);
    cd.check();
    expect(player.alive).toBe(false);
  });

  it("piercing bullet stays after hitting an enemy", () => {
    const { state, cd } = setup();
    enemy(state, 400, 300);
    playerBullet(state, 400, 300, true);
    cd.check();
    expect(state.bullets.length).toBe(1);
    expect(state.enemies.length).toBe(0);
  });

  it("non-overlapping bullet and enemy do not interact", () => {
    const { state, player, cd } = setup();
    enemy(state, 100, 100);
    playerBullet(state, 700, 500);
    cd.check();
    expect(state.enemies.length).toBe(1);
    expect(player.score).toBe(0);
  });
});
