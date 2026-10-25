import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findMoves, mulberry32 } from '@prism-pact/shared';
import type { Board, ClientMessage, MatchView, ServerMessage, Side } from '@prism-pact/shared';
import { MatchRoom, type Player } from '../src/rooms/MatchRoom.js';
import { RankingStore } from '../src/ranking.js';

type Fake = Player & { inbox: ServerMessage[] };

function fakePlayer(side: Side): Fake {
  const inbox: ServerMessage[] = [];
  return {
    id: `player-${side}`,
    name: `${side}-name`,
    side,
    isBot: false,
    send: (message) => inbox.push(message),
    inbox,
  };
}

function lastView(player: Fake): MatchView | null {
  for (let i = player.inbox.length - 1; i >= 0; i--) {
    const msg = player.inbox[i]!;
    if (msg.t === 'state' || msg.t === 'match') return msg.view;
  }
  return null;
}

interface Clock {
  t: number;
}

function makeRoom(
  pool: [Fake, Fake] | [Fake, null],
  clock: Clock,
  options: { rngSeed?: number; ranking?: RankingStore } = {},
): MatchRoom {
  const [p1, p2] = pool;
  const botSide = p2 ? undefined : 'P2';
  const players: [Player, Player] = [
    p1,
    p2 ?? {
      id: 'bot',
      name: 'Bot',
      side: botSide!,
      isBot: true,
      send: () => undefined,
    },
  ];
  return new MatchRoom('match-test', players, {
    now: () => clock.t,
    rng: mulberry32(options.rngSeed ?? 42),
    ranking: options.ranking,
    timings: { pickMs: 1000, banMs: 1000, turnMs: 1000, botDelayMs: 10, disconnectGraceMs: 5000 },
    // Test điều khiển đồng hồ thủ công → không cộng bù animation.
    animationBudget: () => 0,
  });
}

/** Điều khiển 1 trận PvP tới hết bằng nước đi hợp lệ. */
function playPvp(room: MatchRoom, clock: Clock, players: [Fake, Fake]): void {
  for (let step = 0; step < 5000; step++) {
    const view = lastView(players[0]);
    if (!view) {
      clock.t += 10;
      room.tick();
      continue;
    }
    if (view.phase === 'result') return;

    if (view.phase === 'draft') {
      const side = view.draft!.turn;
      room.handle(side, { t: 'pick', hero: view.draft!.pool[0]! });
      continue;
    }

    if (view.phase === 'ban') {
      let acted = false;
      for (const side of ['P1', 'P2'] as Side[]) {
        const player = side === 'P1' ? players[0] : players[1];
        const sideView = lastView(player)!;
        if (sideView.draft!.yourBan === null) {
          const enemyPicks = side === 'P1' ? sideView.draft!.picks.P2 : sideView.draft!.picks.P1;
          room.handle(side, { t: 'ban', hero: enemyPicks[0]! });
          acted = true;
        }
      }
      if (!acted) {
        clock.t += 100;
        room.tick();
      }
      continue;
    }

    if (view.phase === 'battle') {
      const side = view.battle!.active;
      const board = view.battle!.board as unknown as Board;
      const moves = findMoves(board);
      if (moves.length === 0) {
        clock.t += 1000;
        room.tick();
        continue;
      }
      const [from, to] = moves[0]!;
      room.handle(side, { t: 'swap', from, to });
      continue;
    }
  }
  throw new Error('trận không kết thúc sau 5000 bước');
}

/** P1 là người, P2 là bot. */
function playBotMatch(room: MatchRoom, clock: Clock, human: Fake): void {
  for (let step = 0; step < 5000; step++) {
    const view = lastView(human);
    if (!view) {
      clock.t += 10;
      room.tick();
      continue;
    }
    if (view.phase === 'result') return;

    if (view.phase === 'draft') {
      if (view.draft!.turn === 'P2') {
        clock.t += 20;
        room.tick();
      } else {
        room.handle('P1', { t: 'pick', hero: view.draft!.pool[0]! });
      }
      continue;
    }

    if (view.phase === 'ban') {
      if (view.draft!.yourBan === null) {
        room.handle('P1', { t: 'ban', hero: view.draft!.picks.P2[0]! });
      }
      clock.t += 20;
      room.tick();
      continue;
    }

    if (view.phase === 'battle') {
      if (view.battle!.active === 'P2') {
        clock.t += 20;
        room.tick();
        continue;
      }
      const board = view.battle!.board as unknown as Board;
      const moves = findMoves(board);
      if (moves.length === 0) {
        clock.t += 1000;
        room.tick();
        continue;
      }
      const [from, to] = moves[0]!;
      room.handle('P1', { t: 'swap', from, to });
      continue;
    }
  }
  throw new Error('trận bot không kết thúc');
}

