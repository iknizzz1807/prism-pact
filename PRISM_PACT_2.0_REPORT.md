# Prism Pact 2.0 — Báo cáo hợp nhất

> **Đây là báo cáo đề xuất, không phải trạng thái code hiện tại.**
> Bản balance đã apply ngày 25/10/2026 nằm ở `PROGRESS.md` mục 17 và `README.md` D-23.
>
> Tổng hợp từ 5 agent nội bộ (code, roster, gem, PvE, meta) + đề xuất “20 Monsters” của LLM khác.
> Mục tiêu: giữ lõi target-commitment, mở rộng 20 tướng, thêm ngọc mới, thêm PvE monster — nhưng vẫn làm được bởi team nhỏ.

---

## 0. Kết luận điều hành

Đề xuất của LLM khác có **5 ý rất tốt** nên lấy, **5 điểm phải chặn hoặc sửa**, và **1 lỗi thuật ngữ** cần sửa.

**Chốt thiết kế:**

- **20 playable heroes** (không gọi là 20 monster). PvE monster là lớp riêng.
- **3v3**, pool 20, pick 4 + ban ẩn 1, draft snake-8.
- **5 loại ngọc gốc**: ATK / HP / MANA / SHIELD / **HEX**. Không dùng Haste.
- **Special mới**: match-4 thẳng → **LASER** quét hàng/cột; match chữ L/T → **BOMB**; match-5 → **RAINBOW**.
- **Hệ nguyên tố** chỉ là faction/filter + affinity trong PvE. **Không có ±15% damage trong ranked PvP.**
- **PvE monster** dùng turn bất đối xứng, intent telegraph; 3 encounter + 1 boss.
- **Không revive, không silence, không petrify, không ignore 100% DEF, không RNG debuff, không CD lock.**
- Refactor nền tảng trước, content sau. Nếu không, draft sẽ treo khi thêm tướng.

---

## 1. Đánh giá đề xuất của LLM khác

### 1.1 Năm điểm nên lấy

1. **Tổ chức roster theo vai trò × hệ.** Đây là cách chia rất dễ đọc cho 20 tướng. Ta dùng nó làm **faction tag** và filter UI, không dùng làm damage modifier trong PvP.
2. **Các mechanic RPG đã được chứng minh**: AoE cleave, DoT (burn/poison), mana burn, cooldown manipulation, counter/thorn, delayed bomb. Đây là chất liệu tốt để 20 tướng không bị “cùng một khuôn”.
3. **Mapping Laser hợp lý hơn BEAM**: match-4 thẳng → laser hàng/cột; L/T → bomb; match-5 → rainbow. Trực quan hơn “L/T tạo beam”.
4. **Layout Draft 1280×720**: 3 cột, tabs filter, lưới 5×4, inspector dock. Rất phù hợp với UI hiện tại.
5. **Nhận diện được bẫy test**: tách `totalPicks` khỏi `ROSTER.length`, giữ 3v3, protocol phải được xử lý.

### 1.2 Năm điểm phải chặn hoặc sửa

| Điểm | Vấn đề | Cách sửa |
|---|---|---|
| **Hệ nguyên tố ±15% damage trong PvP** | Thêm một lớp counter 5×5 chồng lên 20 kit; draft biến thành “pick hệ” thay vì “pick kit”; balance matrix nổ | Chỉ dùng hệ làm **faction/filter**. PvE có affinity ±15%; ranked PvP không |
| **Haste gem (giảm CD toàn đội)** | Mỗi match-3 giảm CD cả 3 tướng → skill spam, snowball, phá nhịp 1 skill/lượt; không có counterplay | Bỏ Haste. CD manipulation chỉ nằm ở **skill của Chronarch**, có mana + CD + cap |
| **Quá nhiều cơ chế “cheat chết”** | Invincible + Revive + Endure + 1HP passive + 60% counter → trận kéo dài, stall meta | Chỉ giữ **1 Invincible** (Paladin, 1 lượt, 1 lần/trận, chỉ target ally). **Không revive/endure** ở launch |
| **Kit quá tải / RNG / one-shot** | Ignore 100% DEF, +3 CD lock, random 3-hit debuff, petrify, silence, reset CD on kill | Cap ignore DEF 50%; CD +1 (max +2); bỏ RNG debuff; bỏ silence/petrify; reset CD chỉ giảm 2, không về 0 |
| **“117 test vẫn xanh” và “protocol backward compatible 100%”** | Thêm 20 hero + status/AoE/DoT chắc chắn phải sửa test và protocol | Giữ 117 test cũ xanh **và** thêm 40–60 test mới; protocol là additive, không phải 100% tương thích client cũ |

