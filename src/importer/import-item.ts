import { readFileSync } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";
import { z } from "zod";
import { CHANNELS, type Channel } from "../domain/channels.js";
import { EVIDENCE_KINDS, EvidenceSourceSchema, MetricsSchema, type Brand, type Niche } from "../domain/schemas.js";
import { parseSoldCount } from "../domain/sold-count.js";
import type { Store } from "../store/store.js";
import { recordObservation, type RecordResult } from "./record.js";

// One item for `marc import` — the same shape whether it comes from CLI flags or a JSON batch (--from).
export const ImportItemSchema = z
  .object({
    brand: z.string().optional(), // brand id; may be omitted only for source "press"
    source: EvidenceSourceSchema,
    dark_channel: z.string().min(1).optional(),
    kind: z.enum(EVIDENCE_KINDS),
    url: z.string(),
    secondary: z.boolean().default(false),
    text: z.string().nullable().optional(),
    items: z.array(z.string()).optional(),
    metrics: z.record(z.string(), z.unknown()).default({}),
    snapshot: z.string().optional(), // file path, absolute or relative to `baseDir`
    observed_at: z.string().optional(),
    published_at: z.string().nullable().optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ImportItem = z.input<typeof ImportItemSchema>;

export class ImportError extends Error {}

// sold_count_min is derived from sold_count_display when not given.
export function normalizeMetrics(raw: Record<string, unknown>) {
  const m = { ...raw };
  if (typeof m.sold_count_display === "string" && m.sold_count_min === undefined) {
    const min = parseSoldCount(m.sold_count_display);
    if (min !== null) m.sold_count_min = min;
  }
  return MetricsSchema.parse(m);
}

export function importItem(
  store: Store,
  ctx: { niche: Niche; brands: Brand[]; collectedBy: string; baseDir: string; now: Date; warn: (msg: string) => void },
  input: ImportItem,
): RecordResult {
  const item = ImportItemSchema.parse(input);
  const { niche, brands, warn } = ctx;

  const brand = item.brand ? brands.find((b) => b.id === item.brand) : undefined;
  if (item.brand && !brand) throw new ImportError(`không có thương hiệu "${item.brand}" trong brands.yaml`);
  if (!brand && item.source !== "press") throw new ImportError("cần brand (chỉ source press được bỏ trống)");

  if ((CHANNELS as readonly string[]).includes(item.source) && !niche.channels.includes(item.source as Channel)) {
    warn(`kênh ${item.source} không có trong niche.yaml của ${niche.id}; vẫn nhập.`);
  }
  if (item.source === "dark_channel" && item.dark_channel) {
    const declared =
      niche.dark_channels.includes(item.dark_channel) || brand?.dark_channels.some((d) => d.channel === item.dark_channel);
    if (!declared) warn(`kênh tối "${item.dark_channel}" chưa được khai báo trong niche.yaml/brands.yaml.`);
  }

  const observedAt = item.observed_at ? new Date(item.observed_at) : ctx.now;
  if (Number.isNaN(observedAt.getTime())) throw new ImportError(`observed_at không hợp lệ: ${item.observed_at}`);

  let snapshot: { ext: string; data: Uint8Array } | undefined;
  if (item.snapshot) {
    const path = isAbsolute(item.snapshot) ? item.snapshot : resolve(ctx.baseDir, item.snapshot);
    try {
      snapshot = { ext: extname(path).slice(1) || "bin", data: new Uint8Array(readFileSync(path)) };
    } catch {
      throw new ImportError(`không đọc được snapshot: ${path}`);
    }
  }

  return recordObservation(
    store,
    {
      source: item.source,
      ...(item.dark_channel ? { dark_channel: item.dark_channel } : {}),
      evidence_class: item.secondary || item.source === "press" ? "secondary" : "primary",
      kind: item.kind,
      url: item.url,
      published_at: item.published_at ?? null,
      text: item.text ?? null,
      items: item.items ?? [],
      metrics: normalizeMetrics(item.metrics),
      ...(item.raw ? { raw: item.raw } : {}),
      ...(snapshot ? { snapshot } : {}),
    },
    { niche: niche.id, brandId: brand?.id ?? null, collectedBy: ctx.collectedBy, observedAt, timeZone: niche.timezone },
  );
}
