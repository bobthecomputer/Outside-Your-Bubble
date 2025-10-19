export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export function sanitizeJson(value: unknown, depth = 0): JsonValue | undefined {
  if (depth > 8) return undefined;
  if (value === null) return null;
  if (typeof value === "string") {
    return value.length > 512 ? value.slice(0, 512) : value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const sanitized = value
      .slice(0, 24)
      .map((entry) => sanitizeJson(entry, depth + 1))
      .filter((entry): entry is JsonValue => entry !== undefined);
    return sanitized;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const limited = entries.slice(0, 24);
    const sanitizedObject: Record<string, JsonValue> = {};
    for (const [key, raw] of limited) {
      const sanitized = sanitizeJson(raw, depth + 1);
      if (sanitized !== undefined) {
        sanitizedObject[key] = sanitized;
      }
    }
    return sanitizedObject;
  }
  return undefined;
}
