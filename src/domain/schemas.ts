// Single source of truth for data shapes. JSON Schemas in /schemas are generated from here (pnpm schemas).
import { z } from "zod";
import { CHANNELS, EVIDENCE_SOURCES } from "./channels.js";

const ULID = "[0-9A-HJKMNP-TV-Z]{26}";

export const NicheId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id ngách dạng kebab-case, ví dụ vn-skincare-d2c");
export const BrandId = z.string().regex(/^brand_[a-z0-9_]+$/, "id thương hiệu dạng brand_ten_thuong_hieu");
export const EvidenceId = z.string().regex(new RegExp(`^ev_${ULID}$`));
export const ClaimId = z.string().regex(new RegExp(`^cl_${ULID}$`));
export const ProposalId = z.string().regex(new RegExp(`^prop_${ULID}$`));

export const ChannelSchema = z.enum(CHANNELS);
export const EvidenceSourceSchema = z.enum(EVIDENCE_SOURCES);

const DateTime = z.iso.datetime({ offset: true });
const DateOrDateTime = z.union([z.iso.date(), DateTime]);

// ---------- Registry (files the user edits) ----------

export const NicheSchema = z.object({
  id: NicheId,
  name: z.string().min(1),
  market: z.string().regex(/^[A-Z]{2}$/, "mã quốc gia ISO 3166-1, ví dụ VN"),
  timezone: z.string().min(1).default("Asia/Ho_Chi_Minh"),
  language: z.string().min(2).default("vi"),
  channels: z.array(ChannelSchema).min(1),
  // Channels that exist but cannot be observed automatically (Locket, Zalo OA, closed groups...).
  dark_channels: z.array(z.string().min(1)).default([]),
  analysis: z
    .object({
      baseline_window: z.int().positive().default(30),
      outlier_multiplier: z.number().gt(1).default(3),
      long_running_ad_days: z.int().positive().default(30),
    })
    .prefault({}),
});

export const DarkChannelSchema = z.object({
  channel: z.string().min(1),
  note: z.string().optional(),
  known_from: z.array(EvidenceId).default([]),
});

export const BrandSchema = z.object({
  id: BrandId,
  name: z.string().min(1),
  handles: z.partialRecord(ChannelSchema, z.string().min(1)).default({}),
  dark_channels: z.array(DarkChannelSchema).default([]),
});

export const BrandsFileSchema = z
  .object({ brands: z.array(BrandSchema).default([]) })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.brands.forEach((b, i) => {
      if (seen.has(b.id)) ctx.addIssue({ code: "custom", message: `id thương hiệu bị trùng: ${b.id}`, path: ["brands", i, "id"] });
      seen.add(b.id);
    });
  });

// ---------- Evidence ----------

export const EVIDENCE_KINDS = [
  "ad",
  "post",
  "video",
  "page",
  "comment_batch",
  "pricing",
  "product_listing",
  "review_batch",
  "article",
] as const;

// Only what is visible on the page, measured at observed_at.
export const MetricsSchema = z
  .object({
    views: z.int().nonnegative(),
    reactions: z.int().nonnegative(),
    likes: z.int().nonnegative(),
    comments: z.int().nonnegative(),
    shares: z.int().nonnegative(),
    ad_started_running: z.iso.date(),
    sold_count_display: z.string().min(1), // exactly as displayed, e.g. "10,2k"
    sold_count_min: z.int().nonnegative(), // normalized lower bound
    rating: z.number().min(0).max(5),
    rating_count: z.int().nonnegative(),
    price_vnd: z.int().nonnegative(),
  })
  .partial()
  .strict();