describe('MatchRoom — PvP', () => {
  it('chạy hết trận: draft → ban → battle → result, cả 2 nhận end + rank', () => {
    const clock: Clock = { t: 0 };
    const ranking = new RankingStore();
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock, { ranking });

    room.start();
    playPvp(room, clock, [p1, p2]);

    const view = lastView(p1)!;
    assert.equal(view.phase, 'result');
    assert.notEqual(view.winner, null);

    const end1 = p1.inbox.find((m) => m.t === 'end') as Extract<ServerMessage, { t: 'end' }>;
    const end2 = p2.inbox.find((m) => m.t === 'end') as Extract<ServerMessage, { t: 'end' }>;
    assert.equal(end1.winner, view.winner);
    assert.equal(end2.winner, view.winner);

    const winnerEnd = view.winner === 'P1' ? end1 : end2;
    const loserEnd = view.winner === 'P1' ? end2 : end1;
    assert.equal(winnerEnd.rank.delta, 25);
    assert.equal(winnerEnd.rank.points, 25);
    assert.equal(loserEnd.rank.delta, -15);
    assert.equal(loserEnd.rank.points, 0, 'rank không được âm');
  });

  it('draft: snake-8, pool giảm dần, ban ẩn tới khi cả 2 xong', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();

    // First pick random (coin-flip) → test theo turn thực tế.
    const first = lastView(p1)!.draft!.turn;
    const second: Side = first === 'P1' ? 'P2' : 'P1';
    const order: Side[] = [first, second, second, first, first, second, second, first];

    assert.equal(lastView(p1)!.draft!.pool.length, 20);

    // Không thể pick khi không phải lượt.
    room.handle(second, { t: 'pick', hero: lastView(p1)!.draft!.pool[0]! });
    const errors = (second === 'P1' ? p1 : p2).inbox.filter((m) => m.t === 'error');
    assert.equal(errors.length, 1);
    assert.equal((errors[0] as Extract<ServerMessage, { t: 'error' }>).code, 'NOT_YOUR_TURN');

    for (const side of order) {
      assert.equal(lastView(p1)!.draft!.turn, side);
      room.handle(side, { t: 'pick', hero: lastView(p1)!.draft!.pool[0]! });
    }

    const banView = lastView(p1)!;
    assert.equal(banView.phase, 'ban');
    assert.equal(banView.draft!.picks[first].length, 4);
    assert.equal(banView.draft!.picks[second].length, 4);
    assert.equal(banView.draft!.pool.length, 12);
    assert.deepEqual(banView.draft!.bans, { P1: [], P2: [] }, 'ban phải ẩn');

    room.handle(first, { t: 'ban', hero: banView.draft!.picks[second][0]! });
    assert.deepEqual(lastView(p1)!.draft!.bans, { P1: [], P2: [] }, 'chưa đủ 2 ban thì vẫn ẩn');

    room.handle(second, { t: 'ban', hero: banView.draft!.picks[first][0]! });
    const battleView = lastView(p1)!;
    assert.equal(battleView.phase, 'battle');
    assert.equal(battleView.draft!.bans[first].length, 1);
    assert.equal(battleView.battle!.sides.P1.heroes.length, 3);
    assert.equal(battleView.battle!.sides.P2.heroes.length, 3);
  });

  it('timeout pick → tự động pick', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    const before = lastView(p1)!.draft!.pool.length;

    clock.t = 1500;
    room.tick();

    const after = lastView(p1)!;
    assert.equal(after.draft!.pool.length, before - 1);
    assert.ok(after.draft!.picks.P1.length + after.draft!.picks.P2.length === 1);
    assert.ok(p1.inbox.some((m) => m.t === 'state' && m.events.some((e) => e.includes('hết giờ'))));
  });

  it('timeout ban → auto-ban cả 2 và vào trận', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    // pick hết
    while (lastView(p1)!.phase === 'draft') {
      const v = lastView(p1)!;
      room.handle(v.draft!.turn, { t: 'pick', hero: v.draft!.pool[0]! });
    }
    assert.equal(lastView(p1)!.phase, 'ban');

    clock.t += 2000;
    room.tick();

    const v = lastView(p1)!;
    assert.equal(v.phase, 'battle');
    assert.equal(v.draft!.bans.P1.length, 1);
    assert.equal(v.draft!.bans.P2.length, 1);
  });

  it('swap sai không tiêu lượt', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    while (lastView(p1)!.phase !== 'battle') {
      const v = lastView(p1)!;
      if (v.phase === 'draft') room.handle(v.draft!.turn, { t: 'pick', hero: v.draft!.pool[0]! });
      else if (v.phase === 'ban') {
        room.handle('P1', { t: 'ban', hero: v.draft!.picks.P2[0]! });
        room.handle('P2', { t: 'ban', hero: v.draft!.picks.P1[0]! });
      }
    }

    const before = lastView(p1)!;
    room.handle('P1', { t: 'swap', from: 0, to: 63 });
    const after = lastView(p1)!;

    assert.equal(after.battle!.turn, before.battle!.turn);
    assert.equal(after.battle!.sides.P1.mana, before.battle!.sides.P1.mana);
  });

  it('sai lượt: P2 không được swap khi đang là lượt P1', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    while (lastView(p1)!.phase !== 'battle') {
      const v = lastView(p1)!;
      if (v.phase === 'draft') room.handle(v.draft!.turn, { t: 'pick', hero: v.draft!.pool[0]! });
      else if (v.phase === 'ban') {
        room.handle('P1', { t: 'ban', hero: v.draft!.picks.P2[0]! });
        room.handle('P2', { t: 'ban', hero: v.draft!.picks.P1[0]! });
      }
    }

    room.handle('P2', { t: 'swap', from: 0, to: 1 });
    const errors = p2.inbox.filter((m) => m.t === 'error');
    assert.equal((errors.at(-1) as Extract<ServerMessage, { t: 'error' }>).code, 'NOT_YOUR_TURN');
  });

  it('mất kết nối quá grace → xử thua', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    room.playerLeft('P1');
    clock.t += 6000;
    room.tick();

    const view = lastView(p2)!;
    assert.equal(view.phase, 'result');
    assert.equal(view.winner, 'P2');
  });

  it('reconnect trong grace → không xử thua', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    room.playerLeft('P1');
    clock.t += 1000;
    room.playerRejoin('P1');
    clock.t += 6000;
    room.tick();

    assert.equal(lastView(p1)!.phase, 'draft');
    assert.equal(room.isFinished, false);
  });
});

