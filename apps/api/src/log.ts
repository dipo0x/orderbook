/** One JSON line per event. Request bodies, keys and full addresses are never logged. */
export function log(event: string, fields: Record<string, unknown> = {}) {
  if (process.env.LOG_LEVEL === 'silent') return;
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }));
}

/** "Hc6g…u2Gp": enough to recognise an address in a log, not enough to identify a wallet on its own. */
export const mask = (address: string) => (address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address);
