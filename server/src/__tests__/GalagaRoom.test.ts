import { describe, it, expect } from "vitest";
import { GameState } from "shared/schemas/GameState";
import { generateRoomCode } from "../rooms/GalagaRoom";
import { CoopSubtype, CompetitiveSubtype, GameMode } from "shared/types/enums";

describe("generateRoomCode", () => {
  it("returns 6 uppercase alphanumeric characters", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("GameState schema additions", () => {
  it("has roomCode, hostId, winner fields", () => {
    const s = new GameState();
    expect(s.roomCode).toBe("");
    expect(s.hostId).toBe("");
    expect(s.winner).toBe("");
  });
});
