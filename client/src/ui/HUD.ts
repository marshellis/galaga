import Phaser from "phaser";
import { GameState } from "shared/schemas/GameState";

const STYLE = { fontSize: "16px", color: "#00ff00", fontFamily: "monospace" };

export class HUD {
  private waveText:  Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.waveText  = scene.add.text(10, 10, "WAVE  1", STYLE).setScrollFactor(0).setDepth(100);
    this.scoreText = scene.add.text(10, 30, "SCORE 0", STYLE).setScrollFactor(0).setDepth(100);
    this.livesText = scene.add.text(10, 50, "LIVES ♥♥♥", STYLE).setScrollFactor(0).setDepth(100);
  }

  update(state: GameState, mySessionId: string) {
    this.waveText.setText(`WAVE  ${state.wave}`);
    const me = state.players.get(mySessionId);
    if (me) {
      this.scoreText.setText(`SCORE ${me.score}`);
      const hearts = "♥".repeat(Math.max(0, me.lives));
      this.livesText.setText(`LIVES ${hearts}`);
    }
  }
}
