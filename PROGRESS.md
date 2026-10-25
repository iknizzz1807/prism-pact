# PROGRESS — Prism Pact

> File bàn giao cho agent/người tiếp quản. Cập nhật lần cuối: **2026-10-25**.
> Spec là `README.md` — file này chỉ nói **đang ở đâu, còn gì, cạm bẫy gì**.
> Quyết định thiết kế nằm ở `README.md` mục 14 (D-01 → D-22), không lặp lại ở đây.

---

## 1. TRẠNG THÁI MỘT DÒNG

Game **chơi được end-to-end** ở local (draft live → battle → kết quả), có animation cascade. **Chưa deploy Fuji**, nên phần Web3 đang tắt. Thiếu slide/video.

```
shared/     109 test  ✅ xong (luật game + 20 hero P3 + weighted swap)
contracts/  19 test   ✅ xong (đã deploy hardhat local, chưa lên Fuji)
server/     34 test   ✅ xong (WS + HTTP + Jev/Von policy + fallback)
client/      build OK  ✅ xong phần chơi; còn polish + Web3 UI
```

Chạy `npm test` → 162 test. `npm run typecheck` + `npm run build` → sạch.

---

## 2. CHẠY / KIỂM CHỨNG

```powershell
# Node portable (máy này không cài Node toàn cục)
$env:PATH="C:\Program Files\nodejs;C:\Program Files\Git\cmd;$env:PATH"

npm install
npm run setup:client        # client là package standalone, cài riêng
npm test                    # 78 + 19 + 20
npm run typecheck
npm run build

npm run dev:server          # :2567  (health /health)
npm run dev:client          # :5173
```

Hiện tại **server + vite đang chạy sẵn** trong phiên làm việc này (nếu process chết thì chạy lại 2 lệnh trên).

Kiểm tra tay nhanh:
1. Mở `http://localhost:5173` → CHƠI VỚI BOT.
2. Draft: chọn 4 tướng, ban 1.
3. Battle: chọn target → tap 2 viên ngọc cạnh nhau.
4. Thấy: swap → tia nối → nổ → rơi → (cascade tiếp) → damage.

---

## 3. BẢN ĐỒ CODE

```
shared/src/
  config.ts      mọi con số cân bằng (nguồn duy nhất)
  types.ts       Board/Cell/Wave/HeroState/SideState
  match3.ts      swap, findRuns, cascade, bomb, gravity (trả moves/spawned/board), shuffle
  combat.ts      damage, heal, shield, mana, cap, taunt, sudden death
  heroes.ts      20 hero P3 (HP/ATK/DEF/skill/passive)
  skills.ts      8 skill + validate mana/CD
  battle.ts      1 lượt hoàn chỉnh + TurnAnimation
  draft.ts       state machine pick snake-8 + ban ẩn
  bot.ts         chọn swap/skill cho bot
  protocol.ts    ClientMessage/ServerMessage/MatchView/TurnAnimation
server/src/
  server.ts      HTTP (/health,/config,/season) + WS + matchmaking + policy factory
  rooms/MatchRoom.ts  draft → ban → battle → result, timer, bot sync/async, forfeit, commitDraft
  bots/types.ts         TurnPlan / BotPolicy / intent → GemWeights
  bots/heuristicPolicy.ts  wrap hành vi bot cũ (fallback)
  bots/jevPolicy.ts     SystemOnePolicy + JevPolicy (OpenRouter) + VonPolicy (local)
  bots/policyRunner.ts  timeout + confidence + fallback
  bots/config.ts       đọc BOT_POLICY / JEV_* / VON_* env
  season.ts      đọc SeasonVault read-only (cache 5s)
  ranking.ts     JSON +25/−15
  chain.ts       operator ký commitDraft (env-gated)
contracts/contracts/
  SeasonVault.sol  deposit / withdrawPrincipal / sponsor / commitDraft / postPrizeRoot / claimPrize
  MockBenqi.sol    yield giả lập (mint USDC), withdrawYield tách khỏi principal
client/src/
  main.ts        Phaser bootstrap + route scene + banner offline + dev hook __prism
  net/gameClient.ts   WS typed + reconnect backoff
  net/season.ts       /config + /season + fallback đọc chain
  chain/wallet.ts     MetaMask + approve/deposit (calldata tay, không cần ethers)
  scenes/BattleScene.ts  board + animation (playAnimation/animateWave) + HUD
  scenes/DraftScene.ts   roster, modal chi tiết, khoá gửi trùng
  ui/touch.ts     hit target cho Container (BẮT BUỘC dùng — xem §6)
  ui/turnNotice.ts  thông báo lượt (fade + scale, không chạy chữ)
```

