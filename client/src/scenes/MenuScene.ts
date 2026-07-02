import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 120, "GALAGA", {
      fontSize: "64px", color: "#ffff00", fontFamily: "monospace",
    }).setOrigin(0.5);

    const prompt = this.add.text(cx, cy + 20, "[ PRESS ENTER TO PLAY ]", {
      fontSize: "24px", color: "#00ffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-ENTER", () => {
      this.scene.start("GameScene");
    });
  }
}
