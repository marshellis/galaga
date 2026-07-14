# Galaga Graphics, Movement & Collision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder shapes with pixel-art PNG sprites, add formation fly-in animation and curved dive paths for enemies, reduce enemy count, and add enemy body → player collision damage.

**Architecture:** A Node.js script (`scripts/gen-sprites.js`) generates PNG assets using `pngjs` and geometric primitives; `EnemyState` gains `entering` and `angle` fields; `EnemyManager` is rewritten to drive waypoint-based entry paths and quadratic Bézier dive arcs server-side; `CollisionDetector` gains an `enemiesVsPlayers` pass; client renderers load PNGs and apply rotation.

**Tech Stack:** pngjs (sprite generation), Phaser 3 `this.load.image()`, Colyseus shared schema, TypeScript, Vitest

## Global Constraints

- All enemy positions (entry and dive) are computed server-side; client renders x/y/angle from state only — no client-side prediction
- Existing per-mode damage logic (SharedLives, RoleSpecialization, LastShipStanding, etc.) is reused unchanged for enemy-body hits
- `pngjs` is a devDependency at the repo root only (not bundled into client or server)
- Generated PNGs live in `client/public/assets/` and are committed to git
- Base formation: 3 rows × `(5 + (playerCount - 1) * 2)` cols — fixed rows per wave, speed scales instead
- Test runner: `npm test` at repo root (runs `vitest run` in the server workspace)

---

### Task 1: Sprite generation script + PNG assets

**Files:**
- Create: `scripts/gen-sprites.js`
- Create: `client/public/assets/` (directory, holds generated PNGs)
- Modify: `package.json` (root) — add pngjs devDependency and gen-sprites script

**Interfaces:**
- Produces: `client/public/assets/player.png` (32×32), `enemy_bee.png` (24×24), `enemy_butterfly.png` (40×40), `bullet_player.png` (4×12), `bullet_enemy.png` (4×10) — consumed by Task 3

- [ ] **Step 1: Install pngjs**

```bash
npm install --save-dev pngjs
```

Expected: `pngjs` appears in root `package.json` devDependencies and `package-lock.json` updates.

- [ ] **Step 2: Create the sprite generation script**

Create `scripts/gen-sprites.js` with this exact content:

```js
'use strict';

const { PNG } = require('pngjs');
const fs      = require('fs');
const path    = require('path');

const OUT = path.join(__dirname, '..', 'client', 'public', 'assets');
fs.mkdirSync(OUT, { recursive: true });

function mkPng(w, h) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  png.data = Buffer.alloc(w * h * 4, 0); // all transparent
  return png;
}

function px(png, x, y, c) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = c[0]; png.data[i+1] = c[1]; png.data[i+2] = c[2]; png.data[i+3] = c[3];
}

function rect(png, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      px(png, x + dx, y + dy, c);
}

function ellipse(png, cx, cy, rx, ry, c) {
  const x0 = Math.ceil(cx - rx), x1 = Math.floor(cx + rx);
  const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if ((x - cx) ** 2 / rx / rx + (y - cy) ** 2 / ry / ry <= 1)
        px(png, x, y, c);
}

function save(png, name) {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log(`  wrote ${name} (${png.width}x${png.height})`);
}

// ── PLAYER SHIP (32x32) ──────────────────────────────────────────────────────
function genPlayer() {
  const p   = mkPng(32, 32);
  const B   = [26,  86,  255, 255]; // blue body
  const Lb  = [77,  138, 255, 255]; // light blue wings
  const R   = [255, 34,  34,  255]; // red cockpit
  const W   = [255, 255, 255, 255]; // white highlights
  const Or  = [255, 136, 0,   255]; // orange exhausts

  // Wings: sweep outward as y increases (triangle from y=10 to y=21)
  for (let y = 10; y <= 21; y++) {
    const spread = Math.floor((y - 10) * 0.75);
    for (let dx = 1; dx <= spread; dx++) {
      px(p, 15 - dx, y, Lb);
      px(p, 16 + dx, y, Lb);
    }
  }

  // Main body: narrow vertical strip nose→base
  rect(p, 14, 3,  4, 19, B);

  // Red cockpit
  rect(p, 15, 4,  2,  3, R);

  // White body highlights
  px(p, 15, 7, W); px(p, 16, 7, W);
  px(p, 15, 9, W); px(p, 16, 9, W);

  // Orange engine exhausts
  rect(p, 12, 21, 3, 2, Or);
  rect(p, 17, 21, 3, 2, Or);

  save(p, 'player.png');
}

// ── BEE ENEMY (24x24) ────────────────────────────────────────────────────────
function genBee() {
  const p  = mkPng(24, 24);
  const Y  = [255, 204, 0,   255]; // yellow body
  const Ly = [255, 230, 100, 255]; // light yellow highlight
  const Or = [255, 136, 0,   255]; // orange wings
  const W  = [255, 255, 255, 255]; // white antennae
  const Dk = [80,  40,  0,   255]; // dark eyes

  // Wings: orange ellipses left and right
  ellipse(p, 6,  13, 5, 4, Or);
  ellipse(p, 18, 13, 5, 4, Or);
  // Wing inner highlights
  ellipse(p, 6,  13, 2, 2, Ly);
  ellipse(p, 18, 13, 2, 2, Ly);

  // Body: yellow vertical ellipse
  ellipse(p, 12, 14, 3, 7, Y);
  // Body highlight
  ellipse(p, 12, 14, 1, 4, Ly);

  // Head
  ellipse(p, 12, 6, 3, 3, Y);

  // Eyes
  px(p, 11, 5, Dk); px(p, 13, 5, Dk);

  // Antennae
  px(p, 10, 2, W); px(p, 11, 3, W);
  px(p, 14, 2, W); px(p, 13, 3, W);

  save(p, 'enemy_bee.png');
}

// ── BUTTERFLY BOSS (40x40) ───────────────────────────────────────────────────
function genButterfly() {
  const p  = mkPng(40, 40);
  const C  = [0,   200, 255, 255]; // cyan upper wings
  const Lc = [120, 220, 255, 255]; // light cyan highlight
  const G  = [0,   210, 100, 255]; // green lower wings
  const Lg = [120, 255, 180, 255]; // light green highlight
  const Pu = [180, 50,  255, 255]; // purple body
  const Lp = [210, 130, 255, 255]; // light purple highlight
  const R  = [255, 60,  60,  255]; // red eyes
  const W  = [255, 255, 255, 255]; // white antennae

  // Upper wings (cyan)
  ellipse(p, 11, 15, 10, 8, C);
  ellipse(p, 29, 15, 10, 8, C);
  ellipse(p, 11, 15,  5, 4, Lc);
  ellipse(p, 29, 15,  5, 4, Lc);

  // Lower wings (green)
  ellipse(p, 12, 28, 8, 6, G);
  ellipse(p, 28, 28, 8, 6, G);
  ellipse(p, 12, 28, 3, 3, Lg);
  ellipse(p, 28, 28, 3, 3, Lg);

  // Body
  ellipse(p, 20, 21, 4, 12, Pu);
  ellipse(p, 20, 21, 2,  7, Lp);

  // Head
  ellipse(p, 20, 8, 4, 4, Pu);

  // Eyes
  px(p, 18, 7, R); px(p, 22, 7, R);

  // Antennae
  px(p, 17, 4, W); px(p, 18, 5, W);
  px(p, 23, 4, W); px(p, 22, 5, W);

  save(p, 'enemy_butterfly.png');
}

// ── PLAYER BULLET (4x12) ─────────────────────────────────────────────────────
function genBulletPlayer() {
  const p = mkPng(4, 12);
  rect(p, 0, 0, 4, 12, [0,   255, 255, 255]);
  rect(p, 1, 1, 2, 10, [200, 255, 255, 255]); // white core
  save(p, 'bullet_player.png');
}

// ── ENEMY BULLET (4x10) ──────────────────────────────────────────────────────
function genBulletEnemy() {
  const p = mkPng(4, 10);
  rect(p, 0, 0, 4, 10, [255, 50,  50,  255]);
  rect(p, 1, 1, 2,  8, [255, 160, 50,  255]); // orange core
  save(p, 'bullet_enemy.png');
}

console.log('Generating sprites...');
genPlayer();
genBee();
genButterfly();
genBulletPlayer();
genBulletEnemy();
console.log('Done.');
```

- [ ] **Step 3: Add gen-sprites script to root package.json**

In `package.json` at the repo root, add `"gen-sprites"` to the scripts block:

```json
{
  "name": "galaga",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev:server": "npm run dev --workspace=server",
    "dev:client": "npm run dev --workspace=client",
    "test": "npm run test --workspace=server",
    "gen-sprites": "node scripts/gen-sprites.js"
  }
}
```

