import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { BulletState } from "shared/schemas/BulletState";

export class BulletRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(bullets: ArraySchema<BulletState>) {
    const seen = new Set<string>();

    bullets.forEach(bullet => {
      seen.add(bullet.id);
      if (!this.sprites.has(bullet.id)) {
        const key = bullet.isEnemy ? "bullet_enemy" : "bullet_player";
        const s = this.scene.add.image(bullet.x, bullet.y, key).setDepth(8);
        this.sprites.set(bullet.id, s);
      }
      this.sprites.get(bullet.id)!.setPosition(bullet.x, bullet.y);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }
}
