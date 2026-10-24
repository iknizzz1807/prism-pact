import Phaser from 'phaser';
import { textStyle } from './theme';

/**
 * Thông báo lượt: hiện giữa màn hình PC, ease-in nhanh → giữ ngắn → ease-out.
 */
export function showTurnNotice(
  scene: Phaser.Scene,
  y: number,
  value: string,
  color: number,
): void {
  const res = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
  const text = scene.add
    .text(0, 0, value, textStyle(16, color, 'bold'))
    .setOrigin(0.5)
    .setResolution(res)
    .setLetterSpacing(1.2);

  const width = Math.min(600, text.width + 56);
  const bg = scene.add
    .rectangle(0, 0, width, 40, 0x050811, 0.96)
    .setStrokeStyle(1.5, color, 0.9);

  const container = scene.add
    .container(640, y, [bg, text])
    .setDepth(80)
    .setAlpha(0)
    .setScale(0.94);

  scene.tweens.chain({
    targets: container,
    tweens: [
      { alpha: 1, scale: 1, duration: 140, ease: 'Quad.easeOut' },
      { alpha: 1, duration: 650 },
      { alpha: 0, scale: 1.04, duration: 220, ease: 'Quad.easeIn' },
    ],
    onComplete: () => container.destroy(true),
  });
}