### 1.3 Sửa thuật ngữ

- **20 unit playable = 20 heroes/archetypes**, không phải 20 monster.
- **Monster** là enemy PvE (Void Maw, Warden, Leech, Mirror Shade, boss Hollow Prism).
- Nếu muốn giữ fantasy “monster collection”, đặt tên fantasy cho hero (Aurelius, Ignis, Nyx…) nhưng **cơ chế vẫn là hero**.

---

## 2. Hệ thống chốt

### 2.1 Ba trụ cột giữ nguyên

1. **Draft đối kháng** — counter-pick thật, không blind pick.
2. **Target commitment** — chọn target trước khi biết mình ăn bao nhiêu ngọc.
3. **No-loss prize** — để sau, không ảnh hưởng bản gameplay này.

### 2.2 Roster 20 heroes

**8 hero cũ** giữ nguyên, chỉ tune nhẹ:

| Hero | Role | Skill | Passive | Ghi chú |
|---|---|---|---|---|
| Tank | Tank | Taunt 40/3 | +30% DEF khi HP <50% | Giữ |
| Burst | Mage | Nuke 2.6× 50/3 | +15% ATK khi HP >70% | Giảm từ 3× |
| Healer | Healer | Mass Heal 40% 60/4 | Tự hồi 5%/lượt | Giữ |
| Controller | Control | Weaken −50% ATK 2T 40/3 | Skill hit → +10 mana | Giữ |
| Buffer | Support | Rally +30% ATK +20% shield 2T 50/3 | Team +10% ATK | Giữ |
| Debuffer | Debuff | Strip −50% DEF 2T 40/3 | Team +15% vs debuffed | Giữ |
| Assassin | Assassin | Execute 2.5× ignore 50% DEF 55/3 | +30% vs <30% HP | Mana 50→55 |
| Bruiser | Bruiser | Lifesteal 2× +50% heal 45/3 | Team +12% lifesteal | 15%→12% |

**12 hero mới** (bản hợp nhất):

| # | Hero | Role | HP/ATK/DEF | Skill (mana/CD) | Passive | Điểm yếu / khắc chế |
|---|---|---|---|---|---|---|
| 9 | **Paladin** | Tank/sustain | 1750/55/55 | **Divine Aegis** 50/4 — 1 ally Invincible 1 lượt; 1 lần/trận | Ally <40% HP +15% DEF | Strip, cooldown tax; Invincible không chặn DoT |
| 10 | **Juggernaut** | Tank/counter | 1900/45/65 | **Iron Thorns** 45/3 — 2 lượt phản 40% damage basic, +20% DEF | Mỗi lần bị basic hit +5% ATK (cap +20%) | Skill/AoE không kích hoạt; heal outlast |
| 11 | **Executioner** | Assassin/anti-tank | 1000/95/20 | **Sever** 50/4 — 1.8× ATK +12% maxHP true, ignore 40% DEF | +25% damage vs DEF ≥40 | Shield, Assassin, burst |
| 12 | **Sniper** | Assassin/shield-break | 800/115/12 | **Deadshot** 45/3 — 2.4× ATK, xuyên shield; +30% nếu target có shield | +15% ATK vs target full HP | Taunt, Tank |
| 13 | **Cleaver** | Bruiser/AoE | 980/105/15 | **Amputation** 60/4 — 1.3× ATK cả 3 địch, +10% mỗi địch còn sống | +15% ATK khi còn 3 địch | Shield, single-target burst |
| 14 | **Berserker** | Bruiser/risk | 1500/90/25 | **Reckless Swing** 40/3 — 2.2× ATK, mất 10% HP hiện tại, +25% ATK 2T | +1% ATK mỗi 2% HP đã mất (cap +30%) | Control, burst |
| 15 | **Pyromancer** | Mage/DoT | 950/75/20 | **Ignite** 45/3 — 1.2× ATK + Burn 4% maxHP/lượt 2T | +15% damage vs burning | Cleanse, shield |
| 16 | **Venomancer** | Mage/AoE DoT | 1050/60/25 | **Toxic Miasma** 50/4 — Poison 3% maxHP/lượt 2T lên cả 3 địch, xuyên shield | +1% poison damage mỗi debuff khác | Cleanse, burst |
| 17 | **Necromancer** | Summoner | 950/60/20 | **Raise Thrall** 60/5 — Thrall 350 HP/45 ATK, đánh target đã commit, chết theo owner | +20 mana khi ally chết | AoE, dive owner |
| 18 | **Oracle** | Healer/cleanse | 1150/35/28 | **Mend** 45/3 — hồi 35% maxHP cho ally thấp nhất + cleanse 1 debuff | Ally <30% HP nhận −15% damage | AoE, Assassin |
| 19 | **Chronarch** | Controller/tempo | 1000/50/25 | **Time Warp** 50/4 — +1 CD toàn bộ skill địch (cap +2), −1 CD 1 ally | Skill đầu tiên mỗi trận của mỗi ally −10 mana | Mana denial, basic-attack team |
| 20 | **Spellbreaker** | Controller/mana | 1150/65/30 | **Mana Drain** 45/3 — đốt 25 mana địch, nhận 15, strip 1 buff | Skill địch +5 mana cost | Basic-attack team |

