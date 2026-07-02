import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0 });

    // player ship — white triangle pointing up
    g.fillStyle(0xffffff);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.generateTexture("player", 32, 32);
    g.clear();

    // basic enemy — yellow
    g.fillStyle(0xffff00);
    g.fillRect(4, 4, 24, 24);
    g.generateTexture("enemy_basic", 32, 32);
    g.clear();

    // boss enemy — red, larger
    g.fillStyle(0xff4444);
    g.fillRect(2, 2, 44, 44);
    g.generateTexture("enemy_boss", 48, 48);
    g.clear();

    // rapid/spread/piercing bullet — cyan
    g.fillStyle(0x00ffff);
    g.fillRect(0, 0, 4, 12);
    g.generateTexture("bullet_player", 4, 12);
    g.clear();

    // heavy bullet — orange, wide
    g.fillStyle(0xff8800);
    g.fillRect(0, 0, 10, 18);
    g.generateTexture("bullet_heavy", 10, 18);
    g.clear();

    // enemy bullet — red
    g.fillStyle(0xff0000);
    g.fillRect(0, 0, 4, 10);
    g.generateTexture("bullet_enemy", 4, 10);
    g.clear();

    g.destroy();
  }

  create() {
    this.scene.start("MenuScene");
  }
}
