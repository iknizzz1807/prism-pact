import Phaser from 'phaser';
import { CONFIG, otherSide } from '@prism-pact/shared';
import type {
  BattleView,
  GemType,
  HeroView,
  MatchView,
  Side,
  Special,
  TurnAnimation,
  WaveView,
} from '@prism-pact/shared';
import { gameClient } from '../net/gameClient';
import { matchStore } from '../state';
import { Button } from '../ui/button';
import { COLORS, hex, label, textStyle } from '../ui/theme';
import { drawBackdrop, paintPanel, panel } from '../ui/panel';
import { StatBar } from '../ui/bar';
import { Countdown } from '../ui/timer';
import { drawGem, specialGlyph } from '../ui/gem';
import {
  ARCHETYPE_EMOJI,
  BattleHeroCard,
  type BattleCardOptions,
} from '../ui/heroCard';
import { formatInt, shortAddress } from '../util/format';
import { addTouchTarget } from '../ui/touch';
import { showTurnNotice } from '../ui/turnNotice';

const BOARD_X = 35;
const BOARD_Y = 214;
const CELL = 40;
const SIZE = CONFIG.BOARD_SIZE;

const SKILL_CHIP_X = [108, 198, 288] as const;
const SKILL_CHIP_Y = 661;

interface GemSlot {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  glyph: Phaser.GameObjects.Text;
  type: GemType | null;
  special: Special | null;
}

const TARGETED_SKILLS: ReadonlySet<string> = new Set(['Burst', 'Controller', 'Debuffer', 'Bruiser']);

export class BattleScene extends Phaser.Scene {
  private instructionText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private timer!: Countdown;
  private skillLayer!: Phaser.GameObjects.Container;
  private selectionGfx!: Phaser.GameObjects.Graphics;
  private arrowGfx!: Phaser.GameObjects.Graphics;
  private exitText!: Phaser.GameObjects.Text;

  private enemyCards: BattleHeroCard[] = [];
  private ownCards: BattleHeroCard[] = [];
  private enemyManaBar!: StatBar;
  private ownManaBar!: StatBar;
  private enemyManaText!: Phaser.GameObjects.Text;
  private ownManaText!: Phaser.GameObjects.Text;
  private gems: GemSlot[] = [];