---

## 4. ĐÃ KIỂM CHỨNG THẬT (không chỉ test)

| Việc | Bằng chứng |
|---|---|
| Trận PvBot trọn vẹn 56 lượt, Sudden Death, ra kết quả + rank | chạy qua browser thật, đọc `matchStore` |
| 2 client WS queue → cùng 1 trận, side đối nhau | `server/test/ws.test.ts` |
| Draft snake-8, ban ẩn tới khi cả 2 xong | `room.test.ts` + chạy tay |
| Animation cascade | 6/8 lượt có ≥2 wave, max 7 wave, 36 viên rơi |
| Link đúng quân | hook `drawLinks`: **0 ô sai / 13 wave** (trước khi sửa: 4/18) |
| Bàn sau animation khớp server | 64/64 ô đúng ở 4 lượt liên tiếp |
| Không lỗi console | 0 error trong các phiên E2E |
| No-loss | `npm run demo:season` → bob/carol về đúng 1000, alice +prize |
| JevPolicy chain thật | gọi OpenRouter `typesafe/jev-1.14` từ code TypeScript → plan `Nuke / P2:1 / BALANCED`, confidence 0.37 |
| Fallback Jev | `server/test/policy.test.ts`: network error, timeout 20ms, confidence 0.15, option lạ → heuristic |

---

## 5. TODO — ƯU TIÊN

### P0 — phải xong trước khi nộp

- [ ] **Deploy Fuji** (chặn toàn bộ phần Web3 UI).
      `cp contracts/.env.example contracts/.env` → điền `PRIVATE_KEY` (có AVAX testnet) → `npm run deploy:fuji`.
      Xong: `contracts/deployments/fuji.json` xuất hiện; `/config` tự trả address; nút nạp USDC sáng.
      **Acceptance:** `GET /config` có `vaultAddress`, UI nạp được 100 USDC testnet, Snowtrace có tx.
- [ ] **Luồng trả thưởng cuối mùa** (contract đã có, thiếu tooling):
      - script `contracts/scripts/post-prize.ts`: đọc ranking → chia top 30% → dựng merkle → `postPrizeRoot`.
      - server `GET /prize?address=` trả `{ amount, proof }`.
      - client bật nút Claim (đang disable).
      **Acceptance:** chạy trên hardhat, 1 địa chỉ claim được, claim lần 2 revert.
- [ ] **Slide + video demo 5 phút** (kịch bản ở README §11). Chưa có gì trong repo.
- [ ] **Kiểm tra deadline**: nộp 25/11 05:59 (giờ VN). Toàn bộ code nên freeze trước 22/11.

### P1 — chất lượng / demo mượt

- [x] **Layout PC Viewport (1280×720)**: Đã refactor toàn bộ client sang landscape 16:9 PC widescreen (Lobby 3 cột, Draft 3 cột + roster 2x4, Battle: board ở giữa, Đội bạn bên trái, Đội địch & nhật ký bên phải).
- [x] **Cải thiện độ nét chữ viết**: Bật `roundPixels: true`, dùng `devicePixelRatio`, font padding, và nâng thang kích thước chữ lên chuẩn PC (12-16px, tiêu đề 20-36px), triệt tiêu hoàn toàn mờ nhòe.
- [ ] **Âm thanh**: swap, match, bomb, combo, thắng/thua (hiện không có tiếng).
- [ ] **Reconnect có token** (hiện mất mạng >20s là thua; D-15).
- [ ] **Rematch** ở màn kết quả.
- [ ] **Bảng rank** (`/leaderboard` + UI Lobby) — hiện chỉ hiện rank trận gần nhất.
- [ ] **Damage number hiện đúng lúc trúng** (hiện hiện sau khi cascade xong).
- [ ] **Animation cho lượt kết thúc trận** (hiện `finish()` bỏ animation, bàn nhảy thẳng).
- [ ] **Rate limit WS** (chống spam; hiện chỉ validate nghiệp vụ).
- [ ] **Lưu trận/rank vào DB** thay vì JSON file (D-14) — chỉ cần nếu demo nhiều người.

