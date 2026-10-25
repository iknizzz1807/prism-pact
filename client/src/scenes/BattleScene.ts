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
import { divider, drawBackdrop, paintPanel, panel } from '../ui/panel';
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

const BOARD_X = 424;
const BOARD_Y = 116;
const CELL = 54;
const SIZE = CONFIG.BOARD_SIZE;

const SKILL_CHIP_X = [500, 640, 780] as const;
const SKILL_CHIP_Y = 648;

interface GemSlot {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  glyph: Phaser.GameObjects.Text;
  type: GemType | null;
  special: Special | null;
}

const TARGETED_SKILLS: ReadonlySet<string> = new Set([
  'Burst',
  'Controller',
  'Debuffer',
  'Bruiser',
  'Executioner',
  'Sniper',
  'Pyromancer',
]);

export class BattleScene extends Phaser.Scene {
  private instructionText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private timer!: Countdown;
  private skillLayer!: Phaser.GameObjects.Container;
  private selectionGfx!: Phaser.GameObjects.Graphics;
  private arrowGfx!: Phaser.GameObjects.Graphics;
  private exitButton!: Button;

  private enemyCards: BattleHeroCard[] = [];
  private ownCards: BattleHeroCard[] = [];
  private enemyManaBar!: StatBar;
  private ownManaBar!: StatBar;
  private enemyManaText!: Phaser.GameObjects.Text;
  private ownManaText!: Phaser.GameObjects.Text;
  private ownThrallText!: Phaser.GameObjects.Text;
  private enemyThrallText!: Phaser.GameObjects.Text;
  private gems: GemSlot[] = [];

  private view: MatchView | null = null;
  private selectedCell: number | null = null;
  private linkGfx!: Phaser.GameObjects.Graphics;
  private turnFrame!: Phaser.GameObjects.Graphics;
  private turnPill!: Phaser.GameObjects.Graphics;
  private turnPillText!: Phaser.GameObjects.Text;
  private turnPulse: Phaser.Tweens.Tween | null = null;
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
  private entered = false;
  private disposed = false;

  private readonly unsubs: Array<() => void> = [];

  constructor() {
    super('Battle');
  }

