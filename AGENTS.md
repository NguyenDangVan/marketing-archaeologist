# AGENTS.md

Hướng dẫn cho coding agent (và người) làm việc trong repo này. Đọc PRD trước: [docs/specs/2026-10-12-marketing-archaeologist-prd.md](docs/specs/2026-10-12-marketing-archaeologist-prd.md).

## Sản phẩm trong một câu
Một **agent skill** (`skills/marketing-archaeologist/`) hướng dẫn agent đi xem dấu vết marketing công khai của đối thủ trong một ngách, và công cụ **`marc`** để agent ghi lại thành **bằng chứng** (evidence) có URL, snapshot, thời điểm, rồi ghi **nhận định** (claim) — `marc` từ chối mọi nhận định không trỏ về bằng chứng hợp lệ.

Phân vai: agent nhìn, đọc, trích, phân loại, viết. `marc` nhớ, kiểm tra, tính toán. **`marc` không gọi LLM.**

## Nguyên tắc không được phá
1. **Không có claim nếu không có evidence.** `ClaimSchema` bắt buộc `evidence_ids` ≥ 1. Đừng nới lỏng.
2. **Evidence bất biến.** Quan sát mới = bản ghi mới. Không UPDATE bảng `evidence`.
3. **Code xác định cho thống kê, dedupe, diff và luật bằng chứng.** Phần cần LLM (trích đặc trưng, phân loại, viết) là việc của agent chạy skill; agent ghi kết quả qua `marc feature add` / `marc claim add` và `marc` validate. Khi agent hay mắc một lỗi, ưu tiên chuyển luật đó vào code (`src/claims/`) thay vì chỉ viết thêm vào skill.
4. **Connector hỏng phải báo lỗi** bằng `ConnectorError`, không trả `[]` để che lỗi.
5. **Không đăng nhập, không lưu cookie, không thu thập nhóm kín / kênh tối tự động.** Kênh tối (Locket, Zalo OA…) chỉ qua `marc import --source dark_channel`.
6. **Không lưu dữ liệu cá nhân của người comment/review** (tên, ảnh, id). Chỉ nội dung; hash nếu cần dedupe.
7. **Playbook chỉ đổi qua proposal được người duyệt.** Agent không tự ghi đè `niches/*/playbook.md`.
8. **Test không gọi mạng.** Connector được test bằng fixture đã lưu.

## Bố cục
```
skills/marketing-archaeologist/
  SKILL.md      luật + chọn workflow (đây là sản phẩm người dùng cài)
  workflows/    setup.md, teardown.md, track.md
  references/   channels-vn.md (xem gì trên từng kênh), report-template.md
src/
  cli/          program.ts (lệnh), index.ts (entry), quiet-warnings.ts (phải import đầu tiên)
  domain/       schemas.ts (nguồn sự thật duy nhất cho kiểu dữ liệu), channels.ts, ids.ts, sold-count.ts
  registry/     đọc/kiểm tra niches/<niche>/{niche.yaml,brands.yaml}
  store/        SQLite (node:sqlite) + snapshots; migrations trong store.ts
  importer/     import-item.ts (một mục import, từ cờ hoặc JSON) → record.ts (đường duy nhất ghi evidence)
  claims/       luật bằng chứng cho claim (pattern ≥ 2 thương hiệu, inference không high, ...)
  status.ts     độ phủ thương hiệu × kênh cho `marc status`
  connectors/   interface Connector + registry (P1: thu thập tự động theo lịch)
schemas/        JSON Schema SINH TỪ src/domain/schemas.ts — không sửa tay
scripts/        gen-schemas.ts
tests/          vitest; helpers.ts tạo workspace tạm
docs/specs/     PRD
```
Chưa có (theo lộ trình PRD §14): `analyze/` (tuần 2), `eval/` (tuần 3), `diff/` + `proposal` (tuần 4), connector tự động đầu tiên (tuần 4).

Đổi luật trong `src/claims/` hoặc lệnh CLI → cập nhật skill tương ứng (SKILL.md, workflows/) trong cùng commit.

## Workspace của người dùng (tách khỏi repo này)
```
niches/<niche>/niche.yaml, brands.yaml, playbook.md
data/marc.db, data/snapshots/YYYY/MM/DD/<evidence id>.<ext>
reports/, proposals/
```
Chọn bằng `--workspace`, `$MARC_WORKSPACE`, hoặc thư mục hiện tại. Khi phát triển, dùng `.marc-dev/` (đã gitignore).

## Lệnh
```bash
pnpm install
pnpm typecheck && pnpm test
pnpm schemas          # sau khi sửa src/domain/schemas.ts
pnpm marc --help   # chạy CLI từ source
pnpm build            # ra dist/
```
Yêu cầu Node ≥ 22.13 (dùng `node:sqlite` có sẵn, không có dependency native).

## Quy ước
- Code, tên biến, comment: tiếng Anh. Thông báo cho người dùng (CLI, báo cáo): tiếng Việt.
- Exit code: 0 ok, 1 lỗi, 2 chưa triển khai / không có gì để làm.
- Sửa schema → chạy `pnpm schemas` và commit cả `schemas/`. CI kiểm tra file không lỗi thời.
- Thêm metric mới vào `MetricsSchema` thay vì nhét vào `raw` — metrics là thứ được phân tích.

## Thêm một connector
1. `src/connectors/<id>/index.ts` hiện thực `Connector` (`id`, `version` semver, `channel`, `healthcheck`, `collect`).
2. `collect` trả `Observation[]`; không tự ghi DB — collector gọi `recordObservation`.
3. Fixture HTML/JSON trong `tests/fixtures/<id>/`; test parse từ fixture.
4. Đăng ký trong `src/connectors/index.ts`.
5. Đổi cách parse → tăng `version` để evidence cũ vẫn truy được nguồn gốc.
