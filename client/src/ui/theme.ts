import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  bg: 0x070a12,
  bgDeep: 0x04060b,
  panel: 0x111827,
  panelAlt: 0x0e1422,
  panelHi: 0x192235,
  border: 0x243249,
  borderSoft: 0x192334,
  text: 0xf1f5f9,
  muted: 0x94a3b8,
  dim: 0x64748b,
  accent: 0x2dd4bf,
  accentDeep: 0x0f766e,
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
  enemy: 0xf87171,
  ally: 0x2dd4bf,
} as const;

export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

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
    fontSize: `${Math.round(size)}px`,
    fontStyle: weight,
    color: hex(color),
    padding: { x: 4, y: 4 },
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
  const res = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
  const textObj = scene.add.text(Math.round(x), Math.round(y), value, textStyle(size, color, weight));
  textObj.setResolution(res);
  return textObj;
}
