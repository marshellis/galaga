import { describe, it, expect } from "vitest";
import { GameLoop } from "../game/GameLoop";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";

function makeState() {
  const state = new GameState();
  const player = new PlayerState();
  player.sessionId = "p1";
  player.x = 400;
  player.y = 540;
  player.alive = true;
  state.players.set("p1", player);
  return state;
}

describe("GameLoop - player movement", () => {
  it("moves player left when left input is true", () => {
    const state = makeState();
    const loop = new GameLoop(state);
    loop.handleInput("p1", { left: true, right: false, up: false, down: false, fire: false });
    loop.update(1000 / 60);
    expect(state.players.get("p1")!.x).toBeLessThan(400);
  });

  it("moves player right when right input is true", () => {
    const state = makeState();
    const loop = new GameLoop(state);
    loop.handleInput("p1", { left: false, right: true, up: false, down: false, fire: false });
    loop.update(1000 / 60);
    expect(state.players.get("p1")!.x).toBeGreaterThan(400);
  });

  it("clamps player x to world bounds", () => {
    const state = makeState();
    state.players.get("p1")!.x = 797;
    const loop = new GameLoop(state);
    loop.handleInput("p1", { left: false, right: true, up: false, down: false, fire: false });
    loop.update(1000 / 60);
    expect(state.players.get("p1")!.x).toBeLessThanOrEqual(800 - 16);
  });

  it("does not move dead players", () => {
    const state = makeState();
    state.players.get("p1")!.alive = false;
    const loop = new GameLoop(state);
    loop.handleInput("p1", { left: true, right: false, up: false, down: false, fire: false });
    loop.update(1000 / 60);
    expect(state.players.get("p1")!.x).toBe(400);
  });
});
