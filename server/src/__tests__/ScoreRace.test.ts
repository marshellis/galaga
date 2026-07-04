import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { GameLoop } from "../game/GameLoop";
import { CompetitiveSubtype, GameMode } from "shared/types/enums";

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  state.gameMode = GameMode.Competitive;
  state.subType = CompetitiveSubtype.ScoreRace;
  const p1 = new PlayerState();
  p1.sessionId = "p1"; p1.x = 300; p1.y = 540; p1.alive = false; p1.score = 500;
  state.players.set("p1", p1);
  const p2 = new PlayerState();
  p2.sessionId = "p2"; p2.x = 500; p2.y = 540; p2.alive = false; p2.score = 800;
  state.players.set("p2", p2);
  return state;
}

describe("Score Race — winner determination", () => {
  it("isGameOver returns true when all players dead", () => {
    const state = setup();
    const loop = new GameLoop(state);
    expect(loop.isGameOver()).toBe(true);
  });

  it("sets state.winner to player with highest score", () => {
    const state = setup();
    const loop = new GameLoop(state);
    loop.resolveWinner();
    expect(state.winner).toBe("p2");
  });

  it("tie goes to first player found", () => {
    const state = setup();
    state.players.get("p1")!.score = 800;
    const loop = new GameLoop(state);
    loop.resolveWinner();
    expect(["p1", "p2"]).toContain(state.winner);
  });
});
