import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Write to a temp file in the same directory, then rename: readers never see a half-written file.
export function atomicWrite(path: string, data: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");

// JSON with sorted keys, so equal objects always hash the same.
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}
