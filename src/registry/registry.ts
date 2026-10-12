import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { checkHandle } from "../domain/channels.js";
import { BrandsFileSchema, NicheId, NicheSchema, type Brand, type Niche } from "../domain/schemas.js";
import { atomicWrite } from "../lib/fs.js";
import type { Workspace } from "../workspace.js";

export type Issue = { level: "error" | "warning"; file: string; message: string };

export type LoadedNiche = { niche: Niche; brands: Brand[]; issues: Issue[] };

export class RegistryError extends Error {
  constructor(
    message: string,
    readonly issues: Issue[] = [],
  ) {
    super(message);
  }
}

const nicheTemplate = (id: string, name: string, market: string) => `# yaml-language-server: $schema=https://raw.githubusercontent.com/NguyenDangVan/marketing-archaeologist/main/schemas/niche.schema.json
id: ${id}
name: "${name}"
market: ${market}
timezone: Asia/Ho_Chi_Minh
language: vi

# Kênh quan trọng với ngách này. Báo cáo đánh giá độ đầy đủ theo đúng danh sách này.
# Có thể dùng: website, youtube, meta_ad_library, facebook_page, tiktok, shopee,
#              tiktok_shop, lazada, instagram, threads, google_maps
channels:
  - website
  - meta_ad_library
  - facebook_page
  - tiktok
  - shopee

# Kênh tồn tại nhưng không quan sát tự động được. Báo cáo sẽ ghi rõ, không suy diễn.
dark_channels:
  - locket
  - zalo_oa

analysis:
  baseline_window: 30       # số bài gần nhất của chính kênh dùng làm mức bình thường
  outlier_multiplier: 3     # bài >= 3 lần trung vị là outlier
  long_running_ad_days: 30  # ad chạy >= 30 ngày là tín hiệu đáng học
`;

const brandsTemplate = `# yaml-language-server: $schema=https://raw.githubusercontent.com/NguyenDangVan/marketing-archaeologist/main/schemas/brands.schema.json
# Mỗi thương hiệu: handle cho các kênh trong niche.yaml. Ví dụ:
#
# brands:
#   - id: brand_vi_du
#     name: "Thương hiệu Ví Dụ"
#     handles:
#       website: https://vidu.vn
#       meta_ad_library: "123456789012345"   # Page ID trong Thư viện quảng cáo Meta
#       facebook_page: https://facebook.com/vidu
#       tiktok: "@vidu"
#       shopee: https://shopee.vn/vidu
#     dark_channels:
#       - channel: locket
#         note: "Locket Celebrity, công bố trên TikTok 2026-09"
brands: []
`;

const playbookTemplate = (name: string) => `# Playbook — ${name}

Chưa có nhận định nào. File này chỉ được thay đổi qua proposal đã duyệt (\`marc proposal accept\`).
`;

export function initNiche(ws: Workspace, id: string, opts: { name?: string; market?: string } = {}): string {
  const parsedId = NicheId.safeParse(id);
  if (!parsedId.success) throw new RegistryError(`id ngách không hợp lệ: "${id}" (cần kebab-case, ví dụ vn-skincare-d2c)`);

  const dir = ws.nicheDir(id);
  if (existsSync(dir)) throw new RegistryError(`ngách "${id}" đã tồn tại tại ${dir}`);

  const name = opts.name ?? id;
  atomicWrite(join(dir, "niche.yaml"), nicheTemplate(id, name.replace(/"/g, '\\"'), opts.market ?? "VN"));
  atomicWrite(join(dir, "brands.yaml"), brandsTemplate);
  atomicWrite(join(dir, "playbook.md"), playbookTemplate(name));
  return dir;
}

function readYaml(path: string, issues: Issue[]): unknown {
  try {
    return parseYaml(readFileSync(path, "utf8")) ?? {};
  } catch (err) {
    issues.push({ level: "error", file: path, message: `YAML lỗi cú pháp: ${(err as Error).message}` });
    return undefined;
  }
}

function zodIssues(file: string, err: z.ZodError): Issue[] {
  return err.issues.map((i) => ({
    level: "error" as const,
    file,
    message: `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`,
  }));
}

// Loads and checks a niche. Errors make the niche unusable; warnings are reported but tolerated
// (e.g. a brand simply has no Shopee shop — that channel is then reported as a missing source).
export function loadNiche(ws: Workspace, id: string): LoadedNiche {
  const dir = ws.nicheDir(id);
  const nichePath = join(dir, "niche.yaml");
  const brandsPath = join(dir, "brands.yaml");
  if (!existsSync(nichePath)) throw new RegistryError(`không tìm thấy ngách "${id}" (thiếu ${nichePath}). Chạy: marc init ${id}`);

  const issues: Issue[] = [];

  const nicheResult = NicheSchema.safeParse(readYaml(nichePath, issues));
  if (!nicheResult.success) issues.push(...zodIssues(nichePath, nicheResult.error));
  const niche = nicheResult.success ? nicheResult.data : null;
  if (niche && niche.id !== id) {
    issues.push({ level: "error", file: nichePath, message: `id "${niche.id}" không khớp tên thư mục "${id}"` });
  }

  let brands: Brand[] = [];
  if (!existsSync(brandsPath)) {
    issues.push({ level: "error", file: brandsPath, message: "thiếu brands.yaml" });
  } else {
    const brandsResult = BrandsFileSchema.safeParse(readYaml(brandsPath, issues));
    if (!brandsResult.success) issues.push(...zodIssues(brandsPath, brandsResult.error));
    else brands = brandsResult.data.brands;
  }

  for (const brand of brands) {
    for (const [channel, handle] of Object.entries(brand.handles) as [keyof typeof brand.handles, string][]) {
      const problem = checkHandle(channel, handle);
      if (problem) issues.push({ level: "error", file: brandsPath, message: `${brand.id}: ${problem}` });
      if (niche && !niche.channels.includes(channel)) {
        issues.push({
          level: "warning",
          file: brandsPath,
          message: `${brand.id}: có handle cho kênh ${channel} nhưng niche.yaml không khai báo kênh này — sẽ bị bỏ qua`,
        });
      }
    }
    for (const channel of niche?.channels ?? []) {
      if (!brand.handles[channel]) {
        issues.push({
          level: "warning",
          file: brandsPath,
          message: `${brand.id}: chưa có handle cho kênh ${channel} — báo cáo sẽ ghi là thiếu nguồn`,
        });
      }
    }
  }

  if (niche && brands.length === 0 && !issues.some((i) => i.file === brandsPath && i.level === "error")) {
    issues.push({ level: "warning", file: brandsPath, message: "chưa khai báo thương hiệu nào" });
  }

  const errors = issues.filter((i) => i.level === "error");
  if (!niche || errors.length > 0) throw new RegistryError(`ngách "${id}" có ${errors.length} lỗi cấu hình`, issues);
  return { niche, brands, issues };
}
