import { describe, it, expect } from "vitest";
import { GlassBridge, MAX_ROW } from "../game/GlassBridge";

// deterministic rng: alternating safe sides 0,1,0,1,…
function altRng() {
  let i = 0;
  return () => (i++ % 2 === 0 ? 0.25 : 0.75);
}

describe("GlassBridge", () => {
  it("generates rows once and never swaps the safe side", () => {
    const b = new GlassBridge(altRng());
    b.ensureRows(10);
    const first = b.revealed(); // nothing revealed yet
    expect(first).toEqual([]);
    expect(b.land(1, 0)?.ok).toBe(true); // row 1 safe side is 0 with altRng
    expect(b.land(1, 0)?.ok).toBe(true); // resolving again gives the same answer
    expect(b.land(1, 1)?.ok).toBe(false);
  });

  it("reveals only rows that were landed on or broken", () => {
    const b = new GlassBridge(altRng());
    b.ensureRows(10);
    b.land(1, 0); // safe → proven
    b.land(3, 0); // fake for row 3? altRng row3 safe=0 → ok. use row 2 for a break
    b.land(2, 0); // row 2 safe=1 → break
    const revealed = b.revealed();
    expect(revealed.map(r => r.row)).toEqual([1, 2, 3]);
    expect(revealed.find(r => r.row === 1)).toMatchObject({ safe: 0, proven: true, broken: false });
    expect(revealed.find(r => r.row === 2)).toMatchObject({ safe: 1, broken: true });
    // unrevealed rows never leak
    expect(revealed.find(r => r.row === 4)).toBeUndefined();
  });

  it("flags the first safe landing and the first break exactly once", () => {
    const b = new GlassBridge(altRng());
    expect(b.land(5, 0)?.provedNow).toBe(true);   // row 5 safe=0
    expect(b.land(5, 0)?.provedNow).toBe(false);  // second landing: not news
    expect(b.land(6, 0)?.brokeNow).toBe(true);    // row 6 safe=1 → shatter
    expect(b.land(6, 0)?.brokeNow).toBe(false);   // hole already there
  });

  it("breaking the fake side of an already-proven row still reports the break", () => {
    const b = new GlassBridge(altRng());
    expect(b.land(1, 0)?.provedNow).toBe(true);  // row 1 proven safe on side 0
    const later = b.land(1, 1);                  // someone hits the intact fake side
    expect(later).toMatchObject({ ok: false, brokeNow: true });
  });

  it("a broken row stays broken and a proven row stays proven", () => {
    const b = new GlassBridge(altRng());
    b.land(2, 0); // break (safe=1)
    b.land(2, 1); // then someone lands the safe side
    const r2 = b.revealed().find(r => r.row === 2);
    expect(r2).toMatchObject({ broken: true, proven: true });
  });

  it("rejects garbage input", () => {
    const b = new GlassBridge();
    expect(b.land(0, 0)).toBeNull();
    expect(b.land(-3, 1)).toBeNull();
    expect(b.land(1.5, 0)).toBeNull();
    expect(b.land(1, 2)).toBeNull();
    expect(b.land(MAX_ROW + 1, 0)).toBeNull();
  });

  it("grows on demand ahead of the landing row and caps at MAX_ROW", () => {
    const b = new GlassBridge();
    b.land(100, 0);
    expect(b.length).toBe(140);
    b.ensureRows(MAX_ROW + 500);
    expect(b.length).toBe(MAX_ROW);
  });
});
