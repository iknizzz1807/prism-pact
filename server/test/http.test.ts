import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startGameServer, type GameServer } from '../src/server.js';
import { RankingStore } from '../src/ranking.js';
import { SeasonReader } from '../src/season.js';

let server: GameServer;

function url(path: string): string {
  return `http://127.0.0.1:${server.port}${path}`;
}

describe('HTTP API', () => {
  before(async () => {
    server = await startGameServer({
      port: 0,
      chain: null,
      ranking: new RankingStore(),
      // Không có vault → chế độ "chưa cấu hình", không gọi RPC
      season: new SeasonReader({ env: {}, useDeploymentFile: false }),
      tickMs: 50,
    });
  });

  after(async () => {
    await server.close();
  });

  it('GET /health trả trạng thái server', async () => {
    const response = await fetch(url('/health'));
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.chainConfigured, false);
    assert.equal(typeof body.rooms, 'number');
  });

  it('GET /config trả chainId Fuji + address null khi chưa cấu hình', async () => {
    const response = await fetch(url('/config'));
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      chainId: number;
      vaultAddress: string | null;
      usdcAddress: string | null;
      seasonEnd: number;
    };
    assert.equal(body.chainId, 43113);
    assert.equal(body.vaultAddress, null);
    assert.equal(body.usdcAddress, null);
    assert.equal(body.seasonEnd, 0);
  });

  it('GET /season trả zero-state khi chưa cấu hình (client vẫn render được)', async () => {
    const response = await fetch(url('/season'));
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      configured: boolean;
      prizePool: string;
      totalPrincipal: string;
      seasonEnd: number;
    };
    assert.equal(body.configured, false);
    assert.equal(body.prizePool, '0');
    assert.equal(body.totalPrincipal, '0');
    assert.equal(body.seasonEnd, 0);
  });

  it('CORS mở cho client ở port khác', async () => {
    const response = await fetch(url('/config'));
    assert.equal(response.headers.get('access-control-allow-origin'), '*');

    const preflight = await fetch(url('/config'), { method: 'OPTIONS' });
    assert.equal(preflight.status, 204);
  });

  it('địa chỉ sai định dạng bị từ chối', async () => {
    const response = await fetch(url('/season?address=hello'));
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, 'invalid address');
  });
});
