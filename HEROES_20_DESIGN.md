# Prism Pact — Thiết kế bộ 20 tướng

> Trạng thái: **P0 + P1 + P2 + P3 đã triển khai** (25/10/2026). Roster đủ **20 hero**; draft pool 20.
> Bổ sung cho `README.md` (luật chung) và `PROGRESS.md` (trạng thái code).
> Mục tiêu: mở roster 8 → 20, vẫn giữ 3v3, target commitment, match 20–30 lượt.

---

## 0. Nguyên tắc thiết kế

1. **Target commitment là bất khả xâm phạm.** Không hero nào được đổi target của địch, trừ Taunt có thời hạn.
2. **Mỗi hero phải có counter rõ.** Không có “pick auto-win”.
3. **Không one-shot từ full HP.** Skill đơn mục tiêu ≤45% maxHP của tướng mỏng nhất; AoE ≤20% mỗi target.
4. **Không thêm revive / silence / petrify / random debuff / ignore 100% DEF / stacking vĩnh viễn** ở launch.
5. **Mỗi lượt tối đa 1 skill.** Skill phải là quyết định, không phải nút bấm mỗi lượt.
6. **Đọc được trên 1280×720.** Card chỉ hiện icon + tên + 2 chỉ số; chi tiết nằm ở Inspector Dock.

---

## 1. Roster 20 — bảng chốt

### 1.1 8 hero hiện có (đã balance 25/10)

| # | Hero | Role | HP / ATK / DEF | Skill (mana · CD) | Passive | Counter / yếu |
|---|---|---|---|---|---|---|
| 1 | **Tank** | Tank | 1440 / 60 / 60 | **Taunt** 32 · 3 — kéo target địch về mình 1 lượt | +30% DEF khi HP <50% | Debuffer, Assassin, Bruiser |
| 2 | **Burst** | Mage | 720 / 144 / 15 | **Nuke** 40 · 3 — 3× ATK 1 target | +20% ATK khi đủ 3 người | Tank, Controller, Assassin |
| 3 | **Healer** | Support | 880 / 48 / 25 | **Mass Heal** 48 · 4 — hồi 40% maxHP cả đội | Tự hồi 5% maxHP đầu lượt | Assassin, Executioner, Plague |
| 4 | **Controller** | Control | 800 / 72 / 20 | **Weaken** 32 · 3 — −50% ATK 2 lượt | Skill trúng → +10 mana | Oracle, Healer, Nullifier |
| 5 | **Buffer** | Support | 800 / 60 / 30 | **Rally** 40 · 3 — +30% ATK, shield 20% maxHP 2 lượt | Team +10% ATK | Alchemist, Spellbreaker |
| 6 | **Debuffer** | Debuff | 760 / 66 / 20 | **Strip** 32 · 3 — −50% DEF 2 lượt | Team +15% damage lên target bị debuff | Oracle, Assassin |
| 7 | **Assassin** | Assassin | 680 / 120 / 10 | **Execute** 40 · 3 — 2.5× ATK, ignore 50% DEF, lowest HP | +30% damage vs <30% HP | Tank, Warden, Duelist |
| 8 | **Bruiser** | Bruiser | 1120 / 96 / 35 | **Lifesteal Strike** 36 · 3 — 2× ATK, hồi 50% damage | Team +15% lifesteal | Controller, Frostbinder, Plague |

### 1.2 12 hero mới

