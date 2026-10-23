import type {
  Archetype,
  ClientMessage,
  ErrorCode,
  MatchView,
  RankView,
  ServerMessage,
  Side,
  TurnAnimation,
} from '@prism-pact/shared';
import { SERVER_WS_URL } from '../env';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'offline';

type Unsubscribe = () => void;

type StateListener = (view: MatchView, events: string[], animation?: TurnAnimation) => void;
type ErrorListener = (code: ErrorCode, message: string) => void;
type EndListener = (winner: Side | 'draw', rank: RankView) => void;
type QueuedListener = (position: number) => void;
type HelloListener = (playerId: string) => void;
type StatusListener = (status: ConnectionStatus) => void;

function listen<T>(set: Set<T>, listener: T): Unsubscribe {
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** WebSocket client có type, tự reconnect với backoff. Chỉ gửi intent — không tin client. */
export class GameClient {
  playerId: string | null = null;

  private socket: WebSocket | null = null;
  private statusValue: ConnectionStatus = 'offline';
  private attempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manualClose = true;

  private readonly stateListeners = new Set<StateListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly endListeners = new Set<EndListener>();
  private readonly queuedListeners = new Set<QueuedListener>();
  private readonly helloListeners = new Set<HelloListener>();
  private readonly statusListeners = new Set<StatusListener>();

  get status(): ConnectionStatus {
    return this.statusValue;
  }

  get connected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.manualClose = false;
    this.clearReconnectTimer();
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(SERVER_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;
    socket.onopen = () => {
      this.attempts = 0;
      this.setStatus('open');
      this.startHeartbeat();
    };
    socket.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
    socket.onerror = () => {
      // Lỗi mạng luôn kéo theo 'close'; xử lý ở đó để tránh reconnect 2 lần.
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.stopHeartbeat();
      if (this.manualClose) {
        this.setStatus('offline');
        return;
      }
      this.scheduleReconnect();
    };
  }

  /** Bỏ qua backoff và thử mở lại ngay. */
  reconnectNow(): void {
    this.clearReconnectTimer();
    this.attempts = 0;
    const old = this.socket;
    this.socket = null;
    if (old) {
      old.onopen = null;
      old.onmessage = null;
      old.onclose = null;
      old.onerror = null;
      try {
        old.close();
      } catch {
        // Socket đã chết — không cần làm gì.
      }
    }
    this.manualClose = false;
    this.connect();
  }

  /** Rời trận: đóng socket rồi mở phiên mới để thoát room phía server. */
  leaveMatch(): void {
    this.disconnect();
    window.setTimeout(() => this.connect(), 120);
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
    this.setStatus('offline');
  }

  queue(name: string): boolean {
    return this.send({ t: 'queue', name });
  }

  playBot(name: string): boolean {
    return this.send({ t: 'playBot', name });
  }

  cancelQueue(): boolean {
    return this.send({ t: 'cancelQueue' });
  }

  pick(hero: Archetype): boolean {
    return this.send({ t: 'pick', hero });
  }

  ban(hero: Archetype): boolean {
    return this.send({ t: 'ban', hero });
  }

  skill(casterUid: string, targetUid?: string): boolean {
    return this.send(targetUid ? { t: 'skill', casterUid, targetUid } : { t: 'skill', casterUid });
  }

  target(targetUid: string): boolean {
    return this.send({ t: 'target', targetUid });
  }

  swap(from: number, to: number): boolean {
    return this.send({ t: 'swap', from, to });
  }

  ping(): boolean {
    return this.send({ t: 'ping' });
  }

  send(message: ClientMessage): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  onState(listener: StateListener): Unsubscribe {
    return listen(this.stateListeners, listener);
  }

  onError(listener: ErrorListener): Unsubscribe {
    return listen(this.errorListeners, listener);
  }

  onEnd(listener: EndListener): Unsubscribe {
    return listen(this.endListeners, listener);
  }

  onQueued(listener: QueuedListener): Unsubscribe {
    return listen(this.queuedListeners, listener);
  }

  onHello(listener: HelloListener): Unsubscribe {
    return listen(this.helloListeners, listener);
  }

  onStatus(listener: StatusListener): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.statusValue);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || !('t' in parsed)) return;
    const message = parsed as ServerMessage;

    switch (message.t) {
      case 'hello':
        this.playerId = message.playerId;
        for (const listener of this.helloListeners) listener(message.playerId);
        return;
      case 'queued':
        for (const listener of this.queuedListeners) listener(message.position);
        return;
      case 'match':
        for (const listener of this.stateListeners) listener(message.view, message.events ?? []);
        return;
      case 'state':
        for (const listener of this.stateListeners) listener(message.view, message.events ?? [], message.animation);
        return;
      case 'error':
        for (const listener of this.errorListeners) listener(message.code, message.message);
        return;
      case 'end':
        for (const listener of this.endListeners) listener(message.winner, message.rank);
        return;
      case 'pong':
        return;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.statusValue === status) return;
    this.statusValue = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    this.attempts += 1;
    this.setStatus('reconnecting');
    const backoff = Math.min(800 * 2 ** Math.min(this.attempts - 1, 4), 8_000);
    const jitter = Math.random() * 300;
    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, backoff + jitter);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.connected) this.ping();
    }, 20_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const gameClient = new GameClient();
