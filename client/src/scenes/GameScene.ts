import Phaser from "phaser";
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }
  create() {
    this.add.text(10, 10, "Connecting...", { color: "#ffffff", fontFamily: "monospace" });
  }
}
