import Phaser from 'phaser';
import type { Archetype, Buff, HeroDef, HeroView } from '@prism-pact/shared';
import { COLORS, hex, label } from './theme';
import { StatBar } from './bar';
import { addTouchTarget } from './touch';

export const ARCHETYPE_COLOR: Record<Archetype, number> = {
  Tank: 0x60a5fa,
  Burst: 0xfb7185,
  Healer: 0x4ade80,
  Controller: 0x38bdf8,
  Buffer: 0xfbbf24,
  Debuffer: 0xa78bfa,
  Assassin: 0xf472b6,
  Bruiser: 0xfb923c,
  Paladin: 0xfcd34d,
  Juggernaut: 0xf97316,
  Executioner: 0xef4444,
  Sniper: 0x22d3ee,
  Cleaver: 0xf59e0b,
  Berserker: 0xf43f5e,
  Pyromancer: 0xff6b4a,
  Venomancer: 0x84cc16,
  Necromancer: 0x8b5cf6,
  Oracle: 0x2dd4bf,
  Chronarch: 0x818cf8,
  Spellbreaker: 0xc084fc,
};

export const ARCHETYPE_EMOJI: Record<Archetype, string> = {
  Tank: '🛡️',
  Burst: '💥',
  Healer: '✚',
  Controller: '🌀',
  Buffer: '📣',
  Debuffer: '🧪',
  Assassin: '🗡️',
  Bruiser: '🪓',
  Paladin: '🕊️',
  Juggernaut: '🦏',
  Executioner: '⚔️',
  Sniper: '🎯',
  Cleaver: '🪚',
  Berserker: '💢',
  Pyromancer: '🔥',
  Venomancer: '🐍',
  Necromancer: '💀',
  Oracle: '🔮',
  Chronarch: '⏳',
  Spellbreaker: '🪄',
};

export type DraftCardState = 'available' | 'mine' | 'enemy' | 'banned';

export interface DraftCardOptions {
  width: number;
  height: number;
  onClick?: (archetype: Archetype) => void;
  /** Card nhỏ trong grid nhiều cột: ẩn mô tả dài, chỉ hiện tên + stat + tên skill. */
  compact?: boolean;
}

