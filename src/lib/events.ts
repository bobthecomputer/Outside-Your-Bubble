import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { publishMeshRecord, hashForMesh } from "@/lib/p2p/mesh";
import { sanitizeJson, type JsonValue } from "@/lib/security/sanitize";

const EVENT_NAME_REGEX = /^[a-z0-9._:-]{3,64}$/;

type RecordEventOptions = {
  userId?: string;
  name: string;
  payload?: Record<string, unknown>;
  metadata?: {
    ip?: string | null;
  };
};

function sanitizePayload(payload?: Record<string, unknown>): Record<string, JsonValue> | undefined {
  if (!payload) return undefined;
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(payload)) {
    const sanitized = sanitizeJson(value);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  return result;
}

export async function recordEvent({ userId, name, payload, metadata }: RecordEventOptions): Promise<void> {
  if (!EVENT_NAME_REGEX.test(name)) {
    throw new Error(`Invalid event name: ${name}`);
  }

  const sanitizedPayload = sanitizePayload(payload) ?? {};
  try {
    await prisma.event.create({
      data: {
        userId,
        name,
        payload: sanitizedPayload,
      },
    });
  } catch (error) {
    logger.warn({ error, name }, "events:prisma-write-failed");
  }

  try {
    const hashedUser = userId ? hashForMesh(userId) : undefined;
    const hashedIp = metadata?.ip ? hashForMesh(metadata.ip) : undefined;
    await publishMeshRecord("events", {
      name,
      payload: sanitizedPayload,
      user: hashedUser,
      ip: hashedIp,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn({ error, name }, "events:mesh-write-failed");
  }
}
