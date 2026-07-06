import { spawn, ChildProcess } from "child_process";
import path from "path";

declare global {
  var __serverProc: ChildProcess;
  var __clientProc: ChildProcess;
}

function waitForUrl(url: string, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () =>
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Timeout waiting for ${url}`));
          else setTimeout(check, 500);
        });
    check();
  });
}

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..");

  // Start Colyseus server
  const server = spawn("npm", ["run", "dev:server"], {
    cwd: root,
    shell: true,
    stdio: "pipe",
    env: { ...process.env, PORT: "2567" },
  });
  global.__serverProc = server;
  server.stderr?.on("data", (d) => process.stdout.write(`[server] ${d}`));

  // Start Vite dev client
  const client = spawn("npm", ["run", "dev:client"], {
    cwd: root,
    shell: true,
    stdio: "pipe",
    env: { ...process.env, VITE_SERVER_URL: "ws://localhost:2567" },
  });
  global.__clientProc = client;
  client.stderr?.on("data", (d) => process.stdout.write(`[client] ${d}`));

  // Wait for both to be ready
  await Promise.all([
    waitForUrl("http://localhost:2567/health"),
    waitForUrl("http://localhost:3000"),
  ]);

  console.log("✓ Server and client ready");
}
