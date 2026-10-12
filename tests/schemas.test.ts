import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderSchemas } from "../scripts/gen-schemas.js";

describe("schemas/*.schema.json", () => {
  it("are up to date with src/domain/schemas.ts (run: pnpm schemas)", () => {
    for (const [file, content] of Object.entries(renderSchemas())) {
      expect(readFileSync(join(import.meta.dirname, "..", "schemas", file), "utf8"), file).toBe(content);
    }
  });
});
