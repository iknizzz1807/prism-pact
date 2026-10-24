import Phaser from 'phaser';
import { COLORS, textStyle } from '../ui/theme';
import { drawBackdrop } from '../ui/panel';
import { prismMark } from '../ui/logo';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    drawBackdrop(this);
    prismMark(this, 640, 280, 80);

    const res = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;

    this.add
      .text(640, 360, 'PRISM PACT', textStyle(38, COLORS.text, 'bold'))
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setResolution(res)
      .setShadow(0, 0, '#2dd4bf', 18, true, true);

    this.add
      .text(640, 410, 'MATCH-3 PVP · LIVE DRAFT · AVALANCHE C-CHAIN', textStyle(14, COLORS.muted, 'bold'))
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setResolution(res);

    this.add
      .text(640, 450, 'ĐANG KẾT NỐI ĐẤU TRƯỜNG…', textStyle(13, COLORS.dim, 'bold'))
      .setOrigin(0.5)
      .setLetterSpacing(1.5)
      .setResolution(res);

    const dots = this.add
      .text(640, 490, '●   ●   ●', textStyle(10, COLORS.accent, 'bold'))
      .setOrigin(0.5)
      .setResolution(res);
    this.tweens.add({ targets: dots, alpha: { from: 0.2, to: 1 }, duration: 600, yoyo: true, repeat: -1 });

    this.time.delayedCall(450, () => this.scene.start('Lobby'));
  }
}