### P2 — T2/T3 trong spec (chỉ làm nếu còn thời gian)

- [ ] Rainbow gem: bật `CONFIG.ENABLE_RAINBOW`, thêm hiệu ứng cầu vồng (server đã xử lý logic).
- [ ] Auto-shield: nhận >40% maxHP/lượt → sinh giáp.
- [ ] Match result hash on-chain.
- [ ] Hero NFT mint 1 cái.
- [ ] EIP-712 attestation cho rank.
- [ ] Core wallet.
- [ ] Spectator mode.
- [ ] Rune/gacha (T3, chỉ pitch).

---

## 6. CẠM BẪY — ĐỌC TRƯỚC KHI SỬA

1. **Container hit area của Phaser bị lệch nửa chiều cao.**
   Đừng dùng `container.setInteractive(new Rectangle(-w/2,-h/2,w,h))`.
   Luôn dùng `addTouchTarget()` trong `client/src/ui/touch.ts`.
   Đo thực tế trước khi sửa: nút 40px tại y=601 chỉ ăn 565..604 thay vì 581..621.

2. **`pixelArt: true` làm chữ vỡ.** UI toàn vector + text → phải để `pixelArt: false`, `roundPixels: false`.

3. **Không tự suy ra bàn sau swap ở client.** Server gửi `TurnAnimation.swapBoard`; dùng nó trước khi vẽ link. (D-22)

4. **Không vẽ sẵn cả bàn trước khi rơi.** Ô nguồn phải để trống, nếu không 2 quân chồng nhau → "đổi icon".

5. **PowerShell 5.1 ghi BOM vào `package.json`** → Vite đọc PostCSS config bằng `JSON.parse` sẽ chết.
   Nếu phải sửa bằng PS: `[IO.File]::WriteAllText($p,$text,(New-Object Text.UTF8Encoding($false)))`.

6. **Client là package standalone**, không nằm trong npm workspaces. Cài bằng `npm run setup:client` (hoặc `npm --prefix client install`).

7. **`tsx watch` tự restart server khi sửa file** → mọi trận đang chơi bị mất. Khi test E2E đừng sửa server giữa chừng.

8. **Máy này không có desktop hiển thị.** `browser.screenshot` fail. Muốn kiểm tra UI: dùng dev hook:
   ```js
   window.__prism.game.step(performance.now(), 16.7) // RAF bị pause khi tab nền
   ```
   và đọc `window.__prism.matchStore`.

9. **Không có `git` và `node` toàn cục.** Node portable ở đường dẫn §2 (có thể mất sau khi reset máy → cài lại).

10. **`npm run build` ở root build cả client** → cần `setup:client` trước.
11. **Draft kết thúc theo `PICKS_PER_SIDE × 2`**, không theo `ROSTER_SIZE`. Pool 12 P1 → 8 pick + 2 ban; nếu dùng `ROSTER_SIZE` làm điều kiện kết thúc, draft sẽ treo khi roster thay đổi.

---

## 7. NHỮNG GÌ CỐ TÌNH CHƯA LÀM (đừng coi là bug)

