# PROGRESS — Prism Pact

> File bàn giao cho agent/người tiếp quản. Cập nhật lần cuối: **2026-10-23**.
> Spec là `README.md` — file này chỉ nói **đang ở đâu, còn gì, cạm bẫy gì**.
> Quyết định thiết kế nằm ở `README.md` mục 14 (D-01 → D-22), không lặp lại ở đây.

---

## 1. TRẠNG THÁI MỘT DÒNG

Game **chơi được end-to-end** ở local (draft live → battle → kết quả), có animation cascade. **Chưa deploy Fuji**, nên phần Web3 đang tắt. Thiếu slide/video.

```
shared/     78 test   ✅ xong (luật game)
contracts/  19 test   ✅ xong (đã deploy hardhat local, chưa lên Fuji)
server/     20 test   ✅ xong (WS + HTTP)
client/      build OK  ✅ xong phần chơi; còn polish + Web3 UI
```

Chạy `npm test` → 117 test. `npm run typecheck` + `npm run build` → sạch.

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
  heroes.ts      8 archetype (HP/ATK/DEF/skill/passive)
  skills.ts      8 skill + validate mana/CD
  battle.ts      1 lượt hoàn chỉnh + TurnAnimation
  draft.ts       state machine pick 2-2 + ban ẩn
  bot.ts         chọn swap/skill cho bot
  protocol.ts    ClientMessage/ServerMessage/MatchView/TurnAnimation
server/src/
  server.ts      HTTP (/health,/config,/season) + WS + matchmaking
  rooms/MatchRoom.ts  draft → ban → battle → result, timer, bot, forfeit, commitDraft
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
| Draft 2-2, ban ẩn tới khi cả 2 xong | `room.test.ts` + chạy tay |
| Animation cascade | 6/8 lượt có ≥2 wave, max 7 wave, 36 viên rơi |
| Link đúng quân | hook `drawLinks`: **0 ô sai / 13 wave** (trước khi sửa: 4/18) |
| Bàn sau animation khớp server | 64/64 ô đúng ở 4 lượt liên tiếp |
| Không lỗi console | 0 error trong các phiên E2E |
| No-loss | `npm run demo:season` → bob/carol về đúng 1000, alice +prize |

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