/** Card tướng trong draft trên PC: tên, emoji, chỉ số, chiêu thức & nội tại sắc nét. */
export class DraftHeroCard extends Phaser.GameObjects.Container {
  readonly archetype: Archetype;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly boxW: number;
  private readonly boxH: number;
  private readonly noteText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly isTiny: boolean;
  private cardState: DraftCardState = 'available';
  private highlighted = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: HeroDef, options: DraftCardOptions) {
    const bg = scene.add.graphics();
    const accent = ARCHETYPE_COLOR[def.archetype];
    const left = -options.width / 2;
    const top = -options.height / 2;
    const compact = options.compact ?? options.width < 240;
    const tiny = options.width < 160;

    const emoji = ARCHETYPE_EMOJI[def.archetype];
    const nameText = label(
      scene,
      left + (tiny ? 7 : 10),
      top + 7,
      `${emoji} ${def.archetype}`,
      tiny ? 11 : compact ? 13 : 15,
      COLORS.text,
      'bold',
    );
    const noteText = label(
      scene,
      left + options.width - (tiny ? 6 : 8),
      top + 8,
      '',
      tiny ? 8 : compact ? 9 : 11,
      COLORS.muted,
      'bold',
    ).setOrigin(1, 0);

    const statText = label(
      scene,
      left + (tiny ? 7 : 10),
      top + (tiny ? 26 : 28),
      compact ? `HP ${def.hp} · ATK ${def.atk}` : `HP ${def.hp}  ·  ATK ${def.atk}  ·  DEF ${def.def}`,
      tiny ? 9 : compact ? 10 : 11,
      COLORS.muted,
      'bold',
    );
    const skillText = label(
      scene,
      left + (tiny ? 7 : 10),
      top + (tiny ? 42 : 46),
      compact
        ? `⚡ ${def.skill.name}`
        : `Chiêu: ${def.skill.name} (${def.skill.mana} mana · CD ${def.skill.cd})`,
      tiny ? 9 : compact ? 10 : 12,
      accent,
      'bold',
    );

    const extras: Phaser.GameObjects.GameObject[] = [];
    if (!compact && options.height >= 110) {
      const descText = scene.add
        .text(left + 12, top + 65, def.skill.desc, {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '11px',
          color: '#94a3b8',
          lineSpacing: 1.5,
          wordWrap: { width: options.width - 24, useAdvancedWrap: true },
        })
        .setResolution(Math.max(window.devicePixelRatio || 1, 2));

      // Đặt passive ngay dưới descText, đảm bảo có ít nhất 18-20px đệm tới đáy thẻ, không bao giờ chạm viền
      const passiveY = top + 65 + descText.height + 4;
      const passiveText = scene.add
        .text(left + 12, passiveY, `Nội tại: ${def.passive.name} — ${def.passive.desc}`, {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '11px',
          color: '#a78bfa',
          lineSpacing: 1.5,
          wordWrap: { width: options.width - 24, useAdvancedWrap: true },
        })
        .setResolution(Math.max(window.devicePixelRatio || 1, 2));

      extras.push(descText, passiveText);
    }

    super(scene, x, y, [bg, nameText, statText, skillText, noteText, ...extras]);
    this.archetype = def.archetype;
    this.bg = bg;
    this.boxW = options.width;
    this.boxH = options.height;
    this.noteText = noteText;
    this.nameText = nameText;
    this.isTiny = tiny;

    if (options.onClick) {
      const onClick = options.onClick;
      this.setSize(options.width, options.height);
      addTouchTarget(
        this,
        scene,
        options.width,
        options.height,
        {
          onOver: () => {
            this.hovered = true;
            this.draw();
          },
          onOut: () => {
            this.hovered = false;
            this.draw();
          },
          onUp: () => onClick(this.archetype),
        },
        44,
      );
    }

    this.draw();
  }

  setCardState(state: DraftCardState, note = ''): this {
    this.cardState = state;
    this.noteText.setText(this.isTiny ? '' : note);
    this.draw();
    return this;
  }

  setHighlight(highlighted: boolean): this {
    this.highlighted = highlighted;
    this.draw();
    return this;
  }

  private draw(): void {
    const accent = ARCHETYPE_COLOR[this.archetype];
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;
    const locked = this.cardState !== 'available';
    const g = this.bg;
    g.clear();

    const glow =
      this.cardState === 'mine'
        ? COLORS.accent
        : this.highlighted
          ? COLORS.accent
          : this.cardState === 'enemy'
            ? COLORS.enemy
            : undefined;

    if (glow !== undefined) {
      g.lineStyle(6, glow, this.highlighted ? 0.12 : 0.22);
      g.strokeRoundedRect(left - 2, top - 2, this.boxW + 4, this.boxH + 4, 14);
    }

    g.fillStyle(COLORS.black, 0.35);
    g.fillRoundedRect(left + 2, top + 2, this.boxW, this.boxH, 12);

    g.fillStyle(this.hovered ? COLORS.panelHi : COLORS.panelAlt, locked ? 0.72 : 0.96);
    g.fillRoundedRect(left, top, this.boxW, this.boxH, 12);

    const borderColor =
      this.cardState === 'mine' || this.highlighted
        ? COLORS.accent
        : this.cardState === 'enemy'
          ? COLORS.enemy
          : COLORS.border;
    const borderAlpha = this.cardState === 'mine' ? 0.95 : this.highlighted ? 0.6 : locked ? 0.45 : 0.85;
    g.lineStyle(1.5, borderColor, borderAlpha);
    g.strokeRoundedRect(left, top, this.boxW, this.boxH, 12);

    // Accent line bên trái
    g.fillStyle(accent, locked ? 0.4 : 1);
    g.fillRoundedRect(left + 4, top + 8, 4, this.boxH - 16, 2);

    // Vệt sáng trên cùng
    g.fillStyle(COLORS.white, 0.04);
    g.fillRoundedRect(left + 1, top + 1, this.boxW - 2, 18, { tl: 11, tr: 11, bl: 0, br: 0 });

    if (locked) {
      g.fillStyle(COLORS.bgDeep, 0.45);
      g.fillRoundedRect(left, top, this.boxW, this.boxH, 12);
    }

    this.setAlpha(locked ? 0.75 : 1);
    this.nameText.setColor(hex(locked ? COLORS.muted : COLORS.text));
    this.noteText.setColor(
      hex(
        this.cardState === 'mine'
          ? COLORS.accent
          : this.cardState === 'enemy'
            ? COLORS.enemy
            : this.cardState === 'banned'
              ? COLORS.danger
              : COLORS.dim,
      ),
    );
  }

  /** Hiệu ứng recoil bật nảy ease-in ease-out cực mạnh khi tướng được pick. */
  playPickRecoil(isEnemy = false): void {
    const scene = this.scene;
    if (!scene) return;
    const color = isEnemy ? COLORS.enemy : COLORS.accent;

    // Giật nảy scale mạnh với Back.easeOut (punch & recoil)
    scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 160,
      ease: 'Back.easeOut',
      yoyo: true,
    });

    // Tag text nổi lên báo hiệu lượt chọn
    const banner = label(
      scene,
      this.x,
      this.y - 12,
      isEnemy ? '⚔️ ĐỐI THỦ CHỌN' : '✓ BẠN ĐÃ CHỌN',
      13,
      color,
      'bold',
    )
      .setOrigin(0.5)
      .setDepth(60)
      .setStroke('#030712', 4)
      .setScale(0.65)
      .setAlpha(0);

    scene.tweens.add({
      targets: banner,
      y: this.y - 58,
      scale: 1.1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!scene.sys.isActive() || !banner.active) return;
        scene.tweens.add({
          targets: banner,
          alpha: 0,
          y: this.y - 78,
          duration: 260,
          ease: 'Quad.easeIn',
          onComplete: () => banner.destroy(),
        });
      },
    });

    // Vành hào quang bung rộng tỏa ra từ thẻ
    const wave = scene.add.graphics().setDepth(55);
    wave.setPosition(this.x, this.y);
    wave.lineStyle(3, color, 0.95);
    wave.strokeRoundedRect(-this.boxW / 2 - 2, -this.boxH / 2 - 2, this.boxW + 4, this.boxH + 4, 14);
    scene.tweens.add({
      targets: wave,
      scaleX: 1.18,
      scaleY: 1.25,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => wave.destroy(),
    });

    // Các hạt tia sáng bung ra xung quanh
    for (let s = 0; s < 8; s += 1) {
      const angle = (s / 8) * Math.PI * 2;
      const dist = Phaser.Math.Between(26, 52);
      const spark = scene.add
        .circle(this.x, this.y, Phaser.Math.FloatBetween(2, 3.8), color, 1)
        .setDepth(56);
      scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}

