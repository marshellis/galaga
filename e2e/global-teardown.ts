export default async function globalTeardown() {
  global.__serverProc?.kill();
  global.__clientProc?.kill();
}
