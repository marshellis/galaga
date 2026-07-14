# Galaga Graphics, Movement & Collision Design

## Goal

Replace placeholder shapes with pixel-art PNG sprites, make enemy movement feel like the real arcade game (formation fly-in + curved dive attacks), reduce enemy count, and add enemy body → player collision damage.

## Architecture

Three independent but visually unified changes: (1) swap programmatic texture generation for PNG sprites loaded from disk, (2) overhaul server-side `EnemyManager` to drive formation-entry paths and curved dive arcs, (3) add an `enemiesVsPlayers` collision pass to `CollisionDetector`. `EnemyState` gains two new synced fields (`entering`, `angle`) to support the new movement.

## Tech Stack

- `pngjs` — Node.js PNG write for sprite generation script
- Phaser 3 — `this.load.image()` replaces `generateTexture()`
- Existing Colyseus shared state — `EnemyState` schema extended

---

## Global Constraints

- All game logic (positions, collision, damage) remains server-authoritative
- Client renders whatever x/y/angle the server sends — no client-side position prediction
- Existing per-mode damage logic (`SharedLives`, `RoleSpecialization`, `LastShipStanding`, etc.) is reused unchanged for enemy-body hits
- `pngjs` must be added as a devDependency (script only, not bundled)
- Generated PNGs live in `client/public/assets/` and are committed to git
- No new npm packages added to `client` or `server` bundles

---

## Section 1 — Sprite Generation

### Script: `scripts/gen-sprites.js`

Node.js script (CommonJS). Imports `pngjs`. Defines each sprite as a 2D array of hex color strings (`"#rrggbb"` or `"transparent"`). Writes PNGs to `client/public/assets/`.

**Sprites produced:**

| File | Size | Description |
|---|---|---|
| `player.png` | 32×32 | Blue fighter with red cockpit, pointed nose, swept wings |
| `enemy_bee.png` | 24×24 | Yellow/orange insect with wings (was "basic") |
| `enemy_butterfly.png` | 40×40 | Blue/green winged alien (was "boss") |
| `bullet_player.png` | 4×12 | Cyan laser bolt |
| `bullet_enemy.png` | 4×10 | Red enemy bullet |

Script is run once (`node scripts/gen-sprites.js`) and output is committed. No build-time dependency.

### BootScene changes

Remove all `g.generateTexture()` calls for the five sprites above. Add `this.load.image()` calls pointing to `/assets/<sprite>.png`. Keep `generateTexture` only for any textures not replaced by PNGs (none remain after this change — `g.destroy()` call removed too).

---

## Section 2 — Enemy Count + Movement

### Formation size

`EnemyManager.spawnFormation` base formation: **3 rows × 5 cols** (was 4 rows × 8+ cols).

```
cols = 5 + (playerCount - 1) * 2   // 1p=5, 2p=7, 3p=9
rows = 3                             // fixed, not wave-scaled
```

Row 0 = butterfly (boss type, hp 2). Rows 1–2 = bee (basic type, hp 1).

Wave progression: increase enemy speed rather than row count (SWEEP_SPEED scales +5 px/s per wave, DIVE_SPEED scales +10 px/s per wave).

### EnemyState schema additions

```ts
@type("boolean") entering: boolean = false;
@type("number")  angle: number = 0;        // radians, 0 = pointing up
```

### Formation entry (server-side)

On `spawnFormation`, enemies are divided into two groups (left-entry, right-entry). Each enemy is assigned a **staging position** off-screen and a sequence of **3 waypoints** leading to its formation slot. Waypoints are stored privately in `EnemyManager` as `Map<id, EntryPath>` — not synced.

```ts
interface EntryPath {
  waypoints: Array<{ x: number; y: number }>;
  currentWaypoint: number;
  speed: number;   // 150 px/s
}
```

Left-group enemies stage at `x = -60`, spread vertically. Right-group at `x = worldWidth + 60`. Each enemy's waypoints arc inward and down to its formation slot (control point roughly 1/3 of the way in at a perpendicular offset so the path curves rather than being straight).

