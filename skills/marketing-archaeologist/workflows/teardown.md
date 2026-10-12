# Workflow: teardown đối thủ

Mục tiêu: mỗi thương hiệu có một bản teardown, ngách có một bản nháp playbook — mọi câu nhận định đều trỏ về bằng chứng trong `marc`.

## 1. Lập kế hoạch từ trạng thái hiện có
```bash
marc status <niche> --json
```
Lập danh sách việc: thương hiệu × kênh còn `evidence_count: 0` hoặc `last_observed_at` cũ hơn 7 ngày. Báo người dùng kế hoạch (bao nhiêu thương hiệu, kênh nào) trước khi đi thu thập nếu khối lượng lớn.

## 2. Thu thập — ghi ngay khi thấy
Với từng thương hiệu × kênh, xem đúng những thứ ghi trong [channels-vn.md](../references/channels-vn.md). Gom các quan sát của một lượt xem vào một file JSON tạm (ví dụ `.marc-inbox/<brand>-<channel>.json` trong workspace) rồi ghi:

```bash
marc import <niche> --from .marc-inbox/brand_alpha-meta_ad_library.json --by claude --json
```

Mỗi phần tử theo dạng:
```json
{
  "brand": "brand_alpha",
  "source": "meta_ad_library",
  "kind": "ad",
  "url": "https://www.facebook.com/ads/library/?id=123456",
  "text": "Nguyên văn nội dung chính của ad",
  "metrics": { "ad_started_running": "2026-08-20" },
  "snapshot": "shots/alpha-ad-123456.png",
  "raw": { "platforms": ["facebook", "instagram"], "cta": "Mua ngay", "versions": 3 }
}
```
- `snapshot` là đường dẫn tương đối so với file JSON. Có công cụ chụp màn hình thì luôn chụp.
- Đọc kết quả `--json`: mục `error` phải sửa và ghi lại; mục `duplicate` là bình thường (đã ghi hôm nay).
- Nguồn bị chặn: ghi lại để đưa vào "Nguồn bị thiếu", chuyển sang nguồn khác.
- Báo ngành nói về thương hiệu: `source: "press"`, `kind: "article"`, `text` là đoạn trích liên quan.

## 3. Trích đặc trưng
Với mỗi bằng chứng `ad`, `video`, `post`, `page`: đọc `text` và ảnh chụp, ghi đặc trưng:

```bash
marc evidence <niche> --json      # lấy id
marc feature add <niche> --from .marc-inbox/features.json
```
```json
{
  "evidence_id": "ev_...",
  "extractor": "agent:claude-code/teardown@0.1.0",
  "hook": "câu/hình mở đầu, nguyên văn nếu là chữ",
  "format": "before_after",
  "cta": "Mua tại TikTok Shop",
  "offer": "Mua 1 tặng 1, freeship",
  "price_points_vnd": [249000],
  "topics": ["trị mụn", "da dầu"],
  "language_notes": "xưng 'tụi mình', nhiều teencode"
}
```
`format` dùng một trong: `talking_head`, `before_after`, `ugc_review`, `kol_review`, `livestream_clip`, `tutorial`, `unboxing`, `carousel`, `static_image`, `meme`, `other`. Không chắc thì `null`, đừng đoán.

## 4. Tính toán (bằng script, không nhẩm)
Từ `marc evidence <niche> --json`, dùng `node -e` hoặc `jq` để tính:
- **Độ bền ad**: ngày quan sát − `ad_started_running`. Ngưỡng "chạy lâu" = `analysis.long_running_ad_days` trong niche.yaml.
- **Outlier nội dung**: view/engagement của bài so với **trung vị của chính kênh đó** (cùng thương hiệu, cùng nền tảng). Outlier khi ≥ `analysis.outlier_multiplier` × trung vị. Cần ≥ 10 bài mới tính; ít hơn thì ghi "chưa đủ dữ liệu".
- **Tần suất format, ưu đãi, mức giá** theo thương hiệu.

## 5. Ghi nhận định
Viết claim theo thứ tự:
1. `observation` + `fact` cho từng thương hiệu: ad chạy lâu nhất, format chủ đạo, ưu đãi lặp lại, mức giá, bài outlier, phàn nàn/khen lặp lại trong review.
2. `pattern` cho điều lặp lại ở ≥ 2 thương hiệu; tìm và đính kèm phản ví dụ (`counter_evidence_ids`).
3. `inference` cho giả thuyết (confidence tối đa `medium`).

```bash
marc claim add <niche> --from .marc-inbox/claims.json --json
```
```json
[
  { "level": "observation", "kind": "fact", "statement": "Alpha có 4 ad đang chạy; ad lâu nhất bắt đầu 20/08/2026 (53 ngày)", "channel": "meta_ad_library", "evidence_ids": ["ev_..."], "confidence": "high" },
  { "level": "pattern", "kind": "inference", "statement": "Góc 'da dầu mụn' xuất hiện ở ad chạy lâu nhất của 3/5 thương hiệu — nhiều khả năng là góc đang có lãi", "evidence_ids": ["ev_a", "ev_b", "ev_c"], "counter_evidence_ids": ["ev_d"], "confidence": "medium" }
]
```
Bị từ chối thì đọc lỗi và sửa claim (thường là: pattern chỉ có 1 thương hiệu, inference để `high`, báo ngành không để `low`). Không lách bằng cách đổi `kind`.

## 6. Viết báo cáo
```bash
marc claim list <niche> --json
marc status <niche> --json
```
Viết theo [report-template.md](../references/report-template.md):
- `reports/<YYYY-MM-DD>/teardown-<brand_id>.md` cho mỗi thương hiệu.
- `reports/<YYYY-MM-DD>/playbook-draft.md` cho cả ngách — **bản nháp**, không ghi đè `niches/<niche>/playbook.md`.

Mỗi câu nhận định kết thúc bằng `[ev_…]`. Chỉ dùng claim đã ghi; câu nào không có claim thì không viết.

## 7. Báo lại người dùng
Ngắn gọn: 3–5 phát hiện đáng chú ý nhất (kèm độ tin cậy), nguồn bị thiếu, kênh tối, và đường dẫn tới báo cáo. Hỏi có muốn đưa playbook nháp vào playbook chính không (đi qua proposal ở track.md).
