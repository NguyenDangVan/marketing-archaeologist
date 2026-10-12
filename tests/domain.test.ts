import { describe, expect, it } from "vitest";
import { checkHandle } from "../src/domain/channels.js";
import { newId, ulid } from "../src/domain/ids.js";
import { ClaimSchema, EvidenceSchema } from "../src/domain/schemas.js";
import { parseSoldCount } from "../src/domain/sold-count.js";

describe("parseSoldCount", () => {
  it.each([
    ["999", 999],
    ["1.234", 1234],
    ["10,2k", 10200],
    ["10k+", 10000],
    ["Đã bán 5,6k", 5600],
    ["1,2tr", 1200000],
    ["3 triệu", 3000000],
    ["12 nghìn", 12000],
  ])("%s → %d", (display, expected) => {
    expect(parseSoldCount(display)).toBe(expected);
  });

  it("returns null for unparseable text", () => {
    expect(parseSoldCount("bán chạy")).toBeNull();
  });
});

describe("checkHandle", () => {
  it.each([
    ["website", "https://alpha.vn"],
    ["meta_ad_library", "123456789012345"],
    ["tiktok", "@alpha.shop"],
    ["tiktok", "https://www.tiktok.com/@alpha"],
    ["youtube", "UCabcdefghijklmnopqrstuv"],
    ["youtube", "@alpha"],
    ["shopee", "https://shopee.vn/alpha"],
    ["threads", "https://www.threads.com/@alpha"],
  ] as const)("accepts %s %s", (channel, handle) => {
    expect(checkHandle(channel, handle)).toBeNull();
  });

  it.each([
    ["meta_ad_library", "https://facebook.com/alpha"],
    ["shopee", "https://lazada.vn/alpha"],
    ["facebook_page", "alpha"],
    ["tiktok", "alpha"],
  ] as const)("rejects %s %s", (channel, handle) => {
    expect(checkHandle(channel, handle)).toMatch(/không hợp lệ/);
  });
});

describe("ids", () => {
  it("are prefixed and time-sortable", () => {
    expect(newId("ev")).toMatch(/^ev_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(ulid(1000) < ulid(2000)).toBe(true);
  });
});

const baseEvidence = {
  id: newId("ev"),
  niche: "vn-skincare",
  brand_id: "brand_alpha",
  source: "tiktok",
  kind: "video",
  url: "https://www.tiktok.com/@alpha/video/1",
  observed_at: "2026-10-12T08:00:00+07:00",
  collected_by: "manual",
  snapshot_path: null,
  content_hash: "sha256:" + "a".repeat(64),
};

describe("EvidenceSchema", () => {
  it("accepts a minimal observation and fills defaults", () => {
    const ev = EvidenceSchema.parse(baseEvidence);
    expect(ev.evidence_class).toBe("primary");
    expect(ev.metrics).toEqual({});
  });

  it("forces press to be secondary", () => {
    expect(EvidenceSchema.safeParse({ ...baseEvidence, source: "press", kind: "article" }).success).toBe(false);
    expect(EvidenceSchema.safeParse({ ...baseEvidence, source: "press", kind: "article", evidence_class: "secondary" }).success).toBe(true);
  });

  it("requires dark_channel exactly when source is dark_channel", () => {
    expect(EvidenceSchema.safeParse({ ...baseEvidence, source: "dark_channel" }).success).toBe(false);
    expect(EvidenceSchema.safeParse({ ...baseEvidence, source: "dark_channel", dark_channel: "locket" }).success).toBe(true);
    expect(EvidenceSchema.safeParse({ ...baseEvidence, dark_channel: "locket" }).success).toBe(false);
  });

  it("rejects unknown metrics", () => {
    expect(EvidenceSchema.safeParse({ ...baseEvidence, metrics: { followers_gained: 10 } }).success).toBe(false);
  });
});

describe("ClaimSchema", () => {
  it("rejects a claim without evidence", () => {
    const claim = {
      id: newId("cl"),
      niche: "vn-skincare",
      level: "observation",
      kind: "fact",
      statement: "Alpha đang chạy 4 ad video",
      scope: { niche: "vn-skincare", market: "VN" },
      evidence_ids: [],
      confidence: "high",
      status: "supported",
      first_seen_at: "2026-10-12T08:00:00+07:00",
    };
    expect(ClaimSchema.safeParse(claim).success).toBe(false);
    expect(ClaimSchema.safeParse({ ...claim, evidence_ids: [newId("ev")] }).success).toBe(true);
  });
});
