import { createHash } from "node:crypto";

/**
 * Canonical JSON: object keys sorted lexicographically, no insignificant
 * whitespace, `undefined` object members omitted. Used for hashing so that
 * semantically identical values always produce identical digests.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : normalise(v)));
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) throw new TypeError("non-finite numbers cannot be canonicalised");
      return value;
    case "string":
    case "boolean":
      return value;
    case "object": {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as object).sort()) {
        const v = (value as Record<string, unknown>)[key];
        if (v !== undefined) out[key] = normalise(v);
      }
      return out;
    }
    default:
      throw new TypeError(`cannot canonicalise value of type ${typeof value}`);
  }
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hashValue(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

export const GENESIS_HASH = "0".repeat(64);
