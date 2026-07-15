import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyType, CoopSubtype, CompetitiveSubtype } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { PLAYER_HALF, ENEMY_HALF } from "./constants";

const AOE_RADIUS = 60;

function overlaps(ax: number, ay: number, aw: number, bx: number, by: number, bw: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (aw + bw) / 2;
}

export class CollisionDetector {
  private enemyManager: import("./EnemyManager").EnemyManager | null = null;

  constructor(private state: GameState, private bulletManager: BulletManager) {}

  setEnemyManager(em: import("./EnemyManager").EnemyManager) { this.enemyManager = em; }

  check() {
    this.enemiesVsPlayers();
    this.playerBulletsVsEnemies();
    this.enemyBulletsVsPlayers();
    if (this.state.subType === CompetitiveSubtype.LastShipStanding) {
      this.friendlyFire();
    }
  }

  private applyPlayerDamage(player: PlayerState) {
    if (this.state.subType === CoopSubtype.SharedLives) {
      this.state.sharedLives -= 1;
      if (this.state.sharedLives <= 0) {
        this.state.players.forEach(p => { p.alive = false; });
      }
    } else if (this.state.subType === CoopSubtype.RoleSpecialization) {
      player.hp -= 1;
      if (player.hp <= 0) player.alive = false;
    } else {
      player.lives -= 1;
      if (player.lives <= 0) player.alive = false;
    }
  }

  private enemiesVsPlayers() {
    const enemiesToRemove: string[] = [];

    this.state.enemies.forEach(enemy => {
      if (enemiesToRemove.includes(enemy.id)) return;

      this.state.players.forEach((player, id) => {
        if (!player.alive) return;
        if (enemiesToRemove.includes(enemy.id)) return;
        if (!overlaps(enemy.x, enemy.y, ENEMY_HALF, player.x, player.y, PLAYER_HALF)) return;

        const points = enemy.type === EnemyType.Boss ? 200 : 100;
        this.awardPoints(id, points, enemy.x);
        enemiesToRemove.push(enemy.id);
        this.applyPlayerDamage(player);
      });
    });

    for (const id of enemiesToRemove) {
      if (this.enemyManager) {
        this.enemyManager.removeEnemy(id);
      } else {
        const idx = this.state.enemies.findIndex(e => e.id === id);
        if (idx !== -1) this.state.enemies.splice(idx, 1);
      }
    }
  }

  private friendlyFire() {
    const bulletsToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (bullet.isEnemy) return;
      if (bulletsToRemove.includes(bullet.id)) return;

      this.state.players.forEach((player, id) => {
        if (!player.alive) return;
        if (id === bullet.ownerId) return; // no self-damage
        if (bulletsToRemove.includes(bullet.id)) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;

        player.lives -= 1;
        if (player.lives <= 0) player.alive = false;
        bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }

  private playerBulletsVsEnemies() {
    const bulletsToRemove: string[] = [];
    const enemiesToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (bullet.isEnemy) return;
      if (bulletsToRemove.includes(bullet.id)) return; // already consumed
      const damage = this.bulletManager.damageOf(bullet.id);

      for (const enemy of this.state.enemies) {
        if (enemiesToRemove.includes(enemy.id)) continue; // already dead
        if (!overlaps(bullet.x, bullet.y, bullet.width, enemy.x, enemy.y, ENEMY_HALF)) continue;

        if (bullet.aoe) {
          // Detonate: remove the bullet and kill all enemies within AOE_RADIUS
          bulletsToRemove.push(bullet.id);
          this.state.enemies.forEach(e => {
            if (enemiesToRemove.includes(e.id)) return;
            const dist = Math.hypot(bullet.x - e.x, bullet.y - e.y);
            if (dist <= AOE_RADIUS) {
              const points = e.type === EnemyType.Boss ? 200 : 100;
              this.awardPoints(bullet.ownerId, points, e.x);
              enemiesToRemove.push(e.id);
            }
          });
          break; // bullet consumed — stop checking more enemies
        }

        enemy.hp -= damage;
        if (enemy.hp <= 0) {
          const points = enemy.type === EnemyType.Boss ? 200 : 100;
          this.awardPoints(bullet.ownerId, points, enemy.x);
          enemiesToRemove.push(enemy.id);
        }
        if (!bullet.piercing) bulletsToRemove.push(bullet.id);
      }
    });

    for (const id of enemiesToRemove) {
      if (this.enemyManager) {
        this.enemyManager.removeEnemy(id);
      } else {
        const idx = this.state.enemies.findIndex(e => e.id === id);
        if (idx !== -1) this.state.enemies.splice(idx, 1);
      }
    }
    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }

  private awardPoints(ownerId: string, points: number, enemyX?: number) {
    if (this.state.subType === CoopSubtype.IndependentLives) {
      this.state.sharedScore += points;
      return;
    }
    if (this.state.subType === CompetitiveSubtype.Territory && enemyX !== undefined) {
      const playerCount = this.state.players.size;
      if (playerCount > 0) {
        const zoneWidth = this.state.worldWidth / playerCount;
        const zoneIndex = Math.floor(enemyX / zoneWidth);
        let scored = false;
        this.state.players.forEach(p => {
          if (!scored && p.territoryZone === zoneIndex) {
            p.score += points;
            scored = true;
          }
        });
        return;
      }
    }
    const player = this.state.players.get(ownerId);
    if (player) player.score += points;
  }

  private enemyBulletsVsPlayers() {
    const bulletsToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (!bullet.isEnemy) return;

      this.state.players.forEach(player => {
        if (!player.alive || bulletsToRemove.includes(bullet.id)) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;

        this.applyPlayerDamage(player);
        bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }
}
