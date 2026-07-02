import Phaser from "phaser";

export class ExplosionRenderer {
  constructor(private scene: Phaser.Scene) {}

  explode(x: number, y: number, big = false) {
    const count = big ? 16 : 8;
    const emitter = this.scene.add.particles(x, y, "bullet_player", {
      speed: { min: 40, max: big ? 140 : 80 },
      scale: { start: big ? 1.5 : 0.8, end: 0 },
      lifespan: 400,
      quantity: count,
      emitting: false,
    });
    emitter.explode(count, x, y);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }
}
