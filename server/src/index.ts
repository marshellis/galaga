import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { GalagaRoom } from "./rooms/GalagaRoom";
import { GlassBridgeRoom } from "./rooms/GlassBridgeRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("galaga", GalagaRoom);
gameServer.define("glass-bridge", GlassBridgeRoom);

httpServer.listen(port, () => console.log(`Server running on port ${port}`));
