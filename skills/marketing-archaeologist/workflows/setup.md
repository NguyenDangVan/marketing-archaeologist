# Workflow: dựng ngách mới

Mục tiêu: có `niches/<niche>/brands.yaml` với 3–7 đối thủ và handle đúng cho các kênh quan trọng, `marc validate` không lỗi.

## 1. Hỏi đủ, hỏi một lần
Dùng AskUserQuestion nếu thiếu:
- Ngách là gì, bán cho ai, thị trường (mặc định VN).
- Người dùng đã có danh sách đối thủ chưa? Nếu có, lấy luôn.
- Kênh nào quan trọng với ngách này (gợi ý theo bảng trong [channels-vn.md](../references/channels-vn.md#chọn-kênh-theo-ngách)).

## 2. Tạo ngách
```bash
marc init <niche-id> --name "<Tên hiển thị>"
```
`niche-id` dạng kebab-case, ví dụ `vn-skincare-d2c`. Sửa `channels` và `dark_channels` trong `niche.yaml` theo câu trả lời ở bước 1.

## 3. Tìm đối thủ (nếu người dùng chưa có)
- WebSearch: `"<sản phẩm>" site:shopee.vn`, `"<sản phẩm>" tiktok shop`, `top thương hiệu <ngách> 2026`, báo ngành (advertisingvietnam.com, brandsvietnam.com).
- Ưu tiên thương hiệu **đang hoạt động** (có ad đang chạy hoặc bài đăng trong 30 ngày qua).
- Đề xuất danh sách cho người dùng chốt trước khi ghi. Không tự chọn thay họ.

## 4. Tìm handle cho từng thương hiệu
Với mỗi kênh trong `channels`, tìm handle theo [channels-vn.md](../references/channels-vn.md). Lưu ý:
- `meta_ad_library` cần **Page ID dạng số**, lấy từ tham số `view_all_page_id` trên trang Thư viện quảng cáo của fanpage.
- Kiểm tra handle đúng là tài khoản chính thức (tick xanh, link từ website thương hiệu), không phải đại lý hay fanpage giả.
- Không tìm được thì bỏ trống — `marc validate` sẽ cảnh báo và báo cáo sẽ ghi là thiếu nguồn.
- Kênh tối đã biết (Locket Celebrity, Zalo OA) ghi vào `dark_channels` của thương hiệu, kèm `note` nói biết từ đâu.

## 5. Kiểm tra
```bash
marc validate <niche-id>
```
Sửa hết LỖI. Cảnh báo "chưa có handle" chấp nhận được nếu thương hiệu thật sự không có kênh đó.

Kết thúc: tóm tắt cho người dùng danh sách thương hiệu, kênh đã có handle, kênh còn thiếu, và hỏi có chạy teardown luôn không.
