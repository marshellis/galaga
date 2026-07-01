import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";

const PLAYER_SPEED = 220;
const PLAYER_HALF = 16;

export class GameLoop {
  private inputs = new Map<string, InputEvent>();

  constructor(private state: GameState) {}

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
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
    });
  }
}