| # | Hero | Role | HP / ATK / DEF | Skill (mana · CD) | Passive | Counter / yếu |
|---|---|---|---|---|---|---|
| 9 | **Paladin** | Tank/sustain | 1400 / 66 / 55 | **Divine Aegis** 40 · 4 — 1 ally **Invincible** 1 lượt; 1 lần/trận | Ally <40% HP +15% DEF | Strip, cooldown tax; DoT vẫn tick |
| 10 | **Juggernaut** | Tank/counter | 1520 / 54 / 65 | **Iron Thorns** 36 · 3 — 2 lượt phản 40% damage basic, +20% DEF | Mỗi basic hit nhận vào +5% ATK (cap +20%) | Skill/AoE không kích hoạt; heal outlast |
| 11 | **Executioner** | Assassin/anti-tank | 800 / 114 / 20 | **Sever** 40 · 4 — 1.8× ATK + 12% maxHP true, ignore 40% DEF | +25% damage vs DEF ≥40 | Shield, Burst, Assassin |
| 12 | **Sniper** | Assassin/shield-break | 640 / 138 / 12 | **Deadshot** 36 · 3 — 2.4× ATK, xuyên shield; +30% nếu target có shield | +15% ATK vs target full HP | Taunt, Tank, Warden |
| 13 | **Cleaver** | Bruiser/AoE | 784 / 126 / 15 | **Amputation** 48 · 4 — 1.3× ATK cả 3 địch, +10% mỗi địch còn sống | +15% ATK khi còn 3 địch | Shield, single-target burst |
| 14 | **Berserker** | Bruiser/risk | 1200 / 108 / 25 | **Reckless Swing** 32 · 3 — 2.2× ATK, mất 10% HP hiện tại (không chết), +25% ATK 2 lượt | +1% ATK mỗi 2% HP đã mất (cap +30%) | Control, Burst, Frostbinder |
| 15 | **Pyromancer** | Mage/DoT | 760 / 90 / 20 | **Ignite** 36 · 3 — 1.2× ATK + Burn 4% maxHP/lượt 2 lượt | +15% damage vs burning | Cleanse, shield |
| 16 | **Venomancer** | Mage/AoE DoT | 840 / 72 / 25 | **Toxic Miasma** 40 · 4 — Poison 3% maxHP/lượt 2 lượt lên cả 3 địch, xuyên shield | +1% poison damage mỗi debuff khác | Cleanse, Burst |
| 17 | **Necromancer** | Summoner | 760 / 72 / 20 | **Raise Thrall** 48 · 5 — Thrall 280 HP / 54 ATK, đánh target đã commit sau lượt bạn, chết theo owner | +20 mana khi ally chết | AoE, dive owner |
| 18 | **Oracle** | Healer/cleanse | 920 / 42 / 28 | **Mend** 36 · 3 — hồi 35% maxHP cho ally thấp nhất + cleanse 1 debuff | Ally <30% HP nhận −15% damage | AoE, Assassin |
| 19 | **Chronarch** | Controller/tempo | 800 / 60 / 25 | **Time Warp** 40 · 4 — +1 CD toàn bộ skill địch (cap +2), −1 CD 1 ally | Skill đầu tiên mỗi trận của mỗi ally −10 mana | Mana denial, basic-attack team |
| 20 | **Spellbreaker** | Controller/mana | 920 / 78 / 30 | **Mana Drain** 36 · 3 — đốt 25 mana địch, nhận 15, strip 1 buff | Skill địch +5 mana cost | Basic-attack team, Bruiser |

### 1.3 Phân bổ role

| Role | Heroes | Số lượng |
|---|---|---:|
| Tank | Tank, Paladin, Juggernaut | 3 |
| Bruiser | Bruiser, Cleaver, Berserker | 3 |
| Assassin | Assassin, Executioner, Sniper | 3 |
| Mage | Burst, Pyromancer, Venomancer, Necromancer | 4 |
| Support | Healer, Oracle, Buffer | 3 |
| Controller | Controller, Debuffer, Chronarch, Spellbreaker | 4 |
| **Tổng** | | **20** |

---

## 2. Cơ chế combat mới

### 2.1 Status effect

| Status | Nguồn | Luật | Counter |
|---|---|---|---|
| **INVINCIBLE** | Paladin | 1 lượt; 1 lần/trận; chặn damage trực tiếp; DoT vẫn tick | Strip, đợi hết lượt |
| **THORNS** | Juggernaut | 2 lượt; phản 40% damage basic; không phản skill/AoE | Skill, AoE, kiting |
| **BURN** | Pyromancer | 4% maxHP/lượt, 2 lượt; true damage; shield không hấp thụ | Cleanse, Oracle |
| **POISON** | Venomancer | 3% maxHP/lượt, 2 lượt, cả đội; xuyên shield | Cleanse, burst |
| **SUMMON** | Necromancer | Thrall 280/54; untargetable; đánh target đã commit; chết theo owner | AoE, dive owner |
| **SKILL_TAX** | Spellbreaker | Skill địch +5 mana cost | Basic-attack team |

