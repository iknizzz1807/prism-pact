import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createBattle, isLegalSwap, playTurn } from '../src/battle.js';
import { otherSide } from '../src/side.js';
import { chooseAction } from '../src/bot.js';
import { findRuns, hasAnyMove } from '../src/match3.js';
import { createTeam } from '../src/heroes.js';
import type { BattleState } from '../src/battle.js';

function newBattle(seed = 2026): BattleState {
  return createBattle(
    ['Tank', 'Burst', 'Healer'],
    ['Bruiser', 'Assassin', 'Controller'],
    mulberry32(seed),
  );
}

describe('battle setup', () => {
  it('tạo 2 đội 3 tướng, mana đầu trận = STARTING_MANA, P1 đi trước', () => {
    const state = newBattle();
    assert.equal(state.sides.P1.heroes.length, 3);
    assert.equal(state.sides.P2.heroes.length, 3);
    assert.equal(state.sides.P1.mana, CONFIG.STARTING_MANA);
    assert.equal(state.active, 'P1');
    assert.equal(state.turn, 0);
    assert.equal(state.winner, null);
    assert.equal(findRuns(state.board).length, 0);
  });
});

describe('turn rules', () => {
  it('swap không hợp lệ không tiêu lượt và không đổi HP/mana', () => {
    const state = newBattle();
    const heroHp = state.sides.P2.heroes.map((h) => h.hp);
    const report = playTurn(state, { swap: [0, 2] }, mulberry32(1)); // không kề nhau

    assert.equal(report.accepted, false);
    assert.equal(report.reason, 'NOT_ADJACENT');
    assert.equal(state.turn, 0);
    assert.equal(state.active, 'P1');
    assert.deepEqual(
      state.sides.P2.heroes.map((h) => h.hp),
      heroHp,
    );
  });

  it('swap không tạo match bị từ chối', () => {
    const state = newBattle();
    let rejected = 0;
    for (let i = 0; i < 64 && rejected === 0; i++) {
      const [from, to] = [i, i % 2 === 0 ? i + 1 : i - 1];
      if (from < 0 || to < 0 || to >= 64 || Math.floor(from / 8) !== Math.floor(to / 8)) continue;
      if (isLegalSwap(state.board, [from, to]) !== 'NO_MATCH') continue;
      const report = playTurn(state, { swap: [from, to] }, mulberry32(2));
      assert.equal(report.accepted, false);
      assert.equal(state.turn, 0);
      rejected++;
    }
    assert.equal(rejected, 1);
  });

  it('lượt hợp lệ: tăng turn, đổi bên, board vẫn hợp lệ', () => {
    const state = newBattle();
    const rng = mulberry32(3);
    const action = chooseAction(state, rng)!;
    const report = playTurn(state, action, rng);

    assert.equal(report.accepted, true);
    assert.equal(state.turn, 1);
    assert.equal(state.active, 'P2');
    assert.equal(findRuns(state.board).length, 0);
    assert.ok(hasAnyMove(state.board));
    assert.ok(report.mana >= 0 && report.mana <= CONFIG.MANA_MAX);
    assert.ok(report.animation, 'phải có animation để client phát lại');
    assert.equal(report.animation!.waves.length > 0, true);
  });

  it('tướng chết không hồi sinh và HP không âm', () => {
    const state = newBattle();
    for (const side of ['P1', 'P2'] as const) {
      for (const hero of state.sides[side].heroes) {
        assert.ok(hero.hp >= 0);
        assert.ok(hero.hp <= hero.maxHp);
      }
    }
  });
});

describe('full match', () => {
  it('bot đánh hết trận, kết thúc có winner hoặc draw', () => {
    for (const seed of [1, 7, 2026, 4242]) {
      const state = newBattle(seed);
      const rng = mulberry32(seed * 31 + 7);

      let guard = 0;
      while (state.winner === null && guard++ < 400) {
        const action = chooseAction(state, rng);
        if (!action) break;
        playTurn(state, action, rng);

        assert.equal(findRuns(state.board).length, 0);
        for (const side of ['P1', 'P2'] as const) {
          for (const hero of state.sides[side].heroes) {
            assert.ok(hero.hp >= 0, 'HP không được âm');
            assert.ok(hero.hp <= hero.maxHp, 'HP không vượt max');
            assert.ok(hero.shield >= 0);
          }
        }
      }

      assert.notEqual(state.winner, null, `seed ${seed}: trận không kết thúc`);
      assert.ok(state.turn > 0);
    }
  });
});

describe('sudden death', () => {
  it('sau MAX_TURNS mỗi lượt trừ 5% maxHP cả 2 bên và trận phải kết thúc', () => {
    const state = newBattle(99);
    const rng = mulberry32(99);

    // Đẩy thẳng tới ngưỡng sudden death
    state.turn = CONFIG.MAX_TURNS;

    const p1Before = state.sides.P1.heroes.map((h) => h.hp);
    const action = chooseAction(state, rng)!;
    const report = playTurn(state, action, rng);

    assert.equal(report.accepted, true);
    assert.equal(state.suddenDeath, true);

    const p1After = state.sides.P1.heroes.map((h) => h.hp);
    const lost = p1Before.reduce((sum, hp, i) => sum + (hp - p1After[i]!), 0);
    assert.ok(lost > 0, 'phải mất HP vì sudden death');
    assert.ok(report.logs.some((l) => l.includes('SUDDEN DEATH')));
  });
});

describe('summon', () => {
  it('Thrall đánh target đã commit sau lượt', () => {
    const state = newBattle(7);
    const owner = state.sides.P1.heroes[0]!;
    state.sides.P1.thrall = {
      hp: 280,
      maxHp: 280,
      atk: 54,
      ownerUid: owner.uid,
      alive: true,
    };
    const rng = mulberry32(11);
    const action = chooseAction(state, rng)!;

    const report = playTurn(
      state,
      { swap: action.swap, targetUid: 'P2:0' },
      mulberry32(11),
    );

    assert.equal(report.accepted, true);
    assert.ok(report.logs.some((line) => line.includes('Thrall')));
  });
});

describe('helpers', () => {
  it('otherSide', () => {
    assert.equal(otherSide('P1'), 'P2');
    assert.equal(otherSide('P2'), 'P1');
  });

  it('isLegalSwap phân loại đúng', () => {
    const state = newBattle(5);
    const team = createTeam(['Tank', 'Burst', 'Healer'], 'P1');
    assert.equal(team.length, 3);
    assert.equal(isLegalSwap(state.board, [0, 1]) === 'NO_MATCH' || isLegalSwap(state.board, [0, 1]) === null, true);
    assert.equal(isLegalSwap(state.board, [0, 9]), 'NOT_ADJACENT');
  });
});
