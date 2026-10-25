import Phaser from 'phaser';
import { ROSTER } from '@prism-pact/shared';
import type { ConnectionStatus } from '../net/gameClient';
import { gameClient } from '../net/gameClient';
import { matchStore } from '../state';
import { SERVER_WS_URL } from '../env';
import { Button } from '../ui/button';
import { COLORS, MONO, hex, label, textStyle } from '../ui/theme';
import { divider, drawBackdrop, panel, sectionTitle } from '../ui/panel';
import { prismMark } from '../ui/logo';
import { EMPTY_SEASON, loadSeasonSnapshot, type SeasonSnapshot } from '../net/season';
import {
  approveAndDeposit,
  connectWallet,
  hasWallet,
  readUsdcBalance,
  restoreWallet,
  walletErrorMessage,
  watchWallet,
  type DepositStep,
  type WalletSession,
} from '../chain/wallet';
import { snowtraceAddress, snowtraceTx } from '../chain/abi';
import { formatDuration, formatInt, formatUsdc, parseUsdc, shortAddress } from '../util/format';

const NAME_KEY = 'prism-pact:name';
const DEPOSIT_USDC = '100';

export class LobbyScene extends Phaser.Scene {
  private walletLayer!: Phaser.GameObjects.Container;
  private seasonLayer!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private playStatus!: Phaser.GameObjects.Text;
  private cancelText!: Phaser.GameObjects.Text;
  private queueButton!: Button;
  private botButton!: Button;
  private connPill!: Phaser.GameObjects.Graphics;
  private connDot!: Phaser.GameObjects.Arc;
  private connText!: Phaser.GameObjects.Text;
  private seasonCountdown: Phaser.GameObjects.Text | null = null;