- Ban của đối thủ **không bao giờ lộ** (đúng luật 4.2).
- Cascade hiển thị theo `TurnAnimation`; nếu mạng cực chậm, client có thể bỏ qua animation của lượt cũ (chỉ lấy animation mới nhất) — **trạng thái cuối luôn đúng**.
- Claim đang disable vì chưa có luồng post-merkle (§P0).
- Rank/Sybil chỉ ở layer kinh tế, chưa có chống kỹ thuật.
- Oracle/rank vẫn tập trung (server), roadmap EIP-712.
- Draft First Pick random coin-flip, chưa balance.

---

## 8. LỊCH SỬ NGẮN (phiên vừa rồi)

1. Gộp tài liệu → 1 spec (`README.md`) + `competition_info.txt`.
2. `shared/` 78 test: match-3, combat, 8 skill, draft, battle, bot, protocol.
3. `contracts/` 19 test: SeasonVault + MockBenqi/MockUSDC, `demo:season` chứng minh no-loss.
4. `server/` 20 test: WS authoritative, draft live, timeout, bot, forfeit, rank, commitDraft, HTTP /config /season.
5. `client/` Phaser 3: Lobby/Draft/Battle, wallet, season panel, E2E bot match.
6. Sửa 3 bug UI lớn: hit area lệch, text vỡ do pixelArt, thiếu khoá gửi trùng draft.
7. Thêm animation cascade đầy đủ + sửa link sai bằng `swapBoard` + chỉ báo lượt (thông báo fade/xám màu).
8. Đồng bộ timer với animation: server cộng bù deadline + lùi bot, client đóng băng đồng hồ và hiện splash "ĐỐI THỦ ĐANG ĐÁNH". Bỏ bảng hướng dẫn ngọc đầu trận.
9. Nâng cấp toàn diện giao diện sang PC Widescreen 16:9 (1280×720):
   - Chuyển `LobbyScene`, `DraftScene`, `BattleScene` sang layout 3 cột tối ưu cho desktop.
   - Sửa mờ chữ trong Phaser: bật `roundPixels: true`, dùng typography scaling và `setResolution(Math.max(devicePixelRatio, 2))`.
   - Sửa lỗi lệch ô nhập tên người chơi (`#pp-name`) và căn chỉnh top header: bọc DOM input trong wrapper cố định 388×46px, căn giữa $X = 640$, đếm ngược mùa ở trung tâm và trạng thái kết nối gọn gàng góc phải.
   - Toàn bộ 117 tests passing, build client Vite và Hardhat thành công 100%.
10. Sửa lỗi reload trang không tự động kết nối: thêm lại `gameClient.connect()` khi khởi chạy client trong `main.ts` và bổ sung listener `window.addEventListener('online', ...)` tự động phục hồi kết nối.
11. Sửa lỗi tràn chữ và đè chữ trong card tướng Draft (`DraftHeroCard`):
    - Đặt vị trí Y của nội tại nối tiếp ngay sau chiêu thức (`top + 65 + descText.height + 4`), loại bỏ hoàn toàn `Math.max` neo đáy khiến dòng thứ 2 của Debuffer chạm viền dưới.
    - Mở rộng kích thước thẻ lên 304×130px với lề chữ 12px (bề rộng hiển thị 280px), tăng khoảng đệm đáy an toàn lên 18-20px cho mọi archetype.
12. Bỏ thông báo toast chữ màu vàng "Đang chọn <tướng>…" khi người chơi vừa xác nhận chọn xong; giữ nguyên banner thông báo lượt (turn notice) cho cả hai bên.
13. Tăng cường toàn diện hiệu ứng chiến đấu (Juice & Impact):
    - Đạn tiến công & bay stat: đầu đạn comet phát sáng rực rỡ bay theo đường cong uốn lượn, xả đuôi bụi tia lửa lấp lánh và kích nổ bung hạt va chạm + sóng xung kích khi trúng tướng/mana.
    - Rung lắc màn hình (screen shake): tăng mạnh độ rung camera theo combo, đòn đánh và hạ gục tướng.
    - Hiệu ứng chớp sáng (flash): chớp đỏ rực khi tướng trúng đòn/bị hạ gục, chớp vàng trắng khi combo/bom nổ, tia laser nối match ngọc sáng chói 3 lớp.
    - Đòn đánh và số nhảy: thẻ tướng giật lùi (recoil 10px), số nhảy damage/heal bung phóng to scale 1.6 đập xuống với viền tương phản cao.
