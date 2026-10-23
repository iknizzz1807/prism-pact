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
};

export type DraftCardState = 'available' | 'mine' | 'enemy' | 'banned';

export interface DraftCardOptions {
  width: number;
  height: number;
  onClick?: (archetype: Archetype) => void;
}

/** Card tướng trong draft: tên, HP/ATK/DEF, tên chiêu. Tap mở chi tiết. */
export class DraftHeroCard extends Phaser.GameObjects.Container {
  readonly archetype: Archetype;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly boxW: number;
  private readonly boxH: number;
  private readonly noteText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private cardState: DraftCardState = 'available';
  private highlighted = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: HeroDef, options: DraftCardOptions) {
    const bg = scene.add.graphics();
    const accent = ARCHETYPE_COLOR[def.archetype];
    const left = -options.width / 2;
    const top = -options.height / 2;

    const nameText = label(scene, left + 13, top + 9, def.archetype, 14, COLORS.text, 'bold');
    const statText = label(
      scene,
      left + 13,
      top + 28,
      `HP ${def.hp}  ·  ATK ${def.atk}  ·  DEF ${def.def}`,
      9,
      COLORS.muted,
    );
    const skillText = label(
      scene,
      left + 13,
      options.height >= 90 ? top + 48 : top + options.height - 22,
      `${def.skill.name} · ${def.skill.mana} mana`,
      9,
      accent,
    );
    const noteText = label(scene, left + options.width - 11, top + 11, '', 9, COLORS.muted, 'bold').setOrigin(1, 0);

    const extras: Phaser.GameObjects.GameObject[] = [];
    if (options.height >= 90) {
      extras.push(
        scene.add
          .text(left + 13, top + 64, def.skill.desc, {
            fontFamily: '"Segoe UI", "Trebuchet MS", system-ui, sans-serif',
            fontSize: '8.5px',
            color: '#8fa0bb',
            lineSpacing: 2,
            wordWrap: { width: options.width - 26, useAdvancedWrap: true },
          })
          .setResolution(3),
        label(scene, left + 13, top + options.height - 17, `Nội tại: ${def.passive.name}`, 8, COLORS.violet, 'bold'),
      );
    }

    super(scene, x, y, [bg, nameText, statText, skillText, noteText, ...extras]);
    this.archetype = def.archetype;
    this.bg = bg;
    this.boxW = options.width;
    this.boxH = options.height;
    this.noteText = noteText;
    this.nameText = nameText;

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
    this.noteText.setText(note);
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

    const glow = this.cardState === 'mine' ? COLORS.accent : this.highlighted ? COLORS.accent : this.cardState === 'enemy' ? COLORS.enemy : undefined;
    if (glow !== undefined) {
      g.lineStyle(5, glow, this.highlighted ? 0.07 : 0.16);
      g.strokeRoundedRect(left - 1, top - 1, this.boxW + 2, this.boxH + 2, 13);
    }

    g.fillStyle(COLORS.black, 0.3);
    g.fillRoundedRect(left + 1, top + 2, this.boxW, this.boxH, 12);

    g.fillStyle(this.hovered ? COLORS.panelHi : COLORS.panelAlt, locked ? 0.7 : 0.96);
    g.fillRoundedRect(left, top, this.boxW, this.boxH, 12);
    const borderColor =
      this.cardState === 'mine' || this.highlighted
        ? COLORS.accent
        : this.cardState === 'enemy'
          ? COLORS.enemy
          : COLORS.border;
    const borderAlpha = this.cardState === 'mine' ? 0.95 : this.highlighted ? 0.45 : locked ? 0.5 : 0.9;
    g.lineStyle(1, borderColor, borderAlpha);
    g.strokeRoundedRect(left, top, this.boxW, this.boxH, 12);

    g.fillStyle(accent, locked ? 0.4 : 1);
    g.fillRoundedRect(left + 4, top + 9, 3, this.boxH - 18, 2);

    // Vệt sáng trên cùng.
    g.fillStyle(COLORS.white, 0.03);
    g.fillRoundedRect(left + 1, top + 1, this.boxW - 2, 16, { tl: 11, tr: 11, bl: 0, br: 0 });

    if (locked) {
      g.fillStyle(COLORS.bgDeep, 0.42);
      g.fillRoundedRect(left, top, this.boxW, this.boxH, 12);
    }

    this.setAlpha(locked ? 0.72 : 1);
    this.nameText.setColor(hex(locked ? COLORS.muted : COLORS.text));
    this.noteText.setColor(
      hex(this.cardState === 'mine' ? COLORS.accent : this.cardState === 'enemy' ? COLORS.enemy : this.cardState === 'banned' ? COLORS.danger : COLORS.dim),
    );
  }
}

