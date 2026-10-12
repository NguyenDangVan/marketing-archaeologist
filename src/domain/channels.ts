// Channels a brand can have a handle on. Which ones matter is configured per niche (niche.yaml `channels`).
export const CHANNELS = [
  "website",
  "youtube",
  "meta_ad_library",
  "facebook_page",
  "tiktok",
  "shopee",
  "tiktok_shop",
  "lazada",
  "instagram",
  "threads",
  "google_maps",
] as const;

export type Channel = (typeof CHANNELS)[number];

// Where an observed thing lives. `press` is industry media reporting on a brand (always secondary evidence).
// `dark_channel` is a manually imported capture from a closed channel (Locket, Zalo OA...), named in `dark_channel`.
export const EVIDENCE_SOURCES = [...CHANNELS, "press", "dark_channel"] as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

const URL_RE = /^https?:\/\/\S+$/;
const AT_HANDLE_RE = /^@[A-Za-z0-9._]{1,64}$/;

type HandleRule = { pattern: RegExp; hint: string };

const urlOnly = (host?: RegExp): HandleRule => ({
  pattern: host ? new RegExp(`^https?://([a-z0-9-]+\\.)*${host.source}(/\\S*)?$`, "i") : URL_RE,
  hint: host ? `URL thuộc ${host.source.replace(/\\/g, "")}` : "URL đầy đủ (https://...)",
});

const atOrUrl = (host: RegExp): HandleRule => ({
  pattern: new RegExp(`(${AT_HANDLE_RE.source})|(${urlOnly(host).pattern.source})`, "i"),
  hint: `@tên hoặc URL thuộc ${host.source.replace(/\\/g, "")}`,
});

export const HANDLE_RULES: Record<Channel, HandleRule> = {
  website: urlOnly(),
  youtube: {
    pattern: new RegExp(`^(UC[A-Za-z0-9_-]{22}|${AT_HANDLE_RE.source.slice(1, -1)}|https?://(www\\.)?youtube\\.com/\\S+)$`),
    hint: "channel id (UC...), @tên hoặc URL youtube.com",
  },
  meta_ad_library: { pattern: /^\d{5,20}$/, hint: "Page ID dạng số (lấy từ Thư viện quảng cáo Meta)" },
  facebook_page: urlOnly(/facebook\.com/),
  tiktok: atOrUrl(/tiktok\.com/),
  shopee: urlOnly(/shopee\.vn/),
  tiktok_shop: urlOnly(/tiktok\.com/),
  lazada: urlOnly(/lazada\.vn/),
  instagram: atOrUrl(/instagram\.com/),
  threads: atOrUrl(/threads\.(net|com)/),
  google_maps: urlOnly(/(google\.com|goo\.gl|maps\.app\.goo\.gl)/),
};

export function checkHandle(channel: Channel, handle: string): string | null {
  const rule = HANDLE_RULES[channel];
  return rule.pattern.test(handle.trim()) ? null : `handle "${handle}" không hợp lệ cho kênh ${channel}: cần ${rule.hint}`;
}
