import { GameState } from "shared/schemas/GameState";
import { EnemyState } from "shared/schemas/EnemyState";
import { EnemyType } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { v4 as uuid } from "uuid";

const SWEEP_SPEED = 60;
const DIVE_SPEED = 180;
const DIVE_CHANCE = 0.3;
const FIRE_CHANCE = 0.15;
const MARGIN = 40;

export class EnemyManager {
  private sweepDir = 1;
  private bulletManager: BulletManager | null = null;

  constructor(private state: GameState) {}

  setBulletManager(bm: BulletManager) {
    this.bulletManager = bm;
  }

  spawnFormation(wave: number, playerCount: number) {
    const cols = 8 + (playerCount - 1) * 2;
    const rows = 4 + Math.floor((wave - 1) / 2);
    const spacingX = this.state.worldWidth / (cols + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const e = new EnemyState();
        e.id = uuid();
        e.x = spacingX * (col + 1);
        e.y = 56 + row * 44;
        e.type = row === 0 ? EnemyType.Boss : EnemyType.Basic;
        e.hp = row === 0 ? 2 : 1;
        e.alive = true;
        e.diving = false;
        this.state.enemies.push(e);
      }
    }
  }

  update(dtSec: number) {
    const formation: EnemyState[] = [];
    this.state.enemies.forEach(e => { if (!e.diving) formation.push(e); });
    if (formation.length > 0) {
      const rightmost = Math.max(...formation.map(e => e.x));
      const leftmost  = Math.min(...formation.map(e => e.x));
      if (rightmost >= this.state.worldWidth - MARGIN) this.sweepDir = -1;
      if (leftmost  <= MARGIN)                          this.sweepDir =  1;
    }
    const toRemove: string[] = [];
    this.state.enemies.forEach(e => {
      if (e.diving) {
        e.y += DIVE_SPEED * dtSec;
        if (e.y > this.state.worldHeight + 40) toRemove.push(e.id);
      } else {
        e.x += SWEEP_SPEED * this.sweepDir * dtSec;
        if (Math.random() < DIVE_CHANCE * dtSec) e.diving = true;
        if (this.bulletManager && Math.random() < FIRE_CHANCE * dtSec) {
          this.bulletManager.spawnEnemyBullet(e.x, e.y);
        }
      }
    });
    for (const id of toRemove) {
      const idx = this.state.enemies.findIndex(e => e.id === id);
      if (idx !== -1) this.state.enemies.splice(idx, 1);
    }
  }

  allDefeated(): boolean {
    return this.state.enemies.length === 0;
  }
}