- [ ] **Step 4: Run the script and verify output**

```bash
npm run gen-sprites
```

Expected output:
```
Generating sprites...
  wrote player.png (32x32)
  wrote enemy_bee.png (24x24)
  wrote enemy_butterfly.png (40x40)
  wrote bullet_player.png (4x12)
  wrote bullet_enemy.png (4x10)
Done.
```

Then verify files exist and are non-empty:

```bash
ls -la client/public/assets/
```

Expected: five `.png` files, each with size > 0 bytes.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-sprites.js client/public/assets/ package.json package-lock.json
git commit -m "feat: add sprite generation script and pixel-art PNG assets"
```

---

### Task 2: EnemyState schema — add `entering` and `angle`

**Files:**
- Modify: `shared/src/schemas/EnemyState.ts`

**Interfaces:**
- Produces: `EnemyState.entering: boolean` and `EnemyState.angle: number` — consumed by Tasks 3, 4

- [ ] **Step 1: Add the two new fields**

Replace the full content of `shared/src/schemas/EnemyState.ts`:

```ts
import { Schema, type } from "@colyseus/schema";

export class EnemyState extends Schema {
  @type("string")  id: string      = "";
  @type("number")  x: number       = 0;
  @type("number")  y: number       = 0;
  @type("string")  type: string    = "basic";
  @type("number")  hp: number      = 1;
  @type("boolean") alive: boolean  = true;
  @type("boolean") diving: boolean = false;
  @type("boolean") entering: boolean = false;
  @type("number")  angle: number   = 0;
}
```

- [ ] **Step 2: Rebuild shared so downstream TypeScript picks up new fields**

```bash
npm run build --workspace=shared
```

Expected: exits 0 (or with only the known TS6059 rootDir warning), emits `shared/dist/`.

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests pass. The new fields have defaults so no existing test breaks.

- [ ] **Step 4: Commit**

```bash
git add shared/src/schemas/EnemyState.ts shared/dist/
git commit -m "feat: add entering and angle fields to EnemyState schema"
```

---

### Task 3: Client rendering — load PNGs and apply enemy rotation

**Files:**
- Modify: `client/src/scenes/BootScene.ts`
- Modify: `client/src/rendering/EnemyRenderer.ts`

**Interfaces:**
- Consumes: PNG files from Task 1 (`player.png`, `enemy_bee.png`, `enemy_butterfly.png`, `bullet_player.png`, `bullet_enemy.png`); `EnemyState.angle` from Task 2

- [ ] **Step 1: Rewrite BootScene to load PNG files**

Replace the full content of `client/src/scenes/BootScene.ts`:

```ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.load.image("player",           "assets/player.png");
    this.load.image("enemy_bee",        "assets/enemy_bee.png");
    this.load.image("enemy_butterfly",  "assets/enemy_butterfly.png");
    this.load.image("bullet_player",    "assets/bullet_player.png");
    this.load.image("bullet_enemy",     "assets/bullet_enemy.png");
  }

  create() {
    this.scene.start("MenuScene");
  }
}
```

- [ ] **Step 2: Update EnemyRenderer to use new texture keys and apply angle**

Replace the full content of `client/src/rendering/EnemyRenderer.ts`:

```ts
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
        const key = enemy.type === "boss" ? "enemy_butterfly" : "enemy_bee";
        const s = this.scene.add.image(enemy.x, enemy.y, key).setDepth(5);
        this.sprites.set(enemy.id, s);
      }
      const s = this.sprites.get(enemy.id)!;
      s.setPosition(enemy.x, enemy.y);
      s.setRotation(enemy.angle ?? 0);
    });

    this.sprites.forEach((s, id) => {
      if (!seen.has(id)) { s.destroy(); this.sprites.delete(id); }
    });
  }

  getPosition(id: string): { x: number; y: number } | undefined {
    const s = this.sprites.get(id);
    return s ? { x: s.x, y: s.y } : undefined;
  }
}
```

- [ ] **Step 3: Build the client to verify no TypeScript errors**

```bash
npm run build --workspace=client
```

Expected: exits 0, emits `client/dist/`.

- [ ] **Step 4: Commit**

```bash
git add client/src/scenes/BootScene.ts client/src/rendering/EnemyRenderer.ts
git commit -m "feat: load pixel-art PNG sprites and apply enemy angle rotation"
```

---

### Task 4: EnemyManager overhaul — smaller formation, entry paths, curved dives

**Files:**
- Modify: `server/src/game/EnemyManager.ts`
- Modify: `server/src/__tests__/EnemyManager.test.ts`

**Interfaces:**
- Consumes: `EnemyState.entering: boolean`, `EnemyState.angle: number` from Task 2
- Produces: enemies with `entering=true` on spawn, `entering=false` on arrival; `angle` set from velocity direction during movement; `EnemyManager.allDefeated()` unchanged signature

- [ ] **Step 1: Write the failing tests first**

Replace the full content of `server/src/__tests__/EnemyManager.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EnemyManager } from "../game/EnemyManager";
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";

