import { describe, expect, it } from "vitest";
import { runCli, runCliWithStdin, seededWorkspace } from "./helpers.js";

// The loop the skill drives: agent observes → marc import → marc feature add → marc claim add → marc claim list.
function importBatch(ws: ReturnType<typeof seededWorkspace>) {
  const batch = [
    {
      brand: "brand_alpha",
      source: "meta_ad_library",
      kind: "ad",
      url: "https://www.facebook.com/ads/library/?id=111",
      text: "Da dầu mụn? Thử ngay serum Alpha — mua 1 tặng 1",
      metrics: { ad_started_running: "2026-08-20" },
      observed_at: "2026-10-12T03:00:00Z",
    },
    {
      brand: "brand_beta",
      source: "tiktok",
      kind: "video",
      url: "https://www.tiktok.com/@beta/video/222",
      text: "Before/after 14 ngày",
      metrics: { views: 540000 },
      observed_at: "2026-10-12T03:05:00Z",
    },
    {
      brand: "brand_alpha",
      source: "shopee",
      kind: "review_batch",
      url: "https://shopee.vn/alpha/product/1",
      items: ["giao nhanh, da đỡ mụn", "mùi hơi nồng"],
      observed_at: "2026-10-12T03:10:00Z",
    },
    { source: "press", kind: "article", url: "https://advertisingvietnam.com/alpha-locket", brand: "brand_alpha" },
    { brand: "brand_nope", source: "website", kind: "page", url: "https://x.vn" },
  ];
  const r = runCliWithStdin(ws, JSON.stringify(batch), "import", "vn-skincare", "--from", "-", "--json", "--by", "claude");
  return { ...r, results: JSON.parse(r.out) as { index: number; status: string; id?: string; error?: string }[] };
}

describe("agent flow", () => {
  it("imports a batch, keeps good items, reports bad ones, exits 1", () => {
    const ws = seededWorkspace();
    const { code, results } = importBatch(ws);
    expect(code).toBe(1);
    expect(results.map((r) => r.status)).toEqual(["inserted", "inserted", "inserted", "inserted", "error"]);
    expect(results[4]!.error).toContain("brand_nope");

    const evidence = JSON.parse(runCli(ws, "evidence", "vn-skincare", "--json").out);
    const reviews = evidence.find((e: { kind: string }) => e.kind === "review_batch");
    expect(reviews.items).toEqual(["giao nhanh, da đỡ mụn", "mùi hơi nồng"]);
    expect(reviews.collected_by).toBe("manual:claude");
  });

  it("adds features and enforces claim rules", () => {
    const ws = seededWorkspace();
    const [ad, video, , press] = importBatch(ws).results.map((r) => r.id!);

    const feat = runCliWithStdin(
      ws,
      JSON.stringify({ evidence_id: ad, extractor: "agent:claude/teardown@0.1.0", hook: "Da dầu mụn?", format: "static_image", cta: null, offer: "mua 1 tặng 1" }),
      "feature", "add", "vn-skincare", "--from", "-",
    );
    expect(feat.code).toBe(0);
    expect(runCliWithStdin(ws, JSON.stringify({ evidence_id: "ev_01M4QAYE2DKH2S02Z07PC9MF1T", extractor: "x", hook: null, format: null, cta: null, offer: null }), "feature", "add", "vn-skincare", "--from", "-").code).toBe(1);

    // pattern from a single brand is refused, and nothing in the batch is stored
    const bad = runCliWithStdin(
      ws,
      JSON.stringify([
        { level: "observation", kind: "fact", statement: "Alpha chạy ad 'mua 1 tặng 1' từ 20/8", evidence_ids: [ad], confidence: "high" },
        { level: "pattern", kind: "fact", statement: "x", evidence_ids: [ad], confidence: "medium" },
      ]),
      "claim", "add", "vn-skincare", "--from", "-",
    );
    expect(bad.code).toBe(1);
    expect(bad.err).toContain("≥ 2 thương hiệu");
    expect(runCli(ws, "claim", "list", "vn-skincare").out).toContain("0 nhận định");

    // secondary-only evidence must be low confidence; inference can't be high
    expect(runCliWithStdin(ws, JSON.stringify({ level: "observation", kind: "fact", statement: "Alpha làm Locket", evidence_ids: [press], confidence: "medium" }), "claim", "add", "vn-skincare", "--from", "-").err).toContain("confidence: low");
    expect(runCliWithStdin(ws, JSON.stringify({ level: "observation", kind: "inference", statement: "Ad này có lãi", evidence_ids: [ad], confidence: "high" }), "claim", "add", "vn-skincare", "--from", "-").err).toContain("inference");

    const good = runCliWithStdin(
      ws,
      JSON.stringify({ level: "pattern", kind: "inference", statement: "Cả hai thương hiệu dùng góc 'da dầu mụn'", channel: "tiktok", evidence_ids: [ad, video], confidence: "medium" }),
      "claim", "add", "vn-skincare", "--from", "-", "--json",
    );
    expect(good.code).toBe(0);
    const [stored] = JSON.parse(good.out);
    expect(stored.status).toBe("hypothesis");
    expect(stored.scope).toEqual({ niche: "vn-skincare", market: "VN", channel: "tiktok", brand_ids: ["brand_alpha", "brand_beta"] });
    expect(runCli(ws, "claim", "list", "vn-skincare", "--level", "pattern").out).toContain(`bằng chứng: ${ad}, ${video}`);
  });

  it("status shows coverage per brand × channel and dark channels", () => {
    const ws = seededWorkspace();
    importBatch(ws);
    const status = JSON.parse(runCli(ws, "status", "vn-skincare", "--json").out);
    const alpha = status.brands.find((b: { id: string }) => b.id === "brand_alpha");
    expect(alpha.channels.find((c: { channel: string }) => c.channel === "meta_ad_library").evidence_count).toBe(1);
    expect(alpha.missing_channels).toEqual(["website", "facebook_page", "tiktok"]);
    expect(alpha.dark_channels.map((d: { channel: string }) => d.channel).sort()).toEqual(["locket", "zalo_oa"]);
    expect(status.totals.evidence).toBe(4);
    expect(runCli(ws, "status", "vn-skincare").out).toContain("[tối] locket");
  });
});
