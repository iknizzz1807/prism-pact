import Phaser from 'phaser';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const COLORS = {
  bg: 0x0b0f1a,
  bgDeep: 0x070a12,
  panel: 0x141c2c,
  panelAlt: 0x101726,
  panelHi: 0x1b2539,
  border: 0x293650,
  borderSoft: 0x1c2639,
  text: 0xe8eefc,
  muted: 0x8fa0bb,
  dim: 0x5d6b83,
  accent: 0x5eead4,
  accentDeep: 0x14b8a6,
  violet: 0xa78bfa,
  gold: 0xfbbf24,
  danger: 0xf87171,
  success: 0x4ade80,
  atk: 0xff6b4a,
  hp: 0x4ade80,
  mana: 0x38bdf8,
  shield: 0xa78bfa,
  white: 0xffffff,
  black: 0x000000,
  enemy: 0xff7a6b,
  ally: 0x5eead4,
} as const;

export const FONT = '"Segoe UI", "Trebuchet MS", system-ui, sans-serif';
export const MONO = 'Consolas, "Courier New", monospace';

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export function mix(a: number, b: number, t: number): number {
  const clamped = Phaser.Math.Clamp(t, 0, 1);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const bl = Math.round(ab + (bb - ab) * clamped);
  return (r << 16) | (g << 8) | bl;
}

export function textStyle(
  size: number,
  color: number = COLORS.text,
  weight: 'normal' | 'bold' = 'normal',
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: weight,
    color: hex(color),
  };
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: number = COLORS.text,
  weight: 'normal' | 'bold' = 'normal',
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, textStyle(size, color, weight)).setResolution(3);
}
