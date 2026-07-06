import { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// State readers — all go through window.__galaga set up in main.ts
// ---------------------------------------------------------------------------

export const activeScene = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.activeScene() ?? null);

export const roomCode = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.roomCode() ?? null);

export const roomPhase = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.roomPhase() ?? null);

export const playerCount = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.playerCount() ?? 0);

export const sessionId = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.sessionId() ?? null);

export const hostId = (p: Page) =>
  p.evaluate(() => (window as any).__galaga?.hostId() ?? null);

// ---------------------------------------------------------------------------
// Poll helper
// ---------------------------------------------------------------------------
export async function waitUntil(
  fn: () => Promise<boolean>,
  label: string,
  timeoutMs = 15_000,
  intervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout (${timeoutMs}ms) waiting for: ${label}`);
}

// ---------------------------------------------------------------------------
// Page lifecycle
// ---------------------------------------------------------------------------

/** Navigate to the game and wait for MenuScene */
export async function openGame(page: Page) {
  await page.goto("/");
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await waitUntil(
    async () => (await activeScene(page)) === "MenuScene",
    "MenuScene active",
  );
}

// ---------------------------------------------------------------------------
// Game actions — call window.__galaga directly, bypassing keyboard UI
// ---------------------------------------------------------------------------

export async function createRoom(
  page: Page,
  mode = "cooperative",
  subType = "shared_lives",
) {
  await page.evaluate(
    ([m, s]) => (window as any).__galaga.createRoom(m, s),
    [mode, subType] as [string, string],
  );
  await waitUntil(
    async () => (await activeScene(page)) === "LobbyScene",
    "LobbyScene after createRoom",
  );
}

export async function joinRoom(page: Page, code: string) {
  await page.evaluate((c) => (window as any).__galaga.joinRoom(c), code);
  await waitUntil(
    async () => (await activeScene(page)) === "LobbyScene",
    "LobbyScene after joinRoom",
  );
}

export async function startGame(page: Page) {
  await page.evaluate(() => (window as any).__galaga.startGame());
  await waitUntil(
    async () => (await activeScene(page)) === "GameScene",
    "GameScene after startGame",
  );
}

export async function leaveRoom(page: Page) {
  await page.evaluate(() => (window as any).__galaga.leave());
  await waitUntil(
    async () => (await activeScene(page)) === "MenuScene",
    "MenuScene after leave",
  );
}

/** Get the room code from page, waiting until it's populated */
export async function getRoomCode(page: Page): Promise<string> {
  let code: string | null = null;
  await waitUntil(async () => {
    code = await roomCode(page);
    return code !== null && code.length === 6;
  }, "room code populated");
  return code!;
}