  private nameField: HTMLInputElement | null = null;
  private session: WalletSession | null = null;
  private season: SeasonSnapshot = EMPTY_SEASON;
  private usdcBalance: bigint | null = null;
  private connection: ConnectionStatus = 'connecting';
  private queuePosition = 0;
  private queued = false;
  private botPending = false;
  private walletBusy = false;
  private depositStep: DepositStep | null = null;
  private depositTx: string | null = null;
  private walletNote = '';
  private walletError = '';
  private refreshing = false;
  private seasonLoaded = false;
  private disposed = false;
  private lastCountdown = -1;

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    super('Lobby');
  }

  create(): void {
    this.cameras.main.fadeIn(220, 4, 6, 12);
    drawBackdrop(this);
    this.drawHeader();
    this.drawPanels();

    this.walletLayer = this.add.container(0, 0);
    this.seasonLayer = this.add.container(0, 0);
    this.drawPlayPanel();
    this.drawArchetypeHandbook();
    this.drawLogPanel();
    this.bindClient();

    this.renderConnection(this.connection);
    this.renderWallet();
    this.renderSeason();
    this.renderLog();
    this.updatePlayButtons();

    void this.bootstrap();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(): void {
    if (!this.seasonCountdown) return;
    const remaining = this.season.seasonEnd > 0 ? Math.floor(this.season.seasonEnd - Date.now() / 1000) : 0;
    if (remaining === this.lastCountdown) return;
    this.lastCountdown = remaining;
    if (this.season.seasonEnd === 0) {
      this.seasonCountdown.setText('CHƯA MỞ MÙA');
    } else if (remaining <= 0) {
      this.seasonCountdown.setText('MÙA 1 · ĐÃ KẾT THÚC');
    } else {
      this.seasonCountdown.setText(`MÙA 1 · CÒN ${formatDuration(remaining).toUpperCase()}`);
    }
  }

  // ── Khung màn hình PC ──────────────────────────────────────────────────

  private drawHeader(): void {
    // Top Bar Panel
    panel(this, 24, 16, 1232, 64, { fillAlpha: 0.95 });

    prismMark(this, 54, 48, 42);

    this.add
      .text(90, 28, 'PRISM PACT', textStyle(24, COLORS.text, 'bold'))
      .setOrigin(0, 0)
      .setLetterSpacing(2.5)
      .setResolution(Math.max(window.devicePixelRatio || 1, 2))
      .setShadow(0, 0, '#2dd4bf', 14, true, true);

    this.add
      .text(92, 55, 'MATCH-3 PVP TURN-BASED  ·  FUJI TESTNET', textStyle(11, COLORS.muted, 'bold'))
      .setOrigin(0, 0)
      .setLetterSpacing(1.2)
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));

    this.seasonCountdown = label(this, 640, 48, 'MÙA 1 · ĐANG NẠP…', 12, COLORS.gold, 'bold').setOrigin(0.5, 0.5);

    // Connection Pill
    this.connPill = this.add.graphics();
    this.connDot = this.add.circle(1208, 48, 4.5, COLORS.gold);
    this.connText = this.add
      .text(1218, 48, '', textStyle(12, COLORS.muted, 'bold'))
      .setOrigin(0, 0.5)
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));

    this.tweens.add({
      targets: this.connDot,
      alpha: { from: 1, to: 0.25 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  private drawPanels(): void {
    // Left: DeFi & Season Vault (width 380px)
    panel(this, 24, 92, 380, 608);

    // Center: Sàn Đấu (width 436px)
    panel(this, 422, 92, 436, 608, { glow: COLORS.accent, glowAlpha: 0.08 });

    // Right: Cẩm Nang & Nhật Ký (width 380px)
    panel(this, 876, 92, 380, 608);
  }

  private drawPlayPanel(): void {
    sectionTitle(this, 446, 110, 'SÀN ĐẤU CHÍNH (PLAY ARENA)');
    label(this, 836, 110, 'REALTIME', 11, COLORS.accent, 'bold').setOrigin(1, 0).setLetterSpacing(1.2);

    label(this, 446, 138, 'TÊN NGƯỜI CHƠI TRÊN ĐẤU TRƯỜNG', 12, COLORS.dim, 'bold');

    const input = this.add.dom(640, 185).createFromHTML(
      `<div class="pp-input-wrapper"><input id="pp-name" class="pp-input" type="text" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Nhập tên hiển thị của bạn..." /></div>`,
    );
    if (input.node instanceof HTMLElement) {
      input.node.style.width = '388px';
      input.node.style.height = '46px';
    }
    input.updateSize();
    input.setOrigin(0.5, 0.5);
    const child = input.getChildByID('pp-name');
    if (child instanceof HTMLInputElement) {
      this.nameField = child;
      try {
        child.value = window.localStorage.getItem(NAME_KEY) ?? '';
      } catch {
        child.value = '';
      }
      child.addEventListener('input', () => {
        try {
          window.localStorage.setItem(NAME_KEY, child.value);
        } catch {
          // localStorage có thể bị chặn
        }
      });
      child.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.startQueue();
          child.blur();
        }
      });
    }

    this.queueButton = new Button(this, 640, 244, 388, 48, 'TÌM TRẬN ĐỐI KHÁNG (PVP)', 'primary', () => this.startQueue());
    this.botButton = new Button(this, 640, 302, 388, 48, 'LUYỆN TẬP VỚI BOT', 'secondary', () => this.playBot());
    this.add.existing(this.queueButton);
    this.add.existing(this.botButton);

    this.playStatus = label(this, 446, 338, 'Sẵn sàng vào trận', 12, COLORS.muted, 'bold');

    this.cancelText = label(this, 834, 338, 'Huỷ tìm trận [×]', 12, COLORS.danger, 'bold')
      .setOrigin(1, 0)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.cancelQueue());

    divider(this, 446, 366, 834);

    // 3 Trụ cột cốt lõi
    sectionTitle(this, 446, 382, '3 ĐẶC TRƯNG CỐT LÕI (UNIQUE MECHANICS)');

    const pillars = [
      {
        icon: '⚔️',
        title: 'Draft Đối Kháng Live',
        desc: 'Ban/Pick 2-2 trực tiếp từ pool 8 archetype. Khắc chế đối thủ trước khi vào trận.',
      },
      {
        icon: '🎯',
        title: 'Cam Kết Mục Tiêu',
        desc: 'Chọn tướng địch làm Target TRƯỚC KHI xếp ngọc. Đòn đánh thường dồn round-robin.',
      },
      {
        icon: '💎',
        title: 'No-Loss Prize Pool',
        desc: 'Stake USDC không mất gốc, yield sinh từ Benqi tạo prize. Top 30% chia thưởng.',
      },
    ];

    pillars.forEach((p, idx) => {
      const py = 414 + idx * 86;
      panel(this, 446, py, 388, 76, { fill: COLORS.bgDeep, fillAlpha: 0.8, radius: 10 });
      label(this, 460, py + 12, p.icon, 20);
      label(this, 492, py + 12, p.title, 14, COLORS.text, 'bold');
      this.add
        .text(492, py + 34, p.desc, {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '12px',
          color: '#94a3b8',
          lineSpacing: 2,
          wordWrap: { width: 326 },
        })
        .setResolution(Math.max(window.devicePixelRatio || 1, 2));
    });
  }

  private drawArchetypeHandbook(): void {
    sectionTitle(this, 898, 110, `CẨM NANG ${ROSTER.length} TƯỚNG (ROSTER)`);
    label(this, 1234, 110, `POOL ${ROSTER.length}`, 11, COLORS.muted, 'bold').setOrigin(1, 0);

    const roster = [
      { name: 'Tank', emoji: '🛡️', role: 'Taunt hút đòn, +30% DEF khi thấp máu' },
      { name: 'Burst', emoji: '💥', role: 'Nuke sát thương 3×, dồn one-shot' },
      { name: 'Healer', emoji: '✚', role: 'Mass Heal 40% cả đội, tự hồi 5%/lượt' },
      { name: 'Controller', emoji: '🌀', role: 'Weaken -50% ATK địch, hồi 10 mana' },
      { name: 'Buffer', emoji: '📣', role: 'Rally +30% ATK & giáp cho cả đội' },
      { name: 'Debuffer', emoji: '🧪', role: 'Strip -50% DEF địch, tăng dame team' },
      { name: 'Assassin', emoji: '🗡️', role: 'Execute 2.5× ATK, bỏ qua 50% DEF' },
      { name: 'Bruiser', emoji: '🪓', role: 'Lifesteal Strike 2× ATK, hồi máu' },
    ];

    roster.forEach((h, idx) => {
      const hy = 138 + idx * 32;
      label(this, 898, hy, `${h.emoji} ${h.name}`, 12, COLORS.text, 'bold');
      const rText = label(this, 1018, hy, h.role, 11, COLORS.muted);
      rText.setWordWrapWidth(216);
    });

    label(
      this,
      898,
      390,
      '+4 P1: 🕊️ Paladin · 🦏 Juggernaut · ⚔️ Executioner · 🎯 Sniper',
      9,
      COLORS.dim,
      'bold',
    );
    label(
      this,
      898,
      406,
      '+4 P2: 🪚 Cleaver · 🔥 Pyromancer · 🐍 Venomancer · 🔮 Oracle',
      9,
      COLORS.dim,
      'bold',
    );
    label(
      this,
      898,
      422,
      '+4 P3: 💀 Necromancer · ⏳ Chronarch · 🪄 Spellbreaker · 💢 Berserker',
      9,
      COLORS.dim,
      'bold',
    );

    divider(this, 898, 436, 1234);
  }

  private drawLogPanel(): void {
    sectionTitle(this, 898, 452, 'NHẬT KÝ SỰ KIỆN LIVE');
    label(this, 1234, 452, 'FEED', 11, COLORS.accent, 'bold').setOrigin(1, 0).setLetterSpacing(1.2);

    this.logText = this.add
      .text(898, 480, '', {
        ...textStyle(12, COLORS.muted),
        lineSpacing: 5,
        wordWrap: { width: 336, useAdvancedWrap: true },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));
  }

  // ── Client / store ────────────────────────────────────────────────────

  private bindClient(): void {
    this.unsubs.push(gameClient.onStatus((status) => this.renderConnection(status)));
    this.unsubs.push(
      gameClient.onError((_code, message) => {
        this.pushLog(`Lỗi: ${message}`);
        this.queued = false;
        this.botPending = false;
        this.updatePlayButtons();
      }),
    );
    this.unsubs.push(
      gameClient.onQueued((position) => {
        this.queued = true;
        this.queuePosition = position;
        this.botPending = false;
        this.pushLog(`Đang trong hàng đợi · vị trí #${position}`);
        this.updatePlayButtons();
      }),
    );
    this.unsubs.push(
      matchStore.subscribe(() => {
        this.renderLog();
        this.renderSeason();
      }),
    );
    this.unsubs.push(
      watchWallet(() => {
        void this.resyncWallet();
      }),
    );
  }

  private async bootstrap(): Promise<void> {
    this.renderWallet();
    this.renderSeason();

    try {
      const restored = await restoreWallet();
      if (this.disposed) return;
      if (restored) {
        this.session = restored;
        this.pushLog(`Ví đã kết nối: ${shortAddress(restored.address)}`);
      }
    } catch {
      // Không có phiên cũ
    }

    await this.refreshAll();
    if (this.disposed) return;

    this.time.addEvent({ delay: 30_000, loop: true, callback: () => void this.refreshAll(true) });
  }

  private async refreshAll(silent = false): Promise<void> {
    if (this.refreshing || this.disposed) return;
    this.refreshing = true;
    try {
      const snapshot = await loadSeasonSnapshot(this.session?.address ?? null);
      if (this.disposed) return;
      this.season = snapshot;

      if (this.session && snapshot.usdcAddress) {
        try {
          const balance = await readUsdcBalance(snapshot.usdcAddress, this.session.address);
          if (!this.disposed) this.usdcBalance = balance;
        } catch {
          if (!this.disposed) this.usdcBalance = null;
        }
      } else {
        this.usdcBalance = null;
      }

      if (!silent) this.walletError = '';
    } catch {
      if (!silent && !this.disposed) this.walletError = 'Không đọc được dữ liệu mùa giải.';
    } finally {
      this.refreshing = false;
      this.seasonLoaded = true;
      if (!this.disposed) {
        this.renderWallet();
        this.renderSeason();
      }
    }
  }

  private async resyncWallet(): Promise<void> {
    const restored = await restoreWallet();
    if (this.disposed) return;
    if (!restored) {
      this.session = null;
      this.usdcBalance = null;
      this.walletNote = 'Ví đã ngắt kết nối.';
    } else {
      this.session = restored;
    }
    await this.refreshAll(true);
  }

  // ── Hành động ─────────────────────────────────────────────────────────

  private nameValue(): string {
    const raw = this.nameField?.value.trim() ?? '';
    return raw.length > 0 ? raw.slice(0, 24) : 'Người chơi';
  }

  private startQueue(): void {
    if (this.queued || this.botPending) return;
    if (!gameClient.connected) {
      this.pushLog('Không kết nối được server — bấm "Thử lại" ở banner.');
      return;
    }

    this.queued = true;
    this.queuePosition = 0;
    this.pushLog(`Đang tìm trận cho "${this.nameValue()}"…`);
    this.updatePlayButtons();

    if (!gameClient.queue(this.nameValue())) {
      this.queued = false;
      this.updatePlayButtons();
      return;
    }

    this.time.delayedCall(35_000, () => {
      if (!this.queued || this.disposed) return;
      this.queued = false;
      gameClient.cancelQueue();
      this.pushLog('Chờ quá lâu — đã huỷ hàng đợi.');
      this.updatePlayButtons();
    });
  }

  private playBot(): void {
    if (this.queued || this.botPending) return;
    if (!gameClient.connected) {
      this.pushLog('Không kết nối được server — bấm "Thử lại" ở banner.');
      return;
    }

    this.botPending = true;
    this.pushLog('Đang mở trận luyện tập với bot…');
    this.updatePlayButtons();

    if (!gameClient.playBot(this.nameValue())) {
      this.botPending = false;
      this.updatePlayButtons();
      return;
    }

    this.time.delayedCall(12_000, () => {
      if (!this.botPending || this.disposed) return;
      this.botPending = false;
      this.pushLog('Server chưa phản hồi — thử lại.');
      this.updatePlayButtons();
    });
  }

  private cancelQueue(): void {
    gameClient.cancelQueue();
    this.queued = false;
    this.botPending = false;
    this.pushLog('Đã huỷ hàng đợi.');
    this.updatePlayButtons();
  }

  private async connect(): Promise<void> {
    if (this.walletBusy) return;
    if (!hasWallet()) {
      this.walletError = 'Không tìm thấy MetaMask/Core. Hãy cài ví rồi tải lại trang.';
      this.renderWallet();
      return;
    }

    this.walletBusy = true;
    this.walletError = '';
    this.walletNote = 'Đang mở ví…';
    this.renderWallet();

    try {
      this.session = await connectWallet();
      this.walletNote = `Đã kết nối ${shortAddress(this.session.address)}`;
      this.pushLog(`Ví đã kết nối: ${shortAddress(this.session.address)}`);
      await this.refreshAll();
    } catch (error) {
      this.walletError = walletErrorMessage(error);
    } finally {
      this.walletBusy = false;
      if (!this.disposed) this.renderWallet();
    }
  }

  private async deposit(): Promise<void> {
    if (this.walletBusy) return;
    if (!this.session) {
      await this.connect();
      return;
    }
    const vault = this.season.vaultAddress;
    const token = this.season.usdcAddress;
    if (!vault || !token) {
      this.walletError = 'Server chưa cấu hình SeasonVault/USDC.';
      this.renderWallet();
      return;
    }

    this.walletBusy = true;
    this.walletError = '';
    this.walletNote = '';
    this.depositTx = null;
    this.depositStep = 'approve';
    this.renderWallet();

    try {
      await approveAndDeposit(vault, token, parseUsdc(DEPOSIT_USDC), (step, hash) => {
        this.depositStep = step;
        if (hash) this.depositTx = hash;
        this.walletNote =
          step === 'approve'
            ? 'Đang approve USDC…'
            : step === 'deposit'
              ? 'Đang nạp vào SeasonVault…'
              : 'Đã nạp thành công.';
        if (!this.disposed) this.renderWallet();
      });
      this.walletNote = `Đã nạp ${DEPOSIT_USDC} USDC — vốn không mất.`;
      this.pushLog(`Đã nạp ${DEPOSIT_USDC} USDC vào SeasonVault`);
      await this.refreshAll();
    } catch (error) {
      this.walletError = walletErrorMessage(error);
    } finally {
      this.walletBusy = false;
      if (!this.disposed) this.renderWallet();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  private renderConnection(status: ConnectionStatus): void {
    this.connection = status;
    const color =
      status === 'open'
        ? COLORS.success
        : status === 'connecting' || status === 'reconnecting'
          ? COLORS.gold
          : COLORS.danger;
    const host = (() => {
      try {
        return new URL(SERVER_WS_URL).host;
      } catch {
        return SERVER_WS_URL;
      }
    })();
    const text =
      status === 'open'
        ? `ĐÃ KẾT NỐI · ${host}`
        : status === 'connecting'
          ? 'ĐANG KẾT NỐI…'
          : status === 'reconnecting'
            ? 'MẤT KẾT NỐI · THỬ LẠI'
            : 'CHƯA KẾT NỐI';

    this.connText.setText(text);
    this.connText.setColor(hex(status === 'open' ? COLORS.muted : color));
    this.connDot.setFillStyle(color, 1);

    const width = this.connText.width + 36;
    const rightEdge = 1240;
    const pillX = rightEdge - width;
    this.connPill.clear();
    this.connPill.fillStyle(COLORS.bgDeep, 0.75);
    this.connPill.fillRoundedRect(pillX, 34, width, 28, 14);
    this.connPill.lineStyle(1.5, color, 0.35);
    this.connPill.strokeRoundedRect(pillX, 34, width, 28, 14);

    this.connDot.setPosition(pillX + 14, 48);
    this.connText.setPosition(pillX + 24, 48);

    const pulse = this.tweens.getTweensOf(this.connDot)[0];
    if (pulse) {
      if (status === 'open') {
        pulse.pause();
        this.connDot.setAlpha(1);
      } else {
        pulse.resume();
      }
    }

    this.updatePlayButtons();
  }

  private renderWallet(): void {
    this.walletLayer.removeAll(true);
    this.walletLayer.add(sectionTitle(this, 46, 420, 'VÍ WEB3 · FUJI TESTNET'));

    const chain = label(this, 380, 420, `FUJI (${this.season.chainId})`, 11, COLORS.muted, 'bold').setOrigin(1, 0);

    if (!this.session) {
      this.walletLayer.add(chain);
      const intro = this.add
        .text(
          46,
          446,
          'Kết nối MetaMask để nạp 100 USDC vào prize pool.\nVốn 100% được bảo toàn — giải thưởng tạo ra từ yield Benqi.',
          { ...textStyle(12, COLORS.muted), lineSpacing: 4, wordWrap: { width: 336 } },
        )
        .setResolution(Math.max(window.devicePixelRatio || 1, 2));

      const button = new Button(
        this,
        214,
        530,
        336,
        44,
        this.walletBusy ? 'ĐANG KẾT NỐI VÍ…' : hasWallet() ? 'KẾT NỐI VÍ METAMASK' : 'CHƯA CÓ VÍ WEB3',
        'secondary',
        () => void this.connect(),
      );
      button.setEnabled(!this.walletBusy && hasWallet());

      const foot = label(
        this,
        46,
        576,
        this.walletError || 'Avalanche Fuji Testnet · ChainId 43113',
        11,
        this.walletError ? COLORS.danger : COLORS.dim,
      );
      this.walletLayer.add([intro, button, foot]);
      return;
    }

    const address = label(this, 46, 444, shortAddress(this.session.address), 14, COLORS.text, 'bold');
    address.setFontFamily(MONO);

    const balanceLabel = label(this, 46, 470, 'SỐ DƯ TESTNET USDC', 11, COLORS.dim, 'bold').setLetterSpacing(1);
    const balance = label(
      this,
      46,
      488,
      this.usdcBalance === null ? '—' : `${formatUsdc(this.usdcBalance)} USDC`,
      22,
      COLORS.text,
      'bold',
    );

    const depositLabel =
      this.walletBusy && this.depositStep === 'approve'
        ? 'ĐANG APPROVE USDC…'
        : this.walletBusy && this.depositStep === 'deposit'
          ? 'ĐANG NẠP VÀO VAULT…'
          : this.walletBusy
            ? 'ĐANG XỬ LÝ…'
            : `NẠP ${DEPOSIT_USDC} USDC`;

    const depositButton = new Button(this, 214, 546, 336, 44, depositLabel, 'gold', () => void this.deposit(), 14);
    depositButton.setEnabled(!this.walletBusy && Boolean(this.season.vaultAddress) && Boolean(this.season.usdcAddress));

    let foot: Phaser.GameObjects.Text;
    if (this.walletError) {
      foot = label(this, 46, 584, this.walletError, 11, COLORS.danger);
      foot.setWordWrapWidth(336);
    } else if (this.depositTx) {
      foot = label(this, 46, 584, 'Xem giao dịch trên Snowtrace ↗', 11, COLORS.accent).setInteractive({
        useHandCursor: true,
      });
      foot.on('pointerup', () => window.open(snowtraceTx(this.depositTx!), '_blank', 'noopener,noreferrer'));
    } else {
      foot = label(
        this,
        46,
        584,
        this.walletNote || 'Nạp 100 USDC · bảo toàn vốn 100% · rút sau mùa',
        11,
        COLORS.dim,
      );
    }

    this.walletLayer.add([chain, address, balanceLabel, balance, depositButton, foot]);
  }

  private renderSeason(): void {
    this.seasonLayer.removeAll(true);
    const snapshot = this.season;
    this.seasonLayer.add(sectionTitle(this, 46, 110, 'MÙA GIẢI & GIẢI THƯỞNG'));

    const source = !this.seasonLoaded
      ? 'ĐANG TẢI…'
      : snapshot.source === 'chain'
        ? 'ON-CHAIN'
        : snapshot.configured
          ? 'SERVER'
          : 'CHƯA CẤU HÌNH';

    const sourceText = label(
      this,
      380,
      110,
      source,
      11,
      !this.seasonLoaded ? COLORS.dim : snapshot.configured ? COLORS.accent : COLORS.dim,
      'bold',
    ).setOrigin(1, 0);

    const prizeLabel = label(this, 46, 136, 'TỔNG PRIZE POOL (YIELD + SPONSOR)', 11, COLORS.gold, 'bold');
    const prize = label(
      this,
      46,
      154,
      snapshot.prizePool === null ? '— USDC' : `${formatUsdc(snapshot.prizePool)} USDC`,
      30,
      COLORS.gold,
      'bold',
    );

    const vaultLine = !this.seasonLoaded
      ? 'Đang nạp cấu hình SeasonVault…'
      : snapshot.vaultAddress
        ? `Vault Contract: ${shortAddress(snapshot.vaultAddress)} ↗`
        : 'SeasonVault chưa cấu hình';
    const vault = label(
      this,
      46,
      198,
      vaultLine,
      11,
      !this.seasonLoaded ? COLORS.dim : snapshot.vaultAddress ? COLORS.accent : COLORS.danger,
    );
    if (snapshot.vaultAddress) {
      vault.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        window.open(snowtraceAddress(snapshot.vaultAddress!), '_blank', 'noopener,noreferrer');
      });
    }

    const line = divider(this, 46, 222, 380);
    this.seasonLayer.add([sourceText, prizeLabel, prize, vault, line]);

    const deposited = this.session ? formatUsdc(snapshot.userPrincipal) : '—';
    const depositedLabel = label(this, 46, 238, 'VỐN BẠN ĐÃ NẠP (100% NO-LOSS)', 12, COLORS.muted, 'bold');
    const depositedValue = label(
      this,
      380,
      238,
      deposited === '—' ? '0 USDC' : `${deposited} USDC`,
      13,
      COLORS.text,
      'bold',
    ).setOrigin(1, 0);

    const rank = matchStore.lastRank;
    const rankValue = rank
      ? `${formatInt(rank.points)} điểm (${rank.delta > 0 ? '+' : ''}${rank.delta})`
      : 'Chưa có trận xếp hạng';
    const rankLabel = label(this, 46, 268, 'ĐIỂM XẾP HẠNG GẦN NHẤT', 12, COLORS.muted, 'bold');
    const rankText = label(this, 380, 268, rankValue, 13, rank ? COLORS.text : COLORS.dim, 'bold').setOrigin(1, 0);

    const claim = new Button(this, 214, 320, 336, 40, 'NHẬN GIẢI THƯỞNG (CHƯA MỞ)', 'ghost', () => undefined, 13);
    claim.setEnabled(false);

    const sub = label(this, 46, 354, 'Giải thưởng chia theo tỷ lệ rank points cho Top 30% khi hết mùa.', 11, COLORS.dim);
    sub.setWordWrapWidth(336);

    const line2 = divider(this, 46, 396, 380);
    this.seasonLayer.add([depositedLabel, depositedValue, rankLabel, rankText, claim, sub, line2]);
  }

  private renderLog(): void {
    const lines = matchStore.events.slice(-7);
    this.logText.setText(
      lines.length > 0
        ? lines.map((event) => `› ${event}`).join('\n')
        : '› Chưa có sự kiện trận đấu.\n› Bấm "Tìm trận đối kháng" để ghép PvP 2-2 draft live.\n› Hoặc bấm "Luyện tập với Bot" để thử ngay!',
    );
  }

  private updatePlayButtons(): void {
    const open = this.connection === 'open';
    this.queueButton.setEnabled(open && !this.queued && !this.botPending);
    this.botButton.setEnabled(open && !this.queued && !this.botPending);
    this.queueButton.setLabel(this.queued ? 'ĐANG TÌM TRẬN…' : 'TÌM TRẬN ĐỐI KHÁNG (PVP)');

    if (this.queued) {
      this.playStatus.setText(
        this.queuePosition > 0 ? `Đang chờ đối thủ · Vị trí hàng đợi #${this.queuePosition}` : 'Đang tìm đối thủ…',
      );
      this.playStatus.setColor(hex(COLORS.gold));
    } else if (this.botPending) {
      this.playStatus.setText('Đang mở trận luyện tập với Bot…');
      this.playStatus.setColor(hex(COLORS.gold));
    } else if (!open) {
      this.playStatus.setText('Chưa kết nối server');
      this.playStatus.setColor(hex(COLORS.danger));
    } else {
      this.playStatus.setText('Sẵn sàng vào trận');
      this.playStatus.setColor(hex(COLORS.muted));
    }

    this.cancelText.setVisible(this.queued || this.botPending);
  }

  private pushLog(event: string): void {
    matchStore.pushEvent(event);
  }

  private cleanup(): void {
    this.disposed = true;
    for (const unsubscribe of this.unsubs) unsubscribe();
    this.unsubs.length = 0;
    this.nameField = null;
  }
}