/** Ô tướng nhỏ trong hàng pick của 2 bên. */
export class MiniHeroSlot extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    archetype: Archetype | null,
    accentColor: number = COLORS.accent,
  ) {
    const g = scene.add.graphics();
    const left = -width / 2;
    const top = -height / 2;

    g.fillStyle(COLORS.bgDeep, archetype ? 0.5 : 0.35);
    g.fillRoundedRect(left, top, width, height, 10);
    g.lineStyle(1, archetype ? accentColor : COLORS.border, archetype ? 0.65 : 0.6);
    g.strokeRoundedRect(left, top, width, height, 10);

    const parts: Phaser.GameObjects.GameObject[] = [g];

    if (archetype) {
      const color = ARCHETYPE_COLOR[archetype];
      g.fillStyle(color, 0.95);
      g.fillRoundedRect(left, top + 8, 3, height - 16, 2);
      const name = label(scene, left + 10, top + 7, archetype, 10, COLORS.text, 'bold');
      const role = label(scene, left + 10, top + height - 17, 'ĐÃ CHỌN', 7, color, 'bold').setLetterSpacing(0.8);
      parts.push(name, role);
    } else {
      const empty = label(scene, 0, 0, '?', 16, COLORS.dim, 'bold').setOrigin(0.5);
      parts.push(empty);
    }

    super(scene, x, y, parts);
  }
}

const BUFF_LABEL: Record<Buff['kind'], string> = {
  ATK_UP: '↑ATK',
  ATK_DOWN: '↓ATK',
  DEF_DOWN: '↓DEF',
  TAUNT: 'TAUNT',
};

export interface BattleCardOptions {
  width: number;
  height: number;
  variant: 'enemy' | 'ally';
  onClick?: (uid: string) => void;
}

