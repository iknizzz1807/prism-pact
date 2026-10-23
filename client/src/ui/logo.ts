import Phaser from 'phaser';
import { COLORS } from './theme';

function diamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number): Phaser.Geom.Point[] {
  const points = [
    new Phaser.Geom.Point(cx, cy - ry),
    new Phaser.Geom.Point(cx + rx, cy),
    new Phaser.Geom.Point(cx, cy + ry),
    new Phaser.Geom.Point(cx - rx, cy),
  ];
  g.fillPoints(points, true);
  return points;
}

/** Logo lăng kính: 3 viên ngọc xếp chồng, không cần asset ngoài. */
export function prismMark(scene: Phaser.Scene, x: number, y: number, size = 40): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const half = size / 2;

  g.fillStyle(COLORS.accent, 0.08);
  g.fillCircle(0, 0, half * 1.4);

  g.lineStyle(1.5, COLORS.violet, 0.85);
  diamond(g, -half * 0.34, 0, half * 0.5, half * 0.82);

  g.lineStyle(1.5, COLORS.accent, 0.9);
  diamond(g, half * 0.36, -half * 0.08, half * 0.5, half * 0.82);

  g.lineStyle(1.5, COLORS.gold, 0.75);
  diamond(g, 0, half * 0.26, half * 0.42, half * 0.62);

  g.fillStyle(COLORS.white, 0.9);
  g.fillCircle(0, half * 0.1, 1.6);

  return scene.add.container(x, y, [g]);
}
