import { GameState } from "shared/schemas/GameState";
import { EnemyType, CoopSubtype } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { PLAYER_HALF, ENEMY_HALF } from "./constants";

function overlaps(ax: number, ay: number, aw: number, bx: number, by: number, bw: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (aw + bw) / 2;
}

export class CollisionDetector {
  constructor(private state: GameState, private bulletManager: BulletManager) {}

  check() {
    this.playerBulletsVsEnemies();
    this.enemyBulletsVsPlayers();
  }

  private playerBulletsVsEnemies() {
    const bulletsToRemove: string[] = [];
    const enemiesToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (bullet.isEnemy) return;
      if (bulletsToRemove.includes(bullet.id)) return; // already consumed
      const damage = this.bulletManager.damageOf(bullet.id);

      this.state.enemies.forEach(enemy => {
        if (enemiesToRemove.includes(enemy.id)) return; // already dead
        if (!overlaps(bullet.x, bullet.y, bullet.width, enemy.x, enemy.y, ENEMY_HALF)) return;

        enemy.hp -= damage;
        if (enemy.hp <= 0) {
          const points = enemy.type === EnemyType.Boss ? 200 : 100;
          const player = this.state.players.get(bullet.ownerId);
          if (player) player.score += points;
          enemiesToRemove.push(enemy.id);
        }
        if (!bullet.piercing) bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of enemiesToRemove) {
      const idx = this.state.enemies.findIndex(e => e.id === id);
      if (idx !== -1) this.state.enemies.splice(idx, 1);
    }
    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }

  private enemyBulletsVsPlayers() {
    const bulletsToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (!bullet.isEnemy) return;

      this.state.players.forEach(player => {
        if (!player.alive || bulletsToRemove.includes(bullet.id)) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;

        if (this.state.subType === CoopSubtype.SharedLives) {
          this.state.sharedLives -= 1;
          if (this.state.sharedLives <= 0) {
            this.state.players.forEach(p => { p.alive = false; });
          }
        } else {
          player.lives -= 1;
          if (player.lives <= 0) player.alive = false;
        }
        bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }
}
