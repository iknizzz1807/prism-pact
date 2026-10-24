import Phaser from 'phaser';
import { CONFIG, heroDef, otherSide } from '@prism-pact/shared';
import type { Archetype, DraftView, MatchView, Side } from '@prism-pact/shared';
import { gameClient } from '../net/gameClient';
import { matchStore } from '../state';
import { Button } from '../ui/button';
import { COLORS, hex, label, textStyle } from '../ui/theme';
import { divider, drawBackdrop, panel, paintPanel, sectionTitle } from '../ui/panel';
import { Countdown } from '../ui/timer';
import { ARCHETYPE_COLOR, ARCHETYPE_EMOJI, DraftHeroCard, MiniHeroSlot, type DraftCardState } from '../ui/heroCard';
import { countersFor, suggestAgainst } from '../ui/counter';
import { showTurnNotice } from '../ui/turnNotice';

type DetailMode = 'pick' | 'ban' | 'info';

export class DraftScene extends Phaser.Scene {
  private roundText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private timer!: Countdown;
  private poolLabel!: Phaser.GameObjects.Text;
  private ownBanText!: Phaser.GameObjects.Text;
  private enemyTitle!: Phaser.GameObjects.Text;
  private ownTitle!: Phaser.GameObjects.Text;
  private enemyChips!: Phaser.GameObjects.Container;
  private yourChips!: Phaser.GameObjects.Container;
  private rosterLayer!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private exitButton!: Button;

