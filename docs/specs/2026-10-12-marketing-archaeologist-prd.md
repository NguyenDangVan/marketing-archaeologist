# Marketing Archaeologist — PRD cho MVP (thị trường Việt Nam)

Trạng thái: bản nháp, đã duyệt hướng **skill làm trung tâm** (agent + công cụ `marc`). Tên dự án là tên làm việc, chưa kiểm tra thương hiệu/tên miền/npm.
Ngày: 2026-10-12. Sửa cùng ngày: chuyển từ "CLI là sản phẩm, skill là P1" sang "skill là sản phẩm, `marc` là công cụ của skill" (§1, §6, §11, §12, §14).

---

## 1. Tóm tắt

Một **agent skill mã nguồn mở** (cài vào Claude Code hoặc harness tương tự) kèm công cụ dòng lệnh `marc`. Người dùng giao cho agent **một ngách và danh sách thương hiệu đối thủ tại Việt Nam**; agent đi xem dấu vết marketing công khai của họ trên **fanpage, TikTok, YouTube, quảng cáo Meta, sàn thương mại điện tử (Shopee, TikTok Shop, Lazada), website và comment**, rồi xuất ra:

1. Một **bản teardown có dẫn chứng**: đối thủ định vị thế nào, nói với ai, dùng format nội dung gì, quảng cáo nào chạy lâu, khách hàng phàn nàn/khen gì.
2. Một **playbook theo ngách**: các mẫu hình lặp lại giữa nhiều đối thủ, kèm mức tin cậy, phản ví dụ và giới hạn.
3. Khi chạy lại: **báo cáo thay đổi** (ad mới, ad dừng, đổi giá, đổi format, bài bùng nổ mới) và **đề xuất sửa playbook** dưới dạng diff để người duyệt.

Phân vai:
- **Agent + skill** là bộ não: quyết định xem gì, đọc trang, xem ảnh, trích hook/format/ưu đãi, phân loại comment, viết báo cáo.
- **`marc`** là tay chân và trí nhớ: lưu bằng chứng bền vững qua nhiều lần chạy, chống trùng, **kiểm tra luật bằng chứng bằng code**, tính thống kê, so sánh theo thời gian. `marc` không gọi API LLM.

Khác biệt so với các bộ "marketing skills cho AI agent": đó là thư viện prompt; ở đây agent **không được trả lời từ kiến thức sẵn có của LLM**. Mọi nhận định phải là claim đã qua `marc`, trỏ về bằng chứng có URL, ảnh chụp và thời điểm quan sát — và `marc` từ chối claim vi phạm luật.

## 2. Vấn đề

Marketer, agency nhỏ và chủ shop tại Việt Nam "soi đối thủ" bằng tay: mở Thư viện quảng cáo Meta, lướt fanpage, lướt TikTok, đọc comment, chụp màn hình vào Google Sheet. Một lượt cho 5 đối thủ mất nhiều giờ, kết quả nằm rải rác, không có lịch sử, và không ai nhớ tháng trước đối thủ chạy gì.

Các công cụ AI hiện có thì ngược lại: trả lời nhanh nhưng dựa trên kiến thức chung, không biết đối thủ cụ thể đang làm gì **tuần này**, và không phân biệt "đã quan sát" với "LLM đoán".

Không giải quyết thì: quyết định marketing dựa trên cảm tính hoặc lời khuyên chung chung "nên làm video ngắn", và cơ hội (đối thủ vừa đổi giá, vừa có một mẫu ad chạy rất lâu) bị bỏ lỡ.

> Lưu ý: các nhận định trên là giả thuyết từ quan sát, **chưa có phỏng vấn người dùng**. Tuần 0 phải phỏng vấn tối thiểu 5 người (xem §13).

## 3. Người dùng mục tiêu

| Persona | Mô tả | Vì sao ưu tiên |
|---|---|---|
| **P1 — Marketer freelance / agency nhỏ** (ưu tiên số 1) | Làm cho 2–10 khách hàng, mỗi khách cần báo cáo đối thủ khi onboard và định kỳ | Đau nhất, lặp lại nhiều nhất, quen dùng công cụ, có thể trả tiền thay khách |
| P2 — Chủ shop / D2C brand tự làm marketing | Bán online qua fanpage + TikTok Shop / Shopee | Thị trường lớn nhưng ít thời gian, cần đầu ra cực ngắn gọn |
| P3 — Chính tác giả (dogfood) | Dùng cho các sản phẩm của mình | Kiểm chứng nhanh, nhưng không đại diện cho P1/P2 |

**Ngách benchmark cho MVP: mặc định đề xuất "mỹ phẩm / skincare D2C"** — nhiều thương hiệu, quảng cáo dày trên Meta và TikTok, comment nhiều, dễ quan sát. Đây là câu hỏi chặn (§13, Q1): nên đổi sang ngách mà tác giả hoặc người dùng thử nghiệm hiểu rõ nhất, vì cần tự gán nhãn bộ đáp án.

## 4. Mục tiêu (đo được)

