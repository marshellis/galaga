# Galaga Online — Plan 1: Foundation + Single-Player Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable single-player Galaga game in the browser — enemies spawn in a formation, sweep and dive, shoot back; player moves freely and fires; waves progress on clear; game ends when lives run out.

**Architecture:** Monorepo with three npm workspace packages (`shared`, `server`, `client`). Server owns all game state and runs a fixed 60-tick/sec game loop via Colyseus. Client renders Colyseus state patches with Phaser 3 and sends keyboard input events to the server. No game logic lives in the client.

**Tech Stack:** TypeScript 5, Colyseus 0.15 + @colyseus/schema 2, colyseus.js 0.15, Phaser 3.80, Vite 5, Vitest 1, Node 20, Express 4, uuid 9.

## Global Constraints

- Node ≥ 20; npm ≥ 10
- TypeScript strict mode in all three packages
- No game logic in `client/` — server is authoritative for all positions, collisions, and scores
- All paths below are relative to repo root
- Server port: 2567 | Client dev port: 3000
- Baseline world: 800 × 600 px (single player)
- Game loop tick rate: 60/sec

**Split:** Tasks 1–2 are done together. Tasks 3–7 are the server developer. Tasks 8–13 are the client developer. Both can work in parallel after Task 2 is committed.

---

### Task 1: Monorepo Scaffold

**Owner: Both (do together)**

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`

- [ ] **Step 1: Create `package.json` (workspace root)**

```json
{
  "name": "galaga",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev:server": "npm run dev --workspace=server",
    "dev:client": "npm run dev --workspace=client",
    "test": "npm run test --workspace=server"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 3: Create `shared/package.json`**

```json
{
  "name": "shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "dependencies": {
    "@colyseus/schema": "^2.0.0"
  }
}
```

- [ ] **Step 4: Create `shared/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `server/package.json`**

```json
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@colyseus/core": "^0.15.0",
    "@colyseus/ws-transport": "^0.15.0",
    "express": "^4.18.0",
    "shared": "*",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 6: Create `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "paths": { "shared/*": ["../shared/src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create `client/package.json`**

```json
{
  "name": "client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "vite build"
  },
  "dependencies": {
    "colyseus.js": "^0.15.0",
    "phaser": "^3.80.0",
    "shared": "*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 8: Create `client/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "rootDir": "src",
    "paths": { "shared/*": ["../shared/src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create `client/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { shared: path.resolve(__dirname, "../shared/src") },
  },
  server: { port: 3000 },
});
```

- [ ] **Step 10: Create `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Galaga</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #000; overflow: hidden; }
    </style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 11: Install all dependencies**

Run from repo root:
```bash
npm install
```

Expected: `node_modules/` appears in root, `shared/`, `server/`, and `client/`. No errors.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.base.json shared/ server/ client/
git commit -m "feat: monorepo scaffold with npm workspaces"
```

---

### Task 2: Shared Schemas & Types

**Owner: Both (do together)**

**Files:**
- Create: `shared/src/types/enums.ts`
- Create: `shared/src/types/events.ts`
- Create: `shared/src/schemas/PlayerState.ts`
- Create: `shared/src/schemas/EnemyState.ts`
- Create: `shared/src/schemas/BulletState.ts`
- Create: `shared/src/schemas/GameState.ts`
- Create: `shared/src/index.ts`

**Interfaces:**
- Produces: all types consumed by Tasks 3–13

- [ ] **Step 1: Create `shared/src/types/enums.ts`**

```typescript
export enum GameMode {
  Cooperative = "cooperative",
  Competitive = "competitive",
}

export enum CoopSubtype {
  SharedLives = "shared_lives",
  IndependentLives = "independent_lives",
  RoleSpecialization = "role_specialization",
}

export enum CompetitiveSubtype {
  ScoreRace = "score_race",
  LastShipStanding = "last_ship_standing",
  Territory = "territory",
}

export enum PlayerRole {
  Shooter = "shooter",
  Shield = "shield",
  Bomber = "bomber",
  Healer = "healer",
}

export enum ShooterShotType {
  Rapid = "rapid",
  Heavy = "heavy",
  Spread = "spread",
  Piercing = "piercing",
}

export enum EnemyType {
  Basic = "basic",
  Boss = "boss",
}

export enum GamePhase {
  Lobby = "lobby",
  Playing = "playing",
  GameOver = "gameover",
}
```

- [ ] **Step 2: Create `shared/src/types/events.ts`**

```typescript
export interface InputEvent {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export interface JoinOptions {
  displayName?: string;
}
```

- [ ] **Step 3: Create `shared/src/schemas/PlayerState.ts`**

```typescript
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
```

- [ ] **Step 4: Create `shared/src/schemas/EnemyState.ts`**

```typescript
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
```

- [ ] **Step 5: Create `shared/src/schemas/BulletState.ts`**

```typescript
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
}
```

- [ ] **Step 6: Create `shared/src/schemas/GameState.ts`**

```typescript
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { EnemyState } from "./EnemyState";
import { BulletState } from "./BulletState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([EnemyState]) enemies = new ArraySchema<EnemyState>();
  @type([BulletState]) bullets = new ArraySchema<BulletState>();
  @type("string") phase: string = "lobby";
  @type("string") gameMode: string = "cooperative";
  @type("string") subType: string = "shared_lives";
  @type("number") wave: number = 1;
  @type("number") worldWidth: number = 800;
  @type("number") worldHeight: number = 600;
  @type("number") cameraZoom: number = 1;
  @type("number") sharedLives: number = 0;
  @type("number") sharedScore: number = 0;
}
```

- [ ] **Step 7: Create `shared/src/index.ts`**

```typescript
export * from "./schemas/GameState";
export * from "./schemas/PlayerState";
export * from "./schemas/EnemyState";
export * from "./schemas/BulletState";
export * from "./types/enums";
export * from "./types/events";
```

- [ ] **Step 8: Commit**

```bash
git add shared/
git commit -m "feat: shared Colyseus schemas and TypeScript types"
```

---

### Task 3: Server Foundation

**Owner: Server developer**

**Files:**
- Create: `server/src/rooms/GalagaRoom.ts`
- Create: `server/src/index.ts`

**Interfaces:**
- Consumes: `GameState`, `PlayerState`, `JoinOptions` from `shared`
- Produces: WebSocket server on port 2567; Colyseus room named `"galaga"`

- [ ] **Step 1: Create `server/src/rooms/GalagaRoom.ts`**

```typescript
import { Room, Client } from "@colyseus/core";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { InputEvent, JoinOptions } from "shared/types/events";

