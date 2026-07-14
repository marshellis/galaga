import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.load.image("player",           "assets/player.png");
    this.load.image("enemy_bee",        "assets/enemy_bee.png");
    this.load.image("enemy_butterfly",  "assets/enemy_butterfly.png");
    this.load.image("bullet_player",    "assets/bullet_player.png");
    this.load.image("bullet_enemy",     "assets/bullet_enemy.png");
  }

  create() {
    this.scene.start("MenuScene");
  }
}
