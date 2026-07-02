import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { InputHandler } from "../input/InputHandler";
import { PlayerRenderer } from "../rendering/PlayerRenderer";
import { EnemyRenderer } from "../rendering/EnemyRenderer";
import { BulletRenderer } from "../rendering/BulletRenderer";
import { ExplosionRenderer } from "../rendering/ExplosionRenderer";
import { HUD } from "../ui/HUD";
import { GameState } from "shared/schemas/GameState";

export class GameScene extends Phaser.Scene {
  private inputHandler!: InputHandler;
  private playerRenderer!: PlayerRenderer;
  private enemyRenderer!: EnemyRenderer;
  private bulletRenderer!: BulletRenderer;
  private explosionRenderer!: ExplosionRenderer;
  private hud!: HUD;
  private prevEnemyIds = new Set<string>();

  constructor() { super({ key: "GameScene" }); }

  async create() {
    this.playerRenderer   = new PlayerRenderer(this);
    this.enemyRenderer    = new EnemyRenderer(this);
    this.bulletRenderer   = new BulletRenderer(this);
    this.explosionRenderer = new ExplosionRenderer(this);
    this.hud              = new HUD(this);

    await colyseusClient.connect("Anonymous");
    this.inputHandler = new InputHandler(this);
    colyseusClient.sendStart();

    colyseusClient.room!.onStateChange((state: GameState) => this.syncState(state));
  }

  update() {
    this.inputHandler?.update();
  }

  private syncState(state: GameState) {
    if (state.phase === "gameover") {
      const me = state.players.get(colyseusClient.room!.sessionId);
      this.scene.start("GameOverScene", { score: me?.score ?? 0, wave: state.wave });
      return;
    }

    this.cameras.main.setZoom(state.cameraZoom);

    // fire explosions for enemies that disappeared since last frame
    const currentIds = new Set(state.enemies.map(e => e.id));
    this.prevEnemyIds.forEach(id => {
      if (!currentIds.has(id)) {
        const pos = this.enemyRenderer.getPosition(id);
        if (pos) this.explosionRenderer.explode(pos.x, pos.y, false);
      }
    });
    this.prevEnemyIds = currentIds;

    this.playerRenderer.sync(state.players);
    this.enemyRenderer.sync(state.enemies);
    this.bulletRenderer.sync(state.bullets);
    this.hud.update(state, colyseusClient.room!.sessionId);
  }
}