| # | Mục tiêu | Ngưỡng thành công | Ngưỡng mơ ước |
|---|---|---|---|
| G1 | Rút ngắn thời gian ra bản teardown 5 đối thủ | ≤ 30 phút máy chạy + ≤ 15 phút người duyệt | ≤ 10 phút máy |
| G2 | Mọi nhận định dạng sự kiện đều có nguồn | 100% (bắt buộc bằng validator, không phải mục tiêu mềm) | — |
| G3 | Nhận định chính xác trên bộ đáp án gán tay | ≥ 85% | ≥ 95% |
| G4 | Phát hiện thay đổi quan trọng khi chạy hằng ngày | ≥ 80% thay đổi trong bộ đáp án được báo trong ≤ 48 giờ | ≤ 24 giờ |
| G5 | Hữu ích thật với người dùng thử | ≥ 3/5 marketer chấm ≥ 4/5 và **áp dụng ít nhất một gợi ý** | 5/5 |

Chi phí mỗi lượt nghiên cứu (LLM + proxy/scraper) được **đo trong tuần 1** rồi mới đặt ngưỡng; ngưỡng tạm: ≤ 3 USD cho một teardown 5 thương hiệu.

## 5. Ngoài phạm vi (non-goals)

| Không làm | Lý do |
|---|---|
| Tự đăng bài, tự chạy quảng cáo, tự comment | Rủi ro tài khoản và pháp lý; growth-os đã đi hướng hỗ trợ viết, không cần trùng |
| Kết luận nhân quả ("ad này làm tăng doanh số") | Dữ liệu công khai không chứng minh được nhân quả; chỉ nêu tín hiệu và giả thuyết |
| Đăng nhập tài khoản người dùng để thu thập (session scraping) | Vi phạm điều khoản nền tảng, rủi ro dữ liệu cá nhân |
| Thu thập tự động kênh tối: Locket, Zalo, group kín, Messenger | Không có bề mặt công khai. Chỉ khai báo và nhập tay (§7.3) |
| Reddit | Người Việt gần như không dùng; vai trò tương tự thuộc về Voz, Tinhte, group Facebook |
| Pinterest | Ở VN chủ yếu dùng tìm cảm hứng hình ảnh, ít thương hiệu Việt bán qua đây; để P2 |
| Dashboard web, multi-user, billing | MVP chỉ cần CLI + báo cáo Markdown; dashboard để sau khi có người dùng thật |
| Bao phủ mọi ngành / mọi nền tảng | Một ngách benchmark, năm nguồn chính là đủ để kiểm chứng giá trị |
| Phân tích nội dung video từng khung hình | Đắt và chậm; MVP dùng caption, transcript (nếu có), ảnh bìa; để P1 |
| Tự huấn luyện model | Không cần; "học" = cập nhật bộ nhớ + playbook có kiểm soát |

## 6. Luồng chính

```
Người dùng: "soi 5 đối thủ mỹ phẩm D2C này"
   │
Agent đọc SKILL.md ──► chọn workflow: setup | teardown | track
   │
setup     marc init / sửa brands.yaml / marc validate
   │
teardown  marc status --json                      ← biết còn thiếu gì
   │      agent xem từng thương hiệu × kênh (trang công khai, không đăng nhập)
   │      marc import --from batch.json            ← bằng chứng + ảnh chụp, chống trùng theo ngày
   │      agent trích đặc trưng ──► marc feature add
   │      marc analyze                             ← baseline, outlier, độ bền ad, tốc độ bán (code)
   │      agent viết claim ──► marc claim add      ← marc từ chối claim sai luật
   │      marc claim list --json ──► agent viết teardown + playbook nháp, mọi câu trích [ev_…]
   │
track     quan sát lại ──► marc import ──► marc diff ──► agent viết proposal ──► người duyệt
```

Connector tự động (`marc collect`) bổ sung cho bước "agent xem" khi cần chạy theo lịch mà không có agent ngồi đó, không thay thế nó.

## 7. Nguồn dữ liệu tại Việt Nam

Đây là phần rủi ro nhất. Thiết kế theo **ba hạng truy cập**; mọi tính năng P0 phải chạy được bằng hạng C, để MVP không bị chặn vì một API.

### 7.1 Nguồn quan sát được

