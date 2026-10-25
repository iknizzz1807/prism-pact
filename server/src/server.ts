/**
 * Bootstrap: HTTP (health) + WebSocket (game protocol).
 * Matchmaking: hàng đợi 2 người, hoặc PvBot ngay lập tức.
 */
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { mulberry32 } from '@prism-pact/shared';
import type {
  ClientMessage,
  ErrorCode,
  ServerMessage,
  Side,
  Timings,
} from '@prism-pact/shared';
import { createBotPolicyFactory, type BotPolicyFactory } from './bots/index.js';
import { MatchRoom, type Player } from './rooms/MatchRoom.js';
import { RankingStore } from './ranking.js';
import { createChainClient, type ChainClient } from './chain.js';
import { SeasonReader } from './season.js';

export interface StartOptions {
  port?: number;
  host?: string;
  timings?: Partial<Timings>;
  tickMs?: number;
  ranking?: RankingStore;
  season?: SeasonReader;
  /** undefined = tự đọc env; null = tắt chain. */
  chain?: ChainClient | null;
  /** undefined = tự đọc env; null = tắt policy (bot heuristic đồng bộ). */
  botPolicyFactory?: BotPolicyFactory | null;
}

export interface GameServer {
  port: number;
  url: string;
  rooms: Set<MatchRoom>;
  close(): Promise<void>;
}

interface Conn {
  id: string;
  name: string;
  side: Side;
  ws: WebSocket;
  room: MatchRoom | null;
  queued: boolean;
}

function send(conn: Conn, message: ServerMessage): void {
  if (conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(message));
  }
}

