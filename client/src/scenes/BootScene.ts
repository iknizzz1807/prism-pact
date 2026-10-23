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
    prismMark(this, 195, 360, 64);

    this.add
      .text(195, 420, 'PRISM PACT', textStyle(26, COLORS.text, 'bold'))
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setResolution(3)
      .setShadow(0, 0, '#5eead4', 12, true, true);

    this.add
      .text(195, 452, 'ĐANG MỞ CỔNG ĐẤU TRƯỜNG…', textStyle(10, COLORS.muted, 'bold'))
      .setOrigin(0.5)
      .setLetterSpacing(1.6)
      .setResolution(3);

    const dots = this.add.text(195, 486, '●  ●  ●', textStyle(8, COLORS.accent)).setOrigin(0.5).setResolution(3);
    this.tweens.add({ targets: dots, alpha: { from: 0.25, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    this.time.delayedCall(420, () => this.scene.start('Lobby'));
  }
}