| Nguồn | Lấy gì | Hạng | Ưu tiên | Thực trạng truy cập (đã tra 2026-10-12) |
|---|---|---|---|---|
| Website / landing / bảng giá | Định vị, ưu đãi, giá, CTA | A | P0 | Fetch HTTP/headless, tôn trọng robots.txt, giới hạn tần suất |
| YouTube | Video, view, like, comment, transcript | A | P0 | YouTube Data API v3 chính thức, có quota |
| Thư viện quảng cáo Meta | Ad đang chạy tại VN trên Facebook + Instagram, ngày bắt đầu chạy, creative | B | P0 | **API có lẽ không trả quảng cáo thương mại ngoài EU/UK** (theo nguồn bên thứ ba, chưa đối chiếu tài liệu Meta); chỉ giao diện web hiện ad *đang chạy*. Phải chụp giao diện web và tự tích lũy lịch sử |
| TikTok hồ sơ thương hiệu | Video, view, caption | B | P0 | Không có API công khai cho nội dung người khác (Research API dành cho nghiên cứu học thuật) |
| **Sàn TMĐT: Shopee, TikTok Shop, Lazada** | Trang shop + sản phẩm: **số "đã bán"**, đánh giá sao, nội dung review, giá, khuyến mãi | B | **P0** (ngách D2C) | Trang sản phẩm công khai nhưng chống bot mạnh (đặc biệt Shopee); chưa có API công khai cho dữ liệu shop khác |
| Fanpage Facebook | Bài đăng, reaction, share, comment | B→A | P0 qua hạng C, P1 qua API | API "Page Public Content Access" cần **App Review + xác minh doanh nghiệp**, có thể kèm hợp đồng |
| Instagram (bài đăng tự nhiên) | Post, reel, like, comment | B | P1 | Ad Instagram đã nằm trong Thư viện quảng cáo Meta; bài tự nhiên của tài khoản khác không có API mở |
| Threads | Bài công khai theo từ khóa / tài khoản | A | P1 | API chính thức có keyword search, cần xin quyền `threads_keyword_search`; giới hạn truy vấn theo ngày |
| TikTok Creative Center (Top Ads) | Ad hiệu quả theo ngành/khu vực | B | P1 | Giao diện web công khai; vùng phủ VN **chưa xác nhận**. Commercial Content API hiện chủ yếu dữ liệu EU |
| Google Maps (review) | Đánh giá, phản hồi của chủ doanh nghiệp | A | P2 | Places API chính thức; hợp với ngách F&B, kinh doanh địa phương |
| Pinterest | Pin, board | — | P2 | Xem §5 |
| Báo ngành (Advertising Vietnam, Brands Vietnam…) | Tin về chiến dịch, đặc biệt chiến dịch trên kênh tối | A | P0 (nhập URL) | Là **nguồn thứ cấp**: chứng minh chiến dịch được đưa tin, không phải số liệu gốc |
| Mọi nguồn | — | C | P0 | **Import thủ công**: dán URL + số liệu, tải ảnh chụp, CSV |

### 7.2 Danh sách kênh là cấu hình theo ngách

Không cố định danh sách nền tảng trong code. Mỗi connector là một plugin độc lập; `niche.yaml` khai báo kênh nào quan trọng với ngách đó, và báo cáo chỉ đánh giá độ đầy đủ theo danh sách này. Ví dụ:

```yaml
# niches/vn-skincare-d2c/niche.yaml
market: VN
channels: [meta_ad_library, facebook_page, tiktok, shopee, tiktok_shop, website, youtube]
dark_channels: [zalo_oa, locket]
```

| Ngách | Kênh chính gợi ý |
|---|---|
| Mỹ phẩm, thời trang D2C | Facebook, TikTok, Instagram, Shopee/TikTok Shop, quảng cáo Meta |
| F&B, kinh doanh địa phương | Facebook, TikTok, Google Maps |
| B2B, công nghệ | LinkedIn, Facebook group, YouTube, website |

Thêm nền tảng mới = viết một connector + fixture + khai báo vào `niche.yaml`; không sửa phần lõi.

### 7.3 Kênh tối (Locket, Zalo, group kín, Messenger)

Locket đang rất phổ biến với Gen Z Việt Nam, nhưng là mạng khép kín: không có web công khai, không API, không thư viện quảng cáo; tài khoản "Celebrity" chủ yếu dành cho nghệ sĩ và giới hạn số fan. Zalo OA, group kín và Messenger cũng vậy. Đây lại là nơi marketing cho Gen Z đang dịch chuyển tới, nên **mọi công cụ dựa trên dữ liệu công khai đều lệch về những gì nhìn thấy được**. Cách xử lý:

1. **Khai báo**: `brands.yaml` có trường `dark_channels` (ví dụ "có Locket Celebrity", "có Zalo OA"). Báo cáo ghi "kênh tồn tại nhưng không quan sát được", không bao giờ suy ra "thương hiệu không làm kênh này".
2. **Thu thập gián tiếp**: chiến dịch trên kênh tối thường được thương hiệu/KOL thông báo trên TikTok, Facebook, hoặc báo ngành đưa tin → lưu Evidence với `evidence_class: secondary`.
3. **Nhập tay**: người dùng đang là fan/bạn bè của tài khoản đó có thể tự chụp và `marc import`. Không tự động hóa.

