import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyBan,
  applyPick,
  autoBan,
  autoPick,
  createDraft,
  finalTeams,
  legalBan,
  legalPick,
  totalPicks,
} from '../src/draft.js';
import { otherSide } from '../src/side.js';
import { mulberry32 } from '../src/rng.js';
import type { Side } from '../src/types.js';

/** Chạy draft hợp lệ: mỗi bên pick 2 theo lượt, rồi ban. */
function playDraft(firstPick: Side = 'P1', banFirst: Side = 'P1'): ReturnType<typeof createDraft> {
  const draft = createDraft(firstPick);
  while (draft.phase === 'pick') {
    const hero = draft.pool[0]!;
    assert.equal(applyPick(draft, draft.turn, hero), true);
  }
  assert.equal(applyBan(draft, banFirst, draft.picks[otherSide(banFirst)][0]!), true);
  assert.equal(draft.phase, 'ban');
  assert.equal(applyBan(draft, otherSide(banFirst), draft.picks[banFirst][0]!), true);
  return draft;
}

describe('draft order', () => {
  it('snake-8: P1 → P2 → P2 → P1 → P1 → P2 → P2 → P1', () => {
    const draft = createDraft('P1');
    const order: Side[] = [];

    while (draft.phase === 'pick') {
      order.push(draft.turn);
      applyPick(draft, draft.turn, draft.pool[0]!);
    }

    assert.deepEqual(order, ['P1', 'P2', 'P2', 'P1', 'P1', 'P2', 'P2', 'P1']);
    assert.equal(draft.picks.P1.length, 4);
    assert.equal(draft.picks.P2.length, 4);
    assert.equal(draft.pool.length, 12); // 20 hero P3 - 8 pick
    assert.equal(draft.phase, 'ban');
    assert.equal(totalPicks(draft), 8);
  });

  it('First Pick đổi được (coin-flip)', () => {
    const draft = createDraft('P2');
    assert.equal(draft.turn, 'P2');
    assert.equal(draft.round, 1);
    assert.equal(draft.picksLeftThisTurn, 1);
  });

  it('round tăng đúng sau mỗi 4 pick', () => {
    const draft = createDraft('P1');
    const rounds: number[] = [];
    while (draft.phase === 'pick') {
      rounds.push(draft.round);
      applyPick(draft, draft.turn, draft.pool[0]!);
    }
    assert.deepEqual(rounds, [1, 1, 1, 1, 2, 2, 2, 2]);
  });
});

describe('validation', () => {
  it('không được pick khi không phải lượt mình', () => {
    const draft = createDraft('P1');
    assert.equal(legalPick(draft, 'P2', draft.pool[0]!), false);
    assert.equal(applyPick(draft, 'P2', draft.pool[0]!), false);
  });

  it('không pick trùng tướng', () => {
    const draft = createDraft('P1');
    const hero = draft.pool[0]!;
    applyPick(draft, 'P1', hero);
    draft.turn = 'P1';
    assert.equal(applyPick(draft, 'P1', hero), false);
  });

  it('không pick quá 4 tướng/bên', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);
    assert.equal(legalPick(draft, draft.turn, draft.pool[0] ?? 'Tank'), false);
  });

  it('ban phải nhắm tướng của đối thủ', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);

    const ownHero = draft.picks.P1[0]!;
    assert.equal(legalBan(draft, 'P1', ownHero), false);
    assert.equal(applyBan(draft, 'P1', ownHero), false);

    const enemyHero = draft.picks.P2[0]!;
    assert.equal(legalBan(draft, 'P1', enemyHero), true);
  });

  it('không ban 2 lần', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);
    applyBan(draft, 'P1', draft.picks.P2[0]!);
    assert.equal(applyBan(draft, 'P1', draft.picks.P2[1]!), false);
  });

  it('chỉ kết thúc ban khi cả 2 bên đã ban', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);

    applyBan(draft, 'P1', draft.picks.P2[0]!);
    assert.equal(draft.phase, 'ban');

    applyBan(draft, 'P2', draft.picks.P1[0]!);
    assert.equal(draft.phase, 'done');
  });
});

describe('final teams', () => {
  it('mỗi bên còn 3 tướng, tướng bị ban bị loại đúng bên', () => {
    const draft = playDraft('P1', 'P1');

    const bannedForP2 = draft.bans.P1;
    const bannedForP1 = draft.bans.P2;

    const teams = finalTeams(draft);
    assert.equal(teams.P1.length, 3);
    assert.equal(teams.P2.length, 3);
    for (const hero of bannedForP1) assert.equal(teams.P1.includes(hero), false);
    for (const hero of bannedForP2) assert.equal(teams.P2.includes(hero), false);
    assert.equal(new Set([...teams.P1, ...teams.P2]).size, 6);
  });

  it('không mất tướng nào ngoài 2 tướng bị ban', () => {
    const draft = playDraft('P2', 'P2');
    const teams = finalTeams(draft);
    const allPicked = [...draft.picks.P1, ...draft.picks.P2];
    assert.equal(allPicked.length, 8);
    assert.equal(teams.P1.length + teams.P2.length, 6);
  });
});

describe('auto action (timeout / bot)', () => {
  it('autoPick lấy ngẫu nhiên từ pool, tất định theo seed', () => {
    const a = createDraft('P1');
    const b = createDraft('P1');
    const heroA = autoPick(a, mulberry32(7));
    const heroB = autoPick(b, mulberry32(7));
    assert.equal(heroA, heroB);
    assert.equal(a.picks.P1.length, 1);
  });

  it('autoBan lấy từ đội đối thủ', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);

    const hero = autoBan(draft, 'P1', mulberry32(3));
    assert.ok(hero);
    assert.ok(draft.picks.P2.includes(hero!));
    assert.equal(draft.pendingBan.P1, hero);
  });

  it('autoBan trả null khi đã ban rồi', () => {
    const draft = createDraft('P1');
    while (draft.phase === 'pick') applyPick(draft, draft.turn, draft.pool[0]!);
    autoBan(draft, 'P1', mulberry32(1));
    assert.equal(autoBan(draft, 'P1', mulberry32(1)), null);
  });
});
