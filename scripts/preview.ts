import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import chokidar from "chokidar";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const repoRoot = path.resolve(__dirname, "..");

function runIngest() {
  const child = spawn(npmCommand, ["run", "ingest:sample"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  return child;
}

const extraArgs = process.argv.slice(2);
const devArgs = ["run", "dev"];
if (extraArgs.length > 0) {
  devArgs.push("--", ...extraArgs);
}

const devServer = spawn(npmCommand, devArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

let ingestProcess = runIngest();
let ingestTimer: NodeJS.Timeout | undefined;

const watcher = chokidar.watch(
  ["src", "prisma", "scripts", "package.json", "tsconfig.json"].map((entry) =>
    path.join(repoRoot, entry),
  ),
  { ignoreInitial: true },
);

watcher.on("all", (event, changedPath) => {
  if (ingestTimer) {
    clearTimeout(ingestTimer);
  }
  ingestTimer = setTimeout(() => {
    if (ingestProcess && !ingestProcess.killed) {
      ingestProcess.kill("SIGTERM");
    }
    console.log(`\n[preview] Change detected (${event} ${changedPath}). Refreshing sample data...`);
    ingestProcess = runIngest();
  }, 500);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`\n[preview] Caught ${signal}, shutting down preview.`);
  watcher.close().catch(() => undefined);
  if (ingestTimer) {
    clearTimeout(ingestTimer);
  }
  if (ingestProcess && !ingestProcess.killed) {
    ingestProcess.kill("SIGTERM");
  }
  if (!devServer.killed) {
    devServer.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

devServer.on("exit", (code) => {
  console.log(`[preview] Next.js dev server exited with code ${code ?? "unknown"}.`);
  shutdown("SIGTERM");
});
