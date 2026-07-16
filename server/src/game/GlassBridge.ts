// Shared glass-bridge state for the public lobby. The server is the only holder
// of the truth about which panel is safe — clients are told a row's layout only
// once it has been revealed (someone landed on it or broke it), so reading
// network traffic can't spoil unrevealed rows.

export interface BridgeRow {
  safe: 0 | 1;
  broken: boolean;
  proven: boolean;
}

export interface RevealedRow {
  row: number;
  safe: 0 | 1;
  broken: boolean;
  proven: boolean;
}

export type LandOutcome = {
  ok: boolean;
  /** first safe landing on this row */
  provedNow: boolean;
  /** this attempt shattered the fake panel (it was intact before) */
  brokeNow: boolean;
};

export const MAX_ROW = 5000;

export class GlassBridge {
  private rows: BridgeRow[] = [];

  constructor(private rng: () => number = Math.random) {}

  ensureRows(n: number): void {
    const target = Math.min(n, MAX_ROW);
    while (this.rows.length < target) {
      this.rows.push({ safe: this.rng() < 0.5 ? 0 : 1, broken: false, proven: false });
    }
  }

  get length(): number {
    return this.rows.length;
  }

  /** Everything clients are allowed to know: only rows already revealed. */
  revealed(): RevealedRow[] {
    const out: RevealedRow[] = [];
    this.rows.forEach((r, i) => {
      if (r.broken || r.proven) {
        out.push({ row: i + 1, safe: r.safe, broken: r.broken, proven: r.proven });
      }
    });
    return out;
  }

  /**
   * Resolve a landing on `side` of `row`. Marks the row proven (safe hit) or
   * broken (fake hit). Returns null for out-of-range input.
   */
  land(row: number, side: number): LandOutcome | null {
    if (!Number.isInteger(row) || row < 1 || row > MAX_ROW) return null;
    if (side !== 0 && side !== 1) return null;
    this.ensureRows(row + 40);
    const r = this.rows[row - 1];
    const ok = side === r.safe;
    const provedNow = ok && !r.proven;
    const brokeNow = !ok && !r.broken;
    if (ok) r.proven = true;
    else r.broken = true;
    return { ok, provedNow, brokeNow };
  }
}