  private view: MatchView | null = null;
  private selectedCell: number | null = null;
  private linkGfx!: Phaser.GameObjects.Graphics;
  private turnFrame!: Phaser.GameObjects.Graphics;
  private turnPill!: Phaser.GameObjects.Graphics;
  private turnPillText!: Phaser.GameObjects.Text;
  private turnPulse: Phaser.Tweens.Tween | null = null;
  private legendShown = false;
  private animating = false;
  private pendingTarget: string | null = null;
  private pendingSkill: string | null = null;
  private armedCaster: string | null = null;
  private skillSpent = false;
  private busy = false;
  private pressIndex: number | null = null;
  private pressX = 0;
  private pressY = 0;
  private boardReady = false;
  private turnKey = '';
  private previousHeroes = new Map<string, { hp: number; shield: number; alive: boolean }>();
  private resultOverlay: Phaser.GameObjects.Container | null = null;
  private exitArmed = false;
  private toastText: Phaser.GameObjects.Text | null = null;
  private disposed = false;

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    super('Battle');
  }

  create(): void {
    this.cameras.main.fadeIn(220, 4, 6, 12);
    drawBackdrop(this);
    this.drawManaBars();
    this.drawBoardFrame();
    this.drawLogPanel();
    this.drawSkillBar();

    this.skillLayer = this.add.container(0, 0);
    this.selectionGfx = this.add.graphics().setDepth(15);
    this.arrowGfx = this.add.graphics().setDepth(18);
    this.linkGfx = this.add.graphics().setDepth(24);

    this.input.on('pointerup', this.onPointerUp, this);

    this.unsubs.push(
      matchStore.subscribe(() => {
        const view = matchStore.view;
        if (!view?.battle) return;
        if (this.animating) return; // animation đang chạy, state mới sẽ xử lý sau
        const next = matchStore.consumeAnimation();
        if (next) {
          void this.playAnimation(next.animation, view);
          return;
        }
        this.applyState(view);
      }),
    );
    this.unsubs.push(
      gameClient.onError((_code, message) => {
        this.busy = false;
        this.skillSpent = false;
        this.showToast(message, COLORS.danger);
      }),
    );

    if (matchStore.view?.battle) {
      matchStore.consumeAnimation();
      this.applyState(matchStore.view);
    }

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

  private drawManaBars(): void {
    panel(this, 14, 150, 362, 48, { fill: COLORS.panelAlt, fillAlpha: 0.75 });

    label(this, 28, 153, 'MANA ĐỊCH', 8, COLORS.enemy, 'bold').setLetterSpacing(0.8);
    label(this, 28, 171, 'MANA BẠN', 8, COLORS.accent, 'bold').setLetterSpacing(0.8);

    this.enemyManaBar = new StatBar(this, 90, 157, 220, 9, COLORS.mana);
    this.ownManaBar = new StatBar(this, 90, 175, 220, 9, COLORS.accent);
    this.add.existing(this.enemyManaBar);
    this.add.existing(this.ownManaBar);

    this.enemyManaText = label(this, 360, 151, '0/100', 9, COLORS.text, 'bold').setOrigin(1, 0);
    this.ownManaText = label(this, 360, 169, '0/100', 9, COLORS.accent, 'bold').setOrigin(1, 0);
  }

  private drawBoardFrame(): void {
    panel(this, 23, 202, 344, 344, { fill: 0x0a111d, fillAlpha: 0.92, border: COLORS.border, borderAlpha: 0.7, radius: 18 });
    this.turnFrame = this.add.graphics().setDepth(1);

    const grid = this.add.graphics();
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const col = index % SIZE;
      const row = Math.floor(index / SIZE);
      const x = BOARD_X + col * CELL;
      const y = BOARD_Y + row * CELL;
      grid.fillStyle((row + col) % 2 === 0 ? 0x0d1522 : 0x101a2a, 0.9);
      grid.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      grid.lineStyle(1, 0x1b263b, 0.55);
      grid.strokeRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
    }

    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const col = index % SIZE;
      const row = Math.floor(index / SIZE);
      const cx = BOARD_X + col * CELL + CELL / 2;
      const cy = BOARD_Y + row * CELL + CELL / 2;

      const container = this.add.container(cx, cy);
      const graphics = this.add.graphics();
      const glyph = label(this, 12, -12, '', 10, COLORS.text).setOrigin(0.5).setDepth(2);
      container.add([graphics, glyph]);
      container.setSize(CELL, CELL);
      addTouchTarget(container, this, CELL, CELL, {
        onDown: (pointer) => this.onCellDown(index, pointer),
      });

      this.gems.push({ container, graphics, glyph, type: null, special: null });
    }
  }

  private drawLogPanel(): void {
    panel(this, 14, 552, 362, 78, { fill: COLORS.panelAlt, fillAlpha: 0.65, borderAlpha: 0.5, radius: 12 });

    this.turnPill = this.add.graphics();
    this.turnPillText = label(this, 195, 559, '', 10, COLORS.accent, 'bold')
      .setOrigin(0.5, 0)
      .setLetterSpacing(0.6);
    this.turnPulse = this.tweens.add({
      targets: this.turnPillText,
      alpha: { from: 1, to: 0.5 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    this.turnText = label(this, 360, 560, '', 8, COLORS.muted, 'bold').setOrigin(1, 0);
    this.instructionText = label(this, 26, 582, '', 8, COLORS.accent, 'bold');
    this.logText = this.add
      .text(26, 596, '', { ...textStyle(8.5, COLORS.muted), lineSpacing: 1, wordWrap: { width: 336 } })
      .setResolution(3);
  }

  /** Thanh lượt cố định — luôn hiện, không phải thông báo tạm. */
  private renderTurnPill(yourTurn: boolean, suddenDeath: boolean): void {
    const g = this.turnPill;
    if (!g) return;
    const color = suddenDeath ? COLORS.danger : yourTurn ? COLORS.accent : COLORS.enemy;

    g.clear();
    g.fillStyle(color, 0.16);
    g.fillRoundedRect(14, 552, 362, 26, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(1, color, 0.55);
    g.strokeRoundedRect(14, 552, 362, 26, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.turnPillText.setText(
      yourTurn ? '● LƯỢT CỦA BẠN — CHỌN MỤC TIÊU & XẾP NGỌC' : '● LƯỢT ĐỐI THỦ — ĐANG ĐI…',
    );
    this.turnPillText.setColor(hex(color));
    this.turnPillText.setAlpha(1);

    if (this.turnPulse) {
      this.turnPulse.paused = yourTurn;
      if (yourTurn) this.turnPillText.setAlpha(1);
    }
  }

  private drawSkillBar(): void {
    panel(this, 14, 632, 362, 58, { fill: COLORS.panelAlt, fillAlpha: 0.8, radius: 14 });

    this.timer = new Countdown(this, 40, 661, 19);
    this.add.existing(this.timer);

    this.exitText = label(this, 360, 656, 'THOÁT', 8, COLORS.dim, 'bold')
      .setOrigin(1, 0)
      .setLetterSpacing(0.8)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.requestExit());
  }

  private ensureCards(view: MatchView): void {
    const battle = view.battle;
    if (!battle || this.enemyCards.length > 0) return;
    const you = view.you;
    const opponent = otherSide(you);

    battle.sides[opponent].heroes.forEach((hero, index) => {
      const options: BattleCardOptions = {
        width: 112,
        height: 132,
        variant: 'enemy',
        onClick: (uid) => this.selectTarget(uid),
      };
      const card = new BattleHeroCard(this, 72 + index * 123, 76, hero, options);
      this.add.existing(card);
      this.enemyCards.push(card);
    });

    battle.sides[you].heroes.forEach((hero, index) => {
      const options: BattleCardOptions = {
        width: 112,
        height: 132,
        variant: 'ally',
        onClick: (uid) => this.selectCaster(uid),
      };
      const card = new BattleHeroCard(this, 72 + index * 123, 768, hero, options);
      this.add.existing(card);
      this.ownCards.push(card);
    });
  }

  // ── Phát lại animation một lượt (Candy Crush style) ────────────────────

  private cellX(index: number): number {
    return BOARD_X + (index % SIZE) * CELL + CELL / 2;
  }

  private cellY(index: number): number {
    return BOARD_Y + Math.floor(index / SIZE) * CELL + CELL / 2;
  }

  private tweenAsync(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ ...config, onComplete: () => resolve() });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private async playAnimation(anim: TurnAnimation, view: MatchView): Promise<void> {
    if (this.animating || this.disposed) return;
    this.animating = true;
    this.busy = true;

    try {
      await this.animateSwapPair(anim.from, anim.to, anim.swapBoard);
      for (let i = 0; i < anim.waves.length; i += 1) {
        if (this.disposed) return;
        await this.animateWave(anim.waves[i]!, i, anim.side, anim.targetUid);
      }
    } catch {
      // Animation lỗi thì bỏ qua — vẫn phải về đúng trạng thái cuối.
    } finally {
      this.animating = false;
      this.busy = false;
      if (this.disposed) return;
      const latest = matchStore.view ?? view;
      const next = matchStore.consumeAnimation();
      if (next) void this.playAnimation(next.animation, latest);
      else this.applyState(latest, true);
    }
  }

  private async animateSwapPair(
    from: number,
    to: number,
    swapBoard: Array<{ type: GemType; special: Special | null } | null>,
  ): Promise<void> {
    const a = this.gems[from];
    const b = this.gems[to];
    if (a && b) {
      const ax = a.container.x;
      const ay = a.container.y;
      const bx = b.container.x;
      const by = b.container.y;

      if (!(ax === bx && ay === by)) {
        await Promise.all([
          this.tweenAsync({ targets: a.container, x: bx, y: by, duration: 240, ease: 'Quad.easeInOut' }),
          this.tweenAsync({ targets: b.container, x: ax, y: ay, duration: 240, ease: 'Quad.easeInOut' }),
        ]);
        a.container.setPosition(ax, ay);
        b.container.setPosition(bx, by);
      }
    }

    // Áp đúng bàn sau swap do server gửi — không tự suy ra, tránh lệch khi state cũ.
    this.renderSnapshot(swapBoard);
  }

  private renderSnapshot(board: Array<{ type: GemType; special: Special | null } | null>): void {
    for (let cell = 0; cell < SIZE * SIZE; cell += 1) {
      const slot = this.gems[cell];
      if (!slot) continue;
      const gem = board[cell];
      slot.container.setPosition(this.cellX(cell), this.cellY(cell)).setScale(1).setAlpha(1).setAngle(0);
      if (gem) {
        drawGem(slot.graphics, 30, gem.type, gem.special);
        slot.glyph.setText(specialGlyph(gem.special));
        slot.type = gem.type;
        slot.special = gem.special;
      } else {
        this.clearGem(slot);
      }
    }
  }

  private async animateWave(
    wave: WaveView,
    index: number,
    side: Side,
    targetUid: string | null,
  ): Promise<void> {
    // 0) Combo: wave thứ 2 trở đi là chuỗi ăn liên tiếp
    if (index > 0) this.showCombo(index + 1);

    // 0b) Bomb nổ: flash vàng + rung màn hình
    const bombs = wave.cleared.filter((cell) => this.gems[cell]?.special === 'BOMB');
    if (bombs.length > 0) {
      this.bombFlash(bombs);
      this.cameras.main.shake(180, 0.006);
    }

    // Chụp lại nội dung TRƯỚC khi xoá để biết quân nào rơi từ đâu.
    const before = this.gems.map((slot) => ({ type: slot.type, special: slot.special }));

    // 1) Nối các viên match bằng tia sáng
    this.drawLinks(wave.runs);
    this.linkGfx.setAlpha(0.35);
    await this.tweenAsync({ targets: this.linkGfx, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
    await this.delay(120);
    this.linkGfx.clear();

    // 2) Nổ các viên bị xoá
    const created = new Set(wave.created.map((item) => item.index));
    const cleared = wave.cleared.filter((cell) => !created.has(cell));
    await Promise.all(cleared.map((cell) => this.popCell(cell)));

    // 3) Rơi: ô đích hiển thị đúng quân từ ô nguồn, ô nguồn để TRỐNG
    //    (trước đây vẽ sẵn cả bàn nên hai quân chồng nhau → trông như đổi icon)
    const destination = new Map<number, number>();
    for (const move of wave.moves) destination.set(move.to, move.from);
    const spawns = new Map(wave.spawned.map((spawn) => [spawn.index, spawn]));

    const falls: Promise<void>[] = [];

    for (const [to, from] of destination) {
      const slot = this.gems[to];
      if (!slot) continue;
      const source = before[from];
      if (source?.type) {
        drawGem(slot.graphics, 30, source.type, source.special);
        slot.glyph.setText(specialGlyph(source.special));
        slot.type = source.type;
        slot.special = source.special;
      } else {
        this.clearGem(slot);
      }

      const rows = Math.abs(Math.floor(to / SIZE) - Math.floor(from / SIZE));
      slot.container.setPosition(this.cellX(to), this.cellY(from)).setScale(1).setAlpha(1).setAngle(0);
      falls.push(
        this.tweenAsync({
          targets: slot.container,
          y: this.cellY(to),
          duration: 150 + rows * 45,
          ease: 'Bounce.easeOut',
        }),
      );
    }

    for (const spawn of spawns.values()) {
      const slot = this.gems[spawn.index];
      if (!slot) continue;
      const gem = wave.board[spawn.index];
      if (gem) {
        drawGem(slot.graphics, 30, gem.type, gem.special);
        slot.glyph.setText(specialGlyph(gem.special));
        slot.type = gem.type;
        slot.special = gem.special;
      }
      const row = Math.floor(spawn.index / SIZE);
      slot.container
        .setPosition(this.cellX(spawn.index), this.cellY(0) - CELL * 2)
        .setScale(1)
        .setAlpha(0.65)
        .setAngle(0);
      falls.push(
        this.tweenAsync({
          targets: slot.container,
          y: this.cellY(spawn.index),
          alpha: 1,
          duration: 180 + row * 30,
          ease: 'Bounce.easeOut',
        }),
      );
    }

    // Ô nguồn: quân đã rơi đi nên phải xoá, tránh hiện trùng ở cả 2 ô.
    for (const move of wave.moves) {
      const from = move.from;
      if (destination.has(from) || spawns.has(from) || cleared.includes(from)) continue;
      const slot = this.gems[from];
      if (slot) {
        this.clearGem(slot);
        slot.container.setScale(1).setAlpha(1).setAngle(0);
      }
    }

    // Ô bị xoá mà không nhận quân nào thì để trống trong lúc rơi.
    for (const cell of cleared) {
      const slot = this.gems[cell];
      if (!slot || destination.has(cell) || spawns.has(cell)) continue;
      this.clearGem(slot);
    }

    if (falls.length > 0) await Promise.all(falls);

    // 4b) Ngọc bay tới đích: ATK → tướng bị đánh, HP/SHIELD → tướng đội mình,
    //     MANA → thanh mana. Đây là thứ giải thích "ăn ngọc này thì được gì".
    this.flyGemEffects(wave, before, side, targetUid);

    // 4) Chốt lại đúng board của wave (vị trí + nội dung)
    for (let cell = 0; cell < SIZE * SIZE; cell += 1) {
      const slot = this.gems[cell];
      if (!slot) continue;
      slot.container.setPosition(this.cellX(cell), this.cellY(cell)).setScale(1).setAlpha(1).setAngle(0);
      const gem = wave.board[cell];
      if (gem) {
        drawGem(slot.graphics, 30, gem.type, gem.special);
        slot.glyph.setText(specialGlyph(gem.special));
        slot.type = gem.type;
        slot.special = gem.special;
      } else {
        this.clearGem(slot);
      }
    }

    // 5) Ngọc đặc biệt vừa tạo: bật ra
    for (const item of wave.created) {
      const slot = this.gems[item.index];
      if (!slot) continue;
      slot.container.setScale(0.4);
      this.tweens.add({ targets: slot.container, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.burst(this.cellX(item.index), this.cellY(item.index), COLORS.gold);
    }

    await this.delay(80);
  }

  private showCombo(combo: number): void {
    const text = label(this, 195, 370, `COMBO x${combo}`, 22, COLORS.gold, 'bold')
      .setOrigin(0.5)
      .setDepth(55)
      .setShadow(0, 2, '#000000', 10, true, true)
      .setScale(0.55)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      scale: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 380,
      onComplete: () => text.destroy(),
    });
  }

  /** Ngọc bay tới đích để giải thích hiệu ứng: ATK→mục tiêu, HP/SHIELD→đội, MANA→thanh mana. */
  private flyGemEffects(
    wave: WaveView,
    before: Array<{ type: GemType | null }>,
    side: Side,
    targetUid: string | null,
  ): void {
    const byType: Record<GemType, number[]> = { ATK: [], HP: [], MANA: [], SHIELD: [] };
    for (const cell of wave.cleared) {
      const type = before[cell]?.type;
      if (type) byType[type].push(cell);
    }

    const you = this.view?.you;
    const actingAlly = side === you;
    const allyCards = actingAlly ? this.ownCards : this.enemyCards;
    const manaPos = actingAlly ? { x: 200, y: 175 } : { x: 200, y: 157 };

    const targetCard = targetUid
      ? [...this.enemyCards, ...this.ownCards].find((card) => card.uid === targetUid)
      : null;

    this.flyOrbs(byType.ATK, COLORS.atk, () =>
      targetCard ? { x: targetCard.x, y: targetCard.y } : { x: 195, y: BOARD_Y + 172 },
    );

    const allyPos = (i: number) => {
      const card = allyCards[i % Math.max(1, allyCards.length)];
      return card ? { x: card.x, y: card.y } : null;
    };

    this.flyOrbs(byType.HP, COLORS.hp, allyPos);
    this.flyOrbs(byType.SHIELD, COLORS.shield, allyPos);
    this.flyOrbs(byType.MANA, COLORS.mana, () => manaPos);
  }

  private flyOrbs(
    cells: number[],
    color: number,
    dest: (index: number) => { x: number; y: number } | null,
  ): void {
    const limit = Math.min(cells.length, 6);
    for (let i = 0; i < limit; i += 1) {
      const cell = cells[i]!;
      const to = dest(i);
      if (!to) continue;

      const orb = this.add.circle(this.cellX(cell), this.cellY(cell), 3.5, color, 0.95).setDepth(30);
      this.tweens.add({
        targets: orb,
        x: to.x,
        y: to.y,
        scale: 0.45,
        alpha: 0,
        delay: i * 40,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => orb.destroy(),
      });
    }
  }

  /** Nháy đỏ card khi ăn damage. */
  private flashCard(uid: string): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;

    const rect = this.add
      .rectangle(card.x, card.y, card.widthValue, card.heightValue, COLORS.danger, 0.32)
      .setDepth(28);

    this.tweens.add({
      targets: rect,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => rect.destroy(),
    });
  }

  /** Giải thích 4 loại ngọc — hiện 1 lần ở đầu trận. */
  private showGemLegend(): void {
    const rows: Array<[string, string, number]> = [
      ['⚔️', 'ATK — gây sát thương lên mục tiêu', COLORS.atk],
      ['🩸', 'HP — hồi máu toàn đội', COLORS.hp],
      ['💧', 'MANA — nạp mana để dùng chiêu', COLORS.mana],
      ['🛡️', 'SHIELD — tạo giáp chặn sát thương', COLORS.shield],
    ];

    const container = this.add.container(0, 0).setDepth(95).setAlpha(0);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x03050a, 0.55).setInteractive();
    const bg = this.add.graphics();
    paintPanel(bg, 34, 292, 322, 190, {
      fill: COLORS.panel,
      fillAlpha: 0.98,
      border: COLORS.accent,
      borderAlpha: 0.5,
      radius: 16,
    });
    const title = label(this, 195, 306, 'NGỌC TRÊN BÀN', 10, COLORS.accent, 'bold')
      .setOrigin(0.5, 0)
      .setLetterSpacing(1.2);

    container.add([dim, bg, title]);

    rows.forEach(([icon, text, color], index) => {
      const y = 334 + index * 32;
      const bar = this.add.graphics();
      bar.fillStyle(color, 0.9);
      bar.fillRoundedRect(46, y + 4, 3, 14, 2);

      const iconText = label(this, 62, y, icon, 13).setOrigin(0.5, 0);
      const row = label(this, 84, y + 2, text, 9, COLORS.text);
      container.add([bar, iconText, row]);
    });

    const hint = label(this, 195, 456, 'chạm để đóng · tự đóng sau 6s', 8, COLORS.dim).setOrigin(0.5, 0);
    container.add(hint);

    this.tweens.add({ targets: container, alpha: 1, duration: 180 });

    const close = () => {
      if (!container.active) return;
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 180,
        onComplete: () => container.destroy(true),
      });
    };
    dim.on('pointerup', close);
    this.time.delayedCall(6_000, close);
  }

  private bombFlash(cells: number[]): void {
    for (const cell of cells) {
      const ring = this.add
        .circle(this.cellX(cell), this.cellY(cell), 18)
        .setStrokeStyle(4, COLORS.gold, 0.9)
        .setDepth(26);
      this.tweens.add({
        targets: ring,
        scale: 3.2,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private popCell(index: number): Promise<void> {
    const slot = this.gems[index];
    if (!slot) return Promise.resolve();

    if (slot.type) this.burst(this.cellX(index), this.cellY(index), this.gemColor(slot.type));

    return this.tweenAsync({
      targets: slot.container,
      scale: 0.12,
      alpha: 0,
      angle: Phaser.Math.Between(-24, 24),
      duration: 200,
      ease: 'Quad.easeIn',
    }).then(() => {
      slot.container.setScale(1).setAlpha(1).setAngle(0);
      this.clearGem(slot);
    });
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < 4; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(12, 30);
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.95).setDepth(25);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 340,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private gemColor(type: GemType): number {
    switch (type) {
      case 'ATK':
        return COLORS.atk;
      case 'HP':
        return COLORS.hp;
      case 'MANA':
        return COLORS.mana;
      default:
        return COLORS.shield;
    }
  }

  private drawLinks(runs: Array<{ cells: number[]; type: GemType }>): void {
    const colorOf: Record<GemType, number> = {
      ATK: COLORS.atk,
      HP: COLORS.hp,
      MANA: COLORS.mana,
      SHIELD: COLORS.shield,
    };
    const g = this.linkGfx;
    g.clear();

    for (const run of runs) {
      if (run.cells.length < 2) continue;
      const color = colorOf[run.type];

      const path = (width: number, alpha: number) => {
        g.lineStyle(width, color, alpha);
        g.beginPath();
        const first = run.cells[0]!;
        g.moveTo(this.cellX(first), this.cellY(first));
        for (let i = 1; i < run.cells.length; i += 1) {
          const index = run.cells[i]!;
          g.lineTo(this.cellX(index), this.cellY(index));
        }
        g.strokePath();
      };

      path(14, 0.22);
      path(6, 0.85);
    }
  }

  /** Viền bàn cờ đổi màu theo lượt: xanh = bạn, đỏ = đối thủ. */
  private renderTurnFrame(yourTurn: boolean, suddenDeath: boolean): void {
    const g = this.turnFrame;
    if (!g) return;
    g.clear();
    const color = suddenDeath ? COLORS.danger : yourTurn ? COLORS.accent : COLORS.enemy;
    g.lineStyle(10, color, yourTurn ? 0.1 : 0.06);
    g.strokeRoundedRect(23, 202, 344, 344, 18);
    g.lineStyle(2, color, yourTurn ? 0.85 : 0.45);
    g.strokeRoundedRect(23, 202, 344, 344, 18);
  }

  // ── State → render ────────────────────────────────────────────────────

  private applyState(view: MatchView, skipBoardAnim = false): void {
    const battle = view.battle;
    if (!battle) return;
    this.view = view;
    const you = view.you;
    const opponent = otherSide(you);

    this.ensureCards(view);

    const nextKey = `${battle.active}:${battle.turn}`;
    const turnChanged = nextKey !== this.turnKey;
    if (turnChanged) {
      this.turnKey = nextKey;
      this.pendingSkill = null;
      this.armedCaster = null;
      this.pendingTarget = null;
      this.selectedCell = null;
      this.skillSpent = false;
      this.busy = false;
    }

    const yourTurn = battle.active === you;
    this.renderTurnFrame(yourTurn, battle.suddenDeath);
    this.renderTurnPill(yourTurn, battle.suddenDeath);
    this.skillLayer.setAlpha(yourTurn ? 1 : 0.55);

    if (!this.legendShown) {
      this.legendShown = true;
      this.showGemLegend();
    }

    if (turnChanged) {
      showTurnNotice(
        this,
        374,
        yourTurn ? 'LƯỢT CỦA BẠN — CHỌN MỤC TIÊU' : 'LƯỢT ĐỐI THỦ',
        yourTurn ? COLORS.accent : COLORS.enemy,
      );
    }

    battle.sides[opponent].heroes.forEach((hero, index) => {
      this.enemyCards[index]?.update(hero, battle.sides[opponent].mana);
    });
    battle.sides[you].heroes.forEach((hero, index) => {
      this.ownCards[index]?.update(hero, battle.sides[you].mana);
    });

    this.syncMana(battle, you, opponent);
    this.diffHeroes(battle, you, opponent);

    const liveTargets = battle.sides[opponent].heroes.filter((hero) => hero.alive);
    if (this.pendingTarget && !liveTargets.some((hero) => hero.uid === this.pendingTarget)) {
      this.pendingTarget = liveTargets[0]?.uid ?? null;
    }

    this.renderBoard(battle, skipBoardAnim);
    this.renderSkills(battle, you);
    this.syncTargetVisuals();
    this.updateInstruction();
    this.renderLog();

    this.turnText.setText(
      `${battle.suddenDeath ? 'SUDDEN DEATH · ' : ''}LƯỢT ${battle.turn}`,
    );
    this.turnText.setColor(hex(battle.suddenDeath ? COLORS.danger : COLORS.muted));

    this.timer.setDeadline(view.deadline, CONFIG.TURN_TIME_MS);

    if (view.phase === 'result') this.showResult(view);
  }

  private syncMana(battle: BattleView, you: Side, opponent: Side): void {
    const enemyMana = battle.sides[opponent].mana;
    const yourMana = battle.sides[you].mana;
    this.enemyManaBar.setRatios(enemyMana / CONFIG.MANA_MAX);
    this.ownManaBar.setRatios(yourMana / CONFIG.MANA_MAX);
    this.enemyManaText.setText(`${Math.round(enemyMana)}/${CONFIG.MANA_MAX}`);
    this.ownManaText.setText(`${Math.round(yourMana)}/${CONFIG.MANA_MAX}`);
  }

  private diffHeroes(battle: BattleView, you: Side, opponent: Side): void {
    const next = new Map<string, { hp: number; shield: number; alive: boolean }>();
    const teams = [...battle.sides[opponent].heroes, ...battle.sides[you].heroes];

    for (const hero of teams) {
      const previous = this.previousHeroes.get(hero.uid);
      if (previous) {
        const hpDelta = hero.hp - previous.hp;
        if (hpDelta < -0.5) {
          this.floatingOnHero(hero.uid, `-${Math.round(-hpDelta)}`, COLORS.danger);
          this.shakeCard(hero.uid);
          this.flashCard(hero.uid);
        } else if (hpDelta > 0.5) {
          this.floatingOnHero(hero.uid, `+${Math.round(hpDelta)}`, COLORS.success);
        }

        const shieldDelta = hero.shield - previous.shield;
        if (shieldDelta > 0.5) this.floatingOnHero(hero.uid, `+${Math.round(shieldDelta)} giáp`, COLORS.shield);
        if (previous.alive && !hero.alive) this.floatingOnHero(hero.uid, 'HẠ GỤC', COLORS.danger, 12);
      }
      next.set(hero.uid, { hp: hero.hp, shield: hero.shield, alive: hero.alive });
    }

    this.previousHeroes = next;
  }

  /** Rung nhẹ card khi ăn damage. */
  private shakeCard(uid: string): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;
    const baseX = card.x;
    this.tweens.killTweensOf(card);
    card.x = baseX - 4;
    this.tweens.add({
      targets: card,
      x: baseX + 4,
      duration: 55,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        card.x = baseX;
      },
    });
  }

  private floatingOnHero(uid: string, text: string, color: number, size = 15): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;
    const x = card.x + Phaser.Math.Between(-16, 16);
    const y = card.y + card.heightValue / 2 - 28;
    const float = label(this, x, y, text, size, color, 'bold')
      .setOrigin(0.5)
      .setDepth(40)
      .setShadow(0, 2, '#000000', 4, true, true);
    this.tweens.add({
      targets: float,
      y: y - 34,
      alpha: { from: 1, to: 0 },
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => float.destroy(),
    });
  }

  private renderBoard(battle: BattleView, skipAnim = false): void {
    battle.board.forEach((cell, index) => {
      const slot = this.gems[index];
      if (!slot) return;
      if (!cell) {
        this.clearGem(slot);
        return;
      }
      const changed = slot.type !== cell.type || slot.special !== cell.special;
      if (!changed) return;

      drawGem(slot.graphics, 30, cell.type, cell.special);
      slot.glyph.setText(specialGlyph(cell.special));
      slot.type = cell.type;
      slot.special = cell.special;

      if (this.boardReady && !skipAnim) {
        slot.container.setScale(0.72);
        this.tweens.add({ targets: slot.container, scale: 1, duration: 150, ease: 'Back.easeOut' });
      }
    });
    this.boardReady = true;
  }

  private clearGem(slot: GemSlot): void {
    slot.graphics.clear();
    slot.glyph.setText('');
    slot.type = null;
    slot.special = null;
  }

  private renderSkills(battle: BattleView, you: Side): void {
    this.skillLayer.removeAll(true);
    const heroes = battle.sides[you].heroes;
    const mana = battle.sides[you].mana;
    const myTurn = battle.active === you;

    heroes.forEach((hero, index) => {
      const ready = myTurn && !this.skillSpent && this.skillUsable(hero, mana);
      const selected = this.pendingSkill === hero.uid || this.armedCaster === hero.uid;
      const accent = ready ? COLORS.accent : COLORS.dim;

      const chip = this.add.container(SKILL_CHIP_X[index], SKILL_CHIP_Y);
      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x1b2c3a : ready ? 0x152434 : 0x101722, 0.96);
      bg.fillRoundedRect(-42, -19, 84, 38, 10);
      bg.lineStyle(selected ? 2 : 1, selected ? COLORS.violet : ready ? COLORS.accent : COLORS.border, ready || selected ? 0.9 : 0.5);
      bg.strokeRoundedRect(-42, -19, 84, 38, 10);
      if (ready) {
        bg.fillStyle(COLORS.accent, 0.9);
        bg.fillCircle(36, -13, 2.5);
      }

      const top = label(this, 0, -12, `${ARCHETYPE_EMOJI[hero.archetype]} ${hero.archetype}`, 8, ready ? COLORS.text : COLORS.dim, 'bold').setOrigin(0.5);
      const bottom = label(
        this,
        0,
        1,
        `${truncate(hero.skill.name, 12)} · ${hero.skill.mana}`,
        7,
        accent,
      ).setOrigin(0.5);

      chip.add([bg, top, bottom]);
      chip.setSize(84, 38);
      addTouchTarget(chip, this, 84, 38, { onUp: () => this.onSkillChip(hero.uid) });
      this.skillLayer.add(chip);

      const card = this.ownCards[index];
      card?.setCasterGlow(this.pendingSkill === hero.uid || this.armedCaster === hero.uid);
    });
  }

  private syncTargetVisuals(): void {
    const view = this.view;
    if (!view?.battle) return;
    const active = this.isMyTurn();
    const targetUid = this.pendingTarget ?? this.defaultTargetUid();
    for (const card of this.enemyCards) card.setTargeted(active && card.uid === targetUid);
    this.drawArrow(active ? targetUid : null);
  }

  private drawArrow(targetUid: string | null): void {
    const g = this.arrowGfx;
    g.clear();
    if (!targetUid) return;
    const card = this.enemyCards.find((item) => item.uid === targetUid);
    if (!card) return;

    const startX = 195;
    const startY = 702;
    const endX = card.x;
    const endY = card.y + card.heightValue / 2 + 3;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const ux = dx / length;
    const uy = dy / length;
    const color = this.pendingTarget ? COLORS.gold : COLORS.accent;
    const alpha = this.pendingTarget ? 0.72 : 0.42;

    g.lineStyle(7, color, alpha * 0.14);
    g.lineBetween(startX, startY, endX, endY);
    g.lineStyle(2, color, alpha);
    const dash = 10;
    const gap = 6;
    for (let travelled = 22; travelled < length - 18; travelled += dash + gap) {
      const t0 = travelled;
      const t1 = Math.min(travelled + dash, length - 16);
      g.lineBetween(startX + ux * t0, startY + uy * t0, startX + ux * t1, startY + uy * t1);
    }

    const tipX = startX + ux * (length - 6);
    const tipY = startY + uy * (length - 6);
    const wing = 12;
    const angle = Math.atan2(uy, ux);
    g.lineStyle(3, color, Math.min(1, alpha * 1.4));
    g.lineBetween(tipX, tipY, tipX - Math.cos(angle - 0.42) * wing, tipY - Math.sin(angle - 0.42) * wing);
    g.lineBetween(tipX, tipY, tipX - Math.cos(angle + 0.42) * wing, tipY - Math.sin(angle + 0.42) * wing);

    g.fillStyle(color, alpha * 0.9);
    g.fillCircle(startX, startY, 4);
    g.lineStyle(1.5, color, alpha * 0.5);
    g.strokeCircle(startX, startY, 9);
  }

  private drawSelection(): void {
    const g = this.selectionGfx;
    g.clear();
    if (this.selectedCell === null) return;
    const { x, y } = this.cellCenter(this.selectedCell);
    g.fillStyle(COLORS.accent, 0.09);
    g.fillRoundedRect(x - 19, y - 19, 38, 38, 9);
    g.lineStyle(6, COLORS.accent, 0.16);
    g.strokeRoundedRect(x - 19, y - 19, 38, 38, 9);
    g.lineStyle(2, COLORS.accent, 0.95);
    g.strokeRoundedRect(x - 19, y - 19, 38, 38, 9);
  }

  // ── Tương tác ─────────────────────────────────────────────────────────

  private onCellDown(index: number, pointer: Phaser.Input.Pointer): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }
    if (this.busy) return;
    if (!this.view?.battle?.board[index]) return;
    this.pressIndex = index;
    this.pressX = pointer.x;
    this.pressY = pointer.y;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.pressIndex === null) return;
    const from = this.pressIndex;
    this.pressIndex = null;

    const dx = pointer.x - this.pressX;
    const dy = pointer.y - this.pressY;
    if (Math.hypot(dx, dy) > 14) {
      const target = this.directionTarget(from, dx, dy);
      if (target !== null) this.trySwap(from, target);
      return;
    }

    this.tapCell(from);
  }

  private directionTarget(from: number, dx: number, dy: number): number | null {
    const row = Math.floor(from / SIZE);
    const col = from % SIZE;
    let nextRow = row;
    let nextCol = col;
    if (Math.abs(dx) >= Math.abs(dy)) nextCol += dx > 0 ? 1 : -1;
    else nextRow += dy > 0 ? 1 : -1;
    if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) return null;
    return nextRow * SIZE + nextCol;
  }

  private tapCell(index: number): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }
    if (this.selectedCell === null) {
      this.selectedCell = index;
      this.drawSelection();
      this.updateInstruction();
      return;
    }
    if (this.selectedCell === index) {
      this.selectedCell = null;
      this.drawSelection();
      this.updateInstruction();
      return;
    }
    if (isAdjacent(this.selectedCell, index)) {
      const from = this.selectedCell;
      this.selectedCell = null;
      this.drawSelection();
      this.trySwap(from, index);
      return;
    }
    this.selectedCell = index;
    this.drawSelection();
    this.updateInstruction();
  }

  private trySwap(from: number, to: number): void {
    if (this.busy || !this.isMyTurn()) return;
    const view = this.view;
    if (!view?.battle) return;
    const targetUid = this.pendingTarget ?? this.defaultTargetUid();
    if (!targetUid) {
      this.showToast('Không còn mục tiêu sống', COLORS.danger);
      return;
    }

    this.busy = true;
    this.selectedCell = null;
    this.tapCellFx(from, to);
    this.drawSelection();

    const skill = this.pendingSkill;
    if (skill && !gameClient.skill(skill, targetUid)) return this.failSwap();
    if (!gameClient.target(targetUid) || !gameClient.swap(from, to)) return this.failSwap();

    this.skillSpent = this.skillSpent || skill !== null;
    this.pendingSkill = null;
    this.armedCaster = null;
    this.updateInstruction();
    // busy được mở lại khi server trả state (hoặc sau 3s nếu mất mạng).
    this.time.delayedCall(3_000, () => {
      if (!this.disposed) this.busy = false;
    });
  }

  /** Nhấn nhá nhẹ 2 ô vừa chọn. */
  private tapCellFx(from: number, to: number): void {
    for (const index of [from, to]) {
      const slot = this.gems[index];
      if (!slot) continue;
      this.tweens.add({
        targets: slot.container,
        scale: { from: 1.12, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      });
    }
  }

  private failSwap(): void {
    this.busy = false;
    this.updateInstruction();
    this.showToast('Chưa kết nối server', COLORS.danger);
  }

  private selectTarget(uid: string): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }
    const hero = this.heroOf(uid);
    if (!hero || !hero.alive) {
      this.showToast('Mục tiêu đã gục', COLORS.muted);
      return;
    }
    this.pendingTarget = uid;
    this.syncTargetVisuals();
    this.updateInstruction();
    this.showToast(`Mục tiêu: ${hero.archetype}`, COLORS.gold);
  }

  private onSkillChip(uid: string): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }
    const state = this.heroOf(uid);
    if (!state) return;
    if (this.skillSpent) {
      this.showToast('Mỗi lượt chỉ dùng 1 chiêu', COLORS.gold);
      return;
    }
    if (!state.alive) return;
    if (state.cd > 0) {
      this.showToast(`${state.skill.name} còn hồi ${state.cd} lượt`, COLORS.gold);
      return;
    }
    if ((this.view?.battle?.sides[this.view.you].mana ?? 0) < state.skill.mana) {
      this.showToast(`Cần ${state.skill.mana} mana`, COLORS.gold);
      return;
    }
    this.armedCaster = uid;
    this.pendingSkill = null;
    this.renderCurrentSkills();
    this.updateInstruction();
  }

  private selectCaster(uid: string): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }

    if (this.armedCaster) {
      this.armSkill(uid);
      return;
    }

    const hero = this.heroOf(uid);
    if (!hero) return;
    const cost = hero.skill.mana;
    const status = !hero.alive ? 'đã gục' : hero.cd > 0 ? `hồi ${hero.cd} lượt` : `${cost} mana`;
    this.showToast(`${hero.archetype}: ${hero.skill.name} · ${status}`, COLORS.violet);
  }

  private armSkill(uid: string): void {
    const view = this.view;
    if (!view?.battle) return;
    const hero = this.heroOf(uid);
    if (!hero || !hero.alive) return;
    if (this.skillSpent) {
      this.showToast('Mỗi lượt chỉ dùng 1 chiêu', COLORS.gold);
      return;
    }
    if (hero.cd > 0) {
      this.showToast(`Chiêu còn hồi ${hero.cd} lượt`, COLORS.gold);
      return;
    }
    if (view.battle.sides[view.you].mana < hero.skill.mana) {
      this.showToast(`Cần ${hero.skill.mana} mana`, COLORS.gold);
      return;
    }

    this.pendingSkill = uid;
    this.armedCaster = null;
    if (TARGETED_SKILLS.has(hero.archetype) && !this.pendingTarget) {
      this.pendingTarget = this.defaultTargetUid();
    }
    this.renderCurrentSkills();
    this.syncTargetVisuals();
    this.updateInstruction();
  }

  private renderCurrentSkills(): void {
    const view = this.view;
    if (!view?.battle) return;
    this.renderSkills(view.battle, view.you);
  }

  private requestExit(): void {
    if (!this.exitArmed) {
      this.exitArmed = true;
      this.exitText.setText('CHẮC CHƯA?');
      this.exitText.setColor(hex(COLORS.danger));
      this.time.delayedCall(2_500, () => {
        if (this.disposed) return;
        this.exitArmed = false;
        this.exitText.setText('THOÁT');
        this.exitText.setColor(hex(COLORS.dim));
      });
      return;
    }
    this.leaveToLobby();
  }

  private leaveToLobby(): void {
    gameClient.leaveMatch();
    matchStore.clear();
    matchStore.pushEvent('Đã trở về sàn đấu.');
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private isMyTurn(): boolean {
    const view = this.view;
    if (!view?.battle || view.phase !== 'battle') return false;
    return view.battle.active === view.you;
  }

  private heroOf(uid: string): HeroView | null {
    const view = this.view;
    if (!view?.battle) return null;
    return view.battle.sides[view.you].heroes.find((hero) => hero.uid === uid)
      ?? view.battle.sides[otherSide(view.you)].heroes.find((hero) => hero.uid === uid)
      ?? null;
  }

  private defaultTargetUid(): string | null {
    const view = this.view;
    if (!view?.battle) return null;
    const enemies = view.battle.sides[otherSide(view.you)].heroes;
    return enemies.find((hero) => hero.alive)?.uid ?? null;
  }

  private skillUsable(hero: HeroView, mana: number): boolean {
    return hero.alive && hero.cd === 0 && mana >= hero.skill.mana;
  }

  private cellCenter(index: number): { x: number; y: number } {
    const col = index % SIZE;
    const row = Math.floor(index / SIZE);
    return {
      x: BOARD_X + col * CELL + CELL / 2,
      y: BOARD_Y + row * CELL + CELL / 2,
    };
  }

  private updateInstruction(): void {
    let text: string;
    if (!this.view?.battle) {
      text = 'Đang tải trận đấu…';
    } else if (!this.isMyTurn()) {
      text = 'Đang chờ đối thủ xếp ngọc…';
    } else if (this.armedCaster) {
      text = 'Chạm tướng của bạn để chọn chiêu.';
    } else if (this.pendingSkill) {
      const hero = this.heroOf(this.pendingSkill);
      const target = this.pendingTarget ? this.heroOf(this.pendingTarget) : null;
      text = hero
        ? `${hero.skill.name} sẵn sàng${target ? ` → ${target.archetype}` : ''} · xếp ngọc để tung.`
        : 'Xếp ngọc để tung chiêu.';
    } else if (this.selectedCell !== null) {
      text = 'Chạm 1 ngọc kề cạnh để đổi chỗ.';
    } else {
      text = 'Chạm 2 ngọc kề nhau (hoặc kéo) để đổi.';
    }
    this.instructionText.setText(text);
    this.instructionText.setColor(hex(this.isMyTurn() ? COLORS.accent : COLORS.dim));
  }

  private renderLog(): void {
    const lines = matchStore.events.slice(-3).map((event) => `› ${truncate(event, 76)}`);
    this.logText.setText(lines.length > 0 ? lines.join('\n') : '› Trận đấu bắt đầu.');
  }

  private showToast(message: string, color: number): void {
    if (this.toastText) this.toastText.destroy();
    const toast = label(this, 195, 350, message, 10, color, 'bold')
      .setOrigin(0.5)
      .setDepth(60)
      .setBackgroundColor('#0b101aee')
      .setPadding(9, 6, 9, 6);
    this.toastText = toast;
    this.tweens.add({
      targets: toast,
      y: 332,
      alpha: { from: 1, to: 0 },
      delay: 1_000,
      duration: 600,
      onComplete: () => {
        toast.destroy();
        if (this.toastText === toast) this.toastText = null;
      },
    });
  }

  // ── Kết quả ───────────────────────────────────────────────────────────

  private showResult(view: MatchView): void {
    if (this.resultOverlay) return;

    const winner = view.winner ?? matchStore.end?.winner ?? 'draw';
    const rank = view.rank ?? matchStore.end?.rank ?? null;
    const won = winner === view.you;
    const draw = winner === 'draw';

    const overlay = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x03050a, 0.86).setInteractive();
    const backdrop = this.add.graphics();
    paintPanel(backdrop, 28, 236, 334, 372, {
      fill: COLORS.panel,
      fillAlpha: 0.99,
      border: draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger,
      borderAlpha: 0.6,
      glow: draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger,
      glowAlpha: 0.18,
      radius: 22,
    });

    const kicker = label(this, 195, 264, won ? 'KẾT QUẢ TRẬN ĐẤU' : draw ? 'CÂN TÀI CÂN SỨC' : 'KẾT QUẢ TRẬN ĐẤU', 8, COLORS.dim, 'bold')
      .setOrigin(0.5, 0)
      .setLetterSpacing(1.6);

    const title = label(this, 195, 288, draw ? 'HOÀ' : won ? 'CHIẾN THẮNG' : 'THẤT BẠI', 32, draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger, 'bold')
      .setOrigin(0.5, 0)
      .setLetterSpacing(2)
      .setShadow(0, 0, won ? '#5eead4' : draw ? '#fbbf24' : '#f87171', 12, true, true);

    const subtitle = label(
      this,
      195,
      336,
      draw
        ? 'Không ai mất điểm rank trong trận này.'
        : won
          ? view.mode === 'bot'
            ? 'Bạn đã hạ gục đội hình bot.'
            : 'Bạn đã hạ gục toàn bộ đội hình đối thủ.'
          : view.mode === 'bot'
            ? 'Bot đã thắng trận luyện tập này.'
            : 'Đối thủ đã hạ gục đội hình của bạn.',
      10,
      COLORS.muted,
    ).setOrigin(0.5, 0);
    subtitle.setWordWrapWidth(280);
    subtitle.setAlign('center');

    const box = this.add.graphics();
    box.fillStyle(COLORS.bgDeep, 0.7);
    box.fillRoundedRect(62, 370, 266, 88, 14);
    box.lineStyle(1, COLORS.border, 0.8);
    box.strokeRoundedRect(62, 370, 266, 88, 14);

    const delta = rank?.delta ?? 0;
    const deltaColor = delta > 0 ? COLORS.success : delta < 0 ? COLORS.danger : COLORS.muted;
    const deltaText = label(this, 195, 382, `${delta > 0 ? '+' : ''}${delta}`, 26, deltaColor, 'bold').setOrigin(0.5, 0);
    const deltaLabel = label(this, 195, 414, 'ĐIỂM RANK', 8, COLORS.dim, 'bold').setOrigin(0.5, 0).setLetterSpacing(1.4);

    const points = label(
      this,
      195,
      428,
      rank ? `${formatInt(rank.points)} điểm` : 'Chưa có dữ liệu rank',
      9,
      COLORS.muted,
    ).setOrigin(0.5, 0);

    const info = label(
      this,
      195,
      486,
      `TRẬN ${view.mode === 'bot' ? 'LUYỆN TẬP' : 'PVP'} · ${shortAddress(view.matchId)}`,
      8,
      COLORS.dim,
    )
      .setOrigin(0.5, 0)
      .setLetterSpacing(0.6);

    const button = new Button(this, 195, 552, 270, 42, 'VỀ SÀN ĐẤU', 'primary', () => this.leaveToLobby(), 12);

    overlay.add([dim, backdrop, kicker, title, subtitle, box, deltaText, deltaLabel, points, info, button]);
    this.resultOverlay = overlay;

    overlay.setAlpha(0);
    overlay.y = 14;
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      y: 0,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    this.cameras.main.flash(180, 94, 234, 212, false);
  }
}

function isAdjacent(from: number, to: number): boolean {
  const fromRow = Math.floor(from / SIZE);
  const fromCol = from % SIZE;
  const toRow = Math.floor(to / SIZE);
  const toCol = to % SIZE;
  return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) === 1;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
