import { Room, Client } from "@colyseus/core";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { InputEvent, JoinOptions } from "shared/types/events";

const TICK_MS = 1000 / 60;
const WORLD_W = 800;
const WORLD_H = 600;

export class GalagaRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    this.onMessage("input", (_client: Client, _input: InputEvent) => {
      // wired in Task 4
    });

    this.onMessage("start", (_client: Client) => {
      if (this.state.phase !== "lobby") return;
      this.state.phase = "playing";
    });

    this.setSimulationInterval((_dt: number) => {}, TICK_MS);
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
