import Phaser from 'phaser';

export interface TouchHandlers {
  onDown?: (pointer: Phaser.Input.Pointer) => void;
  onUp?: (pointer: Phaser.Input.Pointer) => void;
  onOver?: () => void;
  onOut?: () => void;
}

/**
 * Vùng chạm cho Container.
 *
 * Vì sao không dùng `container.setInteractive(rect)`:
 * Phaser hit-test Container bị lệch đúng nửa chiều cao (đã đo thực tế: nút 40px
 * tại y=601 chỉ ăn trong 565..604 thay vì 581..621). Dùng một Rectangle con
 * (có origin 0.5) làm hit target thì vùng chạm khớp chính xác với hình vẽ.
 *
 * @param minHit mở rộng vùng chạm tối thiểu (dùng 44 cho nút bấm trên mobile).
 *               Không dùng cho ô bàn cờ vì sẽ chồng lấn ô bên cạnh.
 */
export function addTouchTarget(
  container: Phaser.GameObjects.Container,
  scene: Phaser.Scene,
  width: number,
  height: number,
  handlers: TouchHandlers = {},
  minHit = 0,
): Phaser.GameObjects.Rectangle {
  const hitWidth = Math.max(width, minHit);
  const hitHeight = Math.max(height, minHit);

  const target = scene.add.rectangle(0, 0, hitWidth, hitHeight, 0xffffff, 0.001);
  target.setOrigin(0.5, 0.5);
  target.setInteractive({ useHandCursor: true });

  if (handlers.onOver) target.on('pointerover', handlers.onOver);
  if (handlers.onOut) target.on('pointerout', handlers.onOut);
  if (handlers.onDown) target.on('pointerdown', handlers.onDown);
  if (handlers.onUp) target.on('pointerup', handlers.onUp);

  container.add(target);
  return target;
}

/** Bật/tắt input mà không phá cấu hình hit area. */
export function setTouchEnabled(target: Phaser.GameObjects.Rectangle, enabled: boolean): void {
  if (target.input) target.input.enabled = enabled;
  if (target.input) target.input.cursor = enabled ? 'pointer' : 'default';
}
