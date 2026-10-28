# ART BIBLE — Prism Pact

> Kế hoạch asset & prompt cho pipeline Retro Diffusion. Cập nhật: **2026-10-28**.
> Mục tiêu: dàn nhân vật đứng hai bên kiểu Summoners War, đồng bộ template,
> ảnh sinh rời rạc nên prompt nào cũng phải tự đứng một mình.
> Prompt đầy đủ: `ART_PROMPTS.md` (sinh từ `tools/art/gen_prompts.py`).

---

## 1. Định hướng thị giác

- **Thể loại:** 2D pixel art 16-bit, mobile RPG cao cấp (Summoners War / Epic Seven cảm giác).
- **Bố cục trận:** nhân vật **đứng hai bên**, xoay 3/4 hướng vào giữa; bàn match-3 ở trung tâm.
- **Tỉ lệ:** đầu hơi lớn (chibi-anh hùng, 5.5–6 đầu), vai rộng, chân vững — đọc được ở 1x.
- **Ánh sáng:** một nguồn sáng trên-trái, bóng đổ dưới-phải; rim light mát ở cạnh trái cho tách nền.
- **Outline:** 1px màu `#14101c` (không dùng đen tuyệt đối), chỉ vẽ ngoài silhouette.
- **Không:** anti-alias, gradient mượt, dither dưới 64px, 3D, photoreal, text trong ảnh.

### Palette gốc dùng chung

| Vật liệu | Dark | Mid | Light | Highlight |
|---|---|---|---|---|
| Steel | `#414863` | `#6c7995` | `#a7aeb8` | `#dcdee0` |
| Gold | `#876a14` | `#d9a441` | `#ead0af` | `#fff1c9` |
| Skin | `#a9704a` | `#d99a6c` | `#f2c49b` | `#ffe0c2` |
| Leather | `#3d2916` | `#8a5a3b` | `#bc8d7c` | — |
| Cloth crimson | `#4a1e2e` | `#8c2f3f` | `#c2495a` | — |
| Arcane teal | `#0f766e` | `#2dd4bf` | `#7ff0e2` | — |
| Violet | `#3b2a5e` | `#6d4fa8` | `#a78bfa` | — |
| Fire | `#a32d12` | `#e2561f` | `#ff8a3d` | `#ffc24b` |
| Poison | `#2f4a1c` | `#5d8f2a` | `#9ed24a` | — |
| Bone | `#7c7358` | `#b3a884` | `#ded3ae` | — |
| Ink | `#070a12` | `#14101c` | — | — |

Mỗi sprite chỉ dùng **≤16 màu**, lấy từ bảng trên + 1–2 màu accent riêng của tướng.

---

## 2. Bố cục màn hình (1280×720)

```
┌──────────────────────────────────────────────────────────────────┐
│  MANA ALLY        ● LƯỢT CỦA BẠN        TIMER        MANA ENEMY │ 48px
├───────────────┬──────────────────────────────────┬───────────────┤
│               │        ┌──────────────┐          │               │
│   ALLY TEAM   │        │   8×8 BOARD  │          │  ENEMY TEAM   │
│               │        │              │          │               │
│   [char 1]    │        │    (gem)     │          │   [char 1]    │
│   [char 2]    │        │              │          │   [char 2]    │
│   [char 3]    │        └──────────────┘          │   [char 3]    │
│               │      SKILL BAR / INSTRUCTION     │               │
│  ground y=660 │                                  │  ground y=660 │
└───────────────┴──────────────────────────────────┴───────────────┘
   0–300px              300–980px                      980–1280px
```

- Mỗi bên 3 nhân vật, so le độ sâu (trước lớn hơn sau ~8%), chân cùng đường ground.
- Sprite hiển thị **1:1** ở 160×160 (source 160×160), không scale lẻ.
- Board giữ 8×8, ô ~52px; gem 48×48.
- Nền đấu trường phải chừa vùng tối/thấp ở hai bên để sprite nổi.

**Lưu ý code:** hiện `BattleScene` đang vẽ card 328×172/110. Muốn layout này phải refactor
sang sprite + HP bar dưới chân — đây là việc code, không phải việc vẽ.

---

## 3. Quy chuẩn kỹ thuật

### 3.1 Kích thước

