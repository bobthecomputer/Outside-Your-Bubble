import Redis from "ioredis";
import { logger } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var oybRedis: Redis | null | undefined;
}

const redisUrl = process.env.REDIS_URL;

function createRedisClient(): Redis | null {
  if (!redisUrl) {
    return null;
  }

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });

  client.on("error", (error) => {
    logger.warn({ error }, "redis:error");
  });

  return client;
}

export function getRedisClient(): Redis | null {
  if (typeof global.oybRedis !== "undefined") {
    return global.oybRedis;
  }

  global.oybRedis = createRedisClient();
  return global.oybRedis;
}
