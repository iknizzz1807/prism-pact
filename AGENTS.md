# AGENTS — Prism Pact

> Điểm vào cho agent tự động (Claude Code, Cursor, Codex, DSH…).
> Đọc file này trước, nó chỉ đường tới phần còn lại. Cập nhật: **2026-10-25**.

---

## 1. Đọc gì, theo thứ tự nào

| # | File | Nội dung | Khi nào |
|---|---|---|---|
| 1 | `PROGRESS.md` | Đang ở đâu, còn gì, cạm bẫy. File bàn giao. | **Luôn đọc đầu tiên** |
| 2 | `README.md` | Spec đầy đủ: luật chơi, kinh tế, kiến trúc, quyết định D-01 → D-22 | Khi sửa hành vi game |
| 3 | `HEROES_20_DESIGN.md` | Thiết kế 20 tướng, counter, ngân sách sức mạnh | Khi sửa cân bằng/tướng |
| 4 | `ASEPRITE_MCP.md` | Pipeline pixel art qua Aseprite MCP | Khi làm asset hình ảnh |

Không đọc hết cả bốn. Chọn theo việc đang làm — `PROGRESS.md` luôn là điểm xuất phát.

## 2. Quy ước repo

- **Monorepo npm workspaces**: `shared/`, `contracts/`, `server/`, `client/`.
- **Trước khi commit thay đổi code**: `npm test` và `npm run typecheck` phải xanh.
  Commit chỉ sửa tài liệu thì không cần chạy.
- **Commit message**: Conventional Commits, scope theo vùng —
  `feat(ui):`, `fix(server):`, `test:`, `balance:`, `docs:`, `chore:`.
  Xem `git log --oneline` để lấy giọng văn hiện có.
- **Tài liệu**: tiếng Việt, mở đầu bằng blockquote trạng thái + ngày, rồi `---`.
- **Không commit** artifact tạm: `artifacts/`, `*-run-logs/`, `*.log`, `__pycache__/`
  đã nằm trong `.gitignore`; thư mục nháp `.aseprite-trial/` cũng vậy.

## 3. Pixel art — luật cứng

Asset pixel art đi qua **Aseprite MCP** (`mcp__aseprite__*`), không vẽ tay bằng
script Python rồi ghi file PNG.

Một việc chỉ được coi là xong khi đã qua vòng tự kiểm:

```
vẽ  →  lint_sprite  →  get_bounds / compare_frames  →  view_sprite  →  báo xong
```

Chi tiết đầy đủ, danh mục tool và các cạm bẫy đã trả giá: **`ASEPRITE_MCP.md`**.

Ba lỗi hay gặp nhất, nhớ trước khi đọc file kia:

1. `add_frames` **copy cel của frame trước** — phải `clear_cel` trước khi vẽ pose mới,
   nếu không pose cũ lộ ra ở chỗ pose mới ngắn hơn.
2. `draw_rows` **không xoá** pixel: `"."` là để nguyên, muốn xoá phải map `"#00000000"`.
3. Kiểm tra chân/chi tiết đứng yên phải dùng `compare_frames(layer_name=…)`,
   đừng đo cả vùng ảnh — kiếm/khiên cầm tay cũng nhô theo thân và sẽ báo sai.