**Guardrail:**
- Mỗi status tối đa 2 stack; DoT mỗi stack ≤5% maxHP/turn.
- DoT tick đầu turn của bên bị ảnh hưởng, sau passive.
- Invincible không chặn DoT; cleanse/strip xoá được.
- Không có stun/silence/petrify ở launch.

### 2.2 AoE

- Cleaver: 1.3× ATK cả 3; +10% mỗi địch còn sống.
- Pyromancer: 1.2× ATK 1 target + Burn.
- Venomancer: Poison cả 3, không damage trực tiếp.
- Tổng damage AoE mỗi target ≤60% damage single-target cùng mana.
- AoE không kích hoạt THORNS (vì THORNS chỉ phản basic).

### 2.3 Mana & cooldown manipulation

- Spellbreaker: đốt 25 mana, nhận 15, strip 1 buff; 1 lần/lượt.
- Chronarch: +1 CD toàn bộ skill địch (cap +2), −1 CD 1 ally; không lock skill.
- Không có “reset CD về 0” hoặc “+3 CD”.
- Mana cap 100; skill cost 32–48; start mana 25; mana/gem 2.

### 2.4 Summon

- Thrall không target được, không bị target bởi basic attack.
- Sau lượt của Necromancer, Thrall đánh target đã commit 54 damage (không qua DEF? **qua DEF** để tránh true damage).
- Thrall chết khi Necromancer chết; AoE clear Thrall.
- Không cho Thrall dùng skill.

---

## 3. Draft 20 tướng

**Ranked:** 3v3, pool 20, pick 4 + ban ẩn 1, snake-8:

```
P1 → P2 → P2 → P1 → P1 → P2 → P2 → P1
```

- 8 picked, 2 banned, 6 vào sân; 12 tướng không được pick.
- Ban ẩn 20s; pick 30s.
- Mỗi bên 4 pick → ban 1 tướng của đối thủ.

**Casual:** pool 12 ngẫu nhiên có role guarantee (2 Tank, 2 Support, 4 Damage), pick 4 + ban 1.

**Rookie:** 12 tướng curated cho 10 trận đầu.

**Bug phải sửa:** `draft.ts` đang kết thúc pick khi `totalPicks >= CONFIG.ROSTER_SIZE` (8). Với pool 20, phải đổi thành `PICKS_PER_SIDE * 2` (8 pick), nếu không draft sẽ treo.

---

## 4. UI card 20 tướng

### DraftScene 1280×720

```
┌────────────────────────────────────────────────────────────────────┐
│ Top: Vòng 1/2 · Lượt bạn · 24s · Exit                              │
├──────────────┬──────────────────────────────────┬──────────────────┤
│ Ally 288px   │ Center 632px                     │ Enemy 288px      │
│ 4 pick slots │ [Tất cả] [Tank] [Damage] [Support]│ 4 pick slots     │
│              │ Grid 5×4 card 114×102            │ Draft log        │
│              │ Inspector Dock                   │                  │
└──────────────┴──────────────────────────────────┴──────────────────┘
```

- Card: icon/emoji + tên + role + HP/ATK + 1 dòng skill.
- Hover/click → Inspector Dock hiện đầy đủ skill, passive, counter.
- Tướng đã pick/ban → grayscale + khoá.
- Filter theo role; có thể thêm faction sau.

### BattleScene

- Status badge trên card: `[INVINCIBLE]`, `[BURN 2]`, `[POISON 2]`, `[THORNS]`.
- Skill AoE: 3 projectile cong.
- Thrall: card nhỏ cạnh Necromancer, có HP riêng.
- Không thêm text dài trên board.

---

## 5. Kiến trúc code

### 5.1 Refactor bắt buộc