  private view: MatchView | null = null;
  private modal: Phaser.GameObjects.Container | null = null;
  private toast: Phaser.GameObjects.Text | null = null;
  private exitArmed = false;
  private disposed = false;
  /** Đang chờ server xác nhận pick/ban — chặn gửi trùng. */
  private pending: 'pick' | 'ban' | null = null;
  private entered = false;
  private lastTurnKey = '';
  private prevPicks: { you: Archetype[]; enemy: Archetype[] } = { you: [], enemy: [] };

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    super('Draft');
  }

  create(): void {
    this.cameras.main.fadeIn(220, 4, 6, 12);
    drawBackdrop(this);
    this.drawHeader();
    this.drawPanels();

    this.enemyChips = this.add.container(0, 0);
    this.yourChips = this.add.container(0, 0);
    this.rosterLayer = this.add.container(0, 0);

    this.unsubs.push(
      matchStore.subscribe(() => {
        const view = matchStore.view;
        if (!view || !view.draft) return;
        this.render(view);
      }),
    );
    this.unsubs.push(
      gameClient.onError((_code, message) => {
        this.showToast(message, COLORS.danger);
      }),
    );

    if (matchStore.view?.draft) this.render(matchStore.view);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disposed = true;
      for (const unsubscribe of this.unsubs) unsubscribe();
      this.unsubs.length = 0;
    });
  }

  override update(): void {
    this.timer.update();
  }

  // ── Khung tĩnh PC ─────────────────────────────────────────────────────

  private drawHeader(): void {
    // Top Bar Panel
    panel(this, 24, 16, 1232, 64, { fillAlpha: 0.95 });

    this.roundText = label(this, 46, 26, 'VÒNG 1/2', 20, COLORS.text, 'bold').setLetterSpacing(1);
    this.statusText = label(this, 46, 52, 'ĐANG TẢI DRAFT…', 12, COLORS.accent, 'bold').setLetterSpacing(0.6);

    // Center Timer
    this.timer = new Countdown(this, 640, 48, 24);
    this.add.existing(this.timer);

    this.exitButton = new Button(this, 1190, 48, 96, 36, 'THOÁT', 'ghost', () => this.requestExit(), 12);
    this.add.existing(this.exitButton);
  }

  private drawPanels(): void {
    // Left: Đội bạn (width 288px)
    panel(this, 24, 92, 288, 608);
    this.ownTitle = sectionTitle(this, 44, 108, 'ĐỘI BẠN (ALLY)', COLORS.accent);
    this.ownBanText = label(this, 292, 108, '', 11, COLORS.muted, 'bold').setOrigin(1, 0);

    // Center: Roster 8 tướng (width 632px)
    panel(this, 324, 92, 632, 608, { fill: COLORS.panelAlt, fillAlpha: 0.65 });
    this.poolLabel = sectionTitle(this, 344, 108, 'DANH SÁCH 8 TƯỚNG (ROSTER)');
    label(this, 936, 108, 'NHẤP ĐỂ CHỌN / XEM CHI TIẾT', 11, COLORS.dim, 'bold').setOrigin(1, 0);

    // Right: Đội địch & Nhật ký (width 288px)
    panel(this, 968, 92, 288, 608);
    this.enemyTitle = sectionTitle(this, 988, 108, 'ĐỘI ĐỊCH (ENEMY) · LIVE', COLORS.enemy);

    // Sub-panel info & log
    panel(this, 40, 486, 256, 196, { fill: COLORS.bgDeep, fillAlpha: 0.75, radius: 10 });
    sectionTitle(this, 54, 500, 'CHIẾN THUẬT & KHẮC CHẾ');
    this.infoText = this.add
      .text(54, 526, '', {
        ...textStyle(12, COLORS.muted),
        lineSpacing: 4,
        wordWrap: { width: 228 },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));

    panel(this, 984, 486, 256, 196, { fill: COLORS.bgDeep, fillAlpha: 0.75, radius: 10 });
    sectionTitle(this, 998, 500, 'NHẬT KÝ DRAFT');
    this.logText = this.add
      .text(998, 526, '', {
        ...textStyle(12, COLORS.muted),
        lineSpacing: 4,
        wordWrap: { width: 228 },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));
  }

  // ── Render từ MatchView ───────────────────────────────────────────────

  private render(view: MatchView): void {
    const draft = view.draft;
    if (!draft) return;
    this.view = view;
    this.pending = null;
    this.closeModal();

    const you = view.you;
    const opponent = otherSide(you);

    this.roundText.setText(draft.phase === 'ban' ? 'GIAI ĐOẠN BAN ẨN' : `VÒNG ${draft.round}/2`);
    this.poolLabel.setText(
      draft.phase === 'ban' ? 'CHỌN 1 TƯỚNG CỦA ĐỐI THỦ ĐỂ BAN' : `ROSTER TƯỚNG (CÒN ${draft.pool.length} TƯỚNG TRONG POOL)`,
    );

    const yourTurn = draft.phase === 'pick' && draft.turn === you;
    this.statusText.setText(this.statusLine(view, draft));
    this.statusText.setColor(
      hex(draft.phase === 'ban' ? COLORS.gold : yourTurn ? COLORS.accent : COLORS.muted),
    );

    const total = draft.phase === 'ban' ? CONFIG.DRAFT_BAN_TIME_MS : CONFIG.DRAFT_PICK_TIME_MS;
    this.timer.setDeadline(view.deadline, total);

    this.enemyTitle.setText(`ĐỘI ĐỊCH · ${draft.picks[opponent].length}/4`);
    this.ownTitle.setText(`ĐỘI BẠN · ${draft.picks[you].length}/4`);

    const oldYouPicks = [...this.prevPicks.you];
    const oldEnemyPicks = [...this.prevPicks.enemy];
    const currentYouPicks = [...draft.picks[you]];
    const currentEnemyPicks = [...draft.picks[opponent]];

    const newYouPicks = currentYouPicks.filter((p) => !oldYouPicks.includes(p));
    const newEnemyPicks = currentEnemyPicks.filter((p) => !oldEnemyPicks.includes(p));

    this.prevPicks = { you: currentYouPicks, enemy: currentEnemyPicks };

    // Rung nhẹ camera khi có lượt pick mới
    if (newYouPicks.length > 0 || newEnemyPicks.length > 0) {
      this.cameras.main.shake(140, 0.005);
    }

    this.renderPickSlots(this.yourChips, draft.picks[you], 4, COLORS.accent, 168, newYouPicks);
    this.renderPickSlots(this.enemyChips, draft.picks[opponent], 4, COLORS.enemy, 1112, newEnemyPicks);

    this.ownBanText.setText(
      draft.yourBan ? `Đã ban: ${draft.yourBan}` : draft.phase === 'ban' ? 'Chưa chọn ban' : '',
    );
    this.ownBanText.setColor(hex(draft.yourBan ? COLORS.danger : COLORS.dim));

    if (draft.phase === 'ban') this.renderBanCards(draft, opponent);
    else this.renderRoster(draft, you, opponent, newYouPicks, newEnemyPicks);

    this.renderLog();
    this.renderInfo(draft, you, opponent);

    // Lượt của ai: thông báo turn notice
    const turnKey = `${draft.phase}:${draft.turn}:${draft.yourBan ?? ''}`;
    if (turnKey !== this.lastTurnKey) {
      this.lastTurnKey = turnKey;
      if (draft.phase === 'pick') {
        showTurnNotice(
          this,
          360,
          yourTurn ? 'LƯỢT CỦA BẠN — CHỌN 2 TƯỚNG' : 'LƯỢT ĐỐI THỦ ĐANG CHỌN…',
          yourTurn ? COLORS.accent : COLORS.enemy,
        );
      } else if (draft.phase === 'ban' && draft.yourBan === null) {
        showTurnNotice(this, 360, 'GIAI ĐOẠN BAN ẨN — CHỌN 1 TƯỚNG CỦA ĐỐI THỦ', COLORS.gold);
      }
    }

    const interactiveTurn = draft.phase === 'ban' || yourTurn;
    this.rosterLayer.setAlpha(interactiveTurn ? 1 : 0.55);
    this.statusText.setAlpha(interactiveTurn ? 1 : 0.85);
  }

  private statusLine(view: MatchView, draft: DraftView): string {
    if (draft.phase === 'ban') {
      return draft.yourBan ? '✓ ĐÃ GHI NHẬN BAN — ĐANG CHỜ ĐỐI THỦ CHỐT' : 'CHỌN 1 TƯỚNG CỦA ĐỐI THỦ ĐỂ BAN (ẨN)';
    }
    if (draft.phase === 'pick') {
      return draft.turn === view.you
        ? `LƯỢT CỦA BẠN · HÃY CHỌN ${draft.picksLeftThisTurn} TƯỚNG`
        : 'ĐANG CHỜ ĐỐI THỦ CHỌN TƯỚNG…';
    }
    return 'ĐÃ CHỐT ĐỘI HÌNH — CHUẨN BỊ VÀO TRẬN';
  }

  private renderPickSlots(
    layer: Phaser.GameObjects.Container,
    picks: readonly Archetype[],
    slots: number,
    accent: number,
    centerX: number,
    newPicks: readonly Archetype[] = [],
  ): void {
    layer.removeAll(true);
    for (let i = 0; i < slots; i += 1) {
      const y = 168 + i * 74;
      const archetype = picks[i] ?? null;
      const chip = new MiniHeroSlot(this, centerX, y, 256, 62, archetype, accent);
      layer.add(chip);

      // Nếu slot này vừa nhận tướng mới -> hiệu ứng nảy pop-in ease-in ease-out mạnh mẽ
      if (archetype && newPicks.includes(archetype)) {
        chip.playPickPop(accent);
      }
    }
  }

  private renderRoster(
    draft: DraftView,
    you: Side,
    opponent: Side,
    newYouPicks: readonly Archetype[] = [],
    newEnemyPicks: readonly Archetype[] = [],
  ): void {
    this.rosterLayer.removeAll(true);
    const yourTurn = draft.phase === 'pick' && draft.turn === you && draft.picksLeftThisTurn > 0;

    const roster: readonly Archetype[] = [
      'Tank',
      'Burst',
      'Healer',
      'Controller',
      'Buffer',
      'Debuffer',
      'Assassin',
      'Bruiser',
    ];

    for (let index = 0; index < roster.length; index += 1) {
      const archetype = roster[index];
      const def = heroDef(archetype);
      const col = index % 2;
      const row = Math.floor(index / 2);

      const cardX = 480 + col * 320;
      const cardY = 194 + row * 138;

      const card = new DraftHeroCard(this, cardX, cardY, def, {
        width: 304,
        height: 130,
        onClick: (picked) => this.openDetail(picked),
      });

      let state: DraftCardState = 'available';
      let note = '';
      if (draft.picks[you].includes(archetype)) {
        state = 'mine';
        note = 'BẠN ĐÃ CHỌN';
      } else if (draft.picks[opponent].includes(archetype)) {
        state = 'enemy';
        note = 'ĐỊCH ĐÃ CHỌN';
      } else if (!draft.pool.includes(archetype)) {
        state = 'banned';
        note = 'HẾT LƯỢT';
      }

      card.setCardState(state, note);
      card.setHighlight(state === 'available' && yourTurn);
      this.rosterLayer.add(card);

      // Kích hoạt hiệu ứng giật nảy punch & recoil khi tướng được pick bởi người chơi hoặc đối thủ
      if (newYouPicks.includes(archetype)) {
        card.playPickRecoil(false);
      } else if (newEnemyPicks.includes(archetype)) {
        card.playPickRecoil(true);
      }

      if (!this.entered) {
        card.setAlpha(0);
        this.tweens.add({
          targets: card,
          alpha: 1,
          duration: 180,
          delay: 20 + index * 24,
          ease: 'Quad.easeOut',
        });
      }
    }
    this.entered = true;
  }

  private renderBanCards(draft: DraftView, opponent: Side): void {
    this.rosterLayer.removeAll(true);
    const targets = draft.picks[opponent];

    for (let index = 0; index < targets.length; index += 1) {
      const archetype = targets[index];
      const def = heroDef(archetype);
      const col = index % 2;
      const row = Math.floor(index / 2);

      const cardX = 480 + col * 320;
      const cardY = 230 + row * 180;

      const card = new DraftHeroCard(this, cardX, cardY, def, {
        width: 302,
        height: 160,
        onClick: (picked) => this.openDetail(picked),
      });

      const chosen = draft.yourBan === archetype;
      const submitted = draft.yourBan !== null;
      card.setCardState(
        chosen ? 'banned' : submitted ? 'enemy' : 'available',
        chosen ? 'BẠN ĐÃ BAN' : submitted ? 'CHỜ ĐỐI THỦ' : 'CÓ THỂ BAN',
      );
      card.setHighlight(!submitted);
      this.rosterLayer.add(card);
    }

    if (targets.length === 0) {
      const waiting = label(this, 640, 360, 'Đang chờ đối thủ chốt tướng…', 15, COLORS.dim, 'bold').setOrigin(0.5);
      this.rosterLayer.add(waiting);
    }
  }

  private renderLog(): void {
    const lines = matchStore.events.slice(-6);
    this.logText.setText(
      lines.length > 0 ? lines.map((event) => `› ${event}`).join('\n') : '› Chưa có sự kiện draft.',
    );
  }

  private renderInfo(draft: DraftView, you: Side, opponent: Side): void {
    const enemies = draft.picks[opponent];
    const suggestions = suggestAgainst(enemies, draft.pool).slice(0, 3);

    let text: string;
    if (draft.phase === 'ban') {
      text = draft.yourBan
        ? 'Ban của bạn đã được ghi nhận. Lựa chọn của đối thủ chỉ lộ sau khi cả hai hoàn tất.'
        : 'Ban 1 tướng đối thủ để phá combo của họ. Đối thủ không thấy bạn ban ai cho tới khi hết giờ.';
    } else if (draft.turn === you) {
      text = 'Chọn 2 tướng mỗi lượt. Tướng đã pick bị loại khỏi pool chung — hãy chú ý counter matrix.';
    } else {
      text = 'Đang chờ đối thủ. Quan sát tướng họ pick để chuẩn bị counter-pick ở lượt tiếp theo.';
    }

    if (suggestions.length > 0 && draft.phase === 'pick') {
      text += `\n\nGợi ý khắc chế:\n★ ${suggestions.join(' · ')}`;
    }

    this.infoText.setText(text);
    this.infoText.setColor(hex(draft.turn === you || draft.phase === 'ban' ? COLORS.muted : COLORS.dim));
  }

  // ── Modal chi tiết / chọn tướng PC ────────────────────────────────────

  private openDetail(archetype: Archetype): void {
    const view = this.view;
    if (!view || !view.draft) return;
    this.closeModal();

    const draft = view.draft;
    const you = view.you;
    const opponent = otherSide(you);
    const def = heroDef(archetype);

    const canPick =
      draft.phase === 'pick' &&
      draft.turn === you &&
      draft.picksLeftThisTurn > 0 &&
      draft.pool.includes(archetype) &&
      !draft.picks[you].includes(archetype);
    const canBan = draft.phase === 'ban' && draft.yourBan === null && draft.picks[opponent].includes(archetype);

    const mode: DetailMode = canBan ? 'ban' : canPick ? 'pick' : 'info';
    const accent = ARCHETYPE_COLOR[archetype];
    const emoji = ARCHETYPE_EMOJI[archetype];

    const modal = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x03050a, 0.85).setInteractive();
    dim.on('pointerup', () => this.closeModal());

    const modalW = 560;
    const modalH = 580;
    const modalX = 640 - modalW / 2;
    const modalY = 360 - modalH / 2;

    const backdrop = this.add.graphics();
    paintPanel(backdrop, modalX, modalY, modalW, modalH, {
      fill: COLORS.panel,
      fillAlpha: 0.99,
      border: accent,
      borderAlpha: 0.65,
      glow: accent,
      glowAlpha: 0.22,
      radius: 18,
    });

    const blocker = this.add.rectangle(640, 360, modalW, modalH, COLORS.black, 0.001).setInteractive();
    const strip = this.add.graphics();
    strip.fillStyle(accent, 1);
    strip.fillRoundedRect(modalX, modalY, modalW, 5, { tl: 18, tr: 18, bl: 0, br: 0 });

    const title = label(
      this,
      modalX + 28,
      modalY + 24,
      `${emoji} ${archetype.toUpperCase()}`,
      26,
      COLORS.text,
      'bold',
    ).setLetterSpacing(1.2);

    const role = label(this, modalX + 28, modalY + 60, '3V3 DRAFT ARENA ARCHETYPE', 12, COLORS.dim, 'bold').setLetterSpacing(
      1.2,
    );

    const close = label(this, modalX + modalW - 28, modalY + 24, '✕', 22, COLORS.muted, 'bold')
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.closeModal());

    modal.add([dim, backdrop, blocker, strip, title, role, close]);

    // 3 ô chỉ số lớn
    const stats: Array<[string, number, number]> = [
      ['MÁU (HP)', def.hp, COLORS.hp],
      ['CÔNG (ATK)', def.atk, COLORS.atk],
      ['THỦ (DEF)', def.def, COLORS.shield],
    ];
    stats.forEach(([name, value, color], index) => {
      const sx = modalX + 28 + index * 170;
      const box = this.add.graphics();
      box.fillStyle(COLORS.bgDeep, 0.85);
      box.fillRoundedRect(sx, modalY + 90, 160, 56, 10);
      box.lineStyle(1.5, color, 0.45);
      box.strokeRoundedRect(sx, modalY + 90, 160, 56, 10);
      const valueText = label(this, sx + 14, modalY + 98, `${value}`, 22, color, 'bold');
      const nameText = label(this, sx + 14, modalY + 126, name, 11, COLORS.dim, 'bold').setLetterSpacing(1);
      modal.add([box, valueText, nameText]);
    });

    modal.add(divider(this, modalX + 28, modalY + 162, modalX + modalW - 28));

    // Kỹ năng
    const skillHeader = label(
      this,
      modalX + 28,
      modalY + 176,
      `KỸ NĂNG ĐẶC BIỆT · TỐN ${def.skill.mana} MANA · COOLDOWN ${def.skill.cd} LƯỢT`,
      12,
      accent,
      'bold',
    ).setLetterSpacing(1);
    const skillName = label(this, modalX + 28, modalY + 196, `⚡ ${def.skill.name}`, 18, COLORS.text, 'bold');
    const skillDesc = this.add
      .text(modalX + 28, modalY + 224, def.skill.desc, {
        ...textStyle(13, COLORS.muted),
        lineSpacing: 4,
        wordWrap: { width: modalW - 56 },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));
    modal.add([skillHeader, skillName, skillDesc]);

    // Nội tại
    const passiveHeader = label(this, modalX + 28, modalY + 282, 'NỘI TẠI TỰ ĐỘNG (PASSIVE)', 12, COLORS.violet, 'bold').setLetterSpacing(
      1,
    );
    const passiveName = label(this, modalX + 28, modalY + 302, `✦ ${def.passive.name}`, 16, COLORS.text, 'bold');
    const passiveDesc = this.add
      .text(modalX + 28, modalY + 328, def.passive.desc, {
        ...textStyle(13, COLORS.muted),
        lineSpacing: 4,
        wordWrap: { width: modalW - 56 },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));
    modal.add([passiveHeader, passiveName, passiveDesc]);

    // Tương quan khắc chế
    const counters = countersFor(archetype);
    const counterHeader = label(this, modalX + 28, modalY + 386, 'TƯƠNG QUAN KHẮC CHẾ (COUNTER MATRIX)', 12, COLORS.gold, 'bold').setLetterSpacing(
      1,
    );
    const good = label(
      this,
      modalX + 28,
      modalY + 410,
      `✓ Lợi thế trước: ${counters.good.join('  ·  ') || '— Không có'}`,
      13,
      COLORS.success,
      'bold',
    );
    const bad = label(
      this,
      modalX + 28,
      modalY + 434,
      `✗ Bất lợi trước: ${counters.bad.join('  ·  ') || '— Không có'}`,
      13,
      COLORS.danger,
      'bold',
    );
    modal.add([counterHeader, good, bad]);

    const actionLabel =
      mode === 'pick'
        ? `XÁC NHẬN CHỌN ${archetype.toUpperCase()}`
        : mode === 'ban'
          ? `XÁC NHẬN BAN ${archetype.toUpperCase()}`
          : draft.picks[you].includes(archetype)
            ? 'BẠN ĐÃ SỞ HỮU TƯỚNG NÀY'
            : draft.phase === 'ban' && draft.yourBan !== null
              ? 'ĐÃ GHI NHẬN BAN CỦA BẠN'
              : 'CHƯA TỚI LƯỢT CỦA BẠN';

    const action = new Button(
      this,
      640,
      modalY + 500,
      modalW - 56,
      48,
      actionLabel,
      mode === 'ban' ? 'danger' : mode === 'pick' ? 'primary' : 'ghost',
      () => {
        if (this.pending) {
          this.showToast('Đang chờ server xác nhận…', COLORS.gold);
          return;
        }
        const kind = mode === 'pick' ? 'pick' : mode === 'ban' ? 'ban' : null;
        if (!kind) return;

        const sent = kind === 'pick' ? gameClient.pick(archetype) : gameClient.ban(archetype);
        if (!sent) {
          this.showToast('Chưa kết nối server', COLORS.danger);
          return;
        }

        this.pending = kind;
        this.closeModal();
        this.time.delayedCall(3_000, () => {
          this.pending = null;
        });
      },
      15,
    );
    action.setEnabled(mode !== 'info' && this.pending === null);

    const foot = label(
      this,
      640,
      modalY + 546,
      mode === 'ban' ? 'Ban của bạn được bảo mật tuyệt đối cho tới khi hết giờ.' : 'Lựa chọn hợp lệ được server xác thực realtime.',
      12,
      COLORS.dim,
    ).setOrigin(0.5, 0);

    modal.add([action, foot]);
    this.modal = modal;
  }

  private closeModal(): void {
    if (!this.modal) return;
    this.modal.destroy(true);
    this.modal = null;
  }

  private showToast(message: string, color: number): void {
    if (this.toast) this.toast.destroy();
    const toast = label(this, 640, 360, message, 14, color, 'bold')
      .setOrigin(0.5)
      .setDepth(2000)
      .setBackgroundColor('#0b101af0')
      .setPadding(16, 10, 16, 10);
    this.toast = toast;
    this.tweens.add({
      targets: toast,
      y: 330,
      alpha: { from: 1, to: 0 },
      delay: 1_200,
      duration: 600,
      onComplete: () => {
        toast.destroy();
        if (this.toast === toast) this.toast = null;
      },
    });
  }

  private requestExit(): void {
    if (!this.exitArmed) {
      this.exitArmed = true;
      this.exitButton.setLabel('XÁC NHẬN?');
      this.exitButton.setVariant('danger');
      this.time.delayedCall(3_000, () => {
        if (this.disposed) return;
        this.exitArmed = false;
        this.exitButton.setLabel('THOÁT');
        this.exitButton.setVariant('ghost');
      });
      return;
    }

    gameClient.leaveMatch();
    matchStore.clear();
    matchStore.pushEvent('Đã rời trận draft.');
  }

  /**
   * Chuyển cảnh mượt mà: Báo hiệu bắt đầu trận đấu với pháo hoa, flash, rung lắc & fade mượt trước khi sang Battle.
   */
  startMatchTransition(onComplete: () => void): void {
    if (this.disposed) {
      onComplete();
      return;
    }

    // Khóa tương tác
    this.rosterLayer.setAlpha(0.3);
    this.closeModal();

    // Lớp scrim đen mờ
    const scrim = this.add.graphics().setDepth(90);
    scrim.fillStyle(COLORS.black, 0.78);
    scrim.fillRect(0, 0, 1280, 720);
    scrim.setAlpha(0);
    this.tweens.add({ targets: scrim, alpha: 1, duration: 220, ease: 'Quad.easeOut' });

    // Flash & Rung lắc kích thích
    this.cameras.main.flash(220, 255, 235, 180, false);
    this.cameras.main.shake(320, 0.012);

    // Chùm tia pháo hoa vàng rực rỡ bùng tỏa từ trung tâm
    for (let i = 0; i < 32; i += 1) {
      const angle = (i / 32) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.08, 0.08);
      const dist = Phaser.Math.Between(80, 320);
      const spark = this.add
        .circle(640, 360, Phaser.Math.FloatBetween(2.6, 5.2), COLORS.gold, 1)
        .setDepth(95);
      this.tweens.add({
        targets: spark,
        x: 640 + Math.cos(angle) * dist,
        y: 360 + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(450, 700),
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    // Banner chữ hoành tráng
    const banner = this.add.container(640, 360).setDepth(100).setScale(0.35).setAlpha(0);
    const title = label(this, 0, -22, '⚔️ BẮT ĐẦU TRẬN ĐẤU ⚔️', 44, COLORS.gold, 'bold')
      .setOrigin(0.5)
      .setStroke('#030712', 8)
      .setShadow(0, 0, '#fbbf24', 36, true, true);

    const sub = label(this, 0, 32, 'CHUYỂN VÀO ĐẤU TRƯỜNG MATCH-3 · VÒNG 1', 16, COLORS.accent, 'bold')
      .setOrigin(0.5)
      .setLetterSpacing(1.6)
      .setStroke('#030712', 4);

    banner.add([title, sub]);

    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Sau khi hiển thị ấn tượng 720ms, fade out màn hình mượt mà
    this.time.delayedCall(720, () => {
      if (this.disposed) {
        onComplete();
        return;
      }
      this.cameras.main.fadeOut(380, 4, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        onComplete();
      });
    });
  }
}
