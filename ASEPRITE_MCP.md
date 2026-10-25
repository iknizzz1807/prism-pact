# ASEPRITE MCP — Pipeline pixel art

> Cách agent vẽ asset pixel art cho Prism Pact: cài đặt, danh mục tool, vòng tự kiểm,
> và các cạm bẫy đã trả giá. Cập nhật: **2026-10-25**.
> Bổ sung cho `AGENTS.md` (quy ước chung) — không lặp lại luật chơi ở `README.md`.

---

## 1. Môi trường

| Thành phần | Đường dẫn / phiên bản |
|---|---|
| Aseprite | `C:\Users\Administrator\Desktop\aseprite-windows-x64-v1.3.16\aseprite.exe` — 1.3.16 |
| `uv` | `C:\Users\Administrator\.local\bin\uv.exe` — 0.13.5 |
| Repo MCP | `C:\Users\Administrator\tools\aseprite-mcp` (fork từ `diivi/aseprite-mcp`) |
| Python | **≥ 3.13** (venv của repo: 3.13.17). Bản 3.11 trở xuống không chạy. |

Cài lại từ đầu:

```powershell
git clone https://github.com/diivi/aseprite-mcp.git "$env:USERPROFILE\tools\aseprite-mcp"
& "$env:USERPROFILE\.local\bin\uv.exe" sync --directory "$env:USERPROFILE\tools\aseprite-mcp"
```

`ASEPRITE_PATH` là biến duy nhất server cần. Nếu thiếu, `AsepriteCommand` rơi về
`aseprite` trên PATH và mọi tool trả lỗi.

## 2. Server có gì

**123 tool**, tên đầy đủ khi gọi từ agent là `mcp__aseprite__<tool>`.

| Nhóm | Tool chính |
|---|---|
| Khung & lớp | `create_canvas`, `add_layer`, `add_group`, `delete_layer`, `merge_layer_down`, `flatten_sprite` |
| Vẽ | `draw_rows`, `draw_pixels_at`, `draw_rectangle_at`, `draw_line_at`, `draw_ellipse_at`, `draw_polygon`, `draw_path`, `fill_area_at`, `draw_text`, `draw_iso_box` |
| Đọc & kiểm | `read_rows`, `get_pixels_rect`, `get_composite_rect`, `lint_sprite`, `get_color_stats`, `get_bounds`, `compare_frames`, `audit_animation` |
| Xem | `view_sprite` — **trả về ảnh**, đây là "mắt" của agent |
| Animation | `add_frames`, `clear_cel`, `copy_frame`, `offset_cel_positions`, `set_frame_duration`, `set_tag`, `export_animation` |
| Xuất | `export_sprite`, `export_frame`, `export_spritesheet`, `export_tag` |
| Màu | `generate_color_ramp`, `set_palette`, `apply_palette_preset`, `quantize_to_palette`, `replace_color` |
| Khác | `import_image_as_layer`, `run_lua_script` (phương án cuối) |

Bốn tool đáng giá nhất mà tài liệu upstream không nhấn: `view_sprite`,
`read_rows` (đọc pixel thành ASCII, sửa rồi vẽ lại), `lint_sprite` (bắt pixel lạc
theo toạ độ) và `compare_frames` (chứng minh một bộ phận không nhúc nhích).

## 3. Đăng ký MCP

### DSH

File `~/.dsh/profiles/desktop/cordis.patch.yml`. **Entry mới phải bọc trong `insert:`** —
viết trực tiếp `- id: X` + `config:` là *sửa* entry đã có, và sẽ báo
`patch: entry "X" not found` rồi bỏ cả layer.

```yaml
- insert:
    - id: mcp-aseprite
      name: "@deepseek-ai/dsh-mcp-client"
      config:
        serverName: aseprite
        transport: stdio
        command: "C:\\Users\\Administrator\\.local\\bin\\uv.exe"
        args:
          - "--directory"
          - "C:\\Users\\Administrator\\tools\\aseprite-mcp"
          - "run"
          - "-m"
          - "aseprite_mcp"
        cwd: "C:\\Users\\Administrator\\Documents\\GitHub\\prism-pact"
        env:
          ASEPRITE_PATH: "C:\\Users\\Administrator\\Desktop\\aseprite-windows-x64-v1.3.16\\aseprite.exe"
          PYTHONUTF8: "1"
        toolCallTimeoutMs: 120000
        failOnStartupError: false
```

`env` được merge đè lên env đã bị scrub (bỏ biến dạng credential và `DSH_*`), nên
`ASEPRITE_PATH` **bắt buộc** khai báo. Đổi file phải **thoát hẳn app** rồi mở lại —
đóng cửa sổ chỉ thu xuống tray.

Kiểm chứng không cần restart: copy profile sang tên khác rồi `dsh --profile <tên> --dump-config`
(CLI chặn tên `desktop`). `exit 0` + thấy entry trong cây = hợp lệ.

### Client khác

Claude Desktop / Cursor / Cline: khối `mcpServers` stdio quen thuộc, cùng
`command` + `args` + `env` như trên. Gemini/Antigravity: `~/.gemini/config/mcp_config.json`.

**Không bao giờ** chạy `uv run -m aseprite_mcp` trong terminal — nó là JSON-RPC
stdio, sẽ treo vô hạn chờ input.

## 4. Vòng làm việc chuẩn

