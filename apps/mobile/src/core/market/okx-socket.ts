export type SocketStatus = 'connecting' | 'open' | 'reconnecting';

export type SocketState = {
  status: SocketStatus;
  /** Epoch ms of the next reconnect attempt while `reconnecting`, otherwise 0. */
  retryAt: number;
};

export type ChannelArg = { channel: string; instId: string };

export type ChannelMessage = {
  action?: 'snapshot' | 'update';
  data: any[];
};

type Handler = (message: ChannelMessage) => void;

const URL = 'wss://ws.okx.com:8443/ws/v5/public';
const HEARTBEAT_MS = 10_000;
/** OKX drops a connection that is silent for 30s, so give up a little earlier. */
const STALE_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;
const IDLE_CLOSE_MS = 3_000;

const topicKey = (arg: ChannelArg) => `${arg.channel}:${arg.instId}`;

/**
 * One shared connection to OKX's public WebSocket. Consumers subscribe to channels; the socket
 * reconnects with backoff, re-subscribes everything, and closes itself once nobody is listening.
 */
export class OkxSocket {
  private ws: WebSocket | null = null;
  private topics = new Map<string, { arg: ChannelArg; handlers: Set<Handler> }>();
  private listeners = new Set<() => void>();
  private state: SocketState = { status: 'connecting', retryAt: 0 };
  private attempt = 0;
  private lastMessageAt = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  /** For useSyncExternalStore. The returned object only changes when the state does. */
  getState = (): SocketState => this.state;

  subscribeState = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Subscribes to a channel. Returns the function that unsubscribes. */
  subscribe(arg: ChannelArg, handler: Handler): () => void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;

    const key = topicKey(arg);
    let topic = this.topics.get(key);
    if (!topic) {
      topic = { arg, handlers: new Set() };
      this.topics.set(key, topic);
      this.send({ op: 'subscribe', args: [arg] });
    }
    topic.handlers.add(handler);
    this.ensureConnected();

    return () => {
      const current = this.topics.get(key);
      if (!current) return;
      current.handlers.delete(handler);
      if (current.handlers.size > 0) return;
      this.topics.delete(key);
      this.send({ op: 'unsubscribe', args: [arg] });
      if (this.topics.size === 0) this.idleTimer = setTimeout(() => this.close(), IDLE_CLOSE_MS);
    };
  }

  /** Asks OKX for a fresh snapshot of one channel, e.g. after the local order book fell out of step. */
  resubscribe(arg: ChannelArg) {
    this.send({ op: 'unsubscribe', args: [arg] });
    this.send({ op: 'subscribe', args: [arg] });
  }

  /** Skips the backoff wait, e.g. when the app returns to the foreground. */
  reconnectNow() {
    if (this.topics.size === 0) return;
    if (this.state.status === 'reconnecting') {
      this.clearRetry();
      this.connect();
    } else if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
      this.ws.close();
    } else if (Date.now() - this.lastMessageAt > HEARTBEAT_MS) {
      this.send('ping');
    }
  }

  private setState(next: SocketState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private send(payload: object | 'ping') {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(payload === 'ping' ? payload : JSON.stringify(payload));
  }

  private ensureConnected() {
    if (this.ws || this.retryTimer) return;
    this.connect();
  }

  private connect() {
    this.clearRetry();
    const socket = new WebSocket(URL);
    this.ws = socket;
    this.setState({ status: this.attempt === 0 ? 'connecting' : 'reconnecting', retryAt: 0 });

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.attempt = 0;
      this.lastMessageAt = Date.now();
      this.setState({ status: 'open', retryAt: 0 });
      const args = [...this.topics.values()].map((topic) => topic.arg);
      if (args.length > 0) this.send({ op: 'subscribe', args });
      this.heartbeat = setInterval(() => this.checkHealth(), HEARTBEAT_MS);
    };
    socket.onmessage = (event) => this.handleMessage(String(event.data));
    socket.onclose = () => this.handleClosed(socket);
    socket.onerror = () => this.handleClosed(socket);
  }

  private handleMessage(raw: string) {
    this.lastMessageAt = Date.now();
    if (raw === 'pong') return;

    let message: {
      event?: string;
      code?: string;
      arg?: ChannelArg;
      action?: 'snapshot' | 'update';
      data?: ChannelMessage['data'];
    };
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    // OKX warns about 60s before a planned restart: move to a new connection now.
    if (message.event === 'notice' && message.code === '64008') {
      this.ws?.close();
      return;
    }
    if (!message.arg || !message.data) return;
    this.topics.get(topicKey(message.arg))?.handlers.forEach((handler) =>
      handler({ action: message.action, data: message.data ?? [] }),
    );
  }

  private checkHealth() {
    const silentFor = Date.now() - this.lastMessageAt;
    if (silentFor > STALE_MS) this.ws?.close();
    else if (silentFor > HEARTBEAT_MS) this.send('ping');
  }

  private handleClosed(socket: WebSocket) {
    if (this.ws !== socket) return;
    this.ws = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.topics.size === 0) return;

    const delay = Math.min(1000 * 2 ** this.attempt, MAX_BACKOFF_MS);
    this.attempt += 1;
    this.setState({ status: 'reconnecting', retryAt: Date.now() + delay });
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private close() {
    this.clearRetry();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    const socket = this.ws;
    this.ws = null;
    socket?.close();
    this.attempt = 0;
    this.setState({ status: 'connecting', retryAt: 0 });
  }
}

export const okxSocket = new OkxSocket();
