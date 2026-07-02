import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { BulletManager } from "./BulletManager";
import { EnemyManager } from "./EnemyManager";
import { WaveManager } from "./WaveManager";
import { CollisionDetector } from "./CollisionDetector";
import { PLAYER_SPEED, PLAYER_HALF } from "./constants";

export class GameLoop {
  private inputs = new Map<string, InputEvent>();
  private bulletManager: BulletManager;
  private enemyManager: EnemyManager;
  private waveManager: WaveManager;
  private collisionDetector: CollisionDetector;

  constructor(private state: GameState) {
    this.bulletManager = new BulletManager(state);
    this.enemyManager = new EnemyManager(state);
    this.enemyManager.setBulletManager(this.bulletManager);
    this.collisionDetector = new CollisionDetector(state, this.bulletManager);
    this.waveManager = new WaveManager(state, this.enemyManager, state.players.size);
    this.waveManager.start();
  }

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
    this.bulletManager.update(dt);
    this.enemyManager.update(dt);
    this.collisionDetector.check();
    this.waveManager.check();
  }

  isGameOver(): boolean {
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  private movePlayers(dt: number) {
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const input = this.inputs.get(sessionId);
      if (!input) return;

      if (input.left)  player.x -= PLAYER_SPEED * dt;
      if (input.right) player.x += PLAYER_SPEED * dt;
      if (input.up)    player.y -= PLAYER_SPEED * dt;
      if (input.down)  player.y += PLAYER_SPEED * dt;

      player.x = Math.max(PLAYER_HALF, Math.min(this.state.worldWidth  - PLAYER_HALF, player.x));
      player.y = Math.max(PLAYER_HALF, Math.min(this.state.worldHeight - PLAYER_HALF, player.y));

      if (input.fire) {
        this.bulletManager.spawnPlayerBullet(sessionId, player.x, player.y, player.shotType);
      }
    });
  }
}
