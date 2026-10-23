import Phaser from 'phaser';
import { CONFIG, heroDef, otherSide } from '@prism-pact/shared';
import type { Archetype, DraftView, MatchView, Side } from '@prism-pact/shared';
import { gameClient } from '../net/gameClient';
import { matchStore } from '../state';
import { Button } from '../ui/button';
import { COLORS, hex, label, textStyle } from '../ui/theme';
import { divider, drawBackdrop, panel, paintPanel, sectionTitle } from '../ui/panel';
import { Countdown } from '../ui/timer';
import { ARCHETYPE_COLOR, DraftHeroCard, MiniHeroSlot, type DraftCardState } from '../ui/heroCard';
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

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    super('Draft');
  }

  create(): void {
    this.cameras.main.fadeIn(220, 4, 6, 12);
    drawBackdrop(this);
    this.drawHeader();
    this.drawEnemyPanel();
    this.drawRosterArea();
    this.drawOwnPanel();
    this.drawLogPanel();
    this.drawInfoPanel();

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

  // ── Khung tĩnh ────────────────────────────────────────────────────────

  private drawHeader(): void {
    panel(this, 14, 12, 362, 66, { glow: COLORS.accent, glowAlpha: 0.07 });
    this.roundText = label(this, 28, 22, 'VÒNG 1/2', 18, COLORS.text, 'bold').setLetterSpacing(1);
    this.statusText = label(this, 28, 49, '', 9, COLORS.accent, 'bold').setLetterSpacing(0.6);
    this.timer = new Countdown(this, 348, 45, 20);
    this.add.existing(this.timer);
  }

  private drawEnemyPanel(): void {
    panel(this, 14, 86, 362, 86, { fill: COLORS.panelAlt, fillAlpha: 0.8 });
    this.enemyTitle = sectionTitle(this, 26, 97, 'Đội địch');
    label(this, 360, 97, 'LIVE', 8, COLORS.enemy, 'bold').setOrigin(1, 0).setLetterSpacing(1.2);
  }

  private drawRosterArea(): void {
    panel(this, 14, 176, 362, 320, { fill: COLORS.panelAlt, fillAlpha: 0.55, borderAlpha: 0.5 });
    this.poolLabel = sectionTitle(this, 26, 184, 'Pool · 8 tướng');
    label(this, 360, 184, 'CHẠM ĐỂ XEM CHI TIẾT', 7, COLORS.dim, 'bold').setOrigin(1, 0).setLetterSpacing(0.8);
  }

  private drawOwnPanel(): void {
    panel(this, 14, 500, 362, 86, { fill: COLORS.panelAlt, fillAlpha: 0.8 });
    this.ownTitle = sectionTitle(this, 26, 511, 'Đội bạn', COLORS.accent);
    this.ownBanText = label(this, 360, 511, '', 8, COLORS.muted, 'bold').setOrigin(1, 0);
  }

  private drawLogPanel(): void {
    panel(this, 14, 596, 362, 120, { fill: COLORS.panelAlt, fillAlpha: 0.6, borderAlpha: 0.5 });
    sectionTitle(this, 26, 607, 'Nhật ký draft');
    this.logText = this.add
      .text(26, 626, '', { ...textStyle(9, COLORS.muted), lineSpacing: 4, wordWrap: { width: 336 } })
      .setResolution(3);
  }

  private drawInfoPanel(): void {
    panel(this, 14, 726, 362, 106, { fill: COLORS.panelAlt, fillAlpha: 0.6, borderAlpha: 0.5 });
    sectionTitle(this, 26, 736, 'Cách chơi');
    this.infoText = this.add
      .text(26, 754, '', { ...textStyle(9, COLORS.muted), lineSpacing: 3, wordWrap: { width: 262 } })
      .setResolution(3);

    this.exitButton = new Button(this, 320, 796, 88, 28, 'THOÁT', 'ghost', () => this.requestExit(), 10);
    this.add.existing(this.exitButton);
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

    this.roundText.setText(`VÒNG ${draft.round}/2`);
    this.poolLabel.setText(draft.phase === 'ban' ? 'Chọn 1 tướng địch để ban' : `Pool · còn ${draft.pool.length} tướng`);

    const yourTurn = draft.phase === 'pick' && draft.turn === you;
    this.statusText.setText(this.statusLine(view, draft));
    this.statusText.setColor(
      hex(draft.phase === 'ban' ? COLORS.gold : yourTurn ? COLORS.accent : COLORS.muted),
    );

    const total = draft.phase === 'ban' ? CONFIG.DRAFT_BAN_TIME_MS : CONFIG.DRAFT_PICK_TIME_MS;
    this.timer.setDeadline(view.deadline, total);

    this.enemyTitle.setText(`ĐỘI ĐỊCH · ${draft.picks[opponent].length}/4`);
    this.ownTitle.setText(`ĐỘI BẠN · ${draft.picks[you].length}/4`);
    this.renderChips(this.enemyChips, draft.picks[opponent], 4, COLORS.enemy, 137);
    this.renderChips(this.yourChips, draft.picks[you], 4, COLORS.accent, 549);

    this.ownBanText.setText(draft.yourBan ? `Bạn đã ban: ${draft.yourBan}` : draft.phase === 'ban' ? 'Chưa ghi nhận ban' : '');
    this.ownBanText.setColor(hex(draft.yourBan ? COLORS.danger : COLORS.dim));

    if (draft.phase === 'ban') this.renderBanCards(draft, opponent);
    else this.renderRoster(draft, you, opponent);

    this.renderLog();
    this.renderInfo(draft, you, opponent);

    // Lượt của ai: marquee chạy ngang + làm xám roster khi không phải lượt mình.
    const turnKey = `${draft.phase}:${draft.turn}:${draft.yourBan ?? ''}`;
    if (turnKey !== this.lastTurnKey) {
      this.lastTurnKey = turnKey;
      if (draft.phase === 'pick') {
        showTurnNotice(
          this,
          190,
          yourTurn ? 'LƯỢT CỦA BẠN — CHỌN 2 TƯỚNG' : 'LƯỢT ĐỐI THỦ — ĐANG CHỌN',
          yourTurn ? COLORS.accent : COLORS.enemy,
        );
      } else if (draft.phase === 'ban' && draft.yourBan === null) {
        showTurnNotice(this, 190, 'BAN ẨN — CHỌN 1 TƯỚNG CỦA ĐỐI THỦ', COLORS.gold);
      }
    }

    const interactiveTurn = draft.phase === 'ban' || yourTurn;
    this.rosterLayer.setAlpha(interactiveTurn ? 1 : 0.45);
    this.statusText.setAlpha(interactiveTurn ? 1 : 0.8);
  }

  private statusLine(view: MatchView, draft: DraftView): string {
    if (draft.phase === 'ban') {
      return draft.yourBan ? 'ĐÃ GHI NHẬN BAN — CHỜ ĐỐI THỦ' : 'BAN ẨN · CHỌN 1 TƯỚNG CỦA ĐỐI THỦ';
    }
    if (draft.phase === 'pick') {
      return draft.turn === view.you
        ? `LƯỢT CỦA BẠN · CHỌN ${draft.picksLeftThisTurn} TƯỚNG`
        : 'ĐANG CHỜ ĐỐI THỦ CHỌN…';
    }
    return 'ĐÃ CHỐT ĐỘI HÌNH';
  }

  private renderChips(
    layer: Phaser.GameObjects.Container,
    picks: readonly Archetype[],
    slots: number,
    accent: number,
    y: number,
  ): void {
    layer.removeAll(true);
    for (let i = 0; i < slots; i += 1) {
      const chip = new MiniHeroSlot(this, 66 + i * 86, y, 80, 46, picks[i] ?? null, accent);
      layer.add(chip);
    }
  }

  private renderRoster(draft: DraftView, you: Side, opponent: Side): void {
    this.rosterLayer.removeAll(true);
    const yourTurn = draft.phase === 'pick' && draft.turn === you && draft.picksLeftThisTurn > 0;

    const roster = [
      'Tank',
      'Burst',
      'Healer',
      'Controller',
      'Buffer',
      'Debuffer',
      'Assassin',
      'Bruiser',
    ] as const;

    for (let index = 0; index < roster.length; index += 1) {
      const archetype = roster[index];
      const def = heroDef(archetype);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const card = new DraftHeroCard(this, col === 0 ? 101 : 289, 236 + row * 74, def, {
        width: 174,
        height: 64,
        onClick: (picked) => this.openDetail(picked),
      });

      let state: DraftCardState = 'available';
      let note = '';
      if (draft.picks[you].includes(archetype)) {
        state = 'mine';
        note = 'CỦA BẠN';
      } else if (draft.picks[opponent].includes(archetype)) {
        state = 'enemy';
        note = 'ĐỐI THỦ';
      } else if (!draft.pool.includes(archetype)) {
        state = 'banned';
        note = 'KHÔNG CÒN';
      }

      card.setCardState(state, note);
      card.setHighlight(state === 'available' && yourTurn);
      this.rosterLayer.add(card);

      if (!this.entered) {
        card.setAlpha(0);
        this.tweens.add({
          targets: card,
          alpha: 1,
          duration: 200,
          delay: 20 + index * 26,
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
      const card = new DraftHeroCard(this, col === 0 ? 101 : 289, 260 + row * 122, def, {
        width: 174,
        height: 112,
        onClick: (picked) => this.openDetail(picked),
      });

      const chosen = draft.yourBan === archetype;
      const submitted = draft.yourBan !== null;
      card.setCardState(chosen ? 'banned' : submitted ? 'enemy' : 'available', chosen ? 'ĐÃ BAN' : submitted ? 'CHỜ ĐỐI THỦ' : '');
      card.setHighlight(!submitted);
      this.rosterLayer.add(card);
    }

    if (targets.length === 0) {
      const waiting = label(this, 195, 330, 'Đang tải đội hình đối thủ…', 11, COLORS.dim).setOrigin(0.5);
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
        ? 'Ban của bạn đã được ghi nhận. Lựa chọn của đối thủ sẽ chỉ lộ sau khi cả hai ban xong.'
        : 'Mỗi bên ban kín 1 tướng của đối thủ. Đối thủ không thấy bạn ban ai cho tới khi hết giờ.';
    } else if (draft.turn === you) {
      text = 'Chọn 2 tướng mỗi lượt. Tướng đã pick bị loại khỏi pool cho cả hai bên — cân nhắc counter trước khi chốt.';
    } else {
      text = 'Đang chờ đối thủ. Quan sát đội hình họ lộ dần để chuẩn bị counter-pick ở lượt sau.';
    }

    if (suggestions.length > 0 && draft.phase === 'pick') {
      text += `\nGợi ý khắc chế: ${suggestions.join(' · ')}`;
    }

    this.infoText.setText(text);
    this.infoText.setColor(hex(draft.turn === you || draft.phase === 'ban' ? COLORS.muted : COLORS.dim));
  }

  // ── Modal chi tiết / chọn tướng ───────────────────────────────────────

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

    const modal = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x03050a, 0.82).setInteractive();
    dim.on('pointerup', () => this.closeModal());

    const backdrop = this.add.graphics();
    paintPanel(backdrop, 24, 132, 342, 580, {
      fill: COLORS.panel,
      fillAlpha: 0.99,
      border: accent,
      borderAlpha: 0.55,
      glow: accent,
      glowAlpha: 0.16,
      radius: 20,
    });

    // Chặn tap xuyên qua panel.
    const blocker = this.add.rectangle(195, 422, 342, 580, COLORS.black, 0.001).setInteractive();
    const strip = this.add.graphics();
    strip.fillStyle(accent, 1);
    strip.fillRoundedRect(24, 132, 342, 4, { tl: 20, tr: 20, bl: 0, br: 0 });

    const title = label(this, 42, 148, archetype.toUpperCase(), 24, COLORS.text, 'bold').setLetterSpacing(1);
    const role = label(this, 42, 180, 'ARCHETYPE · 3V3 DRAFT', 8, COLORS.dim, 'bold').setLetterSpacing(1.2);

    const close = label(this, 346, 148, '✕', 17, COLORS.muted, 'bold')
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.closeModal());

    modal.add([dim, backdrop, blocker, strip, title, role, close]);

    // 3 ô chỉ số.
    const stats: Array<[string, number, number]> = [
      ['HP', def.hp, COLORS.hp],
      ['ATK', def.atk, COLORS.atk],
      ['DEF', def.def, COLORS.shield],
    ];
    stats.forEach(([name, value, color], index) => {
      const x = 42 + index * 104;
      const box = this.add.graphics();
      box.fillStyle(COLORS.bgDeep, 0.75);
      box.fillRoundedRect(x, 204, 94, 48, 10);
      box.lineStyle(1, color, 0.35);
      box.strokeRoundedRect(x, 204, 94, 48, 10);
      const valueText = label(this, x + 10, 212, `${value}`, 18, color, 'bold');
      const nameText = label(this, x + 10, 236, name, 8, COLORS.dim, 'bold').setLetterSpacing(1);
      modal.add([box, valueText, nameText]);
    });

    modal.add(divider(this, 42, 268, 348));

    const skillHeader = label(
      this,
      42,
      278,
      `KỸ NĂNG · ${def.skill.mana} MANA · CD ${def.skill.cd}`,
      8,
      accent,
      'bold',
    ).setLetterSpacing(1);
    const skillName = label(this, 42, 292, def.skill.name, 15, COLORS.text, 'bold');
    const skillDesc = this.add
      .text(42, 313, def.skill.desc, { ...textStyle(10, COLORS.muted), lineSpacing: 3, wordWrap: { width: 306 } })
      .setResolution(3);
    modal.add([skillHeader, skillName, skillDesc]);

    const passiveHeader = label(this, 42, 360, 'NỘI TẠI', 8, COLORS.violet, 'bold').setLetterSpacing(1);
    const passiveName = label(this, 42, 374, def.passive.name, 12, COLORS.text, 'bold');
    const passiveDesc = this.add
      .text(42, 392, def.passive.desc, { ...textStyle(10, COLORS.muted), lineSpacing: 3, wordWrap: { width: 306 } })
      .setResolution(3);
    modal.add([passiveHeader, passiveName, passiveDesc]);

    const counters = countersFor(archetype);
    const counterHeader = label(this, 42, 438, 'TƯƠNG QUAN HỆ KHẮC CHẾ', 8, COLORS.gold, 'bold').setLetterSpacing(1);
    const good = label(this, 42, 454, `Tốt với: ${counters.good.join(' · ') || '—'}`, 10, COLORS.success);
    const bad = label(this, 42, 470, `Yếu với: ${counters.bad.join(' · ') || '—'}`, 10, COLORS.danger);
    modal.add([counterHeader, good, bad]);

    const enemies = draft.picks[opponent];
    const suggestions = suggestAgainst(enemies, draft.pool).slice(0, 3);
    const suggestHeader = label(this, 42, 498, 'GỢI Ý TỪ ĐỘI HÌNH ĐỊCH', 8, COLORS.dim, 'bold').setLetterSpacing(1);
    const suggestText = label(
      this,
      42,
      513,
      suggestions.length > 0 ? suggestions.join(' · ') : 'Chưa đủ dữ liệu để gợi ý.',
      10,
      suggestions.length > 0 ? COLORS.accent : COLORS.dim,
      suggestions.length > 0 ? 'bold' : 'normal',
    );
    modal.add([suggestHeader, suggestText]);

    const actionLabel =
      mode === 'pick'
        ? `CHỌN ${archetype.toUpperCase()}`
        : mode === 'ban'
          ? `BAN ${archetype.toUpperCase()}`
          : draft.picks[you].includes(archetype)
            ? 'TƯỚNG NÀY ĐÃ LÀ CỦA BẠN'
            : draft.phase === 'ban' && draft.yourBan !== null
              ? 'ĐÃ GHI NHẬN BAN'
              : 'CHƯA TỚI LƯỢT CỦA BẠN';

    const action = new Button(
      this,
      195,
      612,
      306,
      42,
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
        this.showToast(kind === 'pick' ? `Đang chọn ${archetype}…` : `Đang ban ${archetype}…`, COLORS.gold);
        // Nếu server không trả state (mất mạng), mở khoá sau 3s.
        this.time.delayedCall(3_000, () => {
          this.pending = null;
        });
      },
      12,
    );
    action.setEnabled(mode !== 'info' && this.pending === null);

    const foot = label(
      this,
      195,
      672,
      mode === 'ban' ? 'Ban của bạn được giữ kín với đối thủ.' : 'Mọi lựa chọn do server xác thực.',
      8,
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
    const toast = label(this, 195, 470, message, 11, color, 'bold')
      .setOrigin(0.5)
      .setDepth(2000)
      .setBackgroundColor('#0b101ae6')
      .setPadding(10, 7, 10, 7);
    this.toast = toast;
    this.tweens.add({
      targets: toast,
      y: 452,
      alpha: { from: 1, to: 0 },
      delay: 1_200,
      duration: 700,
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
}
