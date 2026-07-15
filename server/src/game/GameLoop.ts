import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { PlayerRole, CoopSubtype, CompetitiveSubtype } from "shared/types/enums";
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
  private lastDiedId: string | null = null;
  private healerCooldowns = new Map<string, number>();

  constructor(private state: GameState) {
    this.bulletManager = new BulletManager(state);
    this.enemyManager = new EnemyManager(state);
    this.enemyManager.setBulletManager(this.bulletManager);
    this.collisionDetector = new CollisionDetector(state, this.bulletManager);
    this.collisionDetector.setEnemyManager(this.enemyManager);
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
    if (this.state.subType === CoopSubtype.RoleSpecialization) {
      this.state.players.forEach((p, id) => {
        if (!p.alive && id !== this.lastDiedId) {
          this.lastDiedId = id;
        }
      });
    }
    this.waveManager.check();
  }

  isGameOver(): boolean {
    if (this.state.subType === CoopSubtype.SharedLives) {
      return this.state.sharedLives <= 0;
    }
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  resolveWinner() {
    const mode = this.state.subType;
    if (mode === CompetitiveSubtype.ScoreRace || mode === CompetitiveSubtype.Territory) {
      let topId = "";
      let topScore = -1;
      this.state.players.forEach((p, id) => {
        if (p.score > topScore) { topScore = p.score; topId = id; }
      });
      this.state.winner = topId;
    } else if (mode === CompetitiveSubtype.LastShipStanding) {
      this.state.players.forEach((p, id) => {
        if (p.alive) this.state.winner = id;
      });
    }
  }

  private tryHeal(healerId: string) {
    const now = Date.now();
    if ((now - (this.healerCooldowns.get(healerId) ?? 0)) < 5000) return;
    if (!this.lastDiedId) return;
    const target = this.state.players.get(this.lastDiedId);
    if (!target || target.alive) { this.lastDiedId = null; return; }
    target.hp = 1;
    target.alive = true;
    this.lastDiedId = null;
    this.healerCooldowns.set(healerId, now);
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
        if (player.role === PlayerRole.Healer && this.state.subType === CoopSubtype.RoleSpecialization) {
          this.tryHeal(sessionId);
        } else {
          this.bulletManager.spawnPlayerBullet(sessionId, player.x, player.y, player.shotType, player.role);
        }
      }
    });
  }
}
