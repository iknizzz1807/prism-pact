import Phaser from 'phaser';
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
      this.seasonCountdown.setText('ĐÃ KẾT THÚC');
    } else {
      this.seasonCountdown.setText(`CÒN ${formatDuration(remaining).toUpperCase()}`);
    }
  }

  // ── Khung màn hình ────────────────────────────────────────────────────

  private drawHeader(): void {
    prismMark(this, 195, 40, 38);

    this.add
      .text(195, 62, 'PRISM PACT', textStyle(28, COLORS.text, 'bold'))
      .setOrigin(0.5, 0)
      .setLetterSpacing(4)
      .setResolution(3)
      .setShadow(0, 0, '#5eead4', 14, true, true);

    this.add
      .text(195, 97, 'MATCH-3 PVP · DRAFT TRỰC TIẾP · AVALANCHE', textStyle(8, COLORS.muted, 'bold'))
      .setOrigin(0.5, 0)
      .setLetterSpacing(1.1)
      .setResolution(3);

    this.connPill = this.add.graphics();
    this.connDot = this.add.circle(0, 126, 3.5, COLORS.gold);
    this.connText = this.add
      .text(0, 126, '', textStyle(9, COLORS.muted, 'bold'))
      .setOrigin(0, 0.5)
      .setResolution(3)
      .setLetterSpacing(0.6);

    this.tweens.add({
      targets: this.connDot,
      alpha: { from: 1, to: 0.25 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      paused: true,
      onUpdate: () => undefined,
    });
  }

  private drawPanels(): void {
    panel(this, 14, 154, 362, 152);
    panel(this, 14, 318, 362, 178, { glow: COLORS.gold, glowAlpha: 0.08 });
    panel(this, 14, 506, 362, 150);
    panel(this, 14, 666, 362, 166);
  }

  private drawPlayPanel(): void {
    sectionTitle(this, 30, 519, 'Sàn đấu');

    const input = this.add.dom(195, 555).createFromHTML(
      `<input id="pp-name" class="pp-input" type="text" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Tên hiển thị của bạn" />`,
    );
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
          // localStorage có thể bị chặn — không ảnh hưởng chơi.
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

    this.queueButton = new Button(this, 104, 601, 176, 40, 'TÌM TRẬN', 'primary', () => this.startQueue());
    this.botButton = new Button(this, 286, 601, 172, 40, 'CHƠI VỚI BOT', 'secondary', () => this.playBot());
    this.add.existing(this.queueButton);
    this.add.existing(this.botButton);

    this.playStatus = label(this, 30, 629, 'Sẵn sàng vào trận', 9, COLORS.muted);

    this.cancelText = label(this, 360, 628, 'Huỷ hàng đợi', 10, COLORS.danger, 'bold')
      .setOrigin(1, 0)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.cancelQueue());
  }

  private drawLogPanel(): void {
    sectionTitle(this, 30, 680, 'Nhật ký sự kiện');
    label(this, 360, 680, 'LIVE', 8, COLORS.accent, 'bold').setOrigin(1, 0).setLetterSpacing(1.2);

    this.logText = this.add
      .text(30, 701, '', {
        ...textStyle(10, COLORS.muted),
        lineSpacing: 4,
        wordWrap: { width: 330, useAdvancedWrap: true },
      })
      .setResolution(3);
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
      // Không có phiên cũ — người chơi sẽ bấm Kết nối ví.
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
          step === 'approve' ? 'Đang approve USDC…' : step === 'deposit' ? 'Đang nạp vào SeasonVault…' : 'Đã nạp thành công.';
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
      status === 'open' ? COLORS.success : status === 'connecting' || status === 'reconnecting' ? COLORS.gold : COLORS.danger;
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
            ? 'MẤT KẾT NỐI · ĐANG THỬ LẠI'
            : 'CHƯA KẾT NỐI SERVER';

    this.connText.setText(text);
    this.connText.setColor(hex(status === 'open' ? COLORS.muted : color));
    this.connDot.setFillStyle(color, 1);

    const width = this.connText.width + 26;
    this.connPill.clear();
    this.connPill.fillStyle(COLORS.bgDeep, 0.55);
    this.connPill.fillRoundedRect(195 - width / 2, 114, width, 24, 12);
    this.connPill.lineStyle(1, color, 0.22);
    this.connPill.strokeRoundedRect(195 - width / 2, 114, width, 24, 12);

    this.connDot.setPosition(195 - width / 2 + 12, 126);
    this.connText.setPosition(195 - width / 2 + 20, 126);

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
    this.walletLayer.add(sectionTitle(this, 30, 168, 'Ví Web3'));

    const chain = label(this, 360, 167, `FUJI · ${this.season.chainId}`, 8, COLORS.muted, 'bold').setOrigin(1, 0);

    if (!this.session) {
      this.walletLayer.add(chain);
      const intro = this.add
        .text(
          30,
          194,
          'Kết nối MetaMask để nạp USDC vào prize pool. Vốn không mất — chỉ phần lãi sinh ra được dùng làm giải thưởng.',
          { ...textStyle(9, COLORS.muted), lineSpacing: 2, wordWrap: { width: 326 } },
        )
        .setResolution(3);
      const button = new Button(
        this,
        195,
        255,
        330,
        38,
        this.walletBusy ? 'ĐANG KẾT NỐI VÍ…' : hasWallet() ? 'KẾT NỐI VÍ' : 'CHƯA CÓ VÍ WEB3',
        'secondary',
        () => void this.connect(),
      );
      button.setEnabled(!this.walletBusy && hasWallet());
      const foot = label(
        this,
        30,
        284,
        this.walletError || 'Fuji Testnet · chainId 43113 · MetaMask / Core',
        9,
        this.walletError ? COLORS.danger : COLORS.dim,
      );
      this.walletLayer.add([intro, button, foot]);
      return;
    }

    const address = label(this, 30, 186, shortAddress(this.session.address), 13, COLORS.text, 'bold');
    address.setFontFamily(MONO);

    const balanceLabel = label(this, 30, 203, 'SỐ DƯ USDC', 8, COLORS.dim, 'bold').setLetterSpacing(1);
    const balance = label(
      this,
      30,
      211,
      this.usdcBalance === null ? '—' : `${formatUsdc(this.usdcBalance)} USDC`,
      19,
      COLORS.text,
      'bold',
    );

    const depositLabel =
      this.walletBusy && this.depositStep === 'approve'
        ? 'ĐANG APPROVE…'
        : this.walletBusy && this.depositStep === 'deposit'
          ? 'ĐANG NẠP…'
          : this.walletBusy
            ? 'ĐANG XỬ LÝ…'
            : `NẠP ${DEPOSIT_USDC} USDC`;
    const depositButton = new Button(this, 195, 257, 330, 34, depositLabel, 'gold', () => void this.deposit(), 12);
    depositButton.setEnabled(!this.walletBusy && Boolean(this.season.vaultAddress) && Boolean(this.season.usdcAddress));

    let foot: Phaser.GameObjects.Text;
    if (this.walletError) {
      foot = label(this, 30, 285, this.walletError, 9, COLORS.danger);
      foot.setWordWrapWidth(326);
    } else if (this.depositTx) {
      foot = label(this, 30, 285, 'Xem giao dịch trên Snowtrace ↗', 9, COLORS.accent).setInteractive({ useHandCursor: true });
      foot.on('pointerup', () => window.open(snowtraceTx(this.depositTx!), '_blank', 'noopener,noreferrer'));
    } else {
      foot = label(
        this,
        30,
        285,
        this.walletNote || 'Nạp 100 USDC · không mất gốc · rút lại sau mùa',
        9,
        COLORS.dim,
      );
    }

    this.walletLayer.add([chain, address, balanceLabel, balance, depositButton, foot]);
  }

  private renderSeason(): void {
    this.seasonLayer.removeAll(true);
    const snapshot = this.season;
    this.seasonLayer.add(sectionTitle(this, 30, 332, 'Mùa giải · Prize pool'));

    const source = !this.seasonLoaded
      ? 'ĐANG TẢI…'
      : snapshot.source === 'chain'
        ? 'ON-CHAIN'
        : snapshot.configured
          ? 'SERVER'
          : 'CHƯA CẤU HÌNH';
    const sourceText = label(
      this,
      360,
      331,
      source,
      8,
      !this.seasonLoaded ? COLORS.dim : snapshot.configured ? COLORS.accent : COLORS.dim,
      'bold',
    ).setOrigin(1, 0);

    const prize = label(
      this,
      30,
      350,
      snapshot.prizePool === null ? '— USDC' : `${formatUsdc(snapshot.prizePool)} USDC`,
      24,
      COLORS.gold,
      'bold',
    );

    this.seasonCountdown = label(this, 360, 358, '', 8, COLORS.muted, 'bold').setOrigin(1, 0);
    this.lastCountdown = -1;
    this.update();

    const vaultLine = !this.seasonLoaded
      ? 'Đang đọc cấu hình vault…'
      : snapshot.vaultAddress
        ? `VAULT ${shortAddress(snapshot.vaultAddress)} ↗`
        : 'VAULT chưa cấu hình — chờ server';
    const vault = label(
      this,
      30,
      382,
      vaultLine,
      8,
      !this.seasonLoaded ? COLORS.dim : snapshot.vaultAddress ? COLORS.dim : COLORS.danger,
    );
    if (snapshot.vaultAddress) {
      vault.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        window.open(snowtraceAddress(snapshot.vaultAddress!), '_blank', 'noopener,noreferrer');
      });
    }

    const line = divider(this, 30, 396, 360);
    this.seasonLayer.add([sourceText, prize, this.seasonCountdown, vault, line]);

    const deposited = this.session ? formatUsdc(snapshot.userPrincipal) : '—';
    const depositedLabel = label(this, 30, 406, 'BẠN ĐÃ NẠP', 9, COLORS.muted);
    const depositedValue = label(
      this,
      360,
      406,
      deposited === '—' ? '—' : `${deposited} USDC`,
      10,
      COLORS.text,
      'bold',
    ).setOrigin(1, 0);

    const rank = matchStore.lastRank;
    const rankValue = rank
      ? `${formatInt(rank.points)} điểm (${rank.delta > 0 ? '+' : ''}${rank.delta})`
      : 'Chưa có trận xếp hạng';
    const rankLabel = label(this, 30, 424, 'ĐIỂM RANK GẦN NHẤT', 9, COLORS.muted);
    const rankText = label(this, 360, 424, rankValue, 10, rank ? COLORS.text : COLORS.dim, 'bold').setOrigin(1, 0);

    const claim = new Button(this, 195, 456, 330, 32, 'NHẬN THƯỞNG · CHƯA MỞ', 'ghost', () => undefined, 11);
    claim.setEnabled(false);
    this.seasonLayer.add([depositedLabel, depositedValue, rankLabel, rankText, claim]);
  }

  private renderLog(): void {
    const lines = matchStore.events.slice(-7);
    this.logText.setText(
      lines.length > 0
        ? lines.map((event) => `› ${event}`).join('\n')
        : '› Chưa có sự kiện.\n› Bấm "Tìm trận" để vào draft live 2-2.\n› Hoặc "Chơi với Bot" để đánh thử ngay.',
    );
  }

  private updatePlayButtons(): void {
    const open = this.connection === 'open';
    this.queueButton.setEnabled(open && !this.queued && !this.botPending);
    this.botButton.setEnabled(open && !this.queued && !this.botPending);
    this.queueButton.setLabel(this.queued ? 'ĐANG TÌM TRẬN…' : 'TÌM TRẬN');

    if (this.queued) {
      this.playStatus.setText(
        this.queuePosition > 0 ? `Đang chờ đối thủ · vị trí #${this.queuePosition}` : 'Đang chờ đối thủ…',
      );
      this.playStatus.setColor(hex(COLORS.gold));
    } else if (this.botPending) {
      this.playStatus.setText('Đang mở trận luyện tập…');
      this.playStatus.setColor(hex(COLORS.gold));
    } else if (!open) {
      this.playStatus.setText('Không kết nối được server');
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
