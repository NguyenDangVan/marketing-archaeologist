import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { buildProgram, type Io } from "../src/cli/program.js";
import { initNiche } from "../src/registry/registry.js";
import { Workspace } from "../src/workspace.js";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

export function tempWorkspace(): Workspace {
  const dir = mkdtempSync(join(tmpdir(), "marc-test-"));
  dirs.push(dir);
  return new Workspace(dir);
}

export const BRANDS_YAML = `brands:
  - id: brand_alpha
    name: "Alpha Cosmetics"
    handles:
      website: https://alpha.vn
      meta_ad_library: "123456789012345"
      facebook_page: https://facebook.com/alpha
      tiktok: "@alpha"
      shopee: https://shopee.vn/alpha
    dark_channels:
      - channel: locket
  - id: brand_beta
    name: "Beta"
    handles:
      website: https://beta.vn
      tiktok: https://www.tiktok.com/@beta
`;

// A workspace with niche "vn-skincare" and two brands.
export function seededWorkspace(): Workspace {
  const ws = tempWorkspace();
  initNiche(ws, "vn-skincare", { name: "Skincare VN" });
  writeFileSync(join(ws.nicheDir("vn-skincare"), "brands.yaml"), BRANDS_YAML);
  return ws;
}

export function runCli(ws: Workspace, ...args: string[]) {
  return runCliWithStdin(ws, "", ...args);
}

export function runCliWithStdin(ws: Workspace, stdin: string, ...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (l) => out.push(l), err: (l) => err.push(l), exitCode: 0, stdin: () => stdin };
  try {
    buildProgram(io).parse(["--workspace", ws.root, ...args], { from: "user" });
  } catch (e) {
    io.exitCode = (e as { exitCode?: number }).exitCode ?? 1;
  }
  return { code: io.exitCode, out: out.join("\n"), err: err.join("\n") };
}
