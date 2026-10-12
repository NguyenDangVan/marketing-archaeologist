import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { localDate, recordObservation } from "../src/importer/record.js";
import { Store } from "../src/store/store.js";
import { tempWorkspace } from "./helpers.js";

const meta = (observedAt: string) => ({
  niche: "vn-skincare",
  brandId: "brand_alpha",
  collectedBy: "manual",
  observedAt: new Date(observedAt),
  timeZone: "Asia/Ho_Chi_Minh",
});

const adObservation = () => ({
  source: "meta_ad_library" as const,
  kind: "ad" as const,
  url: "https://www.facebook.com/ads/library/?id=1",
  metrics: { ad_started_running: "2026-08-20" },
  snapshot: { ext: "png", data: new Uint8Array([1, 2, 3]) },
});

describe("recordObservation + Store", () => {
  it("stores evidence with its snapshot and reads it back", () => {
    const ws = tempWorkspace();
    const store = new Store(ws);
    const r = recordObservation(store, adObservation(), meta("2026-10-12T01:00:00Z"));
    expect(r.status).toBe("inserted");
    if (r.status !== "inserted") return;

    expect(r.evidence.snapshot_path).toMatch(/^data\/snapshots\/2026\/10\/12\/ev_.+\.png$/);
    expect([...readFileSync(join(ws.root, r.evidence.snapshot_path!))]).toEqual([1, 2, 3]);
    expect(store.getEvidence(r.evidence.id)).toEqual(r.evidence);
    expect(store.listEvidence({ niche: "vn-skincare", brandId: "brand_alpha" })).toHaveLength(1);
    store.close();
  });

  it("dedupes the same observation on the same local day without writing a second snapshot", () => {
    const ws = tempWorkspace();
    const store = new Store(ws);
    // 01:00Z and 16:30Z are 08:00 and 23:30 on Oct 12 in Vietnam: same local day.
    const first = recordObservation(store, adObservation(), meta("2026-10-12T01:00:00Z"));
    const second = recordObservation(store, adObservation(), meta("2026-10-12T16:30:00Z"));
    expect(second.status).toBe("duplicate");
    if (first.status === "inserted" && second.status === "duplicate") expect(second.existingId).toBe(first.evidence.id);
    expect(readdirSync(join(ws.snapshotsDir, "2026", "10", "12"))).toHaveLength(1);
    store.close();
  });

  it("keeps a new row when the same ad is seen again on a later day (ad longevity)", () => {
    const ws = tempWorkspace();
    const store = new Store(ws);
    recordObservation(store, adObservation(), meta("2026-10-12T01:00:00Z"));
    // 17:30Z on Oct 12 is already Oct 13 in Vietnam.
    const nextDay = recordObservation(store, adObservation(), meta("2026-10-12T17:30:00Z"));
    expect(nextDay.status).toBe("inserted");
    expect(store.listEvidence({ niche: "vn-skincare" })).toHaveLength(2);
    store.close();
  });

  it("writes nothing when the observation is invalid", () => {
    const ws = tempWorkspace();
    const store = new Store(ws);
    expect(() =>
      recordObservation(store, { ...adObservation(), source: "press" }, meta("2026-10-12T01:00:00Z")),
    ).toThrow();
    expect(existsSync(ws.snapshotsDir)).toBe(false);
    expect(store.listEvidence({ niche: "vn-skincare" })).toHaveLength(0);
    store.close();
  });

  it("survives reopening (migrations are idempotent)", () => {
    const ws = tempWorkspace();
    new Store(ws).close();
    const store = new Store(ws);
    expect(store.listEvidence({ niche: "x" })).toEqual([]);
    store.close();
  });
});

describe("localDate", () => {
  it("uses the niche timezone", () => {
    expect(localDate(new Date("2026-10-12T17:30:00Z"), "Asia/Ho_Chi_Minh")).toBe("2026-10-13");
    expect(localDate(new Date("2026-10-12T17:30:00Z"), "UTC")).toBe("2026-10-12");
  });
});