**Phân bổ role:** Tank 3 · Bruiser 3 · Assassin 3 · Mage 4 · Support 3 · Controller 4 = **20**.

**Faction gợi ý (chỉ filter/PvE):**
- Fire: Burst, Pyromancer, Berserker, Cleaver
- Water: Healer, Oracle, Sniper, Spellbreaker
- Wind: Assassin, Executioner, Chronarch, Controller
- Light: Tank, Paladin, Buffer, Juggernaut
- Dark: Bruiser, Venomancer, Necromancer, Debuffer

**Reserve cho Season 2:** Warden, Frostbinder, Tactician, Duelist, Alchemist, Plaguebearer, Nullifier, Monk.

### 2.3 Draft

**Ranked — 3v3, pool 20, pick 4 + ban ẩn 1, snake-8:**

```
P1 → P2 → P2 → P1 → P1 → P2 → P2 → P1
```

- Mỗi bên 4 tướng; 8 picked, 2 banned, **6 vào sân**.
- 20 pool → 12 tướng không được pick; đây là variety, không phải lãng phí.
- Snake loại bỏ lợi thế last-pick của P2.
- Draft ~90–140s; trận 3–5 phút.

**Casual — “Chaos Draft” (lấy ý tưởng pool 12 ngẫu nhiên):**
- Server seed chọn 12 tướng từ 20, đảm bảo tối thiểu 2 Tank, 2 Support, 4 Damage.
- Pick 4 + ban 1. Không dùng cho ranked vì giảm fairness và khả năng học counter.

**Rookie queue:** 12 tướng curated cho 10 trận đầu.

### 2.4 Ngọc: 5 gốc + 3 special

**5 gốc:** ATK / HP / MANA / SHIELD / **HEX**.

| Ngọc | Tỉ lệ | Hiệu ứng |
|---|---|---|
| ATK ⚔️ | 23% | Mỗi gem = 1 hit lên target; cap 5 hit/lượt |
| HP 🩸 | 23% | +1% maxHP mỗi gem cho cả đội |
| MANA 💧 | 22% | +1 mana/gem |
| SHIELD 🛡️ | 22% | +1% maxHP shield/gem, cap 60% |
| **HEX ☠️** | **10%** | Sau basic attack, gắn HEX lên target đã commit: +15% damage basic lượt kế; không stack, chỉ refresh; HEX dư → +1 mana |

**HEX tốt hơn Haste vì:**
- Nó **thưởng cho target commitment**, đúng signature mechanic.
- Không tăng số skill/lượt, không phá nhịp mana/CD.
- Không tạo snowball trực tiếp; damage vẫn qua cap 5 hit.

**Special:**

| Combo | Tạo ra | Hiệu ứng |
|---|---|---|
| Match 4 thẳng hàng/cột | **LASER ⚡** | Quét sạch toàn bộ hàng hoặc cột (8 ô) |
| Match 4 chữ L/T | **BOMB 💣** | Nổ 3×3 |
| Match 5 thẳng | **RAINBOW 🌈** | Xoá toàn bộ 1 loại ngọc |
| Bomb + Laser chain | — | Nổ lan, mỗi special 1 lần/lượt, thứ tự `BOMB > LASER > RAINBOW`, index tăng dần |

