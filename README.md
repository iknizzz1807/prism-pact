# PRISM PACT — Project Spec

> **Match-3 PvP turn-based với live draft, trên Avalanche.**
> *"The draft decides your fate, the yield decides your reward."*

| | |
|---|---|
| **Tên dự án** | Prism Pact (tên cũ: Match-3 Draft Arena) |
| **Thể loại** | Match-3 Puzzle × Turn-based RPG PvP × Live Draft (Ban/Pick) × DeFi no-loss |
| **Nền tảng** | Web, mobile-first, portrait (dọc) |
| **Chain** | Avalanche C-Chain — Fuji Testnet (chainId `43113`) |
| **Sự kiện** | Avalanche Team1 Vietnam UniHack 2026 |
| **Deadline nộp** | **25/11/2026, 05:59 (giờ VN)** |
| **Trạng thái tài liệu** | v3.0 — Single source of truth. Thay thế toàn bộ `idea_original.md` + `idea_tune_for_competition.md` |

**Tài liệu liên quan:**
- `PROGRESS.md` — **bàn giao**: tiến độ, TODO ưu tiên, cạm bẫy, cách kiểm chứng (đọc file này trước khi code tiếp).
- `competition_info.txt` — thông tin & thể lệ cuộc thi (bản gốc của BTC).

---

## 0. TRẠNG THÁI CODE & CÁCH CHẠY

| Layer | Trạng thái |
|---|---|
| `shared/` — board, match-3, combat, 20 hero P3, battle loop, draft snake-8, bot, protocol | ✅ **xong** · 106 test |
| `contracts/` — MockUSDC, MockBenqi, SeasonVault | ✅ **xong** · 19 test · deploy local OK · có `demo:season` |
| `server/` — WS + matchmaking + MatchRoom + bot/Jev/Von policy + rank + chain operator | ✅ **xong** · 34 test |
| `client/` — Phaser 3 (Lobby, Draft, Battle, Season, wallet) | ✅ **xong** · build OK · E2E bot match đã kiểm chứng |

```bash
npm install
npm run setup:client                        # cài dependency cho client (standalone)
npm test        # 106 test shared + 19 test contract + 34 test server = 159
npm run typecheck
npm run build   # shared + contracts + client
npm run demo    # 2 bot đánh nhau 1 trận hoàn chỉnh, in log từng lượt
npm run demo -- 1234                        # đổi seed

npm run dev:server                          # WS + HTTP ở :2567 (health /health)
npm run dev:client                          # UI ở http://localhost:5173
PORT=3000 npm run dev:server                # đổi cổng

npm run deploy:local                        # deploy lên hardhat network (test)
npm run demo:season                         # demo trọn vòng đời DeFi, in bảng no-loss
cp contracts/.env.example contracts/.env    # điền PRIVATE_KEY trước khi lên Fuji
npm run deploy:fuji                         # deploy Fuji, ghi contracts/deployments/fuji.json
```

`shared/` là **pure logic**, không import engine nào → server và client dùng chung đúng một nguồn sự thật.

---

## MỤC LỤC

