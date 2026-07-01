import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") displayName: string = "Anonymous";
  @type("number") x: number = 400;
  @type("number") y: number = 540;
  @type("number") lives: number = 3;
  @type("number") hp: number = 1;
  @type("number") score: number = 0;
  @type("string") role: string = "shooter";
  @type("string") shotType: string = "rapid";
  @type("boolean") alive: boolean = true;
}
