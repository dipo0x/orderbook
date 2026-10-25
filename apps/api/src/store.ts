import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { DeviceRegistration, NotificationPrefs, SolanaCluster } from '@orderbook/shared';

export type Device = {
  token: string;
  address: string;
  cluster: SolanaCluster;
  prefs: NotificationPrefs;
};

type DeviceRow = { token: string; address: string; cluster: string; prefs: string };

/** Devices to notify and how far the watcher has read each wallet's history. SQLite, one local file. */
export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        token TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        cluster TEXT NOT NULL,
        prefs TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS devices_wallet ON devices (cluster, address);
      CREATE TABLE IF NOT EXISTS cursors (
        cluster TEXT NOT NULL,
        address TEXT NOT NULL,
        last_signature TEXT NOT NULL,
        PRIMARY KEY (cluster, address)
      );
    `);
  }

  upsertDevice(registration: DeviceRegistration, now = Date.now()) {
    this.db
      .prepare(
        `INSERT INTO devices (token, address, cluster, prefs, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(token) DO UPDATE SET address = excluded.address, cluster = excluded.cluster, prefs = excluded.prefs`,
      )
      .run(registration.token, registration.address, registration.cluster, JSON.stringify(registration.prefs), now);
  }

  deleteDevice(token: string) {
    this.db.prepare('DELETE FROM devices WHERE token = ?').run(token);
  }

  getDevice(token: string): Device | null {
    const row = this.db.prepare('SELECT * FROM devices WHERE token = ?').get(token) as DeviceRow | undefined;
    return row ? toDevice(row) : null;
  }

  devicesForWallet(cluster: SolanaCluster, address: string): Device[] {
    const rows = this.db.prepare('SELECT * FROM devices WHERE cluster = ? AND address = ?').all(cluster, address) as DeviceRow[];
    return rows.map(toDevice);
  }

  allDevices(): Device[] {
    return (this.db.prepare('SELECT * FROM devices').all() as DeviceRow[]).map(toDevice);
  }

  /** Every wallet that has at least one device, once each. */
  watchedWallets(): { cluster: SolanaCluster; address: string }[] {
    const rows = this.db.prepare('SELECT DISTINCT cluster, address FROM devices').all() as { cluster: string; address: string }[];
    return rows.map((row) => ({ cluster: row.cluster as SolanaCluster, address: row.address }));
  }

  getCursor(cluster: SolanaCluster, address: string): string | null {
    const row = this.db.prepare('SELECT last_signature FROM cursors WHERE cluster = ? AND address = ?').get(cluster, address) as
      | { last_signature: string }
      | undefined;
    return row?.last_signature ?? null;
  }

  setCursor(cluster: SolanaCluster, address: string, signature: string) {
    this.db
      .prepare(
        `INSERT INTO cursors (cluster, address, last_signature) VALUES (?, ?, ?)
         ON CONFLICT(cluster, address) DO UPDATE SET last_signature = excluded.last_signature`,
      )
      .run(cluster, address, signature);
  }

  /** Drops cursors for wallets nobody watches any more. */
  pruneCursors() {
    this.db.exec(
      'DELETE FROM cursors WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.cluster = cursors.cluster AND d.address = cursors.address)',
    );
  }

  close() {
    this.db.close();
  }
}

function toDevice(row: DeviceRow): Device {
  return { token: row.token, address: row.address, cluster: row.cluster as SolanaCluster, prefs: JSON.parse(row.prefs) as NotificationPrefs };
}
