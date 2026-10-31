import * as Colyseus from "colyseus.js";
import { GameState } from "shared/schemas/GameState";
import { InputEvent, JoinOptions } from "shared/types/events";
import { SERVER_URL } from "../config";

/**
 * Ask the Marshellis site for a signed game pass (same origin when served from games.marshellis.com).
 * - signed-in child with time left: returns the pass (the server then uses the real nickname)
 * - guest / not on the site / site unreachable: undefined (play as a guest)
 * - parent's play time is used up: throws, so the lobby shows why the game will not start
 */
async function getPass(): Promise<string | undefined> {
  try {
    const r = await fetch("/api/family/pass", {
      method: "POST", credentials: "same-origin",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ room: "galaga" }),
    });
    if (r.status === 403) throw new Error("No play time left today. Do a brain break to earn more!");
    if (!r.ok) return undefined;
    return (await r.json()).pass as string;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("No play time")) throw e;
    return undefined;
  }
}

class ColyseusClientSingleton {
  private client = new Colyseus.Client(SERVER_URL);
  public room: Colyseus.Room<GameState> | null = null;

  async createRoom(mode: string, subType: string, displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.create("galaga", { displayName, mode, subType, pass: await getPass() } as JoinOptions, GameState);
    return this.room;
  }

  async joinRoom(code: string, displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    const rooms = await this.client.getAvailableRooms("galaga");
    const match = rooms.find(r => r.metadata?.roomCode === code || (r as any).state?.roomCode === code);
    if (!match) throw new Error(`Room ${code} not found`);
    this.room = await this.client.joinById(match.roomId, { displayName, pass: await getPass() } as JoinOptions, GameState);
    return this.room;
  }

  // Legacy: join any available room (single-player quick start)
  async connect(displayName = "Anonymous"): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.joinOrCreate("galaga", { displayName, pass: await getPass() } as JoinOptions, GameState);
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
