import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { DraftScene } from './scenes/DraftScene';
import { BattleScene } from './scenes/BattleScene';
import { gameClient, type ConnectionStatus } from './net/gameClient';
import { matchStore } from './state';
import { GAME_HEIGHT, GAME_WIDTH } from './ui/theme';

gameClient.onState((view, events, animation) => matchStore.setView(view, events, animation));
gameClient.onEnd((winner, rank) => matchStore.setEnd(winner, rank));

const SCENES = ['Boot', 'Lobby', 'Draft', 'Battle'] as const;
const inMatch = (phase: string): boolean => phase === 'draft' || phase === 'ban';

let game: Phaser.Game | null = null;
let isTransitioning = false;

function route(): void {
  if (!game || isTransitioning) return;
  const view = matchStore.view;
  const target = !view ? 'Lobby' : inMatch(view.phase) ? 'Draft' : 'Battle';
  if (game.scene.isActive(target)) return;

  // Nếu chuyển từ Draft sang Battle, kích hoạt diễn hoạt cảnh chuyển trận mượt mà
  if (target === 'Battle' && game.scene.isActive('Draft')) {
    const draftScene = game.scene.getScene('Draft') as DraftScene | undefined;
    if (draftScene && typeof draftScene.startMatchTransition === 'function') {
      isTransitioning = true;
      let transitionDone = false;

      const finishTransition = () => {
        if (transitionDone) return;
        transitionDone = true;
        isTransitioning = false;
        if (!game) return;
        if (game.scene.isActive('Draft')) game.scene.stop('Draft');
        if (!game.scene.isActive('Battle')) game.scene.start('Battle');
      };

      // Bảo hiểm tuyệt đối: sau 3.5s chắc chắn phải vào BattleScene, không bao giờ để đơ màn hình
      const safetyTimer = window.setTimeout(finishTransition, 3500);

      draftScene.startMatchTransition(view, () => {
        window.clearTimeout(safetyTimer);
        finishTransition();
      });
      return;
    }
  }

  for (const key of SCENES) {
    if (key !== target && game.scene.isActive(key)) game.scene.stop(key);
  }
  game.scene.start(target);
}

matchStore.subscribe(route);

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#070a12',
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  dom: { createContainer: true },
  scene: [BootScene, LobbyScene, DraftScene, BattleScene],
});

// ── Banner mất kết nối (DOM, luôn nằm trên canvas) ─────────────────────

const banner = document.getElementById('offline-banner');
const bannerText = document.getElementById('offline-text');
const retry = document.getElementById('offline-retry');

let bannerTimer: number | null = null;

function hideBanner(): void {
  if (bannerTimer !== null) {
    window.clearTimeout(bannerTimer);
    bannerTimer = null;
  }
  banner?.classList.remove('visible');
}

function showBanner(status: ConnectionStatus): void {
  if (!banner || !bannerText) return;
  bannerText.textContent =
    status === 'reconnecting'
      ? 'Không kết nối được server · đang thử lại…'
      : status === 'connecting'
        ? 'Đang kết nối tới server…'
        : 'Không kết nối được server';
  banner.classList.add('visible');
}

function scheduleBanner(status: ConnectionStatus): void {
  if (bannerTimer !== null) window.clearTimeout(bannerTimer);
  if (status === 'open') {
    hideBanner();
    return;
  }
  const delay = status === 'reconnecting' ? 0 : 2_500;
  bannerTimer = window.setTimeout(() => {
    if (gameClient.status !== 'open') showBanner(gameClient.status);
  }, delay);
}

retry?.addEventListener('click', () => {
  if (bannerText) bannerText.textContent = 'Đang thử lại…';
  gameClient.reconnectNow();
});

gameClient.onStatus(scheduleBanner);

// Tự động kết nối lại khi trình duyệt online trở lại
window.addEventListener('online', () => {
  if (gameClient.status !== 'open') gameClient.reconnectNow();
});

// ── Dev hook: cho phép E2E/debug từ console mà không ảnh hưởng production ─
if (import.meta.env.DEV) {
  (window as unknown as { __prism?: unknown }).__prism = { game, gameClient, matchStore };
}

gameClient.connect();
