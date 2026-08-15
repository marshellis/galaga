import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { EnemyState } from "shared/schemas/EnemyState";

interface TrackedSprite {
  sprite: Phaser.GameObjects.Image;
  displayX: number;
  displayY: number;
}

export class EnemyRenderer {
  private tracked = new Map<string, TrackedSprite>();

  constructor(private scene: Phaser.Scene) {}

  sync(enemies: ArraySchema<EnemyState>, dt: number) {
    const seen = new Set<string>();
    const alpha = 1 - Math.pow(0.01, dt / 1000);

    enemies.forEach(enemy => {
      seen.add(enemy.id);
      if (!this.tracked.has(enemy.id)) {
        const key = enemy.type === "boss" ? "enemy_butterfly" : "enemy_bee";
        const sprite = this.scene.add.image(enemy.x, enemy.y, key).setDepth(5);
        this.tracked.set(enemy.id, { sprite, displayX: enemy.x, displayY: enemy.y });
      }
      const t = this.tracked.get(enemy.id)!;
      t.displayX += (enemy.x - t.displayX) * alpha;
      t.displayY += (enemy.y - t.displayY) * alpha;
      t.sprite.setPosition(t.displayX, t.displayY);
      t.sprite.setRotation(enemy.angle ?? 0);
    });

    this.tracked.forEach((t, id) => {
      if (!seen.has(id)) { t.sprite.destroy(); this.tracked.delete(id); }
    });
  }

  getPosition(id: string): { x: number; y: number } | undefined {
    const t = this.tracked.get(id);
    return t ? { x: t.displayX, y: t.displayY } : undefined;
  }
}
