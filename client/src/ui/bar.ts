import Phaser from 'phaser';
import { COLORS } from './theme';

export interface BarOptions {
  bg?: number;
  radius?: number;
  inset?: number;
  overlayColor?: number;
}

/** Thanh giá trị đơn giản: HP, mana, tiến trình. Hỗ trợ lớp phủ (giáp). */
export class StatBar extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly barWidth: number;
  private readonly barHeight: number;
  private readonly radius: number;
  private readonly inset: number;
  private readonly bgColor: number;
  private color: number;
  private readonly overlayColor: number;
  private ratio = 0;
  private overlay = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    options: BarOptions = {},
  ) {
    const g = scene.add.graphics();
    super(scene, x, y, [g]);
    this.g = g;
    this.barWidth = width;
    this.barHeight = height;
    this.radius = options.radius ?? Math.min(height / 2, 4);
    this.inset = options.inset ?? 1;
    this.bgColor = options.bg ?? 0x080d16;
    this.overlayColor = options.overlayColor ?? COLORS.shield;
    this.color = color;
    this.setSize(width, height);
    this.redraw();
  }

  setColor(color: number): this {
    this.color = color;
    this.redraw();
    return this;
  }

  setRatios(ratio: number, overlay = 0): this {
    this.ratio = Phaser.Math.Clamp(ratio, 0, 1);
    this.overlay = Phaser.Math.Clamp(overlay, 0, 1);
    this.redraw();
    return this;
  }

  private redraw(): void {
    const g = this.g;
    g.clear();

    g.fillStyle(this.bgColor, 0.92);
    g.fillRoundedRect(0, 0, this.barWidth, this.barHeight, this.radius);
    g.lineStyle(1, COLORS.border, 0.55);
    g.strokeRoundedRect(0, 0, this.barWidth, this.barHeight, this.radius);

    const innerWidth = this.barWidth - this.inset * 2;
    const innerHeight = this.barHeight - this.inset * 2;
    if (this.ratio > 0) {
      const filled = Math.max(innerHeight, innerWidth * this.ratio);
      g.fillStyle(this.color, 1);
      g.fillRoundedRect(this.inset, this.inset, filled, innerHeight, Math.max(1, this.radius - 1));
      g.fillStyle(COLORS.white, 0.18);
      g.fillRoundedRect(
        this.inset,
        this.inset,
        filled,
        Math.max(1, innerHeight * 0.42),
        { tl: Math.max(1, this.radius - 1), tr: Math.max(1, this.radius - 1), bl: 0, br: 0 },
      );
    }

    if (this.overlay > 0) {
      const shieldWidth = Math.max(this.barHeight, innerWidth * this.overlay);
      g.fillStyle(this.overlayColor, 0.82);
      g.fillRoundedRect(this.inset, this.inset, shieldWidth, innerHeight, Math.max(1, this.radius - 1));
      g.lineStyle(1, COLORS.white, 0.35);
      g.strokeRoundedRect(this.inset, this.inset, shieldWidth, innerHeight, Math.max(1, this.radius - 1));
    }
  }
}