### 7.4 Quyết định thiết kế
- **Meta Ad Library là tín hiệu giá trị nhất cho VN**: một ad thương mại chạy liên tục nhiều tuần là bằng chứng mạnh nhất công khai về "cái này có lãi" (vẫn chỉ là tín hiệu). Vì API không lưu ad VN, **bản lưu trữ tự tích lũy theo ngày chính là tài sản dữ liệu** mà công cụ chung không có.
- **Sàn TMĐT là nguồn duy nhất có tín hiệu gần với doanh số**: số "đã bán" và số đánh giá theo thời gian cho phép ước lượng tốc độ bán. Kết hợp với ad đang chạy cùng thời điểm, đây là cặp tín hiệu mạnh nhất của MVP (vẫn không phải nhân quả).
- **Trong MVP, agent là "connector" chính**: nó xem trang công khai như một người đang soi đối thủ và ghi lại qua `marc import`. Connector tự động chỉ cần cho theo dõi định kỳ (P1), bắt đầu với Thư viện quảng cáo Meta.
- Connector hạng B chạy bằng trình duyệt headless, **không đăng nhập**, tần suất thấp (≤ 1 lượt/thương hiệu/ngày/nguồn), dễ hỏng → phải có health check và tự chuyển sang yêu cầu import thủ công khi hỏng, không âm thầm trả rỗng.
- Hạng B có rủi ro điều khoản dịch vụ; cần ý kiến pháp lý trước khi phát hành công khai (§13, Q3). Phương án dự phòng: extension trình duyệt cho người dùng **tự bấm lưu** những gì họ đang xem (tận dụng kinh nghiệm từ growth-os / auto-mkt) — để P1.

## 8. Mô hình dữ liệu

Lưu bằng SQLite + thư mục `snapshots/` (HTML, ảnh chụp, JSON thô). Mọi bản ghi bất biến; sửa = bản ghi mới.

```yaml
# Brand — khai báo trong niches/<niche>/brands.yaml (khóa của handles = id kênh)
id: brand_vi_du
name: "Thương hiệu Ví Dụ"
handles:
  website: "https://..."
  meta_ad_library: "123456789012345"   # Page ID
  facebook_page: "https://facebook.com/..."
  tiktok: "@..."
  youtube: "UC..."
  instagram: "@..."
  threads: "@..."
  shopee: "https://shopee.vn/..."
  tiktok_shop: "https://..."
  lazada: "https://lazada.vn/..."
dark_channels:            # tồn tại nhưng không quan sát tự động được
  - channel: locket
    note: "Locket Celebrity, công bố trên TikTok 2026-09"
    known_from: [ ev_... ]   # tùy chọn: bằng chứng gián tiếp
  - channel: zalo_oa

# Evidence — một lần quan sát một thứ
id: ev_01J...
brand_id: brand_vi_du
source: <id kênh> | press | dark_channel     # nhập tay hay connector ghi ở collected_by
dark_channel: locket                          # chỉ khi source = dark_channel
evidence_class: primary | secondary   # secondary = báo ngành / bên thứ ba thuật lại
kind: ad | post | video | page | comment_batch | pricing | product_listing | review_batch | article
url: "https://..."
observed_at: "2026-10-12T08:00:00+07:00"
collected_by: connector_name@version | manual:<user>
snapshot_path: "snapshots/2026/10/12/ev_01J....png"
content_hash: "sha256:..."
published_at: "2026-10-01" | null
metrics:            # chỉ những gì nhìn thấy được, kèm thời điểm đo
  views: 120000
  reactions: 3400
  comments: 210
  shares: 95
  ad_started_running: "2026-08-20"   # chỉ với ad
  sold_count_display: "10,2k"        # chỉ với sàn: giữ nguyên chuỗi hiển thị
  sold_count_min: 10200              # cận dưới đã chuẩn hóa
  rating: 4.8
  rating_count: 3150
raw: { ... }        # dữ liệu gốc

# Feature — đặc trưng LLM trích từ một Evidence
evidence_id: ev_01J...
extractor: features@v3 (model, prompt version)
hook: "Da dầu mụn mà dùng sai cách này là toang"
format: talking_head | before_after | ugc_review | livestream_clip | carousel | static_image | ...
cta: "Mua tại TikTok Shop"
offer: "Mua 1 tặng 1, freeship"
price_points: [ 249000 ]
topics: [ "trị mụn", "da dầu" ]
language_notes: "teencode, xưng hô 'tụi mình'"

# Claim — nhận định
id: cl_...
level: observation | pattern | validated
statement: "3/5 thương hiệu chạy ad format before/after liên tục ≥ 30 ngày"
scope: { niche: vn-skincare-d2c, channel: meta_ads, market: VN }
evidence_ids: [ ev_..., ev_... ]        # bắt buộc ≥ 1; pattern bắt buộc từ ≥ 2 brand
counter_evidence_ids: [ ev_... ]
kind: fact | inference                   # inference phải ghi rõ là suy luận
confidence: low | medium | high
status: hypothesis | supported | contradicted | stale
first_seen_at / last_verified_at / expires_at

# ChangeProposal — đề xuất sửa playbook
id: prop_...
trigger: [ change ids ]
target: niches/<niche>/playbook.md
diff: "unified diff"
rationale: "..."
decision: pending | accepted | rejected
decided_by / decided_at
```

JSON Schema tương ứng nằm trong `schemas/`; validator chạy ở mọi bước ghi.

## 9. Phương pháp phân tích

