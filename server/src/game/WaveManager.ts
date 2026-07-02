import { GameState } from "shared/schemas/GameState";
import { EnemyManager } from "./EnemyManager";

export class WaveManager {
  constructor(
    private state: GameState,
    private enemyManager: EnemyManager,
    private playerCount: number,
  ) {}

  start() {
    this.spawnWave(1);
  }

  check() {
    if (this.enemyManager.allDefeated()) {
      this.spawnWave(this.state.wave + 1);
    }
  }

  private spawnWave(wave: number) {
    this.state.wave = wave;
    this.enemyManager.spawnFormation(wave, this.playerCount);
  }
}
