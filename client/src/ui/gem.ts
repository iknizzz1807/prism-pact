import Phaser from 'phaser';
import type { GemType, Special } from '@prism-pact/shared';
import { COLORS } from './theme';

interface GemPalette {
  base: number;
  light: number;
  dark: number;
  shape: 'diamond' | 'drop' | 'circle' | 'hex';
}

export const GEM_META: Record<GemType, GemPalette> = {
  ATK: { base: COLORS.atk, light: 0xffc0a8, dark: 0x9c2a10, shape: 'diamond' },
  HP: { base: COLORS.hp, light: 0xc3f9d3, dark: 0x156b38, shape: 'drop' },
  MANA: { base: COLORS.mana, light: 0xbfe9ff, dark: 0x0b5e8c, shape: 'circle' },
  SHIELD: { base: COLORS.shield, light: 0xe3d8ff, dark: 0x5a3fae, shape: 'hex' },
};

function shapePoints(meta: GemPalette, radius: number): Phaser.Geom.Point[] {
  if (meta.shape === 'diamond') {
    return [
      new Phaser.Geom.Point(0, -radius),
      new Phaser.Geom.Point(radius * 0.82, 0),
      new Phaser.Geom.Point(0, radius),
      new Phaser.Geom.Point(-radius * 0.82, 0),
    ];
  }

  if (meta.shape === 'hex') {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(-90 + i * 60);
      points.push(new Phaser.Geom.Point(Math.cos(angle) * radius * 0.95, Math.sin(angle) * radius * 0.95));
    }
    return points;
  }

  if (meta.shape === 'drop') {
    const centerY = radius * 0.22;
    const circleRadius = radius * 0.64;
    const points: Phaser.Geom.Point[] = [new Phaser.Geom.Point(0, -radius * 1.02)];
    for (let angle = -38; angle <= 218; angle += 16) {
      const rad = Phaser.Math.DegToRad(angle);
      points.push(
        new Phaser.Geom.Point(Math.cos(rad) * circleRadius, centerY + Math.sin(rad) * circleRadius),
      );
    }
    return points;
  }

  const points: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 18; i += 1) {
    const angle = Phaser.Math.DegToRad(-90 + i * 20);
    points.push(new Phaser.Geom.Point(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9));
  }
  return points;
}

/** Vẽ 1 viên ngọc tại tâm (0,0) của graphics. size = đường kính. */
export function drawGem(
  g: Phaser.GameObjects.Graphics,
  size: number,
  type: GemType,
  special: Special | null = null,
): void {
  const meta = GEM_META[type];
  const radius = size / 2;
  g.clear();

  // Bóng đổ mềm dưới viên ngọc.
  g.fillStyle(COLORS.black, 0.32);
  g.fillEllipse(1, radius * 0.62, size * 0.82, size * 0.32);

  const points = shapePoints(meta, radius);

  g.fillStyle(meta.dark, 0.95);
  g.fillPoints(points, true);

  // Khối sáng lệch lên trên để tạo cảm giác facet.
  g.fillStyle(meta.base, 1);
  g.fillPoints(
    points.map((p) => new Phaser.Geom.Point(p.x * 0.88, p.y * 0.88 - radius * 0.04)),
    true,
  );

  g.lineStyle(1.5, meta.light, 0.75);
  g.strokePoints(points, true);

  if (meta.shape === 'diamond') {
    g.lineStyle(1, meta.light, 0.28);
    g.lineBetween(0, -radius * 0.82, 0, radius * 0.82);
    g.lineBetween(-radius * 0.6, 0, radius * 0.6, 0);
  } else if (meta.shape === 'hex') {
    g.lineStyle(1, meta.light, 0.22);
    g.strokePoints(
      points.map((p) => new Phaser.Geom.Point(p.x * 0.58, p.y * 0.58)),
      true,
    );
  } else if (meta.shape === 'circle') {
    g.lineStyle(1, meta.light, 0.25);
    g.strokeCircle(0, 0, radius * 0.58);
  } else {
    g.lineStyle(1, meta.light, 0.3);
    g.lineBetween(0, -radius * 0.55, 0, radius * 0.5);
  }

  g.fillStyle(COLORS.white, 0.62);
  g.fillEllipse(-radius * 0.28, -radius * 0.34, radius * 0.34, radius * 0.22);

  if (special === 'BOMB') {
    g.lineStyle(2, COLORS.white, 0.75);
    for (let i = 0; i < 4; i += 1) {
      const angle = Phaser.Math.DegToRad(45 + i * 90);
      g.lineBetween(
        Math.cos(angle) * radius * 0.35,
        Math.sin(angle) * radius * 0.35,
        Math.cos(angle) * radius * 0.82,
        Math.sin(angle) * radius * 0.82,
      );
    }
  } else if (special === 'RAINBOW') {
    g.lineStyle(1.5, COLORS.white, 0.7);
    g.strokeCircle(0, 0, radius * 0.55);
    g.strokeCircle(0, 0, radius * 0.78);
  }
}

export function specialGlyph(special: Special | null): string {
  if (special === 'BOMB') return '💣';
  if (special === 'RAINBOW') return '🌈';
  return '';
}