- **Baseline theo chính kênh đó**, không so giữa các kênh: trung vị engagement của N bài gần nhất (mặc định 30) của cùng tài khoản trên cùng nền tảng. Bài ≥ 3 lần trung vị = outlier (ngưỡng cấu hình được).
- **View tích lũy theo thời gian** → chỉ so các bài ở độ tuổi tương đương (ví dụ số liệu đo khi bài 3–10 ngày tuổi), hoặc ghi rõ độ tuổi khi đo. Không so bài 1 ngày với bài 3 tháng.
- **Độ bền của ad** = ngày nhìn thấy gần nhất − ngày bắt đầu chạy. Ad ≥ 30 ngày là tín hiệu "đáng học"; ad dừng sau < 7 ngày là phản ví dụ tiềm năng.
- **Tốc độ bán trên sàn** = chênh lệch `sold_count_min` (và `rating_count`) giữa hai lần chụp, chia số ngày. Lưu ý: số "đã bán" thường làm tròn ("10k+"), có thể cộng dồn nhiều phân loại, có thể bị thổi phồng → chỉ dùng chênh lệch theo thời gian của cùng một sản phẩm, không so tuyệt đối giữa các shop; ghi rõ độ phân giải của số liệu.
- **Ghép tín hiệu**: ad chạy lâu + sản phẩm được quảng cáo tăng tốc độ bán cùng giai đoạn → claim dạng `inference`, `confidence` tối đa `medium`.
- **Nguồn thứ cấp** (báo ngành): một claim chỉ dựa trên nguồn thứ cấp có `confidence` tối đa `low`.
- **Pattern** chỉ được tạo khi có ≥ 2 thương hiệu độc lập; luôn ghi phản ví dụ nếu có.
- **Comment**: phân loại thành đau / phản đối khi mua / câu hỏi / khen; gom theo chủ đề. **Không lưu tên, ảnh đại diện, ID người comment** (chỉ hash để chống trùng). Comment thường viết không dấu, teencode — bộ test phải có các ca này.
- **Cấp `validated`** không đạt được chỉ bằng dữ liệu công khai. Chỉ dùng khi người dùng nhập kết quả thử nghiệm của chính họ (P1). MVP chỉ có `observation` và `pattern`.

## 10. User stories

**P1 — Marketer freelance/agency**
1. Là marketer vừa nhận khách hàng mới, tôi muốn nhập ngách và 5 đối thủ để nhận bản teardown có dẫn chứng trong một buổi, thay vì mất một ngày soi tay.
2. Là marketer, tôi muốn thấy những ad của đối thủ đã chạy lâu nhất kèm creative và ngày bắt đầu, để biết thông điệp nào nhiều khả năng đang có lãi.
3. Là marketer, tôi muốn biết bài nào của đối thủ vượt hẳn mức bình thường của chính họ, để học hook và format từ đó.
4. Là marketer, tôi muốn đọc tổng hợp khách hàng của đối thủ đang phàn nàn gì (comment + review trên sàn), để tìm góc định vị.
4b. Là marketer, tôi muốn biết sản phẩm nào của đối thủ đang tăng tốc độ bán trên sàn và có ad nào đang đẩy nó, để đoán đối thủ đang dồn lực vào đâu.
5. Là marketer, tôi muốn bấm vào từng nhận định để xem đúng ảnh chụp và URL gốc, để tự tin đưa vào báo cáo cho khách.
6. Là marketer, mỗi sáng tôi muốn nhận danh sách thay đổi (ad mới, ad dừng, đổi giá, bài bùng nổ), để phản ứng kịp.
7. Là marketer, khi connector không lấy được fanpage, tôi muốn dán URL và số liệu bằng tay, để báo cáo vẫn đầy đủ.

**P2 — Chủ shop**
8. Là chủ shop, tôi muốn một trang tóm tắt "đối thủ đang làm gì và tôi nên thử gì tuần này", không cần đọc toàn bộ dữ liệu.

**Ca biên**
9. Khi một thương hiệu không có ad nào đang chạy, báo cáo ghi "không quan sát thấy ad đang chạy tại thời điểm X", không suy ra "họ không chạy ad".
10. Khi connector hỏng hoặc bị chặn, hệ thống báo rõ nguồn nào thiếu và đề nghị import thủ công; báo cáo không giả vờ đầy đủ.
11. Khi dữ liệu mới mâu thuẫn với một pattern cũ, hệ thống tạo proposal chứ không tự sửa playbook.
12. Khi thương hiệu có kênh tối đã khai báo (Locket, Zalo OA), báo cáo nêu rõ kênh đó không quan sát được và liệt kê bằng chứng gián tiếp nếu có.

## 11. Yêu cầu

### P0 — bắt buộc cho MVP

**R1. Registry ngách và thương hiệu**
- [ ] `marc init <niche>` tạo `niches/<niche>/{niche.yaml,brands.yaml}`, với `channels` và `dark_channels` (§7.2).
- [ ] Validator báo **lỗi** khi handle sai định dạng theo kênh, id trùng, id ngách không khớp thư mục; báo **cảnh báo** khi thương hiệu thiếu handle cho một kênh trong `channels` (kênh đó sẽ được ghi là thiếu nguồn).
- [ ] Connector được nạp theo `channels`; kênh không có connector → báo "chỉ hỗ trợ import thủ công", không lỗi.

