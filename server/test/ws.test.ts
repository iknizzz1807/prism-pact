import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import WebSocket from 'ws';
import type { ServerMessage } from '@prism-pact/shared';
import { startGameServer, type GameServer } from '../src/server.js';
import { RankingStore } from '../src/ranking.js';

let server: GameServer;
const sockets: WebSocket[] = [];

interface Client {
  ws: WebSocket;
  messages: ServerMessage[];
}

/** Gắn listener TRƯỚC khi socket mở để không lỡ message 'hello'. */
async function connect(url: string): Promise<Client> {
  const ws = new WebSocket(url);
  const messages: ServerMessage[] = [];
  ws.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as ServerMessage));

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  sockets.push(ws);
  return { ws, messages };
}

async function waitFor<T>(
  messages: ServerMessage[],
  pick: (list: ServerMessage[]) => T | undefined,
  timeoutMs = 4000,
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = pick(messages);
    if (value !== undefined) return value;
    if (Date.now() - start > timeoutMs) throw new Error('timeout chờ message');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const firstState = (list: ServerMessage[]) => {
  const state = list.find((m) => m.t === 'state');
  return state?.t === 'state' ? state.view : undefined;
};

describe('WS transport', () => {
  before(async () => {
    server = await startGameServer({
      port: 0,
      chain: null,
      ranking: new RankingStore(),
      timings: { pickMs: 5000, banMs: 5000, turnMs: 5000, botDelayMs: 50, disconnectGraceMs: 5000 },
      tickMs: 50,
    });
  });

  after(async () => {
    for (const ws of sockets) ws.close();
    await server.close();
  });

  it('health endpoint trả JSON', async () => {
    const response = await fetch(`http://127.0.0.1:${server.port}/health`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { ok: boolean; rooms: number };
    assert.equal(body.ok, true);
    assert.equal(typeof body.rooms, 'number');
  });

  it('2 người queue → nhận match, 2 side đối nhau, draft 8 tướng', async () => {
    const a = await connect(server.url);
    const b = await connect(server.url);

    const helloA = await waitFor(a.messages, (list) => list.find((m) => m.t === 'hello'));
    assert.equal(helloA.t, 'hello');
    assert.ok(helloA.playerId.length > 0);

    a.ws.send(JSON.stringify({ t: 'queue', name: 'Alice' }));
    const queued = await waitFor(a.messages, (list) => list.find((m) => m.t === 'queued'));
    assert.equal(queued.t, 'queued');

    b.ws.send(JSON.stringify({ t: 'queue', name: 'Bob' }));

    const viewA = await waitFor(a.messages, firstState);
    const viewB = await waitFor(b.messages, firstState);

    assert.notEqual(viewA.you, viewB.you);
    assert.equal(viewA.matchId, viewB.matchId);
    assert.equal(viewA.phase, 'draft');
    assert.equal(viewA.draft!.pool.length, 8);
    assert.equal(viewA.mode, 'pvp');

    a.ws.send(JSON.stringify({ t: 'ping' }));
    await waitFor(a.messages, (list) => list.find((m) => m.t === 'pong'));
  });

  it('playBot → vào trận với bot ngay lập tức', async () => {
    const c = await connect(server.url);
    await waitFor(c.messages, (list) => list.find((m) => m.t === 'hello'));

    c.ws.send(JSON.stringify({ t: 'playBot', name: 'Solo' }));
    const view = await waitFor(c.messages, firstState);

    assert.equal(view.mode, 'bot');
    assert.equal(view.you, 'P1');
    assert.equal(view.phase, 'draft');
  });

  it('message rác không làm sập server', async () => {
    const d = await connect(server.url);
    await waitFor(d.messages, (list) => list.find((m) => m.t === 'hello'));

    d.ws.send('not-json');
    const error = await waitFor(d.messages, (list) => list.find((m) => m.t === 'error'));
    assert.equal(error.t, 'error');
    assert.equal((error as Extract<ServerMessage, { t: 'error' }>).code, 'BAD_MESSAGE');

    d.ws.send(JSON.stringify({ t: 'ping' }));
    await waitFor(d.messages, (list) => list.find((m) => m.t === 'pong'));
  });
});
