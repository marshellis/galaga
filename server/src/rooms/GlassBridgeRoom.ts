import { Room, Client } from "@colyseus/core";
import { GlassBridge } from "../game/GlassBridge";

// Public-lobby room for the games.marshellis.com Glass Bridge arcade game.
// Schema-less: the shared bridge lives server-side in a GlassBridge and all
// sync happens over plain messages (positions are cosmetic ghost data; the
// only authoritative call is "land", which reveals a row's safe side).

interface LobbyPlayer {
  name: string;
  x: number;
  z: number;
  h: number;
  row: number;
  st: string;
}

export class GlassBridgeRoom extends Room {
  maxClients = 16;
  private bridge = new GlassBridge();
  private players = new Map<string, LobbyPlayer>();

  onCreate() {
    this.bridge.ensureRows(40);
    this.setMetadata({ game: "glass-bridge" });

    this.onMessage("hello", (client: Client, data: { name?: string }) => {
      const name = String(data?.name ?? "guest").slice(0, 20) || "guest";
      this.players.set(client.sessionId, { name, x: 0, z: 0, h: 0, row: 0, st: "ready" });
      client.send("welcome", {
        id: client.sessionId,
        revealed: this.bridge.revealed(),
        players: [...this.players.entries()]
          .filter(([id]) => id !== client.sessionId)
          .map(([id, p]) => ({ id, name: p.name, x: p.x, z: p.z, h: p.h, st: p.st })),
      });
      this.broadcast("join", { id: client.sessionId, name }, { except: client });
    });

    this.onMessage("pos", (client: Client, d: { x?: number; z?: number; h?: number; row?: number; st?: string }) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      p.x = Number(d?.x) || 0;
      p.z = Number(d?.z) || 0;
      p.h = Number(d?.h) || 0;
      p.row = Math.max(0, Math.trunc(Number(d?.row) || 0));
      p.st = String(d?.st ?? "").slice(0, 12);
      this.broadcast("pos", { id: client.sessionId, x: p.x, z: p.z, h: p.h, st: p.st }, { except: client });
    });

    this.onMessage("land", (client: Client, d: { row?: number; side?: number }) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      const row = Math.trunc(Number(d?.row));
      const side = Math.trunc(Number(d?.side));
      const outcome = this.bridge.land(row, side);
      if (!outcome) return;
      client.send("verdict", { row, ok: outcome.ok });
      if (outcome.ok) {
        p.row = Math.max(p.row, row);
        if (outcome.provedNow) this.broadcast("proven", { row, side, by: p.name });
      } else if (outcome.brokeNow) {
        this.broadcast("break", { row, side, by: p.name });
      }
      if (!outcome.ok) {
        this.broadcast("fell", { id: client.sessionId, name: p.name, row, cause: "glass" }, { except: client });
      }
    });

    // shop: skip item — prove a row without landing on it and stand there safely
    this.onMessage("skip", (client: Client, d: { row?: number }) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      const row = Math.trunc(Number(d?.row));
      const res = this.bridge.prove(row);
      if (!res) return;
      client.send("skipOk", { row, side: res.side });
      p.row = Math.max(p.row, row);
      if (res.provedNow) this.broadcast("proven", { row, side: res.side, by: p.name });
    });

    // shop: assassination contract — kill a named player and wipe their progress
    this.onMessage("assassinate", (client: Client, d: { target?: string }) => {
      const killer = this.players.get(client.sessionId);
      if (!killer) return;
      const wanted = String(d?.target ?? "").trim().toLowerCase();
      if (!wanted) { client.send("assassinateResult", { ok: false }); return; }
      const entry = [...this.players.entries()].find(
        ([id, p]) => id !== client.sessionId && p.name.toLowerCase() === wanted,
      );
      if (!entry) { client.send("assassinateResult", { ok: false }); return; }
      const [targetId, targetP] = entry;
      const targetClient = this.clients.find((c) => c.sessionId === targetId);
      if (!targetClient) { client.send("assassinateResult", { ok: false }); return; }
      targetClient.send("killed", { by: killer.name });
      client.send("assassinateResult", { ok: true, target: targetP.name });
      this.broadcast("assassinated", { by: killer.name, target: targetP.name });
    });

    // gap/edge deaths are decided by the faller's own physics — relay for the feed
    this.onMessage("fell", (client: Client, d: { row?: number; cause?: string }) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      const cause = d?.cause === "hole" ? "hole" : "gap";
      this.broadcast(
        "fell",
        { id: client.sessionId, name: p.name, row: Math.max(0, Math.trunc(Number(d?.row) || 0)), cause },
        { except: client },
      );
    });
  }

  onLeave(client: Client) {
    const p = this.players.get(client.sessionId);
    this.players.delete(client.sessionId);
    if (p) this.broadcast("leave", { id: client.sessionId, name: p.name });
  }
}
