import Phaser from 'phaser';
import { COLORS, textStyle } from './theme';

/** Đồng hồ đếm ngược hình tròn. Scene gọi update() mỗi frame. */
export class Countdown extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly radius: number;
  private deadline: number | null = null;
  private totalMs = 1;
  private lastShown = -1;
  private lastColor = -1;
  private frozen = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 24) {
    const ring = scene.add.graphics();
    const res = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
    const caption = scene.add
      .text(0, 0, '—', textStyle(14, COLORS.text, 'bold'))
      .setResolution(res)
      .setOrigin(0.5);
    super(scene, x, y, [ring, caption]);
    this.ring = ring;
    this.caption = caption;
    this.radius = radius;
    this.setSize(radius * 2, radius * 2);
    this.redraw(0);
  }

  setDeadline(deadline: number | null, totalMs: number): this {
    this.deadline = deadline;
    this.totalMs = Math.max(1, totalMs);
    this.lastShown = -1;
    this.frozen = false;
    this.redraw(1);
    return this;
  }

  /** Dừng hiển thị trong lúc animation chạy — tránh đếm ngược sai lượt. */
  freeze(): this {
    this.frozen = true;
    this.deadline = null;
    this.lastShown = -1;
    this.caption.setText('…');
    this.redraw(0);
    return this;
  }

  get secondsLeft(): number {
    if (this.deadline === null) return 0;
    return Math.max(0, (this.deadline - Date.now()) / 1000);
  }

  override update(): void {
    if (this.frozen || this.deadline === null) return;
    const seconds = Math.max(0, (this.deadline - Date.now()) / 1000);
    const ratio = Phaser.Math.Clamp(seconds / (this.totalMs / 1000), 0, 1);
    // Server cộng thêm buffer animation vào deadline → không hiển thị quá tổng lượt.
    const shown = Math.min(Math.ceil(this.totalMs / 1000), Math.ceil(seconds));
    if (shown !== this.lastShown) {
      this.lastShown = shown;
      this.caption.setText(`${shown}s`);
    }
    const color = ratio <= 0.25 ? COLORS.danger : ratio <= 0.5 ? COLORS.gold : COLORS.accent;
    this.redraw(ratio, color);
  }

  private redraw(ratio: number, color: number = COLORS.accent): void {
    const g = this.ring;
    g.clear();
    g.fillStyle(COLORS.bgDeep, 0.94);
    g.fillCircle(0, 0, this.radius);
    g.lineStyle(1.5, COLORS.border, 0.9);
    g.strokeCircle(0, 0, this.radius);

    const r = this.radius - 5;
    g.lineStyle(4, 0x192334, 1);
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI * 1.5, false);
    g.strokePath();

    if (ratio > 0.001) {
      g.lineStyle(4, color, 1);
      g.beginPath();
      g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      g.strokePath();
    }

    if (color !== this.lastColor) {
      this.lastColor = color;
      this.caption.setColor(`#${color.toString(16).padStart(6, '0')}`);
    }
  }
}