| Vấn đề hiện tại | Cách sửa |
|---|---|
| `Archetype` union 8 giá trị | `HeroId = string`; `HeroDef.id`; `Archetype` chỉ còn là role type |
| `skills.ts` switch 8 case | `SKILL_HANDLERS: Record<SkillHandlerId, (ctx) => SkillOutcome>` |
| `combat.ts` passive rải rác | `PASSIVE_HANDLERS` theo trigger (`turnStart`, `onHit`, `statCalc`) |
| `BuffKind` 4 giá trị | Thêm `BURN`, `POISON`, `INVINCIBLE`, `THORNS`, `SKILL_TAX` |
| Draft kết thúc theo `ROSTER_SIZE` | `PICKS_PER_SIDE * 2`; `PICK_ORDER` array |
| UI hardcode 8 roster / 4 slot / 3 card | Render từ `ROSTER` và `CONFIG` |
| `HeroView` thiếu role/faction | Thêm `role`, `faction`, `statuses` |

### 5.2 Data model đề xuất

```ts
export type HeroId = string;
export type Role = 'Tank' | 'Bruiser' | 'Assassin' | 'Mage' | 'Support' | 'Control';
export type Faction = 'Fire' | 'Water' | 'Wind' | 'Light' | 'Dark';

export interface HeroDef {
  id: HeroId;
  name: string;
  role: Role;
  faction: Faction;
  hp: number;
  atk: number;
  def: number;
  skill: SkillDef;      // có handlerId
  passive: PassiveDef;  // có trigger + handlerId
  counters: HeroId[];   // gợi ý UI
}
```

### 5.3 Phase triển khai

| Phase | Nội dung | Effort |
|---|---|---:|
| **P0 — Foundation** | `HeroId`, 20 data, skill/passive/status registry, draft fix, UI 20 card, tests | 6–8d |
| **P1 — Simple kits** | Paladin, Juggernaut, Executioner, Sniper | 3–4d |
| **P2 — AoE/DoT** | Cleaver, Pyromancer, Venomancer, Oracle | 4–5d |
| **P3 — Advanced** | Necromancer, Chronarch, Spellbreaker, Berserker | 4–5d |
| **P4 — Balance/UI** | Playtest, tuning, status badge, inspector, art | 4–5d |
| **Tổng** | | **21–27 dev-days** |

- 2 dev: ~3 tuần.
- 1 dev: ~5 tuần → nên làm P0 + P1 + P2 trước, P3 sau.

### 5.4 Test plan

- Giữ 142 test hiện tại xanh.
- Thêm:
  - 12 hero: skill + passive + counter.
  - Status: DoT tick, Invincible + DoT, Thorns, mana burn, CD cap, summon.
  - Draft 20: snake-8, ban ẩn, không treo.
  - UI: 20 card render, filter, inspector.
- Mục tiêu: **150–170 test**.

---

## 6. Balance target

| Chỉ số | Target |
|---|---|
| Trận | 20–30 lượt |
| Skill density | 20–30% số lượt |
| Sudden Death | <10% |
| Draw | <2% |
| Top hero pick rate | <25% |
| Hero win rate | 40–55% |
| Draft | <2 phút |
| P1 win rate | 50–55% |

Nếu hero nào >55% win rate trong 200 trận bot: nerf trước, đừng buff hero khác.

---

## 7. Art / asset

- **Giai đoạn này:** giữ vector/emoji; chưa chuyển full pixel art.
- Card mới dùng emoji + màu role; portrait pixel art làm sau.
- Nếu có artist: 20 portrait 96×96 + 5 gem sprite + status icon, theo phase.
- Không để art block gameplay: data-driven để thay skin sau.

---

## 8. 8 hero cũ — có cần làm lại?

**Kết luận: không làm lại toàn bộ.** Chỉ cần **3 thay đổi nhỏ + 1 rule clarification**; 4 hero giữ nguyên; 1 hero theo dõi.

