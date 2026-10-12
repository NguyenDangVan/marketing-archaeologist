import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Command, Option } from "commander";
import { z } from "zod";
import { EVIDENCE_SOURCES, type EvidenceSource } from "../domain/channels.js";
import { EVIDENCE_KINDS, FeatureSchema, type Claim, type EvidenceKind } from "../domain/schemas.js";
import { buildClaims } from "../claims/claims.js";
import { connectorFor } from "../connectors/index.js";
import { ImportError, importItem, type ImportItem } from "../importer/import-item.js";
import { initNiche, loadNiche, RegistryError, type Issue } from "../registry/registry.js";
import { nicheStatus } from "../status.js";
import { Store } from "../store/store.js";
import { Workspace } from "../workspace.js";

export const VERSION = "0.1.0";

export type Io = { out: (line: string) => void; err: (line: string) => void; exitCode: number; stdin?: () => string };

class UsageError extends Error {}

const TEXT_METRICS = new Set(["ad_started_running", "sold_count_display"]);

function parseMetricFlags(pairs: string[]): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq <= 0) throw new UsageError(`--metric cần dạng khóa=giá_trị, nhận được "${pair}"`);
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    raw[key] = TEXT_METRICS.has(key) ? value : Number(value.replace(/[_\s]/g, ""));
  }
  return raw;
}

// Reads JSON from a file or "-" (stdin). Returns the parsed value and the directory relative paths resolve against.
function readJsonInput(io: Io, from: string): { value: unknown; baseDir: string } {
  const text = from === "-" ? (io.stdin ?? (() => readFileSync(0, "utf8")))() : readFileSync(from, "utf8");
  try {
    return { value: JSON.parse(text), baseDir: from === "-" ? process.cwd() : dirname(resolve(from)) };
  } catch (err) {
    throw new UsageError(`JSON không hợp lệ (${from}): ${(err as Error).message}`);
  }
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [v]);

function printIssues(io: Io, issues: Issue[]) {
  for (const i of issues) (i.level === "error" ? io.err : io.out)(`  ${i.level === "error" ? "LỖI" : "cảnh báo"}  ${i.message}  (${i.file})`);
}

// Wraps an action with uniform error reporting. Exit codes: 0 ok, 1 error, 2 not implemented yet.
function run(io: Io, fn: () => void) {
  try {
    fn();
  } catch (err) {
    io.exitCode = 1;
    if (err instanceof RegistryError) {
      io.err(`LỖI: ${err.message}`);
      printIssues(io, err.issues);
    } else if (err instanceof z.ZodError) {
      io.err(`LỖI dữ liệu:\n${z.prettifyError(err)}`);
    } else if (err instanceof UsageError || err instanceof ImportError) {
      io.err(`LỖI: ${err.message}`);
    } else {
      throw err;
    }
  }
}

function withStore<T>(ws: Workspace, fn: (store: Store) => T): T {
  const store = new Store(ws);
  try {
    return fn(store);
  } finally {
    store.close();
  }
}

const notYet = (io: Io, what: string, week: number) => () => {
  io.err(`"${what}" chưa được triển khai (dự kiến tuần ${week} theo PRD §14).`);
  io.exitCode = 2;
};

const describeError = (err: unknown) =>
  err instanceof z.ZodError ? z.prettifyError(err).replace(/\n/g, "; ") : (err as Error).message;

