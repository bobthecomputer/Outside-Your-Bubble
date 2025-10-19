import { NextResponse } from "next/server";
import { acceptMeshEnvelope, verifyMeshAuthorization, type MeshEnvelope } from "@/lib/p2p/mesh";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { buildRateLimitKey } from "@/lib/security/request";
import { logger } from "@/lib/logger";

function isMeshEnvelope(value: unknown): value is MeshEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const requiredKeys: Array<keyof MeshEnvelope> = [
    "id",
    "channel",
    "ts",
    "iv",
    "tag",
    "ciphertext",
    "checksum",
    "version",
  ];
  for (const key of requiredKeys) {
    if (typeof candidate[key] !== "string" && key !== "version") {
      return false;
    }
  }
  if (typeof candidate.version !== "number") {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const authorized = verifyMeshAuthorization(request.headers.get("authorization"));
  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rateKey = buildRateLimitKey(request, "mesh:relay");
  const rate = applyRateLimit(rateKey, 30_000, 120);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 30) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!isMeshEnvelope(body)) {
    return NextResponse.json({ message: "Invalid envelope" }, { status: 400 });
  }

  try {
    await acceptMeshEnvelope(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.warn({ error }, "mesh:relay-failed");
    return NextResponse.json({ message: "Failed to accept envelope" }, { status: 400 });
  }
}