| Hero | Verdict | Thay đổi đề xuất | Lý do |
|---|---|---|---|
| **Tank** | **Rule fix** | Taunt redirect cả **single-target skill** của địch, trừ AoE và skill auto-lowest-HP | Meta mới nhiều skill damage; nếu Taunt chỉ chặn basic, Tank bị Paladin/Juggernaut lấn át |
| **Controller** | **Buff nhẹ** | Weaken giảm thêm **25% damage Burn/Poison** (hoặc target's next skill +10 mana) | DoT mới (Pyromancer/Venomancer) bỏ qua ATK-down |
| **Healer** | **Buff nhẹ** | **Overheal → shield**, cap 20% maxHP | Tạo khác biệt với Oracle (cleanse); chống AoE/burst |
| **Bruiser** | **Theo dõi** | Nếu win rate <40%: team lifesteal áp dụng cả skill damage ở mức 8% | Meta mới skill-heavy; lifesteal hiện chỉ trigger basic |
| **Burst** | **Giữ** | Không đổi | Vẫn là single-target raw damage cao nhất; niche rõ |
| **Buffer** | **Giữ** | Không đổi | Duy nhất team ATK + shield; mạnh hơn trong meta AoE |
| **Debuffer** | **Giữ** | Không đổi | Duy nhất DEF shred + team exploit; enabler cho basic carry |
| **Assassin** | **Giữ** | Không đổi | Duy nhất auto-lowest-HP finisher; niche rõ |

### 8.1 Rule clarification — Taunt vs skill

Hiện tại:
- `performBasicAttacks` dùng `resolveAttackTarget` → Taunt có tác dụng.
- `useSkill` chọn target trực tiếp → **Taunt không có tác dụng**.

Đề xuất:
- Taunt redirect **single-target enemy skill** về Tank.
- Ngoại lệ: AoE (Cleaver/Pyromancer/Venomancer), skill auto-lowest-HP (Assassin), skill self/ally buff.
- Target commitment vẫn giữ: người chơi chọn target trước khi swap; Taunt là ngoại lệ đã biết.
- Thêm test: skill single-target vào team có Tank đang taunt → damage dồn Tank; AoE vẫn hit cả team.

### 8.2 Vì sao không rework cả 8?

- 8 hero hiện tại đã có **identity riêng**; rework toàn bộ làm mất muscle memory và tăng rủi ro balance.
- Vấn đề thật sự là **meta shift**, không phải kit cũ yếu:
  - Skill damage tăng → Tank/Controller cần chạm tới skill/DoT.
  - AoE/DoT tăng → Healer cần overheal shield để khác Oracle.
- Các hero còn lại vẫn có niche độc quyền:
  - Burst = raw damage cao nhất.
  - Buffer = team ATK + shield.
  - Debuffer = DEF shred.
  - Assassin = finisher tự động.
  - Bruiser = team lifesteal (theo dõi).

### 8.3 Nguyên tắc khi thêm hero mới

> **Nếu hero mới làm tốt hơn hero cũ ở cùng một việc, sửa hero mới — không buff hero cũ.**

Ví dụ:
- Sniper không được vừa xuyên shield vừa burst cao hơn Burst.
- Executioner không được vừa anti-tank vừa finisher tốt hơn Assassin.
- Paladin không được thay thế Taunt của Tank; Invincible là bảo vệ 1 target, Taunt là redirect.

### 8.4 Đo sau khi có 20 hero

- Chạy 1.000 trận bot random draft.
- Track pick rate + win rate từng hero.
- Ngưỡng:
  - Pick rate <2% hoặc win rate <40% → buff nhẹ.
  - Win rate >55% → nerf.
  - Top hero pick rate >25% → xem lại counter matrix.
- Không buff/nerf trước khi có data.

---

## 9. Quyết định cần chốt

1. Roster 12 hero mới như bảng trên? (Paladin, Juggernaut, Executioner, Sniper, Cleaver, Berserker, Pyromancer, Venomancer, Necromancer, Oracle, Chronarch, Spellbreaker)
2. Giữ 3v3 / pool 20 / pick 4 + ban 1 / snake-8?
3. Chấp nhận các status mới: Invincible, Thorns, Burn, Poison, Summon, Skill Tax?
4. Không có revive/silence/petrify ở launch?
5. Làm P0 + P1 trước, P2/P3 sau?
