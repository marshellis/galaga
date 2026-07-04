import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { EnemyState } from "./EnemyState";
import { BulletState } from "./BulletState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([EnemyState]) enemies = new ArraySchema<EnemyState>();
  @type([BulletState]) bullets = new ArraySchema<BulletState>();
  @type("string") phase: string = "lobby";
  @type("string") gameMode: string = "cooperative";
  @type("string") subType: string = "shared_lives";
  @type("number") wave: number = 1;
  @type("number") worldWidth: number = 800;
  @type("number") worldHeight: number = 600;
  @type("number") cameraZoom: number = 1;
  @type("number") sharedLives: number = 0;
  @type("number") sharedScore: number = 0;
  @type("string") roomCode: string = "";
  @type("string") hostId: string = "";
  @type("string") winner: string = "";
}
