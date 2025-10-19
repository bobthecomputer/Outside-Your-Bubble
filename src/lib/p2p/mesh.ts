import { createHash, createCipheriv, randomBytes, createDecipheriv } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { sanitizeJson, type JsonValue } from "@/lib/security/sanitize";
import { logger } from "@/lib/logger";

export type MeshEnvelope = {
  id: string;
  channel: string;
  ts: string;
  iv: string;
  tag: string;
  ciphertext: string;
  checksum: string;
  version: number;
};

const DEFAULT_STORAGE = path.join(process.cwd(), ".mesh");
const ENCODING: BufferEncoding = "base64";

function meshSecret(): Buffer {
  const secret = process.env.MESH_SECRET || process.env.NEXTAUTH_SECRET || "oyb-mesh-default";
  return createHash("sha256").update(secret).digest();
}

function meshAuthToken(): string {
  const secret = process.env.MESH_SECRET || process.env.NEXTAUTH_SECRET || "oyb-mesh-default";
  return createHash("sha256").update(`${secret}:relay`).digest("hex");
}

function meshStorageDir(): string {
  return process.env.MESH_STORAGE_PATH ? path.resolve(process.env.MESH_STORAGE_PATH) : DEFAULT_STORAGE;
}

function meshPeers(): string[] {
  const raw = process.env.MESH_PEERS || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function ensureAbsolutePeer(url: string): string {
  if (url.endsWith("/")) return url.slice(0, -1);
  return url;
}

function encryptRecord(payload: Record<string, JsonValue>): MeshEnvelope {
  const iv = randomBytes(12);
  const key = meshSecret();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: MeshEnvelope = {
    id: createHash("sha256").update(iv).update(encrypted).digest("hex"),
    channel: payload.channel as string,
    ts: payload.ts as string,
    iv: iv.toString(ENCODING),
    tag: tag.toString(ENCODING),
    ciphertext: encrypted.toString(ENCODING),
    checksum: createHash("sha256").update(encrypted).digest("hex"),
    version: 1,
  };
  return envelope;
}

export function decryptEnvelope(envelope: MeshEnvelope): Record<string, unknown> | null {
  try {
    const key = meshSecret();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, ENCODING));
    decipher.setAuthTag(Buffer.from(envelope.tag, ENCODING));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, ENCODING)),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (error) {
    logger.warn({ error }, "mesh:decrypt-failed");
    return null;
  }
}

async function ensureChannelDir(channel: string): Promise<string> {
  const base = meshStorageDir();
  const dir = path.join(base, channel);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function persistEnvelope(envelope: MeshEnvelope): Promise<void> {
  const dir = await ensureChannelDir(envelope.channel);
  const filePath = path.join(dir, `${envelope.ts.replace(/[:.]/g, "-")}-${envelope.id}.json`);
  try {
    await fs.stat(filePath);
    return;
  } catch {
    // continue to write
  }
  await fs.writeFile(filePath, JSON.stringify(envelope, null, 2), "utf8");
}

function sanitizePayload(channel: string, payload: Record<string, unknown>): Record<string, JsonValue> {
  const sanitized: Record<string, JsonValue> = {};
  sanitized.channel = channel;
  sanitized.ts = new Date().toISOString();
  for (const [key, value] of Object.entries(payload)) {
    const clean = sanitizeJson(value);
    if (clean !== undefined) {
      sanitized[key] = clean;
    }
  }
  return sanitized;
}

async function broadcastEnvelope(envelope: MeshEnvelope): Promise<void> {
  const peers = meshPeers();
  if (peers.length === 0) return;
  const token = meshAuthToken();
  await Promise.all(
    peers.map(async (peer) => {
      const target = `${ensureAbsolutePeer(peer)}/api/mesh/relay`;
      try {
        const response = await fetch(target, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(envelope),
        });
        if (!response.ok) {
          logger.warn({ status: response.status, target }, "mesh:broadcast-failed");
        }
      } catch (error) {
        logger.warn({ error, target }, "mesh:broadcast-error");
      }
    }),
  );
}

export async function publishMeshRecord(channel: string, payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizePayload(channel, payload);
  const envelope = encryptRecord(sanitized);
  await persistEnvelope(envelope);
  await broadcastEnvelope(envelope);
}

export async function acceptMeshEnvelope(envelope: MeshEnvelope): Promise<void> {
  if (!envelope || envelope.version !== 1) {
    throw new Error("Unsupported envelope version");
  }
  const expectedChecksum = createHash("sha256").update(Buffer.from(envelope.ciphertext, ENCODING)).digest("hex");
  if (expectedChecksum !== envelope.checksum) {
    throw new Error("Envelope checksum mismatch");
  }
  await persistEnvelope(envelope);
}

export function verifyMeshAuthorization(header: string | null): boolean {
  if (!header) return false;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return false;
  }
  return token === meshAuthToken();
}

export function hashForMesh(value: string): string {
  return createHash("sha256").update(meshSecret()).update(value).digest("hex");
}