14. Nâng cấp hiệu ứng pick/ban, bụi tiên match ngọc và chuyển cảnh mượt mà:
    - **Pick/Ban Punch & Pop**: Bổ sung hiệu ứng giật nảy recoil (`Back.easeOut`, scale 1.12) kèm vành hào quang và hạt tia lửa bung tỏa trên thẻ tướng được chọn (`DraftHeroCard.playPickRecoil`), đồng thời ô tướng side slot (`MiniHeroSlot.playPickPop`) nảy mạnh mẽ từ scale 0.62 lên 1.0 với hào quang mở rộng và camera mini-shake.
    - **Chuyển cảnh mượt mà Draft -> Battle**: Loại bỏ hoàn toàn cú ngắt đột ngột; bổ sung `DraftScene.startMatchTransition()` với pháo hoa vàng, camera flash & shake, banner "⚔️ BẮT ĐẦU TRẬN ĐẤU ⚔️", fade out êm ái sang đen và fade in êm ái vào `BattleScene` kèm thông báo "VÒNG 1 · BẮT ĐẦU".
    - **Hiệu ứng Bụi Tiên (Fairy Dust Swarm)**: Thay thế hoàn toàn quả cầu to thô kệch bằng chùm 5 hạt bụi tiên nhỏ (2.2px - 3.8px) lấp lánh kèm lõi trắng cho mỗi ô ngọc ăn điểm; hạt bay tản uốn lượn theo dải đường cong Bezier tự nhiên, rải bụi li ti dọc đường và bung mưa tia lửa nhẹ nhàng khi đáp xuống thẻ tướng/thanh mana.
15. Khử rung lắc màn hình (screen shake) và hoàn thiện bảng Tiết lộ Cấm Chọn (Ban Reveal):
    - **Khử rung màn hình**: Bỏ hoàn toàn camera shake ở combo trong `BattleScene` và khi đạn chạm đích, bỏ camera shake khi pick/ban tướng trong `DraftScene` (giữ nguyên hoạt cảnh nảy ease-in/ease-out punch & pop trên thẻ và slot).
    - **Bảng Tiết lộ Cấm Chọn (Ban Reveal)**: Chuyển cảnh `DraftScene.startMatchTransition()` giờ hiển thị bảng đối chiếu 860×470px trong 2.5s trước khi vào trận:
      - Cột Ally: hiển thị rõ ràng hộp đỏ `⚠️ ĐỐI THỦ ĐÃ CẤM: 🚫 [Tướng]` và danh sách 3 tướng vào trận của bạn.
      - Cột Enemy: hiển thị rõ ràng hộp đỏ `🎯 BẠN ĐÃ CẤM: 🚫 [Tướng]` và danh sách 3 tướng vào trận của đối thủ.
      - Các ô tướng bên cánh (`MiniHeroSlot`) lập tức được cập nhật viền đỏ, tên bị gạch ngang và nhãn `🚫 ĐỐI THỦ ĐÃ CẤM` / `🚫 BẠN ĐÃ CẤM`.
16. Sửa triệt để lỗi đơ màn hình và che khuất nội dung trong Ban Reveal:
    - **Sửa thứ tự hiển thị z-order**: Đưa `bg` vào `modal` đầu tiên thay vì cuối cùng, giúp toàn bộ nội dung chữ (Tên tướng cấm, Đội hình 3 tướng ra trận, tiêu đề) hiển thị rõ ràng trên nền panel mà không bị hình chữ nhật nền che lấp.
    - **Khử lỗi kẹt chuyển cảnh (Scene Transition Hang)**: Thay thế việc chờ event camera `FADE_OUT_COMPLETE` (vốn bị nuốt hoặc đơ khi fade effect đang chạy) bằng tween alpha scrim/modal trực tiếp kết hợp timeout bảo hiểm tự động trong `DraftScene` và safety timer 3.5s trong `main.ts`.
    - **Hỗ trợ click để vào ngay**: Cho phép người chơi nhấp chuột bất kỳ đâu trên màn hình để bỏ qua thời gian chờ 2.2s và vào thẳng trận đấu ngay lập tức.
