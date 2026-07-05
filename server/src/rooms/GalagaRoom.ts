import { Room, Client } from "@colyseus/core";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { InputEvent, JoinOptions } from "shared/types/events";
import { GameLoop } from "../game/GameLoop";
import {
  GamePhase,
  GameMode,
  CoopSubtype,
  CompetitiveSubtype,
  PlayerRole,
} from "shared/types/enums";

const TICK_MS = 1000 / 60;
const WORLD_W = 800;
const WORLD_H = 600;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class GalagaRoom extends Room<GameState> {
  private loop: GameLoop | null = null;

  onCreate(options: JoinOptions = {}) {
    this.setState(new GameState());
    this.maxClients = 8;
    this.state.roomCode = generateRoomCode();
    this.state.gameMode = options.mode ?? GameMode.Cooperative;
    this.state.subType = options.subType ?? CoopSubtype.SharedLives;
    this.setMetadata({ roomCode: this.state.roomCode });

    this.onMessage("set-role", (client: Client, data: { role: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.role = data.role;
    });

    this.onMessage("set-shottype", (client: Client, data: { shotType: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === PlayerRole.Shooter) {
        player.shotType = data.shotType;
      }
    });

    this.onMessage("kick", (client: Client, data: { sessionId: string }) => {
      if (client.sessionId !== this.state.hostId) return;
      const target = this.clients.find(c => c.sessionId === data.sessionId);
      target?.leave(1000);
    });

    this.onMessage("input", (client: Client, input: InputEvent) => {
      this.loop?.handleInput(client.sessionId, input);
    });

    this.onMessage("start", (client: Client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.phase !== GamePhase.Lobby) return;

      if (this.state.subType === CoopSubtype.RoleSpecialization) {
        const roles = new Set<string>();
        this.state.players.forEach(p => roles.add(p.role));
        const required = [PlayerRole.Shield, PlayerRole.Bomber, PlayerRole.Healer];
        if (!required.every(r => roles.has(r))) return; // silently reject
      }

      if (this.state.subType === CoopSubtype.SharedLives) {
        this.state.sharedLives = this.state.players.size * 3;
      }

      // Initialize RoleSpec players with hp=2
      if (this.state.subType === CoopSubtype.RoleSpecialization) {
        this.state.players.forEach(p => { p.hp = 2; });
      }

      if (this.state.subType === CompetitiveSubtype.Territory) {
        let zoneIndex = 0;
        this.state.players.forEach(p => { p.territoryZone = zoneIndex++; });
      }

      this.state.phase = GamePhase.Playing;
      this.lock();
      this.loop = new GameLoop(this.state);
    });

    this.setSimulationInterval((dt: number) => {
      if (this.state.phase !== GamePhase.Playing) return;
      this.loop!.update(dt);
      if (this.loop!.isGameOver()) {
        if (this.state.gameMode === GameMode.Competitive) {
          this.loop!.resolveWinner();
        }
        this.state.phase = GamePhase.GameOver;
      }
    }, TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = options.displayName ?? "Anonymous";
    player.x = WORLD_W / 2;
    player.y = WORLD_H - 60;
    this.state.players.set(client.sessionId, player);

    if (this.state.hostId === "") {
      this.state.hostId = client.sessionId;
    }
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    if (this.state.hostId === client.sessionId) {
      const next = this.clients.find(c => c.sessionId !== client.sessionId);
      this.state.hostId = next?.sessionId ?? "";
    }
  }
}
