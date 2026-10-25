import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBattle, findMoves, mulberry32 } from '@prism-pact/shared';
import type {
  BattleState,
  Board,
  MatchView,
  ServerMessage,
  Side,
} from '@prism-pact/shared';
import { createBotPolicyFactory } from '../src/bots/config.js';
import { HeuristicPolicy } from '../src/bots/heuristicPolicy.js';
import {
  JevError,
  JevPolicy,
  VonPolicy,
  type JevConfig,
  type JevFetch,
} from '../src/bots/jevPolicy.js';
import { PolicyRunner } from '../src/bots/policyRunner.js';
import {
  INTENT_WEIGHTS,
  type BotPolicy,
  type TurnPlan,
} from '../src/bots/types.js';
import { MatchRoom, type Player } from '../src/rooms/MatchRoom.js';

const CONFIG: JevConfig = {
  apiKey: 'test-key',
  model: 'typesafe/jev-1.14',
  baseUrl: 'https://example.test/api/v1/systemone',
};

function newState(): BattleState {
  const state = createBattle(
    ['Tank', 'Burst', 'Healer'],
    ['Bruiser', 'Assassin', 'Controller'],
    mulberry32(2026),
  );
  state.sides.P1.mana = 100;
  return state;
}

/** Oracle có skill target ally (Mend) để test tách skill target khỏi attack target. */
function newOracleState(): BattleState {
  const state = createBattle(
    ['Tank', 'Burst', 'Oracle'],
    ['Bruiser', 'Assassin', 'Controller'],
    mulberry32(2026),
  );
  state.sides.P1.mana = 100;
  return state;
}

interface MockCall {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    state: string;
    questions: Record<string, unknown>;
  };
}

function mockFetch(responses: unknown[]): { fetchImpl: JevFetch; calls: MockCall[] } {
  const calls: MockCall[] = [];
  let index = 0;
  const fetchImpl: JevFetch = async (url, init) => {
    calls.push({
      url,
      headers: init.headers,
      body: JSON.parse(init.body) as MockCall['body'],
    });
    const response = responses[index++];
    if (response === undefined) throw new Error(`unexpected request #${index}`);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(response),
    };
  };
  return { fetchImpl, calls };
}

function choice(
  key: string,
  value: string,
  confidence = 0.9,
  probabilities?: Record<string, number>,
): unknown {
  return {
    answers: {
      [key]: {
        type: 'choice',
        choice: value,
        confidence,
        probabilities: probabilities ?? { [value]: confidence },
      },
    },
  };
}

describe('JevPolicy — sequential chain', () => {
  it('skill → target → intent, state sau nhận quyết định trước', async () => {
    const mock = mockFetch([
      choice('skill', 'ATTACK_2'),
      choice('target', 'T2'),
      choice('intent', 'FINISH'),
    ]);
    const policy = new JevPolicy(CONFIG, mock.fetchImpl);

    const plan = await policy.planTurn(newState(), 'P1');
    assert.ok(plan);

    assert.equal(plan.source, 'jev');
    assert.equal(plan.intent, 'FINISH');
    assert.deepEqual(plan.weights, INTENT_WEIGHTS.FINISH);
    assert.equal(plan.skill?.casterUid, 'P1:1', 'ATTACK_2 = Burst Nuke');
    assert.equal(plan.skill?.targetUid, 'P2:1', 'T2 = Assassin');
    assert.equal(plan.targetUid, 'P2:1');
    assert.ok((plan.confidence ?? 0) >= 0.8);

    assert.equal(mock.calls.length, 3);
    assert.equal(mock.calls[0]!.body.model, 'typesafe/jev-1.14');
    assert.equal(mock.calls[0]!.headers.authorization, 'Bearer test-key');
    assert.ok(mock.calls[0]!.body.state.includes('LEGAL SKILLS'));
    assert.ok(mock.calls[1]!.body.state.includes('DECISION_1: skill=Nuke'));
    assert.ok(mock.calls[2]!.body.state.includes('DECISION_2: target=P2:1'));
  });

  it('skill target ally → basic attack vẫn nhắm tướng địch', async () => {
    const mock = mockFetch([
      choice('skill', 'HEAL_3'),
      choice('target', 'T1'),
      choice('intent', 'SUSTAIN'),
    ]);
    const policy = new JevPolicy(CONFIG, mock.fetchImpl);

    const plan = await policy.planTurn(newOracleState(), 'P1');
    assert.ok(plan);

    assert.equal(plan.skill?.casterUid, 'P1:2', 'HEAL_3 = Oracle Mend');
    assert.equal(plan.skill?.targetUid, 'P1:0', 'T1 = Tank đồng minh');
    assert.equal(plan.targetUid, 'P2:0', 'basic attack vẫn phải là địch');
    assert.equal(plan.intent, 'SUSTAIN');
  });

  it('không có skill hợp lệ → bỏ call skill, chỉ hỏi intent', async () => {
    const state = newState();
    state.sides.P1.mana = 0;
    const mock = mockFetch([choice('intent', 'CHARGE')]);
    const policy = new JevPolicy(CONFIG, mock.fetchImpl);

    const plan = await policy.planTurn(state, 'P1');
    assert.ok(plan);

    assert.equal(plan.skill, null);
    assert.equal(plan.intent, 'CHARGE');
    assert.equal(plan.targetUid, 'P2:0');
    assert.equal(mock.calls.length, 1);
    assert.ok(mock.calls[0]!.body.state.includes('LEGAL SKILLS (only legal options are listed):\n- none'));
  });

  it('option lạ → JevError invalid-option', async () => {
    const mock = mockFetch([choice('skill', 'NOPE')]);
    const policy = new JevPolicy(CONFIG, mock.fetchImpl);

    await assert.rejects(
      policy.planTurn(newState(), 'P1'),
      (error: unknown) =>
        error instanceof JevError && error.code === 'invalid-option',
    );
  });
});

