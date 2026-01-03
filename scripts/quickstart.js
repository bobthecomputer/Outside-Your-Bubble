const { spawn, spawnSync } = require("node:child_process");
const { copyFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const repoRoot = path.resolve(__dirname, "..");
const npmCommand = "npm";

const rawArgs = process.argv.slice(2);
let skipDocker = false;
let skipDb = false;
let skipSeed = false;
let skipPreview = false;
let skipInstall = false;
let showHelp = false;
const previewArgs = [];

for (const arg of rawArgs) {
  if (arg === "--skip-docker" || arg === "--no-docker") {
    skipDocker = true;
  } else if (arg === "--skip-db") {
    skipDb = true;
  } else if (arg === "--skip-seed") {
    skipSeed = true;
  } else if (arg === "--skip-preview" || arg === "--no-preview") {
    skipPreview = true;
  } else if (arg === "--skip-install") {
    skipInstall = true;
  } else if (arg === "--help" || arg === "-h") {
    showHelp = true;
  } else {
    previewArgs.push(arg);
  }
}

if (skipDb) {
  skipSeed = true;
}

function canRun(command, args) {
  try {
    const useCmd = process.platform === "win32";
    const result = spawnSync(useCmd ? "cmd.exe" : command, useCmd ? ["/d", "/s", "/c", command, ...args] : args, {
      stdio: "ignore",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolveComposeCommand() {
  if (canRun("docker", ["compose", "version"])) {
    return { command: "docker", prefix: ["compose"] };
  }
  if (canRun("docker-compose", ["version"])) {
    return { command: "docker-compose", prefix: [] };
  }
  return null;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const useCmd = process.platform === "win32";
    const child = spawn(useCmd ? "cmd.exe" : command, useCmd ? ["/d", "/s", "/c", command, ...args] : args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? "unknown"}`));
      }
    });
  });
}

function ensureEnvFile() {
  const envExample = path.join(repoRoot, ".env.example");
  const envLocal = path.join(repoRoot, ".env.local");
  const envDefault = path.join(repoRoot, ".env");

  if (existsSync(envDefault)) {
    console.log("[quickstart] Existing .env file found.");
    return;
  }

  if (existsSync(envLocal)) {
    copyFileSync(envLocal, envDefault);
    console.log("[quickstart] Created .env from .env.local.");
    return;
  }

  if (existsSync(envExample)) {
    copyFileSync(envExample, envDefault);
    if (!existsSync(envLocal)) {
      copyFileSync(envExample, envLocal);
    }
    console.log("[quickstart] Created .env (and .env.local) from .env.example.");
    return;
  }

  console.log("[quickstart] No .env file created (missing .env.example).");
}

function shouldInstallDeps() {
  if (skipInstall) {
    return false;
  }
  const nodeModules = path.join(repoRoot, "node_modules");
  if (!existsSync(nodeModules)) {
    return true;
  }
  const binName = process.platform === "win32" ? "next.cmd" : "next";
  const nextBin = path.join(nodeModules, ".bin", binName);
  return !existsSync(nextBin);
}

function printHelp() {
  console.log(`
Usage: npm run quickstart -- [options] [preview-args]

Options:
  --skip-install  Skip npm install when dependencies are missing
  --skip-docker   Skip Docker Compose startup
  --skip-db       Skip Prisma generate/migrate/seed
  --skip-seed     Skip Prisma seed step
  --skip-preview  Skip starting npm run preview

Any additional arguments are forwarded to npm run preview.
Example:
  npm run quickstart -- --hostname 0.0.0.0 --port 3000
`);
}

async function main() {
  if (showHelp) {
    printHelp();
    return;
  }

  ensureEnvFile();

  if (shouldInstallDeps()) {
    console.log("[quickstart] Installing dependencies...");
    await runCommand(npmCommand, ["install"]);
  }

  if (!skipDocker) {
    const compose = resolveComposeCommand();
    if (!compose) {
      console.log("[quickstart] Docker Compose not available; skipping services.");
    } else {
      console.log("[quickstart] Starting Docker services (postgres, redis, mailhog)...");
      await runCommand(compose.command, [...compose.prefix, "up", "-d", "postgres", "redis", "mailhog"]);
    }
  }

  if (!skipDb) {
    console.log("[quickstart] Generating Prisma client...");
    await runCommand(npmCommand, ["run", "prisma:generate"]);
    console.log("[quickstart] Applying Prisma migrations...");
    await runCommand(npmCommand, ["run", "prisma:deploy"]);
    if (!skipSeed) {
      console.log("[quickstart] Seeding database...");
      await runCommand(npmCommand, ["run", "prisma:seed"]);
    }
  }

  if (!skipPreview) {
    console.log("[quickstart] Starting preview...");
    const commandArgs = ["run", "preview"];
    if (previewArgs.length > 0) {
      commandArgs.push("--", ...previewArgs);
    }
    await runCommand(npmCommand, commandArgs);
  } else {
    console.log("[quickstart] Done. Run npm run preview to start the app.");
  }
}

main().catch((error) => {
  console.error(`[quickstart] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