Each tick while `entering`:
- Move toward current waypoint at `entryPath.speed * dt`
- When within 4px of waypoint, advance to next
- When all waypoints reached: `entering = false`, snap to exact formation x/y, add to sweeping formation
- `angle` is set each tick to `Math.atan2(dy, dx) - Math.PI / 2` (pointing in direction of travel)

Enemies do not fire while entering. Formation sweep begins only once all enemies have finished entering (or after a 4-second timeout as a safety).

### Curved dives (server-side)

When an enemy transitions to `diving = true`:
1. Find the nearest alive player — record `targetX, targetY` (locked at dive start)
2. Compute a **quadratic Bézier** control point: midpoint between enemy and target, offset laterally by `±(worldWidth * 0.25)` (sign = `col % 2 === 0 ? +1 : -1` based on the enemy's original formation column, so adjacent enemies swoop from opposite sides)
3. Store privately in `EnemyManager` as `Map<id, DivePath>`

```ts
interface DivePath {
  startX: number; startY: number;
  ctrlX: number;  ctrlY: number;
  endX: number;   endY: number;
  t: number;      // 0→1 progress
  duration: number; // seconds to complete arc (worldHeight / DIVE_SPEED)
}
```

Each tick while `diving`:
- Advance `t += dt / duration`
- Compute Bézier position: `B(t) = (1-t)²·start + 2(1-t)t·ctrl + t²·end`
- Derive `angle` from tangent: `atan2(dy/dt, dx/dt)`
- When `t >= 1` or `y > worldHeight + 40`: remove enemy (no score awarded for off-screen exit)

DIVE_CHANCE remains 0.3 per-second probability per formation enemy. Only non-entering formation enemies can start a dive.

---

## Section 3 — Enemy Body Collision

New private method `CollisionDetector.enemiesVsPlayers()` called from `check()` before the existing bullet checks.

```ts
private enemiesVsPlayers() {
  const enemiesToRemove: string[] = [];

  this.state.enemies.forEach(enemy => {
    this.state.players.forEach((player, id) => {
      if (!player.alive) return;
      if (enemiesToRemove.includes(enemy.id)) return;
      if (!overlaps(enemy.x, enemy.y, ENEMY_HALF, player.x, player.y, PLAYER_HALF)) return;

      // award points for the body kill
      const points = enemy.type === EnemyType.Boss ? 200 : 100;
      this.awardPoints(id, points, enemy.x);
      enemiesToRemove.push(enemy.id);

      // damage player via existing per-mode logic (same as enemyBulletsVsPlayers)
      this.applyPlayerDamage(player);
    });
  });

  for (const id of enemiesToRemove) {
    const idx = this.state.enemies.findIndex(e => e.id === id);
    if (idx !== -1) this.state.enemies.splice(idx, 1);
  }
}
```

`applyPlayerDamage(player)` extracts the shared damage logic currently duplicated in `enemyBulletsVsPlayers` so both methods use a single implementation.

---

## Client-Side Rendering Changes

### EnemyRenderer

Apply `enemy.angle` as sprite rotation:
```ts
sprite.setRotation(enemy.angle);
```

Use texture key based on `enemy.type`:
- `"bee"` (basic) → `"enemy_bee"`
- `"boss"` → `"enemy_butterfly"`

### PlayerRenderer

No logic change. Texture key switches from `"player"` (generated) to `"player"` (loaded PNG — same key name, different source).

---

## Testing

Existing server tests (`EnemyManager.test.ts`, `CollisionDetector.test.ts`) must be updated:

- `EnemyManager.test.ts`: formation is now 3×5 base; enemies spawn with `entering=true`; add test that `entering` flips to `false` once waypoints are complete; add test that dive paths produce curved positions (B(0.5) is not on the straight line between start and end)
- `CollisionDetector.test.ts`: add test that a diving enemy overlapping a player removes the enemy and reduces player lives

Sprite generation script is verified by checking that output files exist and have non-zero size after running.