describe('VonPolicy — same wire protocol', () => {
  it('source=von, không gửi Authorization khi apiKey rỗng', async () => {
    const state = newState();
    state.sides.P1.mana = 0;
    const mock = mockFetch([choice('intent', 'CHARGE')]);
    const policy = new VonPolicy(
      {
        apiKey: '',
        model: 'von-1.3.0',
        baseUrl: 'http://127.0.0.1:8000/v1/systemone',
      },
      mock.fetchImpl,
    );

    const plan = await policy.planTurn(state, 'P1');
    assert.ok(plan);
    assert.equal(plan.source, 'von');
    assert.equal(plan.intent, 'CHARGE');
    assert.equal(mock.calls[0]!.body.model, 'von-1.3.0');
    assert.ok(!('authorization' in mock.calls[0]!.headers));
  });
});

describe('PolicyRunner — fallback', () => {
  const fallback = () => new HeuristicPolicy(mulberry32(3));

  it('network error → heuristic', async () => {
    const failing: JevFetch = async () => {
      throw new Error('network down');
    };
    const runner = new PolicyRunner({
      primary: new JevPolicy(CONFIG, failing),
      fallback: fallback(),
      timeoutMs: 1000,
      minConfidence: 0.2,
      minMargin: 0.05,
    });

    const plan = await runner.planTurn(newState(), 'P1');
    assert.equal(plan.source, 'heuristic');
    assert.equal(plan.intent, 'BALANCED');
    assert.match(plan.fallbackReason ?? '', /network down/);
  });

  it('confidence thấp → heuristic dù chain trả đủ option', async () => {
    const mock = mockFetch([
      choice('skill', 'ATTACK_2', 0.15, {
        ATTACK_2: 0.4,
        HEAL_3: 0.35,
        TAUNT_1: 0.25,
      }),
      choice('target', 'T2', 0.9),
      choice('intent', 'FINISH', 0.9),
    ]);
    const runner = new PolicyRunner({
      primary: new JevPolicy(CONFIG, mock.fetchImpl),
      fallback: fallback(),
      timeoutMs: 1000,
      minConfidence: 0.2,
      minMargin: 0.05,
    });

    const plan = await runner.planTurn(newState(), 'P1');
    assert.equal(plan.source, 'heuristic');
    assert.match(plan.fallbackReason ?? '', /low-confidence|low-margin/);
    assert.equal(mock.calls.length, 3);
  });

  it('timeout → heuristic', async () => {
    const hanging: JevFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        );
      });
    const runner = new PolicyRunner({
      primary: new JevPolicy(CONFIG, hanging),
      fallback: fallback(),
      timeoutMs: 20,
      minConfidence: 0.2,
      minMargin: 0.05,
    });

    const plan = await runner.planTurn(newState(), 'P1');
    assert.equal(plan.source, 'heuristic');
    assert.equal(plan.fallbackReason, 'timeout');
  });

  it('fetch không tôn trọng abort vẫn bị timeout → heuristic', async () => {
    const stubborn: JevFetch = () => new Promise(() => undefined);
    const runner = new PolicyRunner({
      primary: new JevPolicy(CONFIG, stubborn),
      fallback: fallback(),
      timeoutMs: 20,
      minConfidence: 0.2,
      minMargin: 0.05,
    });

    const plan = await runner.planTurn(newState(), 'P1');
    assert.equal(plan.source, 'heuristic');
    assert.equal(plan.fallbackReason, 'timeout');
  });
});

