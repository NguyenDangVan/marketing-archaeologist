import { newId } from "../domain/ids.js";
import { ClaimInputSchema, type Claim, type Evidence, type Niche } from "../domain/schemas.js";

// Turns agent-submitted claims into stored claims, enforcing the evidence rules in code rather than in a prompt.
// Returns per-item errors; callers store nothing unless every item is valid.
export function buildClaims(
  inputs: unknown[],
  niche: Niche,
  lookup: (ids: string[]) => Map<string, Evidence>,
  now: Date = new Date(),
): { claims: Claim[]; errors: { index: number; message: string }[] } {
  const claims: Claim[] = [];
  const errors: { index: number; message: string }[] = [];

  inputs.forEach((raw, index) => {
    const parsed = ClaimInputSchema.safeParse(raw);
    if (!parsed.success) {
      for (const i of parsed.error.issues) errors.push({ index, message: `${i.path.join(".") || "(gốc)"}: ${i.message}` });
      return;
    }
    const c = parsed.data;
    const fail = (message: string) => errors.push({ index, message });

    const found = lookup([...c.evidence_ids, ...c.counter_evidence_ids]);
    const missing = [...c.evidence_ids, ...c.counter_evidence_ids].filter((id) => !found.has(id));
    if (missing.length) return fail(`evidence không tồn tại: ${missing.join(", ")}`);

    const evidence = c.evidence_ids.map((id) => found.get(id)!);
    const foreign = [...found.values()].filter((e) => e.niche !== niche.id);
    if (foreign.length) return fail(`evidence thuộc ngách khác: ${foreign.map((e) => e.id).join(", ")}`);

    const overlap = c.evidence_ids.filter((id) => c.counter_evidence_ids.includes(id));
    if (overlap.length) return fail(`một evidence không thể vừa ủng hộ vừa phản bác: ${overlap.join(", ")}`);

    if (c.level === "validated") {
      return fail("cấp validated cần kết quả thử nghiệm của chính người dùng — MVP chưa hỗ trợ; dùng observation hoặc pattern");
    }

    const brandIds = [...new Set(evidence.map((e) => e.brand_id).filter((b): b is string => b !== null))];
    if (c.level === "pattern" && brandIds.length < 2) {
      return fail(`pattern cần bằng chứng từ ≥ 2 thương hiệu độc lập (hiện có ${brandIds.length}); hạ xuống observation`);
    }
    if (evidence.every((e) => e.evidence_class === "secondary") && c.confidence !== "low") {
      return fail("claim chỉ dựa trên nguồn thứ cấp phải có confidence: low");
    }
    if (c.kind === "inference" && c.confidence === "high") {
      return fail("suy luận (inference) không được có confidence: high");
    }

    claims.push({
      id: newId("cl", now.getTime()),
      niche: niche.id,
      level: c.level,
      kind: c.kind,
      statement: c.statement,
      scope: { niche: niche.id, market: niche.market, ...(c.channel ? { channel: c.channel } : {}), brand_ids: brandIds },
      evidence_ids: c.evidence_ids,
      counter_evidence_ids: c.counter_evidence_ids,
      confidence: c.confidence,
      status: c.status ?? (c.kind === "fact" ? "supported" : "hypothesis"),
      first_seen_at: now.toISOString(),
      last_verified_at: now.toISOString(),
      expires_at: c.expires_at,
    });
  });

  return { claims, errors };
}