export function buildProgram(io: Io): Command {
  const program = new Command("marc")
    .description("Marketing Archaeologist — kho bằng chứng và bộ kiểm tra cho agent reverse engineer marketing theo ngách")
    .version(VERSION)
    .option("-w, --workspace <dir>", "thư mục làm việc (mặc định: $MARC_WORKSPACE hoặc thư mục hiện tại)")
    .configureOutput({ writeOut: (s) => io.out(s.trimEnd()), writeErr: (s) => io.err(s.trimEnd()) })
    .exitOverride();

  const ws = () => Workspace.resolve(program.opts<{ workspace?: string }>().workspace);

  program
    .command("init")
    .description("tạo ngách mới: niches/<niche>/{niche.yaml,brands.yaml,playbook.md}")
    .argument("<niche>", "id ngách, kebab-case (ví dụ vn-skincare-d2c)")
    .option("--name <name>", "tên hiển thị")
    .option("--market <code>", "mã quốc gia", "VN")
    .action((niche: string, opts: { name?: string; market: string }) =>
      run(io, () => {
        const dir = initNiche(ws(), niche, opts);
        io.out(`Đã tạo ngách tại ${dir}`);
        io.out(`Tiếp theo: khai báo thương hiệu trong brands.yaml rồi chạy: marc validate ${niche}`);
      }),
    );

  program
    .command("validate")
    .description("kiểm tra niche.yaml và brands.yaml")
    .argument("<niche>")
    .action((niche: string) =>
      run(io, () => {
        const { brands, issues } = loadNiche(ws(), niche);
        printIssues(io, issues);
        io.out(`OK: ${brands.length} thương hiệu, ${issues.length} cảnh báo.`);
      }),
    );

  program
    .command("status")
    .description("đã thu thập được gì: thương hiệu × kênh, kênh còn thiếu, kênh tối")
    .argument("<niche>")
    .option("--json", "in JSON (dành cho agent)")
    .action((nicheId: string, opts: { json?: boolean }) =>
      run(io, () => {
        const w = ws();
        const { niche, brands } = loadNiche(w, nicheId);
        const status = withStore(w, (s) => nicheStatus(niche, brands, s.listEvidence({ niche: niche.id }), s.listClaims({ niche: niche.id }).length));
        if (opts.json) return io.out(JSON.stringify(status, null, 2));

        io.out(`${status.niche.name} (${status.niche.id}, ${status.niche.market}) — ${status.totals.evidence} bằng chứng, ${status.totals.claims} nhận định`);
        for (const b of status.brands) {
          io.out(`\n${b.name} (${b.id})`);
          for (const c of b.channels) {
            const last = c.last_observed_at ? `, gần nhất ${c.last_observed_at.slice(0, 10)}` : "";
            io.out(`  ${c.channel.padEnd(16)} ${c.handle ? c.evidence_count + " bằng chứng" + last : "chưa có handle"}`);
          }
          for (const d of b.dark_channels) io.out(`  ${("[tối] " + d.channel).padEnd(16)} không quan sát tự động; ${d.evidence_count} ảnh nhập tay`);
        }
      }),
    );

  program
    .command("import")
    .description("ghi bằng chứng: một mục qua cờ, hoặc nhiều mục qua --from <file.json|->")
    .argument("<niche>")
    .option("--from <file>", "JSON (một object hoặc mảng) theo dạng ImportItem; '-' để đọc stdin")
    .addOption(new Option("--source <source>", "nơi quan sát").choices(EVIDENCE_SOURCES))
    .addOption(new Option("--kind <kind>", "loại bằng chứng").choices(EVIDENCE_KINDS))
    .option("--url <url>", "URL gốc")
    .option("--brand <id>", "id thương hiệu (bắt buộc trừ khi --source press)")
    .option("--dark-channel <name>", "tên kênh tối khi --source dark_channel (ví dụ locket)")
    .option("--text <text>", "văn bản nhìn thấy: caption, nội dung ad, tiêu đề")
    .option("--item <text>", "một comment/review (không kèm tên người viết), lặp lại được", (v, acc: string[]) => [...acc, v], [])
    .option("--metric <key=value>", "số liệu nhìn thấy, lặp lại được (views=1200, sold_count_display=10,2k)", (v, acc: string[]) => [...acc, v], [])
    .option("--snapshot <file>", "ảnh chụp / HTML lưu kèm")
    .option("--observed-at <iso>", "thời điểm quan sát (mặc định: bây giờ)")
    .option("--published-at <date>", "ngày đăng (YYYY-MM-DD hoặc ISO)")
    .option("--secondary", "đánh dấu nguồn thứ cấp (tự bật với --source press)")
    .option("--by <name>", "người/agent nhập, ghi vào collected_by")
    .option("--json", "in kết quả JSON")
    .action(
      (
        nicheId: string,
        opts: {
          from?: string;
          source?: EvidenceSource;
          kind?: EvidenceKind;
          url?: string;
          brand?: string;
          darkChannel?: string;
          text?: string;
          item: string[];
          metric: string[];
          snapshot?: string;
          observedAt?: string;
          publishedAt?: string;
          secondary?: boolean;
          by?: string;
          json?: boolean;
        },
      ) =>
        run(io, () => {
          const w = ws();
          const { niche, brands } = loadNiche(w, nicheId);

          let items: unknown[];
          let baseDir = process.cwd();
          if (opts.from) {
            if (opts.source || opts.kind || opts.url) throw new UsageError("dùng --from hoặc các cờ --source/--kind/--url, không dùng cả hai");
            const input = readJsonInput(io, opts.from);
            items = asArray(input.value);
            baseDir = input.baseDir;
          } else {
            if (!opts.source || !opts.kind || !opts.url) throw new UsageError("cần --source, --kind và --url (hoặc --from)");
            const item: ImportItem = {
              source: opts.source,
              kind: opts.kind,
              url: opts.url,
              metrics: parseMetricFlags(opts.metric),
              ...(opts.brand ? { brand: opts.brand } : {}),
              ...(opts.darkChannel ? { dark_channel: opts.darkChannel } : {}),
              ...(opts.text ? { text: opts.text } : {}),
              ...(opts.item.length ? { items: opts.item } : {}),
              ...(opts.snapshot ? { snapshot: opts.snapshot } : {}),
              ...(opts.observedAt ? { observed_at: opts.observedAt } : {}),
              ...(opts.publishedAt ? { published_at: opts.publishedAt } : {}),
              ...(opts.secondary ? { secondary: true } : {}),
            };
            items = [item];
          }

          const ctx = {
            niche,
            brands,
            collectedBy: opts.by ? `manual:${opts.by.replace(/\s+/g, "_")}` : "manual",
            baseDir,
            now: new Date(),
            warn: (m: string) => io.out(`cảnh báo  ${m}`),
          };

          // Items are independent observations: one bad item does not block the others.
          const results = withStore(w, (store) =>
            items.map((raw, index) => {
              try {
                const r = importItem(store, ctx, raw as ImportItem);
                return r.status === "inserted"
                  ? { index, status: "inserted" as const, id: r.evidence.id, snapshot_path: r.evidence.snapshot_path }
                  : { index, status: "duplicate" as const, id: r.existingId };
              } catch (err) {
                if (!(err instanceof z.ZodError || err instanceof ImportError)) throw err;
                return { index, status: "error" as const, error: describeError(err) };
              }
            }),
          );

          if (results.some((r) => r.status === "error")) io.exitCode = 1;
          if (opts.json) return io.out(JSON.stringify(results, null, 2));
          for (const r of results) {
            const prefix = items.length > 1 ? `[${r.index}] ` : "";
            if (r.status === "inserted") io.out(`${prefix}Đã lưu ${r.id}${r.snapshot_path ? ` (snapshot: ${r.snapshot_path})` : ""}`);
            else if (r.status === "duplicate") io.out(`${prefix}Bỏ qua: trùng với ${r.id} (cùng nội dung, cùng ngày).`);
            else io.err(`${prefix}LỖI: ${r.error}`);
          }
        }),
    );

  program
    .command("evidence")
    .description("liệt kê bằng chứng đã lưu")
    .argument("<niche>")
    .option("--brand <id>")
    .option("--json", "in JSON")
    .action((nicheId: string, opts: { brand?: string; json?: boolean }) =>
      run(io, () =>
        withStore(ws(), (store) => {
          const items = store.listEvidence({ niche: nicheId, ...(opts.brand ? { brandId: opts.brand } : {}) });
          if (opts.json) return io.out(JSON.stringify(items, null, 2));
          for (const e of items) {
            const where = e.source === "dark_channel" ? `dark_channel:${e.dark_channel}` : e.source;
            io.out(`${e.id}  ${e.observed_at.slice(0, 10)}  ${e.brand_id ?? "-"}  ${where}/${e.kind}  ${e.url}`);
          }
          io.out(`${items.length} bằng chứng.`);
        }),
      ),
    );

  const feature = program.command("feature").description("đặc trưng do agent trích từ bằng chứng (hook, format, CTA, ưu đãi...)");
  feature
    .command("add")
    .description("ghi đặc trưng; cùng evidence + extractor thì thay bản cũ")
    .argument("<niche>")
    .requiredOption("--from <file>", "JSON (object hoặc mảng) theo schemas/feature.schema.json; '-' để đọc stdin")
    .action((nicheId: string, opts: { from: string }) =>
      run(io, () => {
        const w = ws();
        loadNiche(w, nicheId);
        const features = asArray(readJsonInput(io, opts.from).value).map((f) => FeatureSchema.parse(f));
        withStore(w, (store) => {
          const found = store.getEvidenceMany(features.map((f) => f.evidence_id));
          const bad = features.filter((f) => found.get(f.evidence_id)?.niche !== nicheId).map((f) => f.evidence_id);
          if (bad.length) throw new UsageError(`evidence không tồn tại trong ngách ${nicheId}: ${[...new Set(bad)].join(", ")}`);
          for (const f of features) store.upsertFeature(f);
        });
        io.out(`Đã ghi ${features.length} đặc trưng.`);
      }),
    );

  const claim = program.command("claim").description("nhận định có dẫn chứng");
  claim
    .command("add")
    .description("ghi nhận định sau khi kiểm tra luật bằng chứng; một mục sai thì không ghi mục nào")
    .argument("<niche>")
    .requiredOption("--from <file>", "JSON (object hoặc mảng) theo schemas/claim-input.schema.json; '-' để đọc stdin")
    .option("--json", "in các claim đã ghi dạng JSON")
    .action((nicheId: string, opts: { from: string; json?: boolean }) =>
      run(io, () => {
        const w = ws();
        const { niche } = loadNiche(w, nicheId);
        const inputs = asArray(readJsonInput(io, opts.from).value);
        const claims = withStore(w, (store) => {
          const { claims, errors } = buildClaims(inputs, niche, (ids) => store.getEvidenceMany(ids));
          if (errors.length) {
            for (const e of errors) io.err(`[${e.index}] LỖI: ${e.message}`);
            throw new UsageError(`${errors.length} lỗi — không ghi nhận định nào.`);
          }
          store.insertClaims(claims);
          return claims;
        });
        if (opts.json) return io.out(JSON.stringify(claims, null, 2));
        for (const c of claims) io.out(`Đã ghi ${c.id}  [${c.level}/${c.kind}/${c.confidence}]  ${c.statement}`);
      }),
    );
  claim
    .command("list")
    .description("liệt kê nhận định kèm bằng chứng")
    .argument("<niche>")
    .addOption(new Option("--level <level>").choices(["observation", "pattern", "validated"]))
    .option("--json", "in JSON")
    .action((nicheId: string, opts: { level?: Claim["level"]; json?: boolean }) =>
      run(io, () =>
        withStore(ws(), (store) => {
          const claims = store.listClaims({ niche: nicheId, ...(opts.level ? { level: opts.level } : {}) });
          if (opts.json) return io.out(JSON.stringify(claims, null, 2));
          for (const c of claims) {
            io.out(`${c.id}  [${c.level}/${c.kind}/${c.confidence}/${c.status}]  ${c.statement}`);
            io.out(`    bằng chứng: ${c.evidence_ids.join(", ")}${c.counter_evidence_ids.length ? `  | phản ví dụ: ${c.counter_evidence_ids.join(", ")}` : ""}`);
          }
          io.out(`${claims.length} nhận định.`);
        }),
      ),
    );

  program
    .command("collect")
    .description("thu thập tự động qua connector (hiện mới báo kênh nào đã có connector)")
    .argument("<niche>")
    .action((nicheId: string) =>
      run(io, () => {
        const { niche, brands } = loadNiche(ws(), nicheId);
        let missing = 0;
        for (const channel of niche.channels) {
          const connector = connectorFor(channel);
          const withHandle = brands.filter((b) => b.handles[channel]).length;
          if (!connector) missing++;
          io.out(
            `${channel.padEnd(16)} ${connector ? `${connector.id}@${connector.version}` : "chưa có connector → agent tự xem rồi marc import"}  (${withHandle}/${brands.length} thương hiệu có handle)`,
          );
        }
        if (missing === niche.channels.length) {
          io.err("Chưa có connector tự động nào. Không thu thập gì.");
          io.exitCode = 2;
        }
      }),
    );

  program.command("analyze").description("baseline, outlier, độ bền ad, tốc độ bán (tính bằng code)").argument("<niche>").action(notYet(io, "analyze", 2));
  program.command("diff").description("phát hiện thay đổi và sinh proposal").argument("<niche>").action(notYet(io, "diff", 4));
  program.command("proposal").description("duyệt proposal: list | accept <id> | reject <id>").argument("[args...]").action(notYet(io, "proposal", 4));
  program.command("eval").description("chạy benchmark trên bộ đáp án").argument("<niche>").action(notYet(io, "eval", 3));

  return program;
}