describe('bot policy config', () => {
  it('BOT_POLICY=heuristic → không tạo policy', () => {
    const factory = createBotPolicyFactory({ env: { BOT_POLICY: 'heuristic' } });
    assert.equal(factory(mulberry32(1)), null);
  });

  it('BOT_POLICY=jev thiếu key → cảnh báo + heuristic', () => {
    const messages: string[] = [];
    const factory = createBotPolicyFactory({
      env: { BOT_POLICY: 'jev' },
      log: (message) => messages.push(message),
    });
    assert.equal(factory(mulberry32(1)), null);
    assert.ok(messages.some((message) => message.includes('OPENROUTER_API_KEY')));
  });

  it('BOT_POLICY=jev có key → runner Jev + fallback', () => {
    const factory = createBotPolicyFactory({
      env: { BOT_POLICY: 'jev', OPENROUTER_API_KEY: 'test-key' },
      fetch: async () => {
        throw new Error('must not be called');
      },
    });
    const policy = factory(mulberry32(1));
    assert.ok(policy);
    assert.equal(policy.name, 'jev+fallback');
  });

  it('BOT_POLICY=von → runner Von + fallback, không cần API key', () => {
    const factory = createBotPolicyFactory({
      env: { BOT_POLICY: 'von' },
      fetch: async () => {
        throw new Error('must not be called');
      },
    });
    const policy = factory(mulberry32(1));
    assert.ok(policy);
    assert.equal(policy.name, 'von+fallback');
  });
});

// ── MatchRoom async integration ────────────────────────────────────────

type FakePlayer = Player & { inbox: ServerMessage[] };

function fakePlayer(side: Side): FakePlayer {
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

function lastView(player: FakePlayer): MatchView | null {
  for (let i = player.inbox.length - 1; i >= 0; i--) {
    const message = player.inbox[i]!;
    if (message.t === 'state' || message.t === 'match') return message.view;
  }
  return null;
}

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

class CountingPolicy implements BotPolicy {
  readonly name = 'counting';
  calls = 0;

  async planTurn(_state: BattleState, _side: Side): Promise<TurnPlan | null> {
    this.calls += 1;
    return {
      skill: null,
      targetUid: null,
      intent: 'BALANCED',
      weights: INTENT_WEIGHTS.BALANCED,
      source: 'jev',
    };
  }
}

async function playAsyncBotMatch(
  room: MatchRoom,
  clock: { t: number },
  human: FakePlayer,
): Promise<void> {
  for (let step = 0; step < 5000; step++) {
    const view = lastView(human);
    if (!view) {
      clock.t += 10;
      room.tick();
      await flush();
      continue;
    }
    if (view.phase === 'result') return;

    if (view.phase === 'draft') {
      if (view.draft!.turn === 'P2') {
        clock.t += 20;
        room.tick();
        await flush();
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
      await flush();
      continue;
    }

    if (view.phase === 'battle') {
      if (view.battle!.active === 'P2') {
        clock.t += 20;
        room.tick();
        await flush();
        continue;
      }
      const board = view.battle!.board as unknown as Board;
      const moves = findMoves(board);
      if (moves.length === 0) {
        clock.t += 1000;
        room.tick();
        await flush();
        continue;
      }
      const [from, to] = moves[0]!;
      room.handle('P1', { t: 'swap', from, to });
      continue;
    }
  }
  throw new Error('async bot match did not finish');
}

describe('MatchRoom — async bot policy', () => {
  it('bot dùng policy async và chạy hết trận, không đánh 2 lần', async () => {
    const clock = { t: 0 };
    const human = fakePlayer('P1');
    const policy = new CountingPolicy();
    const room = new MatchRoom(
      'match-policy',
      [
        human,
        { id: 'bot', name: 'Bot', side: 'P2', isBot: true, send: () => undefined },
      ],
      {
        now: () => clock.t,
        rng: mulberry32(7),
        timings: {
          pickMs: 1000,
          banMs: 1000,
          turnMs: 1000,
          botDelayMs: 10,
          disconnectGraceMs: 5000,
        },
        animationBudget: () => 0,
        botPolicy: policy,
      },
    );

    room.start();
    await playAsyncBotMatch(room, clock, human);

    const view = lastView(human)!;
    assert.equal(view.phase, 'result');
    assert.ok(policy.calls > 0, 'policy phải được gọi');
  });
});