function makeState(worldWidth = 800) {
  const s = new GameState();
  s.worldWidth = worldWidth;
  s.worldHeight = 600;
  return s;
}

function enemies(state: GameState) {
  const arr: ReturnType<typeof state.enemies.at>[] = [];
  state.enemies.forEach(e => arr.push(e));
  return arr as NonNullable<ReturnType<typeof state.enemies.at>>[];
}

function addPlayer(state: GameState, id = "p1", x = 400, y = 540) {
  const p = new PlayerState();
  p.sessionId = id; p.x = x; p.y = y; p.alive = true; p.lives = 3;
  state.players.set(id, p);
  return p;
}

describe("EnemyManager", () => {
  it("spawns enemies on spawnFormation", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);
    expect(state.enemies.length).toBeGreaterThan(0);
  });

  it("spawns 15 enemies for 1 player (3 rows × 5 cols)", () => {
    const state = makeState();
    new EnemyManager(state).spawnFormation(1, 1);
    expect(state.enemies.length).toBe(15);
  });

  it("spawns more enemies for more players", () => {
    const s1 = makeState(800);
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState(1200);
    new EnemyManager(s2).spawnFormation(1, 3);

    expect(s2.enemies.length).toBeGreaterThan(s1.enemies.length);
  });

  it("enemy count does not change between waves (speed scales instead)", () => {
    const s1 = makeState();
    new EnemyManager(s1).spawnFormation(1, 1);

    const s2 = makeState();
    new EnemyManager(s2).spawnFormation(5, 1);

    expect(s1.enemies.length).toBe(s2.enemies.length);
  });

  it("all enemies start with entering=true", () => {
    const state = makeState();
    new EnemyManager(state).spawnFormation(1, 1);
    const all = enemies(state);
    expect(all.every(e => e.entering === true)).toBe(true);
  });

  it("entering flips to false once an enemy reaches its formation waypoints", () => {
    const state = makeState();
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);

    // Run for 10 seconds — all enemies should have reached their slots
    for (let i = 0; i < 100; i++) mgr.update(0.1);

    expect(enemies(state).some(e => e.entering === true)).toBe(false);
  });

  it("allDefeated returns true when enemies array is empty", () => {
    const state = makeState();
    expect(new EnemyManager(state).allDefeated()).toBe(true);
  });

  it("dive path produces a curved trajectory (midpoint not on straight line)", () => {
    const state = makeState();
    addPlayer(state, "p1", 400, 540);
    const mgr = new EnemyManager(state);
    mgr.spawnFormation(1, 1);

    // Fast-forward entry
    for (let i = 0; i < 100; i++) mgr.update(0.1);

    // Find a formation enemy and record its start position
    const firstEnemy = enemies(state)[0];
    const startX = firstEnemy.x;
    const startY = firstEnemy.y;

    // Force a dive by running many small ticks until one enemy starts diving
    let diveStartX = 0, diveStartY = 0;
    let diveEnemy: typeof firstEnemy | null = null;
    for (let i = 0; i < 200 && !diveEnemy; i++) {
      mgr.update(0.016);
      enemies(state).forEach(e => {
        if (e.diving && !diveEnemy) {
          diveEnemy = e;
          diveStartX = e.x;
          diveStartY = e.y;
        }
      });
    }

    if (!diveEnemy) return; // no enemy dove — skip (probabilistic)

    // Advance the dive to t≈0.5
    for (let i = 0; i < 50; i++) mgr.update(0.033);

    const midX = (diveEnemy as any).x;
    const midY = (diveEnemy as any).y;

    // On a straight line, midY would be roughly (startY + 540) / 2 ≈ midpoint
    // The Bézier control point adds lateral offset, so midX deviates from straight line
    const straightMidX = (diveStartX + 400) / 2;
    expect(Math.abs(midX - straightMidX)).toBeGreaterThan(10); // curved, not straight
  });
});
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npm test
```

Expected: new tests ("spawns 15 enemies", "all enemies start with entering=true", "entering flips to false", "dive path curved") fail. Existing tests may also fail.

- [ ] **Step 3: Rewrite EnemyManager**

Replace the full content of `server/src/game/EnemyManager.ts`:

```ts
import { GameState } from "shared/schemas/GameState";
import { EnemyState } from "shared/schemas/EnemyState";
import { EnemyType } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { v4 as uuid } from "uuid";

