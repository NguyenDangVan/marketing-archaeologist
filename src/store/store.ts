import { mkdirSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { join, relative } from "node:path";
import {
  ClaimSchema,
  EvidenceSchema,
  FeatureSchema,
  type Claim,
  type Evidence,
  type EvidenceInput,
  type Feature,
} from "../domain/schemas.js";
import { atomicWrite } from "../lib/fs.js";
import type { Workspace } from "../workspace.js";

const MIGRATIONS = [
  `CREATE TABLE evidence (
     id            TEXT PRIMARY KEY,
     niche         TEXT NOT NULL,
     brand_id      TEXT,
     source        TEXT NOT NULL,
     kind          TEXT NOT NULL,
     url           TEXT NOT NULL,
     observed_at   TEXT NOT NULL,
     content_hash  TEXT NOT NULL UNIQUE,
     doc           TEXT NOT NULL
   );
   CREATE INDEX evidence_niche_brand ON evidence (niche, brand_id, observed_at);`,
  `CREATE TABLE features (
     evidence_id  TEXT NOT NULL REFERENCES evidence (id),
     extractor    TEXT NOT NULL,
     doc          TEXT NOT NULL,
     updated_at   TEXT NOT NULL,
     PRIMARY KEY (evidence_id, extractor)
   );
   CREATE TABLE claims (
     id           TEXT PRIMARY KEY,
     niche        TEXT NOT NULL,
     level        TEXT NOT NULL,
     doc          TEXT NOT NULL
   );
   CREATE INDEX claims_niche ON claims (niche, level);`,
];

export type InsertResult = { inserted: true; evidence: Evidence } | { inserted: false; existingId: string };

// Evidence is immutable: a changed observation is a new row, never an update.
export class Store {
  private readonly db: DatabaseSync;

  constructor(private readonly ws: Workspace) {
    mkdirSync(ws.dataDir, { recursive: true });
    // Loaded lazily (not a static import) so the CLI's warning filter is installed before node:sqlite loads.
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    this.db = new DatabaseSync(ws.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate() {
    const version = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    for (let v = version; v < MIGRATIONS.length; v++) {
      this.db.exec("BEGIN");
      try {
        this.db.exec(MIGRATIONS[v]!);
        this.db.exec(`PRAGMA user_version = ${v + 1}`);
        this.db.exec("COMMIT");
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    }
  }

  findIdByHash(contentHash: string): string | null {
    const row = this.db.prepare("SELECT id FROM evidence WHERE content_hash = ?").get(contentHash) as
      | { id: string }
      | undefined;
    return row?.id ?? null;
  }

  insertEvidence(input: EvidenceInput): InsertResult {
    const ev = EvidenceSchema.parse(input);
    const existingId = this.findIdByHash(ev.content_hash);
    if (existingId) return { inserted: false, existingId };

    this.db
      .prepare(
        `INSERT INTO evidence (id, niche, brand_id, source, kind, url, observed_at, content_hash, doc)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(ev.id, ev.niche, ev.brand_id, ev.source, ev.kind, ev.url, ev.observed_at, ev.content_hash, JSON.stringify(ev));
    return { inserted: true, evidence: ev };
  }

  getEvidence(id: string): Evidence | null {
    const row = this.db.prepare("SELECT doc FROM evidence WHERE id = ?").get(id) as { doc: string } | undefined;
    return row ? EvidenceSchema.parse(JSON.parse(row.doc)) : null;
  }

  listEvidence(filter: { niche: string; brandId?: string }): Evidence[] {
    const rows = (
      filter.brandId
        ? this.db
            .prepare("SELECT doc FROM evidence WHERE niche = ? AND brand_id = ? ORDER BY observed_at, id")
            .all(filter.niche, filter.brandId)
        : this.db.prepare("SELECT doc FROM evidence WHERE niche = ? ORDER BY observed_at, id").all(filter.niche)
    ) as { doc: string }[];
    return rows.map((r) => EvidenceSchema.parse(JSON.parse(r.doc)));
  }

  getEvidenceMany(ids: string[]): Map<string, Evidence> {
    const found = new Map<string, Evidence>();
    const stmt = this.db.prepare("SELECT doc FROM evidence WHERE id = ?");
    for (const id of new Set(ids)) {
      const row = stmt.get(id) as { doc: string } | undefined;
      if (row) found.set(id, EvidenceSchema.parse(JSON.parse(row.doc)));
    }
    return found;
  }

  // Features are derived data: re-extracting with the same extractor replaces the previous result.
  upsertFeature(feature: Feature, now: Date = new Date()): void {
    const f = FeatureSchema.parse(feature);
    this.db
      .prepare(
        `INSERT INTO features (evidence_id, extractor, doc, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (evidence_id, extractor) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at`,
      )
      .run(f.evidence_id, f.extractor, JSON.stringify(f), now.toISOString());
  }

  listFeatures(evidenceId: string): Feature[] {
    const rows = this.db.prepare("SELECT doc FROM features WHERE evidence_id = ? ORDER BY extractor").all(evidenceId) as { doc: string }[];
    return rows.map((r) => FeatureSchema.parse(JSON.parse(r.doc)));
  }

  // Inserts all claims or none.
  insertClaims(claims: Claim[]): void {
    const parsed = claims.map((c) => ClaimSchema.parse(c));
    const stmt = this.db.prepare("INSERT INTO claims (id, niche, level, doc) VALUES (?, ?, ?, ?)");
    this.db.exec("BEGIN");
    try {
      for (const c of parsed) stmt.run(c.id, c.niche, c.level, JSON.stringify(c));
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  listClaims(filter: { niche: string; level?: Claim["level"] }): Claim[] {
    const rows = (
      filter.level
        ? this.db.prepare("SELECT doc FROM claims WHERE niche = ? AND level = ? ORDER BY id").all(filter.niche, filter.level)
        : this.db.prepare("SELECT doc FROM claims WHERE niche = ? ORDER BY id").all(filter.niche)
    ) as { doc: string }[];
    return rows.map((r) => ClaimSchema.parse(JSON.parse(r.doc)));
  }

  // Workspace-relative path data/snapshots/YYYY/MM/DD/<id>.<ext> (UTC date).
  snapshotPath(evidenceId: string, ext: string, observedAt: Date): string {
    const d = observedAt.toISOString().slice(0, 10).split("-");
    const abs = join(this.ws.snapshotsDir, d[0]!, d[1]!, d[2]!, `${evidenceId}.${ext.replace(/^\./, "")}`);
    return relative(this.ws.root, abs);
  }

  writeSnapshot(relPath: string, data: Uint8Array): void {
    atomicWrite(join(this.ws.root, relPath), data);
  }

  close() {
    this.db.close();
  }
}
