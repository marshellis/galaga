/**
 * Multiplayer smoke tests.
 * Run: cd e2e && npm test
 * With servers already running: npx playwright test --reporter=list
 *
 * Requires:
 *   Server: npm run dev:server  (localhost:2567)
 *   Client: VITE_SERVER_URL=ws://localhost:2567 npm run dev:client  (localhost:3000)
 */
import { test, expect, chromium, BrowserContext, Page } from "@playwright/test";
import {
  openGame, createRoom, joinRoom, startGame, leaveRoom,
  getRoomCode, activeScene, roomPhase, playerCount, sessionId, hostId,
  waitUntil,
} from "../helpers";

let browser: Awaited<ReturnType<typeof chromium.launch>>;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

test.afterAll(async () => {
  await browser?.close();
});

async function freshPage(): Promise<{ page: Page; ctx: BrowserContext }> {
  const ctx = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await ctx.newPage();
  return { page, ctx };
}

// ---------------------------------------------------------------------------
// 1. Two players join the same lobby
// ---------------------------------------------------------------------------
test("two players can join the same lobby", async () => {
  const { page: p1, ctx: c1 } = await freshPage();
  const { page: p2, ctx: c2 } = await freshPage();
  try {
    await openGame(p1);
    await createRoom(p1);
    const code = await getRoomCode(p1);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    await openGame(p2);
    await joinRoom(p2, code);

    await waitUntil(async () => (await playerCount(p1)) === 2, "p1 sees 2 players");
    await waitUntil(async () => (await playerCount(p2)) === 2, "p2 sees 2 players");

    expect(await activeScene(p1)).toBe("LobbyScene");
    expect(await activeScene(p2)).toBe("LobbyScene");
  } finally {
    await c1.close();
    await c2.close();
  }
});

// ---------------------------------------------------------------------------
// 2. Host starts game, both players enter GameScene
// ---------------------------------------------------------------------------
test("host starts game and both players reach GameScene", async () => {
  const { page: p1, ctx: c1 } = await freshPage();
  const { page: p2, ctx: c2 } = await freshPage();
  try {
    await openGame(p1);
    await createRoom(p1);
    const code = await getRoomCode(p1);

    await openGame(p2);
    await joinRoom(p2, code);
    await waitUntil(async () => (await playerCount(p1)) === 2, "2 players in lobby");

    await startGame(p1);  // host starts

    await waitUntil(
      async () => (await activeScene(p2)) === "GameScene",
      "p2 reaches GameScene",
    );

    expect(await activeScene(p1)).toBe("GameScene");
    expect(await activeScene(p2)).toBe("GameScene");
    expect(await roomPhase(p1)).toBe("playing");
    expect(await roomPhase(p2)).toBe("playing");
  } finally {
    await c1.close();
    await c2.close();
  }
});

// ---------------------------------------------------------------------------
// 3. Host migration: host disconnects, other player becomes host
// ---------------------------------------------------------------------------
test("host migration when original host disconnects", async () => {
  const { page: p1, ctx: c1 } = await freshPage();
  const { page: p2, ctx: c2 } = await freshPage();
  try {
    await openGame(p1);
    await createRoom(p1);
    const code = await getRoomCode(p1);
    const p1Session = await sessionId(p1);

    await openGame(p2);
    await joinRoom(p2, code);
    await waitUntil(async () => (await playerCount(p1)) === 2, "2 players");

    // Confirm p1 is host
    expect(await hostId(p1)).toBe(p1Session);

    // p1 (host) leaves
    await c1.close();

    // p2 should now be sole player and host
    await waitUntil(async () => (await playerCount(p2)) === 1, "p2 alone in room");

    const p2Session = await sessionId(p2);
    await waitUntil(
      async () => (await hostId(p2)) === p2Session,
      "p2 is now host",
    );

    expect(await activeScene(p2)).toBe("LobbyScene");
  } finally {
    await c2.close();
  }
});

// ---------------------------------------------------------------------------
// 4. Non-host cannot start the game
// ---------------------------------------------------------------------------
test("non-host cannot start the game", async () => {
  const { page: p1, ctx: c1 } = await freshPage();
  const { page: p2, ctx: c2 } = await freshPage();
  try {
    await openGame(p1);
    await createRoom(p1);
    const code = await getRoomCode(p1);

    await openGame(p2);
    await joinRoom(p2, code);
    await waitUntil(async () => (await playerCount(p1)) === 2, "2 players");

    // p2 (non-host) tries to start — should be silently rejected
    await p2.evaluate(() => (window as any).__galaga.startGame());
    await p2.waitForTimeout(1500);

    // Both still in lobby
    expect(await activeScene(p1)).toBe("LobbyScene");
    expect(await activeScene(p2)).toBe("LobbyScene");
    expect(await roomPhase(p1)).toBe("lobby");
  } finally {
    await c1.close();
    await c2.close();
  }
});

// ---------------------------------------------------------------------------
// 5. Room rejects a 9th player (maxClients = 8)
// ---------------------------------------------------------------------------
test("room rejects a 9th player", async () => {
  const pages: { page: Page; ctx: BrowserContext }[] = [];
  try {
    const host = await freshPage();
    pages.push(host);
    await openGame(host.page);
    await createRoom(host.page);
    const code = await getRoomCode(host.page);

    // Fill to 8
    for (let i = 1; i < 8; i++) {
      const p = await freshPage();
      pages.push(p);
      await openGame(p.page);
      await joinRoom(p.page, code);
    }
    await waitUntil(
      async () => (await playerCount(host.page)) === 8,
      "room at capacity (8)",
    );

    // 9th player — join should throw
    const p9 = await freshPage();
    pages.push(p9);
    await openGame(p9.page);
    const error = await p9.page
      .evaluate((c) => (window as any).__galaga.joinRoom(c).then(() => null).catch((e: Error) => e.message), code)
      .catch((e) => String(e));

    // Room should still have 8 players
    expect(await playerCount(host.page)).toBe(8);
    // p9 should still be in MenuScene
    expect(await activeScene(p9.page)).toBe("MenuScene");
  } finally {
    for (const { ctx } of pages) await ctx.close().catch(() => {});
  }
});
