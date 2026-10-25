import type { IncomingMessage, ServerResponse } from 'node:http';

import { log } from './log.ts';
import type { RateLimiter } from './rate-limit.ts';

export class HttpError extends Error {
  status: number;
  code: string;
  headers: Record<string, string>;
  constructor(status: number, code: string, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export type Context = {
  method: string;
  params: Record<string, string>;
  query: URLSearchParams;
  ip: string;
  /** Parsed JSON body, or undefined if the request had none. */
  body: unknown;
};

export type Route = {
  method: 'GET' | 'POST' | 'DELETE';
  /** e.g. "/rpc/:cluster". */
  path: string;
  limiter?: RateLimiter;
  handler: (ctx: Context) => unknown | Promise<unknown>;
};

const MAX_BODY_BYTES = 64 * 1024;

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request body is too large.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request body is too large.');
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'bad_json', 'Request body is not valid JSON.');
  }
}

/** The caller's address, for rate limiting. Behind your own proxy, set TRUST_PROXY=1 to use X-Forwarded-For. */
export function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/** Builds the request handler for `http.createServer` from a list of routes. */
export function createHandler(routes: Route[], options: { trustProxy: boolean }) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const started = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    let status = 200;
    let routeName = 'unmatched';

    const send = (code: number, payload: unknown, headers: Record<string, string> = {}) => {
      status = code;
      res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
      res.end(JSON.stringify(payload));
    };

    try {
      let params: Record<string, string> | null = null;
      let route: Route | undefined;
      let pathMatched = false;
      for (const candidate of routes) {
        const matched = matchPath(candidate.path, url.pathname);
        if (!matched) continue;
        pathMatched = true;
        if (candidate.method !== req.method) continue;
        route = candidate;
        params = matched;
        break;
      }
      if (!route || !params) {
        throw pathMatched
          ? new HttpError(405, 'method_not_allowed', 'Method not allowed.')
          : new HttpError(404, 'not_found', 'Not found.');
      }
      routeName = `${route.method} ${route.path}`;

      const ip = clientIp(req, options.trustProxy);
      if (route.limiter) {
        const taken = route.limiter.take(ip);
        if (!taken.ok) {
          throw new HttpError(429, 'rate_limited', 'Too many requests. Slow down.', {
            'retry-after': String(taken.retryAfterSeconds),
          });
        }
      }

      const body = route.method === 'GET' ? undefined : await readBody(req);
      const result = await route.handler({ method: route.method, params, query: url.searchParams, ip, body });
      send(200, result);
    } catch (error) {
      if (error instanceof HttpError) {
        send(error.status, { error: { code: error.code, message: error.message } }, error.headers);
      } else {
        log('unhandled_error', { route: routeName, message: error instanceof Error ? error.message : String(error) });
        send(500, { error: { code: 'internal', message: 'Something went wrong.' } });
      }
    } finally {
      log('request', { route: routeName, status, ms: Date.now() - started });
    }
  };
}