17. **Balance patch 25/10 — rút ngắn trận, tăng mật độ skill (D-23)**:
    - HP toàn bộ hero ×0,8; ATK ×1,2; heal/shield mỗi gem 1% → 0,6%; damage cap 5 → 6; ATK gem weight 25% → 30%.
    - Mana đầu trận 25; mana/gem 1 → 2; skill cost −20% (giữ nguyên cooldown).
    - **Giữ turn timer 20s** — không đánh đổi thời gian suy nghĩ.
    - Đo 1.000 trận bot (seed 20261025): 62,3 → **24,8 lượt/trận** (~12,4 lượt/người); Sudden Death 84,1% → **0,2%**; skill/trận 6,5 → 5,4 nhưng **mật độ 10,4% → 21,9% số lượt**; skill đầu tiên lượt 17 → **lượt 5,5**.
    - Thời gian battle (90% timer + animation ~3,2s/lượt): 22m03s → **8m45s**; full match + draft: 24m09s → **10m51s**.
    - Script đo: `node --import tsx shared/scripts/turn-stats.ts 1000 draft`.
18. **P0 + P1 roster 12 hero (25/10)**:
    - Thêm 4 hero: **Paladin** (Invincible 1 lần/trận), **Juggernaut** (Thorns + DEF), **Executioner** (true damage), **Sniper** (xuyên shield).
    - `Archetype` mở lên 20 id; `ROSTER` hiện có 12 (8 core + 4 P1); 8 hero P2/P3 để reserve.
    - Draft đổi sang **snake-8**: P1→P2→P2→P1→P1→P2→P2→P1; kết thúc pick theo `PICKS_PER_SIDE × 2`, không dùng `ROSTER_SIZE`.
    - Taunt giờ redirect **single-target skill** (trừ Assassin auto-lowest-HP); thêm `INVINCIBLE`, `THORNS`, `DEF_UP`, true damage, shield-bypass.
    - UI Draft: grid 3×4 cho 12 card + card compact; Lobby handbook cập nhật 12; BattleScene biết `onceUsed` và targeted skill mới.
    - Test: **86 shared + 19 contracts + 20 server = 125 pass**; typecheck + build sạch.
    - Đo 1.000 trận bot pool 12: **28,6 lượt/trận** (~14,3/người), SD 6,4%, skill 21,0% số lượt; battle 90% timer + animation ~10m05s, full match ~12m11s. (P2/P3 + balance sẽ tinh chỉnh tiếp.)
19. **P2 roster 16 hero (25/10)**:
    - Thêm **Cleaver** (AoE), **Pyromancer** (Burn), **Venomancer** (Poison AoE), **Oracle** (heal + cleanse).
    - Status mới: `BURN`, `POISON`, `DOT_DOWN`; DoT tick đầu turn, true damage, shield không hấp thụ, Invincible vẫn tick.
    - Healer **overheal → shield** (cap 20% maxHP); Controller Weaken thêm **−25% DoT**.
    - Oracle cleanse 1 debuff; passive ally <30% HP nhận −15% damage.
    - Draft pool lên **16**; UI grid tự chuyển **4×4**; test **96 shared + 19 contracts + 20 server = 135 pass**.
    - Đo 1.000 trận pool 16: **27,7 lượt/trận** (~13,9/người), SD 6,5%, skill 20,4%; battle 90% timer + animation ~9m47s, full match ~11m53s.
