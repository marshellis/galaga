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

  removeEnemy(id: string) {
    const idx = this.state.enemies.findIndex(e => e.id === id);
    if (idx !== -1) this.state.enemies.splice(idx, 1);
    this.entryPaths.delete(id);
    this.divePaths.delete(id);
    this.enemyMeta.delete(id);
  }

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
      return;
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