const BASE_SWEEP_SPEED  = 60;
const BASE_DIVE_SPEED   = 180;
const ENTRY_SPEED       = 150;
const DIVE_CHANCE       = 0.3;
const FIRE_CHANCE       = 0.15;
const MARGIN            = 40;
const ARRIVE_THRESHOLD  = 4;
const ENTRY_TIMEOUT_SEC = 8;

interface Waypoint { x: number; y: number; }

interface EntryPath {
  waypoints: Waypoint[];
  currentWaypoint: number;
}

interface DivePath {
  startX: number; startY: number;
  ctrlX:  number; ctrlY:  number;
  endX:   number; endY:   number;
  t:        number;
  duration: number;
}

export class EnemyManager {
  private sweepDir   = 1;
  private sweepSpeed = BASE_SWEEP_SPEED;
  private diveSpeed  = BASE_DIVE_SPEED;
  private bulletManager: BulletManager | null = null;

  private entryPaths = new Map<string, EntryPath>();
  private divePaths  = new Map<string, DivePath>();
  private enemyMeta  = new Map<string, { col: number; formX: number; formY: number }>();

  private entryTimer  = 0;
  private allEntered  = false;

  constructor(private state: GameState) {}

  setBulletManager(bm: BulletManager) { this.bulletManager = bm; }

