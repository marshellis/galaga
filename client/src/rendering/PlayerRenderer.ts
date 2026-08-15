import Phaser from "phaser";
import { MapSchema } from "@colyseus/schema";
import { PlayerState } from "shared/schemas/PlayerState";

interface TrackedSprite {
  sprite: Phaser.GameObjects.Image;
  displayX: number;
  displayY: number;
}

export class PlayerRenderer {
  private tracked = new Map<string, TrackedSprite>();

  constructor(private scene: Phaser.Scene) {}

  sync(players: MapSchema<PlayerState>, dt: number) {
    const seen = new Set<string>();
    const alpha = 1 - Math.pow(0.01, dt / 1000); // frame-rate-independent lerp

    players.forEach((player, id) => {
      seen.add(id);
      if (!this.tracked.has(id)) {
        const sprite = this.scene.add.image(player.x, player.y, "player").setDepth(10);
        this.tracked.set(id, { sprite, displayX: player.x, displayY: player.y });
      }
      const t = this.tracked.get(id)!;
      t.displayX += (player.x - t.displayX) * alpha;
      t.displayY += (player.y - t.displayY) * alpha;
      t.sprite.setPosition(t.displayX, t.displayY).setVisible(player.alive);
    });

    this.tracked.forEach((t, id) => {
      if (!seen.has(id)) { t.sprite.destroy(); this.tracked.delete(id); }
    });
  }
}
