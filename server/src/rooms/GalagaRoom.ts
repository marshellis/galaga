import { Room, Client } from "@colyseus/core";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { InputEvent, JoinOptions } from "shared/types/events";
import { GameLoop } from "../game/GameLoop";
import { GamePhase } from "shared/types/enums";

const TICK_MS = 1000 / 60;
const WORLD_W = 800;
const WORLD_H = 600;

export class GalagaRoom extends Room<GameState> {
  private loop: GameLoop | null = null;

  onCreate() {
    this.setState(new GameState());

    this.onMessage("input", (client: Client, input: InputEvent) => {
      this.loop?.handleInput(client.sessionId, input);
    });

    this.onMessage("start", (_client: Client) => {
      if (this.state.phase !== GamePhase.Lobby) return;
      this.state.phase = GamePhase.Playing;
      this.loop = new GameLoop(this.state);
    });

    this.setSimulationInterval((dt: number) => {
      if (this.state.phase !== GamePhase.Playing) return;
      this.loop!.update(dt);
      if (this.loop!.isGameOver()) this.state.phase = GamePhase.GameOver;
    }, TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = options.displayName ?? "Anonymous";
    player.x = WORLD_W / 2;
    player.y = WORLD_H - 60;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