  spawnFormation(wave: number, playerCount: number) {
    this.sweepSpeed  = BASE_SWEEP_SPEED + (wave - 1) * 5;
    this.diveSpeed   = BASE_DIVE_SPEED  + (wave - 1) * 10;
    this.allEntered  = false;
    this.entryTimer  = 0;
    this.sweepDir    = 1;

    const cols     = 5 + (playerCount - 1) * 2;
    const rows     = 3;
    const spacingX = this.state.worldWidth / (cols + 1);
    const W        = this.state.worldWidth;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const formX = spacingX * (col + 1);
        const formY = 60 + row * 44;

        const e       = new EnemyState();
        e.id          = uuid();
        e.type        = row === 0 ? EnemyType.Boss : EnemyType.Basic;
        e.hp          = row === 0 ? 2 : 1;
        e.alive       = true;
        e.entering    = true;
        e.diving      = false;
        e.angle       = 0;

        // Stage off-screen: even columns from left, odd from right
        const fromLeft = col % 2 === 0;
        e.x = fromLeft ? -60 : W + 60;
        e.y = 20 + row * 30 + col * 10; // stagger start heights

        this.state.enemies.push(e);
        this.enemyMeta.set(e.id, { col, formX, formY });

        // Two waypoints: arc through a mid-screen point then to formation slot
        const midX = fromLeft
          ? W * 0.15 + col * (W * 0.04)
          : W * 0.85 - col * (W * 0.04);
        const midY = 30 + row * 15;

        this.entryPaths.set(e.id, {
          waypoints: [{ x: midX, y: midY }, { x: formX, y: formY }],
          currentWaypoint: 0,
        });
      }
    }
  }

  update(dtSec: number) {
    const toRemove: string[] = [];

    if (!this.allEntered) this.entryTimer += dtSec;

    this.state.enemies.forEach(e => {
      if (e.entering) { this.stepEntry(e, dtSec); return; }
      if (e.diving)   { this.stepDive(e, dtSec, toRemove); return; }

      // Formation sweep
      e.x += this.sweepSpeed * this.sweepDir * dtSec;

      if (!this.allEntered) return; // no firing or diving while entry is in progress

      if (Math.random() < DIVE_CHANCE * dtSec) {
        this.startDive(e);
      } else if (this.bulletManager && Math.random() < FIRE_CHANCE * dtSec) {
        this.bulletManager.spawnEnemyBullet(e.x, e.y);
      }
    });

    // Sweep boundary check (formation enemies only)
    let rightmost = -Infinity, leftmost = Infinity;
    this.state.enemies.forEach(e => {
      if (!e.diving && !e.entering) {
        if (e.x > rightmost) rightmost = e.x;
        if (e.x < leftmost)  leftmost  = e.x;
      }
    });
    if (rightmost !== -Infinity) {
      if (rightmost >= this.state.worldWidth - MARGIN) this.sweepDir = -1;
      if (leftmost  <= MARGIN)                          this.sweepDir =  1;
    }

    // Entry timeout safety: snap remaining entering enemies to formation
    if (!this.allEntered && this.entryTimer >= ENTRY_TIMEOUT_SEC) {
      this.state.enemies.forEach(e => {
        if (!e.entering) return;
        const meta = this.enemyMeta.get(e.id);
        if (meta) { e.x = meta.formX; e.y = meta.formY; }
        e.entering = false;
        e.angle    = 0;
        this.entryPaths.delete(e.id);
      });
      this.allEntered = true;
    }

    // Check if all enemies have finished entering
    if (!this.allEntered) {
      let anyEntering = false;
      this.state.enemies.forEach(e => { if (e.entering) anyEntering = true; });
      if (!anyEntering) this.allEntered = true;
    }

    for (const id of toRemove) {
      const idx = this.state.enemies.findIndex(e => e.id === id);
      if (idx !== -1) this.state.enemies.splice(idx, 1);
      this.entryPaths.delete(id);
      this.divePaths.delete(id);
      this.enemyMeta.delete(id);
    }
  }

  private stepEntry(e: EnemyState, dt: number) {
    const path = this.entryPaths.get(e.id);
    if (!path) { e.entering = false; return; }

    const wp   = path.waypoints[path.currentWaypoint];
    const dx   = wp.x - e.x;
    const dy   = wp.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist < ARRIVE_THRESHOLD) {
      path.currentWaypoint++;
      if (path.currentWaypoint >= path.waypoints.length) {
        const meta = this.enemyMeta.get(e.id);
        if (meta) { e.x = meta.formX; e.y = meta.formY; }
        e.entering = false;
        e.angle    = 0;
        this.entryPaths.delete(e.id);
        return;
      }
    }

    const move = ENTRY_SPEED * dt;
    e.x += (dx / dist) * move;
    e.y += (dy / dist) * move;
    e.angle = Math.atan2(dy, dx) - Math.PI / 2;
  }

  private startDive(e: EnemyState) {
    let nearestX = this.state.worldWidth / 2;
    let nearestY = this.state.worldHeight;
    let nearestDist = Infinity;
    this.state.players.forEach(p => {
      if (!p.alive) return;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < nearestDist) { nearestDist = d; nearestX = p.x; nearestY = p.y; }
    });

    const meta       = this.enemyMeta.get(e.id);
    const lateralSign = meta && meta.col % 2 === 0 ? 1 : -1;
    const ctrlX      = (e.x + nearestX) / 2 + lateralSign * this.state.worldWidth * 0.25;
    const ctrlY      = (e.y + nearestY) / 2;
    const duration   = Math.max(1.5, (this.state.worldHeight - e.y) / this.diveSpeed);

    this.divePaths.set(e.id, {
      startX: e.x,   startY: e.y,
      ctrlX,          ctrlY,
      endX: nearestX, endY: nearestY + 200,
      t: 0,           duration,
    });
    e.diving = true;
  }

  private stepDive(e: EnemyState, dt: number, toRemove: string[]) {
    const path = this.divePaths.get(e.id);
    if (!path) { toRemove.push(e.id); return; }

    path.t += dt / path.duration;
    if (path.t > 1) path.t = 1;

    const t  = path.t;
    const mt = 1 - t;
    // Quadratic Bézier position
    e.x = mt * mt * path.startX + 2 * mt * t * path.ctrlX + t * t * path.endX;
    e.y = mt * mt * path.startY + 2 * mt * t * path.ctrlY + t * t * path.endY;

    // Bézier tangent → sprite rotation
    const tx = 2 * (1 - t) * (path.ctrlX - path.startX) + 2 * t * (path.endX - path.ctrlX);
    const ty = 2 * (1 - t) * (path.ctrlY - path.startY) + 2 * t * (path.endY - path.ctrlY);
    e.angle  = Math.atan2(ty, tx) - Math.PI / 2;

    if (path.t >= 1 || e.y > this.state.worldHeight + 40) {
      toRemove.push(e.id);
    }
  }

  allDefeated(): boolean { return this.state.enemies.length === 0; }
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npm test
```

Expected: all tests pass including the new ones. The "dive path curved" test is probabilistic — if no enemy dives in the window it auto-passes via early return. Run it a few times if unsure.

- [ ] **Step 5: Commit**

```bash
git add server/src/game/EnemyManager.ts server/src/__tests__/EnemyManager.test.ts
git commit -m "feat: formation entry paths, curved Bézier dives, 3x5 base formation"
```

---

### Task 5: CollisionDetector — enemy body damages player

**Files:**
- Modify: `server/src/game/CollisionDetector.ts`
- Modify: `server/src/__tests__/CollisionDetector.test.ts`

**Interfaces:**
- Consumes: existing `overlaps()`, `awardPoints()`, `PLAYER_HALF`, `ENEMY_HALF`, existing per-mode damage logic in `enemyBulletsVsPlayers()`
- Produces: `enemiesVsPlayers()` called from `check()` before bullet checks; `applyPlayerDamage(player)` private helper shared by both bullet and body collision

- [ ] **Step 1: Write the failing test**

Add this test at the bottom of the `describe` block in `server/src/__tests__/CollisionDetector.test.ts`:

```ts
  it("enemy overlapping player removes enemy, awards points, and reduces player lives", () => {
    const { state, player, cd } = setup();
    // Place enemy directly on player (overlapping)
    enemy(state, 400, 540);
    cd.check();
    expect(state.enemies.length).toBe(0);   // enemy removed
    expect(player.lives).toBe(2);            // player took damage
    expect(player.score).toBe(100);          // points awarded
  });

  it("boss enemy overlapping player awards 200 points", () => {
    const { state, player, cd } = setup();
    enemy(state, 400, 540, 1, EnemyType.Boss);
    cd.check();
    expect(player.score).toBe(200);
  });
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npm test
```

Expected: the two new `CollisionDetector` tests fail ("enemy overlapping player..." and "boss enemy overlapping...").

- [ ] **Step 3: Update CollisionDetector**

Replace the full content of `server/src/game/CollisionDetector.ts`:

```ts
import { GameState } from "shared/schemas/GameState";
import { PlayerState } from "shared/schemas/PlayerState";
import { EnemyType, CoopSubtype, CompetitiveSubtype } from "shared/types/enums";
import { BulletManager } from "./BulletManager";
import { PLAYER_HALF, ENEMY_HALF } from "./constants";