describe('MatchRoom — bot', () => {
  it('PvBot chạy hết trận, bot draft + battle tự động', () => {
    const clock: Clock = { t: 0 };
    const human = fakePlayer('P1');
    const room = makeRoom([human, null], clock, { rngSeed: 7 });

    room.start();
    playBotMatch(room, clock, human);

    const view = lastView(human)!;
    assert.equal(view.phase, 'result');
    assert.equal(view.mode, 'bot');
    assert.equal(view.battle!.sides.P1.heroes.length, 3);
  });

  it('bot pick đủ 4 tướng trong draft', () => {
    const clock: Clock = { t: 0 };
    const human = fakePlayer('P1');
    const room = makeRoom([human, null], clock);

    room.start();
    // để bot tự pick, human pick khi tới lượt
    for (let i = 0; i < 8; i++) {
      const view = lastView(human)!;
      if (view.phase !== 'draft') break;
      if (view.draft!.turn === 'P2') {
        clock.t += 20;
        room.tick();
      } else {
        room.handle('P1', { t: 'pick', hero: view.draft!.pool[0]! });
      }
    }

    const view = lastView(human)!;
    assert.equal(view.draft!.picks.P1.length, 4);
    assert.equal(view.draft!.picks.P2.length, 4);
  });
});

describe('protocol errors', () => {
  it('message sai phase bị từ chối', () => {
    const clock: Clock = { t: 0 };
    const p1 = fakePlayer('P1');
    const p2 = fakePlayer('P2');
    const room = makeRoom([p1, p2], clock);

    room.start();
    const msg: ClientMessage = { t: 'swap', from: 0, to: 1 };
    room.handle('P1', msg);

    const errors = p1.inbox.filter((m) => m.t === 'error');
    assert.equal((errors.at(-1) as Extract<ServerMessage, { t: 'error' }>).code, 'BAD_PHASE');
  });
});
