import type { NextRequest } from "next/server";

function parseForwarded(forwarded: string | null): string | null {
  if (!forwarded) return null;
  const first = forwarded.split(",").map((part) => part.trim())[0];
  return first && first.length > 0 ? first : null;
}

export function getClientIp(request: Request | NextRequest): string | null {
  const header = (name: string) => request.headers.get(name);
  return (
    parseForwarded(header("x-forwarded-for")) ||
    parseForwarded(header("forwarded")) ||
    header("x-real-ip") ||
    null
  );
}

export function buildRateLimitKey(request: Request | NextRequest, scope: string): string {
  const ip = getClientIp(request) ?? "anon";
  return `${scope}:${ip}`;
}
