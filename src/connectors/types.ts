import type { Channel } from "../domain/channels.js";
import type { Brand, EvidenceInput, Niche } from "../domain/schemas.js";

export type ConnectorErrorCode =
  | "blocked" // anti-bot, captcha, login wall
  | "not_found"
  | "rate_limited"
  | "parse_failed" // page layout changed
  | "config_missing" // e.g. API key not set
  | "network";

// Connectors fail loudly with a typed error; they never return [] to hide a failure.
export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export type HealthStatus = { ok: true } | { ok: false; code: ConnectorErrorCode; message: string };

export type Snapshot = { ext: string; data: Uint8Array };

// What a connector hands back: evidence without the fields the collector owns (id, hash, time, snapshot path, niche).
export type Observation = Omit<
  EvidenceInput,
  "id" | "niche" | "brand_id" | "content_hash" | "snapshot_path" | "collected_by" | "observed_at"
> & {
  snapshot?: Snapshot;
};

export interface CollectContext {
  niche: Niche;
  since?: Date;
  now: () => Date;
}

export interface Connector {
  readonly id: string; // e.g. "meta-ad-library"
  readonly version: string; // semver; bump when parsing changes so evidence stays traceable
  readonly channel: Channel;
  healthcheck(): Promise<HealthStatus>;
  collect(brand: Brand, handle: string, ctx: CollectContext): Promise<Observation[]>;
}