20. **P3 roster đủ 20 hero (25/10)**:
    - Thêm **Necromancer** (Thrall summon), **Chronarch** (CD manipulation), **Spellbreaker** (mana drain + skill tax), **Berserker** (risk/missing-HP scaling).
    - Thrall: 280/54, untargetable, đánh target đã commit sau lượt, chết theo owner; Cleaver AoE clear Thrall.
    - Chronarch passive: skill đầu tiên mỗi trận của mỗi ally −10 mana; Spellbreaker passive: skill địch +5 mana.
    - Pool draft đủ **20**; UI grid tự chuyển **5×4**; test **103 shared + 19 contracts + 20 server = 142 pass**.
    - Đo 1.000 trận pool 20: **26,8 lượt/trận** (~13,4/người), SD 5,5%, skill 20,5%; battle 90% timer + animation ~9m28s, full match ~11m34s.
21. **JevPolicy + fallback (25/10)**:
    - Thêm `BotPolicy` / `TurnPlan` / `GemIntent`; Jev chain **skill → target → intent** qua `typesafe/jev-1.14` + OpenRouter System One.
    - Jev chỉ chọn hướng đi; local bot vẫn brute-force swap theo trọng số intent.
    - `PolicyRunner` timeout toàn chain + fallback heuristic khi lỗi/option lạ/confidence thấp.
    - `MatchRoom` có nhánh async, guard `botThinking` + kiểm tra turn/active sau await để không đánh 2 lần.
    - `BOT_POLICY=heuristic` mặc định — test/demo không phụ thuộc API; bật `BOT_POLICY=jev` + `OPENROUTER_API_KEY`.
    - Test: **106 shared + 19 contracts + 32 server = 157 pass**; typecheck + build sạch; live OpenRouter smoke test OK (~$0,00005/call).
22. **Nghiên cứu model quyết định thay Jev + thử Von local (25/10)**:
    - Refactor `JevPolicy` thành `SystemOnePolicy` dùng chung wire protocol; thêm `VonPolicy` + `BOT_POLICY=von`.
    - Von 1.3: Apache-2.0, 395M, chạy CPU/GPU, `/v1/systemone` drop-in. Đã cài `von-sdk 1.3.7` + OpenVINO, chạy server local thật.
    - **Kết quả thực đo:** full game state 6,5–32,6s/chain 3 call; short-state probe 0,2–1,2s nhưng intent luôn `BALANCED` (confidence 0,02–0,06) và skill sustain chọn ATTACK. `PolicyRunner` fallback heuristic 100% các case thử.
    - Kết luận: Von **free nhưng không đủ tốt** cho state game; giữ `BOT_POLICY=jev` hoặc heuristic. JevBench 1.4: Jev composite 63,3 vs Von 27,5 vs Laya 30,3 — claim "Von kém Jev ~5%" sai.
    - Laya: 32,8ms trên T4 nhưng accuracy decision thấp (BFCL 38,1 / API-Bank 11,5 / CLINC 3,2), English-focused → loại.
    - Clef-flash: 9B, Apache-2.0, SystemOne-compatible, chất lượng cao nhưng cần GPU/H200 hoặc Workers AI (không free local máy này) → chưa implement.
    - CLM-8B: 8B + Qwen3-8B encoder, cần vLLM/GPU, không drop-in đơn giản → chưa implement.
    - Test: **106 shared + 19 contracts + 34 server = 159 pass**; typecheck + build sạch.
