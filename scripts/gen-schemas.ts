// Generates schemas/*.schema.json from src/domain/schemas.ts. `--check` fails if the files are stale (used in CI).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PUBLISHED_SCHEMAS } from "../src/domain/schemas.js";
import { atomicWrite } from "../src/lib/fs.js";

const BASE_URL = "https://raw.githubusercontent.com/NguyenDangVan/marketing-archaeologist/main/schemas";

export function renderSchemas(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PUBLISHED_SCHEMAS).map(([name, schema]) => {
      // "input": what a person or connector may write (fields with defaults are optional).
      const json = { $id: `${BASE_URL}/${name}.schema.json`, ...z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) };
      return [`${name}.schema.json`, JSON.stringify(json, null, 2) + "\n"];
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(fileURLToPath(new URL("..", import.meta.url)), "schemas");
  const check = process.argv.includes("--check");
  const stale: string[] = [];
  for (const [file, content] of Object.entries(renderSchemas())) {
    const path = join(dir, file);
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === content) continue;
    if (check) stale.push(file);
    else {
      atomicWrite(path, content);
      console.log(`wrote schemas/${file}`);
    }
  }
  if (stale.length) {
    console.error(`Stale schemas (run pnpm schemas): ${stale.join(", ")}`);
    process.exit(1);
  }
}
