import { Schema, type } from "@colyseus/schema";

export class EnemyState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") type: string = "basic";
  @type("number") hp: number = 1;
  @type("boolean") alive: boolean = true;
  @type("boolean") diving: boolean = false;
}
