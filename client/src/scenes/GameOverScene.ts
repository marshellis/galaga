import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOverScene" }); }

  create(data: { score: number; wave: number }) {
    colyseusClient.leave();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 100, "GAME OVER", {
      fontSize: "56px", color: "#ff0000", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(cx, cy, `SCORE  ${data.score}`, {
      fontSize: "28px", color: "#ffffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(cx, cy + 44, `WAVE   ${data.wave}`, {
      fontSize: "28px", color: "#ffffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 120, "[ PRESS ENTER TO PLAY AGAIN ]", {
      fontSize: "20px", color: "#00ffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.tweens.add({ targets: btn, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("MenuScene"));
  }
}