**R2. Thu thập qua agent**
- [ ] Skill hướng dẫn agent xem gì trên từng kênh VN (`references/channels-vn.md`): Thư viện quảng cáo Meta, fanpage, TikTok, sàn TMĐT, YouTube, website, báo ngành.
- [ ] `marc import --from <file|->` nhận một hoặc nhiều mục JSON (`text`, `items`, `metrics`, `snapshot`, `raw`); mục sai không chặn mục đúng; `--json` trả kết quả từng mục để agent tự sửa.
- [ ] Nhập tay vẫn dùng được cho người không có agent (cờ `--source/--kind/--url/...`), kể cả nguồn thứ cấp và ảnh chụp kênh tối.
- [ ] `marc status --json` cho biết thương hiệu × kênh nào còn thiếu bằng chứng, để agent lập kế hoạch.
- Nghiệm thu: chạy lại cùng ngày không tạo bằng chứng trùng; quan sát lại ngày khác tạo bản ghi mới; comment/review chỉ lưu nội dung, không lưu người viết.

**R3. Phân tích**
- [ ] Agent trích đặc trưng và ghi qua `marc feature add`; `marc` validate theo schema và kiểm tra evidence tồn tại.
- [ ] `marc analyze`: baseline + outlier theo chính kênh, độ bền ad, tốc độ bán trên sàn — **code xác định, có unit test**, agent đọc kết quả thay vì tự nhẩm.
- [ ] Agent phân loại comment/review tiếng Việt (có dấu, không dấu, teencode); bộ benchmark có các ca này.
- [ ] `marc claim add` từ chối: claim không có evidence, evidence không tồn tại hoặc khác ngách, pattern từ < 2 thương hiệu, inference có `confidence: high`, claim chỉ dựa nguồn thứ cấp mà không `low`, cấp `validated`. Một mục sai → không ghi mục nào.

**R4. Báo cáo** (agent viết theo `references/report-template.md`)
- [ ] `reports/<date>/teardown-<brand>.md` và `reports/<date>/playbook-draft.md`; không ghi đè `niches/<niche>/playbook.md`.
- [ ] Mỗi câu nhận định có `[ev_…]`; chỉ dùng claim có trong `marc claim list`.
- [ ] Có mục "Nguồn bị thiếu" và "Kênh tối" (từ `marc status`).
- [ ] Phân biệt hiển thị: **Quan sát** / **Mẫu hình** / **Giả thuyết (chưa kiểm chứng)**.

**R5. Chạy lại và thay đổi**
- [ ] `marc diff --since <date>` phát hiện: ad mới, ad không còn thấy, đổi giá/ưu đãi trên website hoặc sàn, đổi headline, bài outlier mới, đổi tần suất đăng, sản phẩm tăng tốc độ bán bất thường.
- [ ] Agent viết `proposals/<id>.md` gồm diff playbook + lý do + evidence; chỉ áp dụng khi người dùng duyệt. `marc proposal list|accept|reject` ghi lịch sử quyết định.

**R6. Benchmark**
- [ ] `evaluations/` chứa bộ đáp án gán tay: ≥ 30 claim cho 5 thương hiệu của ngách benchmark + ≥ 10 thay đổi đã biết.
- [ ] `marc eval` so claim agent ghi với bộ đáp án: evidence coverage, claim accuracy, recall phát hiện thay đổi; ghi thời gian và chi phí mỗi lượt.
- [ ] Kết quả eval lưu theo phiên bản skill + model để so hồi quy.

**R7. Skill**
- [ ] `skills/marketing-archaeologist/SKILL.md` + workflow `setup`, `teardown`, `track` + tài liệu tham chiếu kênh VN và mẫu báo cáo.
- [ ] Skill kiểm tra `marc --version` trước khi chạy; thiếu thì hướng dẫn cài và dừng.
- [ ] Luật trong skill khớp luật `marc` kiểm tra (một nguồn sự thật: luật nằm trong code, skill giải thích lại).
- [ ] Cài được vào Claude Code bằng cách liên kết thư mục skill (README hướng dẫn).

### P1 — làm ngay sau MVP
- Connector tự động để theo dõi theo lịch không cần agent: **Thư viện quảng cáo Meta trước**, rồi website, YouTube Data API, TikTok hồ sơ, một sàn TMĐT.
- `marc capture <url>`: chụp HTML + ảnh toàn trang của trang công khai (headless, không đăng nhập) cho harness không tự chụp được.
- Connector fanpage qua API Page Public Content Access (sau khi qua App Review).
- Instagram (bài tự nhiên) và Threads (API chính thức, quyền `threads_keyword_search`).
- Connector cho sàn TMĐT còn lại (Shopee / TikTok Shop / Lazada).
- TikTok Creative Center Top Ads theo ngành, khu vực VN (sau khi xác nhận vùng phủ).
- Extension trình duyệt "lưu thứ tôi đang xem" làm nguồn hạng C tiện hơn.
- Phân tích video: trích khung hình 3 giây đầu + transcript tự động.
- Chạy theo lịch (cron) + gửi tóm tắt thay đổi qua email/Telegram.
- Người dùng nhập kết quả thử nghiệm của mình → claim lên cấp `validated`.
- Hỗ trợ thêm harness ngoài Claude Code (Codex, Gemini CLI, OpenCode…).

