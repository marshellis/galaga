import { test, chromium } from "@playwright/test";

async function openAndWaitForMenu(page: any) {
  await page.goto("/");
  await page.waitForSelector("canvas", { timeout: 15_000 });
  await page.click("canvas", { force: true });
  // Wait until __galaga is available and scene is MenuScene
  for (let i = 0; i < 40; i++) {
    const scene = await page.evaluate(() => (window as any).__galaga?.activeScene());
    if (scene === "MenuScene") break;
    await page.waitForTimeout(250);
  }
}

test("direct __galaga.createRoom works", async () => {
  const browser2 = await chromium.launch({ headless: true });
  const ctx = await browser2.newContext({ baseURL: "http://localhost:3000" });
  const page = await ctx.newPage();
  page.on("console", m => console.log(`[${m.type()}]`, m.text()));
  page.on("pageerror", e => console.log("[pageerror]", e.message));

  await page.goto("/");
  await page.waitForSelector("canvas", { timeout: 15_000 });
  for (let i = 0; i < 40; i++) {
    const scene = await page.evaluate(() => (window as any).__galaga?.activeScene());
    if (scene === "MenuScene") break;
    await page.waitForTimeout(250);
  }
  console.log("at MenuScene, __galaga:", await page.evaluate(() => typeof (window as any).__galaga));
  console.log("createRoom fn type:", await page.evaluate(() => typeof (window as any).__galaga?.createRoom));

  // Call createRoom and capture result or error
  const result = await page.evaluate(async () => {
    try {
      await (window as any).__galaga.createRoom("cooperative", "shared_lives");
      return { ok: true, scene: (window as any).__galaga.activeScene() };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  });
  console.log("createRoom result:", result);

  // Poll scene
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => (window as any).__galaga?.activeScene());
    console.log(`scene poll ${i}: ${s}`);
    if (s === "LobbyScene") break;
    await page.waitForTimeout(300);
  }

  await ctx.close();
  await browser2.close();
});

test("two-page join flow", async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx1 = await browser.newContext({ baseURL: "http://localhost:3000" });
  const ctx2 = await browser.newContext({ baseURL: "http://localhost:3000" });
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();
  p2.on("console", m => { if (m.type() !== "warning") console.log(`[p2 ${m.type()}]`, m.text()); });

  // P1 creates a room
  await openAndWaitForMenu(p1);
  console.log("p1 at MenuScene");
  await p1.keyboard.press("c");
  await p1.waitForTimeout(300);
  await p1.keyboard.press("Enter");
  await p1.waitForTimeout(3000);
  const p1Scene = await p1.evaluate(() => (window as any).__galaga?.activeScene());
  const code = await p1.evaluate(() => (window as any).__galaga?.roomCode());
  console.log("p1 scene:", p1Scene, "code:", code);

  // P2 opens and joins
  await openAndWaitForMenu(p2);
  console.log("p2 at MenuScene, joining code:", code);
  // Try dispatching directly to window (Phaser listens on window)
  const dispatch = (page: any, key: string) =>
    page.evaluate((k: string) => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
    }, key);

  await dispatch(p2, "j");
  await p2.waitForTimeout(500); // let join UI render

  for (const ch of code) {
    await dispatch(p2, ch);
    await p2.waitForTimeout(150);
    const scene = await p2.evaluate(() => (window as any).__galaga?.activeScene());
    console.log(`  typed '${ch}', p2 scene: ${scene}`);
  }

  // Wait up to 8s for LobbyScene
  let p2Scene = null;
  for (let i = 0; i < 40; i++) {
    p2Scene = await p2.evaluate(() => (window as any).__galaga?.activeScene());
    console.log(`  p2 scene poll ${i}: ${p2Scene}`);
    if (p2Scene === "LobbyScene") break;
    await p2.waitForTimeout(200);
  }

  console.log("final p2 scene:", p2Scene);
  console.log("p2 player count:", await p2.evaluate(() => (window as any).__galaga?.playerCount()));

  await ctx1.close();
  await ctx2.close();
  await browser.close();
});