/** Card tướng trong trận: HP + giáp, hồi chiêu, buff, trạng thái chết. */
export class BattleHeroCard extends Phaser.GameObjects.Container {
  readonly uid: string;
  readonly archetype: Archetype;
  private readonly boxW: number;
  private readonly boxH: number;
  private readonly variant: 'enemy' | 'ally';
  private readonly hpBar: StatBar;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly shieldText: Phaser.GameObjects.Text;
  private readonly skillText: Phaser.GameObjects.Text;
  private readonly cdText: Phaser.GameObjects.Text;
  private readonly buffText: Phaser.GameObjects.Text;
  private readonly deadText: Phaser.GameObjects.Text;
  private readonly targetRing: Phaser.GameObjects.Graphics;
  private readonly casterGlow: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, hero: HeroView, options: BattleCardOptions) {
    const bg = scene.add.graphics();
    const casterGlow = scene.add.graphics();
    const targetRing = scene.add.graphics();
    const left = -options.width / 2;
    const top = -options.height / 2;
    const sideColor = options.variant === 'enemy' ? COLORS.enemy : COLORS.accent;

    bg.fillStyle(COLORS.black, 0.28);
    bg.fillRoundedRect(left + 1, top + 2, options.width, options.height, 12);
    bg.fillStyle(COLORS.panelAlt, 0.95);
    bg.fillRoundedRect(left, top, options.width, options.height, 12);
    bg.lineStyle(1, sideColor, 0.4);
    bg.strokeRoundedRect(left, top, options.width, options.height, 12);
    bg.fillStyle(sideColor, 0.7);
    bg.fillRoundedRect(left + 8, top + 2, options.width - 16, 2, 1);

    const nameText = label(scene, 0, top + 14, hero.archetype, 13, COLORS.text, 'bold').setOrigin(0.5, 0);    const statText = label(
      scene,
      0,
      top + 32,
      `ATK ${hero.atk} · DEF ${hero.def}`,
      8,
      COLORS.muted,
    ).setOrigin(0.5, 0);

    const hpBar = new StatBar(scene, left + 8, top + 45, options.width - 16, 9, COLORS.hp);
    const hpText = label(scene, left + 8, top + 57, '', 9, COLORS.text, 'bold');
    const shieldText = label(scene, options.width / 2 - 8, top + 57, '', 9, COLORS.shield, 'bold').setOrigin(1, 0);
    const skillText = label(scene, 0, top + 71, '', 9, COLORS.muted).setOrigin(0.5, 0);
    const cdText = label(scene, 0, top + 84, '', 8, COLORS.accent, 'bold').setOrigin(0.5, 0);
    const buffText = label(scene, 0, top + 97, '', 7, COLORS.violet, 'bold').setOrigin(0.5, 0);
    const deadText = label(scene, 0, 0, '☠', 24, COLORS.danger, 'bold').setOrigin(0.5);

    super(scene, x, y, [bg, casterGlow, targetRing, nameText, statText, hpBar, hpText, shieldText, skillText, cdText, buffText, deadText]);

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
    this.hpText.setText(`${Math.max(0, Math.round(hero.hp))}/${hero.maxHp}`);
    this.shieldText.setText(hero.shield > 0 ? `🛡 ${Math.round(hero.shield)}` : '');
    this.skillText.setText(`${hero.skill.name} · ${hero.skill.mana}`);
    this.skillText.setColor(hex(hero.alive ? ARCHETYPE_COLOR[hero.archetype] : COLORS.dim));

    const ready = hero.alive && hero.cd === 0 && mana >= hero.skill.mana;
    this.cdText.setText(hero.alive ? (hero.cd > 0 ? `CD ${hero.cd}` : ready ? 'SẴN SÀNG' : `THIẾU MANA`) : 'HẠ GỤC');
    this.cdText.setColor(hex(ready ? COLORS.accent : hero.cd > 0 ? COLORS.gold : COLORS.dim));

    this.buffText.setText(hero.buffs.map((buff) => BUFF_LABEL[buff.kind]).join(' · '));
    this.nameText.setColor(hex(hero.alive ? COLORS.text : COLORS.dim));
    this.deadText.setVisible(!hero.alive);
    this.setAlpha(hero.alive ? 1 : 0.62);
  }

  setTargeted(targeted: boolean): void {
    const g = this.targetRing;
    g.clear();
    if (!targeted) return;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;
    g.lineStyle(7, this.variant === 'enemy' ? COLORS.gold : COLORS.accent, 0.18);
    g.strokeRoundedRect(left - 1, top - 1, this.boxW + 2, this.boxH + 2, 13);
    g.lineStyle(2, this.variant === 'enemy' ? COLORS.gold : COLORS.accent, 1);
    g.strokeRoundedRect(left - 1, top - 1, this.boxW + 2, this.boxH + 2, 13);
    // 4 góc nhấn mạnh mục tiêu.
    const len = 9;
    const corners: Array<[number, number, number, number]> = [
      [left, top, 1, 1],
      [this.boxW / 2, top, -1, 1],
      [left, this.boxH / 2, 1, -1],
      [this.boxW / 2, this.boxH / 2, -1, -1],
    ];
    g.lineStyle(2, COLORS.white, 0.85);
    for (const [cx, cy, dx, dy] of corners) {
      g.lineBetween(cx, cy, cx + len * dx, cy);
      g.lineBetween(cx, cy, cx, cy + len * dy);
    }
  }

  setCasterGlow(on: boolean): void {
    const g = this.casterGlow;
    g.clear();
    if (!on) return;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;
    g.lineStyle(7, COLORS.violet, 0.2);
    g.strokeRoundedRect(left - 2, top - 2, this.boxW + 4, this.boxH + 4, 14);
    g.lineStyle(2, COLORS.violet, 0.95);
    g.strokeRoundedRect(left - 2, top - 2, this.boxW + 4, this.boxH + 4, 14);
  }

  get widthValue(): number {
    return this.boxW;
  }

  get heightValue(): number {
    return this.boxH;
  }
}