### P2 — thiết kế để không chặn đường về sau
- Nhiều ngách, nhiều thị trường (schema đã có `market`).
- Bản host trả phí: chạy lịch, lưu lịch sử dài, chia sẻ báo cáo cho khách.
- Google Trends (API alpha), Google Maps review, Pinterest, LinkedIn, diễn đàn (Voz, Tinhte).
- Bộ dữ liệu theo ngành đã tích lũy (lịch sử ad VN) như sản phẩm riêng.

## 12. Kiến trúc

TypeScript/Node ≥ 22.13, pnpm. `marc` dùng SQLite có sẵn trong Node (`node:sqlite`), không có dependency native, **không gọi LLM** — phần LLM là chính agent đang chạy skill.

```
marketing-archaeologist/
├── AGENTS.md                 # luật cho coding agent phát triển repo
├── skills/marketing-archaeologist/
│   ├── SKILL.md              # sản phẩm: luật + chọn workflow
│   ├── workflows/            # setup.md, teardown.md, track.md
│   └── references/           # channels-vn.md, report-template.md
├── src/
│   ├── cli/                  # init, validate, status, import, evidence, feature, claim, collect, analyze, diff, proposal, eval
│   ├── domain/               # schemas.ts (nguồn sự thật), channels, ids, sold-count
│   ├── registry/             # niche.yaml, brands.yaml
│   ├── store/                # SQLite + snapshots, ghi nguyên tử, dedupe
│   ├── importer/             # đường duy nhất ghi evidence (agent, nhập tay, connector)
│   ├── claims/               # luật bằng chứng cho claim
│   ├── connectors/           # P1: plugin thu thập tự động
│   ├── analyze/ diff/ eval/  # theo lộ trình §14
├── schemas/                  # JSON Schema sinh từ src/domain/schemas.ts
└── evaluations/<niche>/      # bộ đáp án, fixtures
```

Workspace của người dùng (tách khỏi repo): `niches/<niche>/`, `data/marc.db`, `data/snapshots/`, `reports/`, `proposals/`.

Nguyên tắc:
- Thống kê, dedupe, diff, luật bằng chứng là **code xác định** trong `marc`; agent chỉ nhìn, đọc, trích, phân loại và viết.
- Playbook là file Markdown trong git → mọi thay đổi có lịch sử, rollback bằng git.
- Không lưu cookie, không đăng nhập, không lưu dữ liệu cá nhân của người comment.

## 13. Câu hỏi mở

| # | Câu hỏi | Ai trả lời | Chặn? |
|---|---|---|---|
| Q1 | Ngách benchmark: giữ "mỹ phẩm D2C" hay chọn ngách tác giả hiểu rõ hơn để gán nhãn đáp án? | Tác giả | **Chặn tuần 1** |
| Q2 | Có ≥ 5 marketer/agency VN đồng ý phỏng vấn và dùng thử? Họ đang soi đối thủ bằng gì, mất bao lâu, có trả tiền không? | Tác giả (phỏng vấn) | **Chặn** trước khi đầu tư sâu |
| Q3 | Thu thập giao diện web Meta Ad Library và TikTok không đăng nhập: rủi ro điều khoản? Comment công khai có tính là dữ liệu cá nhân theo luật bảo vệ dữ liệu cá nhân của Việt Nam không? | Pháp lý | Chặn **phát hành công khai**, không chặn prototype nội bộ |
| Q4 | TikTok Creative Center có dữ liệu khu vực VN không, có ổn định để thu thập không? | Kỹ thuật (thử trực tiếp) | Không |
| Q5 | Có đăng ký business verification để xin Page Public Content Access không? | Tác giả | Không (P1) |
| Q6 | Dùng thư viện headless nào và có cần proxy dân cư cho TikTok không? Chi phí? | Kỹ thuật | Không |
| Q7 | Định dạng đầu ra cho P1 (marketer): Markdown đủ hay cần xuất Google Docs/Slides để gửi khách? | Phỏng vấn người dùng | Không |
| Q8 | Thu thập trang sản phẩm Shopee/TikTok Shop: có vượt được chống bot mà không cần đăng nhập không? Điều khoản sàn cho phép tới đâu? Sàn nào chọn làm P0? | Kỹ thuật (thử 1 ngày) + pháp lý | **Chặn tuần 2**; nếu không được thì sàn chuyển sang import thủ công |
| Q9 | Tỉ lệ dùng từng nền tảng tại VN (Facebook, TikTok, Instagram, Threads, Locket, Zalo): đối chiếu báo cáo đầy đủ Digital 2026 Vietnam trước khi chốt ưu tiên kênh | Tác giả | Không |
| Q10 | Trong phỏng vấn: thương hiệu trong ngách benchmark có làm marketing trên Locket/Zalo không, đo bằng gì? | Phỏng vấn người dùng | Không |
| Q11 | Marketer mục tiêu có dùng agent (Claude Code, v.v.) không? Nếu không, cần lớp giao diện nào để họ dùng được skill (Claude Desktop, Cowork…)? | Phỏng vấn người dùng | **Chặn** quyết định phân phối |
| Q12 | Harness của người dùng có công cụ trình duyệt chụp màn hình không (Claude in Chrome, Playwright MCP)? Nếu không, `marc capture` lên P0 | Kỹ thuật | Không |