23. **Balance patch 2 + giảm thời gian trận (25/10)**:
    - **Chỉ đổi HP/ATK/DEF**, không đổi skill cost/CD: nerf Berserker/Bruiser/Juggernaut/Burst/Tank/Executioner/Paladin/Cleaver/Sniper/Assassin; buff Chronarch/Debuffer/Oracle/Venomancer/Necromancer/Controller/Pyromancer/Buffer/Spellbreaker/Healer.
    - **Start mana 25→30**; mana/gem giữ 2; skill cost/CD giữ nguyên.
    - **Timer**: turn 20→15s, pick 30→20s, ban 20→15s.
    - **Random first turn** (`BATTLE_FIRST=random`) + **bên đi sau +20 mana**: first-turn 58,8% → **51,7%**, second-turn 48,3%; P1/P2 **50,0/50,0%**. Draft first-pick không còn lợi thế rõ.
    - 5.000 trận validation: hero win rate **46,5–53,9%** (trước 31,5–72,6%), P1/P2 **50,0/50,0%**, 27,3 lượt/trận, 6,49 skill/trận.
    - 1.000 trận @15s: full match **9m43s** (median 9m14s, p90 13m22s), SD 3,0%, **6,5 skill/trận**, 23,7% lượt có skill, skill đầu lượt 2,6; battle animation 86,2s/trận; pick/ban animation overlap timer (nếu cộng cứng +4,8s).
    - Kết luận thời gian: **không nên cắt đôi**. 15s + draft 20/15s đã giảm 12m43s → 9m43s. Muốn ~6–7 phút phải làm **Blitz mode** riêng (HP×0.8, ATK×1.15, MAX_TURNS 35), không dùng cho ranked.
    - Test: **106 shared + 19 contracts + 34 server = 159 pass**; typecheck + build sạch.
24. **Combo / counter / "exodia" analysis (25/10)**:
    - `shared/scripts/combo-analysis.ts`: quét **1.140 team 3 tướng** trên common gauntlet 60, suy ra **4.845 combo 4 pick**, pair synergy và **counter matrix** (A vs B cùng 2 support, n=153).
    - `shared/scripts/combo-validation.ts`: validate top team bằng **6 thứ tự slot**, top combo bằng **24 pick order × 4 ban**, đấu 200/100 team random.
    - Top 3-team best order: Healer+Paladin+Sniper **82,0%**, Tank+Juggernaut+Sniper **81,5%**, Buffer+Juggernaut+Sniper **79,5%**, Juggernaut+Sniper+Cleaver **79,0%**, Tank+Controller+Cleaver **74,0%**.
    - Thứ tự slot cực quan trọng: Tank+Juggernaut+Sniper 81,5% best vs **53,4%** avg mọi order.
    - Ban-resistant 4-pick mạnh nhất: **Paladin+Juggernaut+Sniper+Cleaver** (order P→J→C→S), worst subset **66,0%** (P+C+S), avg 71,3%. Tiếp: P+J+Executioner+Sniper 64,0%; Tank+P+Executioner+Sniper 63,0%; Healer+J+Sniper+Cleaver 60,0%.
    - **Không có exodia 80% bất chấp ban**; mạnh nhất ~66% worst subset, vẫn beatable nếu biết ban Juggernaut.
    - Pair synergy: Juggernaut+Sniper +17,4pp; Tank+Burst +13,9; Juggernaut+Executioner +13,4; Paladin+Sniper +13,0; Juggernaut+Cleaver +12,9. Anti: Tank+Healer −16,3; Paladin+Juggernaut −11,4.
    - Counter: Juggernaut > Assassin 76,5%; Healer > Assassin 74,5%; Juggernaut > Debuffer/Sniper 71,9%; Assassin worst vs Tank 20,3%.
    - Output `shared/combo-analysis.json` (ignored). Test vẫn **159 pass**; typecheck sạch.
25. **UI/UX skill cast clarity (25/10)**:
    - `TurnAnimation` thêm `skillTargetUid`; `battle.ts` chỉ gửi `skillCasterUid/skillTargetUid` khi skill thực sự dùng được (skill bị từ chối không phát animation giả).
    - Client: banner `⚡ ĐỊCH/BẠN · <Caster>: <Skill> → <Target>`, beam từ caster tới target, pulse caster, ring target; AoE highlight toàn bộ đội liên quan; self/summon highlight caster.
    - `BattleHeroCard.setAimed()` thêm ring màu riêng cho skill target (khác ring vàng basic attack).
    - Fix runtime cũ: tween pick/ban dùng `this.scene` sau scene shutdown → capture scene + guard.
    - Test mới: skill animation metadata (enemy target / ally target / rejected skill). Tổng **109 shared + 19 contracts + 34 server = 162 pass**; typecheck + build sạch.
    - Đã chạy thử PvBot trong browser: vào Battle scene, bot cast Amputation (AoE) không có runtime error.
