import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

type ComposeCommand = {
  command: string;
  prefix: string[];
};

const repoRoot = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const rawArgs = process.argv.slice(2);
let skipDocker = false;
let skipDb = false;
let skipSeed = false;
let skipPreview = false;
let showHelp = false;
const previewArgs: string[] = [];

for (const arg of rawArgs) {
  if (arg === "--skip-docker" || arg === "--no-docker") {
    skipDocker = true;
  } else if (arg === "--skip-db") {
    skipDb = true;
  } else if (arg === "--skip-seed") {
    skipSeed = true;
  } else if (arg === "--skip-preview" || arg === "--no-preview") {
    skipPreview = true;
  } else if (arg === "--help" || arg === "-h") {
    showHelp = true;
  } else {
    previewArgs.push(arg);
  }
}

if (skipDb) {
  skipSeed = true;
}

function canRun(command: string, args: string[]) {
  try {
    const result = spawnSync(command, args, { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolveComposeCommand(): ComposeCommand | null {
  if (canRun("docker", ["compose", "version"])) {
    return { command: "docker", prefix: ["compose"] };
  }
  if (canRun("docker-compose", ["version"])) {
    return { command: "docker-compose", prefix: [] };
  }
  return null;
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
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

  if (existsSync(envLocal) || existsSync(envDefault)) {
    console.log("[quickstart] Existing .env file found.");
    return;
  }

  if (existsSync(envExample)) {
    copyFileSync(envExample, envLocal);
    console.log("[quickstart] Created .env.local from .env.example.");
    return;
  }

  console.log("[quickstart] No .env file created (missing .env.example).");
}

function printHelp() {
  console.log(`
Usage: npm run quickstart -- [options] [preview-args]

Options:
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
    console.log("[quickstart] Running Prisma migrations...");
    await runCommand(npmCommand, ["run", "prisma:migrate"]);
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
