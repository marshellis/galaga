import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { InputEvent } from "shared/types/events";

export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private prev: InputEvent = { left: false, right: false, up: false, down: false, fire: false };

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update() {
    const input: InputEvent = {
      left:  this.cursors.left.isDown  || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      up:    this.cursors.up.isDown    || this.wasd.up.isDown,
      down:  this.cursors.down.isDown  || this.wasd.down.isDown,
      fire:  this.spaceKey.isDown,
    };
    if (input.left  !== this.prev.left  ||
        input.right !== this.prev.right ||
        input.up    !== this.prev.up    ||
        input.down  !== this.prev.down  ||
        input.fire  !== this.prev.fire) {
      colyseusClient.sendInput(input);
      this.prev = input;
    }
  }
}
