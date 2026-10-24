import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, label, mix, textStyle } from './theme';

export interface PanelOptions {
  fill?: number;
  fillAlpha?: number;
  border?: number;
  borderAlpha?: number;
  radius?: number;
  glow?: number;
  glowAlpha?: number;
}

export function drawBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-50);
  const bands = 40;
  const bandHeight = GAME_HEIGHT / bands;
  for (let i = 0; i < bands; i += 1) {
    const t = i / (bands - 1);
    const color = t < 0.5 ? mix(0x060912, 0x0c1322, t / 0.5) : mix(0x0c1322, 0x101728, (t - 0.5) / 0.5);
    g.fillStyle(color, 1);
    g.fillRect(0, i * bandHeight, GAME_WIDTH, bandHeight + 1);
  }

  // Quầng sáng ambient tạo chiều sâu PC widescreen
  for (let i = 0; i < 18; i += 1) {
    const radius = 320 - i * 16;
    g.fillStyle(COLORS.accent, 0.007);
    g.fillCircle(200, 180, radius);
    g.fillStyle(COLORS.violet, 0.007);
    g.fillCircle(1080, 520, radius);
    g.fillStyle(COLORS.gold, 0.005);
    g.fillCircle(640, 360, radius * 0.9);
  }

  // Lưới chấm subtle
  g.fillStyle(COLORS.white, 0.025);
  for (let y = 20; y < GAME_HEIGHT; y += 32) {
    for (let x = 20; x < GAME_WIDTH; x += 32) {
      g.fillCircle(x, y, 1);
    }
  }

  g.lineStyle(1, COLORS.accent, 0.08);
  g.lineBetween(0, 1, GAME_WIDTH, 1);
  return g;
}

export function paintPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PanelOptions = {},
): void {
  const {
    fill = COLORS.panel,
    fillAlpha = 0.92,
    border = COLORS.border,
    borderAlpha = 0.9,
    radius = 14,
    glow,
    glowAlpha = 0.18,
  } = options;

  if (glow !== undefined) {
    g.lineStyle(6, glow, glowAlpha);
    g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
    g.lineStyle(2, glow, Math.min(1, glowAlpha * 1.8));
    g.strokeRoundedRect(x - 0.5, y - 0.5, w + 1, h + 1, radius + 0.5);
  }

  g.fillStyle(fill, fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, border, borderAlpha);
  g.strokeRoundedRect(x, y, w, h, radius);

  // Highlight mảnh phía trên để panel có khối.
  g.fillStyle(COLORS.white, 0.025);
  g.fillRoundedRect(x + 1, y + 1, w - 2, Math.min(18, h / 2), { tl: radius - 2, tr: radius - 2, bl: 0, br: 0 });
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PanelOptions = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  paintPanel(g, x, y, w, h, options);
  return g;
}

export function divider(
  scene: Phaser.Scene,
  x1: number,
  y: number,
  x2: number,
  color = COLORS.border,
  alpha = 0.8,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.lineStyle(1, color, alpha);
  g.lineBetween(x1, y, x2, y);
  return g;
}

export function sectionTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  color: number = COLORS.muted,
): Phaser.GameObjects.Text {
  return label(scene, x, y, value.toUpperCase(), 13, color, 'bold').setLetterSpacing(1.2);
}

export interface PillOptions {
  fill?: number;
  fillAlpha?: number;
  border?: number;
  textColor?: number;
  height?: number;
}

/** Pill nhỏ, tự căn theo nội dung. Trả về container có tâm tại (x, y). */
export function pill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  options: PillOptions = {},
): Phaser.GameObjects.Container {
  const {
    fill = COLORS.panelHi,
    fillAlpha = 0.9,
    border = COLORS.border,
    textColor = COLORS.muted,
    height = 26,
  } = options;

  const res = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
  const text = scene.add.text(0, 0, value, textStyle(12, textColor, 'bold')).setResolution(res).setOrigin(0.5);
  const width = Math.max(54, text.width + 24);
  const g = scene.add.graphics();
  g.fillStyle(fill, fillAlpha);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
  g.lineStyle(1, border, 0.85);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);

  const container = scene.add.container(x, y, [g, text]);
  container.setSize(width, height);
  return container;
}
