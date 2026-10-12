# Xem gì trên từng kênh (thị trường Việt Nam)

Nguyên tắc chung: chỉ xem trang công khai, không đăng nhập. Ghi đúng những gì hiển thị. Gặp tường đăng nhập, captcha hoặc trang trống bất thường → dừng nguồn đó, ghi "nguồn bị thiếu".

## Chọn kênh theo ngách

| Ngách | Kênh chính |
|---|---|
| Mỹ phẩm, thời trang D2C | meta_ad_library, facebook_page, tiktok, shopee / tiktok_shop, instagram |
| F&B, kinh doanh địa phương | facebook_page, tiktok, google_maps, meta_ad_library |
| Giáo dục, khóa học | meta_ad_library, facebook_page, youtube, tiktok, website |
| B2B, công nghệ | website, youtube, facebook_page (group thường kín) |

Kênh tối thường gặp: `locket`, `zalo_oa`, `facebook_group`, `messenger`. Chỉ ghi khi người dùng tự đưa ảnh chụp (`source: "dark_channel"`).

---

## meta_ad_library — Thư viện quảng cáo Meta (giá trị cao nhất)

- **Trang ad đang chạy của một fanpage:**
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&view_all_page_id=<PAGE_ID>`
- **Tìm Page ID:** tìm tên thương hiệu trong Thư viện quảng cáo, mở trang của fanpage, lấy số ở `view_all_page_id`.
- **Mỗi ad ghi một bằng chứng:** `kind: "ad"`, `url` = link chi tiết của ad (`https://www.facebook.com/ads/library/?id=<LIBRARY_ID>`), `text` = nội dung chính, `metrics.ad_started_running` = ngày ở dòng "Bắt đầu chạy vào" / "Started running on" (định dạng `YYYY-MM-DD`), `raw`: nền tảng (Facebook/Instagram/Messenger), CTA, số phiên bản.
- **Bẫy:**
  - Chỉ hiện ad **đang chạy**. Ad đã dừng tại VN biến mất — vì vậy phải quan sát lại định kỳ.
  - Không có ad ≠ không chạy quảng cáo (có thể chạy dưới fanpage khác, qua KOL, hoặc trên TikTok).
  - Một ad có nhiều phiên bản; ghi số phiên bản vào `raw`, không tách thành nhiều ad.

## facebook_page — Fanpage

- Xem 10–20 bài gần nhất: `kind: "post"`, `text` = nội dung, `published_at`, `metrics`: `reactions`, `comments`, `shares` nếu hiển thị.
- Comment nổi bật của một bài: một bằng chứng `kind: "comment_batch"`, `items` = nội dung từng comment (**không** tên người viết).
- **Bẫy:** khi chưa đăng nhập, Facebook thường chặn sau vài lần cuộn. Bị chặn thì dừng, đề nghị người dùng nhập tay.

## tiktok — Hồ sơ thương hiệu

- Trang hồ sơ `https://www.tiktok.com/@<handle>`: lưới video có số view.
- Ghi 10–20 video gần nhất, mỗi video `kind: "video"`, `url`, `text` = caption, `published_at`, `metrics.views` (và `likes`, `comments`, `shares` nếu mở video).
- **Bẫy:** video ghim đứng đầu lưới, thường cũ và nhiều view → đánh dấu `raw.pinned: true`, loại khỏi tính trung vị. View tích lũy theo thời gian → luôn ghi `published_at`.

## shopee / tiktok_shop / lazada — Sàn thương mại điện tử

- Trang shop, mục **Bán chạy**: lấy 5–10 sản phẩm bán chạy nhất.
- Mỗi sản phẩm `kind: "product_listing"`: `url`, `text` = tên sản phẩm, `metrics`: `price_vnd` (giá đang bán), `sold_count_display` (nguyên văn, ví dụ `"10,2k"`), `rating`, `rating_count`; `raw`: giá gốc, % giảm, voucher, nhãn "Mall"/"Yêu thích".
- Review: một bằng chứng `kind: "review_batch"` cho mỗi sản phẩm, `items` = 10–20 review mới nhất (chỉ nội dung).
- **Bẫy:** "đã bán" được làm tròn và có thể cộng dồn nhiều phân loại → chỉ so một sản phẩm với chính nó qua thời gian. Sàn chống bot mạnh — bị chặn thì dừng.

## youtube

- Kênh → tab Video: `kind: "video"`, `text` = tiêu đề (+ mô tả ngắn), `published_at`, `metrics.views`.
- Comment: `kind: "comment_batch"`, `items` (chỉ nội dung).

## website

- Trang chủ và trang giá/sản phẩm chính: `kind: "page"` hoặc `"pricing"`, `text` = headline + subheadline + đoạn ưu đãi + CTA chính, ảnh chụp toàn trang.
- So sánh lần sau: headline, ưu đãi, giá.

## instagram, threads (P1)

- Thường bị tường đăng nhập. Xem được thì ghi như fanpage; không thì bỏ qua. Ad Instagram đã nằm trong Thư viện quảng cáo Meta.

## google_maps (F&B, địa phương)

- Điểm, số đánh giá (`rating`, `rating_count`), 10–20 review mới nhất vào `items`.

## press — Báo ngành

- advertisingvietnam.com, brandsvietnam.com, báo kinh doanh: `source: "press"`, `kind: "article"`, `text` = đoạn trích liên quan, `brand` nếu bài nói về một thương hiệu cụ thể.
- Luôn là nguồn thứ cấp → claim chỉ dựa trên báo ngành phải `confidence: low`.
- Đặc biệt hữu ích để biết về chiến dịch trên kênh tối (Locket, Zalo).
