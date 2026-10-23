import Phaser from 'phaser';
import { textStyle } from './theme';

/**
 * Thông báo lượt: hiện giữa màn hình, ease-in nhanh → giữ ngắn → ease-out.
 * Không chạy chữ (bỏ marquee cho dễ chịu).
 */
export function showTurnNotice(
  scene: Phaser.Scene,
  y: number,
  value: string,
  color: number,
): void {
  const text = scene.add
    .text(0, 0, value, textStyle(11, color, 'bold'))
    .setOrigin(0.5)
    .setResolution(3)
    .setLetterSpacing(1);

  const width = Math.min(372, text.width + 34);
  const bg = scene.add
    .rectangle(0, 0, width, 30, 0x04070f, 0.95)
    .setStrokeStyle(1, color, 0.85);

  const container = scene.add
    .container(195, y, [bg, text])
    .setDepth(80)
    .setAlpha(0)
    .setScale(0.94);

  scene.tweens.chain({
    targets: container,
    tweens: [
      { alpha: 1, scale: 1, duration: 130, ease: 'Quad.easeOut' },
      { alpha: 1, duration: 620 },
      { alpha: 0, scale: 1.04, duration: 200, ease: 'Quad.easeIn' },
    ],
    onComplete: () => container.destroy(true),
  });
}