| Nhóm | Size (px) | Ghi chú |
|---|---|---|
| Battle sprite | 160×160 / frame | sheet ngang, anchor chân giữa |
| Portrait card | 96×96 | bust, nền trong suốt |
| Avatar mini | 48×48 | downscale từ portrait |
| Archetype icon | 32×32 | dùng cho draft/lobby |
| Skill icon | 64×64 | khung tròn/vuông |
| Gem | 48×48 | 6 loại |
| Status icon | 24×24 | 10 loại |
| UI 9-slice | 48×48 gốc | kéo giãn bằng Phaser |
| Background | 1280×720 | sinh 640×360 rồi upscale 2x nearest |
| FX sheet | 64/96/128 | theo hiệu ứng |

### 3.2 Animation

| State | Frames | ms/frame | Loop | Ghi chú |
|---|---|---|---|---|
| idle | 4 | 200 | ✓ | thở bằng vai + ngực, chân đứng yên |
| attack | 5 | 80 | ✗ | anticipation → strike → follow-through |
| cast | 4 | 100 | ✗ | gồng → bung chiêu |
| hurt | 2 | 100 | ✗ | giật lùi, nhăn mặt |
| death | 4 | 140 | ✗ | loạng choạng → quỳ → đổ |
| victory | 3 | 150 | ✓ | giơ vũ khí, ưỡn ngực |

- Mọi frame cùng khung 160×160, chân đặt cùng ground line (row 154–156).
- Sheet ngang, mỗi frame cách nhau đúng 160px, không padding.
- Hướng: **tất cả nhìn sang phải**; bên địch flipX trong engine.

### 3.3 Đặt tên

```
assets/art/char/<hero>/<hero>_<state>.png      # tank_idle.png
assets/art/char/<hero>/<hero>_portrait.png
assets/art/char/<hero>/<hero>_icon32.png
assets/art/char/<hero>/<hero>_skill.png
assets/art/ui/<group>/<name>.png
assets/art/fx/<name>.png
assets/art/bg/<scene>.png
```

---

## 4. Inventory — full danh sách cần vẽ

### 4.1 Nhân vật (20 hero)

Mỗi hero 9 ảnh: portrait, icon32, skill icon, idle, attack, cast, hurt, death, victory.

| # | Hero | Vai trò | Silhouette chính | Accent |
|---|---|---|---|---|
| 1 | Tank | Tank | khiên tháp + giáp tấm, đầu trọc sẹo | crimson |
| 2 | Burst | Mage | robe đỏ cam, hai quả cầu lửa | fire |
| 3 | Healer | Support | robe trắng gold, trượng pha lê | gold/white |
| 4 | Controller | Control | hood teal, bánh răng đồng hồ | teal/brass |
| 5 | Buffer | Support | giáp xanh-gold, cờ chiến sau lưng | blue/gold |
| 6 | Debuffer | Debuff | mặt nạ chim dịch hạch, lọ axit | poison green |
| 7 | Assassin | Assassin | hood tím đen, mặt nạ, dao găm đôi | violet/cyan |
| 8 | Bruiser | Bruiser | đầu mohawk, mình trần, găng sắt | leather/red |
| 9 | Paladin | Tank/sustain | giáp vàng, mũ có cánh, hào quang | gold |
| 10 | Juggernaut | Tank/counter | giáp đen khổng lồ, mũ sừng | iron/red |
| 11 | Executioner | Assassin | hood đao phủ, rìu hai tay | black/red |
| 12 | Sniper | Assassin | cloak xanh, kính, súng trường dài | green/brass |
| 13 | Cleaver | Bruiser | tạp dề dính máu, dao phay khổng lồ | blood/steel |
| 14 | Berserker | Bruiser | mình trần, war paint, rìu đôi | red/bone |
| 15 | Pyromancer | Mage | tóc lửa, robe mận-gold | fire/maroon |
| 16 | Venomancer | Mage | hood rắn, trượng rắn, lọ độc | poison/violet |
| 17 | Necromancer | Summoner | giáp xương, mặt nạ sọ, trượng sọ | bone/violet |
| 18 | Chronarch | Controller | robe xanh-gold, trượng đồng hồ cát | blue/gold |
| 19 | Spellbreaker | Controller | giáp teal-đen, hào quang vỡ | teal/black |
| 20 | Oracle | Healer | blindfold trắng-gold, mắt thứ ba | white/gold |

Tổng: **180 ảnh**.

### 4.2 UI

