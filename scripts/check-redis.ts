import "dotenv/config";
import Redis from "ioredis";

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error("REDIS_URL is not set. Update your env (.env.local) or docker compose defaults.");
    process.exit(1);
  }

  const client = new Redis(url, { maxRetriesPerRequest: 1, enableReadyCheck: true });
  const start = Date.now();

  try {
    const pong = await client.ping();
    const latency = Date.now() - start;
    console.log(`Redis reachable (${pong}) at ${url} in ${latency}ms`);
  } finally {
    await client.quit();
  }
}

main().catch((error) => {
  console.error("Redis check failed:", error);
  process.exit(1);
});
