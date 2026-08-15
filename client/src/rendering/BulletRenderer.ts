import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { BulletState } from "shared/schemas/BulletState";

interface TrackedSprite {
  sprite: Phaser.GameObjects.Image;
  displayX: number;
  displayY: number;
}

export class BulletRenderer {
  private tracked = new Map<string, TrackedSprite>();

  constructor(private scene: Phaser.Scene) {}

  sync(bullets: ArraySchema<BulletState>, dt: number) {
    const seen = new Set<string>();
    const alpha = 1 - Math.pow(0.01, dt / 1000);

    bullets.forEach(bullet => {
      seen.add(bullet.id);
      if (!this.tracked.has(bullet.id)) {
        const key = bullet.isEnemy ? "bullet_enemy" : "bullet_player";
        const sprite = this.scene.add.image(bullet.x, bullet.y, key).setDepth(8);
        this.tracked.set(bullet.id, { sprite, displayX: bullet.x, displayY: bullet.y });
      }
      const t = this.tracked.get(bullet.id)!;
      t.displayX += (bullet.x - t.displayX) * alpha;
      t.displayY += (bullet.y - t.displayY) * alpha;
      t.sprite.setPosition(t.displayX, t.displayY);
    });

    this.tracked.forEach((t, id) => {
      if (!seen.has(id)) { t.sprite.destroy(); this.tracked.delete(id); }
    });
  }
}
