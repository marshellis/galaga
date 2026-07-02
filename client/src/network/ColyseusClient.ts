import * as Colyseus from "colyseus.js";
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { SERVER_URL } from "../config";

class ColyseusClientSingleton {
  private client = new Colyseus.Client(SERVER_URL);
  public room: Colyseus.Room<GameState> | null = null;

  async connect(displayName: string): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.joinOrCreate<GameState>("galaga", { displayName });
    return this.room;
  }

  sendInput(input: InputEvent) {
    this.room?.send("input", input);
  }

  sendStart() {
    this.room?.send("start", {});
  }

  leave() {
    this.room?.leave();
    this.room = null;
  }
}

export const colyseusClient = new ColyseusClientSingleton();