**Phase 2 (sau khi đo metrics):**
- **STONE** blocker: 4–6 ô đá cố định, đối xứng, không match/không rơi, vỡ khi match cạnh hoặc bomb.
- **Spawn arena**: preset trọng số ngọc (Ember/Bastion/Wellspring), hiện ở DraftScene.

**Reject:**
- **Haste gem**: snowball tempo, phá 1 skill/turn.
- **Poison gem**: DoT nên là skill của Venomancer, không phải gem; gem DoT làm loãng target commitment.
- **Wildcard**: phá “đọc board trước khi swap”.
- **Multiplier**: bypass damage cap.
- **Element gem**: tăng gấp đôi số màu, UI nặng.

### 2.5 Guardrails cho combat mới

| Cơ chế | Luật | Guardrail |
|---|---|---|
| **AoE** | Damage cả 3 target | Mỗi target ≤ 60% damage single-target cùng mana |
| **Burn/Poison** | Tick đầu turn victim, true damage, shield không hấp thụ | Max 2 stack; mỗi stack ≤5% maxHP/turn; cleanse xoá |
| **Invincible** | 1 lượt, 1 lần/trận, chỉ ally | DoT vẫn tick; strip xoá; không self-target |
| **Thorns** | Phản 40% damage basic | Không trigger bởi skill/AoE; cap mỗi lượt |
| **Mana burn** | Đốt 25, nhận 15 | 1 lần/lượt; không giảm dưới 0 |
| **CD manipulation** | +1 CD all enemy, −1 CD 1 ally | Cap +2; không lock skill; không reset về 0 |
| **Summon** | Thrall 350/45 | Untargetable, chết theo owner, AoE clear |
| **Không dùng** | Revive, silence, petrify, random debuff, ignore 100% DEF, permanent stacking | Để Season 2 nếu thật cần |

### 2.6 PvE monster

**Nguyên tắc:** monster **không chơi bàn cờ**. Sau mỗi lượt player, monster resolve 1 intent đã telegraph.

```
Hero passives → skill (optional) → commit target → swap → cascade
→ damage → monster intent tick → win check
```

| Monster | HP/DEF | Intent | Board interaction |
|---|---|---|---|
| **Void Maw** | 1300/10 | Void Seed: biến 3 ô thành VOID | VOID không match/swap; vỡ khi bomb/match cạnh; ≥6 VOID → Devour 15% maxHP team |
| **Chainshell Warden** | 1650/40 | Lock Row/Col: khoá 4 ô 2 lượt | Ô khoá vẫn match được nhưng không swap |
| **Prism Leech** | 1150/20 | Siphon: steal 20 mana; nếu mana <20 → drain 8% maxHP | Mỗi 💧 match → nó +2 shield |
| **Mirror Shade** | 900/5 | Echo Strike: đánh hero bạn target lượt trước, 1.6× ATK | Counter: đổi target để bait |
| **Rift Hound** | 450/0 | Howl: buff monster +10% ATK | Phải clear add |
| **Hollow Prism** (boss) | 2600 + 2 Facet 500 | Phase 1: Facet beam telegraph 2 lượt; Phase 2: +30% ATK/turn, −50% DEF, spawn VOID | DPS race có đọc |

**PvE MVP:** 3 encounter + boss; chọn 3 hero từ pool 8/12; 8–15 lượt/encounter; stars 1–3; Daily Anomaly; reward cosmetic/soft currency.

### 2.7 UI 1280×720

**Draft:**
- Top bar: vòng, lượt, timer, exit.
- Left 288px: 4 slot ally + gợi ý đội hình.
- Center 632px: tabs filter (role/faction) + lưới **5×4** card 114×102 + **Inspector Dock**.
- Right 288px: 4 slot enemy + draft log.

**Battle:**
- Status badge trên card: `[☠️ HEX]`, `[🔥 BURN 2]`, `[🛡️ INVINCIBLE]`, `[⚡ THORNS]`.
- AoE: chùm 3 projectile cong tới 3 target.
- Laser: tia plasma quét hàng/cột.
- Boss: intent banner + phase bar.

---

## 3. Kiến trúc kỹ thuật

### 3.1 Thứ tự refactor bắt buộc

