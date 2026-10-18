import { useEffect, useState } from 'react';

import { fetchInstrument } from '@/core/market/okx';
import type { Instrument } from '@/core/market/types';

// Tick and lot sizes never change during a session, so each instrument is fetched once.
const cache = new Map<string, Instrument>();
const inflight = new Map<string, Promise<Instrument | null>>();

function load(instId: string): Promise<Instrument | null> {
  const cached = cache.get(instId);
  if (cached) return Promise.resolve(cached);
  let request = inflight.get(instId);
  if (!request) {
    request = fetchInstrument(instId)
      .then((instrument) => {
        if (instrument) cache.set(instId, instrument);
        return instrument;
      })
      .catch(() => null)
      .finally(() => inflight.delete(instId));
    inflight.set(instId, request);
  }
  return request;
}

export function useInstruments(instIds: readonly string[]): Record<string, Instrument> {
  const [instruments, setInstruments] = useState<Record<string, Instrument>>(() =>
    Object.fromEntries(instIds.flatMap((id) => (cache.has(id) ? [[id, cache.get(id)!]] : []))),
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all(instIds.map(load)).then((loaded) => {
      if (cancelled) return;
      setInstruments(
        Object.fromEntries(loaded.flatMap((item) => (item ? [[item.instId, item]] : []))),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [instIds]);

  return instruments;
}
