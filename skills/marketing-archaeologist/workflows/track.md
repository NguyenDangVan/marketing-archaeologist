# Workflow: theo dõi thay đổi và cập nhật playbook

Mục tiêu: chạy lại trên đúng các nguồn cũ, tìm điều đã đổi, và đề xuất sửa playbook để người dùng duyệt.

## 1. Quan sát lại
- `marc status <niche> --json` để biết lần quan sát gần nhất của từng thương hiệu × kênh.
- Xem lại đúng các trang cũ theo [channels-vn.md](../references/channels-vn.md), ưu tiên: danh sách ad đang chạy, trang sản phẩm bán chạy trên sàn, bảng giá website, 10 video/bài gần nhất.
- Ghi bằng `marc import` như teardown. Cùng ngày thì `marc` tự bỏ trùng; ngày khác thì là quan sát mới — đó là cách đo ad còn chạy bao lâu và "đã bán" tăng bao nhiêu.

## 2. Tìm thay đổi (bằng script trên `marc evidence --json`)
So lần quan sát mới nhất với lần trước của cùng thương hiệu × kênh:

| Thay đổi | Cách xác định |
|---|---|
| Ad mới | URL ad (Library ID) chưa từng xuất hiện |
| Ad không còn thấy | Có ở lần trước, không có trong danh sách đang chạy lần này → "không còn thấy đang chạy", **không** viết "đã tắt vì lỗ" |
| Đổi giá / ưu đãi | `price_vnd` hoặc `text` của cùng URL sản phẩm/bảng giá khác đi |
| Tăng tốc độ bán | Chênh lệch `sold_count_min` / số ngày giữa hai lần chụp; chỉ so sản phẩm với chính nó |
| Bài bùng nổ mới | Bài mới vượt ngưỡng outlier của kênh |
| Đổi tần suất / format | Số bài và phân bố `format` trong 14 ngày gần nhất so với 14 ngày trước |

Ghi mỗi thay đổi đáng kể thành claim `observation` mới (claim cũ giữ nguyên làm lịch sử).

## 3. Đối chiếu với playbook
Đọc `niches/<niche>/playbook.md`. Với mỗi mục trong playbook:
- Bằng chứng mới **ủng hộ** → có thể tăng độ tin cậy.
- Bằng chứng mới **mâu thuẫn** (ví dụ ad cùng góc bị dừng hàng loạt, đối thủ chuyển hẳn format) → đề xuất hạ độ tin cậy, sửa hoặc bỏ.
- Mẫu hình mới xuất hiện ở ≥ 2 thương hiệu → đề xuất thêm mục.

## 4. Viết proposal — không sửa playbook trực tiếp
Tạo `proposals/<YYYY-MM-DD>-<tóm-tắt-ngắn>.md`:

````markdown
# Proposal: <tóm tắt>

Trạng thái: pending
Ngày: <YYYY-MM-DD>
Bằng chứng kích hoạt: [ev_…], [ev_…]
Claim liên quan: cl_…, cl_…

## Lý do
<vì sao cần đổi, đã thấy gì, phản ví dụ nếu có>

## Thay đổi đề xuất
```diff
- <dòng cũ trong playbook.md>
+ <dòng mới>
```
````

Trình bày proposal cho người dùng và hỏi duyệt. **Chỉ khi người dùng đồng ý** mới áp diff vào `niches/<niche>/playbook.md` và đổi trạng thái proposal thành `accepted` (kèm ai duyệt, ngày). Từ chối thì đổi thành `rejected` và giữ file.

(Lệnh `marc proposal` sẽ thay phần thao tác tay này ở tuần 4 — khi có, dùng nó.)

## 5. Báo lại
Danh sách thay đổi quan trọng nhất (ad mới chạy lâu, đổi giá, sản phẩm tăng tốc), proposal đang chờ duyệt, và nguồn lần này bị thiếu.