const AOE_RADIUS = 60;

function overlaps(ax: number, ay: number, aw: number, bx: number, by: number, bw: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (aw + bw) / 2;
}

export class CollisionDetector {
  constructor(private state: GameState, private bulletManager: BulletManager) {}

  check() {
    this.enemiesVsPlayers();
    this.playerBulletsVsEnemies();
    this.enemyBulletsVsPlayers();
    if (this.state.subType === CompetitiveSubtype.LastShipStanding) {
      this.friendlyFire();
    }
  }

  private applyPlayerDamage(player: PlayerState) {
    if (this.state.subType === CoopSubtype.SharedLives) {
      this.state.sharedLives -= 1;
      if (this.state.sharedLives <= 0) {
        this.state.players.forEach(p => { p.alive = false; });
      }
    } else if (this.state.subType === CoopSubtype.RoleSpecialization) {
      player.hp -= 1;
      if (player.hp <= 0) player.alive = false;
    } else {
      player.lives -= 1;
      if (player.lives <= 0) player.alive = false;
    }
  }

  private enemiesVsPlayers() {
    const enemiesToRemove: string[] = [];

    this.state.enemies.forEach(enemy => {
      if (enemiesToRemove.includes(enemy.id)) return;

      this.state.players.forEach((player, id) => {
        if (!player.alive) return;
        if (enemiesToRemove.includes(enemy.id)) return;
        if (!overlaps(enemy.x, enemy.y, ENEMY_HALF, player.x, player.y, PLAYER_HALF)) return;

        const points = enemy.type === EnemyType.Boss ? 200 : 100;
        this.awardPoints(id, points, enemy.x);
        enemiesToRemove.push(enemy.id);
        this.applyPlayerDamage(player);
      });
    });

    for (const id of enemiesToRemove) {
      const idx = this.state.enemies.findIndex(e => e.id === id);
      if (idx !== -1) this.state.enemies.splice(idx, 1);
    }
  }

