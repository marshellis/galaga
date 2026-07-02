import Phaser from "phaser";
export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOverScene" }); }
  create() {
    this.add.text(10, 10, "Game Over", { color: "#ff0000", fontFamily: "monospace" });
  }
}
