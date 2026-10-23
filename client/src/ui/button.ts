import Phaser from 'phaser';
import { COLORS, hex, mix, textStyle } from './theme';
import { addTouchTarget, setTouchEnabled } from './touch';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

interface Palette {
  fill: number;
  fillHover: number;
  border: number;
  text: number;
}

const PALETTES: Record<ButtonVariant, Palette> = {
  primary: { fill: COLORS.accentDeep, fillHover: COLORS.accent, border: mix(COLORS.accent, COLORS.white, 0.25), text: 0x04211c },
  secondary: { fill: 0x18263a, fillHover: 0x1f3149, border: COLORS.accent, text: COLORS.accent },
  ghost: { fill: 0x111a29, fillHover: 0x182235, border: COLORS.border, text: COLORS.muted },
  danger: { fill: 0x2a1319, fillHover: 0x3a1a22, border: COLORS.danger, text: 0xffb4b4 },
  gold: { fill: 0x2e2510, fillHover: 0x3d3115, border: COLORS.gold, text: COLORS.gold },
};

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly boxW: number;
  private readonly boxH: number;
  private variant: ButtonVariant;
  private enabled = true;
  private hovered = false;
  private readonly onActivate: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    variant: ButtonVariant,
    onActivate: () => void,
    fontSize = 13,
  ) {
    const bg = scene.add.graphics();
    const caption = scene.add
      .text(0, 0, text, textStyle(fontSize, PALETTES[variant].text, 'bold'))
      .setResolution(3)
      .setOrigin(0.5);

    super(scene, x, y, [bg, caption]);

    this.bg = bg;
    this.caption = caption;
    this.boxW = w;
    this.boxH = h;
    this.variant = variant;
    this.onActivate = onActivate;

    this.setSize(w, h);

    this.hit = addTouchTarget(
      this,
      scene,
      w,
      h,
      {
        onOver: () => {
          this.hovered = true;
          this.redraw();
          scene.tweens.add({ targets: this, scale: 1.02, duration: 90, ease: 'Quad.out' });
        },
        onOut: () => {
          this.hovered = false;
          this.redraw();
          scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Quad.out' });
        },
        onDown: () => {
          if (!this.enabled) return;
          scene.tweens.add({ targets: this, scale: 0.955, duration: 60, ease: 'Quad.out' });
        },
        onUp: () => {
          scene.tweens.add({ targets: this, scale: this.hovered ? 1.02 : 1, duration: 90, ease: 'Back.out' });
          if (this.enabled) this.onActivate();
        },
      },
      44,
    );

    this.redraw();
  }

  setLabel(text: string): this {
    this.caption.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.42);
    setTouchEnabled(this.hit, enabled);
    this.redraw();
    return this;
  }

  setVariant(variant: ButtonVariant): this {
    this.variant = variant;
    this.redraw();
    return this;
  }

  private redraw(): void {
    const palette = PALETTES[this.variant];
    const g = this.bg;
    const left = -this.boxW / 2;
    const top = -this.boxH / 2;
    g.clear();

    g.fillStyle(COLORS.black, 0.35);
    g.fillRoundedRect(left + 1, top + 2, this.boxW, this.boxH, 11);

    g.fillStyle(this.hovered && this.enabled ? palette.fillHover : palette.fill, 1);
    g.fillRoundedRect(left, top, this.boxW, this.boxH, 11);
    g.lineStyle(1, palette.border, this.enabled ? 0.85 : 0.4);
    g.strokeRoundedRect(left, top, this.boxW, this.boxH, 11);

    g.fillStyle(COLORS.white, 0.07);
    g.fillRoundedRect(left + 1, top + 1, this.boxW - 2, this.boxH / 2.2, { tl: 10, tr: 10, bl: 0, br: 0 });

    this.caption.setColor(hex(palette.text));
  }
}
