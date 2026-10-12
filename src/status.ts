import type { Brand, Evidence, Niche } from "./domain/schemas.js";
import type { Channel } from "./domain/channels.js";

export type ChannelCoverage = {
  channel: Channel;
  handle: string | null;
  evidence_count: number;
  last_observed_at: string | null;
};

export type BrandStatus = {
  id: string;
  name: string;
  channels: ChannelCoverage[];
  missing_channels: Channel[]; // declared for the niche but no evidence yet
  dark_channels: { channel: string; note?: string; evidence_count: number }[];
  secondary_count: number;
};

export type NicheStatus = {
  niche: { id: string; name: string; market: string; channels: Channel[]; dark_channels: string[] };
  brands: BrandStatus[];
  totals: { evidence: number; claims: number; unattributed_press: number };
};

// What has been collected so far, per brand × declared channel — lets an agent plan what to look at next.
export function nicheStatus(niche: Niche, brands: Brand[], evidence: Evidence[], claimCount: number): NicheStatus {
  const byBrand = new Map<string, Evidence[]>();
  for (const e of evidence) if (e.brand_id) byBrand.set(e.brand_id, [...(byBrand.get(e.brand_id) ?? []), e]);

  return {
    niche: { id: niche.id, name: niche.name, market: niche.market, channels: niche.channels, dark_channels: niche.dark_channels },
    brands: brands.map((b) => {
      const own = byBrand.get(b.id) ?? [];
      const channels = niche.channels.map((channel) => {
        const items = own.filter((e) => e.source === channel);
        return {
          channel,
          handle: b.handles[channel] ?? null,
          evidence_count: items.length,
          last_observed_at: items.reduce<string | null>((max, e) => (max === null || e.observed_at > max ? e.observed_at : max), null),
        };
      });
      const darkNames = new Set([...niche.dark_channels, ...b.dark_channels.map((d) => d.channel)]);
      return {
        id: b.id,
        name: b.name,
        channels,
        missing_channels: channels.filter((c) => c.evidence_count === 0).map((c) => c.channel),
        dark_channels: [...darkNames].map((channel) => {
          const note = b.dark_channels.find((d) => d.channel === channel)?.note;
          return {
            channel,
            ...(note ? { note } : {}),
            evidence_count: own.filter((e) => e.source === "dark_channel" && e.dark_channel === channel).length,
          };
        }),
        secondary_count: own.filter((e) => e.evidence_class === "secondary").length,
      };
    }),
    totals: {
      evidence: evidence.length,
      claims: claimCount,
      unattributed_press: evidence.filter((e) => e.brand_id === null).length,
    },
  };
}