0. [Trạng thái code & cách chạy](#0-trạng-thái-code--cách-chạy)
1. [TL;DR — Tóm tắt một trang](#1-tldr--tóm-tắt-một-trang)
2. [Định vị & ba trụ cột](#2-định-vị--ba-trụ-cột)
3. [Phạm vi & phân tầng](#3-phạm-vi--phân-tầng)
4. [Game design](#4-game-design)
   - 4.1 Cấu trúc trận
   - 4.2 Draft
   - 4.3 Bàn cờ & ngọc
   - 4.4 Vòng đời một lượt (turn flow)
   - 4.5 Target
   - 4.6 Công thức sát thương & hồi phục
   - 4.7 Mana & Skill
   - 4.8 Roster 12 P1 / 20 final
   - 4.9 Counter matrix
   - 4.10 Thắng / thua / Sudden Death
   - 4.11 Cơ chế chống snowball
   - 4.12 Bảng số liệu khởi điểm (config)
5. [Bot đối thủ](#5-bot-đối-thủ)
6. [Kinh tế & DeFi layer](#6-kinh-tế--defi-layer)
7. [Kiến trúc kỹ thuật](#7-kiến-trúc-kỹ-thuật)
8. [UI/UX](#8-uiux)
9. [Rank & Season](#9-rank--season)
10. [Timeline & milestone](#10-timeline--milestone)
11. [Kịch bản demo 5 phút](#11-kịch-bản-demo-5-phút)
12. [Pitch & Q&A](#12-pitch--qa)
13. [Rủi ro & câu hỏi mở](#13-rủi-ro--câu-hỏi-mở)
14. [Decision log](#14-decision-log)
15. [Glossary](#15-glossary)

---

## 1. TL;DR — Tóm tắt một trang

**Game là gì:** Hai người chơi real-time draft đội hình 3 tướng từ pool 20 archetype (pick 4, ban 1, snake-8), rồi đánh nhau trên bàn match-3 8x8 theo lượt. Mỗi lượt: dùng tối đa 1 skill → **chọn target trước** → swap 1 cặp ngọc → resolve. Ngọc ⚔️ gây sát thương, 🩸 hồi máu, 💧 nạp mana chung, 🛡️ tạo giáp.

**Điểm khác biệt (3 thứ giám khảo phải nhớ):**

1. **Draft đối kháng có counter thật** — 12 archetype P1 (20 final), mỗi con 1 skill + 1 passive + điểm yếu rõ ràng. Không phải blind pick.
2. **Cam kết target** — target chọn *trước khi* biết mình ăn được bao nhiêu ngọc. Đây là signature mechanic, không game match-3 nào có.
3. **No-loss prize pool** — stake USDC không mất gốc, yield sinh ra (Benqi) là giải thưởng mùa. Thua vẫn lấy lại 100% vốn.

**Vì sao Avalanche:** finality 1–2s cho phép **commit hash draft on-chain mỗi trận** (1 tx/trận). Trên Ethereum chờ 12s+ thì không khả thi trong flow game. Benqi là lending native của Avalanche → yield thật.

**Phạm vi T1 (phải chạy được lúc demo):** match-3 core + 20 tướng + draft live snake-8 + bot + SeasonVault + draft hash on-chain.

**Tech:** Phaser 3 + TS + Vite · Node.js + `ws` (typed protocol) · Solidity + Hardhat · Avalanche Fuji · Benqi/MockBenqi.

---

## 2. Định vị & ba trụ cột

**Một câu:** *"Match-3 PvP turn-based với live draft. Bạn stake USDC vào prize pool không mất gốc, và kỹ năng draft + xếp ngọc quyết định bạn có thắng giải hay không."*

**Định vị thị trường:** *"Summoners War thu nhỏ, gặp match-3, gặp PoolTogether."*

| Trụ cột | Nội dung | Cảm xúc mục tiêu |
|---|---|---|
| **Draft đối kháng** | Ban/pick live snake-8, pool 20, 20s/lượt, counter-pick theo archetype | *"Nó pick Tank, tôi phải counter"* |
| **Match-3 có cam kết** | Target chọn trước khi xếp ngọc | *"Tôi có đọc đúng board không?"* |
| **No-loss prize** | Stake không mất gốc, yield sinh prize pool | *"Chơi giỏi có thưởng, chơi dở không sao"* |

**Tầm nhìn:** casual chơi được (một trận 3–5 phút), nhưng độ sâu nằm ở **draft + build tướng**, không nằm ở việc bắt người chơi cày cuốc.

**Đối thủ tham chiếu:** Marvel Puzzle Quest, Puzzle Quest 3 (match-3 RPG nhưng chọn đội tự do, không draft đối kháng); Summoners War (ACC/RES, turn-based team PvP); PoolTogether (no-loss prize).

---

## 3. Phạm vi & phân tầng

### 3.1 Mục tiêu (Goals)

- Demo được **một trận PvP hoàn chỉnh** (2 browser) **hoặc** PvBot trên testnet Avalanche.
- Chứng minh 3 trụ cột bằng hành vi thấy được trong 5 phút demo.
- Có giao dịch on-chain thật (deposit + commit draft) hiển thị trên Snowtrace.

### 3.2 Không nằm trong phạm vi (Non-goals)

- Không phát hành token riêng.
- Không xây gacha/rune system trong bản này.
- Không hứa "an toàn pháp lý" — chỉ reference PoolTogether, thừa nhận cần legal counsel trước mainnet.
- Không giải quyết phi tập trung hóa oracle trong T1 (thừa nhận + có roadmap).

### 3.3 Phân tầng

| Tier | Ý nghĩa | Hạng mục |
|---|---|---|
| **T1** | Demo phải chạy | Board 8x8 + 4 ngọc · Bomb gem (match 4) · Turn flow đầy đủ · **20 tướng × 1 skill + 1 passive** · 3v3 draft live snake-8 + ban · Sudden Death · Damage cap · **Bot PvBot** · Wallet connect + deposit USDC testnet · SeasonVault + Benqi/MockBenqi · **Draft hash commit on-chain** · SeasonScene (prize pool + projected prize) · Matchmaking realtime |
| **T2** | Nếu còn ≥5 ngày | Rainbow gem (match 5) · Auto-shield · Match result hash on-chain · Hero NFT (mint 1 demo) · EIP-712 attestation · Core wallet |
| **T3** | Chỉ pitch / roadmap | Rune + gacha rune · Gacha tướng · Ultimate · Tournament mode · ACC/RES · Full on-chain draft per-pick · Sybil counter (slide) |

> **Quy tắc vàng:** hết ngày 22/11 không thêm feature T2 nào nữa. T2 chỉ được làm nếu T1 đã xanh 100%.

---

## 4. Game design

### 4.1 Cấu trúc trận

| Yếu tố | Giá trị |
|---|---|
| Đội hình | **3v3**, pool 20, mỗi bên pick 4 → ban 1 → còn 3 |
| Bàn cờ | **8x8 cố định** (không đổi theo tướng) |
| Loại ngọc | 4: ATK / HP / Mana / Shield — **dùng chung cho 2 bên** |
| Mana | **Bể chung toàn đội** (0–100) |
| Skill | Tối đa **1 skill/lượt/đội**, tốn mana + có cooldown riêng |
| Thời gian lượt | **15s** |
| Giới hạn trận | **50 lượt** (25 mỗi bên) → Sudden Death |
| Hình thức | PvP real-time (2 người) hoặc PvBot |

Bàn vuông 8x8 (không phải 8x6) vì màn hình portrait cần chừa không gian trên/dưới cho 3 tướng + HP/Mana bar + timer.

### 4.2 Draft

#### 4.2.1 Luật

- **Pool chung 20 tướng**, không ai xem trước đội hình đối thủ.
- Draft **live, công khai real-time**: pick/ban của mỗi bên hiện ngay cho bên kia (giống LoL, không phải blind pick).
- Không được pick trùng tướng (tướng đã pick/banned bị loại khỏi pool cho cả 2).
- Mỗi lượt pick: **20s**. Hết giờ → server tự random 1 tướng còn lại (chống AFK câu giờ).
- Mỗi lượt ban: **15s**, **đồng thời và ẩn** — hai bên không thấy ban của nhau cho tới khi hết giờ (tránh lợi thế thông tin cho người ban sau).

#### 4.2.2 Thứ tự chính xác

```
PICK (snake-8):  P1 → P2 → P2 → P1 → P1 → P2 → P2 → P1
BAN:             P1 ban 1 (ẩn) ∥ P2 ban 1 (ẩn)  → 15s
KẾT QUẢ:         mỗi bên còn 3 tướng → vào trận
```

> **Đã sửa so với docs cũ:** bản cũ là 2-2-2-2 (P2 luôn có last pick). Nay chốt **snake-8** để cân bằng first-pick/last-pick; P1 và P2 đều có một pick đơn và hai pick đôi.
>
> **Với pool 20:** 2 người × 4 pick = 8 tướng được pick; ban 1/bên → 6 vào sân, 12 tướng không được pick — đây là nguồn variety, không phải lãng phí.

#### 4.2.3 Ai là First Pick?

- **T1:** random coin-flip (server seed, công bố trong draft hash).
- **Roadmap:** người thua trận trước được FP trận sau; hoặc rank thấp hơn được FP.
- *Ghi chú balance:* FP thấy phản ứng sớm hơn, SP có counter-pick cuối. Cần playtest.

#### 4.2.4 Draft commit on-chain (T1)

Cuối draft, server ghi **1 tx**:

```solidity
commitDraft(bytes32 matchId, bytes32 draftHash)
// draftHash = keccak256(abi.encode(p1Picks[4], p2Picks[4], p1Ban, p2Ban, salt))
```

- `salt` sinh random server-side, công bố sau khi trận kết thúc (cùng tx `commitResult` ở T2).
- Không thể sửa draft sau khi có kết quả → chứng minh fairness.
- Cost: **1 tx/trận**. Đây là điểm ăn tiền về Avalanche: finality 1–2s cho phép làm việc này mà không lag flow.

#### 4.2.5 Luồng màn hình Draft

```
┌─────────────────────────────┐
│ Vòng 2/2 · 28s              │
├─────────────────────────────┤
│ Địch: [Tank] [?] [?] [?]    │  ← hiện dần khi họ pick
├─────────────────────────────┤
│ Roster 5x4 (20 tướng)       │  ← tap pick, tướng đã dùng bị mờ
├─────────────────────────────┤
│ Mình: [Healer][Burst]       │
└─────────────────────────────┘
```

### 4.3 Bàn cờ & ngọc

#### 4.3.1 Bốn loại ngọc

| Ngọc | Icon | Khi match | Ghi chú |
|---|---|---|---|
| **ATK** | ⚔️ | Mỗi **gem** ⚔️ nổ = **1 hit** đánh thường lên tướng đang **target** | Có damage cap 6 hit/lượt (4.11) |
| **HP** | 🩸 | Hồi máu cho **cả đội** | +0.6% maxHP/tướng mỗi gem |
| **Mana** | 💧 | Nạp **bể mana chung** | +2 mana/gem |
| **Shield** | 🛡️ | Tạo giáp cho **cả đội** | +0.6% maxHP/gem, cap 60% maxHP/tướng |

Mọi ngọc **dùng chung cho 2 bên** — không phân biệt màu theo tướng (khác Marvel Puzzle Quest). Lý do: giảm phức tạp UI trên portrait, và độ sâu đã nằm ở draft.

#### 4.3.2 Sinh ngọc & chống bế tắc

- Refill: ngọc rơi từ trên xuống lấp ô trống.
- Tỉ lệ spawn: **đều 25%** mỗi loại ở T1.
- Sau mỗi lần resolve: nếu **không còn nước đi hợp lệ** → auto shuffle toàn bàn (giữ nguyên số lượng từng loại), có animation.
- Không có weighting / "pity system" ở T1 (giữ RNG thuần, đúng tinh thần match-3).

#### 4.3.3 Ngọc đặc biệt

| Combo | Tạo ra | Hiệu ứng | Tier |
|---|---|---|---|
| Match 4 (hàng/cột thẳng) | **Bomb Gem** 💣 | Khi được match hoặc bị nổ lan: phá 3x3 quanh nó | **T1** |
| Match 5 (hàng/cột thẳng) | **Rainbow Gem** 🌈 | Xoá toàn bộ 1 loại ngọc đang có trên bàn | T2 |

- Bomb gem xuất hiện tại **ô của viên ngọc được swap** (ô người chơi chủ động di chuyển).
- Bomb nổ lan có thể kích hoạt bomb khác (chain reaction), resolve tuần tự, mỗi bomb chỉ nổ 1 lần/lượt.
- **Không có combo multiplier** ở T1: mỗi wave cascade resolve độc lập, không nhân damage theo chain (tránh snowball, xem 4.11).

#### 4.3.4 Swap hợp lệ

- Một lượt = **đúng 1 lần swap 2 ngọc kề cạnh** (4 hướng).
- Swap **không tạo match** → bị từ chối, ngọc trả về chỗ cũ, **không mất lượt** (không trừ timer, người chơi thử lại).
- Hết 15s → server tự chạy **1 swap hợp lệ random** (không phạt người chơi, tránh turn bị treo).

### 4.4 Vòng đời một lượt (turn flow)

```
                  ┌──────────────────────────────┐
                  │  START OF TURN               │
                  │  • passive tick (đầu turn)   │
                  │  • Sudden Death tick nếu >50 │
                  │  • giảm cooldown skill       │
                  └──────────────┬───────────────┘
                                 ↓
        BƯỚC 1 — SKILL (tuỳ chọn, tối đa 1/lượt)
          Chọn tướng đủ mana + hết CD → tung skill
                                 ↓
        BƯỚC 2 — TARGET (bắt buộc)
          Tap 1 tướng địch. Không chọn trong 15s
          → mặc định tướng slot 1 (Tanker) của địch
                                 ↓
        BƯỚC 3 — SWAP
          Di chuyển 1 cặp ngọc kề cạnh
                                 ↓
        BƯỚC 4 — RESOLVE
          Cascade: match → nổ → refill → match lại...
          ⚔️ → damage lên target (theo cap)
          🩸 → heal team
          💧 → mana team
          🛡️ → shield team
          💣 → nổ 3x3
                                 ↓
        END OF TURN → chuyển lượt đối thủ
```

**Thứ tự resolve trong 1 wave:** Shield (nếu có hiệu ứng tạo giáp) → Damage → Heal → Mana. Trong thực tế mỗi wave chỉ resolve các gem xuất hiện trong wave đó.

**Điểm thiết kế cốt lõi:** target chọn **trước** khi xếp ngọc → người chơi phải cam kết mục tiêu trước khi biết chắc mình ăn được bao nhiêu ngọc. Đây là chỗ đẩy rủi ro có tính toán lên cao nhất. **Không được thay đổi rule này** (signature mechanic).

### 4.5 Target

- Bắt buộc chọn target trước khi swap (mục 4.4 bước 2).
- Toàn bộ đòn đánh thường trong lượt dồn vào tướng đó.
- Không chọn → mặc định **slot 1 (Tanker)** của đội địch.
- Nếu target chết giữa lượt (do skill hoặc bomb chain): phần damage còn lại của lượt **dồn sang tướng còn sống kế tiếp** (không mất damage — tránh cảm giác phí).
- Heal/shield **luôn áp dụng cho cả đội mình**, không cần target.

### 4.6 Công thức sát thương & hồi phục

#### 4.6.1 Đòn đánh thường (từ ngọc ⚔️)

Số hit trong lượt = **số gem ⚔️ nổ** (trước khi áp damage cap). Mỗi hit được thực hiện bởi **1 tướng còn sống, xoay vòng theo thứ tự đội hình**:

```
hit #1 → hero slot 1
hit #2 → hero slot 2
hit #3 → hero slot 3
hit #4 → hero slot 1 (quay lại)
```

> **Quyết định D-01:** dùng round-robin thay vì "cả đội đánh cùng lúc" hay "chỉ hero slot 1 đánh". Lý do: (a) ATK/DEF từng tướng có ý nghĩa thật, (b) giết 1 tướng địch làm giảm damage của đối thủ theo cách trực quan, (c) dễ visualize (mỗi hero có animation đánh riêng).

```
raw      = ATK(hero_i)
mitigated = max(1, round(raw * 100 / (100 + DEF(target))))
final    = max(0, mitigated - shield_remaining(target))
shield_remaining -= min(shield_remaining, mitigated)
```

- Không có crit ở T1.
- Không có ACC/RES ở T1 → kỹ năng **luôn trúng** (ACC/RES đẩy sang T3, xem 14).

#### 4.6.2 Hồi máu

```
heal_per_gem = ceil(maxHP(hero) * 0.006)
// match 3 = 3 gem → hồi 1.8% maxHP cho mỗi tướng còn sống
// hồi vượt maxHP bị cắt về maxHP
```

#### 4.6.3 Shield

- Bể giáp **riêng từng tướng**, cộng dồn, cap `60% maxHP`.
- Giáp tồn tại đến khi bị tiêu hao hết (không hết hạn theo lượt) — đơn giản, dễ hiểu.
- Giáp hiển thị dạng thanh trắng chồng lên thanh HP.

#### 4.6.4 Mana

- Mỗi gem 💧 nổ = **+2 mana** vào bể chung (0–100, dư bị cắt).
- Match 3 = 6 mana; cascade nhiều wave cộng dồn.
- Đầu trận mỗi bên có **30 mana** (STARTING_MANA).
- Khi damage bị cap (4.11), mỗi hit vượt cap đổi thành **+1 mana** (soft-landing thay vì mất trắng).

### 4.7 Mana & Skill

- Mana là **bể chung của đội** — không phải mana riêng từng tướng (giống Summoners War ở mức độ đơn giản hơn).
- Skill tốn `manaCost` + có `cooldown` riêng từng skill (đếm theo lượt của *đội mình*).
- **Tối đa 1 skill/lượt cho cả đội.** Không thể dồn 3 skill trong 1 lượt.
- Cooldown khởi tạo = 0; sau khi dùng = `cd`; giảm 1 vào đầu mỗi lượt của mình.
- Skill **chỉ gây sát thương / buff / debuff thuần** ở T1 — **chưa tác động lên bàn cờ** (đổi màu ngọc, tạo bomb...) để giảm scope.
- **Không có Ultimate ở T1.** Nếu làm sau: điều kiện kích hoạt cực khắt khe, chỉ 1–2 tướng đặc biệt có (né "combo Exodia").

### 4.8 Roster 20

Mỗi tướng: **1 skill độc + 1 passive + 1 điểm yếu rõ ràng**. Đây là linh hồn game — nếu cắt phần này, draft vô nghĩa.

| # | Archetype | HP | ATK | DEF | Skill | Mana | CD | Passive |
|---|---|---|---|---|---|---|---|---|
| 1 | **Tank** | 1242 | 56 | 56 | **Taunt** — kéo toàn bộ target của địch về mình trong 1 lượt của địch | 32 | 3 | +30% DEF khi HP < 50% |
| 2 | **Burst** | 630 | 132 | 14 | **Nuke** — 3× ATK lên 1 target | 40 | 3 | +20% ATK khi team còn đủ 3 người |
| 3 | **Healer** | 930 | 55 | 28 | **Mass Heal** — hồi 40% maxHP cả team | 48 | 4 | Tự hồi 5% maxHP đầu mỗi lượt của mình |
| 4 | **Controller** | 940 | 88 | 26 | **Weaken** — giảm 50% ATK target trong 2 lượt | 32 | 3 | Skill trúng → +10 mana team |
| 5 | **Buffer** | 820 | 64 | 34 | **Rally** — +30% ATK và shield 20% maxHP cả team trong 2 lượt | 40 | 3 | Team +10% ATK |
| 6 | **Debuffer** | 940 | 86 | 26 | **Strip** — giảm 50% DEF target trong 2 lượt | 32 | 3 | Team +15% damage lên target đang bị debuff |
| 7 | **Assassin** | 630 | 120 | 10 | **Execute** — 2.5× ATK, bỏ qua 50% DEF, đánh tướng địch HP thấp nhất | 40 | 3 | +30% damage lên target < 30% HP |
| 8 | **Bruiser** | 960 | 82 | 30 | **Lifesteal Strike** — 2× ATK + hồi 50% damage gây ra | 36 | 3 | Team +15% lifesteal |

#### 4.8.1 Bốn hero P1 mới (25/10)

| # | Archetype | Role | HP / ATK / DEF | Skill (mana · CD) | Passive |
|---|---|---|---|---|---|
| 9 | **Paladin** | Tank/sustain | 1240 / 64 / 52 | **Divine Aegis** 40 · 4 — 1 ally Invincible 1 lượt; 1 lần/trận | Ally <40% HP +15% DEF |
| 10 | **Juggernaut** | Tank/counter | 1320 / 48 / 58 | **Iron Thorns** 36 · 3 — 2 lượt phản 40% basic, +20% DEF | Bị basic hit → +5% ATK (cap +20%) |
| 11 | **Executioner** | Assassin/anti-tank | 702 / 108 / 18 | **Sever** 40 · 4 — 1.8× ATK + 12% maxHP true, ignore 40% DEF | +25% damage vs DEF ≥40 |
| 12 | **Sniper** | Assassin/shield-break | 576 / 138 / 12 | **Deadshot** 36 · 3 — 2.4× ATK, xuyên shield; +30% nếu target có shield | +15% ATK vs target full HP |

#### 4.8.2 Bốn hero P2 mới (25/10)

| # | Archetype | Role | HP / ATK / DEF | Skill (mana · CD) | Passive |
|---|---|---|---|---|---|
| 13 | **Cleaver** | Bruiser/AoE | 702 / 122 / 15 | **Amputation** 48 · 4 — 1.3× ATK cả 3 địch, +10% mỗi địch còn sống | +15% ATK khi còn 3 địch |
| 14 | **Pyromancer** | Mage/DoT | 870 / 98 / 24 | **Ignite** 36 · 3 — 1.2× ATK + Burn 4% maxHP/lượt 2 lượt | +15% damage vs target đang Burn |
| 15 | **Venomancer** | Mage/AoE DoT | 1020 / 92 / 30 | **Toxic Miasma** 40 · 4 — Poison 3% maxHP/lượt 2 lượt lên cả 3 địch, xuyên shield | +1% poison damage mỗi debuff khác |
| 16 | **Oracle** | Healer/cleanse | 1060 / 60 / 32 | **Mend** 36 · 3 — hồi 35% maxHP cho ally thấp nhất + cleanse 1 debuff | Ally <30% HP nhận −15% damage |

#### 4.8.3 Bốn hero P3 (25/10)

| # | Archetype | Role | HP / ATK / DEF | Skill (mana · CD) | Passive |
|---|---|---|---|---|---|
| 17 | **Necromancer** | Summoner | 920 / 88 / 26 | **Raise Thrall** 48 · 5 — Thrall 280 HP / 54 ATK, đánh target đã commit sau lượt, chết theo owner | +20 mana khi ally chết |
| 18 | **Chronarch** | Controller/tempo | 1040 / 84 / 30 | **Time Warp** 40 · 4 — +1 CD toàn bộ skill địch (cap +2), −1 CD 1 ally | Skill đầu tiên mỗi trận của mỗi ally −10 mana |
| 19 | **Spellbreaker** | Controller/mana | 970 / 85 / 33 | **Mana Drain** 36 · 3 — đốt 25 mana địch, nhận 15, strip 1 buff | Skill địch +5 mana cost |
| 20 | **Berserker** | Bruiser/risk | 980 / 84 / 22 | **Reckless Swing** 32 · 3 — 2.2× ATK, mất 10% HP hiện tại (không chết), +25% ATK 2 lượt | +1% ATK mỗi 2% HP đã mất (cap +30%) |

**Chi phí code:** mỗi skill ~20–40 dòng, mỗi passive ~10 dòng hook đầu turn. Tổng thêm ~1.5 ngày so với roster đồng nhất. Xứng đáng.

**Nguyên tắc thiết kế skill:**
- Không skill nào "xóa" cơ chế target (trừ Taunt, có thời hạn 1 lượt).
- Mọi skill đều **counter được** bởi ít nhất 1 archetype khác.
- Không skill nào gây one-shot từ full HP.

### 4.9 Counter matrix

```
          ĐỐI THỦ PICK
          Tank  Burst Healer Ctrl  Buffer Debuff Assassin Bruiser
BẠN  Tank   -     ✓     -     -     -      -      -       ✓
PICK Burst  ✗     -     ✗     ✓     ✓      ✓      -       -
     Healer ✓     ✓     -     -     ✓      -      ✗       ✓
     Ctrl   ✓     ✓     ✓     -     -      -      ✓       -
     Buffer ✗     -     ✓     -     -      ✗      -       ✓
     Debuff ✓     -     ✓     -     ✓      -      -       -
     Assass -     ✗     ✓     -     ✓      -      -       -
     Bruis  ✓     -     ✗     ✓     -      ✓      ✗       -
```

`✓ = có lợi` · `✗ = bất lợi` · `- = trung tính`

**Cách đọc:** địch pick Tank → nên pick Healer / Controller / Debuffer / Bruiser; tránh Burst / Buffer.

**Lưu ý:** matrix là **hướng dẫn trực quan cho người chơi**, **không phải luật cứng** trong code. Server không dùng matrix để tính damage — nó chỉ được render ở DraftScene dưới dạng tooltip. Đây là thứ giám khảo thấy ngay trong demo, không cần giải thích dài.

### 4.10 Thắng / thua / Sudden Death

- **Thắng:** tiêu diệt toàn bộ 3 tướng đối phương.
- **Sudden Death:** sau **50 lượt** (25 mỗi bên), đầu mỗi lượt cả 2 bên mất **5% maxHP** (tính trên maxHP gốc, không phải HP hiện tại) → buộc trận kết thúc.
- **Cả 2 cùng chết trong 1 tick:** so tổng % HP trước tick → bên cao hơn thắng; bằng nhau = **draw** (không ai mất rank point, không ai được).
- **Forfeit:** disconnect quá **20s** không reconnect → xử thua (trừ khi đang ở PvBot).

### 4.11 Cơ chế chống snowball

RNG là phần cốt lõi của match-3 — không né tránh, nhưng phải **cap** để tránh một bên "được trời độ" thắng áp đảo.

| Cơ chế | Mô tả | Tier |
|---|---|---|
| **Damage cap** | Tối đa **6 hit ⚔️** được tính damage/lượt. Hit vượt cap → **+1 mana** mỗi hit | **T1** |
| **Auto-shield** | Nhận **>40% maxHP** trong 1 lượt → tự sinh giáp chặn phần vượt ngưỡng | T2 |
| **Không combo multiplier** | Cascade nhiều wave không nhân damage | **T1** |

> **Quan trọng:** cả 3 ngưỡng số (6 hit, 40%, 5% Sudden Death) đều là **knob playtest**, không phải chân lý. Không đoán trước khi có bản chạy.

### 4.12 Bảng số liệu khởi điểm (config)

Toàn bộ số dưới đây nằm trong **một file duy nhất** `shared/src/config.ts`, import bởi cả client và server. Không hardcode rải rác.

```ts
export const CONFIG = {
  // Board
  BOARD_SIZE: 8,
  GEM_TYPES: ['ATK', 'HP', 'MANA', 'SHIELD'] as const,
  GEM_SPAWN_WEIGHT: { ATK: 0.30, HP: 0.2333, MANA: 0.2333, SHIELD: 0.2334 },

  // Timing (ms)
  TURN_TIME_MS: 15_000,
  DRAFT_PICK_TIME_MS: 20_000,
  DRAFT_BAN_TIME_MS: 15_000,
  RECONNECT_GRACE_MS: 20_000,
  SWAP_ANIM_MS: 180,
  RESOLVE_STEP_MS: 120,        // mỗi wave cascade; tổng match < 2s

  // Match rules
  MAX_TURNS: 50,               // tổng số lượt (25 mỗi bên) → kích hoạt Sudden Death
  SUDDEN_DEATH_HP_PCT: 0.05,   // 5% maxHP/lượt/bên
  DAMAGE_CAP_HITS: 6,

  // Gem values
  MANA_PER_GEM: 2,
  MANA_MAX: 100,
  STARTING_MANA: 30,           // mana đầu trận mỗi bên
  HEAL_PCT_PER_GEM: 0.006,     // 0.6% maxHP
  SHIELD_PCT_PER_GEM: 0.006,   // 0.6% maxHP
  SHIELD_CAP_PCT: 0.60,        // 60% maxHP/tướng

  // Damage
  DEF_K: 100,                  // damage = atk * 100 / (100 + def)
  MIN_DAMAGE: 1,

  // Draft
  PICKS_PER_SIDE: 4,
  PICKS_PER_ROUND: 2,
  BANS_PER_SIDE: 1,
  ROSTER_SIZE: 20, // full roster

  // Economy
  MIN_STAKE_USDC: 50,
  SEASON_LENGTH_DAYS: 14,
  PRIZE_TOP_PCT: 0.30,
} as const;
```

---

## 5. Bot đối thủ

### 5.1 Vì sao bắt buộc có trong T1

1. Test core loop không cần 2 người.
2. **Fallback demo** nếu mạng hỏng / 1 người không connect.
3. Giám khảo thấy sản phẩm chạy mượt dù chơi một mình.

### 5.2 Hành vi

**Draft:**
- Pick: random từ pool còn lại (T1 — chưa cần AI).
- Ban: random 1 trong 4 tướng đối thủ.

**Turn:**
- 70% xác suất dùng skill nếu đủ mana + hết CD (chọn skill đầu tiên khả dụng).
- 100% chọn target: ưu tiên **Healer địch** → **Assassin** → **HP thấp nhất**.
- Swap: **brute-force**, không heuristic phức tạp:

```
for each cell (r,c):
  for each dir in [right, down]:
    simulate swap → count matches
    score = 2*atkHits + 1.5*bombHits + 0.5*manaGems + 0.4*healGems + 0.4*shieldGems
    (nếu target đang HP thấp → weight atkHits cao hơn)
pick swap có score cao nhất; tie → random
```

- 112 swap ứng viên/board → chạy dưới 5ms, không cần tối ưu.

**Difficulty:** 1 mức duy nhất. Không cần AI thông minh.

**Cost:** ~1 ngày code. Chạy trên server, không cần client riêng.

### 5.3 JevPolicy (tuỳ chọn, mặc định tắt)

Server có thể dùng **TypeSafe Jev** (`typesafe/jev-1.14`) qua OpenRouter System One API để
chọn hướng đi cấp cao cho bot. Đây **không** phải bot mới thay thế toàn bộ:

```
Jev chọn: skill → target → intent (FINISH / SUSTAIN / CHARGE / CLEANSE / SETUP / BALANCED)
Local bot: intent → trọng số ngọc → brute-force swap (112 nước)
```

- Jev **không** chọn từng viên ngọc và **không** tính damage.
- Mỗi call nhận state đã cập nhật quyết định trước (chain tuần tự, không hỏi song song).
- `intent` map sang trọng số `ATK/HP/MANA/SHIELD`; ví dụ `FINISH` ưu tiên ATK, `SUSTAIN` ưu tiên HP/SHIELD.
- Fallback về heuristic cũ khi: lỗi mạng, HTTP lỗi, timeout, option lạ, thiếu answer,
  `confidence < JEV_MIN_CONFIDENCE` hoặc `top1 − top2 < JEV_MIN_MARGIN`.
- `BOT_POLICY=heuristic` (mặc định) giữ nguyên hành vi cũ, không gọi mạng → test/demo không phụ thuộc API.

Cấu hình (`server/.env`, xem `server/.env.example`):

```env
BOT_POLICY=jev
OPENROUTER_API_KEY=...          # không commit; rotate nếu đã lộ
JEV_MODEL=typesafe/jev-1.14
JEV_BASE_URL=https://openrouter.ai/api/v1/systemone
JEV_TIMEOUT_MS=6000             # toàn bộ chain skill → target → intent
JEV_MIN_CONFIDENCE=0.2
JEV_MIN_MARGIN=0.05
JEV_LOG_DECISIONS=false
```

Chi phí đo thực tế: ~**$0.00005/call**, ~650–700ms/call; một trận PvBot đầy đủ
(~27 lượt × 3 call) khoảng **$0.004–0.005**. Latency 3 call/turn ~2s, vẫn dưới timer 15s.

Code: `server/src/bots/` — `types.ts`, `heuristicPolicy.ts`, `jevPolicy.ts`,
`policyRunner.ts`, `config.ts`. `MatchRoom` có nhánh async + guard chống đánh 2 lần
nếu timeout/trận kết thúc trong lúc chờ Jev.

### 5.4 Von (free local) và các lựa chọn khác

`BOT_POLICY=von` dùng cùng wire protocol `/v1/systemone`, chạy local, không cần API key:

```bash
pip install "von-sdk>=1.3.7"
von serve --host 127.0.0.1 --port 8000 --device openvino --no-chains
```

```env
BOT_POLICY=von
VON_BASE_URL=http://127.0.0.1:8000/v1/systemone
VON_TIMEOUT_MS=2000
```

**Trạng thái: experimental — không khuyến nghị làm policy chính.** Kết quả đo thật
trên máy Windows + RTX 4060 (OpenVINO):

- 3 state finish/sustain/cleanse: Von trả `BALANCED` cả 3, confidence 0.02–0.06
  → `PolicyRunner` fallback heuristic.
- Short-state probe: nhanh hơn (0.2–1.2s) nhưng vẫn chọn `BALANCED` cho
  FINISH/SUSTAIN/CLEANSE và `ATTACK` cho team 20% HP.
- Full game state: 6.5–32.6s cho cả chain 3 call; timeout 2s → fallback.
- JevBench 1.4: Jev 1.13 composite **63.3**, Von 1.2 **27.5**, Laya **30.3**.
  Claim "Von chỉ kém Jev khoảng 5%" không khớp benchmark công khai.

| Model | License | Size / runtime | SystemOne API | Kết luận cho Prism Pact |
|---|---|---|---|---|
| **Jev 1.14** | closed, hosted | API | ✅ | Chất lượng tốt nhất; dùng chính |
| **Von 1.3** | Apache-2.0 | 395M, CPU/GPU | ✅ drop-in | Free/local, nhưng yếu trên state game; để experimental + fallback |
| **Laya** | Apache-2.0 | 421M ModernBERT | ⚠️ runtime riêng | 32.8ms trên T4; accuracy decision thấp (BFCL 38.1, API-Bank 11.5, CLINC 3.2); English-focused |
| **Clef-flash** | Apache-2.0 | 9B multimodal | ✅ | Chất lượng cao, nhưng cần GPU/H200 hoặc Workers AI (không free local trên máy này) |
| **CLM-8B** | Apache-2.0 | 8B + Qwen3-8B encoder | ⚠️ cần vLLM | Nhanh nhờ cache state/action, nhưng cần GPU; không drop-in đơn giản |

Von đã archive (10/2026); model kế thừa được khuyến nghị là
`LiquidAI/d1-omni-600M`. Với bot Prism Pact, **Jev vẫn là lựa chọn chất lượng**;
Von chỉ đáng thử nếu cần zero-cost và chấp nhận fallback thường xuyên.

### 5.5 Chế độ chơi

| Mode | Mô tả | Tier |
|---|---|---|
| **PvP** | 2 người thật | T1 (chính) |
| **PvBot** | 1 người + bot | T1 (bảo hiểm demo) |
| **Spectator** | Xem trận | T3 |

---

## 6. Kinh tế & DeFi layer

### 6.1 Framing (quan trọng — đừng nói sai)

**SAI:** *"Stake sinh yield, kỹ năng quyết định % yield"* → giám khảo sẽ hỏi *"Ai khóa 100 USDC để lấy 30 cent?"*

**ĐÚNG:** *"Stake để tham gia giải đấu không mất gốc. Toàn bộ yield sinh ra là prize pool. Thắng nhiều trận nhất nhận prize. Thua vẫn lấy lại 100% vốn."*

Reference: **PoolTogether** — mô hình no-loss prize đã chạy nhiều năm, có tiền lệ ở nhiều thị trường.

### 6.2 Mô hình SeasonVault

```
Player deposit 100 USDC
    → Vault gửi vào Benqi (native lending trên Avalanche)
    → nhận qiToken, yield accrue liên tục

Suốt mùa (14 ngày):
    → chơi ranked, tích rank points (vốn không bị đụng tới)

Cuối mùa:
    → Prize pool = yield sinh ra trong mùa (+ sponsor)
    → Top 30% chia prize theo tỷ lệ rank points
    → 100% principal trả lại cho TẤT CẢ (cả 70% còn lại)
    → Top 3: NFT badge (T2 nếu kịp)
```

### 6.3 Con số & cách thuyết phục

Với mùa 14 ngày, **100 người × 100 USDC**, Benqi ~5% APY:

```
10,000 USDC × 5% × 14/365 ≈ $19 prize pool
Top 1 ≈ $3–4, top 30 chia phần còn lại
```

**Vẫn nhỏ** — nhưng frame đã khác: đây là **prize**, không phải **lợi nhuận đầu tư**. Người chơi không nghĩ "bỏ 100 USDC lấy 3 đô", họ nghĩ "tham gia miễn phí, có cơ hội thắng giải".

**Để demo ấn tượng hơn:**
- **Sponsor prize mùa 1:** team bỏ thêm **500 USDC** → demo show pool ~**519 USDC** thay vì 19.
- Pitch: *"Mùa 1 sponsor bởi team. Mùa 2+ đến từ yield + entry fee từ sponsor thương mại."*
- **SeasonScene** hiển thị: `Prize Pool: 519 USDC · Your rank: #12/100 · Projected prize: 8.4 USDC` — **không hiển thị chữ "yield"**, chỉ hiển thị "prize".

### 6.4 Công thức chia prize

```
prize_i = pool * (rankPoints_i / sum(rankPoints của top 30%))
```

- Chỉ top 30% có `rankPoints > 0` được chia.
- Phần lẻ (rounding) cuối cùng dồn cho rank #1.
- Server tính **merkle root** của danh sách `(address, amount)` → owner post lên contract → user tự claim.

**Kiểm chứng bằng script** (`npm run demo:season --workspace contracts`): 3 người nạp 100 USDC, sponsor 500, tua 14 ngày, post prize, claim, rút principal.

```
Prize pool : 500.575364 USDC
Principal  : 300.0 USDC (không đụng tới)

alice        100       100   500.575364   1500.575364
bob          100       100        0.0   1000.0
carol        100       100        0.0   1000.0
✓ No-loss: mọi người nhận lại đủ principal
```

### 6.5 Benqi trên Fuji — phương án dự phòng

| Tình huống | Xử lý |
|---|---|
| Benqi có pool USDC trên Fuji | Dùng **Benqi thật**, wrap interface `IBenqi` |
| Không có / thanh khoản không đủ | Dùng **MockBenqi** — contract tự viết, có `setApyBps()` để demo thấy pool tăng trong vài phút |
| Luôn luôn | Interface chung `IYieldSource { deposit, withdraw, balanceOf }` → đổi implementation không sửa vault |

> **Quan trọng cho demo:** yield thật 5% APY trong 14 ngày gần như không nhìn thấy. `MockBenqi` cho phép set APY cao (vd 1,000%) để prize pool lớn dần **trong lúc giám khảo đang xem** — đây là hiệu ứng demo rất mạnh, và trung thực vì đã ghi rõ "mock".

### 6.6 On-chain vs off-chain

| Tài sản | Vị trí | Lý do |
|---|---|---|
| USDC stake | **On-chain** | Giá trị thật |
| Draft hash | **On-chain** (T1) | Chứng minh fairness |
| Match result hash | On-chain (T2) | Chứng minh kết quả |
| Hero NFT | On-chain (T2) | Sở hữu |
| Rank points | Off-chain (server) | Cập nhật mỗi trận on-chain quá tốn |
| In-game currency | Off-chain | Không cần minh bạch |
| Vật phẩm trang trí | Off-chain | Không ảnh hưởng gameplay |

**Không phát hành token riêng.**

### 6.7 Contract interface (T1)

```solidity
interface ISeasonVault {
    // User
    function deposit(uint256 amount) external;              // USDC, lock tới seasonEnd
    function withdrawPrincipal() external;                  // sau seasonEnd, luôn đủ 100%
    function claimPrize(uint256 amount, bytes32[] calldata proof) external;

    // Ai cũng được
    function sponsor(uint256 amount) external;              // mùa 1: team bỏ 500 USDC

    // Operator (server)
    function commitDraft(bytes32 matchId, bytes32 draftHash) external;

    // Owner
    function startSeason(uint64 endTime) external;
    function postPrizeRoot(bytes32 merkleRoot, uint256 totalPrize) external;
    function withdrawUnusedSponsor(address to) external;    // sponsor dư sau khi post

    // View
    function prizePool() external view returns (uint256);   // yield + sponsor + reserve
    function yieldBalance() external view returns (uint256);
    function totalPrincipal() external view returns (uint256);
    function seasonEnd() external view returns (uint64);
    function draftHashOf(bytes32 matchId) external view returns (bytes32);
}

interface IYieldSource {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;             // rút principal
    function withdrawYield(uint256 amount) external;        // rút lãi — KHÔNG đụng principal
    function balanceOf(address account) external view returns (uint256);
    function accrue() external;
}
```

**Bất biến (invariants) — có test riêng cho từng cái:**
1. `withdrawPrincipal()` luôn trả đủ 100% principal → **không bao giờ** lấy principal trả prize.
2. `prizePool() = yieldBalance + sponsored + prizeReserve` → luôn ≥ 0.
3. Mỗi `matchId` chỉ commit được **1 lần** (revert nếu đã tồn tại).
4. Mỗi address chỉ claim prize **1 lần/mùa**.
5. `postPrizeRoot` chỉ rút **lãi** qua `withdrawYield`, không bao giờ qua `withdraw` (bảo vệ invariant 1).

> **Vì sao tách `withdraw` và `withdrawYield`:** nếu dùng chung một hàm, mỗi lần trả prize sẽ âm thầm trừ `principalOf` của vault trong yield source → đến cuối mùa không đủ tiền trả lại người chơi. Đây là bug đã bị test bắt và đã sửa.

### 6.8 Anti-abuse (layer kinh tế — chỉ cần slide, không code)

| Biện pháp | Giá trị |
|---|---|
| Min stake | **50 USDC** |
| Giới hạn cặp đấu | 1 trận/cặp/ngày |
| Chống win-trading | Thắng cùng đối thủ ≥3 lần liên tiếp → **rank gain giảm 50%** |
| Sybil | Stake thật + rank decay theo thời gian (roadmap) |

---

## 7. Kiến trúc kỹ thuật

### 7.1 Stack

| Layer | Tech | Lý do |
|---|---|---|
| Client | **Phaser 3 + TypeScript + Vite** | Web3 native, ecosystem lớn, hot reload nhanh |
| Server | **Node.js + `ws` + TypeScript** | Authoritative, protocol typed; 2 người/trận nên full-state snapshot đủ, không cần framework nặng |
| Contracts | **Solidity + Hardhat** | Chuẩn EVM, test nhanh |
| Chain | **Avalanche C-Chain Fuji** | Finality 1–2s, EVM-compatible, faucet sẵn |
| Yield | **Benqi / MockBenqi** | Native Avalanche |
| Wallet | MetaMask (T1) → Core (T2) | Core là ví native Avalanche |
| Styling | Pixel art (Kenney.nl / itch.io) | Miễn phí, đồng bộ |

> **D-13 — vì sao không dùng Colyseus:** state 1 trận chỉ ~5 KB (64 ô + 6 hero), bắn full snapshot mỗi action rẻ hơn nhiều so với việc thêm framework + decorator + schema versioning. `ws` + protocol typed trong `shared/protocol.ts` cho client và server dùng chung type, và cho phép test toàn bộ match room **không cần timer thật** (inject đồng hồ). Nếu sau này cần reconnect/spectator quy mô lớn thì đổi sang Colyseus không ảnh hưởng `shared/`.

### 7.2 Nguyên tắc kiến trúc

1. **Server authoritative** — client chỉ render + gửi intent. Board, RNG, damage, timer đều server-side.
2. **Chain là settlement, không phải game server** — không có logic gameplay on-chain.
3. **Event-driven sync** giữa server và chain (commit sau khi draft xong, không block gameplay).
4. **Draft hash on-chain** để chứng minh fairness.
5. **Shared code** — công thức damage/config nằm ở `shared/`, không duplicate.

### 7.3 Cấu trúc repo

```
prism-pact/
├── README.md                    # Spec + trạng thái (single source of truth)
├── competition_info.txt         # Thể lệ cuộc thi (bản gốc BTC)
├── package.json                 # npm workspaces root
├── tsconfig.base.json
├── shared/                      # ✅ ĐÃ CÓ — logic thuần, không phụ thuộc engine
│   ├── src/
│   │   ├── config.ts            # CONFIG — mọi con số cân bằng (4.12)
│   │   ├── types.ts             # Board, Cell, HeroState, SideState…
│   │   ├── rng.ts               # mulberry32 (seed ⇒ tất định)
│   │   ├── side.ts              # otherSide()
│   │   ├── match3.ts            # swap, findRuns, cascade, bomb, shuffle
│   │   ├── combat.ts            # damage, heal, shield, mana, cap, taunt
│   │   ├── heroes.ts            # ROSTER 20
│   │   ├── skills.ts            # 8 skill + validation
│   │   ├── battle.ts            # 1 lượt hoàn chỉnh + điều kiện thắng
│   │   ├── draft.ts             # state machine ban/pick snake-8
│   │   ├── bot.ts               # bot chọn swap + skill
│   │   ├── protocol.ts          # ClientMessage / ServerMessage / MatchView
│   │   └── index.ts
│   ├── test/                    # 103 test (node:test)
│   └── scripts/demo.ts          # CLI: 2 bot đánh 1 trận
├── contracts/                   # ✅ ĐÃ CÓ — Hardhat + Solidity 0.8.24
│   ├── contracts/
│   │   ├── SeasonVault.sol      # no-loss prize pool + commitDraft + merkle claim
│   │   ├── MockUSDC.sol         # USDC 6 decimals + faucet testnet
│   │   ├── MockBenqi.sol        # yield source giả lập, setApyBps() cho demo
│   │   └── interfaces/IYieldSource.sol
│   ├── test/                    # 19 test (deposit, yield, prize, invariant)
│   ├── scripts/deploy.ts        # deploy Fuji + ghi deployments/<network>.json
│   └── .env.example
├── server/                      # ✅ ĐÃ CÓ — 20 test
│   ├── src/
│   │   ├── index.ts             # bootstrap + graceful shutdown
│   │   ├── server.ts            # HTTP /health + WS + matchmaking
│   │   ├── rooms/MatchRoom.ts   # draft → ban → battle → result, timer, bot
│   │   ├── ranking.ts           # rank points off-chain (+25/−15)
│   │   └── chain.ts             # operator ký commitDraft (env-gated)
│   └── test/                    # room.test.ts (đồng hồ giả) + ws.test.ts (transport)
├── client/                      # ✅ ĐÃ CÓ — Vite 7 + Phaser 3.90
│   ├── src/
│   │   ├── main.ts              # bootstrap Phaser + scene router + banner offline
│   │   ├── state.ts             # snapshot store (render-only, không suy diễn luật)
│   │   ├── env.ts               # VITE_* + chuẩn hoá ws/http
│   │   ├── net/gameClient.ts    # WS typed, auto-reconnect backoff, heartbeat
│   │   ├── net/season.ts        # GET /config + /season, fallback đọc chain
│   │   ├── chain/wallet.ts      # MetaMask: connect, switch Fuji, approve + deposit
│   │   ├── chain/abi.ts         # selector + calldata (không cần ethers)
│   │   ├── scenes/BootScene.ts
│   │   ├── scenes/LobbyScene.ts  # queue/bot, wallet, season, event log
│   │   ├── scenes/DraftScene.ts  # pick/ban live, tooltip, counter matrix
│   │   ├── scenes/BattleScene.ts # board 8x8, target/skill, log, result overlay
│   │   └── ui/*                 # gem, heroCard, bar, timer, button, panel…
│   └── .env.example
└── pitch/                       # ⬜ Tuần 3 (slides + video nộp bài)
```

### 7.4 Server components

```
Matchmaking (in-memory queue)
   ├── queue      → ghép 2 người, tạo MatchRoom
   └── playBot    → tạo MatchRoom với bot ở P2 ngay lập tức

MatchRoom (1 trận)
   phase: 'draft' → 'ban' → 'battle' → 'result'
   tick() mỗi 100ms: timeout, bot action, disconnect grace
```

| Phase | Server làm gì | Client làm gì |
|---|---|---|
| `draft` | Timer 20s/pick, validate lượt, broadcast picks (live) | Tap roster |
| `ban` | Timer 15s, **giữ ban ẩn**, resolve đồng thời | Tap 1 tướng địch |
| (transition) | `commitDraft` fire-and-forget lên Fuji, không block | Hiện "Đang commit draft…" + link Snowtrace |
| `battle` | Board authoritative, timer 15s, resolve swap/cascade | Render board, chọn skill/target/swap |
| `result` | Tính rank delta (+25/−15), ghi JSON | Màn hình kết quả |

**Timeout tự động** (chống AFK): hết giờ pick/ban → random hợp lệ; hết giờ lượt → bot chọn nước đi tốt nhất. **Disconnect**: giữ 20s, quá hạn xử thua.

**Đồng bộ timer với animation:** server cộng bù `min(9s, 0.9s + 0.85s × số wave)` vào deadline của lượt kế và lùi thời điểm bot ra quyết định. Nhờ vậy client phát animation xong mới bắt đầu đếm giờ, và **có khoảng nghỉ thấy rõ giữa lượt bạn và lượt địch** (pill đổi màu + splash "ĐỐI THỦ ĐANG ĐÁNH"). Client cũng **đóng băng đồng hồ** trong lúc animation chạy.

**HTTP API** (CORS mở — SeasonScene và tooling dùng):

| Endpoint | Trả về |
|---|---|
| `GET /health` | `{ ok, rooms, waiting, chainConfigured }` |
| `GET /config` | `{ chainId, vaultAddress, usdcAddress, seasonEnd }` |
| `GET /season?address=0x…` | `{ configured, prizePool, totalPrincipal, seasonEnd, deposit?, error? }` — bigint dạng decimal string |

Server tự đọc `contracts/deployments/fuji.json` sau khi deploy, nên phần đọc prize pool không cần set env.

**Env của server**

| Biến | Ý nghĩa |
|---|---|
| `PORT` | cổng WS/HTTP (mặc định 2567) |
| `FUJI_RPC_URL`, `PRIVATE_KEY`, `SEASON_VAULT` | operator ký `commitDraft` (thiếu → tắt chain, game vẫn chạy) |
| `USDC_ADDRESS`, `CHAIN_ID` | trả về qua `/config` cho client |
| `RANKING_FILE` | file JSON lưu rank points |

### 7.5 Message protocol

Toàn bộ type nằm ở `shared/src/protocol.ts` — client và server import chung.

**Client → Server**

| Message | Payload | Phase |
|---|---|---|
| `queue` | `{ name }` | ngoài trận |
| `playBot` | `{ name }` | ngoài trận |
| `cancelQueue` | `{}` | đang chờ |
| `pick` | `{ hero: Archetype }` | draft |
| `ban` | `{ hero: Archetype }` | ban |
| `skill` | `{ casterUid, targetUid? }` | battle |
| `target` | `{ targetUid }` | battle |
| `swap` | `{ from, to }` (index 0..63) | battle |
| `ping` | `{}` | bất kỳ |

**Server → Client**

| Message | Payload |
|---|---|
| `hello` | `{ playerId }` |
| `queued` | `{ position }` |
| `state` | `{ view: MatchView, events: string[], animation?: TurnAnimation }` — snapshot + dữ liệu phát lại lượt |
| `error` | `{ code, message }` |
| `end` | `{ winner, rank: { points, delta } }` |
| `pong` | `{}` |

**Vì sao full snapshot thay vì delta:** state 1 trận ~5 KB; bắn snapshot loại bỏ hoàn toàn class bug "client lệch state", và client chỉ cần `render(view)` — không có logic đồng bộ.

**Animation theo lượt:** mỗi lượt server gửi kèm `TurnAnimation`:

```ts
interface TurnAnimation {
  side: 'P1' | 'P2';
  from: number; to: number;          // 2 ô vừa swap
  waves: Array<{
    runs: Array<{ cells: number[]; type: GemType }>;  // để vẽ tia nối
    cleared: number[];                                 // để nổ
    created: Array<{ index: number; special: Special }>;
    moves: Array<{ from: number; to: number }>;        // để rơi
    spawned: Array<{ index: number; type: GemType }>;  // ngọc mới
    board: (GemView | null)[];                         // board sau wave
    counts: Record<GemType, number>;
  }>;
  skillCasterUid?: string;
}
```

Client phát tuần tự: swap (240ms) → mỗi wave: nối tia (260ms) → nổ (200ms) → rơi (320ms). Nhờ vậy **cả 2 người đều thấy nước đi của đối thủ**, không còn nhảy trạng thái.

### 7.6 MatchView — thứ client nhận

```ts
interface MatchView {
  matchId: string;
  mode: 'pvp' | 'bot';
  you: 'P1' | 'P2';            // client biết mình là bên nào
  phase: 'draft' | 'ban' | 'battle' | 'result';
  deadline: number | null;     // epoch ms — client tự vẽ countdown
  draft: {
    phase: 'pick' | 'ban' | 'done';
    round: number;             // 1..2
    pool: Archetype[];         // tướng còn lại
    picks: Record<Side, Archetype[]>;   // live, công khai
    bans: Record<Side, Archetype[]>;    // rỗng cho tới khi cả 2 ban xong
    turn: Side;
    picksLeftThisTurn: number;
    yourBan: Archetype | null; // chỉ ban của chính bạn
  } | null;
  battle: {
    board: ({ type: GemType; special: Special | null } | null)[]; // 64 ô
    sides: Record<Side, { mana; heroes: HeroView[]; targetUid }>;
    active: Side;
    turn: number;
    suddenDeath: boolean;
  } | null;
  winner: Side | 'draw' | null;
  rank?: { points: number; delta: number };
}
```

### 7.7 Chain integration

```
Server (operator wallet, private key trong .env)
  ├── lúc kết thúc draft:  vault.commitDraft(matchId, draftHash)
  └── lúc kết thúc mùa:    vault.postPrizeRoot(merkleRoot, totalPrize)

Client (user wallet)
  ├── approve USDC → vault.deposit(amount)
  ├── đọc vault.prizePool() cho SeasonScene (poll mỗi 30s)
  └── claimPrize(amount, proof)
```

**Không** để user wallet ký bất kỳ gì trong lúc chơi → không có ma sát UX.

### 7.8 Bảo mật & tính đúng đắn

| Rủi ro | Xử lý |
|---|---|
| Client gian lận (gửi swap vô hạn, damage tự tính) | Server validate **mọi** intent; client không bao giờ gửi damage |
| Timing attack (xem trước kết quả) | Toàn bộ RNG server-side, seed riêng mỗi trận |
| Sửa draft sau khi commit | `draftHash` on-chain + salt reveal sau trận |
| Replay/duplicate commit | `mapping(bytes32 => bytes32)` + revert nếu tồn tại |
| Operator key lộ | Chỉ có quyền `commitDraft` + `postPrizeRoot`, **không** rút được principal |
| Vault mất thanh khoản | Principal nằm ở Benqi, withdraw trước `seasonEnd` bị chặn bởi design |

---

## 8. UI/UX

### 8.1 Nguyên tắc

- **Portrait mobile-first** — thiết kế cho 390×844 trước, desktop chỉ scale.
- **Pixel art**, font pixel, palette 4 màu ngọc phân biệt rõ **cả khi mù màu** (khác cả hue + shape).
- **Animation < 2s/match** — resolve cascade nhanh, không để người chơi chờ.
- Bàn cờ chiếm **~50% chiều cao màn hình**.
- Mọi thông tin quan trọng (HP, mana, timer) **không bị che bởi animation**.

### 8.2 BattleScene

```
┌─────────────────────┐
│ Địch: 3 hero + HP   │ ← tap để target
├─────────────────────┤
│ Mana bar 2 bên      │
├─────────────────────┤
│                     │
│   Bàn cờ 8x8        │ ← ~50% màn hình
│                     │
├─────────────────────┤
│ Skill bar + Timer   │
├─────────────────────┤
│ Mình: 3 hero + HP   │
└─────────────────────┘
```

**Chi tiết tương tác:**
- Tap hero địch → viền sáng = target đã chọn (bắt buộc trước khi swap).
- Tap skill icon → highlight hero đủ điều kiện → tap hero để tung.
- Drag ngọc → preview đường đi → thả = swap.
- Target đã chọn hiển thị **mũi tên/đường nối** từ đội mình sang hero địch (rất quan trọng để dạy người mới hiểu mechanic).

**Chỉ báo lượt (draft + battle):**
- **Thanh lượt cố định** ngay trên log: `● LƯỢT CỦA BẠN — …` (xanh) / `● LƯỢT ĐỐI THỦ — ĐANG ĐI…` (đỏ, nhấp nháy). Luôn hiện, không phải thông báo tạm.
- Battle: **viền bàn cờ đổi màu** theo lượt, skill bar mờ 45% khi không phải lượt mình.
- Draft: roster **mờ 45%** khi đối thủ đang pick; ban hiện thông báo vàng `BAN ẨN — …`.
- Khi đổi lượt có thêm thông báo fade/scale ~1s ở giữa bàn.

**Giải thích hiệu ứng ngọc (battle):**
- Đầu trận hiện bảng 1 lần: ATK = sát thương, HP = hồi máu, MANA = nạp mana, SHIELD = tạo giáp (tự đóng sau 6s).
- Sau mỗi wave, **ngọc bay tới đích**: ⚔️ đỏ bay tới tướng bị đánh, 🩸 xanh và 🛡️ tím bay về tướng đội mình, 💧 xanh dương bay lên thanh mana.
- Tướng ăn damage: **card rung + nháy đỏ + số `-X` bay lên**; hồi máu hiện `+X`; giáp hiện `+X giáp`.

### 8.3 DraftScene

```
┌─────────────────────┐
│ Vòng 2/2 · 28s      │
├─────────────────────┤
│ Địch: ? ?           │
├─────────────────────┤
│ Roster 5x4 (20 tướng)│ ← tap pick
├─────────────────────┤
│ Mình: H1 H3         │
└─────────────────────┘
```

- Tướng đã bị pick/ban → grayscale + icon khoá.
- Tooltip tướng: skill, passive, HP/ATK/DEF, và **gợi ý counter** (từ matrix 4.9).

### 8.4 SeasonScene (màn hình ăn điểm DeFi)

```
┌─────────────────────┐
│ Deposited: 100 USDC │
│ Prize Pool: 519 USDC│ ← hiển thị pool, KHÔNG hiện "yield"
│ Rank: #12 / 100     │
│ Projected prize:    │
│   8.4 USDC          │
├─────────────────────┤
│ [Claim] (disabled)  │
└─────────────────────┘
```

- Prize pool **animate tăng dần** trong lúc xem (nhờ MockBenqi APY cao) → tạo cảm giác "tiền đang sinh ra".
- Nút Claim disable kèm countdown tới `seasonEnd`.
- Link Snowtrace tới vault contract.

### 8.5 Luồng màn hình

```
Boot → Lobby → [Draft] → Battle → Result → Lobby
                  └────────────────────────┘
Lobby ⇄ SeasonScene
```

---

## 9. Rank & Season

### 9.1 Rank points (off-chain)

| Sự kiện | Delta |
|---|---|
| Thắng | **+25** |
| Thua | **−15** (không xuống dưới 0) |
| Draw | 0 |
| Forfeit | −15 |
| Thắng cùng đối thủ lần 3+ liên tiếp | +12 (giảm 50%) |

- Rank tier hiển thị: Bronze / Silver / Gold / Diamond / Prism (cosmetic, dựa trên rank points).
- Rank points lưu DB (SQLite/Postgres — SQLite đủ cho hackathon).

### 9.2 Season lifecycle

```
startSeason(endTime)  →  người chơi deposit  →  chơi ranked
                                    ↓
                    seasonEnd: chốt rank, snapshot top 30%
                                    ↓
                    server tính merkle root → postPrizeRoot
                                    ↓
                    user claimPrize (bất kỳ lúc nào)
                                    ↓
                    withdrawPrincipal (100%, bất kỳ lúc nào sau seasonEnd)
```

---

## 10. Timeline & milestone

**Mốc cứng:** deadline nộp **25/11/2026 05:59** (giờ VN, cùng múi giờ Bangkok). Final Demo Day 30/11.

> **Đã sửa so với docs cũ:** bản cũ ghi "buffer ngày 25–28" — tức là *sau* deadline, vô nghĩa. Timeline dưới đây đặt buffer **trước** deadline.

### Tuần 0 — Pre-build (23/10 → 1/11)

Không nằm trong 30 ngày của cuộc thi, nhưng có sẵn — dùng để giảm rủi ro.

| Việc | Deliverable |
|---|---|
| Học Phaser 3 + WebSocket protocol (làm tutorial chính thức) | 1 demo board swap chạy local |
| Setup monorepo + Hardhat + ví Fuji | `npm run dev` chạy được 3 package |
| Deploy MockUSDC + MockBenqi + SeasonVault skeleton lên Fuji | Address ghi vào `.env.example` |
| Chốt spec này, freeze các quyết định D-01..D-08 | Không đổi rule trong lúc code |

### Tuần 1 (2–8/11) — Core loop

| Việc | Deliverable |
|---|---|
| `shared/match3.ts`: match detect, swap, cascade, refill, shuffle | Unit test xanh |
| Bomb gem (match 4) | Test xanh |
| Battle logic: mana, heal, shield, damage, target | Test xanh |
| 20 tướng: skill + passive | Test xanh |
| Bot (draft + turn) | Bot tự chơi hết 1 trận offline |
| SeasonVault + MockBenqi trên Fuji | Deposit/withdraw chạy, test xanh |

### Tuần 2 (9–15/11) — Multiplayer + Draft

| Việc | Deliverable |
|---|---|
| Matchmaking + `MatchRoom` (draft → ban → battle) | 2 browser vào cùng trận |
| Draft live snake-8 + ban ẩn | 2 browser draft xong ra 3v3 |
| BattleScene + DraftScene render từ state | **2 browser chơi 1 trận đầy đủ** |
| Reconnect / timeout / forfeit | Test case thủ công |
| Draft hash commit on-chain | Tx hiện trên Snowtrace |

### Tuần 3 (16–22/11) — Polish + DeFi UX

| Việc | Deliverable |
|---|---|
| SeasonScene (prize pool, rank, projected prize) | Màn hình demo ăn điểm |
| Wallet connect + deposit flow | Deposit 100 USDC thật trên Fuji |
| UI polish: animation, pixel art, sound | Cảm giác "game thật" |
| Slides + video | Bộ nộp bài đầy đủ |
| **Feature freeze 22/11 23:59** | Chỉ fix bug từ đây |

### Buffer (23–24/11)

| Việc | Deliverable |
|---|---|
| Fix bug, quay video backup | Video demo 3–5 phút |
| Viết README/slide final, kiểm tra repo public | Repo sạch, hướng dẫn chạy |
| **Nộp bài trước 20:00 ngày 24/11** | Trạng thái submitted trên Builder Hub |

> Nộp sớm 1 ngày, không dựa vào phút chót. Deadline 05:59 sáng 25/11 là bẫy cho người thức đêm.

### T2 (chỉ khi T1 xong sớm)

Rainbow gem → auto-shield → match result hash → Hero NFT 1 cái → Core wallet → EIP-712.

---

## 11. Kịch bản demo 5 phút

Chuẩn bị **2 browser + 1 video backup**.

| Thời lượng | Nội dung | Điểm cần nói |
|---|---|---|
| 0:00–0:30 | Mở SeasonScene: `Deposited 100 USDC · Prize Pool 519 USDC · Rank #12` | "Không mất gốc. Yield là prize." |
| 0:30–1:15 | Connect wallet → deposit → tx confirm 1–2s | "Avalanche finality — đây là lý do chọn chain này." |
| 1:15–2:15 | Draft live snake-8: counter-pick (địch Tank → mình Controller), ban 1 | Mở tooltip counter matrix: "Đây là chiều sâu chiến thuật." |
| 2:15–2:30 | Cuối draft → tx `commitDraft` → mở Snowtrace | "Draft không thể sửa. Fairness on-chain." |
| 2:30–4:15 | Battle: target cam kết → ăn 4 ngọc ATK → bomb gem → skill → đổi target | "Target chọn trước khi biết mình ăn gì — đây là signature." |
| 4:15–4:45 | Kết thúc trận: win screen + rank +25 + projected prize tăng | "Kỹ năng → rank → prize." |
| 4:45–5:00 | Slide roadmap T2/T3 + đội | "Mùa 1 sponsor, mùa 2 tự chạy." |

**Phương án B (mạng hỏng):** PvBot mode + video backup. Không bao giờ demo PvP live mà không có phương án B.

---

## 12. Pitch & Q&A

### 12.1 Ba slide cốt lõi

**Slide 1 — Vấn đề**
- Match-3 casual không có chiều sâu cạnh tranh.
- GameFi hiện tại đa số là Ponzi (token in ra → sụp).
- PvP game cần fairness chứng minh được, nhưng gần như không ai làm.

**Slide 2 — Giải pháp**
- Draft đối kháng 12 archetype P1 (20 final) → counter-pick thật.
- Match-3 có cam kết target → quyết định rủi ro.
- No-loss prize pool → không ai mất tiền.

**Slide 3 — Tại sao Avalanche**
- Finality 1–2s → commit draft hash mỗi trận khả thi (Ethereum 12s+ thì không).
- Benqi là lending native → yield thật, không phải number giả.
- C-Chain EVM-compatible → dev nhanh, tooling quen.

### 12.2 Q&A chuẩn bị sẵn

**Q: "Ai khóa 100 USDC để lấy vài đô prize?"**
> Đây không phải đầu tư, đây là tham gia giải đấu miễn phí. Giống PoolTogether — bạn không mất gì, nhưng có cơ hội thắng. Mùa 1 có sponsor prize để hấp dẫn người chơi đầu tiên.

**Q: "Sybil attack / win-trading?"**
> Min stake 50 USDC, 1 trận/cặp/ngày, rank gain giảm 50% nếu thắng cùng đối thủ 3 lần liên tiếp. Đây là layer kinh tế, không phải layer kỹ thuật — thêm được bất cứ lúc nào.

**Q: "Oracle tập trung — server ghi rank?"**
> Đúng, đây là centralization ở mùa 1. Roadmap: EIP-712 attestation — server ký, user tự claim, contract verify. Bước tiếp theo là commit-reveal toàn bộ match result. Chúng tôi chọn bắt đầu tập trung để ship nhanh, nhưng có lộ trình rõ ràng.

**Q: "Pháp lý?"**
> Chúng tôi định vị là skill-based no-loss prize game, tương tự PoolTogether đã hoạt động ở nhiều thị trường. Đây là reference, không phải kết luận pháp lý — sẽ làm việc với legal counsel trước mainnet.

**Q: "Khác gì Marvel Puzzle Quest?"**
> MPQ cho chọn đội tự do trước trận, không có draft đối kháng. Ở Prism Pact, đội hình là kết quả của một cuộc đấu trí real-time — và target commitment buộc bạn chấp nhận rủi ro trước khi biết kết quả.

**Q: "Tại sao không dùng token?"**
> Token tạo áp lực tăng giá và biến game thành đầu cơ. Chúng tôi dùng USDC ổn định + no-loss, để người chơi đến vì game.

---

## 13. Rủi ro & câu hỏi mở

### 13.1 Rủi ro kỹ thuật

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Networking realtime khó nhất, dễ trễ | **Cao** | Đã làm xong sớm ở Tuần 0 (20 test, gồm transport WS); bot là fallback |
| Học Phaser 3 mất thời gian | Trung bình | Dùng tutorial + asset pack có sẵn, không tự vẽ |
| Benqi không có pool USDC trên Fuji | Trung bình | MockBenqi sau interface chung → đổi 1 dòng |
| Faucet Fuji hết token lúc demo | Trung bình | Chuẩn bị **3 ví có sẵn USDC test** trước 1 ngày |
| Board match-3 có bug cascade/infinite loop | Trung bình | Unit test kỹ ở Tuần 0–1, cap số wave (max 20) |
| Tx commit fail lúc demo | Trung bình | Wrap try/catch, không block gameplay; hiện trạng thái "pending" |

### 13.2 Câu hỏi mở (cần trả lời trước khi code xong)

| # | Câu hỏi | Deadline quyết định |
|---|---|---|
| 1 | ~~Draft order có cần snake để cân bằng FP không?~~ → **đã chốt snake-8 (D-24)** | Xong 25/10 |
| 2 | Damage cap 6 hit có đúng cảm giác không? | Playtest 15/11 |
| 3 | Sudden Death 5%/lượt có quá nhanh/chậm? | Playtest 15/11 |
| 4 | Có cần auto-shield ở T1 thay vì T2? | 15/11 (quyết định cuối) |
| 5 | Prize mùa 1: sponsor 500 hay 1000 USDC? | Trước demo |
| 6 | Rank points +25/−15 có tạo inflation không? | Playtest 20/11 |

### 13.3 Điểm yếu thừa nhận công khai (nói trước, đừng để bị hỏi)

- Oracle/rank vẫn tập trung ở mùa 1 → có roadmap EIP-712.
- Prize mùa 1 nhỏ → sponsor bù, frame là "prize" không phải "lợi nhuận".
- Sybil chỉ giải quyết ở layer kinh tế, chưa có chống kỹ thuật.
- Draft hiện random FP → chưa có hệ thống balance dài hạn.
- **Claim prize trên UI đang tắt**: contract đã có `claimPrize` + script `demo:season` chứng minh, nhưng chưa có flow post-merkle-root cuối mùa cho người chơi thật.
- **Cascade hiển thị theo snapshot**: server gửi state cuối mỗi lượt nên gem "pop" thay vì animate từng wave (đánh đổi để giảm 1 lớp đồng bộ).
- **Reconnect T1** = grace 20s rồi xử thua, chưa có session token (D-15).

---

## 14. Decision log

Các quyết định **đã chốt**, dùng để chặn tranh luận lại giữa lúc code.

| ID | Quyết định | Lý do | Ngày |
|---|---|---|---|
| **D-01** | Đòn đánh thường dùng **round-robin theo slot đội hình** | ATK/DEF từng tướng có nghĩa; giết tướng làm giảm damage; dễ visualize | 23/10 |
| **D-02** | Draft = **2 vòng × 2 pick** (không phải 4 vòng) — *đã thay bằng D-24 snake-8* | Docs cũ mâu thuẫn: "4 round" ra 8 tướng/bên nhưng vẫn ghi pick 4 | 23/10 |
| **D-03** | Ban **đồng thời + ẩn** (20s) | Tránh lợi thế thông tin cho người ban sau; không cần thêm luật order | 23/10 |
| **D-04** | Roster = **1 skill + 1 passive** mỗi tướng | Docs cũ mâu thuẫn "1 skill" vs "2 skill"; 1+1 đủ tạo counter | 23/10 |
| **D-05** | **Bỏ ACC/RES** khỏi T1, đẩy sang T3 | Thêm 1 lớp RNG nữa làm playtest khó; chưa cần để chứng minh concept | 23/10 |
| **D-06** | **Không combo multiplier**; hit vượt damage cap → mana | Chống snowball, giữ cascade vẫn có giá trị (mana) | 23/10 |
| **D-07** | **Không ult, không rune, không gacha** trong T1 | Scope; đã có trong roadmap T3 | 23/10 |
| **D-08** | Demo dùng **MockBenqi với APY cao**, ghi rõ "mock" | Yield thật 5%/14 ngày không nhìn thấy được; trung thực vì label rõ | 23/10 |
| **D-09** | **Feature freeze 22/11**, nộp **24/11 20:00** | Deadline thật là 25/11 05:59; buffer phải nằm trước deadline | 23/10 |
| **D-10** | Tách `withdraw()` (principal) và `withdrawYield()` (lãi) trong `IYieldSource` | Dùng chung 1 hàm thì mỗi lần trả prize sẽ trừ nhầm `principalOf` → cuối mùa thiếu tiền trả người chơi. Test bắt được bug này | 23/10 |
| **D-11** | Prize chia bằng **merkle root** post on-chain, user tự claim | Không cần server gửi tx cho từng người; user chủ động claim; chống claim 2 lần bằng mapping | 23/10 |
| **D-12** | `MockBenqi` **mint** lãi bằng MockUSDC thay vì ghi số ảo | Lãi là token thật trong ví → `withdrawPrincipal` luôn khả thi, demo không bị "ảo" | 23/10 |
| **D-13** | Server dùng **`ws` + typed protocol** thay vì Colyseus | State 1 trận ~5 KB, full snapshot rẻ; bỏ được decorator/schema versioning; test room được với đồng hồ giả | 23/10 |
| **D-14** | Rank points lưu **JSON file** (debounce 200ms) | Hackathon không cần DB; đổi sang Postgres chỉ sửa 1 class | 23/10 |
| **D-15** | Reconnect T1 = **grace 20s rồi xử thua**, chưa có session token | Đủ cho demo; token-based rejoin để T2 | 23/10 |
| **D-16** | `draftHash = keccak256(JSON{matchId,p1,p2,bans,salt})` | Verify được off-chain bằng 1 dòng; salt công bố sau trận | 23/10 |
| **D-17** | Client **không dùng ethers** — encode calldata + selector thủ công | Chỉ cần 5 lời gọi (balanceOf/allowance/approve/deposit/prizePool); giảm ~300 KB bundle. Selector đã đối chiếu bằng `ethers.id()` trong lúc review | 23/10 |
| **D-18** | Dev hook `window.__prism` **chỉ khi `import.meta.env.DEV`** | Cho phép E2E đọc/điều khiển game từ console mà không lộ gì trên production build | 23/10 |
| **D-19** | Container dùng **Rectangle con làm hit target** (không `setInteractive` trên Container) | Phaser hit-test Container lệch nửa chiều cao — đo thực tế: nút 40px tại y=601 chỉ ăn 565..604. Sau khi đổi: 581..621 khớp hình vẽ | 23/10 |
| **D-20** | Draft **khoá thao tác** cho tới khi server trả state | Người chơi bấm nhanh 3 lần trong lượt 2-pick → lần 3 bị server trả "chưa tới lượt". Khoá + toast "đang gửi…" loại bỏ hoàn toàn | 23/10 |
| **D-21** | Server gửi **TurnAnimation** (runs/cleared/moves/spawned/board từng wave) | Snapshot cuối lượt không thể animate. Client phát lại đúng thứ tự: swap → nối → nổ → rơi, và **đối thủ cũng thấy** nước đi | 23/10 |
| **D-22** | `TurnAnimation` gửi kèm **`swapBoard`** (bàn ngay sau swap) | Client tự suy ra bàn sau swap bị lệch khi state đến trễ → tia nối sai quân. Đo thực tế: 4 ô sai/18 wave → **0/13** sau khi dùng swapBoard | 23/10 |
| **D-23** | **Balance patch 25/10**: HP ×0.8, ATK ×1.2, heal/shield 0.6%/gem, damage cap 6, ATK gem 30%, start mana 25, mana/gem 2, skill cost −20%; **giữ timer 20s** | 1.000 trận bot: 62,3 lượt/trận (84% Sudden Death) → 24,8 lượt (0,2% SD); battle 90% timer + animation ~8m45s; mật độ skill 10,4% → 21,9% | 25/10 |
| **D-24** | **Draft snake-8** (P1→P2→P2→P1→P1→P2→P2→P1), pool 16 P2, kết thúc pick theo `PICKS_PER_SIDE × 2` thay vì `ROSTER_SIZE` | Loại bỏ lợi thế last-pick của P2; pool 16 đủ cho 4 pick/bên + 1 ban/bên; mở đường lên 20 mà không sửa logic draft | 25/10 |
| **D-25** | **P2 roster**: Cleaver, Pyromancer, Venomancer, Oracle; thêm Burn/Poison/DOT_DOWN/Cleanse, Healer overheal → shield | Meta AoE/DoT; Oracle là cleanse chống DoT; Controller giảm 25% DoT | 25/10 |
| **D-26** | **P3 roster**: Necromancer, Chronarch, Spellbreaker, Berserker; thêm Thrall, CD manipulation, mana drain, skill tax, missing-HP scaling; pool đủ 20 | Hoàn tất roster 20; Thrall tạo áp lực target thứ hai; Chronarch/Spellbreaker tạo meta tempo/mana; Berserker là bruiser risk-reward | 25/10 |
| **D-27** | **Balance patch 2 (25/10)**: chỉ đổi HP/ATK/DEF (không đổi cost/CD), start mana 25→30, timer 20→15s, pick 30→20s, ban 20→15s, **random first turn** (`BATTLE_FIRST=random`) | 5.000 trận: P1/P2 **49,8/50,2%**, hero **46,7–53,8%** (trước: 31,5–72,6%). 1.000 trận @15s: **9m43s/trận** (median 9m15s), SD 3,3%, **6,0 skill/trận**, 21,9% lượt có skill. Draft first-pick không còn lợi thế rõ; battle-first được random hoá thay vì buff P2 | 25/10 |

### Những gì đã cắt khỏi bản v1 (và lý do)

| Hạng mục v1 | Trạng thái | Lý do |
|---|---|---|
| Rune system (ATK/DEF/HP/RES/ACC) | **T3** | Cần economy + farm loop, không thể nhét vào demo 3 tuần |
| Gacha tướng | **T3** | Cần pool lớn tướng; T1 có đúng 8 |
| Gacha rune | **T3** | Vấn đề mở về newbie/oldbie gap chưa giải |
| Ultimate skill | **T3** | Nguy cơ "combo Exodia" phá game |
| ACC/RES | **T3** | Thêm RNG chồng RNG, khó playtest |
| Hint system | **Tính năng của tướng (T3)** | Không làm hint mặc định; để dành passive của 1–2 tướng hiếm |
| Rainbow gem | **T2** | Cắt khỏi T1 để giảm scope |
| Auto-shield | **T2** | Cần playtest damage trước |
| "An toàn pháp lý" | **Bỏ** | Không thể khẳng định; chỉ reference PoolTogether |
| Stake → % yield | **Thay bằng** no-loss prize pool | Framing cũ không thuyết phục |

---

## 15. Glossary

| Thuật ngữ | Nghĩa |
|---|---|
| **Archetype** | Vai trò tướng (Tank/Burst/Healer/...). Pool có 8, mỗi archetype đúng 1 tướng. |
| **Bomb Gem** | Ngọc đặc biệt tạo từ match 4, nổ 3x3 |
| **Rainbow Gem** | Ngọc đặc biệt tạo từ match 5 (T2), xoá 1 loại ngọc |
| **Cascade** | Chuỗi match tự động sau khi refill |
| **Damage cap** | Giới hạn số hit ⚔️ được tính damage/lượt (5) |
| **Draft hash** | `keccak256` của picks + bans + salt, commit on-chain |
| **First Pick (FP)** | Bên pick trước trong draft |
| **Killer / Taunt** | Hiệu ứng ép target của địch về 1 tướng |
| **Mana pool** | Bể mana chung của đội (0–100) |
| **No-loss prize pool** | Prize lấy từ yield, principal trả đủ 100% |
| **SeasonVault** | Contract giữ stake, gửi vào Benqi, chia prize cuối mùa |
| **Slot** | Vị trí 1–3 trong đội hình; slot 1 = Tanker mặc định |
| **Sudden Death** | Sau 50 lượt, mỗi lượt cả 2 mất 5% maxHP |
| **Target commitment** | Rule bắt buộc chọn target trước khi swap |
| **T1 / T2 / T3** | Phân tầng scope: demo / nếu kịp / chỉ pitch |

---

*Hết spec. Mọi thay đổi rule phải cập nhật Decision log (mục 14) trước khi code.*