/** Ô tướng trong hàng pick của 2 bên. */
export class MiniHeroSlot extends Phaser.GameObjects.Container {
  readonly slotWidth: number;
  readonly slotHeight: number;
  readonly archetype: Archetype | null;
  readonly isBanned: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    archetype: Archetype | null,
    accentColor: number = COLORS.accent,
    isBanned = false,
    bannedLabel = '',
  ) {
    const g = scene.add.graphics();
    const left = -width / 2;
    const top = -height / 2;

    const bgAlpha = isBanned ? 0.92 : archetype ? 0.75 : 0.4;
    const bgColor = isBanned ? 0x22070c : COLORS.bgDeep;
    g.fillStyle(bgColor, bgAlpha);
    g.fillRoundedRect(left, top, width, height, 10);

    const borderColor = isBanned ? COLORS.danger : archetype ? accentColor : COLORS.border;
    const borderAlpha = isBanned ? 0.95 : archetype ? 0.8 : 0.5;
    g.lineStyle(isBanned ? 2 : 1.5, borderColor, borderAlpha);
    g.strokeRoundedRect(left, top, width, height, 10);

    const parts: Phaser.GameObjects.GameObject[] = [g];

    if (archetype) {
      const color = isBanned ? COLORS.danger : ARCHETYPE_COLOR[archetype];
      const emoji = ARCHETYPE_EMOJI[archetype];
      g.fillStyle(color, isBanned ? 0.45 : 0.95);
      g.fillRoundedRect(left, top + 6, 4, height - 12, 2);

      const name = label(
        scene,
        left + 14,
        top + 9,
        `${emoji} ${archetype}`,
        14,
        isBanned ? COLORS.muted : COLORS.text,
        'bold',
      );

      // Nếu bị cấm: gạch ngang đỏ qua tên tướng
      if (isBanned) {
        const strike = scene.add.graphics();
        strike.lineStyle(2, COLORS.danger, 0.9);
        strike.lineBetween(left + 14, top + 18, left + 14 + name.width + 4, top + 18);
        parts.push(strike);
      }

      const roleText = isBanned
        ? (bannedLabel || '🚫 ĐÃ BỊ CẤM')
        : 'ĐÃ CHỌN';
      const roleColor = isBanned ? COLORS.danger : color;

      const role = label(scene, left + 14, top + height - 20, roleText, 11, roleColor, 'bold').setLetterSpacing(0.8);
      parts.push(name, role);
    } else {
      const empty = label(scene, 0, 0, '— CHỜ CHỌN —', 13, COLORS.dim, 'bold').setOrigin(0.5);
      parts.push(empty);
    }

    super(scene, x, y, parts);
    this.slotWidth = width;
    this.slotHeight = height;
    this.archetype = archetype;
    this.isBanned = isBanned;
    this.setSize(width, height);
  }

  /** Hiệu ứng pop-in ease-in ease-out cực mạnh khi có tướng mới được chọn vào slot. */
  playPickPop(accentColor: number = COLORS.accent): void {
    const scene = this.scene;
    if (!scene) return;
    this.setScale(0.62);
    this.setAlpha(0.5);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });

    // Vành hào quang phóng to quanh ô slot
    const ring = scene.add.graphics().setDepth(20);
    ring.setPosition(this.x, this.y);
    ring.lineStyle(3, accentColor, 0.95);
    ring.strokeRoundedRect(-this.slotWidth / 2, -this.slotHeight / 2, this.slotWidth, this.slotHeight, 10);
    scene.tweens.add({
      targets: ring,
      scaleX: 1.15,
      scaleY: 1.25,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 8 hạt tia sáng bung ra xung quanh ô tướng
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = Phaser.Math.Between(22, 44);
      const spark = scene.add
        .circle(this.x, this.y, Phaser.Math.FloatBetween(2, 3.5), accentColor, 1)
        .setDepth(21);
      scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}

const BUFF_LABEL: Record<Buff['kind'], string> = {
  ATK_UP: '↑ATK',
  ATK_DOWN: '↓ATK',
  DEF_UP: '↑DEF',
  DEF_DOWN: '↓DEF',
  TAUNT: 'TAUNT',
  INVINCIBLE: 'INVINCIBLE',
  THORNS: 'THORNS',
  DOT_DOWN: '↓DOT',
  BURN: 'BURN',
  POISON: 'POISON',
  SKILL_TAX: 'TAX',
};

export interface BattleCardOptions {
  width: number;
  height: number;
  variant: 'enemy' | 'ally';
  onClick?: (uid: string) => void;
  onSkillClick?: (uid: string) => void;
}

/** Card tướng trong trận trên PC: HP bar lớn + giáp, skill, trạng thái mục tiêu rõ ràng. */
export class BattleHeroCard extends Phaser.GameObjects.Container {
  readonly uid: string;
  readonly archetype: Archetype;
  private readonly boxW: number;
  private readonly boxH: number;
  readonly variant: 'enemy' | 'ally';
  private readonly hpBar: StatBar;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly shieldText: Phaser.GameObjects.Text;
  private readonly skillText: Phaser.GameObjects.Text;
  private readonly cdText: Phaser.GameObjects.Text;
  private readonly buffText: Phaser.GameObjects.Text;
  private readonly deadText: Phaser.GameObjects.Text;
  private readonly targetRing: Phaser.GameObjects.Graphics;
  private readonly aimRing: Phaser.GameObjects.Graphics;
  private readonly casterGlow: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, hero: HeroView, options: BattleCardOptions) {
    const bg = scene.add.graphics();
    const casterGlow = scene.add.graphics();
    const targetRing = scene.add.graphics();
    const aimRing = scene.add.graphics();
    const left = -options.width / 2;
    const top = -options.height / 2;
    const sideColor = options.variant === 'enemy' ? COLORS.enemy : COLORS.accent;
    const emoji = ARCHETYPE_EMOJI[hero.archetype];

    bg.fillStyle(COLORS.black, 0.35);
    bg.fillRoundedRect(left + 2, top + 2, options.width, options.height, 12);
    bg.fillStyle(COLORS.panelAlt, 0.96);
    bg.fillRoundedRect(left, top, options.width, options.height, 12);
    bg.lineStyle(1.5, sideColor, 0.45);
    bg.strokeRoundedRect(left, top, options.width, options.height, 12);

    // Accent line viền trái
    bg.fillStyle(ARCHETYPE_COLOR[hero.archetype], 0.9);
    bg.fillRoundedRect(left + 3, top + 8, 4, options.height - 16, 2);

    const nameText = label(scene, left + 16, top + 10, `${emoji} ${hero.archetype}`, 15, COLORS.text, 'bold');
    const statText = label(
      scene,
      left + options.width - 16,
      top + 12,
      `ATK ${hero.atk}  DEF ${hero.def}`,
      13,
      COLORS.muted,
      'bold',
    ).setOrigin(1, 0);

    const hpBar = new StatBar(scene, left + 16, top + 36, options.width - 32, 12, COLORS.hp);
    const hpText = label(scene, left + 18, top + 52, '', 13, COLORS.text, 'bold');
    const shieldText = label(scene, left + options.width - 18, top + 52, '', 13, COLORS.shield, 'bold').setOrigin(1, 0);

    const skillText = label(scene, left + 16, top + 74, '', 13, COLORS.muted, 'bold');
    const cdText = label(scene, left + options.width - 16, top + 74, '', 12, COLORS.accent, 'bold').setOrigin(1, 0);
    const buffText = label(scene, left + 16, top + 94, '', 12, COLORS.violet, 'bold');
    const deadText = label(scene, 0, 0, '☠ HẠ GỤC', 26, COLORS.danger, 'bold').setOrigin(0.5);

    super(scene, x, y, [
      bg,
      casterGlow,
      targetRing,
      aimRing,
      nameText,
      statText,
      hpBar,
      hpText,
      shieldText,
      skillText,
      cdText,
      buffText,
      deadText,
    ]);

    this.uid = hero.uid;
    this.archetype = hero.archetype;
    this.boxW = options.width;
    this.boxH = options.height;
    this.variant = options.variant;
    this.hpBar = hpBar;
    this.hpText = hpText;
    this.shieldText = shieldText;
    this.skillText = skillText;
    this.cdText = cdText;
    this.buffText = buffText;
    this.deadText = deadText;
    this.targetRing = targetRing;
    this.aimRing = aimRing;
    this.casterGlow = casterGlow;
    this.nameText = nameText;

    if (options.onClick) {
      const onClick = options.onClick;
      this.setSize(options.width, options.height);
      addTouchTarget(this, scene, options.width, options.height, {
        onUp: () => onClick(this.uid),
      });
    }

    this.update(hero, 0);
  }

  override update(hero: HeroView, mana: number): void {
    const ratio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 0;
    const shieldRatio = hero.maxHp > 0 ? hero.shield / hero.maxHp : 0;
    this.hpBar.setColor(ratio <= 0.3 ? COLORS.danger : ratio <= 0.6 ? COLORS.gold : COLORS.hp);
    this.hpBar.setRatios(ratio, shieldRatio);
    this.hpText.setText(`HP ${Math.max(0, Math.round(hero.hp))}/${hero.maxHp}`);
    this.shieldText.setText(hero.shield > 0 ? `🛡 Giáp +${Math.round(hero.shield)}` : '');
    this.skillText.setText(`⚡ ${hero.skill.name} (${hero.skill.mana}💧)`);
    this.skillText.setColor(hex(hero.alive ? ARCHETYPE_COLOR[hero.archetype] : COLORS.dim));

    const ready = hero.alive && hero.cd === 0 && mana >= hero.skill.mana;
    this.cdText.setText(
      hero.alive
        ? hero.cd > 0
          ? `HỒI ${hero.cd} LƯỢT`
          : ready
            ? '✓ SẴN SÀNG'
            : `CẦN ${hero.skill.mana} MANA`
        : 'ĐÃ GỤC',
    );
    this.cdText.setColor(hex(ready ? COLORS.accent : hero.cd > 0 ? COLORS.gold : COLORS.dim));

    this.buffText.setText(hero.buffs.map((buff) => BUFF_LABEL[buff.kind]).join('  ·  '));
    this.nameText.setColor(hex(hero.alive ? COLORS.text : COLORS.dim));
    this.deadText.setVisible(!hero.alive);
    this.setAlpha(hero.alive ? 1 : 0.55);
  }

  setTargeted(targeted: boolean): void {
    const g = this.targetRing;
    g.clear();
    if (!targeted) return;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;

    // Glowing target ring
    g.lineStyle(8, COLORS.gold, 0.22);
    g.strokeRoundedRect(left - 2, top - 2, this.boxW + 4, this.boxH + 4, 14);
    g.lineStyle(2.5, COLORS.gold, 1);
    g.strokeRoundedRect(left - 2, top - 2, this.boxW + 4, this.boxH + 4, 14);

    // 4 góc crosshair ngắm mục tiêu
    const len = 14;
    const corners: Array<[number, number, number, number]> = [
      [left, top, 1, 1],
      [this.boxW / 2, top, -1, 1],
      [left, this.boxH / 2, 1, -1],
      [this.boxW / 2, this.boxH / 2, -1, -1],
    ];
    g.lineStyle(3, COLORS.white, 0.95);
    for (const [cx, cy, dx, dy] of corners) {
      g.lineBetween(cx, cy, cx + len * dx, cy);
      g.lineBetween(cx, cy, cx, cy + len * dy);
    }
  }

  /** Highlight mục tiêu của skill (khác với target basic attack màu vàng). */
  setAimed(on: boolean, color: number = COLORS.gold): void {
    const g = this.aimRing;
    g.clear();
    if (!on) return;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;

    g.lineStyle(12, color, 0.18);
    g.strokeRoundedRect(left - 4, top - 4, this.boxW + 8, this.boxH + 8, 16);
    g.lineStyle(3, color, 1);
    g.strokeRoundedRect(left - 4, top - 4, this.boxW + 8, this.boxH + 8, 16);

    // Corner brackets hướng vào tâm
    const len = 18;
    const corners: Array<[number, number, number, number]> = [
      [left - 4, top - 4, 1, 1],
      [this.boxW / 2 + 4, top - 4, -1, 1],
      [left - 4, this.boxH / 2 + 4, 1, -1],
      [this.boxW / 2 + 4, this.boxH / 2 + 4, -1, -1],
    ];
    g.lineStyle(4, COLORS.white, 0.95);
    for (const [cx, cy, dx, dy] of corners) {
      g.lineBetween(cx, cy, cx + len * dx, cy);
      g.lineBetween(cx, cy, cx, cy + len * dy);
    }

    // Diamond marker trên đỉnh card
    const mx = 0;
    const my = top - 13;
    g.fillStyle(color, 1);
    g.fillTriangle(mx, my - 7, mx - 7, my, mx + 7, my);
    g.fillTriangle(mx, my + 7, mx - 7, my, mx + 7, my);
  }

  setCasterGlow(on: boolean): void {
    const g = this.casterGlow;
    g.clear();
    if (!on) return;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;
    g.lineStyle(8, COLORS.violet, 0.25);
    g.strokeRoundedRect(left - 3, top - 3, this.boxW + 6, this.boxH + 6, 15);
    g.lineStyle(2.5, COLORS.violet, 1);
    g.strokeRoundedRect(left - 3, top - 3, this.boxW + 6, this.boxH + 6, 15);
  }

  get widthValue(): number {
    return this.boxW;
  }

  get heightValue(): number {
    return this.boxH;
  }
}