1. **Kế hoạch trước khi vẽ**: ghi ra hộp pixel của từng bộ phận (đầu, thân, chân, vũ khí),
   chừa 1–2 px lề.
2. **Silhouette một màu phẳng** bằng shape tool cho khối lớn, `draw_rows` cho chi tiết
   dưới ~12 px (mặt, tay, khoá, mắt). Cạnh sạch: bước đều trên chéo, không pixel mồ côi.
3. **Palette trước màu**: một `generate_color_ramp` (3–4 bậc) mỗi vật liệu, tổng 8–16 màu.
   Hai vật liệu cạnh nhau phải khác **độ sáng**, không chỉ khác hue.
4. **Flats rồi mới shade**, một hướng sáng (trên-trái): highlight phía sáng, shadow phía
   khuất và dưới gờ. Không pillow shading.
5. **Outline một màu tối** — `outline_cel` thêm 1 px ra ngoài, `region=` để chỉ outline
   một vật thể.
6. **Tự kiểm sau mỗi lượt** (xem mục 5), sai thì sửa hình chứ đừng thêm chi tiết.
7. Vật thể phải **nằm trọn trên bề mặt**, bộ phận dính vào nhau.

### Animation

Đọc `animation_workflow_guide(use_case="idle")` trước khi làm loop. Tóm tắt:

- Idle là loop 2–6 frame, thở bằng cách **thân + vai + đầu nhô 1 px cùng frame**;
  **chân không được di chuyển**; vật cầm tay nhô theo vai.
- 150–300 ms/frame, frame cuối chảy về frame 1.
- **Đừng redraw từng frame.** Tách layer tĩnh (`legs`) và layer nhấp nhô (`upper`),
  chồng lấn ≥3 px ở eo, rồi `offset_cel_positions` ±1 px. 4 frame tốn 4 call nhỏ
  thay vì 4 lần vẽ lại toàn thân.

## 5. Tự kiểm — thứ tự rẻ tới đắt

| Bước | Tool | Trả lời câu gì |
|---|---|---|
| 1 | `lint_sprite` | Có bộ phận rời, pixel mồ côi, pixel lạc màu không? (kèm toạ độ) |
| 2 | `get_color_stats` | Có màu lạc ngoài palette không? |
| 3 | `get_bounds` | Đỉnh/đáy có nhích đúng không? |
| 4 | `compare_frames(layer_name=…)` | Bộ phận phải đứng yên có đứng yên thật không? |
| 5 | `view_sprite` | Chỉ khi 4 bước trên không trả lời được |

## 6. Cạm bẫy

1. **`add_frames` copy cel của frame trước.** Vẽ pose mới lên mà không xoá thì phần nào
   pose mới ngắn hơn sẽ lộ pose cũ (viền đen ngang thân, mảng tối thừa ở đáy).
   Luôn `clear_cel` sau `add_frames` nếu định vẽ lại toàn bộ.
   *Dấu hiệu*: `get_bounds` frame 2 trả hộp cao bất thường (gộp với frame 1).
2. **`draw_rows` không xoá pixel.** `"."` hoặc ký tự không có trong legend = để nguyên.
   Muốn xoá phải map ký tự đó sang `"#00000000"`.
3. **Legend chỉ nhận chuỗi hex.** `{".": None, "B": "#3fa34d"}` đúng;
   `{".": (0,0,0,0)}` → `Invalid color value`. Tool **trả chuỗi lỗi chứ không raise** —
   agent không đọc kết quả sẽ tưởng thành công mà sprite rỗng.
4. **`create_canvas` tạo sẵn `Layer 1`.** Thêm layer riêng thì `delete_layer("Layer 1")`
   hoặc vẽ luôn lên nó, đừng để lại layer rỗng.
5. **`compare_frames` phải chỉ đúng lớp.** Đo cả vùng ảnh ở chân sẽ dính mũi kiếm/khiên
   (vật cầm tay nhô theo thân) và báo sai. Dùng `layer_name="legs"`.
6. **Client Python tự viết trên Windows treo khi đóng**: `stdio_client` + asyncio
   proactor giữ pipe. Gọi `os._exit(0)` sau tool cuối. Chỉ ảnh hưởng client tự viết,
   IDE không bị.
7. **Đường dẫn trong Lua phải dùng `/`.** Chỉ liên quan `run_lua_script`.

## 7. Chi phí token (đo thật)

| Thao tác | Token |
|---|---|
| `draw_rows` 48×13 | ~200 |
| một shape call | ~120–150 |
| `lint` / `get_bounds` / `compare_frames` (JSON) | 60–150 |
| `view_sprite` 1 frame | ~400 |
| `view_sprite` 4 frame (contact sheet) | ~1 100 |

Một nhân vật 48×48 kèm idle 4 frame ≈ **8–9k token**. Cho 20 hero: ~160k nếu làm
từng con và nhìn ảnh mỗi con; cắt còn ~50–60k bằng cách verify theo lô và chỉ mở
ảnh khi text không đủ.

## 8. Ví dụ trong repo

| File | Nội dung |
|---|---|
| `tools/aseprite/design.py` | Dựng rows ASCII + render nháp bằng Pillow — lặp hình nhanh mà không cần bật server |
| `tools/aseprite/client_example.py` | Client stdio đầy đủ, dùng khi MCP không có sẵn (CI, script) |

`tools/aseprite/` chỉ để tham chiếu. Đường chính vẫn là gọi `mcp__aseprite__*`.
