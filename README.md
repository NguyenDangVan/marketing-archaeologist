# Marketing Archaeologist

Agent skill mã nguồn mở giúp AI agent reverse engineer cách đối thủ làm marketing trong một ngách — từ bằng chứng công khai (Thư viện quảng cáo Meta, fanpage, TikTok, Shopee/TikTok Shop, YouTube, website, báo ngành) — và viết teardown, playbook có dẫn chứng, cập nhật khi thị trường thay đổi.

Thị trường đầu tiên: Việt Nam.

Gồm hai phần:
- **Skill** (`skills/marketing-archaeologist/`): agent đọc để biết xem gì, ghi gì, luật nào không được phá.
- **`marc`**: CLI agent gọi để lưu bằng chứng + ảnh chụp, chống trùng, kiểm tra luật bằng chứng, tính toán và so sánh theo thời gian. `marc` không gọi LLM, không cần API key.

> **Trạng thái:** v0.1, đang dogfood. Có: skill (setup, teardown, track), `marc` init / validate / status / import / evidence / feature / claim. Chưa có: `marc analyze`, `diff`, `proposal`, `eval`, connector tự động. Xem [PRD](docs/specs/2026-10-12-marketing-archaeologist-prd.md) §14.

## Cài đặt (Claude Code)

Cần Node ≥ 22.13 và pnpm.

```bash
git clone https://github.com/NguyenDangVan/marketing-archaeologist.git
cd marketing-archaeologist
pnpm install && pnpm build && pnpm link --global   # đưa `marc` lên PATH
marc --version

# cài skill cho mọi dự án của bạn
ln -s "$PWD/skills/marketing-archaeologist" ~/.claude/skills/marketing-archaeologist
```

Tạo một thư mục riêng để chứa dữ liệu nghiên cứu (workspace), mở Claude Code ở đó và nói, ví dụ: *"soi 5 đối thủ mỹ phẩm D2C trên Shopee và TikTok giúp tôi"*.

## Dùng `marc` trực tiếp

```bash
export MARC_WORKSPACE=~/marc-research
marc init vn-skincare-d2c --name "Mỹ phẩm D2C"
# khai báo thương hiệu trong $MARC_WORKSPACE/niches/vn-skincare-d2c/brands.yaml
marc validate vn-skincare-d2c

marc import vn-skincare-d2c \
  --brand brand_vi_du --source shopee --kind product_listing \
  --url https://shopee.vn/... --text "Serum Vi Dụ 30ml" \
  --metric sold_count_display=10,2k --metric rating=4.8 \
  --snapshot ./chup-man-hinh.png

marc status vn-skincare-d2c
marc claim list vn-skincare-d2c
```

## Phát triển

Xem [AGENTS.md](AGENTS.md) cho nguyên tắc, bố cục và quy ước.

```bash
pnpm typecheck && pnpm test
pnpm marc --help    # chạy CLI từ source
```

## Giấy phép

MIT