  create(): void {
    this.cameras.main.fadeIn(360, 4, 6, 12);
    drawBackdrop(this);
    this.drawLayoutPanels();
    this.drawManaBars();
    this.drawBoardFrame();
    this.drawSkillBar();
    this.drawLogPanel();

    this.skillLayer = this.add.container(0, 0);
    this.selectionGfx = this.add.graphics().setDepth(15);
    this.arrowGfx = this.add.graphics().setDepth(18);
    this.linkGfx = this.add.graphics().setDepth(24);

    this.input.on('pointerup', this.onPointerUp, this);

    this.unsubs.push(
      matchStore.subscribe(() => {
        const view = matchStore.view;
        if (!view?.battle) return;
        if (this.animating) return;
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

  // ── Khung bố cục PC (1280x720) ─────────────────────────────────────────

  private drawLayoutPanels(): void {
    // Left: Đội của bạn (Ally)
    panel(this, 24, 16, 360, 688, { glow: COLORS.accent, glowAlpha: 0.06 });
    label(this, 44, 28, 'ĐỘI CỦA BẠN (ALLY)', 14, COLORS.accent, 'bold').setLetterSpacing(1.2);

    // Center: Bàn cờ Match-3
    panel(this, 404, 16, 472, 688, { fill: COLORS.panelAlt, fillAlpha: 0.55 });

    // Right: Đội đối thủ (Enemy) & Combat Log
    panel(this, 896, 16, 360, 688, { glow: COLORS.enemy, glowAlpha: 0.06 });
    label(this, 916, 28, 'ĐỘI ĐỐI THỦ (ENEMY) · LIVE', 14, COLORS.enemy, 'bold').setLetterSpacing(1.2);
  }

  private drawManaBars(): void {
    // Ally Mana Bar
    panel(this, 40, 50, 328, 48, { fill: COLORS.bgDeep, fillAlpha: 0.9, radius: 10 });
    label(this, 54, 56, '💧 BỂ MANA TOÀN ĐỘI', 11, COLORS.accent, 'bold');
    this.ownManaBar = new StatBar(this, 54, 76, 230, 12, COLORS.accent);
    this.add.existing(this.ownManaBar);
    this.ownManaText = label(this, 354, 72, '0/100', 13, COLORS.accent, 'bold').setOrigin(1, 0);

    // Enemy Mana Bar
    panel(this, 912, 50, 328, 48, { fill: COLORS.bgDeep, fillAlpha: 0.9, radius: 10 });
    label(this, 926, 56, '💧 MANA ĐỐI THỦ', 11, COLORS.enemy, 'bold');
    this.enemyManaBar = new StatBar(this, 926, 76, 230, 12, COLORS.enemy);
    this.add.existing(this.enemyManaBar);
    this.enemyManaText = label(this, 1226, 72, '0/100', 13, COLORS.enemy, 'bold').setOrigin(1, 0);

    this.ownThrallText = label(this, 54, 100, '', 11, COLORS.accent, 'bold');
    this.enemyThrallText = label(this, 926, 100, '', 11, COLORS.enemy, 'bold');
  }

  private drawBoardFrame(): void {
    // Khung ngoài bàn cờ
    panel(this, 412, 104, 456, 456, {
      fill: 0x070c16,
      fillAlpha: 0.96,
      border: COLORS.border,
      borderAlpha: 0.8,
      radius: 16,
    });
    this.turnFrame = this.add.graphics().setDepth(1);

    // Turn Banner phía trên bàn cờ
    this.turnPill = this.add.graphics();
    this.turnPillText = label(this, 640, 38, '', 14, COLORS.accent, 'bold')
      .setOrigin(0.5, 0.5)
      .setLetterSpacing(0.8);

    this.turnPulse = this.tweens.add({
      targets: this.turnPillText,
      alpha: { from: 1, to: 0.4 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    this.turnText = label(this, 860, 78, 'LƯỢT 1', 12, COLORS.muted, 'bold').setOrigin(1, 0.5);

    // Timer ở giữa thanh trên
    this.timer = new Countdown(this, 436, 78, 20);
    this.add.existing(this.timer);

    // Lưới ô cờ
    const grid = this.add.graphics();
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const col = index % SIZE;
      const row = Math.floor(index / SIZE);
      const x = BOARD_X + col * CELL;
      const y = BOARD_Y + row * CELL;
      grid.fillStyle((row + col) % 2 === 0 ? 0x0a1220 : 0x0e172a, 0.95);
      grid.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      grid.lineStyle(1, 0x1c2b44, 0.65);
      grid.strokeRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
    }

    // Các viên ngọc
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const col = index % SIZE;
      const row = Math.floor(index / SIZE);
      const cx = BOARD_X + col * CELL + CELL / 2;
      const cy = BOARD_Y + row * CELL + CELL / 2;

      const container = this.add.container(cx, cy);
      const graphics = this.add.graphics();
      const glyph = label(this, 14, -14, '', 12, COLORS.text, 'bold').setOrigin(0.5).setDepth(2);
      container.add([graphics, glyph]);
      container.setSize(CELL, CELL);
      addTouchTarget(container, this, CELL, CELL, {
        onDown: (pointer) => this.onCellDown(index, pointer),
      });

      this.gems.push({ container, graphics, glyph, type: null, special: null });
    }
  }

  private drawSkillBar(): void {
    // Instruction Banner dưới bàn cờ
    this.instructionText = label(
      this,
      640,
      584,
      'CHỌN MỤC TIÊU ĐỊCH → VUỐT 2 VIÊN NGỌC LIỀN KỀ ĐỂ TẤN CÔNG',
      13,
      COLORS.accent,
      'bold',
    ).setOrigin(0.5, 0.5);

    divider(this, 430, 608, 850);
  }

  private drawLogPanel(): void {
    // Nhật ký trận đấu góc dưới bên phải
    panel(this, 912, 474, 328, 214, { fill: COLORS.bgDeep, fillAlpha: 0.88, radius: 12 });
    label(this, 928, 488, 'NHẬT KÝ LƯỢT ĐÁNH', 12, COLORS.muted, 'bold').setLetterSpacing(1.2);
    label(this, 1224, 488, 'LIVE', 11, COLORS.accent, 'bold').setOrigin(1, 0);

    this.logText = this.add
      .text(928, 516, '', {
        ...textStyle(12, COLORS.muted),
        lineSpacing: 5,
        wordWrap: { width: 296, useAdvancedWrap: true },
      })
      .setResolution(Math.max(window.devicePixelRatio || 1, 2));

    this.exitButton = new Button(this, 1190, 656, 84, 30, 'THOÁT', 'ghost', () => this.requestExit(), 12);
    this.add.existing(this.exitButton);
  }

  /** Thanh lượt cố định phía trên bàn cờ. */
  private renderTurnPill(yourTurn: boolean, suddenDeath: boolean): void {
    const g = this.turnPill;
    if (!g) return;
    const color = suddenDeath ? COLORS.danger : yourTurn ? COLORS.accent : COLORS.enemy;

    g.clear();
    g.fillStyle(color, 0.16);
    g.fillRoundedRect(420, 22, 440, 34, 17);
    g.lineStyle(1.5, color, 0.65);
    g.strokeRoundedRect(420, 22, 440, 34, 17);

    this.turnPillText.setText(
      yourTurn ? '● LƯỢT CỦA BẠN — CHỌN MỤC TIÊU & XẾP NGỌC' : '● LƯỢT ĐỐI THỦ — ĐANG SUY NGHĨ & RA ĐÒN…',
    );
    this.turnPillText.setColor(hex(color));
    this.turnPillText.setAlpha(1);

    if (this.turnPulse) {
      this.turnPulse.paused = yourTurn;
      if (yourTurn) this.turnPillText.setAlpha(1);
    }
  }

  private ensureCards(view: MatchView): void {
    const battle = view.battle;
    if (!battle || this.enemyCards.length > 0) return;
    const you = view.you;
    const opponent = otherSide(you);

    // 3 Tướng địch xếp dọc bên phải
    battle.sides[opponent].heroes.forEach((hero, index) => {
      const options: BattleCardOptions = {
        width: 328,
        height: 110,
        variant: 'enemy',
        onClick: (uid) => this.selectTarget(uid),
      };
      const card = new BattleHeroCard(this, 1076, 170 + index * 122, hero, options);
      this.add.existing(card);
      this.enemyCards.push(card);
    });

    // 3 Tướng mình xếp dọc bên trái
    battle.sides[you].heroes.forEach((hero, index) => {
      const options: BattleCardOptions = {
        width: 328,
        height: 172,
        variant: 'ally',
        onClick: (uid) => this.selectCaster(uid),
      };
      const card = new BattleHeroCard(this, 204, 200 + index * 186, hero, options);
      this.add.existing(card);
      this.ownCards.push(card);
    });
  }

  // ── Phát lại animation một lượt (Cascade style) ────────────────────────

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

    this.timer.freeze();

    const enemyActing = anim.side !== view.you;
    this.renderTurnPill(!enemyActing, false);
    if (enemyActing) {
      showTurnNotice(this, 360, 'ĐỐI THỦ ĐANG RA ĐÒN', COLORS.enemy);
      await this.delay(600);
      if (this.disposed) return;
    }

    try {
      await this.animateSwapPair(anim.from, anim.to, anim.swapBoard);
      for (let i = 0; i < anim.waves.length; i += 1) {
        if (this.disposed) return;
        await this.animateWave(anim.waves[i]!, i, anim.side, anim.targetUid);
      }
    } catch {
      // Bỏ qua lỗi animation, đồng bộ trạng thái cuối
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

    this.renderSnapshot(swapBoard);
  }

  private renderSnapshot(board: Array<{ type: GemType; special: Special | null } | null>): void {
    for (let cell = 0; cell < SIZE * SIZE; cell += 1) {
      const slot = this.gems[cell];
      if (!slot) continue;
      const gem = board[cell];
      slot.container.setPosition(this.cellX(cell), this.cellY(cell)).setScale(1).setAlpha(1).setAngle(0);
      if (gem) {
        drawGem(slot.graphics, 38, gem.type, gem.special);
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
    if (index > 0) this.showCombo(index + 1);

    const bombs = wave.cleared.filter((cell) => this.gems[cell]?.special === 'BOMB');
    if (bombs.length > 0) {
      this.bombFlash(bombs);
    }

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

    // 3) Rơi: ô đích hiển thị đúng quân từ ô nguồn, ô nguồn để trống
    const destination = new Map<number, number>();
    for (const move of wave.moves) destination.set(move.to, move.from);
    const spawns = new Map(wave.spawned.map((spawn) => [spawn.index, spawn]));

    const falls: Promise<void>[] = [];

    for (const [to, from] of destination) {
      const slot = this.gems[to];
      if (!slot) continue;
      const source = before[from];
      if (source?.type) {
        drawGem(slot.graphics, 38, source.type, source.special);
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
        drawGem(slot.graphics, 38, gem.type, gem.special);
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

    for (const move of wave.moves) {
      const from = move.from;
      if (destination.has(from) || spawns.has(from) || cleared.includes(from)) continue;
      const slot = this.gems[from];
      if (slot) {
        this.clearGem(slot);
        slot.container.setScale(1).setAlpha(1).setAngle(0);
      }
    }

    for (const cell of cleared) {
      const slot = this.gems[cell];
      if (!slot || destination.has(cell) || spawns.has(cell)) continue;
      this.clearGem(slot);
    }

    if (falls.length > 0) await Promise.all(falls);

    // 4b) Ngọc bay tới đích giải thích hiệu ứng
    this.flyGemEffects(wave, before, side, targetUid);

    // 4) Chốt lại đúng board của wave
    for (let cell = 0; cell < SIZE * SIZE; cell += 1) {
      const slot = this.gems[cell];
      if (!slot) continue;
      slot.container.setPosition(this.cellX(cell), this.cellY(cell)).setScale(1).setAlpha(1).setAngle(0);
      const gem = wave.board[cell];
      if (gem) {
        drawGem(slot.graphics, 38, gem.type, gem.special);
        slot.glyph.setText(specialGlyph(gem.special));
        slot.type = gem.type;
        slot.special = gem.special;
      } else {
        this.clearGem(slot);
      }
    }

    // 5) Ngọc đặc biệt vừa tạo: bật nảy
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
    // Không rung lắc màn hình ở combo để mắt thoải mái, không gây nhức đầu
    if (combo >= 3) {
      this.cameras.main.flash(90, 255, 230, 160, false);
    }

    const fontSize = Math.min(36 + combo * 4, 54);
    const text = label(this, 640, 360, `COMBO ×${combo}`, fontSize, COLORS.gold, 'bold')
      .setOrigin(0.5)
      .setDepth(55)
      .setStroke('#030712', 6)
      .setShadow(0, 0, '#fbbf24', 28, true, true)
      .setScale(0.3)
      .setAlpha(0);

    this.burst(640, 360, COLORS.gold, 18);

    this.tweens.add({
      targets: text,
      scale: 1.35,
      alpha: 1,
      duration: 160,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 420,
      onComplete: () => text.destroy(),
    });
  }

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
    const manaPos = actingAlly ? { x: 200, y: 76 } : { x: 1076, y: 76 };

    const targetCard = targetUid
      ? [...this.enemyCards, ...this.ownCards].find((card) => card.uid === targetUid)
      : null;

    this.flyOrbs(byType.ATK, COLORS.atk, () =>
      targetCard ? { x: targetCard.x, y: targetCard.y } : { x: 1076, y: 250 },
    );

    const allyPos = (i: number) => {
      const card = allyCards[i % Math.max(1, allyCards.length)];
      return card ? { x: card.x, y: card.y } : null;
    };

    this.flyOrbs(byType.HP, COLORS.hp, allyPos);
    this.flyOrbs(byType.SHIELD, COLORS.shield, allyPos);
    this.flyOrbs(byType.MANA, COLORS.mana, () => manaPos);
  }

  /**
   * Hiệu ứng bụi tiên (fairy dust stream) bay về card hoặc thanh mana:
   * Không dùng quả cầu to đùng, mà là chùm hạt bụi nhỏ (2.2px - 3.8px) dày đặc lấp lánh,
   * uốn lượn theo đường cong bezier mềm mại và rải bụi li ti trên đường bay.
   */
  private flyOrbs(
    cells: number[],
    color: number,
    dest: (index: number) => { x: number; y: number } | null,
  ): void {
    if (cells.length === 0) return;
    const limit = Math.min(cells.length, 10);
    const MOTES_PER_CELL = 5;

    for (let i = 0; i < limit; i += 1) {
      const cell = cells[i]!;
      const to = dest(i);
      if (!to) continue;

      const originX = this.cellX(cell);
      const originY = this.cellY(cell);

      for (let m = 0; m < MOTES_PER_CELL; m += 1) {
        // Tản hạt tự nhiên quanh tâm ô ngọc vừa nổ
        const startX = originX + Phaser.Math.Between(-8, 8);
        const startY = originY + Phaser.Math.Between(-8, 8);

        // Quỹ đạo cong bezier uốn lượn riêng biệt tạo thành luồng bụi tiên dày
        const midX = (startX + to.x) / 2 + Phaser.Math.Between(-45, 45);
        const midY = Math.min(startY, to.y) - Phaser.Math.Between(30, 85);
        const endX = to.x + Phaser.Math.Between(-10, 10);
        const endY = to.y + Phaser.Math.Between(-10, 10);

        // Hạt bụi tiên nhỏ (2.2px - 3.8px) phát sáng màu đặc trưng
        const radius = Phaser.Math.FloatBetween(2.2, 3.8);
        const mote = this.add
          .circle(startX, startY, radius, color, Phaser.Math.FloatBetween(0.85, 1))
          .setDepth(31);

        // Lõi trắng lấp lánh nhỏ trên các hạt lẻ
        const core =
          m % 2 === 0
            ? this.add.circle(startX, startY, radius * 0.45, 0xffffff, 0.95).setDepth(32)
            : null;

        const delayMs = i * 26 + m * 16;
        const duration = Phaser.Math.Between(340, 420);
        const tracker = { t: 0 };

        this.tweens.add({
          targets: tracker,
          t: 1,
          delay: delayMs,
          duration,
          ease: 'Cubic.easeIn',
          onUpdate: () => {
            const t = tracker.t;
            const currX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
            const currY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
            mote.setPosition(currX, currY);
            if (core) core.setPosition(currX, currY);

            // Bụi li ti lấp lánh rơi rải rác dọc theo dòng chảy
            if (Math.random() < 0.45) {
              const trail = this.add
                .circle(
                  currX + Phaser.Math.FloatBetween(-3, 3),
                  currY + Phaser.Math.FloatBetween(-3, 3),
                  Phaser.Math.FloatBetween(1.2, 2.2),
                  color,
                  0.75,
                )
                .setDepth(30);
              this.tweens.add({
                targets: trail,
                alpha: 0,
                scale: 0.2,
                duration: 160,
                ease: 'Quad.easeOut',
                onComplete: () => trail.destroy(),
              });
            }
          },
          onComplete: () => {
            mote.destroy();
            if (core) core.destroy();

            // Rắc tia lửa bụi tiên li ti khi chạm đích
            const sparkCount = Phaser.Math.Between(2, 4);
            for (let s = 0; s < sparkCount; s += 1) {
              const angle = Math.random() * Math.PI * 2;
              const dist = Phaser.Math.Between(6, 18);
              const spark = this.add
                .circle(
                  endX,
                  endY,
                  Phaser.Math.FloatBetween(1.5, 2.6),
                  s === 0 ? 0xffffff : color,
                  0.9,
                )
                .setDepth(33);
              this.tweens.add({
                targets: spark,
                x: endX + Math.cos(angle) * dist,
                y: endY + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.1,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => spark.destroy(),
              });
            }

            // Hạt cuối cùng trong cụm chạm đích -> gợn sóng hấp thụ êm ái
            if (m === MOTES_PER_CELL - 1) {
              const pulse = this.add.circle(to.x, to.y, 8).setStrokeStyle(2.5, color, 0.85).setDepth(32);
              this.tweens.add({
                targets: pulse,
                scale: 2.2,
                alpha: 0,
                duration: 220,
                ease: 'Quad.easeOut',
                onComplete: () => pulse.destroy(),
              });
            }
          },
        });
      }
    }
  }

  private flashCard(uid: string): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;

    // Flash cường độ cao: phủ trắng chớp nhanh + viền đỏ rực rỡ
    const flashGfx = this.add.graphics().setDepth(29);
    flashGfx.fillStyle(0xffffff, 0.85);
    flashGfx.fillRoundedRect(card.x - card.widthValue / 2, card.y - card.heightValue / 2, card.widthValue, card.heightValue, 12);
    flashGfx.lineStyle(4, COLORS.danger, 1);
    flashGfx.strokeRoundedRect(card.x - card.widthValue / 2 - 2, card.y - card.heightValue / 2 - 2, card.widthValue + 4, card.heightValue + 4, 14);

    this.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => flashGfx.destroy(),
    });
  }

  private bombFlash(cells: number[]): void {
    // Chớp toàn màn hình và giật mạnh khi bom nổ
    this.cameras.main.flash(140, 255, 230, 160, false);
    this.cameras.main.shake(250, 0.018);

    for (const cell of cells) {
      const cx = this.cellX(cell);
      const cy = this.cellY(cell);
      this.burst(cx, cy, COLORS.gold, 22);

      const coreFlash = this.add.circle(cx, cy, 32, 0xffffff, 0.95).setDepth(27);
      this.tweens.add({
        targets: coreFlash,
        scale: 2.8,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => coreFlash.destroy(),
      });

      const ring = this.add
        .circle(cx, cy, 26)
        .setStrokeStyle(6, COLORS.gold, 1)
        .setDepth(28);
      this.tweens.add({
        targets: ring,
        scale: 4.8,
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

    const cx = this.cellX(index);
    const cy = this.cellY(index);

    if (slot.type) {
      this.burst(cx, cy, this.gemColor(slot.type), 14);
      // Sóng xung kích bung tròn tại vị trí ngọc nổ
      const popRing = this.add.circle(cx, cy, 10).setStrokeStyle(3.5, this.gemColor(slot.type), 0.95).setDepth(26);
      this.tweens.add({
        targets: popRing,
        scale: 2.8,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => popRing.destroy(),
      });
    }

    // Nảy to lên rồi co vụn xoay biến mất
    return this.tweenAsync({
      targets: slot.container,
      scale: 1.25,
      duration: 50,
      ease: 'Quad.easeOut',
    }).then(() =>
      this.tweenAsync({
        targets: slot.container,
        scale: 0.08,
        alpha: 0,
        angle: Phaser.Math.Between(-35, 35),
        duration: 160,
        ease: 'Cubic.easeIn',
      }),
    ).then(() => {
      slot.container.setScale(1).setAlpha(1).setAngle(0);
      this.clearGem(slot);
    });
  }

  private burst(x: number, y: number, color: number, count = 14): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(22, 56);
      const r = Phaser.Math.Between(3, 6.5);
      const dotColor = i % 3 === 0 ? 0xffffff : color;
      const dot = this.add.circle(x, y, r, dotColor, 1).setDepth(27);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(320, 500),
        ease: 'Cubic.easeOut',
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

      path(26, 0.45);
      path(12, 0.85);
      g.lineStyle(4, 0xffffff, 1);
      g.beginPath();
      const first = run.cells[0]!;
      g.moveTo(this.cellX(first), this.cellY(first));
      for (let i = 1; i < run.cells.length; i += 1) {
        const index = run.cells[i]!;
        g.lineTo(this.cellX(index), this.cellY(index));
      }
      g.strokePath();
    }
  }

  /** Viền bàn cờ đổi màu theo lượt: xanh = bạn, đỏ = đối thủ. */
  private renderTurnFrame(yourTurn: boolean, suddenDeath: boolean): void {
    const g = this.turnFrame;
    if (!g) return;
    g.clear();
    const color = suddenDeath ? COLORS.danger : yourTurn ? COLORS.accent : COLORS.enemy;
    g.lineStyle(12, color, yourTurn ? 0.12 : 0.07);
    g.strokeRoundedRect(412, 104, 456, 456, 16);
    g.lineStyle(2, color, yourTurn ? 0.9 : 0.5);
    g.strokeRoundedRect(412, 104, 456, 456, 16);
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

    if (!this.entered) {
      this.entered = true;
      showTurnNotice(
        this,
        360,
        yourTurn ? 'VÒNG 1 · BẮT ĐẦU — LƯỢT CỦA BẠN' : 'VÒNG 1 · BẮT ĐẦU — LƯỢT ĐỐI THỦ',
        yourTurn ? COLORS.accent : COLORS.enemy,
      );
    } else if (turnChanged) {
      showTurnNotice(
        this,
        360,
        yourTurn ? 'LƯỢT CỦA BẠN — CHỌN MỤC TIÊU' : 'LƯỢT ĐỐI THỦ ĐANG RA ĐÒN',
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

    const yourThrall = battle.sides[you].thrall;
    const enemyThrall = battle.sides[opponent].thrall;
    this.ownThrallText.setText(
      yourThrall?.alive ? `💀 Thrall ${yourThrall.hp}/${yourThrall.maxHp}` : '',
    );
    this.enemyThrallText.setText(
      enemyThrall?.alive ? `💀 Thrall ${enemyThrall.hp}/${enemyThrall.maxHp}` : '',
    );
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
          // Rung lắc màn hình theo mức độ sát thương
          const shakePower = Math.min(0.008 + Math.abs(hpDelta) / 3000, 0.020);
          this.cameras.main.shake(160, shakePower);
        } else if (hpDelta > 0.5) {
          this.floatingOnHero(hero.uid, `+${Math.round(hpDelta)}`, COLORS.success);
        }

        const shieldDelta = hero.shield - previous.shield;
        if (shieldDelta > 0.5) this.floatingOnHero(hero.uid, `+${Math.round(shieldDelta)} giáp`, COLORS.shield);
        if (previous.alive && !hero.alive) {
          this.floatingOnHero(hero.uid, '☠ HẠ GỤC', COLORS.danger, 26);
          // Rung giật cực mạnh & chớp đỏ khi hạ gục một tướng
          this.cameras.main.shake(260, 0.022);
          this.cameras.main.flash(140, 248, 113, 113, false);
        }
      }
      next.set(hero.uid, { hp: hero.hp, shield: hero.shield, alive: hero.alive });
    }

    this.previousHeroes = next;
  }

  private shakeCard(uid: string): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;
    const baseX = card.x;
    const baseY = card.y;
    this.tweens.killTweensOf(card);
    card.x = baseX - 10;
    card.setScale(0.93);
    this.tweens.add({
      targets: card,
      x: baseX + 10,
      scale: 1,
      duration: 38,
      yoyo: true,
      repeat: 3,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        card.x = baseX;
        card.y = baseY;
        card.setScale(1);
      },
    });
  }

  private floatingOnHero(uid: string, text: string, color: number, size = 18): void {
    const card = [...this.enemyCards, ...this.ownCards].find((item) => item.uid === uid);
    if (!card) return;
    const x = card.x + Phaser.Math.Between(-24, 24);
    const y = card.y + card.heightValue / 2 - 28;
    const isBig = text.includes('HẠ GỤC') || text.length > 5;
    const actualSize = isBig ? Math.max(size, 24) : Math.max(size, 20);

    const float = label(this, x, y, text, actualSize, color, 'bold')
      .setOrigin(0.5)
      .setDepth(45)
      .setStroke('#050811', 4)
      .setShadow(0, 0, hex(color), 16, true, true)
      .setScale(1.6);

    this.tweens.add({
      targets: float,
      scale: 1.0,
      duration: 90,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: float,
          y: y - 56,
          alpha: { from: 1, to: 0 },
          duration: 850,
          ease: 'Cubic.easeOut',
          onComplete: () => float.destroy(),
        });
      },
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

      drawGem(slot.graphics, 38, cell.type, cell.special);
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
      const cost = this.skillCost(hero);
      const selected = this.pendingSkill === hero.uid || this.armedCaster === hero.uid;
      const accent = ready ? COLORS.accent : COLORS.dim;

      const chip = this.add.container(SKILL_CHIP_X[index], SKILL_CHIP_Y);
      const bg = this.add.graphics();
      bg.fillStyle(selected ? 0x192b3a : ready ? 0x152332 : 0x0f1622, 0.96);
      bg.fillRoundedRect(-64, -22, 128, 44, 10);
      bg.lineStyle(
        selected ? 2 : 1.5,
        selected ? COLORS.violet : ready ? COLORS.accent : COLORS.border,
        ready || selected ? 0.95 : 0.45,
      );
      bg.strokeRoundedRect(-64, -22, 128, 44, 10);

      if (ready) {
        bg.fillStyle(COLORS.accent, 0.95);
        bg.fillCircle(54, -14, 3.5);
      }

      const emoji = ARCHETYPE_EMOJI[hero.archetype];
      const top = label(this, 0, -12, `${emoji} ${hero.archetype}`, 12, ready ? COLORS.text : COLORS.dim, 'bold').setOrigin(0.5);
      const bottom = label(
        this,
        0,
        5,
        `${truncate(hero.skill.name, 11)} (${cost}💧)`,
        11,
        accent,
        'bold',
      ).setOrigin(0.5);

      chip.add([bg, top, bottom]);
      chip.setSize(128, 44);
      addTouchTarget(chip, this, 128, 44, { onUp: () => this.onSkillChip(hero.uid) });
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

    // Đường nối mục tiêu xuất phát từ mép phải bàn cờ hướng sang card địch
    const startX = BOARD_X + 8 * CELL + 4;
    const startY = 332;
    const endX = card.x - card.widthValue / 2;
    const endY = card.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const ux = dx / length;
    const uy = dy / length;
    const color = this.pendingTarget ? COLORS.gold : COLORS.accent;
    const alpha = this.pendingTarget ? 0.85 : 0.55;

    g.lineStyle(8, color, alpha * 0.16);
    g.lineBetween(startX, startY, endX, endY);
    g.lineStyle(2.5, color, alpha);
    const dash = 12;
    const gap = 8;
    for (let travelled = 10; travelled < length - 18; travelled += dash + gap) {
      const t0 = travelled;
      const t1 = Math.min(travelled + dash, length - 16);
      g.lineBetween(startX + ux * t0, startY + uy * t0, startX + ux * t1, startY + uy * t1);
    }

    const tipX = startX + ux * (length - 6);
    const tipY = startY + uy * (length - 6);
    const wing = 14;
    const angle = Math.atan2(uy, ux);
    g.lineStyle(3, color, Math.min(1, alpha * 1.4));
    g.lineBetween(tipX, tipY, tipX - Math.cos(angle - 0.45) * wing, tipY - Math.sin(angle - 0.45) * wing);
    g.lineBetween(tipX, tipY, tipX - Math.cos(angle + 0.45) * wing, tipY - Math.sin(angle + 0.45) * wing);

    g.fillStyle(color, alpha * 0.95);
    g.fillCircle(startX, startY, 5);
    g.lineStyle(2, color, alpha * 0.6);
    g.strokeCircle(startX, startY, 11);
  }

  private drawSelection(): void {
    const g = this.selectionGfx;
    g.clear();
    if (this.selectedCell === null) return;
    const { x, y } = this.cellCenter(this.selectedCell);
    g.fillStyle(COLORS.accent, 0.12);
    g.fillRoundedRect(x - 26, y - 26, 52, 52, 10);
    g.lineStyle(6, COLORS.accent, 0.2);
    g.strokeRoundedRect(x - 26, y - 26, 52, 52, 10);
    g.lineStyle(2.5, COLORS.accent, 0.95);
    g.strokeRoundedRect(x - 26, y - 26, 52, 52, 10);
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
    if (Math.hypot(dx, dy) > 16) {
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
    this.time.delayedCall(3_000, () => {
      if (!this.disposed) this.busy = false;
    });
  }

  private tapCellFx(from: number, to: number): void {
    for (const index of [from, to]) {
      const slot = this.gems[index];
      if (!slot) continue;
      this.tweens.add({
        targets: slot.container,
        scale: { from: 1.15, to: 1 },
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
    this.showToast(`🎯 Mục tiêu: ${hero.archetype}`, COLORS.gold);
  }

  private onSkillChip(uid: string): void {
    if (!this.isMyTurn()) {
      this.showToast('Chưa tới lượt của bạn', COLORS.gold);
      return;
    }
    const state = this.heroOf(uid);
    if (!state) return;
    if (this.skillSpent) {
      this.showToast('Mỗi lượt chỉ dùng tối đa 1 chiêu', COLORS.gold);
      return;
    }
    if (!state.alive) return;
    if (state.skill.once === true && state.onceUsed.includes(state.skill.id)) {
      this.showToast(`${state.skill.name} chỉ dùng 1 lần/trận`, COLORS.gold);
      return;
    }
    if (state.cd > 0) {
      this.showToast(`${state.skill.name} còn hồi ${state.cd} lượt`, COLORS.gold);
      return;
    }
    const cost = this.skillCost(state);
    if ((this.view?.battle?.sides[this.view.you].mana ?? 0) < cost) {
      this.showToast(`Cần ${cost} mana`, COLORS.gold);
      return;
    }
    this.armedCaster = uid;
    this.pendingSkill = uid;
    this.renderCurrentSkills();
    this.updateInstruction();
    this.showToast(`⚡ Đã kích hoạt ${state.skill.name} · Xếp ngọc để xuất chiêu`, COLORS.accent);
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
    const cost = this.skillCost(hero);
    const usedOnce = hero.skill.once === true && hero.onceUsed.includes(hero.skill.id);
    const status = !hero.alive
      ? 'đã gục'
      : usedOnce
        ? 'đã dùng 1 lần/trận'
        : hero.cd > 0
          ? `hồi ${hero.cd} lượt`
          : `${cost} mana`;
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
    if (hero.skill.once === true && hero.onceUsed.includes(hero.skill.id)) {
      this.showToast(`${hero.skill.name} chỉ dùng 1 lần/trận`, COLORS.gold);
      return;
    }
    if (hero.cd > 0) {
      this.showToast(`Chiêu còn hồi ${hero.cd} lượt`, COLORS.gold);
      return;
    }
    const cost = this.skillCost(hero);
    if (view.battle.sides[view.you].mana < cost) {
      this.showToast(`Cần ${cost} mana`, COLORS.gold);
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
    this.leaveToLobby();
  }

  private leaveToLobby(): void {
    gameClient.leaveMatch();
    matchStore.clear();
    matchStore.pushEvent('Đã trở về sảnh chính.');
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
    return (
      view.battle.sides[view.you].heroes.find((hero) => hero.uid === uid) ??
      view.battle.sides[otherSide(view.you)].heroes.find((hero) => hero.uid === uid) ??
      null
    );
  }

  private defaultTargetUid(): string | null {
    const view = this.view;
    if (!view?.battle) return null;
    const enemies = view.battle.sides[otherSide(view.you)].heroes;
    return enemies.find((hero) => hero.alive)?.uid ?? null;
  }

  private skillUsable(hero: HeroView, mana: number): boolean {
    const usedOnce = hero.skill.once === true && hero.onceUsed.includes(hero.skill.id);
    return hero.alive && !usedOnce && hero.cd === 0 && mana >= this.skillCost(hero);
  }

  private skillCost(hero: HeroView): number {
    const view = this.view;
    if (!view?.battle) return hero.skill.mana;
    const side = view.battle.sides[view.you];
    const chronoAlive = side.heroes.some((h) => h.alive && h.archetype === 'Chronarch');
    const discount = chronoAlive && !hero.firstSkillUsed ? 10 : 0;
    return Math.max(0, hero.skill.mana - discount + side.skillTax);
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
      text = 'Đang chờ đối thủ ra đòn…';
    } else if (this.armedCaster) {
      text = 'Chạm tướng để chuẩn bị chiêu thức.';
    } else if (this.pendingSkill) {
      const hero = this.heroOf(this.pendingSkill);
      const target = this.pendingTarget ? this.heroOf(this.pendingTarget) : null;
      text = hero
        ? `⚡ ${hero.skill.name} sẵn sàng${target ? ` → ${target.archetype}` : ''} · Hãy swap ngọc để tung chiêu!`
        : 'Hãy swap ngọc để tung chiêu!';
    } else if (this.selectedCell !== null) {
      text = 'Chạm 1 viên ngọc kề cạnh để đổi chỗ.';
    } else {
      text = 'CHỌN MỤC TIÊU ĐỊCH BÊN PHẢI → VUỐT 2 VIÊN NGỌC LIỀN KỀ ĐỂ TẤN CÔNG';
    }
    this.instructionText.setText(text);
    this.instructionText.setColor(hex(this.isMyTurn() ? COLORS.accent : COLORS.dim));
  }

  private renderLog(): void {
    const lines = matchStore.events.slice(-5).map((event) => `› ${truncate(event, 42)}`);
    this.logText.setText(lines.length > 0 ? lines.join('\n') : '› Trận đấu đã bắt đầu.');
  }

  private showToast(message: string, color: number): void {
    if (this.toastText) this.toastText.destroy();
    const toast = label(this, 640, 360, message, 14, color, 'bold')
      .setOrigin(0.5)
      .setDepth(60)
      .setBackgroundColor('#070c16f2')
      .setPadding(16, 10, 16, 10);
    this.toastText = toast;
    this.tweens.add({
      targets: toast,
      y: 330,
      alpha: { from: 1, to: 0 },
      delay: 1_200,
      duration: 600,
      onComplete: () => {
        toast.destroy();
        if (this.toastText === toast) this.toastText = null;
      },
    });
  }

  // ── Màn hình Kết quả PC ───────────────────────────────────────────────

  private showResult(view: MatchView): void {
    if (this.resultOverlay) return;

    const winner = view.winner ?? matchStore.end?.winner ?? 'draw';
    const rank = view.rank ?? matchStore.end?.rank ?? null;
    const won = winner === view.you;
    const draw = winner === 'draw';

    const overlay = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x03050a, 0.88).setInteractive();

    const modalW = 460;
    const modalH = 480;
    const modalX = 640 - modalW / 2;
    const modalY = 360 - modalH / 2;

    const backdrop = this.add.graphics();
    paintPanel(backdrop, modalX, modalY, modalW, modalH, {
      fill: COLORS.panel,
      fillAlpha: 0.99,
      border: draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger,
      borderAlpha: 0.65,
      glow: draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger,
      glowAlpha: 0.22,
      radius: 20,
    });

    const kicker = label(
      this,
      640,
      modalY + 28,
      won ? 'KẾT QUẢ TRẬN ĐẤU' : draw ? 'CÂN TÀI CÂN SỨC' : 'KẾT QUẢ TRẬN ĐẤU',
      12,
      COLORS.dim,
      'bold',
    )
      .setOrigin(0.5, 0)
      .setLetterSpacing(1.6);

    const title = label(
      this,
      640,
      modalY + 54,
      draw ? 'TRẬN ĐẤU HOÀ' : won ? 'CHIẾN THẮNG' : 'THẤT BẠI',
      36,
      draw ? COLORS.gold : won ? COLORS.accent : COLORS.danger,
      'bold',
    )
      .setOrigin(0.5, 0)
      .setLetterSpacing(3)
      .setShadow(0, 0, won ? '#2dd4bf' : draw ? '#fbbf24' : '#f87171', 16, true, true);

    const subtitle = label(
      this,
      640,
      modalY + 112,
      draw
        ? 'Hai bên cầm cự ngang sức — Không trừ điểm rank.'
        : won
          ? view.mode === 'bot'
            ? 'Bạn đã xuất sắc đánh bại đội hình Bot!'
            : 'Bạn đã quét sạch toàn bộ đội hình đối thủ!'
          : view.mode === 'bot'
            ? 'Bot đã giành chiến thắng trong trận đấu tập.'
            : 'Đối thủ đã hạ gục toàn bộ đội hình của bạn.',
      14,
      COLORS.muted,
      'bold',
    ).setOrigin(0.5, 0);
    subtitle.setWordWrapWidth(380);
    subtitle.setAlign('center');

    const box = this.add.graphics();
    box.fillStyle(COLORS.bgDeep, 0.85);
    box.fillRoundedRect(modalX + 40, modalY + 160, modalW - 80, 110, 14);
    box.lineStyle(1.5, COLORS.border, 0.9);
    box.strokeRoundedRect(modalX + 40, modalY + 160, modalW - 80, 110, 14);

    const delta = rank?.delta ?? 0;
    const deltaColor = delta > 0 ? COLORS.success : delta < 0 ? COLORS.danger : COLORS.muted;
    const deltaText = label(this, 640, modalY + 172, `${delta > 0 ? '+' : ''}${delta}`, 36, deltaColor, 'bold').setOrigin(
      0.5,
      0,
    );
    const deltaLabel = label(this, 640, modalY + 218, 'ĐIỂM XẾP HẠNG (RANK POINTS)', 11, COLORS.dim, 'bold')
      .setOrigin(0.5, 0)
      .setLetterSpacing(1.4);

    const points = label(
      this,
      640,
      modalY + 238,
      rank ? `Tổng điểm hiện tại: ${formatInt(rank.points)} điểm` : 'Chưa có dữ liệu rank',
      13,
      COLORS.muted,
      'bold',
    ).setOrigin(0.5, 0);

    const info = label(
      this,
      640,
      modalY + 300,
      `CHẾ ĐỘ ${view.mode === 'bot' ? 'LUYỆN TẬP BOT' : 'PVP ĐỐI KHÁNG'} · MÃ TRẬN ${shortAddress(view.matchId)}`,
      12,
      COLORS.dim,
    )
      .setOrigin(0.5, 0)
      .setLetterSpacing(0.8);

    const button = new Button(this, 640, modalY + 380, modalW - 80, 48, 'TRỞ VỀ SẢNH CHÍNH', 'primary', () => this.leaveToLobby(), 16);

    overlay.add([dim, backdrop, kicker, title, subtitle, box, deltaText, deltaLabel, points, info, button]);
    this.resultOverlay = overlay;

    overlay.setAlpha(0);
    overlay.y = 16;
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      y: 0,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    this.cameras.main.flash(180, 45, 212, 191, false);
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