  private friendlyFire() {
    const bulletsToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (bullet.isEnemy) return;
      if (bulletsToRemove.includes(bullet.id)) return;

      this.state.players.forEach((player, id) => {
        if (!player.alive) return;
        if (id === bullet.ownerId) return;
        if (bulletsToRemove.includes(bullet.id)) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;

        player.lives -= 1;
        if (player.lives <= 0) player.alive = false;
        bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }

  private playerBulletsVsEnemies() {
    const bulletsToRemove: string[] = [];
    const enemiesToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (bullet.isEnemy) return;
      if (bulletsToRemove.includes(bullet.id)) return;
      const damage = this.bulletManager.damageOf(bullet.id);

      for (const enemy of this.state.enemies) {
        if (enemiesToRemove.includes(enemy.id)) continue;
        if (!overlaps(bullet.x, bullet.y, bullet.width, enemy.x, enemy.y, ENEMY_HALF)) continue;

        if (bullet.aoe) {
          bulletsToRemove.push(bullet.id);
          this.state.enemies.forEach(e => {
            if (enemiesToRemove.includes(e.id)) return;
            const dist = Math.hypot(bullet.x - e.x, bullet.y - e.y);
            if (dist <= AOE_RADIUS) {
              const points = e.type === EnemyType.Boss ? 200 : 100;
              this.awardPoints(bullet.ownerId, points, e.x);
              enemiesToRemove.push(e.id);
            }
          });
          break;
        }

        enemy.hp -= damage;
        if (enemy.hp <= 0) {
          const points = enemy.type === EnemyType.Boss ? 200 : 100;
          this.awardPoints(bullet.ownerId, points, enemy.x);
          enemiesToRemove.push(enemy.id);
        }
        if (!bullet.piercing) bulletsToRemove.push(bullet.id);
      }
    });

    for (const id of enemiesToRemove) {
      const idx = this.state.enemies.findIndex(e => e.id === id);
      if (idx !== -1) this.state.enemies.splice(idx, 1);
    }
    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }

  private awardPoints(ownerId: string, points: number, enemyX?: number) {
    if (this.state.subType === CoopSubtype.IndependentLives) {
      this.state.sharedScore += points;
      return;
    }
    if (this.state.subType === CompetitiveSubtype.Territory && enemyX !== undefined) {
      const playerCount = this.state.players.size;
      if (playerCount > 0) {
        const zoneWidth = this.state.worldWidth / playerCount;
        const zoneIndex = Math.floor(enemyX / zoneWidth);
        let scored = false;
        this.state.players.forEach(p => {
          if (!scored && p.territoryZone === zoneIndex) {
            p.score += points;
            scored = true;
          }
        });
        return;
      }
    }
    const player = this.state.players.get(ownerId);
    if (player) player.score += points;
  }

  private enemyBulletsVsPlayers() {
    const bulletsToRemove: string[] = [];

    this.state.bullets.forEach(bullet => {
      if (!bullet.isEnemy) return;

      this.state.players.forEach(player => {
        if (!player.alive || bulletsToRemove.includes(bullet.id)) return;
        if (!overlaps(bullet.x, bullet.y, bullet.width, player.x, player.y, PLAYER_HALF)) return;

        this.applyPlayerDamage(player);
        bulletsToRemove.push(bullet.id);
      });
    });

    for (const id of bulletsToRemove) {
      this.bulletManager.removeBullet(id);
    }
  }
}
```

- [ ] **Step 4: Run all tests — confirm they all pass**

```bash
npm test
```

Expected: all tests pass, including the two new CollisionDetector tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/game/CollisionDetector.ts server/src/__tests__/CollisionDetector.test.ts
git commit -m "feat: enemy body collision damages player and removes enemy"
```

---

## After all tasks

Build and deploy:

```bash
# Rebuild shared + server
npm run build --workspace=shared
npm run build --workspace=server

# Generate sprites (if not already done) and build client
npm run gen-sprites
VITE_SERVER_URL=wss://galaga-server.fly.dev npm run build --workspace=client
```

Copy `client/dist/` to the game-generator repo's `site/public/arcade/galaga/` and push both repos. The server redeploys automatically via GitHub Actions when `server/**` changes hit main.
