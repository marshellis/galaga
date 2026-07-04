import { Schema, type } from "@colyseus/schema";

export class BulletState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") width: number = 4;
  @type("number") height: number = 12;
  @type("string") ownerId: string = "";
  @type("boolean") isEnemy: boolean = false;
  @type("boolean") piercing: boolean = false;
  @type("boolean") aoe: boolean = false;
}
