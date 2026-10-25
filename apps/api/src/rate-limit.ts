/**
 * Token bucket per key: each key can burst up to `capacity` requests, then is refilled at
 * `refillPerSecond`. Idle keys are dropped so the map can't grow without bound.
 */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();

  private capacity: number;
  private refillPerSecond: number;
  private now: () => number;

  constructor(capacity: number, refillPerSecond: number, now: () => number = Date.now) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
  }

  take(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((now - bucket.at) / 1000) * this.refillPerSecond);
    bucket.at = now;

    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return { ok: false, retryAfterSeconds: Math.ceil((1 - bucket.tokens) / this.refillPerSecond) };
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 10_000) this.prune(now);
    return { ok: true };
  }

  /** Forgets keys that have been idle long enough to be full again. */
  private prune(now: number) {
    const fullAfterMs = (this.capacity / this.refillPerSecond) * 1000;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.at > fullAfterMs) this.buckets.delete(key);
    }
  }
}
