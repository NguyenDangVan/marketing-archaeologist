// Normalizes marketplace "đã bán" strings to a lower bound.
// Examples: "999" → 999, "10,2k" → 10200, "10k+" → 10000, "1,2tr" → 1200000, "Đã bán 5,6k" → 5600.
// The display is rounded, so the result is a lower bound, never an exact count.
export function parseSoldCount(display: string): number | null {
  const m = display
    .toLowerCase()
    .replace(/đã bán/g, "")
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(k|n|nghìn|ngàn|tr|triệu|m)?\s*\+?$/);
  if (!m) return null;

  const [, num, unit] = m;
  const multiplier =
    unit === undefined ? 1 : ["k", "n", "nghìn", "ngàn"].includes(unit) ? 1_000 : 1_000_000;

  // Without a unit, "1.234" / "1,234" are thousands separators; with a unit they are decimals.
  const value = unit === undefined ? Number(num!.replace(/[.,]/g, "")) : Number(num!.replace(",", "."));
  return Number.isFinite(value) ? Math.round(value * multiplier) : null;
}
