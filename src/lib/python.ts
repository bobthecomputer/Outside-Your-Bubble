import { spawn } from "node:child_process";

export type PythonTool = "random-subject" | "study-suggest" | "professional-brief";

interface RunOptions {
  args?: string[];
  input?: string;
  env?: Record<string, string>;
}

export async function runPython(tool: PythonTool, options: RunOptions = {}): Promise<unknown> {
  const python = process.env.OYB_PYTHON_BIN ?? "python3";
  const cli = process.env.OYB_PYTHON_CLI ?? "-m";
  const baseArgs = cli === "-m" ? ["openyourbubble", tool] : [cli, tool];
  const child = spawn(python, [...baseArgs, ...(options.args ?? [])], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (options.input) {
    child.stdin.write(options.input);
  }
  child.stdin.end();

  const chunks: Buffer[] = [];
  const errors: Buffer[] = [];

  child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));

  const exitCode: number = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (exitCode !== 0) {
    const errorText = Buffer.concat(errors).toString("utf8");
    throw new Error(`Python tool ${tool} failed: ${errorText || exitCode}`);
  }

  const payload = Buffer.concat(chunks).toString("utf8").trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(`Invalid JSON from Python tool ${tool}: ${error}`);
  }
}
