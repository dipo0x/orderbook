type Entry<T> = { value: T; at: number };

/**
 * Remembers one loaded value for `ttlMs`. Many callers asking at once share a single load, and if a
 * refresh fails the last good value is still served for up to `staleMs` instead of failing every caller.
 */
export class CachedValue<T> {
  private entry: Entry<T> | null = null;
  private inflight: Promise<T> | null = null;

  private load: () => Promise<T>;
  private ttlMs: number;
  private staleMs: number;
  private now: () => number;

  constructor(load: () => Promise<T>, ttlMs: number, staleMs: number, now: () => number = Date.now) {
    this.load = load;
    this.ttlMs = ttlMs;
    this.staleMs = staleMs;
    this.now = now;
  }

  async get(): Promise<{ value: T; at: number }> {
    const now = this.now();
    if (this.entry && now - this.entry.at < this.ttlMs) return this.entry;

    this.inflight ??= this.load()
      .then((value) => {
        this.entry = { value, at: this.now() };
        return value;
      })
      .finally(() => {
        this.inflight = null;
      });

    try {
      await this.inflight;
      return this.entry!;
    } catch (error) {
      if (this.entry && now - this.entry.at < this.staleMs) return this.entry;
      throw error;
    }
  }
}
