import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initNiche, loadNiche, RegistryError } from "../src/registry/registry.js";
import { seededWorkspace, tempWorkspace } from "./helpers.js";

describe("initNiche", () => {
  it("creates the niche files and the template validates", () => {
    const ws = tempWorkspace();
    const dir = initNiche(ws, "vn-fnb", { name: "F&B \"Sài Gòn\"" });
    for (const f of ["niche.yaml", "brands.yaml", "playbook.md"]) expect(existsSync(join(dir, f))).toBe(true);

    const { niche, brands, issues } = loadNiche(ws, "vn-fnb");
    expect(niche.name).toBe('F&B "Sài Gòn"');
    expect(niche.analysis.outlier_multiplier).toBe(3);
    expect(brands).toEqual([]);
    expect(issues.map((i) => i.message)).toContain("chưa khai báo thương hiệu nào");
  });

  it("refuses to overwrite or to use a bad id", () => {
    const ws = tempWorkspace();
    initNiche(ws, "vn-fnb");
    expect(() => initNiche(ws, "vn-fnb")).toThrow(/đã tồn tại/);
    expect(() => initNiche(ws, "VN FnB")).toThrow(/không hợp lệ/);
  });
});

describe("loadNiche", () => {
  it("warns about missing handles for declared channels", () => {
    const ws = seededWorkspace();
    const { brands, issues } = loadNiche(ws, "vn-skincare");
    expect(brands.map((b) => b.id)).toEqual(["brand_alpha", "brand_beta"]);
    expect(issues.every((i) => i.level === "warning")).toBe(true);
    expect(issues.some((i) => i.message.includes("brand_beta: chưa có handle cho kênh shopee"))).toBe(true);
    expect(issues.some((i) => i.message.startsWith("brand_alpha"))).toBe(false);
  });

  it("fails on invalid handles, duplicate ids and id/dir mismatch", () => {
    const ws = seededWorkspace();
    const dir = ws.nicheDir("vn-skincare");
    writeFileSync(
      join(dir, "brands.yaml"),
      `brands:
  - id: brand_a
    name: A
    handles: { meta_ad_library: "https://facebook.com/a" }
  - id: brand_a
    name: A2
`,
    );
    const err = (() => {
      try {
        loadNiche(ws, "vn-skincare");
      } catch (e) {
        return e as RegistryError;
      }
      throw new Error("expected failure");
    })();
    const messages = err.issues.filter((i) => i.level === "error").map((i) => i.message);
    expect(messages.some((m) => m.includes("id thương hiệu bị trùng"))).toBe(true);

    writeFileSync(join(dir, "brands.yaml"), `brands:\n  - id: brand_a\n    name: A\n    handles: { meta_ad_library: "abc" }\n`);
    expect(() => loadNiche(ws, "vn-skincare")).toThrow(RegistryError);

    writeFileSync(join(dir, "niche.yaml"), "id: other\nname: X\nmarket: VN\nchannels: [website]\n");
    writeFileSync(join(dir, "brands.yaml"), "brands: []\n");
    expect(() => loadNiche(ws, "vn-skincare")).toThrow(RegistryError);
  });

  it("reports YAML syntax errors instead of crashing", () => {
    const ws = seededWorkspace();
    writeFileSync(join(ws.nicheDir("vn-skincare"), "brands.yaml"), "brands: [\n");
    expect(() => loadNiche(ws, "vn-skincare")).toThrow(RegistryError);
  });
});
