import { GameState } from "shared/schemas/GameState";
import { BulletState } from "shared/schemas/BulletState";
import { ShooterShotType } from "shared/types/enums";
import { v4 as uuid } from "uuid";

interface BulletConfig { speed: number; fireRateMs: number; w: number; h: number; }

const CONFIGS: Record<string, BulletConfig> = {
  [ShooterShotType.Rapid]:    { speed: 500, fireRateMs: 150, w: 3,  h: 8  },
  [ShooterShotType.Heavy]:    { speed: 250, fireRateMs: 600, w: 10, h: 18 },
  [ShooterShotType.Spread]:   { speed: 380, fireRateMs: 350, w: 4,  h: 10 },
  [ShooterShotType.Piercing]: { speed: 380, fireRateMs: 300, w: 4,  h: 12 },
};

const ENEMY_SPEED = 180;

export class BulletManager {
  private lastFired = new Map<string, number>();
  private velocities = new Map<string, { vx: number; vy: number }>();

  constructor(private state: GameState) {}

  spawnPlayerBullet(sessionId: string, x: number, y: number, shotType: string) {
    const cfg = CONFIGS[shotType] ?? CONFIGS[ShooterShotType.Rapid];
    const now = Date.now();
    if ((now - (this.lastFired.get(sessionId) ?? 0)) < cfg.fireRateMs) return;
    this.lastFired.set(sessionId, now);

    const angles = shotType === ShooterShotType.Spread ? [-15, 0, 15] : [0];
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const b = new BulletState();
      b.id = uuid();
      b.x = x;
      b.y = y - 16;
      b.width = cfg.w;
      b.height = cfg.h;
      b.ownerId = sessionId;
      b.isEnemy = false;
      b.piercing = shotType === ShooterShotType.Piercing;
      this.velocities.set(b.id, {
        vx: Math.sin(rad) * cfg.speed,
        vy: -Math.cos(rad) * cfg.speed,
      });
      this.state.bullets.push(b);
    }
  }

  spawnEnemyBullet(x: number, y: number) {
    const b = new BulletState();
    b.id = uuid();
    b.x = x;
    b.y = y + 16;
    b.width = 4;
    b.height = 10;
    b.ownerId = "enemy";
    b.isEnemy = true;
    this.velocities.set(b.id, { vx: 0, vy: ENEMY_SPEED });
    this.state.bullets.push(b);
  }

  /** Returns damage dealt by a bullet (Heavy = 2, all others = 1) */
  damageOf(bulletId: string): number {
    const b = this.state.bullets.find(x => x.id === bulletId);
    return b && b.width >= 10 ? 2 : 1;
  }

  update(dtSec: number) {
    const toRemove: string[] = [];
    this.state.bullets.forEach(b => {
      const vel = this.velocities.get(b.id) ?? { vx: 0, vy: b.isEnemy ? ENEMY_SPEED : -380 };
      b.x += vel.vx * dtSec;
      b.y += vel.vy * dtSec;
      if (b.y < -40 || b.y > this.state.worldHeight + 40 ||
          b.x < -40 || b.x > this.state.worldWidth + 40) {
        toRemove.push(b.id);
      }
    });
    for (const id of toRemove) this.removeBullet(id);
  }

  removeBullet(id: string) {
    const idx = this.state.bullets.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.velocities.delete(id);
      this.state.bullets.splice(idx, 1);
    }
  }
}
