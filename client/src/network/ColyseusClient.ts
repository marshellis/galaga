import * as Colyseus from "colyseus.js";
import { GameState } from "shared/schemas/GameState";
import { InputEvent, JoinOptions } from "shared/types/events";
import { SERVER_URL } from "../config";

class ColyseusClientSingleton {
  private client = new Colyseus.Client(SERVER_URL);
  public room: Colyseus.Room<GameState> | null = null;

  async createRoom(mode: string, subType: string, displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.create("galaga", { displayName, mode, subType } as JoinOptions, GameState);
    return this.room;
  }

  async joinRoom(code: string, displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    const rooms = await this.client.getAvailableRooms("galaga");
    const match = rooms.find(r => r.metadata?.roomCode === code || (r as any).state?.roomCode === code);
    if (!match) throw new Error(`Room ${code} not found`);
    this.room = await this.client.joinById(match.roomId, { displayName } as JoinOptions, GameState);
    return this.room;
  }

  // Legacy: join any available room (single-player quick start)
  async connect(displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.joinOrCreate("galaga", { displayName } as JoinOptions, GameState);
    return this.room;
  }

  sendInput(input: InputEvent) {
    this.room?.send("input", input);
  }

  sendStart() {
    this.room?.send("start", {});
  }

  sendSetRole(role: string) {
    this.room?.send("set-role", { role });
  }

  sendSetShotType(shotType: string) {
    this.room?.send("set-shottype", { shotType });
  }

  sendKick(sessionId: string) {
    this.room?.send("kick", { sessionId });
  }

  leave() {
    this.room?.leave();
    this.room = null;
  }
}

export const colyseusClient = new ColyseusClientSingleton();