| Bước | Nội dung | Effort |
|---|---|---|
| **1. Data foundation** | `HeroId`/`GemId` string; `HERO_DEFS`, `GEM_DEFS`; `Record<>` counts; bỏ union 8/4 | 2–3d |
| **2. Skill/passive/status pipeline** | `SkillHandler`, `PassiveSpec`, `StatusSpec`; bỏ switch archetype | 5–6d |
| **3. Gem pipeline** | `GEM_EFFECTS`, `SPECIALS`, protocol generic; HEX/LASER | 5–6d |
| **4. Draft generalisation** | `PICK_ORDER`, `PICKS_PER_SIDE`, `BANS_PER_SIDE`; fix điều kiện kết thúc | 2–3d |
| **5. Combatant/PvE** | `Combatant`, `blocked` overlay, `PveRoom`, protocol PvE | 6–8d |
| **6. UI/FX** | Draft 5×4, inspector, status badge, AoE/laser FX | 4–5d |

### 3.2 Ba bug kiến trúc phải sửa trước khi thêm content

1. **Draft treo:** `draft.ts` kết thúc khi `totalPicks >= CONFIG.ROSTER_SIZE`. Với 20 hero, điều kiện này sai. Phải dùng `PICKS_PER_SIDE × 2`.
2. **Gem 4 field cố định:** `GemCounts` và `emptyCounts()` hardcode ATK/HP/MANA/SHIELD. Phải chuyển sang `Record<GemId, number>`.
3. **Skill/passive switch:** `skills.ts` switch 8 archetype; `combat.ts` rải logic passive. Phải chuyển sang registry/declarative spec.

### 3.3 Protocol & test

- Thêm `UnitView`, `StatusView`, `EffectEvent`, `WaveView.specials`, `PveView`.
- Protocol là **additive**, không phải “100% backward compatible” với client cũ.
- Giữ 117 test cũ xanh; thêm **40–60 test** cho:
  - 12 hero mới + passive.
  - DoT/AoE/Invincible/Thorns/Mana burn/CD.
  - HEX/LASER/BOMB/RAINBOW chain.
  - Draft snake-8 + 20 pool.
  - PvE intent/phase/win.
- Bot: Utility AI — target low HP, dùng AoE khi địch đông, không đánh Invincible, draft theo role.

---

## 4. Roadmap & effort

| Phase | Nội dung | Effort |
|---|---|---|
| **P0 — Foundation** | Data registry, skill/passive/status, gem pipeline, draft fix | 8–10d |
| **P1 — 20 heroes** | 12 hero + skill/passive + test + UI draft 5×4 | 8–10d |
| **P2 — Gems & status** | HEX, LASER, RAINBOW, AoE/DoT/Invincible FX | 5–6d |
| **P3 — PvE** | 3 encounter + boss + PveRoom + intent UI | 6–8d |
| **P4 — Meta/Polish** | First 30 min, daily, rank season, cosmetic, telemetry | 4–5d |

**Tổng: 31–39 dev-days.**

- **2 dev:** ~4 tuần → kịp 22/11 nếu cắt P4 xuống tối thiểu.
- **1 dev:** ~7 tuần → không kịp full. Chọn:
  - **A:** 20 hero + HEX/LASER, PvE sau.
  - **B:** 12 hero + PvE monster, 20 hero sau.

### Cắt scope nếu deadline

**Giữ:**
- Refactor P0.
- 20 hero data (12 mới).
- HEX + LASER.
- Draft UI 5×4.
- 1 PvE encounter + 1 boss.

**Cắt:**
- Element affinity trong PvP.
- Revive/endure/silence/petrify.
- STONE/arena.
- Full meta (chỉ first-win + 3 daily + rank tier).
- 4v4.

---

## 5. Quyết định cần chốt

1. **20 playable heroes hay 20 monster?** Đề xuất: 20 hero; PvE monster riêng.
2. **Hệ nguyên tố trong PvP?** Đề xuất: không; chỉ filter + PvE affinity.
3. **Ngọc thứ 5: HEX hay Haste?** Đề xuất: HEX.
4. **Laser mapping:** match-4 thẳng → laser, L/T → bomb? Đề xuất: có.
5. **Invincible/revive:** chỉ 1 Invincible (Paladin), không revive? Đề xuất: có.
6. **3v3 hay 4v4?** Đề xuất: 3v3.
7. **Solo hay 2 dev?** Quyết định cắt scope.

---

## 6. Một câu chốt

> **Lấy “chất Summoners War” ở kit và fantasy, lấy kỷ luật match-3 ở board và target commitment, nhưng không lấy element math và Haste gem vào PvP.**
> 20 hero + HEX + LASER + PvE monster là đủ để game “thật vui”; phần còn lại là cân bằng và polish.
