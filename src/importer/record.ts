import { newId } from "../domain/ids.js";
import { EvidenceSchema, type Evidence } from "../domain/schemas.js";
import { canonicalJson, sha256 } from "../lib/fs.js";
import type { Observation } from "../connectors/types.js";
import type { Store } from "../store/store.js";

export type RecordResult = { status: "inserted"; evidence: Evidence } | { status: "duplicate"; existingId: string };

// Calendar date of the observation in the niche's timezone.
export function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

// Turns an observation into stored evidence. Shared by connectors and manual import.
// The same thing observed twice on the same local day is a duplicate; on a later day it is a new
// observation (that is how ad longevity and sold-count velocity are measured).
export function recordObservation(
  store: Store,
  obs: Observation,
  meta: { niche: string; brandId: string | null; collectedBy: string; observedAt: Date; timeZone: string },
): RecordResult {
  const { snapshot, ...fields } = obs;
  const contentHash =
    "sha256:" +
    sha256(
      canonicalJson({
        source: fields.source,
        kind: fields.kind,
        url: fields.url,
        brand_id: meta.brandId,
        published_at: fields.published_at ?? null,
        text: fields.text ?? null,
        items: fields.items ?? [],
        metrics: fields.metrics ?? {},
        raw: fields.raw ?? {},
        snapshot: snapshot ? sha256(snapshot.data) : null,
        day: localDate(meta.observedAt, meta.timeZone),
      }),
    );

  // Check before writing the snapshot so duplicates leave no orphan files.
  const existingId = store.findIdByHash(contentHash);
  if (existingId) return { status: "duplicate", existingId };

  const id = newId("ev", meta.observedAt.getTime());
  const snapshotPath = snapshot ? store.snapshotPath(id, snapshot.ext, meta.observedAt) : null;

  // Validate before touching disk, so invalid input leaves no orphan snapshot either.
  const evidence = EvidenceSchema.parse({
    ...fields,
    id,
    niche: meta.niche,
    brand_id: meta.brandId,
    observed_at: meta.observedAt.toISOString(),
    collected_by: meta.collectedBy,
    snapshot_path: snapshotPath,
    content_hash: contentHash,
  });
  if (snapshot && snapshotPath) store.writeSnapshot(snapshotPath, snapshot.data);

  const result = store.insertEvidence(evidence);
  return result.inserted ? { status: "inserted", evidence: result.evidence } : { status: "duplicate", existingId: result.existingId };
}