## 14. Lộ trình 4 tuần

| Tuần | Đầu ra | Demo cuối tuần |
|---|---|---|
| 0 (song song) | Phỏng vấn 5 người dùng (Q2, Q11); chốt ngách (Q1); gán nhãn bộ đáp án | Bộ đáp án ≥ 30 claim |
| 1 | `marc` lõi (registry, store, import batch, status, feature, claim) + skill v0.1; **dogfood**: agent teardown 5 thương hiệu bằng tay qua skill | Bằng chứng có ảnh chụp cho 5 thương hiệu × các kênh chính |
| 2 | `marc analyze` (baseline, outlier, độ bền ad, tốc độ bán); sửa skill theo những gì agent làm sai ở tuần 1 | Danh sách outlier + ad chạy lâu nhất + sản phẩm bán chạy, tính bằng code |
| 3 | Mẫu báo cáo hoàn chỉnh; `marc eval` | Teardown + playbook nháp đầu tiên, điểm eval lần 1 |
| 4 | `marc diff` + `marc proposal`; workflow track; connector tự động đầu tiên (Thư viện quảng cáo Meta) để tích lũy hằng ngày | Báo cáo thay đổi thật + ≥ 1 proposal được duyệt; đưa cho 5 người dùng thử |

Phụ thuộc chính: chất lượng phụ thuộc vào việc agent tuân thủ skill. Mỗi lỗi agent mắc phải trong dogfood → hoặc sửa skill, hoặc chuyển luật đó vào code của `marc` để nó bị từ chối tự động.

## 15. Tiêu chí hoàn thành MVP
- [ ] Agent chạy hết workflow `setup → teardown → track` qua skill cho 5 thương hiệu của ngách benchmark, rồi `marc eval`.
- [ ] Đạt G2 (100% claim dạng sự kiện có nguồn) và G3 (≥ 85% đúng trên bộ đáp án).
- [ ] Có ≥ 7 ngày lịch sử ad VN tự tích lũy, và báo cáo thay đổi phản ánh đúng ≥ 80% thay đổi trong bộ đáp án.
- [ ] 5 người dùng thử nhận báo cáo; ghi lại điểm và việc họ đã áp dụng (G5).
- [ ] Test CI chạy offline bằng fixture; không test nào gọi mạng thật.

## 16. Nguồn đã tra
- Meta — Page Public Content Access (cần App Review, xác minh doanh nghiệp): https://developers.facebook.com/documentation/development/features-reference/page-public-content-access
- Phạm vi Thư viện quảng cáo Meta (ad thương mại chỉ lưu với EU/UK; nguồn bên thứ ba, cần đối chiếu tài liệu chính thức): https://admanage.ai/blog/facebook-ads-library-api , https://www.mida.so/blog/meta-ads-library
- TikTok Commercial Content API: https://developers.tiktok.com/products/commercial-content-api
- TikTok Research API & Commercial Content Library: https://newsroom.tiktok.com/tiktoks-research-api-and-commercial-content-library?lang=en-GB
- Tình trạng dữ liệu Facebook 2026 (bên thứ ba): https://www.datashake.com/blog/facebook-social-data-api-in-2026
- Threads API — keyword search: https://developers.facebook.com/documentation/threads/keyword-search
- DataReportal — Digital 2026: Vietnam (79,0 triệu tài khoản MXH, 10/2025; chưa có số theo nền tảng): https://datareportal.com/reports/digital-2026-vietnam
- Locket và "intimate social" (Advertising Vietnam, 1/2026): https://advertisingvietnam.com/locket-va-su-dich-chuyen-sang-intimate-social-gen-z-thu-hep-khong-gian-chia-se-thuong-hieu-can-hoc-cach-hien-dien-tinh-te-hon-p27883
- Locket Celebrity (Android Headlines, 8/2025): https://www.androidheadlines.com/2025/08/photo-sharing-app-locket-banks-on-celebrity-feature-to-drive-growth.html

Chưa xác minh: số liệu các repo đối thủ trong bản phân tích ban đầu (Marketing Skills OS, Marketing Agent OS, kostja94/marketing-skills, Swipefile, GTM Skills); chưa ảnh hưởng tới PRD này.
