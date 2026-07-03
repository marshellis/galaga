import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { InputHandler } from "../input/InputHandler";
import { PlayerRenderer } from "../rendering/PlayerRenderer";
import { EnemyRenderer } from "../rendering/EnemyRenderer";
import { BulletRenderer } from "../rendering/BulletRenderer";
import { ExplosionRenderer } from "../rendering/ExplosionRenderer";
import { HUD } from "../ui/HUD";
import { GameState } from "shared/schemas/GameState";
import { GamePhase } from "shared/types/enums";

export class GameScene extends Phaser.Scene {
  private inputHandler!: InputHandler;
  private playerRenderer!: PlayerRenderer;
  private enemyRenderer!: EnemyRenderer;
  private bulletRenderer!: BulletRenderer;
  private explosionRenderer!: ExplosionRenderer;
  private hud!: HUD;
  private debugText!: Phaser.GameObjects.Text;
  private prevEnemyIds = new Set<string>();
  private gameOverTriggered = false;

  constructor() { super({ key: "GameScene" }); }

  async create() {
    this.gameOverTriggered = false;
    this.prevEnemyIds = new Set();

    this.playerRenderer    = new PlayerRenderer(this);
    this.enemyRenderer     = new EnemyRenderer(this);
    this.bulletRenderer    = new BulletRenderer(this);
    this.explosionRenderer = new ExplosionRenderer(this);
    this.hud               = new HUD(this);
    this.debugText         = this.add.text(10, 80, "connecting...", {
      fontSize: "12px", color: "#ffffff", fontFamily: "monospace", backgroundColor: "#000000",
    }).setScrollFactor(0).setDepth(200);

    try {
      await colyseusClient.connect("Anonymous");
    } catch {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;
      this.add.text(cx, cy - 20, "Could not connect to server.", {
        fontSize: "20px", color: "#ff4444", fontFamily: "monospace",
      }).setOrigin(0.5);
      this.add.text(cx, cy + 20, "[ PRESS ENTER TO RETURN ]", {
        fontSize: "16px", color: "#aaaaaa", fontFamily: "monospace",
      }).setOrigin(0.5);
      this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("MenuScene"));
      return;
    }

    this.inputHandler = new InputHandler(this);
    colyseusClient.sendStart();
  }

  update() {
    this.inputHandler?.update();
    const state = colyseusClient.room?.state as unknown as GameState | undefined;
    if (state) this.syncState(state);
  }

  private syncState(state: GameState) {
    let playerX = 0, playerY = 0, playerCount = 0;
    try {
      state.players?.forEach((p: any) => {
        playerCount++;
        playerX = p.x;
        playerY = p.y;
      });
    } catch (e) { console.error("[galaga] players forEach error:", e); }

    const eCount = state.enemies?.length ?? 0;
    this.debugText?.setText(
      `phase:${state.phase} P:${playerCount}@(${playerX|0},${playerY|0}) E:${eCount}`
    );

    if (state.phase === GamePhase.GameOver && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      const me = state.players?.get(colyseusClient.room!.sessionId);
      this.scene.start("GameOverScene", { score: me?.score ?? 0, wave: state.wave ?? 0 });
      return;
    }
    if (state.phase === GamePhase.GameOver) return;

    this.cameras.main.setZoom(state.cameraZoom ?? 1);

    const currentIds = new Set<string>();
    state.enemies?.forEach((e: any) => currentIds.add(e.id));
    this.prevEnemyIds.forEach(id => {
      if (!currentIds.has(id)) {
        const pos = this.enemyRenderer.getPosition(id);
        if (pos && pos.y < this.scale.height && pos.y > 0) {
          this.explosionRenderer.explode(pos.x, pos.y, false);
        }
      }
    });
    this.prevEnemyIds = currentIds;

    try {
      if (state.players) this.playerRenderer.sync(state.players);
    } catch (e) { console.error("[galaga] playerRenderer error:", e); }
    try {
      if (state.enemies) this.enemyRenderer.sync(state.enemies);
    } catch (e) { console.error("[galaga] enemyRenderer error:", e); }
    try {
      if (state.bullets) this.bulletRenderer.sync(state.bullets);
    } catch (e) { console.error("[galaga] bulletRenderer error:", e); }
    this.hud.update(state, colyseusClient.room!.sessionId);
  }
}