function applyCors(res: ServerResponse): void {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

function json(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  applyCors(res);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export async function startGameServer(options: StartOptions = {}): Promise<GameServer> {
  const ranking = options.ranking ?? new RankingStore(process.env.RANKING_FILE);
  const chain = options.chain === undefined ? createChainClient() : options.chain;
  const season = options.season ?? new SeasonReader();
  const timings = options.timings;
  const tickMs = options.tickMs ?? 100;
  const botPolicyFactory =
    options.botPolicyFactory === undefined
      ? createBotPolicyFactory()
      : options.botPolicyFactory;

  const rooms = new Set<MatchRoom>();
  const intervals = new Map<MatchRoom, NodeJS.Timeout>();
  const waiting: Conn[] = [];
  const conns = new Set<Conn>();

  const httpServer: Server = createServer((req, res) => {
    void handleHttp(req, res).catch((error: unknown) => {
      json(res, 500, { error: (error as Error).message });
    });
  });

  async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'OPTIONS') {
      applyCors(res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/health') {
      json(res, 200, {
        ok: true,
        rooms: rooms.size,
        waiting: waiting.length,
        chainConfigured: season.configured,
      });
      return;
    }

    if (url.pathname === '/config') {
      json(res, 200, season.config());
      return;
    }

    if (url.pathname === '/season') {
      const address = url.searchParams.get('address');
      if (address && !/^0x[0-9a-fA-F]{40}$/.test(address)) {
        json(res, 400, { error: 'invalid address' });
        return;
      }
      json(res, 200, await season.read(address ?? undefined));
      return;
    }

    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('prism-pact realtime server\n');
  }

  const wss = new WebSocketServer({ server: httpServer });

  const createMatch = (a: Conn, b: Conn | null): MatchRoom => {
    const matchId = randomUUID();

    const p1: Player = {
      id: a.id,
      name: a.name,
      side: 'P1',
      isBot: false,
      send: (message) => send(a, message),
    };
    const p2: Player = b
      ? {
          id: b.id,
          name: b.name,
          side: 'P2',
          isBot: false,
          send: (message) => send(b, message),
        }
      : {
          id: `bot-${matchId.slice(0, 8)}`,
          name: 'Bot',
          side: 'P2',
          isBot: true,
          send: () => undefined,
        };

    // Mỗi phòng một RNG riêng; policy fallback dùng cùng RNG với battle.
    const roomRng = mulberry32((Math.random() * 0xffffffff) >>> 0);
    const botPolicy = b ? null : (botPolicyFactory?.(roomRng) ?? null);

    let room: MatchRoom;
    room = new MatchRoom(matchId, [p1, p2], {
      mode: b ? 'pvp' : 'bot',
      ranking,
      chain,
      timings,
      rng: roomRng,
      botPolicy,
      onFinished: (finishedRoom) => {
        const timer = intervals.get(finishedRoom);
        if (timer) clearInterval(timer);
        intervals.delete(finishedRoom);
        setTimeout(() => {
          rooms.delete(finishedRoom);
          finishedRoom.dispose();
        }, 30_000).unref?.();
      },
    });

    a.side = 'P1';
    a.room = room;
    a.queued = false;
    if (b) {
      b.side = 'P2';
      b.room = room;
      b.queued = false;
    }

    rooms.add(room);
    intervals.set(room, setInterval(() => room.tick(), tickMs));
    room.start();
    return room;
  };

  const onQueue = (conn: Conn, name: string): void => {
    if (conn.room) {
      send(conn, { t: 'error', code: 'BAD_PHASE', message: 'Bạn đang trong trận' });
      return;
    }
    if (conn.queued) {
      send(conn, { t: 'error', code: 'ALREADY_QUEUED', message: 'Bạn đã ở trong hàng đợi' });
      return;
    }
    conn.name = name.trim().slice(0, 24) || 'Player';
    conn.queued = true;

    const opponent = waiting.shift();
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
      createMatch(opponent, conn);
      return;
    }
    waiting.push(conn);
    send(conn, { t: 'queued', position: waiting.length });
  };

  const onMessage = (conn: Conn, message: ClientMessage): void => {
    switch (message.t) {
      case 'queue':
        onQueue(conn, message.name);
        return;
      case 'playBot':
        if (conn.room) return;
        conn.name = message.name.trim().slice(0, 24) || 'Player';
        createMatch(conn, null);
        return;
      case 'cancelQueue': {
        const index = waiting.indexOf(conn);
        if (index >= 0) waiting.splice(index, 1);
        conn.queued = false;
        return;
      }
      case 'ping':
        send(conn, { t: 'pong' });
        return;
      default:
        if (!conn.room) {
          send(conn, { t: 'error', code: 'NOT_IN_MATCH', message: 'Chưa vào trận nào' });
          return;
        }
        conn.room.handle(conn.side, message);
    }
  };

  const fail = (conn: Conn, code: ErrorCode, message: string): void => {
    send(conn, { t: 'error', code, message });
  };

  wss.on('connection', (ws) => {
    const conn: Conn = {
      id: randomUUID(),
      name: 'Player',
      side: 'P1',
      ws,
      room: null,
      queued: false,
    };
    conns.add(conn);
    send(conn, { t: 'hello', playerId: conn.id });

    ws.on('message', (raw) => {
      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        fail(conn, 'BAD_MESSAGE', 'JSON không hợp lệ');
        return;
      }
      try {
        onMessage(conn, parsed);
      } catch (error) {
        fail(conn, 'BAD_MESSAGE', (error as Error).message);
      }
    });

    ws.on('close', () => {
      conns.delete(conn);
      const index = waiting.indexOf(conn);
      if (index >= 0) waiting.splice(index, 1);
      if (conn.room && !conn.room.isFinished) conn.room.playerLeft(conn.side);
    });

    ws.on('error', () => {
      // đóng socket sẽ do 'close' xử lý
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port ?? 2567, options.host ?? '0.0.0.0', () => resolve());
  });

  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : (options.port ?? 2567);

  return {
    port,
    url: `ws://127.0.0.1:${port}`,
    rooms,
    async close() {
      for (const timer of intervals.values()) clearInterval(timer);
      intervals.clear();
      for (const room of rooms) room.dispose();
      rooms.clear();
      for (const conn of conns) conn.ws.terminate();
      conns.clear();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
