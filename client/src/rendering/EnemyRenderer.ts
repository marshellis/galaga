import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { EnemyState } from "shared/schemas/EnemyState";

export class EnemyRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(enemies: ArraySchema<EnemyState>) {
    const seen = new Set<string>();

    enemies.forEach(enemy => {
      seen.add(enemy.id);
      if (!this.sprites.has(enemy.id)) {
        const key = enemy.type === "boss" ? "enemy_boss" : "enemy_basic";
        const s = this.scene.add.image(enemy.x, enemy.y, key).setDepth(5);
        this.sprites.set(enemy.id, s);
      }
      this.sprites.get(enemy.id)!.setPosition(enemy.x, enemy.y);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }

  /** Returns last known positions of tracked enemies — used by ExplosionRenderer */
  getPosition(id: string): { x: number; y: number } | undefined {
    const s = this.sprites.get(id);
    return s ? { x: s.x, y: s.y } : undefined;
  }
}