const TICK_MS = 1000 / 60;
const WORLD_W = 800;
const WORLD_H = 600;

export class GalagaRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    this.onMessage("input", (_client: Client, _input: InputEvent) => {
      // wired in Task 4
    });

    this.onMessage("start", (_client: Client) => {
      if (this.state.phase !== "lobby") return;
      this.state.phase = "playing";
    });

    this.setSimulationInterval((_dt: number) => {}, TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = options.displayName ?? "Anonymous";
    player.x = WORLD_W / 2;
    player.y = WORLD_H - 60;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
```

- [ ] **Step 2: Create `server/src/index.ts`**

```typescript
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { GalagaRoom } from "./rooms/GalagaRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("galaga", GalagaRoom);

httpServer.listen(port, () => console.log(`Server running on port ${port}`));
```

- [ ] **Step 3: Start the server and verify it runs**

```bash
npm run dev:server
```

Expected output: `Server running on port 2567`

In a separate terminal:
```bash
curl http://localhost:2567/health
```

Expected: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add server/src/
git commit -m "feat: Colyseus server with GalagaRoom accepting connections"
```

---

### Task 4: Server Game Loop — Player Movement

**Owner: Server developer**

**Files:**
- Create: `server/src/game/GameLoop.ts`
- Create: `server/src/__tests__/GameLoop.test.ts`
- Modify: `server/src/rooms/GalagaRoom.ts`

**Interfaces:**
- Consumes: `GameState`, `InputEvent` from `shared`
- Produces: `GameLoop` class — `handleInput(sessionId, input)`, `update(dtMs)`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/GameLoop.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=server
```

Expected: FAIL with `Cannot find module '../game/GameLoop'`

- [ ] **Step 3: Create `server/src/game/GameLoop.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";

const PLAYER_SPEED = 220;
const PLAYER_HALF = 16;

export class GameLoop {
  private inputs = new Map<string, InputEvent>();

  constructor(private state: GameState) {}

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
  }

  isGameOver(): boolean {
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  private movePlayers(dt: number) {
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const input = this.inputs.get(sessionId);
      if (!input) return;

      if (input.left)  player.x -= PLAYER_SPEED * dt;
      if (input.right) player.x += PLAYER_SPEED * dt;
      if (input.up)    player.y -= PLAYER_SPEED * dt;
      if (input.down)  player.y += PLAYER_SPEED * dt;

      player.x = Math.max(PLAYER_HALF, Math.min(this.state.worldWidth  - PLAYER_HALF, player.x));
      player.y = Math.max(PLAYER_HALF, Math.min(this.state.worldHeight - PLAYER_HALF, player.y));
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test --workspace=server
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Wire GameLoop into GalagaRoom — replace `server/src/rooms/GalagaRoom.ts`**

```typescript
import { Room, Client } from "@colyseus/core";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { InputEvent, JoinOptions } from "shared/types/events";
import { GameLoop } from "../game/GameLoop";

const TICK_MS = 1000 / 60;
const WORLD_W = 800;
const WORLD_H = 600;

export class GalagaRoom extends Room<GameState> {
  private loop: GameLoop | null = null;

  onCreate() {
    this.setState(new GameState());

    this.onMessage("input", (client: Client, input: InputEvent) => {
      this.loop?.handleInput(client.sessionId, input);
    });

    this.onMessage("start", (_client: Client) => {
      if (this.state.phase !== "lobby") return;
      this.state.phase = "playing";
      this.loop = new GameLoop(this.state);
    });

    this.setSimulationInterval((dt: number) => {
      if (this.state.phase !== "playing") return;
      this.loop!.update(dt);
      if (this.loop!.isGameOver()) this.state.phase = "gameover";
    }, TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = options.displayName ?? "Anonymous";
    player.x = WORLD_W / 2;
    player.y = WORLD_H - 60;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: server game loop with player movement and input handling"
```

---

### Task 5: Server Bullet Manager

**Owner: Server developer**

**Files:**
- Create: `server/src/game/BulletManager.ts`
- Create: `server/src/__tests__/BulletManager.test.ts`
- Modify: `server/src/game/GameLoop.ts`

**Interfaces:**
- Consumes: `GameState`, `BulletState`, `ShooterShotType` from `shared`
- Produces: `BulletManager` — `spawnPlayerBullet(sessionId, x, y, shotType)`, `spawnEnemyBullet(x, y)`, `update(dtSec)`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/BulletManager.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { BulletManager } from "../game/BulletManager";
import { GameState } from "shared/schemas/GameState";
import { ShooterShotType } from "shared/types/enums";

function makeState() {
  const s = new GameState();
  s.worldWidth = 800;
  s.worldHeight = 600;
  return s;
}

describe("BulletManager", () => {
  it("spawns a player bullet at the given position", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    expect(state.bullets.length).toBe(1);
    expect(state.bullets[0].x).toBe(400);
    expect(state.bullets[0].isEnemy).toBe(false);
  });

  it("spawns 3 bullets for Spread shot type", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Spread);
    expect(state.bullets.length).toBe(3);
  });

  it("marks Piercing bullets with piercing=true", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Piercing);
    expect(state.bullets[0].piercing).toBe(true);
  });

  it("Heavy bullet has a larger width than Rapid", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Heavy);
    expect(state.bullets[0].width).toBeGreaterThan(4);
  });

  it("moves player bullets upward on update", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    const startY = state.bullets[0].y;
    mgr.update(1 / 60);
    expect(state.bullets[0].y).toBeLessThan(startY);
  });

  it("moves enemy bullets downward on update", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnEnemyBullet(400, 100);
    const startY = state.bullets[0].y;
    mgr.update(1 / 60);
    expect(state.bullets[0].y).toBeGreaterThan(startY);
  });

  it("removes bullets that travel off screen", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    state.bullets[0].y = -200;
    mgr.update(1 / 60);
    expect(state.bullets.length).toBe(0);
  });

  it("enforces fire rate cooldown per player", () => {
    const state = makeState();
    const mgr = new BulletManager(state);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    mgr.spawnPlayerBullet("p1", 400, 540, ShooterShotType.Rapid);
    expect(state.bullets.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=server
```

Expected: FAIL with `Cannot find module '../game/BulletManager'`

- [ ] **Step 3: Create `server/src/game/BulletManager.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { BulletState } from "shared/schemas/BulletState";
import { ShooterShotType } from "shared/types/enums";
import { v4 as uuid } from "uuid";

interface BulletConfig { speed: number; fireRateMs: number; w: number; h: number; }

const CONFIGS: Record<string, BulletConfig> = {
  [ShooterShotType.Rapid]:    { speed: 500, fireRateMs: 150, w: 3,  h: 8  },
  [ShooterShotType.Heavy]:    { speed: 250, fireRateMs: 600, w: 10, h: 18 },
  [ShooterShotType.Spread]:   { speed: 380, fireRateMs: 350, w: 4,  h: 10 },
  [ShooterShotType.Piercing]: { speed: 380, fireRateMs: 300, w: 4,  h: 12 },
};

const ENEMY_SPEED = 180;

export class BulletManager {
  private lastFired = new Map<string, number>();
  private velocities = new Map<string, { vx: number; vy: number }>();

  constructor(private state: GameState) {}

  spawnPlayerBullet(sessionId: string, x: number, y: number, shotType: string) {
    const cfg = CONFIGS[shotType] ?? CONFIGS[ShooterShotType.Rapid];
    const now = Date.now();
    if ((now - (this.lastFired.get(sessionId) ?? 0)) < cfg.fireRateMs) return;
    this.lastFired.set(sessionId, now);

    const angles = shotType === ShooterShotType.Spread ? [-15, 0, 15] : [0];
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      const b = new BulletState();
      b.id = uuid();
      b.x = x;
      b.y = y - 16;
      b.width = cfg.w;
      b.height = cfg.h;
      b.ownerId = sessionId;
      b.isEnemy = false;
      b.piercing = shotType === ShooterShotType.Piercing;
      this.velocities.set(b.id, {
        vx: Math.sin(rad) * cfg.speed,
        vy: -Math.cos(rad) * cfg.speed,
      });
      this.state.bullets.push(b);
    }
  }

  spawnEnemyBullet(x: number, y: number) {
    const b = new BulletState();
    b.id = uuid();
    b.x = x;
    b.y = y + 16;
    b.width = 4;
    b.height = 10;
    b.ownerId = "enemy";
    b.isEnemy = true;
    this.velocities.set(b.id, { vx: 0, vy: ENEMY_SPEED });
    this.state.bullets.push(b);
  }

  /** Returns damage dealt by a bullet (Heavy = 2, all others = 1) */
  damageOf(bulletId: string): number {
    const b = this.state.bullets.find(x => x.id === bulletId);
    return b && b.width >= 10 ? 2 : 1;
  }

  update(dtSec: number) {
    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      const vel = this.velocities.get(b.id) ?? { vx: 0, vy: b.isEnemy ? ENEMY_SPEED : -380 };
      b.x += vel.vx * dtSec;
      b.y += vel.vy * dtSec;
      if (b.y < -40 || b.y > this.state.worldHeight + 40 ||
          b.x < -40 || b.x > this.state.worldWidth + 40) {
        this.velocities.delete(b.id);
        this.state.bullets.splice(i, 1);
      }
    }
  }

  removeBullet(id: string) {
    const idx = this.state.bullets.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.velocities.delete(id);
      this.state.bullets.splice(idx, 1);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test --workspace=server
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Wire BulletManager into GameLoop — replace `server/src/game/GameLoop.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { BulletManager } from "./BulletManager";

const PLAYER_SPEED = 220;
const PLAYER_HALF = 16;

export class GameLoop {
  private inputs = new Map<string, InputEvent>();
  readonly bulletManager: BulletManager;

  constructor(private state: GameState) {
    this.bulletManager = new BulletManager(state);
  }

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
    this.bulletManager.update(dt);
  }

  isGameOver(): boolean {
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  private movePlayers(dt: number) {
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const input = this.inputs.get(sessionId);
      if (!input) return;

      if (input.left)  player.x -= PLAYER_SPEED * dt;
      if (input.right) player.x += PLAYER_SPEED * dt;
      if (input.up)    player.y -= PLAYER_SPEED * dt;
      if (input.down)  player.y += PLAYER_SPEED * dt;

      player.x = Math.max(PLAYER_HALF, Math.min(this.state.worldWidth  - PLAYER_HALF, player.x));
      player.y = Math.max(PLAYER_HALF, Math.min(this.state.worldHeight - PLAYER_HALF, player.y));

      if (input.fire) {
        this.bulletManager.spawnPlayerBullet(sessionId, player.x, player.y, player.shotType);
      }
    });
  }
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test --workspace=server
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/
git commit -m "feat: bullet manager with rapid/heavy/spread/piercing shot types"
```

---

### Task 6: Server Enemy Manager & Wave Manager

**Owner: Server developer**

**Files:**
- Create: `server/src/game/EnemyManager.ts`
- Create: `server/src/game/WaveManager.ts`
- Create: `server/src/__tests__/EnemyManager.test.ts`
- Modify: `server/src/game/GameLoop.ts`

**Interfaces:**
- Consumes: `GameState`, `EnemyState`, `EnemyType` from `shared`; `BulletManager` from Task 5
- Produces: `EnemyManager` — `spawnFormation(wave, playerCount)`, `update(dtSec)`, `allDefeated()`, `setBulletManager(bm)`; `WaveManager` — `start()`, `check()`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/EnemyManager.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { EnemyManager } from "../game/EnemyManager";
import { GameState } from "shared/schemas/GameState";

function makeState(worldWidth = 800) {
  const s = new GameState();
  s.worldWidth = worldWidth;
  s.worldHeight = 600;
  return s;
}

describe("EnemyManager", () => {
  it("spawns enemies on spawnFormation", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("spawns more enemies for more players", () => {
    const s1 = makeState(800);
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState(1200);
    new EnemyManager(s2).spawnFormation(1, 3);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("spawns more enemies on higher waves", () => {
    const s1 = makeState();
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState();
    new EnemyManager(s2).spawnFormation(5, 1);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("allDefeated returns true when enemies array is empty", () => {
    const state = makeState();
    expect(new EnemyManager(state).allDefeated()).toBe(true);
  });

  it("moves enemies horizontally each update", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    const startX = state.enemies[0].x;
    mgr.update(0.5);
    expect(state.enemies[0].x).not.toBe(startX);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=server
```

Expected: FAIL with `Cannot find module '../game/EnemyManager'`

- [ ] **Step 3: Create `server/src/game/EnemyManager.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { EnemyState } from "shared/schemas/EnemyState";
import { EnemyType } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { v4 as uuid } from "uuid";

const SWEEP_SPEED = 60;
const DIVE_SPEED = 180;
const DIVE_CHANCE = 0.3;
const FIRE_CHANCE = 0.15;
const MARGIN = 40;

export class EnemyManager {
  private sweepDir = 1;
  private bulletManager: BulletManager | null = null;

  constructor(private state: GameState) {}

  setBulletManager(bm: BulletManager) {
    this.bulletManager = bm;
  }

  spawnFormation(wave: number, playerCount: number) {
    const cols = 8 + (playerCount - 1) * 2;
    const rows = 4 + Math.floor((wave - 1) / 2);
    const spacingX = this.state.worldWidth / (cols + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const e = new EnemyState();
        e.id = uuid();
        e.x = spacingX * (col + 1);
        e.y = 56 + row * 44;
        e.type = row === 0 ? EnemyType.Boss : EnemyType.Basic;
        e.hp = row === 0 ? 2 : 1;
        e.alive = true;
        e.diving = false;
        this.state.enemies.push(e);
      }
    }
  }

  update(dtSec: number) {
    const formation = this.state.enemies.filter(e => !e.diving);
    if (formation.length > 0) {
      const rightmost = Math.max(...formation.map(e => e.x));
      const leftmost  = Math.min(...formation.map(e => e.x));
      if (rightmost >= this.state.worldWidth - MARGIN) this.sweepDir = -1;
      if (leftmost  <= MARGIN)                          this.sweepDir =  1;
    }

    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const e = this.state.enemies[i];

      if (e.diving) {
        e.y += DIVE_SPEED * dtSec;
        if (e.y > this.state.worldHeight + 40) {
          this.state.enemies.splice(i, 1);
        }
      } else {
        e.x += SWEEP_SPEED * this.sweepDir * dtSec;

        if (Math.random() < DIVE_CHANCE * dtSec) e.diving = true;

        if (this.bulletManager && Math.random() < FIRE_CHANCE * dtSec) {
          this.bulletManager.spawnEnemyBullet(e.x, e.y);
        }
      }
    }
  }

  allDefeated(): boolean {
    return this.state.enemies.length === 0;
  }
}
```

- [ ] **Step 4: Create `server/src/game/WaveManager.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { EnemyManager } from "./EnemyManager";

export class WaveManager {
  constructor(
    private state: GameState,
    private enemyManager: EnemyManager,
    private playerCount: number,
  ) {}

  start() {
    this.spawnWave(1);
  }

  check() {
    if (this.enemyManager.allDefeated()) {
      this.spawnWave(this.state.wave + 1);
    }
  }

  private spawnWave(wave: number) {
    this.state.wave = wave;
    this.enemyManager.spawnFormation(wave, this.playerCount);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test --workspace=server
```

Expected: All tests PASS.

- [ ] **Step 6: Wire EnemyManager and WaveManager into GameLoop — replace `server/src/game/GameLoop.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { BulletManager } from "./BulletManager";
import { EnemyManager } from "./EnemyManager";
import { WaveManager } from "./WaveManager";

const PLAYER_SPEED = 220;
const PLAYER_HALF = 16;

export class GameLoop {
  private inputs = new Map<string, InputEvent>();
  readonly bulletManager: BulletManager;
  readonly enemyManager: EnemyManager;
  private waveManager: WaveManager;

  constructor(private state: GameState) {
    this.bulletManager = new BulletManager(state);
    this.enemyManager = new EnemyManager(state);
    this.enemyManager.setBulletManager(this.bulletManager);
    this.waveManager = new WaveManager(state, this.enemyManager, state.players.size);
    this.waveManager.start();
  }

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
    this.bulletManager.update(dt);
    this.enemyManager.update(dt);
    this.waveManager.check();
  }

  isGameOver(): boolean {
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  private movePlayers(dt: number) {
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const input = this.inputs.get(sessionId);
      if (!input) return;

      if (input.left)  player.x -= PLAYER_SPEED * dt;
      if (input.right) player.x += PLAYER_SPEED * dt;
      if (input.up)    player.y -= PLAYER_SPEED * dt;
      if (input.down)  player.y += PLAYER_SPEED * dt;

      player.x = Math.max(PLAYER_HALF, Math.min(this.state.worldWidth  - PLAYER_HALF, player.x));
      player.y = Math.max(PLAYER_HALF, Math.min(this.state.worldHeight - PLAYER_HALF, player.y));

      if (input.fire) {
        this.bulletManager.spawnPlayerBullet(sessionId, player.x, player.y, player.shotType);
      }
    });
  }
}
```

- [ ] **Step 7: Run all tests**

```bash
npm test --workspace=server
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/
git commit -m "feat: enemy formation sweep, dive, fire, and wave progression"
```

---

### Task 7: Server Collision Detection

**Owner: Server developer**

**Files:**
- Create: `server/src/game/CollisionDetector.ts`
- Create: `server/src/__tests__/CollisionDetector.test.ts`
- Modify: `server/src/game/GameLoop.ts`

**Interfaces:**
- Consumes: `GameState`, `BulletManager`, `EnemyType` from `shared`
- Produces: `CollisionDetector` — `check()` updates scores, removes enemies/bullets, reduces player lives

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/CollisionDetector.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CollisionDetector } from "../game/CollisionDetector";
import { BulletManager } from "../game/BulletManager";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyState } from "shared/schemas/EnemyState";
import { BulletState } from "shared/schemas/BulletState";
import { ShooterShotType, EnemyType } from "shared/types/enums";

function setup() {
  const state = new GameState();
  state.worldWidth = 800; state.worldHeight = 600;
  const player = new PlayerState();
  player.sessionId = "p1"; player.x = 400; player.y = 540;
  player.alive = true; player.lives = 3; player.hp = 1; player.score = 0;
  state.players.set("p1", player);
  const bm = new BulletManager(state);
  const cd = new CollisionDetector(state, bm);
  return { state, player, bm, cd };
}

function enemy(state: GameState, x: number, y: number, hp = 1, type = EnemyType.Basic) {
  const e = new EnemyState();
  e.id = "e1"; e.x = x; e.y = y; e.hp = hp; e.alive = true; e.type = type;
  state.enemies.push(e);
  return e;
}

function playerBullet(state: GameState, x: number, y: number, piercing = false, width = 4) {
  const b = new BulletState();
  b.id = `b-${Math.random()}`; b.x = x; b.y = y;
  b.width = width; b.height = 12; b.ownerId = "p1";
  b.isEnemy = false; b.piercing = piercing;
  state.bullets.push(b);
  return b;
}

function enemyBullet(state: GameState, x: number, y: number) {
  const b = new BulletState();
  b.id = `eb-${Math.random()}`; b.x = x; b.y = y;
  b.width = 4; b.height = 10; b.ownerId = "enemy";
  b.isEnemy = true; b.piercing = false;
  state.bullets.push(b);
  return b;
}

describe("CollisionDetector", () => {
  it("player bullet hitting basic enemy removes both and awards 100 points", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300);
    playerBullet(state, 400, 300);
    cd.check();
    expect(state.enemies.length).toBe(0);
    expect(state.bullets.length).toBe(0);
    expect(player.score).toBe(100);
  });

  it("player bullet hitting boss enemy awards 200 points on kill", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300, 1, EnemyType.Boss);
    playerBullet(state, 400, 300);
    cd.check();
    expect(player.score).toBe(200);
  });

  it("normal bullet reduces 2-HP enemy to 1 HP without killing", () => {
    const { state, cd } = setup();
    enemy(state, 400, 300, 2);
    playerBullet(state, 400, 300);
    cd.check();
    expect(state.enemies.length).toBe(1);
    expect(state.enemies[0].hp).toBe(1);
  });

  it("heavy bullet (width>=10) deals 2 damage", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 300, 2);
    playerBullet(state, 400, 300, false, 10);
    cd.check();
    expect(state.enemies.length).toBe(0);
    expect(player.score).toBe(100);
  });

  it("enemy bullet hitting player reduces lives and removes bullet", () => {
    const { state, player, cd } = setup();
    enemyBullet(state, 400, 540);
    cd.check();
    expect(player.lives).toBe(2);
    expect(state.bullets.length).toBe(0);
  });

  it("player dies when lives reach 0", () => {
    const { state, player, cd } = setup();
    player.lives = 1;
    enemyBullet(state, 400, 540);
    cd.check();
    expect(player.alive).toBe(false);
  });

  it("piercing bullet stays after hitting an enemy", () => {
    const { state, cd } = setup();
    enemy(state, 400, 300);
    playerBullet(state, 400, 300, true);
    cd.check();
    expect(state.bullets.length).toBe(1);
    expect(state.enemies.length).toBe(0);
  });

  it("non-overlapping bullet and enemy do not interact", () => {
    const { state, player, cd } = setup();
    enemy(state, 100, 100);
    playerBullet(state, 700, 500);
    cd.check();
    expect(state.enemies.length).toBe(1);
    expect(player.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=server
```

Expected: FAIL with `Cannot find module '../game/CollisionDetector'`

- [ ] **Step 3: Create `server/src/game/CollisionDetector.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { EnemyType } from "shared/types/enums";
import { BulletManager } from "./BulletManager";

const PLAYER_HALF = 16;
const ENEMY_HALF = 20;

function overlaps(ax: number, ay: number, aw: number, bx: number, by: number, bw: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (aw + bw) / 2;
}

export class CollisionDetector {
  constructor(private state: GameState, private bulletManager: BulletManager) {}

  check() {
    this.playerBulletsVsEnemies();
    this.enemyBulletsVsPlayers();
  }

  private playerBulletsVsEnemies() {
    for (let bi = this.state.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.state.bullets[bi];
      if (bullet.isEnemy) continue;

      const damage = bullet.width >= 10 ? 2 : 1;
      let consumed = false;

      for (let ei = this.state.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.state.enemies[ei];
        if (!overlaps(bullet.x, bullet.y, bullet.width, enemy.x, enemy.y, ENEMY_HALF)) continue;

        enemy.hp -= damage;

        if (enemy.hp <= 0) {
          const points = enemy.type === EnemyType.Boss ? 200 : 100;
          const player = this.state.players.get(bullet.ownerId);
          if (player) player.score += points;
          this.state.enemies.splice(ei, 1);
        }

        if (!bullet.piercing) { consumed = true; break; }
      }

      if (consumed) this.state.bullets.splice(bi, 1);
    }
  }

  private enemyBulletsVsPlayers() {
    for (let bi = this.state.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.state.bullets[bi];
      if (!bullet.isEnemy) continue;

      let hit = false;
      this.state.players.forEach(player => {
        if (!player.alive || hit) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;
        player.lives -= 1;
        if (player.lives <= 0) player.alive = false;
        hit = true;
      });

      if (hit) this.state.bullets.splice(bi, 1);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test --workspace=server
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Wire CollisionDetector into GameLoop — replace `server/src/game/GameLoop.ts`**

```typescript
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { BulletManager } from "./BulletManager";
import { EnemyManager } from "./EnemyManager";
import { WaveManager } from "./WaveManager";
import { CollisionDetector } from "./CollisionDetector";

const PLAYER_SPEED = 220;
const PLAYER_HALF = 16;

export class GameLoop {
  private inputs = new Map<string, InputEvent>();
  private bulletManager: BulletManager;
  private enemyManager: EnemyManager;
  private waveManager: WaveManager;
  private collisionDetector: CollisionDetector;

  constructor(private state: GameState) {
    this.bulletManager = new BulletManager(state);
    this.enemyManager = new EnemyManager(state);
    this.enemyManager.setBulletManager(this.bulletManager);
    this.collisionDetector = new CollisionDetector(state, this.bulletManager);
    this.waveManager = new WaveManager(state, this.enemyManager, state.players.size);
    this.waveManager.start();
  }

  handleInput(sessionId: string, input: InputEvent) {
    this.inputs.set(sessionId, input);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.movePlayers(dt);
    this.bulletManager.update(dt);
    this.enemyManager.update(dt);
    this.collisionDetector.check();
    this.waveManager.check();
  }

  isGameOver(): boolean {
    let anyAlive = false;
    this.state.players.forEach(p => { if (p.alive) anyAlive = true; });
    return !anyAlive;
  }

  private movePlayers(dt: number) {
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      const input = this.inputs.get(sessionId);
      if (!input) return;

      if (input.left)  player.x -= PLAYER_SPEED * dt;
      if (input.right) player.x += PLAYER_SPEED * dt;
      if (input.up)    player.y -= PLAYER_SPEED * dt;
      if (input.down)  player.y += PLAYER_SPEED * dt;

      player.x = Math.max(PLAYER_HALF, Math.min(this.state.worldWidth  - PLAYER_HALF, player.x));
      player.y = Math.max(PLAYER_HALF, Math.min(this.state.worldHeight - PLAYER_HALF, player.y));

      if (input.fire) {
        this.bulletManager.spawnPlayerBullet(sessionId, player.x, player.y, player.shotType);
      }
    });
  }
}
```

- [ ] **Step 6: Run all server tests**

```bash
npm test --workspace=server
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/
git commit -m "feat: collision detection with scoring and player death"
```

---

### Task 8: Client Foundation

**Owner: Client developer**

**Files:**
- Create: `client/src/config.ts`
- Create: `client/src/scenes/BootScene.ts`
- Create: `client/src/scenes/MenuScene.ts`
- Create: `client/src/scenes/GameScene.ts` (placeholder)
- Create: `client/src/scenes/GameOverScene.ts` (placeholder)
- Create: `client/src/main.ts`

**Interfaces:**
- Produces: Phaser game at `http://localhost:3000` with Boot and Menu scenes

- [ ] **Step 1: Create `client/src/config.ts`**

```typescript
export const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL ?? "ws://localhost:2567";
export const WORLD_W = 800;
export const WORLD_H = 600;
```

- [ ] **Step 2: Create `client/src/scenes/BootScene.ts`**

```typescript
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0 });

    // player ship — white triangle pointing up
    g.fillStyle(0xffffff);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.generateTexture("player", 32, 32);
    g.clear();

    // basic enemy — yellow
    g.fillStyle(0xffff00);
    g.fillRect(4, 4, 24, 24);
    g.generateTexture("enemy_basic", 32, 32);
    g.clear();

    // boss enemy — red, larger
    g.fillStyle(0xff4444);
    g.fillRect(2, 2, 44, 44);
    g.generateTexture("enemy_boss", 48, 48);
    g.clear();

    // rapid/spread/piercing bullet — cyan
    g.fillStyle(0x00ffff);
    g.fillRect(0, 0, 4, 12);
    g.generateTexture("bullet_player", 4, 12);
    g.clear();

    // heavy bullet — orange, wide
    g.fillStyle(0xff8800);
    g.fillRect(0, 0, 10, 18);
    g.generateTexture("bullet_heavy", 10, 18);
    g.clear();

    // enemy bullet — red
    g.fillStyle(0xff0000);
    g.fillRect(0, 0, 4, 10);
    g.generateTexture("bullet_enemy", 4, 10);
    g.clear();

    g.destroy();
  }

  create() {
    this.scene.start("MenuScene");
  }
}
```

- [ ] **Step 3: Create `client/src/scenes/MenuScene.ts`**

```typescript
import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 120, "GALAGA", {
      fontSize: "64px", color: "#ffff00", fontFamily: "monospace",
    }).setOrigin(0.5);

    const prompt = this.add.text(cx, cy + 20, "[ PRESS ENTER TO PLAY ]", {
      fontSize: "24px", color: "#00ffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-ENTER", () => {
      this.scene.start("GameScene");
    });
  }
}
```

- [ ] **Step 4: Create placeholder `client/src/scenes/GameScene.ts`**

```typescript
import Phaser from "phaser";
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }
  create() {
    this.add.text(10, 10, "Connecting...", { color: "#ffffff", fontFamily: "monospace" });
  }
}
```

- [ ] **Step 5: Create placeholder `client/src/scenes/GameOverScene.ts`**

```typescript
import Phaser from "phaser";
export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOverScene" }); }
  create() {
    this.add.text(10, 10, "Game Over", { color: "#ff0000", fontFamily: "monospace" });
  }
}
```

- [ ] **Step 6: Create `client/src/main.ts`**

```typescript
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

new Phaser.Game({
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#000000",
  pixelArt: true,
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
});
```

- [ ] **Step 7: Start client dev server and verify menu loads**

```bash
npm run dev:client
```

Open `http://localhost:3000`. Expected: black screen with yellow "GALAGA" title and a blinking cyan "PRESS ENTER TO PLAY" prompt.

- [ ] **Step 8: Commit**

```bash
git add client/src/
git commit -m "feat: Phaser client with Boot and Menu scenes"
```

---

### Task 9: Client Network Layer

**Owner: Client developer**

**Files:**
- Create: `client/src/network/ColyseusClient.ts`

**Interfaces:**
- Consumes: `GameState` from `shared`; `SERVER_URL` from `config.ts`
- Produces: `colyseusClient` singleton — `connect(displayName)` returns `Room<GameState>`, `sendInput(input)`, `sendStart()`, `leave()`, public `room` property

- [ ] **Step 1: Create `client/src/network/ColyseusClient.ts`**

```typescript
import * as Colyseus from "colyseus.js";
import { GameState } from "shared/schemas/GameState";
import { InputEvent } from "shared/types/events";
import { SERVER_URL } from "../config";

class ColyseusClientSingleton {
  private client = new Colyseus.Client(SERVER_URL);
  public room: Colyseus.Room<GameState> | null = null;

  async connect(displayName: string): Promise<Colyseus.Room<GameState>> {
    this.room = await this.client.joinOrCreate<GameState>("galaga", { displayName });
    return this.room;
  }

  sendInput(input: InputEvent) {
    this.room?.send("input", input);
  }

  sendStart() {
    this.room?.send("start", {});
  }

  leave() {
    this.room?.leave();
    this.room = null;
  }
}

export const colyseusClient = new ColyseusClientSingleton();
```

- [ ] **Step 2: Commit**

```bash
git add client/src/network/
git commit -m "feat: Colyseus client singleton"
```

---

### Task 10: Client Input Handler

**Owner: Client developer**

**Files:**
- Create: `client/src/input/InputHandler.ts`

**Interfaces:**
- Consumes: `colyseusClient` from `network/ColyseusClient`; Phaser keyboard
- Produces: `InputHandler` with `update()` — polls keys each frame and sends `InputEvent` to server

- [ ] **Step 1: Create `client/src/input/InputHandler.ts`**

```typescript
import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { InputEvent } from "shared/types/events";

export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private spaceKey: Phaser.Input.Keyboard.Key;

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
    colyseusClient.sendInput(input);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/input/
git commit -m "feat: keyboard input handler (arrows + WASD + space)"
```

---

### Task 11: Client Renderers

**Owner: Client developer**

**Files:**
- Create: `client/src/rendering/PlayerRenderer.ts`
- Create: `client/src/rendering/EnemyRenderer.ts`
- Create: `client/src/rendering/BulletRenderer.ts`
- Create: `client/src/rendering/ExplosionRenderer.ts`

**Interfaces:**
- Consumes: Phaser scene, `PlayerState` / `EnemyState` / `BulletState` from `shared`
- Produces: four renderer classes each with `sync(data)` that keeps Phaser sprites in sync with server state

- [ ] **Step 1: Create `client/src/rendering/PlayerRenderer.ts`**

```typescript
import Phaser from "phaser";
import { MapSchema } from "@colyseus/schema";
import { PlayerState } from "shared/schemas/PlayerState";

export class PlayerRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(players: MapSchema<PlayerState>) {
    const seen = new Set<string>();

    players.forEach((player, id) => {
      seen.add(id);
      if (!this.sprites.has(id)) {
        const s = this.scene.add.image(player.x, player.y, "player").setDepth(10);
        this.sprites.set(id, s);
      }
      const s = this.sprites.get(id)!;
      s.setPosition(player.x, player.y).setVisible(player.alive);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }
}
```

- [ ] **Step 2: Create `client/src/rendering/EnemyRenderer.ts`**

```typescript
import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { EnemyState } from "shared/schemas/EnemyState";

export class EnemyRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(enemies: ArraySchema<EnemyState>) {
    const seen = new Set<string>();

    enemies.forEach(enemy => {
      seen.add(enemy.id);
      if (!this.sprites.has(enemy.id)) {
        const key = enemy.type === "boss" ? "enemy_boss" : "enemy_basic";
        const s = this.scene.add.image(enemy.x, enemy.y, key).setDepth(5);
        this.sprites.set(enemy.id, s);
      }
      this.sprites.get(enemy.id)!.setPosition(enemy.x, enemy.y);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }

  /** Returns last known positions of tracked enemies — used by ExplosionRenderer */
  getPosition(id: string): { x: number; y: number } | undefined {
    const s = this.sprites.get(id);
    return s ? { x: s.x, y: s.y } : undefined;
  }
}
```

- [ ] **Step 3: Create `client/src/rendering/BulletRenderer.ts`**

```typescript
import Phaser from "phaser";
import { ArraySchema } from "@colyseus/schema";
import { BulletState } from "shared/schemas/BulletState";

export class BulletRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  sync(bullets: ArraySchema<BulletState>) {
    const seen = new Set<string>();

    bullets.forEach(bullet => {
      seen.add(bullet.id);
      if (!this.sprites.has(bullet.id)) {
        const key = bullet.isEnemy ? "bullet_enemy"
          : bullet.width >= 10     ? "bullet_heavy"
          : "bullet_player";
        const s = this.scene.add.image(bullet.x, bullet.y, key).setDepth(8);
        this.sprites.set(bullet.id, s);
      }
      this.sprites.get(bullet.id)!.setPosition(bullet.x, bullet.y);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }
}
```

- [ ] **Step 4: Create `client/src/rendering/ExplosionRenderer.ts`**

```typescript
import Phaser from "phaser";

export class ExplosionRenderer {
  constructor(private scene: Phaser.Scene) {}

  explode(x: number, y: number, big = false) {
    const count = big ? 16 : 8;
    const emitter = this.scene.add.particles(x, y, "bullet_player", {
      speed: { min: 40, max: big ? 140 : 80 },
      scale: { start: big ? 1.5 : 0.8, end: 0 },
      lifespan: 400,
      quantity: count,
      emitting: false,
    });
    emitter.explode(count, x, y);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/rendering/
git commit -m "feat: player, enemy, bullet, and explosion renderers"
```

---

### Task 12: Client HUD

**Owner: Client developer**

**Files:**
- Create: `client/src/ui/HUD.ts`

**Interfaces:**
- Consumes: `GameState` from `shared`; Phaser scene
- Produces: `HUD` with `update(state, mySessionId)` — displays wave, score, lives fixed to screen

- [ ] **Step 1: Create `client/src/ui/HUD.ts`**

```typescript
import Phaser from "phaser";
import { GameState } from "shared/schemas/GameState";

const STYLE = { fontSize: "16px", color: "#00ff00", fontFamily: "monospace" };

export class HUD {
  private waveText:  Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.waveText  = scene.add.text(10, 10, "WAVE  1", STYLE).setScrollFactor(0).setDepth(100);
    this.scoreText = scene.add.text(10, 30, "SCORE 0", STYLE).setScrollFactor(0).setDepth(100);
    this.livesText = scene.add.text(10, 50, "LIVES ♥♥♥", STYLE).setScrollFactor(0).setDepth(100);
  }

  update(state: GameState, mySessionId: string) {
    this.waveText.setText(`WAVE  ${state.wave}`);
    const me = state.players.get(mySessionId);
    if (me) {
      this.scoreText.setText(`SCORE ${me.score}`);
      const hearts = "♥".repeat(Math.max(0, me.lives));
      this.livesText.setText(`LIVES ${hearts}`);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/ui/
git commit -m "feat: HUD with wave, score, and lives display"
```

---

### Task 13: Client GameScene & GameOverScene

**Owner: Client developer**

**Files:**
- Modify: `client/src/scenes/GameScene.ts` (replace placeholder)
- Modify: `client/src/scenes/GameOverScene.ts` (replace placeholder)

**Interfaces:**
- Consumes: `colyseusClient`, `InputHandler`, all renderers, `HUD`, `EnemyRenderer.getPosition()`
- Produces: fully playable game — connects to server, renders live state, transitions to GameOverScene on death

- [ ] **Step 1: Replace `client/src/scenes/GameScene.ts`**

```typescript
import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { InputHandler } from "../input/InputHandler";
import { PlayerRenderer } from "../rendering/PlayerRenderer";
import { EnemyRenderer } from "../rendering/EnemyRenderer";
import { BulletRenderer } from "../rendering/BulletRenderer";
import { ExplosionRenderer } from "../rendering/ExplosionRenderer";
import { HUD } from "../ui/HUD";
import { GameState } from "shared/schemas/GameState";

export class GameScene extends Phaser.Scene {
  private inputHandler!: InputHandler;
  private playerRenderer!: PlayerRenderer;
  private enemyRenderer!: EnemyRenderer;
  private bulletRenderer!: BulletRenderer;
  private explosionRenderer!: ExplosionRenderer;
  private hud!: HUD;
  private prevEnemyIds = new Set<string>();

  constructor() { super({ key: "GameScene" }); }

  async create() {
    this.playerRenderer   = new PlayerRenderer(this);
    this.enemyRenderer    = new EnemyRenderer(this);
    this.bulletRenderer   = new BulletRenderer(this);
    this.explosionRenderer = new ExplosionRenderer(this);
    this.hud              = new HUD(this);

    await colyseusClient.connect("Anonymous");
    this.inputHandler = new InputHandler(this);
    colyseusClient.sendStart();

    colyseusClient.room!.onStateChange((state: GameState) => this.syncState(state));
  }

  update() {
    this.inputHandler?.update();
  }

  private syncState(state: GameState) {
    if (state.phase === "gameover") {
      const me = state.players.get(colyseusClient.room!.sessionId);
      this.scene.start("GameOverScene", { score: me?.score ?? 0, wave: state.wave });
      return;
    }

    this.cameras.main.setZoom(state.cameraZoom);

    // fire explosions for enemies that disappeared since last frame
    const currentIds = new Set(state.enemies.map(e => e.id));
    this.prevEnemyIds.forEach(id => {
      if (!currentIds.has(id)) {
        const pos = this.enemyRenderer.getPosition(id);
        if (pos) this.explosionRenderer.explode(pos.x, pos.y, false);
      }
    });
    this.prevEnemyIds = currentIds;

    this.playerRenderer.sync(state.players);
    this.enemyRenderer.sync(state.enemies);
    this.bulletRenderer.sync(state.bullets);
    this.hud.update(state, colyseusClient.room!.sessionId);
  }
}
```

- [ ] **Step 2: Replace `client/src/scenes/GameOverScene.ts`**

```typescript
import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOverScene" }); }

  create(data: { score: number; wave: number }) {
    colyseusClient.leave();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 100, "GAME OVER", {
      fontSize: "56px", color: "#ff0000", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(cx, cy, `SCORE  ${data.score}`, {
      fontSize: "28px", color: "#ffffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(cx, cy + 44, `WAVE   ${data.wave}`, {
      fontSize: "28px", color: "#ffffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 120, "[ PRESS ENTER TO PLAY AGAIN ]", {
      fontSize: "20px", color: "#00ffff", fontFamily: "monospace",
    }).setOrigin(0.5);

    this.tweens.add({ targets: btn, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("MenuScene"));
  }
}
```

- [ ] **Step 3: Run server and client; do a full end-to-end test**

Terminal 1:
```bash
npm run dev:server
```

Terminal 2:
```bash
npm run dev:client
```

Open `http://localhost:3000` and verify each of the following:

- [ ] Menu shows "GALAGA" title and blinking prompt
- [ ] Pressing Enter connects to server and enemies appear in a formation
- [ ] Arrow keys and WASD move the ship
- [ ] Space fires bullets; different shot types visible (default is Rapid — small cyan)
- [ ] Bullets hitting enemies: enemies disappear, score increases
- [ ] Enemies sweep left-right and occasionally dive downward
- [ ] Enemy bullets travel downward; hit player reduces lives shown in HUD
- [ ] Three lives gone → Game Over screen shows score and wave number
- [ ] Pressing Enter on Game Over returns to Menu
- [ ] Second game starts fresh with wave 1 and score 0

- [ ] **Step 4: Commit**

```bash
git add client/src/scenes/
git commit -m "feat: GameScene wiring all renderers + GameOverScene"
```

- [ ] **Step 5: Push everything to GitHub**

```bash
git push
```

Expected: All 13 tasks worth of commits appear at `github.com/marshellis/galaga`

---

## What's Next

Plan 2 builds on top of this working game and adds:
- Multiplayer rooms (private codes + public matchmaking)
- Lobby with player list and chat
- All 6 game modes including Role Specialization with 2 HP, Healer, and the 4 Shooter shot-type variants
- Dynamic world scaling and camera zoom as players join
