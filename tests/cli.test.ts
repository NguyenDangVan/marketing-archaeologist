import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli, seededWorkspace, tempWorkspace } from "./helpers.js";

describe("marc CLI", () => {
  it("init → validate", () => {
    const ws = tempWorkspace();
    expect(runCli(ws, "init", "vn-fnb", "--name", "F&B").code).toBe(0);
    const v = runCli(ws, "validate", "vn-fnb");
    expect(v.code).toBe(0);
    expect(v.out).toContain("OK: 0 thương hiệu");
  });

  it("validate prints errors and exits 1 on a broken config", () => {
    const ws = seededWorkspace();
    writeFileSync(join(ws.nicheDir("vn-skincare"), "brands.yaml"), "brands:\n  - id: Bad Id\n    name: x\n");
    const v = runCli(ws, "validate", "vn-skincare");
    expect(v.code).toBe(1);
    expect(v.err).toContain("LỖI");
  });

  it("import with metrics and snapshot, then dedupe, then list", () => {
    const ws = seededWorkspace();
    const shot = join(ws.root, "shot.png");
    writeFileSync(shot, "png-bytes");
    const args = [
      "import", "vn-skincare",
      "--brand", "brand_alpha",
      "--source", "shopee",
      "--kind", "product_listing",
      "--url", "https://shopee.vn/alpha/product/1",
      "--metric", "sold_count_display=10,2k",
      "--metric", "rating=4.8",
      "--snapshot", shot,
      "--observed-at", "2026-10-12T03:00:00Z",
    ];
    const first = runCli(ws, ...args);
    expect(first.code).toBe(0);
    expect(first.out).toMatch(/Đã lưu ev_\w+ \(snapshot: data\/snapshots\/2026\/10\/12\//);

    expect(runCli(ws, ...args).out).toContain("Bỏ qua: trùng");

    const list = runCli(ws, "evidence", "vn-skincare", "--json");
    const items = JSON.parse(list.out);
    expect(items).toHaveLength(1);
    expect(items[0].metrics).toEqual({ sold_count_display: "10,2k", sold_count_min: 10200, rating: 4.8 });
  });

  it("import requires --brand except for press, and marks press as secondary", () => {
    const ws = seededWorkspace();
    const base = ["import", "vn-skincare", "--kind", "article", "--url", "https://advertisingvietnam.com/x"];
    expect(runCli(ws, ...base, "--source", "website").err).toContain("cần brand");
    expect(runCli(ws, ...base, "--source", "press").code).toBe(0);
    const [item] = JSON.parse(runCli(ws, "evidence", "vn-skincare", "--json").out);
    expect(item.evidence_class).toBe("secondary");
    expect(item.brand_id).toBeNull();
  });

  it("imports a dark channel capture and rejects unknown brands and metrics", () => {
    const ws = seededWorkspace();
    const base = ["import", "vn-skincare", "--kind", "post", "--url", "https://locket.camera/x"];
    expect(runCli(ws, ...base, "--brand", "brand_alpha", "--source", "dark_channel", "--dark-channel", "locket").code).toBe(0);
    expect(runCli(ws, ...base, "--brand", "brand_zeta", "--source", "website").err).toContain('không có thương hiệu "brand_zeta"');
    expect(runCli(ws, ...base, "--brand", "brand_alpha", "--source", "website", "--metric", "followers=10").code).toBe(1);
  });

  it("collect reports missing connectors and exits 2; unbuilt commands exit 2", () => {
    const ws = seededWorkspace();
    const c = runCli(ws, "collect", "vn-skincare");
    expect(c.code).toBe(2);
    expect(c.out).toContain("shopee");
    expect(c.out).toContain("(1/2 thương hiệu có handle)");
    expect(runCli(ws, "analyze", "vn-skincare").code).toBe(2);
  });
});