export const EvidenceSchema = z
  .object({
    id: EvidenceId,
    niche: NicheId,
    brand_id: BrandId.nullable(),
    source: EvidenceSourceSchema,
    dark_channel: z.string().min(1).optional(),
    evidence_class: z.enum(["primary", "secondary"]).default("primary"),
    kind: z.enum(EVIDENCE_KINDS),
    url: z.url({ protocol: /^https?$/ }),
    observed_at: DateTime,
    // "<connector>@<semver>" or "manual" / "manual:<who>"
    collected_by: z.string().regex(/^([a-z0-9_-]+@\d+\.\d+\.\d+|manual(:\S+)?)$/),
    snapshot_path: z.string().min(1).nullable(),
    content_hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    published_at: DateOrDateTime.nullable().default(null),
    // Visible text: ad copy, caption, headline, article excerpt.
    text: z.string().nullable().default(null),
    // Individual text items such as comments or reviews — content only, never the author's name, avatar or id.
    items: z.array(z.string()).default([]),
    metrics: MetricsSchema.default({}),
    raw: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((ev, ctx) => {
    if (ev.source === "press" && ev.evidence_class !== "secondary") {
      ctx.addIssue({ code: "custom", message: "nguồn press luôn là evidence_class: secondary", path: ["evidence_class"] });
    }
    if ((ev.source === "dark_channel") !== (ev.dark_channel !== undefined)) {
      ctx.addIssue({ code: "custom", message: "dark_channel bắt buộc khi và chỉ khi source là dark_channel", path: ["dark_channel"] });
    }
  });

// ---------- Feature (LLM-extracted, week 2) ----------

export const FeatureSchema = z.object({
  evidence_id: EvidenceId,
  extractor: z.string().min(1), // "features@v3 (model, prompt version)"
  hook: z.string().nullable(),
  format: z.string().nullable(), // talking_head | before_after | ugc_review | livestream_clip | carousel | static_image | ...
  cta: z.string().nullable(),
  offer: z.string().nullable(),
  price_points_vnd: z.array(z.int().nonnegative()).default([]),
  topics: z.array(z.string()).default([]),
  language_notes: z.string().nullable().default(null),
});

// ---------- Claim ----------

export const ClaimSchema = z.object({
  id: ClaimId,
  niche: NicheId,
  level: z.enum(["observation", "pattern", "validated"]),
  kind: z.enum(["fact", "inference"]),
  statement: z.string().min(1),
  scope: z.object({
    niche: NicheId,
    market: z.string().regex(/^[A-Z]{2}$/),
    channel: EvidenceSourceSchema.optional(),
    brand_ids: z.array(BrandId).default([]),
  }),
  evidence_ids: z.array(EvidenceId).min(1, "mọi claim phải trỏ về ít nhất một evidence"),
  counter_evidence_ids: z.array(EvidenceId).default([]),
  confidence: z.enum(["low", "medium", "high"]),
  status: z.enum(["hypothesis", "supported", "contradicted", "stale"]),
  first_seen_at: DateTime,
  last_verified_at: DateTime.nullable().default(null),
  expires_at: DateTime.nullable().default(null),
});

// What an agent submits to `marc claim add`; marc fills id, niche, scope and timestamps.
export const ClaimInputSchema = z.object({
  level: ClaimSchema.shape.level,
  kind: ClaimSchema.shape.kind,
  statement: ClaimSchema.shape.statement,
  channel: EvidenceSourceSchema.optional(),
  evidence_ids: ClaimSchema.shape.evidence_ids,
  counter_evidence_ids: z.array(EvidenceId).default([]),
  confidence: ClaimSchema.shape.confidence,
  status: ClaimSchema.shape.status.optional(), // default: fact → supported, inference → hypothesis
  expires_at: DateTime.nullable().default(null),
});

// ---------- Change proposal ----------

export const ChangeProposalSchema = z.object({
  id: ProposalId,
  niche: NicheId,
  target: z.string().min(1), // e.g. niches/<niche>/playbook.md
  trigger_evidence_ids: z.array(EvidenceId).min(1),
  diff: z.string().min(1), // unified diff
  rationale: z.string().min(1),
  decision: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  decided_by: z.string().nullable().default(null),
  decided_at: DateTime.nullable().default(null),
  created_at: DateTime,
});

export type Niche = z.infer<typeof NicheSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type BrandsFile = z.infer<typeof BrandsFileSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidenceInput = z.input<typeof EvidenceSchema>;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type Feature = z.infer<typeof FeatureSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimInput = z.input<typeof ClaimInputSchema>;
export type ChangeProposal = z.infer<typeof ChangeProposalSchema>;

// Schemas published as JSON Schema files, keyed by file stem.
export const PUBLISHED_SCHEMAS = {
  niche: NicheSchema,
  brands: BrandsFileSchema,
  evidence: EvidenceSchema,
  feature: FeatureSchema,
  claim: ClaimSchema,
  "claim-input": ClaimInputSchema,
  "change-proposal": ChangeProposalSchema,
} as const;
