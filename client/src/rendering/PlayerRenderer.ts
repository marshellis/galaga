import Phaser from "phaser";
import { MapSchema } from "@colyseus/schema";
import { PlayerState } from "shared/schemas/PlayerState";

export class PlayerRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(players: MapSchema<PlayerState>) {
    const seen = new Set<string>();

    players.forEach((player, id) => {
      seen.add(id);
      if (!this.sprites.has(id)) {
        const s = this.scene.add.image(player.x, player.y, "player").setDepth(10);
        this.sprites.set(id, s);
      }
      const s = this.sprites.get(id)!;
      s.setPosition(player.x, player.y).setVisible(player.alive);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }
}