| Nhóm | Số ảnh | Ghi chú |
|---|---:|---|
| Panel 9-slice (top bar, side, center, modal, log, tooltip, ban reveal, turn pill, skill chip, mini slot) | 10 | 48×48 gốc |
| Card frame (ally, enemy, banned, neutral) | 4 | 9-slice |
| Button (primary, secondary, gold, ghost, danger) | 5 | sheet 4 state |
| Bar (HP, mana, shield overlay, timer ring) | 4 | fill + frame |
| Input field / tab / divider | 3 | — |
| Icon chức năng (timer, sound, settings, info, lock, check, cross, arrow, refresh, wallet, link, copy, wifi, warning) | 16 | 24×24 |
| Rank badge (Bronze, Silver, Gold, Diamond, Prism) | 5 | 64×64 |
| Coin (gold, USDC) | 2 | 32×32 |
| Logo mark + wordmark | 2 | — |

Tổng UI: **51 ảnh**.

### 4.3 Gem & status

- Gem: ATK, HP, Mana, Shield, Bomb, Rainbow — **6 ảnh** 48×48.
- Status: Burn, Poison, Shield, Taunt, Invincible, Thorns, DEF Up, Weaken, Skill Tax, Summon — **10 ảnh** 24×24.
- Hệ icon archetype 32×32: **20 ảnh**.

### 4.4 Background & khung cảnh

| Ảnh | Mô tả |
|---|---|
| Lobby | đại sảnh lăng kính, 3 cột, quầy đấu trường |
| Draft | bàn chiến thuật, bản đồ, ghế hai bên |
| Arena — Colosseum | đấu trường đá, khán đài, đuốc |
| Arena — Prism Temple | đền pha lê, portal, sàn khảm |
| Arena — Frost/Volcanic | biến thể nóng/lạnh |
| Result | nền thắng/thua (ray light / vignette) |
| Boot splash | logo + nền tối |

**7 ảnh**.

### 4.5 Hiệu ứng

Slash arc, impact burst, fire explosion, poison cloud, heal sparkle, shield hex, lightning,
bomb explosion, rainbow sweep, crit flash, death dissolve, summon glyph, buff aura,
debuff smoke, turn flash, victory rays, defeat vignette — **17 sheet**.

### 4.6 Tổng

| Nhóm | Ảnh |
|---|---:|
| Nhân vật (gồm portrait, icon32, skill, 6 state) | 180 |
| UI | 51 |
| Gem + status | 16 |
| Background | 7 |
| FX | 17 |
| **Tổng** | **271** |

> Icon archetype 32×32 đã nằm trong 180 ảnh nhân vật (mỗi hero 1 icon).

---

## 5. Thứ tự ưu tiên

**P0 — demo được:**
1. 20 portrait 96×96 + 20 icon32.
2. 20 idle 4 frame + 20 attack 5 frame.
3. 20 hurt 2 frame.
4. Battle arena (Colosseum) + Lobby + Draft.
5. 6 gem + 10 status + UI panel/button/bar.
6. 8 FX cốt lõi (slash, impact, fire, poison, heal, shield, bomb, crit).

**P1:** death, victory, cast, skill icon, 2 arena variant, 5 rank badge, 10 FX còn lại.

---

## 6. Pipeline Retro Diffusion → game

1. Sinh ảnh theo prompt trong `ART_PROMPTS.md` (mỗi ảnh một prompt, nền trong suốt).
2. Đưa vào Aseprite: cắt frame, canh ground line, xoá nền sót.
3. `quantize_to_palette` về palette chung; `outline_cel` nếu ảnh thiếu viền.
4. `lint_sprite` + `get_color_stats` + `get_bounds` từng frame.
5. Export PNG/atlas đúng tên ở mục 3.3; sheet animation đúng 160px/frame.
6. Kiểm tra ở 1x trên nền tối: silhouette còn đọc được không.

### Checklist QA mỗi ảnh
- [ ] Đúng 160×160 (hoặc size quy định), nền trong suốt.
- [ ] Chân cùng ground line, không cắt đầu/cắt chân.
- [ ] ≤16 màu, không lạc palette.
- [ ] Outline 1px `#14101c`, không viền răng cưa.
- [ ] Nhìn 1x vẫn nhận ra tướng trong 0.5s.
- [ ] Các frame cùng tỉ lệ, cùng trang bị, không đổi màu.

---

## 7. Ghi chú chống lệch template

- Prompt nào cũng lặp lại **mô tả nhân vật đầy đủ** + **style block**, vì ảnh sinh độc lập.
- Không dùng từ trừu tượng ("cool", "epic") — tả hình dạng, màu, chất liệu, hướng nhìn.
- Cùng một câu mô tả cho mọi state của một tướng; chỉ đổi clause animation.
- Nếu Retro Diffusion ra sai tỉ lệ: sửa prompt theo hướng "5.5 heads tall, broad shoulders,
  thick limbs", tránh "chibi".
